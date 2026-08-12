import { NextResponse } from "next/server";
import { generateLLMResponse } from "@/lib/llmRouter";

interface AssignmentRequestBody {
  title?: string;
  repo?: string;
  language?: string;
}

const AI_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`LLM router timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function POST(req: Request) {
  try {
    const { title, repo, language } = (await req.json()) as AssignmentRequestBody;

    if (!title) {
      return NextResponse.json({ error: "Missing issue title" }, { status: 400 });
    }

    const systemPrompt = `You are an expert software developer writing a GitHub comment on behalf of a contributor.
Write a polite, concise, 3-sentence comment asking the maintainer to assign the contributor to the issue below.
Start with a friendly greeting, mention relevant experience in the given language/stack, and end with a polite ask to be assigned.
Do not include placeholders like [Your Name] — write it ready to paste.`;

    const userMessage = `Issue Title: "${title}"\nRepository: "${repo}"\nLanguage/Stack: "${language}"`;

    try {
      const { text } = await withTimeout(
        generateLLMResponse([{ role: "user", content: userMessage }], systemPrompt),
        AI_TIMEOUT_MS
      );
      return NextResponse.json({ proposal: text?.trim() ?? "", source: "ai" });
    } catch (routerError) {
      // Router exhausted every provider, or we hit the local timeout — log it
      // so a fully-dead provider set doesn't go unnoticed the way it would have before.
      console.error("llmRouter failed, serving fallback:", routerError);
    }

    const fallbackProposal = `Hi maintainers! 👋 I have experience building with ${language || "this tech stack"} and I'd love to take a crack at fixing "${title}". Could you please assign this issue to me? Let me know if there are any specific implementation guidelines you'd like me to follow!`;

    return NextResponse.json({ proposal: fallbackProposal, source: "fallback" });
  } catch (error) {
    return NextResponse.json(
      {
        proposal: "Hi maintainers! 👋 I'd love to work on this issue. Could you please assign it to me?",
        source: "fallback",
      },
      { status: 200 }
    );
  }
}