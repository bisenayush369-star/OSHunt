"use client"

import {
  Fragment,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentType,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import {
  SiAnthropic, SiApachekafka, SiApachemaven, SiAuth0, SiAxios, SiBiome, SiBlack, SiBun, SiCelery, SiCircleci, SiClerk, SiCmake, SiCodecov, SiDatadog, SiDeno,
  SiDependabot, SiElasticsearch, SiEslint, SiGit, SiGithub, SiGithubactions, SiGitlab, SiGradle, SiGrafana, SiJenkins, SiJsonwebtokens, SiLerna, SiNpm, SiNx,
  SiPnpm, SiPoetry, SiPostcss, SiPrettier, SiPrometheus, SiPypi, SiPytest, SiRabbitmq, SiReacthookform, SiReactquery, SiReactrouter, SiRedux, SiRenovate,
  SiIos, SiMongoose, SiRender, SiRuff, SiSass, SiSentry, SiSocketdotio, SiStorybook, SiStripe, SiStyledcomponents, SiTurborepo, SiTypeorm, SiYarn, SiZod,
} from "react-icons/si"
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Blocks,
  BookOpen,
  Boxes,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleDot,
  ClipboardPaste,
  Clock,
  Code2,
  Compass,
  Copy,
  CornerDownRight,
  Cpu,
  Database,
  ExternalLink,
  FileCode2,
  FileSearch,
  FlaskConical,
  FolderTree,
  GitFork,
  GitMerge,
  GitPullRequest,
  Hammer,
  Layers,
  Link2,
  Lightbulb,
  ListChecks,
  MessageSquare,
  Minus,
  Package,
  Play,
  RefreshCw,
  Route,
  ScanSearch,
  Scale,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Square,
  Star,
  Telescope,
  Terminal,
  Trash2,
  TriangleAlert,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react"
import Navbar from "@/components/ui/Navbar"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/components/lib/utils"
import { TECHNOLOGIES } from "@/components/lib/technology-options"

// ────────────────────────────────────────────────────────────────────────────
// Types · constants
// ────────────────────────────────────────────────────────────────────────────

type Level = "Explorer" | "Architect" | "Veteran"
type RepoType = "single-package" | "monorepo"
type Tone = "sky" | "violet" | "amber" | "lime" | "rose"
type StepId = "fork" | "setup" | "run" | "issue" | "explore" | "change" | "verify" | "pr" | "review"
type AreaKind = "core" | "interface" | "data" | "tests" | "docs" | "tooling" | "examples"

interface RepoMeta {
  stars?: number
  forks?: number
  openIssues?: number
  license?: string | null
  topics?: string[]
  lastPushed?: string | null
  primaryLanguage?: string | null
  framework?: string | null
  repositoryType?: RepoType | null
}

/** Facts the server derives from the file tree. They never come from the model. */
interface Facts {
  files: number
  folders: number
  size: "tiny" | "small" | "medium" | "large" | "huge"
  skipped: number
  languages: { name: string; files: number; pct: number }[]
  topFolders: { name: string; files: number }[]
  packages: { path: string; files: number }[]
  manager: string | null
  docs: {
    readme: string | null
    contributing: string | null
    conduct: string | null
    security: string | null
    license: string | null
    changelog: string | null
    architecture: string | null
    development: string | null
    prTemplate: string | null
    issueTemplates: number
  }
  ci: { provider: string | null; workflows: number }
  tests: { files: number; folders: string[]; tools: string[] }
  tooling: string[]
  envExample: string | null
  entry: string[]
}

interface TechItem {
  name: string
  role: string
  note: string
  files: string[]
}

interface Area {
  path: string
  title: string
  kind: AreaKind
  summary: string
  files: number
  keyFiles: { path: string; why: string }[]
  tips: string[]
}

interface Step {
  id: StepId
  summary: string
  actions: string[]
  commands: string[]
  files: string[]
  watchOut: string
  done: string
  /** True when the step is the built-in default rather than the model's own. */
  generic: boolean
}

/** What /api/gitlense returns under `result`. Every field is normalised by parseResult before it reaches the UI. */
interface AnalysisResult {
  purpose: string
  architecture: string | null
  tech: TechItem[]
  areas: Area[]
  startFiles: { path: string; why: string }[]
  roadmap: Step[]
  roadmapSource: "ai" | "mixed" | "default"
}

interface Analysis {
  id: number
  owner: string
  repo: string
  url: string
  level: Level
  /** Structured breakdown, or null when the model's JSON could not be parsed (then `raw` is shown). */
  result: AnalysisResult | null
  raw: string
  meta: RepoMeta
  facts: Facts | null
}

/** The structured chat answer: a direct answer first, then only the parts that help act on it. */
interface Answer {
  tldr: string
  steps: string[]
  points: string[]
  files: { path: string; why: string }[]
  commands: string[]
  watchOut: string
  followUps: string[]
}

interface ChatMessage {
  id: number
  role: "user" | "assistant"
  content: string
  answer?: Answer | null
  /** True for the answer that has just arrived, so it types itself out once. */
  fresh?: boolean
  /** An error row shown in the thread. It is never sent back to the server as history. */
  failed?: boolean
  /** An answer read straight from GitHub, without a model. */
  live?: LiveList
}

/** One row of the list shown while an answer is on its way. */
interface TraceStep {
  label: string
  /** The real things behind the step: what was attached, what matched, what was found. */
  chips?: string[]
  done: boolean
}

/** One issue or pull request read from GitHub. */
interface LiveItem {
  number: number
  title: string
  url: string
  labels: string[]
  comments: number
  created: string | null
  author: string
  draft: boolean
}

/** A list read from GitHub's own API: no model, so no tokens. */
interface LiveList {
  kind: "issues" | "pulls"
  /** One sentence on what was found and how, for instance which label matched. */
  heading: string
  /** The same list on GitHub. */
  href: string
  items: LiveItem[]
}

interface FileDive {
  path: string
  lines: number
  truncated: boolean
  summary: string
  parts: { name: string; what: string }[]
  change: string[]
  watchOut: string
  tryIt: string
}

type Detail =
  | { kind: "area"; area: Area }
  | { kind: "tech"; tech: TechItem }
  | { kind: "file"; path: string; why: string; back: Detail | null }

const BRAND = "#a8ff3e"
const CHAT_LIMIT = 2000
const HISTORY_LIMIT = 12
const DEFAULT_LEVEL: Level = "Architect"

const LEVELS: { id: Level; icon: LucideIcon; tagline: string; quote: string; blurb: string }[] = [
  { id: "Explorer", icon: Compass, tagline: "New to this stack", quote: "Walk me through it.", blurb: "Plain English, every term explained, every command spelled out." },
  { id: "Architect", icon: Blocks, tagline: "Comfortable with code", quote: "Show me how it is wired.", blurb: "How the repo is organized and what to know before changing it." },
  { id: "Veteran", icon: Telescope, tagline: "Done this before", quote: "Skip the tour.", blurb: "Trade-offs, risks and the parts a quick skim would miss." },
]

/**
 * Full class strings per tone, so Tailwind can see every one of them.
 * Lime is the one brand accent. Amber means "watch out" and rose means "error", and nothing else wears them.
 * Sky and violet are the same neutral grey, so the page stays calm and a colour always carries a meaning.
 */
const GREY = { icon: "border-white/10 bg-white/[0.04] text-neutral-300", chip: "border-white/10 bg-white/[0.04] text-neutral-200", text: "text-neutral-300", dot: "bg-neutral-400", bar: "bg-neutral-400", border: "border-white/25", soft: "bg-white/[0.04]", ring: "ring-white/40" }
const TONES: Record<Tone, { icon: string; chip: string; text: string; dot: string; bar: string; border: string; soft: string; ring: string }> = {
  sky: GREY,
  violet: GREY,
  amber: { icon: "border-amber-400/25 bg-amber-400/10 text-amber-300", chip: "border-amber-400/25 bg-amber-400/10 text-amber-200", text: "text-amber-300", dot: "bg-amber-400", bar: "bg-amber-400", border: "border-amber-400/40", soft: "bg-amber-400/[0.07]", ring: "ring-amber-400/50" },
  rose: { icon: "border-rose-400/25 bg-rose-400/10 text-rose-300", chip: "border-rose-400/25 bg-rose-400/10 text-rose-200", text: "text-rose-300", dot: "bg-rose-400", bar: "bg-rose-400", border: "border-rose-400/40", soft: "bg-rose-400/[0.07]", ring: "ring-rose-400/50" },
  lime: { icon: "border-[#a8ff3e]/25 bg-[#a8ff3e]/10 text-[#c6ff7a]", chip: "border-[#a8ff3e]/25 bg-[#a8ff3e]/10 text-[#d3ff9a]", text: "text-[#c6ff7a]", dot: "bg-[#a8ff3e]", bar: "bg-[#a8ff3e]", border: "border-[#a8ff3e]/40", soft: "bg-[#a8ff3e]/[0.06]", ring: "ring-[#a8ff3e]/50" },
}

/** Four phases from nothing to a merged pull request. Each step belongs to one; only the last, the goal, is lime. */
const PHASES: { label: string; tone: Tone }[] = [
  { label: "Setup", tone: "sky" },
  { label: "Find", tone: "sky" },
  { label: "Build", tone: "sky" },
  { label: "Ship", tone: "lime" },
]

const STEP_META: Record<StepId, { title: string; icon: LucideIcon; phase: number }> = {
  fork: { title: "Fork and clone", icon: GitFork, phase: 0 },
  setup: { title: "Install and configure", icon: Wrench, phase: 0 },
  run: { title: "Run it once", icon: Play, phase: 0 },
  issue: { title: "Pick an issue", icon: CircleDot, phase: 1 },
  explore: { title: "Find the code", icon: ScanSearch, phase: 1 },
  change: { title: "Make the change", icon: Hammer, phase: 2 },
  verify: { title: "Test and lint", icon: FlaskConical, phase: 2 },
  pr: { title: "Open the pull request", icon: GitPullRequest, phase: 3 },
  review: { title: "Review and merge", icon: GitMerge, phase: 3 },
}
const STEP_ORDER = Object.keys(STEP_META) as StepId[]

const AREA_META: Record<AreaKind, { label: string; icon: LucideIcon; tone: Tone }> = {
  core: { label: "Core", icon: Cpu, tone: "sky" },
  interface: { label: "Interface", icon: Layers, tone: "sky" },
  data: { label: "Data", icon: Database, tone: "sky" },
  tests: { label: "Tests", icon: FlaskConical, tone: "sky" },
  docs: { label: "Docs", icon: BookOpen, tone: "sky" },
  tooling: { label: "Tooling", icon: Wrench, tone: "sky" },
  examples: { label: "Examples", icon: Sparkles, tone: "sky" },
}

interface PopularRepo {
  repo: string
  desc: string
  lang: string
  tag: string
}

/** Six of these are shown at a time, and a refresh avoids the six shown last time. */
const POPULAR_POOL: PopularRepo[] = [
  { repo: "vercel/next.js", desc: "The React framework for production", lang: "TypeScript", tag: "Frontend" },
  { repo: "facebook/react", desc: "The library for web and native user interfaces", lang: "JavaScript", tag: "Frontend" },
  { repo: "vuejs/core", desc: "The progressive JavaScript framework", lang: "TypeScript", tag: "Frontend" },
  { repo: "vitejs/vite", desc: "Next generation frontend tooling", lang: "TypeScript", tag: "DevTools" },
  { repo: "shadcn-ui/ui", desc: "Beautifully designed components you can copy into your app", lang: "TypeScript", tag: "UI kit" },
  { repo: "withastro/astro", desc: "The web framework for content-driven websites", lang: "TypeScript", tag: "Frontend" },
  { repo: "excalidraw/excalidraw", desc: "Virtual whiteboard for sketching hand-drawn diagrams", lang: "TypeScript", tag: "App" },
  { repo: "microsoft/vscode", desc: "Visual Studio Code, the open source editor", lang: "TypeScript", tag: "Editor" },
  { repo: "expressjs/express", desc: "Fast, minimalist web framework for Node.js", lang: "JavaScript", tag: "Backend" },
  { repo: "nestjs/nest", desc: "A progressive Node.js framework for scalable server-side apps", lang: "TypeScript", tag: "Backend" },
  { repo: "honojs/hono", desc: "A small, fast web framework built on Web Standards", lang: "TypeScript", tag: "Backend" },
  { repo: "trpc/trpc", desc: "End-to-end typesafe APIs made easy", lang: "TypeScript", tag: "Backend" },
  { repo: "prisma/prisma", desc: "Next-generation ORM for Node.js and TypeScript", lang: "TypeScript", tag: "Database" },
  { repo: "drizzle-team/drizzle-orm", desc: "A headless TypeScript ORM with a SQL-like API", lang: "TypeScript", tag: "Database" },
  { repo: "redis/redis", desc: "The in-memory data structure store", lang: "C", tag: "Database" },
  { repo: "fastapi/fastapi", desc: "A high performance Python web framework, easy to learn", lang: "Python", tag: "Backend" },
  { repo: "django/django", desc: "The web framework for perfectionists with deadlines", lang: "Python", tag: "Backend" },
  { repo: "pallets/flask", desc: "The Python micro framework for web applications", lang: "Python", tag: "Backend" },
  { repo: "psf/requests", desc: "A simple, yet elegant, HTTP library for Python", lang: "Python", tag: "Library" },
  { repo: "home-assistant/core", desc: "Open source home automation that puts local control first", lang: "Python", tag: "Automation" },
  { repo: "pytorch/pytorch", desc: "Tensors and dynamic neural networks in Python", lang: "Python", tag: "AI" },
  { repo: "huggingface/transformers", desc: "State-of-the-art machine learning models for PyTorch and JAX", lang: "Python", tag: "AI" },
  { repo: "langchain-ai/langchain", desc: "Build context-aware reasoning applications", lang: "Python", tag: "AI" },
  { repo: "denoland/deno", desc: "A modern runtime for JavaScript and TypeScript", lang: "Rust", tag: "Runtime" },
  { repo: "oven-sh/bun", desc: "A fast JavaScript runtime, bundler, test runner and package manager", lang: "Zig", tag: "Runtime" },
  { repo: "tauri-apps/tauri", desc: "Build smaller, faster desktop apps with a web frontend", lang: "Rust", tag: "Desktop" },
  { repo: "rust-lang/rust-analyzer", desc: "A Rust compiler front-end for IDEs", lang: "Rust", tag: "DevTools" },
  { repo: "BurntSushi/ripgrep", desc: "Recursively searches directories for a regex pattern", lang: "Rust", tag: "CLI" },
  { repo: "sharkdp/bat", desc: "A cat clone with syntax highlighting and Git integration", lang: "Rust", tag: "CLI" },
  { repo: "junegunn/fzf", desc: "A command-line fuzzy finder", lang: "Go", tag: "CLI" },
  { repo: "cli/cli", desc: "GitHub's official command line tool", lang: "Go", tag: "CLI" },
  { repo: "gin-gonic/gin", desc: "A fast, full-featured web framework for Go", lang: "Go", tag: "Backend" },
  { repo: "flutter/flutter", desc: "Build beautiful apps for any screen from one codebase", lang: "Dart", tag: "Mobile" },
  { repo: "rails/rails", desc: "Ruby on Rails, the full-stack web framework", lang: "Ruby", tag: "Backend" },
  { repo: "spring-projects/spring-boot", desc: "Spring Boot helps you build production-grade applications", lang: "Java", tag: "Backend" },
]

const HOW_IT_WORKS: { title: string; desc: string }[] = [
  { title: "Paste a repo", desc: "Any public GitHub repository. Paste the URL or pick one above." },
  { title: "GitLense reads it", desc: "The file tree, manifests, docs and the files most worth opening. Real files, not a summary of the README." },
  { title: "Get your roadmap", desc: "Nine steps from fork to merged pull request, written for your level, with the exact commands and files." },
  { title: "Ask anything", desc: "The chat already knows the repo. One question gets one complete answer." },
]

const ASK_PLACEHOLDERS = [
  "How do I make my first contribution?",
  "Which files should I read first?",
  "How do I run the tests?",
  "What does CI check on a pull request?",
  "Where would I fix a small bug?",
]

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function cssVars(vars: Record<string, string | number>) {
  return vars as CSSProperties
}

const OWNER = "[A-Za-z0-9][A-Za-z0-9-]{0,38}"
const REPO = "[A-Za-z0-9._-]{1,100}"
const REPO_URL_RE = new RegExp(`^(?:https?://)?(?:www\\.)?github\\.com/(${OWNER})/(${REPO})(?:[/?#].*)?$`, "i")
const REPO_SSH_RE = new RegExp(`^git@github\\.com:(${OWNER})/(${REPO})$`, "i")
const REPO_SHORT_RE = new RegExp(`^(${OWNER})/(${REPO})$`)

/** Accepts a full URL, "github.com/owner/repo", an SSH remote or plain "owner/repo". */
function parseRepoInput(raw: string): { owner: string; repo: string; url: string } | null {
  const value = raw.trim()
  const m = value.match(REPO_URL_RE) ?? value.match(REPO_SSH_RE) ?? value.match(REPO_SHORT_RE)
  if (!m) return null
  const owner = m[1]
  const repo = m[2].replace(/\.git$/i, "")
  if (!repo || repo === "." || repo === "..") return null
  return { owner, repo, url: `https://github.com/${owner}/${repo}` }
}

/** `/gitlense?url=` is how Hunt hands over an issue link. Only a GitHub repository, issue or pull request link is taken. */
function parseHuntLink(raw: string): { value: string; label: string } | null {
  const m = raw.trim().match(new RegExp(`^https://github\\.com/(${OWNER})/(${REPO})(?:/(issues|pull)/(\\d+))?(?:[/?#].*)?$`, "i"))
  if (!m) return null
  const repo = m[2].replace(/\.git$/i, "")
  if (!repo || repo === "." || repo === "..") return null
  const tail = m[3] ? `/${m[3].toLowerCase()}/${m[4]}` : ""
  return { value: `https://github.com/${m[1]}/${repo}${tail}`, label: `${m[1]}/${repo}${m[4] ? `#${m[4]}` : ""}` }
}

function avatarUrl(login: string, px = 80) {
  return `https://github.com/${encodeURIComponent(login)}.png?size=${px}`
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/")
const blobUrl = (repoUrl: string, path: string) => `${repoUrl}/blob/HEAD/${encodePath(path)}`
const treeUrl = (repoUrl: string, path: string) => `${repoUrl}/tree/HEAD/${encodePath(path)}`

const COMPACT_FORMAT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })
/** 1 234 becomes "1.2K". Small numbers stay exact. */
function compact(n: number) {
  return n < 1000 ? String(n) : COMPACT_FORMAT.format(n)
}
const grouped = (n: number) => n.toLocaleString("en")
/** "1 file", "2 files": a count with its noun in the right number. */
const plural = (n: number, one: string, many = `${one}s`) => `${grouped(n)} ${n === 1 ? one : many}`

const RELATIVE_TIME = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
]
function timeAgo(iso: string | null | undefined) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  const diff = Math.round((t - Date.now()) / 1000)
  for (const [unit, secs] of TIME_UNITS) {
    if (Math.abs(diff) >= secs) return RELATIVE_TIME.format(Math.round(diff / secs), unit)
  }
  return "just now"
}

function formatExactDate(iso: string | null | undefined) {
  if (!iso) return undefined
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })
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
  Zig: "#ec915c", Clojure: "#db5855", OCaml: "#ef7a08", Astro: "#ff5a03", Julia: "#a270ba",
}
const FALLBACK_LANG_COLORS = ["#8b95a5", "#6b7280", "#9ca3af", "#7c8798", "#a1a1aa"]
function langColor(name: string) {
  const known = LANG_COLORS[name]
  if (known) return known
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return FALLBACK_LANG_COLORS[h % FALLBACK_LANG_COLORS.length]
}

// ── Technology logos ─────────────────────────────────────────────────────────
// The real mark of each technology, in its own colour, from the same list Hunt uses (Simple Icons). A name that is
// not in the list gets a neutral mark. A logo is never invented.

type LogoIcon = ComponentType<{ className?: string; style?: CSSProperties }>
interface Logo {
  Icon: LogoIcon
  color: string
}

/** Tools a repository is likely to use that Hunt's list does not carry. */
const EXTRA_LOGOS: Record<string, [LogoIcon, string]> = {
  npm: [SiNpm, "#CB3837"], pnpm: [SiPnpm, "#F69220"], yarn: [SiYarn, "#2C8EBB"], bun: [SiBun, "#FBF0DF"], deno: [SiDeno, "#70FFAF"],
  turborepo: [SiTurborepo, "#FF1E56"], turbo: [SiTurborepo, "#FF1E56"], nx: [SiNx, "#7C9AFF"], lerna: [SiLerna, "#9333EA"],
  gradle: [SiGradle, "#7EB6D4"], maven: [SiApachemaven, "#C71A36"], cmake: [SiCmake, "#6FA8DC"], git: [SiGit, "#F05032"], github: [SiGithub, "#E5E5E5"],
  eslint: [SiEslint, "#8080F2"], prettier: [SiPrettier, "#F7B93E"], biome: [SiBiome, "#60A5FA"], storybook: [SiStorybook, "#FF4785"],
  pytest: [SiPytest, "#0A9EDC"], ruff: [SiRuff, "#D7FF64"], black: [SiBlack, "#D4D4D4"], poetry: [SiPoetry, "#60A5FA"], pypi: [SiPypi, "#3775A9"], celery: [SiCelery, "#37814A"],
  githubactions: [SiGithubactions, "#2088FF"], circleci: [SiCircleci, "#D4D4D4"], jenkins: [SiJenkins, "#D24939"], gitlab: [SiGitlab, "#FC6D26"], gitlabci: [SiGitlab, "#FC6D26"],
  codecov: [SiCodecov, "#F01F7A"], dependabot: [SiDependabot, "#2A8DFF"], renovate: [SiRenovate, "#5C7CFA"],
  redux: [SiRedux, "#764ABC"], reactquery: [SiReactquery, "#FF4154"], tanstackquery: [SiReactquery, "#FF4154"], reactrouter: [SiReactrouter, "#CA4245"],
  reacthookform: [SiReacthookform, "#EC5990"], zod: [SiZod, "#3E67B1"], axios: [SiAxios, "#5A29E4"], socketio: [SiSocketdotio, "#E5E5E5"],
  styledcomponents: [SiStyledcomponents, "#DB7093"], sass: [SiSass, "#CC6699"], scss: [SiSass, "#CC6699"], postcss: [SiPostcss, "#DD3A0A"],
  jwt: [SiJsonwebtokens, "#E5E5E5"], auth0: [SiAuth0, "#EB5424"], clerk: [SiClerk, "#6C47FF"], stripe: [SiStripe, "#635BFF"],
  sentry: [SiSentry, "#A78BFA"], datadog: [SiDatadog, "#9A5BD6"], prometheus: [SiPrometheus, "#E6522C"], grafana: [SiGrafana, "#F46800"],
  rabbitmq: [SiRabbitmq, "#FF6600"], kafka: [SiApachekafka, "#D4D4D4"], elasticsearch: [SiElasticsearch, "#00A9E5"], anthropic: [SiAnthropic, "#D97757"],
  typeorm: [SiTypeorm, "#FE0803"], mongoose: [SiMongoose, "#880000"], render: [SiRender, "#46E3B7"], ios: [SiIos, "#E5E5E5"],
}

/** Technologies the shared list only has a lettered badge for, because no official mark exists. A lettered badge reads as a made-up logo, so these get the neutral mark. */
const NO_MARK = new Set(["aws", "azure", "playwright", "parcel", "turbopack", "openai", "llamaindex", "grpc", "matplotlib", "restapi", "sql"])

