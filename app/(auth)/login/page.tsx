"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Outfit } from "next/font/google"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Crosshair, Eye, EyeOff, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/components/lib/utils"

// Brand palette (same as onboarding): accent #a8ff3e  bg #090909  border #1f1f1f  muted #6b6b6b

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })

// Manual email/password sign-in is enabled alongside OAuth.
const PASSWORD_LOGIN = true

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Sign-in isn't configured here. Add the OAuth keys to .env.local and restart.",
  OAuthAccountNotLinked: "That email is linked to a different sign-in method. Use the one you signed up with.",
  AccessDenied: "Access was denied during sign-in. Try again.",
  OAuthSignin: "We couldn't start sign-in. Try again.",
  OAuthCallback: "We couldn't complete sign-in. Try again.",
  CredentialsSignin: "Incorrect email or password.",
  Default: "Something went wrong signing you in. Try again.",
}

const PROVIDERS = [
  { id: "github", label: "GitHub", icon: "/github.svg" },
  { id: "google", label: "Google", icon: "/google.svg" },
] as const

type Busy = "github" | "google" | "credentials" | null

const AUTH_PATHS = ["/login", "/signin", "/api/auth/signin"]

function getSafeCallbackUrl(raw: string | null, depth = 0): string {
  if (!raw || depth > 3) return "/"
  let url = raw
  try {
    url = decodeURIComponent(raw)
  } catch {
    /* keep raw */
  }
  // Same-site paths only (blocks //evil.com and /\evil.com)
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return "/"
  try {
    const parsed = new URL(url, "http://localhost")
    const nested = parsed.searchParams.get("callbackUrl")
    if (AUTH_PATHS.includes(parsed.pathname) || (nested && parsed.pathname === "/")) {
      return nested ? getSafeCallbackUrl(nested, depth + 1) : "/"
    }
  } catch {
    /* malformed: fall through */
  }
  return url
}

const OSHuntLogo = ({ className }: { className?: string }) => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="14" cy="14" r="2.5" fill="currentColor" />
    <line x1="14" y1="1" x2="14" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="14" y1="21.5" x2="14" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="1" y1="14" x2="6.5" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="21.5" y1="14" x2="27" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const labelClass = "text-[14px] font-medium text-[#d0d0d0]"
const linkClass =
  "rounded-sm text-[#a8ff3e] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
const inputClass =
  "h-12 rounded-[10px] border-[#1f1f1f] bg-[#111111] px-4 text-base text-[#efefef] shadow-none transition-[border-color,box-shadow] placeholder:text-[#5a5a5a] hover:border-[#2a2a2a] focus-visible:border-[#a8ff3e]/60 focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/15 disabled:opacity-60 md:text-[15px]"
const primaryClass =
  "h-12 w-full cursor-pointer gap-2.5 rounded-[10px] bg-[#a8ff3e] px-4 text-[15px] font-bold tracking-tight text-[#0a0a0a] transition-all hover:bg-[#a8ff3e] hover:opacity-90 hover:shadow-[0_8px_28px_-8px_rgba(168,255,62,0.55)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:opacity-70"
const secondaryClass =
  "h-12 w-full cursor-pointer gap-2.5 rounded-[10px] border-[#1f1f1f] bg-[#0f0f0f] text-[15px] font-medium text-[#efefef] transition-colors hover:border-[#2a2a2a] hover:bg-[#151515] hover:text-white focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/40 disabled:opacity-70"

// The reticle is OSHunt's loading indicator everywhere: it "locks on" (spins) while a request is in flight.
const Reticle = ({ spinning }: { spinning: boolean }) => (
  <Crosshair className={cn("size-[18px]", spinning && "motion-safe:animate-spin")} />
)

