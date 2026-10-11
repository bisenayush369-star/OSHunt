// The only place that knows your route paths and body shapes.
// If your routes differ, change the two constants (and the bodies in use-analysis.ts / repo-chat.tsx).
export const ANALYSIS_ENDPOINT = "/api/analysis" // POST { owner, repo }            -> { result, repoMeta? }
export const ANALYSIS_CHAT_ENDPOINT = "/api/analysis/chat" // POST { owner, repo, messages } -> { reply }

export const JSON_HEADERS = { "Content-Type": "application/json" } as const

export const isAbort = (err: unknown) => (err as { name?: string } | null)?.name === "AbortError"

/** Turns a failed response into one plain sentence. Upstream error text is never shown for 5xx. */
export async function readError(res: Response): Promise<string> {
  if (res.status === 404) return "Repository not found. Check the name — private repos can't be analyzed."
  if (res.status === 403) {
    const body: unknown = await res.json().catch(() => null)
    const msg = body && typeof body === "object" ? (body as { error?: unknown }).error : null
    if (msg === "needs_github_connect") {
      return "Connect your GitHub account to analyze repos."
    }
    return "This repo isn't available to analyze right now. Try again in a moment."
  }
  if (res.status === 429) return "Too many requests right now. Wait a minute and try again."
  if (res.status >= 500) return "The analysis service had a problem. Try again in a moment."

  const body: unknown = await res.json().catch(() => null)
  const msg = body && typeof body === "object" ? (body as { error?: unknown }).error : null
  return typeof msg === "string" && msg.length > 0 && msg.length < 200
    ? msg
    : `That request didn't work (HTTP ${res.status}). Try again.`
}

export function pickReply(data: unknown): string | null {
  if (typeof data === "string") return data.trim() || null
  if (!data || typeof data !== "object") return null
  const d = data as Record<string, unknown>
  for (const key of ["reply", "response", "message", "answer"]) {
    const v = d[key]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}
