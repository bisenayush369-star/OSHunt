"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Navbar from "@/components/ui/Navbar"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { RepoCard } from "@/components/repo/RepoCard"
import { RepoCardSkeleton } from "@/components/repo/RepoCardSkeleton"
import { SortControl } from "@/components/repo/SortControl"
import { FadeInView } from "@/components/motion/FadeInView"
import { sortRepos, type SortKey, type RepoBlurb, type RepoWithBlurb } from "@/lib/repo-types"
import type { GithubRepo } from "@/lib/github"

type Mode = "popularity" | "recent"
type TrendingRepo = GithubRepo & { blurb: RepoBlurb | null }

type SavedBookmark = {
  url: string
  title: string
  repoName: string
  type: "issue" | "repo"
}

// Mirrors `per_page` in /api/trending — lets us tell a genuinely short last
// page apart from "there might be more" without touching the route.
const PAGE_SIZE = 12
const GRID_CLASSES = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"

function isTrendingRepo(r: GithubRepo | TrendingRepo): r is TrendingRepo {
  return "blurb" in r && (r as TrendingRepo).blurb !== undefined
}

// ─── Local icons (matches the hand-rolled stroke-icon style used elsewhere) ─
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const FlameIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.5 14.5A2.5 2.5 0 0011 17a2.5 2.5 0 002.5-2.5c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7.5 7.5 0 11-15 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
  </svg>
)
const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
  </svg>
)
const SpinnerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
    <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

