import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { rawContext, promptType, userQuestion } = await request.json();

    const topLang = rawContext?.topLanguages?.[0] || "JavaScript/Web";
    const allLangs = rawContext?.topLanguages?.join(", ") || "full-stack web technologies";
    const topRepo = rawContext?.recentRepoNames?.[0] || "your primary repository";
    const repoCount = rawContext?.recentRepoNames?.length || 0;

    // You can plug your live OpenAI/Gemini API call here later. 
    // This smart engine dynamically weaves your LIVE scraped GitHub data directly into the advice:
    const dynamicOutput = promptType === "diagnostic"
      ? `### Real-Time Diagnostic for @${rawContext.username}:\n* **Stack Analysis:** We detected active development across **${allLangs}**. Your repository volume is strong, but your landing projects need standardized architecture breakdowns in the READMEs to pass technical recruiter screens.\n* **Badge Acquisition Roadmap:** You currently have **${repoCount}+ active repos**. To claim the high-tier 'Open Source Contributor' badge, target issues labeled 'good-first-issue' in external repositories matching your **${topLang}** stack.\n* **Immediate Action Step:** Add a clean local setup and deployment guide to **${topRepo}**. Standardizing configuration steps immediately increases project authority and star conversion.`
      : `Regarding your question about "${userQuestion}": Based on your active work with **${allLangs}**, the fastest way to improve your account standing is to focus on solving open hydration or routing bugs in repos related to **${topLang}**. Consistent weekly pull requests will elevate your profile metrics much faster than creating new empty repositories.`;

    return NextResponse.json({ result: dynamicOutput });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to process AI diagnostic" }, { status: 500 });
  }
}