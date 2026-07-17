"use client"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Lenis from "lenis"

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

type Level = "Explorer" | "Architect" | "Veteran"

interface LevelOption {
  id: Level
  description: string
  locked?: boolean       // shows an "Upgrade" pill and blocks selection
  unavailable?: boolean  // shows a "Currently unavailable" pill and blocks selection
}

interface AnalysisResult {
  purpose: string
  techStack: string[]
  startFiles: { path: string; why: string }[]
  howToRun: string
  howToContribute: string
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
const ScanIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3L19 8V16L12 21L5 16V8L12 3Z"></path><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"></circle></svg>
const GitHubIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"></path></svg>
const ExternalIcon = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"></path></svg>
const ArrowRightIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>

// NEW ICONS FOR CHAT UI
const BotIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
const SendIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
const StopIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"></rect></svg>

// ICONS FOR RESULT CARDS
const BookIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
const LayersIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
const MapIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
const TerminalIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
const GitBranchIcon = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>

// ─── Constants ───────────────────────────────────────────────────────────────
const EXAMPLE_REPO_POOL = [
  "vercel/next.js",
  "expressjs/express",
  "prisma/prisma",
  "vitejs/vite",
  "facebook/react",
  "vuejs/vue",
  "tailwindlabs/tailwindcss",
  "supabase/supabase",
  "trpc/trpc",
  "nestjs/nest",
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const HOW_IT_WORKS = [
  { n: "1", title: "Paste any public GitHub URL", desc: "Drop in the link to any public repo — libraries, frameworks, side projects." },
  { n: "2", title: "AI reads the entire codebase", desc: "We fetch the file tree, README, key source files, and dependency manifests." },
  { n: "3", title: "Get a plain-English breakdown", desc: "Architecture, tech stack, entry points, and exactly where to start contributing." },
  { n: "4", title: "Ask follow-up questions", desc: "Our contextual chat knows the whole repo. No copy-pasting needed." },
]

const POPULAR_REPOS = [
  { repo: "vercel/next.js", desc: "The React framework for production", lang: "TypeScript" },
  { repo: "expressjs/express", desc: "Fast, minimalist web framework for Node.js", lang: "JavaScript" },
  { repo: "prisma/prisma", desc: "Next-generation ORM for Node.js & TypeScript", lang: "TypeScript" },
  { repo: "vitejs/vite", desc: "Next generation frontend tooling", lang: "TypeScript" },
  { repo: "facebook/react", desc: "A JavaScript library for building user interfaces", lang: "JavaScript" },
  { repo: "vuejs/vue", desc: "The progressive JavaScript framework", lang: "JavaScript" },
  { repo: "supabase/supabase", desc: "The open source Firebase alternative", lang: "TypeScript" },
  { repo: "trpc/trpc", desc: "End-to-end typesafe APIs made easy", lang: "TypeScript" },
]

// One-sentence explanation shown under each option, same pattern as the reference dropdown image
const LEVEL_OPTIONS: LevelOption[] = [
  { id: "Explorer", description: "Plain-English basics, no jargon" },
  { id: "Architect", description: "Balanced depth for hands-on contributors" },
  { id: "Veteran", description: "Deep dives into architecture & trade-offs" },
]

// Rotates while the agent is working, so the wait teaches or nudges instead of sitting dead.
const LOADING_TIPS = [
  "Reading the file tree…",
  "Mapping the tech stack…",
  "Tip: a CONTRIBUTING.md file, if the repo has one, is always worth reading first.",
  "Cross-checking claims against the actual files, not general knowledge…",
  "GitLense reads real source files, not just the README.",
  "Explorer, Architect, and Veteran modes tailor every answer to your experience.",
  "Tip: filter GitHub issues by \"good first issue\" before picking a task.",
  "Finding the files most worth opening first…",
  "Tip: a repo's `.github/workflows` folder shows you how CI actually runs.",
  "Skimming the dependency manifest for the real tech stack…",
  "Tip: a test folder often explains a project's architecture faster than its docs do.",
  "Looking for the entry point a request or command actually starts from…",
  "Most repos hide their best docs in `/docs`, not the README.",
  "Separating what the code does from what the README claims…",
  "Tip: Veteran mode skips setup steps — jump there if you already have the repo running.",
  "Checking whether this is a monorepo or a single-package layout…",
  "Weighing which files are worth your first ten minutes…",
  "Tip: skim recent commits to see what's actively being worked on right now.",
  "Once this lands, Hunt Issues will show real open tasks matched to this exact stack.",
  "Your dashboard keeps a running history of every repo you've sent through GitLense.",
  "Pro carries Veteran-level depth across every repo, not just the free ones.",
  "The Bounty board pays real money for issues a lot like the ones in this repo.",
]

// Renders `backtick` spans as styled code without pulling in a full markdown parser —
// keeps the structured result cards immune to the tables/ASCII-art risk entirely.
function withInlineCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1
      ? <code key={i} className="inline-code">{part.slice(1, -1)}</code>
      : <span key={i}>{part}</span>
  )
}

