import { NextRequest, NextResponse } from "next/server";
import { getGithubAuthHeader } from "@/lib/github";
import { computeReliabilityScore, computeTrendingScore, detectFrameworks } from "@/lib/discovery/ranking";
import { auth } from "@/lib/auth";
import { canAffordUsage, consumeQuota } from "@/lib/quota";

/**
 * Live GitHub-backed discovery feed with full filter + pagination support.
 * Mirrors buildSearchQuery() in lib/discovery/github.ts on the client side —
 * keep the two in sync if you change one.
 *
 * Auth: set GITHUB_TOKEN (classic PAT, no scopes needed) to go from 60
 * req/hour to 5,000/hour. https://github.com/settings/tokens
 *
 * Caching: native Next.js fetch caching via `next.revalidate`, keyed
 * implicitly by the full request URL (including query params), so each
 * distinct filter combination gets its own 5-minute cache entry.
 */

const REVALIDATE_SECONDS = 300;

const CATEGORY_QUERIES: Record<string, { query: string; sort?: string }> = {
  trending: { query: "stars:>1000 pushed:>{recent}", sort: "stars" },
  "movies-anime": { query: "anime stars:>50" },
  "ai-ml": { query: "topic:machine-learning stars:>300", sort: "stars" },
  "llm-models": { query: "topic:llm stars:>100" },
  frontend: { query: "topic:frontend stars:>300", sort: "stars" },
  backend: { query: "topic:backend stars:>300", sort: "stars" },
  devops: { query: "topic:devops stars:>200", sort: "stars" },
  databases: { query: "topic:database stars:>300", sort: "stars" },
  testing: { query: "topic:testing stars:>200", sort: "stars" },
  apis: { query: "topic:api stars:>200", sort: "stars" },
  mobile: { query: "topic:mobile stars:>300", sort: "stars" },
  courses: { query: "(topic:tutorial OR topic:course OR topic:learning) stars:>100" },
  cli: { query: "topic:cli stars:>200", sort: "stars" },
  security: { query: "topic:security stars:>300", sort: "stars" },
  "self-hosted": { query: "topic:selfhosted stars:>300", sort: "stars" },
  frameworks: { query: "topic:framework stars:>300", sort: "stars" },
  "design-tools": { query: "topic:design stars:>100", sort: "stars" },
  documentation: { query: "topic:documentation stars:>100", sort: "stars" },
  tools: { query: "topic:developer-tools stars:>200", sort: "stars" },
  jobs: { query: "topic:jobs stars:>50 archived:false", sort: "stars" },
  "hidden-gems": { query: "stars:50..2000 pushed:>{recent} archived:false", sort: "stars" },
  "best-beginner": { query: "good-first-issues:>5 help-wanted-issues:>3", sort: "updated" },
};

