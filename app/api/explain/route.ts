import { NextRequest, NextResponse } from "next/server"

// This route runs on your server only. The browser calls THIS, not GitHub
// directly — so GITHUB_TOKEN never appears in any client-side network request.

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner")
  const repo = req.nextUrl.searchParams.get("repo")

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    }

    // Only attaches if GITHUB_TOKEN is set — works fine without one too,
    // just at the lower 60/hour unauthenticated rate limit.
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    }

    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })

    if (!ghRes.ok) {
      if (ghRes.status === 404) {
        return NextResponse.json({ error: "Repo not found" }, { status: 404 })
      }
      if (ghRes.status === 403) {
        return NextResponse.json({ error: "GitHub rate limit hit" }, { status: 429 })
      }
      return NextResponse.json({ error: "GitHub lookup failed" }, { status: 502 })
    }

    const data = await ghRes.json()
    return NextResponse.json({
      repoName: data.full_name,
      description: data.description,
      language: data.language,
      topics: data.topics,
    })
  } catch {
    return NextResponse.json({ error: "GitHub lookup failed" }, { status: 502 })
  }
}