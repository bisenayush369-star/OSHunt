import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/components/lib/ratelimit";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/github/") ||
    pathname.startsWith("/api/onboard") ||
    pathname.startsWith("/api/bookmark") ||
    pathname.startsWith("/api/analysis") ||
    pathname.startsWith("/analysis") ||
    pathname === "/login"
  ) {
    const rateLimitResult = await checkRateLimit(`middleware:${request.method}:${getClientIp(request)}`, {
      limit: RATE_LIMIT_MAX_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimitResult.retryAfter || 60) },
        },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/bookmarks/:path*",
    "/profile/:path*",
    "/api/github/:path*",
    "/api/onboard",
    "/api/bookmark/:path*",
    "/api/analysis/:path*",
    "/analysis/:path*",
    "/login",
  ],
};