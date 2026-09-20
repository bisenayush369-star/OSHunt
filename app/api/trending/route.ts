import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getGithubAuthHeader } from "@/lib/github"
import { checkRateLimit } from "@/lib/ratelimit"
import { auth } from "@/lib/auth"
import { canAffordUsage, consumeQuota } from "@/lib/quota"

export const maxDuration = 30

const trendingQuerySchema = z.object({
  page: z.string().optional().default("1").transform(value => {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }),
  mode: z.enum(["recent", "popularity"]).optional().default("popularity"),
})

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  return forwardedFor?.split(",")[0]?.trim() || "unknown"
}

type GitHubSearchResponse = {
  items?: Array<Record<string, unknown>>
}

// Blurb generation is opt-in from the client. We intentionally do NOT call
// the LLM here for every repo to avoid firing AI calls on page load or when
// users type in the search box. The client will request a blurb via
// `/api/repo-insight` when the user clicks "Explain this repo" on a card.

export async function GET(req: NextRequest) {
  const parsedQuery = trendingQuerySchema.safeParse({
    page: req.nextUrl.searchParams.get("page") || "1",
    mode: req.nextUrl.searchParams.get("mode") || "popularity",
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters.", details: parsedQuery.error.flatten() }, { status: 400 })
  }

  const { page, mode } = parsedQuery.data
  const rateLimitResult = await checkRateLimit(`trending:${getClientIp(req)}`, { limit: 10, windowMs: 10_000 })
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 10) } })
  }

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

    // If a signed-in user requested this, consume one GitHub quota unit.
    try {
      const session = await auth()
      if (session?.user?.id) {
        const allowance = await canAffordUsage(session.user.id, { github: 1 })
        if (!allowance.allowed) {
          return NextResponse.json({ error: allowance.reason }, { status: 403 })
        }
        await consumeQuota(session.user.id, { github: 1 })
      }
    } catch (err) {
      // If quota check fails for unexpected reasons, log and continue to return data
      console.error("[/api/trending] quota update failed:", err)
    }

    return NextResponse.json({ repos: normalizedRepos, mode, page })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch trending repos." },
      { status: 500 }
    )
  }
}
