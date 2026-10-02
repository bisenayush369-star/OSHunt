"use client"

import Image from "next/image"
import { useState } from "react"
import { CopyButton } from "./CopyButton"
import { BookmarkButton } from "./BookmarkButton"
import { RepoQnA } from "./RepoQnA"
import { RepoBlurbView } from "./RepoBlurbView"
import type { GithubRepo } from "@/components/lib/github"
import { repoUrl, repoCloneCommand, type BlurbState, type RepoBlurb, type RepoWithBlurb } from "@/components/lib/repo-types"

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
      try { window.dispatchEvent(new CustomEvent("usage:updated")) } catch { /* ignore */ }
    } catch (err) {
      setBlurbState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong." })
    }
  }

  const url = repoUrl(normalizedRepo.fullName)
  const currentBlurb = blurbState.status === "ready" ? blurbState.blurb : initialBlurb ?? undefined
  const avatarUrl = normalizedRepo.owner?.avatar_url || normalizedRepo.owner?.avatarUrl || ""

  return (
    <div className="group relative flex h-full flex-col rounded-[22px] border border-[#1c1c1c] bg-[#0d0d0d] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a8ff3e]/20 hover:shadow-[0_14px_28px_-18px_rgba(168,255,62,0.25)] sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/10 bg-[#090909]">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={`${normalizedRepo.owner?.login || "repo"} avatar`}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-[11px] uppercase text-[#999]">GH</span>
            )}
          </div>
          <div className="min-w-0 text-left">
            <div className="truncate text-[15px] font-semibold text-white">
              {normalizedRepo.fullName}
            </div>
          </div>
        </div>
        <BookmarkButton repo={{ ...normalizedRepo, blurb: currentBlurb }} bookmarked={bookmarked} onToggle={onToggleBookmark} />
      </div>

      {repo.description && (
        <p className="mb-4 line-clamp-3 min-h-[50px] text-[14px] leading-[1.6] text-[#9a9a9a]">
          {repo.description}
        </p>
      )}

      {normalizedRepo.topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {normalizedRepo.topics.slice(0, 3).map((t: string) => (
            <span key={t} className="rounded-full border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-2.5 py-1 text-[10.5px] font-medium text-[#a8ff3e]">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto border-t border-[#1a1a1a] pt-3">
        <div className="mb-3 flex items-center justify-between gap-3 text-[12px] text-[#777]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1"><StarIcon />{formatCount(normalizedRepo.stars)}</span>
            <span className="flex items-center gap-1"><ForkIcon />{formatCount(normalizedRepo.forks)}</span>
            <span className="flex items-center gap-1"><ClockIcon />{timeAgo(normalizedRepo.pushedAt)}</span>
          </div>
          <span className="rounded-full border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 px-2 py-0.5 text-[11px] font-semibold text-[#a8ff3e]">
            {languageLabel}
          </span>
        </div>

        <div className="mb-3 rounded-xl border border-dashed border-[#2a2a2a] bg-[#0a0a0a] p-3 text-left">
          <RepoBlurbView state={blurbState} onGenerate={fetchBlurb} onRetry={fetchBlurb} compact />
        </div>

        <div className="flex items-center gap-2">
          <CopyButton cloneCommand={repoCloneCommand(normalizedRepo.fullName)} url={url} />
          <RepoQnA repo={normalizedRepo as GithubRepo} />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center justify-center gap-2 rounded-[12px] border border-[#a8ff3e]/20 bg-[#a8ff3e] px-3 py-2 text-[12px] font-semibold text-[#07140a] transition-colors hover:bg-[#c4ff7d]"
          >
            <ExternalIcon />
            View
          </a>
        </div>
      </div>
    </div>
  )
}
