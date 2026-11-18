"use client"

/**
 * Trending: ranked GitHub repositories with live search, filters, charts and a details panel.
 *
 * Lists come from /api/trending (the search box uses the same route in search mode) and a repository's details from
 * /api/trending/repo. Nothing on this page is invented and nothing on it uses AI. Stars, forks, issues and dates are
 * GitHub's. Every other figure (growth, activity, language share) is worked out from those and says how, where it is
 * shown. The README sections in the details panel are text read out of the README, with the heading they came from.
 *
 * The look is Hunt's instrument surface on quiet neutral tokens (see DESIGN.md, Trending). Colour is carried by data:
 * language and tool logos, and four tones that always mean the same thing.
 */

import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react"
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpRight,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock3,
  Code2,
  Copy,
  ExternalLink,
  GitFork,
  LayoutGrid,
  Link2,
  MessageSquare,
  PanelRight,
  RefreshCw,
  RotateCcw,
  Rows3,
  Scale,
  Search,
  SlidersHorizontal,
  Star,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react"
import Navbar from "@/components/ui/Navbar"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { useBookmarks } from "@/components/hooks/useBookmarks"
import { TtlCache } from "@/components/lib/discovery/cache"
import type { RepoWithBlurb } from "@/components/lib/repo-types"
import { brandLogo } from "@/components/lib/brand-logos"
import type { ReadmeInsight } from "@/components/lib/readme-insight"
import type { GithubRepo } from "@/components/lib/github"

// ─── Types ──────────────────────────────────────────────────────────────────
type Mode = "popularity" | "recent"
type WindowKey = "7" | "30" | "90"
type StarFloor = "" | "1000" | "5000" | "10000" | "50000"
type PushedKey = "" | "7" | "30" | "90"
type SortKey = "stars" | "pace" | "forks" | "issues" | "pushed" | "created" | "name"
type Dir = "asc" | "desc"
type View = "board" | "cards"
type TabKey = "overview" | "growth" | "issues" | "start"
type Tone = "amber" | "sky" | "green" | "rose"

// Everything the page remembers in its address bar. Only values that differ from the defaults are written.
interface Params {
  mode: Mode
  windowKey: WindowKey
  language: string
  stars: StarFloor
  pushed: PushedKey
  hideArchived: boolean
  sort: SortKey
  dir: Dir
  view: View
  q: string
  repo: string
  tab: TabKey
}

type ListFilters = Pick<Params, "mode" | "windowKey" | "language" | "stars" | "pushed" | "hideArchived">

// One repository with everything the board and the cards need already worked out, so they never repeat the maths.
interface Row {
  key: string
  repo: GithubRepo
  fullName: string
  owner: string
  name: string
  avatar: string
  description: string
  language: string | null
  topics: string[]
  stars: number
  forks: number
  issues: number
  ageDays: number | null
  // Average stars per day since the repository was created. A lifetime average, not a recent rate.
  pace: number | null
  createdAt: string | null
  pushedAt: string | null
  archived: boolean
  license: string | null
  url: string
}

interface FeedPage {
  repos: GithubRepo[]
  query: string
}

interface InsightIssue {
  number: number
  title: string
  url: string
  labels: { name: string; color: string }[]
  comments: number
  createdAt: string
  updatedAt: string
  author: string
}

// What /api/trending/repo answers (part=core).
interface Insight {
  repo: {
    fullName: string
    description: string | null
    homepage: string | null
    license: string | null
    defaultBranch: string
    createdAt: string
    pushedAt: string
    stars: number
    forks: number
    watchers: number
    openIssues: number
    archived: boolean
    isFork: boolean
    topics: string[]
    language: string | null
    sizeKb: number
    hasDiscussions: boolean
    owner: { login: string; avatarUrl: string; type: string }
  }
  languages: { name: string; bytes: number }[]
  readme: ReadmeInsight | null
  issues: { recent: InsightIssue[]; goodFirst: InsightIssue[] }
  contributors: { login: string; avatarUrl: string; contributions: number }[]
  release: { tag: string; name: string; publishedAt: string; url: string; prerelease: boolean } | null
  partial: string[]
}

interface StarPoint {
  t: number
  n: number
}
// What /api/trending/repo answers (part=history).
interface History {
  starHistory: { points: StarPoint[]; exact: boolean; limited: boolean; measuredTo: number } | null
  commitActivity: { pending: boolean; weeks: { t: number; total: number }[] } | null
  partial: string[]
}

// ─── Constants ──────────────────────────────────────────────────────────────
// Mirrors `PAGE_SIZE` in /api/trending: a page shorter than this is the last one.
const PAGE_SIZE = 12
// GitHub search only serves the first 1,000 results.
const MAX_PAGE = Math.floor(1000 / PAGE_SIZE)
const SEARCH_INPUT_ID = "trending-search-input"
const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

const MODES: ReadonlyArray<{ value: Mode; label: string; hint: string; icon: typeof Star }> = [
  { value: "popularity", label: "Popular", hint: "Most starred of all time", icon: Star },
  { value: "recent", label: "New", hint: "Created recently, by stars", icon: Clock3 },
]

// Mirrors NEW_WINDOWS in /api/trending. `minStars` keeps each window from filling up with empty repositories.
const WINDOWS: ReadonlyArray<{ value: WindowKey; label: string; short: string; days: number; minStars: number }> = [
  { value: "7", label: "7 days", short: "7d", days: 7, minStars: 10 },
  { value: "30", label: "30 days", short: "30d", days: 30, minStars: 30 },
  { value: "90", label: "90 days", short: "90d", days: 90, minStars: 100 },
]

const STAR_FLOORS: ReadonlyArray<{ value: StarFloor; label: string; text: string }> = [
  { value: "", label: "Auto", text: "Default stars" },
  { value: "1000", label: "1k", text: "At least 1k stars" },
  { value: "5000", label: "5k", text: "At least 5k stars" },
  { value: "10000", label: "10k", text: "At least 10k stars" },
  { value: "50000", label: "50k", text: "At least 50k stars" },
]

const PUSHED: ReadonlyArray<{ value: PushedKey; label: string; text: string }> = [
  { value: "", label: "Any time", text: "Any time" },
  { value: "7", label: "7 days", text: "Updated in 7 days" },
  { value: "30", label: "30 days", text: "Updated in 30 days" },
  { value: "90", label: "90 days", text: "Updated in 90 days" },
]

