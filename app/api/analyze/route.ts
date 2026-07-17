import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { generateLLMResponse } from "@/lib/llmRouter";

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

Grounding: only state specifics — file paths, package names, architectural claims — that are directly supported by the file contents given to you below. If something isn't clearly shown in what you were given, say so plainly instead of filling the gap with general knowledge about how similar projects usually work.
`

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, expertiseLevel } = await req.json()
    const level: Level =
      expertiseLevel === "Explorer" || expertiseLevel === "Veteran" ? expertiseLevel : "Architect"

    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })

    const owner = match[1]
    const repo = match[2].replace(/\.git$/, "")

    // fetch file tree
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
    )

    type GitTreeEntry = {
      path: string
      mode: string
      type: "blob" | "tree"
      sha: string
      size?: number
      url: string
    }

    const files = (treeRes.data.tree as GitTreeEntry[])
      .filter((f) => f.type === "blob")
      .slice(0, 15)

    // fetch content of important files
    const fileContents = await Promise.all(
      files.map(async (file: GitTreeEntry) => {
        try {
          const res = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
            { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
          )
          const content = Buffer.from(res.data.content, "base64").toString("utf-8")
          return `### ${file.path}\n${content.slice(0, 500)}`
        } catch {
          return `### ${file.path}\n[Could not read file]`
        }
      })
    )

    const systemPrompt = `
You are a senior software engineer with 20 years of experience, known for explaining unfamiliar codebases clearly to developers of any level.
${RESPONSE_STYLE}

Audience: ${level} — ${LEVEL_INSTRUCTIONS[level]}
`

    const userPrompt = `
Repo: ${owner}/${repo}

Files and their contents:
${fileContents.join("\n\n")}

Respond with ONLY a raw JSON object — no markdown code fences, no preamble or text outside the JSON — matching exactly this shape:

{
  "purpose": string,        // 2-4 sentences: what this project does and what problem it solves
  "techStack": string[],    // 4-8 short items, e.g. "Next.js (framework)"
  "startFiles": [ { "path": string, "why": string } ],  // up to 3 exact file paths from what you were given, each with a one-sentence reason it matters
  "howToRun": string,       // 2-4 sentences on running it locally
  "howToContribute": string // 2-4 sentences on making a first contribution
}

Wrap file, package, and command names in backticks. Do not use any other markdown — no headers, no bold, no bullet lists — these fields render as plain UI text, not a markdown document.
`

    const { text } = await generateLLMResponse(
      [{ role: "user", content: userPrompt }],
      systemPrompt
    )

    type StructuredResult = {
      purpose: string
      techStack: string[]
      startFiles: { path: string; why: string }[]
      howToRun: string
      howToContribute: string
    }

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

    // If a weaker provider didn't return valid JSON, fall back to the raw text
    // so the frontend can still show *something* instead of erroring out.
    if (!parsed) {
      return NextResponse.json({ owner, repo, raw: text })
    }

    return NextResponse.json({ owner, repo, result: parsed })
  } catch (err) {
    const error = err as { response?: { data?: unknown }; message?: string }
    console.error(error?.response?.data || error?.message || "Unknown error")
    return NextResponse.json({ error: error?.message || "An error occurred" }, { status: 500 })
  }
}