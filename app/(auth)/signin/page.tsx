"use client"

import { Suspense, useEffect, useRef, useState, type FormEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { Outfit } from "next/font/google"
import { getCsrfToken, signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion"
import { Check, Crosshair, Eye, EyeOff, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/components/lib/utils"

// Layout reference: framer.com/login. One small centered column (288px), logo above, flat dark background.
// Palette: accent #a8ff3e · bg #111111 · field #1a1a1a · border #262626 · text #ededed · label #a3a3a3 · muted #8a8a8a

const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })

// Set to false for OAuth-only signup (no email/password).
const PASSWORD_SIGNUP = true
// Expected: POST { name, email, password } -> 2xx on success, 409 if the email already exists. Change to match your API.
const REGISTER_ENDPOINT = "/api/register"
// Same contract as your old onboarding page: POST { firstName, lastName, email, newsletter, useCase }
const ONBOARDING_ENDPOINT = "/api/onboarding"
// OAuth sign-ups come back here (in the new tab), so they land on the use-case step. The page they were heading for
// rides along as ?callbackUrl= and is where "Start hunting" sends them ("/" when they came straight to sign up).
const OAUTH_RETURN_PATH = "/signup?step=2"
// How long a Google/GitHub button plays its animation after a click, before the new tab opens (2-3 seconds).
const HOLD_MS = 2500

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

type ProviderId = (typeof PROVIDERS)[number]["id"]
type Busy = ProviderId | "credentials" | "onboarding" | null

const RULES = [
  { id: "len", label: "8+ characters", test: (p: string) => p.length >= 8 },
  { id: "case", label: "Upper & lower case", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: "num", label: "A number", test: (p: string) => /\d/.test(p) },
  { id: "sym", label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]
const STRENGTH = ["", "bg-red-400", "bg-amber-400", "bg-lime-300", "bg-[#a8ff3e]"]
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"]

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

// The login and sign-up pages link to each other, so the page the visitor was heading for travels with them.
const withCallbackUrl = (path: string, destination: string) =>
  destination === "/" ? path : `${path}?callbackUrl=${encodeURIComponent(destination)}`

// Where an OAuth sign-up returns to: the use-case step, with the page they were heading for riding along.
const oauthReturnUrl = (destination: string) =>
  destination === "/" ? OAUTH_RETURN_PATH : `${OAUTH_RETURN_PATH}&callbackUrl=${encodeURIComponent(destination)}`

// Google/GitHub sign-up opens in a new tab. next-auth starts an OAuth sign-in with a form POST of { csrfToken, callbackUrl }
// to /api/auth/signin/<provider> (its own sign-in page does exactly this). We open an empty tab first and post that form
// into it, so we find out whether the browser allowed the tab: this returns false when it was blocked (the click happened
// HOLD_MS ago, and some browsers only allow a new tab right after the click), and the caller then carries on in this tab.
// The new tab carries on to `returnTo` once the provider sends the visitor back.
function openProviderInNewTab(provider: ProviderId, csrfToken: string, returnTo: string) {
  let tab: Window | null = null
  try {
    const name = `oshunt-auth-${provider}-${Date.now()}`
    tab = window.open("", name)
    if (!tab) return false
    const form = document.createElement("form")
    form.method = "POST"
    form.action = `/api/auth/signin/${provider}`
    form.target = name
    form.style.display = "none"
    for (const [field, value] of Object.entries({ csrfToken, callbackUrl: returnTo })) {
      const input = document.createElement("input")
      input.type = "hidden"
      input.name = field
      input.value = value
      form.append(input)
    }
    document.body.append(form)
    form.submit()
    // The tab has been targeted: cut its link back to this page (what rel="noopener" does for a link).
    try {
      tab.opener = null
    } catch {
      /* ignore */
    }
    // Keep the form in the page until the browser has taken the submission, then tidy up.
    window.setTimeout(() => form.remove(), 1000)
    return true
  } catch {
    try {
      tab?.close()
    } catch {
      /* ignore */
    }
    return false
  }
}

/* ---------------------------------- styles ---------------------------------- */

// Controls are 38px for mouse/trackpad and 44px on touch screens (comfortable tap target).
// The `!` makes the touch sizes win over whatever defaults the shadcn components ship with.
const control = "h-[38px] w-full rounded-[10px] [@media(pointer:coarse)]:!h-11"

const labelClass = "text-[13px] font-medium leading-none text-[#a3a3a3]"
const linkClass =
  "rounded-sm text-[#a8ff3e] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
const legalLinkClass = "text-[#b3b3b3] underline underline-offset-2 transition-colors hover:text-white"

// 16px on touch keeps iOS Safari from zooming into the field on focus.
const inputClass = cn(
  control,
  "auth-field border-[#262626] bg-[#1a1a1a] px-3.5 text-[14px] text-[#ededed] shadow-none transition-[border-color,box-shadow] duration-150",
  "placeholder:text-[#858585] hover:border-[#333333] dark:bg-[#1a1a1a]",
  "focus-visible:border-[#a8ff3e]/55 focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/15",
  "disabled:cursor-not-allowed disabled:opacity-60 [@media(pointer:coarse)]:!text-base"
)

const buttonBase = cn(
  control,
  "cursor-pointer gap-2 border px-4 text-[14px] font-medium shadow-none transition-[background-color,border-color,transform] duration-150",
  "active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]",
  "disabled:cursor-not-allowed disabled:opacity-50"
)
// White = the main action (like framer's "Continue with Google"). Dark = everything else.
const whiteButton = cn(
  buttonBase,
  "border-transparent bg-white text-[#111111] hover:bg-[#e6e6e6] focus-visible:border-transparent focus-visible:ring-white/60"
)
const darkButton = cn(
  buttonBase,
  "border-[#2a2a2a] bg-[#1a1a1a] text-[#ededed] hover:border-[#363636] hover:bg-[#222222] hover:text-white focus-visible:border-[#2a2a2a] focus-visible:ring-[#a8ff3e]/50"
)

const checkboxClass =
  "mt-px size-4 shrink-0 cursor-pointer rounded-[4px] border-[#3a3a3a] bg-[#1a1a1a] shadow-none transition-colors dark:bg-[#1a1a1a] focus-visible:border-[#a8ff3e] focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/25 data-[state=checked]:border-[#a8ff3e] data-[state=checked]:bg-[#a8ff3e] data-[state=checked]:text-[#0a0a0a] dark:data-[state=checked]:bg-[#a8ff3e]"

// The page's only entrance motion: the blocks rise in one after another (and cross-fade between steps).
// <MotionConfig reducedMotion="user"> (see SignupPage) drops the slide for reduced-motion users and keeps a plain fade.
const group: Variants = {
  enter: {},
  center: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  exit: {},
}
const rise: Variants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}

const pageCss = `
  @keyframes logo-ping-scale {
    from { transform: scale(0.14); }
    to { transform: scale(1); }
  }
  @keyframes logo-ping-fade {
    0% { opacity: 0; }
    10% { opacity: 0.6; }
    100% { opacity: 0; }
  }
  .auth-field:-webkit-autofill,
  .auth-field:-webkit-autofill:hover,
  .auth-field:-webkit-autofill:focus {
    -webkit-text-fill-color: #ededed;
    caret-color: #ededed;
    transition: background-color 600000s 0s, color 600000s 0s;
  }
`

/* -------------------------------- components -------------------------------- */

// One lime ring "locks on" from the logo when the page opens, then the background stays plain.
const BrandMark = ({ className }: { className?: string }) => (
  <Link
    href="/"
    aria-label="OSHunt home"
    className={cn(
      "relative mx-auto flex size-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]",
      className
    )}
  >
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[300px] -translate-x-1/2 -translate-y-1/2">
      <span className="block size-full motion-safe:animate-[logo-ping-scale_1.8s_cubic-bezier(0.16,1,0.3,1)_0.4s_1_both]">
        <span className="block size-full rounded-full border border-[#a8ff3e]/50 opacity-0 motion-safe:animate-[logo-ping-fade_1.8s_linear_0.4s_1_both]" />
      </span>
    </span>
    <Image
      src="/white.png"
      alt="OSHunt logo"
      width={36}
      height={36}
      priority
      className="drop-shadow-[0_0_14px_rgba(168,255,62,0.3)]"
      style={{ display: "block", width: "36px", height: "36px", objectFit: "contain" }}
    />
  </Link>
)

// The reticle is OSHunt's loading indicator everywhere: it "locks on" (spins) while a request is in flight.
const Reticle = ({ spinning, className }: { spinning: boolean; className?: string }) => (
  <Crosshair aria-hidden className={cn("size-4", spinning && "motion-safe:animate-spin", className)} />
)

const Heading = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <h1 className="text-center text-[24px] font-semibold leading-[30px] tracking-[-0.02em] text-white [text-wrap:balance]">
    {title}
    <span className="block text-[#8a8a8a]">{subtitle}</span>
  </h1>
)

