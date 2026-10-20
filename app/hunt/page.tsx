"use client"

import Link from "next/link"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
import {
  Accessibility,
  Archive,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  Coins,
  Copy,
  Eye,
  FlaskConical,
  FolderGit2,
  Gauge,
  GitFork,
  Globe,
  Lightbulb,
  Lock,
  MessageSquare,
  MessagesSquare,
  Minus,
  Package,
  Palette,
  PenLine,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  SmilePlus,
  Star,
  Tag,
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
const DEFAULT_LANGUAGE = "JavaScript"

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
  bounty?: boolean
  difficulty?: Difficulty
}

type ProposalSource = "ai" | "template"

const DIFFICULTIES = ["easy", "medium", "hard"] as const
type Difficulty = (typeof DIFFICULTIES)[number]
const DEFAULT_DIFFICULTY: Difficulty = "easy"

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first", short: "Newest", hint: "Most recently opened", icon: Clock },
  { value: "least-commented", label: "Least commented", short: "Least commented", hint: "Uncontested issues", icon: MessageSquare },
  { value: "most-commented", label: "Most commented", short: "Most commented", hint: "Active discussion", icon: MessagesSquare },
  { value: "most-reactions", label: "Most reactions", short: "Most reactions", hint: "Community interest", icon: SmilePlus },
] as const
type SortBy = (typeof SORT_OPTIONS)[number]["value"]

/** Difficulty is a dot plus the word, so colour is never the only cue. The accent
 *  lime is reserved for primary actions and the brand mark, not for status. */
const DIFF: Record<Difficulty, { label: string; dot: string }> = {
  easy: { label: "Easy", dot: "bg-emerald-400" },
  medium: { label: "Medium", dot: "bg-amber-400" },
  hard: { label: "Hard", dot: "bg-rose-400" },
}

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

// ────────────────────────────────────────────────────────────────────────────
// GitHub data for the details drawer
//
// Calls GitHub's public REST API straight from the browser, so there is no token
// and the limit is 60 requests/hour per IP. To stay inside it: every section loads
// (and fails) on its own, results are cached for 10 minutes (memory + sessionStorage),
// identical in-flight requests are shared, and after a rate-limit response nothing
// more is sent until the reset time. A server route holding a token would lift the cap.
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
  conduct: boolean
  issueTemplate: boolean
  prTemplate: boolean
}

