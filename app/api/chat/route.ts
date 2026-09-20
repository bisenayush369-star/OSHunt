import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateLLMResponse } from "@/lib/llmRouter"
import { canAffordUsage, consumeQuota } from "@/lib/quota"

type Level = "Explorer" | "Architect" | "Veteran"
type ChatMessage = { role: "user" | "assistant"; content: string }

const LEVEL_INSTRUCTIONS: Record<Level, string> = {
  Explorer: "The reader has zero prior experience with this stack, and maybe with programming in general. Walk them through things in order, one idea at a time. Define every term the first time it comes up — never use words like \"monorepo,\" \"ORM,\" \"CLI,\" or \"middleware\" without a one-line plain-English explanation right after. Use short sentences and everyday analogies. Assume nothing.",
  Architect: "Assume the reader already has this repo cloned, installed, and running — do not walk through git clone, package installs, or environment setup in any form, not even briefly. Do not explain what git, npm, pnpm, or testing are. Open straight into how this specific repo is organized, what's non-obvious about it, and what a contributor needs to know to make a solid, specific change.",
  Veteran: "Assume the reader already has this repo cloned, installed, and running, and has shipped production code before. Do not include any setup, installation, or onboarding steps, not even briefly. Skip straight to the architectural trade-offs, the design decisions that are debatable or non-obvious, and the parts of the codebase a quick skim would miss entirely. Talk about why the code is shaped the way it is, not how to run it.",
}

const RESPONSE_STYLE = `
Write like a senior engineer with 20 years of experience talking a colleague through this codebase — clear and confident, in your own words.

Formatting: break your answer into short paragraphs, 2 to 4 sentences each, one idea per paragraph, with a blank line between them. Never write a single block longer than 4 sentences. Use short numbered or bulleted lists freely whenever you're naming multiple items — files, steps, options — lists are easier to scan than dense paragraphs. Bold specific file names, package names, and key terms so they're easy to spot. Do not use tables, ASCII-art diagrams, or raw HTML tags anywhere — this renders inside a narrow chat bubble.

Starting point: whenever you're pointing someone toward how to approach this repo — fixing something, adding a feature, or just orienting themselves — lead with a short "Start here" list of up to 3 exact file paths taken from what you were given, with one line on why each matters. Never invent a path you haven't actually seen; if you can't point to specific files, say which area to look in and say plainly you'd need to see more of the repo to be exact.

Grounding: only state specifics — file paths, package names, architectural claims — that are directly supported by the analysis and conversation given to you below. If something isn't clearly shown in what you were given, say so plainly instead of filling the gap with general knowledge about how similar projects usually work.
`

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const quotaCheck = await canAffordUsage(session.user.id, { ai: 1 })
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason, reason: quotaCheck.reason }, { status: 403 })
    }

    const { repoUrl, analysis, messages, expertiseLevel } = await req.json()

    const level: Level =
      expertiseLevel === "Explorer" || expertiseLevel === "Veteran" ? expertiseLevel : "Architect"

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No conversation history provided" }, { status: 400 })
    }

    const match = typeof repoUrl === "string" ? repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/) : null
    const owner = match?.[1] ?? "unknown"
    const repo = match?.[2]?.replace(/\.git$/, "") ?? "unknown"

    const systemPrompt = `
You are a senior software engineer with 20 years of experience, known for explaining unfamiliar codebases clearly to developers of any level.
${RESPONSE_STYLE}

Audience: ${level} — ${LEVEL_INSTRUCTIONS[level]}

Repo: ${owner}/${repo}

Here is the full analysis you already produced for this repo:
---
${typeof analysis === "string" && analysis.trim() ? analysis : "No prior analysis was provided."}
---
`

    // llmRouter expects a real conversation array, not a flattened block of
    // text glued into one message — pass the actual turn-by-turn history.
    const chatHistory = (messages as ChatMessage[]).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const { text: reply } = await generateLLMResponse(chatHistory, systemPrompt)

    await consumeQuota(session.user.id, { ai: 1 })

    return NextResponse.json({ reply })
  } catch (err) {
    const error = err as { response?: { data?: unknown }; message?: string }
    console.error(error?.response?.data || error?.message || "Unknown error")
    return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 })
  }
}