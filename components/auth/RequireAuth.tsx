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
      }, 350)
      return () => {
        if (timer) clearTimeout(timer)
      }
    }

    redirectedRef.current = null
  }, [redirectTo, router, session?.user?.email, session?.user?.name, status])

  if (status === "loading") {
    return fallback ?? <div className="flex min-h-screen items-center justify-center bg-[#090909] text-sm text-neutral-400">Checking your session…</div>
  }

  if (status !== "authenticated") {
    return fallback ?? <div className="flex min-h-screen items-center justify-center bg-[#090909] text-sm text-neutral-400">Redirecting to sign in…</div>
  }

  return <>{children}</>
}
