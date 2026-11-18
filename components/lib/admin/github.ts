import type { GitHubEvent, GitHubSnapshot } from "./contract";
import { trackUsage } from "./usage";

/**
 * Live GitHub data for the account drawer. Server only (route handlers).
 *
 * - Unauthenticated GitHub API calls are limited to 60 per hour per IP. Set GITHUB_TOKEN (no scopes needed for
 *   public data) to raise that to 5,000 per hour. The token is only ever sent to api.github.com.
 * - Answers are cached here for 5 minutes (failures for 1 minute), so reopening a drawer costs nothing.
 * - `login` is checked against GitHub's username rules before it gets near a URL.
 * - Calls are metered through trackUsage, so they show up in the "API calls" chart.
 */

const API = "https://api.github.com";
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const OK_MS = 5 * 60_000;
const FAIL_MS = 60_000;
const TIMEOUT_MS = 4_000;

type GhUser = { login: string; avatar_url: string; html_url: string; followers: number; public_repos: number; created_at: string };
type GhEvent = { id: string; type: string; repo?: { name?: string }; created_at: string };
type Result<T> = { ok: true; data: T } | { ok: false; status: number };

const cache = new Map<string, { until: number; value: GitHubSnapshot }>();

function headers(): Record<string, string> {
  const out: Record<string, string> = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "oshunt-admin" };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) out.Authorization = `Bearer ${token}`;
  return out;
}

async function get<T>(path: string, endpoint: string): Promise<Result<T>> {
  try {
    const res = await trackUsage(
      { service: "github", provider: "github-rest", endpoint },
      () => fetch(`${API}${path}`, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) }),
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

export async function getGitHubSnapshot(login: string, now = Date.now()): Promise<GitHubSnapshot> {
  const name = login.trim();
  if (!LOGIN_RE.test(name)) return { error: "This is not a valid GitHub username." };

  const key = name.toLowerCase();
  const hit = cache.get(key);
  if (hit && hit.until > now) return hit.value;

  const [profile, events] = await Promise.all([
    get<GhUser>(`/users/${encodeURIComponent(name)}`, "GET /users/{user}"),
    get<GhEvent[]>(`/users/${encodeURIComponent(name)}/events/public?per_page=10`, "GET /users/{user}/events/public"),
  ]);

  let value: GitHubSnapshot;
  if (!profile.ok) {
    value = { error: explain(profile.status) };
  } else {
    const list: GitHubEvent[] = events.ok
      ? events.data.slice(0, 10).map((e) => ({ id: String(e.id), type: e.type, repo: e.repo?.name, at: e.created_at }))
      : [];
    value = {
      login: profile.data.login,
      avatar: profile.data.avatar_url,
      url: profile.data.html_url,
      followers: profile.data.followers,
      repos: profile.data.public_repos,
      createdAt: profile.data.created_at,
      events: list,
    };
  }

  if (cache.size > 500) cache.clear();
  cache.set(key, { until: now + ("error" in value ? FAIL_MS : OK_MS), value });
  return value;
}
