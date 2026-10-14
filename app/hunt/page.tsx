"use client"

import Link from "next/link"
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import Select, {
  type MultiValueProps,
  type OptionProps,
  type SingleValueProps,
  type StylesConfig,
} from "react-select"
import { SiExpress, SiNextdotjs, SiPrisma, SiReact, SiVite } from "react-icons/si"
import {
  Accessibility,
  ArrowUpDown,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  CircleDot,
  Coins,
  Copy,
  ExternalLink,
  FlaskConical,
  FolderGit2,
  Gauge,
  Lightbulb,
  Lock,
  Package,
  Palette,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import Navbar from "@/components/ui/Navbar"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton"
import { cn } from "@/components/lib/utils"
import {
  TECHNOLOGIES as LANGUAGE_OPTIONS,
  type TechOption as LanguageOption,
  buildGroupedOptions,
  filterTechnology,
  getRecentTechnologies,
  recordRecentTechnology,
} from "@/components/lib/technology-options"

// ────────────────────────────────────────────────────────────────────────────
// Brand · data · constants
// ────────────────────────────────────────────────────────────────────────────

const BRAND = "#a8ff3e"
const PAGE_SIZE = 10
const GENERIC_ERROR = "Couldn't load issues. Check your connection and try again."

interface Issue {
  id: number
  html_url: string
  title: string
  repository_url: string
  created_at: string
  comments: number
  reactions: Record<string, number>
  isLocked?: boolean
  isActiveRepo?: boolean
  /** Which of the selected languages/frameworks this issue was matched under
   *  (e.g. "React", "Next.js", "JavaScript") — set authoritatively by the
   *  backend. This is what the row badge displays; it is intentionally not
   *  always the repo's raw Linguist language. */
  matchedLanguage?: string
  /** Repo's primary language, e.g. "Python" / "Vue". */
  language?: string
  /** ISO date of the repo's last merged PR / push — powers the "inactive since" label. */
  repoLastActivityAt?: string
}

interface FetchOptions {
  page?: number
  reset?: boolean
  language?: string
  repo?: string | null
  bounty?: boolean
  difficulty?: Difficulty
}

type ProposalSource = "ai" | "template"

const DIFFICULTIES = ["easy", "medium", "hard"] as const
type Difficulty = (typeof DIFFICULTIES)[number]

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", short: "Newest", hint: "Most recently opened" },
  { value: "least-commented", label: "Least commented", short: "Least commented", hint: "Uncontested issues" },
  { value: "most-commented", label: "Most commented", short: "Most commented", hint: "Active discussion" },
  { value: "most-reactions", label: "Most reactions", short: "Most reactions", hint: "Community interest" },
] as const
type SortBy = (typeof SORT_OPTIONS)[number]["value"]

const DIFF: Record<Difficulty, { label: string; text: string; bg: string; border: string; dot: string }> = {
  easy: { label: "Easy", text: "text-[#a8ff3e]", bg: "bg-[#a8ff3e]/[0.08]", border: "border-[#a8ff3e]/25", dot: "bg-[#a8ff3e]" },
  medium: { label: "Medium", text: "text-[#ffd166]", bg: "bg-[#ffd166]/[0.08]", border: "border-[#ffd166]/25", dot: "bg-[#ffd166]" },
  hard: { label: "Hard", text: "text-[#ff4d6d]", bg: "bg-[#ff4d6d]/[0.08]", border: "border-[#ff4d6d]/25", dot: "bg-[#ff4d6d]" },
}

const QUICK_REPOS = [
  { short: "next.js", full: "vercel/next.js", accent: "#ffffff", icon: SiNextdotjs },
  { short: "express", full: "expressjs/express", accent: "#e8e8e8", icon: SiExpress },
  { short: "prisma", full: "prisma/prisma", accent: "#8b8cf9", icon: SiPrisma },
  { short: "react", full: "facebook/react", accent: "#61dafb", icon: SiReact },
  { short: "vite", full: "vitejs/vite", accent: "#bd93f9", icon: SiVite },
]

// Each card resolves its icon + accent colour live from LANGUAGE_OPTIONS, so
// the quick-start grid always matches the brand marks used everywhere else.
// The search is by language — the title is the flavour, `key` is what runs.
const TEMPLATES: { key: string; title: string; desc: string }[] = [
  { key: "JavaScript", title: "React Ecosystem", desc: "Find good first issues in frontend React and Next.js repositories." },
  { key: "TypeScript", title: "Express & Node", desc: "Tackle backend API routing, controllers, and middleware bugs." },
  { key: "Python", title: "Database Core", desc: "Fix schema, indexing, and query logic in backend data tools." },
  { key: "Go", title: "Tooling & Config", desc: "Help out with automation scripts, build environments, and configurations." },
  { key: "Rust", title: "Systems & CLI Tools", desc: "Contribute to command-line tools, parsers, and performance-critical utilities." },
  { key: "Java", title: "Enterprise & Android", desc: "Work on Spring Boot services, Android apps, and JVM tooling." },
  { key: "PHP", title: "Laravel & CMS", desc: "Patch Laravel apps, WordPress plugins, and classic PHP web frameworks." },
  { key: "Ruby", title: "Rails Ecosystem", desc: "Fix gems, Rails controllers, and everyday Ruby scripting bugs." },
]

/** Small, hand-picked set of well-known official orgs — powers the verified
 *  checkmark next to the repo name. A recognisability cue, not an ownership claim. */
const VERIFIED_REPOS = new Set([
  "facebook/react",
  "vercel/next.js",
  "vuejs/core",
  "vuejs/vue",
  "angular/angular",
  "nodejs/node",
  "expressjs/express",
  "prisma/prisma",
  "microsoft/typescript",
  "moby/moby",
  "docker/docker",
  "kubernetes/kubernetes",
  "spring-projects/spring-boot",
  "spring-projects/spring-framework",
  "vitejs/vite",
])

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

