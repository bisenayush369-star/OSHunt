import { NextRequest, NextResponse } from "next/server";

/**
 * Live GitHub-backed discovery feed. Replaces the old SEED_GEMS-based route
 * entirely — nothing here reads from a local array.
 *
 * Auth: set GITHUB_TOKEN in your environment (a classic PAT with no scopes
 * needed, or a fine-grained token) to raise the rate limit from 60 req/hour
 * to 5,000 req/hour. Without it this route still works, it just shares
 * GitHub's public per-IP limit — fine for development, not for production
 * traffic. Get one at https://github.com/settings/tokens.
 *
 * Caching: uses Next.js's native `fetch` cache via `next.revalidate` rather
 * than unstable_cache, since this route has nothing to cache *but* the
 * fetch call itself — the idiomatic App Router approach for exactly this
 * case. Each category is cached independently for 5 minutes; GitHub search
 * results don't change fast enough to justify shorter, and any shorter
 * risks burning the rate limit on repeat visits.
 */

const REVALIDATE_SECONDS = 300;

const CATEGORY_QUERIES: Record<string, { query: string; sort: string }> = {
  trending: { query: "stars:>1000 pushed:>{recent}", sort: "stars" },
  "ai-ml": { query: "topic:machine-learning stars:>500", sort: "stars" },
  frontend: { query: "topic:frontend stars:>500", sort: "stars" },
  backend: { query: "topic:backend stars:>500", sort: "stars" },
  devops: { query: "topic:devops stars:>500", sort: "stars" },
  cli: { query: "topic:cli stars:>300", sort: "stars" },
  security: { query: "topic:security stars:>500", sort: "stars" },
  "self-hosted": { query: "topic:selfhosted stars:>500", sort: "stars" },
};

function recentDateISO(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function buildQuery(categoryId: string): string {
  const entry = CATEGORY_QUERIES[categoryId] ?? CATEGORY_QUERIES.trending;
  return entry.query.replace("{recent}", recentDateISO(30));
}

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("category") || "trending";
  const perPage = Math.min(Number(request.nextUrl.searchParams.get("per_page")) || 12, 30);
  const sort = CATEGORY_QUERIES[categoryId]?.sort ?? "stars";
  const q = buildQuery(categoryId);

  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(
    q
  )}&sort=${sort}&order=desc&per_page=${perPage}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const resetHeader = res.headers.get("x-ratelimit-reset");
      const resetInSeconds = resetHeader
        ? Math.max(0, Number(resetHeader) - Math.floor(Date.now() / 1000))
        : null;
      return NextResponse.json(
        {
          error: "github_rate_limited",
          message: process.env.GITHUB_TOKEN
            ? "GitHub API rate limit reached even with a token — unusual, check token validity."
            : "GitHub's public rate limit was hit. Set GITHUB_TOKEN in your environment to raise it from 60/hour to 5,000/hour.",
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

    return NextResponse.json({
      category: categoryId,
      totalCount: data.total_count ?? items.length,
      items,
    });
  } catch (error) {
    console.error("[/api/gems] failed:", error);
    return NextResponse.json(
      { error: "fetch_failed", message: "Couldn't reach the GitHub API." },
      { status: 502 }
    );
  }
}

// Shapes GitHub's search-result item into exactly what the frontend cards need.
// Kept as a named, reusable function (not inlined) since /api/gems/[owner]/[repo]
// needs to normalize a single full repo object with this same set of fields.
function normalizeRepo(raw: any) {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: raw.owner?.login,
    ownerAvatar: raw.owner?.avatar_url,
    ownerType: raw.owner?.type,
    description: raw.description || null,
    homepage: raw.homepage || null,
    language: raw.language,
    topics: raw.topics || [],
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    openIssues: raw.open_issues_count,
    watchers: raw.watchers_count,
    license: raw.license?.spdx_id && raw.license.spdx_id !== "NOASSERTION" ? raw.license.spdx_id : raw.license?.name || null,
    defaultBranch: raw.default_branch,
    updatedAt: raw.pushed_at || raw.updated_at,
    createdAt: raw.created_at,
    htmlUrl: raw.html_url,
    archived: Boolean(raw.archived),
  };
}