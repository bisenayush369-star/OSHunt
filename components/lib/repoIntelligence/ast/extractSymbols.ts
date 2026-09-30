import { Query, type Tree } from "web-tree-sitter"
import { parseFile, type SupportedLanguage } from "./parser"
import { queriesFor } from "./queries"

export interface ExtractedSymbol {
  kind: "function" | "class" | "interface" | "type"
  name: string
  startLine: number
  endLine: number
  /** The declaration signature line(s) — not the full body. */
  signature: string
}

export interface ExtractedImport {
  /** Raw import source as written, e.g. "./utils" or "react" — not yet resolved to a file. */
  source: string
  startLine: number
}

export interface FileAst {
  path: string
  language: SupportedLanguage
  symbols: ExtractedSymbol[]
  imports: ExtractedImport[]
}

const queryCache = new Map<string, Query>()

async function getQuery(lang: SupportedLanguage, kind: "symbols" | "imports", source: string): Promise<Query> {
  const cacheKey = `${lang}:${kind}`
  const cached = queryCache.get(cacheKey)
  if (cached) return cached

  const { getLanguage } = await import("./parser")
  const language = await getLanguage(lang)
  const query = new Query(language, source)
  queryCache.set(cacheKey, query)
  return query
}

function signatureLine(text: string): string {
  // First line only, trimmed — enough to show a real signature without
  // dumping the whole function body into the prompt.
  const firstLine = text.split("\n")[0]
  return firstLine.length > 160 ? firstLine.slice(0, 160) + "…" : firstLine
}

function symbolKindFromCaptureName(name: string): ExtractedSymbol["kind"] {
  if (name === "symbol.class") return "class"
  if (name === "symbol.interface") return "interface"
  if (name === "symbol.type") return "type"
  return "function"
}

/**
 * Parses a file and extracts real symbol declarations + import statements
 * from its AST — the accurate replacement for smartRead.ts's regex-based
 * `extractSymbols`, which just pattern-matched lines and had no real
 * understanding of scope, multi-line signatures, or nesting.
 *
 * Returns null for unsupported languages/extensions so the caller can fall
 * back to the regex heuristic — this is additive, not a hard replacement,
 * since AST parsing only covers the languages with a loaded grammar.
 */
export async function extractFileAst(path: string, source: string): Promise<FileAst | null> {
  const parsed = await parseFile(path, source)
  if (!parsed) return null
  const { tree, language } = parsed

  const { symbols, imports } = queriesFor(language)

  const symbolMatches = (await getQuery(language, "symbols", symbols)).matches(tree.rootNode)
  const extractedSymbols: ExtractedSymbol[] = []
  const seenNodeIds = new Set<number>()

  for (const match of symbolMatches) {
    const declCapture = match.captures.find((c) => c.name.startsWith("symbol."))
    const nameCapture = match.captures.find((c) => c.name === "name")
    if (!declCapture || !nameCapture) continue
    // The same declaration can be captured by more than one pattern (e.g. a
    // plain function_declaration AND the export_statement wrapping it) —
    // dedupe by node id so it only shows up once.
    if (seenNodeIds.has(declCapture.node.id)) continue
    seenNodeIds.add(declCapture.node.id)

    extractedSymbols.push({
      kind: symbolKindFromCaptureName(declCapture.name),
      name: nameCapture.node.text,
      startLine: declCapture.node.startPosition.row + 1,
      endLine: declCapture.node.endPosition.row + 1,
      signature: signatureLine(declCapture.node.text),
    })
  }

  const importMatches = (await getQuery(language, "imports", imports)).matches(tree.rootNode)
  const extractedImports: ExtractedImport[] = []
  const seenImportIds = new Set<number>()

  for (const match of importMatches) {
    const importCapture = match.captures.find((c) => c.name === "import")
    const sourceCapture = match.captures.find((c) => c.name === "source")
    if (!importCapture) continue
    if (seenImportIds.has(importCapture.node.id)) continue
    seenImportIds.add(importCapture.node.id)

    const rawSource = sourceCapture?.node.text ?? importCapture.node.text
    extractedImports.push({
      source: rawSource.replace(/^['"]|['"]$/g, ""),
      startLine: importCapture.node.startPosition.row + 1,
    })
  }

  return { path, language, symbols: extractedSymbols, imports: extractedImports }
}

/** Renders extracted symbols back into the compact "exported symbols" text
 *  block smartRead.ts already knows how to slot into a file's prompt entry
 *  — same output shape as the regex version, real data underneath. */
export function formatSymbolsForPrompt(ast: FileAst): string {
  if (ast.symbols.length === 0) return ""
  const lines = ast.symbols
    .slice(0, 25)
    .map((s) => `${s.signature}  // ${s.kind}, L${s.startLine}-${s.endLine}`)
  return `\n\n// --- symbols (AST-verified) ---\n${lines.join("\n")}`
}
