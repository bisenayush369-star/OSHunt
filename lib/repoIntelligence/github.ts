import axios from "axios"
import { GithubApiError, type GitTreeEntry, type RepoMetadata } from "./types"

const DEFAULT_TIMEOUT_MS = 10_000
const MAX_RETRIES = 2

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Exponential backoff with jitter: ~400ms, ~900ms, ~1900ms. */
function backoffMs(attempt: number) {
  return Math.round(2 ** attempt * 400 + Math.random() * 200)
}

function authHeaders() {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  }
}

/**
 * Thin wrapper around axios.get for the GitHub REST API that adds what the
 * original code didn't have: a timeout, retries on 5xx/network failures with
 * backoff, and *specific* errors for rate limiting vs. a missing repo vs. a
 * genuine outage — instead of one generic catch block swallowing all of them.
 */
async function githubGet<T>(url: string, opts: { timeout?: number; retries?: number } = {}): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT_MS, retries = MAX_RETRIES } = opts
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: authHeaders(),
        timeout,
        validateStatus: () => true, // we branch on status ourselves below
      })

      if (res.status >= 200 && res.status < 300) return res.data as T

      if (res.status === 403 || res.status === 429) {
        const remaining = res.headers["x-ratelimit-remaining"]
        const resetHeader = res.headers["x-ratelimit-reset"]
        if (remaining === "0" && resetHeader) {
          const waitSec = Math.max(0, Math.ceil(Number(resetHeader) - Date.now() / 1000))
          throw new GithubApiError(
            `GitHub API rate limit reached. Resets in ~${waitSec}s.`,
            res.status,
            "RATE_LIMITED"
          )
        }
        throw new GithubApiError(
          "GitHub API access forbidden — check that GITHUB_TOKEN is set and has repo read access.",
          res.status,
          "FORBIDDEN"
        )
      }

      if (res.status === 404) {
        throw new GithubApiError("Repository, branch, or file not found on GitHub.", 404, "NOT_FOUND")
      }

      if (res.status >= 500 && attempt < retries) {
        lastError = new GithubApiError(`GitHub API returned ${res.status}`, res.status, "SERVER_ERROR")
        await sleep(backoffMs(attempt))
        continue
      }

      throw new GithubApiError(`GitHub API returned an unexpected status: ${res.status}`, res.status, "UNKNOWN")
    } catch (err) {
      if (err instanceof GithubApiError) {
        if (err.code === "SERVER_ERROR" && attempt < retries) {
          lastError = err
          continue
        }
        throw err
      }

      const isTimeout = axios.isAxiosError(err) && err.code === "ECONNABORTED"
      lastError = err
      if (attempt < retries) {
        await sleep(backoffMs(attempt))
        continue
      }
      throw new GithubApiError(
        isTimeout ? "GitHub API request timed out." : "Network error reaching GitHub API.",
        0,
        "NETWORK"
      )
    }
  }

  throw lastError instanceof Error ? lastError : new GithubApiError("GitHub API request failed.", 0, "UNKNOWN")
}

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  if (typeof repoUrl !== "string") return null
  const match = repoUrl.match(/github\.com\/([^\/\s]+)\/([^\/\s]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") }
}

/**
 * Metadata + language breakdown in parallel. The language breakdown call is
 * best-effort — it's a nice-to-have signal, not worth failing the whole
 * analysis over if it 403s while the main repo call succeeds.
 */
export async function getRepoMetadata(owner: string, repo: string): Promise<RepoMetadata> {
  const [repoData, languageBreakdown] = await Promise.all([
    githubGet<any>(`https://api.github.com/repos/${owner}/${repo}`),
    githubGet<Record<string, number>>(`https://api.github.com/repos/${owner}/${repo}/languages`).catch(() => ({})),
  ])

  return {
    owner,
    repo,
    description: repoData.description ?? null,
    primaryLanguage: repoData.language ?? null,
    languageBreakdown,
    stars: repoData.stargazers_count ?? 0,
    forks: repoData.forks_count ?? 0,
    license: repoData.license?.spdx_id ?? repoData.license?.name ?? null,
    topics: Array.isArray(repoData.topics) ? repoData.topics : [],
    defaultBranch: repoData.default_branch ?? "main",
    pushedAt: repoData.pushed_at ?? null,
    openIssuesCount: repoData.open_issues_count ?? 0,
  }
}

/**
 * Fetches the full recursive tree off the repo's *actual* default branch.
 * The previous version requested `git/trees/HEAD`, which isn't a ref the
 * REST API resolves for a remote repo (HEAD is meaningful to a local git
 * checkout, not to GitHub's server-side API) — using the real default branch
 * name from metadata is the documented, reliable way to do this.
 */
export async function getRepoTree(owner: string, repo: string, defaultBranch: string): Promise<GitTreeEntry[]> {
  const data = await githubGet<{ tree: GitTreeEntry[]; truncated: boolean }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  )
  return (data.tree || []).filter((f) => f.type === "blob")
}

/**
 * Reads a file's content, capped at maxBytes. Returns null (never throws)
 * for anything unreadable — binary content, files over GitHub's inline-content
 * size limit, deleted-between-tree-fetch-and-read races, etc. — since a
 * single unreadable file should never take down the whole analysis.
 */
export async function getFileContent(owner: string, repo: string, path: string, maxBytes = 100_000): Promise<string | null> {
  try {
    const data = await githubGet<{ content?: string; encoding?: string }>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`,
      { retries: 1 }
    )
    if (!data.content || data.encoding !== "base64") return null
    const buf = Buffer.from(data.content, "base64")
    return buf.subarray(0, maxBytes).toString("utf-8")
  } catch {
    return null
  }
}

export { GithubApiError }
