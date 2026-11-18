import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminId, getAdminPassword } from "./session";

/** Node runtime only (route handlers). Do not import from middleware / proxy. */

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/** Constant-time compare. Hashing first makes both buffers the same length. */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Checks BOTH values every time (no early exit), so the time taken never says which one was wrong.
 * An empty configured value never matches: a deploy that forgot ADMIN_ID / ADMIN_PASSWORD cannot be
 * opened with empty input.
 */
export function checkCredentials(id: string, password: string): boolean {
  const expectedId = getAdminId();
  const expectedPassword = getAdminPassword();
  const idOk = safeEqual(id.trim(), expectedId);
  const passwordOk = safeEqual(password.trim(), expectedPassword);
  return idOk && passwordOk && expectedId.length > 0 && expectedPassword.length > 0;
}
