import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { COOKIE, GATE, createSession, getAdminId, getAdminPassword, verifyGate } from "@/app/admin/lib/session";

const hits = new Map<string, { count: number; resetAt: number }>();
const sha = (value: string) => createHash("sha256").update(value).digest();
const same = (a: string, b: string) => {
  try {
    return timingSafeEqual(sha(a), sha(b));
  } catch {
    return false;
  }
};

export async function POST(req: NextRequest) {
  if (!(await verifyGate(req.cookies.get(GATE)?.value))) {
    return new NextResponse(null, { status: 404 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const existing = hits.get(ip);
  const windowOpen = !!existing && existing.resetAt > now;

  if (windowOpen && existing!.count >= 5) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const adminId = getAdminId();
  const adminPassword = getAdminPassword();
  if (!adminId || !adminPassword) {
    return NextResponse.json({ error: "Admin env vars are not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const idValue = String(body.id ?? "");
  const passwordValue = String(body.password ?? "");
  const idOk = same(idValue, adminId);
  const passwordOk = same(passwordValue, adminPassword);

  if (!(idOk && passwordOk)) {
    const nextCount = windowOpen ? existing!.count + 1 : 1;
    hits.set(ip, { count: nextCount, resetAt: windowOpen ? existing!.resetAt : now + 15 * 60_000 });
    return NextResponse.json({ error: "Wrong ID or password." }, { status: 401 });
  }

  hits.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  res.cookies.delete(GATE);
  return res;
}
