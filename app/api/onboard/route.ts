import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Check who is logged in
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized - No session found" }, { status: 401 });
    }

    // 2. Grab the form data
    const data = await req.json();

    // 3. Update the user in the Neon Database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        newsletter: data.newsletter,
        useCase: data.useCase,
        onboarded: true, // 🔥 This unlocks the /hunt page!
      },
    });

    // 4. Send back a clean JSON success message
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Onboarding API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}