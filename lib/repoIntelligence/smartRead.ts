import { getFileContent } from "./github"
import { LOCKFILE_NAMES } from "./scoring"
import type { PromptSection, ReadFile, ScoredFile } from "./types"

/** How many characters of *actual content* each section is allowed, before
 *  the shared total budget below even comes into play. README genuinely
 *  needs more room than a random component file to be useful. */
function capForSection(section: PromptSection): number {
  switch (section) {
    case "documentation": return 6000   // "if a README exists, read much more of it"
    case "dependencies": return 8000    // "read the entire package.json" — capped only as a safety net
    case "contribution": return 4000
    case "configuration": return 4000   // "if config files exist, read entire config files"
    case "ci": return 2000
    case "entryPoints": return 3000
    case "coreSource": return 1800      // "read the beginning plus exported symbols"
  }
}

const SYMBOL_PATTERNS: Record<string, RegExp> = {
  ts: /^\s*export\s+(default\s+)?(async\s+)?(function|class|const|interface|type|enum)\s+[\w$]+/,
  tsx: /^\s*export\s+(default\s+)?(async\s+)?(function|class|const|interface|type|enum)\s+[\w$]+/,
  js: /^\s*export\s+(default\s+)?(async\s+)?(function|class|const)\s+[\w$]+/,
  jsx: /^\s*export\s+(default\s+)?(async\s+)?(function|class|const)\s+[\w$]+/,
  mjs: /^\s*export\s+(default\s+)?(async\s+)?(function|class|const)\s+[\w$]+/,
  cjs: /^\s*(module\.exports|exports\.\w+)\s*=/,
  py: /^(def|class)\s+\w+/,
  go: /^func\s+[A-Z]\w*|^type\s+[A-Z]\w*/,
  rs: /^\s*pub\s+(fn|struct|enum|trait|mod)\s+\w+/,
}

/** Scans the *whole* file (not just the head we keep) for export-shaped
 *  lines, so "beginning plus exported symbols" catches exports declared
 *  further down than what the head slice alone would show. */
function extractSymbols(content: string, ext: string): string {
  const pattern = SYMBOL_PATTERNS[ext]
  if (!pattern) return ""
  const hits = content
    .split("\n")
    .filter((line) => pattern.test(line))
    .slice(0, 25)
    .map((l) => l.trim())
  return hits.length ? `\n\n// --- exported symbols detected further in the file ---\n${hits.join("\n")}` : ""
}

const FULL_READ_SECTIONS = new Set<PromptSection>(["documentation", "contribution", "dependencies", "configuration", "ci"])

export interface ReadResult {
  files: ReadFile[]
  skippedForBudget: string[]
  budgetCharsUsed: number
  budgetCharsTotal: number
}

/**
 * Reads content for the ranked file list, highest-score first, until the
 * shared character budget runs out. `ranked` is already priority-sorted, so
 * once the budget is spent, everything remaining is strictly lower priority
 * — we stop calling the GitHub API entirely rather than fetching files we
 * know we can't afford to keep.
 */
export async function readPriorityFiles(
  owner: string,
  repo: string,
  ranked: ScoredFile[],
  totalBudgetChars = 45_000
): Promise<ReadResult> {
  let spent = 0
  const files: ReadFile[] = []
  let cutoffIndex = ranked.length

  for (let i = 0; i < ranked.length; i++) {
    const f = ranked[i]
    const base = f.path.split("/").pop() || f.path

    if (LOCKFILE_NAMES.has(base)) continue // presence-only signal, never read

    if (spent >= totalBudgetChars) {
      cutoffIndex = i
      break
    }

    const cap = Math.min(capForSection(f.section), totalBudgetChars - spent)
    if (cap <= 0) {
      cutoffIndex = i
      break
    }

    const raw = await getFileContent(owner, repo, f.path)
    if (raw === null) continue // unreadable (binary, over GitHub's inline-content limit, etc.) — skip, don't fail the run

    let content: string
    let truncated: boolean

    if (FULL_READ_SECTIONS.has(f.section)) {
      truncated = raw.length > cap
      content = raw.slice(0, cap)
    } else {
      const ext = f.path.split(".").pop()?.toLowerCase() ?? ""
      const headCap = Math.floor(cap * 0.7)
      const head = raw.slice(0, headCap)
      const symbols = extractSymbols(raw, ext).slice(0, cap - head.length)
      content = head + symbols
      truncated = raw.length > headCap
    }

    if (content.trim().length === 0) continue

    spent += content.length
    files.push({ path: f.path, content, truncated, section: f.section, reason: f.reason, budgetUsed: content.length })
  }

  const skippedForBudget = ranked.slice(cutoffIndex).map((f) => f.path)
  return { files, skippedForBudget, budgetCharsUsed: spent, budgetCharsTotal: totalBudgetChars }
}
