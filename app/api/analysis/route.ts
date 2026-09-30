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
} from "@/components/lib/analysis";
import { generateLLMResponse } from "@/components/lib/llmRouter";
import { prisma } from "@/components/lib/prisma";

const STREAM_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-store",
};

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

  const repoName = repoKeyFor(owner, repo);

  const cachedResult = await getCachedAnalysis(owner, repo);
  if (cachedResult) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`${JSON.stringify({ result: cachedResult })}\n`));
        controller.close();
      },
    });

    return new Response(stream, { headers: STREAM_HEADERS });
  }

  try {
    const existing = await prisma.repoAnalysis.findUnique({ where: { repoName } });
    if (existing?.ctx && existing?.data) {
      const data = existing.data as unknown as AnalysisResult;
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`${JSON.stringify({ result: data })}\n`));
          controller.close();
        },
      });
      return new Response(stream, { headers: STREAM_HEADERS });
    }

    const context = await repoContext(owner, repo);
    const steps = [
      "Reading the project",
      "Checking how to contribute",
      "Writing your guide",
    ];

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        try {
          for (const step of steps) {
            send({ step });
          }

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
          send({ result: generated });
          controller.close();
        } catch (error) {
          if (error instanceof NotFoundError) {
            send({ error: "not_found" });
          } else {
            const message = error instanceof Error ? error.message : "Unknown analysis error.";
            send({ error: "failed", message });
          }
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    if (error instanceof NotFoundError) {
      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`${JSON.stringify({ error: "not_found" })}\n`));
          controller.close();
        },
      });
      return new Response(stream, { headers: STREAM_HEADERS });
    }

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const message = error instanceof Error ? error.message : "Unknown analysis error.";
        controller.enqueue(encoder.encode(`${JSON.stringify({ error: "failed", message })}\n`));
        controller.close();
      },
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  }
}
