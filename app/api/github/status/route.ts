import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConnectionStatus } from "@/lib/github-connection";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ connected: false, expired: false });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ connected: false, expired: false });
  }

  const status = await getConnectionStatus(session.user.id);
  return NextResponse.json(status);
}