function recentDateISO(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildQuery(params: URLSearchParams): { q: string; sort?: string } {
  const categoryId = params.get("category") || "trending";
  const entry = CATEGORY_QUERIES[categoryId] ?? CATEGORY_QUERIES.trending;
  const parts: string[] = [];

  const freeText = params.get("q");
  if (freeText) parts.push(freeText);

  parts.push(entry.query.replace("{recent}", recentDateISO(30)));

  const languages = params.getAll("language");
  if (languages.length === 1) parts.push(`language:${languages[0]}`);
  else if (languages.length > 1) parts.push(`(${languages.map((l) => `language:${l}`).join(" OR ")})`);

  const license = params.get("license");
  if (license) parts.push(`license:${license}`);

  const org = params.get("org");
  if (org) parts.push(`org:${org}`);

  const minStars = params.get("minStars");
  if (minStars) parts.push(`stars:>=${minStars}`);

  const minForks = params.get("minForks");
  if (minForks) parts.push(`forks:>=${minForks}`);

  const maintenance = params.get("maintenance");
  if (maintenance === "archived") parts.push("archived:true");
  else if (maintenance === "active") parts.push("archived:false");
  else if (maintenance === "recently-updated") parts.push(`pushed:>${recentDateISO(30)}`);

  // "trending" and "health" sorts are computed client-side after fetch —
  // there's no GitHub-native field for either, so we fall back to a
  // reasonable native sort here and let the client re-rank.
  const requestedSort = params.get("sort");
  const nativeSort = requestedSort && !["trending", "health", "best-match"].includes(requestedSort)
    ? requestedSort
    : entry.sort;

  return { q: parts.join(" "), sort: nativeSort };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const perPage = Math.min(Number(params.get("per_page")) || 12, 30);
  const { q, sort } = buildQuery(params);

  const sortParam = sort ? `&sort=${sort}&order=desc` : "";
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}${sortParam}&per_page=${perPage}&page=${page}`;

  let authHeaders = {} as Record<string, string>;
  try {
    authHeaders = await getGithubAuthHeader();
  } catch (err) {
    if ((err as any)?.name === "NeedsGithubConnectError") {
      return NextResponse.json({ error: "needs_github_connect" }, { status: 403 });
    }
    throw err;
  }
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(authHeaders.Authorization ? { Authorization: authHeaders.Authorization } : {}),
  };

  try {
    const res = await fetch(url, { headers, next: { revalidate: REVALIDATE_SECONDS } });

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const resetHeader = res.headers.get("x-ratelimit-reset");
      const resetInSeconds = resetHeader
        ? Math.max(0, Number(resetHeader) - Math.floor(Date.now() / 1000))
        : null;
      return NextResponse.json(
        {
          error: "github_rate_limited",
          message: authHeaders.Authorization
            ? "Rate limit reached even with a token — unusual, check token validity."
            : "GitHub's public rate limit was hit. Sign in with GitHub or set GITHUB_TOKEN to raise it to 5,000/hour.",
          remaining: remaining ? Number(remaining) : 0,
          retryAfterSeconds: resetInSeconds,
        },
        { status: 429 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "github_error", message: `GitHub API responded ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const items = (data.items ?? []).map(normalizeRepo);
    const totalCount = data.total_count ?? items.length;

    // If a signed-in user requested this, consume one GitHub quota unit.
    try {
      const session = await auth();
      if (session?.user?.id) {
        const allowance = await canAffordUsage(session.user.id, { github: 1 });
        if (!allowance.allowed) {
          return NextResponse.json({ error: allowance.reason }, { status: 403 });
        }
        await consumeQuota(session.user.id, { github: 1 });
      }
    } catch (err) {
      console.error("[/api/gems] quota update failed:", err);
    }

    return NextResponse.json({
      items,
      totalCount,
      hasMore: page * perPage < Math.min(totalCount, 1000), // GitHub search caps at 1000 results
      page,
    });
  } catch (error) {
    console.error("[/api/gems] failed:", error);
    return NextResponse.json(
      { error: "fetch_failed", message: "Couldn't reach the GitHub API." },
      { status: 502 }
    );
  }
}

  // After responding, try to consume one GitHub quota for the authenticated user.
  // NOTE: We cannot mutate the response after sending it, so perform the quota
  // update before returning in the success path above. For safety, keep this
  // block here as documentation but the actual consumption is handled inline.

function normalizeRepo(raw: Record<string, unknown>) {
  const owner = raw.owner as Record<string, unknown> | null | undefined;
  const license = raw.license as Record<string, unknown> | null | undefined;
  const topics = Array.isArray(raw.topics) ? (raw.topics as string[]) : [];

  const base = {
    id: typeof raw.id === "number" ? raw.id : 0,
    name: typeof raw.name === "string" ? raw.name : "",
    fullName: typeof raw.full_name === "string" ? raw.full_name : "",
    owner: typeof owner?.login === "string" ? owner.login : "unknown",
    ownerAvatar: typeof owner?.avatar_url === "string" ? owner.avatar_url : null,
    description: typeof raw.description === "string" ? raw.description : null,
    homepage: typeof raw.homepage === "string" ? raw.homepage : null,
    language: typeof raw.language === "string" ? raw.language : null,
    topics,
    stars: typeof raw.stargazers_count === "number" ? raw.stargazers_count : 0,
    forks: typeof raw.forks_count === "number" ? raw.forks_count : 0,
    openIssues: typeof raw.open_issues_count === "number" ? raw.open_issues_count : 0,
    watchers: typeof raw.watchers_count === "number" ? raw.watchers_count : 0,
    license:
      license && typeof license.spdx_id === "string" && license.spdx_id !== "NOASSERTION"
        ? license.spdx_id
        : typeof license?.name === "string"
        ? license.name
        : null,
    updatedAt: typeof raw.pushed_at === "string" ? raw.pushed_at : typeof raw.updated_at === "string" ? raw.updated_at : null,
    createdAt: typeof raw.created_at === "string" ? raw.created_at : null,
    htmlUrl: typeof raw.html_url === "string" ? raw.html_url : "",
    archived: Boolean(raw.archived),
  };

  const frameworks = detectFrameworks(topics);
  return {
    ...base,
    frameworks,
    reliabilityScore: computeReliabilityScore({ ...base, frameworks, reliabilityScore: 0, trendingScore: 0 }),
    trendingScore: computeTrendingScore({ ...base, frameworks, reliabilityScore: 0, trendingScore: 0 }),
  };
}
