import type { GitTreeEntry, ScoredFile } from "./types"
import type { ImportGraph } from "./ast/importGraph"
import type { SymbolIndex } from "./types"

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2)
}

function overlapScore(text: string, queryTokens: Set<string>): number {
  const tokens = tokenize(text)
  const overlap = tokens.filter((token) => queryTokens.has(token)).length
  return overlap
}

/**
 * Cheap, pre-read boost: does the file's path (folder + filename) share
 * words with the user's question? A question about "authentication" should
 * pull src/auth/*.ts up the list before a single byte gets fetched.
 */
export function boostByPathRelevance(scored: ScoredFile[], query: string | null): ScoredFile[] {
  if (!query) return scored
  const queryTokens = new Set(tokenize(query))
  if (queryTokens.size === 0) return scored

  return scored
    .map((f) => {
      const pathTokens = tokenize(f.path)
      const overlap = pathTokens.filter((t) => queryTokens.has(t)).length
      const bonus = Math.min(overlap * 8, 24)
      return bonus > 0 ? { ...f, score: f.score + bonus, reason: `${f.reason} + query match` } : f
    })
    .sort((a, b) => b.score - a.score)
}

export interface RerankInput {
  path: string
  score: number
  reason: string
}

export interface RerankedFile extends RerankInput {
  finalScore: number
  index?: number
}

/**
 * Post-read re-rank. `importGraph` and `symbolIndex` here should be built
 * from ONLY the files already read in this pass — this is deliberately a
 * local, cheap re-sort of what you have, not a repo-wide graph query.
 */
export function rerankAfterReading(
  files: RerankInput[],
  importGraph: ImportGraph,
  symbolIndex: SymbolIndex,
  query: string | null,
  recentlyModifiedPaths: string[] = []
): RerankedFile[] {
  const queryTokens = query ? new Set(tokenize(query)) : null
  const recentlyTouched = new Set(recentlyModifiedPaths)

  return files
    .map((f, index) => {
      let bonus = 0
      let reasons: string[] = []

      const importedByCount = importGraph.importedBy.get(f.path)?.length ?? 0
      const centralityBonus = Math.min(importedByCount * 4, 20)
      if (centralityBonus > 0) {
        bonus += centralityBonus
        reasons.push(`centrality:${centralityBonus}`)
      }

      const imports = importGraph.imports.get(f.path)?.length ?? 0
      const dependencyBonus = Math.min(imports * 2, 10)
      if (dependencyBonus > 0) {
        bonus += dependencyBonus
        reasons.push(`deps:${dependencyBonus}`)
      }

      const declarations = Array.from(symbolIndex.values()).flatMap((entries) =>
        entries.filter((entry) => entry.path === f.path)
      )
      const exportedSymbolBonus = Math.min(declarations.length * 3, 18)
      if (exportedSymbolBonus > 0) {
        bonus += exportedSymbolBonus
        reasons.push(`symbols:${exportedSymbolBonus}`)
      }

      if (queryTokens) {
        const normalizedQuery = query?.toLowerCase() ?? ""
        const symbolMatches = declarations.filter((entry) => {
          const tokenOverlap = overlapScore(entry.name, queryTokens)
          return tokenOverlap > 0 || entry.name.toLowerCase().includes(normalizedQuery)
        })
        if (symbolMatches.length > 0) {
          const symbolBonus = Math.min(symbolMatches.length * 6 + 4, 20)
          bonus += symbolBonus
          reasons.push(`query:${symbolBonus}`)
        }
      }

      if (recentlyTouched.has(f.path)) {
        bonus += 6
        reasons.push("recent:6")
      }

      return {
        ...f,
        finalScore: f.score + bonus,
        reason: reasons.length > 0 ? `${f.reason} + ${reasons.join(", ")}` : f.reason,
        index,
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore || a.index - b.index)
}

/** Convenience: apply path-relevance boosting to the tree-scored candidate
 *  list scoring.ts already produces, without touching scoring.ts itself. */
export function rerankCandidates(scored: ScoredFile[], tree: GitTreeEntry[], query: string | null): ScoredFile[] {
  void tree // kept in the signature for symmetry/future use (e.g. folder-level relevance); unused today
  return boostByPathRelevance(scored, query)
}
