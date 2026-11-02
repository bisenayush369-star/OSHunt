"use client"

import Link from "next/link"
import { Dialog as DialogPrimitive } from "radix-ui"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import {
  Accessibility,
  Archive,
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Clock,
  Coins,
  Copy,
  Eye,
  FlaskConical,
  Focus,
  FolderGit2,
  Gauge,
  GitFork,
  GitPullRequest,
  Globe,
  GraduationCap,
  Info as InfoIcon,
  Layers,
  Lightbulb,
  Lock,
  MapPin,
  MessageSquare,
  MessagesSquare,
  Minus,
  Package,
  Palette,
  PenLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  SmilePlus,
  Star,
  Tag,
  UserCheck,
  UserRound,
  Users,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import Navbar from "@/components/ui/Navbar"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { BookmarkButton } from "@/components/bookmarks/BookmarkButton"
import { cn } from "@/components/lib/utils"
import {
  TECHNOLOGIES as LANGUAGE_OPTIONS,
  CATEGORY_ORDER,
  POPULAR_VALUES,
  TECH_BY_VALUE,
  type TechOption as LanguageOption,
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
const DEFAULT_PICKS = ["JavaScript"]
const MAX_PICKS = 6 // the server searches once per pick, so it enforces the same cap

interface Label {
  name: string
  color?: string
}

interface Issue {
  id: number
  html_url: string
  title: string
  repository_url: string
  created_at: string
  updated_at?: string
  comments: number
  reactions: Record<string, number>
  body?: string | null
  labels?: Label[]
  assignees?: { login: string }[]
  user?: { login: string } | null
  /** GitHub's relationship of the author to the repo: OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, NONE… */
  author_association?: string
  isLocked?: boolean
  isActiveRepo?: boolean
  /** The pick this issue was found under (e.g. "React", "Next.js", "JavaScript"), set by the server.
   *  It is what the row badge shows, so it is not always the repo's own language. */
  matchedLanguage?: string
  /** Repo's primary language, e.g. "Python" / "Vue". */
  language?: string
  /** ISO date of the repo's last merged PR. null when the server answered from its cache. */
  repoLastActivityAt?: string | null
}

interface FetchOptions {
  page?: number
  reset?: boolean
  picks?: string[]
  bounty?: boolean
  difficulty?: Difficulty
}

type ProposalSource = "ai" | "template"
/** Why the plain template is showing instead of an AI draft (the server says). */
type ProposalWhy = "timeout" | "unavailable" | "rejected"
/** One claiming comment. The template is there at once; while `waiting`, an AI draft may still replace it, never over text the person has edited. */
interface Proposal {
  text: string
  source: ProposalSource
  waiting: boolean
  edited: boolean
  why?: ProposalWhy
}

const DIFFICULTIES = ["easy", "medium", "hard", "extreme"] as const
type Difficulty = (typeof DIFFICULTIES)[number]
const DEFAULT_DIFFICULTY: Difficulty = "easy"

/** Difficulty is a dot plus the word, so colour is never the only cue. `rule` is what the server really filters on. */
const DIFF: Record<Difficulty, { label: string; dot: string; rule: string }> = {
  easy: { label: "Easy", dot: "bg-emerald-400", rule: "good first issue" },
  medium: { label: "Medium", dot: "bg-amber-400", rule: "help wanted" },
  hard: { label: "Hard", dot: "bg-rose-400", rule: "complex or bug" },
  extreme: { label: "Extreme", dot: "bg-red-500", rule: "bug or breaking change" },
}

// Sorting reorders what is already loaded, it never refetches. Every key below comes with the search results.
type SortBy = "newest" | "updated" | "least-commented" | "most-commented" | "most-reactions" | "unassigned"
interface SortOption {
  value: SortBy
  label: string
  short: string
  hint: string
  icon: LucideIcon
}
const SORT_GROUPS: { label: string; options: SortOption[] }[] = [
  {
    label: "Freshness",
    options: [
      { value: "newest", label: "Newest first", short: "Newest", hint: "Most recently opened", icon: Clock },
      { value: "updated", label: "Recently active", short: "Active", hint: "Latest activity first", icon: RefreshCw },
    ],
  },
  {
    label: "Discussion",
    options: [
      { value: "least-commented", label: "Least commented", short: "Least commented", hint: "Quiet, uncontested issues", icon: MessageSquare },
      { value: "most-commented", label: "Most commented", short: "Most commented", hint: "Active conversation", icon: MessagesSquare },
      { value: "most-reactions", label: "Most reactions", short: "Most reactions", hint: "What the community wants", icon: SmilePlus },
    ],
  },
  {
    label: "Claiming",
    options: [{ value: "unassigned", label: "Unassigned first", short: "Unassigned first", hint: "Nobody is working on it yet", icon: UserCheck }],
  },
]
const SORT_OPTIONS = SORT_GROUPS.flatMap((g) => g.options)

/**
 * Starting points: stacks people really combine. Every card runs exactly the picks listed, at Easy, and its text is
 * written from those picks (see startDesc), so it never promises more than the search does. Only a few are on screen
 * at a time (Shuffle deals a new set, one from each area first), and every pick is a label from the stack picker.
 */
type StartArea = "web" | "backend" | "data" | "mobile" | "systems" | "cloud" | "games"
const START_AREAS: StartArea[] = ["web", "backend", "data", "mobile", "systems", "cloud", "games"]
const DECK_SIZE = 8

const TEMPLATES: { key: string; title: string; picks: string[]; area: StartArea }[] = [
  // Frontend and full stack
  { key: "react", title: "React & Next.js", picks: ["React", "Next.js"], area: "web" },
  { key: "t3", title: "Next.js, Prisma & PostgreSQL", picks: ["Next.js", "Prisma", "PostgreSQL"], area: "web" },
  { key: "vue", title: "Vue & Nuxt", picks: ["Vue", "Nuxt"], area: "web" },
  { key: "svelte", title: "Svelte & SvelteKit", picks: ["Svelte", "SvelteKit"], area: "web" },
  { key: "react-tw", title: "React, TypeScript & Tailwind", picks: ["React", "TypeScript", "Tailwind CSS"], area: "web" },
  { key: "astro", title: "Astro & Tailwind", picks: ["Astro", "Tailwind CSS"], area: "web" },
  { key: "angular", title: "Angular & TypeScript", picks: ["Angular", "TypeScript"], area: "web" },
  { key: "shadcn", title: "shadcn/ui & Radix UI", picks: ["shadcn/ui", "Radix UI"], area: "web" },
  { key: "vite", title: "Vite & Vitest", picks: ["Vite", "Vitest"], area: "web" },
  { key: "jest", title: "Jest & Testing Library", picks: ["Jest", "Testing Library"], area: "web" },
  // Servers and APIs
  { key: "node", title: "Node.js & Express", picks: ["Node.js", "Express"], area: "backend" },
  { key: "nest", title: "NestJS & PostgreSQL", picks: ["NestJS", "PostgreSQL"], area: "backend" },
  { key: "python", title: "Python & Django", picks: ["Python", "Django"], area: "backend" },
  { key: "fastapi", title: "FastAPI & PostgreSQL", picks: ["FastAPI", "PostgreSQL"], area: "backend" },
  { key: "flask", title: "Flask & SQLite", picks: ["Flask", "SQLite"], area: "backend" },
  { key: "spring", title: "Spring Boot & Hibernate", picks: ["Spring Boot", "Hibernate"], area: "backend" },
  { key: "php", title: "PHP & Laravel", picks: ["PHP", "Laravel"], area: "backend" },
  { key: "ruby", title: "Ruby & Rails", picks: ["Ruby", "Ruby on Rails"], area: "backend" },
  { key: "phoenix", title: "Elixir & Phoenix", picks: ["Elixir", "Phoenix"], area: "backend" },
  { key: "dotnet", title: "C# & ASP.NET Core", picks: ["C#", "ASP.NET Core"], area: "backend" },
  { key: "mern", title: "Express, MongoDB & Mongoose", picks: ["Express", "MongoDB", "Mongoose"], area: "backend" },
  { key: "trpc", title: "TypeScript, tRPC & Prisma", picks: ["TypeScript", "tRPC", "Prisma"], area: "backend" },
  { key: "hono", title: "Hono & Cloudflare", picks: ["Hono", "Cloudflare"], area: "backend" },
  { key: "graphql", title: "GraphQL & Node.js", picks: ["GraphQL", "Node.js"], area: "backend" },
  // Data and AI
  { key: "pandas", title: "Pandas, NumPy & Jupyter", picks: ["Pandas", "NumPy", "Jupyter"], area: "data" },
  { key: "torch", title: "PyTorch & Hugging Face", picks: ["PyTorch", "Hugging Face"], area: "data" },
  { key: "langchain", title: "LangChain & OpenAI", picks: ["LangChain", "OpenAI"], area: "data" },
  { key: "llama", title: "LlamaIndex & Ollama", picks: ["LlamaIndex", "Ollama"], area: "data" },
  { key: "tf", title: "Python & TensorFlow", picks: ["Python", "TensorFlow"], area: "data" },
  { key: "plots", title: "NumPy & Matplotlib", picks: ["NumPy", "Matplotlib"], area: "data" },
  // Mobile
  { key: "expo", title: "React Native & Expo", picks: ["React Native", "Expo"], area: "mobile" },
  { key: "flutter", title: "Flutter & Dart", picks: ["Flutter", "Dart"], area: "mobile" },
  { key: "java", title: "Java & Android", picks: ["Java", "Android"], area: "mobile" },
  { key: "kotlin", title: "Kotlin & Android", picks: ["Kotlin", "Android"], area: "mobile" },
  { key: "swift", title: "Swift & iOS", picks: ["Swift", "iOS"], area: "mobile" },
  // Systems
  { key: "rust", title: "Rust", picks: ["Rust"], area: "systems" },
  { key: "tauri", title: "Rust & Tauri", picks: ["Rust", "Tauri"], area: "systems" },
  { key: "cpp", title: "C & C++", picks: ["C", "C++"], area: "systems" },
  { key: "zig", title: "Zig", picks: ["Zig"], area: "systems" },
  { key: "go", title: "Go", picks: ["Go"], area: "systems" },
  { key: "beam", title: "Elixir & Erlang", picks: ["Elixir", "Erlang"], area: "systems" },
  // Cloud and data stores
  { key: "godocker", title: "Go & Docker", picks: ["Go", "Docker"], area: "cloud" },
  { key: "k8s", title: "Docker & Kubernetes", picks: ["Docker", "Kubernetes"], area: "cloud" },
  { key: "iac", title: "Terraform & AWS", picks: ["Terraform", "AWS"], area: "cloud" },
  { key: "gok8s", title: "Go & Kubernetes", picks: ["Go", "Kubernetes"], area: "cloud" },
  { key: "cache", title: "Redis & PostgreSQL", picks: ["Redis", "PostgreSQL"], area: "cloud" },
  { key: "supabase", title: "Supabase & Next.js", picks: ["Supabase", "Next.js"], area: "cloud" },
  // Games
  { key: "godot", title: "Godot", picks: ["Godot"], area: "games" },
  { key: "unity", title: "Unity & C#", picks: ["Unity", "C#"], area: "games" },
  { key: "bevy", title: "Bevy & Rust", picks: ["Bevy", "Rust"], area: "games" },
  { key: "unreal", title: "Unreal Engine & C++", picks: ["Unreal Engine", "C++"], area: "games" },
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
/** "https://api.github.com/repos/owner/name" becomes "owner/name". */
function repoName(url: string) {
  return url.replace(/^.*\/repos\//, "")
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


/** SSR-safe media query. The server snapshot is `false`, so the first paint matches the phone layout. */
function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

const COMPACT_FORMAT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
/** 1 234 → "1.2K". Small numbers stay exact. */
function compact(n: number) {
  return n < 1000 ? String(n) : COMPACT_FORMAT.format(n)
}

function issueNumber(url: string) {
  const m = /\/issues\/(\d+)/.exec(url)
  return m ? Number(m[1]) : null
}

/** Only http(s) URLs ever reach an href. Anything else (javascript:, data:, junk) becomes null. */
function safeUrl(url: string | null | undefined) {
  if (!url) return null
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
  } catch {
    return null
  }
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function avatarUrl(login: string, px = 72) {
  return `https://github.com/${encodeURIComponent(login)}.png?size=${px}`
}

function clockTime(ms: number) {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/** GitHub's own language colours for the common ones; anything else gets a stable neutral. */
const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Java: "#b07219", Go: "#00ADD8",
  Rust: "#dea584", C: "#555555", "C++": "#f34b7d", "C#": "#178600", PHP: "#4F5D95", Ruby: "#701516",
  Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB", Shell: "#89e051", HTML: "#e34c26",
  CSS: "#563d7c", SCSS: "#c6538c", Vue: "#41b883", Svelte: "#ff3e00", Lua: "#000080", Scala: "#c22d40",
  Elixir: "#6e4a7e", Haskell: "#5e5086", "Jupyter Notebook": "#DA5B0B", "Objective-C": "#438eff",
  R: "#198CE7", Perl: "#0298c3", Dockerfile: "#384d54", Makefile: "#427819", Nix: "#7e7eff",
  Zig: "#ec915c", Clojure: "#db5855", OCaml: "#ef7a08", PowerShell: "#012456", Assembly: "#6E4C13",
  CMake: "#DA3434", Cuda: "#3A4E3A", Starlark: "#76d275", MDX: "#fcb32c", Astro: "#ff5a03",
  Julia: "#a270ba", Erlang: "#B83998", "F#": "#b845fc", Batchfile: "#C1F12E", "Vim Script": "#199f4b",
}
const FALLBACK_LANG_COLORS = ["#8b95a5", "#6b7280", "#9ca3af", "#7c8798", "#a1a1aa"]
function langColor(name: string) {
  const known = LANG_COLORS[name]
  if (known) return known
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_LANG_COLORS[h % FALLBACK_LANG_COLORS.length]
}

/** Whole days since an ISO timestamp, or null when it is missing or unreadable. */
function daysSince(iso: string | null | undefined) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86_400_000)
}

/**
 * Turns an issue body (markdown/HTML) into a short plain-text teaser. It is shown as text, never as HTML.
 * Line breaks are kept (one per paragraph or heading) so "Steps to reproduce" does not run into the sentence before it.
 */
function plainExcerpt(body: string | null | undefined, max = 320) {
  if (!body) return null
  const text = body
    .replace(/\r/g, "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<https?:[^>]*>/g, " ")
    // Only real (lowercase) HTML tags: a component name like <Suspense> in the text is content, not markup.
    .replace(/<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?\/?>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s*/gm, "")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|~~)(.+?)\1/g, "$2")
    .replace(/\(\s*(?:see|cf\.?|via)?\s*\)/gi, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/ +([.,;:!?])/g, "$1")
    .trim()
  if (!text) return null
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, "")}…` : text
}

/** "SSRF guard re-resolves DNS" becomes "ssrf-guard-re-resolves-dns", for branch names. */
function slugify(text: string, max = 36) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "")
}

/** Which button just copied something, for 1.6 seconds. */
function useCopied() {
  const [key, setKey] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )
  const copy = useCallback(async (k: string, text: string) => {
    if (!(await copyText(text))) return
    setKey(k)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setKey(null), 1600)
  }, [])
  return [key, copy] as const
}

/** What the person asking to claim an issue should know before posting, read straight from the search result. */
function claimSignals(issue: Issue) {
  const assignees = (issue.assignees ?? []).map((a) => a.login)
  const maintainer = ["OWNER", "MEMBER", "COLLABORATOR"].includes(issue.author_association ?? "")
  return { assignees, maintainer }
}

/** Brand colours of dark logos (Next.js, Express, Vercel...) vanish on a dark page, so those fall back to a light grey. */
function techColor(option?: { iconColor: string }) {
  const hex = option?.iconColor
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return "#a3a3a3"
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.12 ? "#d4d4d4" : hex
}

// ── The search in the address bar ────────────────────────────────────────────
// Only the recipe of a search goes in the URL: stack, level and two switches. Nothing about the person is ever in it,
// and everything read back is checked against the stack list, so a hand-edited link can do no more than fill in the form.

interface Recipe {
  picks: string[]
  difficulty: Difficulty
  bounty: boolean
  active: boolean
}

const TECH_LABEL_BY_VALUE = new Map(LANGUAGE_OPTIONS.map((o): [string, string] => [o.value, o.label]))
const TECH_VALUE_BY_LABEL = new Map(LANGUAGE_OPTIONS.map((o): [string, string] => [o.label, o.value]))

/** "?stack=nextjs,prisma&level=easy" becomes a recipe. Unknown stacks and levels are dropped; null means there is nothing to restore (or only the defaults). */
function recipeFromSearch(search: string): Recipe | null {
  const q = new URLSearchParams(search)
  const stack = (q.get("stack") ?? "").slice(0, 300).split(",")
  const picks = [...new Set(stack.map((v) => TECH_LABEL_BY_VALUE.get(v.trim().toLowerCase())).filter((l): l is string => !!l))].slice(0, MAX_PICKS)
  const level = DIFFICULTIES.find((d) => d === q.get("level"))
  const bounty = q.get("bounty") === "1"
  const active = q.get("active") === "1"
  const recipe: Recipe = { picks: picks.length > 0 ? picks : DEFAULT_PICKS, difficulty: level ?? DEFAULT_DIFFICULTY, bounty, active }
  return recipeToSearch(recipe) === "" ? null : recipe
}

/** The query for a recipe, without the "?". Anything left at its default is left out, so the plain page keeps its plain address. */
function recipeToSearch(r: Recipe) {
  const parts: string[] = []
  const values = r.picks.map((label) => TECH_VALUE_BY_LABEL.get(label)).filter((v): v is string => !!v)
  const isDefault = r.picks.length === DEFAULT_PICKS.length && r.picks.every((label, i) => label === DEFAULT_PICKS[i])
  if (values.length > 0 && !isDefault) parts.push(`stack=${values.join(",")}`)
  if (r.difficulty !== DEFAULT_DIFFICULTY) parts.push(`level=${r.difficulty}`)
  if (r.bounty) parts.push("bounty=1")
  if (r.active) parts.push("active=1")
  return parts.join("&")
}

// ────────────────────────────────────────────────────────────────────────────
// GitHub data for the details drawer
//
// Calls GitHub's public REST API straight from the browser, so there is no token
// and the limit is 60 requests/hour per IP. To stay inside it: the issue itself comes
// from the search result (no request), every section loads (and fails) on its own,
// results are cached for 10 minutes (memory + sessionStorage), identical in-flight
// requests are shared, the deeper views (comments, linked PRs, people, more issues)
// only load when opened, and after a rate-limit response nothing more is sent until
// the reset time. A server route holding a token would lift the cap.
// ────────────────────────────────────────────────────────────────────────────

type Part<T> =
  | { status: "loading" }
  | { status: "ok"; data: T }
  | { status: "empty" }
  | { status: "error"; reason: "rate" | "missing" | "network"; resetAt?: number }

interface RepoInfo {
  description: string | null
  stars: number
  forks: number
  watchers: number
  openIssues: number
  license: string | null
  topics: string[]
  homepage: string | null
  language: string | null
  pushedAt: string | null
  createdAt: string | null
  archived: boolean
  htmlUrl: string | null
}
interface IssueInfo {
  state: string
  author: string | null
  /** The author's relationship to the repo (OWNER, MEMBER, COLLABORATOR, CONTRIBUTOR, NONE...). */
  association: string | null
  assignees: string[]
  labels: { name: string; color: string }[]
  excerpt: string | null
}
interface LangShare {
  name: string
  pct: number
}
interface CommitInfo {
  sha: string
  message: string
  author: string
  login: string | null
  date: string | null
  url: string | null
}
interface Contributor {
  login: string
  contributions: number
  url: string | null
}
interface ReleaseInfo {
  tag: string
  name: string | null
  publishedAt: string | null
  url: string | null
}
interface CommunityInfo {
  score: number | null
  contributing: boolean
  contributingUrl: string | null
  conduct: boolean
  issueTemplate: boolean
  prTemplate: boolean
}
interface CommentInfo {
  id: number
  login: string | null
  date: string | null
  text: string
  url: string | null
}
interface LinkedPr {
  number: number
  title: string
  state: "open" | "merged" | "closed"
  url: string | null
  author: string | null
}
interface UserInfo {
  login: string
  name: string | null
  bio: string | null
  company: string | null
  location: string | null
  followers: number
  repos: number
  since: string | null
  url: string | null
  isOrg: boolean
}

interface RepoDetails {
  repo: Part<RepoInfo>
  languages: Part<LangShare[]>
  commits: Part<CommitInfo[]>
  contributors: Part<Contributor[]>
  release: Part<ReleaseInfo>
  community: Part<CommunityInfo>
}

const LOADING: Part<never> = { status: "loading" }
const EMPTY: Part<never> = { status: "empty" }
const LOADING_DETAILS: RepoDetails = {
  repo: LOADING,
  languages: LOADING,
  commits: LOADING,
  contributors: LOADING,
  release: LOADING,
  community: LOADING,
}

// ── Parsers: untrusted JSON in, small typed objects out ──────────────────────

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v)
const asStr = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null)
const asNum = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0)
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const loginOf = (v: unknown): string | null => (isObj(v) ? asStr(v.login) : null)

function parseRepo(raw: unknown): RepoInfo | null {
  if (!isObj(raw)) return null
  const lic = isObj(raw.license) ? raw.license : null
  const spdx = lic ? asStr(lic.spdx_id) : null
  return {
    description: asStr(raw.description),
    stars: asNum(raw.stargazers_count),
    forks: asNum(raw.forks_count),
    watchers: asNum(raw.subscribers_count),
    openIssues: asNum(raw.open_issues_count),
    license: lic ? (spdx && spdx !== "NOASSERTION" ? spdx : (asStr(lic.name) ?? "Other")) : null,
    topics: asArr(raw.topics).filter((t): t is string => typeof t === "string").slice(0, 12),
    homepage: safeUrl(asStr(raw.homepage)),
    language: asStr(raw.language),
    pushedAt: asStr(raw.pushed_at),
    createdAt: asStr(raw.created_at),
    archived: raw.archived === true,
    htmlUrl: safeUrl(asStr(raw.html_url)),
  }
}

function parseLanguages(raw: unknown): LangShare[] {
  if (!isObj(raw)) return []
  const entries = Object.entries(raw).filter((e): e is [string, number] => typeof e[1] === "number" && e[1] > 0)
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  if (!total) return []
  entries.sort((a, b) => b[1] - a[1])
  const top = entries.slice(0, 5).map(([name, bytes]) => ({ name, pct: (bytes / total) * 100 }))
  const rest = entries.slice(5).reduce((sum, [, bytes]) => sum + bytes, 0)
  return rest > 0 ? [...top, { name: "Other", pct: (rest / total) * 100 }] : top
}

function parseCommits(raw: unknown): CommitInfo[] {
  return asArr(raw)
    .flatMap((c) => {
      if (!isObj(c)) return []
      const sha = asStr(c.sha)
      const commit = isObj(c.commit) ? c.commit : null
      const message = commit ? asStr(commit.message) : null
      if (!sha || !message) return []
      const meta = commit && isObj(commit.author) ? commit.author : null
      const login = loginOf(c.author)
      return [
        {
          sha,
          message: message.split("\n")[0].slice(0, 200),
          author: login ?? (meta ? asStr(meta.name) : null) ?? "unknown",
          login,
          date: meta ? asStr(meta.date) : null,
          url: safeUrl(asStr(c.html_url)),
        },
      ]
    })
    .slice(0, 5)
}

function parseContributors(raw: unknown): Contributor[] {
  return asArr(raw)
    .flatMap((c) => {
      if (!isObj(c)) return []
      const login = asStr(c.login)
      if (!login || c.type === "Bot" || login.endsWith("[bot]")) return []
      return [{ login, contributions: asNum(c.contributions), url: safeUrl(asStr(c.html_url)) }]
    })
    .slice(0, 8)
}

function parseRelease(raw: unknown): ReleaseInfo | null {
  if (!isObj(raw)) return null
  const tag = asStr(raw.tag_name)
  if (!tag) return null
  return {
    tag,
    name: asStr(raw.name),
    publishedAt: asStr(raw.published_at),
    url: safeUrl(asStr(raw.html_url)),
  }
}

function parseCommunity(raw: unknown): CommunityInfo | null {
  if (!isObj(raw)) return null
  const files = isObj(raw.files) ? raw.files : {}
  const has = (key: string) => isObj(files[key])
  const contributing = isObj(files.contributing) ? files.contributing : null
  return {
    score: typeof raw.health_percentage === "number" ? raw.health_percentage : null,
    contributing: has("contributing"),
    contributingUrl: contributing ? safeUrl(asStr(contributing.html_url)) : null,
    conduct: has("code_of_conduct") || has("code_of_conduct_file"),
    issueTemplate: has("issue_template"),
    prTemplate: has("pull_request_template"),
  }
}

/** Phrases that usually mean "I'd like to take this". A hint for the claim check, never a verdict. */
const CLAIM_PHRASE =
  /\b(can i (?:take|work|pick|try|have|help)|may i (?:take|work|pick|try)|i(?:'d| would) (?:like|love) to (?:work|take|pick|try|help|tackle)|i(?:'ll| will| can) (?:take|work on|pick|try|tackle|handle) (?:this|it)|assign (?:this|it)? ?(?:to )?me|working on (?:this|it)|i(?:'m| am) (?:on it|working on|taking)|let me (?:take|work|try)|take this)\b/i

function parseComments(raw: unknown): CommentInfo[] {
  return asArr(raw)
    .flatMap((c) => {
      if (!isObj(c)) return []
      const id = asNum(c.id)
      if (!id) return []
      return [
        {
          id,
          login: loginOf(c.user),
          date: asStr(c.created_at),
          text: plainExcerpt(asStr(c.body), 280) ?? "",
          url: safeUrl(asStr(c.html_url)),
        },
      ]
    })
    .slice(0, 30)
}

/** Pull requests that mention the issue, from its timeline. */
function parseTimeline(raw: unknown): LinkedPr[] {
  const seen = new Set<number>()
  return asArr(raw)
    .flatMap((e): LinkedPr[] => {
      if (!isObj(e) || e.event !== "cross-referenced" || !isObj(e.source)) return []
      const src = isObj(e.source.issue) ? e.source.issue : null
      if (!src || !isObj(src.pull_request)) return []
      const number = asNum(src.number)
      const title = asStr(src.title)
      if (!number || !title || seen.has(number)) return []
      seen.add(number)
      const state: LinkedPr["state"] = asStr(src.pull_request.merged_at) ? "merged" : src.state === "open" ? "open" : "closed"
      return [{ number, title: title.slice(0, 160), state, url: safeUrl(asStr(src.html_url)), author: loginOf(src.user) }]
    })
    .slice(0, 6)
}

function parseUser(raw: unknown): UserInfo | null {
  if (!isObj(raw)) return null
  const login = asStr(raw.login)
  if (!login) return null
  return {
    login,
    name: asStr(raw.name),
    bio: asStr(raw.bio)?.slice(0, 280) ?? null,
    company: asStr(raw.company),
    location: asStr(raw.location),
    followers: asNum(raw.followers),
    repos: asNum(raw.public_repos),
    since: asStr(raw.created_at),
    url: safeUrl(asStr(raw.html_url)),
    isOrg: raw.type === "Organization",
  }
}

/** Other open good-first-issues of the same repo, in the same shape as a search result so the drawer can switch to one. */
function parseSiblings(raw: unknown): Issue[] {
  if (!isObj(raw)) return []
  return asArr(raw.items)
    .flatMap((it): Issue[] => {
      if (!isObj(it)) return []
      const id = asNum(it.id)
      const html = safeUrl(asStr(it.html_url))
      const title = asStr(it.title)
      const repo = asStr(it.repository_url)
      const created = asStr(it.created_at)
      if (!id || !html || !title || !repo || !created) return []
      const reactions: Record<string, number> = {}
      if (isObj(it.reactions)) for (const [k, v] of Object.entries(it.reactions)) if (typeof v === "number") reactions[k] = v
      return [
        {
          id,
          html_url: html,
          title,
          repository_url: repo,
          created_at: created,
          updated_at: asStr(it.updated_at) ?? undefined,
          comments: asNum(it.comments),
          reactions,
          body: asStr(it.body),
          labels: asArr(it.labels).flatMap((l) => (isObj(l) && asStr(l.name) ? [{ name: String(l.name), color: asStr(l.color) ?? undefined }] : [])),
          assignees: asArr(it.assignees).flatMap((a) => {
            const login = loginOf(a)
            return login ? [{ login }] : []
          }),
          user: loginOf(it.user) ? { login: String(loginOf(it.user)) } : null,
          author_association: asStr(it.author_association) ?? undefined,
        },
      ]
    })
    .slice(0, 12)
}

/** The issue's own facts, read from the search result: no request, so the drawer shows them immediately. */
function issueInfoOf(issue: Issue): IssueInfo {
  return {
    state: "open",
    author: issue.user?.login ?? null,
    association: issue.author_association ?? null,
    assignees: (issue.assignees ?? []).map((a) => a.login),
    labels: (issue.labels ?? []).slice(0, 8).map((l) => ({
      name: l.name,
      color: l.color && /^[0-9a-fA-F]{6}$/.test(l.color) ? `#${l.color}` : "#8b95a5",
    })),
    excerpt: plainExcerpt(issue.body),
  }
}

