import { prisma } from "@/components/lib/prisma";
import {
  RANGE_META,
  RECENT_LIMIT,
  type RangeKey,
  type RecentEvent,
  type StatsBucket,
  type StatsResponse,
} from "./contract";
import { displayName } from "./store";

export type { RangeKey } from "./contract";

/**
 * Analytics for the admin console. getStats() is the source of truth: the UI consumes
 * exactly its return type (StatsResponse in ./contract).
 *
 * Window: rolling, ending "now". bucket i covers [start + i*size, start + (i+1)*size).
 * The last bucket is open-ended so rows written while the query runs are not lost.
 *
 * Cost per call: 7 fixed queries (6 in parallel, then one name lookup for the radar dots)
 * + one indexed COUNT per bucket (24 / 7 / 30 / 26).
 * Recommended indexes: Activity(at) and Activity(userId, at).
 * Scale note: `active` uses groupBy(userId), which returns one row per active user.
 * Past ~50k active users, swap it for a raw COUNT(DISTINCT user_id).
 */

export async function getStats(range: RangeKey): Promise<StatsResponse> {
  const now = Date.now();
  const { bucketMs, bucketCount } = RANGE_META[range];
  const start = now - bucketMs * bucketCount;
  const since = new Date(start);

  const perBucket = Array.from({ length: bucketCount }, (_, i) => {
    const from = new Date(start + i * bucketMs);
    const isLast = i === bucketCount - 1;
    return prisma.activity.count({
      where: { at: isLast ? { gte: from } : { gte: from, lt: new Date(start + (i + 1) * bucketMs) } },
    });
  });

  const [users, blocked, onboarded, signupRows, activeGroups, bucketCounts, recentRows] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { blocked: true } }),
    prisma.user.count({ where: { onboarded: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.activity.groupBy({ by: ["userId"], where: { at: { gte: since } } }),
    Promise.all(perBucket),
    prisma.activity.findMany({
      where: { at: { gte: since } },
      orderBy: { at: "desc" },
      take: RECENT_LIMIT,
      select: { id: true, userId: true, action: true, at: true },
    }),
  ]);

  const buckets: StatsBucket[] = bucketCounts.map((activity, i) => ({
    t: start + i * bucketMs,
    signups: 0,
    activity,
  }));

  for (const { createdAt } of signupRows) {
    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((createdAt.getTime() - start) / bucketMs)));
    const bucket = buckets[index];
    if (bucket) bucket.signups += 1;
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
  let running = stats.totals.users - stats.totals.signups;
  const points = stats.buckets.map((bucket) => {
    running += bucket.signups;
    return { label: legacyLabel(bucket.t, stats.range), value: running, date: new Date(bucket.t).toISOString() };
  });

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
