import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Export a lightweight `GithubRepo` type used across the UI. The project
// sometimes receives GitHub API objects (snake_case) and sometimes
// normalizes to camelCase; include both shapes to make the type flexible.
export type GithubRepo = {
  // canonical/camelCase
  id?: number | string;
  fullName?: string;
  name?: string;
  owner?: { login?: string; avatar_url?: string; avatarUrl?: string } | null;
  stars?: number;
  forks?: number;
  openIssues?: number;
  createdAt?: string;
  pushedAt?: string;
  language?: string;
  topics?: string[];
  description?: string | null;
  htmlUrl?: string;

  // GitHub API snake_case aliases
  full_name?: string;
  html_url?: string;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  created_at?: string;
  pushed_at?: string;
  node_id?: string;
};

// ==========================================
// 1. OAUTH RATE LIMIT HELPER
// ==========================================
// Prefers the signed-in user's own GitHub token (stored in Postgres Account table)
// so requests count against THEIR 5,000 req/hr rate limit instead of your server limit.
export async function getGithubAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await auth();

    if (session?.user?.id) {
      const account = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: "github" },
        select: { access_token: true },
      });
      if (account?.access_token) {
        return { Authorization: `Bearer ${account.access_token}` };
      }
    }

    if (process.env.GITHUB_TOKEN) {
      return { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` };
    }

    return {};
  } catch (error) {
    if (process.env.GITHUB_TOKEN) {
      return { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` };
    }
    return {};
  }
}

// ==========================================
// 2. STANDARD REPO & ISSUE HELPERS
// ==========================================

// Helper to get basic headers for logged-out API calls
function getBaseHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Searches GitHub repositories by query string.
 * Optimized for live keystroke lookups using OAuth token rate limits.
 */
export async function searchRepos(query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  try {
    const headers = await getGithubAuthHeader();
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(trimmedQuery)}&per_page=10&sort=stars&order=desc`;

    const res = await fetch(url, {
      headers: { ...getBaseHeaders(), ...headers },
      // Cache identical keystroke queries for 30 seconds to save API quota
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      console.error(`GitHub Search API error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("Error searching repos:", error);
    return [];
  }
}

/**
 * Fetches repository metadata (stars, forks, open issues count)
 */
export async function getRepoDetails(owner: string, repo: string) {
  try {
    const headers = await getGithubAuthHeader();
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { ...getBaseHeaders(), ...headers },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(`Error fetching repo details for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Fetches the README.md content of a repository
 */
export async function getRepoReadme(owner: string, repo: string) {
  try {
    const headers = await getGithubAuthHeader();
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers: { ...getBaseHeaders(), ...headers },
    });

    if (!res.ok) return null;
    const data = await res.json();
    
    // GitHub returns README content encoded in Base64
    if (data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch (error) {
    console.error(`Error fetching README for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * Fetches popular repositories for zero-state / trending feeds
 */
export async function fetchPopularRepos(language: string = "javascript") {
  try {
    const headers = await getGithubAuthHeader();
    const query = `language:${language} stars:>1000`;
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
      { headers: { ...getBaseHeaders(), ...headers } }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching popular repos:", error);
    return [];
  }
}

/**
 * Fetches contributor statistics for a repository
 */
export async function getRepoContributors(owner: string, repo: string) {
  try {
    const headers = await getGithubAuthHeader();
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=10`, {
      headers: { ...getBaseHeaders(), ...headers },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch (error) {
    console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Helper to parse clean owner and repo names from a full GitHub URL
 */
export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleanUrl = url.replace("https://api.github.com/repos/", "").replace("https://github.com/", "");
    const parts = cleanUrl.split("/");
    if (parts.length >= 2) {
      return { owner: parts[0], repo: parts[1] };
    }
    return null;
  } catch {
    return null;
  }
}