// ── Fetch + cache ────────────────────────────────────────────────────────────

type GhResult<T> = { ok: true; data: T } | { ok: false; reason: "rate" | "missing" | "network"; resetAt?: number }

const GH_TTL = 10 * 60 * 1000
const ghMemory = new Map<string, { t: number; data: unknown }>()
const ghInflight = new Map<string, Promise<GhResult<unknown>>>()
let ghBlockedUntil = 0

function ghCacheGet(path: string): { data: unknown } | null {
  const now = Date.now()
  const mem = ghMemory.get(path)
  if (mem && now - mem.t < GH_TTL) return { data: mem.data }
  try {
    const raw = window.sessionStorage.getItem(`hunt:gh:${path}`)
    if (raw) {
      const stored = JSON.parse(raw) as { t?: unknown; data?: unknown }
      if (typeof stored.t === "number" && now - stored.t < GH_TTL) {
        ghMemory.set(path, { t: stored.t, data: stored.data ?? null })
        return { data: stored.data ?? null }
      }
    }
  } catch {
    // storage blocked or corrupt: the memory cache still works
  }
  return null
}

function ghCacheSet(path: string, data: unknown) {
  const entry = { t: Date.now(), data }
  ghMemory.set(path, entry)
  try {
    window.sessionStorage.setItem(`hunt:gh:${path}`, JSON.stringify(entry))
  } catch {
    // quota exceeded or storage blocked: ignore
  }
}

/** `tolerateMissing`: a 404/409 (no release, empty repo…) means "nothing there", not a failure. */
function ghGet<T>(path: string, parse: (raw: unknown) => T, tolerateMissing = false): Promise<GhResult<T | null>> {
  const cached = ghCacheGet(path)
  if (cached) return Promise.resolve({ ok: true, data: cached.data as T | null })
  if (ghBlockedUntil > Date.now()) return Promise.resolve({ ok: false, reason: "rate", resetAt: ghBlockedUntil })
  const pending = ghInflight.get(path)
  if (pending) return pending as Promise<GhResult<T | null>>

  const run = (async (): Promise<GhResult<T | null>> => {
    try {
      const res = await fetch(`https://api.github.com${path}`, { headers: { Accept: "application/vnd.github+json" } })
      if (res.status === 403 || res.status === 429) {
        const reset = Number(res.headers.get("x-ratelimit-reset"))
        const resetAt = reset > 0 ? reset * 1000 : undefined
        ghBlockedUntil = resetAt ?? Date.now() + 60_000
        return { ok: false, reason: "rate", resetAt }
      }
      if (res.status === 404 || res.status === 409 || res.status === 451) {
        if (tolerateMissing) {
          ghCacheSet(path, null)
          return { ok: true, data: null }
        }
        return { ok: false, reason: "missing" }
      }
      if (res.status === 204) {
        ghCacheSet(path, null)
        return { ok: true, data: null }
      }
      if (!res.ok) return { ok: false, reason: "network" }
      const data = parse(await res.json())
      ghCacheSet(path, data)
      return { ok: true, data }
    } catch {
      return { ok: false, reason: "network" }
    } finally {
      ghInflight.delete(path)
    }
  })()
  ghInflight.set(path, run)
  return run
}

function toPart<T>(r: GhResult<T | null>): Part<T> {
  if (!r.ok) return { status: "error", reason: r.reason, resetAt: r.resetAt }
  const d = r.data
  if (d === null || (Array.isArray(d) && d.length === 0)) return EMPTY
  return { status: "ok", data: d }
}

/** Loads the repo-level drawer sections in parallel. Keyed by repo, so switching rows never shows stale data. */
function useRepoDetails(repo: string | null) {
  const safeRepo = repo && /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : null
  const [nonce, setNonce] = useState(0)
  const key = safeRepo ? `${safeRepo}#${nonce}` : ""
  const [store, setStore] = useState<{ key: string; value: RepoDetails }>({ key: "", value: LOADING_DETAILS })

  useEffect(() => {
    if (!safeRepo) return
    let cancelled = false
    const apply = (patch: Partial<RepoDetails>) => {
      if (cancelled) return
      setStore((prev) => ({ key, value: { ...(prev.key === key ? prev.value : LOADING_DETAILS), ...patch } }))
    }
    const base = `/repos/${safeRepo}`
    void ghGet(base, parseRepo).then((r) => apply({ repo: toPart(r) }))
    void ghGet(`${base}/languages`, parseLanguages).then((r) => apply({ languages: toPart(r) }))
    void ghGet(`${base}/commits?per_page=5`, parseCommits, true).then((r) => apply({ commits: toPart(r) }))
    void ghGet(`${base}/contributors?per_page=12`, parseContributors, true).then((r) => apply({ contributors: toPart(r) }))
    void ghGet(`${base}/releases/latest`, parseRelease, true).then((r) => apply({ release: toPart(r) }))
    void ghGet(`${base}/community/profile`, parseCommunity, true).then((r) => apply({ community: toPart(r) }))
    return () => {
      cancelled = true
    }
  }, [key, safeRepo])

  const details: RepoDetails = store.key === key ? store.value : LOADING_DETAILS
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { details, reload }
}

/** One on-demand request for a drill-down view. Pass `null` to stay idle. `parse` must be a module-level function. */
function useGhPart<T>(path: string | null, parse: (raw: unknown) => T | null, tolerateMissing = false) {
  const [nonce, setNonce] = useState(0)
  const key = path ? `${path}#${nonce}` : ""
  const [store, setStore] = useState<{ key: string; part: Part<T> }>({ key: "", part: LOADING })

  useEffect(() => {
    if (!path) return
    let cancelled = false
    void ghGet(path, parse, tolerateMissing).then((r) => {
      if (!cancelled) setStore({ key, part: toPart(r) })
    })
    return () => {
      cancelled = true
    }
  }, [key, path, parse, tolerateMissing])

  const part: Part<T> = path ? (store.key === key ? store.part : LOADING) : EMPTY
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { part, reload }
}

// ────────────────────────────────────────────────────────────────────────────
// Page CSS: keyframes and the few things Tailwind utilities can't express
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
.hunt-hide-scrollbar { scrollbar-width: none; }
.hunt-hide-scrollbar::-webkit-scrollbar { display: none; }

@keyframes hunt-rise { from { opacity: 0; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: none; } }
@keyframes hunt-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hunt-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes hunt-blur { from { opacity: 0; filter: blur(10px); transform: translate3d(0, 8px, 0); } to { opacity: 1; filter: blur(0); transform: none; } }
@keyframes hunt-wipe { from { clip-path: inset(0 100% 0 0 round 999px); } to { clip-path: inset(0 0 0 0 round 999px); } }
@keyframes hunt-shimmer { to { transform: translateX(100%); } }
@keyframes hunt-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(360%); } }
@keyframes hunt-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
@keyframes hunt-pop { 0% { opacity: 0; transform: scale(.6); } 60% { transform: scale(1.14); } 100% { opacity: 1; transform: scale(1); } }
@keyframes hunt-sweep { to { transform: rotate(360deg); } }
@keyframes hunt-blip { 0%, 100% { opacity: .15; transform: scale(.7); } 45% { opacity: 1; transform: scale(1.1); } }
@keyframes hunt-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
@keyframes hunt-in-right { from { opacity: .4; transform: translate3d(48px, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes hunt-out-right { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(48px, 0, 0); } }
@keyframes hunt-in-bottom { from { opacity: .4; transform: translate3d(0, 56px, 0); } to { opacity: 1; transform: none; } }
@keyframes hunt-out-bottom { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(0, 56px, 0); } }
@keyframes hunt-deal-out { to { opacity: 0; transform: translate3d(0, -8px, 0) scale(.96); filter: blur(3px); } }
@keyframes hunt-pop-in { from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.975); } to { opacity: 1; transform: none; } }
@keyframes hunt-pop-out { from { opacity: 1; transform: none; } to { opacity: 0; transform: translate3d(0, 10px, 0) scale(.98); } }
@keyframes hunt-view-fwd { from { opacity: 0; transform: translate3d(26px, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes hunt-view-back { from { opacity: 0; transform: translate3d(-26px, 0, 0); } to { opacity: 1; transform: none; } }

.hunt-rise { animation: hunt-rise .5s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-fade { animation: hunt-fade .25s ease-out backwards; }
.hunt-blur { animation: hunt-blur .8s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-float { animation: hunt-float 4s ease-in-out infinite; }
.hunt-wipe { animation: hunt-wipe .9s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-pulse { animation: hunt-pulse 1.4s ease-in-out infinite; }
.hunt-pop { animation: hunt-pop .34s cubic-bezier(.34,1.56,.64,1) backwards; }
.hunt-view-fwd { animation: hunt-view-fwd .32s cubic-bezier(.22,1,.36,1) backwards; }
.hunt-view-back { animation: hunt-view-back .32s cubic-bezier(.22,1,.36,1) backwards; }
.hunt-deal-out { animation: hunt-deal-out .2s cubic-bezier(.4,0,1,1) var(--d, 0ms) both; }
/* A logo tile tinted with its own brand colour (--tc is an r,g,b triplet), over the solid tile colour so overlapped tiles stay opaque. */
.hunt-tile { --tc: 168,255,62; background: transparent; border-color: rgba(var(--tc), .12); box-shadow: 0 0 0 1px rgba(var(--tc), .08), 0 10px 24px rgba(var(--tc), .06); animation: hunt-pop .46s cubic-bezier(.34,1.56,.64,1) var(--td, 0ms) backwards; }
.hunt-skel { position: relative; overflow: hidden; background: rgba(255,255,255,.045); }
.hunt-skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent); animation: hunt-shimmer 1.5s ease-in-out infinite; }
.hunt-bar { animation: hunt-bar 1.2s cubic-bezier(.4,0,.2,1) infinite; }

/* Cursor spotlight: CSS draws it from --mx/--my, so moving the mouse never re-renders anything. */
.hunt-spot { --mx: 50%; --my: 50%; --accent: 168,255,62; }
.hunt-spot::before, .hunt-spot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .35s ease; }
.hunt-spot::before { background: radial-gradient(360px circle at var(--mx) var(--my), rgba(var(--accent), .09), transparent 65%); }
.hunt-spot::after { padding: 1px; background: radial-gradient(260px circle at var(--mx) var(--my), rgba(var(--accent), .6), transparent 65%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
.hunt-spot:hover::before, .hunt-spot:hover::after { opacity: 1; }
.hunt-spot:has(:focus-visible)::before, .hunt-spot:has(:focus-visible)::after { opacity: 1; }

/* Viewfinder corners: four short L-shaped marks that close in on a card on hover or focus. */
.hunt-ticks { position: absolute; inset: 0; pointer-events: none; }
.hunt-ticks::before { content: ""; position: absolute; inset: 9px; opacity: .0; transition: opacity .3s ease, inset .3s cubic-bezier(.22,1,.36,1); --c: rgba(255,255,255,.5);
  background:
    linear-gradient(var(--c), var(--c)) 0 0 / 9px 1px no-repeat, linear-gradient(var(--c), var(--c)) 0 0 / 1px 9px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 0 / 9px 1px no-repeat, linear-gradient(var(--c), var(--c)) 100% 0 / 1px 9px no-repeat,
    linear-gradient(var(--c), var(--c)) 0 100% / 9px 1px no-repeat, linear-gradient(var(--c), var(--c)) 0 100% / 1px 9px no-repeat,
    linear-gradient(var(--c), var(--c)) 100% 100% / 9px 1px no-repeat, linear-gradient(var(--c), var(--c)) 100% 100% / 1px 9px no-repeat; }
.group:hover > .hunt-ticks::before { opacity: 1; inset: 5px; }
.group:has(:focus-visible) > .hunt-ticks::before { opacity: 1; inset: 5px; }

/* Faint dot grid that fades out downward. */
.hunt-dots { background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.1) 1px, transparent 0); background-size: 24px 24px; -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 82%); mask-image: linear-gradient(to bottom, #000 0%, transparent 82%); }

/* Radar scope: rings and cross-hair, a neutral sweep, and a few lime blips. All CSS, decorative only. */
.hunt-scope { position: relative; aspect-ratio: 1 / 1; border-radius: 9999px; border: 1px solid rgba(255,255,255,.1);
  -webkit-mask-image: radial-gradient(circle closest-side, #000 55%, transparent 100%); mask-image: radial-gradient(circle closest-side, #000 55%, transparent 100%);
  background:
    linear-gradient(rgba(255,255,255,.09), rgba(255,255,255,.09)) center / 1px 100% no-repeat,
    linear-gradient(rgba(255,255,255,.09), rgba(255,255,255,.09)) center / 100% 1px no-repeat,
    repeating-radial-gradient(circle closest-side at center, transparent 0, transparent calc(25% - 1px), rgba(255,255,255,.09) calc(25% - 1px), rgba(255,255,255,.09) 25%); }
.hunt-scope::before { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(255,255,255,.05) 335deg, rgba(255,255,255,.2) 359deg, rgba(255,255,255,.5) 360deg); animation: hunt-sweep 7s linear infinite; }
.hunt-blip { position: absolute; left: var(--x); top: var(--y); width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 9999px; background: #a8ff3e; animation: hunt-blip 3.6s ease-in-out var(--d, 0s) infinite; }

/* A light sheen that crosses a primary button once on hover. */
.hunt-sheen { position: relative; overflow: hidden; isolation: isolate; }
.hunt-sheen::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 42%; pointer-events: none; transform: translateX(-130%) skewX(-18deg); background: linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent); }
.hunt-sheen:hover::after { transform: translateX(340%) skewX(-18deg); transition: transform .85s cubic-bezier(.22,1,.36,1); }

/* Drawers and sheets. Widths are forced because shadcn versions disagree on the default (w-3/4, sm:max-w-sm).
   Layering and the open/close motion are set here too, so they behave the same whatever the project's shadcn version
   or its navbar do: the panel and its backdrop sit above any sticky header (the avatar used to cover the close button). */
.hunt-filters-drawer { width: min(100vw, 420px) !important; max-width: none !important; }
.hunt-detail-drawer { width: min(100vw, 600px) !important; max-width: none !important; }
body:has(.hunt-sheet) [data-slot="sheet-overlay"] { z-index: 999 !important; background-color: rgba(3,3,3,.66) !important; -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
body:has(.hunt-sheet) [data-slot="sheet-overlay"][data-state="open"] { animation: hunt-fade .28s ease-out both !important; }
body:has(.hunt-sheet) [data-slot="sheet-overlay"][data-state="closed"] { animation: hunt-fade-out .24s ease-in both !important; }
.hunt-sheet[data-side="right"][data-state="open"] { animation: hunt-in-right .38s cubic-bezier(.22,1,.36,1) both !important; }
.hunt-sheet[data-side="right"][data-state="closed"] { animation: hunt-out-right .24s cubic-bezier(.4,0,1,1) both !important; }
.hunt-sheet[data-side="bottom"][data-state="open"] { animation: hunt-in-bottom .38s cubic-bezier(.22,1,.36,1) both !important; }
.hunt-sheet[data-side="bottom"][data-state="closed"] { animation: hunt-out-bottom .24s cubic-bezier(.4,0,1,1) both !important; }

/* Tailwind 4 resets buttons to the arrow cursor. Everything clickable here says so, including components this page does not own. */
.hunt-root :is(button, [role="switch"], [role="radio"], summary):not(:disabled), .hunt-sheet :is(button, [role="switch"], [role="radio"]):not(:disabled), .hunt-dialog button:not(:disabled) { cursor: pointer; }

/* The stack picker is its own dialog: full screen on phones, a centred panel from 640px. */
.hunt-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(3,3,3,.72); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
.hunt-overlay[data-state="open"] { animation: hunt-fade .25s ease-out both; }
.hunt-overlay[data-state="closed"] { animation: hunt-fade-out .2s ease-in both; }
.hunt-dialog { position: fixed; z-index: 1001; inset: 0; }
.hunt-dialog[data-state="open"] { animation: hunt-in-bottom .34s cubic-bezier(.22,1,.36,1) both; }
.hunt-dialog[data-state="closed"] { animation: hunt-out-bottom .22s ease-in both; }
@media (min-width: 640px) {
  .hunt-dialog { inset: 0; margin: auto; height: min(88dvh, 740px); width: min(94vw, 860px); }
  .hunt-dialog[data-state="open"] { animation-name: hunt-pop-in; }
  .hunt-dialog[data-state="closed"] { animation-name: hunt-pop-out; }
}

@media (prefers-reduced-motion: reduce) {
  .hunt-rise, .hunt-fade, .hunt-blur, .hunt-wipe, .hunt-pulse, .hunt-pop, .hunt-view-fwd, .hunt-view-back, .hunt-deal-out, .hunt-tile, .hunt-skel::after, .hunt-bar, .hunt-scope::before, .hunt-blip { animation: none !important; }
  .hunt-blip { opacity: .8; }
  .hunt-sheen::after { display: none; }
  .hunt-spot::before, .hunt-spot::after, .hunt-ticks::before { transition: none; }
  .hunt-root *, .hunt-root *::before, .hunt-root *::after, .hunt-sheet *, .hunt-dialog * { transition-duration: .01ms !important; }
  .hunt-sheet[data-side][data-state], .hunt-dialog[data-state], .hunt-overlay[data-state], body:has(.hunt-sheet) [data-slot="sheet-overlay"][data-state] { animation-duration: .01ms !important; }
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

/** A span, so it is also valid inside <p> (the drawer description shows one while loading). */
function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={cn("hunt-skel block rounded-md", className)} style={style} />
}

/** Small mono caption used for every section in the filters and the details drawer. */
function SectionTitle({
  children,
  aside,
  as: Tag = "p",
  className,
}: {
  children: ReactNode
  aside?: ReactNode
  as?: "p" | "h3"
  className?: string
}) {
  return (
    <div className={cn("mb-2.5 flex min-h-[20px] items-center justify-between gap-3", className)}>
      <Tag className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{children}</Tag>
      {aside}
    </div>
  )
}

/** Primary action: the one control that carries the brand lime. */
const LIME_BTN =
  "h-10 gap-2 rounded-lg bg-[#a8ff3e] px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-[#bcff6a] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] active:scale-[0.98]"

const OUTLINE_BTN =
  "h-10 gap-2 rounded-lg border-white/[0.12] bg-white/[0.03] px-4 text-[13.5px] font-medium text-neutral-100 hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"

/** Small bordered actions on a row (40px touch target on phones, 32px from lg). */
const ACTION_BTN =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[12.5px] font-medium text-neutral-300 transition-[background-color,border-color,color,transform] duration-150 hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.97] lg:h-8"

/** The close button every drawer and dialog shares: a visible 40px target in the same corner each time. */
const CLOSE_BTN =
  "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300 outline-none transition-[background-color,border-color,color,transform] duration-150 hover:border-white/25 hover:bg-white/[0.1] hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.94]"

/** Square tile that holds one icon: used for rows, menu items and notices. */
function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-neutral-300", className)}
    >
      {children}
    </span>
  )
}

/** A technology's logo in its own colour (light grey when the brand colour is too dark for this page). */
function TechIcon({ option, className }: { option?: LanguageOption; className?: string }) {
  if (!option) return <FolderGit2 aria-hidden="true" className={cn("shrink-0 text-neutral-400", className)} strokeWidth={2} />
  return <option.icon aria-hidden="true" className={cn("shrink-0", className)} style={{ color: techColor(option) }} />
}

function Avatar({ login, size = 24, className }: { login: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-neutral-800 font-mono text-[10px] font-semibold uppercase text-neutral-300",
        className
      )}
      style={{ width: size, height: size }}
    >
      {(login ?? "?").slice(0, 1)}
      {login && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl(login, size * 2)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  )
}

/** External link that degrades to a plain box when the URL failed validation. */
function ExtLink({ href, className, children }: { href: string | null; className?: string; children: ReactNode }) {
  if (!href) return <div className={className}>{children}</div>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

const LINK_FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"

function Dot({ tone }: { tone: "good" | "warn" | "bad" | "muted" }) {
  const color = { good: "bg-emerald-400", warn: "bg-amber-400", bad: "bg-rose-500", muted: "bg-neutral-500" }[tone]
  return <span aria-hidden="true" className={cn("h-[7px] w-[7px] shrink-0 rounded-full", color)} />
}

const CHIP_SOFT = "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[12px] text-neutral-300"

// ────────────────────────────────────────────────────────────────────────────
// Controls: difficulty cards · switch rows
// ────────────────────────────────────────────────────────────────────────────

/** Radio group drawn as three cards. Each one says which GitHub label it filters on, so nothing about it is a guess. */
function DifficultyPicker({ value, onChange }: { value: Difficulty; onChange: (v: Difficulty) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, DIFFICULTIES.indexOf(value))

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return
    e.preventDefault()
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1
    const next = (index + dir + DIFFICULTIES.length) % DIFFICULTIES.length
    onChange(DIFFICULTIES[next])
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Difficulty" onKeyDown={onKeyDown} className="grid gap-1.5">
      {DIFFICULTIES.map((d, i) => {
        const active = d === value
        return (
          <button
            key={d}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(d)}
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left outline-none transition-[background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-white/60",
              active ? "border-white/30 bg-white/[0.07]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.045]"
            )}
          >
            <span aria-hidden="true" className={cn("h-2 w-2 shrink-0 rounded-full", DIFF[d].dot)} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-medium leading-tight text-neutral-100">{DIFF[d].label}</span>
              <span className="mt-0.5 block truncate font-mono text-[11.5px] text-neutral-400">label: {DIFF[d].rule}</span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
                active ? "border-transparent bg-neutral-100 text-neutral-900" : "border-white/25"
              )}
            >
              {active && <Check className="hunt-pop h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Settings-style list: one bordered group, rows divided by hairlines. */
function SwitchGroup({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">{children}</div>
}

/** Accessible on/off row (role=switch): icon, label and hint on the left, a neutral switch on the right. */
function SwitchRow({
  checked,
  onChange,
  icon: Icon,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  icon: LucideIcon
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center gap-3 px-3.5 py-3 text-left outline-none transition-colors duration-150 hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
    >
      <IconTile className={cn("transition-colors duration-200", checked && "border-white/25 bg-white/[0.1] text-white")}>
        <Icon className="h-4 w-4" strokeWidth={2} />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-neutral-100">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-neutral-400">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[22px] w-10 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-transparent bg-neutral-100" : "border-white/25 bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute left-[2px] top-[2px] h-4 w-4 rounded-full transition-[transform,background-color] duration-200 ease-[cubic-bezier(.22,1,.36,1)]",
            checked ? "translate-x-[18px] bg-neutral-900" : "translate-x-0 bg-neutral-300"
          )}
        />
      </span>
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Stack picker: a wide dialog (full screen on phones) to find and pick up to six languages, frameworks and tools.
// ────────────────────────────────────────────────────────────────────────────

/** A language, framework or tool as a chip, with a remove button when it can be removed. */
function PickChip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  const option = findLanguageOption(label)
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] py-0.5 pl-1.5 pr-0.5 text-[12.5px] font-medium text-neutral-100">
      <TechIcon option={option} className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-3 w-3" strokeWidth={2.25} />
        </button>
      ) : (
        <span className="w-1.5" />
      )}
    </span>
  )
}

