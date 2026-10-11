"use client"

import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Outfit } from "next/font/google"
import { signIn, useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, MotionConfig, motion, type Variants } from "framer-motion"
import { ArrowLeft, Check, Crosshair, Eye, EyeOff, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/components/lib/utils"

// Layout reference: framer.com/login. One small centered column (288px), logo above, flat dark background.
// Palette: accent #a8ff3e · bg #111111 · field #1a1a1a · border #262626 · text #ededed · label #a3a3a3 · muted #8a8a8a

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

// Only move focus by itself on desktop-style pointers, so phones don't pop the keyboard open.
// Used only for things that mount after a click, never during server rendering.
const canAutoFocus = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches

/* ---------------------------------- styles ---------------------------------- */

// Controls are 38px for mouse/trackpad and 44px on touch screens (comfortable tap target).
// The `!` makes the touch sizes win over whatever defaults the shadcn components ship with.
const control = "h-[38px] w-full rounded-[10px] [@media(pointer:coarse)]:!h-11"

const labelClass = "text-[13px] font-medium leading-none text-[#a3a3a3]"
const linkClass =
  "rounded-sm text-[#a8ff3e] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
const subtleLinkClass =
  "-my-[5px] inline-flex min-h-6 cursor-pointer items-center rounded-sm bg-transparent p-0 text-[12px] font-medium text-[#8a8a8a] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 disabled:cursor-not-allowed disabled:opacity-50"
const legalLinkClass = "text-[#b3b3b3] underline underline-offset-2 transition-colors hover:text-white"
// "Back to sign in" under the reset form: same quiet style as the other secondary links, taller hit area on touch.
const backLinkClass =
  "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-sm bg-transparent px-1 text-[13px] font-medium text-[#8a8a8a] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 disabled:cursor-not-allowed disabled:opacity-50 [@media(pointer:coarse)]:min-h-11"

// 16px on touch keeps iOS Safari from zooming into the field on focus.
const inputClass = cn(
  control,
  "auth-field border-[#262626] bg-[#1a1a1a] px-3.5 text-[14px] text-[#ededed] shadow-none transition-[border-color,box-shadow] duration-150",
  "placeholder:text-[#858585] hover:border-[#333333] dark:bg-[#1a1a1a]",
  "focus-visible:border-[#a8ff3e]/55 focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/15",
  "disabled:cursor-not-allowed disabled:opacity-60 [@media(pointer:coarse)]:!text-base"
)
// Verification code: centered, evenly spaced digits. The indent equals the tracking so the digits stay optically centered.
const codeClass = "text-center text-[16px] font-medium tabular-nums tracking-[0.4em] indent-[0.4em] placeholder:font-normal"

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

// The page's only entrance motion: the blocks rise in one after another (and fade out when switching views).
// <MotionConfig reducedMotion="user"> (see LoginPage) drops the slide for reduced-motion users and keeps a plain fade.
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
const BrandMark = () => (
  <Link
    href="/"
    aria-label="OSHunt home"
    className="relative mx-auto mb-9 flex size-10 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
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

// Eye button that sits inside a password field (used by the sign-in and the new-password field).
const VisibilityToggle = ({ shown, onToggle }: { shown: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? "Hide password" : "Show password"}
    aria-pressed={shown}
    className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center rounded-r-[10px] text-[#8a8a8a] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]/50 [@media(pointer:coarse)]:w-11"
  >
    {shown ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
  </button>
)

// Messages under the heading. Red for errors, lime for good news (code sent, password updated).
// Each one grows open / folds shut on its own, and the page re-centers smoothly around it.
function Banners({ error, notice }: { error: string | null; notice: string | null }) {
  return (
    <>
      <AnimatePresence initial={false}>
        {notice && (
          <motion.div
            key="notice"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              role="status"
              className="mt-6 flex items-start gap-2.5 rounded-[10px] border border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.06] px-3 py-2.5 text-[13px] leading-snug text-[#d6ffa3]"
            >
              <Check aria-hidden className="mt-px size-4 shrink-0 text-[#a8ff3e]" />
              <p>{notice}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className={cn(
                "rounded-[10px] border-red-500/25 bg-red-500/[0.07] px-3 py-2.5 text-red-200 *:data-[slot=alert-description]:text-red-200/90 [&>svg]:text-red-300",
                notice ? "mt-3" : "mt-6"
              )}
            >
              <TriangleAlert className="size-4" />
              <AlertDescription className="text-[13px] leading-snug text-red-200/90">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// The code + new-password fields grow open under the email field once the code has been sent.
// The padding gives their focus rings room inside the clipped box (the negative margins cancel it out).
const Reveal = ({ children, onOpened }: { children: ReactNode; onOpened?: () => void }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    onAnimationComplete={onOpened}
    className="-mx-1 -mb-1 overflow-hidden px-1 pb-1"
  >
    <div className="flex flex-col gap-3 pt-3">{children}</div>
  </motion.div>
)

function LoginForm() {
  const params = useSearchParams()
  const router = useRouter()
  const { status } = useSession()
  const callbackUrl = getSafeCallbackUrl(params.get("callbackUrl"))
  const errorCode = params.get("error")
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [resetMode, setResetMode] = useState(false)
  const [resetStep, setResetStep] = useState<"request" | "verify">("request")
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [resetPassword, setResetPassword] = useState("")
  const [resetStatus, setResetStatus] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [openedReset, setOpenedReset] = useState(false)
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
      const authUrl = `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`
      const popup = window.open(authUrl, "_blank", "noopener,noreferrer,width=500,height=700")
      if (popup) return
      await signIn(provider, { callbackUrl, redirect: true })
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      setBusy(null)
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return

    const normalizedEmail = email.trim().toLowerCase()
    const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)

    if (!normalizedEmail || !emailIsValid) {
      setFormError("Please enter a valid email address.")
      return
    }

    if (!password) {
      setFormError("Please enter your password.")
      return
    }

    setFormError(null)
    setBusy("credentials")
    try {
      const res = await signIn("credentials", {
        email: normalizedEmail,
        password,
        callbackUrl,
        redirect: false,
      })
      if (res?.error) {
        setFormError(ERROR_MESSAGES[res.error] ?? ERROR_MESSAGES.Default)
      } else {
        router.replace(callbackUrl || "/")
        router.refresh()
      }
    } catch {
      setFormError(ERROR_MESSAGES.Default)
    } finally {
      setBusy(null)
    }
  }

  async function handleSendResetCode() {
    const targetEmail = (resetEmail || email).trim().toLowerCase()
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setFormError("Enter the email you use to sign in.")
      return
    }

    setFormError(null)
    setBusy("credentials")
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!res.ok) {
        setFormError(data.error ?? "Unable to send the reset code right now.")
        return
      }

      setResetStep("verify")
      setEmail(targetEmail)
      setResetStatus(data.message ?? "A verification code was sent to your inbox.")
    } catch {
      setFormError("Unable to send the reset code right now.")
    } finally {
      setBusy(null)
    }
  }

  async function handleResetPassword() {
    const targetEmail = (resetEmail || email).trim().toLowerCase()
    const normalizedCode = resetCode.trim()

    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setFormError("Enter the email you use to sign in.")
      return
    }

    if (!normalizedCode || normalizedCode.length !== 6) {
      setFormError("Enter the 6-digit verification code that was emailed to you.")
      return
    }

    if (!resetPassword || resetPassword.length < 8) {
      setFormError("Choose a new password with at least 8 characters.")
      return
    }

    setFormError(null)
    setBusy("credentials")
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          code: normalizedCode,
          newPassword: resetPassword,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string }

      if (!res.ok) {
        setFormError(data.error ?? "Unable to reset your password right now.")
        return
      }

      setResetStatus(data.message ?? "Password updated. You can sign in with your new password.")
      setResetMode(false)
      setResetStep("request")
      setResetEmail("")
      setResetCode("")
      setResetPassword("")
      setEmail(targetEmail)
      setPassword("")
    } catch {
      setFormError("Unable to reset your password right now.")
    } finally {
      setBusy(null)
    }
  }

  // "Forgot password?" opens the reset view, "Back to sign in" closes it. Same reset of state as before.
  function toggleReset() {
    setResetMode((prev) => !prev)
    setResetStep("request")
    setResetStatus(null)
    setFormError(null)
    setResetEmail(email)
    setResetCode("")
    setResetPassword("")
    setShowResetPassword(false)
    setOpenedReset(true)
  }

  // Enter key in the reset form does the same thing as its button.
  function onResetSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    if (resetStep === "verify") void handleResetPassword()
    else void handleSendResetCode()
  }

  return (
    <AnimatePresence mode="wait">
      {!resetMode ? (
        <motion.div key="signin" variants={group} initial="enter" animate="center" exit="exit" className="flex flex-col">
          <motion.div variants={rise}>
            <Heading title="Welcome back" subtitle="Pick up your hunt." />
          </motion.div>

          <Banners error={error} notice={resetStatus} />

          <motion.div variants={rise} className="mt-8 flex flex-col gap-2">
            {PROVIDERS.map((p) => (
              <Button
                key={p.id}
                type="button"
                onClick={() => oauth(p.id)}
                disabled={busy !== null}
                aria-busy={busy === p.id}
                className={cn(p.id === "github" ? whiteButton : darkButton, busy === p.id && "disabled:opacity-100")}
              >
                {busy === p.id ? (
                  <Reticle spinning />
                ) : (
                  <Image src={p.icon} alt="" width={16} height={16} className={p.id === "github" ? "brightness-0" : undefined} />
                )}
                {busy === p.id ? "Redirecting..." : `Continue with ${p.label}`}
              </Button>
            ))}
          </motion.div>

          {PASSWORD_LOGIN && (
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
                  <Label htmlFor="email" className={labelClass}>
                    Email address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus={openedReset && !email && canAutoFocus()}
                    required
                    disabled={busy !== null}
                    aria-describedby={error ? "auth-error" : undefined}
                    className={inputClass}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className={labelClass}>
                      Password
                    </Label>
                    <button type="button" onClick={toggleReset} disabled={busy !== null} className={subtleLinkClass}>
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      autoFocus={openedReset && !!email && canAutoFocus()}
                      required
                      disabled={busy !== null}
                      aria-describedby={error ? "auth-error" : undefined}
                      onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                      onBlur={() => setCapsLock(false)}
                      className={cn(inputClass, "pr-10 [@media(pointer:coarse)]:pr-11")}
                    />
                    <VisibilityToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                  </div>
                  {capsLock && <p className="text-[12px] text-amber-300/90">Caps Lock is on</p>}
                </div>

                <Button
                  type="submit"
                  disabled={busy !== null}
                  aria-busy={busy === "credentials"}
                  className={cn(darkButton, busy === "credentials" && "disabled:opacity-100")}
                >
                  <Reticle spinning={busy === "credentials"} className="text-[#a8ff3e]" />
                  {busy === "credentials" ? "Signing in..." : "Sign in"}
                </Button>
              </motion.form>
            </>
          )}

          <motion.p variants={rise} className="mt-6 text-center text-[13px] text-[#8a8a8a]">
            Don&apos;t have an account?{" "}
            <Link href="/signin" className={cn(linkClass, "font-semibold")}>
              Create one
            </Link>
          </motion.p>

          <motion.p variants={rise} className="mt-3 text-center text-[12px] leading-relaxed text-[#8a8a8a] [text-wrap:balance]">
            By continuing you agree to our{" "}
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
          key="reset"
          variants={group}
          initial="enter"
          animate="center"
          exit="exit"
          onSubmit={onResetSubmit}
          noValidate
          className="flex flex-col"
        >
          <motion.div variants={rise}>
            <Heading
              title={resetStep === "verify" ? "Check your email" : "Reset password"}
              subtitle={resetStep === "verify" ? "Enter the code below." : "We'll email you a code."}
            />
          </motion.div>

          <Banners error={formError} notice={resetStatus} />

          <motion.div variants={rise} className="mt-8 flex flex-col">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reset-email" className={labelClass}>
                Email address
              </Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                value={resetEmail || email}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={canAutoFocus()}
                disabled={busy !== null}
                aria-describedby={formError ? "auth-error" : undefined}
                className={inputClass}
              />
            </div>

            <AnimatePresence initial={false}>
              {resetStep === "verify" && (
                <Reveal key="verify-fields" onOpened={() => canAutoFocus() && document.getElementById("reset-code")?.focus()}>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reset-code" className={labelClass}>
                      Verification code
                    </Label>
                    <Input
                      id="reset-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      spellCheck={false}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      disabled={busy !== null}
                      aria-describedby={formError ? "auth-error" : undefined}
                      className={cn(inputClass, codeClass)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="reset-password" className={labelClass}>
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="reset-password"
                        name="new-password"
                        type={showResetPassword ? "text" : "password"}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Set a new password"
                        autoComplete="new-password"
                        disabled={busy !== null}
                        aria-describedby={formError ? "reset-password-hint auth-error" : "reset-password-hint"}
                        className={cn(inputClass, "pr-10 [@media(pointer:coarse)]:pr-11")}
                      />
                      <VisibilityToggle shown={showResetPassword} onToggle={() => setShowResetPassword((s) => !s)} />
                    </div>
                    <p id="reset-password-hint" className="text-[12px] text-[#8a8a8a]">
                      At least 8 characters.
                    </p>
                  </div>
                </Reveal>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={busy !== null}
              aria-busy={busy === "credentials"}
              className={cn(whiteButton, "mt-3", busy === "credentials" && "disabled:opacity-100")}
            >
              {busy === "credentials" && <Reticle spinning />}
              {busy === "credentials"
                ? resetStep === "verify"
                  ? "Verifying..."
                  : "Sending..."
                : resetStep === "verify"
                  ? "Verify & reset password"
                  : "Send verification code"}
            </Button>
          </motion.div>

          <motion.div variants={rise} className="mt-4 flex justify-center">
            <button type="button" onClick={toggleReset} disabled={busy !== null} className={backLinkClass}>
              <ArrowLeft aria-hidden className="size-3.5" />
              Back to sign in
            </button>
          </motion.div>

          <motion.p variants={rise} className="mt-3 text-center text-[12px] leading-relaxed text-[#8a8a8a] [text-wrap:balance]">
            By continuing you agree to our{" "}
            <Link href="/terms" className={legalLinkClass}>
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className={legalLinkClass}>
              Privacy Policy
            </Link>
            .
          </motion.p>
        </motion.form>
      )}
    </AnimatePresence>
  )
}

export default function LoginPage() {
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
          <BrandMark />
          {/* useSearchParams() needs a Suspense boundary in the App Router */}
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </main>
      </MotionConfig>

      <style>{pageCss}</style>
    </div>
  )
}