// Prints result text progressively, same spirit as the chat's revealMessage,
// so the initial analysis reads like an answer arriving rather than a card
// popping into existence. Runs the same backtick parser on the growing slice.
function Reveal({ text }: { text: string }) {
  const [shown, setShown] = useState("")

  useEffect(() => {
    const resetId = setTimeout(() => setShown(""), 0)
    if (!text) return () => clearTimeout(resetId)

    let i = 0
    const id = setInterval(() => {
      i += 3
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 12)
    return () => {
      clearTimeout(resetId)
      clearInterval(id)
    }
  }, [text])

  const done = shown.length >= text.length
  return (
    <span aria-live="polite" aria-atomic="false" aria-busy={!done}>
      {withInlineCode(shown)}
      {!done && (
        <span className="ml-0.5 inline-block h-[1em] w-[2px] align-text-bottom bg-[#a8ff3e] animate-pulse motion-reduce:animate-none" />
      )}
    </span>
  )
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ w, h }: { w: string | number; h: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-md bg-[#111] motion-reduce:after:hidden after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent"
      style={{ width: w, height: h }}
    />
  )
}

// ─── Scroll effects ──────────────────────────────────────────────────────────
// Fires once when the element first enters the viewport, then stops watching —
// entrances should happen once, not replay every time you scroll past something.
// Respects prefers-reduced-motion by resolving as "already in view" immediately,
// so reduced-motion users see final-state content with no animation at all.
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function useInView<T extends HTMLElement>(rootMargin = "0px 0px -80px 0px") {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView] as const
}

// Fades + slides an element up into place the first time it's scrolled into
// view. `delay` (ms) lets a list of siblings stagger instead of popping in
// together — pass index * 70 or so from the caller.
function FadeInView({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </div>
  )
}