class ApiError extends Error {}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  const y = Math.floor(mo / 12)
  const remMo = mo % 12
  return remMo > 0 ? `${y}y ${remMo}mo ago` : `${y}y ago`
}
/** Compact form for tight inline spots: "8mo", "2y" — no "ago". */
function shortDuration(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "now"
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo`
  return `${Math.floor(mo / 12)}y`
}
function repoName(url: string) {
  return url.replace("https://api.github.com/repos/", "")
}
function splitRepo(full: string): [string, string] {
  const i = full.indexOf("/")
  return i === -1 ? ["", full] : [full.slice(0, i + 1), full.slice(i + 1)]
}
function formatExactDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}
function cssVars(vars: Record<string, string | number>) {
  return vars as unknown as CSSProperties
}
function hexToRgbTriplet(hex?: string, fallback = "168,255,62") {
  if (!hex) return fallback
  const raw = hex.trim().replace("#", "")
  const full = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback
  const n = parseInt(full, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Case-insensitive lookup so an issue's raw `language` string ("python",
// "Python", "PYTHON") always resolves to its logo. Built once, first match wins.
const LANGUAGE_LOOKUP = new Map<string, LanguageOption>()
for (const o of LANGUAGE_OPTIONS) {
  for (const k of [o.value, o.label.toLowerCase()]) {
    if (!LANGUAGE_LOOKUP.has(k)) LANGUAGE_LOOKUP.set(k, o)
  }
}
function findLanguageOption(lang?: string) {
  return lang ? LANGUAGE_LOOKUP.get(lang.toLowerCase()) : undefined
}

/** Cosmetic issue-type guess from the title text — there is no `labels` field
 *  on Issue yet, so this only picks an icon and never affects search or sort. */
function detectIssueType(title: string): { Icon: LucideIcon; label: string } {
  const t = title.toLowerCase()
  if (/\b(bug|fix(?:es|ed)?|crash|broken|regression)\b/.test(t)) return { Icon: Bug, label: "Bug" }
  if (/\b(feat(?:ure)?s?|implement|add support)\b/.test(t)) return { Icon: Lightbulb, label: "Feature" }
  if (/\b(docs?|documentation|readme)\b/.test(t)) return { Icon: BookOpen, label: "Documentation" }
  if (/\b(tests?|testing|spec)\b/.test(t)) return { Icon: FlaskConical, label: "Testing" }
  if (/\b(perf(?:ormance)?|slow|optimi[sz]e)\b/.test(t)) return { Icon: Gauge, label: "Performance" }
  if (/\b(security|vulnerab(?:le|ility)|cve|xss|exploit)\b/.test(t)) return { Icon: ShieldAlert, label: "Security" }
  if (/\b(a11y|accessib(?:le|ility))\b/.test(t)) return { Icon: Accessibility, label: "Accessibility" }
  if (/\b(refactor|cleanup|rewrite)\b/.test(t)) return { Icon: RefreshCw, label: "Refactor" }
  if (/\b(dependenc(?:y|ies)|deps|bump|upgrade)\b/.test(t)) return { Icon: Package, label: "Dependencies" }
  if (/\b(ui|style|css|design|layout)\b/.test(t)) return { Icon: Palette, label: "UI" }
  return { Icon: CircleDot, label: "Issue" }
}

/** Animates a number toward `target` (ease-out). Snaps instantly under reduced motion. */
function useCountUp(target: number, duration = 650) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    const total = reduce ? 0 : duration
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = total === 0 ? 1 : Math.min(1, (now - start) / total)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = Math.round(from + (target - from) * eased)
      fromRef.current = v
      setValue(v)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

/** Feeds the cursor position to `.hunt-spot` cards (CSS does the drawing — no re-render). */
function trackPointer(e: ReactPointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty("--mx", `${e.clientX - r.left}px`)
  el.style.setProperty("--my", `${e.clientY - r.top}px`)
}

// ────────────────────────────────────────────────────────────────────────────
// Page CSS — keyframes + the few things Tailwind utilities can't express
// ────────────────────────────────────────────────────────────────────────────

const HUNT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
.oshunt-footer { display: none !important; }
body { font-family: 'Outfit', 'Inter', sans-serif; }

.hunt-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.14) transparent; }
.hunt-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.hunt-scroll::-webkit-scrollbar-track { background: transparent; }
.hunt-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border: 2px solid transparent; border-radius: 8px; background-clip: padding-box; }
.hunt-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.24); border: 2px solid transparent; background-clip: padding-box; }

@keyframes hunt-rise { from { opacity: 0; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: none; } }
@keyframes hunt-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hunt-shimmer { to { transform: translateX(100%); } }
@keyframes hunt-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(360%); } }

.hunt-rise { animation: hunt-rise .5s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-fade { animation: hunt-fade .25s ease-out backwards; }
.hunt-skel { position: relative; overflow: hidden; background: rgba(255,255,255,.045); }
.hunt-skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent); animation: hunt-shimmer 1.5s ease-in-out infinite; }
.hunt-bar { animation: hunt-bar 1.2s cubic-bezier(.4,0,.2,1) infinite; }

.hunt-spot { --mx: 50%; --my: 50%; --accent: 168,255,62; }
.hunt-spot::before, .hunt-spot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .35s ease; }
.hunt-spot::before { background: radial-gradient(360px circle at var(--mx) var(--my), rgba(var(--accent), .09), transparent 65%); }
.hunt-spot::after { padding: 1px; background: radial-gradient(260px circle at var(--mx) var(--my), rgba(var(--accent), .6), transparent 65%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
.hunt-spot:hover::before, .hunt-spot:hover::after, .hunt-spot:focus-visible::before, .hunt-spot:focus-visible::after { opacity: 1; }

/* shadcn ships the sheet's close button at 16px; give it a real touch target, aligned with the title row */
.hunt-sheet > button:last-child { top: 18px; right: 8px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 10px; opacity: 1; color: #a3a3a3; transition: background-color .15s ease, color .15s ease; }
.hunt-sheet > button:last-child:hover { background: rgba(255,255,255,.06); color: #fff; }
@media (min-width: 768px) { .hunt-sheet > button:last-child { right: 20px; } }

@media (prefers-reduced-motion: reduce) {
  .hunt-rise, .hunt-fade, .hunt-skel::after, .hunt-bar { animation: none !important; }
  .hunt-spot::before, .hunt-spot::after { transition: none; }
  .hunt-root *, .hunt-root *::before, .hunt-root *::after, .hunt-sheet, .hunt-sheet * { transition-duration: .01ms !important; }
  .hunt-sheet { animation-duration: .01ms !important; }
}
`

// ────────────────────────────────────────────────────────────────────────────
// Tiny shared pieces
// ────────────────────────────────────────────────────────────────────────────

function HuntMark({ className }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className}>
      <path d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" stroke={BRAND} strokeWidth="0.5" opacity="0.15" strokeDasharray="3 4" />
      <path d="M13 7 L7 10.5 L7 15" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 7 L29 10.5 L29 15" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 29 L7 25.5 L7 21" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 29 L29 25.5 L29 21" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 11 L25 18 L18 25 L11 18 Z" stroke={BRAND} strokeWidth="1.2" fill="rgba(168,255,62,0.06)" />
      <line x1="18" y1="2" x2="18" y2="7" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="29" x2="18" y2="34" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="18" x2="7" y2="18" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="18" x2="34" y2="18" stroke={BRAND} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.5" fill={BRAND} />
      <circle cx="18" cy="18" r="6.5" stroke={BRAND} strokeWidth="0.6" strokeDasharray="1 3" opacity="0.7" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("hunt-skel rounded-md", className)} style={style} />
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{children}</p>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Controls — segmented switch · toggle row
// ────────────────────────────────────────────────────────────────────────────

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  /** Text colour of the active label (defaults to brand). */
  activeText?: string
  /** Classes for the sliding thumb while this option is active. */
  thumb?: string
}

/** Radio-group segmented control with a sliding thumb and arrow-key support. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, options.findIndex((o) => o.value === value))

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return
    e.preventDefault()
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1
    const next = (index + dir + options.length) % options.length
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative grid rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-1 left-1 rounded-[7px] border transition-[transform,background-color,border-color] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          options[index]?.thumb ?? "border-[#a8ff3e]/25 bg-[#a8ff3e]/10"
        )}
        style={{ width: `calc((100% - 8px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex h-10 items-center justify-center gap-1.5 rounded-[7px] lg:h-9 text-[13px] font-semibold transition-[color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.97]",
              active ? o.activeText ?? "text-[#a8ff3e]" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Accessible on/off row (role=switch) styled like a shadcn Switch with a description. */
function ToggleRow({
  checked,
  onChange,
  icon,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  icon: ReactNode
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.99]",
        checked
          ? "border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.06]"
          : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200",
          checked ? "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e]" : "border-white/10 bg-white/[0.03] text-neutral-400"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-neutral-100">{label}</span>
        <span className="block text-[11.5px] leading-snug text-neutral-400">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-[#a8ff3e]/60 bg-[#a8ff3e]" : "border-white/15 bg-white/10"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full shadow transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)]",
            checked ? "translate-x-4 bg-neutral-950" : "translate-x-0 bg-neutral-200"
          )}
        />
      </span>
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Language picker (react-select). Custom parts live at module level on purpose:
// components declared inside a render get a new identity every render, which
// makes react-select remount every option and reset the menu's scroll.
// ────────────────────────────────────────────────────────────────────────────

function LanguageOptionRow(props: OptionProps<LanguageOption, boolean>) {
  const { data, innerProps, innerRef, isSelected, isFocused } = props
  const Icon = data.icon
  return (
    <div
      ref={innerRef}
      {...innerProps}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors duration-150",
        isSelected
          ? "bg-[#a8ff3e]/[0.12] font-semibold text-[#a8ff3e] shadow-[inset_2px_0_0_0_#a8ff3e]"
          : isFocused
            ? "bg-white/[0.07] text-neutral-100"
            : "text-neutral-300"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: data.iconColor }} />
      <span className="truncate">{data.label}</span>
      {isSelected && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-[#a8ff3e]" strokeWidth={2.5} />}
    </div>
  )
}

function LanguageSingleValue(props: SingleValueProps<LanguageOption, boolean>) {
  const { data } = props
  const Icon = data.icon
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0" style={{ color: data.iconColor }} />
      <span className="text-[14.5px] font-semibold text-neutral-100">{data.label}</span>
    </div>
  )
}

