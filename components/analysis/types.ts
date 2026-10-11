// Client-side mirror of the shapes in the repo's analysis server module.
// Keep this import in sync with the real server file so the browser never
// sees Prisma or server-only types.
import type {
  AnalysisIssue,
  AnalysisReason,
  AnalysisResult,
  AnalysisStep,
} from "@/app/analysis/lib/analysis"

export type { AnalysisIssue, AnalysisReason, AnalysisResult, AnalysisStep }

/** The server's result plus one client-side flag: did the model actually give a score? */
export type Analysis = AnalysisResult & { scoreKnown: boolean }

export type RepoRef = { owner: string; repo: string }

export type RepoMeta = {
  description: string | null
  stars: number | null
  language: string | null
  license: string | null
}

export type ChatMessage = { role: "user" | "assistant"; content: string }

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)

/**
 * The server does `JSON.parse(modelText) as AnalysisResult` with no validation,
 * so any field can be missing or the wrong type. Fill every gap here so the UI
 * never has to guard `result.fit.reasons.map(...)` and friends.
 */
export function normalizeResult(raw: unknown): Analysis | null {
  if (!isObj(raw)) return null
  const fit = isObj(raw.fit) ? raw.fit : {}

  const reasons = (Array.isArray(fit.reasons) ? fit.reasons : [])
    .filter(isObj)
    .map((r) => ({ ok: r.ok === true, text: str(r.text) }))
    .filter((r) => r.text)

  const steps = (Array.isArray(raw.steps) ? raw.steps : [])
    .filter(isObj)
    .map((s) => ({
      title: str(s.title),
      detail: str(s.detail),
      cmd: str(s.cmd) || undefined,
    }))
    .filter((s) => s.title || s.detail)

  const issues = (Array.isArray(raw.issues) ? raw.issues : [])
    .filter(isObj)
    .map((i) => ({ number: Math.trunc(num(i.number) ?? 0), title: str(i.title), why: str(i.why) }))
    .filter((i) => i.number > 0 && i.title)

  const watch = (Array.isArray(raw.watch) ? raw.watch : []).map(str).filter(Boolean)
  const summary = str(raw.summary)
  const rawScore = num(fit.score)
  const score = Math.round(Math.min(100, Math.max(0, rawScore ?? 0)))

  if (!summary && !steps.length && !reasons.length) return null

  return {
    summary,
    fit: { score, label: str(fit.label), reasons },
    scoreKnown: rawScore !== null,
    steps,
    issues,
    watch,
  }
}

/** Accepts `{ result }`, `{ analysis }`, or the result object itself. */
export function pickResult(data: unknown): Analysis | null {
  if (!isObj(data)) return null
  return normalizeResult(data.result ?? data.analysis ?? data)
}

/** Optional: only shown when the route also sends GitHub's repo object. */
export function pickMeta(data: unknown): RepoMeta | null {
  if (!isObj(data)) return null
  const m = data.repoMeta ?? data.meta
  if (!isObj(m)) return null
  const license = isObj(m.license) ? str(m.license.spdx_id) || str(m.license.name) : ""
  const meta: RepoMeta = {
    description: str(m.description) || null,
    stars: num(m.stargazers_count) ?? num(m.stars),
    language: str(m.language) || null,
    license: license && license !== "NOASSERTION" ? license : null,
  }
  return meta.description || meta.stars !== null || meta.language || meta.license ? meta : null
}