/** Languages first, because "I write Python" is how most people start. */
const PICKER_CATEGORIES = ["Programming Languages", ...CATEGORY_ORDER.filter((c) => c !== "Programming Languages")]
const CATEGORY_SHORT: Record<string, string> = { "Programming Languages": "Languages", "Game Development": "Games", "Data Science": "Data" }
const categoryName = (c: string) => CATEGORY_SHORT[c] ?? c

function StackTile({ option, selected, atLimit, onToggle }: { option: LanguageOption; selected: boolean; atLimit: boolean; onToggle: () => void }) {
  const blocked = atLimit && !selected
  return (
    <button
      type="button"
      data-tile=""
      aria-pressed={selected}
      disabled={blocked}
      onClick={onToggle}
      title={blocked ? `Limit of ${MAX_PICKS} reached. Remove one to add another.` : undefined}
      className={cn(
        "group/t flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left outline-none transition-[background-color,border-color,transform] duration-150 focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "border-white/35 bg-white/[0.09]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-black/30">
        <TechIcon option={option} className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-neutral-100">{option.label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          selected ? "border-transparent bg-neutral-100 text-neutral-900" : "border-white/20 group-hover/t:border-white/40"
        )}
      >
        {selected ? (
          <Check className="hunt-pop h-3 w-3" strokeWidth={3} />
        ) : (
          <Plus className="h-3 w-3 text-neutral-400 opacity-0 transition-opacity group-hover/t:opacity-100" strokeWidth={2.25} />
        )}
      </span>
    </button>
  )
}

