import { isMissingRelation, n as toNumber, q, ts } from "./db";
import {
  describeHttpFailure,
  getLLMProviderSnapshots,
  getLLMSavings,
  KNOWN_LLM_PROVIDERS,
  matchProviderRows,
  NON_JSON_FAILURE,
  normalizeProviderName,
  type LLMProviderSnapshot,
} from "@/components/lib/llmRouter";
import {
  LLM_NEAR_LIMIT_PCT,
  LLM_STATES,
  type LlmIssue,
  type LlmLimit,
  type LlmProvider,
  type LlmSection,
  type LlmState,
  type LlmUsage,
} from "./contract";

/**
 * The LLM part of the admin console: which provider needs changing, and how much of each limit is used.
 *
 * Three sources are joined BY NAME (one name per provider, see normalizeProviderName in llmRouter.ts):
 *   1. the router            what it knows right now: model, key yes/no, "needs fixing", "skipped for a while"
 *   2. the ApiProvider table the limit you keep per provider (requestsUsed / maxLimit, isActive)
 *   3. the ApiUsage table    what the real calls of the last 24 hours say (works across server instances)
 *
 * Nothing secret passes through here: the router only says whether a key is set, the problem texts are
 * written by the router (never copied from a provider's answer), and no URL is included.
 *
 * Because the join is by name, swapping Gemini for Anthropic needs no change in this file: put
 * ANTHROPIC_API_KEY in .env and add (or rename) the ApiProvider row to ANTHROPIC, and the page shows
 * "Anthropic: limit reached" when that row is used up.
 *
 * buildLlmSection() is pure (no database, no clock, no environment), so it can be tested on its own.
 * loadLlmSection() reads the three sources and never throws.
 */

const WINDOW_MS = 24 * 3_600_000;
/** A failed last call only counts as "paused" or "failing" for this long (the router's longest short pause). */
const RECENT_MS = 30 * 60_000;

export type LimitRow = { name: string; isActive: boolean; requestsUsed: number; maxLimit: number };

export type LlmInputs = {
  now: number;
  /** From the router, for this server process. */
  snapshots: readonly LLMProviderSnapshot[];
  /** The ApiProvider table. null = it could not be read. */
  rows: readonly LimitRow[] | null;
  limitsNote?: string | null;
  /** The ApiUsage rows of the last 24 hours, per provider name. null = the table is not set up or could not be read. */
  usage: ReadonlyMap<string, LlmUsage> | null;
  usageNote?: string | null;
  savings: { since: number; shared: number; cacheHits: number; tokens: number };
  /** LLM_PROVIDER_ORDER exactly as written in .env. */
  orderSetting: string;
  /** false when LLM_AUTO_ORDER=off. */
  autoOrder: boolean;
};

/* ── Small helpers ──────────────────────────────────────────────────────── */

const whole = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
const fmt = (n: number) => n.toLocaleString("en-US");
const latest = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.max(a, b));

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length]!;
}

/** "ANTROPIC" -> ANTHROPIC, "GITHUB" -> GITHUB_MODELS. Only a suggestion, so it is careful: short names get none. */
function closestProvider(key: string): string | null {
  if (key.length < 4) return null;
  let best: { name: string; score: number } | null = null;
  for (const name of KNOWN_LLM_PROVIDERS) {
    const allowed = name.length >= 8 ? 2 : name.length >= 6 ? 1 : 0;
    const near = distance(key, name) <= allowed;
    const prefix = name.startsWith(key) || key.startsWith(name);
    if (!near && !prefix) continue;
    const score = distance(key, name);
    if (!best || score < best.score) best = { name, score };
  }
  return best?.name ?? null;
}

const rank = (state: LlmState) => LLM_STATES.indexOf(state);

/* ── What the ApiUsage rows say ─────────────────────────────────────────── */

type CallGroup = {
  provider: string | null;
  ok: boolean | null;
  _count: { _all: number };
  _sum?: { tokensIn: number | null; tokensOut: number | null };
  _avg?: { durationMs: number | null };
  _max?: { at: Date | null };
};
type FailGroup = { provider: string | null; status: number | null; _max?: { at: Date | null } };

const emptyUsage = (): LlmUsage => ({
  calls: 0,
  failed: 0,
  tokensIn: 0,
  tokensOut: 0,
  avgMs: null,
  lastCallAt: null,
  lastOkAt: null,
  lastFailAt: null,
  lastFailStatus: null,
});

