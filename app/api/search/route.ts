import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { searchRepos } from "@/lib/github"
import { checkRateLimit } from "@/lib/ratelimit"

const searchQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
})

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  return forwardedFor?.split(",")[0]?.trim() || "unknown"
}

export async function GET(req: NextRequest) {
  const parsedQuery = searchQuerySchema.safeParse({ q: req.nextUrl.searchParams.get("q") || "" })
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters.", details: parsedQuery.error.flatten() }, { status: 400 })
  }

  const rateLimitResult = await checkRateLimit(`search:${getClientIp(req)}`, { limit: 10, windowMs: 10_000 })
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 10) } })
  }

  const q = parsedQuery.data.q
  try {
    const items = await searchRepos(q)
    // Normalize to include `fullName` for client convenience
    const repos = (items || []).map((rawRepo: Record<string, unknown>) => {
      const repo = rawRepo as Record<string, unknown>
      const owner = typeof repo.owner === "object" && repo.owner !== null ? (repo.owner as Record<string, unknown>) : {}
      return {
        ...repo,
        fullName: (repo.fullName as string | undefined) ?? (repo.full_name as string | undefined) ?? `${(owner.login as string | undefined) ?? ""}/${(repo.name as string | undefined) ?? ""}`,
        stars: (repo.stars as number | undefined) ?? (repo.stargazers_count as number | undefined) ?? 0,
        forks: (repo.forks as number | undefined) ?? (repo.forks_count as number | undefined) ?? 0,
        openIssues: (repo.openIssues as number | undefined) ?? (repo.open_issues_count as number | undefined) ?? 0,
        createdAt: (repo.createdAt as string | undefined) ?? (repo.created_at as string | undefined) ?? "",
        pushedAt: (repo.pushedAt as string | undefined) ?? (repo.pushed_at as string | undefined) ?? "",
        language: (repo.language as string | undefined) ?? "",
        topics: (repo.topics as string[] | undefined) ?? [],
      }
    })
    return NextResponse.json({ repos })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed" }, { status: 500 })
  }
}
