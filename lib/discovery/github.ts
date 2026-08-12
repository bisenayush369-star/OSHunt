import type {
  Category,
  CommitInfo,
  Contributor,
  DiscoveryFilters,
  LanguageBreakdown,
  ReleaseInfo,
  Repo,
  RepoDetail,
} from "@/types/discovery";
import { categoryCache, detailCache } from "./cache";
import { detectFrameworksFromPackageJson } from "./ranking";
import { decodeBase64Utf8, markdownExcerpt, recentDateISO } from "./utils";

export class GithubRateLimitError extends Error {
  resetInSeconds: number | null;
  constructor(resetInSeconds: number | null) {
    super("GitHub API rate limit reached");
    this.name = "GithubRateLimitError";
    this.resetInSeconds = resetInSeconds;
  }
}

async function githubFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get("x-ratelimit-reset");
    const resetInSeconds = reset ? Math.max(0, Number(reset) - Math.floor(Date.now() / 1000)) : null;
    throw new GithubRateLimitError(resetInSeconds);
  }
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
  return res.json() as Promise<T>;
}

export class NotFoundError extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundError";
  }
}

/**
 * Builds a GitHub search query string from a category's base query plus
 * user filters. Multi-language selection uses GitHub's `OR` search syntax
 * (`(language:X OR language:Y)`) since a bare `language:X language:Y` is
 * AND semantics and would require a repo to be written in both at once.
 */
export function buildSearchQuery(category: Category, filters: DiscoveryFilters): string {
  const parts: string[] = [];

  if (filters.query.trim()) parts.push(filters.query.trim());
  parts.push(category.query.replace("{recent}", recentDateISO(30)));

  if (filters.languages.length === 1) {
    parts.push(`language:${filters.languages[0]}`);
  } else if (filters.languages.length > 1) {
    parts.push(`(${filters.languages.map((l) => `language:${l}`).join(" OR ")})`);
  }

  if (filters.license) parts.push(`license:${filters.license}`);
  if (filters.org) parts.push(`org:${filters.org}`);
  if (filters.minStars) parts.push(`stars:>=${filters.minStars}`);
  if (filters.minForks) parts.push(`forks:>=${filters.minForks}`);

  if (filters.maintenance === "archived") parts.push("archived:true");
  else if (filters.maintenance === "active") parts.push("archived:false");
  else if (filters.maintenance === "recently-updated") parts.push(`pushed:>${recentDateISO(30)}`);

  return parts.join(" ");
}

interface SearchPage {
  items: Repo[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Fetches one page of a category+filters search. `sort` on the request is
 * the *GitHub-native* sort (stars/forks/updated/best-match) — "trending" and
 * "reliable" are computed client-side after fetch (see useDiscovery), since
 * GitHub has no queryable field for either.
 */
export async function fetchDiscoveryPage(
  category: Category,
  filters: DiscoveryFilters,
  page: number,
  perPage = 12
): Promise<SearchPage> {
  const cacheKey = JSON.stringify({ category: category.id, filters, page, perPage });
  const cached = categoryCache.get(cacheKey) as SearchPage | undefined;
  if (cached) return cached;

  const params = new URLSearchParams();
  params.set("category", category.id);
  if (filters.query.trim()) params.set("q", filters.query.trim());
  filters.languages.forEach((lang) => params.append("language", lang));
  if (filters.license) params.set("license", filters.license);
  if (filters.org) params.set("org", filters.org);
  if (filters.minStars) params.set("minStars", String(filters.minStars));
  if (filters.minForks) params.set("minForks", String(filters.minForks));
  if (filters.maintenance) params.set("maintenance", filters.maintenance);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  params.set("per_page", String(perPage));

  const url = `/api/gems?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Discovery API error ${res.status}`);
  }

  const json = await res.json();
  const items = (json.items || []) as Repo[];

  if (filters.sort === "trending") items.sort((a, b) => b.trendingScore - a.trendingScore);
  else if (filters.sort === "reliable") items.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

  const result: SearchPage = {
    items,
    totalCount: json.totalCount ?? items.length,
    hasMore: json.hasMore,
  };
  categoryCache.set(cacheKey, result);
  return result;
}