function LanguageMultiValue(props: MultiValueProps<LanguageOption, true>) {
  const { data, removeProps } = props
  const Icon = data.icon
  const buttonRemoveProps = removeProps as unknown as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <div
      className="my-[3px] mr-1.5 flex items-center gap-1 rounded-md border py-[3px] pl-1.5 pr-1"
      style={{ borderColor: `${data.iconColor}40`, background: `${data.iconColor}14` }}
    >
      <Icon className="h-3 w-3 shrink-0" style={{ color: data.iconColor }} />
      <span className="max-w-[84px] truncate text-[12px] font-medium text-neutral-100">{data.label}</span>
      <button
        {...buttonRemoveProps}
        type="button"
        aria-label={`Remove ${data.label}`}
        className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  )
}

function formatGroupLabel(group: { label?: string; options: readonly LanguageOption[] }) {
  return (
    <div className="flex items-center justify-between px-1 pb-1 pt-2 first:pt-0">
      <span className="font-mono text-[10.5px] font-bold uppercase tracking-widest text-neutral-400">{group.label}</span>
      <span className="font-mono text-[10.5px] text-neutral-400">{group.options.length}</span>
    </div>
  )
}

function buildSelectStyles<M extends boolean>(multi: boolean): StylesConfig<LanguageOption, M> {
  return {
    control: (base, state) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${state.isFocused ? "rgba(168,255,62,0.5)" : "rgba(255,255,255,0.08)"}`,
      borderRadius: 10,
      minHeight: 46,
      boxShadow: state.isFocused ? "0 0 0 3px rgba(168,255,62,0.12)" : "none",
      cursor: "pointer",
      transition: "border-color .2s ease, box-shadow .2s ease",
      "&:hover": { borderColor: state.isFocused ? "rgba(168,255,62,0.5)" : "rgba(255,255,255,0.18)" },
    }),
    valueContainer: (base) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      padding: multi ? "4px 10px" : "0 12px",
      gap: 4,
    }),
    placeholder: (base) => ({ ...base, color: "#8a8a8a", fontSize: 14 }),
    input: (base) => ({ ...base, color: "#fff", margin: 0 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "#a8ff3e" : "#8a8a8a",
      padding: 8,
      "&:hover": { color: "#a8ff3e" },
    }),
    clearIndicator: (base) => ({ ...base, color: "#8a8a8a", padding: 8, "&:hover": { color: "#fff" } }),
    menu: (base) => ({
      ...base,
      background: "#101010",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 18px 44px rgba(0,0,0,.65)",
      marginTop: 6,
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: 6,
      maxHeight: 260,
      overflowY: "auto",
      overflowX: "hidden",
      overscrollBehavior: "contain",
      WebkitOverflowScrolling: "touch",
    }),
    option: (base) => ({ ...base, background: "transparent", padding: 0, borderRadius: 8, cursor: "pointer" }),
  }
}
const MULTI_STYLES = buildSelectStyles<true>(true)
const SINGLE_STYLES = buildSelectStyles<false>(false)

function LanguagePicker({
  idPrefix,
  multiMode,
  onModeChange,
  language,
  setLanguage,
  languages,
  setLanguages,
}: {
  idPrefix: string
  multiMode: boolean
  onModeChange: (v: boolean) => void
  language: string
  setLanguage: (v: string) => void
  languages: string[]
  setLanguages: (v: string[]) => void
}) {
  const singleValue = useMemo(() => findLanguageOption(language) || LANGUAGE_OPTIONS[0], [language])
  const multiValue = useMemo(
    () => languages.map((l) => findLanguageOption(l)).filter((o): o is LanguageOption => !!o),
    [languages]
  )

  // "Recently Used" persists in localStorage; the lazy initialiser is safe because
  // the menu is closed on first paint, so it never affects server-rendered markup.
  const [recent, setRecent] = useState<string[]>(() => getRecentTechnologies())
  const groupedOptions = useMemo(() => buildGroupedOptions(recent), [recent])
  const trackRecent = (values: string | string[]) => setRecent(recordRecentTechnology(values))

  return (
    <div>
      <FieldLabel>Language</FieldLabel>
      <div className="mb-2.5">
        <Segmented
          label="Language selection mode"
          value={multiMode ? "multi" : "single"}
          onChange={(v) => onModeChange(v === "multi")}
          options={[
            { value: "single", label: "Single" },
            { value: "multi", label: "Multi" },
          ]}
        />
      </div>

      {multiMode ? (
        <>
          <Select<LanguageOption, true>
            className="language-select"
            classNamePrefix="language-select"
            instanceId={`${idPrefix}-language-multi`}
            aria-label="Languages"
            isMulti
            value={multiValue}
            onChange={(opts) => {
              const picked = (opts as LanguageOption[]).map((o) => o.label)
              setLanguages(picked)
              if (picked.length) trackRecent(picked)
            }}
            options={groupedOptions}
            getOptionLabel={(option) => option.label}
            getOptionValue={(option) => option.value}
            isSearchable
            filterOption={filterTechnology}
            formatGroupLabel={formatGroupLabel}
            noOptionsMessage={() => "No technologies found."}
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
            placeholder="Search languages…"
            captureMenuScroll
            menuShouldScrollIntoView={false}
            closeMenuOnScroll={false}
            components={{ Option: LanguageOptionRow, MultiValue: LanguageMultiValue }}
            styles={MULTI_STYLES}
          />
          {languages.length === 0 && (
            <p role="alert" className="mt-1.5 text-[12px] text-rose-400">
              Pick at least one language to search.
            </p>
          )}
        </>
      ) : (
        <Select<LanguageOption, false>
          className="language-select"
          classNamePrefix="language-select"
          instanceId={`${idPrefix}-language-single`}
          aria-label="Language"
          value={singleValue}
          onChange={(opt) => {
            if (opt) {
              setLanguage(opt.label)
              trackRecent(opt.label)
            }
          }}
          options={groupedOptions}
          getOptionLabel={(option) => option.label}
          getOptionValue={(option) => option.value}
          isSearchable
          filterOption={filterTechnology}
          formatGroupLabel={formatGroupLabel}
          noOptionsMessage={() => "No technologies found."}
          placeholder="Search language…"
          captureMenuScroll
          menuShouldScrollIntoView={false}
          closeMenuOnScroll={false}
          components={{ Option: LanguageOptionRow, SingleValue: LanguageSingleValue }}
          styles={SINGLE_STYLES}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Filters panel (desktop sidebar + mobile sheet share it)
// ────────────────────────────────────────────────────────────────────────────

interface FiltersPanelProps {
  variant: "sidebar" | "sheet"
  language: string
  setLanguage: (v: string) => void
  languages: string[]
  setLanguages: (v: string[]) => void
  multiMode: boolean
  setMultiMode: (v: boolean) => void
  difficulty: Difficulty
  setDifficulty: (v: Difficulty) => void
  bountyOnly: boolean
  setBountyOnly: (v: boolean) => void
  activeOnly: boolean
  setActiveOnly: (v: boolean) => void
  loading: boolean
  onSearch: () => void
  repoFilter: string | null
  onQuickRepo: (full: string) => void
}

function FiltersPanel(props: FiltersPanelProps) {
  const {
    variant, language, setLanguage, languages, setLanguages, multiMode, setMultiMode,
    difficulty, setDifficulty, bountyOnly, setBountyOnly, activeOnly, setActiveOnly,
    loading, onSearch, repoFilter, onQuickRepo,
  } = props

  function handleModeChange(next: boolean) {
    if (next) setLanguages(languages.length ? languages : [language])
    else setLanguage(languages[0] || language)
    setMultiMode(next)
  }

  const canSearch = !loading && !(multiMode && languages.length === 0)

  const difficultyOptions: SegmentedOption<Difficulty>[] = DIFFICULTIES.map((d) => ({
    value: d,
    activeText: DIFF[d].text,
    thumb: cn(DIFF[d].bg, DIFF[d].border),
    label: (
      <>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DIFF[d].dot)} />
        {DIFF[d].label}
      </>
    ),
  }))

  return (
    <form
      className="flex min-h-0 w-full flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSearch) onSearch()
      }}
    >
      <div className={cn("hunt-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6", variant === "sheet" && "md:px-8")}>
        {variant === "sidebar" && (
          <div className="mb-7">
            <div className="mb-3.5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                <HuntMark className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[19px] font-semibold leading-tight tracking-tight text-white">Hunt Issues</h1>
                <p className="text-[12.5px] leading-snug text-neutral-400">Real bugs from real repos, matched to your stack</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
              <span className="text-[12px] font-medium text-neutral-300">Free plan</span>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 rounded text-[12px] font-semibold text-[#a8ff3e] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60"
              >
                Upgrade <ArrowUpRight className="h-3 w-3" strokeWidth={2.25} />
              </Link>
            </div>
          </div>
        )}

        <div className={cn("space-y-6", variant === "sheet" && "md:grid md:grid-cols-2 md:items-start md:gap-x-8 md:space-y-0")}>
          <div className="space-y-6">
            <LanguagePicker
              idPrefix={variant}
              multiMode={multiMode}
              onModeChange={handleModeChange}
              language={language}
              setLanguage={setLanguage}
              languages={languages}
              setLanguages={setLanguages}
            />

            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <Segmented label="Difficulty" value={difficulty} onChange={setDifficulty} options={difficultyOptions} />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <FieldLabel>Refine</FieldLabel>
              <div className="space-y-2">
                <ToggleRow
                  checked={bountyOnly}
                  onChange={setBountyOnly}
                  icon={<Coins className="h-4 w-4" strokeWidth={2} />}
                  label="Paid bounties"
                  description="Issues with a paid bounty"
                />
                <ToggleRow
                  checked={activeOnly}
                  onChange={setActiveOnly}
                  icon={<Zap className="h-4 w-4" strokeWidth={2} />}
                  label="Active repos only"
                  description="Recently merged PRs"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Quick repos</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_REPOS.map((r) => {
                  const active = repoFilter === r.full
                  return (
                    <button
                      key={r.full}
                      type="button"
                      title={`Hunt issues in ${r.full}`}
                      aria-label={`Hunt issues in ${r.full}`}
                      aria-pressed={active}
                      onClick={() => onQuickRepo(r.full)}
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-[10px] border px-2.5 text-left transition-[background-color,border-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.97] last:odd:col-span-2",
                        active
                          ? "border-white/25 bg-white/[0.07] text-white"
                          : "border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:-translate-y-px hover:border-white/[0.18] hover:bg-white/[0.05]"
                      )}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{ background: `${r.accent}1f`, boxShadow: `inset 0 0 0 1px ${r.accent}33` }}
                      >
                        <r.icon className="h-3.5 w-3.5" style={{ color: r.accent }} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.short}</span>
                      {active &&
                        (loading ? (
                          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-neutral-600 border-t-neutral-200" />
                        ) : (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[#a8ff3e]" strokeWidth={2.5} />
                        ))}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "relative shrink-0 border-t border-white/[0.06] bg-[#0b0b0b] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4",
          variant === "sheet" && "md:px-8"
        )}
      >
        {/* soft fade so scrolled content slides under the pinned button instead of being sliced */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
        <Button
          type="submit"
          disabled={!canSearch}
          aria-busy={loading}
          className="h-11 w-full gap-2 rounded-[10px] bg-[#a8ff3e] text-[14.5px] font-semibold text-neutral-950 transition-[background-color,transform,opacity] duration-200 hover:bg-[#bcff6a] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-neutral-950" />
              Searching…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" strokeWidth={2.5} />
              Search issues
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Row-level pieces
// ────────────────────────────────────────────────────────────────────────────

/** Shared look for the small bordered actions on each row (40px touch target on phones, 32px on desktop). */
const ACTION_BTN =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[12.5px] font-medium text-neutral-300 transition-[background-color,border-color,color,transform] duration-150 hover:border-[#a8ff3e]/30 hover:bg-[#a8ff3e]/[0.07] hover:text-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.96] lg:h-8"

const LIME_BTN =
  "h-10 gap-2 rounded-[10px] bg-[#a8ff3e] px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-[#bcff6a] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.97]"

const OUTLINE_BTN =
  "h-10 gap-2 rounded-[10px] border-white/15 bg-transparent px-4 text-[13.5px] font-medium text-neutral-100 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.97]"

function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const d = DIFF[difficulty]
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold", d.text, d.bg, d.border, className)}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", d.dot)} />
      {d.label}
    </Badge>
  )
}

/** Leading identity mark on every issue row — the repo's tech logo. */
function RepoAvatar({ option, className }: { option?: LanguageOption; className?: string }) {
  const accent = option?.iconColor || "#5b6472"
  const Icon = option?.icon
  return (
    <span
      title={option?.label}
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-transform duration-200 ease-out group-hover/row:scale-105",
        className
      )}
      style={{
        borderColor: option ? `${accent}30` : "rgba(255,255,255,0.09)",
        background: option ? `${accent}12` : "rgba(255,255,255,0.03)",
      }}
    >
      {Icon ? (
        <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} />
      ) : (
        <FolderGit2 className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
      )}
    </span>
  )
}

/** Repo health. Both states say so in words (never colour alone); only "inactive" gets a warning colour. */
function ActivityStatus({ issue }: { issue: Issue }) {
  const inactive = issue.isActiveRepo === false
  const since = issue.repoLastActivityAt
  const tip = inactive
    ? since
      ? `No merged PRs since ${formatExactDate(since)}`
      : "No merged PRs in the last 6+ months"
    : "Maintainers are merging code regularly"
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 text-[12px]", inactive ? "font-medium text-rose-300" : "text-neutral-400")}>
          <span aria-hidden="true" className={cn("h-[7px] w-[7px] shrink-0 rounded-full", inactive ? "bg-rose-500" : "bg-[#a8ff3e]")} />
          <span>{inactive ? `Inactive${since ? ` ${shortDuration(since)}` : ""}` : "Active"}</span>
          {/* the tooltip is hover-only, so screen readers get the same detail inline (and it isn't an extra tab stop on every row) */}
          <span className="sr-only">. {tip}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="border border-white/10 bg-[#1a1a1a] text-[12px] text-neutral-200 [&_svg]:bg-[#1a1a1a] [&_svg]:fill-[#1a1a1a]"
      >
        {tip}
      </TooltipContent>
    </Tooltip>
  )
}

function ProposalPanel({
  issue,
  text,
  source,
  generating,
  copied,
  onChange,
  onCopy,
}: {
  issue: Issue
  text: string
  source: ProposalSource | undefined
  generating: boolean
  copied: boolean
  onChange: (v: string) => void
  onCopy: () => void
}) {
  // The comment box grows with its content (up to a cap) so nothing is hidden behind a tiny scroll area.
  const areaRef = useRef<HTMLTextAreaElement | null>(null)
  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const fit = () => {
      el.style.height = "auto"
      el.style.height = `${Math.min(el.scrollHeight + 2, 360)}px`
    }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [text, generating])

  return (
    <div
      id={`proposal-${issue.id}`}
      className="hunt-rise border-t border-white/[0.05] bg-white/[0.015] px-4 py-4 sm:px-5 md:pl-[4.5rem]"
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-neutral-100">
          <Sparkles className="h-3.5 w-3.5 text-[#a8ff3e]" strokeWidth={2} />
          Claiming comment
          {!generating && source && (
            <span
              className={cn(
                "rounded-full border px-2 py-px text-[11px] font-medium",
                source === "ai"
                  ? "border-[#a8ff3e]/25 bg-[#a8ff3e]/10 text-[#a8ff3e]"
                  : "border-amber-400/25 bg-amber-400/10 text-amber-300"
              )}
              title={source === "template" ? "The AI draft wasn't available, so this is a generic template." : undefined}
            >
              {source === "ai" ? "AI draft" : "Template"}
            </span>
          )}
        </span>
        <span className="text-[12px] text-neutral-400">Edit it, then paste it on the GitHub issue</span>
      </div>

      {generating ? (
        <div role="status" aria-label="Drafting your proposal" className="space-y-2.5 rounded-lg border border-white/10 bg-neutral-950 p-3.5">
          <Skeleton className="h-3.5 w-[94%]" />
          <Skeleton className="h-3.5 w-[82%]" />
          <Skeleton className="h-3.5 w-[58%]" />
        </div>
      ) : (
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Claiming comment for ${issue.title}`}
          rows={4}
          className="block min-h-[104px] w-full resize-none overflow-y-auto rounded-lg border border-white/10 bg-neutral-950 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-neutral-200 outline-none transition-[border-color,box-shadow] duration-200 focus:border-[#a8ff3e]/50 focus:ring-2 focus:ring-[#a8ff3e]/20"
        />
      )}

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <a href={issue.html_url} target="_blank" rel="noopener noreferrer" className={ACTION_BTN}>
          Open issue <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={onCopy}
          disabled={generating}
          className={cn(
            ACTION_BTN,
            "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e] hover:bg-[#a8ff3e]/15 disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy comment
            </>
          )}
        </button>
      </div>
    </div>
  )
}