/**
 * Folds two grouped queries into one entry per provider. Old rows may carry other spellings of a name
 * ("gemini", "Claude"): they are merged under the one name.
 */
export function foldUsage(calls: readonly CallGroup[], failures: readonly FailGroup[]): Map<string, LlmUsage> {
  const out = new Map<string, LlmUsage>();
  const averages = new Map<string, { sum: number; n: number }>();
  const statusAt = new Map<string, number>();

  const slot = (provider: string | null): { key: string; entry: LlmUsage } | null => {
    const key = normalizeProviderName(provider ?? "");
    if (!key) return null;
    let entry = out.get(key);
    if (!entry) {
      entry = emptyUsage();
      out.set(key, entry);
    }
    return { key, entry };
  };

  for (const group of calls) {
    const found = slot(group.provider);
    if (!found) continue;
    const { key, entry } = found;
    const n = whole(group._count._all);
    const at = group._max?.at ? group._max.at.getTime() : null;

    entry.calls += n;
    entry.tokensIn += whole(group._sum?.tokensIn);
    entry.tokensOut += whole(group._sum?.tokensOut);
    entry.lastCallAt = latest(entry.lastCallAt, at);

    if (group.ok === false) {
      entry.failed += n;
      entry.lastFailAt = latest(entry.lastFailAt, at);
    } else {
      entry.lastOkAt = latest(entry.lastOkAt, at);
      const avg = group._avg?.durationMs;
      if (typeof avg === "number" && Number.isFinite(avg) && n > 0) {
        const part = averages.get(key) ?? { sum: 0, n: 0 };
        part.sum += avg * n;
        part.n += n;
        averages.set(key, part);
      }
    }
  }

  for (const [key, part] of averages) {
    const entry = out.get(key);
    if (entry && part.n > 0) entry.avgMs = Math.round(part.sum / part.n);
  }

  // The status that goes with the latest failed call.
  for (const group of failures) {
    const found = slot(group.provider);
    const at = group._max?.at ? group._max.at.getTime() : null;
    if (!found || at === null) continue;
    const { key, entry } = found;
    const seen = statusAt.get(key) ?? -1;
    if (at > seen || (at === seen && entry.lastFailStatus === null && group.status !== null)) {
      statusAt.set(key, at);
      entry.lastFailStatus = group.status;
    }
    entry.lastFailAt = latest(entry.lastFailAt, at);
  }

  return out;
}

/** True when the latest call of this provider failed (and nothing worked after it). */
function lastCallFailed(usage: LlmUsage | null): usage is LlmUsage & { lastFailAt: number } {
  return usage !== null && usage.lastFailAt !== null && (usage.lastOkAt === null || usage.lastFailAt > usage.lastOkAt);
}

/* ── One provider ───────────────────────────────────────────────────────── */

function toLimit(row: LimitRow): LlmLimit {
  const used = whole(row.requestsUsed);
  const max = whole(row.maxLimit);
  const rounded = max > 0 ? Math.round((used / max) * 100) : 100;
  return {
    rowName: row.name,
    used,
    max,
    // 14,390 of 14,400 rounds to 100, but the router still sends requests there. Show 99 until it is really used up.
    pct: used < max ? Math.min(99, rounded) : rounded,
    active: row.isActive !== false,
  };
}

/** The same test the router uses to skip a provider: it needs requestsUsed < maxLimit. */
const limitReached = (row: LimitRow) => !(row.requestsUsed < row.maxLimit);
const nearLimit = (row: LimitRow) =>
  !limitReached(row) && row.maxLimit > 0 && row.requestsUsed / row.maxLimit >= LLM_NEAR_LIMIT_PCT / 100;

/** Acronyms that stay in capitals when a headline is turned into a sentence. */
const KEEP_CAPS = new Set(["API", "HTTP", "HTTPS", "URL", "JSON", "LLM", "ID", "OK", "HTML"]);

/**
 * The router prints its own problem headlines in capitals for the terminal ("INVALID OR DELETED API KEY"). On screen
 * they read as a sentence: "Invalid or deleted API key". Only used on those router strings, so an error code such as
 * ECONNRESET inside a sentence-case reason is never lower-cased.
 */
export const headline = (text: string): string => {
  const sentence = text.replace(/\b[A-Z]+\b/g, (word) => (KEEP_CAPS.has(word) ? word : word.toLowerCase()));
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
};

