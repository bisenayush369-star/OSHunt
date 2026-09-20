import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateLLMResponse } from "@/lib/llmRouter"
import { canAffordUsage, consumeQuota } from "@/lib/quota"
import { TREND_ANALYST_PROMPT } from "@/lib/prompts"
import { formatRepoPrompt, type RepoMetadataInput } from "@/lib/repoPrompt"
import { parseBlurbResponse } from "@/lib/repo-blurb-parser"
import { prisma } from "@/lib/prisma"

export const maxDuration = 30

// On-demand version of the same blurb that /api/trending generates eagerly
// for its fixed top 10. This is what a search-result card calls when
// someone taps "Explain this repo", and what a trending card calls to
// retry after its eager generation failed. Postgres-cached (not in-memory)
// since, unlike the trending top 10, the set of repos that can hit this
// route is unbounded — every searched repo passes through here at most once
// per cache window.
//
// NOTE: your two uploaded versions of this route returned { text, cached }
// — a raw string. This one returns { blurb, cached } with the same
// structured shape /api/trending uses, so both endpoints feed the same
// <RepoBlurbView>. Cached rows are stored as a JSON string in the existing
// `aiExplanation` column, so there's no schema migration needed. Rows
// written before this change are plain text — readCache() below detects
// that and treats it as a cache miss (then overwrites it in the new shape)
// rather than crashing on JSON.parse.
function readCachedBlurb(aiExplanation: string) {
  try {
    const parsed = JSON.parse(aiExplanation)
    return typeof parsed === "object" && parsed !== null && "tagline" in parsed ? parsed : null
  } catch {
    return null // pre-existing plain-text row from before this change
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const quotaCheck = await canAffordUsage(session.user.id, { ai: 1 })
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.reason, reason: quotaCheck.reason }, { status: 403 })
  }

  let body: RepoMetadataInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  // Only repoName is actually required now. Your original check also
  // required rawDescription, which rejects any repo with no GitHub
  // description at all (`!""` is true) — a repo just not having a
  // description shouldn't block getting a summary.
  if (!body.repoName) {
    return NextResponse.json({ error: "`repoName` is required." }, { status: 400 })
  }
  const rawDescription = body.rawDescription?.trim() || "No description provided."

  try {
    const cachedRow = await prisma.repoAnalysis.findUnique({
      where: { repoName: body.repoName },
    })

    if (cachedRow) {
      const blurb = readCachedBlurb(cachedRow.aiExplanation)
      if (blurb) {
        return NextResponse.json({ blurb, cached: true })
      }
      // Legacy plain-text row — fall through and regenerate + overwrite below.
    }

    const prompt = formatRepoPrompt({ ...body, rawDescription })
    const { text } = await generateLLMResponse([{ role: "user", content: prompt }], TREND_ANALYST_PROMPT)
    await consumeQuota(session.user.id, { ai: 1 })
    const blurb = parseBlurbResponse(text ?? "")

    if (!blurb) {
      throw new Error("The model's response didn't match the expected format.")
    }

    // upsert, not create — a legacy row can already exist at this repoName
    // (that's exactly the case that fell through above), and the original
    // `.create()` would throw on the unique constraint in that situation.
    await prisma.repoAnalysis.upsert({
      where: { repoName: body.repoName },
      create: { repoName: body.repoName, aiExplanation: JSON.stringify(blurb) },
      update: { aiExplanation: JSON.stringify(blurb) },
    })

    return NextResponse.json({ blurb, cached: false })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error calling the Trend Analyst." },
      { status: 502 }
    )
  }
}
