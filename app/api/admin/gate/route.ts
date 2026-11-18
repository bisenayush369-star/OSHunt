import type { NextRequest } from "next/server";
import { GATE_ERRORS, parseGateRequest, type GateResponse } from "@/components/lib/admin/contract";
import { checkCredentials } from "@/components/lib/admin/credentials";
import { clientIp, fail, isSameOrigin, json } from "@/components/lib/admin/guard";
import { clearRateLimit, rateLimit } from "@/components/lib/admin/rate-limit";
import { COOKIES, KNOCK_TTL_S, SESSION_TTL_S, cookieOptions, createKnock, createSession, isAuthConfigured, verifyKnock } from "@/components/lib/admin/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WINDOW_MS = 10 * 60_000;
const LOGIN_LIMIT = 8;
const KNOCK_LIMIT = 30;

/**
 * The only way into the admin.
 *   POST { step: "knock" }                 the footer heart was clicked: sets the 10-minute osh_knock cookie.
 *   POST { step: "login", id, password }   needs that cookie; on a match sets the 2-hour osh_admin cookie.
 *   DELETE                                 signs out (clears both cookies).
 * Every failed login looks the same ("Those details did not match."), both values are compared in constant
 * time, and attempts are limited per IP.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return fail(403, GATE_ERRORS.badOrigin, "Request origin not allowed.");
  if (!isAuthConfigured()) return fail(503, GATE_ERRORS.notConfigured, "Admin sign-in is not configured on this server.");

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* handled below */
  }
  const request = parseGateRequest(body);
  if (!request) return fail(400, GATE_ERRORS.badRequest, "Bad request.");

  const ip = clientIp(req);

  if (request.step === "knock") {
    const limited = rateLimit(`knock:${ip}`, KNOCK_LIMIT, WINDOW_MS);
    if (!limited.ok) return fail(429, GATE_ERRORS.rateLimited, "Too many attempts. Try again later.", { "Retry-After": String(limited.retryAfterS) });
    const res = json<GateResponse>({ ok: true, next: "login" });
    res.cookies.set(COOKIES.knock, await createKnock(), cookieOptions(KNOCK_TTL_S));
    return res;
  }

  const localDevBypass = process.env.NODE_ENV !== "production";
  if (!localDevBypass && !(await verifyKnock(req.cookies.get(COOKIES.knock)?.value))) {
    return fail(401, GATE_ERRORS.noKnock, "That sign-in expired. Open it again from the heart.");
  }

  const limited = rateLimit(`login:${ip}`, LOGIN_LIMIT, WINDOW_MS);
  if (!limited.ok) {
    const minutes = Math.max(1, Math.ceil(limited.retryAfterS / 60));
    return fail(429, GATE_ERRORS.rateLimited, `Too many attempts. Try again in ${minutes} min.`, { "Retry-After": String(limited.retryAfterS) });
  }

  if (!checkCredentials(request.id, request.password)) return fail(401, GATE_ERRORS.invalid, "Those details did not match.");

  clearRateLimit(`login:${ip}`);
  const res = json<GateResponse>({ ok: true, next: "admin" });
  res.cookies.set(COOKIES.admin, await createSession(), cookieOptions(SESSION_TTL_S));
  res.cookies.set(COOKIES.knock, "", cookieOptions(0));
  return res;
}

export async function DELETE(req: NextRequest) {
  if (!isSameOrigin(req)) return fail(403, GATE_ERRORS.badOrigin, "Request origin not allowed.");
  const res = json({ ok: true });
  res.cookies.set(COOKIES.admin, "", cookieOptions(0));
  res.cookies.set(COOKIES.knock, "", cookieOptions(0));
  return res;
}
