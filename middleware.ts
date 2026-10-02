import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/components/lib/ratelimit";
import { COOKIE, GATE, verifyGate, verifySession } from "@/app/admin/lib/session";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

function addAdminHeaders(response: NextResponse) {
  response.headers.set("x-robots-tag", "noindex, nofollow");
  response.headers.set("cache-control", "no-store, private, max-age=0");
  return response;
}

function denyAdminAccess(request: NextRequest) {
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ error: "Not found" }, { status: 404 })
    : new NextResponse("Not Found", { status: 404, statusText: "Not Found" });

  return addAdminHeaders(response);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (pathname === "/api/admin/gate") {
      return addAdminHeaders(NextResponse.next());
    }

    const gateCookie = request.cookies.get(GATE)?.value;
    const sessionCookie = request.cookies.get(COOKIE)?.value;
    const hasValidGate = await verifyGate(gateCookie);
    const hasValidSession = await verifySession(sessionCookie);

    if (pathname === "/admin/login") {
      if (hasValidSession) {
        return addAdminHeaders(NextResponse.redirect(new URL("/admin", request.url)));
      }
      return addAdminHeaders(NextResponse.next());
    }

    if (pathname === "/api/admin/login") {
      return hasValidSession || hasValidGate ? addAdminHeaders(NextResponse.next()) : denyAdminAccess(request);
    }

    if (!hasValidSession) {
      return denyAdminAccess(request);
    }

    return addAdminHeaders(NextResponse.next());
  }

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
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/github/:path*",
    "/api/onboard",
    "/api/bookmark/:path*",
    "/api/analysis/:path*",
    "/analysis/:path*",
    "/login",
  ],
};