function languagePercentages(bytesByLanguage: Record<string, number>): LanguageBreakdown[] {
  const total = Object.values(bytesByLanguage).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(bytesByLanguage)
    .map(([language, bytes]) => ({ language, percent: Math.round((bytes / total) * 1000) / 10 }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6);
}

async function safeFetch<T>(url: string): Promise<T | null> {
  try {
    return await githubFetch<T>(url);
  } catch (err) {
    if (err instanceof NotFoundError) return null; // e.g. no releases yet — not an error
    throw err;
  }
}

/**
 * Everything for the detail modal, fetched only when a repo is actually
 * opened. `packageJsonFrameworks` supplements the topic-based detection on
 * Repo with a JS/TS-specific check. No good-first-issues lookup here on
 * purpose — that's a contribution signal, not a "should I use this tool"
 * signal, and dropping it also means one less call against GitHub's
 * stricter 10-req/minute search bucket.
 */
export async function fetchRepoDetail(owner: string, name: string): Promise<RepoDetail> {
  const key = `${owner}/${name}`;
  const cached = detailCache.get(key) as RepoDetail | undefined;
  if (cached) return cached;

  const [languagesRes, contributorsRes, readmeRes, releaseRes, commitsRes, packageJsonRes] = await Promise.allSettled([
    githubFetch<Record<string, number>>(`https://api.github.com/repos/${owner}/${name}/languages`),
    githubFetch<Array<Record<string, unknown>>>(`https://api.github.com/repos/${owner}/${name}/contributors?per_page=6`),
    safeFetch<Record<string, unknown>>(`https://api.github.com/repos/${owner}/${name}/readme`),
    safeFetch<Record<string, unknown>>(`https://api.github.com/repos/${owner}/${name}/releases/latest`),
    githubFetch<Array<Record<string, unknown>>>(`https://api.github.com/repos/${owner}/${name}/commits?per_page=5`),
    safeFetch<Record<string, unknown>>(`https://api.github.com/repos/${owner}/${name}/contents/package.json`),
  ]);

  const contributors: Contributor[] =
    contributorsRes.status === "fulfilled"
      ? contributorsRes.value.map((c) => {
          const contributor = c as Record<string, unknown>;
          return {
            login: typeof contributor.login === "string" ? contributor.login : "",
            avatarUrl: typeof contributor.avatar_url === "string" ? contributor.avatar_url : null,
            htmlUrl: typeof contributor.html_url === "string" ? contributor.html_url : "",
            contributions: typeof contributor.contributions === "number" ? contributor.contributions : 0,
          };
        })
      : [];

  const readmeExcerpt =
    readmeRes.status === "fulfilled" && readmeRes.value && typeof readmeRes.value === "object"
      ? markdownExcerpt(decodeBase64Utf8((readmeRes.value as Record<string, unknown>).content as string))
      : null;

  const latestRelease: ReleaseInfo | null =
    releaseRes.status === "fulfilled" && releaseRes.value && typeof releaseRes.value === "object"
      ? (() => {
          const releaseData = releaseRes.value as Record<string, unknown>;
          return {
            tagName: typeof releaseData.tag_name === "string" ? releaseData.tag_name : "",
            name: typeof releaseData.name === "string" ? releaseData.name : null,
            publishedAt: typeof releaseData.published_at === "string" ? releaseData.published_at : null,
            htmlUrl: typeof releaseData.html_url === "string" ? releaseData.html_url : "",
          } satisfies ReleaseInfo;
        })()
      : null;

  const recentCommits: CommitInfo[] =
    commitsRes.status === "fulfilled"
      ? commitsRes.value.map((c) => {
          const rawCommit = c as Record<string, unknown>;
          const commit = rawCommit.commit as Record<string, unknown> | undefined;
          const author = rawCommit.author as Record<string, unknown> | undefined;
          const authorLogin = author && typeof author.login === "string" ? author.login : null;
          const shaText = typeof rawCommit.sha === "string" ? rawCommit.sha : "";
          const sha = shaText.slice(0, 7);
          const message = typeof commit?.message === "string" ? commit.message : "";
          const date = author && typeof author.date === "string" ? author.date : null;
          return {
            sha,
            message: message.split("\n")[0],
            authorLogin,
            date,
          };
        })
      : [];

  let packageJsonFrameworks: RepoDetail["packageJsonFrameworks"] = null;
  if (packageJsonRes.status === "fulfilled" && packageJsonRes.value && typeof packageJsonRes.value === "object") {
    const content = (packageJsonRes.value as Record<string, unknown>).content;
    if (typeof content === "string") {
      try {
        const pkg = JSON.parse(decodeBase64Utf8(content));
        packageJsonFrameworks = detectFrameworksFromPackageJson(pkg);
      } catch {
        packageJsonFrameworks = null; // malformed package.json — treat as "couldn't detect", not an error
      }
    }
  }

  const detail: RepoDetail = {
    languages: languagesRes.status === "fulfilled" ? languagePercentages(languagesRes.value) : [],
    contributors,
    readmeExcerpt,
    latestRelease,
    recentCommits,
    packageJsonFrameworks,
  };
  detailCache.set(key, detail);
  return detail;
}