function PickerBody({ picks, onChange }: { picks: string[]; onChange: (next: string[]) => void }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [recent, setRecent] = useState<string[]>(() => getRecentTechnologies())
  const listRef = useRef<HTMLDivElement | null>(null)

  const q = query.trim()
  const atLimit = picks.length >= MAX_PICKS
  const isPicked = (o: LanguageOption) => picks.some((p) => p.toLowerCase() === o.label.toLowerCase())

  const results = useMemo(() => {
    if (!q) return []
    const needle = q.toLowerCase()
    const rank = (o: LanguageOption) =>
      o.label.toLowerCase() === needle || (o.aliases ?? []).some((a) => a.toLowerCase() === needle) ? 0 : o.label.toLowerCase().startsWith(needle) ? 1 : 2
    return LANGUAGE_OPTIONS.filter((o) => filterTechnology({ data: o }, q)).sort((a, b) => rank(a) - rank(b))
  }, [q])

  const sections = useMemo(() => {
    if (q) return [{ title: "Matches", options: results }]
    if (category !== "all") return [{ title: categoryName(category), options: LANGUAGE_OPTIONS.filter((o) => o.category === category) }]
    const list: { title: string; options: LanguageOption[] }[] = []
    const recents = recent.map((v) => TECH_BY_VALUE[v]).filter((o): o is LanguageOption => !!o)
    if (recents.length) list.push({ title: "Recently used", options: recents })
    list.push({ title: "Popular", options: POPULAR_VALUES.map((v) => TECH_BY_VALUE[v]).filter((o): o is LanguageOption => !!o) })
    for (const c of PICKER_CATEGORIES) list.push({ title: categoryName(c), options: LANGUAGE_OPTIONS.filter((o) => o.category === c) })
    return list
  }, [q, results, category, recent])

  function toggle(option: LanguageOption) {
    if (isPicked(option)) {
      onChange(picks.filter((p) => p.toLowerCase() !== option.label.toLowerCase()))
      return
    }
    if (atLimit) return
    onChange([...picks, option.label])
    setRecent(recordRecentTechnology(option.value))
  }

  /** Arrow keys move between tiles, so a keyboard user does not have to tab through 150 of them. */
  function onGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return
    const tiles = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[data-tile]:not(:disabled)"))
    const current = document.activeElement as HTMLElement | null
    const i = current ? tiles.indexOf(current as HTMLButtonElement) : -1
    if (i === -1 || !current) return
    e.preventDefault()
    const grid = current.parentElement
    const cols = grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").length : 1
    const step: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: tiles.length - 1 }
    tiles[Math.max(0, Math.min(tiles.length - 1, step[e.key]))]?.focus()
  }

  return (
    <>
      <div className="flex shrink-0 items-start gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
        <span aria-hidden="true" className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
          <HuntMark className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <DialogPrimitive.Title className="text-[18px] font-semibold leading-tight tracking-tight text-white">Choose your stack</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-[12.5px] leading-snug text-neutral-400">
            Pick up to {MAX_PICKS}. A language finds repos written in it. A framework or tool finds issues that mention it.
          </DialogPrimitive.Description>
        </div>
        <DialogPrimitive.Close asChild>
          <button type="button" aria-label="Close stack picker" className={CLOSE_BTN}>
            <X className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </DialogPrimitive.Close>
      </div>

      <div className="shrink-0 space-y-2.5 border-b border-white/[0.07] px-4 pb-3 sm:px-5">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" strokeWidth={2} />
          <input
            data-picker-search=""
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                e.preventDefault()
                toggle(results[0])
              } else if (e.key === "ArrowDown") {
                e.preventDefault()
                listRef.current?.querySelector<HTMLButtonElement>("[data-tile]:not(:disabled)")?.focus()
              }
            }}
            placeholder="Search: react, py, postgres, k8s..."
            aria-label="Search languages, frameworks and tools"
            // 16px on phones: iOS Safari zooms the page when a smaller field is focused.
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] pl-10 pr-11 text-base text-neutral-100 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-neutral-400 hover:border-white/20 focus:border-white/45 focus:ring-2 focus:ring-white/10 sm:text-[14px]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-neutral-400 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>

        <div role="group" aria-label="Category" className="hunt-hide-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
          {["all", ...PICKER_CATEGORIES].map((c) => {
            const active = !q && category === c
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setQuery("")
                  setCategory(c)
                  listRef.current?.scrollTo({ top: 0 })
                }}
                className={cn(
                  "h-8 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-3 text-[12.5px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/60",
                  active ? "border-transparent bg-neutral-100 text-neutral-900" : "border-white/10 bg-white/[0.03] text-neutral-300 hover:border-white/25 hover:text-white"
                )}
              >
                {c === "all" ? "All" : categoryName(c)}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={listRef} onKeyDown={onGridKeyDown} className="hunt-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
        <p role="status" className="sr-only">
          {q ? `${results.length} ${results.length === 1 ? "match" : "matches"}` : ""}
        </p>
        {q && results.length === 0 ? (
          <div className="mx-auto flex max-w-xs flex-col items-center px-2 py-14 text-center">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-neutral-300">
              <Search className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </span>
            <p className="text-[15px] font-semibold text-neutral-100">Nothing matches &ldquo;{q}&rdquo;</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-400">Try the short name: js, ts, py, go, k8s or pg all work.</p>
          </div>
        ) : (
          sections.map((s) => (
            <section key={s.title} aria-label={s.title}>
              <h3 className="mb-2 mt-4 flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {s.title}
                <span className="tabular-nums">{s.options.length}</span>
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {s.options.map((o) => (
                  <StackTile key={o.value} option={o} selected={isPicked(o)} atLimit={atLimit} onToggle={() => toggle(o)} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.07] bg-[#0b0b0b] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:rounded-b-2xl sm:px-5 sm:pb-4">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400">
              <span>Selected</span>
              <span role="status" className="tabular-nums text-neutral-300">
                {picks.length} / {MAX_PICKS}
              </span>
              {atLimit && <span className="normal-case tracking-normal text-amber-300">Limit reached</span>}
              {picks.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="ml-auto cursor-pointer rounded font-sans text-[12px] normal-case tracking-normal text-neutral-300 underline-offset-4 outline-none hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Clear all
                </button>
              )}
            </p>
            {picks.length === 0 ? (
              <p className="flex min-h-[32px] items-center text-[13px] text-neutral-400">Nothing selected yet.</p>
            ) : (
              <ul aria-label="Selected stack" className="flex flex-wrap gap-1.5">
                {picks.map((p) => (
                  <li key={p} className="max-w-full">
                    <PickChip label={p} onRemove={() => onChange(picks.filter((x) => x !== p))} />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogPrimitive.Close asChild>
            <Button type="button" className={cn(LIME_BTN, "shrink-0")}>
              Done
            </Button>
          </DialogPrimitive.Close>
        </div>
      </div>
    </>
  )
}

function StackPicker({ open, onOpenChange, picks, onChange }: { open: boolean; onOpenChange: (open: boolean) => void; picks: string[]; onChange: (next: string[]) => void }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="hunt-overlay" />
        <DialogPrimitive.Content
          className="hunt-dialog hunt-root flex flex-col overflow-hidden bg-[#0b0b0b] text-neutral-200 outline-none sm:rounded-2xl sm:border sm:border-white/10 sm:shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
          style={{ colorScheme: "dark" }}
          onOpenAutoFocus={(e) => {
            // Typing straight away is right on a desktop; on a phone the keyboard would cover half the list.
            e.preventDefault()
            const box = e.currentTarget as HTMLElement | null
            const search = box?.querySelector<HTMLInputElement>("[data-picker-search]")
            ;(window.matchMedia("(pointer: fine)").matches && search ? search : box)?.focus()
          }}
        >
          <PickerBody picks={picks} onChange={onChange} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Filters panel (desktop sidebar, tablet drawer and phone sheet share it)
// ────────────────────────────────────────────────────────────────────────────

/** The chosen stack as chips, plus the one button that opens the picker. */
function StackField({ picks, onChange, onOpenPicker }: { picks: string[]; onChange: (next: string[]) => void; onOpenPicker: () => void }) {
  return (
    <div>
      <SectionTitle aside={<span className="font-mono text-[11px] tabular-nums text-neutral-400">{picks.length} / {MAX_PICKS}</span>}>Stack</SectionTitle>
      <div className="rounded-lg border border-white/[0.1] bg-white/[0.02] p-2.5">
        {picks.length > 0 ? (
          <ul aria-label="Selected stack" className="mb-2.5 flex flex-wrap gap-1.5">
            {picks.map((p) => (
              <li key={p} className="max-w-full">
                <PickChip label={p} onRemove={() => onChange(picks.filter((x) => x !== p))} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-2.5 px-0.5 text-[13px] text-neutral-400">No stack yet. Add at least one to search.</p>
        )}
        <button
          type="button"
          onClick={onOpenPicker}
          aria-haspopup="dialog"
          className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-white/20 text-[13px] font-medium text-neutral-200 outline-none transition-colors hover:border-white/40 hover:bg-white/[0.04] hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
        >
          {picks.length > 0 ? <Plus className="h-4 w-4" strokeWidth={2} /> : <Search className="h-4 w-4" strokeWidth={2} />}
          {picks.length > 0 ? "Add or change stack" : "Choose your stack"}
        </button>
      </div>
      {picks.length === 0 ? (
        <p role="alert" className="mt-2 text-[12px] text-rose-400">
          Pick at least one stack to search.
        </p>
      ) : (
        <p className="mt-2 text-[12px] leading-snug text-neutral-400">A language finds repos written in it. A framework or tool finds issues that mention it.</p>
      )}
    </div>
  )
}

interface FiltersPanelProps {
  variant: "sidebar" | "sheet"
  picks: string[]
  setPicks: (v: string[]) => void
  onOpenPicker: () => void
  difficulty: Difficulty
  setDifficulty: (v: Difficulty) => void
  bountyOnly: boolean
  setBountyOnly: (v: boolean) => void
  activeOnly: boolean
  setActiveOnly: (v: boolean) => void
  loading: boolean
  onSearch: () => void
  onReset: () => void
  isDefault: boolean
}

function FiltersPanel(props: FiltersPanelProps) {
  const { variant, picks, setPicks, onOpenPicker, difficulty, setDifficulty, bountyOnly, setBountyOnly, activeOnly, setActiveOnly, loading, onSearch, onReset, isDefault } = props
  const canSearch = !loading && picks.length > 0

  return (
    <form
      className="flex min-h-0 w-full flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSearch) onSearch()
      }}
    >
      <div className={cn("hunt-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-8", variant === "sidebar" ? "pt-6" : "pt-5")}>
        {variant === "sidebar" && (
          <div className="mb-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                <HuntMark className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <h1 className="text-[18px] font-semibold leading-tight tracking-tight text-white">Hunt Issues</h1>
                <p className="text-[12.5px] leading-snug text-neutral-400">Real bugs from real repos, matched to your stack</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2">
              <span className="text-[12px] font-medium text-neutral-300">Free plan</span>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 rounded text-[12px] font-semibold text-neutral-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Upgrade <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <StackField picks={picks} onChange={setPicks} onOpenPicker={onOpenPicker} />

          <div>
            <SectionTitle>Difficulty</SectionTitle>
            <DifficultyPicker value={difficulty} onChange={setDifficulty} />
          </div>

          <div>
            <SectionTitle>Refine</SectionTitle>
            <SwitchGroup>
              <SwitchRow checked={bountyOnly} onChange={setBountyOnly} icon={Coins} label="Paid bounties" description="Only issues with a bounty attached" />
              <SwitchRow checked={activeOnly} onChange={setActiveOnly} icon={Zap} label="Active repos only" description="Hide repos with no recent merged PRs" />
            </SwitchGroup>
          </div>
        </div>
      </div>

      <div className="relative shrink-0 border-t border-white/[0.06] bg-[#0b0b0b] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {/* soft fade so scrolled content slides under the pinned buttons instead of being sliced */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-[#0b0b0b] to-transparent" />
        <div className="flex items-center gap-2.5">
          <Button type="button" variant="outline" onClick={onReset} disabled={isDefault} className={cn(OUTLINE_BTN, "px-3.5")}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
            Reset
          </Button>
          <Button type="submit" disabled={!canSearch} aria-busy={loading} className={cn(LIME_BTN, "hunt-sheen flex-1 disabled:opacity-60")}>
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-neutral-950 motion-reduce:[animation-duration:3s]" />
                Searching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" strokeWidth={2.25} />
                Search issues
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Row-level pieces
// ────────────────────────────────────────────────────────────────────────────

/** Leading mark on every issue row: the repo owner's avatar, falling back to the tech logo. */
function RepoAvatar({ owner, option }: { owner: string; option?: LanguageOption }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading")
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition-colors duration-200 group-hover/row:border-white/25">
      <TechIcon option={option} className="h-4 w-4" />
      {state !== "failed" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl(owner, 72)}
          alt=""
          width={36}
          height={36}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState("loaded")}
          onError={() => setState("failed")}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            state === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
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
        {/* z-[1] lifts it above the row's click area so the tooltip can open on hover */}
        <span className={cn("relative z-[1] inline-flex shrink-0 items-center gap-1.5 text-[12px]", inactive ? "font-medium text-rose-300" : "text-neutral-400")}>
          <span aria-hidden="true" className={cn("h-[7px] w-[7px] shrink-0 rounded-full", inactive ? "bg-rose-500" : "bg-emerald-400")} />
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

/** Shown on a row when somebody already has the issue: the quickest way to avoid a wasted claim. */
function AssignedBadge({ assignees }: { assignees: string[] }) {
  if (assignees.length === 0) return null
  const who = `${assignees[0]}${assignees.length > 1 ? ` +${assignees.length - 1}` : ""}`
  return (
    <span title={`Assigned to ${assignees.join(", ")}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-400/25 bg-amber-400/[0.07] px-1.5 py-0.5 text-[11.5px] font-medium text-amber-200">
      <UserCheck aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
      Assigned
      <span className="sr-only"> to {who}</span>
    </span>
  )
}

/**
 * The claiming comment, laid out like GitHub's own comment box. Above it, what is already known about the issue
 * (is it taken? is the repo alive?) so the person decides before posting. The text is drafted from the issue only
 * and claims no experience; the note under the box says so.
 */
function ProposalPanel({
  issue,
  proposal,
  copied,
  onChange,
  onCopy,
  onRegenerate,
  onLearn,
}: {
  issue: Issue
  proposal: Proposal
  copied: boolean
  onChange: (v: string) => void
  onCopy: () => void
  onRegenerate: () => void
  /** Opens the claiming guide in the details panel. The button is handed over so focus can come back to it. */
  onLearn: (trigger: HTMLElement) => void
}) {
  const { text, source, waiting, why, edited } = proposal
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
  }, [text])

  const { assignees, maintainer } = claimSignals(issue)
  const number = issueNumber(issue.html_url)
  const commentWord = issue.comments === 1 ? "comment" : "comments"
  const note = waiting
    ? "This template is ready to use. An AI draft replaces it unless you edit the text first."
    : source === "ai"
      ? "Drafted from the issue text only. It claims no experience, so add your own before posting."
      : why === "timeout"
        ? "The AI was slow, so this is a plain template that claims no experience. Regenerate to try again."
        : why === "rejected"
          ? "The AI draft wasn't safe to paste, so this is a plain template that claims no experience."
          : why === "unavailable"
            ? "The AI draft wasn't available, so this is a plain template that claims no experience."
            : edited
              ? "You edited the text, so the AI draft was not used. Regenerate to try again."
              : "A plain template that claims no experience."

  return (
    <div id={`proposal-${issue.id}`} className="hunt-rise border-t border-white/[0.05] bg-white/[0.015] px-4 py-4 sm:px-5 md:pl-[4.75rem]">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] transition-[border-color,box-shadow] duration-150 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/10">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.025] py-1.5 pl-3 pr-1.5">
          {/* On a very narrow phone the status badge drops under the title instead of cutting the title short. */}
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-medium text-neutral-200">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <PenLine className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
              <span>
                Claim comment{number !== null && <span className="font-mono text-neutral-400"> #{number}</span>}
              </span>
            </span>
            <span
              title={waiting ? "A plain template is in the box. An AI draft is on its way." : source === "template" ? "The AI draft wasn't used, so this is a plain template." : "Drafted from this issue's text"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded border border-white/10 px-1.5 py-px text-[11px] font-normal text-neutral-400"
            >
              {waiting && <RotateCcw aria-hidden="true" className="h-3 w-3 animate-spin motion-reduce:[animation-duration:3s]" strokeWidth={2.25} />}
              {waiting ? "Improving with AI" : source === "ai" ? "AI draft" : "Template"}
            </span>
          </span>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={waiting}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50 lg:h-7"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
            Regenerate
          </button>
        </div>

        <ul aria-label="Before you comment" className="flex flex-wrap gap-1.5 border-b border-white/[0.06] px-3 py-2.5">
          <li className={CHIP_SOFT}>
            <Dot tone={assignees.length ? "warn" : "good"} />
            {assignees.length ? `Assigned to ${assignees[0]}${assignees.length > 1 ? ` +${assignees.length - 1}` : ""}` : "Unassigned, open to claim"}
          </li>
          {issue.isActiveRepo !== undefined && (
            <li className={CHIP_SOFT}>
              <Dot tone={issue.isActiveRepo ? "good" : "bad"} />
              {issue.isActiveRepo ? "Repo is active" : "Repo looks inactive"}
            </li>
          )}
          <li className={CHIP_SOFT}>
            <Dot tone="muted" />
            {issue.comments} {commentWord}
          </li>
          {maintainer && (
            <li className={CHIP_SOFT}>
              <Dot tone="good" />
              Opened by a maintainer
            </li>
          )}
          <li className="ml-auto">
            <button
              type="button"
              onClick={(e) => onLearn(e.currentTarget)}
              aria-label="What these mean: how to claim an issue"
              className={cn(CHIP_SOFT, "relative cursor-pointer border-dashed outline-none transition-colors after:absolute after:-inset-2 after:content-[''] hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50")}
            >
              <InfoIcon aria-hidden="true" className="h-3 w-3" strokeWidth={2.25} />
              What these mean
            </button>
          </li>
        </ul>

        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Claiming comment for ${issue.title}`}
          rows={4}
          // 16px on phones: iOS Safari zooms the page when a smaller field is focused.
          className="block min-h-[104px] w-full resize-none overflow-y-auto bg-transparent px-3.5 py-3 font-mono text-base leading-relaxed text-neutral-200 outline-none sm:text-[13px]"
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.07] bg-white/[0.025] px-3 py-2">
          <span className="text-[12px] tabular-nums text-neutral-400">{text.length} characters</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onCopy} className={cn(ACTION_BTN, copied && "border-white/25 bg-white/[0.09] text-white")}>
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy
                </>
              )}
            </button>
            {/* Copy and navigation happen on the same click, so the new tab is never blocked as a popup. */}
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onCopy}
              className={cn(ACTION_BTN, "border-transparent bg-[#a8ff3e] font-semibold text-neutral-950 hover:border-transparent hover:bg-[#bcff6a] hover:text-neutral-950")}
            >
              Copy and open issue <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
      <p className="mt-2.5 px-1 text-[12px] leading-snug text-neutral-400">
        {note}
        {assignees.length > 0 && !waiting && " Someone is assigned, so the draft asks if they are still on it."}
      </p>
      <span role="status" className="sr-only">
        {waiting ? "Improving the draft with AI" : source === "ai" ? "AI draft ready" : ""}
      </span>
    </div>
  )
}

interface IssueRowProps {
  issue: Issue
  index: number
  showLanguage: boolean
  copied: boolean
  proposalOpen: boolean
  onOpenDetails: (issue: Issue, trigger: HTMLElement) => void
  onCopyRepo: () => void
  onToggleProposal: () => void
  children?: ReactNode
}

function IssueRow({
  issue, index, showLanguage, copied, proposalOpen,
  onOpenDetails, onCopyRepo, onToggleProposal, children,
}: IssueRowProps) {
  const rowLangOpt = findLanguageOption(issue.matchedLanguage || issue.language)
  const langOpt = showLanguage ? rowLangOpt : undefined
  const repoFull = repoName(issue.repository_url)
  const [owner, name] = splitRepo(repoFull)
  const isVerified = VERIFIED_REPOS.has(repoFull.toLowerCase())
  const type = detectIssueType(issue.title)
  const locked = !!issue.isLocked
  const commentWord = issue.comments === 1 ? "comment" : "comments"
  const { assignees } = claimSignals(issue)

  return (
    <li className="hunt-rise relative" style={cssVars({ "--d": `${Math.min(index % PAGE_SIZE, 9) * 28}ms` })}>
      <div
        // `inert` keeps a locked (blurred, aria-hidden) row out of the tab order in every React version
        ref={(el) => {
          if (!el) return
          if (locked) el.setAttribute("inert", "")
          else el.removeAttribute("inert")
        }}
        className={cn(
          "group/row relative flex flex-wrap items-start gap-x-3.5 gap-y-3 px-4 py-4 transition-colors duration-150 sm:px-5 md:flex-nowrap md:items-center md:gap-x-4",
          locked ? "pointer-events-none select-none opacity-60 blur-[3px]" : "hover:bg-white/[0.03]"
        )}
        aria-hidden={locked || undefined}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 bg-white/70 transition-transform duration-200 ease-out group-hover/row:scale-y-100"
        />
        <span aria-hidden="true" className="hidden w-5 shrink-0 text-right font-mono text-[11px] tabular-nums text-[#8a8a8a] lg:block">
          {String(index + 1).padStart(2, "0")}
        </span>

        <RepoAvatar owner={owner.replace(/\/$/, "")} option={rowLangOpt} />

        <div className="min-w-0 flex-1 basis-[calc(100%-50px)] md:basis-0">
          <p className="mb-1.5 flex min-w-0 items-start gap-2 text-[15px] font-medium leading-snug tracking-tight text-neutral-100">
            <span title={type.label} className="mt-[3px] inline-flex shrink-0">
              <type.Icon
                strokeWidth={2}
                aria-label={type.label}
                className="h-3.5 w-3.5 text-neutral-500 transition-colors duration-200 group-hover/row:text-neutral-300"
              />
            </span>
            {/* Opens the details drawer. The ::after stretches this button over the whole row; the actions sit above it. */}
            <button
              type="button"
              onClick={(e) => onOpenDetails(issue, e.currentTarget)}
              aria-haspopup="dialog"
              title={issue.title}
              className="block min-w-0 cursor-pointer rounded-sm text-left outline-none transition-colors duration-150 after:absolute after:inset-0 hover:text-white focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white/50"
            >
              <span className="line-clamp-2">{issue.title}</span>
              <span className="sr-only"> (view details)</span>
            </button>
          </p>

          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-neutral-400">
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
              <span className="min-w-0 truncate font-mono text-[12px]">
                <span className="text-neutral-400">{owner}</span>
                <span className="text-neutral-200">{name}</span>
              </span>
              {isVerified && (
                <span title="Official repository" className="inline-flex shrink-0">
                  <BadgeCheck strokeWidth={2} className="h-3.5 w-3.5 text-[#a8ff3e]" />
                  <span className="sr-only">Official repository</span>
                </span>
              )}
            </span>

            {langOpt && (
              <span
                title={langOpt.label}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[11.5px] font-medium text-neutral-300"
              >
                <TechIcon option={langOpt} className="h-3 w-3" />
                {langOpt.label}
              </span>
            )}

            <ActivityStatus issue={issue} />
            <AssignedBadge assignees={assignees} />

            <span className="inline-flex shrink-0 items-center gap-1 tabular-nums" title={`${issue.comments} ${commentWord}`}>
              <MessageSquare aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
              {issue.comments}
              <span className="sr-only"> {commentWord}</span>
            </span>

            <time dateTime={issue.created_at} className="shrink-0 font-mono text-[11.5px] tabular-nums text-neutral-400">
              {timeAgo(issue.created_at)}
            </time>
          </div>
        </div>

        <div className="relative z-[1] flex w-full items-center gap-2 pl-[50px] md:ml-auto md:w-auto md:shrink-0 md:gap-1.5 md:pl-0">
          <button
            type="button"
            onClick={onToggleProposal}
            aria-expanded={proposalOpen}
            aria-controls={`proposal-${issue.id}`}
            title="Draft a comment to claim this issue"
            className={cn(ACTION_BTN, proposalOpen && "border-white/25 bg-white/[0.09] text-white")}
          >
            <PenLine className="h-3.5 w-3.5" strokeWidth={2} />
            Proposal
          </button>

          <button
            type="button"
            onClick={onCopyRepo}
            title="Copy repo link"
            aria-label={copied ? "Repo link copied" : "Copy repo link"}
            className={cn(ACTION_BTN, "ml-auto w-10 px-0 md:ml-0 lg:w-8", copied && "border-white/25 bg-white/[0.09] text-white")}
          >
            {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
          </button>

          <BookmarkButton kind="issue" item={issue} subject={issue.title} variant="icon" size="sm" />
        </div>
      </div>

      {locked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
          <Link
            href="/pricing"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#a8ff3e] px-4 text-[13px] font-semibold text-neutral-950 transition-[background-color,transform] duration-150 hover:bg-[#bcff6a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] active:scale-[0.97]"
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
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className="h-4" style={{ width: `${56 + ((i * 17) % 32)}%` }} />
        <Skeleton className="h-3 w-[38%]" />
      </div>
      <div className="hidden items-center gap-1.5 md:flex">
        <Skeleton className="h-10 w-[104px] rounded-lg lg:h-8" />
        <Skeleton className="h-10 w-10 rounded-lg lg:h-8 lg:w-8" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </li>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Starting points: the deck that Shuffle deals
// ────────────────────────────────────────────────────────────────────────────
// The first deal is random, so it must not be part of the server HTML (it would never match what the browser deals).
// The deck therefore lives in a tiny external store: the server and the first hydration pass see "no deck yet" and draw
// placeholders, and the browser deals right after. The deal itself is a pure function of a seed.

type Template = (typeof TEMPLATES)[number]

interface Deck {
  /** Counts the deals. A new deal remounts the cards, which is what replays their entrance. */
  run: number
  /** True while the old cards are leaving. The next deal replaces them. */
  leaving: boolean
  cards: Template[]
}

/** Small seeded generator (mulberry32): the same seed always deals the same cards. */
function seededRandom(seed: number) {
  let a = seed | 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Deals `size` cards. Every area comes up once before any area comes up twice, so a deal is a mix (web, servers, data,
 * mobile...) and never eight versions of the same thing. Cards in `seen` go to the back of their area, so Shuffle shows
 * new combinations until an area runs out of them.
 */
function dealDeck(seed: number, size: number, seen: ReadonlySet<string>): Template[] {
  const next = seededRandom(seed)
  function mixed<T>(list: readonly T[]): T[] {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const piles = mixed(START_AREAS).map((area) => {
    const all = TEMPLATES.filter((t) => t.area === area)
    return [...mixed(all.filter((t) => !seen.has(t.key))), ...mixed(all.filter((t) => seen.has(t.key)))]
  })
  const picked: Template[] = []
  for (let round = 0; picked.length < size && round < TEMPLATES.length; round++) {
    for (const pile of piles) if (picked.length < size && pile[round]) picked.push(pile[round])
  }
  return mixed(picked)
}

const randomSeed = () => Math.floor(Math.random() * 4294967296)

let currentDeck: Deck | null = null
const deckListeners = new Set<() => void>()

function publishDeck(next: Deck) {
  currentDeck = next
  deckListeners.forEach((notify) => notify())
}
function subscribeDeck(notify: () => void) {
  deckListeners.add(notify)
  return () => {
    deckListeners.delete(notify)
  }
}
/** The browser's deck: dealt once, on first use, so every page load starts with a different one. */
function getDeck(): Deck {
  return (currentDeck ??= { run: 0, leaving: false, cards: dealDeck(randomSeed(), DECK_SIZE, new Set()) })
}
const getServerDeck = (): Deck | null => null

/** Old cards leave, then a new set (none of the ones just shown, while the area has others) comes in. */
function shuffleDeck() {
  const cur = getDeck()
  if (cur.leaving) return
  const deal = () => publishDeck({ run: cur.run + 1, leaving: false, cards: dealDeck(randomSeed(), DECK_SIZE, new Set(cur.cards.map((c) => c.key))) })
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return deal()
  publishDeck({ ...cur, leaving: true })
  window.setTimeout(deal, 330)
}

function joinList(items: string[], word: "and" | "or") {
  return items.length < 3 ? items.join(` ${word} `) : `${items.slice(0, -1).join(", ")} ${word} ${items[items.length - 1]}`
}

/** What a card really runs, in the picker's own words: a language finds repos written in it, anything else finds issues that mention it. */
function startDesc(picks: string[]) {
  const langs = picks.filter((p) => findLanguageOption(p)?.category === "Programming Languages")
  const tools = picks.filter((p) => !langs.includes(p))
  const where = langs.length ? `in ${joinList(langs, "and")} repos` : ""
  const what = tools.length ? `${langs.length ? "plus issues " : ""}that mention ${joinList(tools, "or")}` : ""
  return `Good first issues ${where}${where && what ? ", " : ""}${what}.`
}

// ────────────────────────────────────────────────────────────────────────────
// Landing · starting points · empty and error states · live search progress
// ────────────────────────────────────────────────────────────────────────────

/**
 * A starting point runs exactly the picks it lists, at Easy. The text under the title is written from those picks and
 * the footer repeats them, so the card never promises more than the search does. Each logo sits on a tile tinted with
 * its own brand colour, and those colours draw a thin line along the top edge, so a stack is recognised before it is read.
 */
function TemplateCard({ t, index, leaving, onRun }: { t: Template; index: number; leaving: boolean; onRun: (t: Template) => void }) {
  const picks = t.picks.map((label) => {
    const option = findLanguageOption(label)
    return { label, option, rgb: hexToRgbTriplet(techColor(option)) }
  })
  const stops = picks.slice(0, 3).map((p) => `rgba(${p.rgb},.9)`)
  return (
    <li className={cn("h-full", leaving ? "hunt-deal-out" : "hunt-rise")} style={cssVars({ "--d": `${index * (leaving ? 22 : 45)}ms` })}>
      <Card
        onPointerMove={trackPointer}
        className="hunt-spot group relative h-full gap-0 overflow-hidden rounded-xl border-white/[0.08] bg-[#0d0d0d] p-0 shadow-none transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.18] has-[:focus-visible]:border-white/30 active:translate-y-0 active:scale-[0.99]"
        style={cssVars({ "--accent": picks[0].rgb })}
      >
        <span aria-hidden="true" className="hunt-ticks" />
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px opacity-60 transition-opacity duration-300 group-hover:opacity-100"
          style={{ backgroundImage: `linear-gradient(90deg, ${stops.join(", ")}${stops.length === 1 ? ", transparent" : ""})` }}
        />
        <CardContent className="relative z-10 flex h-full flex-col p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span aria-hidden="true" className="flex -space-x-2">
              {picks.slice(0, 3).map((p, i) => (
                <span
                  key={p.label}
                  className="hunt-tile flex h-9 w-9 items-center justify-center rounded-full border-0 transition-transform duration-300 group-hover:-translate-y-px"
                  style={cssVars({ "--tc": p.rgb, "--td": `${index * 45 + 140 + i * 90}ms` })}
                >
                  <TechIcon option={p.option} className="h-[18px] w-[18px]" />
                </span>
              ))}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11.5px] font-medium text-neutral-300">
              <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DIFF.easy.dot)} />
              Easy
            </span>
          </div>

          <h3 className="text-[15px] font-semibold tracking-tight text-neutral-100">
            {/* The ::after stretches this native button over the whole card, so the entire card is the click target. */}
            <button
              type="button"
              onClick={() => onRun(t)}
              aria-describedby={`start-${t.key}`}
              className="cursor-pointer rounded-sm text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-white/60"
            >
              {t.title}
              <span className="sr-only">, runs a search now</span>
            </button>
          </h3>
          <p id={`start-${t.key}`} className="mt-1 text-[13px] leading-relaxed text-neutral-400">
            {startDesc(t.picks)}
          </p>

          <div className="mt-auto flex items-end justify-between gap-3 pt-5">
            {/* Wraps instead of cutting with an ellipsis: this line is the exact list of stacks the card searches. */}
            <span className="min-w-0 font-mono text-[11px] font-medium uppercase leading-snug tracking-wider text-neutral-400">{t.picks.join(" + ")}</span>
            <ArrowUpRight
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-neutral-500 transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-200"
            />
          </div>
        </CardContent>
      </Card>
    </li>
  )
}

/** The starting points and the Shuffle button. The deck comes from a small store (see K0_deck), so it is dealt in the browser only. */
function StartingPoints({ onRun }: { onRun: (t: Template) => void }) {
  const deck = useSyncExternalStore<Deck | null>(subscribeDeck, getDeck, getServerDeck)
  // The icon turns half a turn when the cards start to leave and the other half when new ones arrive.
  const turn = (deck?.run ?? 0) * 360 + (deck?.leaving ? 180 : 0)
  return (
    <section aria-labelledby="hunt-starts" className="mt-14 sm:mt-16">
      <SectionTitle
        as="h3"
        aside={
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-neutral-400 md:inline">One click runs the search · {TEMPLATES.length} combinations</span>
            <button type="button" onClick={shuffleDeck} disabled={!deck} className={cn(ACTION_BTN, "gap-2 disabled:opacity-60")}>
              <Shuffle
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-500 ease-out motion-reduce:transition-none"
                style={{ transform: `rotate(${turn}deg)` }}
                strokeWidth={2}
              />
              Shuffle
              <span className="sr-only"> starting points</span>
            </button>
          </div>
        }
      >
        <span id="hunt-starts">Starting points</span>
      </SectionTitle>
      <ul key={deck?.run ?? -1} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {deck
          ? deck.cards.map((t, i) => <TemplateCard key={t.key} t={t} index={i} leaving={deck.leaving} onRun={onRun} />)
          : Array.from({ length: DECK_SIZE }, (_, i) => <li key={i} aria-hidden="true" className="hunt-skel h-[176px] rounded-xl border border-white/[0.06]" />)}
      </ul>
      <p role="status" className="sr-only">
        {deck && deck.run > 0 && !deck.leaving ? `New starting points: ${deck.cards.slice(0, 3).map((c) => c.title).join(", ")} and ${deck.cards.length - 3} more.` : ""}
      </p>
    </section>
  )
}

/** True once an element has been scrolled into view (and stays true), so a section can play its entrance when it is first seen. */
function useInView<T extends Element>() {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      queueMicrotask(() => setSeen(true))
      return
    }
    const watcher = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true)
          watcher.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [])
  return [ref, seen] as const
}

const HOW_STEPS = [
  { icon: Layers, title: "Pick your stacks", text: "A language finds repos written in it. A framework or tool finds issues that mention it. Every stack is its own GitHub search, so a busy one can't crowd out the others." },
  { icon: Gauge, title: "Choose how hard", text: "Difficulty is a real GitHub label on the issue, so nothing is guessed. Change it any time in the filters." },
  { icon: ShieldCheck, title: "Every repo is checked", text: "Hunt reads each repo's latest merged pull request. Active means one was merged in the last six months." },
  { icon: PenLine, title: "Claim it with confidence", text: "Open an issue to see who is on it and whether someone already asked, then draft a short, honest comment. Any term you don't know has a Learn guide." },
] as const

/** What a search does, step by step. The chips are live: the first row is your own stack, the second marks your own level. */
function HowItWorks({ picks, difficulty }: { picks: string[]; difficulty: Difficulty }) {
  const [ref, seen] = useInView<HTMLOListElement>()
  const chip = cn(CHIP_SOFT, "font-mono text-[11.5px]")
  const tags = [
    <>
      {picks.slice(0, 3).map((p) => (
        <span key={p} className={CHIP_SOFT}>
          <TechIcon option={findLanguageOption(p)} className="h-3.5 w-3.5" />
          {p}
        </span>
      ))}
      <span className={chip}>{picks.length > 3 ? `+${picks.length - 3} more` : `up to ${MAX_PICKS}`}</span>
    </>,
    <>
      {DIFFICULTIES.map((d) => (
        <span key={d} className={cn(chip, d === difficulty && "border-white/30 bg-white/[0.09] text-white")}>
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DIFF[d].dot)} />
          {DIFF[d].rule}
          {d === difficulty && <span className="sr-only"> (your level)</span>}
        </span>
      ))}
    </>,
    <>
      <span className={CHIP_SOFT}>
        <Dot tone="good" />
        Active
      </span>
      <span className={CHIP_SOFT}>
        <Dot tone="bad" />
        Inactive
      </span>
    </>,
    <>
      <span className={CHIP_SOFT}>
        <UserCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
        Claim check
      </span>
      <span className={CHIP_SOFT}>
        <PenLine aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
        Proposal
      </span>
      <span className={CHIP_SOFT}>
        <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
        Learn guides
      </span>
    </>,
  ]
  return (
    <section aria-labelledby="hunt-how" className="mt-14 sm:mt-16">
      <SectionTitle as="h3">
        <span id="hunt-how">How a search works</span>
      </SectionTitle>
      <ol ref={ref} className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] md:grid-cols-2 xl:grid-cols-4">
        {HOW_STEPS.map((s, i) => (
          <li
            key={s.title}
            className={cn("flex flex-col gap-3.5 bg-[#0b0b0b] p-4 transition-colors duration-300 hover:bg-[#0e0e0e] sm:p-5", seen ? "hunt-rise" : "opacity-0")}
            style={cssVars({ "--d": `${i * 110}ms` })}
          >
            <div className="flex items-center justify-between gap-3">
              <IconTile className="h-9 w-9">
                <s.icon className="h-4 w-4" strokeWidth={2} />
              </IconTile>
              <span aria-hidden="true" className="font-mono text-[11px] font-semibold tracking-[0.14em] text-neutral-400">
                0{i + 1}
              </span>
            </div>
            <div className="min-w-0">
              <h4 className="text-[14.5px] font-medium text-neutral-100">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-neutral-400">{s.text}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">{tags[i]}</div>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The one control a first-time visitor needs: the stack they are about to search, and the button that searches it. */
function HeroSearch({
  picks,
  difficulty,
  filterCount,
  onOpenPicker,
  onSearch,
}: {
  picks: string[]
  difficulty: Difficulty
  filterCount: number
  onOpenPicker: () => void
  onSearch: () => void
}) {
  return (
    <div className="hunt-rise mt-7" style={cssVars({ "--d": "150ms" })}>
      <div className="flex flex-col gap-2 rounded-xl border border-white/[0.12] bg-[#0d0d0d] p-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onOpenPicker}
          aria-haspopup="dialog"
          className="group flex h-14 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-3 text-left outline-none transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span aria-hidden="true" className="flex shrink-0 -space-x-2">
            {picks.length === 0 ? (
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-white/25 text-neutral-400">
                <Plus className="h-4 w-4" strokeWidth={2} />
              </span>
            ) : (
              picks.slice(0, 3).map((p) => (
                <span key={p} className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-[#161616]">
                  <TechIcon option={findLanguageOption(p)} className="h-4 w-4" />
                </span>
              ))
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Stack</span>
            <span className="block truncate text-[15px] font-medium text-neutral-100">{picks.length > 0 ? picks.join(", ") : "Choose your stack"}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400 transition-colors group-hover:text-neutral-200" strokeWidth={2} />
        </button>
        <Button id="hunt-hero-search" type="button" onClick={onSearch} disabled={picks.length === 0} className={cn(LIME_BTN, "hunt-sheen h-14 px-7 text-[14.5px] disabled:opacity-60")}>
          <Search className="h-4 w-4" strokeWidth={2.25} />
          Search issues
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[12.5px] text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DIFF[difficulty].dot)} />
          {DIFF[difficulty].label} difficulty
          <span className="sr-only"> (label: {DIFF[difficulty].rule})</span>
        </span>
        <FiltersButton count={filterCount} className="h-9 px-3 text-[12.5px]" />
        <span className="hidden lg:inline">Change it, or add paid bounties, in the sidebar.</span>
      </div>
    </div>
  )
}

function Landing({
  picks,
  difficulty,
  filterCount,
  notice,
  onOpenPicker,
  onSearch,
  onRunTemplate,
}: {
  picks: string[]
  difficulty: Difficulty
  filterCount: number
  /** A line that explains why the page looks the way it does (filled in from a link, a search was cancelled). */
  notice: string | null
  onOpenPicker: () => void
  onSearch: () => void
  onRunTemplate: (t: Template) => void
}) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="hunt-dots pointer-events-none absolute inset-x-0 top-0 h-[480px]" />
      <div className="relative mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:pt-16">
        <section aria-labelledby="hunt-hero" className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_200px] lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <h2 id="hunt-hero" className="hunt-blur text-balance text-[30px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[42px]">
              What do you want to hunt today?
            </h2>
            <p className="hunt-rise mt-3.5 max-w-xl text-[15px] leading-relaxed text-neutral-400 sm:text-[16px]" style={cssVars({ "--d": "90ms" })}>
              Pick your stack and a difficulty. Hunt searches GitHub for open issues that fit, then checks each repo is still being maintained.
            </p>
            <HeroSearch picks={picks} difficulty={difficulty} filterCount={filterCount} onOpenPicker={onOpenPicker} onSearch={onSearch} />
            {notice && (
              <p role="status" className="hunt-rise mt-3 flex items-start gap-2 px-1 text-[12.5px] leading-relaxed text-neutral-300">
                <InfoIcon aria-hidden="true" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
                <span>{notice}</span>
              </p>
            )}
          </div>

          <div aria-hidden="true" className="hunt-fade mx-auto hidden w-full md:block">
            <div className="hunt-scope">
              <span className="hunt-blip" style={cssVars({ "--x": "66%", "--y": "30%", "--d": "0.2s" })} />
              <span className="hunt-blip" style={cssVars({ "--x": "34%", "--y": "40%", "--d": "1.4s" })} />
              <span className="hunt-blip" style={cssVars({ "--x": "58%", "--y": "70%", "--d": "2.5s" })} />
              <span className="hunt-blip" style={cssVars({ "--x": "27%", "--y": "66%", "--d": "3.1s" })} />
              <span className="hunt-float absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-transparent shadow-[0_0_28px_rgba(168,255,62,0.2)] ring-0">
                <HuntMark className="h-8 w-8 drop-shadow-[0_0_18px_rgba(168,255,62,0.42)]" />
              </span>
            </div>
          </div>
        </section>

        <StartingPoints onRun={onRunTemplate} />

        <HowItWorks picks={picks} difficulty={difficulty} />
      </div>
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
    <div role={role} className="hunt-rise mx-auto w-full max-w-lg px-4 py-12 sm:py-20">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d] px-6 pb-7 pt-9 text-center sm:px-9">
        <div aria-hidden="true" className="hunt-dots pointer-events-none absolute inset-x-0 top-0 h-40 opacity-70" />
        <span
          className={cn(
            "relative mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border",
            tone === "danger" ? "border-rose-500/25 bg-rose-500/10 text-rose-400" : "border-white/10 bg-[#141414] text-neutral-200"
          )}
        >
          {icon}
        </span>
        <h2 className="relative mb-1.5 text-[18px] font-semibold tracking-tight text-neutral-100">{title}</h2>
        <p className="relative mx-auto mb-6 max-w-sm text-[13.5px] leading-relaxed text-neutral-400">{message}</p>
        {children && <div className="relative flex flex-wrap items-center justify-center gap-2.5">{children}</div>}
      </div>
    </div>
  )
}

// ── Live progress ────────────────────────────────────────────────────────────
// The server streams what it is doing (see /api/issues?stream=1), and this folds those events into the lines below.
// A stack with more repos behind it produces more lines, because every search and every repo check is reported as it
// finishes. Nothing here is a timer pretending to be progress.

interface SearchLine {
  selection: string
  language: string | null
  ok: boolean
  found: number
  ms: number
}
interface RepoLine {
  repo: string
  active: boolean
  last: string | null
}
interface ProgressState {
  selections: string[]
  queries: number
  searches: SearchLine[]
  merge: { found: number; kept: number } | null
  reposTotal: number | null
  repos: RepoLine[]
}

const NO_PROGRESS: ProgressState = { selections: [], queries: 0, searches: [], merge: null, reposTotal: null, repos: [] }

/** Folds one streamed server event into the progress state. Anything malformed or unknown is ignored. */
function applyProgress(prev: ProgressState | null, ev: Record<string, unknown>): ProgressState | null {
  const base = prev ?? NO_PROGRESS
  switch (ev.t) {
    case "start": {
      const selections = asArr(ev.selections).filter((s): s is string => typeof s === "string")
      return { ...NO_PROGRESS, selections, queries: asNum(ev.queries) || selections.length }
    }
    case "search": {
      const selection = asStr(ev.selection)
      if (!selection) return base
      const line: SearchLine = { selection, language: asStr(ev.language), ok: ev.ok === true, found: asNum(ev.found), ms: asNum(ev.ms) }
      return { ...base, searches: [...base.searches, line] }
    }
    case "merge":
      return { ...base, merge: { found: asNum(ev.found), kept: asNum(ev.kept) } }
    case "repos":
      return { ...base, reposTotal: asNum(ev.total) }
    case "health": {
      const repo = asStr(ev.repo)
      if (!repo) return base
      return { ...base, repos: [...base.repos, { repo, active: ev.active !== false, last: asStr(ev.last) }] }
    }
    default:
      return prev
  }
}

type StageState = "done" | "active" | "pending"

function Stage({ state, title, hint, aside, last, children }: { state: StageState; title: string; hint?: string; aside?: ReactNode; last?: boolean; children?: ReactNode }) {
  return (
    <li className={cn("relative flex gap-3", last ? "pb-1" : "pb-4")}>
      {!last && <span className={cn("absolute bottom-[-2px] left-[8.5px] top-[22px] w-px", state === "done" ? "bg-white/25" : "bg-white/[0.08]")} />}
      <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        {state === "done" ? (
          <span className="hunt-pop flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
        ) : state === "active" ? (
          <span className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-white/15 border-t-white motion-reduce:[animation-duration:3s]" />
        ) : (
          <span className="h-[14px] w-[14px] rounded-full border border-white/25" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("text-[13.5px] font-medium", state === "pending" ? "text-neutral-400" : "text-neutral-100")}>{title}</p>
          {aside && state !== "pending" && <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-neutral-400">{aside}</span>}
        </div>
        {hint && state === "active" && <p className="hunt-fade mt-0.5 text-[12px] leading-snug text-neutral-400">{hint}</p>}
        {children}
      </div>
    </li>
  )
}

const LOG_LINE = "hunt-rise flex min-w-0 items-center justify-between gap-3 font-mono text-[12px] leading-5"
const HEALTH_LINES = 6

function SearchProgress({
  progress,
  picks,
  target,
  difficulty,
  bounty,
  onCancel,
}: {
  progress: ProgressState | null
  picks: string[]
  target: string
  difficulty: Difficulty
  bounty: boolean
  onCancel: () => void
}) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => setElapsed(performance.now() - start), 250)
    return () => window.clearInterval(id)
  }, [])

  const p = progress ?? NO_PROGRESS
  const searchState: StageState = p.queries > 0 && p.searches.length >= p.queries ? "done" : "active"
  const mergeState: StageState = p.merge ? "done" : searchState === "done" ? "active" : "pending"
  const healthState: StageState = p.reposTotal === null ? "pending" : p.repos.length >= p.reposTotal ? "done" : "active"
  const finished = healthState === "done"
  const recent = p.repos.slice(-HEALTH_LINES).reverse()
  const earlier = p.repos.length - recent.length
  const summary = [target, DIFF[difficulty].label, bounty ? "Paid bounties" : null].filter(Boolean).join(" · ")

  // Three steps, and a bar that moves with the real counts: searches answered, results merged, repos checked.
  const step = p.merge ? 3 : searchState === "done" ? 2 : 1
  const searchShare = p.queries > 0 ? Math.min(1, p.searches.length / p.queries) : 0
  const healthShare = p.reposTotal === null ? 0 : p.reposTotal === 0 ? 1 : Math.min(1, p.repos.length / p.reposTotal)
  const fraction = 0.4 * searchShare + (p.merge ? 0.1 : 0) + 0.5 * healthShare
  // Stacks the server has not answered for yet are listed from the first moment, so the card is full before the first reply.
  const answered = new Set(p.searches.map((s) => s.selection.toLowerCase()))
  const waitingOn = searchState === "active" ? picks.filter((label) => !answered.has(label.toLowerCase())) : []
  const planned = p.queries || picks.length
  const spoken = `Step ${step} of 3. ${
    healthState === "pending" ? (mergeState === "pending" ? "Searching GitHub" : "Combining results") : `Checking ${p.reposTotal} ${p.reposTotal === 1 ? "repository" : "repositories"}`
  }`

  return (
    <div className="hunt-fade overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
      <span role="status" className="sr-only">
        {spoken}
      </span>
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div aria-hidden="true" className="min-w-0">
          <p className="text-[14px] font-medium text-neutral-100">Searching GitHub</p>
          <p className="truncate text-[12.5px] text-neutral-400">{summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span aria-hidden="true" className="hidden font-mono text-[11.5px] text-neutral-400 sm:inline">
            Step {step} of 3
          </span>
          <span aria-hidden="true" className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[12px] tabular-nums text-neutral-300">
            {formatElapsed(elapsed)}
          </span>
          <button type="button" onClick={onCancel} className={cn(ACTION_BTN, "gap-1.5")}>
            <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
            Cancel<span className="sr-only"> search</span>
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-[2px] overflow-hidden bg-white/[0.06]">
        {progress === null ? (
          <span className="hunt-bar absolute inset-y-0 left-0 w-1/3 bg-white/50 motion-reduce:hidden" />
        ) : (
          <span
            className="absolute inset-0 origin-left bg-white/70 transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `scaleX(${Math.max(0.04, fraction)})` }}
          />
        )}
      </div>

      <div aria-hidden="true">
        <ol className="px-4 pb-2 pt-4 sm:px-5">
          <Stage
            state={searchState}
            title={planned > 1 ? `Running ${planned} searches` : "Running the search"}
            hint="One GitHub search for every stack, all at once."
            aside={p.queries > 0 ? `${Math.min(p.searches.length, p.queries)}/${p.queries}` : undefined}
          >
            {(p.searches.length > 0 || waitingOn.length > 0) && (
              <ul className="mt-2 space-y-1">
                {p.searches.map((s, i) => (
                  <li key={`${s.selection}-${s.language ?? "any"}-${i}`} className={LOG_LINE}>
                    <span className="flex min-w-0 items-center gap-2 text-neutral-200">
                      <TechIcon option={findLanguageOption(s.selection)} className="h-3 w-3" />
                      <span className="truncate">
                        {findLanguageOption(s.selection)?.label ?? s.selection}
                        <span className="text-neutral-400"> in {s.language ? `${findLanguageOption(s.language)?.label ?? s.language} repos` : "any language"}</span>
                      </span>
                    </span>
                    <span className={cn("shrink-0 tabular-nums", s.ok ? "text-neutral-400" : "text-rose-300")}>
                      {s.ok ? `${s.found} found · ${s.ms} ms` : "failed"}
                    </span>
                  </li>
                ))}
                {waitingOn.map((label) => (
                  <li key={`waiting-${label}`} className={LOG_LINE}>
                    <span className="flex min-w-0 items-center gap-2 text-neutral-300">
                      <TechIcon option={findLanguageOption(label)} className="h-3 w-3" />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="shrink-0 text-neutral-400">searching</span>
                  </li>
                ))}
              </ul>
            )}
          </Stage>

          <Stage state={mergeState} title="Sharing results across your stacks" hint="So a busy stack can't crowd out the others.">
            {p.merge && (
              <p className={cn(LOG_LINE, "mt-2 justify-start text-neutral-400")}>
                {p.merge.found} found, {p.merge.kept} kept{p.selections.length > 1 ? `, a fair share for each of ${p.selections.length} stacks` : ""}
              </p>
            )}
          </Stage>

          <Stage
            last
            state={healthState}
            title="Checking repo health"
            hint="Active means a pull request was merged in the last six months."
            aside={p.reposTotal !== null ? (p.reposTotal === 0 ? "none" : `${Math.min(p.repos.length, p.reposTotal)}/${p.reposTotal} repos`) : undefined}
          >
            {recent.length > 0 && (
              <ul className="mt-2 space-y-1">
                {recent.map((r) => (
                  <li key={r.repo} className={LOG_LINE}>
                    <span className="flex min-w-0 items-center gap-2 text-neutral-200">
                      <Dot tone={r.active ? "good" : "bad"} />
                      <span className="truncate">{r.repo}</span>
                    </span>
                    <span className={cn("shrink-0", r.active ? "text-neutral-400" : "text-rose-300")}>
                      {r.active ? "Active" : "Inactive"}
                      {r.last ? ` · merged ${timeAgo(r.last)}` : ""}
                    </span>
                  </li>
                ))}
                {earlier > 0 && <li className={cn(LOG_LINE, "justify-start text-neutral-400")}>+{earlier} more checked</li>}
              </ul>
            )}
          </Stage>
        </ol>

        {elapsed > 8000 && !finished && (
          <p className="hunt-fade border-t border-white/[0.06] px-4 py-2.5 text-[12.5px] text-neutral-400 sm:px-5">
            Still working. GitHub can take a few seconds more for busy stacks.
          </p>
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Results toolbar (sticky): filters trigger · summary chips · sort
// ────────────────────────────────────────────────────────────────────────────

const CHIP =
  "h-8 shrink-0 gap-1.5 whitespace-nowrap rounded-md border-white/[0.09] bg-white/[0.03] px-2 text-[12px] font-medium text-neutral-300 lg:h-7"

/** True while an element's content is wider than the element, so it can be given a keyboard stop only when it actually scrolls. */
function useScrollsX() {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [scrolls, setScrolls] = useState(false)
  useEffect(() => {
    if (!node) return
    const measure = () => setScrolls(node.scrollWidth > node.clientWidth + 1)
    const resize = new ResizeObserver(measure)
    const mutate = new MutationObserver(measure)
    resize.observe(node)
    mutate.observe(node, { childList: true, subtree: true, characterData: true })
    return () => {
      resize.disconnect()
      mutate.disconnect()
    }
  }, [node])
  return [setNode, scrolls] as const
}

function ResultCount({ n }: { n: number }) {
  const shown = useCountUp(n)
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 font-mono text-[12.5px] text-neutral-300">
      <span aria-hidden="true">
        <span className="font-semibold tabular-nums text-neutral-100">{shown}</span> {n === 1 ? "issue" : "issues"}
      </span>
      <span role="status" className="sr-only">
        {n} {n === 1 ? "issue" : "issues"} found
      </span>
    </span>
  )
}

/** Opens the filters drawer below `lg`. Must sit inside the page-level <Sheet>. Shows how many filters differ from the defaults. */
function FiltersButton({ count, className }: { count: number; className?: string }) {
  return (
    <SheetTrigger asChild>
      <button
        type="button"
        className={cn(
          "inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-[13px] font-medium text-neutral-100 outline-none transition-[background-color,border-color,transform] duration-150 hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.97] lg:hidden",
          className
        )}
      >
        <SlidersHorizontal className="h-4 w-4 text-neutral-300" strokeWidth={2} />
        Filters
        {count > 0 && (
          <>
            <span
              aria-hidden="true"
              className="ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-md bg-white/[0.12] px-1 font-mono text-[11px] font-semibold tabular-nums text-white"
            >
              {count}
            </span>
            <span className="sr-only">, {count} active</span>
          </>
        )}
      </button>
    </SheetTrigger>
  )
}

/** The current stack in the toolbar. It is also the way back into the picker, so changing it is one click from the results. */
function StackChip({ picks, onOpen }: { picks: string[]; onOpen: () => void }) {
  const label = picks.length === 0 ? "No stack" : picks.length === 1 ? picks[0] : `${picks[0]} +${picks.length - 1}`
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      title={picks.join(", ")}
      className={cn(
        "group inline-flex shrink-0 cursor-pointer items-center rounded-md border px-2 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/50",
        "h-8 gap-1.5 border-white/[0.09] bg-white/[0.03] text-neutral-300 hover:border-white/25 hover:bg-white/[0.07] hover:text-white lg:h-7"
      )}
    >
      <span aria-hidden="true" className="flex -space-x-1">
        {picks.slice(0, 3).map((p) => (
          <span key={p} className="flex h-4 w-4 items-center justify-center rounded bg-[#161616] ring-1 ring-[#0b0b0b]">
            <TechIcon option={findLanguageOption(p)} className="h-2.5 w-2.5" />
          </span>
        ))}
      </span>
      <span className="sr-only">Stack: {picks.join(", ") || "none"}. </span>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">Change stack</span>
      <ChevronDown aria-hidden="true" className="h-3 w-3 text-neutral-500 transition-colors group-hover:text-neutral-300" strokeWidth={2} />
    </button>
  )
}

/**
 * Sorting only reorders what is already on the page, so the menu says so. Options are grouped by what they answer
 * (how fresh, how discussed, is it free to claim) and each one explains itself in a line.
 */
function SortMenu({ value, onChange, count }: { value: SortBy; onChange: (v: SortBy) => void; count: number }) {
  const current = SORT_OPTIONS.find((s) => s.value === value) ?? SORT_OPTIONS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort issues. Current: ${current.label}`}
          className="group ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] pl-3 pr-2.5 text-[12.5px] outline-none transition-[background-color,border-color] duration-150 hover:border-white/20 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/50 data-[state=open]:border-white/25 data-[state=open]:bg-white/[0.07] sm:ml-0 lg:h-8"
        >
          <current.icon aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2} />
          <span className="hidden text-neutral-400 min-[400px]:inline">Sort</span>
          <span className="max-w-[8.5rem] truncate font-medium text-neutral-100">{current.short}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 group-data-[state=open]:rotate-180" strokeWidth={2} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="hunt-scroll max-h-[min(78dvh,32rem)] w-[min(19.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border-white/10 bg-[#0e0e0e] p-1.5 text-neutral-200 shadow-[0_18px_44px_rgba(0,0,0,0.6)]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortBy)}>
          {SORT_GROUPS.map((g, gi) => (
            <div key={g.label} role="presentation">
              {gi > 0 && <DropdownMenuSeparator className="my-1.5 bg-white/[0.07]" />}
              <DropdownMenuLabel className="px-2.5 pb-1 pt-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {g.label}
              </DropdownMenuLabel>
              {g.options.map((o) => (
                <DropdownMenuRadioItem
                  key={o.value}
                  value={o.value}
                  // The built-in indicator sits on a different side per shadcn version, so it is hidden and drawn once, at the right.
                  className="cursor-pointer rounded-lg py-2 pl-2.5 pr-9 focus:bg-white/[0.07] focus:text-white data-[state=checked]:bg-white/[0.06] [&_span[data-state]]:hidden"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <IconTile className={cn(value === o.value && "border-white/25 bg-white/[0.09] text-white")}>
                      <o.icon className="h-4 w-4" strokeWidth={2} />
                    </IconTile>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[13px] font-medium text-neutral-100">{o.label}</span>
                      <span className="text-[11.5px] text-neutral-400">{o.hint}</span>
                    </span>
                  </span>
                  {value === o.value && (
                    <Check aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-100" strokeWidth={2.25} />
                  )}
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
        <div className="mt-1.5 border-t border-white/[0.07] px-2.5 pb-1 pt-2 text-[11.5px] leading-snug text-neutral-400">
          Reorders the {count} {count === 1 ? "issue" : "issues"} already loaded. It doesn&apos;t search again.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ResultsToolbar({
  scrolled,
  busy,
  mode,
  count,
  filterCount,
  difficulty,
  picks,
  bountyOnly,
  activeOnly,
  sortBy,
  setSortBy,
  onOpenPicker,
}: {
  scrolled: boolean
  busy: boolean
  mode: "loading" | "results" | "other"
  count: number
  filterCount: number
  difficulty: Difficulty
  picks: string[]
  bountyOnly: boolean
  activeOnly: boolean
  sortBy: SortBy
  setSortBy: (v: SortBy) => void
  onOpenPicker: () => void
}) {
  const showSort = mode === "results" && count > 0
  const [stripRef, stripScrolls] = useScrollsX()

  return (
    <div
      className={cn(
        "sticky top-0 z-20 border-b bg-[#090909]/85 backdrop-blur-xl transition-[border-color,box-shadow] duration-300",
        scrolled ? "border-white/[0.09] shadow-[0_10px_30px_-14px_rgba(0,0,0,0.9)]" : "border-white/[0.05]",
        mode === "other" && "lg:hidden"
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:flex-nowrap sm:px-6 lg:py-2">
        <FiltersButton count={filterCount} />

        {/* One scrolling line of chips: never wraps into a tall block, even with every filter on. */}
        <div
          ref={stripRef}
          role="group"
          aria-label="Search summary"
          // Keyboard users can only scroll this line if it can take focus, so it becomes a tab stop only while it overflows.
          tabIndex={stripScrolls ? 0 : undefined}
          className="hunt-hide-scrollbar order-3 flex min-w-0 basis-full items-center gap-2 overflow-x-auto rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 sm:order-none sm:flex-1 sm:basis-auto"
        >
          {mode === "loading" && (
            <span className="font-mono text-[12.5px] text-neutral-400" aria-hidden="true">
              Searching…
            </span>
          )}

          {mode === "results" && (
            <>
              <ResultCount n={count} />
              <span aria-hidden="true" className="h-4 w-px shrink-0 bg-white/10" />
              <StackChip picks={picks} onOpen={onOpenPicker} />
              <Badge variant="outline" className={CHIP}>
                <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DIFF[difficulty].dot)} />
                {DIFF[difficulty].label}
              </Badge>
              {bountyOnly && (
                <Badge variant="outline" className={CHIP}>
                  <Coins aria-hidden="true" className="h-3 w-3 text-neutral-400" strokeWidth={2} /> Bounties
                </Badge>
              )}
              {activeOnly && (
                <Badge variant="outline" className={CHIP}>
                  <Zap aria-hidden="true" className="h-3 w-3 text-neutral-400" strokeWidth={2} /> Active only
                </Badge>
              )}
            </>
          )}
        </div>

        {showSort && <SortMenu value={sortBy} onChange={setSortBy} count={count} />}
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
// Learn: short plain-English guides for the places in the details panel where a newcomer may not know what
// they are looking at. They are written text, filled in with this issue's own facts, so they cost no AI and
// no API call. A guide opens as one more view of the drawer, so Back and Escape step out of it.
// ────────────────────────────────────────────────────────────────────────────

type LearnId = "issue" | "author" | "assigned" | "labels" | "claim" | "first-pr" | "stats" | "license" | "health" | "community"
type DotTone = "good" | "warn" | "bad" | "muted"

const LEARN_META: Record<LearnId, { title: string; sub: string }> = {
  issue: { title: "Reading an issue", sub: "What to check before you pick one" },
  author: { title: "Who opened it", sub: "What the role beside a name tells you" },
  assigned: { title: "Assigned or open?", sub: "What an assignee means, and how to ask" },
  labels: { title: "What labels mean", sub: "The tags maintainers use to sort issues" },
  claim: { title: "Claiming an issue", sub: "Tell the maintainers you are taking it" },
  "first-pr": { title: "Your first contribution", sub: "From fork to pull request, step by step" },
  stats: { title: "Reading the numbers", sub: "What stars, forks and open issues tell you" },
  license: { title: "The license", sub: "What it allows, and what it means for you" },
  health: { title: "Is this project alive?", sub: "Check before you spend an evening on it" },
  community: { title: "Contributor docs", sub: "The files that tell you how to join in" },
}

/** Official pages the guides point to, as [label, address]. */
const DOCS = {
  issues: ["About issues", "https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues"],
  labels: ["Helpful contributions with labels", "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/encouraging-helpful-contributions-to-your-project-with-labels"],
  assign: ["Assigning issues and pull requests", "https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/assigning-issues-and-pull-requests-to-other-github-users"],
  contribute: ["How to contribute to open source", "https://opensource.guide/how-to-contribute/"],
  project: ["Contributing to a project", "https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project"],
  linking: ["Linking a pull request to an issue", "https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue"],
  stars: ["Saving repositories with stars", "https://docs.github.com/en/get-started/exploring-projects-on-github/saving-repositories-with-stars"],
  license: ["Licensing a repository", "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository"],
  legal: ["The legal side of open source", "https://opensource.guide/legal/"],
  profile: ["About community profiles", "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories"],
  guidelines: ["Setting guidelines for contributors", "https://docs.github.com/articles/setting-guidelines-for-repository-contributors"],
} satisfies Record<string, [string, string]>

interface Lesson {
  lead: string
  /** What is true of this issue or repo right now, so the guide is about this one and not about issues in general. */
  here?: { title: string; lines: { tone: DotTone; text: string }[] }
  /** A short glossary. `mine` tags the entry that applies here. */
  terms?: { term: string; text: string; mine?: string }[]
  steps?: { title: string; text: string; cmd?: [string, string][]; link?: [string, string] }[]
  avoid?: string[]
  docs?: [string, string][]
  next?: LearnId[]
}

interface LearnCtx {
  issue: Issue
  repoFull: string
  repoUrl: string
  name: string
  number: number | null
  repo: Part<RepoInfo>
  release: Part<ReleaseInfo>
  community: Part<CommunityInfo>
}

/** [matches the label name, the word shown, what it means, how it reads]. */
const LABEL_GUIDE: [RegExp, string, string, DotTone][] = [
  [/good.?first|beginner|newcomer|first.?timers?|\beasy\b|low.?hanging/i, "good first issue", "The maintainers think a newcomer can do this one.", "good"],
  [/help.?wanted/i, "help wanted", "The maintainers would welcome an outside contributor on this.", "good"],
  [/\bbugs?\b/i, "bug", "Something is broken or behaves wrongly.", "muted"],
  [/enhancement|feature/i, "enhancement", "A new feature, or an improvement to an existing one.", "muted"],
  [/\bdocs?\b|documentation/i, "documentation", "Docs to write or fix. A good first contribution, since you do not need to know the whole codebase.", "muted"],
  [/question|support/i, "question", "Someone is asking for help instead of reporting a problem.", "muted"],
  [/triage/i, "needs triage", "Nobody on the team has looked at it closely yet, so it may still be changed or rejected.", "warn"],
  [/duplicate/i, "duplicate", "The same issue already exists. Follow the original one instead.", "warn"],
  [/won'?t.?fix|invalid/i, "wontfix", "The maintainers decided not to do this. Pick another issue.", "warn"],
]

/** [matches the license id, the name shown, what it means]. */
const LICENSE_GUIDE: [RegExp, string, string][] = [
  [/^(mit|isc)/i, "MIT, ISC", "Very permissive. Anyone may use, change and sell the code if they keep the copyright notice."],
  [/^apache/i, "Apache 2.0", "Permissive, and it grants patent rights. Changed files should say they were changed."],
  [/^bsd/i, "BSD", "Permissive, like MIT. Keep the copyright notice."],
  [/^mpl/i, "MPL 2.0", "Changes to the project's own files must be shared under the same license. Your other code stays yours."],
  [/^gpl/i, "GPL", "Copyleft. If you share software built on this code, you must share it under the same license."],
  [/^lgpl/i, "LGPL", "A lighter copyleft. Changes to the library must be shared, but other software can use it freely."],
  [/^agpl/i, "AGPL", "Copyleft that also covers software offered as an online service."],
  [/unlicense|^cc0/i, "Unlicense, CC0", "Given to the public. Anyone may do anything with it."],
]

function lessonFor(id: LearnId, c: LearnCtx): Lesson {
  const { issue, repoFull, repoUrl, name, number } = c
  const ref = number !== null ? `#${number}` : "this issue"
  const repo = c.repo.status === "ok" ? c.repo.data : null
  const community = c.community.status === "ok" ? c.community.data : null
  const guide = community?.contributingUrl ?? null
  const { assignees } = claimSignals(issue)
  const labelNames = (issue.labels ?? []).map((l) => l.name)
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : (xs[0] ?? ""))

  switch (id) {
    case "issue":
      return {
        lead: "An issue is a written task or problem report. The maintainers decide what happens to it. You decide whether you can help.",
        here: {
          title: "On this issue",
          lines: [
            {
              tone: "muted",
              text: `${detectIssueType(issue.title).label}, opened ${timeAgo(issue.created_at)}, with ${plural(issue.comments, "comment", "comments")} and ${plural(issue.reactions?.total_count ?? 0, "reaction", "reactions")}.`,
            },
          ],
        },
        steps: [
          { title: "Is it clear?", text: "A good first issue says what is wrong, what should happen instead, and ideally where in the code to look. If you cannot tell what done looks like, ask before you start." },
          { title: "Can you run the project?", text: "Follow the README to run it on your computer. If you cannot reproduce the problem, say so in a comment. That is useful to the maintainers too." },
          { title: "Is it small enough?", text: "Pick something you can finish in a few hours. A change to a few files gets reviewed faster than a big one." },
          { title: "Is anyone on it?", text: "Check the assignee and the Claim check, so you do not repeat someone else's work." },
        ],
        avoid: [
          "Skipping the comments. A maintainer may already have said the issue is on hold, or pointed to the fix.",
          "Judging difficulty by reactions. A popular issue is not always an easy one.",
        ],
        docs: [DOCS.issues, DOCS.contribute],
        next: ["labels", "claim"],
      }

    case "author": {
      const info = issueInfoOf(issue)
      const role = roleOf(info.association)
      return {
        lead: "GitHub tags the person who opened an issue with how they relate to the project. It helps you judge how far to trust the report.",
        here: info.author
          ? { title: "On this issue", lines: [{ tone: role ? "good" : "muted", text: role ? `${info.author} is tagged ${role}.` : `${info.author} has no tag, so they are a regular community member.` }] }
          : undefined,
        terms: [
          { term: "Maintainer", text: "Owns the repo, belongs to its organization, or was invited to help run it. An issue from a maintainer is usually work the project wants done.", mine: role === "Maintainer" ? "This author" : undefined },
          { term: "Contributor", text: "Has had code merged into this repo before, so they know how the project works.", mine: role === "Contributor" ? "This author" : undefined },
          { term: "First-time contributor", text: "This is their first contribution here. The report may be right, but it can need a closer look.", mine: role === "First-time contributor" ? "This author" : undefined },
          { term: "No tag", text: "An ordinary community member, which is most people who report problems.", mine: info.author && !role ? "This author" : undefined },
        ],
        steps: [
          { title: "From a maintainer", text: "Usually safe to take, because the project wants it. Ask in the thread if anything is unclear." },
          { title: "From anyone else", text: "Try to reproduce the problem first. If you can, say so in a comment. That shows the report is real before you spend time on it." },
        ],
        next: ["claim", "assigned"],
      }
    }

    case "assigned":
      return {
        lead: "An assignee is someone the project has asked, or allowed, to work on the issue. It does not always mean they are still doing it.",
        here: {
          title: "On this issue",
          lines: [
            assignees.length
              ? { tone: "warn", text: `${assignees.length > 3 ? `${assignees.slice(0, 2).join(", ")} and ${assignees.length - 2} more` : list(assignees)} ${assignees.length === 1 ? "is" : "are"} assigned to ${ref}.` }
              : { tone: "good", text: `Nobody is assigned to ${ref}, so you can ask to take it.` },
          ],
        },
        steps: assignees.length
          ? [
              { title: "See what they have done", text: `Select ${assignees[0]} in the Assignee row to see what they have done here, then open the Claim check. A linked pull request means they are on it.` },
              { title: "Ask if it has gone quiet", text: `If there is no sign of work for a few weeks, comment: “Hi @${assignees[0]}, are you still on this? I would like to take it if not.” Give them several days to answer.` },
              { title: "Or pick another issue", text: "There are plenty. Do not wait on one that may never move." },
            ]
          : [
              { title: "Read the thread first", text: "Someone may have asked to take it without being assigned yet. The Claim check flags comments that ask." },
              { title: "Ask to take it", text: "Comment that you would like to work on it, and how you plan to. Draft proposal writes a starting point you can edit." },
              { title: "Wait for a yes", text: "Many projects only let a maintainer assign issues. Some use a bot command such as `/assign`. The contributing guide says which." },
            ],
        avoid: [
          "Starting on an assigned issue without asking. Two people doing the same work wastes both of your time.",
          "Pinging the maintainers again and again. One polite follow-up after a few days is enough.",
        ],
        docs: [DOCS.assign],
        next: ["claim", "community"],
      }

    case "labels": {
      const known = (label: string) => LABEL_GUIDE.find(([re]) => re.test(label))
      return {
        lead: "Labels are short tags that maintainers put on issues to sort them. Each project picks its own, so the same word can mean slightly different things.",
        here: {
          title: "On this issue",
          lines: labelNames.length
            ? labelNames.slice(0, 5).map((label) => {
                const k = known(label)
                return { tone: k ? k[3] : "muted", text: `\`${label}\`: ${k ? k[2].replace(/^./, (ch) => ch.toLowerCase()) : "this project's own label."}` }
              })
            : [{ tone: "muted", text: "This issue has no labels yet. That usually means nobody has sorted it." }],
        },
        terms: LABEL_GUIDE.map(([re, term, text]) => ({ term, text, mine: labelNames.some((l) => re.test(l)) ? "On this issue" : undefined })),
        steps: [{ title: "Not on the list?", text: "Then it is the project's own label. Its labels page lists every label with a short description.", link: [`Labels in ${name}`, `https://github.com/${repoFull}/labels`] }],
        avoid: ["Treating a label as a promise. “Good first issue” is a maintainer's guess. Read the issue to see if it suits you."],
        docs: [DOCS.labels],
        next: ["issue", "claim"],
      }
    }

    case "claim":
      return {
        lead: "Claiming means telling the maintainers you plan to work on an issue, so two people do not do the same job. On most projects it is a comment. Some also need a maintainer to assign it to you.",
        here: {
          title: "On this issue",
          lines: [
            assignees.length
              ? { tone: "warn", text: `${assignees[0]} is already assigned. Ask in the thread before you start.` }
              : { tone: "good", text: `Nobody is assigned. ${issue.comments === 0 ? "There are no comments yet." : `Read the ${plural(issue.comments, "comment", "comments")} first.`}` },
          ],
        },
        steps: [
          { title: "Read the whole thread", text: "Open the Claim check. It lists linked pull requests and flags comments that already ask to take the issue." },
          {
            title: "Read how the project does it",
            text: guide ? "The contributing guide may say how to claim: wait to be assigned, use a bot command, or just start." : "Look for a CONTRIBUTING file in the repo. It may say how to claim an issue.",
            link: guide ? ["Open the contributing guide", guide] : undefined,
          },
          { title: "Write a short comment", text: "Say you would like to take it, what you understand the problem to be, and how you plan to fix it. Two or three sentences is enough. Draft proposal writes a starting point you can edit." },
          { title: "Wait for a reply", text: "Maintainers can take a few days. Do not open a pull request before you hear back, unless the guide says to." },
          { title: "Keep them posted", text: "If you cannot finish, say so in the thread so someone else can take it. That is welcome, not a failure." },
        ],
        avoid: [
          "Posting only “can I work on this?”. It gives the maintainers nothing to decide with.",
          "Overstating your experience. Saying what you have and have not done is fine, and it sets the right expectations.",
          "Claiming several issues at once. Take one, finish it, then take the next.",
        ],
        docs: [DOCS.contribute],
        next: ["assigned", "first-pr"],
      }

    case "first-pr": {
      const slug = slugify(issue.title)
      const branch = `issue-${number ?? "fix"}${slug ? `-${slug}` : ""}`
      const n = number !== null ? `#${number}` : "#ISSUE-NUMBER"
      return {
        lead: "You cannot change someone else's repository directly. You make your own copy (a fork), change that, then ask the project to take your change (a pull request).",
        steps: [
          {
            title: "Fork the repository",
            text: `A fork is your own copy of ${name} under your GitHub account. Using the GitHub CLI? \`gh repo fork ${repoFull} --clone\` does this step and the next at once.`,
            link: ["Open the fork page", `${repoUrl}/fork`],
          },
          {
            title: "Clone your fork",
            text: "Cloning downloads your copy to your computer. Use your own GitHub username in the address. The Clone command in Start contributing points at the original project, which you can read but not push to. The last command links that original as `upstream`, so you can pull in its newer changes later.",
            cmd: [
              ["Clone", `git clone https://github.com/YOUR-USERNAME/${name}.git`],
              ["Folder", `cd ${name}`],
              ["Remote", `git remote add upstream https://github.com/${repoFull}.git`],
            ],
          },
          {
            title: "Find your way around the code",
            text: "Not sure where the problem lives? GitLense explains a repository in plain English, file by file.",
            link: ["Open in GitLense", `/gitlense?url=${encodeURIComponent(issue.html_url)}`],
          },
          { title: "Make a branch", text: "A branch keeps your change apart from the rest of the code. Name it after the issue.", cmd: [["Branch", `git checkout -b ${branch}`]] },
          {
            title: "Make the change and test it",
            text: "Follow the project's guide for how to run the tests and what the code should look like. Keep the change small and only about this issue.",
            link: guide ? ["Open the contributing guide", guide] : undefined,
          },
          {
            title: "Commit and push",
            text: "Replace the message with one line saying what you changed.",
            cmd: [
              ["Stage", "git add -A"],
              ["Commit", `git commit -m "Describe the change (${n})"`],
              ["Push", `git push -u origin ${branch}`],
            ],
          },
          { title: "Open the pull request", text: `After you push, GitHub shows a “Compare & pull request” button on your fork. Say what you changed and why, and write \`Fixes ${n}\` in the description. GitHub then links the issue, and closes it when your pull request is merged.` },
          { title: "Answer the review", text: "Maintainers often ask for changes. Push more commits to the same branch and the pull request updates by itself. A review is part of the process, not a verdict on you." },
        ],
        avoid: [
          "Cloning the original instead of your fork. You will not be able to push, and you will have to set it up again.",
          "Working on your main branch. Always use a branch of your own.",
          "Putting several fixes in one pull request. One issue, one pull request.",
        ],
        docs: [DOCS.project, DOCS.linking],
        next: ["claim", "community"],
      }
    }

    case "stats": {
      const val = (label: string, v?: string | null) => (v == null ? label : `${label} · ${v}`)
      return {
        lead: "These numbers show how popular a project is. They say little about how welcoming it is to newcomers, so treat them as one clue among several.",
        terms: [
          { term: val("Stars", repo && compact(repo.stars)), text: "People who bookmarked the project. A sign of popularity, not of quality." },
          { term: val("Forks", repo && compact(repo.forks)), text: "Copies other people made, mostly to contribute or to build on the code." },
          { term: val("Watching", repo && compact(repo.watchers)), text: "People who get a notification for everything that happens here." },
          { term: val("Open issues", repo && compact(repo.openIssues)), text: "Unfinished work. GitHub counts open pull requests in this number too, so fewer of them are issues you can pick." },
          { term: val("License", repo ? (repo.license ?? "None") : undefined), text: "The rules for using the code. The License guide explains what they mean for you." },
          { term: val("Created", repo?.createdAt ? String(new Date(repo.createdAt).getFullYear()) : undefined), text: "The year the repository was started. It shows how long the project has existed, not how active it is now." },
        ],
        avoid: [
          "Choosing by stars. A famous project is not always the friendliest to a first pull request.",
          "Fearing a big open-issues number. Busy projects always have many. Repository health shows whether anyone is answering them.",
        ],
        docs: [DOCS.stars],
        next: ["health", "license"],
      }
    }

    case "license": {
      const lic = repo?.license ?? null
      const hit = lic ? LICENSE_GUIDE.find(([re]) => re.test(lic)) : undefined
      return {
        lead: "A license says what people may do with the code. When you contribute, your change is normally shared under the same license.",
        here: repo
          ? {
              title: `In ${name}`,
              lines: [
                lic
                  ? hit
                    ? { tone: "good", text: `This repository uses ${lic}.` }
                    : { tone: "warn", text: `This repository uses “${lic}”, which is not one of the common ones. Read its LICENSE file before you contribute.` }
                  : { tone: "warn", text: "No license is listed. Without one the author keeps all rights, so ask the maintainers before you put time in." },
              ],
            }
          : undefined,
        terms: LICENSE_GUIDE.map(([re, term, text]) => ({ term, text, mine: lic && re.test(lic) ? "This repo" : undefined })),
        avoid: [
          "Copying code from another project into your change. Only submit code you wrote, or have the right to share under this license.",
          "Assuming no license means free to use. By default the author keeps all rights.",
        ],
        docs: [DOCS.license, DOCS.legal],
        next: ["stats", "community"],
      }
    }

    case "health": {
      const pushed = repo?.pushedAt ?? null
      const days = daysSince(pushed)
      const lines: { tone: DotTone; text: string }[] = []
      if (issue.isActiveRepo !== undefined) {
        lines.push(
          issue.isActiveRepo
            ? { tone: "good", text: "Maintainers are active: a pull request was merged in the last 6 months." }
            : { tone: "bad", text: issue.repoLastActivityAt ? `No pull request has been merged since ${formatExactDate(issue.repoLastActivityAt)}.` : "No pull request was merged in the last 6 months." }
        )
      }
      if (pushed) lines.push({ tone: days !== null && days > 180 ? "warn" : "good", text: `Last push ${timeAgo(pushed)}.` })
      if (c.release.status === "ok") lines.push({ tone: "muted", text: `Latest release ${c.release.data.tag}${c.release.data.publishedAt ? `, ${timeAgo(c.release.data.publishedAt)}` : ""}.` })
      else if (c.release.status === "empty") lines.push({ tone: "muted", text: "No releases published. That is normal for many projects." })
      return {
        lead: "An issue is only worth your time if someone will review your work. These signals show whether the maintainers are still around.",
        here: lines.length ? { title: `In ${name}`, lines } : undefined,
        terms: [
          { term: "Maintainers", text: "Hunt calls a repository active when it merged a pull request in the last 6 months. That is the best sign your own pull request will get a review." },
          { term: "Last push", text: "When code was last pushed to any branch. Bots and automatic updates count, so it can look busier than it is." },
          { term: "Latest release", text: "A published version. Many healthy projects never publish releases, so a missing one is not a warning." },
          { term: "Community profile", text: "How many of the standard contributor files exist. The Contributor docs guide covers them." },
        ],
        steps: [
          { title: "Check how fast reviews happen", text: "Open the closed pull requests and look at how long recent ones waited for a first reply.", link: ["Closed pull requests", `${repoUrl}/pulls?q=is%3Apr+is%3Aclosed`] },
          { title: "Read a few issue threads", text: "Do maintainers answer within days? A project that answers others will answer you." },
        ],
        avoid: ["Treating Inactive as a ban. A small, stable project may merge rarely and still welcome fixes. Ask in the thread if you are unsure."],
        docs: [DOCS.contribute],
        next: ["community", "stats"],
      }
    }

    case "community": {
      const d = community
      const files: [boolean, string][] = d
        ? [[d.contributing, "a contributing guide"], [d.conduct, "a code of conduct"], [d.issueTemplate, "issue templates"], [d.prTemplate, "a PR template"]]
        : []
      const have = files.filter(([ok]) => ok).map(([, label]) => label)
      const miss = files.filter(([ok]) => !ok).map(([, label]) => label)
      return {
        lead: "Projects keep a few standard files that tell newcomers how things work. GitHub scores how many of them a repository has. The more it has, the easier a first contribution usually is.",
        here: d
          ? {
              title: `In ${name}`,
              lines: [
                d.contributing
                  ? { tone: "good", text: "It has a contributing guide. Read it before you write code." }
                  : { tone: "warn", text: "It has no contributing guide. Read the README and a few merged pull requests to learn how things are done." },
                { tone: "muted", text: [d.score !== null && `Community profile ${d.score}%.`, have.length > 0 && `Has ${list(have)}.`, miss.length > 0 && `Missing ${list(miss)}.`].filter(Boolean).join(" ") },
              ],
            }
          : undefined,
        terms: [
          { term: "Contributing guide", text: "How to set up the project, the code style, how to name branches and write commits, and how to claim an issue." },
          { term: "Code of conduct", text: "How people are expected to behave, and what happens when they do not." },
          { term: "Issue templates", text: "Forms that ask reporters for the details a fix needs." },
          { term: "PR template", text: "A checklist that appears when you open a pull request. Answer every item." },
        ],
        steps: [{ title: "No contributing guide?", text: "Read the README, then open two or three recently merged pull requests and copy how they are named and described." }],
        docs: [DOCS.profile, DOCS.guidelines],
        next: ["first-pr", "claim"],
      }
    }
  }
}

/** Renders `like this` inside a sentence as code. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded border border-white/10 bg-white/[0.05] px-1 py-px font-mono text-[12px] text-neutral-100 [box-decoration-break:clone]">
            {part}
          </code>
        ) : (
          part
        )
      )}
    </>
  )
}

const LEARN_PILL =
  "relative -my-1 inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 text-[11.5px] font-medium text-neutral-300 outline-none transition-colors duration-150 after:absolute after:-inset-2 after:content-[''] hover:border-white/25 hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"

/** The "Learn" button at the top of a block. Its name says which guide it opens. */
function LearnButton({ id, onLearn }: { id: LearnId; onLearn: (id: LearnId) => void }) {
  return (
    <button type="button" onClick={() => onLearn(id)} aria-label={`Learn: ${LEARN_META[id].title}`} className={LEARN_PILL}>
      <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
      Learn
    </button>
  )
}

/** One guide, as a view of the drawer. */
function LearnView({ id, issue, repoFull, repoUrl, details, onLearn }: { id: LearnId; issue: Issue; repoFull: string; repoUrl: string; details: RepoDetails; onLearn: (id: LearnId) => void }) {
  const [copied, copy] = useCopied()
  const [, name] = splitRepo(repoFull)
  const L = lessonFor(id, { issue, repoFull, repoUrl, name, number: issueNumber(issue.html_url), repo: details.repo, release: details.release, community: details.community })
  const text = "text-[13px] leading-relaxed"
  return (
    <div className="space-y-6 px-4 py-5 sm:px-6">
      <p className="text-[14px] leading-relaxed text-neutral-200">
        <Rich text={L.lead} />
      </p>

      {L.here && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{L.here.title}</p>
          <ul className="mt-2 space-y-1.5">
            {L.here.lines.map((l, i) => (
              <li key={i} className={cn("flex items-start gap-2.5 text-neutral-100", text)}>
                <span className="mt-[7px] flex">
                  <Dot tone={l.tone} />
                </span>
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  <Rich text={l.text} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {L.terms && (
        <section>
          <SectionTitle as="h3">The words</SectionTitle>
          <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
            {L.terms.map((t) => (
              <div key={t.term} className={cn("px-3.5 py-3", t.mine && "bg-white/[0.04]")}>
                <dt className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12.5px] font-semibold text-neutral-100">
                  {t.term}
                  {t.mine && <span className={cn(CHIP_SOFT, "py-0 font-sans text-[10.5px] font-medium")}>{t.mine}</span>}
                </dt>
                <dd className={cn("mt-1 text-neutral-300", text)}>{t.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {L.steps && (
        <section>
          <SectionTitle as="h3">What to do</SectionTitle>
          <ol className="space-y-4">
            {L.steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span aria-hidden="true" className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] font-mono text-[11.5px] font-semibold text-neutral-200">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium leading-snug text-neutral-100">{s.title}</p>
                  <p className={cn("mt-0.5 text-neutral-400", text)}>
                    <Rich text={s.text} />
                  </p>
                  {s.cmd && (
                    <div className="mt-2.5 space-y-1.5">
                      {s.cmd.map(([label, value]) => (
                        <CopyRow key={label} label={label} value={value} copied={copied === `${i}:${label}`} onCopy={() => void copy(`${i}:${label}`, value)} />
                      ))}
                    </div>
                  )}
                  {s.link && (
                    <ExtLink
                      href={s.link[1]}
                      className="mt-1.5 inline-flex min-h-10 items-center gap-1 rounded text-[12.5px] font-medium text-neutral-200 underline underline-offset-4 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                      {s.link[0]} <ArrowUpRight aria-hidden="true" className="h-3 w-3" strokeWidth={2.25} />
                    </ExtLink>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {L.avoid && (
        <section>
          <SectionTitle as="h3">Watch out</SectionTitle>
          <ul className="space-y-2.5">
            {L.avoid.map((a) => (
              <li key={a} className={cn("flex gap-2.5 text-neutral-300", text)}>
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span className="min-w-0">{a}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(L.next || L.docs) && (
        <section>
          <SectionTitle as="h3">Keep learning</SectionTitle>
          <div className="space-y-2">
            {L.next?.map((n) => (
              <ActionRow key={n} icon={GraduationCap} title={LEARN_META[n].title} detail={LEARN_META[n].sub} onClick={() => onLearn(n)} />
            ))}
            {L.docs?.map(([label, href]) => (
              <ActionRow key={href} icon={BookOpen} title={label} detail={hostOf(href)} href={href} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Issue details drawer, part 1: the blocks. Every block loads and fails on its own (see useRepoDetails),
// so a slow or limited GitHub never blanks the whole panel.
// ────────────────────────────────────────────────────────────────────────────

function DetailBlock({ title, aside, delay = 0, children }: { title: string; aside?: ReactNode; delay?: number; children: ReactNode }) {
  return (
    <section className="hunt-rise px-4 py-5 sm:px-6" style={cssVars({ "--d": `${delay}ms` })}>
      <SectionTitle as="h3" aside={aside}>
        {title}
      </SectionTitle>
      {children}
    </section>
  )
}

/** One label/value row. Used inside a <dl>. With `learn`, the label is a button that opens the guide for it. */
function KV({ label, learn, children }: { label: string; learn?: () => void; children: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
      <dt className="shrink-0 text-neutral-400">
        {learn ? (
          <button
            type="button"
            onClick={learn}
            aria-label={`${label}: what this means`}
            className="-mx-1.5 -my-2.5 inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-neutral-400 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {label}
            <InfoIcon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        ) : (
          label
        )}
      </dt>
      <dd className="flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right font-medium text-neutral-100">{children}</dd>
    </div>
  )
}

const ROW_BASE =
  "flex w-full items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-left transition-colors duration-150 hover:border-white/20 hover:bg-white/[0.04]"

/** A bordered row that is either a link (`href`) or a button (`onClick`): icon tile, title, one line of detail, trailing arrow. */
function ActionRow({
  icon: Icon, title, detail, href, onClick, trailing,
}: {
  icon: LucideIcon
  title: ReactNode
  detail?: ReactNode
  href?: string | null
  onClick?: () => void
  trailing?: ReactNode
}) {
  const body = (
    <>
      <IconTile className="h-9 w-9">
        <Icon className="h-4 w-4" strokeWidth={2} />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-neutral-100 [overflow-wrap:anywhere]">{title}</span>
        {detail && <span className="block text-[12px] text-neutral-400 [overflow-wrap:anywhere]">{detail}</span>}
      </span>
      {trailing ??
        (onClick ? (
          <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
        ) : (
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
        ))}
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(ROW_BASE, "cursor-pointer", LINK_FOCUS)}>
        {body}
      </button>
    )
  }
  return (
    <ExtLink href={href ?? null} className={cn(ROW_BASE, LINK_FOCUS)}>
      {body}
    </ExtLink>
  )
}

/** A person, as a button that opens their profile inside the drawer. */
function PersonButton({ login, onOpen, size = 16 }: { login: string; onOpen: (login: string) => void; size?: number }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(login)}
      title={`View ${login}`}
      aria-label={`View ${login}`}
      className="-mx-1 inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-neutral-100 outline-none transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <Avatar login={login} size={size} />
      <span className="truncate">{login}</span>
    </button>
  )
}

function roleOf(association: string | null | undefined) {
  switch (association) {
    case "OWNER":
    case "MEMBER":
    case "COLLABORATOR":
      return "Maintainer"
    case "CONTRIBUTOR":
      return "Contributor"
    case "FIRST_TIME_CONTRIBUTOR":
    case "FIRST_TIMER":
      return "First-time contributor"
    default:
      return null
  }
}

function Stat({ icon: Icon, label, value, hint, href, onLearn }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string; href?: string | null; onLearn?: () => void }) {
  const inner = (
    <>
      <span className="flex items-center gap-1.5 text-neutral-400">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]">{label}</span>
        {onLearn && <InfoIcon aria-hidden="true" className="ml-auto h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
      </span>
      <span className="mt-1 block truncate font-mono text-[17px] font-semibold tabular-nums text-neutral-50">{value}</span>
      {onLearn && <span className="sr-only">. Learn what this means.</span>}
    </>
  )
  const box = "block rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5"
  if (onLearn) {
    return (
      <button type="button" onClick={onLearn} className={cn(box, "w-full cursor-pointer text-left transition-colors hover:border-white/20 hover:bg-white/[0.04]", LINK_FOCUS)}>
        {inner}
      </button>
    )
  }
  if (!href) {
    return (
      <div title={hint} className={box}>
        {inner}
      </div>
    )
  }
  return (
    <ExtLink href={href} className={cn(box, "transition-colors hover:border-white/20 hover:bg-white/[0.04]", LINK_FOCUS)}>
      {inner}
    </ExtLink>
  )
}

// ── This issue ───────────────────────────────────────────────────────────────

function IssueBlock({
  issue, repoFull, number, onOpenPerson, onOpenClaims, onLearn,
}: {
  issue: Issue
  repoFull: string
  number: number | null
  onOpenPerson: (login: string) => void
  onOpenClaims: () => void
  onLearn: (id: LearnId) => void
}) {
  const info = issueInfoOf(issue)
  const role = roleOf(info.association)
  const reactions = issue.reactions?.total_count ?? 0
  const type = detectIssueType(issue.title)
  const commentWord = issue.comments === 1 ? "comment" : "comments"
  return (
    <DetailBlock title="This issue" aside={<LearnButton id="issue" onLearn={onLearn} />}>
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div className="p-4 pb-3.5">
          <p className="text-[15.5px] font-medium leading-snug text-neutral-100">
            <ExtLink href={safeUrl(issue.html_url)} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/50">
              {issue.title}
            </ExtLink>
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[12px] text-neutral-400">
            {number !== null && <span>#{number}</span>}
            <time dateTime={issue.created_at}>opened {timeAgo(issue.created_at)}</time>
            <span className="inline-flex items-center gap-1.5">
              <type.Icon aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
              {type.label}
            </span>
          </p>
        </div>

        <dl className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {info.author && (
            <KV label="Opened by" learn={() => onLearn("author")}>
              <PersonButton login={info.author} onOpen={onOpenPerson} />
              {role && <span className={cn(CHIP_SOFT, "py-0.5 text-[11.5px]")}>{role}</span>}
            </KV>
          )}
          <KV label="Assignee" learn={() => onLearn("assigned")}>
            {info.assignees.length === 0 ? (
              <>
                <Dot tone="good" />
                <span>
                  Unassigned <span className="font-normal text-neutral-400">· open to claim</span>
                </span>
              </>
            ) : (
              <>
                <Dot tone="warn" />
                {info.assignees.slice(0, 2).map((a) => (
                  <PersonButton key={a} login={a} onOpen={onOpenPerson} />
                ))}
                {info.assignees.length > 2 && <span className="font-normal text-neutral-400">+{info.assignees.length - 2}</span>}
              </>
            )}
          </KV>
          <KV label="Comments">
            <span className="font-mono tabular-nums">{issue.comments}</span>
          </KV>
          <KV label="Reactions">
            <span className="font-mono tabular-nums">{reactions}</span>
          </KV>
        </dl>

        {(info.labels.length > 0 || info.excerpt) && (
          <div className="space-y-3 border-t border-white/[0.06] p-4">
            {info.labels.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Labels">
                {info.labels.map((l) => (
                  <li key={l.name}>
                    <ExtLink
                      href={`https://github.com/${repoFull}/labels/${encodeURIComponent(l.name)}`}
                      className={cn(CHIP_SOFT, "transition-colors hover:border-white/25 hover:text-white", LINK_FOCUS)}
                    >
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
                      {l.name}
                    </ExtLink>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => onLearn("labels")}
                    className={cn(CHIP_SOFT, "relative cursor-pointer border-dashed outline-none transition-colors after:absolute after:-inset-2 after:content-[''] hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50")}
                  >
                    <InfoIcon aria-hidden="true" className="h-3 w-3" strokeWidth={2.25} />
                    What labels mean
                  </button>
                </li>
              </ul>
            )}
            {info.excerpt && <p className="line-clamp-6 whitespace-pre-line text-[13px] leading-relaxed text-neutral-400">{info.excerpt}</p>}
          </div>
        )}
      </div>

      <div className="mt-2.5">
        <ActionRow
          icon={MessagesSquare}
          title="Claim check"
          detail={issue.comments > 0 ? `Read the ${issue.comments} ${commentWord} and see linked pull requests` : "No comments yet. See if a pull request already covers it"}
          onClick={onOpenClaims}
        />
      </div>
    </DetailBlock>
  )
}

// ── Copy-ready first steps ───────────────────────────────────────────────────

/** A command with a copy button. It is shown in full, so you see exactly what you will paste. */
function CopyRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/[0.08] bg-black/30 py-1.5 pl-3 pr-1.5">
      <span className="w-12 shrink-0 pt-3 font-mono text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
      <code className="min-w-0 flex-1 py-[11px] font-mono text-[12.5px] leading-snug text-neutral-200 [overflow-wrap:anywhere]">{value}</code>
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? `${label} command copied` : `Copy ${label.toLowerCase()} command`}
        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-300 outline-none transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 lg:h-8 lg:w-8"
      >
        {copied ? <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> : <Copy className="h-3.5 w-3.5" strokeWidth={2} />}
      </button>
    </div>
  )
}

function StartBlock({ issue, repoFull, repoUrl, community, onLearn }: { issue: Issue; repoFull: string; repoUrl: string; community: Part<CommunityInfo>; onLearn: (id: LearnId) => void }) {
  const [copied, copy] = useCopied()
  const number = issueNumber(issue.html_url)
  const slug = slugify(issue.title)
  const clone = `git clone https://github.com/${repoFull}.git`
  const branch = `git checkout -b issue-${number ?? "fix"}${slug ? `-${slug}` : ""}`
  const guide = community.status === "ok" ? community.data.contributingUrl : null
  return (
    <DetailBlock title="Start contributing" delay={50} aside={<LearnButton id="first-pr" onLearn={onLearn} />}>
      <div className="space-y-2">
        <CopyRow label="Clone" value={clone} copied={copied === "clone"} onCopy={() => void copy("clone", clone)} />
        <CopyRow label="Branch" value={branch} copied={copied === "branch"} onCopy={() => void copy("branch", branch)} />
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-neutral-400">To push your own changes, fork first and clone your fork instead.</p>
      <div className={cn("mt-2 grid gap-2", guide && "min-[480px]:grid-cols-2")}>
        <ActionRow icon={GitFork} title="Fork the repo" detail="Opens GitHub's fork page" href={`${repoUrl}/fork`} />
        {guide && <ActionRow icon={BookOpen} title="Contributing guide" detail="Read it before you open a pull request" href={guide} />}
      </div>
    </DetailBlock>
  )
}

// ── Repository: stats, topics, website ───────────────────────────────────────

function OverviewBlock({ repo, repoUrl, onLearn }: { repo: Part<RepoInfo>; repoUrl: string; onLearn: (id: LearnId) => void }) {
  if (repo.status === "loading") {
    return (
      <DetailBlock title="Repository" delay={90}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[62px] rounded-lg" />
          ))}
        </div>
      </DetailBlock>
    )
  }
  if (repo.status !== "ok") return null
  const r = repo.data
  const showSite = !!r.homepage && !/^https?:\/\/(www\.)?github\.com\//i.test(r.homepage)
  return (
    <DetailBlock title="Repository" delay={90} aside={<LearnButton id="stats" onLearn={onLearn} />}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat icon={Star} label="Stars" value={compact(r.stars)} href={`${repoUrl}/stargazers`} />
        <Stat icon={GitFork} label="Forks" value={compact(r.forks)} href={`${repoUrl}/forks`} />
        <Stat icon={Eye} label="Watching" value={compact(r.watchers)} href={`${repoUrl}/watchers`} />
        <Stat icon={CircleDot} label="Open issues" value={compact(r.openIssues)} href={`${repoUrl}/issues`} />
        <Stat icon={Scale} label="License" value={r.license ?? "None"} onLearn={() => onLearn("license")} />
        <Stat icon={Clock} label="Created" value={r.createdAt ? new Date(r.createdAt).getFullYear() : "n/a"} />
      </div>
      <p className="mt-2 text-[11.5px] text-neutral-400">GitHub counts open pull requests in the open issues number.</p>

      {r.topics.length > 0 && (
        <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Topics">
          {r.topics.slice(0, 8).map((t) => (
            <li key={t}>
              <ExtLink
                href={`https://github.com/topics/${encodeURIComponent(t)}`}
                className={cn(CHIP_SOFT, "transition-colors hover:border-white/25 hover:text-white", LINK_FOCUS)}
              >
                {t}
              </ExtLink>
            </li>
          ))}
          {r.topics.length > 8 && <li className={cn(CHIP_SOFT, "text-neutral-400")}>+{r.topics.length - 8}</li>}
        </ul>
      )}

      {showSite && r.homepage && (
        <div className="mt-3.5">
          <ActionRow icon={Globe} title="Has its own site" detail={hostOf(r.homepage)} href={safeUrl(r.homepage)} />
        </div>
      )}
    </DetailBlock>
  )
}

// ── Repository health ────────────────────────────────────────────────────────

function CheckItem({ ok, label, href }: { ok: boolean; label: string; href?: string | null }) {
  return (
    <li className="flex items-center gap-2 text-[12.5px]">
      <span
        aria-hidden="true"
        className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full", ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-neutral-400")}
      >
        {ok ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <Minus className="h-3 w-3" strokeWidth={2.5} />}
      </span>
      {ok && href ? (
        <ExtLink href={href} className="rounded-sm text-neutral-200 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/50">
          {label}
        </ExtLink>
      ) : (
        <span className={ok ? "text-neutral-200" : "text-neutral-400"}>{label}</span>
      )}
      <span className="sr-only">{ok ? ": yes" : ": no"}</span>
    </li>
  )
}

function HealthBlock({ issue, repo, release, community, onLearn }: { issue: Issue; repo: Part<RepoInfo>; release: Part<ReleaseInfo>; community: Part<CommunityInfo>; onLearn: (id: LearnId) => void }) {
  const inactive = issue.isActiveRepo === false
  const since = issue.repoLastActivityAt
  const pushedAt = repo.status === "ok" ? repo.data.pushedAt : null
  const pushedDays = daysSince(pushedAt)
  const pushStale = pushedDays !== null && pushedDays > 180

  return (
    <DetailBlock title="Repository health" delay={130} aside={<LearnButton id="health" onLearn={onLearn} />}>
      <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
        {issue.isActiveRepo !== undefined && (
          <KV label="Maintainers">
            <Dot tone={inactive ? "bad" : "good"} />
            {inactive ? (
              <span>{since ? `Inactive since ${formatExactDate(since)}` : "No merged PRs in 6+ months"}</span>
            ) : (
              <span>
                Active <span className="font-normal text-neutral-400">· merging PRs</span>
              </span>
            )}
          </KV>
        )}

        {repo.status === "loading" ? (
          <KV label="Last push">
            <Skeleton className="h-4 w-20" />
          </KV>
        ) : (
          pushedAt && (
            <KV label="Last push">
              <Dot tone={pushStale ? "warn" : "good"} />
              <span>{timeAgo(pushedAt)}</span>
            </KV>
          )
        )}

        {release.status === "loading" ? (
          <KV label="Latest release">
            <Skeleton className="h-4 w-28" />
          </KV>
        ) : release.status === "ok" ? (
          <KV label="Latest release">
            <span className="truncate font-mono text-[12.5px]">{release.data.tag}</span>
            {release.data.publishedAt && <span className="shrink-0 font-normal text-neutral-400">· {timeAgo(release.data.publishedAt)}</span>}
          </KV>
        ) : release.status === "empty" ? (
          <KV label="Latest release">
            <span className="font-normal text-neutral-400">None published</span>
          </KV>
        ) : null}

        {community.status === "loading" ? (
          <KV label="Community profile">
            <Skeleton className="h-4 w-24" />
          </KV>
        ) : (
          community.status === "ok" &&
          community.data.score !== null && (
            <KV label="Community profile" learn={() => onLearn("community")}>
              <span role="img" aria-label={`${community.data.score} percent`} className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
                <span className="block h-full rounded-full bg-neutral-200" style={{ width: `${Math.max(0, Math.min(100, community.data.score))}%` }} />
              </span>
              <span className="font-mono tabular-nums">{community.data.score}%</span>
            </KV>
          )
        )}
      </dl>

      {community.status === "ok" && (
        <ul className="mt-3.5 grid grid-cols-1 gap-x-4 gap-y-2 min-[420px]:grid-cols-2" aria-label="Contributor docs">
          <CheckItem ok={community.data.contributing} label="Contributing guide" href={community.data.contributingUrl} />
          <CheckItem ok={community.data.conduct} label="Code of conduct" />
          <CheckItem ok={community.data.issueTemplate} label="Issue templates" />
          <CheckItem ok={community.data.prTemplate} label="PR template" />
        </ul>
      )}
    </DetailBlock>
  )
}

// ── Languages · release · commits · contributors ─────────────────────────────

function LanguageBlock({ languages }: { languages: Part<LangShare[]> }) {
  if (languages.status === "loading") {
    return (
      <DetailBlock title="Languages" delay={170}>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-3.5 w-24" />
          ))}
        </div>
      </DetailBlock>
    )
  }
  if (languages.status !== "ok") return null
  const langs = languages.data
  return (
    <DetailBlock title="Languages" delay={170}>
      <div
        role="img"
        aria-label={`Languages: ${langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}`}
        className="hunt-wipe flex h-2 w-full gap-px overflow-hidden rounded-full bg-white/[0.06]"
        style={cssVars({ "--d": "260ms" })}
      >
        {langs.map((l) => (
          <span key={l.name} className="h-full" style={{ width: `${Math.max(l.pct, 0.8)}%`, background: l.name === "Other" ? "#525252" : langColor(l.name) }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {langs.map((l) => (
          <li key={l.name} className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.name === "Other" ? "#525252" : langColor(l.name) }} />
            <span className="truncate text-neutral-200">{l.name}</span>
            <span className="ml-auto shrink-0 font-mono tabular-nums text-neutral-400">{l.pct < 0.1 ? "<0.1" : l.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </DetailBlock>
  )
}

function ReleaseBlock({ release }: { release: Part<ReleaseInfo> }) {
  if (release.status === "loading") {
    return (
      <DetailBlock title="Latest release" delay={210}>
        <Skeleton className="h-[62px] rounded-lg" />
      </DetailBlock>
    )
  }
  if (release.status !== "ok") return null
  const r = release.data
  return (
    <DetailBlock title="Latest release" delay={210}>
      <ActionRow
        icon={Tag}
        href={r.url}
        title={<span className="font-mono">{r.tag}</span>}
        detail={`${r.name && r.name !== r.tag ? `${r.name} · ` : ""}${r.publishedAt ? `Published ${formatExactDate(r.publishedAt)} (${timeAgo(r.publishedAt)})` : "Published"}`}
      />
    </DetailBlock>
  )
}

function CommitsBlock({ commits, repoUrl }: { commits: Part<CommitInfo[]>; repoUrl: string }) {
  if (commits.status === "loading") {
    return (
      <DetailBlock title="Recent commits" delay={250}>
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[58px] rounded-lg" />
          ))}
        </div>
      </DetailBlock>
    )
  }
  if (commits.status !== "ok") return null
  return (
    <DetailBlock
      title="Recent commits"
      delay={250}
      aside={
        <a
          href={`${repoUrl}/commits`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded text-[12px] font-medium text-neutral-300 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          View all <ArrowUpRight aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
          <span className="sr-only"> commits (opens in a new tab)</span>
        </a>
      }
    >
      <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
        {commits.data.map((c) => (
          <li key={c.sha}>
            <ExtLink href={c.url} className={cn("flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-white/[0.03]", LINK_FOCUS)}>
              <Avatar login={c.login} size={24} className="mt-0.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-neutral-100">{c.message}</span>
                <span className="mt-0.5 block truncate text-[12px] text-neutral-400">
                  {c.author}
                  {c.date && ` · ${timeAgo(c.date)}`}
                </span>
              </span>
              <code className="mt-0.5 shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-neutral-300">{c.sha.slice(0, 7)}</code>
            </ExtLink>
          </li>
        ))}
      </ul>
    </DetailBlock>
  )
}

function ContributorsBlock({ contributors, onOpenPerson }: { contributors: Part<Contributor[]>; onOpenPerson: (login: string) => void }) {
  if (contributors.status === "loading") {
    return (
      <DetailBlock title="Top contributors" delay={290}>
        <div className="flex gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-9 rounded-full" />
          ))}
        </div>
      </DetailBlock>
    )
  }
  if (contributors.status !== "ok") return null
  return (
    <DetailBlock title="Top contributors" delay={290} aside={<span className="text-[12px] text-neutral-400">Tap one to see who they are</span>}>
      <ul className="flex flex-wrap gap-2">
        {contributors.data.map((c) => (
          <li key={c.login}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onOpenPerson(c.login)}
                  aria-label={`${c.login}, ${compact(c.contributions)} commits. View profile`}
                  className="block cursor-pointer rounded-full ring-2 ring-transparent transition-shadow hover:ring-white/30 focus-visible:outline-none focus-visible:ring-white/60"
                >
                  <Avatar login={c.login} size={40} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="border border-white/10 bg-[#1a1a1a] text-[12px] text-neutral-200 [&_svg]:bg-[#1a1a1a] [&_svg]:fill-[#1a1a1a]">
                {c.login} · {compact(c.contributions)} commits
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
    </DetailBlock>
  )
}

// ── Notices ──────────────────────────────────────────────────────────────────

function DetailsNotice({
  rateResetAt, rateHit, repoMissing, networkFailed, onRetry,
}: {
  rateResetAt?: number
  rateHit: boolean
  repoMissing: boolean
  networkFailed: boolean
  onRetry: () => void
}) {
  if (!rateHit && !repoMissing && !networkFailed) return null
  const title = repoMissing ? "Repository not found" : rateHit ? "GitHub's API limit was reached" : "Couldn't reach GitHub"
  const body = repoMissing
    ? "It may have been renamed, made private or deleted. The issue link still works."
    : rateHit
      ? `Anonymous requests are capped at 60 an hour. The rest of the repo details will load again ${rateResetAt ? `after ${clockTime(rateResetAt)}` : "in a little while"}.`
      : "Some details didn't load. Check your connection and try again."
  return (
    <div role="status" className="flex items-start gap-3 bg-white/[0.025] px-4 py-3.5 sm:px-6">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-neutral-100">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-400">{body}</p>
      </div>
      {!repoMissing && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[12px] font-medium text-neutral-200 outline-none transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 lg:h-8"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          Retry
        </button>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Issue details drawer, part 2: the drill-down views and the drawer itself.
// The drawer is a small stack of views (the issue, a person, the claim check, more issues in the repo, a learn
// guide), so the X always closes everything and the back arrow only steps out of the view you opened.
// ────────────────────────────────────────────────────────────────────────────

type DrawerView = { kind: "root" } | { kind: "person"; login: string } | { kind: "claims" } | { kind: "more" } | { kind: "learn"; id: LearnId }
const ROOT_STACK: DrawerView[] = [{ kind: "root" }]

/** The label each difficulty searches by, so "more in this repo" finds the same kind of issue the search did. */
const SIBLING_LABEL: Record<Difficulty, string> = { easy: "good first issue", medium: "help wanted", hard: "bug", extreme: "bug" }

function PartError({ part, what, onRetry }: { part: Extract<Part<unknown>, { status: "error" }>; what: string; onRetry: () => void }) {
  const text =
    part.reason === "rate"
      ? `GitHub's API limit was reached, so ${what} can't load right now.${part.resetAt ? ` Try again after ${clockTime(part.resetAt)}.` : ""}`
      : part.reason === "missing"
        ? `Couldn't find ${what} on GitHub.`
        : `Couldn't reach GitHub to load ${what}.`
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3.5 py-3">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-neutral-300">{text}</p>
      {part.reason !== "missing" && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[12px] font-medium text-neutral-200 outline-none transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 lg:h-8"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          Retry
        </button>
      )}
    </div>
  )
}

// ── A person ─────────────────────────────────────────────────────────────────

function PersonView({ login, issue, repoUrl, contributors }: { login: string; issue: Issue; repoUrl: string; contributors: Part<Contributor[]> }) {
  const safe = /^[\w-]{1,39}$/.test(login) ? login : null
  const { part, reload } = useGhPart(safe ? `/users/${safe}` : null, parseUser)
  const user = part.status === "ok" ? part.data : null
  const profile = `https://github.com/${encodeURIComponent(login)}`
  const search = (kind: "issues" | "pulls", filter: string) => `${repoUrl}/${kind}?q=${encodeURIComponent(`${filter} author:${login}`)}`

  const roles: string[] = []
  if (issue.user?.login === login) {
    roles.push("Opened this issue")
    const r = roleOf(issue.author_association)
    if (r) roles.push(r)
  }
  if (claimSignals(issue).assignees.includes(login)) roles.push("Assigned to it")
  const top = contributors.status === "ok" ? contributors.data.find((c) => c.login === login) : undefined
  if (top) roles.push(`${compact(top.contributions)} commits here`)

  return (
    <div className="space-y-5 px-4 py-5 sm:px-6">
      <div className="flex items-start gap-4">
        <Avatar login={login} size={64} className="rounded-xl" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[18px] font-semibold tracking-tight text-white">{user?.name ?? login}</h3>
          <p className="mt-0.5 truncate font-mono text-[12.5px] text-neutral-400">
            @{login}
            {user?.isOrg && " · Organization"}
          </p>
          {part.status === "loading" ? (
            <span className="mt-2.5 block space-y-1.5">
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-2/3" />
            </span>
          ) : (
            user?.bio && <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-300">{user.bio}</p>
          )}
        </div>
      </div>

      {roles.length > 0 && (
        <ul aria-label={`${login} on this issue`} className="flex flex-wrap gap-1.5">
          {roles.map((r) => (
            <li key={r} className={CHIP_SOFT}>
              {r}
            </li>
          ))}
        </ul>
      )}

      {part.status === "error" && <PartError part={part} what="this profile" onRetry={reload} />}

      {user && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Users} label="Followers" value={compact(user.followers)} href={`${profile}?tab=followers`} />
            <Stat icon={FolderGit2} label="Repos" value={compact(user.repos)} href={`${profile}?tab=repositories`} />
            <Stat icon={Clock} label="Joined" value={user.since ? new Date(user.since).getFullYear() : "n/a"} />
          </div>
          {(user.company || user.location) && (
            <dl className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
              {user.company && (
                <KV label="Company">
                  <span className="truncate">{user.company}</span>
                </KV>
              )}
              {user.location && (
                <KV label="Location">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
                  <span className="truncate">{user.location}</span>
                </KV>
              )}
            </dl>
          )}
        </>
      )}

      <div className="space-y-2">
        <SectionTitle>In this repository</SectionTitle>
        <ActionRow icon={CircleDot} title="Issues they opened" detail="How their reports tend to go" href={search("issues", "is:issue")} />
        <ActionRow icon={GitPullRequest} title="Pull requests they opened" detail="What they have shipped here" href={search("pulls", "is:pr")} />
        <ActionRow icon={UserRound} title="Open the GitHub profile" detail={`github.com/${login}`} href={profile} />
      </div>
    </div>
  )
}

// ── Claim check ──────────────────────────────────────────────────────────────

interface Verdict {
  tone: "good" | "warn"
  title: string
  text: string
}

/** A hint built from three things GitHub tells us (assignees, linked pull requests, comments that ask to take it). Never a guarantee. */
function claimVerdict(assignees: string[], asks: CommentInfo[], prs: LinkedPr[], known: boolean): Verdict | null {
  if (assignees.length > 0) {
    const more = assignees.length > 1 ? ` and ${assignees.length - 1} more` : ""
    return { tone: "warn", title: `Assigned to ${assignees[0]}${more}`, text: "Ask in the thread before you start, or pick another issue." }
  }
  const merged = prs.find((p) => p.state === "merged")
  if (merged) return { tone: "warn", title: "A merged pull request mentions this issue", text: `It may already be fixed. Look at #${merged.number} first.` }
  const open = prs.filter((p) => p.state === "open")
  if (open.length > 0) {
    return { tone: "warn", title: `${open.length} open pull ${open.length === 1 ? "request mentions" : "requests mention"} this issue`, text: "Someone may already be working on it." }
  }
  if (asks.length > 0) {
    return { tone: "warn", title: `${asks.length} ${asks.length === 1 ? "comment asks" : "comments ask"} to take it`, text: "Read them below before you claim it." }
  }
  if (!known) return null
  return { tone: "good", title: "No claim found", text: "Nobody is assigned and no comment or pull request asks for it. This is a quick check, not a guarantee, so read the thread before you start." }
}

function ClaimsView({ issue, repoFull, number, onOpenPerson, onLearn }: { issue: Issue; repoFull: string; number: number | null; onOpenPerson: (login: string) => void; onLearn: (id: LearnId) => void }) {
  const base = number !== null ? `/repos/${repoFull}/issues/${number}` : null
  const comments = useGhPart(base ? `${base}/comments?per_page=30` : null, parseComments)
  const timeline = useGhPart(base ? `${base}/timeline?per_page=100` : null, parseTimeline, true)
  const list = comments.part.status === "ok" ? comments.part.data : []
  const prs = timeline.part.status === "ok" ? timeline.part.data : []
  const asks = list.filter((c) => CLAIM_PHRASE.test(c.text))
  const loading = comments.part.status === "loading" || timeline.part.status === "loading"
  const failed = comments.part.status === "error" || timeline.part.status === "error"
  const verdict = claimVerdict(claimSignals(issue).assignees, asks, prs, !loading && !failed)
  const good = verdict?.tone === "good"

  return (
    <div className="space-y-6 px-4 py-5 sm:px-6">
      {loading && !verdict ? (
        <Skeleton className="h-[74px] rounded-xl" />
      ) : (
        verdict && (
          <div
            role="status"
            className={cn("flex items-start gap-3 rounded-xl border px-4 py-3.5", good ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-amber-400/25 bg-amber-400/[0.06]")}
          >
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", good ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300")}>
              {good ? <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} /> : <ShieldAlert aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />}
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-neutral-100">{verdict.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-400">{verdict.text}</p>
            </div>
          </div>
        )
      )}

      {number === null && <p className="text-[13px] text-neutral-400">This link has no issue number, so its thread can&apos;t be read here.</p>}

      <ActionRow icon={GraduationCap} title="How to claim an issue" detail="What to check, and what to say" onClick={() => onLearn("claim")} />

      <section>
        <SectionTitle as="h3">Pull requests that mention it</SectionTitle>
        {timeline.part.status === "loading" ? (
          <Skeleton className="h-[58px] rounded-lg" />
        ) : timeline.part.status === "error" ? (
          <PartError part={timeline.part} what="linked pull requests" onRetry={timeline.reload} />
        ) : prs.length === 0 ? (
          <p className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[13px] text-neutral-400">None yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
            {prs.map((p) => (
              <li key={p.number}>
                <ExtLink href={p.url} className={cn("flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-white/[0.03]", LINK_FOCUS)}>
                  <GitPullRequest aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-neutral-100">{p.title}</span>
                    <span className="block truncate font-mono text-[11.5px] text-neutral-400">
                      #{p.number}
                      {p.author && ` by ${p.author}`}
                    </span>
                  </span>
                  <span className={cn(CHIP_SOFT, "shrink-0")}>
                    <Dot tone={p.state === "open" ? "good" : p.state === "merged" ? "muted" : "bad"} />
                    {p.state === "open" ? "Open" : p.state === "merged" ? "Merged" : "Closed"}
                  </span>
                </ExtLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionTitle as="h3" aside={list.length > 0 ? <span className="font-mono text-[11px] tabular-nums text-neutral-400">{list.length} shown</span> : undefined}>
          Comments
        </SectionTitle>
        {comments.part.status === "loading" ? (
          <div className="space-y-2">
            <Skeleton className="h-[78px] rounded-lg" />
            <Skeleton className="h-[78px] rounded-lg" />
          </div>
        ) : comments.part.status === "error" ? (
          <PartError part={comments.part} what="the comments" onRetry={comments.reload} />
        ) : list.length === 0 ? (
          <p className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[13px] text-neutral-400">No comments yet.</p>
        ) : (
          <>
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
              {list.map((c) => {
                const ask = CLAIM_PHRASE.test(c.text)
                return (
                  <li key={c.id} className={cn("px-3.5 py-3", ask && "bg-amber-400/[0.05]")}>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-neutral-400">
                      {c.login ? <PersonButton login={c.login} onOpen={onOpenPerson} size={20} /> : <span>Unknown user</span>}
                      {c.date && <time dateTime={c.date}>{timeAgo(c.date)}</time>}
                      {ask && <span className={cn(CHIP_SOFT, "py-0.5 text-[11.5px] text-amber-200")}>Asks to take it</span>}
                      <ExtLink href={c.url} className="ml-auto inline-flex items-center gap-1 rounded text-[12px] font-medium text-neutral-300 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50">
                        Open <ArrowUpRight aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
                      </ExtLink>
                    </div>
                    {c.text && <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-neutral-300">{c.text}</p>}
                  </li>
                )
              })}
            </ul>
            {issue.comments > list.length && (
              <p className="mt-2.5 text-[12px] text-neutral-400">
                Showing the first {list.length} of {issue.comments}.{" "}
                <ExtLink href={safeUrl(issue.html_url)} className="rounded font-medium text-neutral-200 underline underline-offset-4 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50">
                  Read the rest on GitHub
                </ExtLink>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

// ── More in this repo ────────────────────────────────────────────────────────

function MoreView({ issue, repoFull, difficulty, onPick }: { issue: Issue; repoFull: string; difficulty: Difficulty; onPick: (next: Issue) => void }) {
  const label = SIBLING_LABEL[difficulty]
  const q = encodeURIComponent(`repo:${repoFull} is:issue is:open label:"${label}"`)
  const { part, reload } = useGhPart(`/search/issues?q=${q}&sort=created&order=desc&per_page=12`, parseSiblings)
  const items = part.status === "ok" ? part.data.filter((i) => i.id !== issue.id) : []

  return (
    <div className="px-4 py-5 sm:px-6">
      {part.status === "loading" ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[66px] rounded-lg" />
          ))}
        </div>
      ) : part.status === "error" ? (
        <PartError part={part} what="other issues" onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 text-[13px] text-neutral-400">No other open issues are labeled &ldquo;{label}&rdquo; in this repo.</p>
      ) : (
        <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {items.map((i) => {
            const n = issueNumber(i.html_url)
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => onPick(i)}
                  className={cn("flex w-full cursor-pointer items-start gap-3 px-3.5 py-3 text-left transition-colors hover:bg-white/[0.04]", LINK_FOCUS)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13.5px] font-medium leading-snug text-neutral-100">{i.title}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11.5px] text-neutral-400">
                      {n !== null && <span>#{n}</span>}
                      <span>{timeAgo(i.created_at)}</span>
                      <span>
                        {i.comments} {i.comments === 1 ? "comment" : "comments"}
                      </span>
                      <AssignedBadge assignees={claimSignals(i).assignees} />
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── The drawer ───────────────────────────────────────────────────────────────

function IssueDetailsDrawer({
  issue, session, start, open, difficulty, onOpenChange, onDraftProposal, onSwitchIssue, onCloseAutoFocus,
}: {
  issue: Issue | null
  /** Changes every time the drawer is opened, so it always starts on the issue itself. */
  session: number
  /** A guide to open first (Back goes to the issue), for buttons outside the drawer. */
  start: LearnId | null
  open: boolean
  difficulty: Difficulty
  onOpenChange: (open: boolean) => void
  onDraftProposal: (issue: Issue) => void
  onSwitchIssue: (issue: Issue) => void
  onCloseAutoFocus: (e: Event) => void
}) {
  const repoFull = issue ? repoName(issue.repository_url) : null
  const number = issue ? issueNumber(issue.html_url) : null
  const { details, reload } = useRepoDetails(repoFull)

  const [nav, setNav] = useState<{ key: string; stack: DrawerView[]; back: boolean }>({ key: "", stack: ROOT_STACK, back: false })
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const headRef = useRef<HTMLDivElement | null>(null)
  const rootScroll = useRef(0)
  const lastNav = useRef({ id: 0, depth: 1 })

  const navKey = issue ? `${issue.id}:${session}` : ""
  const navigated = nav.key === navKey
  const stack = navigated ? nav.stack : start ? [...ROOT_STACK, { kind: "learn" as const, id: start }] : ROOT_STACK
  const view = stack[stack.length - 1]
  const depth = stack.length
  const viewId = view.kind === "person" ? `person:${view.login}` : view.kind === "learn" ? `learn:${view.id}` : view.kind

  // Each view starts at its top. Going back to the issue puts you where you were.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = viewId === "root" ? rootScroll.current : 0
  }, [viewId, navKey])

  // A view change removes the button you pressed, so focus moves to the new title instead of being lost.
  useEffect(() => {
    const last = lastNav.current
    if (issue && last.id === issue.id && last.depth !== depth) headRef.current?.focus({ preventScroll: true })
    lastNav.current = { id: issue?.id ?? 0, depth }
  }, [issue, depth])

  if (!issue || !repoFull) return null

  const { repo, languages, commits, contributors, release, community } = details
  const [owner, name] = splitRepo(repoFull)
  const ownerLogin = owner.replace(/\/$/, "")
  const verified = VERIFIED_REPOS.has(repoFull.toLowerCase())
  const repoUrl = (repo.status === "ok" && repo.data.htmlUrl) || `https://github.com/${repoFull}`
  const failed = [repo, languages, commits, contributors, release, community].flatMap((p) => (p.status === "error" ? [p] : []))
  const rate = failed.find((p) => p.reason === "rate")
  const repoMissing = repo.status === "error" && repo.reason === "missing"
  const networkFailed = failed.some((p) => p.reason === "network")
  const label = SIBLING_LABEL[difficulty]

  function go(next: DrawerView) {
    if (view.kind === "root") rootScroll.current = scrollRef.current?.scrollTop ?? 0
    setNav({ key: navKey, stack: [...stack, next], back: false })
  }
  function back() {
    if (depth > 1) setNav({ key: navKey, stack: stack.slice(0, -1), back: true })
  }
  const openPerson = (login: string) => go({ kind: "person", login })
  const learn = (id: LearnId) => go({ kind: "learn", id })

  function pickSibling(next: Issue) {
    rootScroll.current = 0
    // The repo-level facts belong to the repository, so they carry over to the issue we switch to.
    onSwitchIssue({ ...next, isActiveRepo: issue?.isActiveRepo, repoLastActivityAt: issue?.repoLastActivityAt, matchedLanguage: issue?.matchedLanguage, language: issue?.language })
  }

  const title: ReactNode =
    view.kind === "root" ? (
      <>
        <ExtLink
          href={repoUrl}
          className="inline-flex min-w-0 items-center gap-1.5 rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <span className="truncate">
            <span className="text-neutral-400">{owner}</span>
            {name}
          </span>
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
        </ExtLink>
        {verified && (
          <span title="Official repository" className="inline-flex shrink-0">
            <BadgeCheck aria-hidden="true" className="h-4 w-4 text-[#a8ff3e]" strokeWidth={2} />
            <span className="sr-only">Official repository</span>
          </span>
        )}
      </>
    ) : view.kind === "person" ? (
      <span className="truncate">@{view.login}</span>
    ) : view.kind === "claims" ? (
      "Claim check"
    ) : view.kind === "learn" ? (
      <span className="min-w-0 [overflow-wrap:anywhere]">{LEARN_META[view.id].title}</span>
    ) : (
      <span className="truncate">More in {name}</span>
    )

  const description: ReactNode =
    view.kind === "root" ? (
      repo.status === "loading" ? (
        <>
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="mt-1.5 h-3.5 w-2/3" />
        </>
      ) : repo.status === "ok" ? (
        (repo.data.description ?? "No description provided.")
      ) : (
        "Repository details are unavailable right now."
      )
    ) : view.kind === "person" ? (
      `Profile and history in ${name}`
    ) : view.kind === "claims" ? (
      `Comments and linked pull requests${number !== null ? ` for #${number}` : ""}`
    ) : view.kind === "learn" ? (
      LEARN_META[view.id].sub
    ) : (
      `Open issues labeled “${label}”`
    )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={(e) => {
          // In a drill-down, Escape steps back to the issue; from the issue it closes the drawer.
          if (depth > 1) {
            e.preventDefault()
            back()
          }
        }}
        className="hunt-sheet hunt-detail-drawer z-[1000] flex flex-col gap-0 border-l border-white/10 bg-[#0b0b0b] p-0"
      >
        <SheetHeader className="shrink-0 gap-0 border-b border-white/[0.07] p-0 text-left">
          <div className="flex items-start gap-3 px-4 py-3.5 sm:gap-3.5 sm:px-6 sm:py-4">
            {depth > 1 ? (
              <button type="button" onClick={back} aria-label="Back to the issue" className={CLOSE_BTN}>
                <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            ) : (
              <Avatar login={ownerLogin} size={44} className="mt-0.5 rounded-lg" />
            )}
            <div ref={headRef} tabIndex={-1} className="min-w-0 flex-1 pt-0.5 outline-none">
              <SheetTitle className="flex min-w-0 items-center gap-1.5 font-mono text-[15px] font-semibold leading-tight text-white">{title}</SheetTitle>
              <SheetDescription className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-neutral-400">{description}</SheetDescription>
            </div>
            <SheetClose asChild>
              <button type="button" aria-label="Close details" className={CLOSE_BTN}>
                <X className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div ref={scrollRef} className="hunt-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div key={`${navKey}:${depth}:${viewId}`} className={navigated ? (nav.back ? "hunt-view-back" : "hunt-view-fwd") : undefined}>
            {view.kind === "person" && <PersonView login={view.login} issue={issue} repoUrl={repoUrl} contributors={contributors} />}
            {view.kind === "claims" && <ClaimsView issue={issue} repoFull={repoFull} number={number} onOpenPerson={openPerson} onLearn={learn} />}
            {view.kind === "learn" && <LearnView id={view.id} issue={issue} repoFull={repoFull} repoUrl={repoUrl} details={details} onLearn={learn} />}
            {view.kind === "more" && <MoreView issue={issue} repoFull={repoFull} difficulty={difficulty} onPick={pickSibling} />}
            {view.kind === "root" && (
              <div className="divide-y divide-white/[0.06]">
                <DetailsNotice rateHit={!!rate} rateResetAt={rate?.resetAt} repoMissing={repoMissing} networkFailed={networkFailed} onRetry={reload} />

                {repo.status === "ok" && repo.data.archived && (
                  <div className="flex items-start gap-3 px-4 py-3.5 sm:px-6">
                    <Archive aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} />
                    <div>
                      <p className="text-[13px] font-medium text-neutral-100">This repository is archived</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-400">It is read-only, so new comments and pull requests can&apos;t be added.</p>
                    </div>
                  </div>
                )}

                <IssueBlock issue={issue} repoFull={repoFull} number={number} onOpenPerson={openPerson} onOpenClaims={() => go({ kind: "claims" })} onLearn={learn} />
                <StartBlock issue={issue} repoFull={repoFull} repoUrl={repoUrl} community={community} onLearn={learn} />
                <OverviewBlock repo={repo} repoUrl={repoUrl} onLearn={learn} />
                <HealthBlock issue={issue} repo={repo} release={release} community={community} onLearn={learn} />
                <DetailBlock title="Keep looking" delay={150}>
                  <ActionRow icon={Search} title={`More “${label}” issues in ${name}`} detail="Pick another one without leaving this panel" onClick={() => go({ kind: "more" })} />
                </DetailBlock>
                <LanguageBlock languages={languages} />
                <ReleaseBlock release={release} />
                <CommitsBlock commits={commits} repoUrl={repoUrl} />
                <ContributorsBlock contributors={contributors} onOpenPerson={openPerson} />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.07] bg-[#0b0b0b] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_auto_1fr]">
            <Button type="button" variant="outline" onClick={() => onDraftProposal(issue)} className={OUTLINE_BTN}>
              <PenLine className="h-4 w-4" strokeWidth={2} />
              Draft proposal
            </Button>
            {/* A new tab: this page, its results and this panel stay exactly as they are, and nothing is fetched again when you come back. */}
            <Button asChild variant="outline" className={cn(OUTLINE_BTN, "max-[374px]:gap-1.5")}>
              <a href={`/gitlense?url=${encodeURIComponent(issue.html_url)}`} target="_blank" rel="noopener noreferrer">
                <Focus aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                {/* On the narrowest phones the label is just "GitLense" so the arrow still fits; screen readers keep the full name. */}
                <span>
                  <span className="max-[359px]:sr-only">Open in </span>GitLense
                </span>
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2.25} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <Button asChild className={cn(LIME_BTN, "col-span-2 sm:col-span-1")}>
              <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
                Open on GitHub
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </div>
          <p className="mt-2.5 hidden text-[11.5px] leading-snug text-neutral-400 sm:block">GitLense opens in a new tab with this issue&apos;s link filled in, so your results here stay put. It only starts when you press Analyze there.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Data loading and sorting
// ────────────────────────────────────────────────────────────────────────────

/** Friendly text for the few machine codes the issues route answers with. Anything else is shown as the server wrote it. */
const KNOWN_ERRORS: Record<string, string> = {
  needs_github_connect: "Connect your GitHub account to search for issues.",
  Unauthorized: "Your session has ended. Sign in again to search for issues.",
  "Rate limit reached.": "GitHub is limiting searches right now. Wait a minute, then try again.",
  "GitHub API error": "GitHub did not answer this search. Try again in a moment.",
  "Failed to fetch issues": "Something went wrong while searching. Try again in a moment.",
}

/**
 * Reads the issues route. A search streams events (what it is doing as it does it) and ends with the result; a
 * failure before the stream starts is ordinary JSON, so both shapes are handled.
 */
async function readIssues(res: Response, onEvent?: (ev: Record<string, unknown>) => void): Promise<{ items: Issue[]; hasMore: boolean | null; partial: boolean }> {
  const fail = (message: unknown): never => {
    const text = asStr(message)
    throw new ApiError((text && KNOWN_ERRORS[text]) || text || GENERIC_ERROR)
  }
  const streamed = (res.headers.get("content-type") ?? "").includes("ndjson") && res.body
  if (!streamed) {
    const data: unknown = await res.json().catch(() => null)
    const obj = isObj(data) ? data : {}
    if (!res.ok) fail(obj.error)
    return { items: asArr(obj.items) as Issue[], hasMore: typeof obj.hasMore === "boolean" ? obj.hasMore : null, partial: obj.partial === true }
  }

  const out: { items: Issue[] | null; hasMore: boolean | null; partial: boolean } = { items: null, hasMore: null, partial: false }
  const handle = (line: string) => {
    if (!line.trim()) return
    let ev: unknown
    try {
      ev = JSON.parse(line)
    } catch {
      return
    }
    if (!isObj(ev)) return
    if (ev.t === "result") {
      out.items = asArr(ev.items) as Issue[]
      out.hasMore = typeof ev.hasMore === "boolean" ? ev.hasMore : null
      out.partial = ev.partial === true
    } else if (ev.t === "error") {
      fail(ev.error)
    } else {
      onEvent?.(ev)
    }
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    lines.forEach(handle)
  }
  handle(buffer + decoder.decode())
  if (!out.items) fail(null)
  return { items: out.items ?? [], hasMore: out.hasMore, partial: out.partial }
}

const byNewest = (a: Issue, b: Issue) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
const reactionsOf = (i: Issue) => i.reactions?.total_count ?? 0
const lastTouched = (i: Issue) => new Date(i.updated_at ?? i.created_at).getTime()

const SORTERS: Record<SortBy, (a: Issue, b: Issue) => number> = {
  newest: byNewest,
  updated: (a, b) => lastTouched(b) - lastTouched(a),
  "least-commented": (a, b) => a.comments - b.comments || byNewest(a, b),
  "most-commented": (a, b) => b.comments - a.comments || byNewest(a, b),
  "most-reactions": (a, b) => reactionsOf(b) - reactionsOf(a) || byNewest(a, b),
  unassigned: (a, b) => Number((a.assignees?.length ?? 0) > 0) - Number((b.assignees?.length ?? 0) > 0) || byNewest(a, b),
}

/** Sorts what is loaded. With several stacks, each is sorted on its own and then dealt out in turn, so none of them takes over the top. */
function sortIssues(list: Issue[], sortBy: SortBy, interleave: boolean) {
  const cmp = SORTERS[sortBy]
  if (!interleave) return [...list].sort(cmp)
  const lanes = new Map<string, Issue[]>()
  for (const issue of list) {
    const key = (issue.matchedLanguage || issue.language || "other").toLowerCase()
    const lane = lanes.get(key)
    if (lane) lane.push(issue)
    else lanes.set(key, [issue])
  }
  const sorted = [...lanes.values()].map((lane) => lane.sort(cmp))
  const out: Issue[] = []
  for (let i = 0, n = Math.max(0, ...sorted.map((l) => l.length)); i < n; i++) for (const lane of sorted) if (lane[i]) out.push(lane[i])
  return out
}

/** The same plain comment the server falls back to. It claims nothing about the person posting it. */
function fallbackComment(issue: Issue) {
  const n = issueNumber(issue.html_url)
  const ref = n !== null ? `#${n}` : "this issue"
  const assignee = claimSignals(issue).assignees[0]
  if (assignee) {
    return `Hi! I came across ${ref} and I'd like to help. I see it is assigned to ${assignee}. Are you still working on it? If not, I'd be glad to take it over, or to split the work if you'd like a hand.`
  }
  const about = issue.title.length > 90 ? `${issue.title.slice(0, 87).trimEnd()}...` : issue.title
  return `Hi! I'd like to work on ${ref} ("${about}"). Is it still open for contributions? If so, I'll start by reproducing the problem and then open a small, focused pull request. Happy to follow any guidelines you have.`
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

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
  const [picks, setPicks] = useState<string[]>(DEFAULT_PICKS)
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY)
  const [done, setDone] = useState(false)
  const [partial, setPartial] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [bountyOnly, setBountyOnly] = useState(false)
  const [activeOnly, setActiveOnly] = useState(false)
  const [openProposalId, setOpenProposalId] = useState<number | null>(null)
  const [proposals, setProposals] = useState<Record<number, Proposal>>({})
  const [copiedKey, copy] = useCopied()
  const [searchRun, setSearchRun] = useState(0)
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const [detail, setDetail] = useState<Issue | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSession, setDetailSession] = useState(0)
  const [detailStart, setDetailStart] = useState<LearnId | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Tablets and up get filters as a right-hand drawer; phones get a bottom sheet.
  const wide = useMediaQuery("(min-width: 640px)")

  const abortRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<FetchOptions | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const urlReadyRef = useRef(false)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  // A link can fill in the form: stack, level and switches in the address bar. It never starts a search by itself, so a
  // link cannot spend anyone's quota. This waits a tick, so the first paint matches the server's.
  useEffect(() => {
    const found = recipeFromSearch(window.location.search)
    queueMicrotask(() => {
      if (found) {
        setPicks(found.picks)
        setDifficulty(found.difficulty)
        setBountyOnly(found.bounty)
        setActiveOnly(found.active)
        setNotice("Filled in from the link. Press Search to run it.")
      }
      urlReadyRef.current = true
    })
  }, [])

  // Keeps the address bar in step with the form, so a refresh, a bookmark or a shared link brings the same search back.
  useEffect(() => {
    if (!urlReadyRef.current) return
    const query = recipeToSearch({ picks, difficulty, bounty: bountyOnly, active: activeOnly })
    const { pathname, search, hash } = window.location
    const next = `${pathname}${query ? `?${query}` : ""}${hash}`
    if (next !== `${pathname}${search}${hash}`) window.history.replaceState(window.history.state, "", next)
  }, [picks, difficulty, bountyOnly, activeOnly])

  const searchTarget = picks.length ? picks.join(", ") : "your stack"

  // Sorting is entirely client-side (`sortedIssues`), so changing it never refetches.
  // "Active repos only" is client-side too, so toggling it never wipes your results.
  function resetForNewFilters() {
    abortRef.current?.abort()
    setLoading(false)
    setLoadingMore(false)
    setSearched(false)
    setIssues([])
    setPartial(false)
    setError(null)
    setLoadMoreError(null)
    setOpenProposalId(null)
    setProgress(null)
    setNotice(null)
  }

  function changePicks(next: string[]) {
    setPicks(next)
    resetForNewFilters()
  }

  /** Stops the search that is running and goes back to the landing page with the stack and level still set. */
  function cancelSearch() {
    resetForNewFilters()
    setNotice("Search cancelled. Your stack and level are still set.")
    window.setTimeout(() => document.getElementById("hunt-hero-search")?.focus(), 0)
  }

  function resetFilters() {
    setPicks(DEFAULT_PICKS)
    setDifficulty(DEFAULT_DIFFICULTY)
    setBountyOnly(false)
    setActiveOnly(false)
    resetForNewFilters()
  }

  // The picker edits the stack live, but the results on screen only go once it closes, and only if the stack changed.
  function onPickerOpenChange(open: boolean) {
    setPickerOpen(open)
    const last = lastRequestRef.current?.picks
    if (!open && searched && last && !sameList(last, picks)) resetForNewFilters()
  }

  // The plain template is in the box at once, so nobody waits on the AI. If a draft arrives and the text is still untouched, it replaces the template.
  async function generateProposal(issue: Issue) {
    const id = issue.id
    setProposals((prev) => ({ ...prev, [id]: { text: prev[id]?.text ?? fallbackComment(issue), source: prev[id]?.source ?? "template", waiting: true, edited: false } }))
    let draft: string | null = null
    let why: ProposalWhy = "unavailable"
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issue.title,
          repo: repoName(issue.repository_url),
          number: issueNumber(issue.html_url),
          labels: (issue.labels ?? []).map((l) => l.name),
          assignees: claimSignals(issue).assignees,
          body: plainExcerpt(issue.body, 1000),
        }),
      })
      const data: unknown = res.ok ? await res.json().catch(() => null) : null
      if (isObj(data)) {
        const text = asStr(data.proposal)
        if (data.source === "ai" && text?.trim()) {
          draft = text
          window.dispatchEvent(new CustomEvent("usage:updated"))
        } else if (data.reason === "timeout" || data.reason === "rejected") why = data.reason
      }
    } catch {
      // keep the template
    }
    setProposals((prev) => {
      const cur = prev[id]
      if (!cur) return prev
      const fresh = draft !== null && !cur.edited ? draft : null
      return { ...prev, [id]: { ...cur, text: fresh ?? cur.text, source: fresh !== null ? "ai" : cur.source, waiting: false, why: draft === null ? why : undefined } }
    })
  }

  function openProposal(issue: Issue) {
    setOpenProposalId(issue.id)
    if (!proposals[issue.id]) void generateProposal(issue)
  }

  function toggleProposal(issue: Issue) {
    if (openProposalId === issue.id) setOpenProposalId(null)
    else openProposal(issue)
  }

  function openDetails(issue: Issue, trigger: HTMLElement, start: LearnId | null = null) {
    openerRef.current = trigger
    setDetailStart(start)
    setDetail(issue)
    setDetailSession((n) => n + 1)
    setDetailOpen(true)
  }

  function draftFromDetails(issue: Issue) {
    setDetailOpen(false)
    // An issue picked from "more in this repo" isn't in the list yet; it joins it so its comment box has somewhere to open.
    if (!issues.some((i) => i.id === issue.id)) setIssues((prev) => [issue, ...prev])
    openProposal(issue)
    window.setTimeout(() => {
      document.getElementById(`proposal-${issue.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }, 380)
  }

  const sortedIssues = useMemo(
    () => sortIssues(activeOnly ? issues.filter((i) => i.isActiveRepo !== false) : issues, sortBy, picks.length > 1),
    [issues, sortBy, activeOnly, picks.length]
  )

  async function fetchIssues(opts: FetchOptions = {}) {
    const p = opts.page ?? 1
    const reset = opts.reset ?? p === 1
    const diff = opts.difficulty ?? difficulty
    const bounty = opts.bounty ?? bountyOnly
    const chosen = opts.picks ?? picks
    if (chosen.length === 0) return
    lastRequestRef.current = { page: p, reset, difficulty: diff, bounty, picks: chosen }

    // Only the newest request is allowed to touch state.
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    if (reset) {
      setLoading(true)
      setLoadingMore(false)
      setError(null)
      setLoadMoreError(null)
      setProgress(null)
      setNotice(null)
      setSearchRun((n) => n + 1)
      mainRef.current?.scrollTo({ top: 0 })
    } else {
      setLoadingMore(true)
      setLoadMoreError(null)
    }

    try {
      const params = new URLSearchParams({ difficulty: diff, page: String(p), bounty: String(bounty) })
      params.set("language", chosen.join(",").toLowerCase())
      if (reset) params.set("stream", "1")
      const res = await fetch(`/api/issues?${params.toString()}`, { signal: ctrl.signal })
      const data = await readIssues(res, reset ? (ev) => setProgress((prev) => applyProgress(prev, ev)) : undefined)
      if (ctrl.signal.aborted) return
      const fetched = data.items.filter((i) => i.repository_url)
      window.dispatchEvent(new CustomEvent("usage:updated"))
      if (reset) {
        setIssues(fetched)
      } else {
        setIssues((prev) => {
          const seen = new Set(prev.map((i) => i.id))
          return [...prev, ...fetched.filter((i) => !seen.has(i.id))]
        })
      }
      setDone(data.hasMore === null ? fetched.length < PAGE_SIZE : !data.hasMore)
      setPartial((was) => (reset ? data.partial : was || data.partial))
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
  function searchAgain() {
    if (lastRequestRef.current) void fetchIssues({ ...lastRequestRef.current, page: 1, reset: true })
  }
  function runSearch() {
    void fetchIssues({ page: 1, reset: true })
    setFiltersOpen(false)
  }
  /** A starting point is its picks at Easy difficulty, with bounties off. The card says the same. */
  function runTemplate(t: Template) {
    setPicks(t.picks)
    setDifficulty("easy")
    setBountyOnly(false)
    void fetchIssues({ page: 1, reset: true, picks: t.picks, difficulty: "easy", bounty: false })
  }
  function searchAnotherLevel(next: Difficulty) {
    setDifficulty(next)
    void fetchIssues({ page: 1, reset: true, difficulty: next })
  }

  const count = sortedIssues.length
  const hiddenByActive = activeOnly && issues.length > 0 && count === 0
  const view: "loading" | "error" | "landing" | "empty" | "list" = loading
    ? "loading"
    : error
      ? "error"
      : !searched
        ? "landing"
        : count === 0
          ? "empty"
          : "list"
  const toolbarMode = view === "loading" ? "loading" : view === "list" || view === "empty" ? "results" : "other"

  const stackChanged = picks.length !== DEFAULT_PICKS.length || picks[0] !== DEFAULT_PICKS[0]
  const filterCount = (stackChanged ? 1 : 0) + (difficulty !== DEFAULT_DIFFICULTY ? 1 : 0) + (bountyOnly ? 1 : 0) + (activeOnly ? 1 : 0)

  const filterProps = {
    picks,
    setPicks: changePicks,
    onOpenPicker: () => setPickerOpen(true),
    difficulty,
    setDifficulty: (v: Difficulty) => {
      setDifficulty(v)
      resetForNewFilters()
    },
    bountyOnly,
    setBountyOnly: (v: boolean) => {
      setBountyOnly(v)
      resetForNewFilters()
    },
    activeOnly,
    setActiveOnly,
    loading,
    onSearch: runSearch,
    onReset: resetFilters,
    isDefault: filterCount === 0,
  }

  return (
    <TooltipProvider delayDuration={150}>
      {/* One Sheet for the filters; the Filters buttons (toolbar, hero) are its triggers. */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
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
              // Below lg the bottom nav floats over this scroll area, so the end of the page stops above it. Same height as <BottomNavSpacer />.
              className="hunt-scroll min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(88px+env(safe-area-inset-bottom,0px))] lg:pb-0"
            >
              <h1 className="sr-only lg:hidden">Hunt Issues</h1>

              {/* No toolbar before the first search: the hero carries its own controls, so nothing pushes it down. */}
              {view !== "landing" && (
                <ResultsToolbar
                  scrolled={scrolled}
                  busy={loading || loadingMore}
                  mode={toolbarMode}
                  count={count}
                  filterCount={filterCount}
                  difficulty={difficulty}
                  picks={picks}
                  bountyOnly={bountyOnly}
                  activeOnly={activeOnly}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  onOpenPicker={() => setPickerOpen(true)}
                />
              )}

              {view === "loading" && (
                <div className="mx-auto w-full max-w-6xl space-y-4 sm:px-6 sm:py-6">
                  <SearchProgress key={searchRun} progress={progress} picks={picks} target={searchTarget} difficulty={difficulty} bounty={bountyOnly} onCancel={cancelSearch} />
                  <ul aria-hidden="true" className="divide-y divide-white/[0.05] overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
                    {Array.from({ length: 4 }, (_, i) => (
                      <SkeletonRow key={i} i={i} />
                    ))}
                  </ul>
                </div>
              )}

              {view === "error" && (
                <StatePanel role="alert" tone="danger" icon={<AlertIcon className="h-5 w-5" />} title="Couldn't load issues" message={error}>
                  <Button type="button" onClick={retry} className={LIME_BTN}>
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                    Try again
                  </Button>
                </StatePanel>
              )}

              {view === "landing" && (
                <Landing
                  picks={picks}
                  difficulty={difficulty}
                  filterCount={filterCount}
                  notice={notice}
                  onOpenPicker={() => setPickerOpen(true)}
                  onSearch={runSearch}
                  onRunTemplate={runTemplate}
                />
              )}

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
                    message={`Nothing open labeled “${DIFF[difficulty].rule}” turned up for ${searchTarget}. Try another level or stack.`}
                  >
                    {difficulty !== "medium" && (
                      <Button type="button" variant="outline" className={OUTLINE_BTN} onClick={() => searchAnotherLevel("medium")}>
                        <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", DIFF.medium.dot)} />
                        Try Medium
                      </Button>
                    )}
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
                    <Button type="button" variant="outline" className={OUTLINE_BTN} onClick={() => setPickerOpen(true)}>
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      Change stack
                    </Button>
                  </StatePanel>
                ))}

              {view === "list" && (
                <div className="mx-auto w-full max-w-6xl sm:px-6 sm:py-6">
                  {partial && (
                    <div
                      role="status"
                      className="mx-4 mb-3 mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-[13px] text-amber-100 sm:mx-0 sm:mt-0"
                    >
                      <span className="flex items-center gap-2">
                        <AlertIcon className="h-4 w-4 shrink-0 text-amber-300" />
                        One of the GitHub searches failed, so this list may be missing issues.
                      </span>
                      <button
                        type="button"
                        onClick={searchAgain}
                        className="cursor-pointer rounded font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                      >
                        Search again
                      </button>
                    </div>
                  )}
                  <ul className="divide-y divide-white/[0.05] overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
                    {sortedIssues.map((issue, i) => {
                      const proposal = proposals[issue.id]
                      const open = openProposalId === issue.id
                      return (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          index={i}
                          showLanguage={picks.length > 1}
                          copied={copiedKey === `repo:${issue.id}`}
                          proposalOpen={open}
                          onOpenDetails={openDetails}
                          onCopyRepo={() => void copy(`repo:${issue.id}`, `https://github.com/${repoName(issue.repository_url)}`)}
                          onToggleProposal={() => toggleProposal(issue)}
                        >
                          {open && !issue.isLocked && proposal && (
                            <ProposalPanel
                              issue={issue}
                              proposal={proposal}
                              copied={copiedKey === `proposal:${issue.id}`}
                              onChange={(v) => setProposals((prev) => ({ ...prev, [issue.id]: { ...prev[issue.id], text: v, edited: true } }))}
                              onCopy={() => void copy(`proposal:${issue.id}`, proposal.text)}
                              onRegenerate={() => void generateProposal(issue)}
                              onLearn={(trigger) => openDetails(issue, trigger, "claim")}
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
                          className="cursor-pointer rounded font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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

        <SheetContent
          side={wide ? "right" : "bottom"}
          showCloseButton={false}
          className={cn("hunt-sheet z-[1000] flex flex-col gap-0 border-white/10 bg-[#0b0b0b] p-0", wide ? "hunt-filters-drawer" : "max-h-[88dvh] rounded-t-2xl")}
        >
          {!wide && <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-neutral-700" />}
          <SheetHeader className={cn("shrink-0 gap-0 px-5 text-left", wide ? "border-b border-white/[0.06]" : "pb-1 pt-2")}>
            <div className={cn("flex items-center justify-between gap-3", wide ? "h-16" : "h-12")}>
              <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-neutral-100">
                <SlidersHorizontal className="h-4 w-4 text-neutral-400" strokeWidth={2} />
                Filters
              </SheetTitle>
              <SheetClose asChild>
                <button type="button" aria-label="Close filters" className={CLOSE_BTN}>
                  <X className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </SheetClose>
            </div>
            <SheetDescription className="sr-only">Choose your stack, difficulty and options, then search for issues.</SheetDescription>
          </SheetHeader>
          <FiltersPanel variant="sheet" {...filterProps} />
        </SheetContent>
      </Sheet>

      <StackPicker open={pickerOpen} onOpenChange={onPickerOpenChange} picks={picks} onChange={setPicks} />

      <IssueDetailsDrawer
        issue={detail}
        session={detailSession}
        start={detailStart}
        open={detailOpen}
        difficulty={difficulty}
        onOpenChange={setDetailOpen}
        onDraftProposal={draftFromDetails}
        onSwitchIssue={(next) => {
          setDetailStart(null)
          setDetail(next)
        }}
        onCloseAutoFocus={(e) => {
          // No <SheetTrigger> opened this drawer (any row can), so hand focus back to the row's title ourselves.
          e.preventDefault()
          openerRef.current?.focus()
        }}
      />
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