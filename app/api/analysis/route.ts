import { NextResponse } from "next/server";
import { auth } from "@/components/lib/auth";
import {
  ANALYSIS_SYSTEM,
  NotFoundError,
  isValidOwnerAndRepo,
  repoContext,
  repoKeyFor,
  saveAnalysis,
  type AnalysisResult,
  getCachedAnalysis,
} from "@/app/analysis/lib/analysis";
import { NeedsGithubConnectError } from "@/components/lib/github";
import { generateLLMResponse } from "@/components/lib/llmRouter";
import { prisma } from "@/components/lib/prisma";

function isDatabaseUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /Can't reach database server|database server.*running|ECONNREFUSED|connection refused|Connection to database/i.test(message);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { owner?: string; repo?: string };
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

  try {
    const cachedResult = await getCachedAnalysis(owner, repo);
    if (cachedResult) {
      return NextResponse.json({
        owner,
        repo,
        result: cachedResult,
        repoMeta: { "cached": true },
      });
    }

    const repoName = repoKeyFor(owner, repo);
    const existing = await prisma.repoAnalysis.findUnique({ where: { repoName } });
    if (existing?.ctx && existing?.data) {
      const data = existing.data as unknown as AnalysisResult;
      return NextResponse.json({
        owner,
        repo,
        result: data,
        repoMeta: (existing.ctx as { repoMeta?: Record<string, unknown> } | null)?.repoMeta ?? null,
      });
    }

    const context = await repoContext(owner, repo);
    const { text: rawText } = await generateLLMResponse(
      [{ role: "user", content: JSON.stringify({ repo: `${owner}/${repo}`, context }) }],
      ANALYSIS_SYSTEM,
    );

    if (!rawText) {
      throw new Error("No LLM response returned for analysis.");
    }

    const cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    const generated = JSON.parse(cleaned) as AnalysisResult;

    if (!generated || !generated.summary || !generated.fit || !generated.steps || !generated.issues || !generated.watch) {
      throw new Error("Invalid analysis payload");
    }

    await saveAnalysis(owner, repo, generated, context);

    return NextResponse.json({
      owner,
      repo,
      result: generated,
      repoMeta: context.repoMeta,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Repository not found." }, { status: 404 });
    }
    if (error instanceof NeedsGithubConnectError) {
      return NextResponse.json({ error: "needs_github_connect" }, { status: 403 });
    }

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Database unavailable. Set a valid DATABASE_URL before retrying analysis." },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown analysis error.";
    console.error("analysis route failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
