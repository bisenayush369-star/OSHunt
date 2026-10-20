"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyButton } from "./CopyButton"
import { BookmarkButton } from "./BookmarkButton"
import { RepoQnA } from "./RepoQnA"
import { RepoBlurbView } from "./RepoBlurbView"
import type { GithubRepo } from "@/components/lib/github"
import { computeReliabilityScore, detectFrameworks } from "@/components/lib/discovery/ranking"
import { TECHNOLOGIES } from "@/components/lib/technology-options"
import { scoreLabel, type Repo as DiscoveryRepo } from "@/components/types/discovery"
import { repoUrl, repoCloneCommand, type BlurbState, type RepoBlurb, type RepoWithBlurb } from "@/components/lib/repo-types"
import { ACCENT, CARD_BG, ClockIcon, ExternalLinkIcon, ForkIcon, StarIcon, blend, cx, hexToRgb, readableOn, toHex } from "./repo-ui"

// ─── data ────────────────────────────────────────────────────────────────────────────────────────────
// Repos reach this card in two shapes (GitHub's snake_case API objects and our camelCase ones), so
// everything is read through here once and the rest of the file only sees clean values.
function normalizeRepo(repo: Record<string, unknown> | GithubRepo): GithubRepo & {
  fullName: string
  stars: number
  forks: number
  openIssues: number
  createdAt: string
  pushedAt: string
  language: string
  topics: string[]
  owner: { login: string; avatar_url: string }
} {
  const raw = repo as Record<string, unknown>
  const owner = typeof raw.owner === "object" && raw.owner !== null ? (raw.owner as Record<string, unknown>) : {}

  const toString = (value: unknown) => (typeof value === "string" ? value : "")
  const toNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0)
  const toTopics = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [])

  const fullNameRaw = toString(raw.fullName) || toString(raw.full_name)
  const normalizedOwner = {
    login: toString(owner.login) || fullNameRaw.split("/")[0] || "",
    avatar_url: toString(owner.avatar_url) || toString(owner.avatarUrl) || "",
  }

  return {
    ...repo,
    fullName: fullNameRaw || `${normalizedOwner.login}/${toString(raw.name)}`,
    stars: toNumber(raw.stars) || toNumber(raw.stargazers_count),
    forks: toNumber(raw.forks) || toNumber(raw.forks_count),
    openIssues: toNumber(raw.openIssues) || toNumber(raw.open_issues_count),
    createdAt: toString(raw.createdAt) || toString(raw.created_at),
    pushedAt: toString(raw.pushedAt) || toString(raw.pushed_at),
    language: toString(raw.language),
    topics: toTopics(raw.topics),
    owner: normalizedOwner,
  }
}

const COUNT = new Intl.NumberFormat("en", { notation: "compact" })
// 999 → "999", 1234 → "1.2k", 12345 → "12k", 1234567 → "1.2M"
function formatCount(n: number): string {
  return COUNT.format(Math.max(0, n)).replace(/K$/, "k")
}

// "today" / "5d ago" / "3mo ago" / "2y ago"; null when the date is missing or unparseable
// (the old version printed "NaNy ago").
function timeAgo(iso: string, now: number): string | null {
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return null
  const days = Math.floor(Math.max(0, now - then) / 86_400_000)
  if (days < 1) return "today"
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

type TechOption = (typeof TECHNOLOGIES)[number]
const languageCache = new Map<string, TechOption | null>()

function resolveLanguageOption(language?: string): TechOption | null {
  const raw = (language ?? "").trim()
  if (!raw) return null
  const normalized = raw.toLowerCase()
  const cached = languageCache.get(normalized)
  if (cached !== undefined) return cached

  const exact = TECHNOLOGIES.find(option => {
    const matchesValue = option.value.toLowerCase() === normalized
    const matchesLabel = option.label.toLowerCase() === normalized
    const matchesAlias = option.aliases?.some(alias => alias.toLowerCase() === normalized)
    return matchesValue || matchesLabel || matchesAlias
  })
  // The fuzzy fallback is only for longer names ("Jupyter" → "Jupyter Notebook"). With one or two letters
  // ("C", "R", "Go") it used to guess — "C" could land on "C++" or "Clojure" — so those must match exactly.
  const fuzzy =
    exact ??
    (normalized.length >= 3
      ? TECHNOLOGIES.find(option => {
          const matchesValue = option.value.toLowerCase().includes(normalized)
          const matchesLabel = option.label.toLowerCase().includes(normalized)
          const matchesAlias = option.aliases?.some(alias => alias.toLowerCase().includes(normalized))
          return matchesValue || matchesLabel || matchesAlias
        })
      : undefined)
  const result = fuzzy ?? null
  languageCache.set(normalized, result)
  return result
}

// ─── small pieces ────────────────────────────────────────────────────────────────────────────────────
function RepoAvatar({ src, fallback }: { src: string; fallback: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.05] ring-1 ring-white/10">
      {src && !failed ? (
        <Image
          src={src}
          // decorative: the owner's name is printed right next to it
          alt=""
          width={40}
          height={40}
          sizes="40px"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="text-[13px] font-semibold uppercase text-[#9a9a9a]">
          {fallback.slice(0, 2) || "GH"}
        </span>
      )}
    </span>
  )
}

