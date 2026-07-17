"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { LuClock, LuSparkles, LuBookmark } from "react-icons/lu"
import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Same brand tokens as the Hunt and About pages — one product, one system.
const BRAND = "#a8ff3e"
const HUNT_URL = "/hunt" // TODO: point at your real route

// ────────────────────────────────────────────────────────────────────────────
// Reduced-motion + reveal-on-scroll + count-up (same primitives as About page)
// ────────────────────────────────────────────────────────────────────────────

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return reduced
}

function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  const reduceMotion = usePrefersReducedMotion()
  const shown = reduceMotion || inView
  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out", shown ? "translate-y-0 opacity-100" : "translate-y-7 opacity-0", className)}
      style={{ transitionDelay: reduceMotion ? "0ms" : `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Counter({ to, prefix = "", suffix = "", duration = 1200 }: { to: number; prefix?: string; suffix?: string; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.6)
  const reduceMotion = usePrefersReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (reduceMotion) { setValue(to); return }
    if (!inView) return
    let start: number | null = null
    let raf = 0
    function step(ts: number) {
      if (start === null) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * to))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration, reduceMotion])

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Content — grounded in the real Hunt page: language picker, filters,
// activity signal, AI proposal, bookmarking.
// ────────────────────────────────────────────────────────────────────────────

const STATS = [
  { to: 5, prefix: "", suffix: "", label: "Steps, start to shipped" },
  { to: 2, prefix: "~", suffix: " min", label: "To your first proposal" },
  { to: 64, prefix: "", suffix: "", label: "Languages indexed" },
  { to: 100, prefix: "", suffix: "%", label: "Free, always" },
]

const STEPS = [
  {
    n: "01",
    title: "Pick your languages",
    body: "Search a single language, or flip to multi-select and cover Python, Rust, and Vue at once — 64 languages and frameworks, real logos so mixed results stay readable.",
    time: "~10 sec",
    visual: "language",
  },
  {
    n: "02",
    title: "Dial in your filters",
    body: "Set a difficulty, and stack on bounty-only or active-repos-only. Every filter narrows the list live — no separate \"search\" step to wait on.",
    time: "One click each",
    visual: "filters",
  },
  {
    n: "03",
    title: "Scan real signals, not guesses",
    body: "Each result shows its language at a glance, plus exactly how long the repo's been quiet — \"dead 8mo\", not a rounded-off \"6+ months\" badge.",
    time: "Instant",
    visual: "results",
  },
  {
    n: "04",
    title: "Open the AI-drafted proposal",
    body: "One click drafts a starting approach for the issue — something to edit and make your own, not a blank comment box staring back at you.",
    time: "~30 sec to review",
    visual: "proposal",
  },
  {
    n: "05",
    title: "Bookmark it or ship it",
    body: "Not ready yet? Bookmark it — it won't get lost in fifty open tabs. Ready now? Open the pull request straight from the proposal.",
    time: "Your call",
    visual: "ship",
  },
] as const

const QUICK_START = [
  { time: "0:10", title: "Pick a language", body: "Tap the picker, choose the stack you know." },
  { time: "0:25", title: "Set difficulty", body: "Flip to Easy if it's your first contribution." },
  { time: "0:45", title: "Skim the results", body: "Activity badges tell you what's worth opening." },
  { time: "1:30", title: "Open a proposal", body: "One click, then edit it to fit the codebase." },
  { time: "2:00", title: "Ship it", body: "Bookmark for later, or open the PR right now." },
]

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#090909] font-sans text-neutral-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'Outfit','Inter',sans-serif; }
        .font-mono-brand { font-family: 'JetBrains Mono','ui-monospace',monospace; }

        .bg-grid {
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 42px 42px;
        }
        @keyframes floatGlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-2%, 3%) scale(1.06); }
        }
        .glow-orb { animation: floatGlow 14s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .glow-orb { animation: none; }
        }
      `}</style>

      <Navbar />

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-grid relative overflow-hidden border-b border-neutral-900 px-6 pb-14 pt-16 sm:pt-24">
        <div
          className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full opacity-[0.13] blur-[110px]"
          style={{ background: BRAND }}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <Reveal className="flex justify-center">
            <Badge className="rounded-full border-neutral-800 bg-neutral-900 px-3 py-1 font-mono-brand text-[11px] font-medium text-neutral-400">
              Up and hunting in minutes
            </Badge>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-6 text-[34px] font-semibold leading-[1.15] tracking-tight text-neutral-50 sm:text-[44px]">
              From search to shipped pull request, in five steps
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed text-neutral-400 sm:text-[16.5px]">
              No account required to browse, no setup calls. Here's the exact flow, screen by screen.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Stats strip ──────────────────────────────────────────────── */}
      <section className="border-b border-neutral-900 px-6 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="text-center">
              <p className="font-mono-brand text-[28px] font-semibold sm:text-[34px]" style={{ color: BRAND }}>
                <Counter to={s.to} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[12px] leading-snug text-neutral-500">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Steps — inline mockup next to each one, alternating sides ─── */}
      <section className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
        <div className="space-y-20 sm:space-y-28">
          {STEPS.map((step, i) => (
            <Reveal key={step.n}>
              <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-14">
                <div className={i % 2 === 1 ? "sm:order-2" : ""}>
                  <span className="font-mono-brand text-[13px] font-semibold tracking-wide" style={{ color: BRAND }}>
                    Step {step.n}
                  </span>
                  <h3 className="mt-2 text-[23px] font-semibold tracking-tight text-neutral-50 sm:text-[26px]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-neutral-400">{step.body}</p>
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-[11.5px] text-neutral-500">
                    <LuClock className="h-3 w-3" />
                    {step.time}
                  </p>
                </div>
                <div className={i % 2 === 1 ? "sm:order-1" : ""}>
                  <StepVisual kind={step.visual} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Quick-start timeline ─────────────────────────────────────── */}
      <section className="border-t border-neutral-900 bg-gradient-to-b from-neutral-950/60 to-transparent px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Reveal className="text-center">
            <p className="font-mono-brand text-[11px] uppercase tracking-[0.2em]" style={{ color: BRAND }}>Your first hunt</p>
            <h2 className="mt-3 text-[28px] font-semibold tracking-tight text-neutral-50 sm:text-[32px]">
              Minute by minute
            </h2>
          </Reveal>

          <div className="mt-12 space-y-0">
            {QUICK_START.map((item, i) => (
              <Reveal key={item.time} delay={i * 70}>
                <div className="flex gap-5 border-b border-neutral-900 py-5 last:border-0">
                  <span className="font-mono-brand w-12 shrink-0 pt-0.5 text-[13px] font-semibold" style={{ color: BRAND }}>
                    {item.time}
                  </span>
                  <div>
                    <p className="text-[15px] font-medium text-neutral-100">{item.title}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-neutral-500">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={QUICK_START.length * 70 + 80} className="mt-10 text-center">
            <p className="text-[14px] text-neutral-400">
              You're set up — in about two minutes.
            </p>
            <Link
              href={HUNT_URL}
              className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 rounded-sm"
              style={{ color: BRAND }}
            >
              See it in action →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <Reveal className="mx-auto max-w-4xl">
          <div className="bg-grid relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 px-8 py-16 text-center sm:px-16">
            <div
              className="glow-orb pointer-events-none absolute -bottom-24 left-1/2 h-[340px] w-[340px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[100px]"
              style={{ background: BRAND }}
            />
            <div className="relative">
              <h2 className="text-[26px] font-semibold tracking-tight text-neutral-50 sm:text-[32px]">
                That's the whole flow.
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-[15px] text-neutral-400">
                No account needed to browse — see what's waiting for you right now.
              </p>
              <Button
                asChild
                className="mt-8 h-11 rounded-lg px-7 text-[14px] font-semibold text-black shadow-[0_0_0_1px_rgba(168,255,62,0.4)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                style={{ background: BRAND }}
              >
                <Link href={HUNT_URL}>Start hunting issues</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Per-step mockups — same visual language as the real Hunt UI
// ────────────────────────────────────────────────────────────────────────────

function StepVisual({ kind }: { kind: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0b0b0b] p-5 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.85)] sm:p-6">
      <div className="mb-5 flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-800" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-800" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-800" />
      </div>
      <div className="min-h-[180px]">
        {kind === "language" && <LanguageVisual />}
        {kind === "filters" && <FiltersVisual />}
        {kind === "results" && <ResultsVisual />}
        {kind === "proposal" && <ProposalVisual />}
        {kind === "ship" && <ShipVisual />}
      </div>
    </div>
  )
}

function LanguageVisual() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-[10px] border border-neutral-800 bg-neutral-950 p-1">
        <div className="rounded-md py-2 text-center text-[12px] font-semibold text-neutral-600">Single</div>
        <div className="rounded-md py-2 text-center text-[12px] font-semibold" style={{ background: `${BRAND}14`, color: BRAND }}>
          Multi
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Python", "Rust", "Vue"].map((l) => (
          <span
            key={l}
            className="rounded-md border px-2.5 py-1.5 text-[12px] font-medium"
            style={{ borderColor: `${BRAND}40`, background: `${BRAND}14`, color: BRAND }}
          >
            {l}
          </span>
        ))}
        <span className="rounded-md border border-neutral-800 px-2.5 py-1.5 text-[12px] font-medium text-neutral-600">+ Add more</span>
      </div>
    </div>
  )
}

