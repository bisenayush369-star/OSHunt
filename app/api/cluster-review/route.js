import { NextResponse } from "next/server"
import { auth } from "@/auth" // Your NextAuth config import
import { db } from "@/lib/db" // Your Prisma client import
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. Fetch user & verify Pro plan (if you want this gated to Pro users)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { githubUsername: true, plan: true },
    })

    if (!user?.githubUsername) {
      return NextResponse.json({ error: "No GitHub account linked" }, { status: 400 })
    }

    if (user.plan !== "pro") {
      return NextResponse.json({ error: "Upgrade to Pro to use AI tools" }, { status: 403 })
    }

    // 2. Fetch user's public repos from GitHub API to gather stack context
    const ghRes = await fetch(
      `https://api.github.com/users/${user.githubUsername}/repos?sort=updated&per_page=6`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
          // Optional: Add process.env.GITHUB_TOKEN to avoid public IP rate limits
        },
      }
    )

    if (!ghRes.ok) {
      throw new Error("Failed to fetch GitHub repositories")
    }

    const repos = await ghRes.json()
    const repoSummary = repos
      .map((r: any) => `${r.name}: ${r.description || "No description"} (Language: ${r.language || "Various"})`)
      .join("\n")

    // 3. Prompt the LLM to generate the bio & README markdown
    const prompt = `
      You are an expert tech recruiter and developer branding coach.
      Based on the following GitHub repositories for developer "${user.githubUsername}", generate:
      1. A high-impact, professional 1-line bio (max 120 chars).
      2. A clean, modern Markdown README structure highlighting their core stack.

      Repositories:
      ${repoSummary}

      Respond strictly in JSON format with two keys: "bio" and "readme".
    `

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    })

    const result = JSON.parse(completion.choices[0].message.content || "{}")

    // 4. (Optional) Save the generated result to the database so it loads instantly next time
    await db.user.update({
      where: { id: session.user.id },
      data: {
        aiOptimizedBio: result.bio,
        aiOptimizedReadme: result.readme,
      },
    })

    return NextResponse.json({ bio: result.bio, readme: result.readme })
  } catch (error) {
    console.error("AI Profile Generation Error:", error)
    return NextResponse.json({ error: "Failed to generate profile" }, { status: 500 })
  }
}