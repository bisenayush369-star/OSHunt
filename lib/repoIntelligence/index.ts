import { getRepoMetadata, getRepoTree, getFileContent } from "./github"
import { selectPriorityFiles } from "./scoring"
import { readPriorityFiles } from "./smartRead"
import { detectTechStack } from "./detect"
import { rerankAfterReading, rerankCandidates } from "./rerank"
import { buildSymbolIndex, addFileToSymbolIndex, removeFileFromSymbolIndex } from "./symbolIndex"
import { buildImportGraph } from "./ast/importGraph"
import { buildRepositorySummary } from "./repositorySummary"
import { getDiagnostics } from "./diagnostics"
import { getCachedEntry, setCachedEntry, getHeadSha, getChangedFiles } from "./cache"
import { extractFileAst, type FileAst } from "./ast/extractSymbols"
import type { GitTreeEntry, RepoIntelligence, ReadFile, CachedRepoEntry, IndexedSymbol } from "./types"

export interface GatherOptions {
  totalBudgetChars?: number
  maxCandidateFiles?: number
  /** The user's actual question, if there is one yet (there usually isn't
   *  on the very first analysis, and always is on a chat follow-up) — feeds
   *  the query-aware reranking in rerank.ts. Safe to omit. */
  query?: string
}

export interface GatherResult {
  intelligence: RepoIntelligence
  tree: GitTreeEntry[]
}

// A diff this large is treated the same as a cache miss — incremental
// patching stops being worth it long before this, and it's a signal
// something bigger happened (rebase, squash-merge of a huge branch) rather
// than the normal "a few files changed" case this was built for.
const MAX_INCREMENTAL_CHANGED_FILES = 40

function fileAstToIndexed(ast: FileAst): { symbols: IndexedSymbol[]; imports: string[] } {
  return {
    symbols: ast.symbols.map((s) => ({ name: s.name, kind: s.kind, path: ast.path, line: s.startLine })),
    imports: ast.imports.map((i) => i.source),
  }
}

async function packageJsonFrom(files: ReadFile[]): Promise<Record<string, any> | null> {
  const pkg = files.find((f) => f.path === "package.json")
  if (!pkg) return null
  try {
    return JSON.parse(pkg.content)
  } catch {
    return null
  }
}

function rebuildImportGraphFromCache(fileAstsByPath: CachedRepoEntry["fileAstsByPath"]) {
  const asRoughAsts = Array.from(fileAstsByPath.entries()).map(([path, data]) => ({
    path,
    language: "typescript" as const, // language identity doesn't matter to the import graph, only paths/sources do
    symbols: [],
    imports: data.imports.map((source) => ({ source, startLine: 0 })),
  }))
  return buildImportGraph(asRoughAsts)
}

/** Full pipeline — cache miss, or the incremental diff was too large to trust. */
async function buildFresh(owner: string, repo: string, opts: GatherOptions): Promise<{ intel: RepoIntelligence; tree: GitTreeEntry[]; cacheEntry: CachedRepoEntry }> {
  const metadata = await getRepoMetadata(owner, repo)
  const headSha = (await getHeadSha(owner, repo, metadata.defaultBranch)) ?? "unknown"
  const tree = await getRepoTree(owner, repo, metadata.defaultBranch)

  let ranked = selectPriorityFiles(tree, { maxCandidates: opts.maxCandidateFiles ?? 200 })
  ranked = rerankCandidates(ranked, tree, opts.query ?? null)

  const { files, fileAsts, skippedForBudget, budgetCharsUsed, budgetCharsTotal } = await readPriorityFiles(
    owner,
    repo,
    ranked,
    opts.totalBudgetChars ?? 45_000
  )

  const treePaths = tree.map((f) => f.path)
  const detection = detectTechStack(treePaths, files, metadata)
  const packageJson = await packageJsonFrom(files)

  const symbolIndex = buildSymbolIndex(Array.from(fileAsts.values()))
  const importGraph = buildImportGraph(Array.from(fileAsts.values()))
  const rankedMetadata = rerankAfterReading(
    ranked.map((item) => ({ path: item.path, score: item.score, reason: item.reason })),
    importGraph,
    symbolIndex,
    opts.query ?? null
  ).map((item) => {
    const original = ranked.find((candidate) => candidate.path === item.path)
    return {
      path: item.path,
      size: original?.size ?? 0,
      score: item.finalScore,
      reason: item.reason,
      section: original?.section ?? "coreSource",
    }
  })
  const summary = buildRepositorySummary(metadata, detection, rankedMetadata, files, packageJson)
  const diagnostics = await getDiagnostics(owner, repo, metadata.defaultBranch)

  const fileAstsByPath = new Map(Array.from(fileAsts.entries()).map(([path, ast]) => [path, fileAstToIndexed(ast)]))

  const intel: RepoIntelligence = {
    metadata,
    detection,
    files,
    rankedMetadata,
    skippedForBudget,
    totalTreeFileCount: tree.length,
    budgetCharsUsed,
    budgetCharsTotal,
    summary,
    symbolIndex,
    importGraph,
    diagnostics,
    fromCache: false,
  }

  const cacheEntry: CachedRepoEntry = {
    headSha,
    cachedAt: Date.now(),
    tree,
    files,
    rankedMetadata,
    fileAstsByPath,
    skippedForBudget,
    budgetCharsUsed,
    budgetCharsTotal,
    metadata,
    detection,
    summary,
    symbolIndex,
    importGraph,
    diagnostics,
  }
  return { intel, tree, cacheEntry }
}

