import type { GitTreeEntry, ReadFile, RepoIntelligence } from "./types"

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function languageBreakdownLines(breakdown: Record<string, number>): string {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)
  if (total === 0) return "  (not available)"
  return Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([lang, bytes]) => `  - ${lang}: ${((bytes / total) * 100).toFixed(1)}%`)
    .join("\n")
}

/** A compact directory listing (paths only, no content) so the model has a
 *  sense of overall shape even for files that didn't make the cut to be read. */
function repositoryStructureBlock(tree: GitTreeEntry[], maxLines = 120): string {
  const paths = tree.map((f) => f.path).sort()
  const shown = paths.slice(0, maxLines)
  const remainder = paths.length - shown.length
  return shown.join("\n") + (remainder > 0 ? `\n... and ${remainder} more files` : "")
}

function filesBlock(files: ReadFile[], section: ReadFile["section"], heading: string): string {
  const matches = files.filter((f) => f.section === section)
  if (matches.length === 0) return ""
  const body = matches
    .map((f) => `#### ${f.path}${f.truncated ? " (truncated)" : ""}\n${f.content}`)
    .join("\n\n")
  return `## ${heading}\n\n${body}\n`
}

export function buildAnalysisPrompt(intel: RepoIntelligence, tree: GitTreeEntry[]): string {
  const { metadata, detection, files, skippedForBudget, totalTreeFileCount, budgetCharsUsed, budgetCharsTotal, summary, diagnostics } = intel

  const parts: string[] = []

  parts.push(`# Repository Metadata

- Repo: ${metadata.owner}/${metadata.repo}
- Description: ${metadata.description ?? "(none provided)"}
- Primary language (GitHub-detected): ${metadata.primaryLanguage ?? "unknown"}
- Language breakdown:
${languageBreakdownLines(metadata.languageBreakdown)}
- Stars: ${metadata.stars} · Forks: ${metadata.forks} · Open issues: ${metadata.openIssuesCount}
- License: ${metadata.license ?? "none detected"}
- Topics: ${metadata.topics.length ? metadata.topics.join(", ") : "(none)"}
- Default branch: ${metadata.defaultBranch}
- Last pushed: ${metadata.pushedAt ?? "unknown"}
- Repository type: ${detection.repositoryType}${detection.monorepoTool ? ` (${detection.monorepoTool})` : ""}`)

  parts.push(`# Repository Intelligence (derived, not guessed — from manifests, config files, and folder structure actually present in this repo)

- Framework: ${detection.framework ?? "none detected"}
- Runtime: ${detection.runtime ?? "unknown"}
- Package manager: ${detection.packageManager ?? "unknown"}
- Build tool: ${detection.buildTool ?? "none detected"}
- Testing: ${detection.testing.length ? detection.testing.join(", ") : "none detected"}
- Linting: ${detection.linting.length ? detection.linting.join(", ") : "none detected"}
- Styling: ${detection.styling.length ? detection.styling.join(", ") : "none detected"}
- Database: ${detection.database.length ? detection.database.join(", ") : "none detected"}
- ORM: ${detection.orm.length ? detection.orm.join(", ") : "none detected"}
- Deployment targets: ${detection.deployment.length ? detection.deployment.join(", ") : "none detected"}`)

  parts.push(`# Architecture Summary (computed once for this commit, reused across requests)

- Routing: ${summary.routing ?? "not detected"}
- State management: ${summary.stateManagement.length ? summary.stateManagement.join(", ") : "none detected"}
- API layer: ${summary.apiLayer.length ? summary.apiLayer.join(", ") : "none detected"}
- Authentication: ${summary.authentication.length ? summary.authentication.join(", ") : "none detected"}
- Entry points: ${summary.entryPoints.length ? summary.entryPoints.join(", ") : "none identified"}
- Important folders:
${summary.importantFolders.map((f) => `  - ${f.path} (${f.reason})`).join("\n") || "  (none stood out)"}
- Major libraries: ${summary.majorLibraries.length ? summary.majorLibraries.join(", ") : "(none beyond what's listed above)"}`)

  if (diagnostics && diagnostics.ciStatus !== null) {
    parts.push(`# CI Status (secondary context — inform your reasoning with this, don't lead the analysis with it)

- Latest CI run: ${diagnostics.ciStatus}${diagnostics.ciWorkflowName ? ` (${diagnostics.ciWorkflowName})` : ""}
${diagnostics.notes.map((n) => `- ${n}`).join("\n")}`)
  }

  parts.push(`# Repository Structure

${totalTreeFileCount} tracked files total (node_modules/dist/build/coverage/vendor/binaries excluded). A sample of paths:

${repositoryStructureBlock(tree)}`)

  const sectionOrder: { section: ReadFile["section"]; heading: string }[] = [
    { section: "documentation", heading: "Documentation" },
    { section: "dependencies", heading: "Package Dependencies" },
    { section: "configuration", heading: "Configuration" },
    { section: "entryPoints", heading: "Entry Points" },
    { section: "ci", heading: "CI / Workflows" },
    { section: "contribution", heading: "Contribution Files" },
    { section: "coreSource", heading: "Important Source Files" },
  ]
  for (const { section, heading } of sectionOrder) {
    const block = filesBlock(files, section, heading)
    if (block) parts.push(block)
  }

  if (skippedForBudget.length > 0) {
    parts.push(`# Not Read (ranked, but cut off by the context budget)

${skippedForBudget.slice(0, 30).join("\n")}${skippedForBudget.length > 30 ? `\n... and ${skippedForBudget.length - 30} more` : ""}

(${formatBytes(budgetCharsUsed)} of a ${formatBytes(budgetCharsTotal)} content budget was used on the files above.)`)
  }

  return parts.join("\n\n---\n\n")
}
