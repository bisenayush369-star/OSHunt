import { NextRequest, NextResponse } from "next/server"
import { searchRepos } from "@/lib/github"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || ""
  try {
    const items = await searchRepos(q)
    // Normalize to include `fullName` for client convenience
    const repos = (items || []).map((r: any) => ({
      ...(r || {}),
      fullName: r.fullName ?? r.full_name ?? `${r.owner?.login ?? ""}/${r.name ?? ""}`,
      stars: r.stars ?? r.stargazers_count ?? 0,
      forks: r.forks ?? r.forks_count ?? 0,
      openIssues: r.openIssues ?? r.open_issues_count ?? 0,
      createdAt: r.createdAt ?? r.created_at ?? "",
      pushedAt: r.pushedAt ?? r.pushed_at ?? "",
      language: r.language ?? "",
      topics: r.topics ?? [],
    }))
    return NextResponse.json({ repos })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed" }, { status: 500 })
  }
}
