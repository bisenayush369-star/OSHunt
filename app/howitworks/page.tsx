"use client"

/**
 * How-it-works page — restyled only. Copy, steps and links are unchanged; look and motion come
 * from components/ui/marketing-kit.tsx.
 *
 * The five steps hang off a timeline rail that fills as you read. The step you're on stays
 * "locked on" (corner brackets on its mock screen), so the signature effect also works on touch.
 */

import Link from "next/link"
import type { CSSProperties } from "react"
import { LuBookmark, LuClock, LuSparkles } from "react-icons/lu"
import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { cn } from "@/components/lib/utils"
import {
  BTN_PRIMARY,
  Backdrop,
  Container,
  Counter,
  HeroPill,
  IconArrowRight,
  LockCard,
  LockFrame,
  PageShell,
  Reveal,
  SectionHead,
  TerminalWindow,
  useScrollProgress,
} from "@/components/ui/marketing-kit"

const HUNT_URL = "/hunt" // TODO: point at your real route

// ────────────────────────────────────────────────────────────────────────────
// Content — grounded in the real Hunt page: language picker, filters,
// activity signal, AI proposal, bookmarking.
// ────────────────────────────────────────────────────────────────────────────

const STATS = [
  { to: 5, prefix: "", suffix: "", label: "Steps, start to shipped" },
  { to: 2, prefix: "~", suffix: " min", label: "To your first proposal" },
  { to: 64, prefix: "", suffix: "", label: "Languages indexed" },
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

type StepKind = (typeof STEPS)[number]["visual"]

const VISUAL_TITLES: Record<StepKind, string> = {
  language: "hunt — language",
  filters: "hunt — filters",
  results: "hunt — results",
  proposal: "hunt — proposal",
  ship: "hunt — saved",
}

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
  const timeline = useScrollProgress<HTMLDivElement>()

  return (
    <PageShell>
      <Navbar />

      <main>
        {/* ─── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-[#1f1f1f] pb-14 pt-16 sm:pb-20 sm:pt-24">
          <Backdrop />
          <Container size="md" className="relative">
            <div className="flex flex-col items-center text-center">
              <Reveal intro>
                <HeroPill>Up and hunting in minutes</HeroPill>
              </Reveal>

              <Reveal intro delay={80}>
                <h1 className="os-display mx-auto mt-6 max-w-4xl">
                  From search to shipped pull request, <span className="os-lime">in five steps</span>
                </h1>
              </Reveal>

              <Reveal intro delay={160}>
                <p className="os-lead mx-auto mt-5 max-w-lg">
                  No account required to browse, no setup calls. Here&apos;s the exact flow, screen by screen.
                </p>
              </Reveal>
            </div>
          </Container>
        </section>

        {/* ─── Stats strip ──────────────────────────────────────────────── */}
        <section className="border-b border-[#1f1f1f] py-10 sm:py-14">
          <Container size="sm">
            <Reveal>
              <dl className="grid grid-cols-3 divide-x divide-[#1f1f1f] overflow-hidden rounded-[20px] border border-[#1f1f1f] bg-[#161616]">
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col-reverse items-center gap-2 px-2 py-6 text-center sm:px-4 sm:py-8">
                    <dt className="text-[12px] leading-snug text-[#949494] sm:text-[13px]">{s.label}</dt>
                    <dd className="os-mono text-[24px] font-semibold leading-none tracking-tight text-white sm:text-[36px]">
                      <span className="os-lime">{s.prefix}</span>
                      <Counter to={s.to} />
                      <span className="os-lime text-[0.55em]">{s.suffix}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </Container>
        </section>

        {/* ─── Steps — timeline rail, mock screen next to each step, alternating sides ─── */}
        <section className="py-20 sm:py-28 lg:py-32">
          <Container size="md">
            <div ref={timeline} className="relative">
              <div
                aria-hidden="true"
                className="os-rail-track absolute bottom-3 left-[15px] top-3 w-[2px] -translate-x-1/2 md:left-1/2"
              >
                <div className="os-rail-fill" />
              </div>

              <ol className="space-y-16 md:space-y-24">
                {STEPS.map((step, i) => (
                  <li key={step.n} data-step className="relative pl-12 md:pl-0">
                    <span
                      aria-hidden="true"
                      className="os-dot absolute left-[15px] top-[7px] h-3 w-3 -translate-x-1/2 rounded-full md:left-1/2"
                    />
                    <Reveal>
                      <div className="grid items-start gap-6 md:grid-cols-2 md:gap-x-24">
                        <div className={cn(i % 2 === 1 && "md:order-2")}>
                          <span className="os-mono text-[13px] font-semibold tracking-wide text-[#a8ff3e]">
                            Step {step.n}
                          </span>
                          <h3 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[28px]">
                            {step.title}
                          </h3>
                          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#a1a1a1]">{step.body}</p>
                          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#2c2c2c] bg-[#1f1f1f] px-3 py-1 text-[12px] text-[#a1a1a1]">
                            <LuClock className="h-3 w-3" aria-hidden="true" />
                            {step.time}
                          </p>
                        </div>
                        <div className={cn(i % 2 === 1 && "md:order-1")}>
                          <StepVisual kind={step.visual} />
                        </div>
                      </div>
                    </Reveal>
                  </li>
                ))}
              </ol>
            </div>
          </Container>
        </section>

        {/* ─── Quick-start timeline ─────────────────────────────────────── */}
        <section className="border-y border-[#1f1f1f] bg-gradient-to-b from-white/[0.015] to-transparent py-20 sm:py-28">
          <Container size="sm">
            <SectionHead eyebrow="Your first hunt" title="Minute by minute" />

            <ol className="mt-12 divide-y divide-[#1f1f1f] overflow-hidden rounded-[20px] border border-[#262626] bg-[#161616] sm:mt-14">
              {QUICK_START.map((item, i) => (
                <li key={item.time}>
                  <Reveal delay={i * 70}>
                    <div className="flex gap-4 px-5 py-5 sm:gap-6 sm:px-7">
                      <span className="os-mono w-11 shrink-0 pt-0.5 text-[13px] font-semibold text-[#a8ff3e]">
                        {item.time}
                      </span>
                      <div>
                        <p className="text-[15.5px] font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-[14px] leading-relaxed text-[#949494]">{item.body}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>

            <Reveal delay={QUICK_START.length * 70 + 80} className="mt-10 text-center">
              <p className="text-[14.5px] text-[#a1a1a1]">You&apos;re set up — in about two minutes.</p>
              <Link
                href={HUNT_URL}
                className="group mt-2 inline-flex items-center gap-1.5 rounded-sm text-[14.5px] font-semibold text-[#a8ff3e] transition-colors hover:text-[#bdff6b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
              >
                See it in action
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </Container>
        </section>

        {/* ─── Final CTA ────────────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <Reveal className="mx-auto max-w-4xl">
            <LockCard
              locked
              flat
              className="px-6 py-14 text-center sm:px-16 sm:py-20"
              style={{ "--os-r": "24px" } as CSSProperties}
            >
              <Backdrop className="rounded-[inherit]" />
              <div className="relative">
                <h2 className="os-h2">That&apos;s the whole flow.</h2>
                <p className="os-lead mx-auto mt-4 max-w-sm">
                  No account needed to browse — see what&apos;s waiting for you right now.
                </p>
                <Button asChild className={cn(BTN_PRIMARY, "mt-8 w-full sm:w-auto")}>
                  <Link href={HUNT_URL}>
                    Start hunting issues
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </LockCard>
          </Reveal>
        </section>
      </main>
    </PageShell>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Per-step mock screens — same visual language as the real Hunt UI
// ────────────────────────────────────────────────────────────────────────────

function StepVisual({ kind }: { kind: StepKind }) {
  return (
    // decorative: the step text next to it already says all of this
    <div aria-hidden="true">
      <LockFrame radius={16}>
        <TerminalWindow title={VISUAL_TITLES[kind]}>
          <div className="min-h-[188px] p-5 sm:p-6">
            {kind === "language" && <LanguageVisual />}
            {kind === "filters" && <FiltersVisual />}
            {kind === "results" && <ResultsVisual />}
            {kind === "proposal" && <ProposalVisual />}
            {kind === "ship" && <ShipVisual />}
          </div>
        </TerminalWindow>
      </LockFrame>
    </div>
  )
}

const SEGMENT_WRAP = "grid gap-1 rounded-[10px] border border-[#262626] bg-[#111111] p-1"
const SEGMENT_ON = "bg-[#a8ff3e]/[0.08] text-[#a8ff3e]"

function LanguageVisual() {
  return (
    <div className="space-y-3">
      <div className={cn(SEGMENT_WRAP, "grid-cols-2")}>
        <div className="rounded-md py-2 text-center text-[12px] font-semibold text-[#808080]">Single</div>
        <div className={cn("rounded-md py-2 text-center text-[12px] font-semibold", SEGMENT_ON)}>Multi</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Python", "Rust", "Vue"].map((l) => (
          <span
            key={l}
            className="rounded-md border border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.08] px-2.5 py-1.5 text-[12px] font-medium text-[#a8ff3e]"
          >
            {l}
          </span>
        ))}
        <span className="rounded-md border border-dashed border-[#3a3a3a] px-2.5 py-1.5 text-[12px] font-medium text-[#808080]">
          + Add more
        </span>
      </div>
    </div>
  )
}

function FiltersVisual() {
  return (
    <div className="space-y-3">
      <div className={cn(SEGMENT_WRAP, "grid-cols-3")}>
        {["Easy", "Medium", "Hard"].map((d, i) => (
          <div
            key={d}
            className={cn("rounded-md py-2 text-center text-[11.5px] font-semibold", i === 0 ? SEGMENT_ON : "text-[#808080]")}
          >
            {d}
          </div>
        ))}
      </div>
      {["Bounty only", "Active repos only"].map((label, i) => (
        <div
          key={label}
          className="flex items-center justify-between rounded-lg border border-[#262626] bg-[#111111] px-3 py-2.5"
        >
          <span className="text-[12.5px] text-[#a1a1a1]">{label}</span>
          <span
            className={cn("block h-5 w-9 shrink-0 rounded-full p-0.5", i === 0 ? "bg-[#a8ff3e]/30" : "bg-[#262626]")}
          >
            <span
              className={cn(
                "block h-4 w-4 rounded-full",
                i === 0 ? "translate-x-4 bg-[#a8ff3e]" : "translate-x-0 bg-[#6b6b6b]"
              )}
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
        <div key={r.title} className="rounded-lg border border-[#1f1f1f] bg-white/[0.025] px-3 py-2.5">
          <p className="truncate text-[12.5px] font-medium text-[#d4d4d4]">{r.title}</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="rounded-full border border-[#2c2c2c] bg-[#1f1f1f] px-1.5 py-px text-[10px] text-[#a1a1a1]">
              {r.lang}
            </span>
            {r.active ? (
              <span className="os-mono flex items-center gap-1 text-[10px] text-[#a8ff3e]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#a8ff3e] shadow-[0_0_6px_#a8ff3e]" />
                active
              </span>
            ) : (
              <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-1.5 py-px text-[10px] font-semibold text-rose-400">
                dead 8mo
              </span>
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
      <p className="text-[12.5px] font-medium text-[#d4d4d4]">Add dark mode toggle to settings</p>
      <div className="rounded-lg border border-[#262626] bg-[#111111] p-3.5">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#a8ff3e]">
          <LuSparkles className="h-3 w-3" /> AI-drafted proposal
        </div>
        <p className="os-mono text-[11.5px] leading-relaxed text-[#8a8a8a]">
          I&apos;ll add a ThemeToggle component using the existing context provider, persist the choice, and wire it
          into the settings panel
          <span className="os-caret ml-0.5" style={{ background: "#6b6b6b" }} />
        </p>
      </div>
    </div>
  )
}

function ShipVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#1f1f1f] bg-white/[0.025] px-3 py-2.5">
        <p className="min-w-0 truncate text-[12.5px] text-[#d4d4d4]">Add dark mode toggle to settings</p>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.08] text-[#a8ff3e]">
          <LuBookmark className="h-3 w-3" fill="currentColor" />
        </span>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.05] px-3 py-2.5">
        <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#a8ff3e] shadow-[0_0_6px_#a8ff3e]" />
        <span className="text-[12px] font-medium text-[#a8ff3e]">Pull request opened</span>
      </div>
    </div>
  )
}