/** Patches an existing cache entry for just the files that changed, instead
 *  of re-running the whole pipeline. */
async function applyIncremental(
  owner: string,
  repo: string,
  cached: CachedRepoEntry,
  changed: { path: string; status: "added" | "modified" | "removed" | "renamed" }[],
  headSha: string
): Promise<CachedRepoEntry> {
  const tree = [...cached.tree]
  const files = [...cached.files]
  const fileAstsByPath = new Map(cached.fileAstsByPath)
  const symbolIndex = new Map(cached.symbolIndex)

  for (const change of changed) {
    // Drop whatever we had for this path first, regardless of the change
    // type — "modified" and "removed" both start by forgetting the old data.
    removeFileFromSymbolIndex(symbolIndex, change.path)
    fileAstsByPath.delete(change.path)
    const existingFileIdx = files.findIndex((f) => f.path === change.path)
    if (existingFileIdx !== -1) files.splice(existingFileIdx, 1)
    const existingTreeIdx = tree.findIndex((f) => f.path === change.path)
    if (existingTreeIdx !== -1) tree.splice(existingTreeIdx, 1)

    if (change.status === "removed") continue

    // added / modified / renamed: re-fetch and re-parse just this one file.
    const raw = await getFileContent(owner, repo, change.path)
    if (raw === null) continue

    tree.push({ path: change.path, mode: "100644", type: "blob", sha: "", size: raw.length, url: "" })

    const ast = await extractFileAst(change.path, raw).catch(() => null)
    if (ast) {
      addFileToSymbolIndex(symbolIndex, ast)
      fileAstsByPath.set(change.path, fileAstToIndexed(ast))
    }

    // Re-score just this file the same way the full pipeline would, so it
    // gets a fair shot at being included in the read set on next full pass —
    // for the cached response itself, a lightweight re-read is enough.
    files.push({
      path: change.path,
      content: raw.slice(0, 4000),
      truncated: raw.length > 4000,
      section: "coreSource",
      reason: "updated since last index",
      budgetUsed: Math.min(raw.length, 4000),
    })
  }

  const metadata = await getRepoMetadata(owner, repo)
  const treePaths = tree.map((f) => f.path)
  const detection = detectTechStack(treePaths, files, metadata)
  const packageJson = await packageJsonFrom(files)
  const ranked = selectPriorityFiles(tree)
  const summary = buildRepositorySummary(metadata, detection, ranked, files, packageJson)
  const diagnostics = await getDiagnostics(owner, repo, metadata.defaultBranch)

  return {
    headSha,
    cachedAt: Date.now(),
    tree,
    files,
    rankedMetadata: cached.rankedMetadata,
    fileAstsByPath,
    skippedForBudget: cached.skippedForBudget,
    budgetCharsUsed: cached.budgetCharsUsed,
    budgetCharsTotal: cached.budgetCharsTotal,
    metadata,
    detection,
    summary,
    symbolIndex,
    importGraph: cached.importGraph,
    diagnostics,
  }
}

function intelligenceFromCache(entry: CachedRepoEntry): RepoIntelligence {
  return {
    metadata: entry.metadata,
    detection: entry.detection,
    files: entry.files,
    rankedMetadata: entry.rankedMetadata,
    skippedForBudget: entry.skippedForBudget,
    totalTreeFileCount: entry.tree.length,
    budgetCharsUsed: entry.budgetCharsUsed,
    budgetCharsTotal: entry.budgetCharsTotal,
    summary: entry.summary,
    symbolIndex: entry.symbolIndex,
    importGraph: entry.importGraph,
    diagnostics: entry.diagnostics,
    fromCache: true,
  }
}

/**
 * Runs the ingestion pipeline for one repo, now cache- and incremental-aware:
 *
 *   check cache -> unchanged? return as-is (no GitHub calls beyond one SHA check)
 *               -> changed, small diff? patch just those files
 *               -> changed, big diff / no cache? full pipeline
 *
 * Still the only function route.ts needs to call.
 */
export async function gatherRepositoryIntelligence(
  owner: string,
  repo: string,
  opts: GatherOptions = {}
): Promise<GatherResult> {
  const cached = getCachedEntry(owner, repo)

  if (cached) {
    const branch = cached.metadata.defaultBranch
    const headSha = await getHeadSha(owner, repo, branch)

    if (headSha && headSha === cached.headSha) {
      return { intelligence: intelligenceFromCache(cached), tree: cached.tree }
    }

    if (headSha) {
      const changed = await getChangedFiles(owner, repo, cached.headSha, headSha)
      if (changed && changed.length > 0 && changed.length <= MAX_INCREMENTAL_CHANGED_FILES) {
        const updated = await applyIncremental(owner, repo, cached, changed, headSha)
        setCachedEntry(owner, repo, updated)
        return { intelligence: intelligenceFromCache(updated), tree: updated.tree }
      }
    }
    // fall through to a full rebuild — cache miss on the diff, or the diff was too large to trust
  }

  const { intel, tree, cacheEntry } = await buildFresh(owner, repo, opts)
  setCachedEntry(owner, repo, cacheEntry)
  return { intelligence: intel, tree }
}

export * from "./types"
export { buildAnalysisPrompt } from "./buildPrompt"
export { parseRepoUrl, GithubApiError } from "./github"
export { lookupSymbol, searchSymbols } from "./symbolIndex"
export { rebuildImportGraphFromCache }
