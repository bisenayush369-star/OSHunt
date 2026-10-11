import type { NextRequest } from "next/server";
import { getStats } from "@/components/lib/admin/analytics";
import { DEFAULT_RANGE, RANGES, parseRange, type StatsResponse } from "@/components/lib/admin/contract";
import { fail, json, requireAdmin } from "@/components/lib/admin/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/stats?range=24h|7d|30d|6m  ("1d" is accepted as an alias for 24h). */
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const range = parseRange(req.nextUrl.searchParams.get("range") ?? DEFAULT_RANGE);
  if (!range) return fail(400, "invalid_range", `Use one of: ${RANGES.join(", ")}.`);

  try {
    return json<StatsResponse>(await getStats(range));
  } catch (error) {
    console.error("[admin/stats] failed", error);
    return fail(500, "server_error", "Could not load stats.");
  }
}
