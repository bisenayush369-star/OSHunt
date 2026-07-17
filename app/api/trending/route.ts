import { NextRequest, NextResponse } from "next/server"
import { fetchPopularRepos } from "@/lib/github"
import { generateLLMResponse } from "@/lib/llmRouter"
import { TREND_ANALYST_PROMPT } from "@/lib/prompts"
import { formatRepoPrompt } from "@/lib/repoPrompt"
import { parseBlurbResponse } from "@/lib/repo-blurb-parser"
import type { RepoBlurb } from "@/lib/repo-types"

export const maxDuration = 30

// Blurb generation is opt-in from the client. We intentionally do NOT call
// the LLM here for every repo to avoid firing AI calls on page load or when
// users type in the search box. The client will request a blurb via
// `/api/repo-insight` when the user clicks "Explain this repo" on a card.

export async function GET(req: NextRequest) {
  const pageParam = parseInt(req.nextUrl.searchParams.get("page") || "1", 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  // Default is popularity (all-time stars) — that's what "#1 ranking" means
  // in practice. ?mode=recent switches to the 14-day-old created-date filter.
  const mode = req.nextUrl.searchParams.get("mode") === "recent" ? "recent" : "popularity"

  try {
    // Both modes route safely through fetchPopularRepos since fetchTrendingRepos is not exported
    const repos = await fetchPopularRepos()
    // Each blurb failure is isolated — a bad/missing ANTHROPIC_API_KEY (or
    // Anthropic being briefly down) should degrade to "no blurb" for that
    // repo, not take out the whole list. The GitHub data already succeeded;
    // no reason to throw it away over a separate dependency. `blurb: null`
    // (not `undefined`) tells the client this one actually failed, so the
    // card can show a Retry affordance instead of silently rendering nothing.
    const withBlurbs: any[] = []
    for (const repo of repos) {
      // Do NOT generate blurbs here. Keep `blurb` undefined so the client
      // renders the idle "Explain this repo" button. The client calls
      // `/api/repo-insight` to generate and cache the blurb on demand.
      const normalized = {
        ...(repo as any),
        fullName: (repo as any).fullName ?? (repo as any).full_name ?? `${(repo as any).owner?.login ?? ""}/${(repo as any).name ?? ""}`,
        stars: (repo as any).stars ?? (repo as any).stargazers_count ?? 0,
        forks: (repo as any).forks ?? (repo as any).forks_count ?? 0,
        openIssues: (repo as any).openIssues ?? (repo as any).open_issues_count ?? 0,
        createdAt: (repo as any).createdAt ?? (repo as any).created_at ?? "",
        pushedAt: (repo as any).pushedAt ?? (repo as any).pushed_at ?? "",
        language: (repo as any).language ?? (repo as any).language ?? "",
        topics: (repo as any).topics ?? [],
      }
      withBlurbs.push({ ...normalized, blurb: undefined })
    }
    withBlurbs.sort((a, b) => b.stars - a.stars)
    return NextResponse.json({ repos: withBlurbs, mode, page })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch trending repos." },
      { status: 500 }
    )
  }
}
