import { NextRequest, NextResponse } from "next/server"
import { generateLLMResponse } from "@/lib/llmRouter"

export const maxDuration = 30

const CATEGORY_NAMES = [
  "Projects",
  "Documentation",
  "Contribution Quality",
  "Consistency",
  "Maintainer Trust",
  "Portfolio",
  "Testing",
  "Community",
] as const

const PROFILE_SCORE_PROMPT = `You are a career coach for open-source developers, scoring a GitHub profile the way a thoughtful senior engineer reviewing a portfolio would — for someone whose goal is landing their first merged PR, a stronger profile, and eventually a job.

Score across exactly these 8 categories, each worth 125 points (1000 total): ${CATEGORY_NAMES.join(", ")}.

Ground every score and claim in the real numbers given below (repo counts, description/license/homepage/topic counts, fork ratio, stars, recent event count, external-repo activity count). Never invent a specific repo name, number, or fact that isn't in the data.

For "Testing" specifically: the data given you does NOT include repo file contents, so you cannot actually verify whether tests exist. Score this one conservatively and say so plainly in "why" (e.g. "Can't verify test coverage from profile metadata alone — this is an estimate, not a confirmed score") rather than inventing false confidence.

Never write generic filler like "needs improvement" or "could be better." Every "howToImprove" must name a specific, concrete action tied to the actual numbers given (e.g. "3 of your 6 original repos have no description — adding one to each would be the single fastest lift here," not "improve your documentation").

Then generate ONE week's roadmap: 4-5 concrete tasks completable within a week, grounded in the same data, plus an estimated total score gain and estimated total time.

Respond with ONLY a JSON object in this exact shape — no markdown fences, no preamble, no text outside the JSON:
{
  "overallScore": <integer, sum of the 8 category scores>,
  "categories": [
    {"name": "Projects", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Documentation", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Contribution Quality", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Consistency", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Maintainer Trust", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Portfolio", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Testing", "score": <integer 0-125>, "why": "...", "howToImprove": "..."},
    {"name": "Community", "score": <integer 0-125>, "why": "...", "howToImprove": "..."}
  ],
  "roadmap": {
    "weekLabel": "Week 1",
    "tasks": ["...", "...", "...", "..."],
    "estimatedScoreGain": <integer>,
    "estimatedTime": "<e.g. '3 hours'>"
  }
}`

const PROFILE_CHAT_PROMPT = `You are an encouraging but honest mentor for an open-source developer, chatting about their real profile data and score breakdown. Answer directly and conversationally, grounded only in the data and scores provided — never invent repos, stats, or numbers you weren't given. A few sentences unless they ask for a list. If they ask something the data can't answer (like real salary data or guaranteed interview odds), say plainly that you can't respond with real numbers there instead of guessing.`

interface RawContextSignals {
  originalRepoCount?: number
  forkedRepoCount?: number
  reposWithDescription?: number
  reposWithLicense?: number
  reposWithHomepage?: number
  reposWithTopics?: number
  totalForksReceived?: number
  recentEventCount?: number
  externalActivityRepoCount?: number
}
interface RawContext {
  username: string
  topLanguages?: string[]
  recentRepoNames?: string[]
  totalStars?: number
  totalRepos?: number
  signals?: RawContextSignals
}
interface DiagnosticBody {
  rawContext: RawContext
  promptType: "diagnostic" | "question"
  userQuestion?: string
}
interface CategoryScore {
  name: string
  score: number
  why: string
  howToImprove: string
}
interface WeeklyRoadmap {
  weekLabel: string
  tasks: string[]
  estimatedScoreGain: number
  estimatedTime: string
}
interface ProfileScoreResult {
  overallScore: number
  categories: CategoryScore[]
  roadmap: WeeklyRoadmap
}

function buildContext(ctx: RawContext): string {
  const s = ctx.signals || {}
  return [
    `GitHub username: ${ctx.username}`,
    `Total public repos: ${ctx.totalRepos ?? "unknown"}`,
    `Original (non-fork) repos: ${s.originalRepoCount ?? "unknown"}, forked repos: ${s.forkedRepoCount ?? "unknown"}`,
    `Of the original repos: ${s.reposWithDescription ?? 0} have a description, ${s.reposWithLicense ?? 0} have a license, ${s.reposWithHomepage ?? 0} have a homepage/live-demo link, ${s.reposWithTopics ?? 0} have topics/tags set`,
    `Top languages: ${ctx.topLanguages?.length ? ctx.topLanguages.join(", ") : "none detected"}`,
    `Recent repo names: ${ctx.recentRepoNames?.length ? ctx.recentRepoNames.join(", ") : "none"}`,
    `Total stars across all repos: ${ctx.totalStars ?? 0}`,
    `Total forks received across all repos: ${s.totalForksReceived ?? 0}`,
    `Public events in the last 7 days: ${s.recentEventCount ?? 0}`,
    `Distinct repos (own or others') active in the last 7 days: ${s.externalActivityRepoCount ?? 0}`,
  ].join("\n")
}

function parseScoreResult(text: string): ProfileScoreResult {
  const cleaned = text.replace(/^```json\s*|```$/g, "").trim()
  const parsed = JSON.parse(cleaned)
  if (typeof parsed.overallScore !== "number" || !Array.isArray(parsed.categories)) {
    throw new Error("Response missing overallScore or categories.")
  }
  return {
    overallScore: Math.max(0, Math.min(1000, Math.round(parsed.overallScore))),
    categories: CATEGORY_NAMES.map((name) => {
      const match = parsed.categories.find((c: any) => c.name === name)
      return {
        name,
        score: match && typeof match.score === "number" ? Math.max(0, Math.min(125, Math.round(match.score))) : 0,
        why: match?.why || "No assessment returned for this category.",
        howToImprove: match?.howToImprove || "",
      }
    }),
    roadmap: {
      weekLabel: parsed.roadmap?.weekLabel || "Week 1",
      tasks: Array.isArray(parsed.roadmap?.tasks) ? parsed.roadmap.tasks : [],
      estimatedScoreGain: typeof parsed.roadmap?.estimatedScoreGain === "number" ? parsed.roadmap.estimatedScoreGain : 0,
      estimatedTime: parsed.roadmap?.estimatedTime || "",
    },
  }
}

export async function POST(req: NextRequest) {
  let body: DiagnosticBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.rawContext?.username) {
    return NextResponse.json({ error: "`rawContext.username` is required." }, { status: 400 })
  }

  const context = buildContext(body.rawContext)

  try {
    if (body.promptType === "question") {
      if (!body.userQuestion?.trim()) {
        return NextResponse.json({ error: "`userQuestion` is required for promptType 'question'." }, { status: 400 })
      }
      const { text } = await generateLLMResponse(
        [{ role: "user", content: `Profile data:\n${context}\n\nQuestion: ${body.userQuestion}` }],
        PROFILE_CHAT_PROMPT
      )
      return NextResponse.json({ result: text })
    }

    const { text } = await generateLLMResponse(
      [{ role: "user", content: `Profile data:\n${context}` }],
      PROFILE_SCORE_PROMPT
    )

    let result: ProfileScoreResult
    try {
      result = parseScoreResult(text ?? "")
    } catch {
      return NextResponse.json({ error: "The model's response didn't match the expected score format — try again." }, { status: 502 })
    }

    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The optimizer didn't respond." },
      { status: 502 }
    )
  }
}