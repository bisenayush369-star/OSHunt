import axios from "axios"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import { getGithubAuthHeader } from "../github"
import type { CachedRepoEntry, IndexedSymbol, ScoredFile } from "./types"
import type { ImportGraph } from "./ast/importGraph"

export interface CacheProvider {
  get<T>(key: string): T | null
  set<T>(key: string, value: T): void
  delete(key: string): void
  clear(): void
}

class MemoryCacheProvider implements CacheProvider {
  private readonly cache = new Map<string, unknown>()
  private readonly maxEntries = 200

  get<T>(key: string): T | null {
    return (this.cache.get(key) as T | null) ?? null
  }

  set<T>(key: string, value: T): void {
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value
      if (oldest) this.cache.delete(oldest)
    }
    this.cache.set(key, value)
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

class FileCacheProvider implements CacheProvider {
  private readonly cacheFilePath: string
  private cache = new Map<string, unknown>()
  private loaded = false

  constructor() {
    this.cacheFilePath = path.join(process.cwd(), ".cache", "repo-intelligence-cache.json")
  }

  private ensureLoaded(): void {
    if (this.loaded) return
    if (existsSync(this.cacheFilePath)) {
      try {
        const raw = readFileSync(this.cacheFilePath, "utf8")
        const parsed = JSON.parse(raw)
        this.cache = new Map(Object.entries(parsed))
      } catch {
        this.cache = new Map()
      }
    }
    this.loaded = true
  }

  private persist(): void {
    mkdirSync(path.dirname(this.cacheFilePath), { recursive: true })
    writeFileSync(this.cacheFilePath, JSON.stringify(Object.fromEntries(this.cache)), "utf8")
  }

  get<T>(key: string): T | null {
    this.ensureLoaded()
    return (this.cache.get(key) as T | null) ?? null
  }

  set<T>(key: string, value: T): void {
    this.ensureLoaded()
    this.cache.set(key, value)
    this.persist()
  }

  delete(key: string): void {
    this.ensureLoaded()
    this.cache.delete(key)
    this.persist()
  }

  clear(): void {
    this.cache.clear()
    this.persist()
  }
}

export function createCacheProvider(): CacheProvider {
  const backend = process.env.REPO_INTELLIGENCE_CACHE_BACKEND?.toLowerCase()
  if (backend === "file") return new FileCacheProvider()
  return new MemoryCacheProvider()
}

const provider = createCacheProvider()

function cacheKey(owner: string, repo: string): string {
  return `${owner}/${repo}`.toLowerCase()
}

function serializeEntry(entry: CachedRepoEntry): Record<string, unknown> {
  return {
    ...entry,
    fileAstsByPath: Object.fromEntries(entry.fileAstsByPath.entries()),
    symbolIndex: Array.from(entry.symbolIndex.entries()),
    importGraph: {
      edges: entry.importGraph.edges,
      importedBy: Object.fromEntries(entry.importGraph.importedBy.entries()),
      imports: Object.fromEntries(entry.importGraph.imports.entries()),
    },
  }
}

function deserializeEntry(value: Record<string, unknown>): CachedRepoEntry {
  const entry = value as unknown as CachedRepoEntry & {
    fileAstsByPath?: Record<string, { symbols: IndexedSymbol[]; imports: string[] }>
    symbolIndex?: Array<[string, IndexedSymbol[]]>
    importGraph?: {
      edges: ImportGraph["edges"]
      importedBy: Record<string, string[]>
      imports: Record<string, string[]>
    }
  }

  return {
    ...entry,
    fileAstsByPath: new Map(Object.entries(entry.fileAstsByPath ?? {})),
    symbolIndex: new Map(entry.symbolIndex ?? []),
    importGraph: {
      edges: entry.importGraph?.edges ?? [],
      importedBy: new Map(Object.entries(entry.importGraph?.importedBy ?? {})),
      imports: new Map(Object.entries(entry.importGraph?.imports ?? {})),
    },
    rankedMetadata: (entry.rankedMetadata ?? []) as ScoredFile[],
  } as unknown as CachedRepoEntry
}

export function getCachedEntry(owner: string, repo: string): CachedRepoEntry | null {
  const entry = provider.get<Record<string, unknown>>(cacheKey(owner, repo))
  return entry ? deserializeEntry(entry) : null
}

export function setCachedEntry(owner: string, repo: string, entry: CachedRepoEntry): void {
  provider.set(cacheKey(owner, repo), serializeEntry(entry))
}

export function clearCachedEntry(owner: string, repo: string): void {
  provider.delete(cacheKey(owner, repo))
}

async function authHeaders() {
  const authHeader = await getGithubAuthHeader()
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
  }
}

/** Cheap: one small request, not a full tree fetch, just to check whether
 *  anything has changed since the cached entry. */
export async function getHeadSha(owner: string, repo: string, branch: string): Promise<string | null> {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(branch)}`,
      { headers: await authHeaders(), timeout: 8_000, validateStatus: () => true }
    )
    return res.status === 200 ? res.data?.sha ?? null : null
  } catch {
    return null
  }
}

export interface ChangedFile {
  path: string
  status: "added" | "modified" | "removed" | "renamed"
}

/**
 * Real changed-file list via GitHub's compare API — this is what makes
 * re-indexing actually incremental instead of "invalidate on any change."
 * Falls back to `null` (meaning: caller should treat this as a full
 * re-index) if the diff is too large for GitHub to return in one page or
 * the API call fails — both are edge cases (a genuinely massive rebase/
 * force-push), not the common case of "a few files changed."
 */
export async function getChangedFiles(owner: string, repo: string, baseSha: string, headSha: string): Promise<ChangedFile[] | null> {
  if (baseSha === headSha) return []
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/compare/${baseSha}...${headSha}`,
      { headers: await authHeaders(), timeout: 10_000, validateStatus: () => true }
    )
    if (res.status !== 200) return null
    if (res.data?.status === "diverged" && !res.data?.files) return null

    const files = res.data?.files as { filename: string; status: string }[] | undefined
    if (!files) return null

    return files.map((f) => ({
      path: f.filename,
      status: (["added", "modified", "removed", "renamed"].includes(f.status) ? f.status : "modified") as ChangedFile["status"],
    }))
  } catch {
    return null
  }
}
