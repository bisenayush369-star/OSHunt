import { NextResponse } from "next/server";

/**
 * Detail data for a single repo's modal — languages breakdown, top
 * contributors, and a README excerpt. Split from the list route
 * deliberately: the grid should only ever cost ONE request per category,
 * so this heavier per-repo data is fetched on demand when a card is
 * actually opened, not upfront for every card in a page of results.
 */

const REVALIDATE_SECONDS = 600;

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function safeFetchJson(url: string) {
  const res = await fetch(url, { headers: authHeaders(), next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return null;
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

export async function GET(_request: Request, { params }: { params: { owner: string; repo: string } }) {
  const { owner, repo } = params;

  try {
    const [languages, contributors, readme] = await Promise.all([
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/languages`),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=6`),
      safeFetchJson(`https://api.github.com/repos/${owner}/${repo}/readme`),
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
    });
  } catch (error) {
    console.error(`[/api/gems/${owner}/${repo}] failed:`, error);
    return NextResponse.json(
      { error: "fetch_failed", message: "Couldn't load repo detail from GitHub." },
      { status: 502 }
    );
  }
}