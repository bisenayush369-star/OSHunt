import type { GitTreeEntry } from "./types"

/**
 * MVP semantic search: embed a compact representation of every candidate
 * file (path + any already-extracted symbol names — not full content, to
 * keep embedding cost sane), embed the user's question, rank by cosine
 * similarity. No persistence — recomputed per request.
 *
 * This is the *complement* to the heuristic scoring in scoring.ts, not a
 * replacement: heuristic scoring is free and great for "what files
 * structurally matter" (README, package.json, entry points). Embeddings are
 * what heuristic scoring can never do — find the one file semantically
 * relevant to a *specific* question ("where does rate limiting happen?")
 * that scores low on any generic priority list.
 *
 * For real production use this needs a persistent vector store once repos
 * are analyzed more than once — see the roadmap for pgvector/LanceDB.
 * This in-memory version is honestly scoped to "good enough for a single
 * request, not good enough to avoid re-embedding the same repo twice."
 */

export interface EmbeddableFile {
  path: string
  /** Short text to embed — NOT full file content. Path + symbol names is
   *  usually enough signal for "is this file about X" without the cost of
   *  embedding every byte of every file. */
  summary: string
}

export interface ScoredCandidate {
  path: string
  similarity: number
}

export type EmbedFn = (texts: string[]) => Promise<number[][]>

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Builds cheap "summaries" for embedding straight from the tree — just the
 * path, split into words, so even repos too large to have been AST-parsed
 * yet still get *some* semantic signal. Pass real symbol names in via
 * `enrich` once extractFileAst has run on a file, for much better recall.
 */
export function buildEmbeddableCandidates(tree: GitTreeEntry[], symbolsByPath?: Map<string, string[]>): EmbeddableFile[] {
  return tree
    .filter((f) => f.type === "blob")
    .map((f) => {
      const pathWords = f.path.replace(/[\/\-_.]/g, " ")
      const symbols = symbolsByPath?.get(f.path)?.join(" ") ?? ""
      return { path: f.path, summary: `${pathWords} ${symbols}`.trim() }
    })
}

/**
 * Ranks candidates by semantic similarity to a query. `embed` is injected —
 * point it at whatever embedding API is already available (OpenAI
 * text-embedding-3-small, Voyage, Cohere, or a local model via
 * @xenova/transformers if avoiding a network call per request matters).
 */
export async function semanticRank(
  query: string,
  candidates: EmbeddableFile[],
  embed: EmbedFn,
  topK = 15
): Promise<ScoredCandidate[]> {
  if (candidates.length === 0) return []

  // Batch — one request for the query, one for all candidates, not one
  // request per file. Most embedding APIs accept batched input directly.
  const [[queryVec], candidateVecs] = await Promise.all([
    embed([query]),
    embed(candidates.map((c) => c.summary)),
  ])

  const scored = candidates.map((c, i) => ({
    path: c.path,
    similarity: cosineSimilarity(queryVec, candidateVecs[i]),
  }))

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK)
}
