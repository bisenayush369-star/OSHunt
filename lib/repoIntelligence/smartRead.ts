import { getFileContent } from "./github"
import { LOCKFILE_NAMES } from "./scoring"
import { extractFileAst, formatSymbolsForPrompt, type FileAst } from "./ast/extractSymbols"
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

// Fallback only — used when extractFileAst() has no grammar loaded for a
// given extension. Real (tree-sitter) extraction is tried first for every
// file; this regex heuristic is what shipped before that existed and stays
// only as a safety net so unsupported languages still get *something*
// instead of nothing.
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

function regexExtractSymbols(content: string, ext: string): string {
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
  /** path -> parsed AST data, only present for files where a tree-sitter
   *  grammar was available. Callers (symbol index, import graph) key off
   *  this rather than re-parsing. */
  fileAsts: Map<string, FileAst>
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
  const fileAsts = new Map<string, FileAst>()
  let nextIndex = 0
  let budgetExhausted = false
  const concurrency = Math.min(6, Math.max(1, ranked.length))

  const processFile = async (index: number): Promise<void> => {
    const f = ranked[index]
    const base = f.path.split("/").pop() || f.path

    if (LOCKFILE_NAMES.has(base) || budgetExhausted) return

    const cap = Math.min(capForSection(f.section), Math.max(0, totalBudgetChars - spent))
    if (cap <= 0) {
      budgetExhausted = true
      return
    }

    const raw = await getFileContent(owner, repo, f.path)
    if (raw === null) return

    const ast = await extractFileAst(f.path, raw).catch(() => null)
    if (ast) fileAsts.set(f.path, ast)

    let content: string
    let truncated: boolean

    if (FULL_READ_SECTIONS.has(f.section)) {
      truncated = raw.length > cap
      content = raw.slice(0, cap)
    } else {
      const ext = f.path.split(".").pop()?.toLowerCase() ?? ""
      const headCap = Math.floor(cap * 0.7)
      const head = raw.slice(0, headCap)
      const symbolText = ast ? formatSymbolsForPrompt(ast) : regexExtractSymbols(raw, ext)
      const symbols = symbolText.slice(0, cap - head.length)
      content = head + symbols
      truncated = raw.length > headCap
    }

    if (content.trim().length === 0) return

    const budgetUsed = content.length
    if (spent + budgetUsed > totalBudgetChars) {
      budgetExhausted = true
      return
    }

    spent += budgetUsed
    files.push({ path: f.path, content, truncated, section: f.section, reason: f.reason, budgetUsed })
  }

  while (!budgetExhausted && nextIndex < ranked.length) {
    const workers = []
    while (!budgetExhausted && workers.length < concurrency && nextIndex < ranked.length) {
      const currentIndex = nextIndex++
      workers.push(processFile(currentIndex))
    }

    if (workers.length === 0) break
    await Promise.all(workers)
  }

  files.sort((a, b) => ranked.findIndex((f) => f.path === a.path) - ranked.findIndex((f) => f.path === b.path))
  const skippedForBudget = ranked.slice(nextIndex).map((f) => f.path)
  return { files, fileAsts, skippedForBudget, budgetCharsUsed: spent, budgetCharsTotal: totalBudgetChars }
}
