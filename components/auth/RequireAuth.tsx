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

    if (["/login", "/signin", "/onboarding", "/api/auth/signin"].includes(parsed.pathname)) {
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

  if (normalized === "/login" || normalized === "/signin" || normalized === "/onboarding") return fallback
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

  if (normalized.startsWith("/login?") || normalized.startsWith("/signin?") || normalized.startsWith("/onboarding?")) {
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
    if (status === "loading") return

    const currentPath = `${window.location.pathname}${window.location.search}`
    const authPath = ["/login", "/signin", "/onboarding", "/api/auth/signin"].includes(window.location.pathname)

    let timer: number | undefined

    if (status === "unauthenticated") {
      if (authPath) return

      const target = `${redirectTo}?callbackUrl=${encodeURIComponent(getSafeRedirectTarget(currentPath))}`
      if (redirectedRef.current === target) return

      redirectedRef.current = target
      timer = window.setTimeout(() => {
        router.replace(target)
      }, 350)
      return () => {
        if (timer) clearTimeout(timer)
      }
    }

    const userName = session?.user?.name?.trim()
    const userEmail = session?.user?.email?.trim()

    if (!userName || !userEmail) {
      const callbackUrl = getSafeRedirectTarget(currentPath)
      const onboardingTarget = `/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`
      if (window.location.pathname === "/onboarding") return
      if (redirectedRef.current === onboardingTarget) return

      redirectedRef.current = onboardingTarget
      router.replace(onboardingTarget)
      return
    }

    redirectedRef.current = null
  }, [redirectTo, router, session?.user?.email, session?.user?.name, status])

  if (status === "loading") {
    return fallback ?? <div className="flex min-h-screen items-center justify-center bg-[#090909] text-sm text-neutral-400">Checking your session…</div>
  }

  if (status !== "authenticated") {
    return fallback ?? <div className="flex min-h-screen items-center justify-center bg-[#090909] text-sm text-neutral-400">Redirecting to sign in…</div>
  }

  const userName = session?.user?.name?.trim()
  const userEmail = session?.user?.email?.trim()

  if (!userName || !userEmail) {
    return fallback ?? <div className="flex min-h-screen items-center justify-center bg-[#090909] text-sm text-neutral-400">Setting up your profile…</div>
  }

  return <>{children}</>
}