const issue = (kind: LlmIssue["kind"], title: string, fix: string, at: number | null = null, until: number | null = null): LlmIssue => ({
  kind,
  title,
  fix,
  at,
  until,
});

type ProviderFacts = {
  snapshot: LLMProviderSnapshot;
  row: LimitRow | undefined;
  /** Other rows that mean the same provider (their names only differ in case or spaces). */
  duplicates: LimitRow[];
  usage: LlmUsage | null;
  now: number;
};

function collectIssues({ snapshot, row, duplicates, usage, now }: ProviderFacts): LlmIssue[] {
  const issues: LlmIssue[] = [];
  const failed = lastCallFailed(usage);
  const status = failed ? usage.lastFailStatus : null;

  // A problem the router saw is out of date when a call worked after it (another server instance may have fixed it).
  const broken = snapshot.broken && !(usage?.lastOkAt != null && usage.lastOkAt > snapshot.broken.since) ? snapshot.broken : null;

  // 1. Something a human has to change. The router knows the exact words; the call log gives the same words for the status.
  let change: LlmIssue | null = null;
  if (broken) {
    change = issue("change", headline(broken.problem), broken.fix, broken.since);
  } else if (failed) {
    const action = status === 200 ? NON_JSON_FAILURE : status !== null ? describeHttpFailure(snapshot.name, status) : null;
    if (action) change = issue("change", headline(action.problem), action.fix, usage.lastFailAt);
  }
  if (change) issues.push(change);

  // 2. The limit you keep in the ApiProvider table.
  if (row) {
    const limit = toLimit(row);
    if (limitReached(row)) {
      issues.push(
        issue(
          "limit",
          "Limit reached",
          `${fmt(limit.used)} of ${fmt(limit.max)} requests are used in your ApiProvider table, so the router skips it. ` +
            `Raise maxLimit, set requestsUsed back to 0 when the provider's quota resets, or let another provider take over.`
        )
      );
    } else if (nearLimit(row)) {
      issues.push(
        issue(
          "near",
          `${limit.pct}% of the limit is used`,
          `${fmt(limit.used)} of ${fmt(limit.max)} requests are used. Raise maxLimit or get another provider ready before it runs out. ` +
            `The router also e-mails you from ${LLM_NEAR_LIMIT_PCT}%.`
        )
      );
    }
  }

  // 3. Names in the ApiProvider table.
  if (duplicates.length > 0 && row) {
    const others = duplicates.map((d) => `"${d.name.trim()}"`).join(", ");
    issues.push(
      issue(
        "unlinked",
        "Two rows, one name",
        `The rows "${row.name.trim()}" and ${others} all mean ${snapshot.name}. The router counts requests on "${row.name.trim()}" and ignores the others. Delete the extra row.`
      )
    );
  }

  // 4. Skipped for a few minutes, or failing for a reason nobody has to fix.
  if (!change) {
    if (snapshot.skip) {
      issues.push(issue("paused", snapshot.skip.reason, "Nothing to do. The router tries it again by itself.", null, snapshot.skip.until));
    } else if (failed && now - usage.lastFailAt <= RECENT_MS) {
      if (status === 429) {
        issues.push(issue("paused", "Rate limit or quota hit (HTTP 429)", "Nothing to do. The router tries it again by itself.", usage.lastFailAt));
      } else if (status === null) {
        issues.push(issue("paused", "Cannot reach the server", "Nothing to do unless it keeps happening. Then check your internet and the provider's status page.", usage.lastFailAt));
      } else {
        issues.push(
          issue(
            "failing",
            `Last call failed (HTTP ${status})`,
            "The router moves on to the next provider by itself. If it keeps failing, look at the provider's status page.",
            usage.lastFailAt
          )
        );
      }
    }
  }

  return issues.sort((a, b) => rank(a.kind) - rank(b.kind));
}

