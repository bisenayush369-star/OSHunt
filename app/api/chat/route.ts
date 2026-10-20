import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/components/lib/auth"
import { generateLLMResponse } from "@/components/lib/llmRouter"
import { canAffordUsage, consumeQuota } from "@/components/lib/quota"
import { buildChatSystemPrompt, normalizeLevel } from "@/components/lib/gitlensePrompts"

// Lower or remove this if your host caps function time below it.
export const maxDuration = 60

const TIMEOUT_MS = 55_000
const MAX_BODY_CHARS = 250_000
const MAX_ANALYSIS_CHARS = 20_000
const MAX_MESSAGES = 24 // the page sends at most 12
const MAX_USER_CHARS = 2_000 // matches the page's input limit
const MAX_ASSISTANT_CHARS = 8_000

type ChatMessage = { role: "user" | "assistant"; content: string }

/** The structured answer the page renders: a direct answer first, then only the parts that help act on it. */
interface Answer {
  tldr: string
  steps: string[]
  points: string[]
  files: { path: string; why: string }[]
  commands: string[]
  watchOut: string
  followUps: string[]
}

// Owner and repo names are restricted to what GitHub allows, because they end up inside the system prompt.
const REPO_URL = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?$/i

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

/**
 * The browser owns the transcript, so it is rebuilt here rather than trusted: only user and assistant turns,
 * bounded in size and count, starting and alternating the way every provider expects.
 */
function normalizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return []
  const out: ChatMessage[] = []
  for (const m of input.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") continue
    const { role, content } = m as Record<string, unknown>
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue
    const body = content.trim().slice(0, role === "user" ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS)
    if (!body) continue
    const last = out[out.length - 1]
    if (last && last.role === role) last.content += `\n\n${body}` // e.g. a question that failed, then a new one
    else out.push({ role, content: body })
  }
  while (out.length > 0 && out[0].role !== "user") out.shift()
  return out
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

function strings(v: unknown, max: number, each: number): string[] {
  const out: string[] = []
  for (const item of Array.isArray(v) ? v : []) {
    const s = clip(item, each)
    if (s && !out.includes(s)) out.push(s)
    if (out.length === max) break
  }
  return out
}

/**
 * Rebuilds the answer from known fields, with hard limits so it stays short whatever the model wrote.
 * A file path is kept only if the analysis the model was given actually mentions it.
 */
function normalizeAnswer(raw: unknown, analysis: string): Answer | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const tldr = clip(r.tldr, 320)
  if (!tldr) return null

  const files: Answer["files"] = []
  for (const item of Array.isArray(r.files) ? r.files : []) {
    if (!item || typeof item !== "object") continue
    const path = clip((item as Record<string, unknown>).path, 300).replace(/^[`'"]+|[`'"]+$/g, "").replace(/^\.?\//, "")
    if (!path || !analysis.includes(path) || files.some((f) => f.path === path)) continue
    files.push({ path, why: clip((item as Record<string, unknown>).why, 200) })
    if (files.length === 3) break
  }

  const commands = strings(r.commands, 3, 160)
    .map((c) => c.replace(/^`+|`+$/g, "").replace(/^\$\s+/, ""))
    .filter((c) => c && !/[\r\n]/.test(c))

  return {
    tldr,
    steps: strings(r.steps, 5, 240),
    points: strings(r.points, 4, 260),
    files,
    commands,
    watchOut: clip(r.watchOut, 260),
    followUps: strings(r.followUps, 3, 90),
  }
}

/** The same answer as plain text: what the page copies, and a fallback if it can't draw the blocks. */
function answerToText(a: Answer): string {
  return [
    a.tldr,
    a.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    a.points.map((p) => `- ${p}`).join("\n"),
    a.files.length ? `Files:\n${a.files.map((f) => `- ${f.path}${f.why ? `: ${f.why}` : ""}`).join("\n")}` : "",
    a.commands.length ? `Commands:\n${a.commands.map((c) => `$ ${c}`).join("\n")}` : "",
    a.watchOut ? `Watch out: ${a.watchOut}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return fail("Unauthorized", 401)

    const body = await readJsonBody(req)

    const repoMatch = typeof body.repoUrl === "string" ? REPO_URL.exec(body.repoUrl.trim().slice(0, 300)) : null
    if (!repoMatch) throw new HttpError(400, "Invalid GitHub URL")
    const [, owner, repo] = repoMatch

    const history = normalizeMessages(body.messages)
    if (history.length === 0 || history[history.length - 1].role !== "user") {
      throw new HttpError(400, "No question to answer.")
    }

    const level = normalizeLevel(body.expertiseLevel)
    const analysis = typeof body.analysis === "string" ? body.analysis.slice(0, MAX_ANALYSIS_CHARS) : ""

    const quotaCheck = await canAffordUsage(userId, { ai: 1 })
    if (!quotaCheck.allowed) {
      const reason = quotaCheck.reason || "You've reached your usage limit."
      return fail(reason, 403, { reason })
    }

    const systemPrompt = buildChatSystemPrompt({ level, owner, repo, analysis })

    // llmRouter expects a real conversation array, not a flattened block of text.
    const { text } = await withTimeout(generateLLMResponse(history, systemPrompt), TIMEOUT_MS)
    const raw = typeof text === "string" ? text.trim() : ""

    // An empty answer costs the user nothing: quota is only consumed once there is something to show.
    if (!raw) throw new HttpError(502, "The model returned an empty answer. Try again.")
    await consumeQuota(userId, { ai: 1 })

    // A weaker provider may ignore the JSON contract: the page then shows the text as it came.
    const answer = normalizeAnswer(extractJson(raw), analysis)
    return NextResponse.json({ answer, reply: answer ? answerToText(answer) : raw })
  } catch (err) {
    if (err instanceof HttpError) return fail(err.message, err.status)
    const timedOut = (err as { code?: unknown } | null)?.code === "TIMEOUT"
    const detail = err as { response?: { data?: unknown }; message?: string } | null
    console.error("/api/chat failed:", detail?.response?.data || detail?.message || "Unknown error")
    return timedOut ? fail("The answer took too long. Try again.", 504) : fail("Couldn't get an answer. Try again.", 500)
  }
}