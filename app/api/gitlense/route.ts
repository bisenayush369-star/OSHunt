import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/components/lib/auth"
import { generateLLMResponse } from "@/components/lib/llmRouter"
import { canAffordUsage, consumeQuota } from "@/components/lib/quota"
import { AREA_KINDS, buildGitLenseSystemPrompt, buildOverviewPrompt, buildRoadmapPrompt, normalizeLevel, type Level } from "@/components/lib/gitlensePrompts"
import {
  ROADMAP_IDS,
  branchCommand,
  buildFallbackRoadmap,
  computeRepoFacts,
  factsDigest,
  forkCommands,
  indexTree,
  pushCommand,
  type RoadmapStep,
  type TreeEntry,
  type TreeIndex,
} from "@/components/lib/repoFacts"

// Reading a large repo and waiting on the model can take well over ten seconds.
// Lower or remove this if your host caps function time below it.
export const maxDuration = 60

const PIPELINE_MS = 55_000
const ROADMAP_GRACE_MS = 25_000 // how much longer the roadmap may take once the overview is back
const PING_MS = 4_000
const MAX_BODY_CHARS = 2_000
const MAX_URL_CHARS = 300
const MAX_RAW_CHARS = 12_000

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

/** Resolves with `fallback()` if `work` hasn't finished after `ms`. The timer is cleared as soon as `work` wins. */
function orElse<T>(work: Promise<T>, ms: number, fallback: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback()), Math.max(0, ms))
  })
  return Promise.race([work, limit]).finally(() => clearTimeout(timer))
}

/** Turns anything thrown by the pipeline into a status and a message that is safe to show the user. */
function describeFailure(err: unknown): { status: number; message: string } {
  if (err instanceof HttpError) return { status: err.status, message: err.message }
  const code = (err as { code?: unknown } | null)?.code
  switch (code) {
    case "NOT_FOUND":
      return { status: 404, message: "Repository not found. Check the URL: private repositories can't be analyzed." }
    case "RATE_LIMITED":
      return { status: 429, message: "GitHub's rate limit was reached. Try again in a few minutes." }
    case "FORBIDDEN":
      return { status: 403, message: "GitHub denied access to this repository." }
    case "TIMEOUT":
      return { status: 504, message: "The analysis took too long. Try again, or pick a smaller repository." }
  }
  if (typeof code === "string") return { status: 502, message: "Couldn't finish the analysis. Try again in a moment." }
  return { status: 500, message: "Couldn't analyze this repository. Try again." }
}

function logFailure(err: unknown, status: number, message: string) {
  if (status >= 500) {
    const detail = err as { response?: { data?: unknown }; message?: string } | null
    console.error("/api/gitlense failed:", detail?.response?.data || detail?.message || "Unknown error")
  } else {
    console.warn("/api/gitlense:", status, message)
  }
}

// ── Reading the model's answers ──────────────────────────────────────────────

