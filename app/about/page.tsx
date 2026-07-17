"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import * as SiIcons from "react-icons/si"
import { LuSparkles, LuCoins, LuActivity, LuBookmark } from "react-icons/lu"
import type { IconType } from "react-icons"
import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────────────────────────
// Brand tokens — mirrors the Hunt page exactly, so this reads as one product
// ────────────────────────────────────────────────────────────────────────────

const BRAND = "#a8ff3e"

// TODO: point these at your real routes/repo before shipping.
const HUNT_URL = "/hunt"
const GITHUB_URL = "https://github.com/your-org/oshunt"

// Curated subset of the same languages the Hunt page searches — real brand colors,
// not a made-up palette. Trimmed for a clean marquee rather than importing all 64.
const MARQUEE_STACK = [
  { label: "JavaScript", icon: SiIcons.SiJavascript, color: "#F7DF1E" },
  { label: "TypeScript", icon: SiIcons.SiTypescript, color: "#3178C6" },
  { label: "Python", icon: SiIcons.SiPython, color: "#3776AB" },
  { label: "Rust", icon: SiIcons.SiRust, color: "#DEA584" },
  { label: "Go", icon: SiIcons.SiGo, color: "#00ADD8" },
  { label: "Java", icon: SiIcons.SiOpenjdk, color: "#007396" },
  { label: "Vue", icon: SiIcons.SiVuedotjs, color: "#4FC08D" },
  { label: "React", icon: SiIcons.SiReact, color: "#61DAFB" },
  { label: "Svelte", icon: SiIcons.SiSvelte, color: "#FF3E00" },
  { label: "Docker", icon: SiIcons.SiDocker, color: "#2496ED" },
  { label: "PostgreSQL", icon: SiIcons.SiPostgresql, color: "#336791" },
  { label: "Kotlin", icon: SiIcons.SiKotlin, color: "#7F52FF" },
  { label: "PHP", icon: SiIcons.SiPhp, color: "#777BB4" },
  { label: "C++", icon: SiIcons.SiCplusplus, color: "#00599C" },
  { label: "Ruby", icon: SiIcons.SiRuby, color: "#CC342D" },
  { label: "GraphQL", icon: SiIcons.SiGraphql, color: "#E10098" },
]

