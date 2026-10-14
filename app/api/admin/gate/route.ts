import type { NextRequest } from "next/server";
import { checkAdminId, checkAdminPassword } from "@/components/lib/admin/credentials";
import { clientIp, fail, isSameOrigin, json } from "@/components/lib/admin/guard";
import { clearRateLimit, rateLimit } from "@/components/lib/admin/rate-limit";
import {
  COOKIE,
  GATE,
  GATE_TTL_S,
  SESSION_TTL_S,
  cookieOptions,
  createGate,
  createSession,
  isAuthConfigured,
  verifyGate,
} from "@/components/lib/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ATTEMPTS = 8;
const WINDOW_MS = 10 * 60_000;

/**
 * POST { step: "id", id }            -> sets the 5 minute gate cookie when the ID matches
 * POST { step: "password", password } -> needs the gate cookie; sets the 2 hour session cookie
 * DELETE                              -> signs out (clears both cookies)
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail(403, "bad_origin", "Request origin not allowed.");
  if (!isAuthConfigured()) {
    return fail(503, "not_configured", "Admin sign-in is not configured on this server.");
  }

  const key = `gate:${clientIp(req)}`;
  const limit = rateLimit(key, ATTEMPTS, WINDOW_MS);
  if (!limit.ok) {
    return fail(
      429,
      "rate_limited",
      `Too many attempts. Try again in ${Math.max(1, Math.ceil(limit.retryAfterS / 60))} min.`,
      { "Retry-After": String(limit.retryAfterS) },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    step?: unknown;
    id?: unknown;
    password?: unknown;
  } | null;
  if (!body || typeof body !== "object") return fail(400, "bad_request", "Send a JSON body.");

  if (body.step === "id") {
    if (typeof body.id !== "string" || !checkAdminId(body.id)) {
      return fail(401, "invalid_credentials", "Those details did not match.");
    }
    const res = json({ ok: true, next: "password" as const });
    res.cookies.set(GATE, await createGate(), cookieOptions(GATE_TTL_S));
    return res;
  }

  if (body.step === "password") {
    if (!(await verifyGate(req.cookies.get(GATE)?.value))) {
      return fail(401, "gate_expired", "That took too long. Start again with your admin ID.");
    }
    if (typeof body.password !== "string" || !checkAdminPassword(body.password)) {
      return fail(401, "invalid_credentials", "Those details did not match.");
    }

    clearRateLimit(key);
    const res = json({ ok: true, next: "admin" as const });
    res.cookies.set(COOKIE, await createSession(), cookieOptions(SESSION_TTL_S));
    res.cookies.set(GATE, "", cookieOptions(0));
    return res;
  }

  return fail(400, "bad_request", 'step must be "id" or "password".');
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return fail(403, "bad_origin", "Request origin not allowed.");
  const res = json({ ok: true });
  res.cookies.set(COOKIE, "", cookieOptions(0));
  res.cookies.set(GATE, "", cookieOptions(0));
  return res;
}