function extractJson(text: string): unknown {
  // Models sometimes wrap the object in a ```json fence or add a sentence around it.
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
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

/** Models quote or prefix paths now and then; the tree check needs the bare repo-relative path. */
const barePath = (v: unknown) => clip(v, 300).replace(/^[`'"]+|[`'"]+$/g, "").replace(/^\.?\//, "")

function strings(v: unknown, max: number, each: number): string[] {
  const out: string[] = []
  for (const item of list(v)) {
    const s = clip(item, each)
    if (s && !out.includes(s)) out.push(s)
    if (out.length === max) break
  }
  return out
}

/** One-line shell commands only: no prompts, no fences, nothing that spans lines. */
function commandLines(v: unknown, max: number): string[] {
  const out: string[] = []
  for (const item of list(v)) {
    const c = clip(item, 160).replace(/^`+|`+$/g, "").replace(/^\$\s+/, "")
    if (c && !/[\r\n]/.test(c) && !out.includes(c)) out.push(c)
    if (out.length === max) break
  }
  return out
}

/** Never trust the model's file paths blindly: drop anything that isn't in the tree we fetched. */
function knownPaths(v: unknown, index: TreeIndex, max: number, within?: string): string[] {
  const out: string[] = []
  for (const item of list(v)) {
    const path = barePath(typeof item === "string" ? item : obj(item)?.path)
    if (!path || !index.fileSet.has(path) || out.includes(path) || (within && !path.startsWith(`${within}/`))) continue
    out.push(path)
    if (out.length === max) break
  }
  return out
}

function knownFiles(v: unknown, index: TreeIndex, max: number, within?: string): { path: string; why: string }[] {
  const why = new Map<string, string>()
  for (const item of list(v)) {
    const o = obj(item)
    if (o) why.set(barePath(o.path), clip(o.why, 300))
  }
  return knownPaths(v, index, max, within).map((path) => ({ path, why: why.get(path) ?? "" }))
}

interface TechItem {
  name: string
  role: string
  note: string
  files: string[]
}
interface Area {
  path: string
  title: string
  kind: (typeof AREA_KINDS)[number]
  summary: string
  files: number
  keyFiles: { path: string; why: string }[]
  tips: string[]
}
interface Overview {
  purpose: string
  architecture: string | null
  tech: TechItem[]
  areas: Area[]
  startFiles: { path: string; why: string }[]
}

/** Builds the overview from known fields only, so a model can't inject keys or override the facts we derive ourselves. */
function normalizeOverview(raw: unknown, index: TreeIndex): Overview | null {
  const r = obj(raw)
  const purpose = r ? clip(r.purpose, 1200) : ""
  if (!r || !purpose) return null

  const tech: TechItem[] = []
  const seenTech = new Set<string>()
  for (const item of list(r.tech ?? r.techStack)) {
    let o = obj(item)
    if (!o && typeof item === "string") {
      // An older prompt produced "Name (role)" strings; accept both shapes.
      const m = item.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
      o = { name: m ? m[1] : item, role: m ? m[2] : "" }
    }
    const name = o ? clip(o.name, 60) : ""
    if (!o || !name || seenTech.has(name.toLowerCase())) continue
    seenTech.add(name.toLowerCase())
    tech.push({ name, role: clip(o.role, 40), note: clip(o.note, 260), files: knownPaths(o.files, index, 2) })
    if (tech.length === 8) break
  }

  const areas: Area[] = []
  const seenAreas = new Set<string>()
  for (const item of list(r.areas)) {
    const a = obj(item)
    if (!a) continue
    const path = barePath(a.path).replace(/\/+$/, "")
    const files = index.dirCount.get(path) // only real directories have a count
    const summary = clip(a.summary, 320)
    if (!path || !files || !summary || seenAreas.has(path)) continue
    seenAreas.add(path)
    const kind = AREA_KINDS.find((k) => k === a.kind) ?? "core"
    areas.push({
      path,
      title: clip(a.title, 60) || (path.split("/").pop() as string),
      kind,
      summary,
      files,
      keyFiles: knownFiles(a.keyFiles, index, 3, path),
      tips: strings(a.tips, 2, 220),
    })
    if (areas.length === 6) break
  }

  return {
    purpose,
    architecture: clip(r.architecture, 1200) || null,
    tech,
    areas,
    startFiles: knownFiles(r.startFiles, index, 3),
  }
}

/** Every step comes back: the model's version when it wrote a usable one, the default for that step otherwise. */
function normalizeRoadmap(raw: unknown, index: TreeIndex, defaults: RoadmapStep[], owner: string, repo: string) {
  const byId = new Map<string, Record<string, unknown>>()
  list(obj(raw)?.steps).forEach((item, i) => {
    const o = obj(item)
    if (!o) return
    const id = (typeof o.id === "string" ? o.id.trim().toLowerCase() : ROADMAP_IDS[i]) as string
    if ((ROADMAP_IDS as readonly string[]).includes(id) && !byId.has(id)) byId.set(id, o)
  })

  let fromModel = 0
  const steps = defaults.map((base): RoadmapStep => {
    const o = byId.get(base.id)
    const summary = o ? clip(o.summary, 260) : ""
    const actions = o ? strings(o.actions, 4, 240) : []
    if (!o || !summary || actions.length === 0) return base
    fromModel++

    // The git plumbing is the same for every repo, so it is built here and never left to the model.
    let commands = commandLines(o.commands, 4)
    if (base.id === "fork") commands = forkCommands(owner, repo)
    else if (base.id === "pr") commands = [pushCommand()]
    else if (base.id === "change" && !commands.includes(branchCommand())) commands = [branchCommand(), ...commands].slice(0, 4)

    return {
      id: base.id,
      summary,
      actions,
      commands,
      files: knownPaths(o.files, index, 3),
      watchOut: clip(o.watchOut, 260),
      done: clip(o.done, 180) || base.done,
      generic: false,
    }
  })
  return { steps, fromModel }
}

// ── Streaming ────────────────────────────────────────────────────────────────

type Send = (event: Record<string, unknown>) => void

/**
 * One JSON object per line. The page shows each event as it arrives, so the progress it displays is what the
 * server is actually doing. Errors before the stream starts are ordinary JSON responses with a status code;
 * from here on they are `error` events, because the 200 has already been sent.
 */
function ndjson(run: (send: Send) => Promise<void>) {
  const encoder = new TextEncoder()
  let open = true
  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        const send: Send = (event) => {
          if (!open) return
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
          } catch {
            open = false
          }
        }
        // A quiet minute looks like a dead connection to some proxies.
        const ping = setInterval(() => send({ t: "ping" }), PING_MS)
        try {
          await run(send)
        } catch (err) {
          const { status, message } = describeFailure(err)
          logFailure(err, status, message)
          send({ t: "error", status, message })
        } finally {
          clearInterval(ping)
          if (open) {
            open = false
            try {
              controller.close()
            } catch {
              // already closed by the client
            }
          }
        }
      },
      cancel() {
        open = false
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } }
  )
}

