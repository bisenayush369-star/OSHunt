import { SignJWT, jwtVerify } from "jose";

export const COOKIE = "osh_admin";
export const GATE = "osh_gate";
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

export const createSession = () => sign("owner", "2h");
export const createGate = () => sign("gate", "5m");
export const verifySession = (t?: string) => check(t, "owner");
export const verifyGate = (t?: string) => check(t, "gate");

export async function isAdmin() {
  const { cookies } = await import("next/headers");
  return verifySession((await cookies()).get(COOKIE)?.value);
}
