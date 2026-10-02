import { NextResponse } from "next/server";
import { COOKIE, GATE, createGate } from "@/app/admin/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  res.cookies.set(GATE, await createGate(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 300,
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  res.cookies.delete(GATE);
  return res;
}
