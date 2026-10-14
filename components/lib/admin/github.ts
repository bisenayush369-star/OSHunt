import type { GitHubEvent, GitHubSnapshot } from "./contract";
import { trackUsage } from "./usage";

/**
 * Live GitHub data for the admin user sheet. Server only (route handlers).
 *
 * - Unauthenticated GitHub API calls are limited to 60/hour/IP. Set GITHUB_TOKEN
 *   (no scopes needed for public data) to raise that to 5,000/hour.
 * - Responses are cached for 5 minutes through Next's fetch cache.
 * - `login` is validated against GitHub's username rules before it reaches a URL.
 */

const API = "https://api.github.com";
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

type GhUser = {
  login: string;
  avatar_url: string;
  html_url: string;
  followers: number;
  public_repos: number;
  created_at: string;
};
type GhEvent = { id: string; type: string; repo?: { name?: string }; created_at: string };

type Result<T> = { ok: true; data: T } | { ok: false; status: number };

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "oshunt-admin",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function get<T>(path: string, endpoint: string): Promise<Result<T>> {
  try {
    // Metered: shows up in the "API calls" graph. Calls served from Next's cache may be counted
    // even though GitHub never saw them.
    const res = await trackUsage(
      { service: "github", provider: "github-rest", endpoint },
      () =>
        fetch(`${API}${path}`, {
          headers: requestHeaders(),
          next: { revalidate: 300 },
          signal: AbortSignal.timeout(6_000),
        }),
      (r) => ({ status: r.status, ok: r.ok }),
    );
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: 0 };
  }
}

function explain(status: number): string {
  if (status === 404) return "GitHub account not found.";
  if (status === 403 || status === 429) return "GitHub rate limit reached. Set GITHUB_TOKEN to raise it.";
  return "GitHub is unreachable right now.";
}

export async function getGitHubSnapshot(login: string): Promise<GitHubSnapshot> {
  if (!LOGIN_RE.test(login)) return { error: "That is not a valid GitHub username." };

  const [profile, events] = await Promise.all([
    get<GhUser>(`/users/${login}`, "GET /users/{login}"),
    get<GhEvent[]>(`/users/${login}/events/public?per_page=8`, "GET /users/{login}/events/public"),
  ]);

  if (!profile.ok) return { error: explain(profile.status) };

  const recent: GitHubEvent[] = events.ok
    ? events.data.map((event) => ({
        id: event.id,
        type: event.type,
        repo: event.repo?.name,
        at: event.created_at,
      }))
    : [];

  return {
    login: profile.data.login,
    avatar: profile.data.avatar_url,
    url: profile.data.html_url,
    followers: profile.data.followers,
    repos: profile.data.public_repos,
    createdAt: profile.data.created_at,
    events: recent,
  };
}
