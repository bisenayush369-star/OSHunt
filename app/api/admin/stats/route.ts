import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/lib/session";
import { getRealMetrics, type RangeKey } from "@/app/admin/lib/analytics";
import { listUsers } from "@/app/admin/lib/store";

const validRanges = new Set(["1d", "7d", "30d", "6m"] as const);
const MAP: Record<(typeof validRanges extends Set<infer T> ? T : never), RangeKey> = {
  "1d": "24h",
  "7d": "7d",
  "30d": "30d",
  "6m": "6m",
};

function bucketToRange(label: string, value: number) {
  return {
    t: new Date(label).getTime(),
    signups: value,
    activity: value,
  };
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requested = request.nextUrl.searchParams.get("range") ?? "7d";
  if (!validRanges.has(requested as (typeof validRanges extends Set<infer T> ? T : never))) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const rangeKey = MAP[requested as keyof typeof MAP];
  const metrics = await getRealMetrics(rangeKey);
  const users = await listUsers();
  const blocked = users.filter((u) => u.blocked).length;
  const signups = metrics.points.reduce((sum, point) => sum + point.value, 0);
  const activity = metrics.points.reduce((sum, point) => sum + point.value, 0);

  return NextResponse.json({
    demo: false,
    updatedAt: Date.now(),
    totals: {
      users: metrics.totalUsers,
      blocked,
      active: metrics.activeUsers,
      signups,
      activity,
    },
    buckets: metrics.points.map((point) => ({
      t: new Date(point.date).getTime(),
      signups: point.value,
      activity: point.value,
    })),
  });
}
