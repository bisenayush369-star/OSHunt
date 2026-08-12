import { NextRequest, NextResponse } from "next/server";
import { getGithubAuthHeader } from "@/lib/github";

// ─────────────────────────────────────────────────────────────────────────
// On-demand, one repo at a time — same principle as the blurb generation
// elsewhere: don't fire work nobody asked for yet.
//
// Four independent GitHub REST calls, run in parallel via Promise.allSettled
// so a repo with no README or zero contributors (both normal, especially on
// a fresh repo) degrades to an empty section instead of failing the other
// three. Nothing here is invented — an empty languages array or a null
// readme just means GitHub didn't have one, and the UI says so plainly.
// ─────────────────────────────────────────────────────────────────────────

interface LanguageBreakdown {
  name: string;
  bytes: number;
  percentage: number;
}
interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}
interface ContributorSummary {
  login: string;
  avatarUrl: string;
  contributions: number;
  url: string;
}
interface RepoDetail {
  languages: LanguageBreakdown[];
  readme: string | null;
  commits: CommitSummary[];
  contributors: ContributorSummary[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json({ error: "`owner` and `repo` are required." }, { status: 400 });
  }

  const authHeader = await getGithubAuthHeader();
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
  };

  try {
    const [languagesResult, readmeResult, commitsResult, contributorsResult] = await Promise.allSettled([
      fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, { headers, next: { revalidate: 300 } }).then((r) => (r.ok ? r.json() : {})),
      fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers, next: { revalidate: 300 } }).then((r) => (r.ok ? r.json() : null)),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, { headers, next: { revalidate: 120 } }).then((r) => (r.ok ? r.json() : [])),
      fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=5`, { headers, next: { revalidate: 300 } }).then((r) => (r.ok ? r.json() : [])),
    ]);

    const languageBytes: Record<string, number> = languagesResult.status === "fulfilled" ? languagesResult.value : {};
    const totalBytes = Object.values(languageBytes).reduce((acc, n) => acc + n, 0);
    const languages: LanguageBreakdown[] = Object.entries(languageBytes)
      .map(([name, bytes]) => ({
        name,
        bytes,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);

    let readme: string | null = null;
    if (readmeResult.status === "fulfilled" && readmeResult.value?.content) {
      try {
        readme = Buffer.from(readmeResult.value.content, "base64").toString("utf-8");
      } catch {
        readme = null;
      }
    }

    const rawCommits = commitsResult.status === "fulfilled" && Array.isArray(commitsResult.value) ? commitsResult.value : [];
    const commits: CommitSummary[] = rawCommits.map((c: any) => ({
      sha: c.sha?.slice(0, 7) || "",
      message: (c.commit?.message || "").split("\n")[0].slice(0, 90),
      author: c.commit?.author?.name || c.author?.login || "Unknown",
      date: c.commit?.author?.date || "",
      url: c.html_url || "",
    }));

    const rawContributors = contributorsResult.status === "fulfilled" && Array.isArray(contributorsResult.value) ? contributorsResult.value : [];
    const contributors: ContributorSummary[] = rawContributors.map((c: any) => ({
      login: c.login || "unknown",
      avatarUrl: c.avatar_url || "",
      contributions: c.contributions || 0,
      url: c.html_url || "",
    }));

    const result: RepoDetail = { languages, readme, commits, contributors };
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to load repository detail." }, { status: 500 });
  }
}