function tierColor(score: number): string {
  if (score >= 85) return ACCENT
  if (score >= 70) return "#e3e84a"
  if (score >= 50) return "#ffb454"
  return "#ff7a7a"
}

// Reliability score: a mini progress ring + the number, tinted by tier. The label (Excellent, Great, …)
// lives in the accessible name and tooltip so the pill stays compact.
function ScoreBadge({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, Math.round(score)))
  const color = tierColor(value)
  const circumference = 2 * Math.PI * 8
  const label = `Reliability score ${value} out of 100 (${scoreLabel(value)})`
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-2 text-xs font-semibold tabular-nums"
      style={{ color, borderColor: `${color}40`, backgroundColor: `${color}14` }}
    >
      <svg viewBox="0 0 20 20" className="size-[18px] -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
        />
      </svg>
      {value}
    </span>
  )
}

function LanguageChip({ language }: { language: string }) {
  const option = resolveLanguageOption(language)
  const label = option?.label ?? (language || "Unknown")
  const LanguageIcon = option?.icon
  const base = toHex(option?.iconColor) ?? ACCENT
  // The chip is tinted with its own colour (12% alpha), so legibility is judged against that tinted fill
  // rather than against the bare card.
  const fillAlpha = 0x1f / 255
  const text = readableOn(base, blend(CARD_BG, hexToRgb(base), fillAlpha))
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-2 pr-2.5 text-xs font-semibold"
      style={{ color: text, borderColor: `${text}40`, backgroundColor: `${base}1f` }}
    >
      {LanguageIcon ? <LanguageIcon className="size-3.5 shrink-0" style={{ color: text }} /> : null}
      <span className="truncate">{label}</span>
    </span>
  )
}

