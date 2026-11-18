import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { GithubApiError, NeedsGithubConnectError, searchRepos } from "@/components/lib/github"
import { checkRateLimit } from "@/components/lib/ratelimit"
import { auth } from "@/components/lib/auth"
import { canAffordUsage, consumeQuota } from "@/components/lib/quota"

export const maxDuration = 30

// Mirrors PAGE_SIZE in app/trending/page.tsx.
const PAGE_SIZE = 12
// GitHub search only serves the first 1,000 results, so later pages would be an error.
const MAX_PAGE = Math.floor(1000 / PAGE_SIZE)
// How far back "New" looks, and the star floor that keeps each window from filling up with empty repos.
// The page (`WINDOWS` in app/trending/page.tsx) shows the same numbers.
const NEW_WINDOWS = { "7": { days: 7, minStars: 10 }, "30": { days: 30, minStars: 30 }, "90": { days: 90, minStars: 100 } } as const
// Both lists are the same for everyone, so a few minutes of caching saves GitHub quota without going stale.
const CACHE_SECONDS = 300
// Typed searches repeat less, and people expect a fresh answer, so they are kept for a minute only.
const SEARCH_CACHE_SECONDS = 60

const trendingQuerySchema = z.object({
  page: z.string().optional().default("1").transform(value => {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
  }),
  // "search" is the search box: any words, any repository on GitHub, most-starred first.
  mode: z.enum(["recent", "popularity", "search"]).optional().default("popularity"),
  q: z.string().trim().min(2).max(100).optional(),
  // Extra narrowing for the two lists. Each maps to one GitHub search qualifier and only these values are accepted.
  stars: z.enum(["1000", "5000", "10000", "50000"]).optional(),
  pushed: z.enum(["7", "30", "90"]).optional(),
  archived: z.enum(["hide"]).optional(),
  // How many results one page holds. Only the search box uses it, to ask for a short list of suggestions.
  size: z
    .string()
    .optional()
    .transform(value => {
      const parsed = Number.parseInt(value ?? "", 10)
      return Number.isFinite(parsed) ? Math.min(PAGE_SIZE, Math.max(1, parsed)) : PAGE_SIZE
    }),
  window: z.enum(["7", "30", "90"]).optional().default("30"),
  // A language name as GitHub spells it ("C++", "C#", "Jupyter Notebook"). The character set has no quote or colon,
  // so the value can only ever name a language and never add another search qualifier.
  language: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9#+.\- ]{1,30}$/)
    .optional(),
})

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")
  return forwardedFor?.split(",")[0]?.trim() || "unknown"
}

type Filters = { language?: string; stars?: string; pushed?: string; archived?: string }

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

function buildQuery(mode: "recent" | "popularity" | "search", windowKey: keyof typeof NEW_WINDOWS, filters: Filters, text?: string) {
  // Quotes only where GitHub needs them: a name with a space ("Jupyter Notebook"). "C++" and "C#" stay bare.
  const { language } = filters
  const lang = language ? (/\s/.test(language) ? ` language:"${language}"` : ` language:${language}`) : ""
  if (mode === "search") return `${text ?? ""}${lang}`
  const extra = `${filters.pushed ? ` pushed:>=${daysAgo(Number(filters.pushed))}` : ""}${filters.archived ? " archived:false" : ""}${lang}`
  if (mode === "popularity") return `stars:>${filters.stars ?? "1000"}${extra}`
  const { days, minStars } = NEW_WINDOWS[windowKey]
  return `created:>=${daysAgo(days)} stars:>${filters.stars ?? minStars}${extra}`
}

const normalizeString = (value: unknown) => (typeof value === "string" ? value : "")
const normalizeNumber = (value: unknown) => (typeof value === "number" ? value : 0)
const normalizeTopics = (value: unknown) => (Array.isArray(value) ? value.filter(item => typeof item === "string") : [])

