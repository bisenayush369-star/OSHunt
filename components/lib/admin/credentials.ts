import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminId, getAdminPassword } from "./session";

/** Node runtime only (route handlers). Do not import from middleware/proxy. */

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant-time compare. Hashing first makes both buffers the same length. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * An empty configured value NEVER matches. Without this guard, a production deploy
 * missing ADMIN_ID/ADMIN_PASSWORD would accept empty input.
 */
export function checkAdminId(input: string): boolean {
  const expected = getAdminId();
  return expected.length > 0 && safeEqual(input.trim(), expected);
}

export function checkAdminPassword(input: string): boolean {
  const expected = getAdminPassword();
  return expected.length > 0 && safeEqual(input.trim(), expected);
}
