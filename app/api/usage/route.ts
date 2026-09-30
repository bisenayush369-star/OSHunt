import { auth } from "@/components/lib/auth";
import { prisma } from "@/components/lib/prisma";
import { getUsageSummary } from "@/components/lib/quota";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getUsageSummary(session.user.id);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to fetch usage summary", error);
    return NextResponse.json({ error: "Unable to load usage summary" }, { status: 500 });
  }
}