const logoKey = (s: string) => s.toLowerCase().replace(/\+/g, "plus").replace(/#/g, "sharp").replace(/[^a-z0-9]/g, "")

let logoIndex: Map<string, Logo> | null = null

/** A brand colour too dark to see on this page (Next.js black, for one) is lifted to a light grey, the same rule Hunt uses. */
function legible(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return "#d4d4d4"
  const n = parseInt(m[1], 16)
  const lin = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return luminance < 0.12 ? "#d4d4d4" : `#${m[1]}`
}

/** "Next.js 16", "TypeScript (strict)" and "Prisma ORM" all find their logo: the full name first, then it without a version or brackets, then its first words. */
function findLogo(name: string): Logo | null {
  if (!logoIndex) {
    logoIndex = new Map()
    for (const [key, [Icon, color]] of Object.entries(EXTRA_LOGOS)) logoIndex.set(key, { Icon, color })
    for (const t of TECHNOLOGIES) {
      for (const word of [t.value, t.label, ...(t.aliases ?? [])]) {
        const key = logoKey(word)
        if (!logoIndex.has(key)) logoIndex.set(key, { Icon: t.icon, color: t.iconColor })
      }
    }
  }
  const plain = name.replace(/\([^)]*\)/g, " ").replace(/\bv?\d+(?:\.(?:\d+|x))*\b/gi, " ").trim()
  const words = plain.split(/\s+/).filter(Boolean)
  for (const tryName of [name, plain, words.slice(0, 2).join(" "), words[0] ?? ""]) {
    const key = logoKey(tryName)
    if (NO_MARK.has(key)) return null
    const hit = tryName ? logoIndex.get(key) : undefined
    if (hit) return { Icon: hit.Icon, color: legible(hit.color) }
  }
  return null
}

/** The logo alone. With `bare`, a name without a known logo shows nothing instead of a neutral mark. */
function TechMark({ name, className, bare }: { name: string; className?: string; bare?: boolean }) {
  const logo = findLogo(name)
  if (!logo) return bare ? null : <Package aria-hidden="true" className={cn("text-neutral-400", className)} strokeWidth={2} />
  return <logo.Icon aria-hidden="true" className={className} style={{ color: logo.color }} />
}

/** A technology's logo on a quiet square tile. */
function TechTile({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]", className)}>
      <TechMark name={name} className="h-5 w-5" />
    </span>
  )
}

function splitPath(path: string) {
  const i = path.lastIndexOf("/")
  return i === -1 ? { dir: "", file: path } : { dir: path.slice(0, i + 1), file: path.slice(i + 1) }
}

/** A path that wraps after a slash, so a narrow screen never splits a folder name in the middle. */
function Breakable({ text }: { text: string }) {
  const parts = text.split("/")
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && (
            <>
              /<wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  )
}

/** The model is told to avoid markdown in these fields; this removes the odd **bold** that slips through. */
function cleanText(s: string) {
  return s.replace(/\*\*([^*\n]+)\*\*/g, "$1").trim()
}

/** Renders `backtick` spans as inline code without a markdown parser, so the structured cards can never grow tables or HTML. */
function withInlineCode(text: string) {
  return text.split(/(`[^`\n]+`)/g).map((part, i) =>
    part.length > 2 && part.startsWith("`") && part.endsWith("`") ? (
      <code key={i} className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-neutral-100">
        {part.slice(1, -1)}
      </code>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join("")
  if (node && typeof node === "object" && "props" in node) {
    return nodeText((node as { props: { children?: ReactNode } }).props.children)
  }
  return ""
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Insecure origins (a LAN IP in dev) have no async clipboard; fall back to a hidden textarea.
    try {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.setAttribute("readonly", "")
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none"
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand("copy")
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Feeds the cursor position to `.gl-spot` cards (CSS does the drawing, so nothing re-renders). */
function trackPointer(e: ReactPointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty("--mx", `${e.clientX - r.left}px`)
  el.style.setProperty("--my", `${e.clientY - r.top}px`)
}

/** True while an element's content is taller than the element, so a scroll area gets a keyboard stop only when it actually scrolls. */
function useOverflowY(ref: RefObject<HTMLElement | null>) {
  const [scrolls, setScrolls] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const measure = () => setScrolls(node.scrollHeight > node.clientHeight + 1)
    const resize = new ResizeObserver(measure)
    const mutate = new MutationObserver(measure)
    resize.observe(node)
    mutate.observe(node, { childList: true, subtree: true, characterData: true })
    return () => {
      resize.disconnect()
      mutate.disconnect()
    }
  }, [ref])
  return scrolls
}

function useMedia(query: string) {
  const subscribe = useMemo(
    () => (notify: () => void) => {
      const m = window.matchMedia(query)
      m.addEventListener("change", notify)
      return () => m.removeEventListener("change", notify)
    },
    [query]
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

/** Fades a section in the first time it scrolls into view. With reduced motion, or without IntersectionObserver, it simply shows. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={cn("gl-reveal", shown && "is-in", className)} style={cssVars({ "--d": `${delay}ms` })}>
      {children}
    </div>
  )
}

/** Counts up to `target` once it is known. Reduced motion jumps straight there. */
function useCountUp(target: number, run = true) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!run) return
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 800)
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return value
}

// ── Small browser stores ─────────────────────────────────────────────────────
// localStorage is a convenience here (the last repos shown). It can be missing or
// throw, so every access is wrapped and the page works without it.

function readJsonList(key: string): string[] {
  try {
    const v: unknown = JSON.parse(window.localStorage.getItem(key) || "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}
function writeJsonList(key: string, list: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // private mode or a full quota: nothing to do
  }
}

const POPULAR_KEY = "gl:popular"
let popularPicks: PopularRepo[] | null = null
const popularListeners = new Set<() => void>()

/** Six repos with a mix of languages, never the ones in `exclude` (the last six shown). */
function pickPopular(exclude: string[]): PopularRepo[] {
  const rest = POPULAR_POOL.filter((r) => !exclude.includes(r.repo))
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const picked: PopularRepo[] = []
  for (const r of rest) {
    if (picked.filter((p) => p.lang === r.lang).length < 2) picked.push(r)
    if (picked.length === 6) break
  }
  for (const r of rest) if (picked.length < 6 && !picked.includes(r)) picked.push(r)
  return picked
}

function getPopular() {
  if (!popularPicks) {
    popularPicks = pickPopular(readJsonList(POPULAR_KEY))
    writeJsonList(POPULAR_KEY, popularPicks.map((r) => r.repo))
  }
  return popularPicks
}

function shufflePopular() {
  popularPicks = pickPopular(getPopular().map((r) => r.repo))
  writeJsonList(POPULAR_KEY, popularPicks.map((r) => r.repo))
  popularListeners.forEach((l) => l())
}

/** Null on the server and during hydration, then a fresh pick on every page load. */
function usePopular() {
  return useSyncExternalStore(
    (notify) => {
      popularListeners.add(notify)
      return () => {
        popularListeners.delete(notify)
      }
    },
    getPopular,
    () => null
  )
}

// ── Response parsing ─────────────────────────────────────────────────────────
// The API is trusted to be well-shaped, but the page never assumes it: anything
// that is not the expected type is dropped instead of crashing a render.

const str = (v: unknown) => (typeof v === "string" ? cleanText(v) : "")
const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback)
const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const strList = (v: unknown, max = 12) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map(cleanText).slice(0, max) : []

function parseFacts(raw: unknown): Facts | null {
  const f = rec(raw)
  if (!f) return null
  const docs = rec(f.docs) ?? {}
  const ci = rec(f.ci) ?? {}
  const tests = rec(f.tests) ?? {}
  const path = (v: unknown) => (typeof v === "string" && v ? v : null)
  const pairs = (v: unknown, a: string, b: string, max: number) =>
    (Array.isArray(v) ? v : []).flatMap((x) => {
      const o = rec(x)
      return o && typeof o[a] === "string" ? [{ [a]: o[a] as string, [b]: num(o[b]) }] : []
    }).slice(0, max)
  const size = f.size
  return {
    files: num(f.files),
    folders: num(f.folders),
    size: size === "tiny" || size === "small" || size === "medium" || size === "large" || size === "huge" ? size : "small",
    skipped: num(f.skipped),
    languages: (Array.isArray(f.languages) ? f.languages : []).flatMap((x) => {
      const o = rec(x)
      return o && typeof o.name === "string" ? [{ name: o.name, files: num(o.files), pct: num(o.pct) }] : []
    }).slice(0, 5),
    topFolders: pairs(f.topFolders, "name", "files", 8) as Facts["topFolders"],
    packages: pairs(f.packages, "path", "files", 12) as Facts["packages"],
    manager: path(f.manager),
    docs: {
      readme: path(docs.readme), contributing: path(docs.contributing), conduct: path(docs.conduct), security: path(docs.security),
      license: path(docs.license), changelog: path(docs.changelog), architecture: path(docs.architecture),
      development: path(docs.development), prTemplate: path(docs.prTemplate), issueTemplates: num(docs.issueTemplates),
    },
    ci: { provider: path(ci.provider), workflows: num(ci.workflows) },
    tests: { files: num(tests.files), folders: strList(tests.folders, 3), tools: strList(tests.tools, 6) },
    tooling: strList(f.tooling, 16),
    envExample: path(f.envExample),
    entry: strList(f.entry, 5),
  }
}

function parseResult(raw: unknown): AnalysisResult | null {
  const r = rec(raw)
  const purpose = r ? str(r.purpose) : ""
  if (!r || !purpose) return null

  const tech = (Array.isArray(r.tech) ? r.tech : []).flatMap((x): TechItem[] => {
    const o = rec(x)
    const name = o ? str(o.name) : ""
    return o && name ? [{ name, role: str(o.role), note: str(o.note), files: strList(o.files, 2) }] : []
  })

  const keyFiles = (v: unknown) =>
    (Array.isArray(v) ? v : []).flatMap((x) => {
      const o = rec(x)
      return o && typeof o.path === "string" && o.path ? [{ path: o.path, why: str(o.why) }] : []
    })

  const areas = (Array.isArray(r.areas) ? r.areas : []).flatMap((x): Area[] => {
    const o = rec(x)
    const path = o && typeof o.path === "string" ? o.path : ""
    const summary = o ? str(o.summary) : ""
    if (!o || !path || !summary) return []
    const kind = o.kind as AreaKind
    return [{ path, title: str(o.title) || path, kind: kind in AREA_META ? kind : "core", summary, files: num(o.files), keyFiles: keyFiles(o.keyFiles), tips: strList(o.tips, 3) }]
  })

  const roadmap = (Array.isArray(r.roadmap) ? r.roadmap : []).flatMap((x): Step[] => {
    const o = rec(x)
    const id = o?.id as StepId
    if (!o || !(id in STEP_META)) return []
    return [{ id, summary: str(o.summary), actions: strList(o.actions, 5), commands: strList(o.commands, 5), files: strList(o.files, 4), watchOut: str(o.watchOut), done: str(o.done), generic: o.generic === true }]
  })
  roadmap.sort((a, b) => STEP_ORDER.indexOf(a.id) - STEP_ORDER.indexOf(b.id))

  return {
    purpose,
    architecture: str(r.architecture) || null,
    tech,
    areas,
    startFiles: keyFiles(r.startFiles),
    roadmap,
    roadmapSource: r.roadmapSource === "ai" || r.roadmapSource === "mixed" ? r.roadmapSource : "default",
  }
}

/** Reads the deterministic facts (GitHub numbers, detected framework) from a result or from the raw-text fallback. */
function parseMeta(src: unknown): RepoMeta {
  const s = rec(src)
  if (!s) return {}
  const m = rec(s.metadata) ?? {}
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)
  const count = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined)
  const license = text(m.license)
  return {
    stars: count(m.stars),
    forks: count(m.forks),
    openIssues: count(m.openIssues),
    license: license === "NOASSERTION" ? "Other license" : license,
    lastPushed: text(m.lastPushed),
    primaryLanguage: text(m.primaryLanguage),
    topics: Array.isArray(m.topics) ? m.topics.filter((t): t is string => typeof t === "string" && t.length > 0) : [],
    framework: text(s.framework),
    repositoryType: s.repositoryType === "monorepo" || s.repositoryType === "single-package" ? s.repositoryType : null,
  }
}

/** Later events fill in what earlier ones lacked. A missing value never erases one that is already known. */
function mergeMeta(known: RepoMeta, next: RepoMeta): RepoMeta {
  const out: Record<string, unknown> = { ...known }
  for (const [key, value] of Object.entries(next)) {
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) continue
    out[key] = value
  }
  return out as RepoMeta
}

/** Builds an Analysis from a `result` or `raw` stream event. Returns null when it holds nothing usable. */
function toAnalysis(
  event: Record<string, unknown>,
  fallback: { owner: string; repo: string },
  level: Level,
  id: number,
  streamed: { facts: Facts | null; meta: RepoMeta }
): Analysis | null {
  const owner = typeof event.owner === "string" && event.owner ? event.owner : fallback.owner
  const repo = typeof event.repo === "string" && event.repo ? event.repo : fallback.repo
  const base = { id, owner, repo, url: `https://github.com/${owner}/${repo}`, level }
  const result = parseResult(event.result)
  const r = rec(event.result)
  const facts = parseFacts(r?.facts ?? event.facts) ?? streamed.facts
  if (result) return { ...base, result, raw: "", meta: mergeMeta(streamed.meta, parseMeta(event.result)), facts }
  const raw = typeof event.raw === "string" ? event.raw : ""
  return raw.trim() ? { ...base, result: null, raw, meta: mergeMeta(streamed.meta, parseMeta(event)), facts } : null
}

/** Flattens the breakdown into the grounding text the chat route receives. */
function serializeForChat(a: Analysis): string {
  if (a.raw) return a.raw.slice(0, 12_000)
  const r = a.result
  if (!r) return ""
  const m = a.meta
  const f = a.facts
  return [
    `Purpose: ${r.purpose}`,
    r.architecture ? `Architecture: ${r.architecture}` : "",
    r.tech.length ? `Tech stack:\n${r.tech.map((t) => `- ${t.name} (${t.role}): ${t.note}${t.files.length ? ` [${t.files.join(", ")}]` : ""}`).join("\n")}` : "",
    r.areas.length
      ? `Areas of the repo:\n${r.areas.map((x) => `- ${x.path}/ (${x.title}, ${x.files} files): ${x.summary}${x.keyFiles.length ? ` Key files: ${x.keyFiles.map((k) => k.path).join(", ")}.` : ""}${x.tips.length ? ` Tips: ${x.tips.join(" ")}` : ""}`).join("\n")}`
      : "",
    r.startFiles.length ? `Start here:\n${r.startFiles.map((x) => `- ${x.path}: ${x.why}`).join("\n")}` : "",
    r.roadmap.length
      ? `Contribution roadmap:\n${r.roadmap
          .map((s, i) => `${i + 1}. ${STEP_META[s.id].title}: ${s.summary}${s.commands.length ? ` Commands: ${s.commands.join(" ; ")}.` : ""}${s.files.length ? ` Files: ${s.files.join(", ")}.` : ""}${s.watchOut ? ` Watch out: ${s.watchOut}` : ""}`)
          .join("\n")}`
      : "",
    f
      ? `Facts: ${plural(f.files, "file")} in ${plural(f.folders, "folder")}. ${f.languages.length ? `Languages: ${f.languages.map((l) => `${l.name} ${l.pct}%`).join(", ")}. ` : ""}${f.manager ? `Package manager: ${f.manager}. ` : ""}${f.ci.provider ? `CI: ${f.ci.provider}. ` : "No CI found. "}${f.tests.files ? `${plural(f.tests.files, "test file")}. ` : "No tests found. "}${f.docs.contributing ? `Contributing guide: ${f.docs.contributing}. ` : ""}${f.docs.prTemplate ? `PR template: ${f.docs.prTemplate}.` : ""}`
      : "",
    m.primaryLanguage ? `Primary language: ${m.primaryLanguage}` : "",
    m.framework ? `Framework: ${m.framework}` : "",
    m.repositoryType ? `Layout: ${m.repositoryType}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12_000)
}

function parseAnswer(raw: unknown): Answer | null {
  const a = rec(raw)
  const tldr = a ? str(a.tldr) : ""
  if (!a || !tldr) return null
  return {
    tldr,
    steps: strList(a.steps, 5),
    points: strList(a.points, 4),
    files: (Array.isArray(a.files) ? a.files : []).flatMap((x) => {
      const o = rec(x)
      return o && typeof o.path === "string" && o.path ? [{ path: o.path, why: str(o.why) }] : []
    }).slice(0, 3),
    commands: strList(a.commands, 3),
    watchOut: str(a.watchOut),
    followUps: strList(a.followUps, 3),
  }
}

function parseDive(raw: unknown): FileDive | null {
  const d = rec(raw)
  const summary = d ? str(d.summary) : ""
  if (!d || !summary) return null
  return {
    path: typeof d.path === "string" ? d.path : "",
    lines: num(d.lines),
    truncated: d.truncated === true,
    summary,
    parts: (Array.isArray(d.parts) ? d.parts : []).flatMap((x) => {
      const o = rec(x)
      return o && typeof o.name === "string" && o.name ? [{ name: o.name, what: str(o.what) }] : []
    }).slice(0, 6),
    change: strList(d.change, 3),
    watchOut: str(d.watchOut),
    tryIt: str(d.tryIt),
  }
}

// ── Progress ─────────────────────────────────────────────────────────────────

interface LogLine {
  id: string
  icon: LucideIcon
  tone: Tone
  label: string
  value: string
}

const SCAN_FOLDER_LINES = { tiny: 0, small: 2, medium: 3, large: 4, huge: 5 } as const
const SCAN_PACKAGE_LINES = { tiny: 0, small: 0, medium: 2, large: 3, huge: 4 } as const

/**
 * The lines of the progress log, taken from what the server actually found. A bigger repository has more to report,
 * so it gets more lines: folders, workspace packages, skipped paths.
 */
function scanLines(f: Facts): LogLine[] {
  const lines: LogLine[] = [
    { id: "tree", icon: FolderTree, tone: "sky", label: "File tree", value: `${plural(f.files, "file")} in ${plural(f.folders, "folder")}` },
  ]
  if (f.languages.length) lines.push({ id: "lang", icon: Code2, tone: "sky", label: "Languages", value: f.languages.map((l) => `${l.name} ${l.pct}%`).join(", ") })
  if (f.manager) lines.push({ id: "build", icon: Package, tone: "sky", label: "Build", value: f.packages.length >= 2 ? `${f.manager}, ${f.packages.length} workspace packages` : f.manager })
  for (const d of f.topFolders.slice(0, SCAN_FOLDER_LINES[f.size])) lines.push({ id: `dir-${d.name}`, icon: FolderTree, tone: "sky", label: "Folder", value: `${d.name}/ with ${plural(d.files, "file")}` })
  if (f.packages.length >= 2) for (const p of f.packages.slice(0, SCAN_PACKAGE_LINES[f.size])) lines.push({ id: `pkg-${p.path}`, icon: Boxes, tone: "sky", label: "Package", value: `${p.path} with ${plural(p.files, "file")}` })
  const docs = [
    f.docs.contributing && "contributing guide",
    f.docs.conduct && "code of conduct",
    f.docs.prTemplate && "pull request template",
    f.docs.issueTemplates > 0 && `${f.docs.issueTemplates} issue templates`,
  ].filter(Boolean)
  lines.push({ id: "docs", icon: BookOpen, tone: docs.length ? "sky" : "amber", label: "Docs", value: docs.length ? docs.join(", ") : "No contributing guide found" })
  lines.push({ id: "ci", icon: Play, tone: f.ci.provider ? "sky" : "amber", label: "CI", value: f.ci.provider ? `${f.ci.provider}${f.ci.workflows ? `, ${f.ci.workflows} workflows` : ""}` : "No CI configuration found" })
  lines.push({ id: "tests", icon: FlaskConical, tone: f.tests.files ? "sky" : "amber", label: "Tests", value: f.tests.files ? `${plural(f.tests.files, "test file")}${f.tests.tools.length ? `, ${f.tests.tools.slice(0, 3).join(", ")}` : ""}` : "No tests found" })
  if (f.entry.length) lines.push({ id: "entry", icon: Route, tone: "sky", label: "Entry points", value: f.entry.slice(0, 2).join(", ") })
  if (f.skipped > 0) lines.push({ id: "skip", icon: ScanSearch, tone: "sky", label: "Skipped", value: `${plural(f.skipped, "generated or vendored file")}` })
  return lines
}

// ── Streaming ────────────────────────────────────────────────────────────────

/** Reads a newline-delimited JSON body, handing over each event as soon as its line is complete. */
async function readNdjson(res: Response, onEvent: (event: Record<string, unknown>) => void) {
  const handle = (line: string) => {
    const text = line.trim()
    if (!text) return
    try {
      const event = rec(JSON.parse(text))
      if (event) onEvent(event)
    } catch {
      // a damaged line is skipped; the final event decides success
    }
  }
  if (!res.body) {
    ;(await res.text()).split("\n").forEach(handle)
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    for (let i = buffer.indexOf("\n"); i !== -1; i = buffer.indexOf("\n")) {
      handle(buffer.slice(0, i))
      buffer = buffer.slice(i + 1)
    }
  }
  handle(buffer + decoder.decode())
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function readError(res: Response) {
  const data: unknown = await res.json().catch(() => null)
  const message = data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string" ? (data as { error: string }).error : ""
  return new ApiError(res.status, message)
}

function describeError(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session expired. Sign in again to continue."
    return err.message || fallback
  }
  if (err instanceof TypeError) return "Can't reach GitLense. Check your connection and try again."
  return err instanceof Error && err.message ? err.message : fallback
}

function isAbort(err: unknown) {
  return (err as { name?: string } | null)?.name === "AbortError"
}

// ────────────────────────────────────────────────────────────────────────────
// Page CSS: keyframes and the few things Tailwind utilities can't express
// ────────────────────────────────────────────────────────────────────────────

const GL_CSS = `
@property --gb-a { syntax: '<number>'; inherits: false; initial-value: .38; }

.gl-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.14) transparent; }
.gl-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.gl-scroll::-webkit-scrollbar-track { background: transparent; }
.gl-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border: 2px solid transparent; border-radius: 8px; background-clip: padding-box; }
.gl-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.24); border: 2px solid transparent; background-clip: padding-box; }

/* Tailwind 4 resets buttons to the default cursor, so everything clickable here says so itself. */
.gl-root :is(button, [role="button"], [role="radio"], summary, a[href]):not(:disabled):not([aria-disabled="true"]), .gl-sheet :is(button, a[href]):not(:disabled), .gl-menu [role="menuitemradio"] { cursor: pointer; }
.gl-root :is(button, [role="button"]):disabled, .gl-sheet button:disabled { cursor: not-allowed; }

@keyframes gl-rise { from { opacity: 0; transform: translate3d(0, 10px, 0); } to { opacity: 1; transform: none; } }
@keyframes gl-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes gl-blur { from { opacity: 0; filter: blur(10px); transform: translate3d(0, 8px, 0); } to { opacity: 1; filter: blur(0); transform: none; } }
@keyframes gl-shimmer { to { transform: translateX(100%); } }
@keyframes gl-dot { 0%, 80%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }
@keyframes gl-bar { 0%, 100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
@keyframes gl-drift-a { from { transform: translate3d(-4%, -2%, 0) scale(1); } to { transform: translate3d(7%, 5%, 0) scale(1.14); } }
@keyframes gl-drift-b { from { transform: translate3d(5%, 3%, 0) scale(1.06); } to { transform: translate3d(-7%, -4%, 0) scale(.94); } }
@keyframes gl-travel { from { transform: translateX(-100%); } to { transform: translateX(743%); } }
@keyframes gl-travel-y { from { transform: translateY(-100%); } to { transform: translateY(743%); } }
@keyframes gl-pop { 0% { transform: scale(.5); opacity: 0; } 60% { transform: scale(1.18); opacity: 1; } 100% { transform: scale(1); } }
@keyframes gl-caret { 50% { opacity: 0; } }
@keyframes gl-line-in { from { opacity: 0; transform: translate3d(-6px, 0, 0); } to { opacity: 1; transform: none; } }
@keyframes gl-sheen { from { transform: translateX(-130%) skewX(-18deg); } to { transform: translateX(330%) skewX(-18deg); } }
@keyframes gl-ph-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes gl-ping { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,.45); } 100% { box-shadow: 0 0 0 12px rgba(255,255,255,0); } }
@keyframes gl-float { from { transform: translateY(0); } to { transform: translateY(-5px); } }