function LoginForm() {
  const params = useSearchParams()
  const router = useRouter()
  const { status } = useSession()
  const reduce = useReducedMotion()
  const callbackUrl = getSafeCallbackUrl(params.get("callbackUrl"))
  const errorCode = params.get("error")
  const [formError, setFormError] = useState<string | null>("Password reset isn't enabled yet. Use GitHub or Google, or create a new account.")
  const [busy, setBusy] = useState<Busy>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const error = formError ?? (errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default) : null)

  useEffect(() => {
    if (status === "authenticated") router.replace(callbackUrl)
  }, [status, callbackUrl, router])

  // Autofocus on desktop only, so the keyboard doesn't jump up on phones.
  useEffect(() => {
    if (PASSWORD_LOGIN && window.matchMedia("(pointer: fine)").matches) document.getElementById("email")?.focus()
  }, [])

  async function oauth(provider: "github" | "google") {
    if (busy) return
    setFormError(null)
    setBusy(provider)
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      setBusy(null)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    const data = new FormData(e.currentTarget)
    setFormError(null)
    setBusy("credentials")
    try {
      const res = await signIn("credentials", {
        email: String(data.get("email") ?? "").trim(),
        password: String(data.get("password") ?? ""),
        callbackUrl,
        redirect: false,
      })
      if (res?.error) {
        setFormError(ERROR_MESSAGES[res.error] ?? ERROR_MESSAGES.Default)
      } else {
        router.replace(callbackUrl)
        router.refresh()
      }
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      setBusy(null)
    }
  }

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-[440px]"
    >
      <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">Welcome back</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-[#8c8c8c]">Sign in to pick up your hunt where you left off.</p>

      <AnimatePresence initial={false}>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Alert variant="destructive" className="mt-6 border-red-500/25 bg-red-500/[0.07] text-red-200 [&>svg]:text-red-300">
              <TriangleAlert className="size-4" />
              <AlertDescription className="text-[13px] text-red-200/90">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {PASSWORD_LOGIN && (
        <>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className={labelClass}>
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue="bisenayush369@gmail.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={busy !== null}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={labelClass}>
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setFormError("Password reset isn't enabled yet. Use GitHub or Google, or create a new account.")}
                  className={cn(linkClass, "text-[13px] font-semibold bg-transparent p-0 text-left")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  defaultValue="Ayush@12345"
                  autoComplete="current-password"
                  required
                  disabled={busy !== null}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  className={cn(inputClass, "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-[10px] text-[#6b6b6b] transition-colors hover:text-[#efefef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]/50"
                >
                  {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
              {capsLock && <p className="text-[12px] text-amber-300/90">Caps Lock is on</p>}
            </div>

            <Button type="submit" disabled={busy !== null} className={primaryClass}>
              <Reticle spinning={busy === "credentials"} />
              {busy === "credentials" ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4 text-[13px] text-[#808080]">
            <span className="h-px flex-1 bg-[#1f1f1f]" />
            or
            <span className="h-px flex-1 bg-[#1f1f1f]" />
          </div>
        </>
      )}

      <div className={cn("flex flex-col gap-3", !PASSWORD_LOGIN && "mt-8")}>
        {PROVIDERS.map((p) => (
          <Button key={p.id} type="button" variant="outline" onClick={() => oauth(p.id)} disabled={busy !== null} className={secondaryClass}>
            {busy === p.id ? (
              <Reticle spinning />
            ) : (
              <Image src={p.icon} alt="" width={18} height={18} className={p.id === "github" ? "brightness-0 invert" : undefined} />
            )}
            {busy === p.id ? "Redirecting..." : `Continue with ${p.label}`}
          </Button>
        ))}
      </div>

      <p className="mt-7 text-[15px] text-[#8c8c8c]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className={cn(linkClass, "font-semibold")}>
          Create one
        </Link>
      </p>

      <p className="mt-3 text-[12px] leading-relaxed text-[#7a7a7a]">
        By continuing you agree to our{" "}
        <Link href="/terms" className="text-[#a0a0a0] underline underline-offset-2 hover:text-white">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[#a0a0a0] underline underline-offset-2 hover:text-white">
          Privacy Policy
        </Link>
        .
      </p>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <div className={cn(outfit.className, "relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#090909] text-white antialiased")}>
      <header className="px-6 py-6 sm:px-10 sm:py-7">
        <Link
          href="/"
          aria-label="OSHunt home"
          className="inline-flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
        >
          <span className="relative flex">
            <OSHuntLogo className="text-[#a8ff3e]" />
            {/* The logo is the beacon: rings ripple outward from it across the page */}
            <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-0">
              <span className="absolute left-0 top-0 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a8ff3e]/[0.06] blur-3xl" />
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="absolute left-0 top-0 size-[1200px] rounded-full border border-[#a8ff3e]/25 opacity-0 motion-safe:animate-[logo-ping_7s_ease-out_infinite]"
                  style={{ animationDelay: `${i * 2.3}s` }}
                />
              ))}
            </span>
          </span>
          <span className="text-[15px] font-semibold tracking-tight">OSHunt</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
        {/* useSearchParams() needs a Suspense boundary in the App Router */}
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>

      <style>{`
        @keyframes logo-ping {
          0% { transform: translate(-50%, -50%) scale(0.03); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}