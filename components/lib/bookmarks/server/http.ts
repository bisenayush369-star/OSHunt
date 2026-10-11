import { NextResponse, type NextRequest } from "next/server";
import type { ApiResult } from "@/components/types/bookmarks";

/** Small HTTP helpers for the bookmark routes: JSON envelope, body reading, CSRF + rate limits. */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export function jsonOk<T>(data: T, status = 200): NextResponse<ApiResult<T>> {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status, headers: NO_STORE });
}

export function jsonError(err: ApiError): NextResponse<ApiResult<never>> {
  return NextResponse.json<ApiResult<never>>(
    { ok: false, error: { code: err.code, message: err.message } },
    { status: err.status, headers: { ...NO_STORE, ...err.headers } },
  );
}

export async function readJsonBody(req: NextRequest, maxBytes: number): Promise<unknown> {
  const type = (req.headers.get("content-type") ?? "").toLowerCase();
  if (!type.includes("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON with Content-Type: application/json.");
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  const text = await req.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Body is not valid JSON.");
  }
}

/**
 * CSRF defence for requests that change data. Browsers always attach `Origin` /
 * `Sec-Fetch-Site` to cross-site requests; refuse anything that is not from our own site.
 * (Requests without these headers, like curl or server-to-server calls, are allowed.)
 */
export function assertSameOrigin(req: NextRequest): void {
  if (req.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "CROSS_ORIGIN", "Cross-site requests are not allowed.");
  }
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    /* "null" and other opaque origins land here */
  }
  if (!host || originHost !== host) {
    throw new ApiError(403, "CROSS_ORIGIN", "Cross-site requests are not allowed.");
  }
}

// In-memory sliding window. Per server instance only; use a shared store (Redis, ...) if you
// run many instances and need a hard global limit.
const buckets = new Map<string, number[]>();

export function rateLimit(bucket: string, max: number, windowMs: number): void {
  const now = Date.now();
  const hits = (buckets.get(bucket) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Slow down a little.", {
      "Retry-After": String(retryAfter),
    });
  }
  hits.push(now);
  buckets.set(bucket, hits);
  if (buckets.size > 5_000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
}
