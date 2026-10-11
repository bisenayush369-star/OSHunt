import { NextResponse, type NextRequest } from "next/server";
import type { ApiError } from "./contract";
import { COOKIE, verifySession } from "./session";

/**
 * Helpers for app/api/admin/** route handlers.
 * Every admin response is private, so everything is sent with Cache-Control: no-store.
 */

const NO_STORE = { "Cache-Control": "no-store, max-age=0" } as const;

export function json<T>(body: T, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: { ...NO_STORE, ...init.headers },
  });
}

export function fail(status: number, error: string, message?: string, headers?: Record<string, string>) {
  const body: ApiError = message ? { error, message } : { error };
  return json<ApiError>(body, { status, headers });
}

/**
 * Mutations (POST/PATCH/DELETE) must come from this site: the Origin header has to be
 * present and match the host. Cookies are SameSite=Strict too; this is the second layer.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const forwarded = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwarded || req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Best-effort client IP. Only trustworthy behind a proxy that sets x-forwarded-for. */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Returns a ready-made error response when the request is not from the admin, else null. */
export async function requireAdmin(
  req: NextRequest,
  opts: { mutation?: boolean } = {},
): Promise<NextResponse | null> {
  if (opts.mutation && !isSameOrigin(req)) return fail(403, "bad_origin", "Request origin not allowed.");
  const ok = await verifySession(req.cookies.get(COOKIE)?.value);
  return ok ? null : fail(401, "unauthorized", "Sign in again.");
}
