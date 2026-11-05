import { prisma } from "@/components/lib/prisma";
import { getLLMProviderSnapshots, getLLMSavings, normalizeProviderName } from "@/components/lib/llmRouter";
import type { LlmIssue, LlmProvider, LlmSection, LlmState, LlmUsage } from "./contract";
import { LLM_NEAR_LIMIT_PCT, LLM_STATES } from "./contract";

const WINDOW_MS = 24 * 60 * 60 * 1000;

type LimitRow = {
  name: string;
  isActive: boolean | null;
  requestsUsed: number | null;
  maxLimit: number | null;
};

type UsageMap = Map<string, LlmUsage>;

function emptyUsage(): LlmUsage {
  return {
    calls: 0,
    failed: 0,
    tokensIn: 0,
    tokensOut: 0,
    avgMs: null,
    lastCallAt: null,
    lastOkAt: null,
    lastFailAt: null,
    lastFailStatus: null,
  };
}

function toInt(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function toLimit(row: LimitRow | undefined): LlmProvider["limit"] {
  if (!row) return null;
  const max = toInt(row.maxLimit);
  const used = toInt(row.requestsUsed);
  if (max === null || used === null) return null;
  const pct = max <= 0 ? 0 : Math.min(100, (used / max) * 100);
  return {
    rowName: row.name.trim() || "(empty name)",
    used,
    max,
    pct,
    active: row.isActive !== false,
  };
}

function issue(kind: LlmIssue["kind"], title: string, fix: string, at: number | null = null, until: number | null = null): LlmIssue {
  return { kind, title, fix, at, until };
}

function summarizeState(state: LlmState, usage: LlmUsage | null, limit: LlmProvider["limit"]): string {
  if (state === "limit") return limit ? `Using ${limit.used}/${limit.max} calls (${Math.round(limit.pct)}%).` : "The provider has reached its configured limit.";
  if (state === "near") return limit ? `Close to the configured limit: ${limit.used}/${limit.max} calls used.` : "Close to its configured limit.";
  if (state === "failing") return "The router has seen recent failures from this provider.";
  if (state === "unlinked") return "The table name does not match a known router provider.";
  if (state === "paused") return "The router is temporarily skipping this provider.";
  if (state === "nokey") return "No API key is configured for this provider.";
  if (state === "off") return "This provider is switched off in the database.";
  if (state === "change") return "This provider should be reviewed or re-ordered.";
  if (state === "ready") return usage && usage.calls > 0 ? "Key is set and it has been used recently." : "Key is set. No calls have been recorded yet.";
  if (state === "ok") return usage && usage.calls > 0 ? "Answering normally in the last 24h." : "Ready to answer.";
  return "Provider status is available.";
}

function matchProviderRows(rows: LimitRow[]): Map<string, LimitRow> {
  const byName = new Map<string, LimitRow>();
  for (const row of rows) {
    const key = normalizeProviderName(row.name);
    const current = byName.get(key);
    if (!current || (row.name === key && current.name !== key)) byName.set(key, row);
  }
  return byName;
}

function buildKnown(input: {
  snapshot: ReturnType<typeof getLLMProviderSnapshots>[number];
  row: LimitRow | undefined;
  usage: LlmUsage | null;
  now: number;
}): LlmProvider {
  const { snapshot, row, usage, now } = input;
  const limit = toLimit(row);
  const base = {
    name: snapshot.name,
    label: snapshot.label,
    known: true,
    model: snapshot.model || null,
    keySet: snapshot.keySet,
    envVar: snapshot.envVar || null,
    modelEnvVar: snapshot.modelEnvVar || null,
    limit,
    last24h: usage,
  };

  if (row && row.isActive === false) {
    return {
      ...base,
      state: "off",
      summary: summarizeState("off", usage, limit),
      issues: [],
    };
  }

  if (!snapshot.keySet) {
    return {
      ...base,
      state: "nokey",
      summary: summarizeState("nokey", usage, limit),
      issues: [],
    };
  }

  const issues: LlmIssue[] = [];
  if (snapshot.broken) issues.push(issue("failing", "Provider is flagged as broken", snapshot.broken.fix, snapshot.broken.since, null));
  if (snapshot.skip) issues.push(issue("paused", "Router is skipping this provider", snapshot.skip.reason, now, snapshot.skip.until));
  if (limit && limit.max > 0 && limit.pct >= 100) issues.push(issue("limit", "Limit reached", "Increase the ApiProvider limit or switch to another provider.", now, null));
  if (limit && limit.max > 0 && limit.pct >= LLM_NEAR_LIMIT_PCT && limit.pct < 100) issues.push(issue("near", "Near the configured limit", "Plan a higher cap or route work elsewhere.", now, null));

  if (snapshot.broken && issues[0]) {
    return {
      ...base,
      state: "failing",
      summary: snapshot.broken.problem || summarizeState("failing", usage, limit),
      issues,
    };
  }

  if (snapshot.skip && issues[0]) {
    return {
      ...base,
      state: "paused",
      summary: snapshot.skip.reason || summarizeState("paused", usage, limit),
      issues,
    };
  }

  if (limit && limit.max > 0 && limit.pct >= 100) {
    return {
      ...base,
      state: "limit",
      summary: summarizeState("limit", usage, limit),
      issues,
    };
  }

  if (limit && limit.max > 0 && limit.pct >= LLM_NEAR_LIMIT_PCT) {
    return {
      ...base,
      state: "near",
      summary: summarizeState("near", usage, limit),
      issues,
    };
  }

  if (usage === null) {
    return {
      ...base,
      state: "ready",
      summary: summarizeState("ready", usage, limit),
      issues,
    };
  }

  if (usage.calls > 0 && usage.lastOkAt !== null && usage.failed === 0) {
    return {
      ...base,
      state: "ok",
      summary: summarizeState("ok", usage, limit),
      issues,
    };
  }

  return {
    ...base,
    state: "ready",
    summary: usage.calls > 0 ? "Key is set and the last calls are not all healthy yet." : "Key is set. No calls recorded in the last 24h.",
    issues,
  };
}

function buildUnlinked(key: string, row: LimitRow, usage: LlmUsage | null): LlmProvider {
  const rowName = row.name.trim() || "(empty name)";
  const issueText = `No provider in llmRouter.ts is called "${rowName}", so this limit is not used by the router.`;
  return {
    name: key || "(EMPTY NAME)",
    label: rowName,
    state: "unlinked",
    summary: issueText,
    issues: [issue("unlinked", "Name not matched", issueText)],
    known: false,
    model: null,
    keySet: false,
    envVar: null,
    modelEnvVar: null,
    limit: toLimit(row),
    last24h: usage,
  };
}

function buildLlmSection(input: {
  now: number;
  snapshots: ReturnType<typeof getLLMProviderSnapshots>;
  rows: LimitRow[] | null;
  limitsNote: string | null;
  usage: UsageMap | null;
  usageNote: string | null;
  savings: ReturnType<typeof getLLMSavings>;
  orderSetting: string;
  autoOrder: boolean;
}): Extract<LlmSection, { available: true }> {
  const { now, snapshots, rows, usage } = input;
  const allRows = rows ?? [];
  const winners = matchProviderRows([...allRows]);
  const providers: LlmProvider[] = [];
  const claimed = new Set<string>();

  for (const snapshot of snapshots) {
    claimed.add(snapshot.name);
    const row = winners.get(snapshot.name);
    providers.push(
      buildKnown({
        snapshot,
        row,
        usage: usage ? (usage.get(snapshot.name) ?? emptyUsage()) : null,
        now,
      }),
    );
  }

  for (const [key, row] of winners) {
    if (claimed.has(key)) continue;
    providers.push(buildUnlinked(key, row, usage ? (usage.get(key) ?? emptyUsage()) : null));
  }

  providers.sort((a, b) => {
    const score: Record<LlmState, number> = {
      change: 0,
      limit: 1,
      failing: 2,
      unlinked: 3,
      paused: 4,
      near: 5,
      nokey: 6,
      ready: 7,
      off: 8,
      ok: 9,
    };
    return (score[a.state] ?? 99) - (score[b.state] ?? 99) || (b.last24h?.calls ?? 0) - (a.last24h?.calls ?? 0) || a.label.localeCompare(b.label, "en");
  });

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
    limits: {
      connected: rows !== null,
      note: rows === null ? input.limitsNote ?? "Limits are not shown: the ApiProvider table could not be read." : null,
    },
    usage: {
      connected: usage !== null,
      note: usage === null ? input.usageNote ?? "Calls and tokens are not shown: the ApiUsage table is not available." : null,
    },
    routing: {
      mode: order.length > 0 ? "fixed" : input.autoOrder ? "auto" : "random",
      order,
    },
    savings: { ...input.savings },
    totals,
  };
}

