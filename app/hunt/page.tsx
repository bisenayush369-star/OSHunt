"use client"

import { useState, useMemo, useEffect, useRef, type ComponentType, type CSSProperties } from "react"
import { useSession } from "next-auth/react"
import Select, { type OptionProps, type SingleValueProps, type MultiValueProps } from "react-select"
import * as SiIcons from "react-icons/si"
import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ────────────────────────────────────────────────────────────────────────────
// Brand tokens
// ────────────────────────────────────────────────────────────────────────────

const BRAND = "#a8ff3e"

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
  /** Repo's primary language, e.g. "Python" / "Vue" — used to badge each row in multi-language results. */
  language?: string
  /** ISO date of the repo's last merged PR / push. Powers the exact "dead since" label instead of a vague threshold. */
  repoLastActivityAt?: string
}

const DIFFICULTIES = ["easy", "medium", "hard"] as const
type Difficulty = (typeof DIFFICULTIES)[number]

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "least-commented", label: "Least commented · uncontested" },
  { value: "most-commented", label: "Most commented · active discussion" },
  { value: "most-reactions", label: "Most reactions" },
] as const
type SortBy = (typeof SORT_OPTIONS)[number]["value"]

type LanguageOption = {
  value: string
  label: string
  icon: ComponentType<{ className?: string; size?: number; style?: CSSProperties }>
  iconColor: string
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "html", label: "HTML", icon: SiIcons.SiHtml5, iconColor: "#E34F26" },
  { value: "css", label: "CSS", icon: SiIcons.SiCss, iconColor: "#1572B6" },
  { value: "react", label: "React", icon: SiIcons.SiReact, iconColor: "#61DAFB" },
  { value: "nextjs", label: "Next.js", icon: SiIcons.SiNextdotjs, iconColor: "#000000" },
  { value: "vue", label: "Vue", icon: SiIcons.SiVuedotjs, iconColor: "#4FC08D" },
  { value: "nuxt", label: "Nuxt", icon: SiIcons.SiNuxt, iconColor: "#00DC82" },
  { value: "svelte", label: "Svelte", icon: SiIcons.SiSvelte, iconColor: "#FF3E00" },
  { value: "sveltekit", label: "SvelteKit", icon: SiIcons.SiSvelte, iconColor: "#FF3E00" },
  { value: "angular", label: "Angular", icon: SiIcons.SiAngular, iconColor: "#DD0031" },
  { value: "astro", label: "Astro", icon: SiIcons.SiAstro, iconColor: "#FF5D01" },
  { value: "remix", label: "Remix", icon: SiIcons.SiRemix, iconColor: "#000000" },
  { value: "nodejs", label: "Node.js", icon: SiIcons.SiNodedotjs, iconColor: "#5FA04E" },
  { value: "express", label: "Express", icon: SiIcons.SiExpress, iconColor: "#000000" },
  { value: "nestjs", label: "NestJS", icon: SiIcons.SiNestjs, iconColor: "#E0234E" },
  { value: "django", label: "Django", icon: SiIcons.SiDjango, iconColor: "#092E20" },
  { value: "flask", label: "Flask", icon: SiIcons.SiFlask, iconColor: "#000000" },
  { value: "fastapi", label: "FastAPI", icon: SiIcons.SiFastapi, iconColor: "#009688" },
  { value: "laravel", label: "Laravel", icon: SiIcons.SiLaravel, iconColor: "#FF2D20" },
  { value: "springboot", label: "Spring Boot", icon: SiIcons.SiSpringboot, iconColor: "#6DB33F" },
  { value: "aspnetcore", label: "ASP.NET Core", icon: SiIcons.SiDotnet, iconColor: "#512BD4" },
  { value: "sql", label: "SQL", icon: SiIcons.SiMysql, iconColor: "#4479A1" },
  { value: "postgresql", label: "PostgreSQL", icon: SiIcons.SiPostgresql, iconColor: "#336791" },
  { value: "mysql", label: "MySQL", icon: SiIcons.SiMysql, iconColor: "#4479A1" },
  { value: "sqlite", label: "SQLite", icon: SiIcons.SiSqlite, iconColor: "#003B57" },
  { value: "mongodb", label: "MongoDB", icon: SiIcons.SiMongodb, iconColor: "#47A248" },
  { value: "redis", label: "Redis", icon: SiIcons.SiRedis, iconColor: "#DC382D" },
  { value: "docker", label: "Docker", icon: SiIcons.SiDocker, iconColor: "#2496ED" },
  { value: "kubernetes", label: "Kubernetes", icon: SiIcons.SiKubernetes, iconColor: "#326CE5" },
  { value: "terraform", label: "Terraform", icon: SiIcons.SiTerraform, iconColor: "#844FBA" },
  { value: "graphql", label: "GraphQL", icon: SiIcons.SiGraphql, iconColor: "#E10098" },
  { value: "javascript", label: "JavaScript", icon: SiIcons.SiJavascript, iconColor: "#F7DF1E" },
  { value: "typescript", label: "TypeScript", icon: SiIcons.SiTypescript, iconColor: "#3178C6" },
  { value: "python", label: "Python", icon: SiIcons.SiPython, iconColor: "#3776AB" },
  { value: "go", label: "Go", icon: SiIcons.SiGo, iconColor: "#00ADD8" },
  { value: "rust", label: "Rust", icon: SiIcons.SiRust, iconColor: "#DEA584" },
  { value: "java", label: "Java", icon: SiIcons.SiOpenjdk, iconColor: "#007396" },
  { value: "kotlin", label: "Kotlin", icon: SiIcons.SiKotlin, iconColor: "#7F52FF" },
  { value: "swift", label: "Swift", icon: SiIcons.SiSwift, iconColor: "#F05138" },
  { value: "csharp", label: "C#", icon: SiIcons.SiSharp, iconColor: "#239120" },
  { value: "cplusplus", label: "C++", icon: SiIcons.SiCplusplus, iconColor: "#00599C" },
  { value: "c", label: "C", icon: SiIcons.SiC, iconColor: "#A8B9CC" },
  { value: "php", label: "PHP", icon: SiIcons.SiPhp, iconColor: "#777BB4" },
  { value: "ruby", label: "Ruby", icon: SiIcons.SiRuby, iconColor: "#CC342D" },
  { value: "scala", label: "Scala", icon: SiIcons.SiScala, iconColor: "#DC322F" },
  { value: "dart", label: "Dart", icon: SiIcons.SiDart, iconColor: "#0175C2" },
  { value: "elixir", label: "Elixir", icon: SiIcons.SiElixir, iconColor: "#4B275F" },
  { value: "haskell", label: "Haskell", icon: SiIcons.SiHaskell, iconColor: "#5D4F85" },
  { value: "lua", label: "Lua", icon: SiIcons.SiLua, iconColor: "#2C2D72" },
  { value: "r", label: "R", icon: SiIcons.SiR, iconColor: "#276DC3" },
  { value: "bash", label: "Bash", icon: SiIcons.SiGnubash, iconColor: "#4EAA25" },
  { value: "powershell", label: "PowerShell", icon: SiIcons.SiPowers, iconColor: "#5391FE" },
  { value: "shell", label: "Shell", icon: SiIcons.SiShell, iconColor: "#4EAA25" },
  { value: "perl", label: "Perl", icon: SiIcons.SiPerl, iconColor: "#39457E" },
  { value: "groovy", label: "Groovy", icon: SiIcons.SiApachegroovy, iconColor: "#4298B8" },
  { value: "objectivec", label: "Objective-C", icon: SiIcons.SiApple, iconColor: "#A2AAAD" },
  { value: "fsharp", label: "F#", icon: SiIcons.SiFsharp, iconColor: "#378BBA" },
  { value: "julia", label: "Julia", icon: SiIcons.SiJulia, iconColor: "#9558B2" },
  { value: "zig", label: "Zig", icon: SiIcons.SiZig, iconColor: "#F7A41D" },
  { value: "clojure", label: "Clojure", icon: SiIcons.SiClojure, iconColor: "#5881D8" },
  { value: "erlang", label: "Erlang", icon: SiIcons.SiErlang, iconColor: "#A90533" },
  { value: "solidity", label: "Solidity", icon: SiIcons.SiSolidity, iconColor: "#363636" },
  { value: "nim", label: "Nim", icon: SiIcons.SiNim, iconColor: "#FFC200" },
  { value: "gleam", label: "Gleam", icon: SiIcons.SiGleam, iconColor: "#FFAFF3" },
  { value: "ocaml", label: "OCaml", icon: SiIcons.SiOcaml, iconColor: "#EC6813" },
]