// ─── card ────────────────────────────────────────────────────────────────────────────────────────────
// How the card is wired (this is what fixes the old "click anywhere" bugs):
//  • The repo name is a real <button>, and its ::after stretches over the whole card, so a click anywhere
//    that isn't another control opens the details. No root onClick / onKeyDown / role="button" — typing a
//    space in the Ask-AI box no longer bubbles up and opens the modal, and nothing is a button inside a
//    button.
//  • Every other control (bookmark, copy, ask, link) is `relative z-10`, i.e. above that overlay.
//  • `isolate` keeps those z-indexes inside the card so they can't poke through the sticky toolbar.
export function RepoCard({
  repo,
  initialBlurb,
  bookmarked,
  onToggleBookmark,
  onOpen,
}: {
  repo: GithubRepo
  /** Pass the blurb object for eager (trending) cards, `null` if an eager
   * generation already failed, or leave undefined for search results where
   * nothing has been generated yet. */
  initialBlurb?: RepoBlurb | null
  bookmarked: boolean
  onToggleBookmark: (repo: RepoWithBlurb) => void
  onOpen?: (repo: DiscoveryRepo) => void
}) {
  const normalizedRepo = useMemo(() => normalizeRepo(repo), [repo])
  // Captured once per card so relative times are stable between renders (and render stays pure).
  const [now] = useState(() => Date.now())

  const [blurbState, setBlurbState] = useState<BlurbState>(
    initialBlurb ? { status: "ready", blurb: initialBlurb } : initialBlurb === null ? { status: "error", message: "" } : { status: "idle" },
  )

  // Not aborted if the card goes away mid-request (sort/mode change): the server has already started — and
  // will count — the AI call, and the dashboard's "usage:updated" refresh below still has to happen when it
  // finishes. The state updates after unmount are simply ignored.
  const fetchBlurb = async () => {
    setBlurbState({ status: "loading" })
    try {
      const res = await fetch("/api/repo-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: normalizedRepo.fullName,
          rawDescription: normalizedRepo.description?.trim() || "No description provided.",
          language: normalizedRepo.language,
          stars: normalizedRepo.stars,
          forks: normalizedRepo.forks,
          openIssues: normalizedRepo.openIssues,
          createdAt: normalizedRepo.createdAt,
          pushedAt: normalizedRepo.pushedAt,
          topics: normalizedRepo.topics,
        }),
      })
      const parsed = await res.json().catch(() => null)
      const data: { error?: unknown; blurb?: RepoBlurb | null } = parsed && typeof parsed === "object" ? parsed : {}
      if (!res.ok) throw new Error(typeof data.error === "string" && data.error ? data.error : "Failed to generate a summary.")
      if (!data.blurb) throw new Error("The response didn't include a summary.")
      setBlurbState({ status: "ready", blurb: data.blurb })
      try {
        window.dispatchEvent(new CustomEvent("usage:updated"))
      } catch {
        /* ignore */
      }
    } catch (err) {
      setBlurbState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." })
    }
  }

  const url = repoUrl(normalizedRepo.fullName)
  const currentBlurb = blurbState.status === "ready" ? blurbState.blurb : (initialBlurb ?? undefined)
  const login = normalizedRepo.owner?.login || normalizedRepo.fullName.split("/")[0] || ""
  const repoName = normalizedRepo.name || normalizedRepo.fullName.split("/")[1] || normalizedRepo.fullName || "Unknown repository"
  const avatarUrl = normalizedRepo.owner?.avatar_url || normalizedRepo.owner?.avatarUrl || ""

  // One DiscoveryRepo, built once per repo: it feeds both the score shown on the card and what onOpen hands
  // to the details modal (the old code built it twice).
  const discoveryRepo = useMemo<DiscoveryRepo>(() => {
    const draft: DiscoveryRepo = {
      id: Number(normalizedRepo.id ?? 0) || 0,
      name: normalizedRepo.name ?? normalizedRepo.fullName.split("/").at(-1) ?? "repo",
      fullName: normalizedRepo.fullName,
      owner: normalizedRepo.owner?.login ?? normalizedRepo.fullName.split("/")[0] ?? "unknown",
      ownerAvatar: normalizedRepo.owner?.avatar_url ?? normalizedRepo.owner?.avatarUrl ?? null,
      description: normalizedRepo.description ?? null,
      homepage: null,
      language: normalizedRepo.language ?? null,
      topics: normalizedRepo.topics ?? [],
      stars: normalizedRepo.stars ?? 0,
      forks: normalizedRepo.forks ?? 0,
      openIssues: normalizedRepo.openIssues ?? 0,
      watchers: 0,
      license: null,
      updatedAt: normalizedRepo.pushedAt ?? normalizedRepo.createdAt ?? null,
      createdAt: normalizedRepo.createdAt ?? null,
      htmlUrl: repoUrl(normalizedRepo.fullName),
      archived: false,
      frameworks: detectFrameworks(normalizedRepo.topics ?? []),
      reliabilityScore: 0,
      trendingScore: 0,
    }
    return { ...draft, reliabilityScore: computeReliabilityScore(draft) }
  }, [normalizedRepo])

  const handleOpen = () => onOpen?.(discoveryRepo)

  const updated = timeAgo(normalizedRepo.pushedAt, now)
  const topics = normalizedRepo.topics
  const extraTopics = Math.max(0, topics.length - 3)
  const title = `${login ? `${login}/` : ""}${repoName}`

  return (
    <article
      className={cx(
        "group/card relative isolate flex h-full min-w-0 flex-col gap-4 rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-4 sm:p-5",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-colors duration-200 hover:border-white/[0.14] hover:bg-[#0c0c0c] motion-reduce:transition-none",
      )}
    >
      {/* header: avatar · name / owner · bookmark */}
      <div className="flex items-start gap-3">
        <RepoAvatar key={avatarUrl} src={avatarUrl} fallback={login || repoName} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-5 text-white">
            <button
              type="button"
              onClick={handleOpen}
              aria-haspopup={onOpen ? "dialog" : undefined}
              title={title}
              className={cx(
                // two lines before it's cut off: repo names are the one thing people need to read in full
                "line-clamp-2 w-full cursor-pointer text-left outline-none transition-colors [overflow-wrap:anywhere] group-hover/card:text-[#a8ff3e] motion-reduce:transition-none",
                // stretched hit area: covers the whole card (its nearest positioned ancestor)
                "after:absolute after:inset-0 after:rounded-xl after:content-['']",
                "focus-visible:after:ring-2 focus-visible:after:ring-[#a8ff3e]/70",
              )}
            >
              {/* full "owner/name" for screen readers, only the name on screen */}
              {login ? <span className="sr-only">{login}/</span> : null}
              {repoName}
            </button>
          </h3>
          {login ? <p className="truncate text-[12.5px] leading-5 text-[#8a8a8a]">{login}</p> : null}
        </div>
        <BookmarkButton repo={{ ...normalizedRepo, blurb: currentBlurb }} bookmarked={bookmarked} onToggle={onToggleBookmark} />
      </div>

      {/* description + topics */}
      <div className="flex flex-col gap-3">
        <p className={cx("line-clamp-3 text-[14px] leading-6 [overflow-wrap:anywhere]", normalizedRepo.description ? "text-[#a3a3a3]" : "italic text-[#8a8a8a]")}>
          {normalizedRepo.description?.trim() || "No description provided."}
        </p>
        {topics.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
            {topics.slice(0, 3).map(topic => (
              <li key={topic} className="min-w-0 max-w-full">
                <Badge variant="outline" className="max-w-full rounded-md border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-normal text-[#a3a3a3]">
                  <span className="truncate">{topic}</span>
                </Badge>
              </li>
            ))}
            {extraTopics > 0 && (
              <li>
                <Badge
                  variant="outline"
                  title={topics.slice(3).join(", ")}
                  className="rounded-md border-transparent bg-transparent px-1.5 py-0.5 text-xs font-normal text-[#8a8a8a]"
                >
                  <span aria-hidden="true">+{extraTopics}</span>
                  <span className="sr-only">and {extraTopics} more topics</span>
                </Badge>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* footer: signals · AI summary · actions */}
      <div className="mt-auto flex flex-col gap-3.5 border-t border-white/[0.06] pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12.5px] tabular-nums text-[#9a9a9a]">
            <span className="inline-flex items-center gap-1.5">
              <StarIcon className="size-3.5" />
              {formatCount(normalizedRepo.stars)}
              <span className="sr-only">stars</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ForkIcon className="size-3.5" />
              {formatCount(normalizedRepo.forks)}
              <span className="sr-only">forks</span>
            </span>
            {updated && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="size-3.5" />
                <span className="sr-only">Updated </span>
                <time dateTime={normalizedRepo.pushedAt}>{updated}</time>
              </span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <ScoreBadge score={discoveryRepo.reliabilityScore} />
            <LanguageChip language={normalizedRepo.language} />
          </div>
        </div>

        <RepoBlurbView state={blurbState} onGenerate={fetchBlurb} onRetry={fetchBlurb} compact />

        <div className="flex items-center gap-2">
          <CopyButton cloneCommand={repoCloneCommand(normalizedRepo.fullName)} url={url} className="relative z-10 flex-1 sm:flex-none" />
          <RepoQnA repo={normalizedRepo as GithubRepo} className="relative z-10 flex-1 sm:flex-none" />
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="relative z-10 ml-auto size-11 shrink-0 rounded-lg border border-white/10 bg-white/[0.03] text-[#9a9a9a] shadow-none transition-colors hover:border-[#a8ff3e]/35 hover:bg-[#a8ff3e]/[0.07] hover:text-[#a8ff3e] focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0 motion-reduce:transition-none sm:size-9"
          >
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${normalizedRepo.fullName} on GitHub (opens in a new tab)`} title="Open on GitHub">
              <ExternalLinkIcon className="size-4" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  )
}