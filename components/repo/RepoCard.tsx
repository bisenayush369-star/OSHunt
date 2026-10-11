"use client"

import Image from "next/image"
import { useState } from "react"
import { CopyButton } from "./CopyButton"
import { BookmarkButton } from "./BookmarkButton"
import { RepoQnA } from "./RepoQnA"
import { RepoBlurbView } from "./RepoBlurbView"
import type { GithubRepo } from "@/components/lib/github"
import { computeReliabilityScore, detectFrameworks } from "@/components/lib/discovery/ranking"
import { TECHNOLOGIES } from "@/components/lib/technology-options"
import type { Repo as DiscoveryRepo } from "@/components/types/discovery"
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

function resolveLanguageOption(language?: string) {
  const raw = (language ?? "").trim()
  if (!raw) return null

  const normalized = raw.toLowerCase()

  return (
    TECHNOLOGIES.find((option) => {
      const matchesValue = option.value.toLowerCase() === normalized
      const matchesLabel = option.label.toLowerCase() === normalized
      const matchesAlias = option.aliases?.some((alias) => alias.toLowerCase() === normalized)
      return matchesValue || matchesLabel || matchesAlias
    }) ??
    TECHNOLOGIES.find((option) => {
      const matchesValue = option.value.toLowerCase().includes(normalized)
      const matchesLabel = option.label.toLowerCase().includes(normalized)
      const matchesAlias = option.aliases?.some((alias) => alias.toLowerCase().includes(normalized))
      return matchesValue || matchesLabel || matchesAlias
    }) ??
    null
  )
}

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
  const normalizedRepo = normalizeRepo(repo)
  const languageOption = resolveLanguageOption(normalizedRepo.language)
  const languageLabel = languageOption?.label ?? (normalizedRepo.language || "Unknown")
  const LanguageIcon = languageOption?.icon
  const languageChipColor = languageOption?.iconColor ?? "#a8ff3e"
  const languageChipStyle = {
    color: languageChipColor,
    borderColor: `${languageChipColor}55`,
    backgroundColor: `${languageChipColor}14`,
  }
  const reliabilityRepo = {
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
  const reliabilityScore = computeReliabilityScore(reliabilityRepo as Parameters<typeof computeReliabilityScore>[0])
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
  const handleOpen = () => {
    if (!onOpen) return
    const nextRepo: DiscoveryRepo = {
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
      htmlUrl: url,
      archived: false,
      frameworks: detectFrameworks(normalizedRepo.topics ?? []),
      reliabilityScore: reliabilityScore,
      trendingScore: 0,
    }
    onOpen(nextRepo)
  }

  return (
    <div
      className="group relative flex h-full flex-col rounded-[22px] border border-[#1c1c1c] bg-[#0d0d0d] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#a8ff3e]/20 hover:shadow-[0_14px_28px_-18px_rgba(168,255,62,0.25)] sm:p-5"
      onClick={(event) => {
        const target = event.target as HTMLElement
        const interactive = target.closest("button, a, input, textarea, select, [role='button']")
        if (interactive && interactive !== event.currentTarget) {
          event.stopPropagation()
          return
        }
        handleOpen()
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          handleOpen()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={handleOpen}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
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
        </button>
        <BookmarkButton repo={{ ...normalizedRepo, blurb: currentBlurb }} bookmarked={bookmarked} onToggle={onToggleBookmark} />
      </div>

      <button type="button" onClick={handleOpen} className="mb-4 block w-full text-left">
        {repo.description && (
          <p className="line-clamp-3 min-h-[50px] text-[14px] leading-[1.6] text-[#9a9a9a]">
            {repo.description}
          </p>
        )}

        {normalizedRepo.topics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {normalizedRepo.topics.slice(0, 3).map((t: string) => (
              <span key={t} className="rounded-full border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-2.5 py-1 text-[10.5px] font-medium text-[#a8ff3e]">
                {t}
              </span>
            ))}
          </div>
        )}
      </button>

      <div className="mt-auto border-t border-[#1a1a1a] pt-3">
        <div className="mb-3 flex items-center justify-between gap-3 text-[12px] text-[#777]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1"><StarIcon />{formatCount(normalizedRepo.stars)}</span>
            <span className="flex items-center gap-1"><ForkIcon />{formatCount(normalizedRepo.forks)}</span>
            <span className="flex items-center gap-1"><ClockIcon />{timeAgo(normalizedRepo.pushedAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 px-2 py-0.5 text-[11px] font-semibold text-[#a8ff3e]">
              {reliabilityScore}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
              style={languageChipStyle}
            >
              {LanguageIcon ? (
                <LanguageIcon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: languageChipColor }}
                />
              ) : null}
              <span>{languageLabel}</span>
            </span>
          </div>
        </div>

        <div className="mb-3 rounded-xl border border-dashed border-[#2a2a2a] bg-[#0a0a0a] p-3 text-left">
          <RepoBlurbView state={blurbState} onGenerate={fetchBlurb} onRetry={fetchBlurb} compact />
        </div>

        <div className="flex items-center gap-2">
          <CopyButton cloneCommand={repoCloneCommand(normalizedRepo.fullName)} url={url} />
          <RepoQnA repo={normalizedRepo as GithubRepo} />
        </div>
      </div>
    </div>
  )
}