function normalizeRepo(repo: unknown) {
  const raw = (typeof repo === "object" && repo !== null ? repo : {}) as Record<string, unknown>
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
}

// GitHub's own error text can carry account details, so the client only gets the readable message
// the shared GitHub helper already wrote, never a raw upstream body.
function failure(err: unknown) {
  if (err instanceof NeedsGithubConnectError) {
    return NextResponse.json(
      { error: "Connect your GitHub account to load repositories.", code: "needs_github_connect" },
      { status: 403 }
    )
  }
  if (err instanceof GithubApiError) {
    const status = err.rateLimited ? 429 : err.status === 401 ? 401 : err.status === 504 ? 504 : 502
    const headers: Record<string, string> = {}
    if (err.rateLimited) {
      const wait = err.retryAfterSeconds ?? (err.resetAt ? Math.max(1, Math.ceil((err.resetAt - Date.now()) / 1000)) : null)
      if (wait) headers["Retry-After"] = String(wait)
    }
    return NextResponse.json({ error: err.message }, { status, headers })
  }
  console.error("[/api/trending]", err)
  return NextResponse.json({ error: "Failed to fetch trending repos." }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const parsedQuery = trendingQuerySchema.safeParse({
    page: req.nextUrl.searchParams.get("page") || "1",
    mode: req.nextUrl.searchParams.get("mode") || "popularity",
    window: req.nextUrl.searchParams.get("window") || "30",
    language: req.nextUrl.searchParams.get("language") || undefined,
    q: req.nextUrl.searchParams.get("q") || undefined,
    stars: req.nextUrl.searchParams.get("stars") || undefined,
    pushed: req.nextUrl.searchParams.get("pushed") || undefined,
    archived: req.nextUrl.searchParams.get("archived") || undefined,
    size: req.nextUrl.searchParams.get("size") || undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters.", details: parsedQuery.error.flatten() }, { status: 400 })
  }

  const { page, mode, window: windowKey, language, q, size, stars, pushed, archived } = parsedQuery.data
  if (mode === "search" && !q) {
    return NextResponse.json({ error: "Invalid query parameters.", details: { fieldErrors: { q: ["Required for search."] } } }, { status: 400 })
  }
  const rateLimitResult = await checkRateLimit(`trending:${getClientIp(req)}`, { limit: 10, windowMs: 10_000 })
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rateLimitResult.retryAfter || 10) } })
  }

  // Past GitHub's 1,000-result cap there is nothing left; answer with an empty page instead of an upstream error.
  if (page > MAX_PAGE) return NextResponse.json({ repos: [], mode, page })

  // A signed-in user spends one GitHub unit per request that reaches GitHub. Check first, spend after it worked,
  // so an over-limit user never triggers a GitHub call.
  let userId: string | null = null
  try {
    userId = (await auth())?.user?.id ?? null
    if (userId) {
      const allowance = await canAffordUsage(userId, { github: 1 })
      if (!allowance.allowed) {
        return NextResponse.json({ error: allowance.reason }, { status: 403 })
      }
    }
  } catch (err) {
    // If the quota check fails for unexpected reasons, log and still return the list (without charging).
    console.error("[/api/trending] quota check failed:", err)
    userId = null
  }

  try {
    // `query` is the exact GitHub search that ran, handy when a list looks off.
    const query = buildQuery(mode, windowKey, { language, stars, pushed, archived }, q)
    const items = await searchRepos(query, { page, perPage: mode === "search" ? size : PAGE_SIZE, revalidate: mode === "search" ? SEARCH_CACHE_SECONDS : CACHE_SECONDS })
    const repos = items.map(normalizeRepo)

    if (userId) {
      try {
        await consumeQuota(userId, { github: 1 })
      } catch (err) {
        console.error("[/api/trending] quota update failed:", err)
      }
    }

    return NextResponse.json({ repos, mode, page, query })
  } catch (err) {
    return failure(err)
  }
}