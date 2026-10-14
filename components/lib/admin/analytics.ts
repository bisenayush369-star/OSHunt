import { prisma } from "@/components/lib/prisma";
import {
  RANGE_META,
  RECENT_LIMIT,
  type RangeKey,
  type RecentEvent,
  type StatsBucket,
  type StatsResponse,
} from "./contract";
import { buildBillingSection, loadSubscriptions } from "./billing";
import { displayName } from "./store";
import { loadUsageSection } from "./usage";

export type { RangeKey } from "./contract";

/**
 * Analytics for the admin console. getStats() is the source of truth: the UI consumes
 * exactly its return type (StatsResponse in ./contract).
 *
 * Window: rolling, ending "now". bucket i covers [start + i*size, start + (i+1)*size).
 * The last bucket is open-ended so rows written while the query runs are not lost.
 *
 * Cost per call (cached for 8 s): 12 fixed queries, plus one indexed COUNT per bucket (24 / 7 / 30 / 26)
 * for activity and one grouped query per bucket for API usage when that table exists.
 * Recommended indexes: Activity(at) and Activity(userId, at).
 * Scale note: `active` uses groupBy(userId), which returns one row per active user.
 * Past ~50k active users, swap it for a raw COUNT(DISTINCT user_id).
 */

/**
 * Short in-memory cache (per server instance). Several open tabs polling every 20 s cost one
 * computation, not one each. The block route calls invalidateStatsCache() so the refresh
 * right after a block shows the new `blocked` total.
 */
const CACHE_MS = 8_000;
const cache = new Map<RangeKey, { at: number; value: Promise<StatsResponse> }>();

export function invalidateStatsCache() {
  cache.clear();
}

export function getStats(range: RangeKey): Promise<StatsResponse> {
  const hit = cache.get(range);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const value = computeStats(range);
  cache.set(range, { at: Date.now(), value });
  value.catch(() => {
    if (cache.get(range)?.value === value) cache.delete(range);
  });
  return value;
}

async function safeQuery<T>(fallback: T, label: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isSchemaMismatch = /unknown field|unknown argument|does not exist|missing field|column .* does not exist|relation .* does not exist|not a known field|PrismaClientKnownRequestError/i.test(message);

    if (isSchemaMismatch) {
      console.warn(`[admin/analytics] fallback used for ${label}:`, message);
      return fallback;
    }

    throw error;
  }
}

