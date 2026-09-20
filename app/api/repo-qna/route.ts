import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateLLMResponse } from "@/lib/llmRouter"
import { canAffordUsage, consumeQuota } from "@/lib/quota"
import { REPO_QNA_PROMPT } from "@/lib/prompts"

export const maxDuration = 30

interface QnaBody {
  repoName: string
  description?: string | null
  language?: string | null
  stars?: number
  topics?: string[]
  question: string
  history?: { role: "user" | "assistant"; content: string }[]
}

// Deliberately separate from /api/chat (the Analyze page's chat route).
// That one is grounded in an actual file tree + README fetch and can answer
// architecture-level questions. This one only ever sees the same metadata
// the card already shows — it's for "what is this / why would I use it"
// questions on the trend and search pages, not a substitute for a full
// Analyze. REPO_QNA_PROMPT is written to say so rather than guess when a
// question needs real source access.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const quotaCheck = await canAffordUsage(session.user.id, { ai: 1 })
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.reason, reason: quotaCheck.reason }, { status: 403 })
  }

  let body: QnaBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.repoName || !body.question?.trim()) {
    return NextResponse.json({ error: "`repoName` and `question` are required." }, { status: 400 })
  }

  const context = [
    `Repository: ${body.repoName}`,
    body.description ? `Description: ${body.description}` : null,
    body.language ? `Primary language: ${body.language}` : null,
    typeof body.stars === "number" ? `Stars: ${body.stars}` : null,
    body.topics?.length ? `Topics: ${body.topics.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  // Last 6 turns only — this is a quick per-card Q&A, not a long-running
  // conversation, so there's no reason to let the payload grow unbounded.
  const history = (body.history ?? []).slice(-6).map(m => ({ role: m.role, content: m.content }))

  try {
    const messages = [
      { role: "user" as const, content: `Repository context:\n${context}` },
      ...history,
      { role: "user" as const, content: body.question },
    ]
    const { text } = await generateLLMResponse(messages, REPO_QNA_PROMPT)
    await consumeQuota(session.user.id, { ai: 1 })
    return NextResponse.json({ answer: text })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The agent didn't respond." },
      { status: 502 }
    )
  }
}
