import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { title, repo, language } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Missing issue title" }, { status: 400 });
    }

    // If you have a GEMINI_API_KEY in your .env, we call Google Gemini:
    if (process.env.GEMINI_API_KEY) {
      const prompt = `You are an expert software developer. Write a polite, concise, 3-sentence GitHub comment asking the repository maintainer to assign you to work on this issue. 
      Issue Title: "${title}"
      Repository: "${repo}"
      Language/Stack: "${language}"
      
      Requirements:
      - Start with a friendly greeting.
      - Mention your relevant experience in ${language}.
      - Ask politely to be assigned to the issue.
      - Do NOT include placeholders like [Your Name]. Write it ready-to-paste.`;

      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + process.env.GEMINI_API_KEY, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        return NextResponse.json({ proposal: generatedText.trim() });
      }
    }

    // Fallback if no API key is set yet (prevents UI from ever breaking during demos)
    const fallbackProposal = `Hi maintainers! 👋 I have experience building with ${language || "this tech stack"} and I'd love to take a crack at fixing "${title}". Could you please assign this issue to me? Let me know if there are any specific implementation guidelines you'd like me to follow!`;

    return NextResponse.json({ proposal: fallbackProposal });
  } catch (error) {
    return NextResponse.json({ 
      proposal: "Hi maintainers! 👋 I'd love to work on this issue. Could you please assign it to me?" 
    }, { status: 200 });
  }
}