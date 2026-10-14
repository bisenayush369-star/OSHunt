import { prisma } from "@/components/lib/prisma";
import type { UsageBucket, UsageSection, UsageService } from "./contract";

/**
 * API usage metering: how many GitHub and LLM calls the app makes.
 *
 * WRITE side (call from your own server code, anywhere you call GitHub or an LLM):
 *   await trackUsage({ service: "llm", provider: "openai", model, userId }, () => client.chat..., (r) => ({
 *     tokensIn: r.usage?.prompt_tokens, tokensOut: r.usage?.completion_tokens }));
 *   recordApiUsage({ service: "github", endpoint: "GET /user/repos", userId, status: 200 });
 *
 * READ side: loadUsageSection() feeds getStats(), which feeds the graphs.
 *
 * The table is looked up at runtime, so the whole dashboard works (with a "not connected"
 * state) before the ApiUsage model exists. Once it does, you may replace usageTable() with
 * `prisma.apiUsage` for full type safety.
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

type Row = Record<string, unknown>;
type Table = {
  create(args: { data: Row }): Promise<unknown>;
  groupBy(args: Row): Promise<unknown[]>;
};

function usageTable(): Table | null {
  const table = (prisma as unknown as Record<string, unknown>).apiUsage as Table | undefined;
  return table && typeof table.create === "function" && typeof table.groupBy === "function" ? table : null;
}

const int = (n: number | undefined) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : null);
const text = (s: string | undefined | null) => (s ? s.slice(0, 120) : null);

/** Writes one row. Never throws; resolves to whether the row was saved. Safe to not await. */
export async function recordApiUsage(input: UsageInput): Promise<boolean> {
  const table = usageTable();
  if (!table) return false;

  try {
    await table.create({
      data: {
        service: input.service,
        provider: text(input.provider),
        model: text(input.model),
        endpoint: text(input.endpoint),
        userId: input.userId ?? null,
        ok: input.ok ?? true,
        status: int(input.status),
        tokensIn: int(input.tokensIn),
        tokensOut: int(input.tokensOut),
        durationMs: int(input.durationMs),
        at: new Date(),
      },
    });
    return true;
  } catch (error) {
    console.error("[admin-usage] record failed", error);
    return false;
  }
}

/**
 * Times `run`, records the call (ok when it resolves, failed when it throws) and returns the
 * result untouched. `read` can pull status / tokens out of the result; it may override `ok`
 * (useful for fetch, which does not throw on 4xx/5xx).
 */
export async function trackUsage<T>(
  meta: Omit<UsageInput, "ok" | "durationMs">,
  run: () => Promise<T>,
  read?: (result: T) => Partial<UsageInput>,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await run();
    let extra: Partial<UsageInput> = {};
    try {
      extra = read?.(result) ?? {};
    } catch {
      /* a bad reader must never break the call */
    }
    void recordApiUsage({ ...meta, ok: true, ...extra, durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    void recordApiUsage({ ...meta, ok: false, durationMs: Date.now() - startedAt });
    throw error;
  }
}

/* ── Read side ──────────────────────────────────────────────────────────── */

type GroupRow = {
  service: string;
  ok: boolean | null;
  _count: { _all: number };
  _sum: { tokensIn: number | null; tokensOut: number | null };
};
type ModelRow = { service: string; model: string | null; _count: { _all: number } };

function fold(rows: GroupRow[]) {
  const out = { github: 0, llm: 0, errors: 0, tokens: 0 };
  for (const row of rows) {
    const calls = row._count._all;
    if (row.service === "github") out.github += calls;
    else if (row.service === "llm") out.llm += calls;
    else continue;
    if (row.ok === false) out.errors += calls;
    out.tokens += (row._sum.tokensIn ?? 0) + (row._sum.tokensOut ?? 0);
  }
  return out;
}

/** One grouped query per bucket (service x ok), plus the previous window and the top models. */
export async function loadUsageSection(win: { start: number; bucketMs: number; bucketCount: number }): Promise<UsageSection> {
  const table = usageTable();
  if (!table) {
    return { available: false, reason: "The ApiUsage table is not set up yet. Add the model from prisma/admin-additions.prisma and migrate." };
  }

  const { start, bucketMs, bucketCount } = win;
  const group = (at: Row) =>
    table.groupBy({
      by: ["service", "ok"],
      where: { at },
      _count: { _all: true },
      _sum: { tokensIn: true, tokensOut: true },
    }) as Promise<GroupRow[]>;

  try {
    const [perBucket, before, models] = await Promise.all([
      Promise.all(
        Array.from({ length: bucketCount }, (_, i) => {
          const from = new Date(start + i * bucketMs);
          return group(i === bucketCount - 1 ? { gte: from } : { gte: from, lt: new Date(start + (i + 1) * bucketMs) });
        }),
      ),
      group({ gte: new Date(start - bucketMs * bucketCount), lt: new Date(start) }),
      table.groupBy({
        by: ["service", "model"],
        where: { at: { gte: new Date(start) }, model: { not: null } },
        _count: { _all: true },
      }) as Promise<ModelRow[]>,
    ]);

    const buckets: UsageBucket[] = perBucket.map((rows, i) => ({ t: start + i * bucketMs, ...fold(rows) }));
    const totals = buckets.reduce(
      (sum, b) => ({ github: sum.github + b.github, llm: sum.llm + b.llm, errors: sum.errors + b.errors, tokens: sum.tokens + b.tokens }),
      { github: 0, llm: 0, errors: 0, tokens: 0 },
    );
    const prev = fold(before);

    return {
      available: true,
      buckets,
      totals,
      previous: { github: prev.github, llm: prev.llm },
      models: models
        .filter((m): m is ModelRow & { model: string } => Boolean(m.model) && (m.service === "github" || m.service === "llm"))
        .map((m) => ({ service: m.service as UsageService, name: m.model, calls: m._count._all }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 6),
    };
  } catch (error) {
    console.error("[admin-usage] read failed", error);
    return { available: false, reason: "Could not read the ApiUsage table. Check that the migration has run." };
  }
}
