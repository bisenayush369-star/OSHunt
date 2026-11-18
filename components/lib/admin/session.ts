import { SignJWT, jwtVerify } from "jose";

/**
 * Admin session primitives. Edge-safe: `jose` only, no node:crypto (the timing-safe compare lives in
 * credentials.ts).
 *
 * Two signed cookies, both httpOnly + SameSite=Strict (+ Secure in production):
 *   osh_knock  10 minutes. Set when the footer heart is clicked. Without it /admin/login answers 404.
 *   osh_admin  2 hours.    Set after the ID and password match. Without it /admin answers 404.
 * Both are HS256 JWTs signed with ADMIN_SESSION_SECRET and carry a `role`, so one can never stand in for
 * the other.
 */

export const COOKIES = { admin: "osh_admin", knock: "osh_knock" } as const;

/** Cookie maxAge and JWT expiry come from the same numbers, so they cannot drift apart. */
export const SESSION_TTL_S = 2 * 60 * 60;
export const KNOCK_TTL_S = 10 * 60;

export const getAdminSecret = (): string => {
  const secret = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  return secret.length >= 32 ? secret : "";
};
export const getAdminId = (): string => (process.env.ADMIN_ID ?? "").trim();
export const getAdminPassword = (): string => (process.env.ADMIN_PASSWORD ?? "").trim();

/** True when sign-in can work. Nothing falls back to a default in any environment. */
export const isAuthConfigured = (): boolean => Boolean(getAdminSecret() && getAdminId() && getAdminPassword());

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

const key = () => new TextEncoder().encode(getAdminSecret());

const sign = (role: "owner" | "knock", ttlSeconds: number) =>
  new SignJWT({ role }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(key());

async function check(token: string | undefined, role: "owner" | "knock"): Promise<boolean> {
  if (!token || !getAdminSecret()) return false;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"], clockTolerance: 5 });
    return payload.role === role;
  } catch {
    return false;
  }
}

export const createSession = () => sign("owner", SESSION_TTL_S);
export const createKnock = () => sign("knock", KNOCK_TTL_S);
export const verifySession = (token?: string) => check(token, "owner");
export const verifyKnock = (token?: string) => check(token, "knock");

/** Server components and route handlers: is the current request from the signed-in owner? */
export async function isAdmin(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  return verifySession((await cookies()).get(COOKIES.admin)?.value);
}

/** Server components: did the heart get clicked in the last 10 minutes? */
export async function hasKnock(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  return verifyKnock((await cookies()).get(COOKIES.knock)?.value);
}
