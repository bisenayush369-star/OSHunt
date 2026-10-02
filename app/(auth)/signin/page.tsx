"use client"

import { Suspense, useEffect, useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Outfit } from "next/font/google"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, Crosshair, Eye, EyeOff, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/components/lib/utils"

// Brand palette (same as login/onboarding): accent #a8ff3e  bg #090909  border #1f1f1f  muted #6b6b6b

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })

// Set to false for OAuth-only signup (no email/password).
const PASSWORD_SIGNUP = true
// Expected: POST { name, email, password } -> 2xx on success, 409 if the email already exists. Change to match your API.
const REGISTER_ENDPOINT = "/api/register"
// Same contract as your old onboarding page: POST { firstName, lastName, email, newsletter, useCase }
const ONBOARDING_ENDPOINT = "/api/onboarding"
const DONE_URL = "/hunt"
// OAuth sign-ups come back here, so they land on the use-case step.
const OAUTH_RETURN_URL = "/signup?step=2"

const USE_CASES = ["Personal projects", "School / education", "Business", "Agency or freelance work", "Other"] as const
type UseCase = (typeof USE_CASES)[number]

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Sign-up isn't configured here. Add the OAuth keys to .env.local and restart.",
  OAuthAccountNotLinked: "That email is linked to a different sign-in method. Use the one you signed up with.",
  AccessDenied: "Access was denied. Try again.",
  OAuthSignin: "We couldn't start sign-up. Try again.",
  OAuthCallback: "We couldn't complete sign-up. Try again.",
  Default: "Something went wrong creating your account. Try again.",
}

const PROVIDERS = [
  { id: "github", label: "GitHub", icon: "/github.svg" },
  { id: "google", label: "Google", icon: "/google.svg" },
] as const

type Busy = "github" | "google" | "credentials" | "onboarding" | null

const RULES = [
  { id: "len", label: "8+ characters", test: (p: string) => p.length >= 8 },
  { id: "case", label: "Upper & lower case", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "sym", label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const STRENGTH = ["", "bg-red-400", "bg-amber-400", "bg-lime-300", "bg-[#a8ff3e]"]
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"]

const slide = { enter: { opacity: 0, x: 24 }, center: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } }
const fade = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } }

const AUTH_PATHS = ["/login", "/signin", "/signup", "/api/auth/signin"]

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
const legalLinkClass = "text-[#c4c4c4] underline underline-offset-2 hover:text-white"
const inputClass =
  "h-12 rounded-[10px] border-[#1f1f1f] bg-[#111111] px-4 text-base text-[#efefef] shadow-none transition-[border-color,box-shadow] placeholder:text-[#5a5a5a] hover:border-[#2a2a2a] focus-visible:border-[#a8ff3e]/60 focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/15 disabled:opacity-60 md:text-[15px]"
const primaryClass =
  "h-12 w-full cursor-pointer gap-2.5 rounded-[10px] bg-[#a8ff3e] px-4 text-[15px] font-bold tracking-tight text-[#0a0a0a] transition-all hover:bg-[#a8ff3e] hover:opacity-90 hover:shadow-[0_8px_28px_-8px_rgba(168,255,62,0.55)] active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
const secondaryClass =
  "h-12 w-full cursor-pointer gap-2.5 rounded-[10px] border-[#1f1f1f] bg-[#0f0f0f] text-[15px] font-medium text-[#efefef] transition-colors hover:border-[#2a2a2a] hover:bg-[#151515] hover:text-white focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/40 disabled:opacity-70"
const checkboxClass =
  "mt-0.5 size-[18px] shrink-0 cursor-pointer rounded-[5px] border-[#2f2f2f] bg-[#111111] shadow-none transition-colors focus-visible:border-[#a8ff3e] focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/25 data-[state=checked]:border-[#a8ff3e] data-[state=checked]:bg-[#a8ff3e] data-[state=checked]:text-[#0a0a0a]"

// The reticle is OSHunt's loading indicator everywhere: it "locks on" (spins) while a request is in flight.
const Reticle = ({ spinning }: { spinning: boolean }) => (
  <Crosshair className={cn("size-[18px]", spinning && "motion-safe:animate-spin")} />
)

const Stepper = ({ step }: { step: 1 | 2 }) => (
  <div aria-hidden className="mb-8 flex items-center">
    {[1, 2].map((s, i) => (
      <div key={s} className="flex items-center">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300",
            step >= s ? "bg-[#a8ff3e] text-[#0a0a0a]" : "border border-[#1f1f1f] bg-[#141414] text-[#7a7a7a]"
          )}
        >
          {step > s ? <Check className="size-3.5" strokeWidth={3} /> : s}
        </span>
        {i === 0 && (
          <span className="relative h-px w-14 overflow-hidden bg-[#1f1f1f]">
            <span
              className={cn(
                "absolute inset-0 origin-left bg-[#a8ff3e] transition-transform duration-500 ease-out",
                step === 2 ? "scale-x-100" : "scale-x-0"
              )}
            />
          </span>
        )}
      </div>
    ))}
  </div>
)

