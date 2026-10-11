"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { JetBrains_Mono, Outfit } from "next/font/google"
import { MotionConfig, animate, motion, type Variants } from "framer-motion"
import { Activity, ArrowUpRight, Crown, RefreshCw, User } from "lucide-react"
import Navbar from "@/components/ui/Navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDisplayInitials } from "@/components/lib/profile"
import { getUsageProgressPercent } from "@/components/lib/usage"
import { cn } from "@/components/lib/utils"
import { usePrefersReducedMotion } from "@/components/lib/use-prefers-reduced-motion"

// Fonts load through next/font (self-hosted, no runtime <link>), replacing the old Google Fonts link injection.
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], display: "swap" })

type Usage = {
  tier: "free" | "pro"
  resetsAt: string
  usage: {
    github: { used: number; limit: number }
    ai: { used: number; limit: number }
  }
  features: Array<{ key: string; locked: boolean; cost?: { github?: number; ai?: number } }>
}

function formatResetText(resetIso?: string, currentNow: number | null = null) {
  if (!resetIso) return "Reset starts after the first feature use."
  if (currentNow === null) return "Resets in 24 hours."
  try {
    const diffMs = new Date(resetIso).getTime() - currentNow
    if (diffMs <= 0) return "Reset started. Next cycle will refresh soon."
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `Resets in ${hours}h ${mins}m.`
  } catch {
    return "Reset starts after the first feature use."
  }
}

/* --------------------------------- motion --------------------------------- */

const EASE = [0.16, 1, 0.3, 1] as const

// Blocks rise in one after another. <MotionConfig reducedMotion="user"> drops the slide for reduced-motion visitors.
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { opacity: { duration: 0.5, ease: EASE }, y: { type: "spring", stiffness: 260, damping: 30 } },
  },
}

// Cards light up a hairline border and a soft fill where the mouse is (mouse only, no re-render per move).
function trackSpotlight(e: ReactPointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return
  const el = (e.target as Element).closest<HTMLElement>(".dash-spot")
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty("--mx", `${e.clientX - r.left}px`)
  el.style.setProperty("--my", `${e.clientY - r.top}px`)
}

const dashCss = `
  .dash-spot { position: relative; }
  .dash-spot::before {
    content: ""; position: absolute; inset: -1px; z-index: 2; padding: 1px; border-radius: inherit; pointer-events: none; opacity: 0;
    background: radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.5), rgba(255,255,255,0.12) 45%, transparent 70%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    transition: opacity 0.3s ease;
  }
  .dash-spot::after {
    content: ""; position: absolute; inset: 0; z-index: 0; border-radius: inherit; pointer-events: none; opacity: 0;
    background: radial-gradient(380px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.045), transparent 60%);
    transition: opacity 0.4s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .dash-spot:hover::before, .dash-spot:hover::after { opacity: 1; }
  }
  .dash-shimmer::after {
    content: ""; position: absolute; inset: 0; transform: translateX(-100%);
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
    animation: dash-shimmer 1.6s ease-in-out infinite;
  }
  @keyframes dash-shimmer { to { transform: translateX(100%); } }
  @media (prefers-reduced-motion: reduce) { .dash-shimmer::after { animation: none; } }
`

/* -------------------------------- components -------------------------------- */

// Placeholder block while data loads. Sized like the content that replaces it, so nothing jumps.
const Shimmer = ({ className }: { className?: string }) => (
  <span aria-hidden className={cn("dash-shimmer relative block overflow-hidden rounded-md bg-white/[0.06]", className)} />
)

const SectionLabel = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => (
  <div className="flex items-center gap-1.5 text-[0.7rem] font-bold uppercase tracking-[0.13em] text-[#8c8c8c]">
    <span aria-hidden className="flex text-[#5e5e5e] [&_svg]:size-3">
      {icon}
    </span>
    {children}
  </div>
)

