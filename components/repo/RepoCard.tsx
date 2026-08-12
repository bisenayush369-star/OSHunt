"use client"

import Image from "next/image"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "./CopyButton"
import { BookmarkButton } from "./BookmarkButton"
import { RepoQnA } from "./RepoQnA"
import { RepoBlurbView } from "./RepoBlurbView"
import type { GithubRepo } from "@/lib/github"
import { repoUrl, repoCloneCommand, type BlurbState, type RepoBlurb, type RepoWithBlurb } from "@/lib/repo-types"

const LANGUAGE_COLOR_MAP: Record<string, string> = {
  javascript: "#F7DF1E",
  typescript: "#3178C6",
  react: "#3178C6",
  nextjs: "#3178C6",
  vue: "#3178C6",
  angular: "#CC342D",
  svelte: "#F7DF1E",
  python: "#00ADD8",
  go: "#00ADD8",
  graphql: "#00ADD8",
  docker: "#00ADD8",
  nodejs: "#00ADD8",
  java: "#CC342D",
  kotlin: "#CC342D",
  ruby: "#CC342D",
  php: "#CC342D",
  rust: "#CC342D",
}

function getLanguageColor(language?: string) {
  if (!language) return "#777"
  return LANGUAGE_COLOR_MAP[language.toLowerCase()] ?? "#777"
}

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
  const toNumber = (value: unknown) => (typeof value === "number" ? value : 0)
  const toTopics = (value: unknown) => (Array.isArray(value) ? value.filter(item => typeof item === "string") : [])

  const normalizedOwner = {
    login: toString(owner.login) || toString(raw.fullName)?.split("/")[0] || "",
    avatar_url: toString(owner.avatar_url) || toString(owner.avatarUrl) || "",
  }

  return {
    ...repo,
    fullName:
      toString(raw.fullName) ||
      toString(raw.full_name) ||
      `${normalizedOwner.login}/${toString(raw.name)}`,
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

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const ForkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="6" cy="6" r="2.2" />
    <circle cx="18" cy="6" r="2.2" />
    <circle cx="12" cy="18" r="2.2" />
    <path d="M6 8.2V11a3 3 0 003 3h6a3 3 0 003-3V8.2M12 14v2" />
  </svg>
)
const IssueIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="13" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
)
const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 16 14" />
  </svg>
)
const ExternalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days < 1) return "today"
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return String(n)
}

export function RepoCard({
  repo,
  initialBlurb,
  bookmarked,
  onToggleBookmark,
}: {
  repo: GithubRepo
  /** Pass the blurb object for eager (trending) cards, `null` if an eager
   * generation already failed, or leave undefined for search results where
   * nothing has been generated yet. */
  initialBlurb?: RepoBlurb | null
  bookmarked: boolean
  onToggleBookmark: (repo: RepoWithBlurb) => void
}) {
  const normalizedRepo = normalizeRepo(repo)
  const languageColor = getLanguageColor(normalizedRepo.language)
  const languageLabel = normalizedRepo.language || "Unknown"
  const [blurbState, setBlurbState] = useState<BlurbState>(
    initialBlurb ? { status: "ready", blurb: initialBlurb } : initialBlurb === null ? { status: "error", message: "" } : { status: "idle" }
  )

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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Failed to generate a summary.")
      if (!data.blurb) throw new Error("The response didn't include a summary.")
      setBlurbState({ status: "ready", blurb: data.blurb })
    } catch (err) {
      setBlurbState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." })
    }
  }

  const url = repoUrl(normalizedRepo.fullName)
  const currentBlurb = blurbState.status === "ready" ? blurbState.blurb : initialBlurb ?? undefined
  const avatarUrl = normalizedRepo.owner?.avatar_url || normalizedRepo.owner?.avatarUrl || ""

  return (
    // Nothing in this card is wrapped in an outer <a> or onClick — every
    // action (view on GitHub, copy, bookmark, ask AI, generate a summary)
    // is its own real button/link.
    <div className="group relative flex flex-col gap-4 rounded-xl border border-[#141414] bg-[#0a0a0a] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a8ff3e]/20 hover:shadow-[0_16px_40px_-24px_rgba(168,255,62,0.25)] sm:p-5">
      <span className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl" style={{ backgroundColor: languageColor }} />
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link flex min-w-0 items-center gap-3 transition-colors hover:text-[#a8ff3e]"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#090909]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${normalizedRepo.owner?.login || "repo"} avatar`}
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] uppercase text-[#999]">GH</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[14px] font-bold text-white">
              <span className="truncate">{normalizedRepo.fullName}</span>
              <span className="hidden rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[#ccc] sm:inline-flex" style={{ borderColor: `${languageColor}30`, color: languageColor, backgroundColor: `${languageColor}10` }}>
                {languageLabel}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#999]">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: languageColor }} />
                <span>{languageLabel}</span>
              </span>
            </div>
          </div>
        </a>
        <BookmarkButton repo={{ ...normalizedRepo, blurb: currentBlurb }} bookmarked={bookmarked} onToggle={onToggleBookmark} />
      </div>

      {repo.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-[#999]">{repo.description}</p>}

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[#777]">
        <span className="flex items-center gap-1"><StarIcon />{formatCount(normalizedRepo.stars)}</span>
        <span className="flex items-center gap-1"><ForkIcon />{formatCount(normalizedRepo.forks)}</span>
        {normalizedRepo.openIssues > 0 && (
          <span className="flex items-center gap-1"><IssueIcon />{formatCount(normalizedRepo.openIssues)}</span>
        )}
        <span className="flex items-center gap-1"><ClockIcon />{timeAgo(normalizedRepo.pushedAt)}</span>
        {!normalizedRepo.language ? null : (
          <Badge
            variant="outline"
            className="rounded border-[#1a1a1a] bg-black px-1.5 py-0 text-[10.5px] font-normal"
            style={{ borderColor: `${languageColor}30`, color: languageColor }}
          >
            {normalizedRepo.language}
          </Badge>
        )}
      </div>

      {normalizedRepo.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {normalizedRepo.topics.slice(0, 4).map((t: string) => (
            <span key={t} className="rounded-md bg-[#a8ff3e]/[0.06] px-2 py-0.5 text-[10.5px] text-[#a8ff3e]/80">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* AI blurb — this is the "visual explanation, not copy-paste" section */}
      <div className="border-t border-[#141414] pt-3.5">
        <RepoBlurbView state={blurbState} onGenerate={fetchBlurb} onRetry={fetchBlurb} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <CopyButton cloneCommand={repoCloneCommand(normalizedRepo.fullName)} url={url} />
        <RepoQnA repo={repo} />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex h-8 items-center gap-1.5 rounded-lg bg-[#a8ff3e]/10 px-3 text-[12px] font-semibold text-[#a8ff3e] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a8ff3e] hover:text-black"
        >
          View <ExternalIcon />
        </a>
      </div>
    </div>
  )
}
