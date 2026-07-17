import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGithubAuthHeader } from "@/lib/github";

// Feature 3: Check if a repo is active
async function checkRepoHealth(repoUrl: string, githubHeaders: Record<string, string>): Promise<boolean> {
  const repoName = repoUrl.replace("https://api.github.com/repos/", "");
  
  try {
    const cached = await prisma.repoHealthCache.findUnique({
      where: { repoName }
    });

    if (cached && (Date.now() - new Date(cached.lastChecked).getTime()) < 86400000) {
      return cached.isActive;
    }

    const res = await fetch(`https://api.github.com/repos/${repoName}/pulls?state=closed&per_page=5`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...githubHeaders
      }
    });

    if (!res.ok) return true; 
    const pulls = await res.json();

    let isActive = false;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    for (const pr of pulls) {
      if (pr.merged_at && new Date(pr.merged_at) > sixMonthsAgo) {
        isActive = true;
        break;
      }
    }

    await prisma.repoHealthCache.upsert({
      where: { repoName },
      update: { isActive, lastChecked: new Date() },
      create: { repoName, isActive, lastChecked: new Date() }
    });

    return isActive;
  } catch (error) {
    return true; 
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get("language") || "javascript";
    const difficulty = searchParams.get("difficulty") || "easy";
    const page = searchParams.get("page") || "1";
    const bountyOnly = searchParams.get("bounty") === "true";

    // 1. Get Auth Headers
    const githubHeaders = await getGithubAuthHeader();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      ...githubHeaders,
    };

    // 2. Query Construction
    const difficultyMap: Record<string, string> = {
      easy: 'label:"good first issue"',
      medium: 'label:"help wanted"',
      hard: 'label:"complex" OR label:"bug"',
    };

    let query = `language:${language} state:open ${difficultyMap[difficulty] || ""}`;

    if (bountyOnly) {
      query += ` (label:bounty OR "bounty" in:title OR "bounty" in:body)`;
    }

    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=15&page=${page}`;
    
    const res = await fetch(url, { headers });

    if (res.status === 403 || res.status === 429) {
      return NextResponse.json({ error: "Rate limit reached.", items: [] }, { status: 429 });
    }

    if (!res.ok) {
      return NextResponse.json({ error: "GitHub API error", items: [] }, { status: res.status });
    }

    const data = await res.json();
    let issues = data.items || [];

    // 3. Add Repo Health Status
    const healthChecks = await Promise.all(
      issues.map((issue: any) => checkRepoHealth(issue.repository_url, githubHeaders))
    );

    issues = issues.map((issue: any, index: number) => ({
      ...issue,
      isActiveRepo: healthChecks[index]
    }));

    // ALL PAYWALL LOGIC REMOVED. Returning raw data.
    return NextResponse.json({ items: issues });

  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json({ error: "Failed to fetch issues", items: [] }, { status: 500 });
  }
}