function TrendingPageContent() {
  // ─── Search ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [searchResults, setSearchResults] = useState<GithubRepo[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")
  const searchAbortRef = useRef<AbortController | null>(null)

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
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>([])

  const getRepoLink = (repo: GithubRepo | TrendingRepo) => `https://github.com/${repo.fullName ?? repo.full_name ?? ""}`
  const isBookmarked = useCallback(
    (repo: GithubRepo | TrendingRepo) => bookmarks.some(bookmark => bookmark.type === "repo" && bookmark.url === getRepoLink(repo)),
    [bookmarks]
  )

  const toggleBookmark = useCallback(
    async (repo: RepoWithBlurb) => {
      const fullName = repo.fullName ?? repo.full_name ?? ""
      const url = `https://github.com/${fullName}`
      const nextBookmarked = !isBookmarked(repo)

      try {
        const res = await fetch("/api/bookmark", {
          method: nextBookmarked ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            title: fullName,
            repoName: fullName,
            type: "repo",
          }),
        })

        if (!res.ok) {
          throw new Error("Bookmark request failed")
        }

        setBookmarks(prev => {
          if (nextBookmarked) {
            return [...prev.filter(bookmark => bookmark.url !== url), { url, title: fullName, repoName: fullName, type: "repo" }]
          }
          return prev.filter(bookmark => bookmark.url !== url)
        })
      } catch {
        // Keep UI consistent if the save fails; no local fallback.
      }
    },
    [isBookmarked]
  )

  useEffect(() => {
    let mounted = true

    fetch("/api/bookmark")
      .then(async res => {
        if (!res.ok) {
          if (res.status === 401) return []
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "Failed to load bookmarks.")
        }
        return res.json()
      })
      .then((data: SavedBookmark[]) => {
        if (!mounted) return
        setBookmarks(Array.isArray(data) ? data.filter(bookmark => bookmark.type === "repo") : [])
      })
      .catch(() => {
        if (!mounted) return
        setBookmarks([])
      })

    return () => {
      mounted = false
    }
  }, [])

  // Debounce the search box — this is what keeps /api/search from firing on
  // every keystroke while still feeling instant.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300)
    return () => clearTimeout(t)
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
      .finally(() => setSearching(false))
  }, [])

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
    if (append) setLoadingMore(true)
    else setTrendingLoading(true)
    setTrendingError("")
    try {
      const res = await fetch(`/api/trending?mode=${targetMode}&page=${targetPage}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load trending repos.")
      const repos: TrendingRepo[] = data.repos ?? []
      // A page shorter than PAGE_SIZE is provably the last one — this skips
      // the extra round trip that would otherwise come back empty just to
      // find that out.
      setHasMore(repos.length >= PAGE_SIZE)
      setTrending(prev => (append ? [...prev, ...repos] : repos))
    } catch (err) {
      setTrendingError(err instanceof Error ? err.message : "Failed to load trending repos.")
    } finally {
      if (append) setLoadingMore(false)
      else setTrendingLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => {
      setPage(1)
      setHasMore(true)
      fetchTrending(mode, 1, false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const isSearchMode = debouncedQuery.length > 0

  const displayedRepos = useMemo(() => {
    if (isSearchMode) return sortRepos(searchResults ?? [], sortKey)
    return sortRepos(trending, sortKey)
  }, [isSearchMode, searchResults, trending, sortKey])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchTrending(mode, next, true)
  }

  const showSkeletons = isSearchMode
    ? searching && searchResults === null
    : trendingLoading

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      {/* Ambient glow, same treatment as the rest of the app */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[420px] w-[420px] rounded-full bg-[#a8ff3e]/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute top-96 right-0 h-[380px] w-[380px] rounded-full bg-[#a8ff3e]/[0.04] blur-[120px]" />

      <Navbar />

      <main className="relative mx-auto max-w-[1400px] px-4 pb-24 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        {/* Hero */}
        <FadeInView>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em]">
            <span className="text-[#666]">GitLense</span>
            <span className="h-3 w-px bg-[#2a2a2a]" aria-hidden="true" />
            <span className="flex items-center gap-1.5 text-[#a8ff3e]/90">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a8ff3e] opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a8ff3e]" />
              </span>
              Trending
            </span>
          </div>
          <h1 className="max-w-2xl text-[32px] font-bold leading-[1.15] tracking-tight sm:text-[40px]">
            Search any repo. See what&apos;s{" "}
            <span className="bg-gradient-to-r from-[#a8ff3e] to-[#6fe000] bg-clip-text text-transparent">
              actually trending
            </span>
            .
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#888]">
            Raw GitHub API results, live search, and sharper AI repo insights — no ranking guesses, no synthetic trending metrics.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[#666]">
            {["Live GitHub metadata", "AI-summarized insights", "Bookmarks that stay"].map(chip => (
              <span key={chip} className="rounded-full border border-[#1a1a1a] bg-[#0a0a0a] px-2.5 py-1">
                {chip}
              </span>
            ))}
          </div>
        </FadeInView>

        {/* Toolbar */}
        <FadeInView delay={80} className="mt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" aria-hidden="true">
                <SearchIcon />
              </span>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape" && query) {
                    setQuery("")
                    e.currentTarget.blur()
                  }
                }}
                placeholder="Search any public repo…"
                aria-label="Search GitHub repositories"
                className="h-10 w-full rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] pl-9 pr-9 text-base text-white placeholder:text-[#555] transition-colors focus:border-[#a8ff3e]/50 focus:outline-none focus:ring-2 focus:ring-[#a8ff3e]/20 sm:text-[13.5px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded text-[#666] transition-colors hover:text-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/40"
                >
                  <XIcon />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!isSearchMode && (
                <div className="flex items-center rounded-lg border border-[#1a1a1a] bg-[#050505] p-0.5 text-[12px]">
                  {(["popularity", "recent"] as Mode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      aria-pressed={mode === m}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/40 ${
                        mode === m ? "bg-[#a8ff3e]/10 text-[#a8ff3e]" : "text-[#888] hover:text-[#ccc]"
                      }`}
                    >
                      {m === "popularity" ? <FlameIcon /> : <SparkleIcon />}
                      {m === "popularity" ? "Popular" : "New"}
                    </button>
                  ))}
                </div>
              )}

              <SortControl value={sortKey} onChange={setSortKey} />
            </div>
          </div>

          {/* Status line */}
          <div className="mt-4 flex items-center gap-2 text-[12px] text-[#666]">
            {searching && isSearchMode && (
              <span className="flex items-center gap-1">
                <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#a8ff3e]" />
                <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.2s]" />
                <span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.4s]" />
              </span>
            )}
            {isSearchMode
              ? searching
                ? "Searching…"
                : `${searchResults?.length ?? 0} result${(searchResults?.length ?? 0) === 1 ? "" : "s"} for “${debouncedQuery}”`
              : `Top ${trending.length} ${mode === "recent" ? "new" : "trending"} repositories`}
          </div>
        </FadeInView>

        {/* Content */}
        <div className="mt-6">
          {showSkeletons ? (
            <div className={GRID_CLASSES}>
              {Array.from({ length: 6 }).map((_, i) => (
                <RepoCardSkeleton key={i} />
              ))}
            </div>
          ) : isSearchMode && !searching && (searchResults?.length ?? 0) === 0 && !searchError ? (
            <EmptyState
              icon={<SearchIcon />}
              title={`No public repos match "${debouncedQuery}"`}
              body="Try a different name or spelling, or clear the search to browse what's trending."
              action={{ label: "Clear search", onClick: () => setQuery("") }}
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
                    <FadeInView key={uniqueKey} delay={Math.min(i % PAGE_SIZE, 8) * 50}>
                      <RepoCard
                        repo={repo}
                        initialBlurb={isTrendingRepo(repo) ? repo.blurb : undefined}
                        bookmarked={isBookmarked(repo)}
                        onToggleBookmark={toggleBookmark}
                      />
                    </FadeInView>
                  )
                })}
                {loadingMore &&
                  Array.from({ length: 4 }).map((_, i) => <RepoCardSkeleton key={`more-${i}`} />)}
              </div>

              {!isSearchMode && trending.length > 0 && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      aria-busy={loadingMore}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-5 py-2.5 text-[13px] font-medium text-[#ccc] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-60"
                    >
                      {loadingMore && <SpinnerIcon />}
                      {loadingMore ? "Loading more…" : "Load more"}
                    </button>
                  ) : (
                    <p className="text-[12px] text-[#555]">You&apos;ve reached the end of what&apos;s trending right now.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Shared shimmer keyframe for RepoCardSkeleton — same self-contained
          pattern the Analyze page uses for its own loading state. */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#1a1a1a] px-6 py-16 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#0a0a0a] text-[#a8ff3e]/70"
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="text-[14px] font-semibold text-white">{title}</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-[#888]">{body}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-1 cursor-pointer rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-2 text-[12.5px] font-medium text-[#a8ff3e] transition-colors hover:border-[#a8ff3e]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/40"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.04] px-6 py-16 text-center">
      <p className="text-[14px] font-semibold text-[#ff8fa3]">Couldn&apos;t load repositories</p>
      <p className="max-w-sm text-[13px] leading-relaxed text-[#c98a94]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#ff4d6d]/25 bg-transparent px-4 py-2 text-[12.5px] font-medium text-[#ff8fa3] transition-colors hover:bg-[#ff4d6d]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d6d]/40"
      >
        <RefreshIcon /> Try again
      </button>
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