// GitHub's language names, most used first. The route accepts any GitHub language; these are the ones with a logo.
const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C++", "C#", "C", "PHP", "Ruby", "Swift",
  "Kotlin", "Dart", "Shell", "Lua", "Zig", "Scala", "Elixir", "Haskell", "Vue", "Svelte", "Jupyter Notebook", "Julia",
  "HTML", "CSS", "Dockerfile", "Objective-C", "PowerShell", "R", "Perl", "Clojure", "OCaml", "Nix", "Solidity", "Astro",
  "GDScript", "WebAssembly", "Nim", "Crystal", "Erlang", "Fortran", "Elm", "F#", "MDX", "Vim Script", "HCL", "CMake",
  "CoffeeScript", "D", "Racket", "Gleam",
] as const
// The same character set the route accepts, so a typed language can never carry a search qualifier.
const LANGUAGE_PATTERN = /^[A-Za-z0-9#+.\- ]{1,30}$/

const SORTS: ReadonlyArray<{ value: SortKey; label: string; hint: string; icon: typeof Star; column: string }> = [
  { value: "stars", label: "Stars", hint: "Total stars on GitHub", icon: Star, column: "Stars" },
  { value: "pace", label: "Growth", hint: "Stars gained per day since it was created", icon: TrendingUp, column: "Per day" },
  { value: "forks", label: "Forks", hint: "Copies other people made", icon: GitFork, column: "Forks" },
  { value: "issues", label: "Open issues", hint: "Open issues and pull requests", icon: CircleDot, column: "Issues" },
  { value: "pushed", label: "Last updated", hint: "Most recent push", icon: Clock3, column: "Updated" },
  { value: "created", label: "Created", hint: "Day the repository was created", icon: CalendarDays, column: "Age" },
  { value: "name", label: "Name", hint: "Alphabetical, owner first", icon: ArrowDownAZ, column: "Repository" },
]
const defaultDir = (sort: SortKey): Dir => (sort === "name" ? "asc" : "desc")

const DEFAULT_PARAMS: Params = {
  mode: "popularity",
  windowKey: "30",
  language: "",
  stars: "",
  pushed: "",
  hideArchived: false,
  sort: "stars",
  dir: "desc",
  view: "board",
  q: "",
  repo: "",
  tab: "overview",
}

const DEFAULT_FILTERS: ListFilters = { mode: DEFAULT_PARAMS.mode, windowKey: DEFAULT_PARAMS.windowKey, language: "", stars: "", pushed: "", hideArchived: false }

// Fallback colours for a language that has no logo. Languages with a logo use the logo's own colour.
const FALLBACK_COLORS: Record<string, string> = { Makefile: "#6fa83a", Assembly: "#b88a3c", Mojo: "#ff4c1f", Batchfile: "#7fc24b", TeX: "#5aa469", Roff: "#7aa3b8" }
const NO_LANGUAGE = "No language"
const langColor = (name: string | null | undefined) => (name ? (brandLogo(name)?.color ?? FALLBACK_COLORS[name] ?? "#8b8b8b") : "#52525b")

// Tones keep one meaning each on this page. Colour never carries a meaning alone: every use has a word or a number too.
const TONE_VAR: Record<Tone, string> = { amber: "var(--tr-amber)", sky: "var(--tr-sky)", green: "var(--tr-green)", rose: "var(--tr-rose)" }

// ─── Small helpers ──────────────────────────────────────────────────────────
const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ")
const cssVars = (vars: Record<string, string | number>) => vars as CSSProperties
const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
const groupedNumber = new Intl.NumberFormat("en")
const compact = (n: number) => compactNumber.format(n)
const grouped = (n: number) => groupedNumber.format(Math.round(n))
const plural = (n: number, one: string, many = `${one}s`) => `${grouped(n)} ${n === 1 ? one : many}`
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function timeAgo(iso: string | null | undefined, now: number): string {
  const t = iso ? Date.parse(iso) : Number.NaN
  if (!Number.isFinite(t)) return "unknown"
  const minutes = Math.max(0, Math.floor((now - t) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function formatAge(days: number | null): string {
  if (days === null) return "unknown"
  if (days < 1) return "today"
  if (days < 30) return `${Math.floor(days)}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  const years = days / 365
  return `${years < 10 ? years.toFixed(1).replace(/\.0$/, "") : Math.floor(years)}y`
}

function formatPace(pace: number | null): string {
  if (pace === null) return "n/a"
  if (pace < 10) return pace.toFixed(1)
  if (pace < 1000) return String(Math.round(pace))
  return compact(pace)
}

const formatDate = (t: number, withYear = true) =>
  new Date(t).toLocaleDateString("en", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) })

function formatBytes(kb: number): string {
  if (kb < 1024) return `${Math.round(kb)} KB`
  if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1).replace(/\.0$/, "")} MB`
  return `${(kb / 1024 / 1024).toFixed(1)} GB`
}

// Repo activity from the last push, in the same words and tones Hunt uses for repo health.
function activityOf(pushedAt: string | null | undefined, now: number): { label: string; tone: Tone } {
  const t = pushedAt ? Date.parse(pushedAt) : Number.NaN
  if (!Number.isFinite(t)) return { label: "Unknown", tone: "amber" }
  const days = (now - t) / DAY_MS
  if (days <= 30) return { label: "Active", tone: "green" }
  if (days <= 180) return { label: "Slowing", tone: "amber" }
  return { label: "Inactive", tone: "rose" }
}

// GitLense reads a repository, issue or pull request link from ?url=. Hunt hands issues over the same way.
const gitlenseHref = (url: string) => `/gitlense?url=${encodeURIComponent(url)}`

function toRow(repo: GithubRepo, now: number): Row {
  const raw = repo as Record<string, unknown>
  const fullName = repo.fullName || repo.full_name || ""
  const [owner = "", name = ""] = fullName.split("/")
  const created = repo.createdAt || repo.created_at || null
  const t = created ? Date.parse(created) : Number.NaN
  const ageDays = Number.isFinite(t) ? Math.max(0, (now - t) / DAY_MS) : null
  const stars = repo.stars ?? repo.stargazers_count ?? 0
  const license = raw.license && typeof raw.license === "object" ? (raw.license as Record<string, unknown>) : null
  const spdx = typeof license?.spdx_id === "string" && license.spdx_id !== "NOASSERTION" ? license.spdx_id : null
  return {
    key: String(repo.id ?? fullName),
    repo,
    fullName,
    owner,
    name,
    avatar: repo.owner?.avatar_url ?? repo.owner?.avatarUrl ?? "",
    description: (repo.description ?? "").trim(),
    language: repo.language || null,
    topics: repo.topics ?? [],
    stars,
    forks: repo.forks ?? repo.forks_count ?? 0,
    issues: repo.openIssues ?? repo.open_issues_count ?? 0,
    ageDays,
    pace: ageDays === null ? null : stars / Math.max(ageDays, 1),
    createdAt: created,
    pushedAt: repo.pushedAt || repo.pushed_at || null,
    archived: raw.archived === true,
    license: spdx ?? (typeof license?.name === "string" ? license.name : null),
    url: repo.htmlUrl || repo.html_url || `https://github.com/${fullName}`,
  }
}

const rowDomId = (key: string) => `tr-row-${key.replace(/[^a-zA-Z0-9_-]/g, "_")}`

const SORT_VALUE: Record<SortKey, (r: Row) => number | string | null> = {
  stars: r => r.stars,
  pace: r => r.pace,
  forks: r => r.forks,
  issues: r => r.issues,
  pushed: r => (r.pushedAt ? Date.parse(r.pushedAt) : null),
  created: r => (r.createdAt ? Date.parse(r.createdAt) : null),
  name: r => r.fullName.toLowerCase(),
}

// Stable. Rows with no value for the key go last in either direction; ties keep the order GitHub gave (stars).
function sortRows(rows: Row[], sort: SortKey, dir: Dir): Row[] {
  const value = SORT_VALUE[sort]
  const sign = dir === "asc" ? 1 : -1
  return rows
    .map((row, index) => ({ row, index, v: value(row) }))
    .sort((a, b) => {
      if (a.v === null || b.v === null) return a.v === b.v ? a.index - b.index : a.v === null ? 1 : -1
      const c = typeof a.v === "string" ? a.v.localeCompare(b.v as string) : (a.v as number) - (b.v as number)
      return c !== 0 ? c * sign : a.index - b.index
    })
    .map(x => x.row)
}

// "owner/name" from a typed or pasted value. Anything GitHub would not allow is refused.
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}\/[A-Za-z0-9._-]{1,100}$/

// ─── Styles ─────────────────────────────────────────────────────────────────
// One easing for the whole page, as in Hunt. Entrances run 250 to 900 ms. Nothing loops except the loading shimmer and
// spinner, and nothing animates width, height or position: bars, lines and reveals use transform and clip-path only.
// Under reduced motion every animation and transition stops, except the spinner, which turns slowly so loading stays visible.
// The class tr-root is also put on the menu and the panels, because they render in a portal outside the page.
const TR_CSS = `
.tr-root{--tr-bg:#0a0a0a;--tr-s1:#0f0f0f;--tr-s2:#141414;--tr-s3:#1b1b1b;--tr-line:rgba(255,255,255,.07);--tr-line2:rgba(255,255,255,.12);--tr-line3:rgba(255,255,255,.22);--tr-edge:rgba(255,255,255,.4);
  --tr-fg:#ededed;--tr-mut:#a3a3a3;--tr-dim:#8a8a8a;--tr-lime:#a8ff3e;--tr-lime-ink:#0b1204;
  --tr-amber:#fcd34d;--tr-sky:#7dd3fc;--tr-green:#6ee7b7;--tr-rose:#fda4af;--ease:cubic-bezier(.22,1,.36,1);
  --tr-rose-line:rgba(253,164,175,.28);--tr-rose-wash:rgba(253,164,175,.05);--tr-rose-fill:rgba(253,164,175,.1);--tr-wash:rgba(255,255,255,.02);--tr-body:#d4d4d4;--tr-other:#3f3f46;
  color:var(--tr-fg);font-feature-settings:"tnum" 0}
.tr-root :where(button:not(:disabled),[role=button],[role=tab],[role=option],[role=radio],[role=switch],summary,a[href]){cursor:pointer}
.tr-root :where(.tr-num,.tr-fig){font-variant-numeric:tabular-nums}
.tr-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.tr-f:focus-visible,.tr-btn:focus-visible,.tr-seg>button:focus-visible,.tr-tab:focus-visible,.tr-opt:focus-visible,.tr-link:focus-visible,.tr-pick:focus-visible,.tr-sw:focus-visible,.tr-chip-btn:focus-visible{outline:2px solid rgba(168,255,62,.85);outline-offset:2px}
.tr-scroll{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.16) transparent}
.tr-root ::selection{background:rgba(168,255,62,.28);color:#fff}
[data-slot=sheet-overlay]{background:rgba(0,0,0,.62)!important}

/* ── Background ──────────────────────────────────────────────────────────────
   Quiet structure, no colour: a neutral tone shift at the top, one dot field that fades out, and two hairline rails
   that frame the page with a registration cross where the header meets the content. */
.tr-frame{position:relative}
.tr-frame::before{content:"";position:absolute;inset:0;border-inline:1px solid var(--tr-line);pointer-events:none;
  -webkit-mask-image:linear-gradient(#000,#000 55%,transparent);mask-image:linear-gradient(#000,#000 55%,transparent)}
.tr-sky{position:absolute;inset:0 0 auto 0;height:560px;pointer-events:none;z-index:-1;background:linear-gradient(180deg,#131313 0,var(--tr-bg) 100%)}
.tr-sky::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.11) 1px,transparent 1.3px);background-size:24px 24px;
  -webkit-mask-image:radial-gradient(ellipse 70% 90% at 50% 0%,#000 20%,transparent 75%);mask-image:radial-gradient(ellipse 70% 90% at 50% 0%,#000 20%,transparent 75%)}
.tr-cross{position:absolute;width:13px;height:13px;pointer-events:none}
.tr-cross::before,.tr-cross::after{content:"";position:absolute;background:var(--tr-line3)}
.tr-cross::before{left:6px;top:0;width:1px;height:13px}.tr-cross::after{top:6px;left:0;height:1px;width:13px}
.tr-edge{position:absolute;inset:0 0 auto 0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)}
@media (max-width:1023px){.tr-frame::before,.tr-cross{display:none}}

/* ── Surfaces ─────────────────────────────────────────────────────────────── */
.tr-panel{background:var(--tr-s1);border:1px solid var(--tr-line);border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.03)}
.tr-raised{background:var(--tr-s2);border:1px solid var(--tr-line2);border-radius:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.tr-hair{border-color:var(--tr-line)}
.tr-title{font-size:13px;font-weight:600;color:var(--tr-fg);letter-spacing:-.005em}
.tr-label{font-size:12px;font-weight:500;color:var(--tr-dim)}
.tr-muted{color:var(--tr-mut)}.tr-dim{color:var(--tr-dim)}

/* ── Buttons, chips, controls ─────────────────────────────────────────────── */
.tr-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 12px;border-radius:8px;border:1px solid var(--tr-line2);background:var(--tr-s2);color:var(--tr-fg);
  font-size:13px;font-weight:500;line-height:1;white-space:nowrap;transition:background-color .15s var(--ease),border-color .15s var(--ease),color .15s var(--ease),transform .15s var(--ease)}
.tr-btn:hover{background:var(--tr-s3);border-color:var(--tr-line3)}
.tr-btn:active{transform:translateY(1px)}
.tr-btn:disabled,.tr-btn[aria-disabled=true]{opacity:.5;cursor:not-allowed;pointer-events:none}
.tr-btn svg{width:15px;height:15px;flex:none}
@media (min-width:1280px){.tr-xl-hide{display:none!important}}
.tr-btn--primary{background:var(--tr-lime);border-color:var(--tr-lime);color:var(--tr-lime-ink);font-weight:600}
.tr-btn--primary:hover{background:#bbff69;border-color:#bbff69}
.tr-btn--ghost{background:transparent;border-color:transparent;color:var(--tr-mut)}
.tr-btn--ghost:hover{background:var(--tr-s2);border-color:transparent;color:var(--tr-fg)}
.tr-btn--sm{height:30px;padding:0 10px;font-size:12.5px;border-radius:7px;gap:6px}
.tr-btn--icon{width:36px;padding:0}.tr-btn--icon.tr-btn--sm{width:30px}
.tr-btn[aria-pressed=true]{background:rgba(168,255,62,.1);border-color:rgba(168,255,62,.45);color:var(--tr-lime)}
@media (max-width:639px){.tr-btn{height:40px}.tr-btn--sm{height:36px}.tr-btn--icon{width:40px}.tr-btn--icon.tr-btn--sm{width:36px}}

.tr-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 8px;border-radius:6px;border:1px solid var(--tr-line);background:rgba(255,255,255,.03);color:var(--tr-mut);font-size:12px;line-height:1;white-space:nowrap}
.tr-chip--tone{color:var(--c);border-color:color-mix(in oklab,var(--c) 32%,transparent);background:color-mix(in oklab,var(--c) 9%,transparent)}
.tr-chip-btn{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 6px 0 9px;border-radius:7px;border:1px solid var(--tr-line2);background:var(--tr-s2);color:var(--tr-fg);font-size:12.5px;white-space:nowrap;transition:border-color .15s var(--ease),background-color .15s var(--ease)}
.tr-chip-btn:hover{border-color:var(--tr-line3);background:var(--tr-s3)}
.tr-chip-btn .x{display:grid;place-items:center;width:18px;height:18px;border-radius:5px;color:var(--tr-mut)}
.tr-chip-btn:hover .x{background:rgba(255,255,255,.08);color:var(--tr-fg)}
.tr-kbd{display:none;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 5px;border-radius:5px;border:1px solid var(--tr-line2);border-bottom-width:2px;background:var(--tr-s2);color:var(--tr-mut);font:500 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace}
@media (min-width:640px){.tr-kbd{display:inline-flex}}

.tr-seg{position:relative;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:3px;border-radius:9px;background:var(--tr-s1);border:1px solid var(--tr-line)}
.tr-seg>button{position:relative;z-index:1;height:30px;padding:0 10px;border-radius:6px;font-size:12.5px;font-weight:500;color:var(--tr-mut);white-space:nowrap;transition:color .2s var(--ease)}
.tr-seg--dense>button{padding:0 4px}
.tr-seg>button:hover{color:var(--tr-fg)}
.tr-seg>button[aria-checked=true],.tr-seg>button[aria-pressed=true]{color:var(--tr-fg)}
.tr-seg>button:disabled{opacity:.45;cursor:not-allowed}
.tr-seg>i{position:absolute;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / var(--n,2));border-radius:6px;background:var(--tr-s3);border:1px solid var(--tr-line2);transform:translateX(calc(var(--i,0) * 100%));transition:transform .3s var(--ease);pointer-events:none}
@media (max-width:639px){.tr-seg>button{height:36px}}

.tr-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 10px;border-radius:9px;border:1px solid var(--tr-line);background:var(--tr-s1);text-align:left;transition:border-color .15s var(--ease),background-color .15s var(--ease)}
.tr-opt:hover{border-color:var(--tr-line3);background:var(--tr-s2)}
.tr-opt[aria-checked=true]{border-color:rgba(168,255,62,.5);background:rgba(168,255,62,.06)}
.tr-opt:disabled{opacity:.45;cursor:not-allowed}
.tr-pick{display:flex;align-items:center;gap:8px;min-height:34px;padding:6px 8px;border-radius:8px;border:1px solid transparent;font-size:12.5px;color:var(--tr-mut);text-align:left;transition:background-color .15s var(--ease),color .15s var(--ease)}
.tr-pick:hover{background:var(--tr-s2);color:var(--tr-fg)}
.tr-pick[aria-checked=true]{background:rgba(168,255,62,.08);border-color:rgba(168,255,62,.35);color:var(--tr-fg)}
.tr-sw{position:relative;flex:none;width:34px;height:20px;border-radius:6px;border:1px solid var(--tr-line2);background:var(--tr-s3);transition:background-color .2s var(--ease),border-color .2s var(--ease)}
.tr-sw::after{content:"";position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:4px;background:var(--tr-mut);transition:transform .25s var(--ease),background-color .2s var(--ease)}
.tr-sw[aria-checked=true]{background:rgba(168,255,62,.18);border-color:rgba(168,255,62,.55)}
.tr-sw[aria-checked=true]::after{transform:translateX(14px);background:var(--tr-lime)}

.tr-input{width:100%;height:36px;border-radius:8px;border:1px solid var(--tr-edge);background:var(--tr-s2);color:var(--tr-fg);padding:0 10px 0 32px;font-size:13px;outline:none;transition:border-color .15s var(--ease)}
.tr-input::placeholder{color:var(--tr-dim)}
.tr-input:focus{border-color:rgba(168,255,62,.6)}

/* ── Search ───────────────────────────────────────────────────────────────── */
.tr-search{position:relative;display:flex;align-items:center;gap:12px;height:56px;padding:0 14px;border-radius:12px;background:var(--tr-s1);border:1px solid var(--tr-edge);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 12px 32px -16px rgba(0,0,0,.8);
  transition:border-color .2s var(--ease),box-shadow .2s var(--ease)}
.tr-search:hover{border-color:var(--tr-dim)}
.tr-search:focus-within{border-color:rgba(168,255,62,.65);box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 0 0 3px rgba(168,255,62,.1),0 12px 32px -16px rgba(0,0,0,.8)}
.tr-search input{flex:1;min-width:0;height:100%;background:transparent;border:0;outline:none;color:var(--tr-fg);font-size:16px}
.tr-search input::placeholder{color:var(--tr-dim)}
.tr-search input::-webkit-search-cancel-button{display:none}
.tr-pop{position:absolute;z-index:40;left:0;right:0;top:calc(100% + 8px);overflow:hidden;border-radius:12px;background:var(--tr-s2);border:1px solid var(--tr-line2);box-shadow:0 28px 60px -16px rgba(0,0,0,.85),inset 0 1px 0 rgba(255,255,255,.04);animation:tr-pop .22s var(--ease) both;transform-origin:top center}
.tr-sug{display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;text-align:left;border-top:1px solid var(--tr-line);transition:background-color .12s var(--ease)}
.tr-sug:first-child{border-top:0}
.tr-sug[aria-selected=true],.tr-sug:hover{background:var(--tr-s3)}
.tr-sug mark{background:transparent;color:var(--tr-fg);font-weight:600}
.tr-sug[aria-selected=true]{box-shadow:inset 2px 0 0 var(--tr-lime)}

/* ── Animation ────────────────────────────────────────────────────────────── */
@keyframes tr-rise{from{opacity:0;transform:translateY(8px)}}
@keyframes tr-fade{from{opacity:0}}
@keyframes tr-pop{from{opacity:0;transform:translateY(-4px) scale(.985)}}
@keyframes tr-wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes tr-grow{from{transform:scaleY(0)}}
@keyframes tr-sweep{from{transform:scaleX(0)}}
@keyframes tr-mark{from{opacity:0;transform:scale(.2)}}
@keyframes tr-shimmer{to{transform:translateX(100%)}}
@keyframes tr-flash{0%{background-color:rgba(168,255,62,.14)}100%{background-color:transparent}}
@keyframes tr-spin{to{transform:rotate(360deg)}}
.tr-spin{animation:tr-spin .8s linear infinite}
.tr-rise{animation:tr-rise .5s var(--ease) calc(min(var(--i,0),12) * 38ms) backwards}
.tr-fade{animation:tr-fade .4s var(--ease) both}
.tr-wipe{animation:tr-wipe 1s var(--ease) .1s backwards}
.tr-grow{transform-origin:bottom;animation:tr-grow .7s var(--ease) calc(var(--i,0) * 14ms + 120ms) backwards}
.tr-bar{transform-origin:left center;transform:scaleX(var(--w,0));animation:tr-sweep .8s var(--ease) calc(min(var(--i,0),12) * 38ms + 160ms) backwards}
.tr-markpop{animation:tr-mark .5s var(--ease) calc(var(--i,0) * 18ms + 200ms) backwards}
.tr-skel{position:relative;overflow:hidden;background:rgba(255,255,255,.06);border-radius:6px}
.tr-skel::after{content:"";position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);animation:tr-shimmer 1.4s infinite}

/* ── Board ──────────────────────────────────────────────────────────────────
   One grid, three layouts, chosen by the board's own width (not the screen's), because the filter rail takes 300px
   of a wide screen. Narrow: a stacked row. Medium (860px, the narrowest that leaves the name 200px): a table without
   issues and growth. Wide (980px): every column. */
.tr-board{container:tr-board/inline-size}
.tr-row{position:relative;display:grid;align-items:start;column-gap:12px;row-gap:6px;padding:14px 14px 14px 12px;border-top:1px solid var(--tr-line);
  grid-template-columns:28px minmax(0,1fr);grid-template-areas:"rank ident" ". desc" ". stars" ". meta" ". acts";transition:background-color .15s var(--ease),box-shadow .15s var(--ease),opacity .2s var(--ease)}
.tr-row:first-child{border-top-color:transparent}
.tr-row:hover,.tr-row[data-hot]{background:rgba(255,255,255,.028);box-shadow:inset 2px 0 0 var(--tr-lime)}
.tr-row[data-flash]{animation:tr-flash 1.3s var(--ease) both}
.tr-c-rank{grid-area:rank;padding-top:3px}.tr-c-ident{grid-area:ident;min-width:0}.tr-c-desc{grid-area:desc;min-width:0}
.tr-c-stars{grid-area:stars}.tr-c-meta{grid-area:meta;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}
.tr-c-acts{grid-area:acts;display:flex;gap:6px}
.tr-c-lang,.tr-c-pace,.tr-c-forks,.tr-c-issues,.tr-c-upd{display:none}
.tr-head{display:none}
.tr-ident-desc{display:none!important}
/* No single word alone on the last line of a paragraph or a heading. */
.tr-root :is(p,li,dd){text-wrap:pretty}
.tr-root :is(h1,h2,h3){text-wrap:balance}
/* From 480px the stars sit to the right of the name; below that they get their own line so the name is not cut short. */
@container tr-board (min-width:480px){
  .tr-row{grid-template-columns:28px minmax(0,1fr) auto;grid-template-areas:"rank ident stars" ". desc desc" ". meta meta" ". acts acts"}
  .tr-c-stars{text-align:right}
}
@container tr-board (min-width:860px){
  .tr-row,.tr-head{grid-template-columns:36px minmax(0,1fr) 124px 120px 64px 92px 104px;column-gap:16px}
  .tr-row{align-items:center;grid-template-areas:"rank ident lang stars forks upd acts"}
  .tr-c-desc,.tr-c-meta{display:none}
  .tr-c-lang,.tr-c-forks,.tr-c-upd{display:block}
  .tr-c-rank{padding-top:0}.tr-c-stars{text-align:left}.tr-c-acts{justify-content:flex-end}
  .tr-head{display:grid;position:sticky;top:64px;z-index:2;padding:0 14px 0 12px;height:40px;align-items:center;background:var(--tr-s1);border-bottom:1px solid var(--tr-line);border-radius:12px 12px 0 0}
  .tr-ident-desc{display:-webkit-box!important}
  .tr-act{width:30px;padding:0;background:transparent;border-color:transparent;color:var(--tr-mut)}
  .tr-act:hover{background:var(--tr-s3);border-color:transparent;color:var(--tr-fg)}
  .tr-act[aria-pressed=true]:hover{background:rgba(168,255,62,.16);border-color:rgba(168,255,62,.45);color:var(--tr-lime)}
  .tr-act-label{display:none}
}
@container tr-board (min-width:980px){
  .tr-row,.tr-head{grid-template-columns:32px minmax(0,1fr) 112px 112px 78px 64px 64px 88px 104px;column-gap:12px}
  .tr-row{grid-template-areas:"rank ident lang stars pace forks issues upd acts"}
  .tr-c-pace,.tr-c-issues{display:block}
}
.tr-head>*{grid-area:auto!important}
.tr-row,.tr-card{cursor:pointer}
.tr-row:last-child{border-radius:0 0 12px 12px}
/* While a new list loads, the old rows stay in place and dim, so the page does not jump. */
.tr-board[aria-busy=true] .tr-row,.tr-cards[aria-busy=true] .tr-card{opacity:.5}
.tr-sort{display:inline-flex;align-items:center;gap:4px;padding-block:11px;margin-block:-11px;font-size:12px;font-weight:500;color:var(--tr-dim);transition:color .15s var(--ease)}
.tr-sort:hover,.tr-sort[data-on]{color:var(--tr-fg)}
.tr-sort svg{width:12px;height:12px;opacity:0;transition:opacity .15s var(--ease)}
.tr-sort[data-on] svg,.tr-sort:hover svg{opacity:1}

/* ── Cards ──────────────────────────────────────────────────────────────────
   The same parts as a board row (rank, avatar and name, language, stars with its bar, growth, forks, updated),
   stacked. Hairline border, no shadow lift, no glow: only the border and the surface change on hover. */
.tr-card{position:relative;display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:12px;background:var(--tr-s1);border:1px solid var(--tr-line);box-shadow:inset 0 1px 0 rgba(255,255,255,.03);
  transition:border-color .2s var(--ease),background-color .2s var(--ease),transform .25s var(--ease),opacity .2s var(--ease)}
.tr-card:hover,.tr-card[data-hot]{border-color:var(--tr-line3);background:var(--tr-s2);transform:translateY(-2px)}
.tr-card[data-flash]{animation:tr-flash 1.3s var(--ease) both}
.tr-clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.tr-clamp3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.tr-meter{position:relative;height:3px;border-radius:2px;background:rgba(255,255,255,.07);overflow:hidden}
.tr-meter>i{position:absolute;inset:0;border-radius:2px;background:var(--tr-amber);transform-origin:left center;transform:scaleX(var(--w,0))}

/* ── Charts ───────────────────────────────────────────────────────────────── */
.tr-chart text{font-family:inherit;font-variant-numeric:tabular-nums}
.tr-grid{stroke:rgba(255,255,255,.07);stroke-width:1;shape-rendering:crispEdges}
.tr-axis{stroke:rgba(255,255,255,.18);stroke-width:1;shape-rendering:crispEdges}
.tr-tick{fill:var(--tr-dim);font-size:11px}
.tr-tip{position:absolute;z-index:5;pointer-events:none;min-width:170px;max-width:260px;padding:10px 12px;border-radius:10px;background:var(--tr-s2);border:1px solid var(--tr-line3);box-shadow:0 20px 40px -12px rgba(0,0,0,.8);
  font-size:12px;line-height:1.4;transition:transform .14s var(--ease),opacity .14s var(--ease);will-change:transform}
.tr-tip[data-off]{opacity:0}
.tr-dotbtn{position:absolute;width:20px;height:20px;transform:translate(-50%,-50%);display:grid;place-items:center;border-radius:6px}
.tr-dotbtn i{display:block;width:9px;height:9px;border-radius:2px;background:var(--c);transition:transform .2s var(--ease),box-shadow .2s var(--ease)}
.tr-dotbtn:hover i,.tr-dotbtn:focus-visible i,.tr-dotbtn[data-on] i{transform:scale(1.55);box-shadow:0 0 0 2px var(--tr-bg),0 0 0 3px var(--c)}
.tr-chart .tr-grow{transform-box:fill-box}
.tr-scrub{touch-action:pan-y;outline:none;border-radius:8px}
.tr-scrub:focus-visible{outline:2px solid rgba(168,255,62,.85);outline-offset:3px}

/* ── Details panel ─────────────────────────────────────────────────────────── */
.tr-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
.tr-tabs::-webkit-scrollbar{display:none}
.tr-tab{position:relative;flex:none;height:44px;padding:0 14px;font-size:13px;font-weight:500;color:var(--tr-mut);transition:color .15s var(--ease)}
.tr-tab:hover{color:var(--tr-fg)}
.tr-tab[aria-selected=true]{color:var(--tr-fg)}
.tr-tab::after{content:"";position:absolute;left:12px;right:12px;bottom:-1px;height:2px;background:var(--tr-lime);transform:scaleX(0);transition:transform .3s var(--ease)}
.tr-tab[aria-selected=true]::after{transform:scaleX(1)}
.tr-prose{font-size:14px;line-height:1.65;color:#d4d4d4}
.tr-cmd{position:relative;display:block;overflow-x:auto;padding:10px 44px 10px 12px;border-radius:8px;background:var(--tr-bg);border:1px solid var(--tr-line);font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#d4d4d4;white-space:pre}
.tr-link{padding-block:7px;margin-block:-7px;color:var(--tr-fg);text-decoration:underline;text-decoration-color:rgba(255,255,255,.28);text-underline-offset:3px;transition:text-decoration-color .15s var(--ease)}
.tr-link:hover{text-decoration-color:var(--tr-lime)}
.tr-issue{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 12px;padding:12px 14px;border-top:1px solid var(--tr-line);transition:background-color .15s var(--ease)}
.tr-issue:first-child{border-top:0}
.tr-issue:hover{background:rgba(255,255,255,.025)}

@media (prefers-reduced-motion:reduce){
  .tr-root *,.tr-root *::before,.tr-root *::after{animation:none!important;transition:none!important}
  .tr-skel::after{display:none}
  .tr-pop,.tr-sheet,.tr-sheet *{animation:none!important;transition:none!important}
  /* Not scoped to .tr-root: the spinner also turns inside the portal. */
  .tr-spin{animation:tr-spin 3s linear infinite!important}
}
`

// ─── Hooks ──────────────────────────────────────────────────────────────────
const subscribeToNothing = () => () => {}

// false during SSR and hydration, true afterwards. Gates anything that touches `document`.
function useHasMounted() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false)
}

function useReducedMotion() {
  return useSyncExternalStore(
    notify => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      mq.addEventListener("change", notify)
      return () => mq.removeEventListener("change", notify)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  )
}

// false on the server and during hydration, then the real answer.
function useMediaQuery(query: string) {
  return useSyncExternalStore(
    notify => {
      const mq = window.matchMedia(query)
      mq.addEventListener("change", notify)
      return () => mq.removeEventListener("change", notify)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

function useScrolledPast(threshold: number) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold)
    const id = window.setTimeout(onScroll, 0)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.clearTimeout(id)
      window.removeEventListener("scroll", onScroll)
    }
  }, [threshold])
  return past
}

// Eases from whatever is on screen to `target`, so a number that changes (more repositories loaded) glides to its
// new value instead of starting again from zero. Under reduced motion it just returns the target.
function useCountUp(target: number, durationMs = 900) {
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    if (reduce) return
    const from = fromRef.current
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const next = from + (target - from) * (1 - Math.pow(1 - t, 4))
      fromRef.current = next
      setValue(next)
      if (t < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [target, reduce, durationMs])
  return reduce ? target : value
}

// The element's width, kept current. The element must always be rendered, or the observer never attaches.
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(entries => setWidth(Math.round(entries[0]?.contentRect.width ?? 0)))
    observer.observe(el)
    const id = window.setTimeout(() => setWidth(Math.round(el.getBoundingClientRect().width)), 0)
    return () => {
      window.clearTimeout(id)
      observer.disconnect()
    }
  }, [])
  return [ref, width] as const
}

// Arrow-key movement inside a group of controls marked data-roving. Arrows move focus; Enter or Space chooses.
function rovingKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
  const next = new Set(["ArrowDown", "ArrowRight"])
  const prev = new Set(["ArrowUp", "ArrowLeft"])
  if (!next.has(e.key) && !prev.has(e.key) && e.key !== "Home" && e.key !== "End") return
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-roving]:not(:disabled)"))
  if (items.length === 0) return
  const at = items.indexOf(document.activeElement as HTMLElement)
  let to = at
  if (e.key === "Home") to = 0
  else if (e.key === "End") to = items.length - 1
  else if (next.has(e.key)) to = (at + 1) % items.length
  else to = at <= 0 ? items.length - 1 : at - 1
  e.preventDefault()
  items[to]?.focus()
}

// ─── Address-bar state ──────────────────────────────────────────────────────
// The filters live in the URL, so a link shares exactly what you see and a reload keeps it. The URL is the single
// source of truth: reading goes through useSyncExternalStore (the server snapshot is the defaults, so hydration
// matches), writing goes through history.replaceState. Only values that differ from the defaults are written, and
// everything read back is checked against the lists above.
const URL_EVENT = "trending:url"

function subscribeUrl(notify: () => void) {
  window.addEventListener("popstate", notify)
  window.addEventListener(URL_EVENT, notify)
  return () => {
    window.removeEventListener("popstate", notify)
    window.removeEventListener(URL_EVENT, notify)
  }
}
const readSearch = () => window.location.search
const readSearchOnServer = () => ""

function parseParams(search: string): Params {
  const p = new URLSearchParams(search)
  const mode: Mode = p.get("list") === "new" ? "recent" : "popularity"
  const sort = SORTS.find(s => s.value === p.get("sort"))?.value ?? DEFAULT_PARAMS.sort
  const dir = p.get("dir")
  const language = (p.get("lang") ?? "").trim()
  const q = (p.get("q") ?? "").trim().slice(0, 100)
  const repo = p.get("repo") ?? ""
  return {
    mode,
    // The window belongs to "New" only. For "Popular" it is always the default, so nothing invisible can count as a filter.
    windowKey: mode === "recent" ? (WINDOWS.find(w => w.value === p.get("window"))?.value ?? DEFAULT_PARAMS.windowKey) : DEFAULT_PARAMS.windowKey,
    language: LANGUAGE_PATTERN.test(language) ? language : "",
    stars: STAR_FLOORS.find(s => s.value !== "" && s.value === p.get("stars"))?.value ?? "",
    pushed: PUSHED.find(s => s.value !== "" && s.value === p.get("pushed"))?.value ?? "",
    hideArchived: p.get("archived") === "hide",
    sort,
    dir: dir === "asc" || dir === "desc" ? dir : defaultDir(sort),
    view: p.get("view") === "cards" ? "cards" : "board",
    q: q.length >= 2 ? q : "",
    repo: REPO_PATTERN.test(repo) ? repo : "",
    tab: (["growth", "issues", "start"] as const).find(t => t === p.get("tab")) ?? "overview",
  }
}

function buildSearch(p: Params): string {
  const q = new URLSearchParams()
  if (p.mode === "recent") q.set("list", "new")
  if (p.mode === "recent" && p.windowKey !== DEFAULT_PARAMS.windowKey) q.set("window", p.windowKey)
  if (p.language) q.set("lang", p.language)
  if (p.stars) q.set("stars", p.stars)
  if (p.pushed) q.set("pushed", p.pushed)
  if (p.hideArchived) q.set("archived", "hide")
  if (p.sort !== DEFAULT_PARAMS.sort) q.set("sort", p.sort)
  if (p.dir !== defaultDir(p.sort)) q.set("dir", p.dir)
  if (p.view !== DEFAULT_PARAMS.view) q.set("view", p.view)
  if (p.q) q.set("q", p.q)
  if (p.repo) q.set("repo", p.repo)
  if (p.repo && p.tab !== DEFAULT_PARAMS.tab) q.set("tab", p.tab)
  const text = q.toString()
  return text ? `?${text}` : ""
}

function useTrendingParams() {
  const search = useSyncExternalStore(subscribeUrl, readSearch, readSearchOnServer)
  const params = useMemo(() => parseParams(search), [search])
  const update = useCallback((patch: Partial<Params>) => {
    const next = { ...parseParams(window.location.search), ...patch }
    const href = `${window.location.pathname}${buildSearch(next)}${window.location.hash}`
    window.history.replaceState(window.history.state, "", href)
    window.dispatchEvent(new Event(URL_EVENT))
  }, [])
  return [params, update] as const
}

