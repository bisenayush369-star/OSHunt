import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { generateLLMResponse } from "@/lib/llmRouter";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { repoUrl } = await req.json()

    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!match) return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })

    const owner = match[1]
    const repo = match[2].replace(/\.git$/, "")

    // fetch file tree
    const treeRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } }
    )

    const files = treeRes.data.tree
      .filter((f: any) => f.type === "blob")
      .slice(0, 15)

    // fetch content of important files
    const fileContents = await Promise.all(
      files.map(async (file: any) => {
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

    // send to gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const prompt = `
You are a senior developer. Analyze this GitHub repository and explain it clearly.

Repo: ${owner}/${repo}

Files and their contents:
${fileContents.join("\n\n")}

Provide:
1. What this project does in 2-3 lines
2. Tech stack used
3. Folder structure explanation
4. How to run it locally
5. How to contribute
`

    // const result = await model.generateContent(prompt)

    const explanation = await generateLLMResponse(prompt);

    return NextResponse.json({ owner, repo, explanation })
  } catch (err: any) {
    console.error(err?.response?.data || err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}