async function readLimitRows(): Promise<{ rows: LimitRow[] | null; note: string | null }> {
  try {
    const rows = await prisma.apiProvider.findMany({
      select: { name: true, isActive: true, requestsUsed: true, maxLimit: true },
    });
    return { rows: rows as LimitRow[], note: null };
  } catch (error) {
    console.error("[admin/llm] could not read the ApiProvider table", error);
    return { rows: null, note: "Limits are not shown: the ApiProvider table could not be read." };
  }
}

function usageTable(): { groupBy: (args: Record<string, unknown>) => Promise<any[]> } | null {
  const table = (prisma as any).apiUsage as { groupBy?: (args: Record<string, unknown>) => Promise<any[]> } | undefined;
  return table && typeof table.groupBy === "function" ? (table as any) : null;
}

async function readUsage(now: number): Promise<{ byProvider: UsageMap | null; note: string | null }> {
  const table = usageTable();
  if (!table) {
    return { byProvider: null, note: "Calls and tokens are not shown: the ApiUsage table is not set up yet." };
  }

  const since = new Date(now - WINDOW_MS);
  try {
    const [calls, failures] = await Promise.all([
      table.groupBy({
        by: ["provider", "ok"],
        where: { service: "llm", at: { gte: since } },
        _count: { _all: true },
        _sum: { tokensIn: true, tokensOut: true },
        _max: { at: true },
      }),
      table.groupBy({
        by: ["provider", "status"],
        where: { service: "llm", ok: false, at: { gte: since } },
        _count: { _all: true },
        _max: { at: true },
      }),
    ]);

    const map = new Map<string, LlmUsage>();
    for (const row of calls as any[]) {
      const provider = String(row.provider ?? "unknown");
      const entry = map.get(provider) ?? emptyUsage();
      const total = Number(row._count?._all ?? 0);
      if (row.ok === false) entry.failed += total;
      entry.calls += total;
      entry.tokensIn += Number(row._sum?.tokensIn ?? 0);
      entry.tokensOut += Number(row._sum?.tokensOut ?? 0);
      const at = row._max?.at ? new Date(row._max.at).getTime() : null;
      if (row.ok === true && at !== null && (entry.lastOkAt === null || at > entry.lastOkAt)) entry.lastOkAt = at;
      if (row.ok === false && at !== null && (entry.lastFailAt === null || at > entry.lastFailAt)) entry.lastFailAt = at;
      if (row.ok === true && entry.lastCallAt === null) entry.lastCallAt = at;
      map.set(provider, entry);
    }

    for (const row of failures as any[]) {
      const provider = String(row.provider ?? "unknown");
      const entry = map.get(provider) ?? emptyUsage();
      const status = typeof row.status === "number" ? row.status : null;
      const at = row._max?.at ? new Date(row._max.at).getTime() : null;
      if (status !== null) entry.lastFailStatus = status;
      if (at !== null && (entry.lastFailAt === null || at > entry.lastFailAt)) entry.lastFailAt = at;
      if (at !== null && (entry.lastCallAt === null || at > entry.lastCallAt)) entry.lastCallAt = at;
      map.set(provider, entry);
    }

    return { byProvider: map, note: null };
  } catch (error) {
    console.error("[admin/llm] could not read the ApiUsage table", error);
    return { byProvider: null, note: "Calls and tokens are not shown: the ApiUsage table could not be read." };
  }
}

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
