"use client"

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { JetBrains_Mono, Outfit } from "next/font/google"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

// Same tokens as the landing page's :root — bg #090909, text #efefef,
// muted #7d7d7d, border rgba(255,255,255,.07), accent (lime) #a8ff3e.
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] })
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

const AUTH_PATHS = ["/login", "/signin", "/onboarding", "/api/auth/signin"]

/**
 * Resolves a callbackUrl query param to a same-origin path, or falls back to
 * `fallback`. Rejects anything that isn't a genuine relative path (blocking
 * open redirects) and unwraps nested callbackUrls that point back at an
 * auth page (blocking redirect loops).
 */
function getSafeCallbackUrl(rawUrl: string | null, fallback = "/hunt"): string {
  if (!rawUrl) return fallback

  let normalized = rawUrl
  try {
    normalized = decodeURIComponent(rawUrl)
  } catch {
    normalized = rawUrl
  }

  if (!normalized.startsWith("/")) return fallback

  let parsed: URL
  try {
    parsed = new URL(normalized, "http://localhost")
  } catch {
    return fallback
  }

  // The real check: reject anything that resolves to a different host.
  // "//evil.com", "/\\evil.com", and "/%2F%2Fevil.com" (-> "///evil.com")
  // all pass a plain startsWith("/") test but parse to host "evil.com" —
  // this is the actual open-redirect hole in a startsWith-only check.
  if (parsed.host !== "localhost") return fallback

  const nestedCallback = parsed.searchParams.get("callbackUrl")

  if (AUTH_PATHS.includes(parsed.pathname)) {
    return nestedCallback ? getSafeCallbackUrl(nestedCallback, fallback) : fallback
  }

  if (nestedCallback && parsed.pathname === "/") {
    return getSafeCallbackUrl(nestedCallback, fallback)
  }

  return parsed.pathname + parsed.search + parsed.hash
}

/** OSHunt's mark, carried over from the landing page for a consistent lockup. */
function LogoGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M 18 4 A 14 14 0 0 0 18 32 L 18 26 A 8 8 0 0 1 18 10 Z" fill="#a8ff3e" opacity="0.3" />
      <path d="M 18 4 L 32 18 L 18 32 L 18 26 L 26 18 L 18 10 Z" fill="#a8ff3e" />
      <circle cx="13" cy="18" r="2.5" fill="#a8ff3e" />
    </svg>
  )
}

/** Echoes the terminal / scan-list motif from the landing page's "How it works" section. */
function SetupPreview() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#101010] to-[#090909] shadow-[0_30px_80px_-28px_rgba(0,0,0,0.85)]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <span className="h-[10px] w-[10px] rounded-full bg-[#ff5f56]" />
        <span className="h-[10px] w-[10px] rounded-full bg-[#ffbd2e]" />
        <span className="h-[10px] w-[10px] rounded-full bg-[#27c93f]" />
        <span className={`${jbMono.className} mx-auto text-[11px] text-[#7a7a7a]`}>whats-next.sh</span>
      </div>
      <div className={`${jbMono.className} space-y-3 p-5 text-[13px] leading-relaxed`}>
        <p className="text-[#7d7d7d]">$ oshunt --preview</p>
        <p className="text-[#efefef]">
          <span className="text-[#a8ff3e]">→</span> matched to your stack
        </p>
        <p className="text-[#efefef]">
          <span className="text-[#a8ff3e]">→</span> the fix explained in plain english
        </p>
        <p className="text-[#efefef]">
          <span className="text-[#a8ff3e]">→</span> yours to ship
          <span
            aria-hidden="true"
            className="ml-1 inline-block h-[13px] w-[7px] translate-y-[2px] bg-[#a8ff3e] motion-safe:animate-pulse motion-reduce:animate-none"
          />
        </p>
      </div>
    </div>
  )
}

