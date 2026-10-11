"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, type ReactNode } from "react"

function getSafeRedirectTarget(rawValue: string | null, fallback = "/") {
  if (!rawValue) return fallback

  let normalized = rawValue
  try {
    normalized = decodeURIComponent(rawValue)
  } catch {
    normalized = rawValue
  }

  if (!normalized.startsWith("/")) return fallback

  try {
    const parsed = new URL(normalized, "http://localhost")
    const nestedCallback = parsed.searchParams.get("callbackUrl")

    if (["/login", "/signin", "/api/auth/signin"].includes(parsed.pathname)) {
      if (nestedCallback) {
        return getSafeRedirectTarget(nestedCallback, fallback)
      }
      return fallback
    }

    if (nestedCallback && parsed.pathname === "/") {
      return getSafeRedirectTarget(nestedCallback, fallback)
    }
  } catch {
    // ignore malformed URLs
  }

  if (normalized === "/login" || normalized === "/signin") return fallback
  if (normalized.startsWith("/api/auth/signin?")) {
    try {
      const parsed = new URL(normalized, "http://localhost")
      const nestedCallback = parsed.searchParams.get("callbackUrl")
      if (nestedCallback) return getSafeRedirectTarget(nestedCallback, fallback)
    } catch {
      // ignore malformed URLs
    }
    return fallback
  }

  if (normalized.startsWith("/login?") || normalized.startsWith("/signin?")) {
    try {
      const parsed = new URL(normalized, "http://localhost")
      const nestedCallback = parsed.searchParams.get("callbackUrl")
      if (nestedCallback) return getSafeRedirectTarget(nestedCallback, fallback)
    } catch {
      // ignore malformed URLs
    }
    return fallback
  }

  return normalized
}

const LoadingAuthState = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#090909] text-[#f3f3f3]">
    <div className="flex items-center gap-3 rounded-full border border-[#1f1f1f] bg-[#111111]/80 px-4 py-2.5 shadow-[0_0_40px_rgba(168,255,62,0.12)] backdrop-blur-sm">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-[#a8ff3e]/35" />
        <span className="h-2.5 w-2.5 rounded-full border-[2px] border-[#a8ff3e] border-t-transparent motion-safe:animate-spin" />
      </span>
      <span className="text-sm font-medium text-neutral-200">{label}</span>
    </div>
  </div>
)

export function RequireAuth({
  children,
  fallback,
  redirectTo = "/login",
}: {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
}) {
  const { status, data: session } = useSession()
  const router = useRouter()
  const redirectedRef = useRef<string | null>(null)

  useEffect(() => {
    console.debug("[RequireAuth] status:", status)
    if (status === "loading") return

    const currentPath = `${window.location.pathname}${window.location.search}`
    const authPath = ["/login", "/signin", "/api/auth/signin"].includes(window.location.pathname)

    let timer: number | undefined

    if (status === "unauthenticated") {
      console.debug("[RequireAuth] unauthenticated; authPath=", authPath)
      if (authPath) return

      const target = `${redirectTo}?callbackUrl=${encodeURIComponent(getSafeRedirectTarget(currentPath))}`
      console.debug("[RequireAuth] computed target:", target, "redirectedRef.current=", redirectedRef.current)
      if (redirectedRef.current === target) {
        const currentlyAtTarget = `${window.location.pathname}${window.location.search}` === target
        if (currentlyAtTarget) {
          console.debug("[RequireAuth] already at target URL; skipping replace")
          return
        }
        console.debug("[RequireAuth] redirectedRef matches target but browser not at target; proceeding to replace")
      }

      redirectedRef.current = target
      timer = window.setTimeout(() => {
        console.debug("[RequireAuth] performing router.replace to", target)
        try {
          router.replace(target)
        } catch (err) {
          console.error("[RequireAuth] router.replace failed:", err)
        }
      }, 0)
      return () => {
        if (timer) clearTimeout(timer)
      }
    }

    redirectedRef.current = null
  }, [redirectTo, router, session?.user?.email, session?.user?.name, status])

  if (status === "loading") {
    return fallback ?? <LoadingAuthState label="Checking your session…" />
  }

  if (status !== "authenticated") {
    return fallback ?? <LoadingAuthState label="Redirecting to sign in…" />
  }

  return <>{children}</>
}
