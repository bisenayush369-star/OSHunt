import type { FileAst } from "./extractSymbols"

export interface ImportEdge {
  from: string
  to: string
  /** false for anything that didn't resolve to a file actually in this repo
   *  (npm packages, stdlib modules, etc.) — kept for completeness but callers
   *  building a *repo-internal* graph will usually filter these out. */
  resolved: boolean
}

export interface ImportGraph {
  edges: ImportEdge[]
  /** path -> paths that import it. The useful direction for "what breaks if
   *  I change this file" — the whole reason to build this graph at all. */
  importedBy: Map<string, string[]>
  /** path -> paths it imports. */
  imports: Map<string, string[]>
}

const RESOLVABLE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]

/**
 * Resolves a relative import ("./foo", "../lib/bar") against the importing
 * file's directory into an actual repo path, by checking it (and its
 * extension/index-file variants) against the known set of real paths.
 * Bare specifiers ("react", "@/lib/x" path-alias imports, stdlib) are left
 * unresolved — this is intentionally simple relative-path resolution, not a
 * full module-resolution algorithm (no tsconfig `paths` awareness yet; see
 * the roadmap for that as a follow-up).
 */
function resolveRelativeImport(fromPath: string, source: string, knownPaths: Set<string>): string | null {
  if (!source.startsWith(".")) return null

  const fromDir = fromPath.split("/").slice(0, -1)
  const parts = source.split("/")
  const stack = [...fromDir]

  for (const part of parts) {
    if (part === "." || part === "") continue
    if (part === "..") stack.pop()
    else stack.push(part)
  }
  const base = stack.join("/")

  if (knownPaths.has(base)) return base
  for (const ext of RESOLVABLE_EXTENSIONS) {
    if (knownPaths.has(base + ext)) return base + ext
  }
  for (const ext of RESOLVABLE_EXTENSIONS) {
    if (knownPaths.has(`${base}/index${ext}`)) return `${base}/index${ext}`
  }
  return null
}

/**
 * Builds a repo-internal import graph from a set of already-AST-parsed
 * files. Only meaningful once you've run extractFileAst across (a
 * meaningful chunk of) the repo — the more files parsed, the more edges
 * resolve, since resolution is just "does this path exist in what we have."
 */
export function buildImportGraph(fileAsts: FileAst[]): ImportGraph {
  const knownPaths = new Set(fileAsts.map((f) => f.path))
  const edges: ImportEdge[] = []
  const imports = new Map<string, string[]>()
  const importedBy = new Map<string, string[]>()

  for (const file of fileAsts) {
    for (const imp of file.imports) {
      const resolved = resolveRelativeImport(file.path, imp.source, knownPaths)
      edges.push({ from: file.path, to: resolved ?? imp.source, resolved: resolved !== null })

      if (resolved) {
        if (!imports.has(file.path)) imports.set(file.path, [])
        imports.get(file.path)!.push(resolved)

        if (!importedBy.has(resolved)) importedBy.set(resolved, [])
        importedBy.get(resolved)!.push(file.path)
      }
    }
  }

  return { edges, imports, importedBy }
}

/** "What would changing this file plausibly affect" — direct importers only
 *  (one hop). Useful as a cheap blast-radius signal without a full
 *  transitive-closure walk, which needs the whole-repo graph to be
 *  meaningful anyway. */
export function directDependents(graph: ImportGraph, path: string): string[] {
  return graph.importedBy.get(path) ?? []
}