function buildKnown(facts: ProviderFacts): LlmProvider {
  const { snapshot, row, usage } = facts;
  const base = {
    name: snapshot.name,
    label: snapshot.label,
    known: true,
    model: snapshot.model,
    keySet: snapshot.keySet,
    envVar: snapshot.envVar,
    modelEnvVar: snapshot.modelEnvVar,
    limit: row ? toLimit(row) : null,
    last24h: usage,
  };

  // You switched it off yourself, so nothing else about it is a problem.
  if (row && row.isActive === false) {
    return { ...base, state: "off", summary: "Switched off in your ApiProvider table (isActive is false).", issues: [] };
  }
  if (!snapshot.keySet) {
    return { ...base, state: "nokey", summary: `No key. Add ${snapshot.envVar} to .env to use it.`, issues: [] };
  }

  const issues = collectIssues(facts);
  if (issues.length > 0) {
    return { ...base, state: issues[0]!.kind, summary: issues[0]!.title, issues };
  }

  if (usage === null) {
    return { ...base, state: "ready", summary: "Key is set. Calls are not recorded yet (ApiUsage table).", issues };
  }
  if (usage.calls > 0 && usage.lastOkAt !== null && !lastCallFailed(usage)) {
    return { ...base, state: "ok", summary: "Answering normally.", issues };
  }
  return {
    ...base,
    state: "ready",
    summary: usage.calls > 0 ? "Key is set. Its last call failed a while ago and it has not been used since." : "Key is set. No calls in the last 24 hours.",
    issues,
  };
}

/** A row in the ApiProvider table whose name no provider has. */
function buildUnlinked(key: string, row: LimitRow, usage: LlmUsage | null): LlmProvider {
  const guess = closestProvider(key);
  const rowName = row.name.trim() || "(empty name)";
  const fix = guess
    ? `No provider in llmRouter.ts is called "${rowName}", so this limit is not used. Did you mean ${guess}? Rename the row to ${guess}.`
    : `No provider in llmRouter.ts is called "${rowName}", so this limit is not used. Rename the row to one of ${KNOWN_LLM_PROVIDERS.join(", ")}, or add the provider to llmRouter.ts.`;
  const problem = issue("unlinked", "Name not matched", fix);
  return {
    name: key || "(EMPTY NAME)",
    label: rowName,
    state: "unlinked",
    summary: problem.title,
    issues: [problem],
    known: false,
    model: null,
    keySet: false,
    envVar: null,
    modelEnvVar: null,
    limit: toLimit(row),
    last24h: usage,
  };
}

/* ── The whole section ──────────────────────────────────────────────────── */

export function buildLlmSection(input: LlmInputs): Extract<LlmSection, { available: true }> {
  const { now, snapshots, rows, usage } = input;
  const allRows = rows ?? [];
  const winners = matchProviderRows([...allRows]);
  const rowsOf = (key: string) => allRows.filter((r) => normalizeProviderName(r.name) === key);

  const providers: LlmProvider[] = [];
  const claimed = new Set<string>();

  for (const snapshot of snapshots) {
    claimed.add(snapshot.name);
    const row = winners.get(snapshot.name);
    providers.push(
      buildKnown({
        snapshot,
        row,
        duplicates: row ? rowsOf(snapshot.name).filter((r) => r !== row) : [],
        usage: usage ? (usage.get(snapshot.name) ?? emptyUsage()) : null,
        now,
      })
    );
  }

  for (const [key, row] of winners) {
    if (claimed.has(key)) continue;
    providers.push(buildUnlinked(key, row, usage ? (usage.get(key) ?? emptyUsage()) : null));
  }

  providers.sort(
    (a, b) =>
      rank(a.state) - rank(b.state) ||
      (b.last24h?.calls ?? 0) - (a.last24h?.calls ?? 0) ||
      a.label.localeCompare(b.label, "en")
  );

  const counts = Object.fromEntries(LLM_STATES.map((state) => [state, 0])) as Record<LlmState, number>;
  const totals = { calls: 0, failed: 0, tokensIn: 0, tokensOut: 0 };
  for (const provider of providers) {
    counts[provider.state] += 1;
    if (provider.last24h) {
      totals.calls += provider.last24h.calls;
      totals.failed += provider.last24h.failed;
      totals.tokensIn += provider.last24h.tokensIn;
      totals.tokensOut += provider.last24h.tokensOut;
    }
  }

  const order = input.orderSetting
    .split(",")
    .map((name) => normalizeProviderName(name))
    .filter(Boolean);

  return {
    available: true,
    at: now,
    providers,
    counts,
    limits: { connected: rows !== null, note: rows === null ? (input.limitsNote ?? "Limits are not shown: the ApiProvider table could not be read.") : null },
    usage: { connected: usage !== null, note: usage === null ? (input.usageNote ?? "Calls and tokens are not shown: the ApiUsage table is not available.") : null },
    routing: { mode: order.length > 0 ? "fixed" : input.autoOrder ? "auto" : "random", order },
    savings: { ...input.savings },
    totals,
  };
}

