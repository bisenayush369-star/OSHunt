// Shared types for the Discovery feature. Everything under components/discovery,
// lib/discovery, and hooks imports from here — keep this the single source of
// truth for shapes rather than letting individual files redeclare them.
//
// This feature is a directory of free/open-source tools and resources devs
// (and other users) can go USE — not a code-contribution-opportunity finder.
// That's what Issue Hunter is for, elsewhere in the app. Nothing in here
// should reference contributing, PRs, or good-first-issues.

export type CategoryId =
  | "trending"
  | "movies-anime"
  | "ai-ml"
  | "llm-models"
  | "frontend"
  | "backend"
  | "devops"
  | "databases"
  | "testing"
  | "apis"
  | "mobile"
  | "courses"
  | "cli"
  | "security"
  | "self-hosted"
  | "frameworks"
  | "design-tools"
  | "documentation"
  | "tools"
  | "jobs"
  | "hidden-gems"
  | "best-beginner";

export interface Category {
  id: CategoryId;
  label: string;
  /** GitHub search qualifiers, joined with the user's free-text query and filters. */
  query: string;
  sort?: SortOption;
}

export type SortOption =
  | "best-match"
  | "stars"
  | "forks"
  | "updated"
  | "trending"
  | "reliable";

export const SORT_LABELS: Record<SortOption, string> = {
  "best-match": "Best match",
  stars: "Most stars",
  forks: "Most forks",
  updated: "Recently updated",
  trending: "Trending (30d)",
  reliable: "Most reliable",
};

export type MaintenanceStatus = "active" | "recently-updated" | "archived";

export interface DiscoveryFilters {
  query: string;
  languages: string[];
  license: string | null;
  org: string | null;
  minStars: number | null;
  minForks: number | null;
  maintenance: MaintenanceStatus | null;
  sort: SortOption;
}

export const DEFAULT_FILTERS: DiscoveryFilters = {
  query: "",
  languages: [],
  license: null,
  org: null,
  minStars: null,
  minForks: null,
  maintenance: null,
  sort: "best-match",
};

export const FILTERABLE_LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Rust", "Go",
  "Java", "C++", "C#", "PHP",
] as const;

/** Detected from a repo's GitHub topics (and, in the modal, package.json) — see lib/discovery/ranking.ts. */
export type Framework =
  | "React" | "Next.js" | "Vue" | "Angular" | "Svelte"
  | "Express" | "NestJS" | "Fastify" | "FastAPI" | "Django" | "Laravel" | "Spring Boot"
  | "Flutter" | "React Native";

export interface Repo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar: string | null;
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  license: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  htmlUrl: string;
  archived: boolean;
  /** Derived client-side, not from GitHub — see ranking.ts */
  frameworks: Framework[];
  /**
   * How trustworthy/usable this looks as a free resource RIGHT NOW — is it
   * maintained, licensed, documented — not how good it is to contribute
   * code to. Quick estimate from search-response data only (recency,
   * license, topics, issue/fork ratios, archived status), cheap enough to
   * compute for a whole grid with zero extra API calls. The modal computes
   * a fuller version once it has README/contributor/release data too; see
   * refineReliabilityScore in ranking.ts.
   */
  reliabilityScore: number;
  trendingScore: number;
}

export type ScoreLabel = "Excellent" | "Great" | "Good" | "Fair" | "Poor";

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 95) return "Excellent";
  if (score >= 85) return "Great";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  return "Poor";
}

/** One line item in the score tooltip breakdown — what it checked and whether it passed. */
export interface ScoreFactor {
  label: string;
  met: boolean;
  points: number;
}

export interface LanguageBreakdown {
  language: string;
  percent: number;
}

export interface Contributor {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string;
  contributions: number;
}

export interface ReleaseInfo {
  tagName: string;
  name: string | null;
  publishedAt: string | null;
  htmlUrl: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  authorLogin: string | null;
  date: string | null;
}

export interface RepoDetail {
  languages: LanguageBreakdown[];
  contributors: Contributor[];
  readmeExcerpt: string | null;
  latestRelease: ReleaseInfo | null;
  recentCommits: CommitInfo[];
  /**
   * Frameworks detected from package.json dependencies, in ADDITION to
   * whatever topics already caught (those are on Repo.frameworks and show
   * on the card). Only JS/TS-ecosystem frameworks are detectable this way
   * — Python/PHP/Java frameworks would need requirements.txt/composer.json/
   * pom.xml parsing, which isn't included here to keep this lightweight.
   * null if package.json doesn't exist (not an error — most repos aren't JS).
   */
  packageJsonFrameworks: Framework[] | null;
}

export interface AiInsights {
  /** Plain-English explanation of what this tool/resource actually does, under ~40 words. */
  whatItDoes: string;
  /** Practical getting-started guidance — install command, basic usage, under ~30 words. */
  howToUse: string;
  /** Optional: what use case or type of user this is especially good for. Omitted if nothing crisp to add. */
  goodFor?: string;
}

export type AiTakeStatus = "idle" | "loading" | "done" | "error";
export interface AiTakeState {
  status: AiTakeStatus;
  insights?: AiInsights;
}

export type FetchStatus = "idle" | "loading" | "loaded" | "error";
export type DiscoveryErrorType = "rate-limit" | "generic" | null;
export interface DiscoveryError {
  type: Exclude<DiscoveryErrorType, null>;
  resetInSeconds?: number | null;
}

/**
 * Bookmarks/collections need a signed-in user and a database — neither
 * exists in this environment. This type exists so SaveButton has something
 * real to compile against once you wire up real persistence. Until then,
 * useDiscovery keeps this in memory only; it resets on refresh.
 */
export interface SavedState {
  savedRepoIds: Set<number>;
}
