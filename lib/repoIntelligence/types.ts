import type { ImportGraph } from "./ast/importGraph"

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
  rankedMetadata: ScoredFile[]
  /** Files that scored highly enough to be worth knowing about but were
   *  skipped for budget reasons — listed by path only, still useful context. */
  skippedForBudget: string[]
  totalTreeFileCount: number
  budgetCharsUsed: number
  budgetCharsTotal: number
  summary: RepositorySummary
  symbolIndex: SymbolIndex
  importGraph: ImportGraph
  diagnostics: DiagnosticsSummary | null
  /** True when this came from the incremental cache instead of a fresh
   *  full index — useful for logging/debugging, not required by any caller. */
  fromCache: boolean
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

// ─────────────────────────────────────────────────────────────────────────
// v2.1 additions — symbol index, repository summary, diagnostics, cache.
// Deliberately flat, deliberately not a knowledge graph — see each module's
// own file for why.
// ─────────────────────────────────────────────────────────────────────────

export type SymbolKind = "function" | "class" | "interface" | "type" | "enum" | "constant" | "component"

export interface IndexedSymbol {
  name: string
  kind: SymbolKind
  path: string
  line: number
}

/** name -> every declaration of that name found in the repo (usually one,
 *  sometimes a few — a same-named export in two files is normal and useful
 *  to see, not an error to resolve). Intentionally just a lookup table, not
 *  a reference/usage graph. */
export type SymbolIndex = Map<string, IndexedSymbol[]>

export interface RepositorySummary {
  framework: string | null
  language: string | null
  packageManager: string | null
  buildTool: string | null
  repositoryType: RepositoryType
  monorepoTool: string | null
  importantFolders: { path: string; reason: string }[]
  entryPoints: string[]
  routing: string | null // "Next.js App Router", "React Router", "Express routes", null if not detected
  stateManagement: string[] // ["Redux", "Zustand", ...]
  databaseLayer: string[]
  apiLayer: string[] // ["REST (Express)", "GraphQL", "tRPC", ...]
  authentication: string[] // ["NextAuth", "Clerk", "Passport", ...]
  majorLibraries: string[]
}

export interface DiagnosticsSummary {
  /** null when there's no CI configured at all — distinct from "checked and clean." */
  ciStatus: "passing" | "failing" | "unknown" | null
  ciWorkflowName: string | null
  ciCheckedAt: string | null
  /** Short, human-readable notes only — e.g. failing job names. Never full logs. */
  notes: string[]
}

export interface CachedRepoEntry {
  headSha: string
  cachedAt: number
  tree: GitTreeEntry[]
  files: ReadFile[]
  rankedMetadata: ScoredFile[]
  /** Parsed AST data (symbols + imports) per file — cached alongside raw
   *  content so a cache hit skips re-running tree-sitter, not just
   *  re-fetching from GitHub. Keyed by path for O(1) lookup during
   *  incremental patching. */
  fileAstsByPath: Map<string, { symbols: IndexedSymbol[]; imports: string[] }>
  skippedForBudget: string[]
  budgetCharsUsed: number
  budgetCharsTotal: number
  metadata: RepoMetadata
  detection: TechDetection
  summary: RepositorySummary
  symbolIndex: SymbolIndex
  importGraph: ImportGraph
  diagnostics: DiagnosticsSummary | null
}
