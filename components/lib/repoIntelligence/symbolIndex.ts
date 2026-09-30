import type { FileAst, ExtractedSymbol } from "./ast/extractSymbols"
import type { IndexedSymbol, SymbolIndex, SymbolKind } from "./types"

/**
 * A flat name -> declarations lookup, nothing more. Deliberately does NOT
 * track references/usages or resolve which declaration a given call site
 * means — that's the "complex reference engine" this was explicitly scoped
 * to avoid. What it answers: "does a symbol named X exist, and where is it
 * declared." That's enough for "where is UserService defined"-style
 * questions without building (or maintaining) anything graph-shaped.
 */

/** React components don't have their own AST node type — they're just
 *  functions/consts. Heuristic: PascalCase name + the declaration text looks
 *  like it returns JSX. Good enough to be useful, not meant to be perfect. */
function looksLikeReactComponent(symbol: ExtractedSymbol): boolean {
  const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(symbol.name)
  if (!isPascalCase) return false
  if (symbol.kind !== "function") return false
  return /return\s*\(?\s*</.test(symbol.signature) || /=>\s*\(?\s*</.test(symbol.signature)
}

function refineKind(symbol: ExtractedSymbol): SymbolKind {
  if (looksLikeReactComponent(symbol)) return "component"
  return symbol.kind
}

export function addFileToSymbolIndex(index: SymbolIndex, ast: FileAst): void {
  for (const symbol of ast.symbols) {
    const entry: IndexedSymbol = {
      name: symbol.name,
      kind: refineKind(symbol),
      path: ast.path,
      line: symbol.startLine,
    }
    const existing = index.get(symbol.name)
    if (existing) existing.push(entry)
    else index.set(symbol.name, [entry])
  }
}

export function buildSymbolIndex(fileAsts: FileAst[]): SymbolIndex {
  const index: SymbolIndex = new Map()
  for (const ast of fileAsts) addFileToSymbolIndex(index, ast)
  return index
}

/** Removes every symbol previously indexed from a given file — the first
 *  step of incremental re-indexing when that file changes (see cache.ts). */
export function removeFileFromSymbolIndex(index: SymbolIndex, path: string): void {
  for (const [name, decls] of index) {
    const filtered = decls.filter((d) => d.path !== path)
    if (filtered.length === 0) index.delete(name)
    else if (filtered.length !== decls.length) index.set(name, filtered)
  }
}

export function lookupSymbol(index: SymbolIndex, name: string): IndexedSymbol[] {
  return index.get(name) ?? []
}

/** Case-insensitive substring search over symbol names — for "find anything
 *  named roughly like X" rather than an exact match. */
export function searchSymbols(index: SymbolIndex, query: string, limit = 20): IndexedSymbol[] {
  const q = query.toLowerCase()
  const results: IndexedSymbol[] = []
  for (const [name, decls] of index) {
    if (name.toLowerCase().includes(q)) {
      results.push(...decls)
      if (results.length >= limit) break
    }
  }
  return results.slice(0, limit)
}