async function computeStats(range: RangeKey): Promise<StatsResponse> {
  const now = Date.now();
  const { bucketMs, bucketCount } = RANGE_META[range];
  const start = now - bucketMs * bucketCount;
  const since = new Date(start);
  const previousSince = new Date(start - bucketMs * bucketCount);

  const perBucket = Array.from({ length: bucketCount }, (_, i) => {
    const from = new Date(start + i * bucketMs);
    const isLast = i === bucketCount - 1;
    return safeQuery(0, `activity bucket ${i}`, () => prisma.activity.count({
      where: { at: isLast ? { gte: from } : { gte: from, lt: new Date(start + (i + 1) * bucketMs) } },
    }));
  });

  const [
    users,
    blocked,
    onboarded,
    signupRows,
    activeGroups,
    bucketCounts,
    recentRows,
    previousSignups,
    previousActivity,
    usage,
    subscriptions,
  ] = await Promise.all([
    safeQuery(0, "user count", () => prisma.user.count()),
    safeQuery(0, "blocked count", () => prisma.user.count({ where: { blocked: true } })),
    safeQuery(0, "onboarded count", () => prisma.user.count({ where: { onboarded: true } })),
    safeQuery([], "recent signups", () => prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } })),
    safeQuery<any>([], "active groups", async () => prisma.activity.groupBy({ by: ["userId"], where: { at: { gte: since } } } as any)),
    Promise.all(perBucket),
    safeQuery([], "recent activity", () => prisma.activity.findMany({
      where: { at: { gte: since } },
      orderBy: { at: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, userId: true, action: true, at: true },
    })),
    safeQuery(0, "previous signups", () => prisma.user.count({ where: { createdAt: { gte: previousSince, lt: since } } })),
    safeQuery(0, "previous activity", () => prisma.activity.count({ where: { at: { gte: previousSince, lt: since } } })),
    loadUsageSection({ start, bucketMs, bucketCount }),
    loadSubscriptions(),
  ]);

  const buckets: StatsBucket[] = bucketCounts.map((activity, i) => ({
    t: start + i * bucketMs,
    users: 0,
    signups: 0,
    activity,
  }));

  for (const { createdAt } of signupRows) {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((createdAt.getTime() - start) / bucketMs)));
    const bucket = buckets[index];
    if (bucket) bucket.signups += 1;
  }

  // Running total: everyone who existed before the window, plus signups so far.
  let running = users - signupRows.length;
  for (const bucket of buckets) {
    running += bucket.signups;
    bucket.users = running;
  }

  // Activity has no guaranteed relation to User in the schema, so names are joined here.
  const ids = [...new Set(recentRows.map((row) => row.userId))];
  const people = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, email: true, githubUsername: true, blocked: true },
      })
    : [];
  const byId = new Map(people.map((person) => [person.id, person]));

  const recent: RecentEvent[] = recentRows.map((row) => {
    const person = byId.get(row.userId);
    return {
      id: row.id,
      userId: row.userId,
      name: person ? displayName(person) : "Unknown user",
      action: row.action,
      at: row.at.toISOString(),
      blocked: Boolean(person?.blocked),
    };
  });

  return {
    range,
    updatedAt: now,
    buckets,
    totals: {
      users,
      blocked,
      onboarded,
      active: activeGroups.length,
      signups: signupRows.length,
      activity: bucketCounts.reduce((sum, n) => sum + n, 0),
    },
    previous: { signups: previousSignups, activity: previousActivity },
    usage,
    billing: buildBillingSection(subscriptions, { start, bucketMs, bucketCount, now, totalUsers: users }),
    recent,
  };
}

/* ── Legacy adapters ─────────────────────────────────────────────────────
 * getRealMetrics / getAllRealMetrics and their types are kept so existing imports keep
 * compiling. They are derived from getStats(), so there is one query path.
 * New code must use getStats().
 * ───────────────────────────────────────────────────────────────────────── */

export type ChartPoint = { label: string; value: number; date: string };

export type RangeMetrics = {
  range: RangeKey;
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  averagePerWindow: number;
  peakValue: number;
  points: ChartPoint[];
};

function legacyLabel(t: number, range: RangeKey) {
  const date = new Date(t);
  switch (range) {
    case "24h":
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    case "7d":
      return date.toLocaleDateString("en-US", { weekday: "short" });
    case "6m":
      return date.toLocaleDateString("en-US", { month: "short" });
    default:
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

function toLegacy(stats: StatsResponse): RangeMetrics {
  // `value` stays what it always was: cumulative users at the end of each bucket.
  const points = stats.buckets.map((bucket) => ({
    label: legacyLabel(bucket.t, stats.range),
    value: bucket.users,
    date: new Date(bucket.t).toISOString(),
  }));

  const peakValue = points.reduce((max, point) => Math.max(max, point.value), 0);
  const averagePerWindow = points.length
    ? Math.round(points.reduce((sum, point) => sum + point.value, 0) / points.length)
    : 0;
  const conversionRate = stats.totals.users > 0 ? Math.round((stats.totals.onboarded / stats.totals.users) * 100) : 0;

  return {
    range: stats.range,
    totalUsers: stats.totals.users,
    activeUsers: stats.totals.active,
    conversionRate,
    averagePerWindow,
    peakValue,
    points,
  };
}

/** @deprecated Use getStats(). */
export async function getRealMetrics(range: RangeKey): Promise<RangeMetrics> {
  return toLegacy(await getStats(range));
}

/** @deprecated Use getStats(). */
export async function getAllRealMetrics() {
  const [h24, d7, d30, m6] = await Promise.all([
    getRealMetrics("24h"),
    getRealMetrics("7d"),
    getRealMetrics("30d"),
    getRealMetrics("6m"),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    totalUsers: h24.totalUsers,
    ranges: { "24h": h24, "7d": d7, "30d": d30, "6m": m6 },
  };
}
