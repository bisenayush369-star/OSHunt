import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    const fullName = typeof data.name === "string" ? data.name.trim() : "";
    const fullEmail = typeof data.email === "string" ? data.email.trim() : "";
    const firstName = typeof data.firstName === "string" ? data.firstName.trim() : (fullName ? fullName.split(/\s+/)[0] ?? "" : "");
    const lastName = typeof data.lastName === "string" ? data.lastName.trim() : (fullName ? fullName.split(/\s+/).slice(1).join(" ") ?? "" : "");

    // Update the user in Neon Database
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: fullName || session.user.name || undefined,
        email: fullEmail || session.user.email || undefined,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        newsletter: Boolean(data.newsletter),
        useCase: data.useCase || undefined,
        onboarded: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}