.gl-rise { animation: gl-rise .5s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.gl-fade { animation: gl-fade .25s ease-out backwards; }
.gl-blur { animation: gl-blur .8s cubic-bezier(.22,1,.36,1) var(--d, 0ms) backwards; }
.gl-skel { position: relative; overflow: hidden; background: rgba(255,255,255,.045); }
.gl-skel::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.055), transparent); animation: gl-shimmer 1.5s ease-in-out infinite; }
.gl-dot { animation: gl-dot 1.2s ease-in-out infinite; }
.gl-dot:nth-child(2) { animation-delay: .15s; }
.gl-dot:nth-child(3) { animation-delay: .3s; }
/* Three small bars that rise and fall: the loader. Square on purpose, like the rest of the page. */
.gl-bars { display: inline-flex; height: 14px; align-items: center; gap: 2px; color: currentColor; }
.gl-bars i { display: block; width: 3px; height: 100%; border-radius: 1px; background: currentColor; transform-origin: center; animation: gl-bar .9s ease-in-out infinite; }
.gl-bars i:nth-child(2) { animation-delay: .12s; }
.gl-bars i:nth-child(3) { animation-delay: .24s; }
.gl-line { animation: gl-line-in .32s cubic-bezier(.22,1,.36,1) backwards; }
.gl-pop { animation: gl-pop .38s cubic-bezier(.34,1.56,.64,1); }
.gl-ph { animation: gl-ph-in .5s cubic-bezier(.22,1,.36,1) backwards; }
.gl-ping { animation: gl-ping .9s ease-out; }
.gl-float { animation: gl-float 3.2s ease-in-out infinite alternate; }
.gl-caret::after { content: ""; display: inline-block; width: 2px; height: 1.05em; margin-left: 2px; vertical-align: -.16em; background: currentColor; animation: gl-caret 1s steps(1) infinite; }

