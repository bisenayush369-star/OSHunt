import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const language   = searchParams.get("language")   || "javascript"
  const difficulty = searchParams.get("difficulty")  || "easy"
  const page       = searchParams.get("page")        || "1"

  let label = "good-first-issue"
  if (difficulty === "medium") label = "help-wanted"
  if (difficulty === "hard")   label = "bug"

  const query = `state:open+language:${language}+label:${label}+stars:>500`

  const res = await fetch(
    `https://api.github.com/search/issues?q=${query}&sort=updated&order=desc&per_page=10&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 300 }
    }
  )

  const data = await res.json()
  return NextResponse.json(data)
}