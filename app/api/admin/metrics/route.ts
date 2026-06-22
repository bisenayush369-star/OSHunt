import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  // Ensure only authorized admin session is allowed (customize validation as needed)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = await prisma.apiProvider.findMany();
  return NextResponse.json(metrics);
}