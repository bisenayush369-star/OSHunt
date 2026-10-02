import { prisma } from "@/components/lib/prisma";

export type RangeKey = "24h" | "7d" | "30d" | "6m";

export type ChartPoint = {
  label: string;
  value: number;
  date: string;
};

export type RangeMetrics = {
  range: RangeKey;
  totalUsers: number;
  activeUsers: number;
  conversionRate: number;
  averagePerWindow: number;
  peakValue: number;
  points: ChartPoint[];
};

function getRangeConfig(range: RangeKey) {
  const now = new Date();

  switch (range) {
    case "24h":
      return {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        bucketSizeMs: 2 * 60 * 60 * 1000,
        bucketCount: 12,
      };
    case "7d":
      return {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        bucketSizeMs: 24 * 60 * 60 * 1000,
        bucketCount: 7,
      };
    case "30d":
      return {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        bucketSizeMs: 5 * 24 * 60 * 60 * 1000,
        bucketCount: 6,
      };
    case "6m":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        bucketSizeMs: 30 * 24 * 60 * 60 * 1000,
        bucketCount: 6,
      };
    default:
      return {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        bucketSizeMs: 2 * 60 * 60 * 1000,
        bucketCount: 12,
      };
  }
}

function formatBucketLabel(date: Date, range: RangeKey) {
  switch (range) {
    case "24h":
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    case "7d":
      return date.toLocaleDateString("en-US", { weekday: "short" });
    case "30d":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "6m":
      return date.toLocaleDateString("en-US", { month: "short" });
    default:
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
}

export async function getRealMetrics(range: RangeKey): Promise<RangeMetrics> {
  const now = new Date();
  const config = getRangeConfig(range);
  const points = Array.from({ length: config.bucketCount }, (_, index) => {
    const bucketStart = new Date(config.start.getTime() + index * config.bucketSizeMs);
    return {
      label: formatBucketLabel(bucketStart, range),
      value: 0,
      date: bucketStart.toISOString(),
    } satisfies ChartPoint;
  });

  const [totalUsers, onboardedUsers, allUsers, recentActivities] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { onboarded: true } }),
    prisma.user.findMany({
      where: { createdAt: { lte: now } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.activity.findMany({
      where: { at: { gte: config.start } },
      select: { userId: true, at: true },
      orderBy: { at: "asc" },
    }),
  ]);

  const uniqueActiveUsers = new Set<string>();
  for (const activity of recentActivities) uniqueActiveUsers.add(activity.userId);

  for (let bucketIndex = 0; bucketIndex < points.length; bucketIndex++) {
    const bucketStart = new Date(config.start.getTime() + bucketIndex * config.bucketSizeMs);
    const bucketEnd = new Date(bucketStart.getTime() + config.bucketSizeMs);
    points[bucketIndex].value = allUsers.filter((user) => user.createdAt.getTime() <= bucketEnd.getTime()).length;
  }

  const activeUsers = uniqueActiveUsers.size;
  const peakValue = points.reduce((max, point) => Math.max(max, point.value), 0);
  const averagePerWindow = points.length ? Math.round(points.reduce((sum, point) => sum + point.value, 0) / points.length) : 0;
  const conversionRate = totalUsers > 0 ? Math.round((onboardedUsers / totalUsers) * 100) : 0;

  return {
    range,
    totalUsers,
    activeUsers,
    conversionRate,
    averagePerWindow,
    peakValue,
    points,
  };
}

export async function getAllRealMetrics() {
  const ranges = {
    "24h": await getRealMetrics("24h"),
    "7d": await getRealMetrics("7d"),
    "30d": await getRealMetrics("30d"),
    "6m": await getRealMetrics("6m"),
  };

  return {
    generatedAt: nowIso(),
    totalUsers: ranges["24h"].totalUsers,
    ranges,
  };
}

function nowIso() {
  return new Date().toISOString();
}