const DIFF: Record<Difficulty, { hex: string; text: string; bg: string; border: string; dot: string }> = {
  easy:   { hex: "#a8ff3e", text: "text-[#a8ff3e]", bg: "bg-[#a8ff3e]/[0.08]", border: "border-[#a8ff3e]/20", dot: "bg-[#a8ff3e]" },
  medium: { hex: "#ffd166", text: "text-[#ffd166]", bg: "bg-[#ffd166]/[0.08]", border: "border-[#ffd166]/20", dot: "bg-[#ffd166]" },
  hard:   { hex: "#ff4d6d", text: "text-[#ff4d6d]", bg: "bg-[#ff4d6d]/[0.08]", border: "border-[#ff4d6d]/20", dot: "bg-[#ff4d6d]" },
}

const QUICK_REPOS = [
  { short: "next.js", full: "vercel/next.js", accent: "#ffffff", letter: "N" },
  { short: "express", full: "expressjs/express", accent: "#f0c14b", letter: "E" },
  { short: "prisma", full: "prisma/prisma", accent: "#8b8cf9", letter: "P" },
  { short: "react", full: "facebook/react", accent: "#61dafb", letter: "R" },
  { short: "vite", full: "vitejs/vite", accent: "#bd93f9", letter: "V" },
]

const TEMPLATES = [
  {
    key: "JavaScript", accent: "#61DAFB", title: "React Ecosystem",
    desc: "Find good first issues in frontend React and Next.js repositories.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 md:h-10 md:w-10">
        <circle cx="12" cy="12" r="2.5" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
      </svg>
    ),
  },
  {
    key: "TypeScript", accent: "#68A063", title: "Express & Node",
    desc: "Tackle backend API routing, controllers, and middleware bugs.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 md:h-10 md:w-10">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <line x1="6" y1="6" x2="6.01" y2="6" />
        <line x1="6" y1="18" x2="6.01" y2="18" />
      </svg>
    ),
  },
  {
    key: "Python", accent: "#4DB33D", title: "Database Core",
    desc: "Fix easy schema, indexing, and query logic in backend data tools.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 md:h-10 md:w-10">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
      </svg>
    ),
  },
  {
    key: "Go", accent: BRAND, title: "Tooling & Config",
    desc: "Help out with automation scripts, build environments, and configurations.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8 md:h-10 md:w-10">
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Icons
// ────────────────────────────────────────────────────────────────────────────

function GithubMiniIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.5 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.1-1.49-1.1-1.49-.9-.63.07-.62.07-.62.99.07 1.51 1.04 1.51 1.04.89 1.55 2.33 1.1 2.9.84.09-.66.34-1.1.62-1.36-2.22-.26-4.55-1.13-4.55-5.02 0-1.11.38-2.02 1.01-2.73-.1-.26-.44-1.31.1-2.72 0 0 .83-.27 2.72 1.04a9.2 9.2 0 0 1 4.96 0c1.89-1.31 2.72-1.04 2.72-1.04.54 1.41.2 2.46.1 2.72.63.71 1.01 1.62 1.01 2.73 0 3.9-2.34 4.76-4.57 5.01.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" />
    </svg>
  )
}
function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}
function CheckMiniIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12.5 9 18 20 6" />
    </svg>
  )
}
function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  )
}
function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
function AiDraftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2" />
    </svg>
  )
}
function BookmarkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

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
function repoName(url: string) {
  return url.replace("https://api.github.com/repos/", "")
}
/** Case-insensitive lookup so an issue's raw `language` string ("python", "Python", "PYTHON") always resolves to its logo. */
function findLanguageOption(lang?: string) {
  if (!lang) return undefined
  const needle = lang.toLowerCase()
  return LANGUAGE_OPTIONS.find((o) => o.value === needle || o.label.toLowerCase() === needle)
}
function formatExactDate(dateStr?: string) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

