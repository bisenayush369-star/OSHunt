// ─────────────────────────────────────────────────────────────────────────
// Shared types for the repository ingestion pipeline.
//
// Pipeline: GitHub Repository → Repository Metadata → Repository Tree →
//           Priority File Selection → Repository Intelligence → LLM
// ─────────────────────────────────────────────────────────────────────────

export interface RepoMetadata {
  owner: string
  repo: string
  description: string | null
  primaryLanguage: string | null
  /** Language name -> bytes of code, as GitHub's linguist reports it. */
  languageBreakdown: Record<string, number>
  stars: number
  forks: number
  license: string | null
  topics: string[]
  defaultBranch: string
  pushedAt: string | null
  openIssuesCount: number
}

export interface GitTreeEntry {
  path: string
  mode: string
  type: "blob" | "tree"
  sha: string
  size?: number
  url: string
}

/** A file after scoring, before we decide whether/how much of it to read. */
export interface ScoredFile {
  path: string
  size: number
  score: number
  /** Human-readable reason it scored the way it did — surfaced in the prompt
   *  and useful for debugging why a file was or wasn't picked. */
  reason: string
  /** Which structured prompt section this file belongs under. */
  section: PromptSection
}

export type PromptSection =
  | "documentation"
  | "configuration"
  | "entryPoints"
  | "dependencies"
  | "contribution"
  | "coreSource"
  | "ci"

/** A file after we've actually fetched (some slice of) its content. */
export interface ReadFile {
  path: string
  content: string
  truncated: boolean
  section: PromptSection
  reason: string
  /** Characters actually spent from the token budget, so callers can log/inspect spend. */
  budgetUsed: number
}

export type RepositoryType = "single-package" | "monorepo"

export interface TechDetection {
  repositoryType: RepositoryType
  monorepoTool: string | null // "Turborepo" | "Nx" | "pnpm workspaces" | "Lerna" | null
  framework: string | null // "Next.js", "Express", "Django", ...
  runtime: string | null // "Node.js", "Deno", "Bun", "Python", "Go", "Rust", "JVM", ...
  language: string | null // primary implementation language, from metadata + manifests
  packageManager: string | null // "pnpm" | "yarn" | "npm" | "pip" | "cargo" | "go modules" | ...
  buildTool: string | null // "Vite", "Webpack", "Turbopack", "esbuild", ...
  testing: string[]
  linting: string[]
  styling: string[]
  database: string[]
  orm: string[]
  deployment: string[]
}

export interface RepoIntelligence {
  metadata: RepoMetadata
  detection: TechDetection
  files: ReadFile[]
  /** Files that scored highly enough to be worth knowing about but were
   *  skipped for budget reasons — listed by path only, still useful context. */
  skippedForBudget: string[]
  totalTreeFileCount: number
  budgetCharsUsed: number
  budgetCharsTotal: number
}

export class GithubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: "RATE_LIMITED" | "FORBIDDEN" | "NOT_FOUND" | "SERVER_ERROR" | "NETWORK" | "UNKNOWN"
  ) {
    super(message)
    this.name = "GithubApiError"
  }
}
