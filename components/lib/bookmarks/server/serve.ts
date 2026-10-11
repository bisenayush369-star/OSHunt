import { NextResponse, type NextRequest } from "next/server";
import { resolveCaller, type Caller } from "./auth";
import { ApiError, assertSameOrigin, jsonError, jsonOk, rateLimit } from "./http";

interface ServeOptions {
  /** The request changes data: enforce the same-origin check and the write rate limit. */
  write?: boolean;
}

/** Writes allowed per user per minute (per server instance). */
const WRITES_PER_MINUTE = 120;

/**
 * One pipeline for every bookmark endpoint:
 * same-origin check (writes) -> who is calling (401) -> rate limit (writes) -> your handler ->
 * JSON envelope. Any error becomes a clean JSON error; unexpected ones are logged, not leaked.
 */
export async function serve<T>(
  req: NextRequest,
  options: ServeOptions,
  handler: (caller: Caller) => Promise<{ data: T; status?: number }>,
): Promise<NextResponse> {
  try {
    if (options.write) assertSameOrigin(req);

    const { caller, applyCookie } = await resolveCaller(req);
    if (!caller) throw new ApiError(401, "UNAUTHENTICATED", "Sign in to use bookmarks.");

    if (options.write) rateLimit(`write:${caller.ownerKey}`, WRITES_PER_MINUTE, 60_000);

    const { data, status } = await handler(caller);
    const response = jsonOk(data, status);
    applyCookie(response);
    return response;
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    console.error("[bookmarks] unexpected error:", error);
    return jsonError(new ApiError(500, "SERVER_ERROR", "Something went wrong on our side."));
  }
}
