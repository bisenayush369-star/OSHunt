import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session primitives. Keep this file edge-safe: `jose` only, no node:crypto.
 * Anything that needs Node APIs (timing-safe compares) lives in credentials.ts.
 */

export const COOKIE = "osh_admin";
export const GATE = "osh_gate";

/** Cookie maxAge and JWT expiry are both derived from these, so they cannot drift. */
export const SESSION_TTL_S = 2 * 60 * 60;
export const GATE_TTL_S = 5 * 60;

export const DEV_ADMIN_SECRET = "oshunt-dev-admin-session-secret-32chars";
export const DEV_ADMIN_ID = "owner-admin";
export const DEV_ADMIN_PASSWORD = "owner-admin-password";

export function getAdminSecret() {
  const configured = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  if (configured.length >= 32) return configured;
  if (process.env.NODE_ENV !== "production") return DEV_ADMIN_SECRET;
  return "";
}

export function getAdminId() {
  return (process.env.ADMIN_ID ?? "").trim() || (process.env.NODE_ENV !== "production" ? DEV_ADMIN_ID : "");
}

export function getAdminPassword() {
  return (process.env.ADMIN_PASSWORD ?? "").trim() || (process.env.NODE_ENV !== "production" ? DEV_ADMIN_PASSWORD : "");
}

/** True when sign-in can work. In production nothing falls back to the dev defaults. */
export function isAuthConfigured() {
  return getAdminSecret().length >= 32 && Boolean(getAdminId()) && Boolean(getAdminPassword());
}

/** One place for cookie attributes: httpOnly, SameSite=Strict, Secure in production. */
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

const secret = () => getAdminSecret();
const key = () => new TextEncoder().encode(secret());

const sign = (role: string, exp: string) =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key());

async function check(token: string | undefined, role: string) {
  if (!token || secret().length < 32) return false;

  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.role === role;
  } catch {
    return false;
  }
}

export const createSession = () => sign("owner", `${SESSION_TTL_S}s`);
export const createGate = () => sign("gate", `${GATE_TTL_S}s`);
export const verifySession = (t?: string) => check(t, "owner");
export const verifyGate = (t?: string) => check(t, "gate");

export async function isAdmin() {
  const { cookies } = await import("next/headers");
  return verifySession((await cookies()).get(COOKIE)?.value);
}
