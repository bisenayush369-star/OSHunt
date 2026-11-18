import type { UsageBucket, UsageSection, UsageService } from "./contract";
import { dense, exec, isMissingRelation, n, newId, q, ts } from "./db";

/**
 * API usage metering: how many GitHub and LLM calls the app makes. Server only.
 *
 * WRITE side (call from your own server code, anywhere you call GitHub or an LLM):
 *   await trackUsage({ service: "llm", provider: "GEMINI", model, userId }, () => callModel(), (r) => ({
 *     tokensIn: r.usage?.prompt_tokens, tokensOut: r.usage?.completion_tokens }));
 *   void recordApiUsage({ service: "github", endpoint: "GET /user/repos", userId, status: 200 });
 *
 * READ side: loadUsageSection() feeds getStats(), which feeds the graphs.
 * The ApiUsage table is found at run time: until it is migrated, writes quietly do nothing and the
 * dashboard shows a "not connected" state.
 */

export type UsageInput = {
  service: UsageService;
  provider?: string;
  model?: string;
  endpoint?: string;
  userId?: string | null;
  ok?: boolean;
  status?: number;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
};

const int = (v: number | undefined) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.round(v)) : null);
const text = (s: string | undefined | null) => (s ? s.slice(0, 120) : null);

/** Writes one row. Never throws; resolves to whether the row was saved. Safe not to await. */
export async function recordApiUsage(input: UsageInput): Promise<boolean> {
  try {
    await exec(
      `INSERT INTO "ApiUsage" (id, service, provider, model, endpoint, "userId", ok, status, "tokensIn", "tokensOut", "durationMs", "at")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      newId(),
      input.service,
      text(input.provider),
      text(input.model),
      text(input.endpoint),
      input.userId ?? null,
      input.ok ?? true,
      int(input.status),
      int(input.tokensIn),
      int(input.tokensOut),
      int(input.durationMs),
      new Date(),
    );
    return true;
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[admin-usage] record failed", error);
    return false;
  }
}

/**
 * Times `run`, records the call (ok when it resolves, failed when it throws) and returns the result
 * untouched. `read` can pull status / tokens out of the result and may override `ok` (useful for fetch,
 * which does not throw on 4xx / 5xx). A bad reader never breaks the call.
 */
export async function trackUsage<T>(meta: Omit<UsageInput, "ok" | "durationMs">, run: () => Promise<T>, read?: (result: T) => Partial<UsageInput>): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await run();
    let extra: Partial<UsageInput> = {};
    try {
      extra = read?.(result) ?? {};
    } catch {
      /* ignore */
    }
    void recordApiUsage({ ...meta, ok: true, ...extra, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    void recordApiUsage({ ...meta, ok: false, durationMs: Date.now() - startedAt });
    throw error;
  }
}

/* ── Read side ──────────────────────────────────────────────────────────── */

type BucketRow = { b: unknown; github: unknown; llm: unknown; errors: unknown; tokens: unknown };

/** One query for both windows (the one before and the current one), one for the top providers. */
export async function loadUsageSection(win: { start: number; bucketMs: number; bucketCount: number }): Promise<UsageSection> {
  const { start, bucketMs, bucketCount } = win;
  const prevStart = start - bucketMs * bucketCount;
  const end = start + bucketMs * bucketCount;

  try {
    const [rows, models] = await Promise.all([
      q<BucketRow>(
        `SELECT floor((extract(epoch FROM "at") * 1000 - $1::float8) / $2::float8)::int AS b,
                (count(*) FILTER (WHERE service = 'github'))::int AS github,
                (count(*) FILTER (WHERE service = 'llm'))::int AS llm,
                (count(*) FILTER (WHERE ok = false))::int AS errors,
                COALESCE(sum(COALESCE("tokensIn", 0) + COALESCE("tokensOut", 0)) FILTER (WHERE service = 'llm'), 0)::float8 AS tokens
           FROM "ApiUsage"
          WHERE "at" >= ${ts("$1")} AND "at" < ${ts("$3")} AND service IN ('github', 'llm')
          GROUP BY 1`,
        prevStart,
        bucketMs,
        end,
      ),
      q<{ service: string; name: string; calls: number }>(
        `SELECT service, COALESCE(NULLIF(provider, ''), NULLIF(model, ''), 'unknown') AS name, count(*)::int AS calls
           FROM "ApiUsage"
          WHERE "at" >= ${ts("$1")} AND "at" < ${ts("$2")} AND service IN ('github', 'llm')
          GROUP BY 1, 2 ORDER BY calls DESC, name LIMIT 6`,
        start,
        end,
      ),
    ]);

    const length = bucketCount * 2;
    const github = dense(rows.map((r) => ({ b: r.b, n: r.github })), length);
    const llm = dense(rows.map((r) => ({ b: r.b, n: r.llm })), length);
    const errors = dense(rows.map((r) => ({ b: r.b, n: r.errors })), length);
    const tokens = dense(rows.map((r) => ({ b: r.b, n: r.tokens })), length);
    const sum = (a: number[], from: number, to: number) => a.slice(from, to).reduce((x, y) => x + y, 0);

    const buckets: UsageBucket[] = Array.from({ length: bucketCount }, (_, i) => ({
      t: start + i * bucketMs,
      github: github[bucketCount + i]!,
      llm: llm[bucketCount + i]!,
      errors: errors[bucketCount + i]!,
      tokens: tokens[bucketCount + i]!,
    }));

    return {
      available: true,
      buckets,
      totals: {
        github: sum(github, bucketCount, length),
        llm: sum(llm, bucketCount, length),
        errors: sum(errors, bucketCount, length),
        tokens: sum(tokens, bucketCount, length),
      },
      previous: { github: sum(github, 0, bucketCount), llm: sum(llm, 0, bucketCount) },
      models: models.map((m) => ({ service: m.service === "github" ? "github" : "llm", name: String(m.name), calls: n(m.calls) })),
    };
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[admin-usage] section failed", error);
    return {
      available: false,
      reason: isMissingRelation(error)
        ? "The ApiUsage table is not set up yet. Add the model from prisma/admin-additions.prisma and migrate."
        : "The ApiUsage table could not be read right now.",
    };
  }
}
