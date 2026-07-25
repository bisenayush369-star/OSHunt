import { getRepoMetadata, getRepoTree } from "./github"
import { selectPriorityFiles } from "./scoring"
import { readPriorityFiles } from "./smartRead"
import { detectTechStack } from "./detect"
import type { GitTreeEntry, RepoIntelligence } from "./types"

export interface GatherOptions {
  totalBudgetChars?: number
  maxCandidateFiles?: number
}

export interface GatherResult {
  intelligence: RepoIntelligence
  tree: GitTreeEntry[]
}

/**
 * Runs the full ingestion pipeline for one repo:
 *   metadata -> tree -> priority scoring -> smart reading -> tech detection
 *
 * This is the only function route.ts needs to call — everything else in
 * this folder is an implementation detail of *how* it gathers context.
 */
export async function gatherRepositoryIntelligence(
  owner: string,
  repo: string,
  opts: GatherOptions = {}
): Promise<GatherResult> {
  const metadata = await getRepoMetadata(owner, repo)
  const tree = await getRepoTree(owner, repo, metadata.defaultBranch)

  const ranked = selectPriorityFiles(tree, { maxCandidates: opts.maxCandidateFiles ?? 200 })
  const { files, skippedForBudget, budgetCharsUsed, budgetCharsTotal } = await readPriorityFiles(
    owner,
    repo,
    ranked,
    opts.totalBudgetChars ?? 45_000
  )

  const treePaths = tree.map((f) => f.path)
  const detection = detectTechStack(treePaths, files, metadata)

  const intelligence: RepoIntelligence = {
    metadata,
    detection,
    files,
    skippedForBudget,
    totalTreeFileCount: tree.length,
    budgetCharsUsed,
    budgetCharsTotal,
  }

  return { intelligence, tree }
}

export * from "./types"
export { buildAnalysisPrompt } from "./buildPrompt"
export { parseRepoUrl, GithubApiError } from "./github"
