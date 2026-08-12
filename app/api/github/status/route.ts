import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConnectionStatus } from "@/lib/github-connection";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ connected: false, expired: false });
  }

  const status = await getConnectionStatus(session.user.id);
  return NextResponse.json(status);
}