const Stepper = ({ step }: { step: 1 | 2 }) => (
  <div aria-hidden className="mx-auto mb-7 flex w-fit items-center">
    {[1, 2].map((s, i) => (
      <div key={s} className="flex items-center">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300",
            step >= s ? "bg-[#a8ff3e] text-[#0a0a0a]" : "border border-[#2a2a2a] bg-[#1a1a1a] text-[#8a8a8a]"
          )}
        >
          {step > s ? <Check className="size-3" strokeWidth={3} /> : s}
        </span>
        {i === 0 && (
          <span className="relative h-px w-10 overflow-hidden bg-[#262626]">
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
  const csrfRef = useRef<string | null>(null)
  const [opened, setOpened] = useState<ProviderId | null>(null)
  const holdTimer = useRef<number | null>(null)
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

  // Fetch next-auth's CSRF token up front, so a Google/GitHub click can open its new tab straight away.
  useEffect(() => {
    let active = true
    getCsrfToken()
      .then((token) => {
        if (active && token) csrfRef.current = token
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // The "Opened in a new tab" label on a provider button is only a short confirmation.
  useEffect(() => {
    if (!opened) return undefined
    const timer = window.setTimeout(() => setOpened(null), 4000)
    return () => window.clearTimeout(timer)
  }, [opened])

  // If the page goes away during the hold, don't open a tab afterwards.
  useEffect(() => {
    return () => {
      if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
    }
  }, [])

  // Same-tab sign-up, kept as the fallback for when the new tab can't be opened.
  async function oauthInThisTab(provider: ProviderId) {
    setFormError(null)
    setBusy(provider)
    try {
      await signIn(provider, { callbackUrl: oauthReturnUrl(callbackUrl), redirect: true })
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      setBusy(null)
    }
  }

  // After the hold, Google/GitHub open in a new tab. That tab finishes the sign-up on the use-case step and then goes to
  // callbackUrl: the page they were heading for, or "/" when they came straight to the sign-up page.
  function launchProvider(provider: ProviderId) {
    const token = csrfRef.current
    if (token && openProviderInNewTab(provider, token, oauthReturnUrl(callbackUrl))) {
      setBusy(null)
      setOpened(provider)
      return
    }
    void oauthInThisTab(provider)
  }

  // Click: the button plays its "locking on" animation for HOLD_MS first, so it can actually be seen, then the tab opens.
  function oauth(provider: ProviderId) {
    if (busy) return
    setFormError(null)
    setOpened(null)
    setBusy(provider)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      launchProvider(provider)
    }, HOLD_MS)
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
        router.replace(callbackUrl)
        router.refresh()
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
          <Alert
            id="auth-error"
            variant="destructive"
            className="mt-6 rounded-[10px] border-red-500/25 bg-red-500/[0.07] px-3 py-2.5 text-red-200 *:data-[slot=alert-description]:text-red-200/90 [&>svg]:text-red-300"
          >
            <TriangleAlert className="size-4" />
            <AlertDescription className="text-[13px] leading-snug text-red-200/90">{error}</AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Returning from OAuth on the use-case step: wait for the session instead of flashing step 1.
  if (status === "loading" && params.get("step") === "2") return null

  return (
    <div className="flex flex-col">
      <p aria-live="polite" className="sr-only">
        Step {step} of 2: {step === 1 ? "Create your account" : "Personalize your hunt"}
      </p>
      <Stepper step={step} />

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div key="step-1" variants={group} initial="enter" animate="center" exit="exit" className="flex flex-col">
            <motion.div variants={rise}>
              <Heading title="Create your account" subtitle="Find issues that fit." />
            </motion.div>

            {errorAlert}

            <motion.div variants={rise} className="mt-8 flex flex-col gap-2">
              <p role="status" className="sr-only">
                {opened ? `${PROVIDERS.find((p) => p.id === opened)?.label ?? "The provider"} opened in a new tab.` : ""}
              </p>
              {PROVIDERS.map((p) => {
                const isBusy = busy === p.id
                const isOpened = opened === p.id
                return (
                  <Button
                    key={p.id}
                    type="button"
                    onClick={() => oauth(p.id)}
                    disabled={busy !== null}
                    aria-busy={isBusy}
                    className={cn(p.id === "github" ? whiteButton : darkButton, isBusy && "disabled:opacity-100")}
                  >
                    {isBusy ? (
                      <Reticle spinning />
                    ) : isOpened ? (
                      <Check aria-hidden className="size-4" />
                    ) : (
                      <Image src={p.icon} alt="" width={16} height={16} className={p.id === "github" ? "brightness-0" : undefined} />
                    )}
                    {isBusy ? "Redirecting..." : isOpened ? "Opened in a new tab" : `Continue with ${p.label}`}
                  </Button>
                )
              })}
            </motion.div>

            {PASSWORD_SIGNUP && (
              <>
                <motion.div
                  variants={rise}
                  aria-hidden
                  className="my-4 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.08em] text-[#8a8a8a]"
                >
                  <span className="h-px flex-1 bg-[#222222]" />
                  or
                  <span className="h-px flex-1 bg-[#222222]" />
                </motion.div>

                <motion.form variants={rise} onSubmit={onSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
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
                      aria-describedby={error ? "auth-error" : undefined}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
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
                      aria-describedby={error ? "auth-error" : undefined}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="password" className={labelClass}>
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        aria-describedby={error ? "password-rules auth-error" : "password-rules"}
                        placeholder="Create a strong password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={busy !== null}
                        className={cn(inputClass, "pr-10 [@media(pointer:coarse)]:pr-11")}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-[10px] text-[#8a8a8a] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]/50 [@media(pointer:coarse)]:w-11"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
                            <div aria-hidden className="mt-1.5 flex gap-1.5">
                              {RULES.map((r, i) => (
                                <span
                                  key={r.id}
                                  className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i < score ? STRENGTH[score] : "bg-[#262626]")}
                                />
                              ))}
                            </div>
                            <p className="sr-only" aria-live="polite">
                              Password strength: {STRENGTH_LABEL[score] || "Too short"}
                            </p>
                            <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
                              {results.map((r) => (
                                <li
                                  key={r.id}
                                  className={cn("flex items-center gap-2 text-[12px] transition-colors", r.ok ? "text-[#d4f5a3]" : "text-[#8a8a8a]")}
                                >
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

                  <div className="flex items-start gap-2.5 py-0.5">
                    <Checkbox
                      id="terms"
                      checked={agreed}
                      onCheckedChange={(v) => setAgreed(v === true)}
                      disabled={busy !== null}
                      className={checkboxClass}
                    />
                    <Label htmlFor="terms" className="block cursor-pointer text-[13px] font-normal leading-snug text-[#a3a3a3]">
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

                  <Button
                    type="submit"
                    disabled={!agreed || busy !== null}
                    aria-busy={busy === "credentials"}
                    className={cn(darkButton, busy === "credentials" && "disabled:opacity-100")}
                  >
                    <Reticle spinning={busy === "credentials"} className="text-[#a8ff3e]" />
                    {busy === "credentials" ? "Creating account..." : "Create account"}
                  </Button>
                </motion.form>
              </>
            )}

            <motion.p variants={rise} className="mt-6 text-center text-[13px] text-[#8a8a8a]">
              Already have an account?{" "}
              <Link
                href={withCallbackUrl("/login", callbackUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(linkClass, "font-semibold")}
              >
                Log In
              </Link>
            </motion.p>

            <motion.p variants={rise} className="mt-3 text-center text-[12px] leading-relaxed text-[#8a8a8a] [text-wrap:balance]">
              By continuing with GitHub or Google you agree to our{" "}
              <Link href="/terms" className={legalLinkClass}>
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className={legalLinkClass}>
                Privacy Policy
              </Link>
              .
            </motion.p>
          </motion.div>
        ) : (
          <motion.form
            key="step-2"
            variants={group}
            initial="enter"
            animate="center"
            exit="exit"
            onSubmit={finish}
            className="flex flex-col"
          >
            <motion.div variants={rise}>
              <Heading title="Personalize your hunt" subtitle="One quick question." />
            </motion.div>

            {errorAlert}

            <motion.div variants={rise} className="mt-8 flex flex-col gap-2.5">
              <p id="use-case-label" className="text-[13px] font-medium leading-none text-[#d4d4d4]">
                What&apos;ll you use OSHunt for?
              </p>
              <RadioGroup
                value={useCase}
                onValueChange={(v) => setUseCase(v as UseCase)}
                aria-labelledby="use-case-label"
                className="gap-0 overflow-hidden rounded-[10px] border border-[#262626]"
              >
                {USE_CASES.map((opt, i) => {
                  const id = `use-case-${i}`
                  const selected = useCase === opt
                  return (
                    <label
                      key={opt}
                      htmlFor={id}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center justify-between gap-4 px-3.5 py-2.5 transition-colors duration-150",
                        i < USE_CASES.length - 1 && "border-b border-[#262626]",
                        selected ? "bg-[#222222]" : "bg-[#1a1a1a] hover:bg-[#1f1f1f]"
                      )}
                    >
                      <span className={cn("text-[14px] transition-colors", selected ? "font-medium text-white" : "text-[#a3a3a3]")}>{opt}</span>
                      <RadioGroupItem
                        value={opt}
                        id={id}
                        className="size-[18px] border-2 border-[#3a3a3a] bg-transparent shadow-none focus-visible:border-[#a8ff3e] focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/25 data-[state=checked]:border-[#a8ff3e] dark:bg-transparent [&_svg]:fill-[#a8ff3e] [&_svg]:stroke-[#a8ff3e]"
                      />
                    </label>
                  )
                })}
              </RadioGroup>
            </motion.div>

            <motion.div variants={rise} className="mt-4 flex items-start gap-2.5 py-0.5">
              <Checkbox id="newsletter" checked={newsletter} onCheckedChange={(v) => setNewsletter(v === true)} className={checkboxClass} />
              <Label htmlFor="newsletter" className="block cursor-pointer text-[13px] font-normal leading-snug text-[#a3a3a3]">
                Send me OSHunt drops — no spam, ever.
              </Label>
            </motion.div>

            <motion.div variants={rise} className="mt-5">
              <Button
                type="submit"
                disabled={!useCase || busy !== null}
                aria-busy={busy === "onboarding"}
                className={cn(whiteButton, busy === "onboarding" && "disabled:opacity-100")}
              >
                <Reticle spinning={busy === "onboarding"} />
                {busy === "onboarding" ? "Saving profile..." : useCase ? "Start hunting" : "Select a use case first"}
              </Button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div
      className={cn(
        outfit.className,
        "relative isolate flex min-h-dvh flex-col items-center justify-center overflow-x-clip px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] text-white antialiased"
      )}
      style={{ backgroundColor: "#111111", colorScheme: "dark" }}
    >
      <MotionConfig reducedMotion="user">
        <main className="flex w-full max-w-[288px] flex-col">
          <BrandMark className="mb-7" />
          {/* useSearchParams() needs a Suspense boundary in the App Router */}
          <Suspense fallback={null}>
            <SignupForm />
          </Suspense>
        </main>
      </MotionConfig>

      <style>{pageCss}</style>
    </div>
  )
}