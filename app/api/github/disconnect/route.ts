import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { disconnectGitHub } from "@/lib/github-connection";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await disconnectGitHub(session.user.id);
  return NextResponse.json({ success: true });
}
