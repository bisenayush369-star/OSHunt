import { NextRequest, NextResponse } from "next/server"
import { generateLLMResponse } from "@/lib/llmRouter"
import {
  gatherRepositoryIntelligence,
  buildAnalysisPrompt,
  parseRepoUrl,
  GithubApiError,
} from "@/lib/repoIntelligence"

type Level = "Explorer" | "Architect" | "Veteran"

const LEVEL_INSTRUCTIONS: Record<Level, string> = {
  Explorer: "The reader has zero prior experience with this stack, and maybe with programming in general. Walk them through things in order, one idea at a time. Define every term the first time it comes up — never use words like \"monorepo,\" \"ORM,\" \"CLI,\" or \"middleware\" without a one-line plain-English explanation right after. Use short sentences and everyday analogies. Assume nothing.",
  Architect: "Assume the reader already has this repo cloned, installed, and running — do not walk through git clone, package installs, or environment setup in any form, not even briefly. Do not explain what git, npm, pnpm, or testing are. Open straight into how this specific repo is organized, what's non-obvious about it, and what a contributor needs to know to make a solid, specific change.",
  Veteran: "Assume the reader already has this repo cloned, installed, and running, and has shipped production code before. Do not include any setup, installation, or onboarding steps, not even briefly. Skip straight to the architectural trade-offs, the design decisions that are debatable or non-obvious, and the parts of the codebase a quick skim would miss entirely. Talk about why the code is shaped the way it is, not how to run it.",
}

const RESPONSE_STYLE = `
Write like a senior engineer with 20 years of experience talking a colleague through this codebase — clear and confident, in your own words.

Formatting: break your answer into short paragraphs, 2 to 4 sentences each, one idea per paragraph, with a blank line between them. Never write a single block longer than 4 sentences. Use short numbered or bulleted lists freely whenever you're naming multiple items — files, steps, options — lists are easier to scan than dense paragraphs. Bold specific file names, package names, and key terms so they're easy to spot. Do not use tables, ASCII-art diagrams, or raw HTML tags anywhere — this renders inside a narrow chat bubble.

Starting point: whenever you're pointing someone toward how to approach this repo — fixing something, adding a feature, or just orienting themselves — lead with a short "Start here" list of up to 3 exact file paths taken from what you were given, with one line on why each matters. Never invent a path you haven't actually seen; if you can't point to specific files, say which area to look in and say plainly you'd need to see more of the repo to be exact.

Grounding: only state specifics — file paths, package names, architectural claims — that are directly supported by the repository intelligence given to you below. If something isn't clearly shown in what you were given, say so plainly instead of filling the gap with general knowledge about how similar projects usually work.
`

type StructuredResult = {
  purpose: string
  techStack: string[]
  startFiles: { path: string; why: string }[]
  howToRun: string
  howToContribute: string
  metadata?: Record<string, unknown>
  framework?: string | null
  repositoryType?: string | null
  architecture?: string | null
}

function statusForGithubError(err: GithubApiError): number {
  switch (err.code) {
    case "RATE_LIMITED": return 429
    case "NOT_FOUND": return 404
    case "FORBIDDEN": return 403
    default: return 502
  }
}

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, expertiseLevel } = await req.json()
    const level: Level =
      expertiseLevel === "Explorer" || expertiseLevel === "Veteran" ? expertiseLevel : "Architect"

    const parsedUrl = parseRepoUrl(repoUrl)
    if (!parsedUrl) return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })
    const { owner, repo } = parsedUrl

    // ── The pipeline: metadata -> tree -> priority scoring -> smart reading -> tech detection ──
    const { intelligence, tree } = await gatherRepositoryIntelligence(owner, repo)
    const repositoryContext = buildAnalysisPrompt(intelligence, tree)

    const systemPrompt = `
You are a senior software engineer with 20 years of experience, known for explaining unfamiliar codebases clearly to developers of any level.
${RESPONSE_STYLE}

Audience: ${level} — ${LEVEL_INSTRUCTIONS[level]}
`

    const userPrompt = `
${repositoryContext}

---

Respond with ONLY a raw JSON object — no markdown code fences, no preamble or text outside the JSON — matching exactly this shape:

{
  "purpose": string,          // 2-4 sentences: what this project does and what problem it solves
  "techStack": string[],      // 4-8 short items, e.g. "Next.js (framework)"
  "startFiles": [ { "path": string, "why": string } ],  // up to 3 exact file paths from the Repository Structure or file sections above, each with a one-sentence reason it matters
  "howToRun": string,         // 2-4 sentences on running it locally
  "howToContribute": string,  // 2-4 sentences on making a first contribution
  "architecture": string      // 2-4 sentences on how the repo is actually organized — use the Repository Intelligence and Structure sections above, not general assumptions
}

Wrap file, package, and command names in backticks. Do not use any other markdown — no headers, no bold, no bullet lists — these fields render as plain UI text, not a markdown document. Only name files as startFiles that literally appear in the Repository Structure or file sections above — never invent a path.
`

    const { text } = await generateLLMResponse([{ role: "user", content: userPrompt }], systemPrompt)

    let parsed: StructuredResult | null = null
    try {
      // Models occasionally wrap JSON in a ```json fence despite instructions not to — strip it before parsing.
      const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim()
      const candidate = JSON.parse(cleaned)
      if (
        candidate && typeof candidate.purpose === "string" &&
        Array.isArray(candidate.techStack) && Array.isArray(candidate.startFiles)
      ) {
        parsed = candidate
      }
    } catch {
      parsed = null
    }

    // Deterministic facts (GitHub API + our own detection code, not the model)
    // get attached regardless of whether the model's JSON parsed cleanly —
    // these are strictly more trustworthy than anything the model could infer.
    const knownPaths = new Set(tree.map((f) => f.path))
    const derivedMetadata = {
      stars: intelligence.metadata.stars,
      forks: intelligence.metadata.forks,
      license: intelligence.metadata.license,
      topics: intelligence.metadata.topics,
      lastPushed: intelligence.metadata.pushedAt,
      openIssues: intelligence.metadata.openIssuesCount,
      primaryLanguage: intelligence.metadata.primaryLanguage,
    }
    const derivedFramework = intelligence.detection.framework
    const derivedRepositoryType = intelligence.detection.repositoryType

    // If a weaker provider didn't return valid JSON, fall back to the raw text
    // so the frontend can still show *something* instead of erroring out —
    // but still attach what we know deterministically.
    if (!parsed) {
      return NextResponse.json({
        owner,
        repo,
        raw: text,
        metadata: derivedMetadata,
        framework: derivedFramework,
        repositoryType: derivedRepositoryType,
      })
    }

    // Never trust the model's file paths blindly — drop anything that isn't
    // actually in the tree we fetched, per "never hallucinate a path."
    const verifiedStartFiles = parsed.startFiles.filter((f) => f && typeof f.path === "string" && knownPaths.has(f.path))

    return NextResponse.json({
      owner,
      repo,
      result: {
        ...parsed,
        startFiles: verifiedStartFiles,
        metadata: { ...derivedMetadata, ...parsed.metadata },
        framework: parsed.framework ?? derivedFramework,
        repositoryType: parsed.repositoryType ?? derivedRepositoryType,
        architecture: parsed.architecture ?? null,
      },
    })
  } catch (err) {
    if (err instanceof GithubApiError) {
      return NextResponse.json({ error: err.message }, { status: statusForGithubError(err) })
    }
    const error = err as { response?: { data?: unknown }; message?: string }
    console.error(error?.response?.data || error?.message || "Unknown error")
    return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 })
  }
}
