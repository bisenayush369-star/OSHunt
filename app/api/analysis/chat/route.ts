import { NextResponse } from "next/server";
import { auth } from "@/components/lib/auth";
import { chatSystem, isValidOwnerAndRepo, repoKeyFor } from "@/components/lib/analysis";
import { generateLLMResponse } from "@/components/lib/llmRouter";
import { prisma } from "@/components/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { owner?: string; repo?: string; messages?: Array<{ role?: string; content?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const owner = String(body.owner ?? "").trim();
  const repo = String(body.repo ?? "").trim();

  if (!owner || !repo || !isValidOwnerAndRepo(owner, repo)) {
    return NextResponse.json({ error: "Invalid owner or repo name." }, { status: 400 });
  }

  const repoName = repoKeyFor(owner, repo);
  const row = await prisma.repoAnalysis.findUnique({ where: { repoName } });

  if (!row || !row.data || !row.ctx) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const safeMessages = Array.isArray(body.messages)
    ? body.messages
        .filter((message) => message && typeof message.content === "string")
        .slice(-12)
    : [];

  const systemPrompt = `${chatSystem(`${owner}/${repo}`)}\n\nCached repo analysis:\n${JSON.stringify({
    repo: `${owner}/${repo}`,
    analysis: row.data,
    context: row.ctx,
    recentMessages: safeMessages,
  })}`;

  try {
    const { text: rawReply } = await generateLLMResponse(
      safeMessages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: typeof message.content === "string" ? message.content : "",
      })),
      systemPrompt,
    );

    const parsedReply = (() => {
      const cleaned = String(rawReply ?? "").trim();
      if (!cleaned) return "I can only help with this repo.";
      try {
        const value = JSON.parse(cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
        if (typeof value?.reply === "string") return value.reply;
      } catch {
        // ignore and fall through
      }
      return cleaned;
    })();

    return NextResponse.json({ reply: parsedReply });
  } catch (error) {
    console.error("analysis chat failed", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
