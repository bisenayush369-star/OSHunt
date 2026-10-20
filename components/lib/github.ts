import { auth } from "@/components/lib/auth";
import { decrypt } from "@/components/lib/encryption";
import { prisma } from "@/components/lib/prisma";
import { trackUsage } from "./admin/usage";

export class NeedsGithubConnectError extends Error {
  constructor() {
    super("User needs to connect a GitHub account");
    this.name = "NeedsGithubConnectError";
  }
}

/**
 * Thrown by `searchRepos` when GitHub answers with an error (or can't be reached). `message` is already
 * written for end users, so routes can pass it straight to the UI; the fields let a route choose a status
 * code or show a countdown without re-parsing GitHub's response.
 */
export class GithubApiError extends Error {
  /** HTTP status from GitHub (502 / 504 when GitHub couldn't be reached or timed out). */
  readonly status: number;
  /** True for primary and secondary rate limits. */
  readonly rateLimited: boolean;
  /** When the limit resets, in ms since the epoch — if GitHub said. */
  readonly resetAt: number | null;
  /** Seconds GitHub asked us to wait (`Retry-After`, sent with secondary limits). */
  readonly retryAfterSeconds: number | null;

  constructor(
    message: string,
    details: { status: number; rateLimited?: boolean; resetAt?: number | null; retryAfterSeconds?: number | null },
  ) {
    super(message);
    this.name = "GithubApiError";
    this.status = details.status;
    this.rateLimited = details.rateLimited ?? false;
    this.resetAt = details.resetAt ?? null;
    this.retryAfterSeconds = details.retryAfterSeconds ?? null;
  }
}

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
type GithubAuth = {
  headers: Record<string, string>;
  /** Signed-in user, if any — reused for usage tracking so each call does ONE session lookup, not two. */
  userId: string | null;
};

// Prefers the signed-in user's own GitHub access, first from the connected
// GitHub account stored for this app, then from the standard NextAuth GitHub
// account token. No personal server-side PAT is required.
async function resolveGithubAuth(): Promise<GithubAuth> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;

    if (userId) {
      const connection = await prisma.gitHubConnection.findUnique({
        where: { userId },
        select: { accessToken: true, revokedAt: true },
      });

      if (connection?.accessToken && !connection.revokedAt) {
        try {
          return { headers: { Authorization: `Bearer ${decrypt(connection.accessToken)}` }, userId };
        } catch (error) {
          // A token that can't be decrypted (rotated key, corrupted row) used to drop the request all the
          // way down to anonymous access (60 requests/hour). Try the other sources first.
          console.warn("[github] Could not decrypt the stored GitHub token; trying other sources.", error);
        }
      }

      const account = await prisma.account.findFirst({
        where: { userId, provider: "github" },
        select: { access_token: true },
      });
      if (account?.access_token) {
        return { headers: { Authorization: `Bearer ${account.access_token}` }, userId };
      }

      if (process.env.GITHUB_TOKEN) {
        return { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }, userId };
      }

      // A user is signed in but we couldn't find any GitHub auth for them
      // (no connected GitHub, no NextAuth github account, and no trial left),
      // surface a specific error so server routes can return a clear response
      // the client can use to prompt the user to connect their GitHub account.
      throw new NeedsGithubConnectError();
    }

    console.warn("[github] No signed-in GitHub token available; requests will run unauthenticated.");
    return { headers: {}, userId: null };
  } catch (error) {
    // If a caller requested a hard failure (we signal this with a
    // NeedsGithubConnectError), re-throw so routes that want an explicit
    // "needs_github_connect" response can catch it and return a 403.
    if (error instanceof NeedsGithubConnectError || (error as Error | undefined)?.name === "NeedsGithubConnectError") {
      throw error;
    }

    console.warn("[github] GitHub auth lookup failed; requests will run unauthenticated.", error);
    return { headers: {}, userId };
  }
}