/* Hero: a slow aurora and a faded grid behind the headline. */
.gl-aurora { position: absolute; inset: 0 0 auto 0; z-index: -1; height: 620px; overflow: hidden; pointer-events: none; -webkit-mask-image: linear-gradient(#000 50%, transparent); mask-image: linear-gradient(#000 50%, transparent); }
.gl-aurora i { position: absolute; display: block; border-radius: 9999px; filter: blur(84px); will-change: transform; }
.gl-aurora i:nth-child(1) { left: 6%; top: 2%; width: 520px; height: 380px; background: #a8ff3e; opacity: .12; animation: gl-drift-a 26s ease-in-out infinite alternate; }
.gl-aurora i:nth-child(2) { right: 4%; top: -2%; width: 560px; height: 360px; background: #ffffff; opacity: .06; animation: gl-drift-b 31s ease-in-out infinite alternate; }
.gl-aurora i:nth-child(3) { left: 36%; top: 40%; width: 420px; height: 240px; background: #a8ff3e; opacity: .05; animation: gl-drift-a 37s ease-in-out infinite alternate-reverse; }
.gl-grid { position: absolute; inset: 0 0 auto 0; z-index: -1; height: 620px; pointer-events: none; background-image: linear-gradient(to right, rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.05) 1px, transparent 1px); background-size: 56px 56px; -webkit-mask-image: radial-gradient(ellipse 70% 62% at 50% 0%, #000 28%, transparent 76%); mask-image: radial-gradient(ellipse 70% 62% at 50% 0%, #000 28%, transparent 76%); }
.gl-gradtext { background: linear-gradient(95deg, #a8ff3e 0%, #dcffac 100%); -webkit-background-clip: text; background-clip: text; color: transparent; -webkit-text-fill-color: transparent; }

/* A gradient stroke around a dark fill: the composer, the Hunt card. */
.gl-gborder { --gb-a: .38; border: 1px solid transparent; transition: --gb-a .35s ease; background: linear-gradient(var(--gb-fill, #0d0d0f), var(--gb-fill, #0d0d0f)) padding-box, linear-gradient(115deg, rgba(168,255,62,var(--gb-a)), rgba(255,255,255,calc(var(--gb-a) * .3)) 52%, rgba(168,255,62,calc(var(--gb-a) * .55))) border-box; }
.gl-gborder:focus-within, .gl-gborder[data-live="true"] { --gb-a: .9; }
.gl-gborder[data-invalid="true"] { background: linear-gradient(var(--gb-fill, #0d0d0f), var(--gb-fill, #0d0d0f)) padding-box, linear-gradient(rgba(251,113,133,.75), rgba(251,113,133,.75)) border-box; }

/* A soft wash behind a card header: no edges, it fades out on every side. */
.gl-wash { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(60% 100% at 0% 0%, rgba(168,255,62,.09), transparent 72%), radial-gradient(55% 90% at 100% 0%, rgba(255,255,255,.04), transparent 72%); }

/* The detail sheets start with a wash in the colour of what they describe. */
.gl-tw-sky, .gl-tw-violet { background: radial-gradient(75% 150% at 0% 0%, rgba(255,255,255,.07), transparent 72%); }
.gl-tw-amber { background: radial-gradient(75% 150% at 0% 0%, rgba(251,191,36,.11), transparent 72%); }
.gl-tw-lime { background: radial-gradient(75% 150% at 0% 0%, rgba(168,255,62,.1), transparent 72%); }
.gl-tw-rose { background: radial-gradient(75% 150% at 0% 0%, rgba(251,113,133,.11), transparent 72%); }

/* Primary buttons carry a sheen that crosses once on hover. */
.gl-sheen { position: relative; overflow: hidden; isolation: isolate; }
.gl-sheen::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 38%; background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); transform: translateX(-130%) skewX(-18deg); pointer-events: none; }
.gl-sheen:hover:not(:disabled)::after { animation: gl-sheen .8s ease-out; }

/* A light that travels along a rail. */
.gl-beam { position: relative; overflow: hidden; }
.gl-beam::after { content: ""; position: absolute; background: linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent); }
.gl-beam-x::after { top: 0; bottom: 0; left: 0; width: 14%; animation: gl-travel 5.5s ease-in-out infinite; }
.gl-beam-y::after { left: 0; right: 0; top: 0; height: 14%; background: linear-gradient(180deg, transparent, rgba(255,255,255,.85), transparent); animation: gl-travel-y 5.5s ease-in-out infinite; }

.gl-reveal { opacity: 0; transform: translate3d(0, 16px, 0); transition: opacity .7s cubic-bezier(.22,1,.36,1) var(--d, 0ms), transform .7s cubic-bezier(.22,1,.36,1) var(--d, 0ms); }
.gl-reveal.is-in { opacity: 1; transform: none; }

.gl-expand { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .38s cubic-bezier(.22,1,.36,1); }
.gl-expand[data-open="true"] { grid-template-rows: 1fr; }
.gl-expand > div { min-height: 0; overflow: hidden; }

.gl-spot { --mx: 50%; --my: 50%; }
.gl-spot::before, .gl-spot::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity .35s ease; }
.gl-spot::before { background: radial-gradient(340px circle at var(--mx) var(--my), rgba(255,255,255,.055), transparent 65%); }
.gl-spot::after { padding: 1px; background: radial-gradient(240px circle at var(--mx) var(--my), rgba(255,255,255,.3), transparent 65%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude; }
.gl-spot:hover::before, .gl-spot:hover::after, .gl-spot:focus-visible::before, .gl-spot:focus-visible::after { opacity: 1; }

/* The chat input: a gradient line draws under it while it has focus. */
.gl-ask { position: relative; transition: border-color .2s ease, box-shadow .25s ease; }
.gl-ask:focus-within { border-color: rgba(255,255,255,.34); box-shadow: 0 0 0 3px rgba(168,255,62,.12); }
.gl-ask::after { content: ""; position: absolute; left: 14px; right: 14px; bottom: -1px; height: 2px; border-radius: 2px; background: #a8ff3e; transform: scaleX(0); transform-origin: left; transition: transform .5s cubic-bezier(.22,1,.36,1); }
.gl-ask:focus-within::after { transform: scaleX(1); }

@media (prefers-reduced-motion: reduce) {
  .gl-rise, .gl-fade, .gl-blur, .gl-skel::after, .gl-dot, .gl-bars i, .gl-line, .gl-pop, .gl-ph, .gl-ping, .gl-float, .gl-caret::after, .gl-aurora i, .gl-beam::after, .gl-sheen:hover:not(:disabled)::after { animation: none !important; }
  .gl-dot { opacity: .7; }
  .gl-bars i { transform: scaleY(.7); }
  .gl-caret::after { opacity: 1; }
  .gl-reveal { opacity: 1; transform: none; transition: none; }
  .gl-expand, .gl-ask, .gl-ask::after, .gl-gborder { transition: none; }
  .gl-spot::before, .gl-spot::after { transition: none; }
  .gl-root *, .gl-root *::before, .gl-root *::after, .gl-sheet, .gl-sheet *, .gl-sheet *::before, .gl-sheet *::after { transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
`

// ────────────────────────────────────────────────────────────────────────────
// Shared pieces
// ────────────────────────────────────────────────────────────────────────────

/** Primary action: the one control per view that carries the brand lime. */
const LIME_BTN =
  "gl-sheen h-10 gap-2 rounded-lg bg-[#a8ff3e] px-4 text-[13.5px] font-semibold text-neutral-950 hover:bg-[#bcff6a] focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d] active:scale-[0.98]"

const OUTLINE_BTN =
  "h-10 gap-2 rounded-lg border-white/[0.12] bg-white/[0.03] px-4 text-[13.5px] font-medium text-neutral-100 hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98]"

/** Small bordered actions on a row (40px touch target on phones, 32px from lg). */
const ACTION_BTN =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[12.5px] font-medium text-neutral-300 transition-[background-color,border-color,color,transform] duration-150 hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.97] lg:h-8"

const CHIP = "inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-[12px] font-medium"

const PANEL = "rounded-2xl border border-white/[0.08] bg-[#0d0d0f] shadow-none"

function GitLenseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3 19 8v8l-7 5-7-5V8l7-5Z" stroke={BRAND} strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.8" fill={BRAND} />
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

function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("gl-skel block rounded-md", className)} />
}

/** Small mono caption used for every section title. */
function Caption({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: "p" | "h2" | "h3" | "span" }) {
  return <Tag className={cn("font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400", className)}>{children}</Tag>
}

/** A tinted square holding an icon. Every colour in the page comes from a tone, so a tone always means the same thing. */
function ToneIcon({ icon: Icon, tone, className, iconClassName }: { icon: LucideIcon; tone: Tone; className?: string; iconClassName?: string }) {
  return (
    <span aria-hidden="true" className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", TONES[tone].icon, className)}>
      <Icon className={cn("h-[18px] w-[18px]", iconClassName)} strokeWidth={2} />
    </span>
  )
}

function ToneChip({ tone, icon: Icon, children, className }: { tone: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn(CHIP, TONES[tone].chip, className)}>
      {Icon && <Icon aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={2.25} />}
      {children}
    </span>
  )
}

/** Eyebrow, title and one line of explanation: the head of every section on the page. */
function SectionHead({ eyebrow, title, desc, tone = "sky", aside, id }: { eyebrow: string; title: string; desc?: string; tone?: Tone; aside?: ReactNode; id?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Caption as="span" className="flex items-center gap-2">
          <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-[2px]", TONES[tone].dot)} />
          {eyebrow}
        </Caption>
        <h2 id={id} className="mt-2 text-balance text-[22px] font-semibold leading-tight tracking-tight text-white sm:text-[26px]">
          {title}
        </h2>
        {desc && <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-neutral-400">{desc}</p>}
      </div>
      {aside}
    </div>
  )
}

function Panel({
  title,
  icon,
  tone = "sky",
  aside,
  delay = 0,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  tone?: Tone
  aside?: ReactNode
  delay?: number
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn("gl-rise", PANEL, className)} style={cssVars({ "--d": `${delay}ms` })}>
      <section>
        <header className="flex min-h-[52px] items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5 sm:px-5">
          <h3 className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
            <Icon2 icon={icon} tone={tone} />
            {title}
          </h3>
          {aside}
        </header>
        <CardContent className="p-4 sm:p-5">{children}</CardContent>
      </section>
    </Card>
  )
}

/** The small icon at the start of a panel title. */
function Icon2({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", TONES[tone].text)} strokeWidth={2} />
}

/** Compact level picker built on the shadcn dropdown (radio items), used where the level cards would not fit. */
function LevelMenu({ value, onChange, className, short }: { value: Level; onChange: (l: Level) => void; className?: string; short?: boolean }) {
  const current = LEVELS.find((l) => l.id === value) ?? LEVELS[1]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`Explanation level: ${value}. Change level`}
          className={cn(OUTLINE_BTN, "justify-between gap-2 px-3 lg:h-9", className)}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <current.icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-300" strokeWidth={2} />
            <span className={cn("text-neutral-400", short && "hidden")}>Level</span>
            <span className="truncate">{value}</span>
          </span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        collisionPadding={16}
        className="gl-menu w-[min(320px,calc(100vw-2rem))] min-w-0 rounded-xl border-white/10 bg-[#111111] p-1.5"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as Level)}>
          {LEVELS.map((l) => (
            <DropdownMenuRadioItem key={l.id} value={l.id} className="items-start rounded-lg py-2 pl-2.5 pr-8 focus:bg-white/[0.07]">
              <span className="min-w-0">
                <span className="block text-[13.5px] font-medium text-neutral-100">{l.id}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-neutral-400">{l.tagline}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Icon button that copies text and confirms with a check for a moment. */
function CopyButton({ text, label, className, children, icon: Glyph = Copy }: { text: string; label: string; className?: string; children?: ReactNode; icon?: LucideIcon }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    []
  )
  async function copy() {
    if (!(await copyText(text))) return
    setCopied(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1600)
  }
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={copied ? "Copied" : label}
        className={cn(ACTION_BTN, "w-10 px-0 lg:w-8", children ? "w-auto px-2.5 lg:w-auto" : "", className)}
      >
        {copied ? <Check key="ok" aria-hidden="true" className="gl-pop h-4 w-4 text-[#a8ff3e]" strokeWidth={2.25} /> : <Glyph aria-hidden="true" className="h-4 w-4" strokeWidth={2} />}
        {children}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </>
  )
}

function RepoAvatar({ owner, size = 44, className }: { owner: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-neutral-800 font-mono text-[13px] font-semibold uppercase text-neutral-300",
        className
      )}
      style={{ width: size, height: size }}
    >
      {owner.slice(0, 1)}
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl(owner, size * 2)}
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

function Stat({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: Tone; label: string; value: ReactNode; hint?: string }) {
  return (
    <div title={hint} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-neutral-400">
        <Icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", TONES[tone].text)} strokeWidth={2} />
        <span className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.04em] sm:tracking-[0.12em]">{label}</span>
      </dt>
      <dd className="mt-1 truncate font-mono text-[16px] font-semibold tabular-nums text-neutral-50 sm:text-[17px]">{value}</dd>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// First visit: composer · level cards · popular repos · how it works · Hunt
// ────────────────────────────────────────────────────────────────────────────

/** Static class strings per tone for the larger icon tiles. Flat, no gradients. */
const GRAD: Record<Tone, string> = {
  sky: "border-white/15 bg-white/[0.06] text-neutral-100",
  violet: "border-white/15 bg-white/[0.06] text-neutral-100",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  lime: "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#e4ffc2]",
}

/** What step one reads like at each level, so the choice is something you can see and not just a label. */
const LEVEL_SAMPLE: Record<Level, { text: string; command?: string }> = {
  Explorer: {
    text: "A fork is your own copy of the project on GitHub. Click Fork, then copy the clone link and paste this into a terminal.",
    command: "git clone https://github.com/YOUR-USERNAME/repo.git",
  },
  Architect: {
    text: "Fork, clone and add upstream. Install from the repo root so workspace packages link correctly.",
    command: "git remote add upstream https://github.com/OWNER/repo.git",
  },
  Veteran: { text: "Standard fork flow. Check for a CLA or DCO bot before you push: it blocks the first pull request until you sign." },
}

const TRUST: { icon: LucideIcon; tone: Tone; text: string }[] = [
  { icon: FileSearch, tone: "sky", text: "Reads real files, not just the README" },
  { icon: ShieldCheck, tone: "lime", text: "Every file path checked against the tree" },
  { icon: Terminal, tone: "sky", text: "Commands you can copy" },
]

const HOW_ICONS: LucideIcon[] = [ClipboardPaste, FileSearch, Route, MessageSquare]

function LevelCards({ value, onChange }: { value: Level; onChange: (l: Level) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // A radio group is one tab stop; the arrow keys move the choice and the focus together.
  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    const i = LEVELS.findIndex((l) => l.id === value)
    let next = -1
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % LEVELS.length
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i + LEVELS.length - 1) % LEVELS.length
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = LEVELS.length - 1
    if (next < 0) return
    e.preventDefault()
    onChange(LEVELS[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Explanation level" onKeyDown={onKeyDown} className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
      {LEVELS.map((l, i) => {
        const on = l.id === value
        return (
          <button
            key={l.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(l.id)}
            className={cn(
              "group relative flex items-start gap-3 overflow-hidden rounded-xl border p-3.5 text-left outline-none transition-[border-color,background-color,transform] duration-200 focus-visible:ring-2 focus-visible:ring-white/60 active:scale-[0.99] sm:flex-col sm:gap-3.5 sm:p-4",
              on ? "border-[#a8ff3e]/45 bg-[#a8ff3e]/[0.05]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.045]"
            )}
          >
            <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-px bg-[#a8ff3e] transition-opacity duration-200", on ? "opacity-90" : "opacity-0")} />
            <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-105", on ? GRAD.lime : TONES.sky.icon)}>
              <l.icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-semibold tracking-tight text-white">{l.id}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-neutral-400">{l.tagline}</span>
              <span className={cn("mt-2 block text-[13px] italic leading-snug", on ? TONES.lime.text : "text-neutral-400")}>&ldquo;{l.quote}&rdquo;</span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-md border transition-[opacity,transform] duration-200",
                on ? cn("scale-100 opacity-100", TONES.lime.icon) : "scale-75 border-white/10 opacity-0"
              )}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LevelSample({ level }: { level: Level }) {
  const s = LEVEL_SAMPLE[level]
  return (
    <div key={level} className={cn("gl-rise mt-3 rounded-xl border p-3.5 text-left sm:p-4", TONES.lime.border, TONES.lime.soft)}>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className={cn("font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em]", TONES.lime.text)}>Sample</span>
        <span className="text-[12.5px] text-neutral-400">Step 1, fork and clone, as written for {level}</span>
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-neutral-100">{s.text}</p>
      {s.command && (
        <code className="mt-2.5 block rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[12.5px] leading-snug text-neutral-100 [overflow-wrap:anywhere]">
          <span aria-hidden="true" className="select-none text-neutral-500">
            ${" "}
          </span>
          {s.command}
        </code>
      )}
    </div>
  )
}

/** "hero" is the first-visit control panel with the level cards; "bar" is the one-row version kept above a result. */
function Composer({
  variant,
  inputId,
  value,
  onChange,
  onSubmit,
  busy,
  done,
  invalid,
  level,
  onLevel,
  note,
}: {
  variant: "hero" | "bar"
  inputId: string
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  busy: boolean
  /** The repository and level in the field are the ones already analyzed, so pressing the button would only repeat that. */
  done: boolean
  invalid: boolean
  level: Level
  onLevel: (l: Level) => void
  note?: ReactNode
}) {
  const hintId = `${inputId}-hint`
  const bar = variant === "bar"
  const parsed = useMemo(() => parseRepoInput(value), [value])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [pasteFailed, setPasteFailed] = useState(false)

  async function paste() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (text) onChange(text.slice(0, 300))
      setPasteFailed(false)
    } catch {
      setPasteFailed(true) // blocked, or not supported: the field still takes a normal paste
    }
    inputRef.current?.focus()
  }

  const size = cn("h-12 shrink-0 px-5 sm:h-12", bar ? "flex-1 md:flex-none" : "w-full sm:w-auto")
  const submit = done ? (
    <Button type="submit" disabled variant="outline" className={cn(OUTLINE_BTN, size, "border-[#a8ff3e]/30 bg-[#a8ff3e]/[0.06] text-[#d3ff9a] disabled:opacity-100")}>
      <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
      Analyzed
    </Button>
  ) : (
    <Button type="submit" disabled={busy} className={cn(LIME_BTN, size)}>
      {busy ? (
        <>
          <span aria-hidden="true" className="gl-bars" />
          Analyzing
        </>
      ) : (
        <>
          Analyze
          <ArrowRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
        </>
      )}
    </Button>
  )

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div
        data-live={Boolean(parsed) || undefined}
        data-invalid={invalid || undefined}
        className={cn("gl-gborder", bar ? "rounded-2xl p-2 sm:p-2.5" : "rounded-[22px] p-2.5 sm:p-3")}
        style={cssVars({ "--gb-fill": "#0b0b0f" })}
      >
        <div className={cn("flex flex-col gap-2", bar ? "md:flex-row md:items-center" : "sm:flex-row sm:items-center")}>
          <div
            className={cn(
              "flex h-12 min-w-0 items-center gap-2 rounded-xl border bg-[#07070a] pl-3.5 pr-1.5 transition-colors focus-within:ring-2 sm:gap-2.5",
              bar ? "md:flex-1" : "sm:flex-1",
              invalid ? "border-rose-500/60 focus-within:border-rose-400 focus-within:ring-rose-400/20" : "border-white/[0.09] focus-within:border-white/50 focus-within:ring-white/15"
            )}
          >
            <SiGithub aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-neutral-300" />
            <label htmlFor={inputId} className="sr-only">
              GitHub repository URL
            </label>
            <Input
              id={inputId}
              ref={inputRef}
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="github.com/owner/repo"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? hintId : undefined}
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-base tracking-[-0.02em] text-neutral-50 shadow-none sm:tracking-normal placeholder:text-[#8a8a8a] focus-visible:border-0 focus-visible:ring-0 aria-invalid:border-0 aria-invalid:ring-0 sm:text-[14px] dark:bg-transparent"
            />
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  inputRef.current?.focus()
                }}
                aria-label="Clear the URL"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 outline-none transition-colors hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void paste()}
                aria-label="Paste from the clipboard"
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[12.5px] font-medium text-neutral-200 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <ClipboardPaste aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                <span className="hidden sm:inline">Paste</span>
              </button>
            )}
          </div>

          {bar ? (
            <div className="flex gap-2">
              <LevelMenu value={level} onChange={onLevel} className="h-12 flex-1 md:w-[172px] md:flex-none lg:h-12" />
              {submit}
            </div>
          ) : (
            submit
          )}
        </div>

        {invalid ? (
          <p id={hintId} role="alert" className="mt-2.5 px-1.5 text-left text-[12.5px] text-rose-300">
            Enter a GitHub repository, like github.com/vercel/next.js
          </p>
        ) : parsed ? (
          <>
            <p className="gl-fade mt-2.5 flex min-w-0 items-center gap-2 px-1.5 text-left text-[12.5px] text-neutral-300">
              <RepoAvatar key={parsed.owner} owner={parsed.owner} size={20} className="rounded-md" />
              <span className="min-w-0 truncate font-mono">
                <span className="text-neutral-400">{parsed.owner}/</span>
                {parsed.repo}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[#c6ff7a]">
                <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                {done ? `Analyzed for ${level}` : "Ready"}
              </span>
            </p>
            {done && (
              <p role="status" className="mt-1 px-1.5 text-left text-[12.5px] text-neutral-400">
                Nothing runs again at the same level. Pick another level to get a new version.
              </p>
            )}
          </>
        ) : pasteFailed ? (
          <p role="status" className="mt-2.5 px-1.5 text-left text-[12.5px] text-neutral-400">
            The browser blocked clipboard access. Paste into the field with Ctrl+V or a long press.
          </p>
        ) : null}

        {note}

        {!bar && (
          <div className="mt-3 border-t border-white/[0.07] pt-4 sm:mt-4 sm:pt-5">
            <div className="mb-3 flex flex-col gap-1 text-left sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <Caption as="h2" className="text-neutral-200">
                Who is reading?
              </Caption>
              <p className="text-[13px] text-neutral-400">Everyone starts somewhere. Pick the voice that fits you today.</p>
            </div>
            <LevelCards value={level} onChange={onLevel} />
            <LevelSample level={level} />
          </div>
        )}
      </div>
    </form>
  )
}

function Hero({ composer }: { composer: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="gl-rise inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] py-1 pl-1 pr-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0d0d10] ring-1 ring-[#a8ff3e]/35">
          <GitLenseMark className="h-4 w-4" />
        </span>
        <span className="text-[13.5px] font-semibold tracking-tight text-white">GitLense</span>
        <span aria-hidden="true" className="h-3.5 w-px bg-white/15" />
        <span className="text-[12.5px] text-neutral-300">Open-source onboarding</span>
      </div>
      <h1 className="gl-blur mt-5 text-balance text-[34px] font-semibold leading-[1.06] tracking-tight text-white sm:text-[50px] lg:text-[60px]" style={cssVars({ "--d": "40ms" })}>
        Understand any repo.
        <br className="hidden sm:block" /> <span className="gl-gradtext">Ship your first PR.</span>
      </h1>
      <p className="gl-rise mx-auto mt-4 max-w-xl text-pretty text-[15.5px] leading-relaxed text-neutral-400 sm:text-[17px]" style={cssVars({ "--d": "130ms" })}>
        Paste a GitHub URL. GitLense reads the real files and maps every step from fork to merged pull request, written for your level.
      </p>
      <div className="gl-rise mt-7 sm:mt-9" style={cssVars({ "--d": "210ms" })}>
        {composer}
        <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12.5px] text-neutral-400">
          {TRUST.map((t) => (
            <li key={t.text} className="flex items-center gap-1.5">
              <t.icon aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0", TONES[t.tone].text)} strokeWidth={2} />
              {t.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Popular repos ────────────────────────────────────────────────────────────

function PopularCard({ repo, desc, lang, tag, index, onPick }: PopularRepo & { index: number; onPick: (repo: string) => void }) {
  const [owner, name] = repo.split("/")
  const tone: Tone = "sky"
  return (
    <li className="gl-rise" style={cssVars({ "--d": `${index * 45}ms` })}>
      <button
        type="button"
        onClick={() => onPick(repo)}
        onPointerMove={trackPointer}
        className="gl-spot group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4 text-left outline-none transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.18] focus-visible:ring-2 focus-visible:ring-white/50 active:translate-y-0 active:scale-[0.99] sm:p-5"
      >
        <span aria-hidden="true" className={cn("absolute inset-x-5 top-0 h-px opacity-60 transition-opacity duration-300 group-hover:opacity-100", TONES[tone].bar)} />
        <span className="relative z-10 flex items-start gap-3">
          <RepoAvatar owner={owner} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold tracking-tight">
              <span className="text-neutral-400">{owner}/</span>
              <span className="text-neutral-50">{name}</span>
            </span>
            <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-neutral-400">
              {desc}
              <span className="sr-only">. Fills in the URL field.</span>
            </span>
          </span>
        </span>
        <span className="relative z-10 mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <ToneChip tone={tone}>{tag}</ToneChip>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ background: langColor(lang) }} />
              {lang}
            </span>
          </span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-500 transition-[transform,color] duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-100" />
        </span>
      </button>
    </li>
  )
}

function PopularRepos({ onPick }: { onPick: (repo: string) => void }) {
  const picks = usePopular()
  const [turns, setTurns] = useState(0)
  return (
    <section aria-labelledby="gl-popular">
      <SectionHead
        id="gl-popular"
        eyebrow="Popular"
        title="Start with a repo people love"
        desc="A fresh set every visit. Pick one to fill in the URL."
        tone="violet"
        aside={
          <button
            type="button"
            onClick={() => {
              setTurns((n) => n + 1)
              shufflePopular()
            }}
            className={cn(ACTION_BTN, "self-start px-3.5 sm:self-auto")}
          >
            <Shuffle aria-hidden="true" className="h-4 w-4 transition-transform duration-500" style={{ transform: `rotate(${turns * 180}deg)` }} />
            Shuffle
          </button>
        }
      />
      {picks ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((r, i) => (
            <PopularCard key={r.repo} {...r} index={i} onPick={onPick} />
          ))}
        </ul>
      ) : (
        <ul aria-hidden="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i}>
              <Skeleton className="h-[132px] rounded-2xl" />
            </li>
          ))}
        </ul>
      )}
      <span role="status" className="sr-only">
        {turns > 0 ? "Showing a new set of repositories" : ""}
      </span>
    </section>
  )
}

// ── How it works ─────────────────────────────────────────────────────────────

function MiniFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-white/[0.07] bg-[#07070a] p-2.5 font-mono text-[11px] text-neutral-300", className)}>{children}</div>
}

/** Four tiny pictures of the product, one per step. They are decoration, so assistive tech skips them. */
const HOW_VISUALS: ReactNode[] = [
  <MiniFrame key="paste">
    <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/[0.05] px-2 py-1.5">
      <SiGithub className="h-3 w-3 shrink-0 text-neutral-300" />
      <span className="gl-caret min-w-0 truncate text-neutral-100">github.com/vercel/next.js</span>
    </div>
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-neutral-400">
        {LEVELS.map((l) => (
          <span key={l.id} className="h-2 w-2 rounded-[2px] bg-neutral-500" />
        ))}
        your level
      </span>
      <span className="shrink-0 rounded-md bg-[#a8ff3e] px-2 py-1 text-[10.5px] font-semibold text-neutral-950">Analyze</span>
    </div>
  </MiniFrame>,
  <MiniFrame key="read">
    <ul className="space-y-1.5">
      {["package.json", "CONTRIBUTING.md", ".github/workflows", "packages/next/src"].map((f, i) => (
        <li key={f} className="gl-line flex items-center gap-2" style={{ animationDelay: `${i * 90}ms` }}>
          <FileCode2 className="h-3 w-3 shrink-0 text-neutral-400" />
          <span className="min-w-0 truncate">{f}</span>
          <Check className="ml-auto h-3 w-3 shrink-0 text-[#a8ff3e]" strokeWidth={2.5} />
        </li>
      ))}
    </ul>
  </MiniFrame>,
  <MiniFrame key="roadmap">
    <div className="flex items-center gap-1">
      {PHASES.map((p) => (
        <span key={p.label} className={cn("h-1.5 flex-1 rounded-[2px]", TONES[p.tone].bar)} />
      ))}
    </div>
    <div className="mt-2 grid grid-cols-4 gap-1 text-[9.5px] font-semibold uppercase tracking-wider">
      {PHASES.map((p) => (
        <span key={p.label} className={TONES[p.tone].text}>
          {p.label}
        </span>
      ))}
    </div>
    <p className="mt-2 text-neutral-400">9 steps, fork to merged PR</p>
  </MiniFrame>,
  <MiniFrame key="chat">
    <p className="ml-auto w-fit max-w-full truncate rounded-lg rounded-br-sm bg-white/[0.09] px-2 py-1 text-neutral-100">How do I run the tests?</p>
    <div className="mt-1.5 rounded-lg border border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.06] p-2">
      <p className="font-sans text-[11.5px] font-medium text-neutral-100">Run the suite from the repo root.</p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5">$ pnpm test</span>
        <span className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-neutral-200">package.json</span>
      </div>
    </div>
  </MiniFrame>,
]

function HowItWorks() {
  return (
    <section aria-labelledby="gl-how">
      <SectionHead id="gl-how" eyebrow="How it works" title="Four steps, no guesswork" desc="From a pasted link to a plan you can follow, built from the repository itself." tone="amber" />
      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {HOW_IT_WORKS.map((s, i) => {
          const t = TONES.sky
          return (
            <li key={s.title} className="h-full">
              <Reveal delay={i * 80} className="h-full">
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4 sm:p-5">
                  <span aria-hidden="true" className={cn("absolute inset-x-5 top-0 h-px opacity-70", t.bar)} />
                  <div className="flex items-center justify-between">
                    <ToneIcon icon={HOW_ICONS[i]} tone="sky" className="h-10 w-10" />
                    <span aria-hidden="true" className="font-mono text-[30px] font-semibold leading-none tabular-nums text-neutral-500">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[15.5px] font-semibold tracking-tight text-white">{s.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-neutral-400">{s.desc}</p>
                  <div aria-hidden="true" className="mt-4 flex flex-1 flex-col justify-end">
                    {HOW_VISUALS[i]}
                  </div>
                </div>
              </Reveal>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// ── Next step: Hunt ──────────────────────────────────────────────────────────

const HUNT_LABELS: { label: string; tone: Tone }[] = [
  { label: "good first issue", tone: "lime" },
  { label: "help wanted", tone: "sky" },
  { label: "docs", tone: "sky" },
]

function HuntCta({ repo }: { repo?: string }) {
  return (
    <Reveal>
      <aside
        className="gl-gborder relative overflow-hidden rounded-3xl p-5 sm:p-8 lg:p-10"
        style={cssVars({ "--gb-fill": "#0a0a0f", "--gb-a": 0.55 })}
        aria-labelledby="gl-hunt"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <i className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-[#a8ff3e]/10 blur-[80px]" />
          <i className="absolute -bottom-20 left-1/3 h-56 w-72 rounded-full bg-white/[0.06] blur-[80px]" />
        </div>
        <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <Caption as="span" className="flex items-center gap-2 text-[#c6ff7a]">
              <Compass aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
              Your next step
            </Caption>
            <h2 id="gl-hunt" className="mt-3 text-balance text-[26px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[34px]">
              {repo ? (
                <>
                  You know {repo}. <span className="gl-gradtext">Now find the issue to fix.</span>
                </>
              ) : (
                <>
                  Know the repo? <span className="gl-gradtext">Find the issue to fix.</span>
                </>
              )}
            </h2>
            <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-neutral-300">
              Hunt lists open issues that match your stack, with the repository details beside each one, so you can pick work you will actually finish.
            </p>
            <ul aria-label="Labels Hunt looks for" className="mt-4 flex flex-wrap gap-1.5 md:hidden">
              {HUNT_LABELS.map((l) => (
                <li key={l.label}>
                  <ToneChip tone={l.tone}>{l.label}</ToneChip>
                </li>
              ))}
            </ul>
            <Button asChild className={cn(LIME_BTN, "mt-6 h-12 w-full px-6 text-[14.5px] sm:w-auto")}>
              {/* A new tab, so the analysis on this page is still here when you come back. */}
              <a href="/hunt" target="_blank" rel="noopener noreferrer">
                Hunt issues
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </div>

          <div aria-hidden="true" className="relative hidden h-[190px] md:block">
            {HUNT_LABELS.map((l, i) => (
              <div
                key={l.label}
                className="gl-float absolute w-[236px] rounded-xl border border-white/10 bg-[#101016] p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
                style={{ top: i * 56, left: i % 2 === 0 ? 24 : 0, transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)`, animationDelay: `${i * 0.6}s`, zIndex: 3 - i }}
              >
                <div className="flex items-center gap-2">
                  <CircleDot className={cn("h-3.5 w-3.5 shrink-0", TONES[l.tone].text)} strokeWidth={2.25} />
                  <span className="h-2 flex-1 rounded-[2px] bg-white/[0.12]" />
                  <ToneChip tone={l.tone} className="h-5 px-1.5 text-[10px]">
                    {l.label}
                  </ToneChip>
                </div>
                <span className="mt-2 block h-1.5 w-2/3 rounded-[2px] bg-white/[0.07]" />
              </div>
            ))}
          </div>
        </div>
      </aside>
    </Reveal>
  )
}

function StatePanel({ title, message, children }: { title: string; message: ReactNode; children?: ReactNode }) {
  return (
    <div role="alert" className="gl-rise mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-white/[0.08] bg-[#0d0d0f] px-6 py-12 text-center sm:py-14">
      <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400">
        <AlertIcon className="h-5 w-5" />
      </span>
      <h2 className="mb-1.5 text-[17px] font-semibold tracking-tight text-neutral-100">{title}</h2>
      <p className="mb-6 text-[13.5px] leading-relaxed text-neutral-400">{message}</p>
      {children && <div className="flex flex-wrap items-center justify-center gap-2.5">{children}</div>}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Progress: the log fills as the server reports what it found
// ────────────────────────────────────────────────────────────────────────────

type PartState = "wait" | "write" | "done" | "fallback"

/** What the stream has reported so far. Every field is something the server really found, so the card is a live report and not an animation. */
interface Progress {
  run: number
  owner: string
  repo: string
  level: Level
  facts: Facts | null
  meta: RepoMeta
  /** The repository's own one-line description. */
  blurb: string
  /** How many files were ranked for reading, and the first few by name. */
  pick: { total: number; best: string[] } | null
  /** Files opened so far, newest last. */
  read: { count: number; recent: string[] }
  /** Technologies the files revealed, once detection has run. */
  stack: string[] | null
  index: { symbols: number; files: number } | null
  /** True when the server still had this repository from a moment ago and did not fetch it again. */
  reused: boolean
  /** What was handed to the model. */
  context: { files: number; chars: number } | null
  overview: PartState
  roadmap: PartState
}

function newProgress(run: number, owner: string, repo: string, level: Level): Progress {
  return { run, owner, repo, level, facts: null, meta: {}, blurb: "", pick: null, read: { count: 0, recent: [] }, stack: null, index: null, reused: false, context: null, overview: "wait", roadmap: "wait" }
}

const SIZE_LABEL: Record<Facts["size"], string> = { tiny: "Tiny repo", small: "Small repo", medium: "Medium repo", large: "Large repo", huge: "Huge repo" }

const STAGES = ["Repo", "Read", "Overview", "Roadmap"]

type StageState = "pending" | "active" | "done"
const partStage = (s: PartState): StageState => (s === "done" || s === "fallback" ? "done" : s === "write" ? "active" : "pending")

/** The languages as one proportional bar with a legend. It grows into place when it first appears. */
function LanguageBar({ languages, animate = false }: { languages: Facts["languages"]; animate?: boolean }) {
  const [grown, setGrown] = useState(!animate)
  useEffect(() => {
    if (grown) return
    const id = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(id)
  }, [grown])
  if (languages.length === 0) return null
  return (
    <div>
      <div role="img" aria-label={`Languages: ${languages.map((l) => `${l.name} ${l.pct}%`).join(", ")}`} className="flex h-2 gap-px overflow-hidden rounded-[3px] bg-white/[0.06]">
        {languages.map((l) => (
          <span key={l.name} className="h-full transition-[width] duration-700 ease-out" style={{ width: grown ? `${Math.max(l.pct, 1.5)}%` : 0, background: langColor(l.name) }} />
        ))}
      </div>
      <ul aria-hidden="true" className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-neutral-300">
        {languages.map((l) => (
          <li key={l.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: langColor(l.name) }} />
            {l.name}
            <span className="font-mono tabular-nums text-neutral-400">{l.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LogRow({ icon: Icon, tone, label, status, children }: { icon: LucideIcon; tone: Tone; label: string; status?: ReactNode; children: ReactNode }) {
  return (
    <li className="gl-line flex items-start gap-3 py-1.5">
      <span aria-hidden="true" className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border", TONES[tone].icon)}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</p>
        <div className="text-[13.5px] leading-snug text-neutral-100 [overflow-wrap:anywhere]">{children}</div>
      </div>
      {status && <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">{status}</span>}
    </li>
  )
}

const BARS = <span aria-hidden="true" className="gl-bars text-neutral-200" />
const TICK = <Check aria-hidden="true" className="gl-pop h-4 w-4 text-[#a8ff3e]" strokeWidth={2.75} />

/** Technologies with their own logos, as small chips. */
function StackChips({ names }: { names: string[] }) {
  return (
    <ul aria-label="Detected technologies" className="mt-1.5 flex flex-wrap gap-1.5">
      {names.map((n) => (
        <li key={n}>
          <span className={cn(CHIP, "gap-1.5 border-white/10 bg-white/[0.03] pl-1.5 text-neutral-200")}>
            <TechMark name={n} className="h-3.5 w-3.5" />
            {n}
          </span>
        </li>
      ))}
    </ul>
  )
}

function AnalysisProgress({ p, onCancel }: { p: Progress; onCancel: () => void }) {
  const { facts, meta } = p
  const [elapsed, setElapsed] = useState(0)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => setElapsed(performance.now() - start), 250)
    return () => window.clearInterval(id)
  }, [])

  // The structure lines come from the facts, so a bigger repository has more of them. They appear one after another
  // over about three seconds, whatever their number, so the log reads as work in progress and not as a dump.
  const lines = useMemo(() => (facts ? scanLines(facts) : []), [facts])
  const count = lines.length
  useEffect(() => {
    if (count === 0) return
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setShown(count))
      return () => cancelAnimationFrame(id)
    }
    const gap = Math.min(320, Math.max(110, 3200 / count))
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setShown(n)
      if (n >= count) window.clearInterval(id)
    }, gap)
    return () => window.clearInterval(id)
  }, [count])

  const files = useCountUp(facts?.files ?? 0, Boolean(facts))
  const scanning = Boolean(facts) && shown < count
  const writesStarted = p.overview !== "wait" || p.roadmap !== "wait"
  const stillWriting = p.overview !== "done" || (p.roadmap !== "done" && p.roadmap !== "fallback")
  const reading = Boolean(facts) && !scanning && !writesStarted && !p.stack && !p.reused
  const stages: StageState[] = [facts ? "done" : "active", !facts ? "pending" : writesStarted ? "done" : "active", partStage(p.overview), partStage(p.roadmap)]
  const latest = p.read.recent[p.read.recent.length - 1]
  const stage = !facts ? "Fetching the file tree" : scanning ? "Reading the structure" : !writesStarted ? "Reading the files" : stillWriting ? "Writing the overview and the roadmap" : "Checking every file path"
  const status = !scanning && !writesStarted && latest ? `Opening ${latest}` : stage
  const slow = elapsed > 30_000
  const ctx = p.context ? `, from ${plural(p.context.files, "file")} (${compact(p.context.chars)} characters)` : ""

  const writes: { id: string; icon: LucideIcon; label: string; state: PartState; text: Record<PartState, string> }[] = [
    {
      id: "overview",
      icon: BookOpen,
      label: "Overview",
      state: p.overview,
      text: { wait: "", write: `Explaining the project for the ${p.level} level${ctx}`, done: "Purpose, architecture, stack and areas written", fallback: "" },
    },
    {
      id: "roadmap",
      icon: Route,
      label: "Roadmap",
      state: p.roadmap,
      text: { wait: "", write: "Writing nine steps from fork to merged pull request", done: "Nine steps written for this repository", fallback: "Standard steps, filled in from the facts above" },
    },
  ]

  return (
    <div className={cn("gl-fade overflow-hidden", PANEL)}>
      <span role="status" className="sr-only">
        Analyzing {p.owner}/{p.repo}. {stage}.
      </span>

      <div aria-hidden="true">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
          <RepoAvatar key={p.owner} owner={p.owner} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold tracking-tight text-white">
              <span className="text-neutral-400">{p.owner}/</span>
              {p.repo}
            </p>
            {p.blurb && <p className="gl-fade mt-0.5 truncate text-[12.5px] text-neutral-300">{p.blurb}</p>}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] text-neutral-400">
              {facts ? (
                <span className="gl-fade text-neutral-200">
                  {SIZE_LABEL[facts.size]} · <span className="font-mono tabular-nums">{grouped(files)}</span> {files === 1 ? "file" : "files"}
                </span>
              ) : (
                <span>Connecting to GitHub</span>
              )}
              {typeof meta.stars === "number" && (
                <span className="gl-fade inline-flex items-center gap-1">
                  <Star className="h-3 w-3" strokeWidth={2.25} />
                  {compact(meta.stars)}
                </span>
              )}
              {typeof meta.forks === "number" && (
                <span className="gl-fade inline-flex items-center gap-1">
                  <GitFork className="h-3 w-3" strokeWidth={2.25} />
                  {compact(meta.forks)}
                </span>
              )}
              {meta.license && <span className="gl-fade">{meta.license}</span>}
              {meta.primaryLanguage && (
                <span className="gl-fade inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: langColor(meta.primaryLanguage) }} />
                  {meta.primaryLanguage}
                </span>
              )}
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[12px] tabular-nums text-neutral-300">{formatElapsed(elapsed)}</span>
        </div>

        <ol className="grid grid-cols-4 gap-1.5 px-4 pt-4 sm:gap-2 sm:px-5">
          {STAGES.map((label, i) => {
            const st = stages[i]
            return (
              <li key={label}>
                <span className={cn("block h-1 rounded-[2px]", st === "pending" ? "bg-white/10" : st === "done" ? "bg-[#a8ff3e]" : "gl-beam gl-beam-x bg-white/45")} />
                <span className={cn("mt-1.5 flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider sm:text-[10.5px]", st === "pending" ? "text-neutral-400" : st === "done" ? "text-[#c6ff7a]" : "text-neutral-100")}>
                  {st === "done" && <Check className="h-3 w-3 shrink-0" strokeWidth={3} />}
                  <span className="truncate">{label}</span>
                </span>
              </li>
            )
          })}
        </ol>

        {facts && facts.languages.length > 0 && (
          <div className="gl-fade px-4 pt-4 sm:px-5">
            <LanguageBar languages={facts.languages} animate />
          </div>
        )}

        <ul className="px-4 pb-3 pt-3 sm:px-5">
          {!facts && (
            <LogRow icon={FolderTree} tone="sky" label="File tree" status={BARS}>
              Fetching every path in {p.owner}/{p.repo}
            </LogRow>
          )}
          {lines.slice(0, shown).map((l) => (
            <LogRow key={l.id} icon={l.icon} tone={l.tone} label={l.label}>
              {l.value}
            </LogRow>
          ))}
          {facts && !scanning && p.reused && (
            <LogRow icon={Zap} tone="sky" label="Files">
              Read a moment ago, so they are reused and nothing is fetched again
            </LogRow>
          )}
          {facts && !scanning && p.pick && (
            <LogRow icon={ListChecks} tone="sky" label="Choosing files">
              {plural(p.pick.total, "file")} ranked by how much they teach a newcomer. {p.pick.best.length > 0 && <>Opening <span className="font-mono text-[12.5px]">{p.pick.best.slice(0, 3).join(", ")}</span> first.</>}
            </LogRow>
          )}
          {facts && !scanning && p.read.count > 0 && (
            <LogRow icon={FileSearch} tone="sky" label="Reading files" status={reading ? BARS : TICK}>
              {plural(p.read.count, "file")} opened{reading ? "" : ", done"}
              {reading && (
                <ul className="mt-1 space-y-0.5 font-mono text-[12px] text-neutral-400">
                  {p.read.recent.slice(-3).map((path) => (
                    <li key={path} className="gl-line truncate">
                      {path}
                    </li>
                  ))}
                </ul>
              )}
            </LogRow>
          )}
          {facts && !scanning && p.stack && p.stack.length > 0 && (
            <LogRow icon={Layers} tone="sky" label="Detected">
              {plural(p.stack.length, "technology", "technologies")} found in the manifests and config files
              <StackChips names={p.stack} />
            </LogRow>
          )}
          {facts && !scanning && p.index && p.index.symbols > 0 && (
            <LogRow icon={Code2} tone="sky" label="Code index">
              {plural(p.index.symbols, "symbol")} indexed across {plural(p.index.files, "file")}
            </LogRow>
          )}
          {facts &&
            !scanning &&
            writesStarted &&
            writes.map((w) => (
              <LogRow key={w.id} icon={w.icon} tone={w.state === "fallback" ? "amber" : w.state === "done" ? "lime" : "sky"} label={w.label} status={w.state === "write" ? BARS : w.state === "wait" ? undefined : w.state === "fallback" ? <TriangleAlert aria-hidden="true" className="h-4 w-4 text-amber-300" strokeWidth={2.25} /> : TICK}>
                {w.text[w.state] || "Waiting to start"}
              </LogRow>
            ))}
        </ul>

        {facts && !scanning && (
          <p className="gl-fade mx-4 mb-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12.5px] leading-relaxed text-neutral-400 sm:mx-5">
            {facts.size === "huge" || facts.size === "large"
              ? `A big repository: the most relevant files are read first${facts.skipped ? ` and ${grouped(facts.skipped)} generated or vendored paths are skipped` : ""}.`
              : facts.size === "tiny"
                ? "A small repository: everything fits, so every file can be considered."
                : "Real files are read, not just the README."}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-2.5 sm:px-5">
        <p aria-hidden="true" className="min-w-0 truncate text-[12.5px] text-neutral-400">
          {slow ? "Large repositories take longer. Still working." : status}
        </p>
        <Button type="button" variant="outline" onClick={onCancel} className={cn(OUTLINE_BTN, "h-9 shrink-0 px-3 text-[13px]")}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

/** Grey outlines of the result while it is being written, so the page does not jump when it arrives. */
function ResultSkeleton() {
  return (
    <div aria-hidden="true" className="mt-5 space-y-4 sm:mt-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[62px] rounded-xl" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <div key={i} className={cn("space-y-3 p-4 sm:p-5", PANEL)}>
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-[70%]" />
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Result: header · at a glance · roadmap · areas · files · stack
// ────────────────────────────────────────────────────────────────────────────

const BODY_TEXT = "max-w-[68ch] text-[15px] leading-[1.7] text-neutral-200"
function Callout({ tone, icon: Icon, label, children }: { tone: Tone; icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className={cn("flex gap-2.5 rounded-xl border px-3 py-2.5", TONES[tone].icon, "text-neutral-100")}>
      <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", TONES[tone].text)} strokeWidth={2.25} />
      <p className="min-w-0 text-[13.5px] leading-relaxed [overflow-wrap:anywhere]">
        <span className={cn("mr-1.5 font-semibold", TONES[tone].text)}>{label}.</span>
        {children}
      </p>
    </div>
  )
}

function Commands({ commands, className }: { commands: string[]; className?: string }) {
  if (commands.length === 0) return null
  return (
    <ul className={cn("space-y-2", className)}>
      {commands.map((c) => (
        <li key={c} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-lg border border-white/[0.08] bg-[#07070a] pl-3 pr-1">
          <span aria-hidden="true" className="select-none py-2.5 font-mono text-[12.5px] leading-snug text-[#a8ff3e]">
            $
          </span>
          <code className="py-2.5 font-mono text-[12.5px] leading-snug text-neutral-100 [overflow-wrap:anywhere]">{c}</code>
          <CopyButton text={c} label={`Copy command ${c}`} className="mt-0.5 border-transparent bg-transparent" />
        </li>
      ))}
    </ul>
  )
}

/** A file the reader can open: one tap explains it in the side sheet. */
function FileRow({ path, why, tone = "sky", onOpen, bare }: { path: string; why?: string; tone?: Tone; onOpen: () => void; bare?: boolean }) {
  const { dir, file } = splitPath(path)
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex min-w-0 items-start gap-3 p-3 text-left outline-none transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-white/50",
        bare ? "w-full flex-1 rounded-xl hover:bg-white/[0.04] focus-visible:ring-inset" : "w-full rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
      )}
    >
      <span aria-hidden="true" className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", TONES[tone].icon)}>
        <FileCode2 className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="sr-only">Explain </span>
        <span className="block font-mono text-[12.5px] leading-snug [overflow-wrap:anywhere]">
          <span className="text-neutral-400">
            <Breakable text={dir} />
          </span>
          <span className="font-semibold text-neutral-50">{file}</span>
        </span>
        {why && <span className="mt-1 block text-[13px] leading-relaxed text-neutral-300">{withInlineCode(why)}</span>}
      </span>
      <span aria-hidden="true" className="mt-0.5 hidden shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11.5px] font-medium text-neutral-300 transition-colors group-hover:border-white/25 group-hover:text-white sm:inline-flex">
        <Sparkles className="h-3 w-3" strokeWidth={2.25} />
        Explain
      </span>
    </button>
  )
}

function FileChips({ files, onFile, label }: { files: string[]; onFile: (path: string) => void; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {files.map((p) => (
        <li key={p} className="min-w-0 max-w-full">
          <button
            type="button"
            onClick={() => onFile(p)}
            aria-label={`Explain ${p}`}
            className="group inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[12px] text-neutral-100 outline-none transition-colors hover:border-white/25 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/50 lg:min-h-9"
          >
            <FileCode2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="min-w-0 truncate">{p}</span>
            <ArrowUpRight aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
          </button>
        </li>
      ))}
    </ul>
  )
}

// ── Header ───────────────────────────────────────────────────────────────────

function CountStat({ icon, tone, label, n, hint }: { icon: LucideIcon; tone: Tone; label: string; n: number; hint: string }) {
  const v = useCountUp(n)
  return <Stat icon={icon} tone={tone} label={label} value={compact(v)} hint={hint} />
}

function RepoHeader({
  a,
  level,
  ready,
  onRerun,
  onAsk,
  headingRef,
}: {
  a: Analysis
  level: Level
  /** The analysis for the chosen level already exists in this tab, so showing it costs nothing. */
  ready: boolean
  onRerun: () => void
  onAsk: () => void
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const { meta } = a
  const stale = a.level !== level
  const lv = LEVELS.find((l) => l.id === a.level) ?? LEVELS[1]
  const share = `${window.location.origin}${window.location.pathname}?repo=${a.owner}/${a.repo}${a.level === DEFAULT_LEVEL ? "" : `&level=${a.level}`}`
  const pushed = timeAgo(meta.lastPushed)
  const topics = meta.topics ?? []
  const hasChips = Boolean(meta.primaryLanguage || meta.framework || meta.repositoryType || meta.license || topics.length)

  return (
    <header className="gl-rise relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4 sm:p-6">
      <div aria-hidden="true" className="gl-wash" />
      <div className="relative space-y-5">
        <div className="flex items-start gap-3.5">
          <RepoAvatar key={a.owner} owner={a.owner} size={52} className="rounded-lg" />
          <div className="min-w-0 flex-1">
            <h2 ref={headingRef} tabIndex={-1} className="text-[22px] font-semibold leading-tight tracking-tight outline-none [overflow-wrap:anywhere] sm:text-[28px]">
              <span className="text-neutral-400">{a.owner}/</span>
              <wbr />
              <span className="text-white">{a.repo}</span>
            </h2>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-neutral-400">
              <span>Written for</span>
              <ToneChip tone="sky" icon={lv.icon}>
                {a.level}
              </ToneChip>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* The chat sits at the bottom of the page until xl, where it moves beside the result. */}
            <button type="button" onClick={onAsk} aria-label="Ask about this repo" className={cn(ACTION_BTN, "w-10 px-0 sm:w-auto sm:px-3 xl:hidden")}>
              <MessageSquare aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">Ask</span>
            </button>
            <CopyButton text={share} label="Copy a link to this analysis" icon={Link2} className="min-w-10 px-2.5">
              <span className="hidden sm:inline">Link</span>
            </CopyButton>
            <a href={a.url} target="_blank" rel="noopener noreferrer" aria-label="Open on GitHub (opens in a new tab)" className={cn(ACTION_BTN, "w-10 px-0 sm:w-auto sm:px-3")}>
              <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>

        {stale && (
          <div className="flex flex-col gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] leading-snug text-neutral-300">
              This breakdown is written for {a.level}. Your level is now {level}.
            </p>
            <Button type="button" variant="outline" onClick={onRerun} className={cn(OUTLINE_BTN, "h-10 shrink-0 px-3 text-[13px] lg:h-9")}>
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              {ready ? `Show the ${level} version` : `Analyze as ${level}`}
            </Button>
          </div>
        )}

        {(typeof meta.stars === "number" || typeof meta.forks === "number" || typeof meta.openIssues === "number" || pushed) && (
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {typeof meta.stars === "number" && <CountStat icon={Star} tone="sky" label="Stars" n={meta.stars} hint={`${grouped(meta.stars)} stars`} />}
            {typeof meta.forks === "number" && <CountStat icon={GitFork} tone="sky" label="Forks" n={meta.forks} hint={`${grouped(meta.forks)} forks`} />}
            {typeof meta.openIssues === "number" && <CountStat icon={CircleDot} tone="sky" label="Open issues" n={meta.openIssues} hint={`${grouped(meta.openIssues)} open issues`} />}
            {pushed && <Stat icon={Clock} tone="sky" label="Last push" value={pushed} hint={formatExactDate(meta.lastPushed)} />}
          </dl>
        )}

        {hasChips && (
          <ul aria-label="Repository details" className="flex flex-wrap gap-1.5">
            {meta.primaryLanguage && (
              <li>
                <span className={cn(CHIP, "border-white/10 bg-white/[0.04] text-neutral-100")}>
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: langColor(meta.primaryLanguage) }} />
                  {meta.primaryLanguage}
                </span>
              </li>
            )}
            {meta.framework && (
              <li>
                <span className={cn(CHIP, "border-white/10 bg-white/[0.04] pl-1.5 text-neutral-100")}>
                  <TechMark name={meta.framework} className="h-3.5 w-3.5" />
                  {meta.framework}
                </span>
              </li>
            )}
            {meta.repositoryType && (
              <li>
                <ToneChip tone="sky" icon={Boxes}>
                  {meta.repositoryType === "monorepo" ? "Monorepo" : "Single package"}
                </ToneChip>
              </li>
            )}
            {meta.license && (
              <li>
                <ToneChip tone="sky" icon={Scale}>
                  {meta.license}
                </ToneChip>
              </li>
            )}
            {topics.slice(0, 6).map((t) => (
              <li key={t}>
                <span className={cn(CHIP, "border-white/10 text-neutral-300")}>{t}</span>
              </li>
            ))}
            {topics.length > 6 && (
              <li>
                <span className={cn(CHIP, "border-white/10 text-neutral-300")}>+{topics.length - 6}</span>
              </li>
            )}
          </ul>
        )}
      </div>
    </header>
  )
}

function JumpNav({ items }: { items: { id: string; label: string; icon: LucideIcon }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "")

  // The tab for the section in view lights up, so the strip doubles as a "you are here" marker.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const inView = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) inView.set(e.target.id, e.isIntersecting)
        const first = items.find((i) => inView.get(i.id))
        if (first) setActive(first.id)
      },
      { rootMargin: "-130px 0px -55% 0px" }
    )
    for (const i of items) {
      const el = document.getElementById(i.id)
      if (el) io.observe(el)
    }
    return () => io.disconnect()
  }, [items])

  return (
    <nav aria-label="Jump to a section" className="gl-scroll sticky top-16 z-30 -mx-4 flex gap-1 overflow-x-auto border-b border-white/[0.07] bg-[#090909]/90 px-4 backdrop-blur-md sm:mx-0 sm:px-0">
      {items.map((i) => {
        const on = active === i.id
        return (
          <a
            key={i.id}
            href={`#${i.id}`}
            aria-current={on ? "location" : undefined}
            onClick={(e) => {
              const el = document.getElementById(i.id)
              if (!el) return
              e.preventDefault()
              setActive(i.id)
              el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })
            }}
            className={cn(
              "relative inline-flex h-11 shrink-0 items-center gap-1.5 px-3 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60",
              on ? "text-white" : "text-neutral-400 hover:text-neutral-100"
            )}
          >
            <i.icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
            {i.label}
            <span aria-hidden="true" className={cn("absolute inset-x-3 bottom-0 h-0.5 bg-[#a8ff3e] transition-opacity duration-200", on ? "opacity-100" : "opacity-0")} />
          </a>
        )
      })}
    </nav>
  )
}

function Overview({ r }: { r: AnalysisResult }) {
  return (
    <div id="gl-overview" className={cn("grid scroll-mt-32 grid-cols-1 gap-4 sm:gap-5", r.architecture && "md:grid-cols-2")}>
      <Panel title="What it does" icon={BookOpen} tone="sky">
        <p className={BODY_TEXT}>{withInlineCode(r.purpose)}</p>
      </Panel>
      {r.architecture && (
        <Panel title="How it fits together" icon={Boxes} tone="violet" delay={80}>
          <p className={BODY_TEXT}>{withInlineCode(r.architecture)}</p>
        </Panel>
      )}
    </div>
  )
}

// ── Readiness ────────────────────────────────────────────────────────────────
// Everything in this section is counted from the file tree by the server. Nothing is guessed and no model is involved.

interface Check {
  key: string
  icon: LucideIcon
  label: string
  /** One plain sentence on what the thing is, so the row explains itself. */
  why: string
  found: boolean
  /** The path or count that proves it, or what is missing. */
  detail: string
  href: string | null
}

/** Six things maintainers add to make a first contribution easier. */
function checksOf(f: Facts, repoUrl: string): Check[] {
  const file = (path: string | null) => (path ? blobUrl(repoUrl, path) : null)
  const tools = f.tests.tools.length ? `, ${f.tests.tools.slice(0, 2).join(", ")}` : ""
  const testDir = f.tests.folders.find((d) => d !== "(root)")
  return [
    { key: "guide", icon: BookOpen, label: "Contributing guide", why: "Says how this project wants changes to be made.", found: Boolean(f.docs.contributing), detail: f.docs.contributing ?? "No CONTRIBUTING file", href: file(f.docs.contributing) },
    { key: "pr", icon: GitPullRequest, label: "Pull request template", why: "A checklist that fills in when you open a pull request.", found: Boolean(f.docs.prTemplate), detail: f.docs.prTemplate ?? "No template file", href: file(f.docs.prTemplate) },
    { key: "issues", icon: CircleDot, label: "Issue templates", why: "Forms that shape bug reports and feature requests.", found: f.docs.issueTemplates > 0, detail: f.docs.issueTemplates > 0 ? plural(f.docs.issueTemplates, "template") : "No templates", href: f.docs.issueTemplates > 0 ? `${repoUrl}/issues/new/choose` : null },
    { key: "ci", icon: Play, label: "Automated checks", why: "Tests run on every pull request, so you hear back quickly.", found: Boolean(f.ci.provider), detail: f.ci.provider ? `${f.ci.provider}${f.ci.workflows ? `, ${plural(f.ci.workflows, "workflow")}` : ""}` : "No CI configuration", href: f.ci.provider === "GitHub Actions" ? treeUrl(repoUrl, ".github/workflows") : null },
    { key: "tests", icon: FlaskConical, label: "Tests", why: "Let you prove that your change works.", found: f.tests.files > 0, detail: f.tests.files > 0 ? `${plural(f.tests.files, "test file")}${tools}` : "No test files", href: testDir ? treeUrl(repoUrl, testDir) : null },
    { key: "conduct", icon: ShieldCheck, label: "Code of conduct", why: "Sets the rules for how people treat each other.", found: Boolean(f.docs.conduct), detail: f.docs.conduct ?? "No code of conduct file", href: file(f.docs.conduct) },
  ]
}

function CheckRow({ c }: { c: Check }) {
  const body = (
    <>
      <span aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300">
        <c.icon className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-neutral-100">{c.label}</span>
        <span className="block text-[12.5px] leading-snug text-neutral-400">{c.why}</span>
        <span className="mt-0.5 block truncate font-mono text-[11.5px] text-neutral-400">{c.detail}</span>
      </span>
      <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 text-[12.5px] font-medium", c.found ? "text-[#c6ff7a]" : "text-neutral-400")}>
        {c.found ? <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.75} /> : <Minus aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.75} />}
        {c.found ? "Found" : "Not found"}
        {c.href && <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-neutral-500" strokeWidth={2} />}
      </span>
    </>
  )
  const row = "flex items-start gap-3 px-1 py-3 outline-none sm:px-2"
  return c.href ? (
    <a href={c.href} target="_blank" rel="noopener noreferrer" className={cn(row, "rounded-lg transition-colors hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50")}>
      {body}
      <span className="sr-only">(opens on GitHub in a new tab)</span>
    </a>
  ) : (
    <div className={row}>{body}</div>
  )
}

const FOLDER_LINK =
  "inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 font-mono text-[12px] text-neutral-100 transition-colors hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 lg:min-h-8"

function Readiness({ a }: { a: Analysis }) {
  const f = a.facts
  if (!f) return null
  const checks = checksOf(f, a.url)
  const found = checks.filter((c) => c.found).length
  const verdict = found >= 5 ? "Well prepared for newcomers" : found >= 3 ? "Partly prepared for newcomers" : "Light on guidance for newcomers"
  const advice =
    found >= 5
      ? "Most of what a first contribution needs is already written down."
      : found >= 3
        ? "Some help is written down. Read the code around your change before you start."
        : "Little is written down, so expect to learn from the code itself."
  const folders = f.topFolders.filter((d) => d.name !== "(root)").slice(0, 6)
  const packages = f.packages.length >= 2 ? f.packages.slice(0, 6) : []
  const tools = [...(f.manager ? [f.manager] : []), ...f.tooling.filter((t) => t !== f.manager)].slice(0, 12)

  return (
    <section id="gl-ready" aria-labelledby="gl-ready-h" className="scroll-mt-32">
      <SectionHead id="gl-ready-h" eyebrow="From the file tree" title="What is inside, and how ready it is" desc="Counted from the repository's own files. Nothing here is guessed and no AI is involved." />
      <div className="space-y-4 sm:space-y-5">
        <Panel title="What is inside" icon={FolderTree}>
          <div className="space-y-5">
            <dl className="grid grid-cols-3 gap-2">
              <Stat icon={FileCode2} tone="sky" label="Files" value={grouped(f.files)} hint={`${plural(f.files, "file")} in the tree`} />
              <Stat icon={FolderTree} tone="sky" label="Folders" value={grouped(f.folders)} hint={`${plural(f.folders, "folder")} in the tree`} />
              <Stat icon={FlaskConical} tone="sky" label="Tests" value={grouped(f.tests.files)} hint={`${plural(f.tests.files, "test file")}`} />
            </dl>
            <LanguageBar languages={f.languages} />
            {folders.length > 0 && (
              <div>
                <Caption as="h3">Biggest folders</Caption>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {folders.map((d) => (
                    <li key={d.name}>
                      <a href={treeUrl(a.url, d.name)} target="_blank" rel="noopener noreferrer" className={FOLDER_LINK}>
                        {d.name}/<span className="text-neutral-400">{compact(d.files)}</span>
                        <span className="sr-only"> files (opens on GitHub in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {packages.length > 0 && (
              <div>
                <Caption as="h3">Packages</Caption>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {packages.map((p) => (
                    <li key={p.path}>
                      <a href={treeUrl(a.url, p.path)} target="_blank" rel="noopener noreferrer" className={FOLDER_LINK}>
                        <Boxes aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
                        {p.path}
                        <span className="text-neutral-400">{compact(p.files)}</span>
                        <span className="sr-only"> files (opens on GitHub in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {tools.length > 0 && (
              <div>
                <Caption as="h3">Tooling found</Caption>
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {tools.map((t) => (
                    <li key={t}>
                      <span className={cn(CHIP, "border-white/10 bg-white/[0.03] text-neutral-200", findLogo(t) && "pl-1.5")}>
                        <TechMark name={t} bare className="h-3.5 w-3.5" />
                        {t}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Ready for newcomers?" icon={ShieldCheck} delay={80}>
          <div className="space-y-4">
            <div>
              <p className="font-mono text-[30px] font-semibold leading-none tabular-nums text-white">
                {found}
                <span className="text-neutral-500">/{checks.length}</span>
              </p>
              <p className="mt-2 text-[15px] font-semibold tracking-tight text-white">{verdict}</p>
              <p className="mt-0.5 max-w-prose text-[13px] leading-relaxed text-neutral-400">{advice}</p>
            </div>
            <div role="img" aria-label={`${found} of ${checks.length} checks found`} className="flex gap-1">
              {checks.map((c) => (
                <span key={c.key} className={cn("h-1.5 flex-1 rounded-[2px]", c.found ? "bg-[#a8ff3e]" : "bg-white/10")} />
              ))}
            </div>
            <p className="text-[12.5px] leading-relaxed text-neutral-400">
              Each bar is one of the {checks.length} checks below, in the same order. A missing one is not a problem. It only means you will learn more from the code itself.
            </p>
            <ul className="border-t border-white/[0.06] sm:divide-y sm:divide-white/[0.06]">
              {checks.map((c) => (
                <li key={c.key}>
                  <CheckRow c={c} />
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </section>
  )
}

// ── Roadmap ──────────────────────────────────────────────────────────────────
// The steps are a guide, not a tracker: nothing is ticked off or counted. Each step offers real pages on GitHub,
// built from the repository's address and from files its tree really contains, so a button never leads nowhere.

interface StepLink {
  label: string
  href: string
  icon: LucideIcon
}

interface StepNote {
  text: string
  ok: boolean
}

function stepLinks(id: StepId, a: Analysis): StepLink[] {
  const u = a.url
  const f = a.facts
  const make = (label: string, href: string | null | undefined, icon: LucideIcon): StepLink | null => (href ? { label, href, icon } : null)
  const file = (path: string | null | undefined) => (path ? blobUrl(u, path) : null)
  const issues = (q: string) => `${u}/issues?q=${encodeURIComponent(`is:issue is:open ${q}`.trim())}`
  const testDir = f?.tests.folders.find((d) => d !== "(root)")

  let links: (StepLink | null)[] = []
  switch (id) {
    case "fork":
      links = [make("Fork on GitHub", `${u}/fork`, GitFork), make("Open the repository", u, ExternalLink)]
      break
    case "setup":
      links = [make("Contributing guide", file(f?.docs.contributing), BookOpen), make("Environment example", file(f?.envExample), FileCode2), make("README", file(f?.docs.readme), BookOpen)]
      break
    case "run":
      links = [make("Development guide", file(f?.docs.development), BookOpen) ?? make("README", file(f?.docs.readme), BookOpen), make("Entry point", file(f?.entry[0]), FileCode2)]
      break
    case "issue":
      links = [make("Good first issues", issues('label:"good first issue"'), CircleDot), make("Help wanted", issues('label:"help wanted"'), CircleDot), make("All open issues", issues(""), ListChecks)]
      break
    case "explore":
      links = [make("Browse the code", `${u}/tree/HEAD`, FolderTree), make("Search the code", `https://github.com/search?q=${encodeURIComponent(`repo:${a.owner}/${a.repo} `)}&type=code`, ScanSearch)]
      break
    case "change":
      links = [make("Recent commits", `${u}/commits`, Clock), make("Contributing guide", file(f?.docs.contributing), BookOpen)]
      break
    case "verify":
      links = [make(`Tests in ${testDir}/`, testDir ? treeUrl(u, testDir) : null, FlaskConical), make("CI workflows", f?.ci.provider === "GitHub Actions" ? treeUrl(u, ".github/workflows") : null, Play), make("Recent CI runs", f?.ci.provider === "GitHub Actions" ? `${u}/actions` : null, Play)]
      break
    case "pr":
      links = [make("Start a pull request", `${u}/compare`, GitPullRequest), make("Pull request template", file(f?.docs.prTemplate), FileCode2), make("Open pull requests", `${u}/pulls`, GitPullRequest)]
      break
    case "review":
      links = [make("Merged pull requests", `${u}/pulls?q=${encodeURIComponent("is:pr is:merged")}`, GitMerge), make("Code of conduct", file(f?.docs.conduct), ShieldCheck)]
      break
  }
  return links.filter((l): l is StepLink => l !== null).slice(0, 3)
}

/** What the file tree says about this step, so the step is backed by the repository and not only by the model's words. */
function stepNotes(id: StepId, a: Analysis): StepNote[] {
  const f = a.facts
  const m = a.meta
  const out: StepNote[] = []
  const yes = (text: string) => out.push({ text, ok: true })
  const check = (found: boolean, good: string, bad: string) => out.push({ text: found ? good : bad, ok: found })
  switch (id) {
    case "fork":
      if (typeof m.forks === "number") yes(`${plural(m.forks, "fork")} on GitHub already`)
      if (m.license) yes(`Licensed ${m.license}`)
      break
    case "setup":
      if (f?.manager) yes(`Package manager: ${f.manager}`)
      if (f) check(Boolean(f.envExample), `${f.envExample} lists the settings to fill in`, "No .env.example file")
      if (f) check(Boolean(f.docs.contributing), `Setup notes in ${f.docs.contributing}`, "No contributing guide, so start from the README")
      break
    case "run":
      if (f?.entry.length) yes(`Starts from ${f.entry.slice(0, 2).join(", ")}`)
      if (f?.docs.development) yes(`Development guide: ${f.docs.development}`)
      break
    case "issue":
      if (typeof m.openIssues === "number") yes(`${plural(m.openIssues, "open issue")} on GitHub`)
      if (f && f.docs.issueTemplates > 0) yes(`${plural(f.docs.issueTemplates, "issue template")} guide new reports`)
      break
    case "explore":
      if (f?.languages.length) yes(`Mostly ${f.languages.slice(0, 2).map((l) => `${l.name} (${l.pct}%)`).join(" and ")}`)
      if (f) yes(`${plural(f.files, "file")} in ${plural(f.folders, "folder")}`)
      break
    case "change":
      if (f) check(Boolean(f.docs.contributing), `Read ${f.docs.contributing} first`, "No contributing guide, so copy the style of nearby code")
      if (f?.tooling.length) yes(`Tooling: ${f.tooling.slice(0, 3).join(", ")}`)
      break
    case "verify":
      if (f) check(f.tests.files > 0, `${plural(f.tests.files, "test file")}${f.tests.tools.length ? `, ${f.tests.tools.slice(0, 2).join(", ")}` : ""}`, "No test files found")
      if (f) check(Boolean(f.ci.provider), `CI: ${f.ci.provider}${f.ci.workflows ? `, ${plural(f.ci.workflows, "workflow")}` : ""}`, "No CI configuration found")
      break
    case "pr":
      if (f) check(Boolean(f.docs.prTemplate), `Template: ${f.docs.prTemplate}`, "No pull request template")
      break
    case "review":
      if (f) check(Boolean(f.docs.conduct), `Code of conduct: ${f.docs.conduct}`, "No code of conduct file")
      if (f?.ci.provider) yes("Expect the automated checks to run on your pull request")
      break
  }
  return out
}

function StepCard({
  step,
  index,
  open,
  links,
  notes,
  onToggle,
  onFile,
}: {
  step: Step
  index: number
  open: boolean
  links: StepLink[]
  notes: StepNote[]
  onToggle: () => void
  onFile: (path: string) => void
}) {
  const meta = STEP_META[step.id]
  const panelId = useId()
  return (
    <li className="relative pl-12 sm:pl-14">
      <span aria-hidden="true" className="absolute left-0 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#111114] font-mono text-[13px] font-semibold text-neutral-100 sm:h-10 sm:w-10">
        {index}
      </span>
      <div className={cn("rounded-xl border transition-colors duration-200", open ? "border-white/20 bg-white/[0.02]" : "border-white/[0.08] bg-[#0d0d10]")}>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className="flex w-full items-start gap-3 rounded-xl p-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 sm:p-4">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <meta.icon aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-300" strokeWidth={2.25} />
              <span className="text-[15px] font-semibold tracking-tight text-white">{meta.title}</span>
              {step.generic && (
                <span title="Built from the repository's file tree, not written for this repository" className={cn(CHIP, "h-5 border-white/10 px-1.5 text-[10.5px] text-neutral-400")}>
                  From repo facts
                </span>
              )}
            </span>
            <span className={cn("mt-1 block text-[13.5px] leading-relaxed text-neutral-400", !open && "line-clamp-2")}>{withInlineCode(step.summary)}</span>
          </span>
          <ChevronDown aria-hidden="true" className={cn("mt-1 h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300", open && "rotate-180")} />
        </button>

        {links.length > 0 && (
          <ul aria-label={`Open on GitHub: ${meta.title}`} className="flex flex-wrap gap-2 px-3.5 pb-3.5 sm:px-4 sm:pb-4">
            {links.map((l) => (
              <li key={l.label} className="min-w-0 max-w-full">
                <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn(ACTION_BTN, "max-w-full px-3")}>
                  <l.icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{l.label}</span>
                  <ArrowUpRight aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60" strokeWidth={2.25} />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        <div id={panelId} className="gl-expand" data-open={open} inert={!open}>
          <div>
            <div className="space-y-3.5 border-t border-white/[0.06] px-3.5 pb-4 pt-3.5 sm:px-4">
              {step.actions.length > 0 && (
                <ol className="space-y-2">
                  {step.actions.map((x, i) => (
                    <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-neutral-200">
                      <span aria-hidden="true" className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.04] font-mono text-[10.5px] font-semibold text-neutral-300">
                        {i + 1}
                      </span>
                      <span className="min-w-0 [overflow-wrap:anywhere]">{withInlineCode(x)}</span>
                    </li>
                  ))}
                </ol>
              )}
              <Commands commands={step.commands} />
              {step.files.length > 0 && <FileChips files={step.files} onFile={onFile} label={`Files for ${meta.title}`} />}
              {notes.length > 0 && (
                <div>
                  <Caption as="h3" className="mb-1.5">
                    Found in this repository
                  </Caption>
                  <ul className="space-y-1">
                    {notes.map((n) => (
                      <li key={n.text} className="flex items-start gap-2 text-[13px] leading-snug text-neutral-300">
                        {n.ok ? <Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#a8ff3e]" strokeWidth={2.75} /> : <Minus aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-500" strokeWidth={2.75} />}
                        <span className="min-w-0 [overflow-wrap:anywhere]">{n.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {step.watchOut && (
                <Callout tone="amber" icon={TriangleAlert} label="Watch out">
                  {withInlineCode(step.watchOut)}
                </Callout>
              )}
              {step.done && (
                <Callout tone="lime" icon={CheckCheck} label="Done when">
                  {withInlineCode(step.done)}
                </Callout>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}

const PHASE_NOTE = ["Get the code running on your machine.", "Choose something to work on and find where it lives.", "Make the change and prove that it works.", "Send it in and get it merged."]

function Roadmap({ a, onFile }: { a: Analysis; onFile: (path: string, why?: string) => void }) {
  const r = a.result
  const steps = r?.roadmap ?? []
  const [open, setOpen] = useState<string[]>(() => (steps[0] ? [steps[0].id] : []))
  if (!r || steps.length === 0) return null

  const allOpen = open.length >= steps.length
  const toggleOpen = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))

  const blurb: Record<Level, string> = {
    Explorer: "Every step spelled out, in order. Each button opens the real page on GitHub.",
    Architect: "Only what is specific to this repo. Each button opens the real page on GitHub.",
    Veteran: "The non-obvious parts only. Each button opens the real page on GitHub.",
  }

  return (
    <section id="gl-roadmap" aria-labelledby="gl-roadmap-h" className="scroll-mt-32">
      <SectionHead
        id="gl-roadmap-h"
        eyebrow="Contribute"
        title="From zero to merged pull request"
        desc={blurb[a.level]}
        tone="lime"
        aside={
          <button type="button" onClick={() => setOpen(allOpen ? [] : steps.map((s) => s.id))} className={cn(ACTION_BTN, "self-start px-3 sm:self-auto")}>
            {allOpen ? <ChevronsDownUp aria-hidden="true" className="h-4 w-4" /> : <ChevronsUpDown aria-hidden="true" className="h-4 w-4" />}
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        }
      />
      {r.roadmapSource !== "ai" && (
        <p className="mb-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-neutral-400">
          <Lightbulb aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          {r.roadmapSource === "default"
            ? "The written roadmap wasn't usable this time, so these are standard steps built from the repository's files."
            : "Some steps are standard ones built from the repository's files, marked below."}
        </p>
      )}

      <div className="space-y-8">
        {PHASES.map((p, pi) => {
          const inPhase = steps.filter((s) => STEP_META[s.id].phase === pi)
          if (inPhase.length === 0) return null
          return (
            <div key={p.label}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <h3 className="flex items-baseline gap-2 text-[16px] font-semibold tracking-tight text-white">
                  <span aria-hidden="true" className={cn("font-mono text-[11px] font-semibold", TONES[p.tone].text)}>
                    {String(pi + 1).padStart(2, "0")}
                  </span>
                  {p.label}
                </h3>
                <p className="text-[12.5px] text-neutral-400">{PHASE_NOTE[pi]}</p>
              </div>
              <ol className="relative space-y-2.5 before:absolute before:bottom-6 before:left-[17px] before:top-6 before:w-px before:bg-white/10 sm:before:left-[19px]">
                {inPhase.map((s) => (
                  <StepCard key={s.id} step={s} index={STEP_ORDER.indexOf(s.id) + 1} open={open.includes(s.id)} links={stepLinks(s.id, a)} notes={stepNotes(s.id, a)} onToggle={() => toggleOpen(s.id)} onFile={(path) => onFile(path)} />
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Areas · files · stack ────────────────────────────────────────────────────

const CARD_BTN =
  "gl-spot group relative flex h-full w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4 text-left outline-none transition-[transform,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:border-white/[0.18] focus-visible:ring-2 focus-visible:ring-white/50 active:translate-y-0 active:scale-[0.99] sm:p-5"

function AreaGrid({ areas, onOpen }: { areas: Area[]; onOpen: (a: Area) => void }) {
  if (areas.length === 0) return null
  return (
    <section id="gl-areas" aria-labelledby="gl-areas-h" className="scroll-mt-32">
      <SectionHead id="gl-areas-h" eyebrow="Explore" title="Where the code lives" desc="Tap an area for its key files, the traps to avoid and how to start there." />
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {areas.map((ar, i) => {
          const m = AREA_META[ar.kind]
          return (
            <li key={ar.path} className="gl-rise" style={cssVars({ "--d": `${i * 45}ms` })}>
              <button type="button" onClick={() => onOpen(ar)} onPointerMove={trackPointer} className={cn(CARD_BTN, "flex-col")}>
                <span aria-hidden="true" className={cn("absolute inset-x-5 top-0 h-px opacity-70", TONES[m.tone].bar)} />
                <span className="relative z-10 flex items-start gap-3">
                  <span aria-hidden="true" className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", GRAD[m.tone])}>
                    <m.icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-semibold tracking-tight text-white">{ar.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[12px] text-neutral-400">{ar.path}/</span>
                  </span>
                  <ToneChip tone={m.tone}>{m.label}</ToneChip>
                </span>
                <span className="relative z-10 mt-3 line-clamp-3 text-[13.5px] leading-relaxed text-neutral-300">{ar.summary}</span>
                <span className="relative z-10 mt-4 flex items-center justify-between gap-2 text-[12px] text-neutral-400">
                  <span className="inline-flex items-center gap-1.5">
                    <FolderTree aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                    {plural(ar.files, "file")}
                    {ar.keyFiles.length > 0 && <span className="text-neutral-400">· {ar.keyFiles.length} to open first</span>}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 font-medium text-neutral-200 transition-colors group-hover:text-white">
                    Open
                    <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.25} />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StartFiles({ files, repoUrl, onFile }: { files: AnalysisResult["startFiles"]; repoUrl: string; onFile: (path: string, why?: string) => void }) {
  return (
    <section id="gl-files" aria-labelledby="gl-files-h" className="scroll-mt-32">
      <SectionHead
        id="gl-files-h"
        eyebrow="Read first"
        title="Where to start reading"
        desc="The files that explain the rest. Each path is checked against the repository tree."
        tone="sky"
        aside={files.length > 0 ? <ToneChip tone="lime" icon={ShieldCheck} className="self-start sm:self-auto">Verified in repo</ToneChip> : undefined}
      />
      {files.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.08] bg-[#0d0d10] p-4 text-[14px] leading-relaxed text-neutral-400">
          No specific files could be verified from what was fetched. Ask in the chat and it will look closer.
        </p>
      ) : (
        <ol className="space-y-2.5">
          {files.map((f) => (
            <li key={f.path} className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20 sm:flex sm:items-stretch">
              <FileRow bare path={f.path} why={f.why} onOpen={() => onFile(f.path, f.why)} />
              <div className="flex items-center justify-end gap-1.5 border-t border-white/[0.06] px-3 py-2 sm:border-l sm:border-t-0">
                {/* Phones have no room for the Explain pill inside the row, so it sits here; the row button above is the accessible one. */}
                <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onFile(f.path, f.why)} className="mr-auto inline-flex h-10 items-center gap-1.5 rounded-lg pr-2 text-[12.5px] font-medium text-neutral-200 sm:hidden">
                  <Sparkles className="h-3.5 w-3.5 text-neutral-300" strokeWidth={2.25} />
                  Explain this file
                </button>
                <CopyButton text={f.path} label={`Copy path ${f.path}`} />
                <a href={blobUrl(repoUrl, f.path)} target="_blank" rel="noopener noreferrer" aria-label={`View ${f.path} on GitHub (opens in a new tab)`} className={cn(ACTION_BTN, "w-10 px-0 lg:w-8")}>
                  <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                </a>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function TechGrid({ tech, onOpen }: { tech: TechItem[]; onOpen: (t: TechItem) => void }) {
  if (tech.length === 0) return null
  return (
    <section id="gl-stack" aria-labelledby="gl-stack-h" className="scroll-mt-32">
      <SectionHead id="gl-stack-h" eyebrow="Stack" title="What it is built with" desc="Tap an item to see how this repo uses it and which files to open." />
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {tech.map((t, i) => (
          <li key={t.name} className="gl-rise" style={cssVars({ "--d": `${i * 40}ms` })}>
            <button type="button" onClick={() => onOpen(t)} onPointerMove={trackPointer} className={cn(CARD_BTN, "items-start gap-3 p-3.5 sm:p-4")}>
              <TechTile name={t.name} className="relative z-10" />
              <span className="relative z-10 min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[14.5px] font-semibold tracking-tight text-neutral-50">{t.name}</span>
                  {t.role && (
                    <ToneChip tone="sky" className="h-5 px-1.5 text-[10.5px]">
                      {t.role}
                    </ToneChip>
                  )}
                </span>
                {t.note && <span className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-neutral-400">{t.note}</span>}
              </span>
              <ChevronRight aria-hidden="true" className="relative z-10 mt-2.5 h-4 w-4 shrink-0 text-neutral-500 transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-neutral-100" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Shown when the model's JSON could not be parsed: the answer is still useful, so it is rendered as markdown. */
function RawAnswer({ text }: { text: string }) {
  return (
    <Panel title="Analysis" icon={BookOpen}>
      <p className="mb-3 text-[12.5px] text-neutral-400">The structured breakdown didn&apos;t come through, so this is the plain answer.</p>
      <Markdown>{text}</Markdown>
    </Panel>
  )
}

// ── Detail sheet: one tap on an area, a technology or a file ─────────────────

const diveCache = new Map<string, FileDive>()

function NumberedTips({ tips, tone }: { tips: string[]; tone: Tone }) {
  return (
    <ol className="space-y-2">
      {tips.map((tip, i) => (
        <li key={i} className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-[13.5px] leading-relaxed text-neutral-200">
          <span aria-hidden="true" className={cn("mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] font-semibold", TONES[tone].icon)}>
            {i + 1}
          </span>
          <span className="min-w-0 [overflow-wrap:anywhere]">{withInlineCode(tip)}</span>
        </li>
      ))}
    </ol>
  )
}

const SHEET_ACTION = cn(ACTION_BTN, "h-11 w-full justify-center text-[13px] lg:h-10")

function AreaDetail({ a, area, onFile, onAsk }: { a: Analysis; area: Area; onFile: (path: string, why: string) => void; onAsk: (q: string) => void }) {
  const m = AREA_META[area.kind]
  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-neutral-100">{withInlineCode(area.summary)}</p>
      <div className="flex flex-wrap gap-1.5">
        <ToneChip tone={m.tone} icon={m.icon}>
          {m.label}
        </ToneChip>
        <ToneChip tone="sky" icon={FolderTree}>
          {plural(area.files, "file")}
        </ToneChip>
      </div>
      {area.keyFiles.length > 0 && (
        <section>
          <Caption as="h3">Open these first</Caption>
          <ul className="mt-2.5 space-y-2">
            {area.keyFiles.map((f) => (
              <li key={f.path}>
                <FileRow path={f.path} why={f.why} tone={m.tone} onOpen={() => onFile(f.path, f.why)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {area.tips.length > 0 && (
        <section>
          <Caption as="h3">Before you change anything</Caption>
          <div className="mt-2.5">
            <NumberedTips tips={area.tips} tone={m.tone} />
          </div>
        </section>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={treeUrl(a.url, area.path)} target="_blank" rel="noopener noreferrer" className={SHEET_ACTION}>
          <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Open folder on GitHub
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <button type="button" onClick={() => onAsk(`How do I make my first change in ${area.path}/?`)} className={SHEET_ACTION}>
          <MessageSquare aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Ask about this area
        </button>
      </div>
    </div>
  )
}

function TechDetail({ tech, onFile, onAsk }: { tech: TechItem; onFile: (path: string, why: string) => void; onAsk: (q: string) => void }) {
  return (
    <div className="space-y-6">
      {tech.note ? (
        <p className="text-[15px] leading-relaxed text-neutral-100">{withInlineCode(tech.note)}</p>
      ) : (
        <p className="text-[14px] leading-relaxed text-neutral-400">No note was written about how this repository uses {tech.name}.</p>
      )}
      {tech.role && (
        <div className="flex flex-wrap gap-1.5">
          <ToneChip tone="sky">{tech.role}</ToneChip>
        </div>
      )}
      {tech.files.length > 0 && (
        <section>
          <Caption as="h3">Where it is set up</Caption>
          <ul className="mt-2.5 space-y-2">
            {tech.files.map((p) => (
              <li key={p}>
                <FileRow path={p} onOpen={() => onFile(p, tech.note)} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <button type="button" onClick={() => onAsk(`How is ${tech.name} used here, and what should I know before changing it?`)} className={SHEET_ACTION}>
        <MessageSquare aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        Ask about {tech.name}
      </button>
    </div>
  )
}

function FileDetail({ a, level, path, why, onAsk }: { a: Analysis; level: Level; path: string; why: string; onAsk: (q: string) => void }) {
  const key = `${a.url}|${level}|${path}`
  const [state, setState] = useState<{ key: string; dive: FileDive | null; error: string } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const cached = diveCache.get(key) ?? null
  const current = state && state.key === key ? state : null
  const dive = cached ?? current?.dive ?? null
  const error = cached ? "" : (current?.error ?? "")

  useEffect(() => {
    if (diveCache.has(key)) return
    const controller = new AbortController()
    void (async () => {
      try {
        const res = await fetch("/api/gitlense/dive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repoUrl: a.url,
            path,
            expertiseLevel: level,
            context: [a.result?.purpose, a.result?.architecture, why].filter(Boolean).join(" ").slice(0, 2400),
          }),
          signal: controller.signal,
        })
        if (!res.ok) throw await readError(res)
        const parsed = parseDive(await res.json())
        if (!parsed) throw new Error("Couldn't read the explanation. Try again.")
        diveCache.set(key, parsed)
        window.dispatchEvent(new CustomEvent("usage:updated"))
        setState({ key, dive: parsed, error: "" })
      } catch (err) {
        if (isAbort(err)) return
        setState({ key, dive: null, error: describeError(err, "Couldn't explain this file. Try again.") })
      }
    })()
    return () => controller.abort()
  }, [a.url, a.result, key, level, path, why, attempt])

  if (error) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-4">
        <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-rose-100">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            setState(null)
            setAttempt((n) => n + 1)
          }}
          className={cn(ACTION_BTN, "mt-3 px-3")}
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
          Try again
        </button>
      </div>
    )
  }

  if (!dive) {
    return (
      <div className="space-y-5">
        <p role="status" className="flex items-center gap-2.5 text-[13.5px] text-neutral-300">
          <span aria-hidden="true" className="gl-bars text-neutral-200" />
          Reading <span className="min-w-0 truncate font-mono text-[12.5px] text-neutral-100">{path}</span>
        </p>
        <div aria-hidden="true" className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[94%]" />
          <Skeleton className="h-4 w-[70%]" />
          <Skeleton className="mt-5 h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[15px] leading-relaxed text-neutral-100">{withInlineCode(dive.summary)}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {dive.lines > 0 && (
            <ToneChip tone="sky" icon={FileCode2}>
              {grouped(dive.lines)} lines
            </ToneChip>
          )}
          {dive.truncated && (
            <ToneChip tone="amber" icon={TriangleAlert}>
              Only the start was read
            </ToneChip>
          )}
        </div>
      </div>
      {dive.parts.length > 0 && (
        <section>
          <Caption as="h3">What is inside</Caption>
          <ul className="mt-2.5 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02]">
            {dive.parts.map((p) => (
              <li key={p.name} className="px-3 py-2.5">
                <code className="font-mono text-[12.5px] font-semibold text-neutral-50 [overflow-wrap:anywhere]">{p.name}</code>
                {p.what && <p className="mt-0.5 text-[13px] leading-relaxed text-neutral-300">{withInlineCode(p.what)}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {dive.change.length > 0 && (
        <section>
          <Caption as="h3">Changing it safely</Caption>
          <div className="mt-2.5">
            <NumberedTips tips={dive.change} tone="sky" />
          </div>
        </section>
      )}
      {dive.watchOut && (
        <Callout tone="amber" icon={TriangleAlert} label="Watch out">
          {withInlineCode(dive.watchOut)}
        </Callout>
      )}
      {dive.tryIt && (
        <section>
          <Caption as="h3">Try it</Caption>
          <Commands commands={[dive.tryIt]} className="mt-2.5" />
        </section>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <a href={blobUrl(a.url, path)} target="_blank" rel="noopener noreferrer" className={SHEET_ACTION}>
          <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          View on GitHub
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <button type="button" onClick={() => onAsk(`What should I know before changing ${path}?`)} className={SHEET_ACTION}>
          <MessageSquare aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
          Ask about this file
        </button>
      </div>
    </div>
  )
}

function DetailSheet({ a, detail, level, onChange, onAsk }: { a: Analysis; detail: Detail | null; level: Level; onChange: (d: Detail | null) => void; onAsk: (q: string) => void }) {
  const wide = useMedia("(min-width: 768px)")
  // Whatever had focus when the sheet opened gets it back on close, because this sheet has no trigger element of its own.
  const opener = useRef<HTMLElement | null>(null)
  // The last detail stays mounted while the sheet slides out, so it never empties mid-animation.
  const [shown, setShown] = useState<Detail | null>(detail)
  if (detail && detail !== shown) setShown(detail)

  const openFile = (path: string, why: string) => onChange({ kind: "file", path, why, back: shown && shown.kind !== "file" ? shown : null })

  let head: { icon: ReactNode; title: string; sub: string; tone: Tone } | null = null
  if (shown?.kind === "area") {
    const m = AREA_META[shown.area.kind]
    head = { icon: <ToneIcon icon={m.icon} tone={m.tone} className="h-11 w-11" />, title: shown.area.title, sub: `${shown.area.path}/`, tone: m.tone }
  } else if (shown?.kind === "tech") {
    head = { icon: <TechTile name={shown.tech.name} className="h-11 w-11" />, title: shown.tech.name, sub: shown.tech.role || "Technology", tone: "sky" }
  } else if (shown?.kind === "file") {
    const { dir, file } = splitPath(shown.path)
    head = { icon: <ToneIcon icon={FileCode2} tone="sky" className="h-11 w-11" />, title: file, sub: dir ? dir.replace(/\/$/, "") : "Repository root", tone: "sky" }
  }
  const back = shown?.kind === "file" ? shown.back : null

  return (
    <Sheet open={detail !== null} onOpenChange={(o) => !o && onChange(null)}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null
        }}
        onCloseAutoFocus={(e) => {
          const el = opener.current
          if (el && el.isConnected) {
            e.preventDefault()
            el.focus()
          }
        }}
        className={cn(
          "gl-sheet gap-0 border-white/10 bg-[#0b0b0e] p-0 font-['Outfit','Inter',sans-serif] text-neutral-200",
          wide ? "w-full sm:max-w-[540px]" : "max-h-[90dvh] rounded-t-2xl border-x-0"
        )}
      >
        {!wide && <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-[2px] bg-white/20" />}
        <SheetHeader className="relative gap-0 overflow-hidden border-b border-white/[0.07] p-4 sm:p-5">
          <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", `gl-tw-${head?.tone ?? "sky"}`)} />
          <div className="relative flex items-center gap-3">
            {back && (
              <button
                type="button"
                onClick={() => onChange(back)}
                aria-label="Back"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-neutral-300 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            {head?.icon}
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-[17px] font-semibold tracking-tight text-white">{head?.title ?? "Details"}</SheetTitle>
              <SheetDescription className="mt-0.5 truncate font-mono text-[12px] text-neutral-400">{head?.sub ?? ""}</SheetDescription>
            </div>
            <SheetClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-neutral-300 outline-none transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <X aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
              </button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="gl-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-10 sm:p-5 sm:pb-10">
          {shown?.kind === "area" && <AreaDetail a={a} area={shown.area} onFile={openFile} onAsk={onAsk} />}
          {shown?.kind === "tech" && <TechDetail tech={shown.tech} onFile={openFile} onAsk={onAsk} />}
          {shown?.kind === "file" && <FileDetail key={shown.path} a={a} level={level} path={shown.path} why={shown.why} onAsk={onAsk} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Chat: one question, one complete answer
// ────────────────────────────────────────────────────────────────────────────

function CodeBlock({ children }: { children: ReactNode }) {
  const text = nodeText(children).replace(/\n$/, "")
  return (
    <div className="group/code relative my-3">
      <pre className="gl-scroll overflow-x-auto rounded-lg border border-white/[0.08] bg-[#07070a] p-3 pr-12 font-mono text-[12.5px] leading-relaxed text-neutral-100 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[inherit]">
        {children}
      </pre>
      <CopyButton text={text} label="Copy code" className="absolute right-1.5 top-1.5 h-8 w-8 border-white/10 bg-[#0d0d10] lg:h-8" />
    </div>
  )
}

const MD_COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-neutral-500 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:text-neutral-400 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  h1: ({ children }) => <h4 className="mb-2 mt-4 text-[15px] font-semibold text-white first:mt-0">{children}</h4>,
  h2: ({ children }) => <h4 className="mb-2 mt-4 text-[15px] font-semibold text-white first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1.5 mt-3 text-[14px] font-semibold text-white first:mt-0">{children}</h5>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-neutral-50 underline decoration-white/35 underline-offset-2 transition-colors hover:decoration-white">
      {children}
    </a>
  ),
  code: ({ className, children }) => <code className={cn("rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.88em] text-neutral-100", className)}>{children}</code>,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-white/15 pl-3 text-neutral-300 last:mb-0">{children}</blockquote>,
  hr: () => <hr className="my-4 border-white/10" />,
  // A model can emit remote images; they would be fetched from third-party hosts, so they are never rendered.
  img: () => null,
}

function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[14px] leading-[1.7] text-neutral-200 [overflow-wrap:anywhere]">
      <ReactMarkdown components={MD_COMPONENTS}>{children}</ReactMarkdown>
    </div>
  )
}

function AssistantMark() {
  return (
    <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.07]">
      <GitLenseMark className="h-4 w-4" />
    </span>
  )
}

function Thinking({ steps }: { steps: TraceStep[] }) {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => setSecs(Math.floor((performance.now() - start) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [])
  const list = steps.length > 0 ? steps : [{ label: "Working on it", done: false }]
  return (
    <div className="gl-fade flex gap-3">
      <AssistantMark />
      <div className="min-w-0 flex-1">
        <p role="status" className="sr-only">
          GitLense is replying. {list.find((s) => !s.done)?.label}
        </p>
        <ul aria-hidden="true" className="space-y-2.5">
          {list.map((s) => (
            <li key={s.label} className="gl-line flex items-start gap-2.5 text-[13px] leading-snug">
              <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center">
                {s.done ? <Check className="gl-pop h-3.5 w-3.5 text-[#a8ff3e]" strokeWidth={2.75} /> : <span className="gl-bars text-neutral-200" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={s.done ? "text-neutral-300" : "text-neutral-50"}>
                  {s.label}
                  {!s.done && secs >= 3 ? ` (${secs}s)` : ""}
                </span>
                {s.chips && s.chips.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {s.chips.map((c) => (
                      <span key={c} className={cn(CHIP, "h-6 max-w-full border-white/10 bg-white/[0.03] px-1.5 text-[11.5px] font-normal text-neutral-300")}>
                        <span className="truncate">{c}</span>
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Types a short line out word by word. Screen readers get the whole line at once, and reduced motion skips the effect. */
function TypedLine({ text, animate, className }: { text: string; animate: boolean; className?: string }) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text])
  const [n, setN] = useState(() => (animate && !prefersReducedMotion() ? 0 : tokens.length))
  const finished = n >= tokens.length
  useEffect(() => {
    if (finished) return
    const id = window.setInterval(() => setN((v) => v + 2), 36)
    return () => window.clearInterval(id)
  }, [finished])
  return (
    <p className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={finished ? undefined : "gl-caret"}>
        {finished ? withInlineCode(text) : tokens.slice(0, n).join("").replace(/`/g, "")}
      </span>
    </p>
  )
}

/** The structured answer: the direct answer first, then only the parts that help act on it. */
function AnswerView({ answer, fresh, onSend, onFile }: { answer: Answer; fresh: boolean; onSend: (q: string) => void; onFile: (path: string, why: string) => void }) {
  const blocks: { key: string; node: ReactNode }[] = []
  if (answer.steps.length > 0) {
    blocks.push({
      key: "steps",
      node: (
        <ol className="space-y-2">
          {answer.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-neutral-200">
              <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] font-mono text-[11px] font-semibold text-neutral-300">
                {i + 1}
              </span>
              <span className="min-w-0 [overflow-wrap:anywhere]">{withInlineCode(s)}</span>
            </li>
          ))}
        </ol>
      ),
    })
  }
  if (answer.points.length > 0) {
    blocks.push({
      key: "points",
      node: (
        <ul className="space-y-1.5">
          {answer.points.map((p, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-neutral-200">
              <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rotate-45 rounded-[2px] bg-neutral-400" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{withInlineCode(p)}</span>
            </li>
          ))}
        </ul>
      ),
    })
  }
  if (answer.files.length > 0) {
    blocks.push({
      key: "files",
      node: (
        <ul aria-label="Files" className="space-y-1.5">
          {answer.files.map((f) => (
            <li key={f.path}>
              <button
                type="button"
                onClick={() => onFile(f.path, f.why)}
                className="group flex w-full items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left outline-none transition-colors hover:border-white/25 hover:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <FileCode2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" strokeWidth={2} />
                <span className="min-w-0 flex-1">
                  <span className="sr-only">Explain </span>
                  <span className="block font-mono text-[12px] leading-snug text-neutral-50 [overflow-wrap:anywhere]">
                    <Breakable text={f.path} />
                  </span>
                  {f.why && <span className="mt-0.5 block text-[12.5px] leading-snug text-neutral-300">{withInlineCode(f.why)}</span>}
                </span>
                <ChevronRight aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          ))}
        </ul>
      ),
    })
  }
  if (answer.commands.length > 0) blocks.push({ key: "commands", node: <Commands commands={answer.commands} /> })
  if (answer.watchOut) {
    blocks.push({
      key: "watch",
      node: (
        <Callout tone="amber" icon={TriangleAlert} label="Watch out">
          {withInlineCode(answer.watchOut)}
        </Callout>
      ),
    })
  }
  if (answer.followUps.length > 0) {
    blocks.push({
      key: "follow",
      node: (
        <ul aria-label="Follow-up questions" className="flex flex-wrap gap-1.5 pt-1">
          {answer.followUps.map((q) => (
            <li key={q} className="min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => onSend(q)}
                className="inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-[12.5px] leading-snug text-neutral-200 outline-none transition-colors hover:border-white/25 hover:bg-white/[0.07] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 lg:min-h-9"
              >
                <CornerDownRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
                <span className="min-w-0 [overflow-wrap:anywhere]">{q}</span>
              </button>
            </li>
          ))}
        </ul>
      ),
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.05] p-3">
        <p className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#c6ff7a]">
          <Zap aria-hidden="true" className="h-3 w-3" strokeWidth={2.5} />
          Short answer
        </p>
        <TypedLine text={answer.tldr} animate={fresh} className="text-[14.5px] font-medium leading-relaxed text-neutral-50 [overflow-wrap:anywhere]" />
      </div>
      {blocks.map((b, i) => (
        <div key={b.key} className={fresh ? "gl-rise" : undefined} style={cssVars({ "--d": `${450 + i * 110}ms` })}>
          {b.node}
        </div>
      ))}
    </div>
  )
}

// ── Questions GitHub can answer itself ───────────────────────────────────────
// The analysis holds no issue or pull request text, so a model could only say it cannot answer. These questions are
// answered from GitHub's own API instead: live, from this browser, with no model and so no tokens.

const ASKS_ISSUES = /\b(?:good[- ]first[- ]issues?|help[- ]wanted|(?:beginner|newcomer|starter|easy)[- ]?(?:friendly )?issues?|(?:open|current|available|recent|latest|new) issues|(?:an?|which|what|some|any) issues?(?: that)? (?:to (?:start|pick|work|take|fix|tackle)|(?:i|we) (?:can|could|should)|(?:can|could|should) (?:i|we)|for (?:me|beginners?|newcomers?|a beginner)|(?:are|is) (?:open|available)))\b/i
const ASKS_PULLS = /\b(?:(?:open|current|pending|recent|latest|merged) (?:pull requests|prs)|(?:recent|latest|last|merged) (?:pull request|pr))\b/i

function liveIntent(question: string): LiveList["kind"] | null {
  if (ASKS_ISSUES.test(question)) return "issues"
  if (ASKS_PULLS.test(question)) return "pulls"
  return null
}

async function githubList(path: string, signal: AbortSignal): Promise<unknown[]> {
  const res = await fetch(`https://api.github.com${path}`, { signal, headers: { Accept: "application/vnd.github+json" } })
  if (res.status === 403 || res.status === 429) throw new Error("GitHub's limit for anonymous requests is used up for now. The button below opens the same list on GitHub.")
  if (!res.ok) throw new Error(`GitHub answered with ${res.status}. The button below opens the same list on GitHub.`)
  const data: unknown = await res.json()
  return Array.isArray(data) ? data : []
}

function toLiveItems(list: unknown[], max: number, issuesOnly = false): LiveItem[] {
  const out: LiveItem[] = []
  for (const raw of list) {
    const o = rec(raw)
    if (!o || out.length >= max || (issuesOnly && o.pull_request)) continue
    const number = num(o.number, -1)
    const url = typeof o.html_url === "string" && o.html_url.startsWith("https://github.com/") ? o.html_url : ""
    const title = str(o.title)
    if (number < 0 || !url || !title) continue
    out.push({
      number,
      title: title.slice(0, 160),
      url,
      labels: (Array.isArray(o.labels) ? o.labels : []).flatMap((l) => {
        const name = typeof l === "string" ? l : str(rec(l)?.name)
        return name ? [name] : []
      }).slice(0, 4),
      comments: num(o.comments),
      created: typeof o.created_at === "string" ? o.created_at : null,
      author: str(rec(o.user)?.login),
      draft: o.draft === true,
    })
  }
  return out
}

/** Reads the list in steps, reporting each one, and says which label finally matched. */
async function fetchLive(kind: LiveList["kind"], a: Analysis, signal: AbortSignal, report: (steps: TraceStep[]) => void): Promise<LiveList> {
  const base = `/repos/${encodeURIComponent(a.owner)}/${encodeURIComponent(a.repo)}`
  const done: TraceStep[] = [{ label: `Recognised a question about ${kind === "issues" ? "issues" : "pull requests"}. GitHub can answer it directly, so no AI is used.`, done: true }]

  if (kind === "pulls") {
    report([...done, { label: "Asking GitHub for the open pull requests", done: false }])
    const items = toLiveItems(await githubList(`${base}/pulls?state=open&sort=updated&direction=desc&per_page=6`, signal), 6)
    return { kind, heading: items.length ? `${plural(items.length, "open pull request")}, the most recently updated first.` : "There are no open pull requests right now.", href: `${a.url}/pulls`, items }
  }

  for (const label of ["good first issue", "help wanted"]) {
    report([...done, { label: `Asking GitHub for open issues labelled "${label}"`, done: false }])
    const items = toLiveItems(await githubList(`${base}/issues?state=open&labels=${encodeURIComponent(label)}&per_page=12`, signal), 6, true)
    if (items.length > 0) {
      return {
        kind,
        heading: label === "good first issue" ? `${plural(items.length, "open issue")} labelled "good first issue".` : `No issues here are labelled "good first issue". These ${plural(items.length, "open issue")} are labelled "help wanted" instead.`,
        href: `${a.url}/issues?q=${encodeURIComponent(`is:issue is:open label:"${label}"`)}`,
        items,
      }
    }
    done.push({ label: `No open issues are labelled "${label}"`, done: true })
  }
  report([...done, { label: "Asking GitHub for the most recently updated open issues", done: false }])
  const items = toLiveItems(await githubList(`${base}/issues?state=open&sort=updated&direction=desc&per_page=12`, signal), 6, true)
  return { kind, heading: items.length ? `No beginner labels are in use here. These are the ${plural(items.length, "open issue")} updated most recently.` : "There are no open issues right now.", href: `${a.url}/issues`, items }
}

/** A reply that says the analysis cannot answer. Only a short refusal counts, never a real answer that happens to say "cannot". */
const CANNOT = /\b(?:cannot|can't|can not|couldn't|unable to|(?:do not|don't) have|(?:does not|doesn't) (?:include|contain|have)|not (?:included|available)|no information)\b/i
const isCannotAnswer = (a: Answer) => CANNOT.test(a.tldr) && a.steps.length === 0 && a.files.length === 0

const lookupLinks = (a: Analysis): StepLink[] => [
  { label: "Open issues", href: `${a.url}/issues`, icon: CircleDot },
  { label: "Pull requests", href: `${a.url}/pulls`, icon: GitPullRequest },
  { label: "Search the code", href: `https://github.com/search?q=${encodeURIComponent(`repo:${a.owner}/${a.repo} `)}&type=code`, icon: ScanSearch },
]

function LookupLinks({ links }: { links: StepLink[] }) {
  return (
    <div className="mt-3">
      <Caption as="p">Look it up on GitHub</Caption>
      <ul className="mt-2 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className={cn(ACTION_BTN, "px-3")}>
              <l.icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
              {l.label}
              <ArrowUpRight aria-hidden="true" className="h-3 w-3 opacity-60" strokeWidth={2.25} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LiveAnswer({ live, onAsk }: { live: LiveList; onAsk: (q: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <p className="mb-1 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          <SiGithub aria-hidden="true" className="h-3 w-3" />
          Live from GitHub
        </p>
        <p className="text-[14px] font-medium leading-relaxed text-neutral-50 [overflow-wrap:anywhere]">{live.heading}</p>
      </div>
      {live.items.length > 0 && (
        <ul className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {live.items.map((i) => (
            <li key={i.number} className="p-3">
              <a href={i.url} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 rounded-md text-[13.5px] leading-snug text-neutral-50 outline-none focus-visible:ring-2 focus-visible:ring-white/50 [overflow-wrap:anywhere]">
                <span className="shrink-0 font-mono text-[12px] text-neutral-400">#{i.number}</span>
                <span className="min-w-0 underline-offset-2 group-hover:underline">{i.title}</span>
                <span className="sr-only">(opens on GitHub in a new tab)</span>
              </a>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-neutral-400">
                {i.draft && <span className={cn(CHIP, "h-5 border-white/10 px-1.5 text-[11px] text-neutral-300")}>Draft</span>}
                {i.labels.map((l) => (
                  <span key={l} className={cn(CHIP, "h-5 border-white/10 px-1.5 text-[11px] text-neutral-300")}>
                    {l}
                  </span>
                ))}
                <span>
                  {timeAgo(i.created) ?? ""}
                  {i.author ? ` by ${i.author}` : ""}
                </span>
                {i.comments > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
                    {i.comments}
                    <span className="sr-only"> comments</span>
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => onAsk(`How would I approach #${i.number} "${i.title}" in this repository?`)}
                className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 text-[12.5px] font-medium text-neutral-200 outline-none transition-colors hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 lg:h-8"
              >
                <Sparkles aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.25} />
                Ask how to start
              </button>
            </li>
          ))}
        </ul>
      )}
      <a href={live.href} target="_blank" rel="noopener noreferrer" className={cn(ACTION_BTN, "px-3")}>
        <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
        Open the list on GitHub
        <span className="sr-only">(opens in a new tab)</span>
      </a>
      <p className="text-[12px] text-neutral-400">{live.items.length > 0 ? "Read from GitHub just now. No AI was used, so this cost nothing." : "Nothing was read, so nothing was used."}</p>
    </div>
  )
}

// ── What the chat shows while it works ───────────────────────────────────────

const STOP_WORDS = new Set(["the", "and", "for", "with", "how", "what", "where", "which", "does", "this", "that", "can", "should", "you", "why", "who", "are", "from", "about", "into", "when", "there", "have", "has", "need", "want", "get", "use", "make", "repo", "repository", "project"])
const wordsOf = (s: string) => s.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]{2,}/g) ?? []

/** The parts of the analysis that share words with the question. A plain word match, so it is instant and free, and it claims no more than that. */
function closestParts(a: Analysis, question: string): string[] {
  const r = a.result
  if (!r) return []
  const asked = new Set(wordsOf(question).filter((w) => !STOP_WORDS.has(w)))
  if (asked.size === 0) return []
  const score = (text: string) => new Set(wordsOf(text).filter((w) => asked.has(w))).size
  return [
    ...r.roadmap.map((s) => ({ label: `Step: ${STEP_META[s.id].title}`, n: score(`${STEP_META[s.id].title} ${s.summary} ${s.commands.join(" ")}`) })),
    ...r.areas.map((x) => ({ label: `Area: ${x.title}`, n: score(`${x.title} ${x.path} ${x.summary}`) })),
    ...r.tech.map((t) => ({ label: `Stack: ${t.name}`, n: score(`${t.name} ${t.role} ${t.note}`) })),
    ...r.startFiles.map((f) => ({ label: f.path, n: score(`${f.path} ${f.why}`) })),
  ]
    .filter((p) => p.n > 0)
    .sort((x, y) => y.n - x.n)
    .slice(0, 3)
    .map((p) => p.label)
}

/** What really goes to the model with a question: the analysis, counted, and the conversation so far. */
function questionTrace(a: Analysis, question: string, earlier: number): TraceStep[] {
  const r = a.result
  const sent = r
    ? ["Overview", r.areas.length ? plural(r.areas.length, "area") : "", r.roadmap.length ? plural(r.roadmap.length, "roadmap step") : "", r.startFiles.length ? plural(r.startFiles.length, "start file") : "", r.tech.length ? plural(r.tech.length, "technology", "technologies") : ""]
    : ["Written analysis"]
  if (a.facts) sent.push(`${plural(a.facts.files, "file")} counted`)
  const close = closestParts(a, question)
  return [
    { label: "Sent your question with the analysis", chips: sent.filter(Boolean), done: true },
    ...(close.length ? [{ label: "Closest parts of the analysis", chips: close, done: true }] : []),
    { label: earlier > 0 ? `Writing the answer, with ${plural(earlier, "earlier message")} as context` : "Writing the answer", done: false },
  ]
}

/** The hint inside the empty input changes every few seconds, so the field suggests what to ask. */
function RotatingPlaceholder({ paused }: { paused: boolean }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const id = window.setInterval(() => setI((n) => (n + 1) % ASK_PLACEHOLDERS.length), 3600)
    return () => window.clearInterval(id)
  }, [paused])
  return (
    <span key={i} aria-hidden="true" className="gl-ph pointer-events-none absolute left-0 right-0 top-0 truncate py-2.5 text-base leading-snug text-[#9a9a9a] sm:text-[14px]">
      {ASK_PLACEHOLDERS[i]}
    </span>
  )
}

interface ChatApi {
  /** Puts a question in the input (send = false) or asks it straight away (send = true). */
  ask: (text: string, send: boolean) => void
}

function ChatPanel({
  a,
  level,
  onLevel,
  onFile,
  apiRef,
}: {
  a: Analysis
  level: Level
  onLevel: (l: Level) => void
  onFile: (path: string, why?: string) => void
  apiRef: RefObject<ChatApi | null>
}) {
  const uid = useId()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [waiting, setWaiting] = useState(false)
  const [focused, setFocused] = useState(false)
  const [trace, setTrace] = useState<TraceStep[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLTextAreaElement | null>(null)
  const idRef = useRef(0)
  const scrolls = useOverflowY(listRef)

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  // A new answer is scrolled to its first line (long answers are read from the top); anything else follows to the bottom.
  useEffect(() => {
    const list = listRef.current
    if (!list || messages.length === 0) return
    const last = messages[messages.length - 1]
    const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth"
    if (last.role === "assistant" && !last.failed) {
      const el = list.querySelector<HTMLElement>(`[data-msg="${last.id}"]`)
      if (el) {
        list.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior })
        return
      }
    }
    list.scrollTo({ top: list.scrollHeight, behavior })
  }, [messages, waiting])

  const nextId = () => {
    idRef.current += 1
    return idRef.current
  }

  const fit = () => {
    const el = textRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`
  }

  async function request(history: ChatMessage[]) {
    const controller = new AbortController()
    abortRef.current = controller
    setTrace(questionTrace(a, history[history.length - 1]?.content ?? "", Math.min(history.length - 1, HISTORY_LIMIT - 1)))
    setWaiting(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: a.url,
          analysis: serializeForChat(a),
          messages: history.slice(-HISTORY_LIMIT).map(({ role, content }) => ({ role, content })),
          expertiseLevel: level,
        }),
        signal: controller.signal,
      })
      if (!res.ok) throw await readError(res)
      const data = rec(await res.json())
      const answer = parseAnswer(data?.answer)
      const reply = typeof data?.reply === "string" ? data.reply.trim() : ""
      if (!answer && !reply) throw new Error("The reply came back empty. Try asking again.")
      window.dispatchEvent(new CustomEvent("usage:updated"))
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: reply, answer, fresh: true }])
    } catch (err) {
      if (isAbort(err)) return
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", failed: true, content: describeError(err, "Couldn't get a reply. Try again.") }])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setWaiting(false)
      }
    }
  }

  /** Reads an issue or pull request list from GitHub and shows it as the answer. */
  async function answerLive(kind: LiveList["kind"]) {
    const controller = new AbortController()
    abortRef.current = controller
    setWaiting(true)
    try {
      const live = await fetchLive(kind, a, controller.signal, setTrace)
      const content = [live.heading, ...live.items.map((i) => `#${i.number} ${i.title}${i.labels.length ? ` (${i.labels.join(", ")})` : ""}`)].join("\n")
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content, live, fresh: true }])
    } catch (err) {
      if (isAbort(err)) return
      const heading = err instanceof TypeError ? "Couldn't reach GitHub from this browser. The button below opens the same list on GitHub." : describeError(err, "Couldn't read the list from GitHub.")
      setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: heading, live: { kind, heading, href: kind === "issues" ? `${a.url}/issues` : `${a.url}/pulls`, items: [] } }])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setWaiting(false)
      }
    }
  }

  /** Issue and pull request lists come straight from GitHub. Everything else goes to the model, and `ai` forces that. */
  function send(text: string, ai = false) {
    const content = text.trim().slice(0, CHAT_LIMIT)
    if (!content || waiting) return
    const history = [...messages.filter((m) => !m.failed).map((m) => ({ ...m, fresh: false })), { id: nextId(), role: "user" as const, content }]
    setMessages(history)
    setInput("")
    if (textRef.current) textRef.current.style.height = "auto"
    const kind = ai ? null : liveIntent(content)
    void (kind ? answerLive(kind) : request(history))
  }

  function retry() {
    if (waiting) return
    const history = messages.filter((m) => !m.failed)
    setMessages(history)
    void request(history)
  }

  function clear() {
    abortRef.current?.abort()
    abortRef.current = null
    setWaiting(false)
    setMessages([])
    textRef.current?.focus()
  }

  useImperativeHandle(apiRef, () => ({
    ask: (text, go) => {
      if (go) {
        send(text)
        return
      }
      setInput(text.slice(0, CHAT_LIMIT))
      window.requestAnimationFrame(() => {
        fit()
        textRef.current?.focus({ preventScroll: true })
      })
    },
  }))

  const firstFile = a.result?.startFiles[0]?.path
  const suggestions: { icon: LucideIcon; q: string }[] = [
    { icon: Play, q: `How do I run ${a.repo} locally?` },
    { icon: Compass, q: firstFile ? `Why should I start with ${firstFile}?` : `How is ${a.repo} organized?` },
    { icon: CircleDot, q: "Which good first issues are open right now?" },
  ]
  const nearLimit = input.length > CHAT_LIMIT * 0.8

  return (
    <Card id="gl-chat" className={cn("gl-rise relative flex min-w-0 scroll-mt-20 flex-col overflow-hidden", PANEL, "xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)]")} style={cssVars({ "--d": "120ms" })}>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 z-10 h-0.5 bg-[#a8ff3e]/70" />
      <section aria-label={`Ask about ${a.owner}/${a.repo}`} className="flex min-h-0 flex-1 flex-col">
        <header className="flex min-h-[58px] items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2 sm:px-5">
          <h3 className="flex min-w-0 items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-300">
            <MessageSquare aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-neutral-300" strokeWidth={2.25} />
            <span className="truncate">Ask about this repo</span>
          </h3>
          <LevelMenu value={level} onChange={onLevel} short className="shrink-0" />
        </header>

        {messages.length === 0 && (
          <div className="px-4 py-4 sm:px-5">
            <p className="text-[13.5px] leading-relaxed text-neutral-300">One question gets one complete answer: short, with the files and commands to act on it.</p>
            <ul className="mt-3 space-y-2">
              {suggestions.map((s) => (
                <li key={s.q}>
                  <button
                    type="button"
                    onClick={() => send(s.q)}
                    className="group flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2 pr-3 text-left outline-none transition-colors hover:border-white/20 hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <ToneIcon icon={s.icon} tone="sky" className="h-8 w-8" iconClassName="h-4 w-4" />
                    <span className="min-w-0 flex-1 text-[13.5px] leading-snug text-neutral-100 [overflow-wrap:anywhere]">{s.q}</span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-neutral-500 transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-neutral-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          ref={listRef}
          role="log"
          aria-label="Conversation"
          tabIndex={scrolls ? 0 : undefined}
          hidden={messages.length === 0}
          className="gl-scroll relative min-h-0 max-h-[min(62dvh,560px)] flex-1 space-y-5 overflow-y-auto px-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 sm:px-5 xl:max-h-none"
        >
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} data-msg={m.id} className="gl-rise flex justify-end">
                <p className="max-w-[88%] whitespace-pre-wrap rounded-xl rounded-br-sm border border-white/10 bg-white/[0.07] px-3.5 py-2.5 text-[14px] leading-relaxed text-neutral-50 [overflow-wrap:anywhere]">{m.content}</p>
              </div>
            ) : m.failed ? (
              <div key={m.id} data-msg={m.id} role="alert" className="gl-rise flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-400">
                  <AlertIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-relaxed text-rose-200 [overflow-wrap:anywhere]">{m.content}</p>
                  {m === messages[messages.length - 1] && (
                    <button type="button" onClick={retry} className={cn(ACTION_BTN, "mt-2 px-2.5")}>
                      <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div key={m.id} data-msg={m.id} className="gl-rise flex gap-3">
                <AssistantMark />
                <div className="min-w-0 flex-1">
                  {m.live ? (
                    <LiveAnswer live={m.live} onAsk={(q) => send(q, true)} />
                  ) : m.answer ? (
                    <AnswerView answer={m.answer} fresh={Boolean(m.fresh)} onSend={send} onFile={(path, why) => onFile(path, why)} />
                  ) : (
                    <Markdown>{m.content}</Markdown>
                  )}
                  {m.answer && isCannotAnswer(m.answer) && <LookupLinks links={lookupLinks(a)} />}
                  <div className="-ml-2 mt-2">
                    <CopyButton text={m.content} label="Copy answer" className="w-auto border-transparent bg-transparent px-2 text-neutral-400 lg:h-7">
                      <span>Copy</span>
                    </CopyButton>
                  </div>
                </div>
              </div>
            )
          )}
          {waiting && <Thinking steps={trace} />}
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            if (waiting) abortRef.current?.abort()
            else send(input)
          }}
          className="border-t border-white/[0.06] p-3 sm:p-4"
        >
          <div className="gl-ask flex items-end gap-2 rounded-xl border border-white/10 bg-[#07070a] p-1.5 pl-3">
            <label htmlFor={`${uid}-ask`} className="sr-only">
              Ask a question about {a.owner}/{a.repo}
            </label>
            <div className="relative min-w-0 flex-1">
              {!input && <RotatingPlaceholder paused={focused} />}
              <textarea
                id={`${uid}-ask`}
                ref={textRef}
                rows={1}
                maxLength={CHAT_LIMIT}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  fit()
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(e) => {
                  // Enter sends on devices with a keyboard; on touch screens it stays a line break and the button sends.
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                className="gl-scroll relative block max-h-36 min-h-[40px] w-full resize-none bg-transparent py-2.5 text-base leading-snug text-neutral-50 outline-none sm:text-[14px]"
              />
            </div>
            {waiting ? (
              <Button type="submit" aria-label="Stop" title="Stop" className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100 p-0 text-neutral-900 hover:bg-white focus-visible:ring-2 focus-visible:ring-white/70 lg:h-9 lg:w-9">
                <Square aria-hidden="true" className="h-3.5 w-3.5 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                aria-label="Send"
                title="Send"
                disabled={!input.trim()}
                className="h-10 w-10 shrink-0 rounded-lg bg-[#a8ff3e] p-0 text-neutral-950 transition-[transform,background-color] hover:bg-[#bcff6a] focus-visible:ring-2 focus-visible:ring-white/70 active:scale-90 disabled:bg-white/[0.08] disabled:text-neutral-400 lg:h-9 lg:w-9"
              >
                <ArrowUp aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[12px] text-neutral-400">
            <p className="min-w-0">
              <span className="hidden [@media(pointer:fine)]:inline">Enter to send, Shift+Enter for a new line</span>
              <span className="[@media(pointer:fine)]:hidden">Answers use the analysis above</span>
            </p>
            <div className="flex shrink-0 items-center gap-3">
              {nearLimit && (
                <span className="font-mono tabular-nums text-amber-300">
                  {input.length}/{CHAT_LIMIT}
                </span>
              )}
              {messages.length > 0 && (
                <button type="button" onClick={clear} className="-my-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-neutral-300 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/50">
                  <Trash2 aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                  Clear chat
                </button>
              )}
            </div>
          </div>
        </form>
      </section>
    </Card>
  )
}

/** On small screens the chat is at the bottom of a long page, so a button floats until it comes into view. */
function AskFab({ onClick }: { onClick: () => void }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = document.getElementById("gl-chat")
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <button
      type="button"
      onClick={onClick}
      inert={!visible}
      className={cn(
        "fixed bottom-[calc(100px+env(safe-area-inset-bottom,0px))] right-4 z-40 inline-flex h-12 items-center gap-2 rounded-xl bg-[#a8ff3e] px-4 text-[13.5px] font-semibold text-neutral-950 shadow-[0_10px_30px_-10px_rgba(168,255,62,0.4)] outline-none transition-[opacity,transform] duration-300 focus-visible:ring-2 focus-visible:ring-white lg:bottom-4 xl:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <MessageSquare aria-hidden="true" className="h-4 w-4" strokeWidth={2.25} />
      Ask about this repo
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

function ResultView({
  a,
  level,
  onLevel,
  onRerun,
  headingRef,
}: {
  a: Analysis
  level: Level
  onLevel: (l: Level) => void
  onRerun: () => void
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const chatApi = useRef<ChatApi | null>(null)
  const r = a.result

  const scrollToChat = () => document.getElementById("gl-chat")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })
  const focusChat = () => {
    scrollToChat()
    document.querySelector<HTMLTextAreaElement>("#gl-chat textarea")?.focus({ preventScroll: true })
  }
  // A question from a sheet lands in the chat input, ready to send or to edit.
  const askAbout = (text: string) => {
    setDetail(null)
    scrollToChat()
    chatApi.current?.ask(text, false)
  }
  const openFile = (path: string, why = "") => setDetail({ kind: "file", path, why, back: null })

  const hasFacts = Boolean(a.facts)
  const nav = useMemo<{ id: string; label: string; icon: LucideIcon }[]>(
    () =>
      r
        ? [
            { id: "gl-overview", label: "Overview", icon: BookOpen },
            ...(hasFacts ? [{ id: "gl-ready", label: "Readiness", icon: ShieldCheck }] : []),
            { id: "gl-roadmap", label: "Roadmap", icon: Route },
            ...(r.areas.length > 0 ? [{ id: "gl-areas", label: "Areas", icon: FolderTree }] : []),
            { id: "gl-files", label: "Start files", icon: FileCode2 },
            ...(r.tech.length > 0 ? [{ id: "gl-stack", label: "Stack", icon: Layers }] : []),
          ]
        : [],
    [r, hasFacts]
  )

  return (
    <>
      <div className="mt-6 grid gap-6 sm:mt-8 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-8">
        <div className="min-w-0 space-y-6 sm:space-y-8">
          <RepoHeader a={a} level={level} ready={hasAnalysis(a.owner, a.repo, level)} onRerun={onRerun} onAsk={focusChat} headingRef={headingRef} />
          {r ? (
            <>
              <JumpNav items={nav} />
              <Overview r={r} />
              <Readiness a={a} />
              <Roadmap a={a} onFile={openFile} />
              <AreaGrid areas={r.areas} onOpen={(area) => setDetail({ kind: "area", area })} />
              <StartFiles files={r.startFiles} repoUrl={a.url} onFile={openFile} />
              <TechGrid tech={r.tech} onOpen={(tech) => setDetail({ kind: "tech", tech })} />
            </>
          ) : (
            <>
              <Readiness a={a} />
              <RawAnswer text={a.raw} />
            </>
          )}
          <HuntCta repo={`${a.owner}/${a.repo}`} />
        </div>
        {/* Keyed by run, so a new analysis starts a fresh conversation. */}
        <ChatPanel key={a.id} a={a} level={level} onLevel={onLevel} onFile={openFile} apiRef={chatApi} />
      </div>
      <DetailSheet a={a} detail={detail} level={level} onChange={setDetail} onAsk={askAbout} />
      <AskFab onClick={focusChat} />
    </>
  )
}

type Phase = "idle" | "loading" | "done" | "error"

// ── Finished analyses ────────────────────────────────────────────────────────
// An analysis costs model tokens, so a finished one is never run again for the same repository at the same level.
// It is kept in memory, and in sessionStorage so refreshing this tab does not lose it either. Only a new level or a
// new repository starts a run.

const analysisCache = new Map<string, Analysis>()
const STORE_PREFIX = "gl:analysis:v1:"
const STORE_LIMIT = 6

const analysisKey = (owner: string, repo: string, level: Level) => `${owner}/${repo}|${level}`.toLowerCase()
const sameAnalysis = (a: Analysis, owner: string, repo: string, level: Level) => analysisKey(a.owner, a.repo, a.level) === analysisKey(owner, repo, level)

/** The stream events an analysis is built from, so it can be rebuilt (and checked again) after a refresh. */
interface Stored {
  event: Record<string, unknown>
  facts: Record<string, unknown> | null
}

function storedIndex(): string[] {
  try {
    const v: unknown = JSON.parse(window.sessionStorage.getItem(`${STORE_PREFIX}index`) || "[]")
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function storeAnalysis(key: string, source: Stored) {
  try {
    const index = storedIndex().filter((k) => k !== key)
    index.push(key)
    while (index.length > STORE_LIMIT) window.sessionStorage.removeItem(STORE_PREFIX + index.shift())
    window.sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify(source))
    window.sessionStorage.setItem(`${STORE_PREFIX}index`, JSON.stringify(index))
  } catch {
    // private mode or a full quota: the copy in memory still works
  }
}

function hasAnalysis(owner: string, repo: string, level: Level) {
  const key = analysisKey(owner, repo, level)
  if (analysisCache.has(key)) return true
  try {
    return window.sessionStorage.getItem(STORE_PREFIX + key) !== null
  } catch {
    return false
  }
}

function recallAnalysis(owner: string, repo: string, level: Level, id: number): Analysis | null {
  const key = analysisKey(owner, repo, level)
  const hit = analysisCache.get(key)
  if (hit) return hit
  try {
    const stored = rec(JSON.parse(window.sessionStorage.getItem(STORE_PREFIX + key) ?? "null"))
    const event = rec(stored?.event)
    if (!event) return null
    const f = rec(stored?.facts)
    const found = toAnalysis(event, { owner, repo }, level, id, { facts: parseFacts(f?.facts), meta: parseMeta(f) })
    if (found) analysisCache.set(key, found)
    return found
  } catch {
    return null
  }
}

function GitLensePageContent() {
  const [level, setLevel] = useState<Level>(DEFAULT_LEVEL)
  const [url, setUrl] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [error, setError] = useState("")
  const [invalid, setInvalid] = useState(false)
  // A link can fill in the form: Hunt hands over an issue link (?url=), and a shared GitLense link carries ?repo= and ?level=.
  // Neither starts a run, so a link can never spend anyone's quota.
  const [seed, setSeed] = useState<{ value: string; label: string; from: "hunt" | "link" } | null>(null)
  const linkReady = useRef(false)
  const inputId = useId()
  const abortRef = useRef<AbortController | null>(null)
  const runRef = useRef(0)
  const headingRef = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const hunt = parseHuntLink(q.get("url") ?? "")
    const shared = hunt ? null : parseRepoInput((q.get("repo") ?? "").slice(0, 200))
    const lv = LEVELS.find((l) => l.id === q.get("level"))
    // A tick later, so the first paint matches the server's.
    queueMicrotask(() => {
      if (hunt) {
        setSeed({ value: hunt.value, label: hunt.label, from: "hunt" })
        setUrl(hunt.value)
      } else if (shared) {
        const value = `github.com/${shared.owner}/${shared.repo}`
        setSeed({ value, label: `${shared.owner}/${shared.repo}`, from: "link" })
        setUrl(value)
      }
      if (lv) setLevel(lv.id)
      linkReady.current = true
    })
  }, [])

  // The address bar follows the form, so a refresh, a bookmark or a shared link brings the same form back.
  useEffect(() => {
    if (!linkReady.current) return
    const parsed = parseRepoInput(url)
    const parts: string[] = []
    if (parsed) parts.push(`repo=${parsed.owner}/${parsed.repo}`)
    if (level !== DEFAULT_LEVEL) parts.push(`level=${level}`)
    const { pathname, search, hash } = window.location
    const next = `${pathname}${parts.length ? `?${parts.join("&")}` : ""}${hash}`
    if (next !== `${pathname}${search}${hash}`) window.history.replaceState(window.history.state, "", next)
  }, [url, level])

  const fromLink = seed && seed.value && url === seed.value && phase === "idle" ? seed : null

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    []
  )

  // When a result lands, focus its heading so keyboard and screen-reader users start reading there.
  const doneId = phase === "done" ? (analysis?.id ?? null) : null
  useEffect(() => {
    if (doneId !== null) headingRef.current?.focus({ preventScroll: true })
  }, [doneId])

  const focusInput = () => document.getElementById(inputId)?.focus()

  function clearLink() {
    setUrl("")
    setSeed(null)
    focusInput()
  }

  /** Puts a finished analysis on screen without running anything. */
  function show(a: Analysis) {
    setAnalysis(a)
    setError("")
    setPhase("done")
    window.requestAnimationFrame(() => {
      const h = headingRef.current
      h?.focus({ preventScroll: true })
      h?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" })
    })
  }

  async function runGitLense(target: string) {
    if (phase === "loading") return
    const parsed = parseRepoInput(target)
    if (!parsed) {
      setInvalid(true)
      focusInput()
      return
    }
    setInvalid(false)

    // Already analyzed at this level: show it. Nothing is sent, so nothing is spent.
    if (analysis && sameAnalysis(analysis, parsed.owner, parsed.repo, level)) {
      show(analysis)
      return
    }
    const known = recallAnalysis(parsed.owner, parsed.repo, level, runRef.current + 1)
    if (known) {
      runRef.current += 1
      show(known)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    runRef.current += 1
    const run = runRef.current

    const live: { facts: Facts | null; meta: RepoMeta; factsEvent: Record<string, unknown> | null } = { facts: null, meta: {}, factsEvent: null }
    const patch = (p: Partial<Progress>) => setProgress((cur) => (cur && cur.run === run ? { ...cur, ...p } : cur))
    setProgress(newProgress(run, parsed.owner, parsed.repo, level))
    setError("")
    setPhase("loading")

    try {
      const res = await fetch("/api/gitlense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: parsed.url, expertiseLevel: level }),
        signal: controller.signal,
      })
      if (!res.ok) throw await readError(res)

      // The server reports what it finds as it finds it. Only the final event decides success.
      const out: { analysis: Analysis | null; event: Record<string, unknown> | null; failure: ApiError | null } = { analysis: null, event: null, failure: null }
      await readNdjson(res, (event) => {
        if (run !== runRef.current) return
        switch (event.t) {
          case "repo":
            live.meta = mergeMeta(live.meta, parseMeta(event))
            patch({ meta: live.meta, blurb: str(event.description).slice(0, 200) })
            break
          case "facts":
            live.facts = parseFacts(event.facts)
            live.meta = mergeMeta(live.meta, parseMeta(event))
            live.factsEvent = event
            patch({ facts: live.facts, meta: live.meta })
            break
          case "pick":
            patch({ pick: { total: num(event.total), best: strList(event.files, 6) } })
            break
          case "read": {
            const path = typeof event.path === "string" ? event.path.slice(0, 200) : ""
            if (path) setProgress((cur) => (cur && cur.run === run ? { ...cur, read: { count: num(event.n, cur.read.count + 1), recent: [...cur.read.recent, path].slice(-6) } } : cur))
            break
          }
          case "detect":
            patch({ stack: strList(event.stack, 12) })
            break
          case "index":
            patch({ index: { symbols: num(event.symbols), files: num(event.files) } })
            break
          case "cache":
            patch({ reused: true })
            break
          case "context":
            patch({ context: { files: num(event.files), chars: num(event.chars) } })
            break
          case "write": {
            const state: PartState = event.state === "start" ? "write" : event.state === "fallback" ? "fallback" : "done"
            if (event.part === "overview") patch({ overview: state })
            else if (event.part === "roadmap") patch({ roadmap: state })
            break
          }
          case "result":
          case "raw":
            out.analysis = toAnalysis(event, parsed, level, run, live)
            out.event = event
            break
          case "error":
            out.failure = new ApiError(num(event.status, 500), typeof event.message === "string" ? event.message : "")
            break
        }
      })
      if (run !== runRef.current) return
      if (out.failure) throw out.failure
      if (!out.analysis || !out.event) throw new Error("The connection closed before the analysis finished. Try again.")
      const key = analysisKey(out.analysis.owner, out.analysis.repo, level)
      analysisCache.set(key, out.analysis)
      storeAnalysis(key, { event: out.event, facts: live.factsEvent })
      setAnalysis(out.analysis)
      setPhase("done")
      window.dispatchEvent(new CustomEvent("usage:updated"))
    } catch (err) {
      if (isAbort(err) || run !== runRef.current) return
      setError(describeError(err, "Couldn't analyze this repository. Try again."))
      setPhase("error")
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }

  function cancel() {
    abortRef.current?.abort()
    abortRef.current = null
    runRef.current += 1
    setPhase(analysis ? "done" : "idle")
    // The server may already have counted the run; ask the usage meter to refresh.
    window.dispatchEvent(new CustomEvent("usage:updated"))
  }

  function pick(repo: string) {
    setUrl(`github.com/${repo}`)
    setInvalid(false)
    const el = document.getElementById(inputId)
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" })
  }

  const typed = useMemo(() => parseRepoInput(url), [url])
  const upToDate = phase === "done" && analysis !== null && typed !== null && sameAnalysis(analysis, typed.owner, typed.repo, level)

  // The big first-visit layout is only for a fresh page; after a failure the compact bar and the error sit together, in view.
  const hero = phase === "idle"
  const composer = (
    <Composer
      variant={hero ? "hero" : "bar"}
      inputId={inputId}
      value={url}
      onChange={(v) => {
        setUrl(v)
        if (invalid) setInvalid(false)
      }}
      onSubmit={() => void runGitLense(url)}
      busy={phase === "loading"}
      done={upToDate}
      invalid={invalid}
      level={level}
      onLevel={setLevel}
      note={
        fromLink && (
          <p role="status" className="mt-1.5 flex items-start gap-2 px-1.5 text-left text-[12.5px] leading-relaxed text-neutral-400">
            <CircleDot aria-hidden="true" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-neutral-300" strokeWidth={2} />
            <span>
              {fromLink.from === "hunt" ? "From Hunt" : "Filled in from the link"}: <span className="font-mono text-neutral-200">{fromLink.label}</span>.{" "}
              {fromLink.from === "hunt" ? "GitLense reads the whole repository and only starts when you press Analyze." : "Nothing runs until you press Analyze."}{" "}
              <button
                type="button"
                onClick={clearLink}
                aria-label="Clear the link"
                className="cursor-pointer rounded-sm text-neutral-200 underline underline-offset-4 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
              >
                Clear
              </button>
            </span>
          </p>
        )
      }
    />
  )

  return (
    <div
      className="gl-root relative isolate min-h-screen overflow-x-clip bg-[#090909] font-['Outfit','Inter',sans-serif] text-neutral-200 antialiased selection:bg-white/20"
      style={{ colorScheme: "dark" }}
    >
      <style>{GL_CSS}</style>
      {hero && (
        <>
          <div aria-hidden="true" className="gl-aurora">
            <i />
            <i />
            <i />
          </div>
          <div aria-hidden="true" className="gl-grid" />
        </>
      )}
      <Navbar />

      <main aria-busy={phase === "loading"} className={cn("mx-auto w-full max-w-[1180px] px-4 pb-24 sm:px-6 lg:px-8", hero ? "pt-10 sm:pt-14 lg:pt-20" : "pt-6 sm:pt-8")}>
        {hero ? (
          <Hero composer={composer} />
        ) : (
          <>
            <h1 className="sr-only">GitLense</h1>
            <div className="gl-rise">{composer}</div>
          </>
        )}

        {phase === "loading" && progress && (
          <div className="mt-5 sm:mt-6">
            <AnalysisProgress key={progress.run} p={progress} onCancel={cancel} />
            <ResultSkeleton />
          </div>
        )}

        {phase === "error" && (
          <div className="mt-5 sm:mt-6">
            <StatePanel title="Couldn't analyze this repo" message={error}>
              <Button type="button" onClick={() => void runGitLense(url)} className={LIME_BTN}>
                <RefreshCw aria-hidden="true" className="h-4 w-4" strokeWidth={2} />
                Try again
              </Button>
              <Button type="button" variant="outline" onClick={focusInput} className={OUTLINE_BTN}>
                Edit URL
              </Button>
            </StatePanel>
          </div>
        )}

        {phase === "done" && analysis && <ResultView a={analysis} level={level} onLevel={setLevel} onRerun={() => void runGitLense(analysis.url)} headingRef={headingRef} />}

        {(phase === "idle" || phase === "error") && (
          <div className={cn("space-y-16 sm:space-y-24", hero ? "mt-16 sm:mt-24" : "mt-14 sm:mt-20")}>
            <PopularRepos onPick={pick} />
            <HowItWorks />
            <HuntCta />
          </div>
        )}
      </main>
    </div>
  )
}

export default function GitLensePage() {
  return (
    <RequireAuth>
      <GitLensePageContent />
    </RequireAuth>
  )
}
