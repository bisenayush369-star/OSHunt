import { NextRequest, NextResponse } from "next/server"
import { getGithubAuthHeader } from "@/lib/github"

// This route runs on your server only. The browser calls THIS, not GitHub
// directly — so no personal token is exposed to the client.

export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get("owner")
  const repo = req.nextUrl.searchParams.get("repo")

  if (!owner || !repo) {
    return NextResponse.json({ error: "owner and repo are required" }, { status: 400 })
  }

  try {
    let authHeader = {} as Record<string, string>;
    try {
      authHeader = await getGithubAuthHeader()
    } catch (err) {
      if ((err as any)?.name === "NeedsGithubConnectError") {
        return NextResponse.json({ error: "needs_github_connect" }, { status: 403 });
      }
      throw err;
    }
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
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