function FiltersVisual() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-[10px] border border-neutral-800 bg-neutral-950 p-1">
        {["Easy", "Medium", "Hard"].map((d, i) => (
          <div
            key={d}
            className="rounded-md py-2 text-center text-[11.5px] font-semibold"
            style={i === 0 ? { background: `${BRAND}14`, color: BRAND } : { color: "#525252" }}
          >
            {d}
          </div>
        ))}
      </div>
      {["Bounty only", "Active repos only"].map((label, i) => (
        <div key={label} className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5">
          <span className="text-[12.5px] text-neutral-400">{label}</span>
          <span className="block h-5 w-9 shrink-0 rounded-full p-0.5" style={{ background: i === 0 ? `${BRAND}30` : "#262626" }}>
            <span
              className={cn("block h-4 w-4 rounded-full transition-transform", i === 0 ? "translate-x-4" : "translate-x-0")}
              style={{ background: i === 0 ? BRAND : "#525252" }}
            />
          </span>
        </div>
      ))}
    </div>
  )
}

function ResultsVisual() {
  const rows = [
    { title: "Add dark mode toggle to settings", lang: "React", active: true },
    { title: "Fix flaky test in auth module", lang: "Python", active: false },
  ]
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.title} className="rounded-lg border border-neutral-900 bg-white/[0.02] px-3 py-2.5">
          <p className="truncate text-[12.5px] font-medium text-neutral-200">{r.title}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="rounded-full border border-neutral-800 bg-neutral-900 px-1.5 py-[1px] text-[9.5px] text-neutral-500">{r.lang}</span>
            {r.active ? (
              <span className="h-[6px] w-[6px] rounded-full" style={{ background: BRAND, boxShadow: `0 0 6px ${BRAND}` }} />
            ) : (
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-[1px] text-[9.5px] font-semibold text-rose-400">dead 8mo</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProposalVisual() {
  return (
    <div className="space-y-3">
      <p className="text-[12.5px] font-medium text-neutral-200">Add dark mode toggle to settings</p>
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: BRAND }}>
          <LuSparkles className="h-3 w-3" /> AI-drafted proposal
        </div>
        <p className="font-mono-brand text-[11px] leading-relaxed text-neutral-500">
          I'll add a ThemeToggle component using the existing context provider, persist the choice,
          and wire it into the settings panel
          <span className="ml-0.5 inline-block h-[11px] w-[5px] animate-pulse align-middle bg-neutral-600" />
        </p>
      </div>
    </div>
  )
}

function ShipVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border border-neutral-900 bg-white/[0.02] px-3 py-2.5">
        <p className="text-[12.5px] text-neutral-300">Add dark mode toggle to settings</p>
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
          style={{ borderColor: `${BRAND}40`, background: `${BRAND}14`, color: BRAND }}
        >
          <LuBookmark className="h-3 w-3" fill="currentColor" />
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5" style={{ borderColor: `${BRAND}30`, background: `${BRAND}0d` }}>
        <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: BRAND, boxShadow: `0 0 6px ${BRAND}` }} />
        <span className="text-[12px] font-medium" style={{ color: BRAND }}>Pull request opened</span>
      </div>
    </div>
  )
}