// ─── Talking to the routes ──────────────────────────────────────────────────
// A failed request, with what the page needs to explain it: the server's readable message, its machine code
// (needs_github_connect) and, for a rate limit, how many seconds GitHub asked us to wait.
class FeedError extends Error {
  code?: string
  status?: number
  retryAfter?: number
  constructor(message: string, extra: { code?: string; status?: number; retryAfter?: number } = {}) {
    super(message)
    this.name = "FeedError"
    this.code = extra.code
    this.status = extra.status
    this.retryAfter = extra.retryAfter
  }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    throw new FeedError("Can't reach the server. Check your connection and try again.")
  }
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    const body = (data ?? {}) as { error?: unknown; code?: unknown }
    throw new FeedError(typeof body.error === "string" && body.error ? body.error : "Something went wrong. Please try again.", {
      code: typeof body.code === "string" ? body.code : undefined,
      status: res.status,
      retryAfter: Number.parseInt(res.headers.get("retry-after") ?? "", 10) || undefined,
    })
  }
  return data as T
}

// ─── The list ───────────────────────────────────────────────────────────────
// One hook for both lists: the trending list, and the results of a committed search. Both page the same way.
const feedCache = new TtlCache<FeedPage>(5 * 60 * 1000)

function listParams(f: ListFilters, q: string, page: number) {
  const p = new URLSearchParams({ page: String(page) })
  if (q) {
    // Search looks at every public repository. Only the language filter narrows it.
    p.set("mode", "search")
    p.set("q", q)
    if (f.language) p.set("language", f.language)
    return p
  }
  p.set("mode", f.mode)
  if (f.mode === "recent") p.set("window", f.windowKey)
  if (f.language) p.set("language", f.language)
  if (f.stars) p.set("stars", f.stars)
  if (f.pushed) p.set("pushed", f.pushed)
  if (f.hideArchived) p.set("archived", "hide")
  return p
}
const listKey = (f: ListFilters, q: string, page: number) =>
  q ? `s|${q}|${f.language}|${page}` : [f.mode, f.mode === "recent" ? f.windowKey : "-", f.language, f.stars, f.pushed, f.hideArchived ? 1 : 0, page].join("|")

const NO_REPOS: GithubRepo[] = []

function useRepoList({ enabled, filters, q }: { enabled: boolean; filters: ListFilters; q: string }) {
  // `appliedQ` is the search the rows belong to. Rows of another search (or of the plain list) are never handed out,
  // so they cannot sit under a "Results for ..." heading while the new answer loads.
  const [state, setState] = useState<{ repos: GithubRepo[]; page: number; hasMore: boolean; appliedKey: string; appliedQ: string }>({ repos: [], page: 0, hasMore: true, appliedKey: "", appliedQ: "" })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<FeedError | null>(null)
  const requestRef = useRef(0)
  const { mode, windowKey, language, stars, pushed, hideArchived } = filters

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      // Only the newest request may touch state, so a slow answer for the previous filter can't overwrite the list.
      const requestId = ++requestRef.current
      const f: ListFilters = { mode, windowKey, language, stars, pushed, hideArchived }
      const key = listKey(f, q, page)
      const show = (data: FeedPage) =>
        setState(prev => ({
          ...prev,
          repos: append ? [...prev.repos, ...data.repos] : data.repos,
          // The page advances only once it has arrived, so retrying a failed "Load more" asks for the same page.
          page,
          hasMore: data.repos.length >= PAGE_SIZE && page < MAX_PAGE,
        }))

      const cached = feedCache.get(key)
      if (cached) {
        setError(null)
        setLoadingMore(false)
        setLoading(false)
        show(cached)
        return
      }
      if (append) setLoadingMore(true)
      else {
        setLoadingMore(false)
        setLoading(true)
      }
      setError(null)
      try {
        const data = await getJson<{ repos?: unknown; query?: unknown }>(`/api/trending?${listParams(f, q, page)}`)
        const payload: FeedPage = { repos: Array.isArray(data.repos) ? (data.repos as GithubRepo[]) : [], query: typeof data.query === "string" ? data.query : "" }
        // Cached even when a newer request has taken over: the answer is still right for its own filters and page.
        if (payload.repos.length > 0) feedCache.set(key, payload)
        if (requestId !== requestRef.current) return
        show(payload)
      } catch (err) {
        if (requestId !== requestRef.current) return
        setError(err instanceof FeedError ? err : new FeedError("Failed to load repositories."))
      } finally {
        if (requestId === requestRef.current) {
          if (append) setLoadingMore(false)
          else setLoading(false)
        }
      }
    },
    [mode, windowKey, language, stars, pushed, hideArchived, q]
  )

  // Runs when the list changes. A cached list shows straight away; a request waits a moment so quick clicks
  // through the filters send one request, not three.
  const firstKey = listKey({ mode, windowKey, language, stars, pushed, hideArchived }, q, 1)
  useEffect(() => {
    if (!enabled) return
    const id = window.setTimeout(
      () => {
        setState({ repos: [], page: 0, hasMore: true, appliedKey: firstKey, appliedQ: q })
        void fetchPage(1, false)
      },
      feedCache.has(firstKey) ? 0 : 120
    )
    return () => window.clearTimeout(id)
  }, [enabled, fetchPage, firstKey, q])

  const loadMore = useCallback(() => void fetchPage(state.page + 1, true), [fetchPage, state.page])
  const reload = useCallback(() => {
    setState({ repos: [], page: 0, hasMore: true, appliedKey: firstKey, appliedQ: q })
    void fetchPage(1, false)
  }, [fetchPage, firstKey, q])

  const sameSearch = state.appliedQ === q
  return {
    repos: sameSearch ? state.repos : NO_REPOS,
    page: sameSearch ? state.page : 0,
    hasMore: sameSearch ? state.hasMore : true,
    // Also true for the few milliseconds between a filter changing and its request starting.
    loading: loading || (enabled && state.appliedKey !== firstKey),
    loadingMore,
    error,
    loadMore,
    reload,
  }
}

// ─── Suggestions while typing ───────────────────────────────────────────────
// From two characters on, a short list of matches is fetched after a short pause. The previous matches stay on
// screen until the new ones arrive, so the list does not blink while someone types.
const suggestCache = new TtlCache<GithubRepo[]>(60 * 1000)

function useSuggestions(text: string, language: string) {
  const q = text.trim()
  const active = q.length >= 2
  const key = `${q.toLowerCase()}|${language}`
  const [state, setState] = useState<{ key: string; items: GithubRepo[]; error: string }>({ key: "", items: [], error: "" })

  useEffect(() => {
    if (!active) return
    const cached = suggestCache.get(key)
    if (cached) {
      const id = window.setTimeout(() => setState({ key, items: cached, error: "" }), 0)
      return () => window.clearTimeout(id)
    }
    const controller = new AbortController()
    const id = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ mode: "search", q, size: "6" })
        if (language) params.set("language", language)
        const data = await getJson<{ repos?: GithubRepo[] }>(`/api/trending?${params}`, controller.signal)
        const items = Array.isArray(data.repos) ? data.repos : []
        suggestCache.set(key, items)
        setState({ key, items, error: "" })
      } catch (err) {
        if (controller.signal.aborted) return
        setState({ key, items: [], error: err instanceof Error ? err.message : "Search failed." })
      }
    }, 150)
    return () => {
      window.clearTimeout(id)
      controller.abort()
    }
  }, [active, key, q, language])

  return {
    active,
    items: active ? state.items : [],
    loading: active && state.key !== key,
    error: active && state.key === key ? state.error : "",
    retry: () => {
      suggestCache.clear()
      setState({ key: "", items: [], error: "" })
    },
  }
}

// ─── A repository's details ─────────────────────────────────────────────────
// Two calls: `core` (facts, README, languages, issues) and `history` (stars and commits over time). History is
// only fetched when its tab or chart is shown, because GitHub counts stars page by page.
const insightCache = new TtlCache<Insight>(10 * 60 * 1000)
const historyCache = new TtlCache<History>(10 * 60 * 1000)

function useRepoPart<T extends { partial: string[] }>(cache: TtlCache<T>, part: "core" | "history", fullName: string, enabled: boolean) {
  const [state, setState] = useState<{ key: string; data: T | null; error: FeedError | null }>({ key: "", data: null, error: null })
  const [nonce, setNonce] = useState(0)
  const key = `${part}:${fullName}:${nonce}`
  const valid = enabled && REPO_PATTERN.test(fullName)

  useEffect(() => {
    if (!valid) return
    const cached = nonce === 0 ? cache.get(`${part}:${fullName}`) : undefined
    if (cached) {
      const id = window.setTimeout(() => setState({ key, data: cached, error: null }), 0)
      return () => window.clearTimeout(id)
    }
    const controller = new AbortController()
    const [owner, repo] = fullName.split("/")
    getJson<T>(`/api/trending/repo?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&part=${part}`, controller.signal)
      .then(data => {
        // Stats GitHub is still computing are not remembered, so "check again" really asks again.
        const pending = (data as { commitActivity?: { pending?: boolean } | null }).commitActivity?.pending === true
        if (!pending) cache.set(`${part}:${fullName}`, data)
        setState({ key, data, error: null })
      })
      .catch(err => {
        if (controller.signal.aborted) return
        setState({ key, data: null, error: err instanceof FeedError ? err : new FeedError("Failed to load this repository.") })
      })
    return () => controller.abort()
  }, [valid, fullName, key, part, nonce, cache])

  const current = state.key === key
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: valid && !current,
    reload: useCallback(() => setNonce(n => n + 1), []),
  }
}

// ─── Small parts ────────────────────────────────────────────────────────────

// The language's own logo, drawn from inline paths (components/lib/brand-logos.ts). A language without a logo gets its
// first letters in a small tile, and "no language" a dashed square, so a row never looks broken.
function LangLogo({ name, size = 16, className }: { name: string | null | undefined; size?: number; className?: string }) {
  const logo = brandLogo(name)
  if (!name) {
    return <span aria-hidden="true" className={cx("inline-block shrink-0 rounded-[4px] border border-dashed border-[var(--tr-line3)]", className)} style={{ width: size, height: size }} />
  }
  if (!logo) {
    return (
      <span
        aria-hidden="true"
        className={cx("grid shrink-0 place-items-center rounded-[4px] bg-[var(--tr-s3)] font-semibold text-[var(--tr-mut)]", className)}
        style={{ width: size, height: size, fontSize: Math.max(8, size * 0.5) }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    )
  }
  return (
    <svg viewBox={`0 0 ${logo.vb} ${logo.vb}`} width={size} height={size} fill={logo.color} aria-hidden="true" focusable="false" className={cx("shrink-0", className)}>
      <path d={logo.d} fillRule={logo.eo ? "evenodd" : undefined} />
    </svg>
  )
}

// `eager` is for avatars in the first screenful, which should not wait for the lazy-load observer.
function Avatar({ src, name, size = 32, eager = false }: { src: string; name: string; size?: number; eager?: boolean }) {
  const [failed, setFailed] = useState(false)
  const letter = (name.replace(/[^A-Za-z0-9]/g, "")[0] ?? "?").toUpperCase()
  if (!src || failed) {
    return (
      <span aria-hidden="true" className="grid shrink-0 place-items-center rounded-[7px] bg-[var(--tr-s3)] font-semibold text-[var(--tr-mut)]" style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {letter}
      </span>
    )
  }
  // GitHub resizes avatars on request; twice the shown size keeps them sharp on dense screens.
  const sized = `${src}${src.includes("?") ? "&" : "?"}s=${size * 2}`
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={sized} alt="" width={size} height={size} loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} className="shrink-0 rounded-[7px] bg-[var(--tr-s3)] object-cover" style={{ width: size, height: size }} />
  )
}

function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" className={cx("tr-spin shrink-0", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".22" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function Skel({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cx("tr-skel", className)} style={style} />
}

// A segmented control with a sliding highlight (it moves with transform, never width). Arrow keys move focus,
// Enter or Space chooses, because every choice sends a request.
function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
}: {
  value: T
  options: ReadonlyArray<{ value: T; label: ReactNode; title?: string }>
  onChange: (value: T) => void
  label: string
  disabled?: boolean
  className?: string
}) {
  const index = Math.max(0, options.findIndex(o => o.value === value))
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={rovingKeyDown} className={cx("tr-seg", className)} style={cssVars({ "--n": options.length, "--i": index })}>
      <i aria-hidden="true" />
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} tabIndex={o.value === value ? 0 : -1} data-roving="" disabled={disabled} title={o.title} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="tr-sw disabled:opacity-45" />
}

function CopyButton({ text, label = "Copy", className, size = "sm" }: { text: string; label?: string; className?: string; size?: "sm" | "md" }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const id = window.setTimeout(() => setDone(false), 1600)
    return () => window.clearTimeout(id)
  }, [done])
  return (
    <button
      type="button"
      className={cx("tr-btn tr-btn--icon", size === "sm" && "tr-btn--ghost tr-btn--sm", className)}
      aria-label={done ? "Copied" : label}
      title={done ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
        } catch {
          // The browser blocked clipboard access; the text stays selectable on screen.
        }
      }}
    >
      {done ? <Check className="text-[var(--tr-lime)]" aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {done ? "Copied" : ""}
      </span>
    </button>
  )
}

// ─── Figures shared by the board and the cards ──────────────────────────────
function RepoName({ owner, name, className }: { owner: string; name: string; className?: string }) {
  return (
    <span className={cx("block min-w-0 truncate text-[14.5px] leading-tight", className)}>
      <span className="text-[var(--tr-dim)]">{owner}/</span>
      <span className="font-semibold text-[var(--tr-fg)]">{name}</span>
    </span>
  )
}

function LangTag({ name }: { name: string | null }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-[12.5px] text-[var(--tr-mut)]">
      <LangLogo name={name} size={16} />
      <span className="truncate">{name ?? NO_LANGUAGE}</span>
    </span>
  )
}

// Stars, with a bar showing the share of the most-starred repository in view. The number is GitHub's.
function StarsFig({ stars, max, index }: { stars: number; max: number; index: number }) {
  return (
    <div className="min-w-0" title={plural(stars, "star")}>
      <div className="tr-num flex items-center gap-1.5 text-[14px] font-semibold text-[var(--tr-fg)]">
        <Star className="size-3.5 shrink-0 fill-[var(--tr-amber)] text-[var(--tr-amber)]" aria-hidden="true" />
        <span>{compact(stars)}</span>
        <span className="sr-only"> stars</span>
      </div>
      <div className="tr-meter mt-1.5" aria-hidden="true">
        <i className="tr-bar" style={cssVars({ "--w": max > 0 ? clamp(stars / max, 0.02, 1) : 0, "--i": index })} />
      </div>
    </div>
  )
}

function PaceFig({ pace }: { pace: number | null }) {
  return (
    <span className="tr-num text-[13px] text-[var(--tr-fg)]" title="Stars per day, averaged since the repository was created">
      {pace === null ? "n/a" : `+${formatPace(pace)}`}
      {pace === null ? null : <span className="text-[12px] text-[var(--tr-dim)]">/day</span>}
    </span>
  )
}

function ActivityTag({ pushedAt, now, withAge = true }: { pushedAt: string | null; now: number; withAge?: boolean }) {
  const a = activityOf(pushedAt, now)
  return (
    <span className="inline-flex min-w-0 flex-col" title={pushedAt ? `Last push ${formatDate(Date.parse(pushedAt))}` : "Last push unknown"}>
      {withAge ? <span className="tr-num text-[12.5px] text-[var(--tr-fg)]">{timeAgo(pushedAt, now)}</span> : null}
      <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: TONE_VAR[a.tone] }}>
        <i aria-hidden="true" className="inline-block size-1.5 rounded-[2px]" style={{ background: TONE_VAR[a.tone] }} />
        {a.label}
      </span>
    </span>
  )
}

function NewTag() {
  return (
    <span className="tr-chip tr-chip--tone" style={cssVars({ "--c": "var(--tr-sky)" })}>
      New
    </span>
  )
}

// ─── Page states ────────────────────────────────────────────────────────────
interface FailureInfo {
  message: string
  code?: string
  status?: number
  retryAfter?: number
}

// Every failure says what happened in plain words. A rate limit counts down to when the button works again.
function ErrorBox({ error, onRetry, title, compactMode }: { error: FailureInfo; onRetry?: () => void; title?: string; compactMode?: boolean }) {
  const limited = error.status === 429
  const [left, setLeft] = useState(limited ? (error.retryAfter ?? 0) : 0)
  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft(seconds => seconds - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])
  const connect = error.code === "needs_github_connect"
  const heading = title ?? (connect ? "Connect GitHub to continue" : limited ? "GitHub is limiting requests" : "Couldn’t load this")
  return (
    <div role="alert" className={cx("rounded-xl border border-[var(--tr-rose-line)] bg-[var(--tr-rose-wash)] text-center", compactMode ? "px-5 py-8" : "px-6 py-14")}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg border border-[var(--tr-rose-line)] bg-[var(--tr-rose-fill)] text-[var(--tr-rose)]">
          <TriangleAlert className="size-4" aria-hidden="true" />
        </span>
        <h2 className="text-[15px] font-semibold text-[var(--tr-rose)]">{heading}</h2>
        <p className="text-[13.5px] leading-relaxed text-[var(--tr-fg)]">{error.message}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry} disabled={left > 0} className="tr-btn mt-1">
            <RefreshCw aria-hidden="true" /> {left > 0 ? `Try again in ${left}s` : "Try again"}
          </button>
        ) : null}
      </div>
    </div>
  )
}

function Empty({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="tr-panel px-6 py-14 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg border border-[var(--tr-line2)] bg-[var(--tr-s2)] text-[var(--tr-mut)]">{icon}</span>
        <h2 className="text-[15px] font-semibold text-[var(--tr-fg)]">{title}</h2>
        {children ? <p className="text-[13.5px] leading-relaxed text-[var(--tr-mut)]">{children}</p> : null}
        {action}
      </div>
    </div>
  )
}

function BackToTop({ visible }: { visible: boolean }) {
  return (
    <button
      type="button"
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}
      className={cx("tr-btn tr-btn--icon fixed bottom-5 right-5 z-30 transition-[opacity,transform] duration-300", visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")}
    >
      <ArrowUp aria-hidden="true" />
    </button>
  )
}

// ─── Hero and search ────────────────────────────────────────────────────────
// Matches in a suggestion are set in heavier type, so it is clear why it is listed.
function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = query
    .split(/\s+/)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(t => t.length > 0)
  if (tokens.length === 0) return <>{text}</>
  const parts = text.split(new RegExp(`(${tokens.join("|")})`, "ig"))
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part}</span>))}
    </>
  )
}