export async function getGithubAuthHeader(): Promise<Record<string, string>> {
  return (await resolveGithubAuth()).headers;
}

// ==========================================
// 2. REQUEST PLUMBING
// ==========================================

// Accept header shared by every call below. Auth is decided in exactly one
// place — resolveGithubAuth() — and spread in after this at each call
// site, so it always has the final say. The version header pins the REST API
// behaviour (GitHub's recommendation) so a future default change can't alter responses.
function getBaseHeaders(): Record<string, string> {
  return { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
}

const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 250;
const TRANSIENT_STATUSES = new Set([502, 503, 504]);
// GitHub rejects search queries longer than 256 characters with a 422.
const MAX_SEARCH_QUERY_LENGTH = 256;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isTimeout = (error: unknown) => {
  const name = (error as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
};

// Every call gets a hard timeout (a stalled connection used to hang the route until the host killed it) and
// ONE quick retry for transient trouble: a GitHub 502/503/504, or the connection failing outright. These are
// all GETs, so retrying is safe. Timeouts are not retried — a second 10s wait would defeat the point.
async function githubFetch(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (attempt === 0 && TRANSIENT_STATUSES.has(res.status)) {
        // Free the connection held by the discarded response before trying again.
        await res.body?.cancel().catch(() => {});
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      return res;
    } catch (error) {
      if (attempt === 0 && !isTimeout(error)) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }
}

async function trackedGithubRequest(
  endpoint: string,
  url: string,
  init: RequestInit,
  userId: string | null,
): Promise<Response> {
  return trackUsage(
    { service: "github", provider: "github-rest", endpoint, userId },
    () => githubFetch(url, init),
    (response) => ({ status: response.status, ok: response.ok }),
  );
}

function formatWait(seconds: number): string {
  if (seconds < 60) {
    const whole = Math.max(1, Math.ceil(seconds));
    return whole === 1 ? "1 second" : `${whole} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

// Turns GitHub's error response into something a person can act on. Before, a rate limit surfaced as
// "API rate limit exceeded for user ID 123…" and a bad query as the bare word "Validation Failed".
async function githubErrorFromResponse(res: Response, label: string): Promise<GithubApiError> {
  const body = await res.json().catch(() => null);
  console.error(`GitHub ${label} API error: ${res.status} ${res.statusText}`, body);

  const apiMessage = typeof body?.message === "string" ? body.message : "";
  const resetSeconds = Number(res.headers.get("x-ratelimit-reset"));
  const resetAt = Number.isFinite(resetSeconds) && resetSeconds > 0 ? resetSeconds * 1000 : null;
  const retryAfter = Number(res.headers.get("retry-after"));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null;

  const rateLimited =
    res.status === 429 ||
    (res.status === 403 &&
      (res.headers.get("x-ratelimit-remaining") === "0" || retryAfterSeconds !== null || /rate limit|abuse|secondary/i.test(apiMessage)));

  let message: string;
  if (rateLimited) {
    const waitSeconds = retryAfterSeconds ?? (resetAt ? Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) : null);
    message = waitSeconds
      ? `GitHub rate limit reached. Try again in ${formatWait(waitSeconds)}.`
      : "GitHub rate limit reached. Try again in a few minutes.";
  } else if (res.status === 401) {
    message = "GitHub rejected the saved access token. Reconnect your GitHub account and try again.";
  } else if (res.status === 422) {
    message = "GitHub couldn't run that search. Try different keywords.";
  } else if (res.status >= 500) {
    message = "GitHub is having trouble right now. Please try again in a moment.";
  } else {
    message = apiMessage || `GitHub ${label} failed (${res.status})`;
  }

  return new GithubApiError(message, { status: res.status, rateLimited, resetAt, retryAfterSeconds });
}

function githubErrorFromFetchFailure(error: unknown): GithubApiError {
  console.error("GitHub request failed before a response arrived:", error);
  return isTimeout(error)
    ? new GithubApiError("GitHub took too long to respond. Please try again.", { status: 504 })
    : new GithubApiError("Couldn't reach GitHub. Check your connection and try again.", { status: 502 });
}

// owner / repo end up in a URL path, so only real GitHub names are allowed through, percent-encoded. Without
// this, `repo = "../../user/repos"` turned `/repos/{owner}/{repo}` into a different API endpoint, called
// with the visitor's (or the server's) token.
const GITHUB_NAME = /^[A-Za-z0-9._-]{1,100}$/;
const isGithubName = (value: unknown): value is string =>
  typeof value === "string" && GITHUB_NAME.test(value) && value !== "." && value !== "..";

function repoPath(owner: string, repo: string): string | null {
  if (!isGithubName(owner) || !isGithubName(repo)) {
    console.warn(`[github] Ignoring invalid repository reference: ${JSON.stringify(`${owner}/${repo}`)}`);
    return null;
  }
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}

// ==========================================
// 3. STANDARD REPO & ISSUE HELPERS
// ==========================================

// Makes free text safe to put in a URL and a search query: lone surrogates become U+FFFD (encodeURIComponent
// throws a URIError on them, which used to surface as a 500 when someone pasted half an emoji) and control
// characters become spaces. One pass, no regex, so it works with any TypeScript target.
function stripUnsafeCharacters(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += text.charAt(i) + text.charAt(i + 1);
        i++;
      } else {
        out += "\uFFFD";
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      out += "\uFFFD";
    } else if (code < 0x20 || code === 0x7f) {
      out += " ";
    } else {
      out += text.charAt(i);
    }
  }
  return out;
}

// Counted in characters, not UTF-16 units, so the cut can never split an emoji in two.
const truncate = (text: string, max: number) => Array.from(text).slice(0, max).join("");

const cleanSearchQuery = (query: unknown): string =>
  typeof query === "string" ? truncate(stripUnsafeCharacters(query).trim(), MAX_SEARCH_QUERY_LENGTH).trim() : "";

/**
 * Searches GitHub repositories by query string.
 * Optimized for live keystroke lookups using OAuth token rate limits.
 * Throws a `GithubApiError` (user-readable `message`) when GitHub refuses or can't be reached.
 */
export async function searchRepos(query: string) {
  const trimmedQuery = cleanSearchQuery(query);
  if (!trimmedQuery) return [];

  const { headers, userId } = await resolveGithubAuth();
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(trimmedQuery)}&per_page=10&sort=stars&order=desc`;

  let res: Response;
  try {
    res = await trackedGithubRequest(
      "GET /search/repositories",
      url,
      {
        headers: { ...getBaseHeaders(), ...headers },
        // Cache identical keystroke queries for 30 seconds to save API quota
        next: { revalidate: 30 },
      },
      userId,
    );
  } catch (error) {
    throw githubErrorFromFetchFailure(error);
  }

  if (!res.ok) {
    // Throw instead of returning [] — the route calling this already has
    // a try/catch that turns a thrown error into a proper { error }
    // response, which the UI has a real retry state for. Swallowing it
    // here made a 403/429 look exactly like "no repos match", so a rate
    // limit or missing token failed silently instead of visibly.
    throw await githubErrorFromResponse(res, "search");
  }

  let data: { items?: unknown } | null;
  try {
    data = await res.json();
  } catch (error) {
    // A 200 whose body isn't JSON is a broken response, not "no results" — surface it like any other failure.
    console.error("GitHub search API returned an unreadable body:", error);
    throw new GithubApiError("GitHub sent a response we couldn't read. Please try again.", { status: 502 });
  }
  return Array.isArray(data?.items) ? data.items : [];
}

/**
 * Fetches repository metadata (stars, forks, open issues count)
 */
export async function getRepoDetails(owner: string, repo: string) {
  try {
    const path = repoPath(owner, repo);
    if (!path) return null;
    const { headers, userId } = await resolveGithubAuth();
    const res = await trackedGithubRequest(
      `GET /repos/${owner}/${repo}`,
      `https://api.github.com/repos/${path}`,
      {
        headers: { ...getBaseHeaders(), ...headers },
        next: { revalidate: 3600 }, // Cache for 1 hour
      },
      userId,
    );

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
    const path = repoPath(owner, repo);
    if (!path) return null;
    const { headers, userId } = await resolveGithubAuth();
    const res = await trackedGithubRequest(
      `GET /repos/${owner}/${repo}/readme`,
      `https://api.github.com/repos/${path}/readme`,
      {
        headers: { ...getBaseHeaders(), ...headers },
        next: { revalidate: 3600 }, // READMEs change rarely; opening the same repo twice shouldn't cost two API calls
      },
      userId,
    );

    if (!res.ok) return null;
    const data = await res.json();

    // GitHub returns README content encoded in Base64
    if (typeof data?.content === "string" && data.content) {
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
    // `language` goes into a search *qualifier*: strip anything that could end the qualifier or add another
    // one, and quote names with spaces ("Jupyter Notebook") — unquoted, only the first word was matched.
    const cleanLanguage =
      truncate(
        (typeof language === "string" ? stripUnsafeCharacters(language) : "").replace(/["':]/g, "").replace(/\s+/g, " ").trim(),
        60,
      ).trim() || "javascript";
    const qualifier = cleanLanguage.includes(" ") ? `language:"${cleanLanguage}"` : `language:${cleanLanguage}`;
    const query = `${qualifier} stars:>1000`;

    const { headers, userId } = await resolveGithubAuth();
    const res = await trackedGithubRequest(
      "GET /search/repositories",
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
      {
        headers: { ...getBaseHeaders(), ...headers },
        next: { revalidate: 600 }, // the same feed for everyone; 10 minutes of staleness is invisible
      },
      userId,
    );

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.items) ? data.items : [];
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
    const path = repoPath(owner, repo);
    if (!path) return [];
    const { headers, userId } = await resolveGithubAuth();
    const res = await trackedGithubRequest(
      `GET /repos/${owner}/${repo}/contributors`,
      `https://api.github.com/repos/${path}/contributors?per_page=10`,
      {
        headers: { ...getBaseHeaders(), ...headers },
        next: { revalidate: 3600 },
      },
      userId,
    );

    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Error fetching contributors for ${owner}/${repo}:`, error);
    return [];
  }
}

/**
 * Helper to parse clean owner and repo names from a GitHub reference. Accepts
 *   https://github.com/owner/repo[/anything][?query][#hash]   (http, www., or no scheme)
 *   https://api.github.com/repos/owner/repo[/anything]
 *   git@github.com:owner/repo.git  /  ssh://git@github.com/owner/repo.git
 *   owner/repo
 * and strips a trailing ".git". Returns null for anything else (other hosts, API URLs that
 * aren't repositories, names GitHub wouldn't allow).
 */
export function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  if (typeof url !== "string") return null;
  const input = url.trim();
  if (!input) return null;

  let path: string;
  const ssh = /^git@github\.com:(.+)$/i.exec(input);
  if (ssh) {
    path = ssh[1];
  } else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) || /^(?:www\.|api\.)?github\.com\//i.test(input)) {
    let parsed: URL;
    try {
      parsed = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
      return null;
    }
    if (!["https:", "http:", "ssh:", "git:"].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "github.com" || host === "www.github.com") {
      path = parsed.pathname;
    } else if (host === "api.github.com" && parsed.pathname.startsWith("/repos/")) {
      path = parsed.pathname.slice("/repos/".length);
    } else {
      return null;
    }
  } else {
    // "owner/repo" shorthand
    path = input.split(/[?#]/)[0];
  }

  const [owner, rawRepo] = path.split("/").filter(Boolean);
  if (!owner || !rawRepo) return null;
  const repo = rawRepo.replace(/\.git$/i, "");
  return isGithubName(owner) && isGithubName(repo) ? { owner, repo } : null;
}