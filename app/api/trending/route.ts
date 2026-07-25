import { NextRequest, NextResponse } from "next/server"
import { getGithubAuthHeader } from "@/lib/github"

export const maxDuration = 30

type GitHubSearchResponse = {
  items?: Array<Record<string, unknown>>
}

// Blurb generation is opt-in from the client. We intentionally do NOT call
// the LLM here for every repo to avoid firing AI calls on page load or when
// users type in the search box. The client will request a blurb via
// `/api/repo-insight` when the user clicks "Explain this repo" on a card.

export async function GET(req: NextRequest) {
  const pageParam = parseInt(req.nextUrl.searchParams.get("page") || "1", 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const mode = req.nextUrl.searchParams.get("mode") === "recent" ? "recent" : "popularity"

  try {
    const headers = await getGithubAuthHeader()
    const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const query =
      mode === "recent"
        ? `created:>=${sinceDate} stars:>30`
        : "stars:>1000"

    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=12&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          ...headers,
        },
      }
    )

    const data = (await res.json()) as GitHubSearchResponse
    if (!res.ok) {
      const errorMessage =
        typeof (data as Record<string, unknown>).message === "string"
          ? (data as Record<string, unknown>).message
          : "Failed to fetch trending repos."
      throw new Error(String(errorMessage))
    }

    const normalizeString = (value: unknown) => (typeof value === "string" ? value : "")
    const normalizeNumber = (value: unknown) => (typeof value === "number" ? value : 0)
    const normalizeTopics = (value: unknown) => (Array.isArray(value) ? value.filter(item => typeof item === "string") : [])
    const normalizedRepos = (data.items ?? []).map(repo => {
      const raw = repo as Record<string, unknown>
      const owner = typeof raw.owner === "object" && raw.owner !== null ? (raw.owner as Record<string, unknown>) : {}

      return {
        ...raw,
        fullName: normalizeString(raw.fullName) || normalizeString(raw.full_name) || `${normalizeString(owner.login)}/${normalizeString(raw.name)}`,
        stars: normalizeNumber(raw.stars) || normalizeNumber(raw.stargazers_count),
        forks: normalizeNumber(raw.forks) || normalizeNumber(raw.forks_count),
        openIssues: normalizeNumber(raw.openIssues) || normalizeNumber(raw.open_issues_count),
        createdAt: normalizeString(raw.createdAt) || normalizeString(raw.created_at),
        pushedAt: normalizeString(raw.pushedAt) || normalizeString(raw.pushed_at),
        language: normalizeString(raw.language),
        topics: normalizeTopics(raw.topics),
      }
    })

    return NextResponse.json({ repos: normalizedRepos, mode, page })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch trending repos." },
      { status: 500 }
    )
  }
}
