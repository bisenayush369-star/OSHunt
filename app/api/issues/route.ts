import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "javascript";
  const difficulty = searchParams.get("difficulty") || "easy";
  const page = searchParams.get("page") || "1";

  // 1. Base query: open issues for the selected language
  let query = `state:open type:issue language:${language} `;

  // 2. Translate your difficulty state into GitHub labels
  if (difficulty === "easy") {
    query += `label:"good first issue"`;
  } else if (difficulty === "medium") {
    query += `label:"help wanted" -label:"good first issue"`; 
  } else if (difficulty === "hard") {
    query += `label:bug -label:"good first issue" -label:"help wanted"`; 
  }

  // 3. Build the GitHub API URL
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=15&page=${page}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        // Optional but highly recommended: Add your GitHub token to avoid rate limits
        // Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
      // Cache for 60 seconds to avoid spamming GitHub
      next: { revalidate: 60 } 
    });

    if (!res.ok) {
      throw new Error(`GitHub API responded with status ${res.status}`);
    }

    const data = await res.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}