interface RepoDetails {
  repo: Part<RepoInfo>
  issue: Part<IssueInfo>
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
  issue: LOADING,
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

function parseIssue(raw: unknown): IssueInfo | null {
  if (!isObj(raw)) return null
  return {
    state: asStr(raw.state) ?? "open",
    author: loginOf(raw.user),
    assignees: asArr(raw.assignees).flatMap((a) => {
      const login = loginOf(a)
      return login ? [login] : []
    }),
    labels: asArr(raw.labels)
      .flatMap((l) => {
        if (!isObj(l)) return []
        const name = asStr(l.name)
        if (!name) return []
        const color = typeof l.color === "string" && /^[0-9a-fA-F]{6}$/.test(l.color) ? `#${l.color}` : "#8b95a5"
        return [{ name, color }]
      })
      .slice(0, 8),
    excerpt: plainExcerpt(asStr(raw.body)),
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
  return {
    score: typeof raw.health_percentage === "number" ? raw.health_percentage : null,
    contributing: has("contributing"),
    conduct: has("code_of_conduct") || has("code_of_conduct_file"),
    issueTemplate: has("issue_template"),
    prTemplate: has("pull_request_template"),
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

/** Loads every drawer section in parallel. Keyed by repo + issue, so switching rows never shows stale data. */
function useRepoDetails(repo: string | null, issueNo: number | null) {
  const safeRepo = repo && /^[\w.-]+\/[\w.-]+$/.test(repo) ? repo : null
  const [nonce, setNonce] = useState(0)
  const key = safeRepo ? `${safeRepo}#${issueNo ?? 0}#${nonce}` : ""
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
    if (issueNo) void ghGet(`${base}/issues/${issueNo}`, parseIssue, true).then((r) => apply({ issue: toPart(r) }))
    return () => {
      cancelled = true
    }
  }, [key, safeRepo, issueNo])

  const current = store.key === key ? store.value : LOADING_DETAILS
  const details: RepoDetails = issueNo ? current : { ...current, issue: EMPTY }
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { details, reload }
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
.hunt-hide-scrollbar { scrollbar-width: none; }
.hunt-hide-scrollbar::-webkit-scrollbar { display: none; }

@keyframes hunt-rise { from { opacity: 0; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: none; } }
@keyframes hunt-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes hunt-blur { from { opacity: 0; filter: blur(10px); transform: translate3d(0, 8px, 0); } to { opacity: 1; filter: blur(0); transform: none; } }
@keyframes hunt-wipe { from { clip-path: inset(0 100% 0 0 round 999px); } to { clip-path: inset(0 0 0 0 round 999px); } }
@keyframes hunt-shimmer { to { transform: translateX(100%); } }
@keyframes hunt-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(360%); } }
@keyframes hunt-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

.hunt-rise { animation: hunt-rise .5s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-fade { animation: hunt-fade .25s ease-out backwards; }
.hunt-blur { animation: hunt-blur .8s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-wipe { animation: hunt-wipe .9s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.hunt-pulse { animation: hunt-pulse 1.4s ease-in-out infinite; }
.hunt-skel { position: relative; overflow: hidden; background: rgba(255,255,255,.045); }
.hunt-skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent); animation: hunt-shimmer 1.5s ease-in-out infinite; }
.hunt-bar { animation: hunt-bar 1.2s cubic-bezier(.4,0,.2,1) infinite; }

.hunt-spot { --mx: 50%; --my: 50%; --accent: 168,255,62; }
.hunt-spot::before, .hunt-spot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .35s ease; }
.hunt-spot::before { background: radial-gradient(360px circle at var(--mx) var(--my), rgba(var(--accent), .09), transparent 65%); }
.hunt-spot::after { padding: 1px; background: radial-gradient(260px circle at var(--mx) var(--my), rgba(var(--accent), .6), transparent 65%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
.hunt-spot:hover::before, .hunt-spot:hover::after, .hunt-spot:focus-visible::before, .hunt-spot:focus-visible::after { opacity: 1; }

/* Drawers. Widths are forced because shadcn versions disagree on the default (w-3/4, sm:max-w-sm). */
.hunt-filters-drawer { width: min(100vw, 400px) !important; max-width: none !important; }
.hunt-detail-drawer { width: min(100vw, 520px) !important; max-width: none !important; }

/* shadcn ships the sheet's close button at 16px with a filled background; give it a real touch target, centred on the header row */
.hunt-sheet > button:last-child { top: var(--close-top, 12px); right: 12px; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 8px; opacity: 1; background: transparent; color: #a3a3a3; transition: background-color .15s ease, color .15s ease; }
.hunt-sheet > button:last-child:hover { background: rgba(255,255,255,.07); color: #fff; }

@media (prefers-reduced-motion: reduce) {
  .hunt-rise, .hunt-fade, .hunt-blur, .hunt-wipe, .hunt-pulse, .hunt-skel::after, .hunt-bar { animation: none !important; }
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
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[12.5px] font-medium text-neutral-300 transition-[background-color,border-color,color,transform] duration-150 hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.97] lg:h-8"

// ────────────────────────────────────────────────────────────────────────────
// Controls — segmented switch · settings group
// ────────────────────────────────────────────────────────────────────────────

interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

/** Radio-group segmented control: flat, 2px inset, sliding thumb, arrow-key support. */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  label: string
  size?: "sm" | "md"
  className?: string
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
      className={cn("relative grid rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0.5 left-0.5 rounded-md border border-white/10 bg-white/[0.1] shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
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
              "relative z-10 flex items-center justify-center gap-2 rounded-md text-[13px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-white/60",
              size === "md" ? "h-10 lg:h-8" : "h-8 lg:h-7",
              active ? "text-white" : "text-neutral-400 hover:text-neutral-200"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Settings-style list: one bordered group, rows divided by hairlines. */
function ToggleGroup({ children }: { children: ReactNode }) {
  return (
    <div className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
      {children}
    </div>
  )
}

/** Accessible on/off row (role=switch): label and hint on the left, a neutral switch on the right. */
function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 px-3.5 py-3 text-left outline-none transition-colors duration-150 hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-neutral-100">{label}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-neutral-400">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-transparent bg-neutral-100" : "border-white/25 bg-white/[0.06]"
        )}
      >
        <span
          className={cn(
            "absolute left-[2px] top-[2px] h-3.5 w-3.5 rounded-full transition-[transform,background-color] duration-200 ease-[cubic-bezier(.22,1,.36,1)]",
            checked ? "translate-x-4 bg-neutral-900" : "translate-x-0 bg-neutral-300"
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
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition-colors duration-100",
        isFocused ? "bg-white/[0.07] text-white" : isSelected ? "bg-white/[0.04] text-white" : "text-neutral-300"
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: data.iconColor }} />
      <span className="truncate font-medium">{data.label}</span>
      {isSelected && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-neutral-200" strokeWidth={2.25} />}
    </div>
  )
}

function LanguageSingleValue(props: SingleValueProps<LanguageOption, boolean>) {
  const { data } = props
  const Icon = data.icon
  return (
    <div className="flex items-center gap-2">
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: data.iconColor }} />
      <span className="text-[14px] font-medium text-neutral-100">{data.label}</span>
    </div>
  )
}

function LanguageMultiValue(props: MultiValueProps<LanguageOption, true>) {
  const { data, removeProps } = props
  const Icon = data.icon
  const buttonRemoveProps = removeProps as unknown as ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <div className="my-[3px] mr-1.5 flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.06] py-[3px] pl-1.5 pr-1">
      <Icon aria-hidden="true" className="h-3 w-3 shrink-0" style={{ color: data.iconColor }} />
      <span className="max-w-[84px] truncate text-[12px] font-medium text-neutral-100">{data.label}</span>
      <button
        {...buttonRemoveProps}
        type="button"
        aria-label={`Remove ${data.label}`}
        className="ml-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </div>
  )
}

function formatGroupLabel(group: { label?: string; options: readonly LanguageOption[] }) {
  return (
    <div className="flex items-center justify-between px-1 pb-1 pt-2 first:pt-0">
      <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{group.label}</span>
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
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${state.isFocused ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 8,
      minHeight: 40,
      boxShadow: state.isFocused ? "0 0 0 3px rgba(255,255,255,0.08)" : "none",
      cursor: "pointer",
      transition: "border-color .15s ease, box-shadow .15s ease, background-color .15s ease",
      "&:hover": {
        borderColor: state.isFocused ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)",
        background: "rgba(255,255,255,0.045)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      display: "flex",
      alignItems: "center",
      padding: multi ? "4px 10px" : "0 12px",
      gap: 4,
    }),
    placeholder: (base) => ({ ...base, color: "#8a8a8a", fontSize: 14 }),
    // 16px while the filters are a drawer (below lg): iOS Safari zooms the page when a smaller field is focused.
    input: (base) => ({ ...base, color: "#fff", margin: 0, "@media (max-width: 1023px)": { fontSize: 16 } }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "#e5e5e5" : "#8a8a8a",
      padding: 8,
      "&:hover": { color: "#e5e5e5" },
    }),
    clearIndicator: (base) => ({ ...base, color: "#8a8a8a", padding: 8, "&:hover": { color: "#fff" } }),
    menu: (base) => ({
      ...base,
      background: "#101010",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
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
    option: (base) => ({ ...base, background: "transparent", padding: 0, borderRadius: 6, cursor: "pointer" }),
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
      <SectionTitle
        aside={
          <Segmented
            size="sm"
            className="w-[10.5rem]"
            label="Language selection mode"
            value={multiMode ? "multi" : "single"}
            onChange={(v) => onModeChange(v === "multi")}
            options={[
              { value: "single", label: "Single" },
              { value: "multi", label: "Multi" },
            ]}
          />
        }
      >
        Language
      </SectionTitle>

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
// Filters panel (desktop sidebar, tablet drawer and phone sheet share it)
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
  onReset: () => void
  isDefault: boolean
}

function FiltersPanel(props: FiltersPanelProps) {
  const {
    variant, language, setLanguage, languages, setLanguages, multiMode, setMultiMode,
    difficulty, setDifficulty, bountyOnly, setBountyOnly, activeOnly, setActiveOnly,
    loading, onSearch, onReset, isDefault,
  } = props

  function handleModeChange(next: boolean) {
    if (next) setLanguages(languages.length ? languages : [language])
    else setLanguage(languages[0] || language)
    setMultiMode(next)
  }

  const canSearch = !loading && !(multiMode && languages.length === 0)

  const difficultyOptions: SegmentedOption<Difficulty>[] = DIFFICULTIES.map((d) => ({
    value: d,
    label: (
      <>
        <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DIFF[d].dot)} />
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
            <SectionTitle>Difficulty</SectionTitle>
            <Segmented label="Difficulty" value={difficulty} onChange={setDifficulty} options={difficultyOptions} />
          </div>

          <div>
            <SectionTitle>Refine</SectionTitle>
            <ToggleGroup>
              <ToggleRow
                checked={bountyOnly}
                onChange={setBountyOnly}
                label="Paid bounties"
                description="Only issues with a bounty attached"
              />
              <ToggleRow
                checked={activeOnly}
                onChange={setActiveOnly}
                label="Active repos only"
                description="Hide repos with no recent merged PRs"
              />
            </ToggleGroup>
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
          <Button type="submit" disabled={!canSearch} aria-busy={loading} className={cn(LIME_BTN, "flex-1 disabled:opacity-60")}>
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
  const accent = option?.iconColor || "#5b6472"
  const Icon = option?.icon
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] transition-colors duration-200 group-hover/row:border-white/25">
      {Icon ? (
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: accent }} />
      ) : (
        <FolderGit2 className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
      )}
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

/** The claiming comment, laid out like GitHub's own comment box so it reads as a real composer. */
function ProposalPanel({
  issue,
  text,
  source,
  generating,
  copied,
  onChange,
  onCopy,
  onRegenerate,
}: {
  issue: Issue
  text: string
  source: ProposalSource | undefined
  generating: boolean
  copied: boolean
  onChange: (v: string) => void
  onCopy: () => void
  onRegenerate: () => void
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
      className="hunt-rise border-t border-white/[0.05] bg-white/[0.015] px-4 py-4 sm:px-5 md:pl-[4.75rem]"
    >
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0a0a0a] transition-[border-color,box-shadow] duration-150 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/10">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] bg-white/[0.025] py-1.5 pl-3 pr-1.5">
          <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-medium text-neutral-200">
            <PenLine className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
            <span className="truncate">
              <span className="sm:hidden">Claim comment</span>
              <span className="hidden sm:inline">Comment to claim this issue</span>
            </span>
            {!generating && source && (
              <span
                title={source === "template" ? "The AI draft wasn't available, so this is a generic template." : undefined}
                className="shrink-0 rounded border border-white/10 px-1.5 py-px text-[11px] font-normal text-neutral-400"
              >
                {source === "ai" ? "AI draft" : "Template"}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={generating}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-neutral-300 transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50 lg:h-7"
          >
            <RotateCcw className={cn("h-3.5 w-3.5", generating && "animate-spin motion-reduce:[animation-duration:3s]")} strokeWidth={2} />
            Regenerate
          </button>
        </div>

        {generating ? (
          <div role="status" aria-label="Drafting your comment" className="space-y-2.5 p-3.5">
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
            // 16px on phones: iOS Safari zooms the page when a smaller field is focused.
            className="block min-h-[104px] w-full resize-none overflow-y-auto bg-transparent px-3.5 py-3 font-mono text-base leading-relaxed text-neutral-200 outline-none sm:text-[13px]"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.07] bg-white/[0.025] px-3 py-2">
          <span className="text-[12px] tabular-nums text-neutral-400">
            {generating ? "Drafting…" : `${text.length} characters · edit it, then paste it on the issue`}
          </span>
          <div className="flex items-center gap-2">
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
                "border-transparent bg-[#a8ff3e] font-semibold text-neutral-950 hover:border-transparent hover:bg-[#bcff6a] hover:text-neutral-950 disabled:pointer-events-none disabled:opacity-50"
              )}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2.25} /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy comment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface IssueRowProps {
  issue: Issue
  index: number
  showLanguage: boolean
  copied: boolean
  proposalOpen: boolean
  proposalGenerating: boolean
  onOpenDetails: (issue: Issue, trigger: HTMLElement) => void
  onCopyRepo: () => void
  onToggleProposal: () => void
  children?: ReactNode
}

function IssueRow({
  issue, index, showLanguage, copied, proposalOpen, proposalGenerating,
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
              className="block min-w-0 rounded-sm text-left outline-none transition-colors duration-150 after:absolute after:inset-0 hover:text-white focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-white/50"
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
                <langOpt.icon aria-hidden="true" className="h-3 w-3 shrink-0" style={{ color: langOpt.iconColor }} />
                {langOpt.label}
              </span>
            )}

            <ActivityStatus issue={issue} />

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
            {proposalGenerating ? "Drafting…" : "Proposal"}
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
// Starting-point cards · state panels · search progress
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
        aria-label={`Hunt ${t.key} issues: ${t.title}`}
        onClick={() => onRun(t.key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            onRun(t.key)
          }
        }}
        onPointerMove={trackPointer}
        className="hunt-spot group relative h-full cursor-pointer gap-0 overflow-hidden rounded-xl border-white/[0.08] bg-[#0d0d0d] p-0 shadow-none transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:translate-y-0 active:scale-[0.99]"
        style={cssVars({ "--accent": hexToRgbTriplet(opt?.iconColor) })}
      >
        <CardContent className="relative z-10 flex h-full flex-1 items-center gap-3.5 p-4 sm:flex-col sm:items-start sm:gap-0 sm:p-5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-105 sm:mb-5"
            style={{ background: `${accent}14`, boxShadow: `inset 0 0 0 1px ${accent}2b` }}
          >
            {Icon && <Icon aria-hidden="true" className="h-5 w-5" style={{ color: accent }} />}
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
          "mb-5 flex h-12 w-12 items-center justify-center rounded-xl border",
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

/** Each step stays on screen once reached, so the search reads like a run log instead of a flashing caption.
 *  Steps advance on a timer; the last one stays active until the server answers. */
const PROGRESS_STEP_MS = 2400

function SearchProgress({ target, difficulty, bounty }: { target: string; difficulty: Difficulty; bounty: boolean }) {
  const steps = useMemo(() => {
    const list = [
      { title: "Querying GitHub", detail: `Looking for open issues in ${target} repos.` },
      { title: `Matching ${DIFF[difficulty].label} difficulty`, detail: "Checking labels, comment count and how recently each issue was opened." },
      { title: "Checking repo health", detail: "Looking up each repo's most recent merged pull request." },
    ]
    if (bounty) list.push({ title: "Finding bounties", detail: "Keeping only issues that carry a paid bounty." })
    list.push({ title: "Ranking results", detail: "Sorting the best matches and removing duplicates." })
    return list
  }, [target, difficulty, bounty])

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => setElapsed(performance.now() - start), 200)
    return () => window.clearInterval(id)
  }, [])

  const active = Math.min(steps.length - 1, Math.floor(elapsed / PROGRESS_STEP_MS))
  const slow = elapsed > PROGRESS_STEP_MS * steps.length + 4000
  const summary = [target, DIFF[difficulty].label, bounty ? "Paid bounties" : null].filter(Boolean).join(" · ")

  return (
    <div className="hunt-fade overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
      <span role="status" className="sr-only">
        Searching for issues
      </span>
      <div aria-hidden="true">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-neutral-100">Searching GitHub</p>
            <p className="truncate text-[12.5px] text-neutral-400">{summary}</p>
          </div>
          <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[12px] tabular-nums text-neutral-300">
            {formatElapsed(elapsed)}
          </span>
        </div>

        <ol className="px-4 pb-2 pt-4 sm:px-5">
          {steps.map((s, i) => {
            const state = i < active ? "done" : i === active ? "active" : "pending"
            return (
              <li key={s.title} className="relative flex gap-3 pb-4">
                {i < steps.length - 1 && (
                  <span
                    className={cn("absolute bottom-[-2px] left-[8.5px] top-[22px] w-px", state === "done" ? "bg-white/25" : "bg-white/[0.08]")}
                  />
                )}
                <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                  {state === "done" ? (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  ) : state === "active" ? (
                    <span className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-white/15 border-t-white motion-reduce:[animation-duration:3s]" />
                  ) : (
                    <span className="h-[14px] w-[14px] rounded-full border border-white/25" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-[13.5px] font-medium", state === "pending" ? "text-neutral-400" : "text-neutral-100")}>{s.title}</p>
                  {state !== "pending" && <p className="hunt-fade mt-0.5 text-[12.5px] leading-snug text-neutral-400">{s.detail}</p>}
                </div>
              </li>
            )
          })}
        </ol>

        {slow && (
          <p className="hunt-fade border-t border-white/[0.06] px-4 py-2.5 text-[12.5px] text-neutral-400 sm:px-5">
            Still waiting on the server. Popular languages can take a little longer.
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
  "h-7 shrink-0 gap-1.5 whitespace-nowrap rounded-md border-white/[0.09] bg-white/[0.03] px-2 text-[12px] font-medium text-neutral-300"

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
          "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-[13px] font-medium text-neutral-100 outline-none transition-[background-color,border-color,transform] duration-150 hover:border-white/20 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.97] lg:hidden",
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

function SortMenu({ value, onChange }: { value: SortBy; onChange: (v: SortBy) => void }) {
  const current = SORT_OPTIONS.find((s) => s.value === value) ?? SORT_OPTIONS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sort issues. Current: ${current.label}`}
          className="group ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] pl-3 pr-2.5 text-[12.5px] outline-none transition-[background-color,border-color] duration-150 hover:border-white/20 hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-white/50 data-[state=open]:border-white/25 data-[state=open]:bg-white/[0.07] sm:ml-0 lg:h-8"
        >
          <current.icon className="h-3.5 w-3.5 text-neutral-400" strokeWidth={2} />
          <span className="text-neutral-400">Sort</span>
          <span className="max-w-[9rem] truncate font-medium text-neutral-100">{current.short}</span>
          <ChevronDown
            className="h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 group-data-[state=open]:rotate-180"
            strokeWidth={2}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[17rem] rounded-xl border-white/10 bg-[#0e0e0e] p-1.5 text-neutral-200 shadow-[0_18px_44px_rgba(0,0,0,0.6)]"
      >
        <div className="px-2.5 pb-1.5 pt-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Sort by
        </div>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as SortBy)}>
          {SORT_OPTIONS.map((o) => (
            <DropdownMenuRadioItem
              key={o.value}
              value={o.value}
              // The built-in indicator sits on a different side per shadcn version, so it is hidden and drawn once, at the right.
              className="cursor-pointer rounded-lg py-2 pl-2.5 pr-9 focus:bg-white/[0.07] focus:text-white data-[state=checked]:bg-white/[0.05] [&_span[data-state]]:hidden"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-neutral-300">
                  <o.icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-medium text-neutral-100">{o.label}</span>
                  <span className="text-[11.5px] text-neutral-400">{o.hint}</span>
                </span>
              </span>
              {value === o.value && (
                <Check aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-100" strokeWidth={2} />
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
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
  language,
  languages,
  multiMode,
  bountyOnly,
  activeOnly,
  sortBy,
  setSortBy,
}: {
  scrolled: boolean
  busy: boolean
  mode: "loading" | "results" | "other"
  count: number
  filterCount: number
  difficulty: Difficulty
  language: string
  languages: string[]
  multiMode: boolean
  bountyOnly: boolean
  activeOnly: boolean
  sortBy: SortBy
  setSortBy: (v: SortBy) => void
}) {
  const langOpt = findLanguageOption(language)
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
              {multiMode ? (
                <Badge variant="outline" className={CHIP} title={languages.join(", ")}>
                  {languages.length} {languages.length === 1 ? "language" : "languages"}
                </Badge>
              ) : (
                <Badge variant="outline" className={CHIP}>
                  {langOpt && <langOpt.icon aria-hidden="true" className="h-3 w-3 shrink-0" style={{ color: langOpt.iconColor }} />}
                  {language}
                </Badge>
              )}
              <Badge variant="outline" className={CHIP}>
                <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DIFF[difficulty].dot)} />
                {DIFF[difficulty].label}
              </Badge>
              {bountyOnly && (
                <Badge variant="outline" className={CHIP}>
                  <Coins className="h-3 w-3 text-neutral-400" strokeWidth={2} /> Bounties
                </Badge>
              )}
              {activeOnly && (
                <Badge variant="outline" className={CHIP}>
                  <Zap className="h-3 w-3 text-neutral-400" strokeWidth={2} /> Active only
                </Badge>
              )}
            </>
          )}
        </div>

        {showSort && <SortMenu value={sortBy} onChange={setSortBy} />}
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
// Issue details drawer: the issue first, then everything worth knowing about its repo.
// Each block loads and fails on its own (see useRepoDetails), so a slow or limited
// GitHub never blanks the whole panel.
// ────────────────────────────────────────────────────────────────────────────

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

function DetailBlock({
  title,
  aside,
  delay = 0,
  children,
}: {
  title: string
  aside?: ReactNode
  delay?: number
  children: ReactNode
}) {
  return (
    <section className="hunt-rise px-5 py-5 sm:px-6" style={cssVars({ "--d": `${delay}ms` })}>
      <SectionTitle as="h3" aside={aside}>
        {title}
      </SectionTitle>
      {children}
    </section>
  )
}

/** One label/value row. Used inside a <dl>. */
function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[44px] items-center justify-between gap-4 px-3.5 py-2.5 text-[13px]">
      <dt className="shrink-0 text-neutral-400">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-2 text-right font-medium text-neutral-100">{children}</dd>
    </div>
  )
}

function Dot({ tone }: { tone: "good" | "warn" | "bad" | "muted" }) {
  const color = { good: "bg-emerald-400", warn: "bg-amber-400", bad: "bg-rose-500", muted: "bg-neutral-500" }[tone]
  return <span aria-hidden="true" className={cn("h-[7px] w-[7px] shrink-0 rounded-full", color)} />
}

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: ReactNode; hint?: string }) {
  return (
    <div title={hint} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-neutral-400">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]">{label}</span>
      </p>
      <p className="mt-1 truncate font-mono text-[17px] font-semibold tabular-nums text-neutral-50">{value}</p>
    </div>
  )
}

const CHIP_SOFT = "inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[12px] text-neutral-300"

// ── This issue ───────────────────────────────────────────────────────────────

function IssueBlock({ issue, info, number }: { issue: Issue; info: Part<IssueInfo>; number: number | null }) {
  const reactions = issue.reactions?.total_count ?? 0
  const data = info.status === "ok" ? info.data : null
  return (
    <DetailBlock title="This issue">
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02]">
        <div className="p-4 pb-3.5">
          <p className="text-[15px] font-medium leading-snug text-neutral-100">{issue.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[12px] text-neutral-400">
            {number !== null && <span>#{number}</span>}
            <time dateTime={issue.created_at}>opened {timeAgo(issue.created_at)}</time>
            {data?.author && <span>by {data.author}</span>}
          </p>
        </div>

        <dl className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
          {info.status === "loading" ? (
            <KV label="Assignee">
              <Skeleton className="h-4 w-32" />
            </KV>
          ) : data ? (
            <>
              <KV label="Status">
                <Dot tone={data.state === "open" ? "good" : "bad"} />
                {data.state === "open" ? "Open" : "Closed"}
              </KV>
              <KV label="Assignee">
                {data.assignees.length === 0 ? (
                  <>
                    <Dot tone="good" />
                    <span>
                      Unassigned <span className="font-normal text-neutral-400">· open to claim</span>
                    </span>
                  </>
                ) : (
                  <>
                    <Dot tone="warn" />
                    <span className="truncate">
                      {data.assignees.slice(0, 2).join(", ")}
                      {data.assignees.length > 2 && ` +${data.assignees.length - 2}`}
                    </span>
                  </>
                )}
              </KV>
            </>
          ) : null}
          <KV label="Comments">
            <span className="font-mono tabular-nums">{issue.comments}</span>
          </KV>
          <KV label="Reactions">
            <span className="font-mono tabular-nums">{reactions}</span>
          </KV>
        </dl>

        {info.status === "loading" && (
          <div className="space-y-2.5 border-t border-white/[0.06] p-4">
            <Skeleton className="h-3.5 w-[92%]" />
            <Skeleton className="h-3.5 w-[78%]" />
            <Skeleton className="h-3.5 w-[44%]" />
          </div>
        )}
        {data && (data.labels.length > 0 || data.excerpt) && (
          <div className="space-y-3 border-t border-white/[0.06] p-4">
            {data.labels.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Labels">
                {data.labels.map((l) => (
                  <li key={l.name} className={CHIP_SOFT}>
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: l.color }} />
                    {l.name}
                  </li>
                ))}
              </ul>
            )}
            {data.excerpt && (
              <p className="line-clamp-6 whitespace-pre-line text-[13px] leading-relaxed text-neutral-400">{data.excerpt}</p>
            )}
          </div>
        )}
      </div>
    </DetailBlock>
  )
}

// ── Repository: stats, topics, website ───────────────────────────────────────

function OverviewBlock({ repo }: { repo: Part<RepoInfo> }) {
  if (repo.status === "loading") {
    return (
      <DetailBlock title="Repository" delay={60}>
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
    <DetailBlock title="Repository" delay={60}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat icon={Star} label="Stars" value={compact(r.stars)} />
        <Stat icon={GitFork} label="Forks" value={compact(r.forks)} />
        <Stat icon={Eye} label="Watching" value={compact(r.watchers)} />
        <Stat icon={CircleDot} label="Open issues" value={compact(r.openIssues)} hint="GitHub counts open pull requests in this number." />
        <Stat icon={Scale} label="License" value={r.license ?? "None"} />
        <Stat icon={Clock} label="Created" value={r.createdAt ? new Date(r.createdAt).getFullYear() : "n/a"} />
      </div>

      {r.topics.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Topics">
          {r.topics.slice(0, 8).map((t) => (
            <li key={t} className={CHIP_SOFT}>
              {t}
            </li>
          ))}
          {r.topics.length > 8 && <li className={cn(CHIP_SOFT, "text-neutral-400")}>+{r.topics.length - 8}</li>}
        </ul>
      )}

      {showSite && r.homepage && (
        <ExtLink
          href={r.homepage}
          className={cn(
            "mt-4 flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]",
            LINK_FOCUS
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-neutral-300">
            <Globe aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium text-neutral-100">Has its own site</span>
            <span className="block truncate font-mono text-[12px] text-neutral-400">{hostOf(r.homepage)}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-neutral-200">
            Visit <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        </ExtLink>
      )}
    </DetailBlock>
  )
}

// ── Repository health ────────────────────────────────────────────────────────

function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-[12.5px]">
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
          ok ? "bg-emerald-400/15 text-emerald-300" : "bg-white/[0.06] text-neutral-400"
        )}
      >
        {ok ? <Check className="h-3 w-3" strokeWidth={2.5} /> : <Minus className="h-3 w-3" strokeWidth={2.5} />}
      </span>
      <span className={ok ? "text-neutral-200" : "text-neutral-400"}>{label}</span>
      <span className="sr-only">{ok ? ": yes" : ": no"}</span>
    </li>
  )
}

function HealthBlock({
  issue,
  repo,
  release,
  community,
}: {
  issue: Issue
  repo: Part<RepoInfo>
  release: Part<ReleaseInfo>
  community: Part<CommunityInfo>
}) {
  const inactive = issue.isActiveRepo === false
  const since = issue.repoLastActivityAt
  const pushedAt = repo.status === "ok" ? repo.data.pushedAt : null
  const pushedDays = daysSince(pushedAt)
  const pushStale = pushedDays !== null && pushedDays > 180

  return (
    <DetailBlock title="Repository health" delay={120}>
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
            <KV label="Community profile">
              <span
                role="img"
                aria-label={`${community.data.score} percent`}
                className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]"
              >
                <span
                  className="block h-full rounded-full bg-neutral-200"
                  style={{ width: `${Math.max(0, Math.min(100, community.data.score))}%` }}
                />
              </span>
              <span className="font-mono tabular-nums">{community.data.score}%</span>
            </KV>
          )
        )}
      </dl>

      {community.status === "ok" && (
        <ul className="mt-3.5 grid grid-cols-1 gap-x-4 gap-y-2 min-[420px]:grid-cols-2" aria-label="Contributor docs">
          <CheckItem ok={community.data.contributing} label="Contributing guide" />
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
      <DetailBlock title="Languages" delay={180}>
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
    <DetailBlock title="Languages" delay={180}>
      <div
        role="img"
        aria-label={`Languages: ${langs.map((l) => `${l.name} ${l.pct.toFixed(1)}%`).join(", ")}`}
        className="hunt-wipe flex h-2 w-full gap-px overflow-hidden rounded-full bg-white/[0.06]"
        style={cssVars({ "--d": "260ms" })}
      >
        {langs.map((l) => (
          <span
            key={l.name}
            className="h-full"
            style={{ width: `${Math.max(l.pct, 0.8)}%`, background: l.name === "Other" ? "#525252" : langColor(l.name) }}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {langs.map((l) => (
          <li key={l.name} className="flex min-w-0 items-center gap-2 text-[12.5px]">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: l.name === "Other" ? "#525252" : langColor(l.name) }}
            />
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
      <DetailBlock title="Latest release" delay={220}>
        <Skeleton className="h-[62px] rounded-lg" />
      </DetailBlock>
    )
  }
  if (release.status !== "ok") return null
  const r = release.data
  return (
    <DetailBlock title="Latest release" delay={220}>
      <ExtLink
        href={r.url}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-white/20 hover:bg-white/[0.04]",
          LINK_FOCUS
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-neutral-300">
          <Tag aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[13px] font-semibold text-neutral-100">{r.tag}</span>
          <span className="block truncate text-[12px] text-neutral-400">
            {r.name && r.name !== r.tag ? `${r.name} · ` : ""}
            {r.publishedAt ? `Published ${formatExactDate(r.publishedAt)} (${timeAgo(r.publishedAt)})` : "Published"}
          </span>
        </span>
        <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={2} />
      </ExtLink>
    </DetailBlock>
  )
}

function CommitsBlock({ commits, repoUrl }: { commits: Part<CommitInfo[]>; repoUrl: string }) {
  if (commits.status === "loading") {
    return (
      <DetailBlock title="Recent commits" delay={260}>
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
      delay={260}
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
              <code className="mt-0.5 shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-neutral-300">
                {c.sha.slice(0, 7)}
              </code>
            </ExtLink>
          </li>
        ))}
      </ul>
    </DetailBlock>
  )
}

function ContributorsBlock({ contributors }: { contributors: Part<Contributor[]> }) {
  if (contributors.status === "loading") {
    return (
      <DetailBlock title="Top contributors" delay={300}>
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
    <DetailBlock title="Top contributors" delay={300}>
      <ul className="flex flex-wrap gap-2">
        {contributors.data.map((c) => (
          <li key={c.login}>
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={c.url ?? `https://github.com/${encodeURIComponent(c.login)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${c.login}, ${compact(c.contributions)} contributions (opens in a new tab)`}
                  className="block rounded-full ring-2 ring-transparent transition-shadow hover:ring-white/30 focus-visible:outline-none focus-visible:ring-white/60"
                >
                  <Avatar login={c.login} size={36} />
                </a>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="border border-white/10 bg-[#1a1a1a] text-[12px] text-neutral-200 [&_svg]:bg-[#1a1a1a] [&_svg]:fill-[#1a1a1a]"
              >
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
  rateResetAt,
  rateHit,
  repoMissing,
  networkFailed,
  onRetry,
}: {
  rateResetAt?: number
  rateHit: boolean
  repoMissing: boolean
  networkFailed: boolean
  onRetry: () => void
}) {
  if (!rateHit && !repoMissing && !networkFailed) return null
  const title = repoMissing
    ? "Repository not found"
    : rateHit
      ? "GitHub's API limit was reached"
      : "Couldn't reach GitHub"
  const body = repoMissing
    ? "It may have been renamed, made private or deleted. The issue link still works."
    : rateHit
      ? `Anonymous requests are capped at 60 an hour. The rest of the repo details will load again ${rateResetAt ? `after ${clockTime(rateResetAt)}` : "in a little while"}.`
      : "Some details didn't load. Check your connection and try again."
  return (
    <div role="status" className="flex items-start gap-3 bg-white/[0.025] px-5 py-3.5 sm:px-6">
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-neutral-100">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-400">{body}</p>
      </div>
      {!repoMissing && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-white/10 px-2.5 text-[12px] font-medium text-neutral-200 outline-none transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          Retry
        </button>
      )}
    </div>
  )
}

// ── The drawer ───────────────────────────────────────────────────────────────

function IssueDetailsDrawer({
  issue,
  open,
  onOpenChange,
  onDraftProposal,
  onCloseAutoFocus,
}: {
  issue: Issue | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDraftProposal: (issue: Issue) => void
  onCloseAutoFocus: (e: Event) => void
}) {
  const repoFull = issue ? repoName(issue.repository_url) : null
  const number = issue ? issueNumber(issue.html_url) : null
  const { details, reload } = useRepoDetails(repoFull, number)
  if (!issue || !repoFull) return null

  const { repo, issue: issuePart, languages, commits, contributors, release, community } = details
  const [owner, name] = splitRepo(repoFull)
  const verified = VERIFIED_REPOS.has(repoFull.toLowerCase())
  const repoUrl = (repo.status === "ok" && repo.data.htmlUrl) || `https://github.com/${repoFull}`

  const failed = [repo, issuePart, languages, commits, contributors, release, community].flatMap((p) =>
    p.status === "error" ? [p] : []
  )
  const rate = failed.find((p) => p.reason === "rate")
  const repoMissing = repo.status === "error" && repo.reason === "missing"
  const networkFailed = failed.some((p) => p.reason === "network")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onCloseAutoFocus={onCloseAutoFocus}
        className="hunt-sheet hunt-detail-drawer flex flex-col gap-0 border-l border-white/10 bg-[#0b0b0b] p-0"
      >
        <SheetHeader className="shrink-0 gap-0 border-b border-white/[0.07] p-0 text-left">
          <div className="flex items-start gap-3.5 py-4 pl-5 pr-16 sm:pl-6">
            <Avatar login={owner.replace(/\/$/, "")} size={44} className="mt-0.5 rounded-lg" />
            <div className="min-w-0 flex-1">
              <SheetTitle className="flex min-w-0 items-center gap-1.5 font-mono text-[15px] font-semibold leading-tight text-white">
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
              </SheetTitle>
              <SheetDescription className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-neutral-400">
                {repo.status === "loading" ? (
                  <>
                    <Skeleton className="h-3.5 w-11/12" />
                    <Skeleton className="mt-1.5 h-3.5 w-2/3" />
                  </>
                ) : repo.status === "ok" ? (
                  (repo.data.description ?? "No description provided.")
                ) : (
                  "Repository details are unavailable right now."
                )}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="hunt-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="divide-y divide-white/[0.06]">
            <DetailsNotice
              rateHit={!!rate}
              rateResetAt={rate?.resetAt}
              repoMissing={repoMissing}
              networkFailed={networkFailed}
              onRetry={reload}
            />

            {repo.status === "ok" && repo.data.archived && (
              <div className="flex items-start gap-3 px-5 py-3.5 sm:px-6">
                <Archive aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" strokeWidth={2} />
                <div>
                  <p className="text-[13px] font-medium text-neutral-100">This repository is archived</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-neutral-400">
                    It is read-only, so new comments and pull requests can&apos;t be added.
                  </p>
                </div>
              </div>
            )}

            <IssueBlock issue={issue} info={issuePart} number={number} />
            <OverviewBlock repo={repo} />
            <HealthBlock issue={issue} repo={repo} release={release} community={community} />
            <LanguageBlock languages={languages} />
            <ReleaseBlock release={release} />
            <CommitsBlock commits={commits} repoUrl={repoUrl} />
            <ContributorsBlock contributors={contributors} />
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.07] bg-[#0b0b0b] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Button type="button" variant="outline" onClick={() => onDraftProposal(issue)} className={cn(OUTLINE_BTN, "flex-1 sm:flex-none")}>
              <PenLine className="h-4 w-4" strokeWidth={2} />
              Draft proposal
            </Button>
            <Button asChild className={cn(LIME_BTN, "flex-1")}>
              <a href={issue.html_url} target="_blank" rel="noopener noreferrer">
                Open on GitHub
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
  const [languages, setLanguages] = useState<string[]>([DEFAULT_LANGUAGE])
  const [multiMode, setMultiMode] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY)
  const [done, setDone] = useState(false)
  const [searched, setSearched] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [bountyOnly, setBountyOnly] = useState(false)
  const [activeOnly, setActiveOnly] = useState(false)
  const [openProposalId, setOpenProposalId] = useState<number | null>(null)
  const [proposals, setProposals] = useState<Record<number, { text: string; source?: ProposalSource }>>({})
  const [generatingIds, setGeneratingIds] = useState<number[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [searchRun, setSearchRun] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [detail, setDetail] = useState<Issue | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Tablets and up get filters as a right-hand drawer; phones get a bottom sheet.
  const wide = useMediaQuery("(min-width: 640px)")

  const abortRef = useRef<AbortController | null>(null)
  const lastRequestRef = useRef<FetchOptions | null>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  const searchTarget = multiMode ? (languages.length ? languages.join(", ") : "your stack") : language

  // Sorting is entirely client-side (`sortedIssues`), so changing it never refetches.
  // "Active repos only" is client-side too, so toggling it never wipes your results.
  function resetForNewFilters() {
    abortRef.current?.abort()
    setLoading(false)
    setLoadingMore(false)
    setSearched(false)
    setIssues([])
    setError(null)
    setLoadMoreError(null)
    setOpenProposalId(null)
  }

  function resetFilters() {
    setLanguage(DEFAULT_LANGUAGE)
    setLanguages([DEFAULT_LANGUAGE])
    setMultiMode(false)
    setDifficulty(DEFAULT_DIFFICULTY)
    setBountyOnly(false)
    setActiveOnly(false)
    resetForNewFilters()
  }

  async function flashCopied(key: string, text: string) {
    if (!(await copyText(text))) return
    setCopiedKey(key)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopiedKey(null), 1600)
  }

  async function generateProposal(issue: Issue) {
    setGeneratingIds((ids) => (ids.includes(issue.id) ? ids : [...ids, issue.id]))
    const lang = issue.matchedLanguage || issue.language || (multiMode ? languages[0] : language) || language
    // Used whenever the AI route is down or returns nothing, so the box is never empty.
    let next: { text: string; source?: ProposalSource } = {
      text: `Hi maintainers! 👋 I'm experienced with ${lang} and would love to work on "${issue.title}". Could you please assign this to me? Let me know if there are any specific guidelines to keep in mind!`,
      source: "template",
    }
    try {
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: issue.title, repo: repoName(issue.repository_url), language: lang }),
      })
      const data = res.ok ? await res.json().catch(() => null) : null
      if (data && typeof data.proposal === "string" && data.proposal.trim()) {
        next = {
          text: data.proposal,
          source: data.source === "fallback" ? "template" : data.source === "ai" ? "ai" : undefined,
        }
      }
    } catch {
      // keep the template
    }
    setProposals((prev) => ({ ...prev, [issue.id]: next }))
    setGeneratingIds((ids) => ids.filter((id) => id !== issue.id))
  }

  function openProposal(issue: Issue) {
    setOpenProposalId(issue.id)
    if (!proposals[issue.id] && !generatingIds.includes(issue.id)) void generateProposal(issue)
  }

  function toggleProposal(issue: Issue) {
    if (openProposalId === issue.id) setOpenProposalId(null)
    else openProposal(issue)
  }

  function regenerateProposal(issue: Issue) {
    setProposals((prev) => {
      const next = { ...prev }
      delete next[issue.id]
      return next
    })
    void generateProposal(issue)
  }

  function openDetails(issue: Issue, trigger: HTMLElement) {
    openerRef.current = trigger
    setDetail(issue)
    setDetailOpen(true)
  }

  function draftFromDetails(issue: Issue) {
    setDetailOpen(false)
    openProposal(issue)
    window.setTimeout(() => {
      document.getElementById(`proposal-${issue.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }, 380)
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
    if (multiMode && languages.length > 1) {
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
  }, [issues, sortBy, activeOnly, multiMode, languages])

  async function fetchIssues(opts: FetchOptions = {}) {
    const p = opts.page ?? 1
    const reset = opts.reset ?? p === 1
    const diff = opts.difficulty ?? difficulty
    const bounty = opts.bounty ?? bountyOnly
    const lang = opts.language ?? (multiMode ? languages.join(",") : language)
    lastRequestRef.current = { page: p, reset, difficulty: diff, bounty, language: lang }

    // Only the newest request is allowed to touch state.
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    if (reset) {
      setLoading(true)
      setLoadingMore(false)
      setError(null)
      setLoadMoreError(null)
      setSearchRun((n) => n + 1)
      mainRef.current?.scrollTo({ top: 0 })
    } else {
      setLoadingMore(true)
      setLoadMoreError(null)
    }

    try {
      const params = new URLSearchParams({ difficulty: diff, page: String(p), bounty: String(bounty), sort: sortBy })
      params.set("language", lang.toLowerCase())
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
    void fetchIssues({ page: 1, reset: true })
    setFiltersOpen(false)
  }
  function runTemplate(key: string) {
    setMultiMode(false)
    setLanguage(key)
    setLanguages([key])
    void fetchIssues({ page: 1, reset: true, language: key })
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
  const toolbarMode = view === "loading" ? "loading" : view === "list" || view === "empty" ? "results" : "other"

  const languageChanged = multiMode
    ? languages.length !== 1 || languages[0] !== DEFAULT_LANGUAGE
    : language !== DEFAULT_LANGUAGE
  const filterCount =
    (languageChanged ? 1 : 0) + (difficulty !== DEFAULT_DIFFICULTY ? 1 : 0) + (bountyOnly ? 1 : 0) + (activeOnly ? 1 : 0)

  const filterProps = {
    language, setLanguage: (v: string) => { setLanguage(v); resetForNewFilters() },
    languages, setLanguages: (v: string[]) => { setLanguages(v); resetForNewFilters() },
    multiMode, setMultiMode,
    difficulty, setDifficulty: (v: Difficulty) => { setDifficulty(v); resetForNewFilters() },
    bountyOnly, setBountyOnly: (v: boolean) => { setBountyOnly(v); resetForNewFilters() },
    activeOnly, setActiveOnly,
    loading, onSearch: runSearch,
    onReset: resetFilters,
    isDefault: filterCount === 0 && !multiMode,
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
              className="hunt-scroll min-w-0 flex-1 overflow-y-auto overflow-x-hidden"
            >
              <h1 className="sr-only lg:hidden">Hunt Issues</h1>

              {/* No toolbar before the first search: the hero carries its own Filters button, so nothing pushes it down. */}
              {view !== "templates" && (
                <ResultsToolbar
                  scrolled={scrolled}
                  busy={loading || loadingMore}
                  mode={toolbarMode}
                  count={count}
                  filterCount={filterCount}
                  difficulty={difficulty}
                  language={language}
                  languages={languages}
                  multiMode={multiMode}
                  bountyOnly={bountyOnly}
                  activeOnly={activeOnly}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                />
              )}

              {/* Loading */}
              {view === "loading" && (
                <div className="mx-auto w-full max-w-6xl space-y-4 sm:px-6 sm:py-6">
                  <SearchProgress key={searchRun} target={searchTarget} difficulty={difficulty} bounty={bountyOnly} />
                  <ul
                    aria-hidden="true"
                    className="divide-y divide-white/[0.05] overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border"
                  >
                    {Array.from({ length: 5 }, (_, i) => (
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
                    <RefreshCw className="h-4 w-4" strokeWidth={2} />
                    Try again
                  </Button>
                </StatePanel>
              )}

              {/* Starting points (before the first search) */}
              {view === "templates" && (
                <div className="mx-auto w-full max-w-5xl px-4 pb-14 pt-8 sm:px-6 sm:pt-12 lg:pt-14">
                  <div className="mb-8 sm:mb-10">
                    <h2 className="hunt-blur text-balance text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-[32px]">
                      What do you want to hunt today?
                    </h2>
                    <p
                      className="hunt-rise mt-2.5 max-w-xl text-[14.5px] leading-relaxed text-neutral-400 sm:text-[15px]"
                      style={cssVars({ "--d": "90ms" })}
                    >
                      Pick a starting point below, or set your language and difficulty in the filters and press Search.
                    </p>
                    <div className="hunt-rise mt-5 lg:hidden" style={cssVars({ "--d": "150ms" })}>
                      <FiltersButton count={filterCount} />
                    </div>
                  </div>

                  <SectionTitle>Starting points</SectionTitle>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
                    {TEMPLATES.map((t, i) => (
                      <TemplateCard key={t.key} t={t} index={i + 2} onRun={runTemplate} />
                    ))}
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
                  </StatePanel>
                ))}

              {/* Issue list */}
              {view === "list" && (
                <div className="mx-auto w-full max-w-6xl sm:px-6 sm:py-6">
                  <ul className="divide-y divide-white/[0.05] overflow-hidden border-y border-white/[0.07] bg-[#0d0d0d] sm:rounded-xl sm:border">
                    {sortedIssues.map((issue, i) => {
                      const proposal = proposals[issue.id]
                      const open = openProposalId === issue.id
                      const generating = generatingIds.includes(issue.id)
                      return (
                        <IssueRow
                          key={issue.id}
                          issue={issue}
                          index={i}
                          showLanguage={multiMode}
                          copied={copiedKey === `repo:${issue.id}`}
                          proposalOpen={open}
                          proposalGenerating={generating}
                          onOpenDetails={openDetails}
                          onCopyRepo={() => void flashCopied(`repo:${issue.id}`, `https://github.com/${repoName(issue.repository_url)}`)}
                          onToggleProposal={() => toggleProposal(issue)}
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
                              onRegenerate={() => regenerateProposal(issue)}
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
                          className="rounded font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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
          className={cn(
            "hunt-sheet flex flex-col gap-0 border-white/10 bg-[#0b0b0b] p-0",
            wide ? "hunt-filters-drawer" : "max-h-[88dvh] rounded-t-2xl"
          )}
          style={cssVars({ "--close-top": wide ? "8px" : "16px" })}
          onEscapeKeyDown={(e) => {
            // With the language menu open, the first Escape should only close that menu, not the whole drawer.
            const t = e.target
            if (t instanceof HTMLElement && t.closest(".language-select") && t.getAttribute("aria-expanded") === "true") e.preventDefault()
          }}
        >
          {!wide && <div aria-hidden="true" className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-neutral-700" />}
          <SheetHeader
            className={cn(
              "shrink-0 gap-0 px-5 pr-16 text-left",
              wide ? "flex h-14 justify-center border-b border-white/[0.06] py-0" : "pb-1 pt-3"
            )}
          >
            <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-neutral-100">
              <SlidersHorizontal className="h-4 w-4 text-neutral-400" strokeWidth={2} />
              Filters
            </SheetTitle>
            <SheetDescription className="sr-only">Choose a language, difficulty and options, then search for issues.</SheetDescription>
          </SheetHeader>
          <FiltersPanel variant="sheet" {...filterProps} />
        </SheetContent>
      </Sheet>

      <IssueDetailsDrawer
        issue={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDraftProposal={draftFromDetails}
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