function OnboardingFallback() {
  return (
    <div className={`${outfit.className} dark flex min-h-screen items-center justify-center bg-[#090909]`}>
      <Loader2 className="h-5 w-5 animate-spin text-[#7d7d7d] motion-reduce:animate-none" aria-hidden="true" />
    </div>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status, data: session, update } = useSession()
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"))

  const defaultName = useMemo(() => session?.user?.name?.trim() || "", [session?.user?.name])
  const defaultEmail = useMemo(() => session?.user?.email?.trim() || "", [session?.user?.email])

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    }
  }, [callbackUrl, router, status])

  if (status === "loading") {
    return (
      <div className={`${outfit.className} dark flex min-h-screen items-center justify-center bg-[#090909]`}>
        <div className="flex flex-col items-center gap-3 text-sm text-[#7d7d7d]">
          <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Loading your profile…
        </div>
      </div>
    )
  }

  if (status !== "authenticated") {
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    const trimmedName = (name || defaultName).trim()
    const trimmedEmail = (email || defaultEmail).trim()

    if (!trimmedName || !trimmedEmail) {
      setError("Please enter both your name and email.")
      return
    }

    const fullNameParts = trimmedName.split(/\s+/)
    const firstName = fullNameParts[0]
    const lastName = fullNameParts.slice(1).join(" ")

    setLoading(true)

    try {
      const response = await fetch("/api/user/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          firstName,
          lastName,
          newsletter: false,
          useCase: "General use",
        }),
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result?.error || "Unable to save your onboarding details.")
      }

      if (session?.user) {
        await update()
      }

      router.push(callbackUrl)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong while saving your profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`${outfit.className} dark min-h-screen bg-[#090909] text-[#efefef]`}>
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Form — left, mirrors the hero-text position on the landing page */}
        <div className="flex items-center justify-center px-6 py-16 sm:px-10 lg:px-16">
          <div className="w-full max-w-sm rounded-[20px] border border-white/[0.08] bg-gradient-to-b from-[#101010] to-[#090909] p-8 shadow-[0_30px_80px_-28px_rgba(0,0,0,0.85)] sm:p-10">
            <Link href="/" className="mb-10 flex items-center gap-2">
              <LogoGlyph />
              <span className="text-sm font-medium tracking-tight">OSHunt</span>
            </Link>

            <h1 className="text-[32px] font-bold leading-[1.1] tracking-[-1px] sm:text-[38px]">
              One step before <span className="text-[#a8ff3e]">the hunt.</span>
            </h1>
            <p className="mt-3 max-w-[420px] text-[15px] font-light leading-relaxed text-[#7d7d7d]">
              We match issues to your stack and explain the fix in plain english — just need your name and email first.
            </p>

            <form onSubmit={handleSubmit} className="mt-9 space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className={`${jbMono.className} text-[11px] uppercase tracking-[0.06em] text-[#7a7a7a]`}
                >
                  Full name
                </Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name || defaultName}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Doe"
                  className="h-11 rounded-xl border-white/[0.1] bg-white/[0.04] text-[#efefef] placeholder:text-[#5a5a5a] focus-visible:border-[#a8ff3e]/50 focus-visible:ring-[#a8ff3e]/20"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className={`${jbMono.className} text-[11px] uppercase tracking-[0.06em] text-[#7a7a7a]`}
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email || defaultEmail}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@example.com"
                  className="h-11 rounded-xl border-white/[0.1] bg-white/[0.04] text-[#efefef] placeholder:text-[#5a5a5a] focus-visible:border-[#a8ff3e]/50 focus-visible:ring-[#a8ff3e]/20"
                />
              </div>

              {error ? (
                <Alert className="rounded-xl border-[#ff5f56]/30 bg-[#ff5f56]/[0.08] text-[#ffb4b0] [&>svg]:text-[#ff5f56]">
                  <AlertDescription className="text-[13px]">{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                className="h-auto w-full cursor-pointer rounded-full bg-[#efefef] px-7 py-3 text-[15px] font-semibold text-[#090909] shadow-[0_14px_28px_rgba(168,255,62,0.14)] transition hover:bg-[#efefef] hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    Setting up…
                  </>
                ) : (
                  "Start hunting →"
                )}
              </Button>

              <p className="text-center text-xs text-[#7a7a7a]">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="underline underline-offset-2 hover:text-[#efefef]">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline underline-offset-2 hover:text-[#efefef]">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </div>
        </div>

        {/* Visual — right, mirrors the hero-demo position: dot-grid + left divider */}
        <div
          className="relative hidden items-center justify-center overflow-hidden border-l border-white/[0.07] lg:flex"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1.2px, transparent 1.2px)",
            backgroundSize: "22px 22px",
          }}
        >
          <SetupPreview />
        </div>
      </div>
    </main>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent />
    </Suspense>
  )
}