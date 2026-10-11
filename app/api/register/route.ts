import { NextResponse } from "next/server";
import { prisma } from "@/components/lib/prisma";
import { hashPassword } from "@/components/lib/auth";
import { getDisplayInitials } from "@/components/lib/profile";

function createInitialsAvatar(name: string) {
  const initials = getDisplayInitials(name, "", 2);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="${initials}">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#a8ff3e"/>
          <stop offset="100%" stop-color="#62d7a5"/>
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="24" fill="#111111"/>
      <circle cx="64" cy="64" r="52" fill="url(#g)"/>
      <text x="64" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#090909" letter-spacing="1">${initials}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    const email = typeof data?.email === "string" ? data.email.trim().toLowerCase() : "";
    const password = typeof data?.password === "string" ? data.password : "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        image: createInitialsAvatar(name),
        lastSeen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Use POST to create a user." }, { status: 405 });
}
