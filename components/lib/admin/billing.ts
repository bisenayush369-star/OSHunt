import type { BillingSection } from "./contract";
import { isMissingRelation, n, q, ts } from "./db";

/**
 * Paid accounts, read from the Subscription table. Server only.
 *
 * "Paid" means: a Subscription row that has started and has not ended yet, counting rows whose status is
 * 'active' or that carry an endedAt (they were active until then). Rows in any other state with no
 * endedAt (for example 'past_due') are not counted. If the table does not exist the dashboard shows
 * "billing not connected" instead of zeros, and the Paid filter is hidden.
 */

const COUNTED = `(s.status = 'active' OR s."endedAt" IS NOT NULL)`;
const activeAt = (param: string) => `${COUNTED} AND s."startedAt" <= ${ts(param)} AND (s."endedAt" IS NULL OR s."endedAt" > ${ts(param)})`;

const NOT_CONNECTED = "The Subscription table could not be read, so paid accounts are not counted.";

/** Ids of accounts that are paid right now. null = billing is not connected. */
export async function loadPaidUserIds(now = Date.now()): Promise<Set<string> | null> {
  try {
    const rows = await q<{ userId: string }>(`SELECT DISTINCT s."userId" FROM "Subscription" s WHERE ${activeAt("$1")}`, now);
    return new Set(rows.map((r) => r.userId));
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[admin-billing] paid ids failed", error);
    return null;
  }
}

export async function isUserPaid(userId: string, now = Date.now()): Promise<boolean> {
  try {
    const rows = await q<{ x: number }>(`SELECT 1 AS x FROM "Subscription" s WHERE s."userId" = $2 AND ${activeAt("$1")} LIMIT 1`, now, userId);
    return rows.length > 0;
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[admin-billing] isUserPaid failed", error);
    return false;
  }
}

/** Paid accounts at the end of every bucket, the plan split, and the conversion. */
export async function loadBillingSection(win: { start: number; bucketMs: number; bucketCount: number }, totalUsers: number, now = Date.now()): Promise<BillingSection> {
  const { start, bucketMs, bucketCount } = win;
  try {
    const [points, paidNow, plans] = await Promise.all([
      // Points 0..N: the paid count at the window start, then at the end of every bucket.
      q<{ b: number; n: number }>(
        `SELECT g.i::int AS b, count(DISTINCT s."userId")::int AS n
           FROM generate_series(0, $2::int) AS g(i)
           LEFT JOIN "Subscription" s
             ON ${COUNTED}
            AND s."startedAt" <= ${ts("($1::float8 + g.i * $3::float8)")}
            AND (s."endedAt" IS NULL OR s."endedAt" > ${ts("($1::float8 + g.i * $3::float8)")})
          GROUP BY g.i ORDER BY g.i`,
        start,
        bucketCount,
        bucketMs,
      ),
      q<{ n: number }>(`SELECT count(DISTINCT s."userId")::int AS n FROM "Subscription" s WHERE ${activeAt("$1")}`, now),
      q<{ plan: string; users: number }>(
        `SELECT s.plan AS plan, count(DISTINCT s."userId")::int AS users FROM "Subscription" s WHERE ${activeAt("$1")} GROUP BY s.plan ORDER BY users DESC, s.plan LIMIT 6`,
        now,
      ),
    ]);

    const byIndex = new Map(points.map((p) => [n(p.b), n(p.n)]));
    const paid = n(paidNow[0]?.n);
    const atStart = byIndex.get(0) ?? 0;
    const series = Array.from({ length: bucketCount }, (_, i) => byIndex.get(i + 1) ?? 0);
    // The last bucket is still filling; show the exact number for right now.
    if (series.length) series[series.length - 1] = paid;

    return {
      available: true,
      series,
      totals: {
        paid,
        free: Math.max(0, totalUsers - paid),
        netNew: paid - atStart,
        conversionPct: totalUsers > 0 ? Math.round((paid / totalUsers) * 1000) / 10 : 0,
      },
      plans: plans.map((p) => ({ plan: String(p.plan), users: n(p.users) })),
    };
  } catch (error) {
    if (!isMissingRelation(error)) console.error("[admin-billing] section failed", error);
    return { available: false, reason: NOT_CONNECTED };
  }
}
