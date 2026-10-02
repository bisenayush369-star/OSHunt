import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/admin/lib/session";
import { getAllRealMetrics, getRealMetrics, type RangeKey } from "@/app/admin/lib/analytics";

const validRanges = new Set<RangeKey>(["24h", "7d", "30d", "6m"]);

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedRange = request.nextUrl.searchParams.get("range") as RangeKey | null;

  if (requestedRange && !validRanges.has(requestedRange)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  if (requestedRange) {
    return NextResponse.json(await getRealMetrics(requestedRange));
  }

  return NextResponse.json(await getAllRealMetrics());
}