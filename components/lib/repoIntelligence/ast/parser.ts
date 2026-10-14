import fs from "node:fs"
import path from "node:path"
import { Parser, Language } from "web-tree-sitter"

/**
 * Loads and caches tree-sitter WASM grammars.
 *
 * PINNED VERSION NOTE (found by actually testing, not assumed): the prebuilt
 * grammars in `tree-sitter-wasms` (last published against an older
 * tree-sitter core) fail to load under `web-tree-sitter@0.26.x` with a
 * "getDylinkMetadata" error — the WASM dynamic-linking metadata format
 * changed between core versions. `web-tree-sitter@0.25.6` loads them
 * correctly. Pin it explicitly:
 *
 *   npm install web-tree-sitter@0.25.6 tree-sitter-wasms@0.1.13
 *
 * If you bump either package later, re-run the smoke test at the bottom of
 * this file before trusting it in production — don't assume newer is
 * compatible.
 */

export type SupportedLanguage =
  | "typescript" | "tsx" | "javascript"
  | "python" | "go" | "rust" | "java" | "c_sharp" | "c" | "cpp"
  | "ruby" | "php"

const GRAMMAR_FILES: Record<SupportedLanguage, string> = {
  typescript: "tree-sitter-typescript.wasm",
  tsx: "tree-sitter-tsx.wasm",
  javascript: "tree-sitter-javascript.wasm",
  python: "tree-sitter-python.wasm",
  go: "tree-sitter-go.wasm",
  rust: "tree-sitter-rust.wasm",
  java: "tree-sitter-java.wasm",
  c_sharp: "tree-sitter-c_sharp.wasm",
  c: "tree-sitter-c.wasm",
  cpp: "tree-sitter-cpp.wasm",
  ruby: "tree-sitter-ruby.wasm",
  php: "tree-sitter-php.wasm",
}

const EXT_TO_LANGUAGE: Record<string, SupportedLanguage> = {
  ts: "typescript", mts: "typescript", cts: "typescript",
  tsx: "tsx",
  js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  cs: "c_sharp",
  c: "c", h: "c",
  cpp: "cpp", cc: "cpp", hpp: "cpp",
  rb: "ruby",
  php: "php",
}

export function languageForPath(path: string): SupportedLanguage | null {
  const ext = path.split(".").pop()?.toLowerCase()
  if (!ext) return null
  return EXT_TO_LANGUAGE[ext] ?? null
}

let initPromise: Promise<void> | null = null
const languageCache = new Map<SupportedLanguage, Language>()
const parserCache = new Map<SupportedLanguage, Parser>()

function resolveWasmDir(): string {
  if (process.env.TREE_SITTER_WASM_DIR?.trim()) {
    return process.env.TREE_SITTER_WASM_DIR.trim()
  }

  const candidateDirs = [
    path.join(process.cwd(), "public", "wasm"),
    path.join(process.cwd(), "node_modules", "tree-sitter-wasms", "out"),
    "./wasm",
  ]

  for (const candidate of candidateDirs) {
    if (candidate === "./wasm") continue
    if (fs.existsSync(candidate)) return candidate
  }

  return path.join(process.cwd(), "node_modules", "tree-sitter-wasms", "out")
}

/** Where the .wasm grammar files live at runtime. We prefer the real package
 *  files from `node_modules/tree-sitter-wasms/out` and only fall back to a
 *  `public/wasm` copy if one exists. Using the installed package path avoids
 *  the Netlify/serverless production failure where the app was trying to
 *  load `./wasm/...` even though that directory never existed. */
const WASM_DIR = resolveWasmDir()

async function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = Parser.init().catch((error) => {
      initPromise = null
      throw error
    })
  }
  return initPromise
}

export async function getLanguage(lang: SupportedLanguage): Promise<Language> {
  const cached = languageCache.get(lang)
  if (cached) return cached

  await ensureInit()
  const file = GRAMMAR_FILES[lang]
  const wasmPath = path.join(WASM_DIR, file)
  const loaded = await Language.load(wasmPath)
  languageCache.set(lang, loaded)
  return loaded
}

export async function getParser(lang: SupportedLanguage): Promise<Parser> {
  const cached = parserCache.get(lang)
  if (cached) return cached

  const language = await getLanguage(lang)
  const parser = new Parser()
  parser.setLanguage(language)
  parserCache.set(lang, parser)
  return parser
}

/** Parses source for a given file path. Returns null for unsupported
 *  extensions (the caller should fall back to the regex-based extractor
 *  in smartRead.ts for those) rather than throwing. */
export async function parseFile(path: string, source: string) {
  const lang = languageForPath(path)
  if (!lang) return null

  try {
    const parser = await getParser(lang)
    const tree = parser.parse(source)
    return tree ? { tree, language: lang } : null
  } catch (error) {
    console.warn(`[repoIntelligence] AST parsing unavailable for ${path}:`, error instanceof Error ? error.message : error)
    return null
  }
}
