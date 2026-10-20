"use client"

/**
 * Trending page.
 *
 * Uses these shadcn/ui components (add any you're missing; dialog and dropdown-menu are used by the
 * components in components/repo/):
 *   npx shadcn@latest add button badge input separator skeleton dialog dropdown-menu
 *
 * Data flow (debounced search with abort, trending + pagination, bookmarks, sort, detail modal) is the same
 * as before. Beyond styling, five small behaviour changes:
 *   - a slow trending response for the previous Popular/New tab can no longer overwrite the current list
 *   - "Load more" advances the page only once it succeeds; a failed one shows an error and a retry button
 *   - the search box is IME-safe, and ArrowDown reopens the suggestions
 *   - focus returns to the search box when "Clear" / "Back to trending" disappears under a keyboard user
 *   - new: "/" focuses the search box, and a back-to-top button appears after scrolling
 *
 * All effects are CSS + tiny hooks in this file: no new npm dependencies.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject, SVGProps } from "react"
import { createPortal } from "react-dom"
import Navbar from "@/components/ui/Navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { RepoCard } from "@/components/repo/RepoCard"
import { RepoCardSkeleton } from "@/components/repo/RepoCardSkeleton"
import { SortControl } from "@/components/repo/SortControl"
import { FadeInView } from "@/components/motion/FadeInView"
import { useBookmarks } from "@/components/hooks/useBookmarks"
import { sortRepos, type SortKey, type RepoBlurb, type RepoWithBlurb } from "@/components/lib/repo-types"
import { DetailModal } from "@/components/discovery/DetailModal"
import type { Repo as DiscoveryRepo } from "@/components/types/discovery"
import type { GithubRepo } from "@/components/lib/github"

type Mode = "popularity" | "recent"
type TrendingRepo = GithubRepo & { blurb: RepoBlurb | null }

// Mirrors `per_page` in /api/trending — lets us tell a genuinely short last
// page apart from "there might be more" without touching the route.
const PAGE_SIZE = 12
const GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4"

const MODES: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: "popularity", label: "Popular" },
  { value: "recent", label: "New" },
]
const EXAMPLE_QUERIES = ["react", "rust", "llm"]
const SEARCH_INPUT_ID = "trending-search-input"

// The toolbar sticks below your Navbar on md+ screens. This must match the `md:top-16` class on the
// toolbar (4rem = 64px). If your Navbar is taller or shorter, change both.
const STICKY_TOP = 64

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 })

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ")

function isTrendingRepo(r: GithubRepo | TrendingRepo): r is TrendingRepo {
  return "blurb" in r && (r as TrendingRepo).blurb !== undefined
}

function toDiscoveryRepo(repo: GithubRepo): DiscoveryRepo {
  const fullName = repo.fullName ?? repo.full_name ?? "unknown/repo"
  const ownerName = repo.owner && typeof repo.owner === "object" && "login" in repo.owner && typeof repo.owner.login === "string"
    ? repo.owner.login
    : fullName.split("/")[0] ?? "unknown"
  const topics = Array.isArray(repo.topics) ? repo.topics.filter((topic): topic is string => typeof topic === "string") : []
  const htmlUrl = (repo.htmlUrl ?? repo.html_url ?? `https://github.com/${fullName}`).replace(/\.git$/i, "")

  return {
    id: Number(repo.id ?? 0) || 0,
    name: repo.name ?? fullName.split("/").at(-1) ?? "repo",
    fullName,
    owner: ownerName,
    ownerAvatar: typeof repo.owner === "object" && repo.owner && "avatar_url" in repo.owner && typeof repo.owner.avatar_url === "string"
      ? repo.owner.avatar_url
      : typeof repo.owner === "object" && repo.owner && "avatarUrl" in repo.owner && typeof repo.owner.avatarUrl === "string"
        ? repo.owner.avatarUrl
        : null,
    description: repo.description ?? null,
    homepage: null,
    language: repo.language ?? null,
    topics,
    stars: repo.stars ?? repo.stargazers_count ?? 0,
    forks: repo.forks ?? repo.forks_count ?? 0,
    openIssues: repo.openIssues ?? repo.open_issues_count ?? 0,
    watchers: 0,
    license: null,
    updatedAt: repo.pushedAt ?? repo.pushed_at ?? repo.createdAt ?? repo.created_at ?? null,
    createdAt: repo.createdAt ?? repo.created_at ?? null,
    htmlUrl,
    archived: false,
    frameworks: [],
    reliabilityScore: 0,
    trendingScore: 0,
  }
}

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" })
}

// ─── shadcn class overrides ─────────────────────────────────────────────────
// shadcn's own classes include `dark:` variants (and differ a little between versions), and those beat plain
// utilities. So each override below is written in plain AND `dark:` form — the page then looks identical
// whether or not your app sets a `.dark` class, and whichever shadcn version you've installed.
const OUTLINE_BUTTON =
  "cursor-pointer border-white/10 bg-white/[0.03] text-[#d4d4d4] shadow-none hover:border-white/20 hover:bg-white/[0.07] hover:text-white focus-visible:border-[#a8ff3e]/60 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0 active:scale-[0.98] dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.07]"
const GHOST_BUTTON =
  "cursor-pointer text-[#9a9a9a] hover:bg-white/[0.06] hover:text-white focus-visible:border-[#a8ff3e]/60 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0 active:scale-[0.98] dark:hover:bg-white/[0.06]"
const PRIMARY_BUTTON =
  "cursor-pointer bg-[#a8ff3e] text-[#0a1200] shadow-[0_8px_24px_-8px_rgba(168,255,62,0.55)] hover:bg-[#bcff66] hover:text-[#0a1200] focus-visible:ring-[#a8ff3e]/70 focus-visible:ring-offset-0 active:scale-[0.98]"
const DANGER_BUTTON =
  "cursor-pointer border-[#ff4d6d]/30 bg-[#ff4d6d]/[0.06] text-[#ff8fa3] shadow-none hover:border-[#ff4d6d]/50 hover:bg-[#ff4d6d]/[0.12] hover:text-[#ffb3c0] focus-visible:border-[#ff4d6d]/60 focus-visible:ring-[#ff4d6d]/60 focus-visible:ring-offset-0 active:scale-[0.98] dark:border-[#ff4d6d]/30 dark:bg-[#ff4d6d]/[0.06] dark:hover:bg-[#ff4d6d]/[0.12]"
const CHIP =
  "h-7 gap-1.5 rounded-full border-white/10 bg-white/[0.03] px-2.5 py-0 text-[11.5px] font-medium text-[#a3a3a3] sm:px-3 sm:text-[12px] [&>svg]:size-3.5"
const HERO_PILL =
  "h-8 gap-2 rounded-full border-white/10 bg-white/[0.04] px-3.5 py-0 text-[12.5px] font-medium text-[#c8c8c8] shadow-[0_0_0_1px_rgba(168,255,62,0.06),0_8px_30px_-8px_rgba(168,255,62,0.25)] backdrop-blur-md"
const SEARCH_INPUT =
  "h-11 w-full rounded-xl border-white/10 bg-[#0a0a0a]/80 pl-10 text-base text-white shadow-none selection:bg-[#a8ff3e]/30 selection:text-white placeholder:text-[#7d7d7d] hover:border-white/20 focus-visible:border-[#a8ff3e]/60 focus-visible:ring-[3px] focus-visible:ring-[#a8ff3e]/20 focus-visible:ring-offset-0 md:text-base lg:h-10 lg:text-sm dark:bg-[#0a0a0a]/80"

// ─── Icons ──────────────────────────────────────────────────────────────────
// Hand-rolled stroke icons on one 24px grid. Decorative by default (aria-hidden); size them with a `size-*` class.
type IconProps = SVGProps<SVGSVGElement>

function Icon({ className, children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cx("shrink-0", className ?? "size-4")}
      {...props}
    >
      {children}
    </svg>
  )
}
function SearchIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  )
}
function XIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Icon>
  )
}
function FlameIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M8.5 14.5A2.5 2.5 0 0011 17a2.5 2.5 0 002.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 11-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </Icon>
  )
}
function SparklesIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </Icon>
  )
}
function ActivityIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </Icon>
  )
}
function BookmarkIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </Icon>
  )
}
function StarIcon(p: IconProps) {
  return (
    <Icon {...p} fill="currentColor" strokeWidth={1.5}>
      <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
    </Icon>
  )
}
function BookIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
    </Icon>
  )
}
function AlertIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Icon>
  )
}
function RefreshIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </Icon>
  )
}
function ArrowUpIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </Icon>
  )
}
function ChevronDownIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}
function SpinnerIcon({ className, ...p }: IconProps) {
  return (
    <Icon {...p} className={cx("animate-spin", className ?? "size-4")}>
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 00-9-9" />
    </Icon>
  )
}

const HIGHLIGHTS: ReadonlyArray<{ label: string; icon: ReactNode }> = [
  { label: "Live GitHub metadata", icon: <ActivityIcon className="text-[#a8ff3e]" /> },
  { label: "AI-summarized insights", icon: <SparklesIcon className="text-[#a8ff3e]" /> },
  { label: "Bookmarks that stay", icon: <BookmarkIcon className="text-[#a8ff3e]" /> },
]

// ─── Small hooks ────────────────────────────────────────────────────────────
const subscribeToNothing = () => () => {}

// false during SSR/hydration, true afterwards — gates anything that touches `document`.
function useHasMounted() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false)
}

// True once `sentinel` (a 1px marker placed just above the toolbar) has scrolled up past the sticky offset,
// i.e. while the toolbar is stuck. Drives the glass-bar styling.
function useStuck(sentinel: RefObject<HTMLElement | null>, offset: number) {
  const [stuck, setStuck] = useState(false)
  useEffect(() => {
    const el = sentinel.current
    if (!el || typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      entries => {
        const entry = entries[entries.length - 1]
        if (entry) setStuck(!entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? offset))
      },
      { rootMargin: `-${offset + 1}px 0px 0px 0px`, threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sentinel, offset])
  return stuck
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

// ─── Presentational pieces ──────────────────────────────────────────────────
function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[780px] overflow-hidden sm:h-[900px]">
      <div className="tp-grid absolute inset-0" />
      <div className="tp-beam" />
      <div className="tp-aurora tp-aurora-a" />
      <div className="tp-aurora tp-aurora-b" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-[#050505]" />
    </div>
  )
}

function LiveDot() {
  return (
    <span className="relative flex size-2" aria-hidden="true">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#a8ff3e] opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-[#a8ff3e]" />
    </span>
  )
}

function Kbd({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <kbd
      className={cx(
        "inline-flex select-none items-center justify-center rounded border border-white/10 bg-white/[0.05] px-1 font-mono font-medium leading-none text-[#a3a3a3]",
        large ? "h-6 min-w-[1.5rem] text-[11px]" : "h-5 min-w-[1.25rem] text-[10.5px]"
      )}
    >
      {children}
    </kbd>
  )
}

// Segmented Popular / New switch with a sliding highlight. Two toggle buttons (aria-pressed), not tabs:
// the content below is one list whose data changes, not separate panels.
function ModeToggle({ mode, onChange, className }: { mode: Mode; onChange: (m: Mode) => void; className?: string }) {
  const index = Math.max(0, MODES.findIndex(m => m.value === mode))
  return (
    <div
      role="group"
      aria-label="Trending mode"
      className={cx("relative grid h-11 grid-cols-2 items-stretch rounded-xl border border-white/10 bg-black/40 p-0.5 lg:h-10", className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[10px] bg-[#a8ff3e]/[0.12] ring-1 ring-inset ring-[#a8ff3e]/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {MODES.map(({ value, label }) => {
        const active = value === mode
        return (
          <Button
            key={value}
            type="button"
            variant="ghost"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={cx(
              "relative z-10 h-full min-w-0 cursor-pointer gap-1.5 rounded-[10px] px-3 text-[13px] font-medium hover:bg-transparent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]/70 focus-visible:ring-offset-0 dark:hover:bg-transparent [&_svg]:size-3.5",
              active ? "text-[#a8ff3e] hover:text-[#a8ff3e]" : "text-[#9a9a9a] hover:text-white"
            )}
          >
            {value === "popularity" ? <FlameIcon className="size-3.5 max-[359px]:hidden" /> : <SparklesIcon className="size-3.5 max-[359px]:hidden" />}
            {label}
          </Button>
        )
      })}
    </div>
  )
}

// Wraps a card with a cursor-following glow and a lit border (Linear/Vercel-style). The card itself is left
// alone apart from asking its root element to fill the wrapper's height (so grid rows stay even): two
// decorative overlays sit on top, driven by --mx/--my set on pointer move (mouse only — touch devices get
// no hover effect). Radius is `rounded-xl`, matching RepoCard; if you change the card's radius, change it
// here too (the overlays inherit it).
function SpotlightCard({ children }: { children: ReactNode }) {
  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    const el = e.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`)
    el.style.setProperty("--my", `${e.clientY - rect.top}px`)
  }
  return (
    <div onPointerMove={handlePointerMove} className="tp-spot h-full rounded-xl [&>*:first-child]:h-full">
      {children}
      <span aria-hidden="true" className="tp-spot-fx tp-spot-glow" />
      <span aria-hidden="true" className="tp-spot-fx tp-spot-ring" />
    </div>
  )
}

function OwnerAvatar({ url }: { url: string | null }) {
  if (url && /^https:\/\//i.test(url)) {
    return (
      <span
        aria-hidden="true"
        className="size-5 shrink-0 rounded-full bg-[#1a1a1a] bg-cover bg-center ring-1 ring-white/10"
        style={{ backgroundImage: `url("${url.replace(/"/g, "%22")}")` }}
      />
    )
  }
  return (
    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#8a8a8a]">
      <BookIcon className="size-3" />
    </span>
  )
}

function SuggestionList({
  rect,
  suggestions,
  loading,
  query,
  highlightedIndex,
  onHighlight,
  onSelect,
}: {
  rect: { top: number; left: number; width: number }
  suggestions: GithubRepo[]
  loading: boolean
  query: string
  highlightedIndex: number
  onHighlight: (index: number) => void
  onSelect: (repo: GithubRepo) => void
}) {
  return createPortal(
    <div
      style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
      className="tp-pop z-[9999] overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0b] shadow-[0_24px_64px_-12px_rgba(0,0,0,0.75)]"
    >
      {suggestions.length > 0 ? (
        <>
          <div id="trending-search-listbox" role="listbox" aria-label="Repository suggestions" className="max-h-[min(60vh,20rem)] overflow-y-auto p-1.5">
            {suggestions.map((repo, i) => {
              const d = toDiscoveryRepo(repo)
              const optionKey = repo.id ?? repo.full_name ?? repo.fullName ?? i
              return (
                <button
                  key={optionKey}
                  id={`trending-suggestion-${i}`}
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === i}
                  onMouseDown={e => e.preventDefault()}
                  onMouseEnter={() => onHighlight(i)}
                  onClick={() => onSelect(repo)}
                  className={cx(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13.5px] transition-colors",
                    highlightedIndex === i ? "bg-[#a8ff3e]/[0.09] text-white" : "text-[#cfcfcf] hover:bg-white/[0.04]"
                  )}
                >
                  <OwnerAvatar url={d.ownerAvatar} />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-[#8a8a8a]">{d.owner}/</span>
                    <span className="font-medium text-white">{d.name}</span>
                  </span>
                  {d.language ? <span className="hidden shrink-0 text-[12px] text-[#8a8a8a] sm:inline">{d.language}</span> : null}
                  <span className="flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-[#b5b5b5]">
                    <StarIcon className="size-3 text-[#a8ff3e]" />
                    {compactNumber.format(d.stars)}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="hidden items-center gap-4 border-t border-white/[0.06] px-4 py-2 text-[11.5px] text-[#7d7d7d] lg:flex" aria-hidden="true">
            <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> select</span>
            <span className="flex items-center gap-1.5"><Kbd>esc</Kbd> close</span>
          </div>
        </>
      ) : (
        <div role="status" className="flex items-center gap-2.5 px-4 py-3.5 text-[13px] text-[#9a9a9a]">
          {loading ? (
            <>
              <SpinnerIcon className="size-4 text-[#a8ff3e]" /> Searching…
            </>
          ) : (
            <>No public repos match “{query}”</>
          )}
        </div>
      )}
    </div>,
    document.body
  )
}

function StatusLine({
  isSearchMode,
  searching,
  loading,
  count,
  query,
  mode,
  error,
}: {
  isSearchMode: boolean
  searching: boolean
  loading: boolean
  count: number
  query: string
  mode: Mode
  error: boolean
}) {
  let content: ReactNode = null
  if (loading) {
    content = (
      <>
        <Skeleton className="h-4 w-56 max-w-full bg-white/[0.06]" />
        <span className="sr-only">Loading repositories…</span>
      </>
    )
  } else if (isSearchMode && searching) {
    content = (
      <>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#a8ff3e]" />
          <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.2s]" />
          <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.4s]" />
        </span>
        Searching…
      </>
    )
  } else if (isSearchMode) {
    content = (
      <span className="min-w-0 truncate">
        <strong className="font-semibold tabular-nums text-white">{count}</strong> result{count === 1 ? "" : "s"} for{" "}
        <span className="text-white">“{query}”</span>
      </span>
    )
  } else if (count > 0) {
    content = (
      <span>
        Top <strong className="font-semibold tabular-nums text-white">{count}</strong> {mode === "recent" ? "new" : "trending"} repositories
      </span>
    )
  }
  return (
    <div role="status" aria-live="polite" className="flex min-h-[1.5rem] min-w-0 items-center gap-2 text-[13px] text-[#9a9a9a]">
      {error ? null : content}
    </div>
  )
}

function EmptyState({
  query,
  onClear,
  onPick,
}: {
  query: string
  onClear: (viaKeyboard: boolean) => void
  onPick: (q: string, viaKeyboard: boolean) => void
}) {
  return (
    <div role="status" className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/60 px-6 py-16 text-center sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#a8ff3e]/50 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(168,255,62,0.12),transparent)]"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#a8ff3e] shadow-[0_0_32px_-8px_rgba(168,255,62,0.45)]">
          <SearchIcon className="size-5" />
        </div>
        <h2 className="mt-1 text-base font-semibold text-white">No public repos match “{query}”</h2>
        <p className="text-sm leading-relaxed text-[#9a9a9a]">Try a different name or spelling, or clear the search to browse what&rsquo;s trending.</p>
        <Button type="button" onClick={e => onClear(e.detail === 0)} className={cx(PRIMARY_BUTTON, "mt-3 h-10 rounded-xl px-5 text-[13px] font-semibold")}>
          Clear search
        </Button>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[12.5px] text-[#8a8a8a]">
          <span>Or try</span>
          {EXAMPLE_QUERIES.map(q => (
            <Button
              key={q}
              type="button"
              variant="outline"
              onClick={e => onPick(q, e.detail === 0)}
              className={cx(OUTLINE_BUTTON, "h-10 rounded-full px-4 font-mono text-[12px] font-normal sm:h-8 sm:px-3")}
            >
              {q}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="relative overflow-hidden rounded-2xl border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.04] px-6 py-16 text-center sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#ff4d6d]/50 to-transparent" />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-[#ff4d6d]/25 bg-[#ff4d6d]/[0.08] text-[#ff8fa3]">
          <AlertIcon className="size-5" />
        </div>
        <h2 className="mt-1 text-base font-semibold text-[#ff8fa3]">Couldn&rsquo;t load repositories</h2>
        <p className="text-sm leading-relaxed text-[#d29aa5]">{message}</p>
        <Button type="button" variant="outline" onClick={onRetry} className={cx(DANGER_BUTTON, "mt-3 h-10 rounded-xl px-4 text-[13px] font-medium has-[>svg]:px-4")}>
          <RefreshIcon className="size-3.5" /> Try again
        </Button>
      </div>
    </div>
  )
}

function BackToTop({ visible }: { visible: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Back to top"
      onClick={scrollToTop}
      className={cx(
        OUTLINE_BUTTON,
        "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 size-11 rounded-full bg-[#0a0a0a]/80 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 sm:right-6 dark:bg-[#0a0a0a]/80",
        visible ? "translate-y-0 opacity-100" : "invisible translate-y-3 opacity-0"
      )}
    >
      <ArrowUpIcon className="size-4" />
    </Button>
  )
}

const PAGE_CSS = `
.tp-root{--tp-ease:cubic-bezier(.22,1,.36,1)}

/* ── hero backdrop: dot grid + light beam + two slow aurora blobs ── */
.tp-grid{
  background-image:radial-gradient(rgba(255,255,255,.12) 1px,transparent 1.4px);
  background-size:24px 24px;
  -webkit-mask-image:radial-gradient(ellipse 75% 70% at 50% 0%,#000 25%,transparent 75%);
  mask-image:radial-gradient(ellipse 75% 70% at 50% 0%,#000 25%,transparent 75%);
}
.tp-beam{
  position:absolute;left:50%;top:-12%;width:min(1200px,150vw);height:700px;transform:translateX(-50%);
  background:conic-gradient(from 0deg at 50% 0%,transparent 143deg,rgba(168,255,62,.28) 180deg,transparent 217deg);
  -webkit-mask-image:linear-gradient(to bottom,#000,transparent 82%);
  mask-image:linear-gradient(to bottom,#000,transparent 82%);
  filter:blur(28px);opacity:.9;
}
.tp-aurora{--w:min(760px,110vw);position:absolute;width:var(--w);aspect-ratio:1.5;border-radius:9999px;will-change:transform}
.tp-aurora-a{
  left:calc(50% - var(--w) * .92);top:-8%;
  background:radial-gradient(closest-side,rgba(168,255,62,.16),rgba(168,255,62,.05) 55%,transparent);
  animation:tp-drift-a 18s ease-in-out infinite alternate;
}
.tp-aurora-b{
  left:calc(50% - var(--w) * .1);top:6%;
  background:radial-gradient(closest-side,rgba(34,211,170,.12),rgba(34,211,170,.04) 55%,transparent);
  animation:tp-drift-b 22s ease-in-out infinite alternate;
}
@keyframes tp-drift-a{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(60px,24px,0) scale(1.1)}}
@keyframes tp-drift-b{from{transform:translate3d(0,0,0) scale(1.05)}to{transform:translate3d(-70px,36px,0) scale(.95)}}

/* ── headline accent ── */
.tp-gradient-text{
  background-image:linear-gradient(95deg,#d3ff8f 0%,#a8ff3e 38%,#62d600 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  -webkit-box-decoration-break:clone;box-decoration-break:clone;
}

/* ── toolbar ── */
.tp-toolbar{transition:background-color .3s ease,border-color .3s ease,box-shadow .3s ease}
@media (min-width:768px){
  .tp-toolbar[data-stuck=true]{
    background-color:rgba(7,7,7,.82);border-color:rgba(255,255,255,.11);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 22px 44px -20px rgba(0,0,0,.85);
  }
}
@media (min-width:768px){
  .tp-toolbar::before{
    content:'';position:absolute;left:calc(50% - 50vw);width:100vw;bottom:100%;height:64px;
    background:rgba(5,5,5,.94);opacity:0;transition:opacity .3s ease;pointer-events:none;
  }
  .tp-toolbar[data-stuck=true]::before{opacity:1}
}
.tp-rise{animation:tp-rise .65s var(--tp-ease) .12s both}
@keyframes tp-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}

.tp-progress{position:absolute;left:14px;right:14px;bottom:-1px;height:2px;overflow:hidden;border-radius:2px;opacity:0;transition:opacity .25s ease}
.tp-progress[data-active=true]{opacity:1}
.tp-progress::before{
  content:'';position:absolute;top:0;bottom:0;left:0;width:38%;
  background:linear-gradient(90deg,transparent,#a8ff3e,transparent);
  animation:tp-slide 1.15s cubic-bezier(.4,0,.2,1) infinite;
}
@keyframes tp-slide{from{transform:translateX(-110%)}to{transform:translateX(280%)}}

/* ── suggestions panel (rendered in a portal, so no .tp-root variables here) ── */
.tp-pop{animation:tp-pop .16s cubic-bezier(.22,1,.36,1) both;transform-origin:top center}
@keyframes tp-pop{from{opacity:0;transform:translateY(-6px) scale(.98)}to{opacity:1;transform:none}}

/* ── card spotlight: glow + lit border follow the cursor (mouse only) ── */
.tp-spot{--mx:50%;--my:50%;position:relative}
.tp-spot-fx{position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s ease}
.tp-spot-glow{background:radial-gradient(380px circle at var(--mx) var(--my),rgba(168,255,62,.1),transparent 60%)}
.tp-spot-ring{
  padding:1px;
  background:radial-gradient(200px circle at var(--mx) var(--my),rgba(168,255,62,.7),transparent 70%);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  -webkit-mask-composite:xor;
  mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
  mask-composite:exclude;
}
@media (hover:hover) and (pointer:fine){.tp-spot:hover .tp-spot-fx{opacity:1}}
.tp-spot:has(:focus-visible) .tp-spot-ring{opacity:.75}

/* ── skeleton shimmer (used by RepoCardSkeleton) ── */
@keyframes shimmer{100%{transform:translateX(100%)}}

@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;
    transition-duration:.01ms!important;transition-delay:0s!important;
  }
  .tp-aurora{animation:none!important}
}
`

// ─── Page ───────────────────────────────────────────────────────────────────
function TrendingPageContent() {
  // ─── Search ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GithubRepo[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const hasMounted = useHasMounted()
  const searchWrapperRef = useRef<HTMLDivElement>(null)
  const searchAbortRef = useRef<AbortController | null>(null)
  const toolbarSentinelRef = useRef<HTMLDivElement>(null)
  const trendingRequestRef = useRef(0)

  // ─── Trending ──────────────────────────────────────────────────────────
  const [trending, setTrending] = useState<TrendingRepo[]>([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [trendingError, setTrendingError] = useState("")
  const [mode, setMode] = useState<Mode>("popularity")
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  // ─── Sort / filter ─────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("trending")
  const [openRepo, setOpenRepo] = useState<DiscoveryRepo | null>(null)
  const { isSaved, toggle } = useBookmarks()

  const stuck = useStuck(toolbarSentinelRef, STICKY_TOP)
  const showBackToTop = useScrolledPast(720)

  // Debounce the search box — this is what keeps /api/search from firing on
  // every keystroke while still feeling instant. searching flips true here,
  // immediately, rather than waiting for the runSearch effect below to do it —
  // that effect only fires once debouncedQuery has already updated, which left
  // a brief window where debouncedQuery matched query (looking "settled") but
  // searching was still stale-false and searchResults still held the old
  // answer, flashing an incorrect empty/stale state before the real fetch
  // even started.
  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      const id = window.setTimeout(() => setDebouncedQuery(""), 0)
      return () => window.clearTimeout(id)
    }
    const t = window.setTimeout(() => {
      setSearching(true)
      setDebouncedQuery(trimmed)
    }, 300)
    return () => window.clearTimeout(t)
  }, [query])

  const runSearch = useCallback((q: string) => {
    if (!q) {
      setSearchResults(null)
      setSearchError("")
      return
    }
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller
    setSearching(true)
    setSearchError("")

    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      .then(async res => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Search failed.")
        setSearchResults(data.repos ?? [])
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setSearchError(err instanceof Error ? err.message : "Search failed.")
        setSearchResults([])
      })
      .finally(() => {
        // A superseded request finishing — even via abort — shouldn't clear
        // the flag while a newer request (for whatever was typed after it)
        // is still the one actually in flight. Only the request that's still
        // "current" gets to turn searching off.
        if (searchAbortRef.current === controller) {
          setSearching(false)
        }
      })
  }, [])

  const selectSuggestion = useCallback((repo: GithubRepo) => {
    const label = repo.fullName ?? repo.full_name ?? "Repository"
    setQuery(label)
    setSuggestionsOpen(false)
    setHighlightedIndex(-1)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => setHighlightedIndex(-1), 0)
    return () => window.clearTimeout(id)
  }, [searchResults])

  // Re-runs whenever the debounced query changes, and is also called
  // directly by the error state's "Try again" button (below) — that button
  // used to just re-set state to its current value, which React correctly
  // no-ops on, so "retry" did nothing. Calling the fetch function directly
  // actually retries.
  useEffect(() => {
    void Promise.resolve().then(() => runSearch(debouncedQuery))
    return () => searchAbortRef.current?.abort()
  }, [debouncedQuery, runSearch])

  const fetchTrending = useCallback(async (targetMode: Mode, targetPage: number, append: boolean) => {
    // Only the newest request may touch state. Flip Popular → New while the first answer is still in flight
    // and the late response is dropped instead of overwriting the list the toggle now says you're looking at.
    const requestId = ++trendingRequestRef.current
    if (append) {
      setLoadingMore(true)
    } else {
      setLoadingMore(false)
      setTrendingLoading(true)
    }
    setTrendingError("")
    try {
      const res = await fetch(`/api/trending?mode=${targetMode}&page=${targetPage}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load trending repos.")
      if (requestId !== trendingRequestRef.current) return
      const repos: TrendingRepo[] = data.repos ?? []
      // A page shorter than PAGE_SIZE is provably the last one — this skips
      // the extra round trip that would otherwise come back empty just to
      // find that out.
      setHasMore(repos.length >= PAGE_SIZE)
      // Advance the page only once it actually arrived, so retrying a failed "Load more" asks for the same page.
      setPage(targetPage)
      setTrending(prev => (append ? [...prev, ...repos] : repos))
    } catch (err) {
      if (requestId !== trendingRequestRef.current) return
      setTrendingError(err instanceof Error ? err.message : "Failed to load trending repos.")
    } finally {
      if (requestId === trendingRequestRef.current) {
        if (append) setLoadingMore(false)
        else setTrendingLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setPage(1)
      setHasMore(true)
      // Drop the previous mode's list so a failed switch shows the error state, not a stale list under the wrong tab.
      setTrending([])
      fetchTrending(mode, 1, false)
    })
  }, [mode, fetchTrending])

  // "/" jumps to the search box (the same shortcut GitHub uses). Ignored while typing in a field or when the
  // detail modal is open.
  useEffect(() => {
    if (openRepo) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.defaultPrevented || e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (
        t instanceof HTMLElement &&
        (t.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) ||
          t.closest('[role="dialog"],[role="menu"],[role="listbox"],[aria-modal="true"]'))
      ) {
        return
      }
      e.preventDefault()
      document.getElementById(SEARCH_INPUT_ID)?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [openRepo])

  const isSearchMode = debouncedQuery.length > 0

  const displayedRepos = useMemo(() => {
    if (isSearchMode) return sortRepos(searchResults ?? [], sortKey)
    return sortRepos(trending, sortKey)
  }, [isSearchMode, searchResults, trending, sortKey])

  // Quick-pick list for the suggestions dropdown — top few matches from the
  // same search results already powering the grid below.
  const suggestions = useMemo(() => (searchResults ?? []).slice(0, 5), [searchResults])
  const suggestionsLoading = query.trim() !== debouncedQuery || searching
  const showSuggestionsDropdown = suggestionsOpen && query.trim().length > 0

  useEffect(() => {
    if (!showSuggestionsDropdown) return
    const el = searchWrapperRef.current
    if (!el) return
    const updateRect = () => {
      const r = el.getBoundingClientRect()
      const next = { top: r.bottom + 8, left: r.left, width: r.width }
      setDropdownRect(prev =>
        prev && Math.abs(prev.top - next.top) < 0.5 && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.width - next.width) < 0.5
          ? prev
          : next
      )
    }
    const frame = window.requestAnimationFrame(updateRect)
    window.addEventListener("resize", updateRect)
    window.addEventListener("scroll", updateRect, true)
    // The input changes width without any window event when the Popular/New toggle collapses next to it.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateRect)
    observer?.observe(el)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("resize", updateRect)
      window.removeEventListener("scroll", updateRect, true)
      observer?.disconnect()
      // Forget the old position so the next open can't flash it before it's measured.
      setDropdownRect(null)
    }
  }, [showSuggestionsDropdown])

  const handleLoadMore = () => {
    fetchTrending(mode, page + 1, true)
  }

  const focusSearchInput = () => {
    // After the frame, so the input's onFocus sees the cleared query and doesn't reopen the panel.
    window.requestAnimationFrame(() => document.getElementById(SEARCH_INPUT_ID)?.focus())
  }

  // `refocus`: the control that triggered this is about to unmount, so hand focus back to the search box
  // instead of dropping it on <body> (keyboard users would otherwise restart from the top of the page).
  const clearSearch = (refocus = false) => {
    setQuery("")
    setSuggestionsOpen(false)
    setHighlightedIndex(-1)
    if (refocus) focusSearchInput()
  }

  const showSkeletons = isSearchMode
    ? searching && searchResults === null
    : trendingLoading
  const busy = isSearchMode ? searching : trendingLoading || loadingMore
  const dimResults = isSearchMode && searching && searchResults !== null
  const listboxOpen = showSuggestionsDropdown && suggestions.length > 0

  return (
    <div className="tp-root relative isolate min-h-screen overflow-x-clip bg-[#050505] text-[#ededed] antialiased [color-scheme:dark] selection:bg-[#a8ff3e]/25 selection:text-white">
      <Backdrop />
      <Navbar />

      <main className="relative mx-auto w-full max-w-[1400px] px-4 pb-28 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
        {/* Hero */}
        <FadeInView>
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Badge variant="outline" className={HERO_PILL}>
              <LiveDot />
              Trending
            </Badge>
            <h1 className="mt-6 text-[clamp(2.25rem,1.35rem+3.8vw,4.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white [text-wrap:balance]">
              <span className="block">Search any repo.</span>
              <span className="block">
                See what&rsquo;s <span className="tp-gradient-text">actually trending</span>.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#9a9a9a] [text-wrap:pretty] sm:text-base">
              Raw GitHub API results, live search, and sharper AI repo insights — no ranking guesses, no synthetic trending metrics.
            </p>
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-2" aria-label="Highlights">
              {HIGHLIGHTS.map(({ label, icon }) => (
                <li key={label}>
                  <Badge variant="outline" className={CHIP}>
                    {icon}
                    {label}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </FadeInView>

        <section aria-labelledby="trending-results-heading" className="relative mt-12 sm:mt-16">
          {/* Keeps the heading outline h1 → h2 → card titles, and names the region for screen readers. */}
          <h2 id="trending-results-heading" className="sr-only">
            {isSearchMode ? "Search results" : "Trending repositories"}
          </h2>
          <div ref={toolbarSentinelRef} aria-hidden="true" className="h-px" />

          {/* Toolbar — floating glass panel; sticks under the Navbar from md up. Not wrapped in FadeInView on
              purpose: a sticky element can only travel inside its parent, so it has to be a direct child of the
              tall section. It fades in with CSS instead. */}
          <div
            data-stuck={stuck}
            className="tp-toolbar tp-rise relative z-30 rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_14px_40px_-16px_rgba(0,0,0,0.7)] backdrop-blur-xl md:sticky md:top-16"
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div ref={searchWrapperRef} role="search" className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7d7d7d]" aria-hidden="true">
                  {isSearchMode && searching ? <SpinnerIcon className="size-4 text-[#a8ff3e]" /> : <SearchIcon className="size-4" />}
                </span>
                <Input
                  id={SEARCH_INPUT_ID}
                  value={query}
                  onChange={e => {
                    const next = e.target.value
                    setQuery(next)
                    setHighlightedIndex(-1)
                    setSuggestionsOpen(next.trim().length > 0)
                  }}
                  onFocus={() => {
                    if (query.trim()) setSuggestionsOpen(true)
                  }}
                  onBlur={() => {
                    // Delay so a suggestion's onClick still fires before we
                    // close the panel — paired with onMouseDown preventDefault
                    // on each option below, which stops the blur from firing
                    // first in the first place.
                    window.setTimeout(() => {
                      setSuggestionsOpen(false)
                      setHighlightedIndex(-1)
                    }, 120)
                  }}
                  onKeyDown={e => {
                    if (e.nativeEvent.isComposing) return // Enter/arrows belong to the IME while composing
                    if (e.key === "ArrowDown" && !showSuggestionsDropdown && query.trim()) {
                      e.preventDefault()
                      setSuggestionsOpen(true)
                      return
                    }
                    if (showSuggestionsDropdown && suggestions.length > 0) {
                      if (e.key === "ArrowDown") {
                        e.preventDefault()
                        setHighlightedIndex(i => (i + 1) % suggestions.length)
                        return
                      }
                      if (e.key === "ArrowUp") {
                        e.preventDefault()
                        setHighlightedIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1))
                        return
                      }
                      const picked = e.key === "Enter" && highlightedIndex >= 0 ? suggestions[highlightedIndex] : undefined
                      if (picked) {
                        e.preventDefault()
                        selectSuggestion(picked)
                        return
                      }
                    }
                    if (e.key === "Enter") {
                      // Nothing highlighted: the live search is already running — just get the panel out of the way.
                      setSuggestionsOpen(false)
                      setHighlightedIndex(-1)
                      return
                    }
                    if (e.key === "Escape") {
                      // First Escape closes the dropdown; only clears/blurs
                      // once it's already closed, so the two don't fight.
                      if (showSuggestionsDropdown) {
                        setSuggestionsOpen(false)
                        setHighlightedIndex(-1)
                        return
                      }
                      if (query) {
                        setQuery("")
                        e.currentTarget.blur()
                      }
                    }
                  }}
                  placeholder="Search any public repo…"
                  aria-label="Search GitHub repositories"
                  role="combobox"
                  aria-expanded={listboxOpen}
                  aria-controls="trending-search-listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={listboxOpen && highlightedIndex >= 0 ? `trending-suggestion-${highlightedIndex}` : undefined}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="search"
                  className={cx(SEARCH_INPUT, query ? "pr-12" : "lg:pr-12")}
                />
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
                  {query ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => clearSearch(true)}
                      aria-label="Clear search"
                      className={cx(GHOST_BUTTON, "size-10 rounded-lg lg:size-8 [&_svg]:size-3.5")}
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  ) : (
                    <span className="mr-1 hidden lg:inline-flex" aria-hidden="true">
                      <Kbd large>/</Kbd>
                    </span>
                  )}
                </div>

                {showSuggestionsDropdown && hasMounted && dropdownRect && (
                  <SuggestionList
                    rect={dropdownRect}
                    suggestions={suggestions}
                    loading={suggestionsLoading}
                    query={debouncedQuery}
                    highlightedIndex={highlightedIndex}
                    onHighlight={setHighlightedIndex}
                    onSelect={selectSuggestion}
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center gap-y-2 md:flex-nowrap">
                {/* Popular/New only applies to the trending list, so it folds away while a search is active.
                    `invisible` (not unmount) lets it animate and takes it out of the tab order once it's closed. */}
                <div
                  className={cx(
                    "flex min-w-0 flex-1 items-center overflow-hidden transition-[max-width,opacity,margin,visibility] duration-300 ease-out md:flex-none",
                    isSearchMode ? "pointer-events-none invisible mr-0 max-w-0 opacity-0" : "mr-2 max-w-[14rem] opacity-100"
                  )}
                >
                  <ModeToggle mode={mode} onChange={setMode} className="min-w-0 flex-1 md:flex-none" />
                  <Separator orientation="vertical" className="mx-2 hidden bg-white/10 data-[orientation=vertical]:h-5 md:block" />
                </div>
                <SortControl value={sortKey} onChange={setSortKey} className="h-11 lg:h-10" />
              </div>
            </div>
            <span aria-hidden="true" data-active={busy} className="tp-progress" />
          </div>

          {/* Status line */}
          <div className="mt-5 flex min-h-[2rem] items-center justify-between gap-3 px-1">
            <StatusLine
              isSearchMode={isSearchMode}
              searching={searching}
              loading={!isSearchMode && trendingLoading}
              count={isSearchMode ? searchResults?.length ?? 0 : trending.length}
              query={debouncedQuery}
              mode={mode}
              error={isSearchMode && searchError !== ""}
            />
            {isSearchMode && (
              <Button type="button" variant="ghost" size="sm" onClick={e => clearSearch(e.detail === 0)} className={cx(GHOST_BUTTON, "h-10 shrink-0 rounded-lg px-3 text-[13px] sm:h-8")}>
                Back to trending
              </Button>
            )}
          </div>

          {/* Content */}
          <div className={cx("mt-4 transition-opacity duration-200", dimResults && "opacity-60")} aria-busy={busy}>
            {showSkeletons ? (
              <div className={GRID_CLASSES}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <RepoCardSkeleton key={i} />
                ))}
              </div>
            ) : isSearchMode && !searching && (searchResults?.length ?? 0) === 0 && !searchError ? (
              <EmptyState
                query={debouncedQuery}
                onClear={clearSearch}
                onPick={(q, viaKeyboard) => {
                  setQuery(q)
                  if (viaKeyboard) focusSearchInput()
                }}
              />
            ) : isSearchMode && searchError ? (
              <ErrorState message={searchError} onRetry={() => runSearch(debouncedQuery)} />
            ) : !isSearchMode && trendingError && trending.length === 0 ? (
              <ErrorState message={trendingError} onRetry={() => fetchTrending(mode, 1, false)} />
            ) : (
              <>
                <div className={GRID_CLASSES}>
                  {displayedRepos.map((repo, i) => {
                    // Unique key: repo identity plus index, in case the same
                    // repo can ever appear twice across a paginated fetch.
                    const baseKey = repo.id ?? repo.full_name ?? repo.fullName ?? `repo-${i}`
                    const uniqueKey = `${baseKey}-${i}`

                    return (
                      <FadeInView key={uniqueKey} delay={Math.min(i % PAGE_SIZE, 8) * 50} className="h-full">
                        <SpotlightCard>
                          <RepoCard
                            repo={repo}
                            initialBlurb={isTrendingRepo(repo) ? repo.blurb : undefined}
                            bookmarked={isSaved("repo", repo)}
                            onToggleBookmark={(item: RepoWithBlurb) => toggle("repo", item)}
                            onOpen={setOpenRepo}
                          />
                        </SpotlightCard>
                      </FadeInView>
                    )
                  })}
                  {loadingMore &&
                    Array.from({ length: 4 }).map((_, i) => <RepoCardSkeleton key={`more-${i}`} />)}
                </div>

                {!isSearchMode && trending.length > 0 && (
                  <div className="mt-12 flex flex-col items-center gap-4">
                    {hasMore ? (
                      <>
                        {trendingError ? (
                          <p role="alert" className="max-w-md text-center text-[13px] text-[#ff8fa3]">
                            {trendingError}
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          aria-busy={loadingMore}
                          className={cx(OUTLINE_BUTTON, "h-11 min-w-[11rem] rounded-xl px-6 text-[14px] font-medium has-[>svg]:px-6")}
                        >
                          {loadingMore ? (
                            <SpinnerIcon className="size-4" />
                          ) : trendingError ? (
                            <RefreshIcon className="size-4" />
                          ) : (
                            <ChevronDownIcon className="size-4" />
                          )}
                          {loadingMore ? "Loading more…" : trendingError ? "Try again" : "Load more"}
                        </Button>
                        <p className="text-xs tabular-nums text-[#7d7d7d]">Showing {trending.length} repositories</p>
                      </>
                    ) : (
                      <div className="flex w-full items-center gap-4 text-center text-[12.5px] text-[#8a8a8a]">
                        <span aria-hidden="true" className="hidden h-px flex-1 bg-gradient-to-r from-transparent to-white/10 sm:block" />
                        <p className="mx-auto sm:mx-0">You&rsquo;ve reached the end of what&rsquo;s trending right now.</p>
                        <span aria-hidden="true" className="hidden h-px flex-1 bg-gradient-to-l from-transparent to-white/10 sm:block" />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <BackToTop visible={showBackToTop} />

      {openRepo ? <DetailModal repo={openRepo} onClose={() => setOpenRepo(null)} /> : null}

      {/* Page-local CSS: backdrop, card spotlight, sticky-toolbar glass, progress bar and keyframes.
          Injected raw (not as React text) so selectors like `>` and quotes survive server rendering. The
          `shimmer` keyframe is also what RepoCardSkeleton relies on. */}
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
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