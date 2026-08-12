import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLLMResponse } from "@/lib/llmRouter";

export const maxDuration = 30;

const discoveryAiBodySchema = z.object({
  repo: z
    .object({
      fullName: z.string().trim().min(1, "`repo.fullName` is required.").optional(),
      description: z.string().nullable().optional(),
      language: z.string().nullable().optional(),
      topics: z.array(z.string()).optional(),
      stars: z.number().int().nonnegative().optional(),
      forks: z.number().int().nonnegative().optional(),
      openIssues: z.number().int().nonnegative().optional(),
    })
    .refine((repo) => Boolean(repo.fullName), { message: "`repo.fullName` is required." }),
});

function parseInsights(text: string) {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed = JSON.parse(cleaned);

  if (!parsed.whyContribute || !parsed.difficulty) {
    throw new Error("Malformed AI response");
  }

  return {
    whyContribute: String(parsed.whyContribute ?? ""),
    learningValue: String(parsed.learningValue ?? ""),
    resumeValue: String(parsed.resumeValue ?? ""),
    difficulty: ["Beginner", "Intermediate", "Advanced"].includes(parsed.difficulty)
      ? parsed.difficulty
      : "Intermediate",
    onboardingEstimate: String(parsed.onboardingEstimate ?? "unknown"),
    technologiesLearned: Array.isArray(parsed.technologiesLearned) ? parsed.technologiesLearned.slice(0, 4) : [],
    suggestedFirstIssue: String(parsed.suggestedFirstIssue ?? ""),
    simpleExplanation: String(parsed.simpleExplanation ?? parsed.whyContribute ?? ""),
    howToUse: String(parsed.howToUse ?? ""),
    whoShouldUse: String(parsed.whoShouldUse ?? ""),
    goodFirstStep: String(parsed.goodFirstStep ?? parsed.suggestedFirstIssue ?? ""),
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = discoveryAiBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request body.", details: parsedBody.error.flatten() }, { status: 400 });
  }

  const repo = parsedBody.data.repo;

  const prompt = `You're helping a new developer understand a GitHub repo in a simple, practical way. Repo: "${repo.fullName}". Description: "${repo.description || "none provided"}". Primary language: ${repo.language || "unspecified"}. Topics: ${repo.topics?.slice(0, 6).join(", ") || "none"}. Stars: ${repo.stars ?? 0}. Forks: ${repo.forks ?? 0}. Open issues: ${repo.openIssues ?? 0}.

Explain it like you are helping someone who may be unfamiliar with the project. Keep the language simple and friendly. If the repo is confusing, simplify it. Focus on how someone can use it or contribute without getting lost. Return ONLY a JSON object matching this shape exactly:
{
  "simpleExplanation": "2 short sentences max, plain English",
  "howToUse": "2-3 short steps separated by ' | '",
  "whoShouldUse": "one short sentence",
  "whyContribute": "one punchy sentence, under 25 words",
  "learningValue": "one sentence on what skills/patterns you'd learn, under 25 words",
  "resumeValue": "one sentence on how this looks on a resume, under 22 words",
  "difficulty": "Beginner" | "Intermediate" | "Advanced",
  "onboardingEstimate": "short estimate like '1-2 hours' or 'a weekend'",
  "technologiesLearned": ["up to 4 short technology/pattern names"],
  "suggestedFirstIssue": "one sentence describing the KIND of first issue to look for here, under 25 words",
  "goodFirstStep": "one short action a beginner can take first"
}`;

  try {
    const { text } = await generateLLMResponse(
      [{ role: "user", content: prompt }],
      "You are an expert open-source mentor. Return valid JSON only."
    );
    return NextResponse.json({ insights: parseInsights(text ?? "") });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The agent didn't respond." },
      { status: 502 }
    );
  }
}