// Counts up from 0 to `value` the first time it scrolls into view. Used only
// on numbers that are already real (step numbers, file-order badges) — never
// on invented stats, since those would be fabricated marketing claims.
function CountUp({ value, duration = 1100, className = "" }: { value: number; duration?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px")
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setDisplay(Math.round(eased * value))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return <span ref={ref}>{display}</span>
}

// ─── Level Selector ─────────────────────────────────────────────────────────
// Used in both the input card and the chat header so the two stay visually
// and behaviorally identical — same list, same styling, same click handling.
// Built on shadcn/ui's DropdownMenu (Radix) so it auto-repositions to stay
// inside the viewport on small screens instead of clipping off-edge.
function LevelSelector({ value, onChange }: { value: Level; onChange: (level: Level) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg border-[#1a1a1a] bg-[#050505] px-3 text-xs font-medium text-[#a8ff3e] hover:bg-[#131313] hover:text-[#a8ff3e]"
        >
          {value} Agent
          <span className="text-[9px] opacity-70">▼</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="w-[min(300px,calc(100vw-2rem))] border-[#1a1a1a] bg-[#0a0a0a]/95 p-1.5 backdrop-blur-md"
      >
        {LEVEL_OPTIONS.map(opt => {
          const selected = opt.id === value
          const disabled = Boolean(opt.locked || opt.unavailable)
          return (
            <DropdownMenuItem
              key={opt.id}
              disabled={disabled}
              onSelect={() => { if (!disabled) onChange(opt.id) }}
              className={[
                "flex items-start justify-between gap-3 rounded-md px-3 py-2.5 focus:bg-[#151515]",
                selected ? "bg-[#a8ff3e]/[0.08]" : "",
                opt.unavailable ? "opacity-45" : "",
              ].join(" ")}
            >
              <span>
                <span className={`block text-[13px] font-semibold ${selected ? "text-[#a8ff3e]" : "text-white"}`}>{opt.id}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-[#888]">{opt.description}</span>
              </span>
              {opt.locked && (
                <span className="shrink-0 rounded-md border border-[#a8ff3e]/30 px-2 py-0.5 text-[10px] font-bold text-[#a8ff3e]">Upgrade</span>
              )}
              {opt.unavailable && (
                <span className="shrink-0 whitespace-nowrap text-[10px] text-[#666]">Currently unavailable</span>
              )}
              {selected && !disabled && (
                <span className="flex shrink-0 text-[#a8ff3e]"><CheckIcon /></span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Analyze() {
  const [level, setLevel] = useState<Level>("Architect")
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [rawResult, setRawResult] = useState("")
  const [error, setError] = useState("")
  const [suggestedRepos, setSuggestedRepos] = useState<string[]>(EXAMPLE_REPO_POOL.slice(0, 3))
  const [popularRepos, setPopularRepos] = useState(POPULAR_REPOS.slice(0, 4))

  useEffect(() => {
    setSuggestedRepos(shuffle(EXAMPLE_REPO_POOL).slice(0, 3))
    setPopularRepos(shuffle(POPULAR_REPOS).slice(0, 4))
  }, [])

  // Smooth "gliding" scroll (Lenis) — skipped entirely for prefers-reduced-motion,
  // since inertia scrolling is genuinely uncomfortable for people with vestibular
  // sensitivity, not just a style preference to override.
  useEffect(() => {
    if (prefersReducedMotion()) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [awaitingReply, setAwaitingReply] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatAbortRef = useRef<AbortController | null>(null)
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const revealSkipRef = useRef(false)
  const [currentTip, setCurrentTip] = useState("")
  const tipQueueRef = useRef<string[]>([])

  const repoName = url.replace("https://github.com/", "").split("/").slice(0, 2).join("/")
  const getContextualQuestions = () => {
    const name = repoName.split("/")[1] || "this project";
    return [
      `What is the main architecture pattern used in ${name}?`,
      `Where is the best place for a beginner to start contributing to ${name}?`,
      `What are the core dependencies powering ${name}?`
    ];
  };
  useEffect(() => {
    const el = chatScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chatMessages, chatLoading])

  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearInterval(revealTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!loading && !awaitingReply) return

    const pool = [...LOADING_TIPS]
    if (repoName) {
      pool.push(
        `Reading through ${repoName}'s file tree…`,
        `Mapping out what ${repoName} actually depends on…`
      )
    }
    // Fisher-Yates — a fresh shuffle each time, so the sequence isn't the same every run.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    tipQueueRef.current = pool

    let pos = 0
    const initialTipId = setTimeout(() => setCurrentTip(pool[0]), 0)
    const id = setInterval(() => {
      pos += 1
      if (pos >= tipQueueRef.current.length) {
        // Exhausted the shuffled set on a long wait — reshuffle rather than repeat the same order.
        const prevLast = tipQueueRef.current[tipQueueRef.current.length - 1]
        const reshuffled = [...tipQueueRef.current]
        for (let i = reshuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[reshuffled[i], reshuffled[j]] = [reshuffled[j], reshuffled[i]]
        }
        // Avoid showing the same tip twice in a row right at the reshuffle boundary
        if (reshuffled.length > 1 && reshuffled[0] === prevLast) {
          [reshuffled[0], reshuffled[1]] = [reshuffled[1], reshuffled[0]]
        }
        tipQueueRef.current = reshuffled
        pos = 0
      }
      setCurrentTip(tipQueueRef.current[pos])
    }, 2800)
    return () => {
      clearInterval(id)
      clearTimeout(initialTipId)
    }
  }, [loading, awaitingReply, repoName])

  const analyze = async () => {
    if (!url) return
    setLoading(true)
    setError("")
    setResult(null)
    setRawResult("")
    setChatMessages([])

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url, expertiseLevel: level }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to analyze repository")
      }

      const data = await response.json()

      if (data && typeof data.result === "object" && data.result !== null) {
        setResult(data.result)
      } else if (typeof data?.raw === "string") {
        setRawResult(data.raw)
      } else if (typeof data === "string") {
        setRawResult(data)
      } else if (typeof data?.explanation === "string") {
        setRawResult(data.explanation)
      } else {
        throw new Error("Unexpected response shape from /api/analyze — check what the route actually returns.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  // Flattens the structured result back into readable text, so the chat route
  // still gets the same kind of grounding context it always has.
  const serializeAnalysisForChat = () => {
    if (rawResult) return rawResult
    if (!result) return ""
    return [
      `Purpose: ${result.purpose}`,
      `Tech stack: ${result.techStack.join(", ")}`,
      `Start here: ${result.startFiles.map(f => `${f.path} — ${f.why}`).join("; ")}`,
      `How to run: ${result.howToRun}`,
      `How to contribute: ${result.howToContribute}`,
    ].join("\n\n")
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  const revealMessage = (baseHistory: ChatMessage[], fullText: string) => {
    return new Promise<void>((resolve) => {
      const words = fullText.split(" ")
      let i = 0
      setChatMessages([...baseHistory, { role: "assistant", content: "" }])

      revealTimerRef.current = setInterval(() => {
        i += revealSkipRef.current ? words.length : 3
        const next = words.slice(0, i).join(" ")

        setChatMessages(prev => {
          const copy = [...prev]
          copy[baseHistory.length] = { role: "assistant", content: next }
          return copy
        })

        if (i >= words.length) {
          if (revealTimerRef.current) clearInterval(revealTimerRef.current)
          revealTimerRef.current = null
          resolve()
        }
      }, 35)
    })
  }

  const sendChat = async (message: string) => {
    if (!message.trim() || chatLoading) return

    const newHistory = [...chatMessages, { role: "user" as const, content: message }]
    setChatMessages(newHistory)
    setChatInput("")
    setChatLoading(true)
    setAwaitingReply(true)
    revealSkipRef.current = false

    const controller = new AbortController()
    chatAbortRef.current = controller

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: url,
          analysis: serializeAnalysisForChat(),
          messages: newHistory,
          expertiseLevel: level
        }),
        signal: controller.signal,
      })

      if (response.status === 404) {
        throw new Error("ERR 404: Route missing. Ensure app/api/chat/route.ts is created.")
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Upstream fault.`)
      }

      const data = await response.json()

      // Don't assume the field is called "reply" — check the shapes a route.ts
      // commonly returns so a naming mismatch shows a clear error instead of
      // silently rendering a blank agent bubble.
      const reply: string | null =
        typeof data === "string" ? data :
        typeof data?.reply === "string" ? data.reply :
        typeof data?.response === "string" ? data.response :
        typeof data?.message === "string" ? data.message :
        typeof data?.answer === "string" ? data.answer :
        typeof data?.explanation === "string" ? data.explanation :
        null

      if (!reply) {
        throw new Error("The agent replied with an empty or unrecognized payload — check what /api/chat actually returns.")
      }

      setAwaitingReply(false)
      await revealMessage(newHistory, reply)
    } catch (err: unknown) {
      const errName = (err as { name?: string })?.name
      if (errName === "AbortError") {
        // User hit stop while we were still waiting on the network — leave
        // their message as-is, no error bubble, no fake reply.
      } else {
        const message = err instanceof Error ? err.message : String(err)
        setChatMessages([
          ...newHistory,
          { role: "assistant", content: message },
        ])
      }
    } finally {
      setChatLoading(false)
      setAwaitingReply(false)
      chatAbortRef.current = null
    }
  }

  const stopChat = () => {
    if (revealTimerRef.current) {
      // Text has already arrived and is mid-reveal — skip straight to the end
      // instead of aborting a request that's already finished.
      revealSkipRef.current = true
    } else {
      chatAbortRef.current?.abort()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#090909] text-[#e0e0e0] font-['Outfit',_'Inter',_sans-serif] antialiased selection:bg-[#a8ff3e]/20 selection:text-[#a8ff3e]">
      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        @keyframes fade-up { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        .inline-code { color: #a8ff3e; background: rgba(168,255,62,0.06); border: 1px solid rgba(168,255,62,0.18); padding: 2px 7px; border-radius: 5px; font-family: monospace; font-size: 0.9em; }

        .prose-dark { color: #ccc; line-height: 1.75; font-size: 15px; overflow-wrap: break-word; word-break: break-word; max-width: 66ch; text-wrap: pretty; }
        .prose-dark h1,.prose-dark h2,.prose-dark h3 { color: #fff; font-weight: 600; margin: 1.5rem 0 0.5rem; letter-spacing: -0.3px; }
        .prose-dark h1 { font-size: 17px; }
        .prose-dark h2 { font-size: 15px; }
        .prose-dark h3 { font-size: 13px; color: #a8ff3e; text-transform: uppercase; letter-spacing: 0.8px; }
        .prose-dark p { margin-bottom: 0.75rem; }
        .prose-dark code { background: #111; color: #a8ff3e; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; border: 1px solid #1a1a1a; }
        .prose-dark pre { background: #0a0a0a; border: 1px solid #141414; border-radius: 10px; padding: 1rem; overflow-x: auto; margin: 1rem 0; max-width: 100%; }
        .prose-dark pre code { background: none; padding: 0; color: #ddd; border: none; }
        .prose-dark ul,.prose-dark ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .prose-dark li { margin-bottom: 0.35rem; }
        .prose-dark strong { color: #fff; font-weight: 600; }
        .prose-dark a { color: #a8ff3e; text-decoration: none; }
        .prose-dark a:hover { text-decoration: underline; }
        .prose-dark table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 1rem 0; font-size: 12.5px; white-space: nowrap; }
        .prose-dark th, .prose-dark td { border: 1px solid #1a1a1a; padding: 6px 10px; text-align: left; }
        .prose-dark th { background: #111; color: #fff; font-weight: 600; }
      `}</style>

      <Navbar />

      {/* Ambient background glow — fixed so it doesn't add scroll height on any device */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[90vw] max-w-[820px] -translate-x-1/2 rounded-full bg-[#a8ff3e]/[0.05] blur-[110px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[840px] px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-20">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="relative mb-9 sm:mb-12">
          <div className="pointer-events-none absolute -left-8 -top-10 h-52 w-72 rounded-full bg-[#a8ff3e]/[0.08] blur-[60px] sm:h-64 sm:w-96" />

          <div className="relative z-10">
            <div
              style={{ animationDelay: "0ms" }}
              className="mb-4 flex animate-[fade-up_0.6s_ease_both] items-center gap-2 motion-reduce:animate-none"
            >
              <span className="text-[#a8ff3e]"><ScanIcon /></span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a8ff3e]">GitLense</span>
            </div>

            <h1
              style={{ animationDelay: "90ms" }}
              className="text-balance animate-[fade-up_0.6s_ease_both] text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white motion-reduce:animate-none sm:text-[38px] lg:text-[44px]"
            >
              Understand any repo<br />
              <span className="bg-gradient-to-r from-[#a8ff3e] to-[#7fe62c] bg-clip-text text-transparent">before you touch it.</span>
            </h1>
            <p
              style={{ animationDelay: "180ms" }}
              className="mt-3.5 max-w-[500px] animate-[fade-up_0.6s_ease_both] text-[15px] font-light leading-relaxed text-[#8a8a8a] motion-reduce:animate-none sm:mt-4"
            >
              Paste a GitHub URL. AI reads the codebase and gives you a plain-English breakdown — architecture, stack, how to contribute.
            </p>
          </div>
        </div>

        {/* ── Input card ───────────────────────────────────────────────────── */}
        <Card className="mb-7 gap-0 rounded-2xl border-[#141414] bg-[#0a0a0a] py-0 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset] sm:mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#555]">Explain it like I&apos;m a(n)</span>
              <LevelSelector value={level} onChange={setLevel} />
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-[#141414] bg-black p-2 transition-colors focus-within:border-[#a8ff3e]/40 focus-within:ring-4 focus-within:ring-[#a8ff3e]/[0.06] sm:flex-row sm:items-center sm:p-1.5 sm:pl-4">
              <div className="flex flex-1 items-center gap-2.5 px-1.5 sm:px-0">
                <span className="flex shrink-0 text-[#a8ff3e]"><SearchIcon /></span>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && analyze()}
                  placeholder="https://github.com/user/repo"
                  className="h-9 flex-1 border-0 bg-transparent p-0 font-mono text-[13px] text-white shadow-none placeholder:text-[#4d4d4d] focus-visible:ring-0"
                />
              </div>
              <Button
                onClick={analyze}
                disabled={loading || !url}
                className="group h-10 w-full shrink-0 gap-2 rounded-lg bg-[#a8ff3e] px-5 text-[13px] font-bold text-black transition-all hover:-translate-y-px hover:bg-[#bdff6b] active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                    Analyzing
                  </>
                ) : (
                  <>
                    Analyze
                    <span className="flex transition-transform group-hover:translate-x-0.5"><ArrowRightIcon /></span>
                  </>
                )}
              </Button>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] text-[#555]">try:</span>
              {suggestedRepos.map(r => (
                <button
                  key={r}
                  onClick={() => setUrl(`https://github.com/${r}`)}
                  className="rounded-md border border-[#1a1a1a] px-2.5 py-1 font-mono text-[11px] text-[#888] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e]"
                >{r}</button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.06] px-5 py-4 text-[13px] text-[#ff4d6d]"
          >{error}</div>
        )}

        {/* ── Loading skeletons ─────────────────────────────────────────────── */}
        {loading && (
          <div className="flex flex-col gap-2.5">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-[#a8ff3e] animate-pulse motion-reduce:animate-none" />
              <span className="text-[12.5px] italic text-[#777]">{currentTip}</span>
            </div>
            <Card className="rounded-2xl border-[#141414] bg-[#0a0a0a] py-0">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-4.5 flex flex-wrap gap-5">
                  {[130, 90, 110].map((w, i) => (
                    <div key={i}>
                      <Skeleton w={60} h={9} />
                      <div className="mt-1.5"><Skeleton w={w} h={14} /></div>
                    </div>
                  ))}
                </div>
                <Skeleton w={80} h={9} />
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <Skeleton w="100%" h={13} />
                  <Skeleton w="88%" h={13} />
                  <Skeleton w="74%" h={13} />
                  <Skeleton w="92%" h={13} />
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="rounded-xl border-[#141414] bg-[#0a0a0a] py-0">
                  <CardContent className="p-3.5">
                    <Skeleton w={60} h={9} />
                    <div className="mt-2"><Skeleton w="70%" h={13} /></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Result ───────────────────────────────────────────────────────── */}
        {(result || rawResult) && !loading && (
          <div className="animate-[fade-up_0.4s_ease_forwards] motion-reduce:animate-none">

            {/* Repo title row */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="shrink-0 text-[#a8ff3e]"><GitHubIcon /></span>
                <span className="truncate font-mono text-[14px] font-bold text-[#a8ff3e]">{repoName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-md border-[#a8ff3e]/15 bg-[#a8ff3e]/[0.06] px-2.5 py-1 text-[11px] font-normal text-[#a8ff3e]"
                >
                  <span className="h-[5px] w-[5px] rounded-full bg-[#a8ff3e] animate-pulse motion-reduce:animate-none" />
                  Initial Scan
                </Badge>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-md border border-[#1a1a1a] px-2.5 py-1 text-[12px] text-[#888] transition-colors hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e]"
                >
                  GitHub <ExternalIcon />
                </a>
              </div>
            </div>

            {result ? (
              <div className="mb-3 flex flex-col">

                {/* What It Solves + Core Tech Stack */}
                <FadeInView className="grid grid-cols-1 gap-y-6 pb-6 pt-1 sm:grid-cols-2 sm:gap-x-10">
                  <div>
                    <ResultLabel icon={<BookIcon />}>What It Solves</ResultLabel>
                    <p className="max-w-[64ch] text-[15px] leading-[1.7] text-[#ccc]"><Reveal text={result.purpose} /></p>
                  </div>
                  <div>
                    <ResultLabel icon={<LayersIcon />}>Core Tech Stack</ResultLabel>
                    {result.techStack.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {result.techStack.map((tech, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-[#1a1a1a] bg-black px-3.5 py-2 text-[13px] text-[#e0e0e0] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/25"
                          >{tech}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[15px] text-[#ccc]">Not identified yet.</p>
                    )}
                  </div>
                </FadeInView>

                {/* Start Here — signature card, the product's actual value prop */}
                <FadeInView className="rounded-xl border border-[#a8ff3e]/[0.14] bg-gradient-to-b from-[#a8ff3e]/[0.04] to-transparent px-5 py-6 sm:px-6">
                  <ResultLabel icon={<MapIcon />}>Start Here</ResultLabel>
                  {result.startFiles.length > 0 ? (
                    <div className="flex flex-col gap-3.5">
                      {result.startFiles.map((f, i) => (
                        <div key={i} className="group flex items-start gap-3 rounded-lg p-1.5 -m-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a8ff3e]/[0.03]">
                          <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-[#a8ff3e]/[0.12] font-mono text-[11px] font-bold text-[#a8ff3e] transition-colors group-hover:bg-[#a8ff3e]/20">
                            <CountUp value={i + 1} duration={600} />
                          </span>
                          <div className="min-w-0">
                            <code className="inline-code break-all">{f.path}</code>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-[#999]"><Reveal text={f.why} /></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[15px] text-[#ccc]">Not enough was fetched to name specific files yet — ask the agent below and it&apos;ll look closer.</p>
                  )}
                </FadeInView>

                {/* Run It Locally */}
                <FadeInView className="border-t border-[#141414] py-6">
                  <ResultLabel icon={<TerminalIcon />}>Run It Locally</ResultLabel>
                  <p className="max-w-[64ch] text-[15px] leading-[1.7] text-[#ccc]"><Reveal text={result.howToRun} /></p>
                </FadeInView>

                {/* How To Contribute */}
                <FadeInView className="border-t border-[#141414] py-6">
                  <ResultLabel icon={<GitBranchIcon />}>How To Contribute</ResultLabel>
                  <p className="max-w-[64ch] text-[15px] leading-[1.7] text-[#ccc]"><Reveal text={result.howToContribute} /></p>
                </FadeInView>

              </div>
            ) : (
              <Card className="mb-3 rounded-xl border-[#141414] bg-transparent py-0 shadow-none">
                <CardContent className="p-0 py-6">
                  <div className="prose-dark">
                    <ReactMarkdown>{rawResult}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Contextual Chat Panel ──────────────────────────────────── */}
            <div className="mb-3 border-t border-[#141414] pt-6">
              {/* Chat Header (Agent Selector) */}
              <div className="flex flex-wrap items-center gap-2.5 border-b border-[#141414] pb-3">
                <span className="flex text-[#a8ff3e]"><BotIcon /></span>
                <span className="text-[13px] font-semibold text-white">AI Agent</span>
                <div className="ml-auto">
                  <LevelSelector value={level} onChange={setLevel} />
                </div>
              </div>

              {/* Messages Area — thin custom scrollbar instead of the browser default */}
              {chatMessages.length > 0 && (
                <div
                  ref={chatScrollRef}
                  className="flex max-h-[60vh] flex-col overflow-y-auto pr-1 sm:max-h-[420px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#a8ff3e]/20 [&::-webkit-scrollbar-track]:bg-transparent"
                >
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex flex-col py-2.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${m.role === "user" ? "text-[#a8ff3e]" : "text-[#888]"}`}>
                        {m.role === "user" ? "You" : <><BotIcon /> Agent</>}
                      </div>
                      {m.role === "user" ? (
                        <div className="max-w-[85%] rounded-tl-xl rounded-tr-xl rounded-br-[3px] rounded-bl-xl border border-[#a8ff3e]/[0.18] bg-[#a8ff3e]/[0.08] px-3.5 py-2.5 sm:max-w-[78%]">
                          <div className="prose-dark text-white">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-full sm:max-w-[92%]">
                          <div className="prose-dark">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {awaitingReply && (
                    <div className="flex flex-col items-start py-2.5">
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#888]">
                        <BotIcon /> Agent
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-[5px] w-[5px] rounded-full bg-[#a8ff3e] animate-pulse motion-reduce:animate-none" />
                          <span className="h-[5px] w-[5px] rounded-full bg-[#a8ff3e] animate-pulse [animation-delay:0.2s] motion-reduce:animate-none" />
                          <span className="h-[5px] w-[5px] rounded-full bg-[#a8ff3e] animate-pulse [animation-delay:0.4s] motion-reduce:animate-none" />
                        </div>
                        <span className="text-[12.5px] italic text-[#666]">{currentTip}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chat input area */}
              <div className={`py-3.5 ${chatMessages.length > 0 ? "border-t border-[#141414]" : ""}`}>
                <div className="flex items-center gap-2 rounded-xl border border-[#1a1a1a] bg-[#050505] p-1.5 pl-3.5 transition-colors focus-within:border-[#a8ff3e]/40 focus-within:ring-4 focus-within:ring-[#a8ff3e]/[0.05]">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat(chatInput)}
                    placeholder={`Ask the ${level} agent about this codebase...`}
                    className="h-9 flex-1 border-0 bg-transparent p-0 text-[13px] text-white shadow-none placeholder:text-[#555] focus-visible:ring-0"
                  />
                  <Button
                    onClick={() => (chatLoading ? stopChat() : sendChat(chatInput))}
                    disabled={!chatLoading && !chatInput.trim()}
                    aria-label={chatLoading ? "Stop" : "Send"}
                    title={chatLoading ? "Stop" : "Send"}
                    size="icon"
                    className="h-9 w-10 shrink-0 rounded-lg bg-[#a8ff3e]/10 text-[#a8ff3e] transition-colors hover:bg-[#a8ff3e] hover:text-black disabled:opacity-30"
                  >
                    {chatLoading ? <StopIcon /> : <SendIcon />}
                  </Button>
                </div>

                {/* Contextual Suggestions in Sequence */}
                {chatMessages.length === 0 && (result || rawResult) && (
                  <div className="mt-3.5 flex flex-col gap-2">
                    {getContextualQuestions().map((q, idx) => (
                      <FadeInView key={idx} delay={idx * 70}>
                        <button
                          onClick={() => sendChat(q)}
                          className="flex w-full items-center gap-2.5 rounded-lg border border-[#a8ff3e]/[0.12] bg-[#a8ff3e]/[0.03] px-3.5 py-2.5 text-left text-[12.5px] text-[#aaa] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e]"
                        >
                          <span className="shrink-0 text-[14px] text-[#a8ff3e]">✦</span> {q}
                        </button>
                      </FadeInView>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <FadeInView className="flex flex-col items-start justify-between gap-3.5 rounded-xl border border-[#a8ff3e]/[0.12] bg-[#a8ff3e]/[0.04] px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a8ff3e]/25 hover:shadow-[0_12px_32px_-16px_rgba(168,255,62,0.25)] sm:flex-row sm:items-center">
              <div>
                <p className="mb-0.5 text-[13px] font-semibold text-white">Ready to contribute to this repo?</p>
                <p className="text-[12px] text-[#888]">Hunt real open issues matched to your stack</p>
              </div>
              <Button asChild className="w-full gap-1.5 rounded-lg bg-[#a8ff3e] px-4.5 text-[13px] font-bold text-black transition-transform hover:-translate-y-px hover:bg-[#bdff6b] sm:w-auto">
                <a href="/hunt">Hunt Issues <ArrowRightIcon /></a>
              </Button>
            </FadeInView>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {!result && !rawResult && !loading && !error && (
          <div>
            {/* How it works */}
            <div className="mb-3 pt-2">
              <p className="mb-4.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[#555]">How it works</p>
              <div className="flex flex-col gap-4.5">
                {HOW_IT_WORKS.map((step, i) => (
                  <FadeInView key={step.n} delay={i * 80} className="flex items-start gap-3.5">
                    <div className="mt-[1px] flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-[#a8ff3e]/25 text-[11px] font-semibold text-[#a8ff3e] transition-colors">
                      <CountUp value={Number(step.n)} duration={700} />
                    </div>
                    <div>
                      <div className="mb-1 text-[13px] font-semibold text-white">{step.title}</div>
                      <div className="text-[12px] leading-relaxed text-[#888]">{step.desc}</div>
                    </div>
                  </FadeInView>
                ))}
              </div>
            </div>

            {/* Popular repos */}
            <div className="mb-3 border-t border-[#141414] pt-6">
              <p className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.15em] text-[#555]">Popular repos</p>
              <div className="flex flex-col">
                {popularRepos.map((item, i, arr) => (
                  <FadeInView key={item.repo} delay={i * 60} className={i < arr.length - 1 ? "border-b border-[#141414]" : ""}>
                    <button
                      onClick={() => setUrl(`https://github.com/${item.repo}`)}
                      className="group flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <div className="mb-0.5 truncate font-mono text-[13px] font-semibold text-[#a8ff3e]">{item.repo}</div>
                        <div className="truncate text-[12px] text-[#888]">{item.desc}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className="rounded border-[#1a1a1a] bg-[#111] px-1.5 py-0.5 font-mono text-[11px] font-normal text-[#666]">{item.lang}</Badge>
                        <span className="text-[#555] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#a8ff3e]"><ArrowRightIcon /></span>
                      </div>
                    </button>
                  </FadeInView>
                ))}
              </div>
            </div>

            {/* Idle icon */}
            <div className="pb-1 pt-2 text-center">
              <div className="mb-2.5 flex justify-center text-[#333]">
                <ScanIcon />
              </div>
              <p className="text-[13px] text-[#666]">Paste a repo URL above to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Small helper so every result-card eyebrow (icon + uppercase label) stays
// pixel-identical without repeating the same five classes six times.
function ResultLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-[#a8ff3e]">
      <span className="flex opacity-90">{icon}</span>
      {children}
    </div>
  )
}