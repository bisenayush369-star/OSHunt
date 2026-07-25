import type { GitTreeEntry, PromptSection, ScoredFile } from "./types"

// ─────────────────────────────────────────────────────────────────────────
// Hard excludes — these never get scored, let alone read, no matter how the
// scoring rules below might otherwise treat them.
// ─────────────────────────────────────────────────────────────────────────

const EXCLUDED_DIR_SEGMENTS = new Set([
  "node_modules", "dist", "build", "coverage", "vendor",
  ".next", ".nuxt", ".turbo", ".cache", ".parcel-cache",
  "out", "target", "bin", "obj", ".venv", "venv", "__pycache__",
  ".git", ".idea", ".vscode",
])

const EXCLUDED_FILE_PATTERNS: RegExp[] = [
  /\.min\.(js|css)$/i,
  /\.(map)$/i, // sourcemaps — generated, huge, zero architectural signal
  /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp|tiff?)$/i,
  /\.(mp4|mov|webm|avi|mkv)$/i,
  /\.(mp3|wav|ogg|flac)$/i,
  /\.(pdf|zip|tar|gz|tgz|rar|7z)$/i,
  /\.(woff2?|ttf|eot|otf)$/i,
  /\.(exe|dll|so|dylib|bin|wasm)$/i,
  /^\.DS_Store$/,
  /package-lock\.json$/, // real lockfiles are handled specially, see scoreFile
]

/** Lockfiles are a real signal (they confirm the package manager) but their
 *  *content* is not worth reading — thousands of lines of hashes, near-zero
 *  information density per token. Detection code checks tree paths for these
 *  directly; the smart-reader never spends budget on their content. */
export const LOCKFILE_NAMES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb",
  "Cargo.lock", "go.sum", "poetry.lock", "Pipfile.lock", "composer.lock",
])

export function isExcludedPath(path: string): boolean {
  const segments = path.split("/")
  if (segments.some((seg) => EXCLUDED_DIR_SEGMENTS.has(seg))) return true
  if (EXCLUDED_FILE_PATTERNS.some((re) => re.test(path))) return true
  return false
}

// ─────────────────────────────────────────────────────────────────────────
// Scoring — highest-priority-first, matching the spec's list, expressed as
// rules instead of one giant literal array so new patterns (apps/*, src/lib/*)
// aren't one-offs.
// ─────────────────────────────────────────────────────────────────────────

const MANIFEST_BY_ECOSYSTEM = new Set([
  "cargo.toml", "go.mod", "requirements.txt", "pyproject.toml",
  "composer.json", "pom.xml", "build.gradle", "build.gradle.kts",
])

function scoreFile(path: string, size: number): { score: number; reason: string; section: PromptSection } {
  const base = path.split("/").pop() || path
  const baseLower = base.toLowerCase()
  const depth = path.split("/").length

  if (/^readme(\.md|\.rst|\.txt)?$/i.test(base)) {
    return { score: 100, reason: "primary documentation", section: "documentation" }
  }
  if (/^contributing(\.md)?$/i.test(base)) {
    return { score: 97, reason: "contribution guidelines", section: "contribution" }
  }
  if (base === "package.json" && depth === 1) {
    return { score: 96, reason: "root package manifest", section: "dependencies" }
  }
  if (MANIFEST_BY_ECOSYSTEM.has(baseLower) && depth === 1) {
    return { score: 96, reason: "language package manifest", section: "dependencies" }
  }
  if (["pnpm-workspace.yaml", "turbo.json", "nx.json", "lerna.json"].includes(base)) {
    return { score: 94, reason: "monorepo/workspace config", section: "configuration" }
  }
  if (LOCKFILE_NAMES.has(base)) {
    // Kept in the ranked list (it's a real package-manager signal) but scored
    // low — the reader skips its content regardless, see readFiles().
    return { score: 20, reason: "lockfile (presence-only signal)", section: "dependencies" }
  }
  if (base === "tsconfig.json" && depth === 1) {
    return { score: 88, reason: "TypeScript config", section: "configuration" }
  }
  if (/^dockerfile$/i.test(base) || /^docker-compose\.ya?ml$/i.test(base)) {
    return { score: 87, reason: "container config", section: "configuration" }
  }
  if (base === ".env.example" || base === ".env.sample") {
    return { score: 85, reason: "environment variable template", section: "configuration" }
  }
  if (/^\.github\/workflows\/.+\.ya?ml$/.test(path)) {
    return { score: 83, reason: "CI workflow", section: "ci" }
  }

  // Entry points — root or single-level src/, and the app/package entry of a
  // monorepo workspace. Depth-gated so a deeply-nested unrelated main.ts
  // doesn't outrank the real one.
  if (/^src\/(index|main|app|server)\.(ts|tsx|js|jsx|mjs|py|go|rs)$/.test(path)) {
    return { score: 93, reason: "application entry point", section: "entryPoints" }
  }
  if (/^(index|main|app|server)\.(ts|tsx|js|jsx|mjs)$/.test(path) && depth === 1) {
    return { score: 91, reason: "root-level entry point", section: "entryPoints" }
  }
  if (/^(apps|packages)\/[^/]+\/package\.json$/.test(path)) {
    return { score: 89, reason: "monorepo workspace manifest", section: "dependencies" }
  }
  if (/^(apps|packages)\/[^/]+\/src\/(index|main|app|server)\.(ts|tsx|js|jsx)$/.test(path)) {
    return { score: 88, reason: "monorepo workspace entry point", section: "entryPoints" }
  }
  if (/^src\/routes?(\.(ts|js))?(\/|$)/.test(path)) {
    return { score: 74, reason: "routing", section: "coreSource" }
  }

  if (/^(vite|next|tailwind|eslint|jest|vitest|webpack|rollup|babel)\.config\.(ts|js|mjs|cjs|json)$/.test(base) && depth === 1) {
    return { score: 81, reason: "build/tooling config", section: "configuration" }
  }
  if (base === "biome.json" || /^\.eslintrc(\.(json|js|cjs|yml))?$/.test(base)) {
    return { score: 76, reason: "linting config", section: "configuration" }
  }

  if (/^src\/(lib|config)\//.test(path)) {
    return { score: 62, reason: "core library/config code", section: "coreSource" }
  }
  if (/^src\/(components|api)\//.test(path)) {
    return { score: 50, reason: "application source", section: "coreSource" }
  }
  if (/^src\//.test(path)) {
    return { score: 40, reason: "source file", section: "coreSource" }
  }

  return { score: 8, reason: "other tracked file", section: "coreSource" }
}

export interface SelectFilesOptions {
  /** Hard cap on how many files even enter the ranked list (before budget trimming). */
  maxCandidates?: number
}

/**
 * Scores and ranks every non-excluded blob in the tree. Ties break toward
 * the smaller file, per the spec — a 2KB config file usually explains more
 * per byte than a 200KB one that scored the same way.
 */
export function selectPriorityFiles(tree: GitTreeEntry[], opts: SelectFilesOptions = {}): ScoredFile[] {
  const { maxCandidates = 200 } = opts

  const scored: ScoredFile[] = tree
    .filter((f) => !isExcludedPath(f.path))
    .map((f) => {
      const { score, reason, section } = scoreFile(f.path, f.size ?? 0)
      return { path: f.path, size: f.size ?? 0, score, reason, section }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.size - b.size // smaller wins a tie
    })

  return scored.slice(0, maxCandidates)
}
