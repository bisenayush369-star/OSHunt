import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/components/lib/auth"
import { generateLLMResponse } from "@/components/lib/llmRouter"
import { canAffordUsage, consumeQuota } from "@/components/lib/quota"
import { buildDivePrompt, buildDiveSystemPrompt, normalizeLevel } from "@/components/lib/gitlensePrompts"

// One file is read and explained per call. Lower or remove this if your host caps function time below it.
export const maxDuration = 60

const TIMEOUT_MS = 45_000
const FETCH_MS = 10_000
const MAX_BODY_CHARS = 8_000
const MAX_CONTEXT_CHARS = 3_000
const MAX_PATH_CHARS = 300
const MAX_FETCH_BYTES = 96_000 // only the start of a file is explained
const MAX_FILE_CHARS = 12_000

// Owner and repo names are restricted to what GitHub allows, because they end up inside a URL and a prompt.
const REPO_URL = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?$/i
const NOT_TEXT = /\.(png|jpe?g|gif|webp|avif|ico|bmp|svgz?|pdf|zip|gz|tgz|tar|7z|rar|woff2?|ttf|otf|eot|mp[34]|mov|webm|wav|ogg|wasm|jar|class|exe|dll|so|dylib|bin|lock|map)$/i

class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function fail(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

async function readJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  const rawBody = await req.text().catch(() => "")
  if (rawBody.length > MAX_BODY_CHARS) throw new HttpError(413, "Request too large.")
  try {
    const data: unknown = JSON.parse(rawBody)
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>
  } catch {
    // fall through to the 400 below
  }
  throw new HttpError(400, "Invalid request.")
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error("Timed out"), { code: "TIMEOUT" })), ms)
  })
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

/** A repo-relative file path, or null. Dot segments are refused so a path can never climb out of the repository. */
function cleanPath(v: unknown): string | null {
  if (typeof v !== "string") return null
  const path = v.trim().replace(/^\.?\//, "")
  if (!path || path.length > MAX_PATH_CHARS || /[\\\u0000-\u001f]/.test(path)) return null
  const segments = path.split("/")
  return segments.some((s) => !s || s === "." || s === "..") ? null : path
}

/** Reads at most `limit` bytes, so a huge file costs no more than a small one. */
async function readStart(res: Response, limit: number) {
  const reader = res.body?.getReader()
  if (!reader) return { text: (await res.text()).slice(0, limit), cut: false }
  const chunks: Uint8Array[] = []
  let total = 0
  let cut = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.length
    if (total >= limit) {
      cut = true
      await reader.cancel().catch(() => undefined)
      break
    }
  }
  return { text: new TextDecoder().decode(Buffer.concat(chunks)), cut }
}

async function fetchFile(owner: string, repo: string, path: string) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path.split("/").map(encodeURIComponent).join("/")}`
  let res: Response
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(FETCH_MS), headers: { "User-Agent": "GitLense" } })
  } catch {
    throw new HttpError(502, "Couldn't reach GitHub to read that file. Try again.")
  }
  if (res.status === 404) throw new HttpError(404, "That file isn't on the repository's default branch.")
  if (res.status === 403 || res.status === 429) throw new HttpError(429, "GitHub's rate limit was reached. Try again in a few minutes.")
  if (!res.ok) throw new HttpError(502, "Couldn't read that file from GitHub. Try again.")
  const { text, cut } = await readStart(res, MAX_FETCH_BYTES)
  if (text.includes("\u0000")) throw new HttpError(415, "That looks like a binary file, so there is nothing to explain.")
  return { content: text.slice(0, MAX_FILE_CHARS), truncated: cut || text.length > MAX_FILE_CHARS, lines: text.split("\n").length }
}

// ── Reading the model's answer ───────────────────────────────────────────────

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(cleaned.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

function normalizeDive(raw: unknown) {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const summary = clip(r.summary, 600)
  if (!summary) return null

  const parts: { name: string; what: string }[] = []
  for (const item of Array.isArray(r.parts) ? r.parts : []) {
    if (!item || typeof item !== "object") continue
    const name = clip((item as Record<string, unknown>).name, 80)
    const what = clip((item as Record<string, unknown>).what, 240)
    if (name && what) parts.push({ name, what })
    if (parts.length === 6) break
  }

  const change: string[] = []
  for (const item of Array.isArray(r.change) ? r.change : []) {
    const tip = clip(item, 260)
    if (tip && !change.includes(tip)) change.push(tip)
    if (change.length === 3) break
  }

  const tryIt = clip(r.tryIt, 160).replace(/^`+|`+$/g, "").replace(/^\$\s+/, "")
  return { summary, parts, change, watchOut: clip(r.watchOut, 260), tryIt: /[\r\n]/.test(tryIt) ? "" : tryIt }
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return fail("Unauthorized", 401)

    const body = await readJsonBody(req)
    const repoMatch = typeof body.repoUrl === "string" ? REPO_URL.exec(body.repoUrl.trim().slice(0, 300)) : null
    if (!repoMatch) throw new HttpError(400, "Invalid GitHub URL")
    const [, owner, repo] = repoMatch

    const path = cleanPath(body.path)
    if (!path) throw new HttpError(400, "Invalid file path.")
    if (NOT_TEXT.test(path)) throw new HttpError(415, "That kind of file can't be explained.")

    const level = normalizeLevel(body.expertiseLevel)
    const context = typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT_CHARS) : ""

    const quotaCheck = await canAffordUsage(userId, { ai: 1 })
    if (!quotaCheck.allowed) {
      const reason = quotaCheck.reason || "You've reached your usage limit."
      return fail(reason, 403, { reason })
    }

    const file = await fetchFile(owner, repo, path)
    const { text } = await withTimeout(
      generateLLMResponse(
        [{ role: "user", content: buildDivePrompt({ owner, repo, path, content: file.content, truncated: file.truncated, context }) }],
        buildDiveSystemPrompt(level)
      ),
      TIMEOUT_MS
    )
    const answer = typeof text === "string" ? text.trim() : ""
    if (!answer) throw new HttpError(502, "The model returned an empty answer. Try again.")

    // An answer we can't read costs the user nothing: quota is only consumed once there is something to show.
    const dive = normalizeDive(extractJson(answer))
    if (!dive) throw new HttpError(502, "Couldn't read the explanation. Try again.")
    await consumeQuota(userId, { ai: 1 })

    return NextResponse.json({ path, lines: file.lines, truncated: file.truncated, ...dive })
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status)
    const timedOut = (err as { code?: unknown } | null)?.code === "TIMEOUT"
    const detail = err as { response?: { data?: unknown }; message?: string } | null
    console.error("/api/gitlense/dive failed:", detail?.response?.data || detail?.message || "Unknown error")
    return timedOut ? fail("The explanation took too long. Try again.", 504) : fail("Couldn't explain this file. Try again.", 500)
  }
}