// ────────────────────────────────────────────────────────────────────────────
// Small utilities: reduced-motion awareness, scroll-reveal, count-up
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

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.15)
  const reduceMotion = usePrefersReducedMotion()
  const shown = reduceMotion || inView
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        shown ? "translate-y-0 opacity-100" : "translate-y-7 opacity-0",
        className
      )}
      style={{ transitionDelay: reduceMotion ? "0ms" : `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function Counter({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
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
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Signature element: a looping, typed "oshunt search" demo in the hero.
// Uses real repo/issue names so it doubles as an honest product preview.
// ────────────────────────────────────────────────────────────────────────────

const DEMO_COMMAND = "oshunt search --lang=python --difficulty=easy"
const DEMO_RESULTS = [
  { repo: "horizoneer/stellar-inspector", title: "feat: deep-link URL routing for transactions", tag: "good first issue" },
  { repo: "saurabhsingh72487-hub/multiplayer-game-python", title: "Feature Request: Add Sound Effects and Background Music", tag: "help wanted" },
  { repo: "griveradrift/claude-tetris", title: "Toggle Light Dark", tag: "good first issue" },
]
const CYCLE_PAUSE_MS = 3400

function HuntTerminal() {
  const reduceMotion = usePrefersReducedMotion()
  const [typed, setTyped] = useState(reduceMotion ? DEMO_COMMAND.length : 0)
  const [phase, setPhase] = useState<"typing" | "scanning" | "results">(reduceMotion ? "results" : "typing")
  const [visibleRows, setVisibleRows] = useState(reduceMotion ? DEMO_RESULTS.length : 0)

  useEffect(() => {
    if (reduceMotion) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const charDelay = 34

    function run() {
      setPhase("typing")
      setTyped(0)
      setVisibleRows(0)
      for (let i = 1; i <= DEMO_COMMAND.length; i++) {
        timers.push(setTimeout(() => setTyped(i), i * charDelay))
      }
      const typingDone = DEMO_COMMAND.length * charDelay
      timers.push(setTimeout(() => setPhase("scanning"), typingDone + 250))
      timers.push(setTimeout(() => setPhase("results"), typingDone + 950))
      DEMO_RESULTS.forEach((_, i) => {
        timers.push(setTimeout(() => setVisibleRows(i + 1), typingDone + 950 + i * 280))
      })
      const totalCycle = typingDone + 950 + DEMO_RESULTS.length * 280 + CYCLE_PAUSE_MS
      timers.push(setTimeout(run, totalCycle))
    }

    run()
    return () => timers.forEach(clearTimeout)
  }, [reduceMotion])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-[#0b0b0b] shadow-[0_30px_90px_-25px_rgba(0,0,0,0.85)]">
      <div className="flex items-center gap-1.5 border-b border-neutral-800/80 bg-[#101010] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
        <span className="ml-3 font-mono text-[11px] text-neutral-600">oshunt — zsh</span>
      </div>

      <div className="min-h-[230px] p-5 font-mono text-[12.5px] leading-relaxed sm:p-6 sm:text-[13.5px]">
        <div className="flex flex-wrap items-center gap-2 text-neutral-300">
          <span style={{ color: BRAND }}>➜</span>
          <span className="text-neutral-500">~/</span>
          <span className="break-all">{DEMO_COMMAND.slice(0, typed)}</span>
          {phase === "typing" && <span className="inline-block h-[14px] w-[6px] animate-pulse bg-neutral-400 align-middle" />}
        </div>

        {phase === "scanning" && (
          <p className="mt-3 text-neutral-600">Scanning 64 languages across active repos…</p>
        )}

        {phase === "results" && (
          <div className="mt-3 space-y-2">
            {DEMO_RESULTS.slice(0, visibleRows).map((r) => (
              <div
                key={r.repo}
                className="term-row flex flex-col gap-1.5 rounded-lg border border-neutral-900 bg-white/[0.025] px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{ background: BRAND, boxShadow: `0 0 6px ${BRAND}` }}
                  />
                  <span className="truncate text-neutral-300">{r.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-4 sm:pl-0">
                  <span className="truncate font-mono text-[10px] text-neutral-600">{r.repo}</span>
                  <span
                    className="shrink-0 rounded-full px-2 py-[2px] text-[9.5px] font-semibold"
                    style={{ background: `${BRAND}1f`, color: BRAND }}
                  >
                    {r.tag}
                  </span>
                </div>
              </div>
            ))}
            {visibleRows === DEMO_RESULTS.length && (
              <p className="pt-1 text-neutral-600">
                {DEMO_RESULTS.length} issues found · press <span style={{ color: BRAND }}>enter</span> to open the first
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Content
// ────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Pick your stack",
    body: "Search one language or several at once — Python, Rust, Vue, whatever you actually ship in. No more digging through repos that don't match your skills.",
  },
  {
    n: "02",
    title: "Filter what's worth your time",
    body: "Difficulty, bounties, and an exact activity signal — not a vague \"stale\" badge. You know precisely how long a repo's been quiet before you commit an evening to it.",
  },
  {
    n: "03",
    title: "Ship your first pull request",
    body: "Every issue comes with an AI-drafted proposal to edit and adapt, not a blank text box. Bookmark the rest, open the PR, move on to the next hunt.",
  },
]

const FEATURES = [
  {
    icon: LuSparkles,
    color: "#8b5cf6",
    title: "AI-drafted proposals",
    body: "A starting point for every issue, so you're editing an approach instead of staring at a blank comment box.",
  },
  {
    icon: LuCoins,
    color: "#f5b83d",
    title: "Bounty-aware search",
    body: "See which issues carry a bounty up front, before you decide where to spend the evening.",
  },
  {
    icon: LuActivity,
    color: BRAND,
    title: "Real activity signals",
    body: "Every repo shows exactly when it was last active — not a rounded-off \"6+ months\" guess.",
  },
  {
    icon: LuBookmark,
    color: "#38bdf8",
    title: "One-tap bookmarking",
    body: "Save issues you're circling back to, so nothing gets buried in fifty open tabs.",
  },
]

// Swap these for real numbers before shipping — wired up to animate on scroll already.
const STATS = [
  { to: 64, suffix: "", label: "languages & stacks indexed" },
  { to: 12000, suffix: "+", label: "issues surfaced so far" },
  { to: 480, suffix: "+", label: "repos actively tracked" },
  { to: 100, suffix: "%", label: "free, always" },
]

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function AboutPage() {
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

        .term-row {
          animation: rowIn 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: no-preference) {
          .marquee-track { animation: marquee 38s linear infinite; }
          .marquee-track-reverse { animation: marquee-reverse 34s linear infinite; }
          .marquee-row:hover .marquee-track,
          .marquee-row:hover .marquee-track-reverse { animation-play-state: paused; }
        }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes marquee-reverse { from { transform: translateX(-50%); } to { transform: translateX(0); } }

        @media (prefers-reduced-motion: reduce) {
          .glow-orb { animation: none; }
          .term-row { animation: none; }
        }
      `}</style>

      <Navbar />

      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-grid relative overflow-hidden border-b border-neutral-900 px-6 pb-20 pt-16 sm:pt-24">
        <div
          className="glow-orb pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-[0.14] blur-[110px]"
          style={{ background: BRAND }}
        />
        <div className="relative mx-auto max-w-5xl">
          <Reveal className="flex justify-center">
            <Badge className="rounded-full border-neutral-800 bg-neutral-900 px-3 py-1 font-mono-brand text-[11px] font-medium text-neutral-400">
              <span className="mr-1.5 inline-block h-[6px] w-[6px] rounded-full" style={{ background: BRAND, boxShadow: `0 0 6px ${BRAND}` }} />
              Open source, all the way down
            </Badge>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 text-center text-[40px] font-semibold leading-[1.08] tracking-tight text-neutral-50 sm:text-[56px] md:text-[64px]">
              Find the issue that
              <br />
              <span style={{ color: BRAND }}>gets you shipping.</span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-center text-[16px] leading-relaxed text-neutral-400 sm:text-[18px]">
              OSHunt indexes good-first-issues across 64 languages and frameworks, tells you which repos
              are actually alive, and drafts your first proposal — so contributing takes minutes, not a
              wasted weekend of searching.
            </p>
          </Reveal>

          <Reveal delay={240} className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              className="h-11 rounded-lg px-6 text-[14px] font-semibold text-black shadow-[0_0_0_1px_rgba(168,255,62,0.4)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]"
              style={{ background: BRAND }}
            >
              <Link href={HUNT_URL}>Start hunting issues</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 rounded-lg border-neutral-800 bg-transparent px-6 text-[14px] font-semibold text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]"
            >
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <SiIcons.SiGithub className="mr-2 h-4 w-4" />
                View the source
              </a>
            </Button>
          </Reveal>

          <Reveal delay={320} className="mx-auto mt-14 max-w-3xl">
            <HuntTerminal />
          </Reveal>
        </div>
      </section>

      {/* ─── Language marquee ─────────────────────────────────────────── */}
      <section className="border-b border-neutral-900 py-10">
        <Reveal>
          <p className="mb-6 text-center font-mono-brand text-[11px] uppercase tracking-[0.2em] text-neutral-600">
            Every stack you already ship in
          </p>
        </Reveal>
        <div className="marquee-row space-y-3 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="marquee-track flex w-max gap-3">
            {[...MARQUEE_STACK, ...MARQUEE_STACK].map((s, i) => (
              <StackChip key={`a-${i}`} {...s} />
            ))}
          </div>
          <div className="marquee-track-reverse flex w-max gap-3">
            {[...MARQUEE_STACK.slice().reverse(), ...MARQUEE_STACK.slice().reverse()].map((s, i) => (
              <StackChip key={`b-${i}`} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
        <Reveal className="mx-auto max-w-xl text-center">
          <p className="font-mono-brand text-[11px] uppercase tracking-[0.2em]" style={{ color: BRAND }}>How it works</p>
          <h2 className="mt-3 text-[30px] font-semibold tracking-tight text-neutral-50 sm:text-[36px]">
            Three steps, in order, every time
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div className="relative">
                <span className="font-mono-brand text-[42px] font-semibold text-neutral-800">{step.n}</span>
                <h3 className="mt-3 text-[18px] font-semibold text-neutral-100">{step.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-neutral-500">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Feature grid ─────────────────────────────────────────────── */}
      <section className="border-y border-neutral-900 bg-gradient-to-b from-neutral-950/60 to-transparent px-6 py-24 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mx-auto max-w-xl text-center">
            <p className="font-mono-brand text-[11px] uppercase tracking-[0.2em]" style={{ color: BRAND }}>Why OSHunt</p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-tight text-neutral-50 sm:text-[36px]">
              Built for the decision, not just the search
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <FeatureCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="text-center">
              <p className="font-mono-brand text-[30px] font-semibold sm:text-[36px]" style={{ color: BRAND }}>
                <Counter to={s.to} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[12.5px] leading-snug text-neutral-500">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─── Final CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <Reveal className="mx-auto max-w-4xl">
          <div className="bg-grid relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 px-8 py-16 text-center sm:px-16">
            <div
              className="glow-orb pointer-events-none absolute -bottom-24 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[100px]"
              style={{ background: BRAND }}
            />
            <div className="relative">
              <h2 className="text-[28px] font-semibold tracking-tight text-neutral-50 sm:text-[34px]">
                Your next pull request is already indexed.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-neutral-400">
                Pick a language, filter by what's actually alive, and open your first proposal today.
              </p>
              <Button
                asChild
                className="mt-8 h-11 rounded-lg px-7 text-[14px] font-semibold text-black shadow-[0_0_0_1px_rgba(168,255,62,0.4)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                style={{ background: BRAND }}
              >
                <Link href={HUNT_URL}>Start hunting — it's free</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Small presentational pieces
// ────────────────────────────────────────────────────────────────────────────

function StackChip({ label, icon: Icon, color }: { label: string; icon: IconType; color: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950 px-4 py-2">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} />
      <span className="whitespace-nowrap text-[13px] font-medium text-neutral-400">{label}</span>
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  color,
  title,
  body,
}: {
  icon: IconType
  color: string
  title: string
  body: string
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 transition-all duration-200 hover:-translate-y-0.5"
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${color}55`)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "")}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 15% 15%, ${color}14, transparent 65%)` }}
      />
      <div className="relative z-10">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${color}1a` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <h3 className="mt-4 text-[16px] font-semibold text-neutral-100">{title}</h3>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{body}</p>
      </div>
    </div>
  )
}