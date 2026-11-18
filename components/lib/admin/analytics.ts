import { bucketWindow, type RangeKey, type StatsBucket, type StatsResponse } from "./contract";
import { loadBillingSection } from "./billing";
import { dense, n, q, ts } from "./db";
import { loadUsageSection } from "./usage";

export type { RangeKey } from "./contract";

/**
 * Numbers for the Overview screen. Server only.
 *
 * Every metric is ONE grouped SQL query over the current window plus the window just before it (for the
 * "vs previous" deltas), so the cost does not grow with the number of buckets or accounts. Buckets are
 * aligned to the viewer's local hours / midnights / Mondays (`tzMinutes`). Admin-written Activity rows
 * (blocking someone) are not user behaviour and are left out of the activity numbers.
 *
 * A 5-second cache per (range, tz) protects the database from several tabs polling at once; blocking an
 * account calls invalidateStatsCache() so the next read is fresh.
 */

const ADMIN_VERBS = `('admin_blocked', 'admin_unblocked')`;
const CACHE_MS = 5_000;

const cache = new Map<string, { at: number; value: Promise<StatsResponse> }>();

export function invalidateStatsCache(): void {
  cache.clear();
}

export function getStats(range: RangeKey, tzMinutes = 0, now = Date.now()): Promise<StatsResponse> {
  const key = `${range}:${tzMinutes}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.value;

  const value = compute(range, tzMinutes, now).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { at: now, value });
  return value;
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);

async function compute(range: RangeKey, tzMinutes: number, now: number): Promise<StatsResponse> {
  const win = bucketWindow(range, now, tzMinutes);
  const { start, end, bucketMs, bucketCount, prevStart } = win;
  const length = bucketCount * 2;

  const bucketed = (table: string, column: string, extra: string) =>
    `SELECT floor((extract(epoch FROM "${column}") * 1000 - $1::float8) / $2::float8)::int AS b, count(*)::int AS n
       FROM "${table}"
      WHERE ${extra} "${column}" >= ${ts("$1")} AND "${column}" < ${ts("$3")}
      GROUP BY 1`;

  const [signupRows, before, totalsRows, activityRows, activeRows, usage] = await Promise.all([
    q<{ b: number; n: number }>(bucketed("User", "createdAt", `"deletedAt" IS NULL AND`), prevStart, bucketMs, end),
    q<{ n: number }>(`SELECT count(*)::int AS n FROM "User" WHERE "deletedAt" IS NULL AND "createdAt" < ${ts("$1")}`, start),
    q<{ users: number; blocked: number; onboarded: number }>(
      `SELECT count(*)::int AS users, (count(*) FILTER (WHERE blocked))::int AS blocked, (count(*) FILTER (WHERE onboarded))::int AS onboarded
         FROM "User" WHERE "deletedAt" IS NULL`,
    ),
    q<{ b: number; n: number }>(bucketed("Activity", "at", `action NOT IN ${ADMIN_VERBS} AND`), prevStart, bucketMs, end),
    q<{ cur: number; prev: number }>(
      `SELECT (count(DISTINCT "userId") FILTER (WHERE "at" >= ${ts("$2")}))::int AS cur,
              (count(DISTINCT "userId") FILTER (WHERE "at" <  ${ts("$2")}))::int AS prev
         FROM "Activity"
        WHERE action NOT IN ${ADMIN_VERBS} AND "at" >= ${ts("$1")} AND "at" < ${ts("$3")}`,
      prevStart,
      start,
      end,
    ),
    loadUsageSection(win),
  ]);

  const signups = dense(signupRows, length);
  const activity = dense(activityRows, length);
  const users = n(totalsRows[0]?.users);

  let running = n(before[0]?.n);
  const buckets: StatsBucket[] = Array.from({ length: bucketCount }, (_, i) => {
    const added = signups[bucketCount + i]!;
    running += added;
    return { t: start + i * bucketMs, users: running, signups: added, activity: activity[bucketCount + i]! };
  });

  const billing = await loadBillingSection(win, users, now);

  return {
    range,
    updatedAt: now,
    buckets,
    totals: {
      users,
      blocked: n(totalsRows[0]?.blocked),
      onboarded: n(totalsRows[0]?.onboarded),
      active: n(activeRows[0]?.cur),
      signups: sum(signups.slice(bucketCount)),
      activity: sum(activity.slice(bucketCount)),
    },
    previous: { signups: sum(signups.slice(0, bucketCount)), activity: sum(activity.slice(0, bucketCount)), active: n(activeRows[0]?.prev) },
    usage,
    billing,
  };
}
