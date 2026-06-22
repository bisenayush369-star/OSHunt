import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    
    // Security check: Ensure only Vercel's automated system can trigger this
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Reset all usage counters back to 0 in your database
    const updateInfo = await prisma.apiProvider.updateMany({
      where: { isActive: true },
      data: { requestsUsed: 0 },
    });

    console.log(`[CRON] Daily reset complete. Reset ${updateInfo.count} providers.`);
    return NextResponse.json({ success: true, resetCount: updateInfo.count });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CRON ERROR]: Failed to reset database limits:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}