// ────────────────────────────────────────────────────────────────────────────
// Bookmark button
// ────────────────────────────────────────────────────────────────────────────

function BookmarkButton({ url, title, repoName: repo }: { url: string; title: string; repoName: string }) {
  const [saved, setSaved] = useState(false)
  const [burst, setBurst] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const next = !saved
    setSaved(next)
    if (next) {
      setBurst(true)
      setTimeout(() => setBurst(false), 500)
    }
    try {
      await fetch("/api/bookmarks", {
        method: next ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, repoName: repo }),
      })
    } catch {
      setSaved(!next)
    }
  }

  return (
    <button
      onClick={toggle}
      title={saved ? "Remove bookmark" : "Bookmark this issue"}
      aria-label={saved ? "Remove bookmark" : "Bookmark this issue"}
      aria-pressed={saved}
      className={cn(
        "relative flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-md border transition-all active:scale-90",
        saved
          ? "border-[#a8ff3e]/40 bg-[#a8ff3e]/10 text-[#a8ff3e]"
          : "border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-[#a8ff3e]/40 hover:bg-[#a8ff3e]/5 hover:text-[#a8ff3e]"
      )}
    >
      <BookmarkIcon
        width={14}
        height={14}
        strokeWidth={saved ? 2 : 2.25}
        fill={saved ? "currentColor" : "none"}
        className={cn("transition-transform duration-300", saved && "scale-[1.15]")}
      />
      {burst && (
        <span className="pointer-events-none absolute inset-0 animate-ping rounded-md bg-[#a8ff3e]/30 [animation-iteration-count:1] [animation-duration:500ms]" />
      )}
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Difficulty badge
// ────────────────────────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const d = DIFF[difficulty]
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", d.text, d.bg, d.border, className)}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", d.dot)} />
      {difficulty}
    </Badge>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Language picker
// ────────────────────────────────────────────────────────────────────────────