/* ── Reading the sources ────────────────────────────────────────────────── */

async function readLimitRows(): Promise<{ rows: LimitRow[] | null; note: string | null }> {
  try {
    // Only what the page needs. The router reads the same columns.
    const rows = await q<{ name: string; isActive: boolean | null; requestsUsed: unknown; maxLimit: unknown }>(
      `SELECT name, "isActive", "requestsUsed", "maxLimit" FROM "ApiProvider" ORDER BY name`,
    );
    return {
      rows: rows.map((r) => ({ name: String(r.name), isActive: r.isActive !== false, requestsUsed: toNumber(r.requestsUsed), maxLimit: toNumber(r.maxLimit) })),
      note: null,
    };
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[admin/llm] could not read the ApiProvider table", error);
    return { rows: null, note: "Limits are not shown: the ApiProvider table could not be read." };
  }
}

type CallRow = { provider: string | null; ok: boolean | null; n: unknown; tokensIn: unknown; tokensOut: unknown; avgMs: unknown; lastAt: Date | string | null };
type FailRow = { provider: string | null; status: unknown; n: unknown; lastAt: Date | string | null };
const asDate = (v: Date | string | null): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function readUsage(now: number): Promise<{ byProvider: Map<string, LlmUsage> | null; note: string | null }> {
  const since = now - WINDOW_MS;
  try {
    const [calls, failures] = await Promise.all([
      q<CallRow>(
        `SELECT provider, ok, count(*)::int AS n, COALESCE(sum("tokensIn"), 0)::float8 AS "tokensIn", COALESCE(sum("tokensOut"), 0)::float8 AS "tokensOut",
                avg("durationMs")::float8 AS "avgMs", max("at") AS "lastAt"
           FROM "ApiUsage" WHERE service = 'llm' AND "at" >= ${ts("$1")} GROUP BY provider, ok`,
        since,
      ),
      q<FailRow>(
        `SELECT provider, status, count(*)::int AS n, max("at") AS "lastAt"
           FROM "ApiUsage" WHERE service = 'llm' AND ok = false AND "at" >= ${ts("$1")} GROUP BY provider, status`,
        since,
      ),
    ]);
    const callGroups: CallGroup[] = calls.map((r) => ({
      provider: r.provider,
      ok: r.ok,
      _count: { _all: toNumber(r.n) },
      _sum: { tokensIn: toNumber(r.tokensIn), tokensOut: toNumber(r.tokensOut) },
      _avg: { durationMs: r.avgMs === null || r.avgMs === undefined ? null : toNumber(r.avgMs) },
      _max: { at: asDate(r.lastAt) },
    }));
    const failGroups: FailGroup[] = failures.map((r) => ({
      provider: r.provider,
      status: r.status === null || r.status === undefined ? null : toNumber(r.status),
      _max: { at: asDate(r.lastAt) },
    }));
    return { byProvider: foldUsage(callGroups, failGroups), note: null };
  } catch (error) {
    if (isMissingRelation(error)) {
      return { byProvider: null, note: "Calls and tokens are not shown: the ApiUsage table is not set up yet (see the ApiUsage model in your Prisma schema)." };
    }
    console.error("[admin/llm] could not read the ApiUsage table", error);
    return { byProvider: null, note: "Calls and tokens are not shown: the ApiUsage table could not be read." };
  }
}

/** Feeds getStats(). Never throws: a problem here must not take the rest of the dashboard down. */
export async function loadLlmSection(): Promise<LlmSection> {
  const now = Date.now();
  try {
    const [limits, usage] = await Promise.all([readLimitRows(), readUsage(now)]);
    return buildLlmSection({
      now,
      snapshots: getLLMProviderSnapshots(),
      rows: limits.rows,
      limitsNote: limits.note,
      usage: usage.byProvider,
      usageNote: usage.note,
      savings: getLLMSavings(),
      orderSetting: process.env.LLM_PROVIDER_ORDER ?? "",
      autoOrder: (process.env.LLM_AUTO_ORDER ?? "").trim().toLowerCase() !== "off",
    });
  } catch (error) {
    console.error("[admin/llm] could not build the LLM section", error);
    return { available: false, reason: "The LLM router status could not be read. See the server log." };
  }
}
