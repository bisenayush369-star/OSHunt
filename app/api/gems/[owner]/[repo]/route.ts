import { NextResponse } from "next/server";
import { getGithubAuthHeader } from "@/lib/github";

/**
 * Detail data for a single repo's modal. Still fetched only on demand when a
 * card is opened — the grid itself only ever costs one request. The
 * good-first-issues lookup hits the Issues Search endpoint, which shares
 * GitHub's stricter 10-req/minute search bucket (separate from the 60/hour
 * core bucket) — worth knowing if this fails before the grid's own search
 * call does.
 */

const REVALIDATE_SECONDS = 600;

async function authHeaders(): Promise<Record<string, string>> {
  const authHeader = await getGithubAuthHeader();
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
  };
}

async function safeFetchJson(url: string) {
  const res = await fetch(url, { headers: await authHeaders(), next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return null; // covers 404s (e.g. no releases yet) as well as real failures
  return res.json();
}

function languagePercentages(bytesByLanguage: Record<string, number> | null) {
  if (!bytesByLanguage) return [];
  const total = Object.values(bytesByLanguage).reduce((sum, n) => sum + n, 0);
  if (!total) return [];
  return Object.entries(bytesByLanguage)
    .map(([language, bytes]) => ({ language, percent: Math.round((bytes / total) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);
}

function decodeReadme(readme: any): string | null {
  if (!readme?.content) return null;
  try {
    const binary = Buffer.from(readme.content, "base64").toString("utf-8");
    const stripped = binary
      .replace(/```[\s\S]*?```/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[([^\]]*)\]\(.*?\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/[*_~`>]/g, "")
      .replace(/\r?\n{2,}/g, " ")
      .replace(/\r?\n/g, " ")
      .trim();
    return stripped.length > 600 ? `${stripped.slice(0, 600).trim()}…` : stripped;
  } catch {
    return null;
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ owner: string; repo: string }> }) {
  const { owner, repo } = await params;

  try {
    const [languages, contributors, readme, release, commits, issues] = await Promise.all([
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/languages`),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=6`),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/readme`),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/releases/latest`),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`),
      safeFetchJson(
        `https://api.github.com/search/issues?q=${encodeURIComponent(`repo:${owner}/${repo} is:issue is:open label:"good first issue"`)}`
      ),
    ]);

    return NextResponse.json({
      languages: languagePercentages(languages),
      contributors: Array.isArray(contributors)
        ? contributors.map((c: any) => ({
            login: c.login,
            avatarUrl: c.avatar_url,
            htmlUrl: c.html_url,
            contributions: c.contributions,
          }))
        : [],
      readmeExcerpt: decodeReadme(readme),
      latestRelease: release
        ? {
            tagName: release.tag_name,
            name: release.name || null,
            publishedAt: release.published_at || null,
            htmlUrl: release.html_url,
          }
        : null,
      recentCommits: Array.isArray(commits)
        ? commits.map((c: any) => ({
            sha: c.sha?.slice(0, 7) ?? "",
            message: (c.commit?.message ?? "").split("\n")[0],
            authorLogin: c.author?.login ?? null,
            date: c.commit?.author?.date ?? null,
          }))
        : [],
      goodFirstIssues: issues
        ? { count: issues.total_count ?? 0, sampleUrl: issues.items?.[0]?.html_url ?? null }
        : { count: 0, sampleUrl: null },
    });
  } catch (error) {
    console.error(`[/api/gems/${owner}/${repo}] failed:`, error);
    return NextResponse.json(
      { error: "fetch_failed", message: "Couldn't load repo detail from GitHub." },
      { status: 502 }
    );
  }
}