function SignupForm() {
  const params = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const reduce = useReducedMotion()
  const callbackUrl = getSafeCallbackUrl(params.get("callbackUrl"))
  const errorCode = params.get("error")
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [account, setAccount] = useState<{ name: string; email: string } | null>(null)
  const [useCase, setUseCase] = useState<UseCase | "">("")
  const [newsletter, setNewsletter] = useState(false)
  const error = formError ?? (errorCode ? (ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default) : null)

  const results = RULES.map((r) => ({ ...r, ok: r.test(password) }))
  const score = results.filter((r) => r.ok).length
  const step: 1 | 2 = account || (status === "authenticated" && params.get("step") === "2") ? 2 : 1

  // Already signed in? Skip this page, unless we're on the use-case step.
  useEffect(() => {
    if (status === "authenticated" && step === 1 && busy !== "credentials") router.replace(callbackUrl)
  }, [status, step, busy, callbackUrl, router])

  // Autofocus on desktop only, so the keyboard doesn't jump up on phones.
  useEffect(() => {
    if (PASSWORD_SIGNUP && window.matchMedia("(pointer: fine)").matches) document.getElementById("name")?.focus()
  }, [])

  async function oauth(provider: "github" | "google") {
    if (busy) return
    setFormError(null)
    setBusy(provider)
    try {
      await signIn(provider, { callbackUrl: OAUTH_RETURN_URL })
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      setBusy(null)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    if (score < RULES.length) {
      setFormError("Use 8+ characters with upper and lower case, a number and a symbol.")
      document.getElementById("password")?.focus()
      return
    }
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    const name = String(data.get("name") ?? "").trim()
    let navigating = false
    setFormError(null)
    setBusy("credentials")
    try {
      const res = await fetch(REGISTER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setFormError(
          res.status === 409 ? "An account with that email already exists. Try signing in instead." : (body?.error ?? ERROR_MESSAGES.Default)
        )
        return
      }
      const login = await signIn("credentials", { email, password, redirect: false })
      if (login?.error) {
        navigating = true
        router.replace("/login")
      } else {
        setAccount({ name, email })
      }
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      if (!navigating) setBusy(null)
    }
  }

  async function finish(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!useCase || busy) return
    const [firstName = "", ...rest] = (account?.name || session?.user?.name || "").trim().split(/\s+/)
    let navigating = false
    setFormError(null)
    setBusy("onboarding")
    try {
      const res = await fetch(ONBOARDING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName: rest.join(" "),
          email: account?.email || session?.user?.email || "",
          newsletter,
          useCase,
        }),
      })
      if (res.ok) {
        navigating = true
        window.location.href = DONE_URL // full page load, same as the old onboarding page
      } else if (res.status === 401) {
        signIn()
      } else {
        setFormError("Couldn't save your profile. Give it another try in a moment.")
      }
    } catch {
      setFormError("Couldn't reach the server. Check your connection and try again.")
    } finally {
      if (!navigating) setBusy(null)
    }
  }

  const errorAlert = (
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
  )

  // Returning from OAuth on the use-case step: wait for the session instead of flashing step 1.
  if (status === "loading" && params.get("step") === "2") return null

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-[440px]"
    >
      <p aria-live="polite" className="sr-only">
        Step {step} of 2: {step === 1 ? "Create your account" : "Personalize your hunt"}
      </p>
      <Stepper step={step} />

      <AnimatePresence mode="wait" initial={false}>
        {step === 1 ? (
          <motion.div
            key="step-1"
            variants={reduce ? fade : slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
      <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">Create your account</h1>
      <p className="mt-2.5 text-[15px] leading-relaxed text-[#8c8c8c]">Find open-source issues that fit your stack.</p>

      {errorAlert}

      {PASSWORD_SIGNUP && (
        <>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className={labelClass}>
                Full name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Jane Doe"
                autoComplete="name"
                autoCapitalize="words"
                required
                disabled={busy !== null}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className={labelClass}>
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={busy !== null}
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className={labelClass}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  aria-describedby="password-rules"
                  placeholder="Create a strong password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy !== null}
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

              <div id="password-rules">
                <AnimatePresence initial={false}>
                  {password && (
                    <motion.div
                      key="rules"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div aria-hidden className="mt-1 flex gap-1.5">
                        {RULES.map((r, i) => (
                          <span
                            key={r.id}
                            className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < score ? STRENGTH[score] : "bg-[#1f1f1f]")}
                          />
                        ))}
                      </div>
                      <p className="sr-only" aria-live="polite">
                        Password strength: {STRENGTH_LABEL[score] || "Too short"}
                      </p>
                      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                        {results.map((r) => (
                          <li key={r.id} className={cn("flex items-center gap-2 text-[12px] transition-colors", r.ok ? "text-[#d4f5a3]" : "text-[#7a7a7a]")}>
                            {r.ok ? (
                              <Check className="size-3.5 shrink-0 text-[#a8ff3e]" strokeWidth={3} />
                            ) : (
                              <span className="grid size-3.5 shrink-0 place-items-center">
                                <span className="size-1 rounded-full bg-[#4a4a4a]" />
                              </span>
                            )}
                            {r.label}
                            <span className="sr-only">{r.ok ? "(met)" : "(not met)"}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                disabled={busy !== null}
                className={checkboxClass}
              />
              <Label htmlFor="terms" className="block cursor-pointer text-[13px] font-normal leading-relaxed text-[#9a9a9a]">
                I agree to the{" "}
                <Link href="/terms" className={legalLinkClass}>
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className={legalLinkClass}>
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button type="submit" disabled={!agreed || busy !== null} className={primaryClass}>
              <Reticle spinning={busy === "credentials"} />
              {busy === "credentials" ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4 text-[13px] text-[#808080]">
            <span className="h-px flex-1 bg-[#1f1f1f]" />
            or
            <span className="h-px flex-1 bg-[#1f1f1f]" />
          </div>
        </>
      )}

      <div className={cn("flex flex-col gap-3", !PASSWORD_SIGNUP && "mt-8")}>
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
      <p className="mt-3 text-[12px] leading-relaxed text-[#7a7a7a]">
        By continuing with GitHub or Google you agree to our{" "}
        <Link href="/terms" className={legalLinkClass}>
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className={legalLinkClass}>
          Privacy Policy
        </Link>
        .
      </p>

      <p className="mt-7 text-[15px] text-[#8c8c8c]">
        Already have an account?{" "}
        <Link href="/login" className={cn(linkClass, "font-semibold")}>
          Sign in
        </Link>
      </p>
          </motion.div>
        ) : (
          <motion.form
            key="step-2"
            variants={reduce ? fade : slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeOut" }}
            onSubmit={finish}
          >
            <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">Personalize your hunt</h1>
            <p className="mt-2.5 text-[15px] leading-relaxed text-[#8c8c8c]">Helps us surface the right issues and repos for you.</p>

            {errorAlert}

            <div className="mt-8 flex flex-col gap-3">
              <p id="use-case-label" className={labelClass}>
                What&apos;ll you use OSHunt for?
              </p>
              <RadioGroup
                value={useCase}
                onValueChange={(v) => setUseCase(v as UseCase)}
                aria-labelledby="use-case-label"
                className="gap-0 overflow-hidden rounded-[10px] border border-[#1f1f1f]"
              >
                {USE_CASES.map((opt, i) => {
                  const id = `use-case-${i}`
                  const selected = useCase === opt
                  return (
                    <label
                      key={opt}
                      htmlFor={id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-4 px-4 py-4 transition-colors",
                        i < USE_CASES.length - 1 && "border-b border-[#1f1f1f]",
                        selected ? "bg-[#151515]" : "bg-[#0f0f0f] hover:bg-[#131313]"
                      )}
                    >
                      <span className={cn("text-[15px] transition-colors", selected ? "font-medium text-white" : "text-[#9a9a9a]")}>{opt}</span>
                      <RadioGroupItem
                        value={opt}
                        id={id}
                        className="size-5 border-2 border-[#2f2f2f] bg-transparent shadow-none focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/25 data-[state=checked]:border-[#a8ff3e] [&_svg]:fill-[#a8ff3e] [&_svg]:stroke-[#a8ff3e]"
                      />
                    </label>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="mt-5 flex items-start gap-3">
              <Checkbox id="newsletter" checked={newsletter} onCheckedChange={(v) => setNewsletter(v === true)} className={checkboxClass} />
              <Label htmlFor="newsletter" className="block cursor-pointer text-[13px] font-normal leading-relaxed text-[#9a9a9a]">
                Send me OSHunt drops — no spam, ever.
              </Label>
            </div>

            <Button type="submit" disabled={!useCase || busy !== null} className={cn(primaryClass, "mt-6")}>
              <Reticle spinning={busy === "onboarding"} />
              {busy === "onboarding" ? "Saving profile..." : useCase ? "Start hunting" : "Select a use case first"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function SignupPage() {
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
          <SignupForm />
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