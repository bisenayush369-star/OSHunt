import type { NextRequest } from "next/server";
import { getStats } from "@/components/lib/admin/analytics";
import { DEFAULT_RANGE, parseRange, parseTzMinutes } from "@/components/lib/admin/contract";
import { fail, json, requireAdmin } from "@/components/lib/admin/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/stats?range=24h|7d|30d|6m&tz=<minutes east of UTC>  ->  StatsResponse */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const params = req.nextUrl.searchParams;
  const raw = params.get("range");
  const range = raw ? parseRange(raw) : DEFAULT_RANGE;
  if (!range) return fail(400, "bad_range", "Range must be 24h, 7d, 30d or 6m.");

  try {
    return json(await getStats(range, parseTzMinutes(params.get("tz"))));
  } catch (error) {
    console.error("[admin-stats] failed", error);
    return fail(500, "stats_failed", "Could not load the numbers.");
  }
}