// Number that counts up to its value (and glides to a new one when the usage changes).
// It writes the text straight into the element, so there is no React re-render per frame.
function CountUp({ value }: { value: number }) {
  const reduce = usePrefersReducedMotion()
  const el = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  useEffect(() => {
    const node = el.current
    if (!node) return
    if (reduce) {
      shown.current = value
      node.textContent = String(value)
      return
    }
    const controls = animate(shown.current, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v
        node.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [value, reduce])
  return <span ref={el}>0</span>
}

// Track + fill. The fill slides in with a transform (cheap) instead of animating its width.
function UsageBar({ percent, ready }: { percent: number; ready: boolean }) {
  return (
    <div
      role="progressbar"
      aria-label="Daily usage"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]"
    >
      <motion.div
        className="absolute inset-0 rounded-full bg-[#a8ff3e]"
        initial={{ x: "-100%" }}
        animate={{ x: ready ? `${percent - 100}%` : "-100%" }}
        transition={{ duration: 1, ease: EASE }}
      />
    </div>
  )
}

const cardClass =
  "dash-spot h-full rounded-2xl border-white/[0.08] bg-[#0e0e0e] shadow-none transition-[transform,border-color] duration-300 hover:border-white/[0.16] [@media(hover:hover)]:hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
const bodyClass = "relative z-[1] flex h-full flex-col p-5 sm:p-6"

/* ----------------------------------- page ----------------------------------- */

export default function DashboardPage() {
  const { data: session, status } = useSession()

  const [usage, setUsage] = useState<Usage | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [now, setNow] = useState<number | null>(null)

  // Usage refreshes on load, every 5 seconds while the tab is visible, on focus, and when a feature fires "usage:updated".
  useEffect(() => {
    if (status !== "authenticated") return

    const refresh = async () => {
      try {
        const res = await fetch("/api/usage", { cache: "no-store" })
        if (!res.ok) return
        setUsage(await res.json())
      } catch (error) {
        console.error("Failed to fetch usage summary", error)
      } finally {
        setLoaded(true)
      }
    }

    const initialTimer = window.setTimeout(() => void refresh(), 0)
    const onUsageUpdated = () => void refresh()
    const onFocus = () => void refresh()
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh()
    }

    window.addEventListener("usage:updated", onUsageUpdated)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, 5000)

    return () => {
      window.clearTimeout(initialTimer)
      window.removeEventListener("usage:updated", onUsageUpdated)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      window.clearInterval(timer)
    }
  }, [status])

  // Clock for the reset countdown (once a minute).
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const t = window.setTimeout(tick, 0)
    const interval = window.setInterval(tick, 60000)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(interval)
    }
  }, [])

  const sessionLoading = status === "loading"
  const isSignedIn = status === "authenticated" && !!session?.user?.id
  const fallbackName = "Not signed in"
  const fallbackEmail = "Sign in to view usage"

  const name = isSignedIn ? session?.user?.name || fallbackName : fallbackName
  const email = isSignedIn ? session?.user?.email || fallbackEmail : fallbackEmail
  const image = isSignedIn ? session?.user?.image || null : null
  const initial = isSignedIn ? getDisplayInitials(name, email) : "?"

  const githubUsage = usage?.usage.github ?? { used: 0, limit: 15 }
  const aiUsage = usage?.usage.ai ?? { used: 0, limit: 5 }
  const tier = usage?.tier ?? "free"
  const dailyUsageProgressPercent = getUsageProgressPercent({
    githubUsed: githubUsage.used,
    githubLimit: githubUsage.limit,
    aiUsed: aiUsage.used,
    aiLimit: aiUsage.limit,
  })
  const percent = Math.round(dailyUsageProgressPercent)

  // Placeholders only while a signed-in visitor's first response is on its way.
  const usageLoading = sessionLoading || (status === "authenticated" && !loaded)

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn(outfit.className, "min-h-dvh bg-[#090909] text-[#f2f2f2] antialiased [-webkit-tap-highlight-color:transparent]")}>
        <Navbar />

        <motion.main
          variants={stagger}
          initial="hidden"
          animate="show"
          onPointerMove={trackSpotlight}
          className="mx-auto w-full max-w-[560px] px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[clamp(2rem,6vw,3.5rem)] sm:px-6 md:max-w-[760px]"
        >
          <motion.header variants={rise} className="mb-7 sm:mb-8">
            <h1 className="bg-linear-to-b from-white from-20% to-[#aaaaaa] bg-clip-text text-[clamp(1.5rem,1.2rem+1vw,1.875rem)] font-bold leading-tight tracking-[-0.02em] text-transparent">
              Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-[#8c8c8c]">Your account, usage, and plan — at a glance.</p>
          </motion.header>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Account */}
            <motion.div variants={rise} className="md:col-span-2">
              <Card className={cardClass} aria-busy={sessionLoading || undefined}>
                <CardContent className={bodyClass}>
                  <SectionLabel icon={<User />}>Account</SectionLabel>
                  <div className="mt-4 flex items-center gap-4">
                    {sessionLoading ? (
                      <>
                        <Shimmer className="size-12 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-2.5">
                          <Shimmer className="h-4 w-40 max-w-full" />
                          <Shimmer className="h-3.5 w-56 max-w-full" />
                        </div>
                      </>
                    ) : (
                      <>
                        <Avatar className="size-12 shrink-0 border border-white/[0.08]">
                          {image && <AvatarImage src={image} alt={name} />}
                          <AvatarFallback className="bg-linear-to-br from-[#a8ff3e]/95 to-[#68ffba]/85 text-base font-extrabold tracking-[0.08em] text-[#090909] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_0_1px_rgba(255,255,255,0.12)]">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[1.05rem] font-semibold leading-snug text-[#f2f2f2]">{name}</p>
                          <p className="truncate text-[0.85rem] leading-snug text-[#8c8c8c]">{email}</p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {!isSignedIn && !sessionLoading && (
              <motion.div variants={rise} className="md:col-span-2">
                <Card className={cardClass}>
                  <CardContent className={bodyClass}>
                    <p className="text-[13px] text-[#8c8c8c]">You are not signed in, so usage is hidden until the session is restored.</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Daily usage */}
            <motion.div variants={rise}>
              <Card className={cardClass} aria-busy={usageLoading || undefined}>
                <CardContent className={bodyClass}>
                  <SectionLabel icon={<Activity />}>Daily Usage</SectionLabel>

                  <div className="mt-5 flex h-11 items-baseline gap-2">
                    {usageLoading ? (
                      <Shimmer className="h-11 w-36" />
                    ) : (
                      <>
                        <span aria-hidden className={cn(mono.className, "text-[2.75rem] font-bold leading-none tracking-[-0.04em] text-[#a8ff3e] tabular-nums")}>
                          <CountUp value={percent} />%
                        </span>
                        <span className="sr-only">{percent}%</span>
                        <span className="text-sm text-[#8c8c8c]">used</span>
                      </>
                    )}
                  </div>

                  <div className="mt-4">
                    <UsageBar percent={dailyUsageProgressPercent} ready={!usageLoading} />
                  </div>

                  <p className="mt-4 flex h-[1.1rem] items-center gap-1.5 text-[0.78rem] text-[#8c8c8c]">
                    <RefreshCw aria-hidden size={11} strokeWidth={2} className="shrink-0 text-[#5e5e5e]" />
                    {usageLoading ? <Shimmer className="h-3 w-32" /> : formatResetText(usage?.resetsAt, now)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Current plan */}
            <motion.div variants={rise}>
              <Card className={cardClass}>
                <CardContent className={bodyClass}>
                  <div className="flex items-center justify-between gap-3">
                    <SectionLabel icon={<Crown />}>Current Plan</SectionLabel>
                    <Badge variant="outline" className="h-5 border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[11px] text-[#a8ff3e]">
                      Active
                    </Badge>
                  </div>
                  <h2 className="mt-5 text-[1.4rem] font-bold leading-tight text-[#f2f2f2]">{tier === "pro" ? "Pro" : "Free"}</h2>
                  <p className="mt-1.5 text-[0.85rem] text-[#8c8c8c]">24h reset cycle</p>

                  {tier === "free" && (
                    <div className="mt-auto pt-6">
                      <Button
                        type="button"
                        className="group/sheen relative h-11 w-full touch-manipulation gap-2 rounded-[10px] border-0 bg-[#a8ff3e] text-[0.9rem] font-bold text-[#0a0a0a] transition-[transform,filter] duration-200 hover:bg-[#a8ff3e] hover:brightness-105 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0e0e0e] active:scale-[0.98]"
                      >
                        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] motion-reduce:hidden">
                          <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-[18deg] bg-linear-to-r from-transparent via-white/45 to-transparent opacity-0 transition-[transform,opacity] duration-700 ease-out [@media(hover:hover)]:group-hover/sheen:translate-x-[460%] [@media(hover:hover)]:group-hover/sheen:opacity-100" />
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          size={15}
                          strokeWidth={2.25}
                          className="relative transition-transform duration-300 [@media(hover:hover)]:group-hover/sheen:-translate-y-px [@media(hover:hover)]:group-hover/sheen:translate-x-px"
                        />
                        <span className="relative">Upgrade to Pro</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.main>

        <style>{dashCss}</style>
      </div>
    </MotionConfig>
  )
}