async function runGitLense(send: Send, p: { userId: string; owner: string; repo: string; level: Level }) {
  const { userId, owner, repo, level } = p
  const deadline = Date.now() + PIPELINE_MS
  const remaining = () => Math.max(1_000, deadline - Date.now())
  send({ t: "start", owner, repo, level })

  // Defer importing the repo intelligence module until runtime so the
  // build does not attempt to bundle heavy native deps (web-tree-sitter).
  const { gatherRepositoryIntelligence, buildAnalysisPrompt } = await import("@/components/lib/repoIntelligence")

  // The pipeline: metadata -> tree -> priority scoring -> smart reading -> tech detection -> model.
  const { intelligence, tree } = await withTimeout(gatherRepositoryIntelligence(owner, repo), remaining())

  // Deterministic facts (GitHub API + our own detection code, not the model) are attached
  // whether or not the model's JSON parses, and the model can never override them.
  const index = indexTree((Array.isArray(tree) ? tree : []) as TreeEntry[])
  const facts = computeRepoFacts(index)
  const metadata = {
    stars: intelligence.metadata.stars,
    forks: intelligence.metadata.forks,
    license: intelligence.metadata.license,
    topics: intelligence.metadata.topics,
    lastPushed: intelligence.metadata.pushedAt,
    openIssues: intelligence.metadata.openIssuesCount,
    primaryLanguage: intelligence.metadata.primaryLanguage,
  }
  const framework = intelligence.detection.framework
  const repositoryType = intelligence.detection.repositoryType
  send({ t: "facts", facts, metadata, framework, repositoryType })

  // The overview and the roadmap are two independent questions, so they run side by side. That halves the wait,
  // and a roadmap that fails or arrives late only costs the model's wording: the default roadmap fills in.
  const context = buildAnalysisPrompt(intelligence, tree)
  const digest = factsDigest(facts)
  const system = buildGitLenseSystemPrompt(level)
  const ask = async (content: string) => {
    const { text } = await generateLLMResponse([{ role: "user", content }], system)
    return typeof text === "string" ? text.trim() : ""
  }

  const defaults = buildFallbackRoadmap(owner, repo, facts)
  send({ t: "write", part: "overview", state: "start" })
  send({ t: "write", part: "roadmap", state: "start" })
  let roadmapOpen = true
  const roadmapRun = ask(buildRoadmapPrompt(context, digest, level, owner, repo))
    .then(
      (text) => normalizeRoadmap(extractJson(text), index, defaults, owner, repo),
      () => ({ steps: defaults, fromModel: 0 })
    )
    .then((made) => {
      if (roadmapOpen) send({ t: "write", part: "roadmap", state: made.fromModel > 0 ? "done" : "fallback" })
      return made
    })
  const overviewText = await withTimeout(
    ask(buildOverviewPrompt(context, digest)).then((text) => {
      if (text) send({ t: "write", part: "overview", state: "done" })
      return text
    }),
    remaining()
  )

  // An empty answer costs the user nothing: quota is only consumed once there is something to show.
  if (!overviewText) throw new HttpError(502, "The model returned an empty answer. Try again.")

  const { steps, fromModel } = await orElse(roadmapRun, Math.min(ROADMAP_GRACE_MS, remaining() - 2_000), () => {
    roadmapOpen = false
    send({ t: "write", part: "roadmap", state: "fallback" })
    return { steps: defaults, fromModel: 0 }
  })

  const overview = normalizeOverview(extractJson(overviewText), index)
  await consumeQuota(userId, { github: 1, ai: 1 })

  // A weaker provider may not return valid JSON: send the text so the page can still show something.
  if (!overview) {
    send({ t: "raw", owner, repo, raw: overviewText.slice(0, MAX_RAW_CHARS), facts, metadata, framework, repositoryType })
    return
  }

  send({
    t: "result",
    owner,
    repo,
    result: {
      ...overview,
      roadmap: steps,
      roadmapSource: fromModel === 0 ? "default" : fromModel === steps.length ? "ai" : "mixed",
      facts,
      metadata,
      framework,
      repositoryType,
    },
  })
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return fail("Unauthorized", 401)

    const body = await readJsonBody(req)
    const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : ""
    if (!repoUrl || repoUrl.length > MAX_URL_CHARS) throw new HttpError(400, "Invalid GitHub URL")
    const level = normalizeLevel(body.expertiseLevel)

    const quotaCheck = await canAffordUsage(userId, { github: 1, ai: 1 })
    if (!quotaCheck.allowed) {
      const reason = quotaCheck.reason || "You've reached your usage limit."
      return fail(reason, 403, { reason })
    }

    const { parseRepoUrl } = await import("@/components/lib/repoIntelligence")
    const parsedUrl = parseRepoUrl(repoUrl)
    if (!parsedUrl) throw new HttpError(400, "Invalid GitHub URL")

    return ndjson((send) => runGitLense(send, { userId, owner: parsedUrl.owner, repo: parsedUrl.repo, level }))
  } catch (err) {
    const { status, message } = describeFailure(err)
    logFailure(err, status, message)
    return fail(message, status)
  }
}