// A combobox: type two characters and matching repositories appear under the box while you keep typing (nothing waits
// for the full query). Arrow keys move through them, Enter opens the highlighted one, or runs the full search when
// none is highlighted. The full search replaces the board and pages with Load more, like the trending lists.
function SearchBox({
  committed,
  language,
  onCommit,
  onOpenRepo,
}: {
  committed: string
  language: string
  onCommit: (q: string) => void
  onOpenRepo: (fullName: string) => void
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [text, setText] = useState(committed)
  const [lastCommitted, setLastCommitted] = useState(committed)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  // The box follows the address bar: "Back to trending" or a shared link changes the text here too.
  if (committed !== lastCommitted) {
    setLastCommitted(committed)
    setText(committed)
  }

  const suggest = useSuggestions(text, language)
  const q = text.trim()
  const show = open && suggest.active
  const items = suggest.items.slice(0, 6)
  const rows = items.map(r => toRow(r, 0))
  // Options: the repositories, then "search all". The footer is always last.
  const count = rows.length + 1
  const footerIndex = rows.length
  const optionId = (i: number) => `${listId}-o${i}`

  const commit = () => {
    if (q.length >= 2) {
      onCommit(q)
      setOpen(false)
      setActive(-1)
    }
  }
  const pick = (fullName: string) => {
    setOpen(false)
    setActive(-1)
    onOpenRepo(fullName)
  }
  const clear = () => {
    setText("")
    setActive(-1)
    setOpen(false)
    if (committed) onCommit("")
    inputRef.current?.focus()
  }

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!suggest.active) return
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setActive(a => (e.key === "ArrowDown" ? (a + 1) % count : a <= 0 ? count - 1 : a - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (show && active >= 0 && active < rows.length) pick(rows[active].fullName)
      else commit()
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault()
        setOpen(false)
        setActive(-1)
      } else if (text) {
        e.preventDefault()
        clear()
      }
    }
  }

  return (
    <div
      className="relative mx-auto w-full max-w-2xl"
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <div className="tr-search">
        {suggest.loading ? <Spinner size={18} className="text-[var(--tr-lime)]" /> : <Search className="size-[18px] shrink-0 text-[var(--tr-dim)]" aria-hidden="true" />}
        <input
          ref={inputRef}
          id={SEARCH_INPUT_ID}
          type="search"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? optionId(active) : undefined}
          aria-label="Search GitHub repositories"
          placeholder="Search GitHub repositories"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={100}
          value={text}
          onChange={e => {
            setText(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {text ? (
          <button type="button" onClick={clear} aria-label="Clear search" className="tr-btn tr-btn--ghost tr-btn--icon tr-btn--sm -mr-1">
            <X aria-hidden="true" />
          </button>
        ) : (
          <span className="tr-kbd" aria-hidden="true">
            /
          </span>
        )}
      </div>

      <div className="sr-only" role="status" aria-live="polite">
        {show && !suggest.loading ? (suggest.error ? "Search failed." : items.length === 0 ? "No matches." : `${items.length} suggestions. Use the arrow keys to move through them.`) : ""}
      </div>

      {show ? (
        <div className="tr-pop tr-root" onMouseDown={e => e.preventDefault()}>
          <div id={listId} role="listbox" aria-label="Matching repositories">
            {rows.map((row, i) => (
              <button
                key={row.key}
                id={optionId(i)}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={active === i}
                className="tr-sug"
                onMouseMove={() => active !== i && setActive(i)}
                onClick={() => pick(row.fullName)}
              >
                <Avatar src={row.avatar} name={row.owner} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[var(--tr-mut)]">
                    <Highlight text={row.owner} query={q} />
                    <span className="text-[var(--tr-dim)]">/</span>
                    <span className="text-[var(--tr-fg)]">
                      <Highlight text={row.name} query={q} />
                    </span>
                  </span>
                  {row.description ? <span className="block truncate text-[12.5px] text-[var(--tr-dim)]">{row.description}</span> : null}
                </span>
                <span className="hidden shrink-0 items-center gap-3 sm:flex">
                  {row.language ? <LangLogo name={row.language} size={16} /> : null}
                  <span className="tr-num inline-flex items-center gap-1 text-[12.5px] text-[var(--tr-mut)]">
                    <Star className="size-3 fill-[var(--tr-amber)] text-[var(--tr-amber)]" aria-hidden="true" />
                    {compact(row.stars)}
                  </span>
                </span>
              </button>
            ))}

            {suggest.loading && rows.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-4 text-[13px] text-[var(--tr-mut)]" role="presentation">
                <Spinner size={14} /> Searching GitHub
              </div>
            ) : null}
            {!suggest.loading && !suggest.error && rows.length === 0 ? <div className="px-4 py-4 text-[13px] text-[var(--tr-mut)]">No repositories match “{q}”.</div> : null}
            {suggest.error ? (
              <div role="alert" className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-[var(--tr-rose)]">
                <span className="min-w-0">{suggest.error}</span>
                <button type="button" className="tr-btn tr-btn--sm shrink-0" onClick={suggest.retry}>
                  Retry
                </button>
              </div>
            ) : null}

            <button
              id={optionId(footerIndex)}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={active === footerIndex}
              className="tr-sug whitespace-nowrap bg-[var(--tr-wash)]"
              onMouseMove={() => active !== footerIndex && setActive(footerIndex)}
              onClick={commit}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-[7px] border border-[var(--tr-line2)] text-[var(--tr-mut)]">
                <Search className="size-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[13.5px] text-[var(--tr-fg)]">
                See all results for <span className="font-semibold">“{q}”</span>
                {language ? <span className="text-[var(--tr-mut)]"> in {language}</span> : null}
              </span>
              <span className="tr-kbd" aria-hidden="true">
                Enter
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Hero(props: { committed: string; language: string; onCommit: (q: string) => void; onOpenRepo: (fullName: string) => void }) {
  return (
    <header className="relative px-4 pb-9 pt-10 text-center sm:px-6 sm:pb-11 sm:pt-14 lg:px-8">
      <h1 className="text-[clamp(30px,4.6vw,46px)] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--tr-fg)]">Trending repositories</h1>
      <div className="mt-7">
        <SearchBox {...props} />
      </div>
    </header>
  )
}

// ─── Filters ────────────────────────────────────────────────────────────────
// Every filter maps to one GitHub search qualifier and is applied by GitHub, so the list is never a filtered
// slice of a slice. They apply as you choose; clicks that come quickly send one request (see useRepoList).
function FilterGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="mb-2 flex w-full items-baseline justify-between gap-2 p-0">
        <span className="text-[13px] font-medium text-[var(--tr-fg)]">{title}</span>
        {hint ? <span className="text-[12px] text-[var(--tr-dim)]">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  )
}

function LanguagePicker({ value, onChange, disabled }: { value: string; onChange: (language: string) => void; disabled?: boolean }) {
  const [text, setText] = useState("")
  const t = text.trim().toLowerCase()
  const list = t ? LANGUAGES.filter(l => l.toLowerCase().includes(t)) : [...LANGUAGES]
  // GitHub knows far more languages than the list. A typed name that is allowed (letters, numbers, # + . -) can be used as it is.
  const typed = text.trim()
  const custom = typed && LANGUAGE_PATTERN.test(typed) && !LANGUAGES.some(l => l.toLowerCase() === typed.toLowerCase()) ? typed : ""
  const pinned = value && !(LANGUAGES as readonly string[]).includes(value) && value !== custom ? value : ""
  const selectedVisible = value === "" || list.some(l => l === value) || value === custom || value === pinned
  const tab = (checked: boolean, first = false) => (checked || (first && !selectedVisible) ? 0 : -1)

  return (
    <div className={cx(disabled && "opacity-50")}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--tr-dim)]" aria-hidden="true" />
        <input type="text" className="tr-input" placeholder="Find a language" aria-label="Find a language" value={text} onChange={e => setText(e.target.value)} maxLength={30} autoComplete="off" spellCheck={false} disabled={disabled} />
      </div>
      <div role="radiogroup" aria-label="Language" onKeyDown={rovingKeyDown} className="tr-scroll mt-2 grid max-h-[236px] grid-cols-2 gap-1 overflow-y-auto pr-1">
        <button type="button" role="radio" aria-checked={value === ""} tabIndex={tab(value === "", true)} data-roving="" disabled={disabled} className="tr-pick col-span-2" onClick={() => onChange("")}>
          <span className="grid size-4 place-items-center text-[var(--tr-mut)]" aria-hidden="true">
            <Code2 className="size-3.5" />
          </span>
          Any language
          {value === "" ? <Check className="ml-auto size-3.5 text-[var(--tr-lime)]" aria-hidden="true" /> : null}
        </button>
        {pinned ? (
          <button type="button" role="radio" aria-checked tabIndex={0} data-roving="" disabled={disabled} className="tr-pick col-span-2" onClick={() => onChange(pinned)}>
            <LangLogo name={pinned} size={16} />
            <span className="truncate">{pinned}</span>
            <Check className="ml-auto size-3.5 text-[var(--tr-lime)]" aria-hidden="true" />
          </button>
        ) : null}
        {list.map(name => (
          <button key={name} type="button" role="radio" aria-checked={value === name} tabIndex={tab(value === name)} data-roving="" disabled={disabled} className="tr-pick" onClick={() => onChange(name)}>
            <LangLogo name={name} size={16} />
            <span className="truncate">{name}</span>
            {value === name ? <Check className="ml-auto size-3.5 shrink-0 text-[var(--tr-lime)]" aria-hidden="true" /> : null}
          </button>
        ))}
        {custom ? (
          <button type="button" role="radio" aria-checked={value === custom} tabIndex={tab(value === custom)} data-roving="" disabled={disabled} className="tr-pick col-span-2" onClick={() => onChange(custom)}>
            <LangLogo name={custom} size={16} />
            <span className="truncate">Use “{custom}”</span>
          </button>
        ) : null}
        {list.length === 0 && !custom ? <p className="col-span-2 px-2 py-3 text-[12.5px] leading-relaxed text-[var(--tr-dim)]">No language matches. A name can use letters, numbers and # + . -</p> : null}
      </div>
    </div>
  )
}

function FilterPanel({
  values,
  onChange,
  searchActive,
}: {
  values: ListFilters
  onChange: (patch: Partial<ListFilters>) => void
  searchActive: boolean
}) {
  // While a search is showing, only the language filter applies; the rest belong to the trending lists.
  const lists = searchActive
  return (
    <div className="space-y-6">
      {searchActive ? (
        <p className="border-l-2 border-[var(--tr-line3)] pl-3 text-[12.5px] leading-relaxed text-[var(--tr-mut)]">
          A search looks through every public repository. Only the language filter applies to it.
        </p>
      ) : null}

      <FilterGroup title="Ranking">
        <div role="radiogroup" aria-label="Ranking" onKeyDown={rovingKeyDown} className="grid grid-cols-2 gap-2">
          {MODES.map(m => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={values.mode === m.value}
              tabIndex={values.mode === m.value ? 0 : -1}
              data-roving=""
              disabled={lists}
              onClick={() => onChange({ mode: m.value })}
              className="tr-opt flex-col !items-start !gap-2"
            >
              <span className="flex w-full items-center justify-between">
                <m.icon className={cx("size-4", values.mode === m.value ? "text-[var(--tr-lime)]" : "text-[var(--tr-mut)]")} aria-hidden="true" />
                {values.mode === m.value ? <Check className="size-3.5 text-[var(--tr-lime)]" aria-hidden="true" /> : null}
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-[var(--tr-fg)]">{m.label}</span>
                <span className="block text-[12px] leading-snug text-[var(--tr-dim)]">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Created within" hint={values.mode === "recent" ? undefined : "New only"}>
        <Seg
          label="Created within"
          value={values.windowKey}
          disabled={lists || values.mode !== "recent"}
          onChange={windowKey => onChange({ windowKey })}
          options={WINDOWS.map(w => ({ value: w.value, label: w.label, title: `Created in the last ${w.label}, at least ${w.minStars} stars` }))}
        />
      </FilterGroup>

      <FilterGroup title="Minimum stars">
        <Seg
          className="tr-seg--dense"
          label="Minimum stars"
          value={values.stars}
          disabled={lists}
          onChange={stars => onChange({ stars })}
          options={STAR_FLOORS.map(s => ({ value: s.value, label: s.label, title: s.text }))}
        />
      </FilterGroup>

      <FilterGroup title="Updated">
        <Seg
          className="tr-seg--dense"
          label="Updated"
          value={values.pushed}
          disabled={lists}
          onChange={pushed => onChange({ pushed })}
          options={PUSHED.map(p => ({ value: p.value, label: p.label, title: p.text }))}
        />
      </FilterGroup>

      <FilterGroup title="Language">
        <LanguagePicker value={values.language} onChange={language => onChange({ language })} />
      </FilterGroup>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--tr-line)] pt-5">
        <span className="min-w-0">
          <span className="block text-[13px] font-medium text-[var(--tr-fg)]">Hide archived</span>
          <span className="block text-[12px] text-[var(--tr-dim)]">Skip read-only repositories</span>
        </span>
        <Switch checked={values.hideArchived} disabled={lists} onChange={hideArchived => onChange({ hideArchived })} label="Hide archived repositories" />
      </div>
    </div>
  )
}

// Below 1280px the filters open in a sheet: a drawer on the right from 640px, a bottom sheet on phones.
function FiltersSheet({
  open,
  onOpenChange,
  trigger,
  values,
  onChange,
  onReset,
  canReset,
  searchActive,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactNode
  values: ListFilters
  onChange: (patch: Partial<ListFilters>) => void
  onReset: () => void
  canReset: boolean
  searchActive: boolean
}) {
  const wide = useMediaQuery("(min-width: 640px)")
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* A real trigger lets Radix hand focus back to the button when the sheet closes. */}
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className={cx("tr-root tr-sheet gap-0 border-[var(--tr-line2)] bg-[var(--tr-bg)] p-0 text-[var(--tr-fg)]", wide ? "" : "max-h-[90dvh] rounded-t-2xl border-x-0")}
        style={wide ? { width: "min(100vw, 400px)", maxWidth: "none" } : undefined}
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b border-[var(--tr-line)] p-4">
          <div className="min-w-0">
            <SheetTitle className="text-[16px] font-semibold tracking-tight text-[var(--tr-fg)]">Filters</SheetTitle>
            <SheetDescription className="mt-0.5 text-[12.5px] text-[var(--tr-mut)]">Applied as you choose.</SheetDescription>
          </div>
          <SheetClose asChild>
            <button type="button" aria-label="Close filters" className="tr-btn tr-btn--ghost tr-btn--icon">
              <X aria-hidden="true" />
            </button>
          </SheetClose>
        </SheetHeader>
        <div className="tr-scroll min-h-0 flex-1 overflow-y-auto p-4">
          <FilterPanel values={values} onChange={onChange} searchActive={searchActive} />
        </div>
        <div className="flex items-center gap-2 border-t border-[var(--tr-line)] p-4">
          <button type="button" className="tr-btn" onClick={onReset} disabled={!canReset}>
            <RotateCcw aria-hidden="true" /> Reset
          </button>
          <SheetClose asChild>
            <button type="button" className="tr-btn tr-btn--primary flex-1">
              Done
            </button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// What is currently narrowing the list, each with an x. "Clear all" resets them together.
function ActiveFilters({ values, onChange, onReset }: { values: ListFilters; onChange: (patch: Partial<ListFilters>) => void; onReset: () => void }) {
  const chips: Array<{ key: string; label: string; icon?: ReactNode; clear: () => void }> = []
  if (values.mode === "recent" && values.windowKey !== DEFAULT_PARAMS.windowKey) {
    chips.push({ key: "window", label: `Created in ${WINDOWS.find(w => w.value === values.windowKey)?.label ?? ""}`, clear: () => onChange({ windowKey: DEFAULT_PARAMS.windowKey }) })
  }
  if (values.language) chips.push({ key: "lang", label: values.language, icon: <LangLogo name={values.language} size={14} />, clear: () => onChange({ language: "" }) })
  if (values.stars) chips.push({ key: "stars", label: STAR_FLOORS.find(s => s.value === values.stars)?.text ?? "", icon: <Star className="size-3 fill-[var(--tr-amber)] text-[var(--tr-amber)]" aria-hidden="true" />, clear: () => onChange({ stars: "" }) })
  if (values.pushed) chips.push({ key: "pushed", label: PUSHED.find(p => p.value === values.pushed)?.text ?? "", icon: <Clock3 className="size-3 text-[var(--tr-mut)]" aria-hidden="true" />, clear: () => onChange({ pushed: "" }) })
  if (values.hideArchived) chips.push({ key: "archived", label: "Archived hidden", clear: () => onChange({ hideArchived: false }) })
  if (chips.length === 0) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
      {chips.map(c => (
        <button key={c.key} type="button" className="tr-chip-btn tr-fade" onClick={c.clear} aria-label={`Remove filter: ${c.label}`}>
          {c.icon}
          {c.label}
          <span className="x" aria-hidden="true">
            <X className="size-3" />
          </span>
        </button>
      ))}
      {chips.length > 1 ? (
        <button type="button" className="tr-btn tr-btn--ghost tr-btn--sm" onClick={onReset}>
          Clear all
        </button>
      ) : null}
    </div>
  )
}

// ─── Sort and view ──────────────────────────────────────────────────────────
function dirOptions(sort: SortKey): ReadonlyArray<{ value: Dir; label: string }> {
  if (sort === "name") return [{ value: "asc", label: "A to Z" }, { value: "desc", label: "Z to A" }]
  if (sort === "created" || sort === "pushed") return [{ value: "desc", label: "Newest first" }, { value: "asc", label: "Oldest first" }]
  return [{ value: "desc", label: "High to low" }, { value: "asc", label: "Low to high" }]
}

const MENU_CLASS = "tr-root w-[300px] rounded-xl border border-[var(--tr-line2)] bg-[var(--tr-s2)] p-1.5 text-[var(--tr-fg)] shadow-[0_28px_60px_-16px_rgba(0,0,0,.85)]"
const MENU_ITEM = "cursor-pointer items-start gap-3 rounded-lg py-2 pl-2.5 pr-8 text-[var(--tr-fg)] focus:bg-[var(--tr-s3)] focus:text-[var(--tr-fg)]"

function SortMenu({ sort, dir, onChange, partial }: { sort: SortKey; dir: Dir; onChange: (patch: Partial<Pick<Params, "sort" | "dir">>) => void; partial: boolean }) {
  const current = SORTS.find(s => s.value === sort) ?? SORTS[0]
  const order = dirOptions(sort).find(o => o.value === dir)?.label ?? ""
  return (
    // Not modal: the page stays reachable and keeps its scrollbar, so nothing shifts when the menu opens.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className="tr-btn">
          <current.icon className="text-[var(--tr-mut)]" aria-hidden="true" />
          {/* The word "Sort" is only drawn from 640px, but a screen reader always hears it, with the order after the name. */}
          <span className="text-[var(--tr-dim)] max-sm:sr-only">Sort</span>{" "}
          <span>{current.label}</span>
          {dir === "desc" ? <ArrowDown className="!size-3 text-[var(--tr-lime)]" aria-hidden="true" /> : <ArrowUp className="!size-3 text-[var(--tr-lime)]" aria-hidden="true" />}
          <span className="sr-only">, {order}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={MENU_CLASS}>
        <div className="px-2.5 pb-1 pt-1.5 text-[12px] font-medium text-[var(--tr-dim)]">Sort by</div>
        <DropdownMenuRadioGroup value={sort} onValueChange={value => { const s = value as SortKey; onChange({ sort: s, dir: defaultDir(s) }) }}>
          {SORTS.map(s => (
            <DropdownMenuRadioItem key={s.value} value={s.value} className={MENU_ITEM}>
              <s.icon className="mt-0.5 size-4 shrink-0 text-[var(--tr-mut)]" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium leading-tight">{s.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-[var(--tr-dim)]">{s.hint}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <div className="mx-1 my-1.5 h-px bg-[var(--tr-line)]" />
        <div className="px-2.5 pb-1 pt-1 text-[12px] font-medium text-[var(--tr-dim)]">Order</div>
        <DropdownMenuRadioGroup value={dir} onValueChange={value => onChange({ dir: value as Dir })}>
          {dirOptions(sort).map(o => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className={cx(MENU_ITEM, "items-center")}>
              {o.value === "desc" ? <ArrowDown className="size-4 shrink-0 text-[var(--tr-mut)]" aria-hidden="true" /> : <ArrowUp className="size-4 shrink-0 text-[var(--tr-mut)]" aria-hidden="true" />}
              <span className="text-[13.5px] font-medium">{o.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {partial ? <p className="px-2.5 pb-1.5 pt-2 text-[12px] leading-snug text-[var(--tr-dim)]">Orders the repositories loaded so far. Load more to bring in the next ones.</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <Seg
      label="Layout"
      value={view}
      onChange={onChange}
      options={[
        { value: "board", label: <span className="inline-flex items-center gap-1.5"><Rows3 className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">Board</span><span className="sr-only sm:hidden">Board</span></span>, title: "Board: a table with a column per figure" },
        { value: "cards", label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="size-3.5" aria-hidden="true" /><span className="hidden sm:inline">Cards</span><span className="sr-only sm:hidden">Cards</span></span>, title: "Cards: the same figures, stacked" },
      ]}
    />
  )
}

// ─── Overview: numbers and charts for the repositories on screen ────────────
// Everything here is computed from the loaded rows (GitHub's stars, creation date and language). No request is made.
// Each chart has a plain-words summary for screen readers, and the board below lists the same repositories.

const AGE_TICKS: ReadonlyArray<[number, string]> = [[1, "1d"], [3, "3d"], [7, "1w"], [14, "2w"], [30, "1mo"], [90, "3mo"], [180, "6mo"], [365, "1y"], [730, "2y"], [1095, "3y"], [1825, "5y"], [2555, "7y"], [3650, "10y"], [5475, "15y"]]
// Star ticks come in three grains, coarse to fine; the first one that gives three or more labels is used. A chart whose
// repositories all sit between 260K and 440K stars would otherwise get a single label.
const decades = (steps: number[]) => Array.from({ length: 8 }, (_, p) => steps.map(m => m * 10 ** p)).flat()
const STAR_TICK_GRAINS = [decades([1, 3]), decades([1, 2, 5]), decades([1, 2, 3, 4, 5, 6, 7, 8, 9])]
const PACE_LINES = [1, 10, 100, 1000, 10000]

// Ticks inside [lo, hi] that are at least `gap` pixels apart on a log scale of `size` pixels.
function logTicks<T extends number | [number, string]>(candidates: readonly T[], lo: number, hi: number, size: number, gap: number): T[] {
  const value = (c: T) => (Array.isArray(c) ? c[0] : c) as number
  const pos = (v: number) => ((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * size
  const out: T[] = []
  let last = -Infinity
  for (const c of candidates) {
    const v = value(c)
    if (v < lo || v > hi) continue
    if (pos(v) - last >= gap) {
      out.push(c)
      last = pos(v)
    }
  }
  return out
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function StatTile({ label, value, format, text, detail, onDetail }: { label: string; value?: number; format?: (n: number) => string; text?: string; detail: ReactNode; onDetail?: () => void }) {
  const shown = useCountUp(value ?? 0)
  return (
    <div className="tr-panel min-w-0 px-4 py-3.5">
      <div className="tr-label">{label}</div>
      <div className="tr-num mt-1.5 truncate text-[26px] font-semibold leading-none tracking-[-0.02em] text-[var(--tr-fg)]">{text ?? (format ? format(shown) : Math.round(shown))}</div>
      <div className="mt-2 min-h-[18px] truncate text-[12.5px] text-[var(--tr-mut)]">
        {onDetail ? (
          <button type="button" onClick={onDetail} className="tr-link max-w-full truncate text-left">
            {detail}
          </button>
        ) : (
          detail
        )}
      </div>
    </div>
  )
}

function StatTiles({ rows, now, onOpen }: { rows: Row[]; now: number; onOpen: (key: string) => void }) {
  const totalStars = rows.reduce((sum, r) => sum + r.stars, 0)
  const fastest = rows.reduce<Row | null>((best, r) => (r.pace !== null && (best === null || r.pace > (best.pace ?? 0)) ? r : best), null)
  const ages = rows.flatMap(r => (r.ageDays === null ? [] : [r.ageDays]))
  const medianAge = median(ages)
  const week = rows.filter(r => r.pushedAt && now - Date.parse(r.pushedAt) <= 7 * DAY_MS).length
  const stale = rows.filter(r => r.pushedAt && now - Date.parse(r.pushedAt) > 180 * DAY_MS).length
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile label="Stars combined" value={totalStars} format={n => compact(n)} detail={`across ${plural(rows.length, "repository", "repositories")}`} />
      <StatTile
        label="Fastest growing"
        value={fastest?.pace ?? 0}
        format={n => (fastest ? `+${formatPace(n)}/day` : "n/a")}
        detail={fastest ? fastest.fullName : "No data"}
        onDetail={fastest ? () => onOpen(fastest.key) : undefined}
      />
      <StatTile label="Median age" text={medianAge === null ? "n/a" : formatAge(medianAge)} detail={ages.length ? `from ${formatAge(Math.min(...ages))} to ${formatAge(Math.max(...ages))}` : "No data"} />
      <StatTile label="Pushed this week" value={week} format={n => `${Math.round(n)} of ${rows.length}`} detail={stale > 0 ? `${stale} not touched in 6 months` : "None idle for 6 months"} />
    </div>
  )
}

// Stars against age on log scales, so a repository with 400,000 stars and one with 400 can share a chart. The dashed
// diagonals are fixed growth rates: a square above the "100/day" line has gained stars faster than 100 a day on average.
function ReachChart({ rows, hotKey, onHot, onOpen, now }: { rows: Row[]; hotKey: string | null; onHot: (key: string | null) => void; onOpen: (key: string) => void; now: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [tipKey, setTipKey] = useState<string | null>(null)
  const H = width > 0 && width < 520 ? 280 : 340
  const M = { t: 14, r: 16, b: 32, l: 44 }
  const pw = Math.max(0, width - M.l - M.r)
  const ph = H - M.t - M.b
  const data = useMemo(() => rows.filter(r => r.ageDays !== null && r.stars > 0), [rows])

  const plot = useMemo(() => {
    if (data.length === 0 || pw <= 0) return null
    const ages = data.map(r => Math.max(r.ageDays as number, 0.5))
    const stars = data.map(r => r.stars)
    const xMin = Math.min(...ages) * 0.75
    const xMax = Math.max(...ages) * 1.3
    const yMin = Math.min(...stars) * 0.7
    const yMax = Math.max(...stars) * 1.35
    const lx = (v: number) => M.l + ((Math.log(v) - Math.log(xMin)) / (Math.log(xMax) - Math.log(xMin))) * pw
    const ly = (v: number) => M.t + ph - ((Math.log(v) - Math.log(yMin)) / (Math.log(yMax) - Math.log(yMin))) * ph
    const dots = data
      .map(r => ({ row: r, x: lx(Math.max(r.ageDays as number, 0.5)), y: ly(r.stars), color: langColor(r.language) }))
      .sort((a, b) => a.x - b.x || b.y - a.y)
    const xt = logTicks(AGE_TICKS, xMin, xMax, pw, 52)
    let yt: number[] = []
    for (const grain of STAR_TICK_GRAINS) {
      yt = logTicks(grain, yMin, yMax, ph, 30)
      if (yt.length >= 3) break
    }
    const lines = PACE_LINES.flatMap(p => {
      const a0 = Math.max(xMin, yMin / p)
      const a1 = Math.min(xMax, yMax / p)
      if (a0 >= a1) return []
      return [{ p, x1: lx(a0), y1: ly(a0 * p), x2: lx(a1), y2: ly(a1 * p) }]
    })
    return { dots, xt, yt, lines, lx, ly }
    // M is a constant; its fields are listed through pw and ph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pw, ph])

  // The nearest square within reach of the pointer is the one being read.
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!plot) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    let best: { key: string; d: number } | null = null
    for (const d of plot.dots) {
      const dist = Math.hypot(d.x - x, d.y - y)
      if (dist < 30 && (best === null || dist < best.d)) best = { key: d.row.key, d: dist }
    }
    setTipKey(best?.key ?? null)
    onHot(best?.key ?? null)
  }
  const leave = () => {
    setTipKey(null)
    onHot(null)
  }

  const tip = plot && tipKey ? plot.dots.find(d => d.row.key === tipKey) : null
  const tipLeft = tip ? (tip.x > width - 250 ? tip.x - 236 : tip.x + 16) : 0
  const tipTop = tip ? clamp(tip.y - 52, 4, H - 150) : 0
  const hot = plot && hotKey ? plot.dots.find(d => d.row.key === hotKey) : null

  return (
    <div className="tr-panel min-w-0 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="tr-title">Growth map</h3>
        <span className="text-[12px] text-[var(--tr-dim)]">Stars against age</span>
      </div>
      <div
        ref={ref}
        className="relative select-none"
        style={{ height: H }}
        role="group"
        aria-label={`Chart of stars against age for ${plural(data.length, "repository", "repositories")}. The board below lists the same repositories.`}
        onPointerMove={onMove}
        onPointerLeave={e => e.pointerType === "mouse" && leave()}
        onKeyDown={rovingKeyDown}
      >
        {plot ? (
          <div className="tr-wipe absolute inset-0" key={data.length > 0 ? "chart" : "empty"}>
            <svg width={width} height={H} className="tr-chart absolute inset-0" aria-hidden="true">
              {plot.yt.map(v => (
                <g key={`y${v}`}>
                  <line className="tr-grid" x1={M.l} x2={width - M.r} y1={plot.ly(v)} y2={plot.ly(v)} />
                  <text className="tr-tick" x={M.l - 8} y={plot.ly(v) + 4} textAnchor="end">{compact(v)}</text>
                </g>
              ))}
              {plot.xt.map(([v, label]) => (
                <g key={`x${v}`}>
                  <line className="tr-grid" y1={M.t} y2={H - M.b} x1={plot.lx(v)} x2={plot.lx(v)} />
                  <text className="tr-tick" y={H - M.b + 18} x={plot.lx(v)} textAnchor="middle">{label}</text>
                </g>
              ))}
              <line className="tr-axis" x1={M.l} x2={M.l} y1={M.t} y2={H - M.b} />
              <line className="tr-axis" x1={M.l} x2={width - M.r} y1={H - M.b} y2={H - M.b} />
              {plot.lines.map(l => (
                <g key={l.p}>
                  <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(255,255,255,.16)" strokeWidth="1" strokeDasharray="3 5" />
                  <text className="tr-tick" x={Math.min(l.x2, width - M.r) - 4} y={l.y2 - 6} textAnchor="end" fill="var(--tr-dim)">{`${compact(l.p)}/day`}</text>
                </g>
              ))}
              {hot ? (
                <g stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="2 3">
                  <line x1={hot.x} x2={hot.x} y1={hot.y} y2={H - M.b} />
                  <line x1={M.l} x2={hot.x} y1={hot.y} y2={hot.y} />
                </g>
              ) : null}
            </svg>
            {plot.dots.map((d, i) => (
              <button
                key={d.row.key}
                type="button"
                data-roving=""
                tabIndex={i === 0 ? 0 : -1}
                data-on={hotKey === d.row.key ? "" : undefined}
                className="tr-dotbtn tr-markpop tr-f"
                style={cssVars({ left: d.x, top: d.y, "--c": d.color, "--i": Math.min(i, 40) })}
                aria-label={`${d.row.fullName}: ${grouped(d.row.stars)} stars, ${formatAge(d.row.ageDays)} old, ${d.row.pace === null ? "growth unknown" : `${formatPace(d.row.pace)} stars per day`}. Open details.`}
                onFocus={() => {
                  setTipKey(d.row.key)
                  onHot(d.row.key)
                }}
                onBlur={leave}
                onClick={() => onOpen(d.row.key)}
              >
                <i />
              </button>
            ))}
            {hot ? (
              <>
                <span className="pointer-events-none absolute -translate-x-1/2 rounded-[4px] border border-[var(--tr-line3)] bg-[var(--tr-s2)] px-1.5 py-0.5 text-[12px] tr-num text-[var(--tr-fg)]" style={{ left: hot.x, top: H - M.b + 3 }}>{formatAge(hot.row.ageDays)}</span>
                <span className="pointer-events-none absolute -translate-y-1/2 rounded-[4px] border border-[var(--tr-line3)] bg-[var(--tr-s2)] px-1.5 py-0.5 text-[12px] tr-num text-[var(--tr-fg)]" style={{ left: 2, top: hot.y }}>{compact(hot.row.stars)}</span>
              </>
            ) : null}
            <div className="tr-tip" data-off={tip ? undefined : ""} style={{ left: 0, top: 0, transform: `translate(${tipLeft}px, ${tipTop}px)` }} aria-hidden="true">
              {tip ? (
                <>
                  <div className="flex items-center gap-2">
                    <LangLogo name={tip.row.language} size={16} />
                    <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--tr-fg)]">{tip.row.fullName}</span>
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <dt className="text-[var(--tr-dim)]">Stars</dt>
                    <dd className="tr-num text-right text-[var(--tr-fg)]">{grouped(tip.row.stars)}</dd>
                    <dt className="text-[var(--tr-dim)]">Age</dt>
                    <dd className="tr-num text-right text-[var(--tr-fg)]">{tip.row.createdAt ? `${formatAge(tip.row.ageDays)}, ${formatDate(Date.parse(tip.row.createdAt))}` : "unknown"}</dd>
                    <dt className="text-[var(--tr-dim)]">Growth</dt>
                    <dd className="tr-num text-right text-[var(--tr-fg)]">{tip.row.pace === null ? "n/a" : `+${formatPace(tip.row.pace)} a day`}</dd>
                    <dt className="text-[var(--tr-dim)]">Updated</dt>
                    <dd className="tr-num text-right text-[var(--tr-fg)]">{timeAgo(tip.row.pushedAt, now)}</dd>
                  </dl>
                  <div className="mt-2 border-t border-[var(--tr-line)] pt-2 text-[12px] text-[var(--tr-dim)]">Click to open details</div>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--tr-dim)]">Each square is a repository, coloured by its main language. Dashed lines mark a steady number of stars a day, averaged since creation.</p>
    </div>
  )
}

// How the loaded repositories split by language: one bar, then a list that doubles as a filter.
function LanguageMix({ rows, language, canPick, onPick }: { rows: Row[]; language: string; canPick: boolean; onPick: (language: string) => void }) {
  const [by, setBy] = useState<"repos" | "stars">("repos")
  const groups = useMemo(() => {
    const map = new Map<string, { repos: number; stars: number }>()
    for (const r of rows) {
      const key = r.language ?? NO_LANGUAGE
      const g = map.get(key) ?? { repos: 0, stars: 0 }
      g.repos += 1
      g.stars += r.stars
      map.set(key, g)
    }
    const total = by === "repos" ? rows.length : rows.reduce((s, r) => s + r.stars, 0)
    const list = [...map.entries()].map(([name, g]) => ({ name, value: by === "repos" ? g.repos : g.stars, repos: g.repos, share: total > 0 ? (by === "repos" ? g.repos : g.stars) / total : 0 })).sort((a, b) => b.value - a.value)
    const top = list.slice(0, 7)
    const rest = list.slice(7)
    if (rest.length > 0) top.push({ name: "Other", value: rest.reduce((s, x) => s + x.value, 0), repos: rest.reduce((s, x) => s + x.repos, 0), share: rest.reduce((s, x) => s + x.share, 0) })
    return top
  }, [rows, by])

  return (
    <div className="tr-panel min-w-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="tr-title">Languages</h3>
        <Seg label="Weigh languages by" value={by} onChange={setBy} className="!p-[2px]" options={[{ value: "repos", label: "Repositories" }, { value: "stars", label: "Stars" }]} />
      </div>
      <div className="tr-wipe flex h-2.5 gap-[2px]" role="img" aria-label={`Share of ${by === "repos" ? "repositories" : "stars"} by language: ${groups.map(g => `${g.name} ${Math.round(g.share * 100)} percent`).join(", ")}`}>
        {groups.map(g => (
          <span key={g.name} className="h-full min-w-[3px] rounded-[2px]" style={{ flexGrow: Math.max(g.share, 0.01), flexBasis: 0, background: g.name === "Other" ? "var(--tr-other)" : langColor(g.name === NO_LANGUAGE ? null : g.name) }} title={`${g.name}: ${Math.round(g.share * 100)}%`} />
        ))}
      </div>
      <ul className="mt-3 space-y-0.5">
        {groups.map((g, i) => {
          const pickable = canPick && g.name !== "Other" && g.name !== NO_LANGUAGE
          const body = (
            <>
              <LangLogo name={g.name === "Other" || g.name === NO_LANGUAGE ? null : g.name} size={16} className={g.name === "Other" ? "opacity-0" : undefined} />
              <span className="min-w-0 flex-1 truncate text-left">{g.name}</span>
              <span className="tr-num shrink-0 text-[var(--tr-dim)]">{by === "repos" ? plural(g.repos, "repo") : `${compact(g.value)} stars`}</span>
              <span className="tr-num w-9 shrink-0 text-right text-[var(--tr-fg)]">{Math.round(g.share * 100)}%</span>
            </>
          )
          return (
            <li key={g.name} className="tr-rise" style={cssVars({ "--i": i })}>
              {pickable ? (
                <button type="button" onClick={() => onPick(language === g.name ? "" : g.name)} aria-pressed={language === g.name} title={language === g.name ? "Clear the language filter" : `Show only ${g.name}`} className="tr-pick w-full !gap-2.5 !text-[12.5px]">
                  {body}
                </button>
              ) : (
                <div className="flex w-full items-center gap-2.5 px-2 py-1.5 text-[12.5px] text-[var(--tr-mut)]">{body}</div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Overview({
  rows,
  loading,
  open,
  onToggle,
  now,
  hotKey,
  onHot,
  onOpen,
  language,
  canPick,
  onPickLanguage,
}: {
  rows: Row[]
  loading: boolean
  open: boolean
  onToggle: () => void
  now: number
  hotKey: string | null
  onHot: (key: string | null) => void
  onOpen: (key: string) => void
  language: string
  canPick: boolean
  onPickLanguage: (language: string) => void
}) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-h`} className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={`${id}-h`} className="text-[15px] font-semibold tracking-tight text-[var(--tr-fg)]">
          Overview
        </h2>
        <button type="button" className="tr-btn tr-btn--ghost tr-btn--sm" aria-expanded={open} aria-controls={`${id}-body`} onClick={onToggle}>
          {open ? "Hide" : "Show"}
          <ChevronDown className={cx("transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
      </div>
      <div id={`${id}-body`} hidden={!open}>
        {loading || rows.length === 0 ? (
          <div className="space-y-3" aria-hidden="true">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skel key={i} className="h-[98px] !rounded-xl" />
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <Skel className="h-[418px] !rounded-xl" />
              <Skel className="h-[418px] !rounded-xl" />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <StatTiles rows={rows} now={now} onOpen={onOpen} />
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <ReachChart rows={rows} hotKey={hotKey} onHot={onHot} onOpen={onOpen} now={now} />
              <LanguageMix rows={rows} language={language} canPick={canPick} onPick={onPickLanguage} />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Charts for one repository ──────────────────────────────────────────────
// Star history and weekly commits. They behave like the growth map: hover or touch pins a moment, the arrow keys step
// through it, and the tooltip names what is under the cursor. Lines and bars draw in with clip-path and transform.

const HOUR_MS = 3_600_000
const TIME_STEPS = [HOUR_MS, 3 * HOUR_MS, 6 * HOUR_MS, 12 * HOUR_MS, DAY_MS, 2 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS, 91 * DAY_MS, 182 * DAY_MS, 365 * DAY_MS, 730 * DAY_MS, 1826 * DAY_MS]

// Round values from 0 to just above `max`, about `count` of them.
function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1]
  const rough = max / count
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const frac = rough / pow
  const step = (frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10) * pow
  const ticks: number[] = []
  for (let i = 0; i * step < max + step; i++) ticks.push(Number((i * step).toFixed(6)))
  return ticks
}
const formatTick = (v: number) => (v >= 1000 ? compact(v) : Number.isInteger(v) ? String(v) : v.toFixed(1))

// Round times for an axis, in the reader's own time zone: whole hours, whole days, or calendar months.
function timeTicks(t0: number, t1: number, max: number): { ticks: number[]; step: number } {
  const span = Math.max(t1 - t0, 1)
  const step = TIME_STEPS.find(s => span / s <= max) ?? TIME_STEPS[TIME_STEPS.length - 1]
  const ticks: number[] = []
  if (step >= 30 * DAY_MS) {
    const months = Math.max(1, Math.round(step / (30.4 * DAY_MS)))
    const d = new Date(t0)
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    for (let guard = 0; d.getTime() <= t1 && guard < 400; guard++) {
      if (d.getTime() >= t0 && (d.getFullYear() * 12 + d.getMonth()) % months === 0) ticks.push(d.getTime())
      d.setMonth(d.getMonth() + 1)
    }
  } else if (step >= DAY_MS) {
    const days = Math.round(step / DAY_MS)
    const d = new Date(t0)
    d.setHours(0, 0, 0, 0)
    if (d.getTime() < t0) d.setDate(d.getDate() + 1)
    for (let guard = 0; d.getTime() <= t1 && guard < 400; guard++) {
      ticks.push(d.getTime())
      d.setDate(d.getDate() + days)
    }
  } else {
    const hours = Math.round(step / HOUR_MS)
    const d = new Date(t0)
    d.setMinutes(0, 0, 0)
    d.setHours(Math.ceil(d.getHours() / hours) * hours)
    for (let t = d.getTime(), guard = 0; t <= t1 && guard < 400; t += step, guard++) if (t >= t0) ticks.push(t)
  }
  return { ticks, step }
}

function timeLabel(t: number, step: number): string {
  const d = new Date(t)
  if (step < DAY_MS) return d.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false })
  if (step < 30 * DAY_MS) return d.toLocaleDateString("en", { day: "numeric", month: "short" })
  if (step < 365 * DAY_MS) return `${d.toLocaleDateString("en", { month: "short" })} ’${String(d.getFullYear()).slice(2)}`
  return String(d.getFullYear())
}

// A date for a tooltip. Under three days the hour is shown too, because the points are then hours apart.
const formatMoment = (t: number, spanDays: number) =>
  spanDays < 3 ? new Date(t).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : formatDate(t)

// A smooth line through the points that never overshoots between them (monotone cubic), so a flat stretch stays flat.
function monotonePath(pts: ReadonlyArray<readonly [number, number]>): string {
  const n = pts.length
  if (n === 0) return ""
  const r = (v: number) => Math.round(v * 10) / 10
  if (n === 1) return `M${r(pts[0][0])},${r(pts[0][1])}`
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    m.push(dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i])
  }
  const t: number[] = [m[0]]
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2)
  t.push(m[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / m[i]
    const b = t[i + 1] / m[i]
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      t[i] = k * a * m[i]
      t[i + 1] = k * b * m[i]
    }
  }
  let d = `M${r(pts[0][0])},${r(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${r(pts[i][0] + h)},${r(pts[i][1] + t[i] * h)} ${r(pts[i + 1][0] - h)},${r(pts[i + 1][1] - t[i + 1] * h)} ${r(pts[i + 1][0])},${r(pts[i + 1][1])}`
  }
  return d
}

// ─── Star history maths ─────────────────────────────────────────────────────
interface Segment {
  from: StarPoint
  to: StarPoint
  days: number
  gained: number
  // Stars a day over this stretch: gained / days. An average over the stretch, not a measurement of each day in it.
  rate: number
  // The newest stretch when GitHub would not serve the newest pages of the star list: a straight line to today's total.
  estimated: boolean
}

function segmentsOf(points: StarPoint[], limited: boolean): Segment[] {
  const out: Segment[] = []
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]
    const to = points[i]
    const days = Math.max((to.t - from.t) / DAY_MS, 1 / 24)
    const gained = Math.max(0, to.n - from.n)
    out.push({ from, to, days, gained, rate: gained / days, estimated: limited && i === points.length - 1 })
  }
  return out
}

// Stars at a moment, read off the line between the two points around it.
function starsAt(points: StarPoint[], t: number): number {
  if (points.length === 0) return 0
  if (t <= points[0].t) return points[0].n
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i].t) {
      const a = points[i - 1]
      const b = points[i]
      return b.t === a.t ? b.n : a.n + ((b.n - a.n) * (t - a.t)) / (b.t - a.t)
    }
  }
  return points[points.length - 1].n
}

// ─── Shared chart parts ─────────────────────────────────────────────────────
// A cursor over `count` positions: the pointer sets it, the arrow keys move it. Exposed as a slider so a screen reader
// can step through the chart and hear each position, because the picture itself is hidden from them.
function useChartCursor(count: number, indexAt: (x: number) => number) {
  const [cursor, setCursor] = useState<number | null>(null)
  const last = Math.max(0, count - 1)
  const set = (e: ReactPointerEvent<HTMLDivElement>) => setCursor(clamp(indexAt(e.clientX - e.currentTarget.getBoundingClientRect().left), 0, last))
  const props = {
    tabIndex: 0,
    role: "slider" as const,
    "aria-orientation": "horizontal" as const,
    "aria-valuemin": 0,
    "aria-valuemax": last,
    "aria-valuenow": Math.min(cursor ?? last, last),
    onPointerDown: set,
    onPointerMove: set,
    onPointerLeave: (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") setCursor(null)
    },
    onFocus: () => setCursor(c => c ?? last),
    onBlur: () => setCursor(null),
    onKeyDown: (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const at = Math.min(cursor ?? last, last)
      let to: number
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.max(0, at - 1)
      else if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.min(last, at + 1)
      else if (e.key === "Home") to = 0
      else if (e.key === "End") to = last
      else return
      e.preventDefault()
      setCursor(to)
    },
  }
  return [cursor === null ? null : Math.min(cursor, last), props] as const
}

interface Tip {
  x: number
  y: number
  title: string
  rows: Array<[string, string]>
  note?: string
}

function ChartTip({ tip, width, height }: { tip: Tip | null; width: number; height: number }) {
  const x = tip ? (tip.x > width - 252 ? tip.x - 240 : tip.x + 14) : 0
  const y = tip ? clamp(tip.y - 24, 4, Math.max(4, height - 138)) : 0
  return (
    <div className="tr-tip" data-off={tip ? undefined : ""} style={{ left: 0, top: 0, transform: `translate(${x}px, ${y}px)` }} aria-hidden="true">
      {tip ? (
        <>
          <div className="text-[12.5px] font-semibold text-[var(--tr-fg)]">{tip.title}</div>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {tip.rows.map(([k, v]) => (
              <Fragment key={k}>
                <dt className="text-[var(--tr-dim)]">{k}</dt>
                <dd className="tr-num text-right text-[var(--tr-fg)]">{v}</dd>
              </Fragment>
            ))}
          </dl>
          {tip.note ? <p className="mt-1.5 border-t border-[var(--tr-line)] pt-1.5 text-[12px] leading-snug text-[var(--tr-dim)]">{tip.note}</p> : null}
        </>
      ) : null}
    </div>
  )
}

function ChartStat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-3 py-2.5">
      <div className="tr-label">{label}</div>
      <div className="tr-num mt-1 truncate text-[17px] font-semibold leading-tight text-[var(--tr-fg)]">{value}</div>
      {detail ? <div className="mt-0.5 truncate text-[12px] text-[var(--tr-dim)]">{detail}</div> : null}
    </div>
  )
}

const CHART_H = 248
const CM = { t: 12, r: 14, b: 28, l: 46 }

// ─── Star history ───────────────────────────────────────────────────────────
function StarHistoryChart({ history, createdAt, now }: { history: NonNullable<History["starHistory"]>; createdAt: string; now: number }) {
  const [mode, setMode] = useState<"total" | "rate">("total")
  const [ref, width] = useWidth<HTMLDivElement>()
  const gradientId = `sg-${useId().replace(/[^a-zA-Z0-9]/g, "")}`
  const { points, exact, limited } = history
  const segs = useMemo(() => segmentsOf(points, limited), [points, limited])

  const t0 = points[0]?.t ?? now
  const t1 = points[points.length - 1]?.t ?? now
  const spanDays = (t1 - t0) / DAY_MS
  const total = points[points.length - 1]?.n ?? 0
  const pw = Math.max(0, width - CM.l - CM.r)
  const ph = CHART_H - CM.t - CM.b
  const yTicks = niceTicks(mode === "total" ? total : Math.max(...segs.map(s => s.rate), 0), mode === "total" ? 5 : 4)
  const yMax = yTicks[yTicks.length - 1] || 1
  const sx = (t: number) => CM.l + (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * pw)
  const sy = (v: number) => CM.t + ph - (v / yMax) * ph
  const count = mode === "total" ? points.length : segs.length

  const indexAt = (x: number) => {
    if (mode === "total") {
      let best = 0
      let bestD = Infinity
      points.forEach((p, i) => {
        const d = Math.abs(sx(p.t) - x)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    }
    const i = segs.findIndex(s => x <= sx(s.to.t))
    return i === -1 ? segs.length - 1 : i
  }
  const [cursor, cursorProps] = useChartCursor(count, indexAt)

  // Figures above the chart.
  const created = Date.parse(createdAt)
  const ageDays = Number.isFinite(created) ? Math.max(1, (now - created) / DAY_MS) : Math.max(1, spanDays)
  const average = total / ageDays
  const gain30 = limited ? null : total - starsAt(points, now - 30 * DAY_MS)
  const best = segs.reduce<Segment | null>((b, s) => (!s.estimated && s.gained > 0 && (b === null || s.rate > b.rate) ? s : b), null)
  const rangeText = (s: Segment) => (s.days < 1.5 ? formatMoment(s.from.t, spanDays) : `${formatDate(s.from.t, false)} to ${formatDate(s.to.t, false)}`)

  let tip: Tip | null = null
  let valueText = ""
  if (cursor !== null) {
    if (mode === "total") {
      const p = points[cursor]
      const prev = points[cursor - 1]
      const seg = segs[cursor - 1]
      tip = {
        x: sx(p.t),
        y: sy(p.n),
        title: formatMoment(p.t, spanDays),
        rows: [
          ["Stars", grouped(p.n)],
          ...(seg ? ([["Gained", `+${grouped(seg.gained)}`], ["Pace", `+${formatPace(seg.rate)}/day`]] as Array<[string, string]>) : []),
        ],
        note: seg ? `Since ${formatMoment(prev.t, spanDays)}${seg.estimated ? ". A straight line: GitHub would not date the newest stars." : ""}` : cursor === 0 ? (p.n === 0 ? "The repository was created." : "The first star.") : undefined,
      }
      valueText = `${formatMoment(p.t, spanDays)}: ${grouped(p.n)} ${p.n === 1 ? "star" : "stars"}${seg ? `, ${formatPace(seg.rate)} a day since the previous point` : ""}`
    } else {
      const s = segs[cursor]
      tip = {
        x: (sx(s.from.t) + sx(s.to.t)) / 2,
        y: sy(s.rate),
        title: rangeText(s),
        rows: [
          ["Per day", `+${formatPace(s.rate)}`],
          ["Gained", `+${grouped(s.gained)}`],
          ["Stars after", grouped(s.to.n)],
        ],
        note: s.estimated ? "A straight line: GitHub would not date the newest stars, so this is an average." : `An average over ${s.days < 1 ? "this hour or so" : `${Math.round(s.days)} day${Math.round(s.days) === 1 ? "" : "s"}`}.`,
      }
      valueText = `${rangeText(s)}: ${formatPace(s.rate)} stars a day, ${grouped(s.gained)} gained`
    }
  }

  const { ticks: xTicks, step } = useMemo(() => timeTicks(t0, t1, Math.max(2, Math.floor(pw / 84))), [t0, t1, pw])
  const linePoints = points.map(p => [sx(p.t), sy(p.n)] as const)
  const solid = limited ? linePoints.slice(0, -1) : linePoints
  const linePath = monotonePath(solid)
  const baseY = CM.t + ph
  const areaPath = solid.length > 0 ? `${linePath}L${solid[solid.length - 1][0]},${baseY}L${solid[0][0]},${baseY}Z` : ""

  if (points.length < 2) {
    return <p className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-6 text-center text-[13px] text-[var(--tr-mut)]">Too few dated stars to draw a history.</p>
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ChartStat label="Stars now" value={grouped(total)} detail={`since ${formatDate(Number.isFinite(created) ? created : t0)}`} />
        <ChartStat label="Average" value={`+${formatPace(average)}/day`} detail={`over ${formatAge(ageDays)}`} />
        <ChartStat label="Last 30 days" value={gain30 === null ? "n/a" : `${exact ? "" : "about "}+${grouped(Math.max(0, gain30))}`} detail={gain30 === null ? "newest stars not dated" : exact ? "counted" : "from samples"} />
        <ChartStat label="Fastest stretch" value={best ? `+${formatPace(best.rate)}/day` : "n/a"} detail={best ? rangeText(best) : "no gains found"} />
      </div>

      <div className="mb-2 mt-4 flex items-center justify-between gap-3">
        <h3 className="tr-title">Star history</h3>
        <Seg label="Star history view" value={mode} onChange={setMode} className="!p-[2px]" options={[{ value: "total", label: "Total" }, { value: "rate", label: "Per day" }]} />
      </div>

      <div
        ref={ref}
        className="tr-scrub relative select-none"
        style={{ height: CHART_H }}
        aria-label="Star history. Use the arrow keys to move through it."
        aria-valuetext={valueText || `${grouped(total)} stars now`}
        {...cursorProps}
      >
        {width > 0 ? (
          <div key={mode} className={cx("absolute inset-0", mode === "total" && "tr-wipe")}>
            <svg width={width} height={CHART_H} className="tr-chart" aria-hidden="true">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--tr-amber)" stopOpacity=".28" />
                  <stop offset="1" stopColor="var(--tr-amber)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {yTicks.map(v => (
                <g key={v}>
                  <line className="tr-grid" x1={CM.l} x2={width - CM.r} y1={sy(v)} y2={sy(v)} />
                  <text className="tr-tick" x={CM.l - 8} y={sy(v) + 4} textAnchor="end">{formatTick(v)}</text>
                </g>
              ))}
              {xTicks.map(t => {
                const x = sx(t)
                return (
                  <text key={t} className="tr-tick" x={x} y={CHART_H - 8} textAnchor={x < CM.l + 18 ? "start" : x > width - CM.r - 18 ? "end" : "middle"}>
                    {timeLabel(t, step)}
                  </text>
                )
              })}
              <line className="tr-axis" x1={CM.l} x2={width - CM.r} y1={baseY} y2={baseY} />
              {mode === "total" ? (
                <>
                  <path d={areaPath} fill={`url(#${gradientId})`} />
                  <path d={linePath} fill="none" stroke="var(--tr-amber)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {limited ? (
                    <line x1={linePoints[linePoints.length - 2][0]} y1={linePoints[linePoints.length - 2][1]} x2={linePoints[linePoints.length - 1][0]} y2={linePoints[linePoints.length - 1][1]} stroke="var(--tr-amber)" strokeWidth="2" strokeDasharray="4 5" strokeLinecap="round" />
                  ) : null}
                </>
              ) : (
                segs.map((s, i) => {
                  const x0 = sx(s.from.t)
                  const w = Math.max(1.5, sx(s.to.t) - x0 - (segs.length > 60 ? 0 : 1.5))
                  const h = Math.max(1, (s.rate / yMax) * ph)
                  return (
                    <rect
                      key={i}
                      className="tr-grow"
                      style={cssVars({ "--i": i })}
                      x={x0}
                      y={baseY - h}
                      width={w}
                      height={h}
                      rx="1.5"
                      fill={s.estimated ? "none" : "var(--tr-amber)"}
                      fillOpacity={cursor === i ? 1 : 0.78}
                      stroke={s.estimated ? "var(--tr-amber)" : "none"}
                      strokeDasharray={s.estimated ? "3 3" : undefined}
                    />
                  )
                })
              )}
            </svg>
          </div>
        ) : null}
        {width > 0 && tip && mode === "total" ? (
          <svg width={width} height={CHART_H} className="pointer-events-none absolute inset-0" aria-hidden="true">
            <line x1={tip.x} x2={tip.x} y1={tip.y} y2={baseY} stroke="rgba(255,255,255,.35)" strokeDasharray="2 3" />
            <circle cx={tip.x} cy={tip.y} r="5" fill="var(--tr-bg)" stroke="var(--tr-amber)" strokeWidth="2" />
          </svg>
        ) : null}
        <ChartTip tip={tip} width={width} height={CHART_H} />
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-[var(--tr-dim)]">
        {exact
          ? "Every star is counted: GitHub dates each one. The chart splits the repository's life into equal slices."
          : limited
            ? "Sampled: GitHub is asked for the date of stars spread across the list. It would not serve the newest pages, so the dashed stretch is a straight line to today's total and its pace is an average."
            : "Sampled: GitHub is asked for the date of stars spread across the list, and the line between those points is straight."}
      </p>
    </div>
  )
}

// ─── Weekly commits ─────────────────────────────────────────────────────────
function CommitChart({ data, onRetry }: { data: NonNullable<History["commitActivity"]>; onRetry: () => void }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const weeks = data.weeks
  const n = weeks.length
  const pw = Math.max(0, width - CM.l - CM.r)
  const ph = CHART_H - 52 - CM.b
  const band = n > 0 ? pw / n : 0
  const max = weeks.reduce((m, w) => Math.max(m, w.total), 0)
  const yTicks = niceTicks(max, 3)
  const yMax = yTicks[yTicks.length - 1] || 1
  const sy = (v: number) => CM.t + ph - (v / yMax) * ph
  const baseY = CM.t + ph
  const [cursor, cursorProps] = useChartCursor(n, x => Math.floor((x - CM.l) / (band || 1)))

  const sum = weeks.reduce((s, w) => s + w.total, 0)
  const busiest = weeks.reduce<{ t: number; total: number } | null>((b, w) => (b === null || w.total > b.total ? w : b), null)
  const activeWeeks = weeks.filter(w => w.total > 0).length
  const { ticks, step } = useMemo(() => (n > 1 ? timeTicks(weeks[0].t, weeks[n - 1].t, Math.max(2, Math.floor(pw / 70))) : { ticks: [], step: DAY_MS }), [weeks, n, pw])

  if (data.pending) {
    return (
      <div className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-6 text-center">
        <p className="text-[13.5px] text-[var(--tr-fg)]">GitHub is still working out this repository’s commit activity.</p>
        <p className="mt-1 text-[12.5px] text-[var(--tr-mut)]">It computes it the first time anyone asks. Try again in a moment.</p>
        <button type="button" className="tr-btn mt-3" onClick={onRetry}>
          <RefreshCw aria-hidden="true" /> Check again
        </button>
      </div>
    )
  }
  if (n === 0) {
    return <p className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-6 text-center text-[13px] text-[var(--tr-mut)]">GitHub has no weekly commit data for this repository. Very large repositories are left out of it.</p>
  }

  const w = cursor === null ? null : weeks[cursor]
  const tip: Tip | null =
    w && cursor !== null
      ? { x: CM.l + band * (cursor + 0.5), y: sy(w.total), title: `Week of ${formatDate(w.t)}`, rows: [["Commits", grouped(w.total)]], note: w.total === 0 ? "No commits this week." : undefined }
      : null

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ChartStat label="Commits, 12 months" value={grouped(sum)} detail={`${n} weeks counted`} />
        <ChartStat label="Average a week" value={(sum / n).toFixed(sum / n < 10 ? 1 : 0)} detail="commits" />
        <ChartStat label="Busiest week" value={busiest ? grouped(busiest.total) : "n/a"} detail={busiest ? formatDate(busiest.t, false) : undefined} />
        <ChartStat label="Weeks with commits" value={`${activeWeeks} of ${n}`} detail={activeWeeks === n ? "every week" : `${n - activeWeeks} quiet`} />
      </div>

      <h3 className="tr-title mb-2 mt-4">Commits a week</h3>
      <div
        ref={ref}
        className="tr-scrub relative select-none"
        style={{ height: CHART_H - 52 }}
        aria-label="Commits per week over the last year. Use the arrow keys to move through it."
        aria-valuetext={w ? `Week of ${formatDate(w.t)}: ${plural(w.total, "commit")}` : `${plural(sum, "commit")} in ${plural(n, "week")}`}
        {...cursorProps}
      >
        {width > 0 ? (
          <svg width={width} height={CHART_H - 52} className="tr-chart" aria-hidden="true">
            {yTicks.map(v => (
              <g key={v}>
                <line className="tr-grid" x1={CM.l} x2={width - CM.r} y1={sy(v)} y2={sy(v)} />
                <text className="tr-tick" x={CM.l - 8} y={sy(v) + 4} textAnchor="end">{formatTick(v)}</text>
              </g>
            ))}
            {ticks.map(t => {
              const x = CM.l + ((t - weeks[0].t) / WEEK_MS) * band + band / 2
              return (
                <text key={t} className="tr-tick" x={x} y={CHART_H - 52 - 8} textAnchor={x < CM.l + 18 ? "start" : x > width - CM.r - 18 ? "end" : "middle"}>
                  {timeLabel(t, step)}
                </text>
              )
            })}
            <line className="tr-axis" x1={CM.l} x2={width - CM.r} y1={baseY} y2={baseY} />
            {weeks.map((wk, i) => {
              const h = wk.total === 0 ? 1.5 : Math.max(2, (wk.total / yMax) * ph)
              return <rect key={wk.t} className="tr-grow" style={cssVars({ "--i": i })} x={CM.l + band * i + 1} y={baseY - h} width={Math.max(1, band - 2)} height={h} rx="1.5" fill="var(--tr-green)" fillOpacity={cursor === i ? 1 : wk.total === 0 ? 0.25 : 0.72} />
            })}
          </svg>
        ) : null}
        <ChartTip tip={tip} width={width} height={CHART_H - 52} />
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-[var(--tr-dim)]">One bar per week, from GitHub’s own weekly commit count on the default branch.</p>
    </div>
  )
}

// ─── The list: board, cards, and what sits under them ───────────────────────
// Board and cards are built from the same parts (rank, avatar and name, language, stars with a bar, growth, forks,
// issues, last push, three actions), so a repository reads the same either way. Only the arrangement differs.

function Flags({ row }: { row: Row }) {
  const isNew = row.ageDays !== null && row.ageDays < 14
  if (!isNew && !row.archived) return null
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {isNew ? <NewTag /> : null}
      {row.archived ? (
        <span className="tr-chip tr-chip--tone" style={cssVars({ "--c": "var(--tr-amber)" })}>
          Archived
        </span>
      ) : null}
    </span>
  )
}

function Count({ icon: Icon, value, label }: { icon: typeof GitFork; value: number; label: string }) {
  return (
    <span className="tr-num inline-flex items-center gap-1.5 text-[13px] text-[var(--tr-fg)]" title={`${grouped(value)} ${label}`}>
      <Icon className="size-3.5 text-[var(--tr-dim)]" aria-hidden="true" />
      {compact(value)}
      <span className="sr-only"> {label}</span>
    </span>
  )
}

function ActivityInline({ pushedAt, now }: { pushedAt: string | null; now: number }) {
  const a = activityOf(pushedAt, now)
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--tr-mut)]" title={pushedAt ? `Last push ${formatDate(Date.parse(pushedAt))}` : "Last push unknown"}>
      <i aria-hidden="true" className="inline-block size-1.5 rounded-[2px]" style={{ background: TONE_VAR[a.tone] }} />
      Updated {timeAgo(pushedAt, now)}
      <span style={{ color: TONE_VAR[a.tone] }}>{a.label}</span>
    </span>
  )
}

interface RowHandlers {
  isSaved: (row: Row) => boolean
  onSave: (row: Row) => void
  onOpen: (row: Row) => void
  onHot: (key: string | null) => void
}

// Details, GitLense and Save. On a card and on a narrow row they carry a word; in the wide board they shrink to icons.
function RowButtons({ row, saved, onSave, onOpen }: { row: Row; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return (
    <>
      <button type="button" className="tr-btn tr-btn--sm tr-act" onClick={onOpen} aria-label={`Open details for ${row.fullName}`} title="Details">
        <PanelRight aria-hidden="true" />
        <span className="tr-act-label">Details</span>
      </button>
      <a className="tr-btn tr-btn--sm tr-act" href={gitlenseHref(row.url)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${row.fullName} in GitLense, new tab`} title="Open in GitLense">
        <Link2 aria-hidden="true" />
        <span className="tr-act-label">GitLense</span>
      </a>
      <button type="button" className="tr-btn tr-btn--sm tr-act" aria-pressed={saved} onClick={onSave} aria-label={saved ? `Remove ${row.fullName} from saved` : `Save ${row.fullName}`} title={saved ? "Saved" : "Save"}>
        <Bookmark className={saved ? "fill-current" : undefined} aria-hidden="true" />
        <span className="tr-act-label">{saved ? "Saved" : "Save"}</span>
      </button>
    </>
  )
}

// ─── Board ──────────────────────────────────────────────────────────────────
const HEAD: ReadonlyArray<{ cls: string; label: string; sort?: SortKey; title?: string }> = [
  { cls: "tr-c-rank", label: "#" },
  { cls: "tr-c-ident", label: "Repository", sort: "name" },
  { cls: "tr-c-lang", label: "Language" },
  { cls: "tr-c-stars", label: "Stars", sort: "stars" },
  { cls: "tr-c-pace", label: "Per day", sort: "pace", title: "Stars gained per day since it was created" },
  { cls: "tr-c-forks", label: "Forks", sort: "forks" },
  { cls: "tr-c-issues", label: "Issues", sort: "issues", title: "Open issues and pull requests" },
  { cls: "tr-c-upd", label: "Updated", sort: "pushed" },
  { cls: "tr-c-acts", label: "" },
]

function Board({
  rows,
  sort,
  dir,
  onSort,
  hotKey,
  flashKey,
  now,
  busy,
  ...handlers
}: {
  rows: Row[]
  sort: SortKey
  dir: Dir
  onSort: (key: SortKey) => void
  hotKey: string | null
  flashKey: string | null
  now: number
  busy: boolean
} & RowHandlers) {
  const max = rows.reduce((m, r) => Math.max(m, r.stars), 0)
  const { isSaved, onSave, onOpen, onHot } = handlers
  return (
    <div className="tr-board tr-panel" role="table" aria-label="Repositories" aria-busy={busy}>
      <div role="rowgroup">
        <div role="row" className="tr-head">
          {HEAD.map(col => (
            <div key={col.cls} role="columnheader" className={col.cls} aria-sort={col.sort && col.sort === sort ? (dir === "asc" ? "ascending" : "descending") : undefined}>
              {col.sort ? (
                <button type="button" className="tr-sort" data-on={col.sort === sort ? "" : undefined} title={col.title ?? `Sort by ${col.label.toLowerCase()}`} onClick={() => onSort(col.sort as SortKey)}>
                  {col.label}
                  {col.sort === sort && dir === "asc" ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
                </button>
              ) : col.label === "" ? (
                <span className="sr-only">Actions</span>
              ) : col.label === "#" ? (
                <span className="text-[12px] font-medium text-[var(--tr-dim)]" aria-label="Rank">
                  #
                </span>
              ) : (
                <span className="text-[12px] font-medium text-[var(--tr-dim)]">{col.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup">
        {rows.map((row, i) => (
          <div
            key={row.key}
            id={rowDomId(row.key)}
            role="row"
            className="tr-row tr-rise"
            style={cssVars({ "--i": i % PAGE_SIZE })}
            data-hot={hotKey === row.key ? "" : undefined}
            data-flash={flashKey === row.key ? "" : undefined}
            onPointerEnter={() => onHot(row.key)}
            onPointerLeave={() => onHot(null)}
            onFocus={() => onHot(row.key)}
            onBlur={() => onHot(null)}
            onClick={e => {
              if (!(e.target as HTMLElement).closest("a,button")) onOpen(row)
            }}
          >
            <div role="cell" className="tr-c-rank tr-num text-[12.5px] text-[var(--tr-dim)]">
              {i + 1}
            </div>
            <div role="cell" className="tr-c-ident">
              <div className="flex w-full min-w-0 items-center gap-3">
                <Avatar src={row.avatar} name={row.owner} size={32} eager={i < 6} />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {/* Only the name is the button, so its label can say exactly what is shown. */}
                    <button type="button" className="tr-f min-w-0 rounded text-left" onClick={() => onOpen(row)} aria-label={`Open details for ${row.fullName}`}>
                      <RepoName owner={row.owner} name={row.name} className="min-w-0" />
                    </button>
                    <Flags row={row} />
                  </span>
                  <span className="tr-ident-desc tr-clamp2 mt-0.5 text-[12.5px] leading-snug text-[var(--tr-dim)]">{row.description || "No description"}</span>
                </span>
              </div>
            </div>
            <div role="cell" className="tr-c-desc text-[13px] leading-snug text-[var(--tr-mut)]">
              <span className="tr-clamp2">{row.description || "No description"}</span>
            </div>
            <div role="cell" className="tr-c-lang">
              <LangTag name={row.language} />
            </div>
            <div role="cell" className="tr-c-stars">
              <StarsFig stars={row.stars} max={max} index={i} />
            </div>
            <div role="cell" className="tr-c-pace">
              <PaceFig pace={row.pace} />
              <span className="block text-[12px] text-[var(--tr-dim)]">over {formatAge(row.ageDays)}</span>
            </div>
            <div role="cell" className="tr-c-forks tr-num text-[13px] text-[var(--tr-fg)]" title={`${grouped(row.forks)} forks`}>
              {compact(row.forks)}
            </div>
            <div role="cell" className="tr-c-issues tr-num text-[13px] text-[var(--tr-fg)]" title={`${grouped(row.issues)} open issues and pull requests`}>
              {compact(row.issues)}
            </div>
            <div role="cell" className="tr-c-upd">
              <ActivityTag pushedAt={row.pushedAt} now={now} />
            </div>
            <div role="cell" className="tr-c-meta">
              <LangTag name={row.language} />
              <Count icon={GitFork} value={row.forks} label="forks" />
              <Count icon={CircleDot} value={row.issues} label="open issues" />
              <span className="tr-num text-[12.5px] text-[var(--tr-mut)]">
                {row.pace === null ? "n/a" : `+${formatPace(row.pace)}/day`} over {formatAge(row.ageDays)}
              </span>
              <ActivityInline pushedAt={row.pushedAt} now={now} />
            </div>
            <div role="cell" className="tr-c-acts">
              <RowButtons row={row} saved={isSaved(row)} onSave={() => onSave(row)} onOpen={() => onOpen(row)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Cards ──────────────────────────────────────────────────────────────────
function Cards({ rows, hotKey, flashKey, now, busy, ...handlers }: { rows: Row[]; hotKey: string | null; flashKey: string | null; now: number; busy: boolean } & RowHandlers) {
  const max = rows.reduce((m, r) => Math.max(m, r.stars), 0)
  const { isSaved, onSave, onOpen, onHot } = handlers
  return (
    <ul className="tr-cards grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }} aria-label="Repositories" aria-busy={busy}>
      {rows.map((row, i) => (
        <li key={row.key} className="flex">
          <article
            id={rowDomId(row.key)}
            className="tr-card tr-rise w-full"
            style={cssVars({ "--i": i % PAGE_SIZE })}
            data-hot={hotKey === row.key ? "" : undefined}
            data-flash={flashKey === row.key ? "" : undefined}
            onPointerEnter={() => onHot(row.key)}
            onPointerLeave={() => onHot(null)}
            onFocus={() => onHot(row.key)}
            onBlur={() => onHot(null)}
            onClick={e => {
              if (!(e.target as HTMLElement).closest("a,button")) onOpen(row)
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={row.avatar} name={row.owner} size={36} eager={i < 6} />
                <span className="min-w-0 flex-1">
                  <button type="button" className="tr-f block max-w-full rounded text-left" onClick={() => onOpen(row)} aria-label={`Open details for ${row.fullName}`}>
                    <RepoName owner={row.owner} name={row.name} />
                  </button>
                  <span className="mt-1 flex min-w-0 items-center gap-2">
                    <Flags row={row} />
                  </span>
                </span>
              </div>
              <span className="tr-num pt-1 text-[12.5px] text-[var(--tr-dim)]" title={`Number ${i + 1} in this list`}>
                #{i + 1}
              </span>
            </div>
            <p className="tr-clamp3 text-[13px] leading-[1.5] text-[var(--tr-mut)] sm:h-[4.5em]">{row.description || "No description"}</p>
            <LangTag name={row.language} />
            <StarsFig stars={row.stars} max={max} index={i} />
            <dl className="grid grid-cols-3 gap-2 border-t border-[var(--tr-line)] pt-3">
              <div className="min-w-0">
                <dt className="tr-label">Per day</dt>
                <dd className="mt-1">
                  <PaceFig pace={row.pace} />
                  <span className="block truncate text-[12px] text-[var(--tr-dim)]">over {formatAge(row.ageDays)}</span>
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="tr-label">Forks</dt>
                <dd className="tr-num mt-1 text-[13px] text-[var(--tr-fg)]">{compact(row.forks)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="tr-label">Issues</dt>
                <dd className="tr-num mt-1 text-[13px] text-[var(--tr-fg)]">{compact(row.issues)}</dd>
              </div>
            </dl>
            <ActivityInline pushedAt={row.pushedAt} now={now} />
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              <RowButtons row={row} saved={isSaved(row)} onSave={() => onSave(row)} onOpen={() => onOpen(row)} />
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

// ─── Loading and ending ─────────────────────────────────────────────────────
function BoardSkeleton() {
  return (
    <div className="tr-panel overflow-hidden" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-[var(--tr-line)] p-4 first:border-t-0">
          <Skel className="h-4 w-5" />
          <Skel className="size-8 !rounded-[7px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skel className="h-3.5 w-2/5" />
            <Skel className="h-3 w-4/5" />
          </div>
          <Skel className="hidden h-4 w-24 sm:block" />
          <Skel className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 320px), 1fr))" }} aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="tr-card">
          <div className="flex items-center gap-3">
            <Skel className="size-9 !rounded-[7px]" />
            <Skel className="h-4 w-3/5" />
          </div>
          <Skel className="h-3 w-full" />
          <Skel className="h-3 w-4/5" />
          <Skel className="h-4 w-1/3" />
          <Skel className="h-8 w-full" />
        </div>
      ))}
    </div>
  )
}

// The button that fetches the next page. Under it: how many are shown, or why the list ends.
function LoadMore({ shown, hasMore, loading, error, page, onMore }: { shown: number; hasMore: boolean; loading: boolean; error: FailureInfo | null; page: number; onMore: () => void }) {
  if (error) return <div className="mt-4"><ErrorBox error={error} onRetry={onMore} title="Couldn’t load more" compactMode /></div>
  return (
    <div className="mt-6 flex flex-col items-center gap-3 text-center">
      {hasMore ? (
        <button type="button" className="tr-btn tr-btn--primary !h-11 min-w-[220px] !px-6 !text-[14px]" onClick={onMore} disabled={loading} aria-busy={loading}>
          {loading ? <Spinner size={16} /> : <ChevronDown aria-hidden="true" />}
          {loading ? "Loading" : "Load more"}
        </button>
      ) : null}
      <p className="max-w-md text-[12.5px] leading-relaxed text-[var(--tr-dim)]" role="status" aria-live="polite">
        {hasMore
          ? `${plural(shown, "repository", "repositories")} shown`
          : page >= MAX_PAGE
            ? `${plural(shown, "repository", "repositories")} shown. GitHub only returns the first 1,000 results of a search, so this is the end of the list.`
            : `${plural(shown, "repository", "repositories")} shown. That is everything GitHub returned for this list.`}
      </p>
    </div>
  )
}

function EmptyFilters({ onReset }: { onReset: () => void }) {
  return (
    <Empty
      icon={<SlidersHorizontal className="size-4" aria-hidden="true" />}
      title="No repositories match these filters"
      action={
        <button type="button" className="tr-btn mt-1" onClick={onReset}>
          <RotateCcw aria-hidden="true" /> Reset filters
        </button>
      }
    >
      Try a lower minimum star count, a longer time window or another language.
    </Empty>
  )
}

function EmptySearch({ query, onBack }: { query: string; onBack: () => void }) {
  return (
    <Empty
      icon={<Search className="size-4" aria-hidden="true" />}
      title={`No repositories match “${query}”`}
      action={
        <button type="button" className="tr-btn mt-1" onClick={onBack}>
          Back to trending
        </button>
      }
    >
      Check the spelling or try fewer words.
    </Empty>
  )
}

// ─── Repository details ─────────────────────────────────────────────────────
// A panel that slides over the list. The header and the figures come from the row you opened and fill in as GitHub
// answers; a link to ?repo=owner/name opens the same panel with nothing loaded yet. The README sections are text read
// out of the repository's README by rules (see readme-insight.ts), each with the heading it came from. Nothing is written
// for the reader and no model is involved.

const TABS: ReadonlyArray<{ value: TabKey; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "growth", label: "Growth" },
  { value: "issues", label: "Issues" },
  { value: "start", label: "Start" },
]

interface PartState<T> {
  data: T | null
  error: FeedError | null
  loading: boolean
  reload: () => void
}

// A GitHub label colour is six hex digits; dark ones are lifted so the swatch shows on a dark page.
function labelColor(color: string): string {
  const hex = color.replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#8a8a8a"
  const n = Number.parseInt(hex, 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  const lum = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
  const [r, g, b] = lum < 120 ? channels.map(c => Math.round(c + (255 - c) * 0.55)) : channels
  return `rgb(${r}, ${g}, ${b})`
}

const formatShare = (share: number) => (share < 0.001 ? "<0.1%" : `${(share * 100).toFixed(share < 0.1 ? 1 : 0)}%`)

// A timestamp from GitHub, or null when it is missing or unreadable.
function validTime(iso: string | null | undefined): number | null {
  const t = iso ? Date.parse(iso) : Number.NaN
  return Number.isFinite(t) ? t : null
}

// A GithubRepo for a repository opened by link, so it can be saved like any other.
function repoFromInsight(repo: Insight["repo"]): GithubRepo {
  return {
    fullName: repo.fullName,
    name: repo.fullName.split("/")[1] ?? repo.fullName,
    owner: { login: repo.owner.login, avatarUrl: repo.owner.avatarUrl },
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    createdAt: repo.createdAt,
    pushedAt: repo.pushedAt,
    language: repo.language ?? undefined,
    topics: repo.topics,
    description: repo.description,
    htmlUrl: `https://github.com/${repo.fullName}`,
  }
}

function Block({ title, from, children, i = 0 }: { title: string; from?: string; children: ReactNode; i?: number }) {
  return (
    <section className="tr-rise min-w-0" style={cssVars({ "--i": i })}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="tr-title">{title}</h3>
        {from ? (
          <span className="min-w-0 truncate text-[12px] text-[var(--tr-dim)]" title={`Read from the README section “${from}”`}>
            From “{from}”
          </span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((text, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-[1.55] text-[var(--tr-body)]">
          <i aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-[2px] bg-[var(--tr-lime)]" />
          <span className="min-w-0 break-words">{text}</span>
        </li>
      ))}
    </ul>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-[var(--tr-line)] py-2.5">
      <dt className="tr-label">{label}</dt>
      <dd className="mt-0.5 min-w-0 break-words text-[13.5px] text-[var(--tr-fg)]">{children}</dd>
    </div>
  )
}

function ExternalA({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? "tr-link"}>
      {children}
    </a>
  )
}

function LanguageBreakdown({ languages }: { languages: Insight["languages"] }) {
  const total = languages.reduce((s, l) => s + l.bytes, 0)
  if (total === 0) return <p className="text-[13px] text-[var(--tr-mut)]">GitHub reports no language data for this repository.</p>
  const list = languages.map(l => ({ ...l, share: l.bytes / total }))
  return (
    <div>
      <div className="tr-wipe flex h-2.5 gap-[2px]" role="img" aria-label={`Languages by size: ${list.map(l => `${l.name} ${formatShare(l.share)}`).join(", ")}`}>
        {list.map(l => (
          <span key={l.name} className="h-full min-w-[3px] rounded-[2px]" style={{ flexGrow: Math.max(l.share, 0.01), flexBasis: 0, background: langColor(l.name) }} title={`${l.name}: ${formatShare(l.share)}`} />
        ))}
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {list.map(l => (
          <li key={l.name} className="flex items-center gap-2.5 py-1 text-[13px] text-[var(--tr-mut)]">
            <LangLogo name={l.name} size={16} />
            <span className="min-w-0 flex-1 truncate">{l.name}</span>
            <span className="tr-num text-[var(--tr-fg)]">{formatShare(l.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Overview ───────────────────────────────────────────────────────────────
function OverviewSkeleton() {
  return (
    <div className="space-y-7" aria-hidden="true">
      <div className="space-y-2">
        <Skel className="h-4 w-24" />
        <Skel className="h-3.5 w-full" />
        <Skel className="h-3.5 w-11/12" />
        <Skel className="h-3.5 w-3/5" />
      </div>
      <div className="space-y-2">
        <Skel className="h-4 w-32" />
        <Skel className="h-3.5 w-full" />
        <Skel className="h-3.5 w-4/5" />
      </div>
      <div className="space-y-2">
        <Skel className="h-4 w-28" />
        <Skel className="h-2.5 w-full" />
        <Skel className="h-3.5 w-1/2" />
      </div>
    </div>
  )
}

function OverviewTab({ insight, fallbackDescription, now }: { insight: Insight; fallbackDescription: string; now: number }) {
  const { repo, readme, languages, contributors, release, partial } = insight
  const url = `https://github.com/${repo.fullName}`
  const summary = readme?.summary || repo.description || fallbackDescription
  const activity = activityOf(repo.pushedAt, now)
  const createdT = validTime(repo.createdAt)
  const pushedT = validTime(repo.pushedAt)
  const releaseT = validTime(release?.publishedAt)
  const stack = readme?.stack ?? []
  let order = 0
  return (
    <div className="space-y-8">
      <Block title="What it is" from={readme?.summary ? "README intro" : undefined} i={order++}>
        {summary ? <p className="tr-prose break-words">{summary}</p> : <p className="text-[13.5px] text-[var(--tr-mut)]">This repository has no description and no README that could be read.</p>}
        {partial.includes("readme") ? <p className="mt-2 text-[12.5px] text-[var(--tr-rose)]">The README couldn’t be read just now, so only the description is shown.</p> : null}
      </Block>

      {readme?.why ? (
        <Block title="Why it exists" from={readme.why.from} i={order++}>
          <p className="tr-prose break-words">{readme.why.text}</p>
        </Block>
      ) : null}

      {readme?.useCases ? (
        <Block title="Where you could use it" from={readme.useCases.from} i={order++}>
          <Bullets items={readme.useCases.items} />
        </Block>
      ) : null}

      {readme?.features ? (
        <Block title="What it can do" from={readme.features.from} i={order++}>
          <Bullets items={readme.features.items} />
        </Block>
      ) : null}

      <Block title="Built with" i={order++}>
        <LanguageBreakdown languages={languages} />
        {stack.length > 0 ? (
          <div className="mt-4">
            <div className="mb-2 text-[12px] text-[var(--tr-dim)]">Tools the README names</div>
            <ul className="flex flex-wrap gap-2">
              {stack.map(name => (
                <li key={name} className="tr-chip !h-7 !gap-2 !px-2.5 !text-[12.5px] !text-[var(--tr-fg)]">
                  <LangLogo name={name} size={14} />
                  {name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Block>

      {repo.topics.length > 0 ? (
        <Block title="Topics" i={order++}>
          <ul className="flex flex-wrap gap-2">
            {repo.topics.map(topic => (
              <li key={topic}>
                <ExternalA href={`https://github.com/topics/${encodeURIComponent(topic)}`} className="tr-chip transition-colors hover:border-[var(--tr-line3)] hover:text-[var(--tr-fg)]">
                  {topic}
                </ExternalA>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="At a glance" i={order++}>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <Fact label="Created">
            {createdT === null ? (
              "Unknown"
            ) : (
              <>
                {formatDate(createdT)} <span className="text-[var(--tr-dim)]">({formatAge((now - createdT) / DAY_MS)} ago)</span>
              </>
            )}
          </Fact>
          <Fact label="Last push">
            {pushedT === null ? (
              "Unknown"
            ) : (
              <>
                {formatDate(pushedT)}{" "}
                <span style={{ color: TONE_VAR[activity.tone] }}>
                  {timeAgo(repo.pushedAt, now)}, {activity.label.toLowerCase()}
                </span>
              </>
            )}
          </Fact>
          <Fact label="Default branch">
            <span className="tr-mono text-[12.5px]">{repo.defaultBranch || "unknown"}</span>
          </Fact>
          <Fact label="Size on disk">{formatBytes(repo.sizeKb)}</Fact>
          <Fact label="License">{repo.license ?? "None declared"}</Fact>
          <Fact label="Homepage">{repo.homepage ? <ExternalA href={repo.homepage}>{repo.homepage.replace(/^https?:\/\//, "").replace(/\/$/, "")}</ExternalA> : "None"}</Fact>
          <Fact label="Latest release">
            {release ? (
              <ExternalA href={release.url}>
                {release.tag}
                {release.prerelease ? " (pre-release)" : ""}
              </ExternalA>
            ) : (
              "None published"
            )}
            {releaseT !== null ? <span className="text-[var(--tr-dim)]"> {formatDate(releaseT)}</span> : null}
          </Fact>
          <Fact label="Discussions">{repo.hasDiscussions ? <ExternalA href={`${url}/discussions`}>Open on GitHub</ExternalA> : "Not enabled"}</Fact>
        </dl>
      </Block>

      {contributors.length > 0 ? (
        <Block title="Top contributors" i={order++}>
          <ul className="flex flex-wrap gap-2">
            {contributors.map(c => (
              <li key={c.login}>
                <ExternalA href={`https://github.com/${encodeURIComponent(c.login)}`} className="tr-chip-btn !h-8 !gap-2 !pl-1.5 !pr-2.5">
                  <Avatar src={c.avatarUrl} name={c.login} size={20} />
                  {c.login}
                  <span className="tr-num text-[12px] text-[var(--tr-dim)]" title={`${grouped(c.contributions)} contributions`}>
                    {compact(c.contributions)}
                  </span>
                </ExternalA>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <p className="border-t border-[var(--tr-line)] pt-4 text-[12px] leading-relaxed text-[var(--tr-dim)]">
        Sections marked “From” are the repository’s own README text, picked out by heading. Nothing here is generated.
      </p>
    </div>
  )
}

// ─── Growth ─────────────────────────────────────────────────────────────────
function GrowthTab({ part, createdAt, now }: { part: PartState<History>; createdAt: string; now: number }) {
  if (part.error) return <ErrorBox error={part.error} onRetry={part.reload} title="Couldn’t load the history" compactMode />
  if (!part.data) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skel key={i} className="h-[74px] !rounded-lg" />
          ))}
        </div>
        <Skel className="h-[248px] !rounded-lg" />
        <p className="text-[12.5px] text-[var(--tr-dim)]">Reading GitHub’s star list. A large repository can take a few seconds.</p>
      </div>
    )
  }
  const { starHistory, commitActivity, partial } = part.data
  return (
    <div className="space-y-9">
      <section className="tr-rise">
        {starHistory ? (
          <StarHistoryChart history={starHistory} createdAt={createdAt} now={now} />
        ) : (
          <p className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-6 text-center text-[13px] text-[var(--tr-mut)]">
            {partial.includes("stars") ? "GitHub wouldn’t return this repository’s stars just now. Try again in a moment." : "This repository has no stars yet."}
          </p>
        )}
      </section>
      <section className="tr-rise" style={cssVars({ "--i": 2 })}>
        {commitActivity ? (
          <CommitChart data={commitActivity} onRetry={part.reload} />
        ) : (
          <p className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-6 text-center text-[13px] text-[var(--tr-mut)]">GitHub wouldn’t return commit activity just now. Try again in a moment.</p>
        )}
      </section>
    </div>
  )
}

// ─── Issues ─────────────────────────────────────────────────────────────────
function IssueRow({ issue, now }: { issue: InsightIssue; now: number }) {
  return (
    <li className="tr-issue">
      <div className="min-w-0">
        <ExternalA href={issue.url} className="tr-link block break-words text-[13.5px] font-medium leading-snug">
          <span className="tr-num text-[var(--tr-dim)]">#{issue.number}</span> {issue.title}
        </ExternalA>
        {issue.labels.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-1.5">
            {issue.labels.slice(0, 4).map(label => (
              <span key={label.name} className="tr-chip !h-[22px] !text-[12px]">
                <i aria-hidden="true" className="inline-block size-2 shrink-0 rounded-[2px]" style={{ background: labelColor(label.color) }} />
                <span className="max-w-[160px] truncate">{label.name}</span>
              </span>
            ))}
          </span>
        ) : null}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--tr-dim)]">
          <span>
            Opened {timeAgo(issue.createdAt, now)} by {issue.author || "someone"}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" aria-hidden="true" />
            {issue.comments}
            <span className="sr-only"> comments</span>
          </span>
        </span>
      </div>
      <div className="flex shrink-0 items-start gap-1.5">
        <a className="tr-btn tr-btn--sm" href={gitlenseHref(issue.url)} target="_blank" rel="noopener noreferrer" aria-label={`Open issue ${issue.number} in GitLense, new tab`}>
          <Link2 aria-hidden="true" /> GitLense
        </a>
        <a className="tr-btn tr-btn--sm tr-btn--icon" href={issue.url} target="_blank" rel="noopener noreferrer" aria-label={`Open issue ${issue.number} on GitHub, new tab`} title="Open on GitHub">
          <ExternalLink aria-hidden="true" />
        </a>
      </div>
    </li>
  )
}

function IssueList({ title, hint, issues, empty, now, i }: { title: string; hint?: string; issues: InsightIssue[]; empty: string; now: number; i: number }) {
  return (
    <section className="tr-rise min-w-0" style={cssVars({ "--i": i })}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="tr-title">{title}</h3>
        {hint ? <span className="text-[12px] text-[var(--tr-dim)]">{hint}</span> : null}
      </div>
      {issues.length > 0 ? (
        <ul className="tr-panel overflow-hidden">
          {issues.map(issue => (
            <IssueRow key={issue.number} issue={issue} now={now} />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-5 text-[13px] text-[var(--tr-mut)]">{empty}</p>
      )}
    </section>
  )
}

function IssuesTab({ insight, now }: { insight: Insight; now: number }) {
  const { repo, issues, partial } = insight
  const url = `https://github.com/${repo.fullName}`
  return (
    <div className="space-y-8">
      <div className="tr-rise flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tr-line2)] bg-[var(--tr-s1)] p-4">
        <div className="min-w-0">
          <div className="tr-num text-[22px] font-semibold leading-none text-[var(--tr-fg)]">{grouped(repo.openIssues)}</div>
          <div className="mt-1.5 text-[12.5px] text-[var(--tr-mut)]">open issues and pull requests</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExternalA href={`${url}/issues`} className="tr-btn">
            <ExternalLink aria-hidden="true" /> All issues on GitHub
          </ExternalA>
          <a className="tr-btn tr-btn--primary whitespace-nowrap" href={gitlenseHref(url)} target="_blank" rel="noopener noreferrer">
            <Link2 aria-hidden="true" /> Open repository in GitLense
          </a>
        </div>
      </div>
      {partial.includes("issues") ? <p className="text-[12.5px] text-[var(--tr-rose)]">GitHub wouldn’t return the issue lists just now. Some may be missing.</p> : null}
      <IssueList title="Good first issues" hint="Labelled “good first issue”" issues={issues.goodFirst} empty="No open issue carries the “good first issue” label." now={now} i={1} />
      <IssueList title="Recent issues" hint="Newest first, pull requests left out" issues={issues.recent} empty="There are no open issues." now={now} i={2} />
    </div>
  )
}

// ─── Start ──────────────────────────────────────────────────────────────────
function CommandLine({ line }: { line: string }) {
  return (
    <div className="relative">
      <code className="tr-cmd tr-scroll">
        <span aria-hidden="true" className="select-none text-[var(--tr-dim)]">$ </span>
        {line}
      </code>
      <CopyButton text={line} label="Copy command" className="absolute right-1.5 top-1/2 -translate-y-1/2" />
    </div>
  )
}

function StartTab({ insight }: { insight: Insight }) {
  const { repo, readme, release } = insight
  const url = `https://github.com/${repo.fullName}`
  const start = readme?.start
  const links: Array<{ label: string; href: string }> = [
    ...(repo.homepage ? [{ label: "Homepage", href: repo.homepage }] : []),
    { label: "README on GitHub", href: `${url}#readme` },
    ...(release ? [{ label: `Latest release ${release.tag}`, href: release.url }] : []),
    { label: "Contribution graph", href: `${url}/graphs/contributors` },
  ]
  return (
    <div className="space-y-8">
      <Block title="Run it" from={start?.from} i={0}>
        {start ? (
          <div className="space-y-2">
            {start.lines.map((line, i) => (
              <CommandLine key={`${i}-${line}`} line={line} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--tr-line)] bg-[var(--tr-s1)] px-4 py-5 text-[13px] leading-relaxed text-[var(--tr-mut)]">
            The README has no install or quick start section whose commands could be read. Open it on GitHub for the steps.
          </p>
        )}
      </Block>

      <Block title="Links" i={1}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map(link => (
            <li key={link.label}>
              <ExternalA href={link.href} className="tr-opt !min-h-[40px] text-[13px] text-[var(--tr-fg)]">
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-[var(--tr-dim)]" aria-hidden="true" />
              </ExternalA>
            </li>
          ))}
        </ul>
      </Block>

      {readme && readme.outline.length > 0 ? (
        <Block title="In the README" i={2}>
          <ol className="columns-1 gap-8 text-[13px] text-[var(--tr-mut)] sm:columns-2">
            {readme.outline.slice(0, 16).map((heading, i) => (
              <li key={`${i}-${heading}`} className="break-inside-avoid truncate py-1" title={heading}>
                {heading}
              </li>
            ))}
          </ol>
        </Block>
      ) : null}
    </div>
  )
}

// ─── The panel ──────────────────────────────────────────────────────────────
function DetailsSheet({
  fullName,
  tab,
  onTab,
  onClose,
  rows,
  now,
  isSaved,
  onSave,
  onNavigate,
}: {
  fullName: string
  tab: TabKey
  onTab: (tab: TabKey) => void
  onClose: () => void
  rows: Row[]
  now: number
  isSaved: (repo: GithubRepo) => boolean
  onSave: (repo: GithubRepo) => void
  onNavigate: (fullName: string) => void
}) {
  const open = fullName !== ""
  // The last repository stays in place while the panel slides out, so it never flashes empty.
  const [shown, setShown] = useState(fullName)
  if (fullName && fullName !== shown) setShown(fullName)
  const name = fullName || shown

  const idBase = useId()
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const hasMounted = useHasMounted()
  const core = useRepoPart<Insight>(insightCache, "core", name, open)
  const history = useRepoPart<History>(historyCache, "history", name, open && tab === "growth")

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [tab, name])

  const index = rows.findIndex(r => r.fullName.toLowerCase() === name.toLowerCase())
  const row = index >= 0 ? rows[index] : null
  const insight = core.data
  const repo = insight?.repo ?? null
  const [owner = "", repoName = ""] = name.split("/")
  const url = `https://github.com/${name}`
  const description = repo?.description ?? row?.description ?? ""
  const language = repo?.language ?? row?.language ?? null
  const license = repo?.license ?? row?.license ?? null
  const archived = repo?.archived ?? row?.archived ?? false
  const pushedAt = repo?.pushedAt ?? row?.pushedAt ?? null
  const createdAt = repo?.createdAt ?? row?.createdAt ?? ""
  const stars = repo?.stars ?? row?.stars ?? null
  const forks = repo?.forks ?? row?.forks ?? null
  const issueCount = repo?.openIssues ?? row?.issues ?? null
  const createdT = validTime(createdAt)
  const ageDays = createdT === null ? null : Math.max(1, (now - createdT) / DAY_MS)
  const saveTarget = row?.repo ?? (repo ? repoFromInsight(repo) : null)
  const saved = saveTarget ? isSaved(saveTarget) : false
  const shareUrl = hasMounted ? window.location.href : ""
  const activity = pushedAt ? activityOf(pushedAt, now) : null

  const go = (delta: number) => {
    const target = rows[index + delta]
    if (target) onNavigate(target.fullName)
  }

  return (
    <Sheet open={open} onOpenChange={next => !next && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="tr-root tr-sheet gap-0 border-[var(--tr-line2)] bg-[var(--tr-bg)] p-0 text-[var(--tr-fg)]"
        style={{ width: "min(100vw, 780px)", maxWidth: "none" }}
        onOpenAutoFocus={e => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).focus()
        }}
        // Nothing here is a trigger the dialog could return to, so focus goes back to the row that was open.
        onCloseAutoFocus={e => {
          const label = `Open details for ${name}`.toLowerCase()
          const target = Array.from(document.querySelectorAll<HTMLElement>("button[aria-label^='Open details for ']")).find(b => b.getAttribute("aria-label")?.toLowerCase() === label)
          if (target) {
            e.preventDefault()
            target.focus()
          }
        }}
      >
        <SheetHeader className="gap-0 p-0">
          <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
            <Avatar src={row?.avatar ?? repo?.owner.avatarUrl ?? ""} name={owner} size={44} eager />
            <div className="min-w-0 flex-1">
              <SheetTitle className="min-w-0 text-[18px] font-normal leading-tight tracking-tight [overflow-wrap:anywhere]">
                <span className="text-[var(--tr-dim)]">{owner}/</span>
                <wbr />
                <span className="font-semibold text-[var(--tr-fg)]">{repoName}</span>
              </SheetTitle>
              <SheetDescription className="tr-clamp2 mt-1 text-[13.5px] leading-snug text-[var(--tr-mut)]">{description || (core.loading ? "Loading" : "No description")}</SheetDescription>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" className="tr-btn tr-btn--ghost tr-btn--icon tr-btn--sm" onClick={() => go(-1)} disabled={index <= 0} aria-label="Previous repository" title="Previous in the list">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" className="tr-btn tr-btn--ghost tr-btn--icon tr-btn--sm" onClick={() => go(1)} disabled={index < 0 || index >= rows.length - 1} aria-label="Next repository" title="Next in the list">
                <ChevronRight aria-hidden="true" />
              </button>
              <SheetClose asChild>
                <button type="button" className="tr-btn tr-btn--ghost tr-btn--icon tr-btn--sm" aria-label="Close details">
                  <X aria-hidden="true" />
                </button>
              </SheetClose>
            </div>
          </div>

          {/* Language, licence and activity are all in the Overview tab too, so a phone leaves them out of the header. */}
          <div className="hidden flex-wrap items-center gap-2 px-4 sm:flex sm:px-6">
            {language ? (
              <span className="tr-chip !h-7 !gap-2 !px-2.5 !text-[12.5px] !text-[var(--tr-fg)]">
                <LangLogo name={language} size={14} />
                {language}
              </span>
            ) : null}
            {license ? (
              <span className="tr-chip !h-7 !px-2.5 !text-[12.5px]">
                <Scale className="size-3.5" aria-hidden="true" />
                {license}
              </span>
            ) : null}
            {activity ? (
              <span className="tr-chip tr-chip--tone !h-7 !px-2.5 !text-[12.5px]" style={cssVars({ "--c": TONE_VAR[activity.tone] })}>
                {activity.label}, pushed {timeAgo(pushedAt, now)}
              </span>
            ) : null}
            {archived ? (
              <span className="tr-chip tr-chip--tone !h-7 !px-2.5 !text-[12.5px]" style={cssVars({ "--c": "var(--tr-amber)" })}>
                Archived
              </span>
            ) : null}
            {repo?.isFork ? <span className="tr-chip !h-7 !px-2.5 !text-[12.5px]">Fork</span> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-3 sm:px-6">
            <a className="tr-btn tr-btn--primary whitespace-nowrap" href={gitlenseHref(url)} target="_blank" rel="noopener noreferrer">
              <Link2 aria-hidden="true" /> Open in GitLense
            </a>
            <ExternalA href={url} className="tr-btn max-sm:!w-10 max-sm:!px-0">
              <ExternalLink aria-hidden="true" /> <span className="max-sm:sr-only">GitHub</span>
            </ExternalA>
            <button type="button" className="tr-btn max-sm:!w-10 max-sm:!px-0" aria-pressed={saved} disabled={!saveTarget} onClick={() => saveTarget && onSave(saveTarget)}>
              <Bookmark className={saved ? "fill-current" : undefined} aria-hidden="true" /> <span className="max-sm:sr-only">{saved ? "Saved" : "Save"}</span>
            </button>
            <CopyButton text={shareUrl} label="Copy link to this panel" size="md" />
          </div>

          <div className="border-b border-[var(--tr-line)] px-2 sm:px-4">
            <div role="tablist" aria-label="Repository details" className="tr-tabs" onKeyDown={rovingKeyDown}>
              {TABS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  id={`${idBase}-tab-${t.value}`}
                  aria-selected={tab === t.value}
                  aria-controls={`${idBase}-panel-${t.value}`}
                  tabIndex={tab === t.value ? 0 : -1}
                  data-roving=""
                  className="tr-tab"
                  onClick={() => onTab(t.value)}
                >
                  {t.label}
                  {t.value === "issues" && issueCount !== null ? <span className="tr-num ml-1.5 text-[12px] text-[var(--tr-dim)]">{compact(issueCount)}</span> : null}
                </button>
              ))}
            </div>
          </div>
        </SheetHeader>

        <div
          ref={bodyRef}
          role="tabpanel"
          id={`${idBase}-panel-${tab}`}
          aria-labelledby={`${idBase}-tab-${tab}`}
          tabIndex={0}
          className="tr-scroll tr-f min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
        >
          {tab === "overview" ? (
            <div className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Stars" value={stars ?? 0} format={n => grouped(n)} text={stars === null ? "…" : undefined} detail={ageDays === null || stars === null ? "" : `+${formatPace(stars / ageDays)}/day on average`} />
              <StatTile label="Forks" value={forks ?? 0} format={n => grouped(n)} text={forks === null ? "…" : undefined} detail="copies made" />
              <StatTile label="Watchers" value={repo?.watchers ?? 0} format={n => grouped(n)} text={repo ? undefined : "…"} detail="following updates" />
              <StatTile label="Open issues" value={issueCount ?? 0} format={n => grouped(n)} text={issueCount === null ? "…" : undefined} detail="includes pull requests" />
            </div>
          ) : null}

          {tab === "growth" ? (
            <GrowthTab key={name} part={history} createdAt={createdAt} now={now} />
          ) : core.error ? (
            <ErrorBox error={core.error} onRetry={core.reload} title={core.error.status === 404 ? "Repository not found" : undefined} compactMode />
          ) : !insight ? (
            <OverviewSkeleton />
          ) : tab === "overview" ? (
            <OverviewTab key={name} insight={insight} fallbackDescription={row?.description ?? ""} now={now} />
          ) : tab === "issues" ? (
            <IssuesTab key={name} insight={insight} now={now} />
          ) : (
            <StartTab key={name} insight={insight} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────
function TrendingPageContent() {
  const hasMounted = useHasMounted()
  const [params, setParams] = useTrendingParams()
  const { mode, windowKey, language, stars, pushed, hideArchived, sort, dir, view, q, repo, tab } = params
  const searching = q !== ""

  const filters: ListFilters = { mode, windowKey, language, stars, pushed, hideArchived }
  const list = useRepoList({ enabled: hasMounted, filters, q })

  // One reading of the clock per visit, so every "3h ago" on the page agrees.
  const [now] = useState(() => Date.now())
  const { isSaved, toggle } = useBookmarks()
  const [hotKey, setHotKey] = useState<string | null>(null)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  // null = follow the screen size (open from 768px, folded on phones); a boolean = the visitor chose.
  const [overviewChoice, setOverviewChoice] = useState<boolean | null>(null)
  const isWide = useMediaQuery("(min-width: 768px)")
  const overviewOpen = overviewChoice ?? isWide
  const showBackToTop = useScrolledPast(720)

  // "/" jumps to the search box, as on GitHub. Ignored while typing in a field and while a panel is open.
  useEffect(() => {
    if (repo) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest('[role="dialog"],[role="menu"],[role="listbox"],[aria-modal="true"]'))) return
      e.preventDefault()
      document.getElementById(SEARCH_INPUT_ID)?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [repo])

  // ─── What is on the board ────────────────────────────────────────────────
  // GitHub can return the same repository on two pages when ranks shift between requests, so duplicates are dropped.
  const rows = useMemo(() => {
    const seen = new Set<string>()
    const unique: Row[] = []
    for (const item of list.repos) {
      const row = toRow(item, now)
      if (!row.fullName || seen.has(row.key)) continue
      seen.add(row.key)
      unique.push(row)
    }
    return sortRows(unique, sort, dir)
  }, [list.repos, now, sort, dir])

  const initialLoading = list.loading && rows.length === 0
  const listError = list.error
  const empty = !list.loading && !listError && list.page > 0 && rows.length === 0

  // ─── Filters ─────────────────────────────────────────────────────────────
  // A search looks through every public repository, so only the language filter applies to it.
  const effective: ListFilters = searching ? { ...DEFAULT_FILTERS, language } : filters
  const activeCount =
    (effective.mode !== DEFAULT_PARAMS.mode ? 1 : 0) +
    (effective.mode === "recent" && effective.windowKey !== DEFAULT_PARAMS.windowKey ? 1 : 0) +
    (effective.language ? 1 : 0) +
    (effective.stars ? 1 : 0) +
    (effective.pushed ? 1 : 0) +
    (effective.hideArchived ? 1 : 0)
  const resetFilters = () => setParams(searching ? { language: "" } : { ...DEFAULT_FILTERS })
  const changeFilters = (patch: Partial<ListFilters>) => setParams(patch)

  // ─── Opening a repository ────────────────────────────────────────────────
  const openByName = useCallback((fullName: string) => setParams({ repo: fullName, tab: "overview" }), [setParams])
  const openRow = useCallback((row: Row) => openByName(row.fullName), [openByName])
  const openByKey = useCallback(
    (key: string) => {
      const row = rows.find(r => r.key === key)
      if (row) openByName(row.fullName)
    },
    [rows, openByName]
  )
  const closeDetails = useCallback(() => {
    const row = rows.find(r => r.fullName.toLowerCase() === repo.toLowerCase())
    setParams({ repo: "", tab: "overview" })
    // The row you came from lights up for a moment, so you can find your place again.
    if (row) {
      setFlashKey(row.key)
      window.setTimeout(() => setFlashKey(current => (current === row.key ? null : current)), 1400)
    }
  }, [rows, repo, setParams])

  const sortBy = (key: SortKey) => (key === sort ? setParams({ dir: dir === "desc" ? "asc" : "desc" }) : setParams({ sort: key, dir: defaultDir(key) }))

  // ─── Words ───────────────────────────────────────────────────────────────
  const modeLabel = MODES.find(m => m.value === mode)?.label ?? ""
  const windowLabel = WINDOWS.find(w => w.value === windowKey)?.label ?? ""
  const scope = `${modeLabel}${mode === "recent" ? `, created in the last ${windowLabel}` : ""}${language ? `, ${language}` : ""}`

  const filtersButton = (
    <button type="button" className="tr-btn tr-xl-hide">
      <SlidersHorizontal aria-hidden="true" />
      Filters
      {activeCount > 0 ? (
        <span className="tr-num rounded-[4px] bg-[var(--tr-lime)] px-1.5 py-0.5 text-[12px] font-semibold leading-none text-[var(--tr-lime-ink)]">
          {activeCount}
          <span className="sr-only"> active</span>
        </span>
      ) : null}
    </button>
  )

  return (
    <div className="tr-root relative isolate min-h-screen overflow-x-clip bg-[var(--tr-bg)] text-[var(--tr-fg)] antialiased [color-scheme:dark]">
      <Navbar />
      <div className="tr-sky" aria-hidden="true" />

      <main className="tr-frame relative mx-auto w-full max-w-[1440px] px-4 pb-28 pt-24 sm:px-6 lg:px-8 xl:pb-20">
        <Hero committed={q} language={language} onCommit={next => setParams({ q: next })} onOpenRepo={openByName} />

        <div className="relative -mx-4 h-0 sm:-mx-6 lg:-mx-8" aria-hidden="true">
          <span className="tr-edge" />
          <span className="tr-cross" style={{ left: -6, top: -6 }} />
          <span className="tr-cross" style={{ right: -6, top: -6 }} />
        </div>

        <div className="pt-8 xl:grid xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-8">
          <aside className="hidden xl:sticky xl:top-20 xl:block xl:self-start" aria-label="Filters">
            <div className="tr-panel tr-scroll max-h-[calc(100dvh-6.5rem)] overflow-y-auto p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="tr-title">Filters</h2>
                <button type="button" className="tr-btn tr-btn--ghost tr-btn--sm" onClick={resetFilters} disabled={activeCount === 0}>
                  <RotateCcw aria-hidden="true" /> Reset
                </button>
              </div>
              <FilterPanel values={filters} onChange={changeFilters} searchActive={searching} />
            </div>
          </aside>

          <section aria-labelledby="trending-results-heading" className="min-w-0">
            <h2 id="trending-results-heading" className="sr-only">
              {searching ? "Search results" : "Trending repositories"}
            </h2>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 basis-full truncate text-[13px] text-[var(--tr-mut)] sm:basis-0" role="status" aria-live="polite">
                {initialLoading ? (
                  "Loading repositories"
                ) : searching ? (
                  <>
                    Results for <span className="text-[var(--tr-fg)]">“{q}”</span>
                    {language ? ` in ${language}` : ""}
                    {rows.length > 0 ? ` · ${plural(rows.length, "repository", "repositories")} loaded` : ""}
                  </>
                ) : (
                  <>
                    <span className="text-[var(--tr-fg)]">{scope}</span>
                    {rows.length > 0 ? ` · ${plural(rows.length, "repository", "repositories")} loaded` : ""}
                  </>
                )}
              </p>
              {searching ? (
                <button type="button" className="tr-btn" onClick={() => setParams({ q: "" })}>
                  <ChevronLeft aria-hidden="true" /> Back to trending
                </button>
              ) : null}
              <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} trigger={filtersButton} values={filters} onChange={changeFilters} onReset={resetFilters} canReset={activeCount > 0} searchActive={searching} />
              <SortMenu sort={sort} dir={dir} onChange={patch => setParams(patch)} partial={list.hasMore} />
              <ViewToggle view={view} onChange={next => setParams({ view: next })} />
            </div>

            <ActiveFilters values={effective} onChange={changeFilters} onReset={resetFilters} />

            <Overview
              rows={rows}
              loading={initialLoading}
              open={overviewOpen}
              onToggle={() => setOverviewChoice(!overviewOpen)}
              now={now}
              hotKey={hotKey}
              onHot={setHotKey}
              onOpen={openByKey}
              language={language}
              canPick
              onPickLanguage={next => setParams({ language: next })}
            />

            {initialLoading ? (
              view === "board" ? (
                <BoardSkeleton />
              ) : (
                <CardsSkeleton />
              )
            ) : listError && rows.length === 0 ? (
              <ErrorBox error={listError} onRetry={list.reload} />
            ) : empty ? (
              searching ? (
                <EmptySearch query={q} onBack={() => setParams({ q: "" })} />
              ) : (
                <EmptyFilters onReset={resetFilters} />
              )
            ) : (
              <>
                {view === "board" ? (
                  <Board rows={rows} sort={sort} dir={dir} onSort={sortBy} hotKey={hotKey} flashKey={flashKey} now={now} busy={list.loading} isSaved={r => isSaved("repo", r.repo)} onSave={r => toggle("repo", r.repo as RepoWithBlurb)} onOpen={openRow} onHot={setHotKey} />
                ) : (
                  <Cards rows={rows} hotKey={hotKey} flashKey={flashKey} now={now} busy={list.loading} isSaved={r => isSaved("repo", r.repo)} onSave={r => toggle("repo", r.repo as RepoWithBlurb)} onOpen={openRow} onHot={setHotKey} />
                )}
                {rows.length > 0 ? <LoadMore shown={rows.length} hasMore={list.hasMore} loading={list.loadingMore || list.loading} error={listError} page={list.page} onMore={list.loadMore} /> : null}
              </>
            )}
          </section>
        </div>
      </main>

      <BackToTop visible={showBackToTop} />

      <DetailsSheet
        fullName={repo}
        tab={tab}
        onTab={next => setParams({ tab: next })}
        onClose={closeDetails}
        rows={rows}
        now={now}
        isSaved={r => isSaved("repo", r)}
        onSave={r => toggle("repo", r as RepoWithBlurb)}
        onNavigate={name => setParams({ repo: name })}
      />

      {/* Injected raw (not as React text) so selectors like `>` and quotes survive server rendering. */}
      <style dangerouslySetInnerHTML={{ __html: TR_CSS }} />
    </div>
  )
}

export default function TrendingPage() {
  return (
    <RequireAuth>
      <TrendingPageContent />
    </RequireAuth>
  )
}