function LanguagePicker({
  multiMode, onModeChange,
  language, setLanguage,
  languages, setLanguages,
}: {
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

  function CustomOption(props: OptionProps<LanguageOption, boolean>) {
    const { data, innerProps, isSelected, isFocused } = props
    const Icon = data.icon
    return (
      <div
        {...innerProps}
        className={cn(
          "flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
          isSelected
            ? "bg-[#a8ff3e]/15 font-semibold text-[#a8ff3e] shadow-[inset_2px_0_0_0_#a8ff3e]"
            : isFocused
            ? "translate-x-0.5 bg-white/[0.06] text-neutral-100"
            : "text-neutral-400 hover:text-neutral-200"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" style={{ color: data.iconColor }} />
        <span className="truncate">{data.label}</span>
        {isSelected && <CheckMiniIcon className="ml-auto shrink-0 text-[#a8ff3e]" />}
      </div>
    )
  }

  function CustomSingleValue(props: SingleValueProps<LanguageOption, boolean>) {
    const { data } = props
    const Icon = data.icon
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color: data.iconColor }} />
        <span className="text-[14.5px] font-semibold text-neutral-100">{data.label}</span>
      </div>
    )
  }

  function CustomMultiValue(props: MultiValueProps<LanguageOption, true>) {
    const { data, removeProps } = props
    const Icon = data.icon
    return (
      <div
        className="my-[3px] mr-1.5 flex items-center gap-1 rounded-md border py-[3px] pl-1.5 pr-1"
        style={{ borderColor: `${data.iconColor}40`, background: `${data.iconColor}14` }}
      >
        <Icon className="h-3 w-3 shrink-0" style={{ color: data.iconColor }} />
        <span className="max-w-[76px] truncate text-[11.5px] font-medium text-neutral-200">{data.label}</span>
        <button {...removeProps} type="button" className="ml-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-neutral-500 transition-colors hover:bg-white/10 hover:text-white">
          ×
        </button>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-2 font-mono text-[10.5px] font-bold uppercase tracking-widest text-neutral-500">Language</p>

      <div className="relative mb-2.5 grid grid-cols-2 gap-1 rounded-[10px] border border-neutral-800 bg-neutral-950 p-1">
        <div
          className="absolute inset-y-1 w-[calc(50%-2.67px)] rounded-[7px] border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.08] transition-transform duration-250 ease-out"
          style={{ transform: `translateX(${multiMode ? 100 : 0}%)` }}
        />
        <button
          type="button"
          onClick={() => onModeChange(false)}
          className={cn("relative z-10 rounded-md py-2 text-[12px] font-semibold transition-colors", !multiMode ? "text-[#a8ff3e]" : "text-neutral-500 hover:text-neutral-300")}
        >
          Single
        </button>
        <button
          type="button"
          onClick={() => onModeChange(true)}
          className={cn("relative z-10 rounded-md py-2 text-[12px] font-semibold transition-colors", multiMode ? "text-[#a8ff3e]" : "text-neutral-500 hover:text-neutral-300")}
        >
          Multi
        </button>
      </div>

      {multiMode ? (
        <>
          <Select<LanguageOption, true>
            className="language-select"
            classNamePrefix="language-select"
            instanceId="language-select-multi"
            isMulti
            value={multiValue}
            onChange={(opts) => setLanguages((opts as LanguageOption[]).map((o) => o.label))}
            options={LANGUAGE_OPTIONS}
            getOptionLabel={(option) => option.label}
            getOptionValue={(option) => option.value}
            isSearchable
            filterOption={(option, input) => option.data.label.toLowerCase().includes(input.trim().toLowerCase())}
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
            placeholder="Search languages..."
            captureMenuScroll={true}
            menuShouldScrollIntoView={false}
            closeMenuOnScroll={false}
            components={{ Option: CustomOption, MultiValue: CustomMultiValue }}
            styles={{
              control: (base, state) => ({
                ...base,
                display: "flex",
                alignItems: "center",
                background: "#0f0f0f",
                border: `1px solid ${state.isFocused ? "rgba(168,255,62,0.4)" : "#1e1e1e"}`,
                borderRadius: 10,
                minHeight: 46,
                boxShadow: "none",
                cursor: "pointer",
                "&:hover": { borderColor: "rgba(168,255,62,0.3)" },
              }),
              valueContainer: (base) => ({ ...base, display: "flex", alignItems: "center", padding: "4px 10px", gap: 4 }),
              placeholder: (base) => ({ ...base, color: "#555", fontSize: 14 }),
              input: (base) => ({ ...base, color: "#fff", margin: 0 }),
              indicatorSeparator: () => ({ display: "none" }),
              dropdownIndicator: (base) => ({ ...base, color: "#666", padding: 8, "&:hover": { color: "#a8ff3e" } }),
              menu: (base) => ({
                ...base,
                background: "#111",
                border: "1px solid #1f1f1f",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 12px 35px rgba(0,0,0,.7)",
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
            }}
          />
          {languages.length === 0 && (
            <p className="mt-1.5 text-[10.5px] text-rose-400/80">Pick at least one language to search.</p>
          )}
        </>
      ) : (
        <Select<LanguageOption, false>
          instanceId="language-select-single"
          className="language-select"
          classNamePrefix="language-select"
          value={singleValue}
          onChange={(opt) => { if (opt) setLanguage(opt.label) }}
          options={LANGUAGE_OPTIONS}
          getOptionLabel={(option) => option.label}
          getOptionValue={(option) => option.value}
          isSearchable
          filterOption={(option, input) => option.data.label.toLowerCase().includes(input.trim().toLowerCase())}
          placeholder="Search language..."
          captureMenuScroll={true}
          menuShouldScrollIntoView={false}
          closeMenuOnScroll={false}
          components={{ Option: CustomOption, SingleValue: CustomSingleValue }}
          styles={{
            control: (base, state) => ({
              ...base,
              display: "flex",
              alignItems: "center",
              background: "#0f0f0f",
              border: `1px solid ${state.isFocused ? "rgba(168,255,62,0.4)" : "#1e1e1e"}`,
              borderRadius: 10,
              minHeight: 46,
              boxShadow: "none",
              cursor: "pointer",
              "&:hover": { borderColor: "rgba(168,255,62,0.3)" },
            }),
            valueContainer: (base) => ({ ...base, display: "flex", alignItems: "center", padding: "0 12px" }),
            placeholder: (base) => ({ ...base, color: "#555", fontSize: 14 }),
            input: (base) => ({ ...base, color: "#fff" }),
            indicatorSeparator: () => ({ display: "none" }),
            dropdownIndicator: (base) => ({ ...base, color: "#666", "&:hover": { color: "#a8ff3e" } }),
            menu: (base) => ({
              ...base,
              background: "#111",
              border: "1px solid #1f1f1f",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 12px 35px rgba(0,0,0,.7)",
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
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Filters panel
// ────────────────────────────────────────────────────────────────────────────

function FiltersPanel(props: {
  language: string; setLanguage: (v: string) => void
  languages: string[]; setLanguages: (v: string[]) => void
  multiMode: boolean; setMultiMode: (v: boolean) => void
  difficulty: Difficulty; setDifficulty: (v: Difficulty) => void
  bountyOnly: boolean; setBountyOnly: (v: boolean) => void
  activeOnly: boolean; setActiveOnly: (v: boolean) => void
  loading: boolean; searched: boolean; issuesCount: number
  onSearch: () => void
  repoFilter: string | null; onQuickRepo: (full: string) => void
}) {
  const {
    language, setLanguage, languages, setLanguages, multiMode, setMultiMode,
    difficulty, setDifficulty, bountyOnly, setBountyOnly,
    activeOnly, setActiveOnly,
    loading, searched, issuesCount, onSearch,
    repoFilter, onQuickRepo,
  } = props

  function handleModeChange(next: boolean) {
    if (next) setLanguages(languages.length ? languages : [language])
    else setLanguage(languages[0] || language)
    setMultiMode(next)
  }

  const activeLangLabel = multiMode
    ? languages.length ? languages.join(", ") : "no languages"
    : language

  return (
    <div className="flex h-full flex-col px-5 py-7">
      <div className="mb-8">
        <div className="mb-1.5 flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none" className="shrink-0">
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
          <h1 className="bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-[22px] font-extrabold tracking-tight text-transparent">
            Hunt Issues
          </h1>
        </div>
        <p className="text-[13.5px] leading-relaxed text-neutral-500">
          Real bugs from real repos — matched to your stack
        </p>
        <div className="mt-3.5 flex items-center gap-2">
          <span className="rounded-full border border-neutral-800 bg-white/5 px-2.5 py-1 text-[10.5px] font-semibold text-neutral-400">
            Free plan
          </span>
          <a href="/pricing" className="text-[10.5px] font-semibold text-[#a8ff3e] hover:underline">
            Upgrade →
          </a>
        </div>
      </div>

      <LanguagePicker
        multiMode={multiMode} onModeChange={handleModeChange}
        language={language} setLanguage={setLanguage}
        languages={languages} setLanguages={setLanguages}
      />

      {/* Difficulty */}
      <p className="mb-2.5 mt-6 font-mono text-[10.5px] font-bold uppercase tracking-widest text-neutral-500">Difficulty</p>
      <div className="relative grid grid-cols-3 gap-1 rounded-[10px] border border-neutral-800 bg-neutral-950 p-1">
        <div
          className={cn("absolute inset-y-1 w-[calc(33.333%-2.67px)] rounded-[7px] border transition-transform duration-250 ease-out", DIFF[difficulty].bg, DIFF[difficulty].border)}
          style={{ transform: `translateX(${DIFFICULTIES.indexOf(difficulty) * 100}%)` }}
        />
        {DIFFICULTIES.map((dif) => {
          const active = difficulty === dif
          return (
            <button
              key={dif}
              onClick={() => setDifficulty(dif)}
              className={cn("relative z-10 flex items-center justify-center gap-1.5 rounded-md py-2.5 text-[12.5px] font-semibold capitalize transition-colors active:scale-95", active ? DIFF[dif].text : "text-neutral-500")}
            >
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DIFF[dif].dot)} />
              {dif}
            </button>
          )
        })}
      </div>

      {/* Bounty toggle */}
      <button
        onClick={() => setBountyOnly(!bountyOnly)}
        className={cn(
          "mt-[18px] flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 transition-colors",
          bountyOnly ? "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e]" : "border-neutral-800 bg-neutral-950 text-neutral-500"
        )}
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <span>💰</span> Paid Bounties
        </span>
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded text-[11px] font-extrabold text-black", bountyOnly ? "bg-[#a8ff3e]" : "bg-neutral-800")}>
          {bountyOnly ? "✓" : ""}
        </span>
      </button>

      {/* Active Repos toggle */}
      <button
        onClick={() => setActiveOnly(!activeOnly)}
        className={cn(
          "mt-2 flex w-full items-center justify-between rounded-lg border px-3.5 py-2.5 transition-colors",
          activeOnly ? "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e]" : "border-neutral-800 bg-neutral-950 text-neutral-500"
        )}
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="h-2 w-2 rounded-full bg-[#a8ff3e] shadow-[0_0_6px_#a8ff3e]" /> Active Repos Only
        </span>
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded text-[11px] font-extrabold text-black", activeOnly ? "bg-[#a8ff3e]" : "bg-neutral-800")}>
          {activeOnly ? "✓" : ""}
        </span>
      </button>

      {/* Search */}
      <Button
        onClick={onSearch}
        disabled={loading}
        className={cn(
          "mt-[18px] h-[46px] w-full rounded-[10px] text-base font-bold text-neutral-950 hover:brightness-105 active:scale-[0.98]",
          loading ? "bg-[#a8ff3e]/30 shadow-none" : "bg-[#a8ff3e] shadow-[0_0_28px_rgba(168,255,62,0.22)]"
        )}
      >
        {loading ? (
          <>
            <span className="h-[13px] w-[13px] animate-spin rounded-full border-2 border-black/20 border-t-neutral-950" />
            Searching
          </>
        ) : (
          "Search →"
        )}
      </Button>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />

      {searched && !loading && (
        <div className="mb-5 animate-in fade-in zoom-in-95 rounded-lg border border-neutral-800 bg-neutral-950 p-3.5 duration-300">
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-widest text-neutral-500">Results</p>
          <p className="font-mono text-[28px] font-bold tracking-tight text-[#a8ff3e]">{issuesCount}</p>
          {repoFilter ? (
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono text-[11px] text-neutral-500">{repoFilter} · {difficulty}</p>
              <button onClick={onSearch} className="shrink-0 text-[10.5px] font-semibold text-neutral-500 hover:text-[#a8ff3e] hover:underline">
                clear
              </button>
            </div>
          ) : (
            <p className="truncate text-[11px] text-neutral-500">
              {activeLangLabel} · {difficulty} {bountyOnly && "· 💰 Bounties"} {activeOnly && "· ⚡ Active"}
            </p>
          )}
        </div>
      )}

      {/* Quick repos */}
      <p className="mb-2.5 font-mono text-[10.5px] font-bold uppercase tracking-widest text-neutral-500">Quick repos</p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_REPOS.map((r) => {
          const isActive = repoFilter === r.full
          const isCardLoading = isActive && loading
          return (
            <div
              key={r.full}
              role="button"
              tabIndex={0}
              title={`Hunt issues in ${r.full}`}
              onClick={() => onQuickRepo(r.full)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onQuickRepo(r.full) }
              }}
              className={cn(
                "group relative flex cursor-pointer flex-col gap-2.5 overflow-hidden rounded-xl border border-neutral-800 p-2.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50",
                isActive ? "bg-neutral-900" : "bg-neutral-950"
              )}
              style={{ borderColor: isActive ? `${r.accent}80` : undefined }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = `${r.accent}55` }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "" }}
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 20% 20%, ${r.accent}1a, transparent 70%)` }}
              />
              <div className="relative z-10 flex items-center justify-between">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md text-[10.5px] font-bold"
                  style={{ background: `${r.accent}1f`, color: r.accent }}
                >
                  {r.letter}
                </span>
                {isCardLoading ? (
                  <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-neutral-700 border-t-neutral-300" />
                ) : isActive ? (
                  <CheckMiniIcon className="shrink-0" style={{ color: r.accent }} />
                ) : (
                  <GithubMiniIcon className="text-neutral-700 transition-colors group-hover:text-neutral-500" />
                )}
              </div>
              <div className="relative z-10">
                <p className="text-[12px] font-semibold text-neutral-200">{r.short}</p>
                <p className="truncate font-mono text-[9.5px] text-neutral-600">{r.full}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function Hunt() {
  const { status } = useSession()
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [language, setLanguage] = useState("JavaScript")
  const [languages, setLanguages] = useState<string[]>(["JavaScript"])
  const [multiMode, setMultiMode] = useState(false)
  const [difficulty, setDifficulty] = useState<Difficulty>("easy")
  const [done, setDone] = useState(false)
  const [searched, setSearched] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>("newest")
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [bountyOnly, setBountyOnly] = useState(false)
  const [activeOnly, setActiveOnly] = useState(false)
  const [repoFilter, setRepoFilter] = useState<string | null>(null)
  const repoLanguageCache = useRef<Map<string, string | null>>(new Map())
  const [openProposalId, setOpenProposalId] = useState<number | null>(null)
  const [proposalTexts, setProposalTexts] = useState<Record<number, string>>({})
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false)
      setIssues([])
    }
  }, [status])

  useEffect(() => {
    if (searched) {
      fetchIssues(1, true)
    }
  }, [sortBy])

  function resetForNewFilters() {
    setSearched(false)
    setIssues([])
    setRepoFilter(null)
  }

  function copyRepoLink(id: number, repo: string) {
    navigator.clipboard?.writeText(`https://github.com/${repo}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  async function generateProposal(issue: Issue) {
    if (proposalTexts[issue.id]) {
      setOpenProposalId(openProposalId === issue.id ? null : issue.id)
      return
    }
    setOpenProposalId(issue.id)
    setGeneratingId(issue.id)
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issue.title,
          repo: repoName(issue.repository_url),
          language: multiMode ? languages[0] || language : language,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setProposalTexts((prev) => ({ ...prev, [issue.id]: data.proposal }))
      } else {
        setProposalTexts((prev) => ({
          ...prev,
          [issue.id]: `Hi maintainers! 👋 I'm experienced with ${language} and would love to work on "${issue.title}". Could you please assign this to me? Let me know if there are any specific guidelines to keep in mind!`,
        }))
      }
    } catch {
      setProposalTexts((prev) => ({
        ...prev,
        [issue.id]: `Hi maintainers! 👋 I'm experienced with ${language} and would love to take a crack at fixing this issue. Could you please assign it to me?`,
      }))
    } finally {
      setGeneratingId(null)
    }
  }

  const sortedIssues = useMemo(() => {
    let arr = [...issues]
    if (activeOnly) {
      arr = arr.filter((i) => i.isActiveRepo !== false)
    }

    const sortSlice = (slice: Issue[]) => {
      switch (sortBy) {
        case "least-commented": return slice.sort((a, b) => a.comments - b.comments)
        case "most-commented": return slice.sort((a, b) => b.comments - a.comments)
        case "most-reactions": return slice.sort((a, b) => (b.reactions?.total_count || 0) - (a.reactions?.total_count || 0))
        default: return slice.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    }

    if (multiMode && languages.length > 1 && !repoFilter) {
      const groups: Record<string, Issue[]> = {}
      arr.forEach((issue) => {
        const langKey = (issue.language || "Other").toLowerCase()
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

  async function enrichWithLanguage(items: Issue[]): Promise<Issue[]> {
    const cache = repoLanguageCache.current
    const needLookup = Array.from(new Set(items.filter((i) => !i.language).map((i) => repoName(i.repository_url))))
    const toFetch = needLookup.filter((full) => !cache.has(full))

    if (toFetch.length > 0) {
      await Promise.all(
        toFetch.map(async (full) => {
          try {
            const res = await fetch(`https://api.github.com/repos/${full}`)
            if (!res.ok) { cache.set(full, null); return }
            const data = await res.json()
            cache.set(full, data.language || null)
          } catch {
            cache.set(full, null)
          }
        })
      )
    }

    return items.map((i) => {
      if (i.language) return i
      const lang = cache.get(repoName(i.repository_url))
      return lang ? { ...i, language: lang } : i
    })
  }

  async function fetchIssues(p = 1, reset = false, customLang?: string, customRepo?: string | null) {
    if (reset) setLoading(true)
    else setLoadingMore(true)
    try {
      const repo = customRepo !== undefined ? customRepo : repoFilter
      const params = new URLSearchParams({ 
        difficulty, 
        page: String(p), 
        bounty: String(bountyOnly),
        sort: sortBy
      })
      if (repo) {
        params.set("repo", repo)
      } else {
        const targetLang = customLang || (multiMode ? languages.join(",") : language)
        params.set("language", targetLang.toLowerCase())
      }
      const res = await fetch(`/api/issues?${params.toString()}`)
      const data = await res.json()
      let fetched: Issue[] = (data.items || []).filter((i: Issue) => i.repository_url)
      if (multiMode && !repo) fetched = await enrichWithLanguage(fetched)
      if (reset) { setIssues(fetched); setDone(false) }
      else { setIssues((prev) => [...prev, ...fetched]) }
      if (fetched.length < 10) setDone(true)
      setPage(p)
      setSearched(true)
    } catch { /* silent */ }
    setLoading(false)
    setLoadingMore(false)
  }

  function runSearch() {
    setRepoFilter(null)
    fetchIssues(1, true, undefined, null)
    setMobileFiltersOpen(false)
  }

  function runTemplate(key: string) {
    setMultiMode(false)
    setLanguage(key)
    setLanguages([key])
    setRepoFilter(null)
    fetchIssues(1, true, key, null)
  }

  function runQuickRepo(full: string) {
    setSearched(false)
    setIssues([])
    setRepoFilter(full)
    fetchIssues(1, true, undefined, full)
    setMobileFiltersOpen(false)
  }

  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sortBy)?.label
  const filterProps = {
    language, setLanguage: (v: string) => { setLanguage(v); resetForNewFilters() },
    languages, setLanguages: (v: string[]) => { setLanguages(v); resetForNewFilters() },
    multiMode, setMultiMode,
    difficulty, setDifficulty: (v: Difficulty) => { setDifficulty(v); resetForNewFilters() },
    bountyOnly, setBountyOnly: (v: boolean) => { setBountyOnly(v); resetForNewFilters() },
    activeOnly, setActiveOnly: (v: boolean) => { setActiveOnly(v); resetForNewFilters() },
    loading, searched, issuesCount: sortedIssues.length,
    onSearch: runSearch,
    repoFilter, onQuickRepo: runQuickRepo,
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#090909] font-sans text-neutral-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        .oshunt-footer { display: none !important; }
        .scroll-area::-webkit-scrollbar { width: 3px }
        .scroll-area::-webkit-scrollbar-track { background: transparent }
        .scroll-area::-webkit-scrollbar-thumb { background: rgba(168,255,62,0.2); border-radius: 2px }
        .scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(168,255,62,0.4) }
        @keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        body { font-family: 'Outfit','Inter',sans-serif; }
      `}</style>

      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="scroll-area hidden w-[248px] shrink-0 overflow-y-auto border-r border-neutral-900 bg-gradient-to-b from-neutral-900 to-neutral-950 md:block">
          <FiltersPanel {...filterProps} />
        </aside>

        {/* Main */}
        <main className="scroll-area flex-1 overflow-y-auto overflow-x-hidden">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-neutral-900 bg-neutral-950 px-4 py-2.5 md:h-11 md:flex-nowrap md:py-0 md:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-lg border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-3 py-1.5 text-[13px] font-semibold text-[#a8ff3e] md:hidden">
                    <FilterIcon /> Filters
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-neutral-800 bg-neutral-950 p-0">
                  <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-neutral-700" />
                  <SheetHeader className="px-5 pt-3">
                    <SheetTitle className="flex items-center gap-2 text-left text-sm font-bold text-neutral-100">
                      <FilterIcon /> Filters
                    </SheetTitle>
                  </SheetHeader>
                  <FiltersPanel {...filterProps} />
                </SheetContent>
              </Sheet>

              {searched && !loading ? (
                <>
                  <span className="font-mono text-[12.5px] text-neutral-500">{sortedIssues.length} issues</span>
                  <DifficultyBadge difficulty={difficulty} />
                  <Badge variant="outline" className="rounded-full border-0 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-400">
                    {repoFilter ? repoFilter : multiMode ? `${languages.length || 0} languages` : language}
                  </Badge>
                  {bountyOnly && (
                    <Badge variant="outline" className="rounded-full border-[#a8ff3e]/30 bg-[#a8ff3e]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#a8ff3e]">
                      💰 Bounties
                    </Badge>
                  )}
                  {activeOnly && (
                    <Badge variant="outline" className="rounded-full border-[#a8ff3e]/30 bg-[#a8ff3e]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#a8ff3e]">
                      ⚡ Active Only
                    </Badge>
                  )}
                </>
              ) : loading ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-[#a8ff3e]/20 border-t-[#a8ff3e]" />
                  <span className="font-mono text-[11px] text-neutral-500">searching</span>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <FilterIcon /> pick a filter and search
                </span>
              )}
            </div>

            {searched && !loading && sortedIssues.length > 0 && (
              <div className="flex items-center gap-2">

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-[7px] border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[12.5px] text-neutral-400 outline-none transition-colors hover:border-[#a8ff3e]/30">
                      {currentSortLabel}
                      <ChevronIcon />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[230px] rounded-[10px] border-neutral-800 bg-neutral-950 p-1.5">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => setSortBy(opt.value)} className="rounded-md text-[13px] text-neutral-400 focus:bg-[#a8ff3e]/10 focus:text-[#a8ff3e]">
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="py-2">
              {[1, 2, 3, 4, 5, 6, 7].map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 border-b border-neutral-950 px-4 py-4 sm:gap-4 sm:px-6" style={{ opacity: 1 - i * 0.1 }}>
                  <div className="relative hidden h-2.5 w-[22px] shrink-0 overflow-hidden rounded sm:block bg-neutral-900">
                    <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="relative h-[13px] overflow-hidden rounded bg-neutral-900" style={{ width: `${55 + (i % 3) * 15}%` }}>
                      <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                    </div>
                    <div className="relative h-2.5 w-[30%] overflow-hidden rounded bg-neutral-950">
                      <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
                    </div>
                  </div>
                  <div className="relative h-5 w-[50px] shrink-0 overflow-hidden rounded-full bg-neutral-950">
                    <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state / templates */}
          {!loading && !searched && (
            <div className="relative flex min-h-[calc(100%-1px)] flex-col items-center justify-center overflow-hidden px-4 py-10">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
                  maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
                }}
              />
              <div className="relative z-10 flex w-full max-w-4xl flex-col items-center text-center">
                <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-neutral-100 sm:text-3xl md:text-4xl">
                  What do you want to hunt today?
                </h2>
                <p className="mb-8 max-w-lg text-sm font-light text-neutral-500 sm:text-base md:mb-12">
                  Select a quick-start template or use the filters to find your next open-source contribution.
                </p>
                <div className="grid w-full grid-cols-1 gap-3 pb-2 text-left sm:grid-cols-2 md:gap-6">
                  {TEMPLATES.map((t) => (
                    <div
                      key={t.key}
                      onClick={() => runTemplate(t.key)}
                      className="group relative cursor-pointer overflow-hidden rounded-2xl border p-4 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:translate-y-0 active:scale-[0.98] md:p-8"
                      style={{ borderColor: `${t.accent}26`, background: "#0c0c0c" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = `${t.accent}66`)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${t.accent}26`)}
                    >
                      <div className="absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-100" style={{ background: `linear-gradient(to bottom right, ${t.accent}1a, transparent)` }} />
                      <div className="relative z-10">
                        <div className="mb-4 opacity-80 transition-opacity group-hover:opacity-100" style={{ color: t.accent }}>{t.icon}</div>
                        <h3 className="mb-1 text-sm font-semibold text-neutral-100 transition-colors md:mb-2 md:text-lg">{t.title}</h3>
                        <p className="line-clamp-2 text-xs leading-relaxed text-neutral-500 md:line-clamp-none md:text-sm">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No matches */}
          {!loading && searched && sortedIssues.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
              <FilterIcon className="text-neutral-700" width={20} height={20} />
              <p className="text-sm text-neutral-400">No issues matched those filters.</p>
              <p className="text-xs text-neutral-600">Try a different language, difficulty, or turn off bounty/active-only.</p>
            </div>
          )}

          {/* Issue list */}
          {!loading && sortedIssues.length > 0 && (
            <div className="animate-in fade-in duration-300">
              {sortedIssues.map((issue, i) => {
                const langOpt = multiMode ? findLanguageOption(issue.language) : undefined
                return (
                <div key={issue.id} className="relative">
                  <a
                    href={issue.html_url || "#"}
                    target={issue.isLocked ? "_self" : "_blank"}
                    rel="noopener noreferrer"
                    onClick={(e) => { if (issue.isLocked) e.preventDefault() }}
                    className={cn(
                      "group/row flex flex-wrap items-center gap-x-0 gap-y-2 border-b border-neutral-950 px-4 py-3.5 no-underline transition-colors hover:bg-neutral-900/60 active:bg-neutral-900 sm:flex-nowrap sm:px-6",
                      issue.isLocked ? "pointer-events-none cursor-default opacity-40 blur-[4px]" : "cursor-pointer"
                    )}
                  >
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 bg-[#a8ff3e] transition-transform duration-150 group-hover/row:scale-y-100" />

                    <span className="hidden w-7 shrink-0 pl-1.5 font-mono text-[10.5px] text-neutral-600 sm:block">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div className="min-w-0 flex-1 pr-4">
                      <p className="mb-1 truncate text-[14.5px] font-medium tracking-tight text-neutral-200 transition-colors group-hover/row:text-white">
                        {issue.title}
                      </p>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="m-0 min-w-0 flex-1 truncate font-mono text-[11.5px] text-neutral-500">{repoName(issue.repository_url)}</p>

                        {langOpt && (
                          <span
                            title={langOpt.label}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-1.5 py-[1px] text-[10px] font-medium text-neutral-400"
                          >
                            <langOpt.icon className="h-2.5 w-2.5 shrink-0" style={{ color: langOpt.iconColor }} />
                            {langOpt.label}
                          </span>
                        )}

                        {issue.isActiveRepo === false ? (
                          <span
                            title={issue.repoLastActivityAt ? `No merged PRs since ${formatExactDate(issue.repoLastActivityAt)}` : "Repo Inactive: No merged PRs in 6+ months"}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/[0.08] px-1.5 py-[1px] font-mono text-[9.5px] font-semibold text-rose-400"
                          >
                            <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-rose-500 shadow-[0_0_5px_#ff4d6d]" />
                            {issue.repoLastActivityAt ? `dead ${timeAgo(issue.repoLastActivityAt)}` : "inactive"}
                          </span>
                        ) : (
                          <span
                            title="Repo Active: Maintainers merging code regularly"
                            className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#a8ff3e] shadow-[0_0_6px_#a8ff3e]"
                          />
                        )}
                      </div>
                    </div>

                    <div className="order-3 flex w-full shrink-0 items-center justify-between gap-2.5 sm:order-none sm:w-auto sm:justify-normal">
                      <DifficultyBadge difficulty={difficulty} />
                      <span className="min-w-[48px] text-right font-mono text-[11px] text-neutral-500">{timeAgo(issue.created_at)}</span>
                    </div>

                    <div className="order-4 ml-auto flex shrink-0 items-center gap-2 sm:order-none sm:ml-2.5">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyRepoLink(issue.id, repoName(issue.repository_url)) }}
                        title="Copy repo link"
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10.5px] transition-colors active:scale-90",
                          copiedId === issue.id ? "border-[#a8ff3e]/40 text-[#a8ff3e]" : "border-neutral-800 text-neutral-500 hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
                        )}
                      >
                        {copiedId === issue.id ? <><CheckMiniIcon /> Copied</> : <CopyIcon />}
                      </button>

                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); generateProposal(issue) }}
                        title="Draft claiming proposal with AI"
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-medium transition-colors",
                          openProposalId === issue.id ? "border-[#a8ff3e]/40 text-[#a8ff3e]" : "border-neutral-800 text-neutral-400 hover:border-[#a8ff3e]/25 hover:text-[#a8ff3e]"
                        )}
                      >
                        <AiDraftIcon width={12} height={12} />
                        {generatingId === issue.id ? "Drafting..." : "Proposal"}
                        <span className="rounded-[3px] bg-[#a8ff3e] px-[4px] py-[1px] text-[8px] font-black tracking-wide text-neutral-950">AI</span>
                      </button>

                      <BookmarkButton url={issue.html_url} title={issue.title} repoName={repoName(issue.repository_url)} />
                    </div>
                  </a>

                  {issue.isLocked && (
                    <div className="absolute inset-0 z-[5] flex items-center justify-center border-b border-neutral-950 bg-black/45 backdrop-blur-[4px]">
                      <button
                        onClick={() => alert("Payment gateway coming soon!")}
                        className="rounded-lg bg-[#a8ff3e] px-[18px] py-2 text-[13px] font-bold text-neutral-950 shadow-[0_4px_20px_rgba(168,255,62,0.3)] transition-transform active:scale-95"
                      >
                        🔒 Upgrade to Pro to view Bounty
                      </button>
                    </div>
                  )}

                  {openProposalId === issue.id && !issue.isLocked && (
                    <div className="animate-in fade-in slide-in-from-top-1 border-b border-neutral-900 bg-neutral-950 px-4 py-4 duration-200 sm:pl-14 sm:pr-6">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#a8ff3e]">
                          <AiDraftIcon width={12} height={12} /> AI Claiming Comment Draft
                        </span>
                        <span className="hidden text-[11px] text-neutral-500 sm:inline">Copy and paste directly into GitHub</span>
                      </div>
                      <textarea
                        readOnly
                        value={proposalTexts[issue.id] || "Generating your proposal..."}
                        className="h-[74px] w-full resize-none rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 font-mono text-[13px] leading-snug text-neutral-300 outline-none"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(proposalTexts[issue.id] || "")
                            setCopiedId(issue.id + 99999)
                            setTimeout(() => setCopiedId(null), 1500)
                          }}
                          className="flex items-center gap-1.5 rounded-md border border-[#a8ff3e]/30 bg-[#a8ff3e]/10 px-3.5 py-1.5 text-xs font-semibold text-[#a8ff3e]"
                        >
                          {copiedId === issue.id + 99999 ? <><CheckMiniIcon /> Copied to Clipboard</> : <><CopyIcon /> Copy Markdown</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )
              })}

              {loadingMore && [1, 2].map((_, i) => (
                <div key={i} className="relative h-[72px] overflow-hidden border-b border-neutral-950 bg-neutral-950" style={{ opacity: 1 - i * 0.4 }}>
                  <div className="absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
                </div>
              ))}

              {!loadingMore && !done && (
                <div className="px-4 py-4 sm:px-6">
                  <button
                    onClick={() => fetchIssues(page + 1)}
                    className="w-full rounded-[10px] border border-dashed border-neutral-800 bg-transparent py-3 font-mono text-xs tracking-wide text-neutral-500 transition-colors hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
                  >
                    load more →
                  </button>
                </div>
              )}

              {done && <p className="px-5 py-5 text-center font-mono text-[11px] text-neutral-600">— end of results —</p>}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}