interface IssueRowProps {
  issue: Issue
  index: number
  difficulty: Difficulty
  showLanguage: boolean
  copied: boolean
  proposalOpen: boolean
  proposalGenerating: boolean
  onCopyRepo: () => void
  onToggleProposal: () => void
  children?: ReactNode
}

function IssueRow({
  issue, index, difficulty, showLanguage, copied, proposalOpen, proposalGenerating,
  onCopyRepo, onToggleProposal, children,
}: IssueRowProps) {
  const rowLangOpt = findLanguageOption(issue.matchedLanguage || issue.language)
  const langOpt = showLanguage ? rowLangOpt : undefined
  const repoFull = repoName(issue.repository_url)
  const [owner, name] = splitRepo(repoFull)
  const isVerified = VERIFIED_REPOS.has(repoFull.toLowerCase())
  const type = detectIssueType(issue.title)
  const locked = !!issue.isLocked
  const d = DIFF[difficulty]

  return (
    <li className="hunt-rise relative" style={cssVars({ "--d": `${Math.min(index % PAGE_SIZE, 9) * 28}ms` })}>
      <div
        className={cn(
          "group/row relative flex flex-wrap items-start gap-x-3.5 gap-y-3 px-4 py-4 transition-colors duration-150 sm:px-5 md:flex-nowrap md:items-center md:gap-x-4",
          locked ? "pointer-events-none select-none opacity-60 blur-[3px]" : "hover:bg-white/[0.03]"
        )}
        aria-hidden={locked || undefined}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 bg-[#a8ff3e] transition-transform duration-200 ease-out group-hover/row:scale-y-100"
        />
        <span aria-hidden="true" className="hidden w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-neutral-500 lg:block">
          {String(index + 1).padStart(2, "0")}
        </span>

        <RepoAvatar option={rowLangOpt} />

        <div className="min-w-0 flex-1 basis-[calc(100%-46px)] md:basis-0">
          <p className="mb-1.5 flex min-w-0 items-start gap-2 text-[15px] font-medium leading-snug tracking-tight text-neutral-100">
            <span title={type.label} className="mt-[3px] inline-flex shrink-0">
              <type.Icon
                strokeWidth={2}
                aria-label={type.label}
                className="h-3.5 w-3.5 text-neutral-500 transition-colors duration-200 group-hover/row:text-neutral-300"
              />
            </span>
            <a
              href={issue.html_url || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={issue.title}
              className="line-clamp-2 min-w-0 rounded-sm outline-none transition-colors duration-150 after:absolute after:inset-0 hover:text-white focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-[#a8ff3e]/60"
            >
              {issue.title}
              <span className="sr-only"> (opens on GitHub in a new tab)</span>
            </a>
          </p>

          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-400">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <span className="min-w-0 truncate font-mono text-[12px]">
                <span className="text-neutral-400">{owner}</span>
                <span className="text-neutral-200">{name}</span>
              </span>
              {isVerified && (
                <span title="Official repository" className="inline-flex shrink-0">
                  <BadgeCheck strokeWidth={2.25} className="h-3.5 w-3.5 text-[#a8ff3e]" />
                  <span className="sr-only">Official repository</span>
                </span>
              )}
              <ExternalLink
                aria-hidden="true"
                strokeWidth={2}
                className="h-3 w-3 shrink-0 text-neutral-500 opacity-0 transition-opacity duration-200 group-hover/row:opacity-100"
              />
            </span>

            {langOpt && (
              <span
                title={langOpt.label}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11.5px] font-medium text-neutral-300"
              >
                <langOpt.icon className="h-3 w-3 shrink-0" style={{ color: langOpt.iconColor }} />
                {langOpt.label}
              </span>
            )}

            <ActivityStatus issue={issue} />

            <span className={cn("shrink-0 text-[12px] font-medium", d.text)}>{d.label}</span>

            <time dateTime={issue.created_at} className="shrink-0 font-mono text-[11.5px] tabular-nums text-neutral-400">
              {timeAgo(issue.created_at)}
            </time>
          </div>
        </div>

        <div className="relative z-[1] flex w-full items-center gap-2 pl-[46px] md:ml-auto md:w-auto md:shrink-0 md:gap-1.5 md:pl-0">
          <button
            type="button"
            onClick={onToggleProposal}
            aria-expanded={proposalOpen}
            aria-controls={`proposal-${issue.id}`}
            title="Draft a claiming comment with AI"
            className={cn(
              ACTION_BTN,
              proposalOpen && "border-[#a8ff3e]/40 bg-[#a8ff3e]/10 text-[#a8ff3e]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            {proposalGenerating ? "Drafting…" : "Proposal"}
            <span className="rounded border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-1 text-[10px] font-bold leading-4 tracking-wide text-[#a8ff3e]">
              AI
            </span>
          </button>

          <button
            type="button"
            onClick={onCopyRepo}
            title="Copy repo link"
            aria-label={copied ? "Repo link copied" : "Copy repo link"}
            className={cn(
              ACTION_BTN,
              "ml-auto w-10 px-0 md:ml-0 lg:w-8",
              copied && "border-[#a8ff3e]/40 bg-[#a8ff3e]/10 text-[#a8ff3e]"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>

          <BookmarkButton kind="issue" item={issue} subject={issue.title} variant="icon" size="sm" />
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
          <Link
            href="/pricing"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#a8ff3e] px-4 text-[13px] font-semibold text-neutral-950 transition-[background-color,transform] duration-150 hover:bg-[#bcff6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] active:scale-[0.97]"
          >
            <Lock className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
            Upgrade to Pro to view this bounty
          </Link>
        </div>
      )}

      {children}
    </li>
  )
}

function SkeletonRow({ i }: { i: number }) {
  return (
    <li
      aria-hidden="true"
      className="flex items-start gap-3.5 px-4 py-4 sm:px-5 md:items-center md:gap-4"
      style={{ opacity: Math.max(0.3, 1 - i * 0.1) }}
    >
      <Skeleton className="hidden h-3 w-5 lg:block" />
      <Skeleton className="h-8 w-8 shrink-0 rounded-[10px]" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className="h-4" style={{ width: `${56 + ((i * 17) % 32)}%` }} />
        <Skeleton className="h-3 w-[38%]" />
      </div>
      <div className="hidden items-center gap-1.5 md:flex">
        <Skeleton className="h-10 w-[112px] rounded-lg lg:h-8" />
        <Skeleton className="h-10 w-10 rounded-lg lg:h-8 lg:w-8" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </li>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Empty-state template card + state panels
// ────────────────────────────────────────────────────────────────────────────

function TemplateCard({ t, index, onRun }: { t: (typeof TEMPLATES)[number]; index: number; onRun: (key: string) => void }) {
  const opt = findLanguageOption(t.key)
  const accent = opt?.iconColor || BRAND
  const Icon = opt?.icon
  return (
    <div className="hunt-rise h-full" style={cssVars({ "--d": `${index * 55}ms` })}>
      <Card
        role="button"
        tabIndex={0}
        aria-label={`Hunt ${t.key} issues — ${t.title}`}
        onClick={() => onRun(t.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onRun(t.key)
          }
        }}
        onPointerMove={trackPointer}
        className="hunt-spot group relative h-full cursor-pointer gap-0 overflow-hidden rounded-2xl border-white/[0.08] bg-[#0d0d0d] p-0 shadow-none transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:translate-y-0 active:scale-[0.99]"
        style={cssVars({ "--accent": hexToRgbTriplet(opt?.iconColor) })}
      >
        <CardContent className="relative z-10 flex h-full flex-1 items-center gap-3.5 p-4 sm:flex-col sm:items-start sm:gap-0 sm:p-5">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 sm:mb-5"
            style={{ background: `${accent}1a`, boxShadow: `inset 0 0 0 1px ${accent}30` }}
          >
            {Icon && <Icon className="h-5 w-5" style={{ color: accent }} />}
          </span>
          <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
            <h3 className="mb-1 text-[15px] font-semibold tracking-tight text-neutral-100">{t.title}</h3>
            <p className="line-clamp-2 text-[13px] leading-relaxed text-neutral-400 sm:line-clamp-3">{t.desc}</p>
            <span className="mt-1.5 block font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-400 sm:hidden">{t.key}</span>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-500 sm:hidden" aria-hidden="true" />
          <div className="hidden w-full items-center justify-between sm:mt-auto sm:flex sm:pt-5">
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-400">{t.key}</span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 text-neutral-500 transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-200"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatePanel({
  icon, tone = "neutral", title, message, role, children,
}: {
  icon: ReactNode
  tone?: "neutral" | "danger"
  title: string
  message: ReactNode
  role?: "alert" | "status"
  children?: ReactNode
}) {
  return (
    <div role={role} className="hunt-rise mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center sm:py-28">
      <span
        className={cn(
          "mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border",
          tone === "danger" ? "border-rose-500/25 bg-rose-500/10 text-rose-400" : "border-white/10 bg-white/[0.03] text-neutral-300"
        )}
      >
        {icon}
      </span>
      <h2 className="mb-1.5 text-[17px] font-semibold tracking-tight text-neutral-100">{title}</h2>
      <p className="mb-6 text-[13.5px] leading-relaxed text-neutral-400">{message}</p>
      {children && <div className="flex flex-wrap items-center justify-center gap-2.5">{children}</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Results toolbar (sticky): filters trigger · summary chips · sort
// ────────────────────────────────────────────────────────────────────────────

const CHIP =
  "h-6 gap-1.5 rounded-full border-white/10 bg-white/[0.04] px-2.5 text-[11.5px] font-medium text-neutral-300"

function ResultCount({ n }: { n: number }) {
  const shown = useCountUp(n)
  return (
    <span className="inline-flex items-baseline gap-1.5 font-mono text-[12.5px] text-neutral-300">
      <span aria-hidden="true">
        <span className="font-semibold tabular-nums text-neutral-100">{shown}</span> {n === 1 ? "issue" : "issues"}
      </span>
      <span role="status" className="sr-only">
        {n} {n === 1 ? "issue" : "issues"} found
      </span>
    </span>
  )
}

function ResultsToolbar({
  leading,
  scrolled,
  busy,
  mode,
  count,
  difficulty,
  language,
  languages,
  multiMode,
  repoFilter,
  bountyOnly,
  activeOnly,
  sortBy,
  setSortBy,
  onClearRepo,
}: {
  leading: ReactNode
  scrolled: boolean
  busy: boolean
  mode: "loading" | "results" | "templates" | "other"
  count: number
  difficulty: Difficulty
  language: string
  languages: string[]
  multiMode: boolean
  repoFilter: string | null
  bountyOnly: boolean
  activeOnly: boolean
  sortBy: SortBy
  setSortBy: (v: SortBy) => void
  onClearRepo: () => void
}) {
  const currentSort = SORT_OPTIONS.find((s) => s.value === sortBy) ?? SORT_OPTIONS[0]
  const langOpt = findLanguageOption(language)
  const showSort = mode === "results" && count > 0

  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b bg-[#090909]/85 backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-white/[0.09] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)]" : "border-white/[0.05]",
        mode === "templates" && "lg:hidden"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 lg:min-h-[52px] lg:flex-nowrap">
        {leading}

        <div className="order-3 flex min-w-0 basis-full flex-wrap items-center gap-x-2 gap-y-1.5 lg:order-none lg:flex-1 lg:basis-auto">
          {mode === "loading" && (
            <span className="font-mono text-[12.5px] text-neutral-400" aria-hidden="true">
              Searching…
            </span>
          )}

          {mode === "results" && (
            <>
              <ResultCount n={count} />
              {repoFilter ? (
                <Badge variant="outline" className={cn(CHIP, "pr-1")}>
                  <FolderGit2 className="h-3 w-3 text-neutral-400" strokeWidth={2} />
                  <span className="max-w-[12rem] truncate">{repoFilter}</span>
                  <button
                    type="button"
                    onClick={onClearRepo}
                    aria-label={`Clear ${repoFilter} filter`}
                    title="Clear repo filter"
                    className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </Badge>
              ) : multiMode ? (
                <Badge variant="outline" className={CHIP} title={languages.join(", ")}>
                  {languages.length} {languages.length === 1 ? "language" : "languages"}
                </Badge>
              ) : (
                <Badge variant="outline" className={CHIP}>
                  {langOpt && <langOpt.icon className="h-3 w-3 shrink-0" style={{ color: langOpt.iconColor }} />}
                  {language}
                </Badge>
              )}
              <DifficultyBadge difficulty={difficulty} />
              {bountyOnly && (
                <Badge variant="outline" className={cn(CHIP, "border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.08] text-[#a8ff3e]")}>
                  <Coins className="h-3 w-3" strokeWidth={2} /> Bounties
                </Badge>
              )}
              {activeOnly && (
                <Badge variant="outline" className={cn(CHIP, "border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.08] text-[#a8ff3e]")}>
                  <Zap className="h-3 w-3" strokeWidth={2} /> Active only
                </Badge>
              )}
            </>
          )}

          {mode === "templates" && (
            <span className="text-[12.5px] text-neutral-400 lg:hidden">Pick a template below, or open Filters to search.</span>
          )}
        </div>

        {showSort && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Sort issues. Current: ${currentSort.label}`}
                className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[12.5px] font-medium text-neutral-200 outline-none transition-[background-color,border-color] duration-150 hover:border-white/20 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 data-[state=open]:border-[#a8ff3e]/30 lg:ml-0 lg:h-9"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2} />
                <span className="max-w-[9.5rem] truncate">{currentSort.short}</span>
                <ChevronDown className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 rounded-xl border-white/10 bg-[#0e0e0e] p-1.5 text-neutral-200">
              <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                {SORT_OPTIONS.map((o) => (
                  <DropdownMenuRadioItem
                    key={o.value}
                    value={o.value}
                    className="cursor-pointer rounded-lg py-2 text-[13px] text-neutral-300 focus:bg-white/[0.07] focus:text-white"
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{o.label}</span>
                      <span className="text-[11.5px] text-neutral-400">{o.hint}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {busy && (
        <div aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[2px] overflow-hidden">
          <div className="hunt-bar h-full w-[28%] rounded-full bg-[#a8ff3e]" />
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

function HuntClient() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [language, setLanguage] = useState("JavaScript")
  const [languages, setLanguages] = useState<string[]>(["JavaScript"])
  const [multiMode, setMultiMode] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [done, setDone] = useState(false)
  const [searched, setSearched] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [bountyOnly, setBountyOnly] = useState(false)
  const [activeOnly, setActiveOnly] = useState(false)
  const [repoFilter, setRepoFilter] = useState<string | null>(null)
  const [openProposalId, setOpenProposalId] = useState<number | null>(null)
  const [proposals, setProposals] = useState<Record<number, { text: string; source?: ProposalSource }>>({})
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [statusIndex, setStatusIndex] = useState(0)
  const [scrolled, setScrolled] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<FetchOptions | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  const searchTarget = repoFilter ?? (multiMode ? (languages.length ? languages.join(", ") : "your stack") : language)
  const statusMessages = useMemo(
    () =>
      repoFilter
        ? [
            `Fetching open issues from ${repoFilter}.`,
            "Checking labels, complexity and freshness.",
            "Ranking by activity and quality.",
          ]
        : [
            `Scanning ${searchTarget} repos for beginner-friendly issues.`,
            "Checking labels, complexity and freshness.",
            "Cross-checking repo activity.",
            "Ranking the best matches.",
          ],
    [repoFilter, searchTarget]
  )

  useEffect(() => {
    if (!loading) return
    const timer = window.setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statusMessages.length)
    }, 1600)
    return () => window.clearInterval(timer)
  }, [loading, statusMessages.length])

  // Sorting is entirely client-side (`sortedIssues`), so changing it never refetches.
  // "Active repos only" is client-side too, so toggling it never wipes your results.
  function resetForNewFilters() {
    abortRef.current?.abort()
    setLoading(false)
    setLoadingMore(false)
    setSearched(false)
    setIssues([])
    setRepoFilter(null)
    setError(null)
    setLoadMoreError(null)
    setOpenProposalId(null)
  }

  async function flashCopied(key: string, text: string) {
    if (!(await copyText(text))) return
    setCopiedKey(key)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedKey(null), 1600)
  }

  async function toggleProposal(issue: Issue) {
    if (proposals[issue.id] || generatingId === issue.id) {
      setOpenProposalId(openProposalId === issue.id ? null : issue.id)
      return
    }
    setOpenProposalId(issue.id)
    setGeneratingId(issue.id)
    const lang = issue.matchedLanguage || issue.language || (multiMode ? languages[0] : language) || language
    const template = `Hi maintainers! 👋 I'm experienced with ${lang} and would love to work on "${issue.title}". Could you please assign this to me? Let me know if there are any specific guidelines to keep in mind!`
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: issue.title, repo: repoName(issue.repository_url), language: lang }),
      })
      const data = res.ok ? await res.json().catch(() => null) : null
      if (data && typeof data.proposal === "string" && data.proposal.trim()) {
        const source: ProposalSource | undefined =
          data.source === "fallback" ? "template" : data.source === "ai" ? "ai" : undefined
        setProposals((prev) => ({ ...prev, [issue.id]: { text: data.proposal, source } }))
      } else {
        setProposals((prev) => ({ ...prev, [issue.id]: { text: template, source: "template" } }))
      }
    } catch {
      setProposals((prev) => ({ ...prev, [issue.id]: { text: template, source: "template" } }))
    } finally {
      setGeneratingId(null)
    }
  }

  const sortedIssues = useMemo(() => {
    const arr = activeOnly ? issues.filter((i) => i.isActiveRepo !== false) : [...issues]

    const sortSlice = (slice: Issue[]) => {
      switch (sortBy) {
        case "least-commented": return slice.sort((a, b) => a.comments - b.comments)
        case "most-commented": return slice.sort((a, b) => b.comments - a.comments)
        case "most-reactions": return slice.sort((a, b) => (b.reactions?.total_count || 0) - (a.reactions?.total_count || 0))
        default: return slice.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    }

    // Multi-language search: sort inside each language, then interleave so every
    // selected language shows up near the top instead of one dominating the list.
    if (multiMode && languages.length > 1 && !repoFilter) {
      const groups: Record<string, Issue[]> = {}
      arr.forEach((issue) => {
        const langKey = (issue.matchedLanguage || issue.language || "Other").toLowerCase()
        if (!groups[langKey]) groups[langKey] = []
        groups[langKey].push(issue)
      })
      Object.keys(groups).forEach((key) => sortSlice(groups[key]))

      const interleaved: Issue[] = []
      const groupValues = Object.values(groups)
      const maxLen = Math.max(0, ...groupValues.map((g) => g.length))
      for (let i = 0; i < maxLen; i++) {
        for (const group of groupValues) {
          if (group[i]) interleaved.push(group[i])
        }
      }
      return interleaved
    }

    return sortSlice(arr)
  }, [issues, sortBy, activeOnly, multiMode, languages, repoFilter])

  async function fetchIssues(opts: FetchOptions = {}) {
    const p = opts.page ?? 1
    const reset = opts.reset ?? p === 1
    const repo = opts.repo !== undefined ? opts.repo : repoFilter
    const diff = opts.difficulty ?? difficulty
    const bounty = opts.bounty ?? bountyOnly
    const lang = opts.language ?? (multiMode ? languages.join(",") : language)
    lastRequestRef.current = { page: p, reset, repo, difficulty: diff, bounty, language: lang }

    // Only the newest request is allowed to touch state.
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    if (reset) {
      setLoading(true)
      setLoadingMore(false)
      setError(null)
      setLoadMoreError(null)
      setStatusIndex(0)
      mainRef.current?.scrollTo({ top: 0 })
    } else {
      setLoadingMore(true)
      setLoadMoreError(null)
    }

    try {
      const params = new URLSearchParams({ difficulty: diff, page: String(p), bounty: String(bounty), sort: sortBy })
      if (repo) params.set("repo", repo)
      else params.set("language", lang.toLowerCase())
      const res = await fetch(`/api/issues?${params.toString()}`, { signal: ctrl.signal })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new ApiError(typeof data?.error === "string" && data.error ? data.error : GENERIC_ERROR)
      const fetched: Issue[] = (data?.items || []).filter((i: Issue) => i.repository_url)
      window.dispatchEvent(new CustomEvent("usage:updated"))
      if (reset) {
        setIssues(fetched)
        setDone(false)
      } else {
        setIssues((prev) => {
          const seen = new Set(prev.map((i) => i.id))
          return [...prev, ...fetched.filter((i) => !seen.has(i.id))]
        })
      }
      if (fetched.length < PAGE_SIZE) setDone(true)
      setPage(p)
      setSearched(true)
    } catch (err) {
      if (ctrl.signal.aborted) return
      const message = err instanceof ApiError ? err.message : GENERIC_ERROR
      if (reset) {
        setIssues([])
        setSearched(false)
        setError(message)
      } else {
        setLoadMoreError(message)
      }
    } finally {
      if (abortRef.current === ctrl) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  function retry() {
    if (lastRequestRef.current) void fetchIssues(lastRequestRef.current)
  }
  function runSearch() {
    setRepoFilter(null)
    void fetchIssues({ page: 1, reset: true, repo: null })
    setMobileFiltersOpen(false)
  }
  function runTemplate(key: string) {
    setMultiMode(false)
    setLanguage(key)
    setLanguages([key])
    setRepoFilter(null)
    void fetchIssues({ page: 1, reset: true, language: key, repo: null })
  }
  function runQuickRepo(full: string) {
    setSearched(false)
    setIssues([])
    setMultiMode(false)
    setRepoFilter(full)
    void fetchIssues({ page: 1, reset: true, repo: full })
    setMobileFiltersOpen(false)
  }

  const count = sortedIssues.length
  const hiddenByActive = activeOnly && issues.length > 0 && count === 0
  const view: "loading" | "error" | "templates" | "empty" | "list" = loading
    ? "loading"
    : error
      ? "error"
      : !searched
        ? "templates"
        : count === 0
          ? "empty"
          : "list"
  const toolbarMode = view === "loading" ? "loading" : view === "list" || view === "empty" ? "results" : view === "templates" ? "templates" : "other"

  const filterProps = {
    language, setLanguage: (v: string) => { setLanguage(v); resetForNewFilters() },
    languages, setLanguages: (v: string[]) => { setLanguages(v); resetForNewFilters() },
    multiMode, setMultiMode,
    difficulty, setDifficulty: (v: Difficulty) => { setDifficulty(v); resetForNewFilters() },
    bountyOnly, setBountyOnly: (v: boolean) => { setBountyOnly(v); resetForNewFilters() },
    activeOnly, setActiveOnly,
    loading, onSearch: runSearch,
    repoFilter, onQuickRepo: runQuickRepo,
  }

  const filtersTrigger = (
    <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-3 text-[13px] font-semibold text-[#a8ff3e] outline-none transition-[background-color,transform] duration-150 hover:bg-[#a8ff3e]/15 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 active:scale-[0.97] lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" strokeWidth={2.25} />
          Filters
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="hunt-sheet flex max-h-[88dvh] flex-col gap-0 rounded-t-2xl border-white/10 bg-[#0b0b0b] p-0">
        <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-neutral-700" />
        <SheetHeader className="shrink-0 gap-0 px-5 pb-1 pt-3 text-left md:px-8">
          <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-neutral-100">
            <SlidersHorizontal className="h-4 w-4 text-neutral-400" strokeWidth={2.25} />
            Filters
          </SheetTitle>
          <SheetDescription className="sr-only">Choose a language, difficulty and options, then search for issues.</SheetDescription>
        </SheetHeader>
        <FiltersPanel variant="sheet" {...filterProps} />
      </SheetContent>
    </Sheet>
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="hunt-root flex h-[100dvh] flex-col overflow-hidden bg-[#090909] font-sans text-neutral-200 antialiased"
        style={{ colorScheme: "dark" }}
      >
        <style>{HUNT_CSS}</style>

        <Navbar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden w-[300px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0b0b0b] lg:flex">
            <FiltersPanel variant="sidebar" {...filterProps} />
          </aside>

          {/* Main */}
          <main
            ref={mainRef}
            onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
            aria-busy={loading}
            className="hunt-scroll min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
          >
            <h1 className="sr-only lg:hidden">Hunt Issues</h1>

            <ResultsToolbar
              leading={filtersTrigger}
              scrolled={scrolled}
              busy={loading || loadingMore}
              mode={toolbarMode}
              count={count}
              difficulty={difficulty}
              language={language}
              languages={languages}
              multiMode={multiMode}
              repoFilter={repoFilter}
              bountyOnly={bountyOnly}
              activeOnly={activeOnly}
              sortBy={sortBy}
              setSortBy={setSortBy}
              onClearRepo={runSearch}
            />

            {/* Loading */}
            {view === "loading" && (
              <div className="mx-auto w-full max-w-6xl sm:px-6 sm:py-6">
                <div role="status" className="flex items-center gap-2.5 px-4 pb-3 pt-4 text-[13px] text-neutral-400 sm:px-1 sm:pt-0">
                  <span className="sr-only">Searching for issues</span>
                  <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/15 border-t-[#a8ff3e]" />
                  <span key={statusIndex} aria-hidden="true" className="hunt-fade">
                    {statusMessages[statusIndex % statusMessages.length]}
                  </span>
                </div>
                <ul aria-hidden="true" className="divide-y divide-white/[0.05] overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
                  {Array.from({ length: 8 }, (_, i) => (
                    <SkeletonRow key={i} i={i} />
                  ))}
                </ul>
              </div>
            )}

            {/* Error */}
            {view === "error" && (
              <StatePanel
                role="alert"
                tone="danger"
                icon={<AlertIcon className="h-5 w-5" />}
                title="Couldn't load issues"
                message={error}
              >
                <Button type="button" onClick={retry} className={LIME_BTN}>
                  <RefreshCw className="h-4 w-4" strokeWidth={2.25} />
                  Try again
                </Button>
              </StatePanel>
            )}

            {/* Templates (before the first search) */}
            {view === "templates" && (
              <div className="relative flex min-h-[calc(100%-1px)] flex-col items-center justify-center overflow-hidden px-4 py-10 sm:py-14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    WebkitMaskImage: "radial-gradient(circle at center, black 35%, transparent 78%)",
                    maskImage: "radial-gradient(circle at center, black 35%, transparent 78%)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-72"
                  style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(255,255,255,0.06), transparent)" }}
                />
                <div className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
                  <span className="hunt-rise mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] py-1 pl-2 pr-3 text-[12px] font-medium text-neutral-300">
                    <HuntMark className="h-4 w-4" />
                    Real bugs from real repos
                  </span>
                  <h2
                    className="hunt-rise mb-3 bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-balance text-[28px] font-semibold leading-tight tracking-tight text-transparent sm:text-4xl md:text-[44px]"
                    style={cssVars({ "--d": "60ms" })}
                  >
                    What do you want to hunt today?
                  </h2>
                  <p
                    className="hunt-rise mb-9 max-w-xl text-[14.5px] leading-relaxed text-neutral-400 sm:mb-12 sm:text-base"
                    style={cssVars({ "--d": "110ms" })}
                  >
                    Pick a starting point, or set your language and difficulty in the filters and press Search.
                  </p>
                  <div className="grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    {TEMPLATES.map((t, i) => (
                      <TemplateCard key={t.key} t={t} index={i + 2} onRun={runTemplate} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No matches */}
            {view === "empty" &&
              (hiddenByActive ? (
                <StatePanel
                  role="status"
                  icon={<Zap className="h-5 w-5" strokeWidth={2} />}
                  title="Hidden by “Active repos only”"
                  message={`${issues.length} ${issues.length === 1 ? "issue was" : "issues were"} found, but ${issues.length === 1 ? "its repo has" : "their repos have"} no recent merged PRs.`}
                >
                  <Button type="button" onClick={() => setActiveOnly(false)} className={LIME_BTN}>
                    Show {issues.length === 1 ? "it" : "them"}
                  </Button>
                </StatePanel>
              ) : (
                <StatePanel
                  role="status"
                  icon={<Search className="h-5 w-5" strokeWidth={2} />}
                  title="No issues matched"
                  message="Try a different language or difficulty, or loosen the extra filters."
                >
                  {bountyOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      className={OUTLINE_BTN}
                      onClick={() => {
                        setBountyOnly(false)
                        void fetchIssues({ page: 1, reset: true, bounty: false })
                      }}
                    >
                      <Coins className="h-4 w-4" strokeWidth={2} />
                      Include unpaid issues
                    </Button>
                  )}
                  {repoFilter && (
                    <Button type="button" variant="outline" className={OUTLINE_BTN} onClick={runSearch}>
                      Search by language instead
                    </Button>
                  )}
                </StatePanel>
              ))}

            {/* Issue list */}
            {view === "list" && (
              <div className="mx-auto w-full max-w-6xl sm:px-6 sm:py-6">
                <ul className="divide-y divide-white/[0.05] overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
                  {sortedIssues.map((issue, i) => {
                    const proposal = proposals[issue.id]
                    const open = openProposalId === issue.id
                    const generating = generatingId === issue.id
                    return (
                      <IssueRow
                        key={issue.id}
                        issue={issue}
                        index={i}
                        difficulty={difficulty}
                        showLanguage={multiMode}
                        copied={copiedKey === `repo:${issue.id}`}
                        proposalOpen={open}
                        proposalGenerating={generating}
                        onCopyRepo={() => void flashCopied(`repo:${issue.id}`, `https://github.com/${repoName(issue.repository_url)}`)}
                        onToggleProposal={() => void toggleProposal(issue)}
                      >
                        {open && !issue.isLocked && (
                          <ProposalPanel
                            issue={issue}
                            text={proposal?.text ?? ""}
                            source={proposal?.source}
                            generating={generating && !proposal}
                            copied={copiedKey === `proposal:${issue.id}`}
                            onChange={(v) => setProposals((prev) => ({ ...prev, [issue.id]: { ...prev[issue.id], text: v } }))}
                            onCopy={() => void flashCopied(`proposal:${issue.id}`, proposal?.text ?? "")}
                          />
                        )}
                      </IssueRow>
                    )
                  })}
                  {loadingMore && [0, 1].map((i) => <SkeletonRow key={`more-${i}`} i={i + 2} />)}
                </ul>

                <div className="px-4 py-5 sm:px-0">
                  {loadMoreError && (
                    <div
                      role="alert"
                      className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-4 py-3 text-[13px] text-rose-200"
                    >
                      <span className="flex items-center gap-2">
                        <AlertIcon className="h-4 w-4 shrink-0 text-rose-400" />
                        {loadMoreError}
                      </span>
                      <button
                        type="button"
                        onClick={retry}
                        className="rounded font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60"
                      >
                        Try again
                      </button>
                    </div>
                  )}
                  {!done && !loadingMore && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void fetchIssues({ page: page + 1 })}
                      className={cn(OUTLINE_BTN, "h-11 w-full border-dashed text-neutral-300")}
                    >
                      Load more issues
                    </Button>
                  )}
                  {done && (
                    <p className="text-center font-mono text-[12px] text-neutral-400">
                      End of results · {count} {count === 1 ? "issue" : "issues"}
                    </p>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}

// The root layout already provides the SessionProvider. Keeping a second
// provider here causes the auth state to rehydrate twice and can trigger the
// redirect loop users were seeing after a successful sign-in.
export default function Hunt() {
  return (
    <RequireAuth>
      <HuntClient />
    </RequireAuth>
  )
}