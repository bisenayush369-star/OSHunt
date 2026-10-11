import type { Prisma } from "@prisma/client";
import { getGithubAuthHeader } from "@/components/lib/github";
import { generateLLMResponse } from "@/components/lib/llmRouter";
import { prisma } from "@/components/lib/prisma";

export const NAME_RE = /^(?![.]+$)(?!.*[\\/\s])(?=.{1,100}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/;

export type AnalysisReason = {
  ok: boolean;
  text: string;
};

export type AnalysisStep = {
  title: string;
  detail: string;
  cmd?: string;
};

export type AnalysisIssue = {
  number: number;
  title: string;
  why: string;
};

export type AnalysisResult = {
  summary: string;
  fit: {
    score: number;
    label: string;
    reasons: AnalysisReason[];
  };
  steps: AnalysisStep[];
  issues: AnalysisIssue[];
  watch: string[];
};

export type RepoContext = {
  owner: string;
  repo: string;
  repoMeta: Record<string, unknown>;
  readme: string;
  contributing: string;
  tree: string[];
  issues: { number: number; title: string; body?: string }[];
};

export const ANALYSIS_SYSTEM = `You are helping a first-year student contribute to a GitHub repo. Write every sentence in simple words. Explain technical words in brackets if you use them. Keep it warm, clear, and practical.

Return valid JSON only and follow this shape exactly:
{
  "summary": string,
  "fit": { "score": number, "label": string, "reasons": [{"ok": boolean, "text": string}] },
  "steps": [{ "title": string, "detail": string, "cmd": string? }],
  "issues": [{ "number": number, "title": string, "why": string }],
  "watch": [string]
}

Rules:
- Use only the fetched repo context. Do not invent details.
- Keep commands exactly as they appear in README or contribution docs. When a command is missing, do not invent one.
- The summary should help a beginner know what the repo does and how to start.
- 'fit' score must be 0-100.
- 'reasons' should be short and honest.
- 'watch' should list things a beginner should know before contributing.
- If there are no beginner issues, set issues to [] and say so in the summary or fit reasons.
- Never output markdown fences or extra text outside JSON.`;

export function chatSystem(repoKey: string) {
  return `You are the OSHunt repo guide for ${repoKey}. Talk only about this repo and the cached analysis context. Be kind, simple, and helpful. If the user asks something unrelated, politely say you can only help with this repo. Use only the stored repo context and analysis. Do not invent file contents or commands. Keep answers short and easy to understand.`;
}

export function repoKeyFor(owner: string, repo: string) {
  return `${owner.trim()}/${repo.trim()}`.toLowerCase();
}

export function isValidOwnerAndRepo(owner: string, repo: string) {
  return Boolean(owner && repo && NAME_RE.test(owner) && NAME_RE.test(repo));
}

export class NotFoundError extends Error {
  constructor(message = "Repository not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

async function readTextFromGithub(url: string) {
  const headers = await getGithubAuthHeader();
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", ...headers } });
  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  if (!data) return null;

  if (typeof data.content === "string") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }

  return typeof data !== "string" ? JSON.stringify(data) : data;
}

export async function repoContext(owner: string, repo: string): Promise<RepoContext> {
  const headers = await getGithubAuthHeader();
  const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const repoRes = await fetch(repoUrl, {
    headers: { Accept: "application/vnd.github+json", ...headers },
  });

  if (!repoRes.ok) {
    throw new NotFoundError();
  }

  const repoMeta = (await repoRes.json()) as Record<string, unknown>;

  const readme = (await readTextFromGithub(`https://api.github.com/repos/${owner}/${repo}/readme`)) ?? "";
  const contributing = (await readTextFromGithub(`https://api.github.com/repos/${owner}/${repo}/contents/CONTRIBUTING.md`)) ?? "";

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`, {
    headers: { Accept: "application/vnd.github+json", ...headers },
  });

  let tree: string[] = [];
  if (treeRes.ok) {
    const treeData = (await treeRes.json()) as { tree?: Array<{ path?: string }> };
    tree = (treeData.tree ?? [])
      .map((item) => item.path)
      .filter((path): path is string => typeof path === "string")
      .filter((path) => !path.startsWith(".git") && !path.startsWith("node_modules/"))
      .slice(0, 90);
  }

  const issuesRes = await fetch(
    `https://api.github.com/search/issues?q=repo:${owner}/${repo}+label:%22good%20first%20issue%22+is:issue+is:open&per_page=5`,
    {
      headers: { Accept: "application/vnd.github+json", ...headers },
    }
  );

  let issues: { number: number; title: string; body?: string }[] = [];
  if (issuesRes.ok) {
    const issueData = (await issuesRes.json()) as { items?: Array<{ number?: number; title?: string; body?: string }> };
    issues = (issueData.items ?? []).map((item) => ({
      number: Number(item.number ?? 0),
      title: String(item.title ?? ""),
      body: typeof item.body === "string" ? item.body : undefined,
    }));
  }

  return {
    owner,
    repo,
    repoMeta,
    readme: readme.slice(0, 6000),
    contributing: contributing.slice(0, 3000),
    tree: tree.slice(0, 90),
    issues: issues.slice(0, 5),
  };
}

export async function geminiJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const { text } = await generateLLMResponse([{ role: "user", content: userPrompt }], systemPrompt);
  if (!text) {
    throw new Error("LLM router returned an empty response.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("LLM router returned non-JSON content for analysis.");
  }
}

export async function geminiText(systemPrompt: string, userPrompt: string) {
  const { text } = await generateLLMResponse([{ role: "user", content: userPrompt }], systemPrompt);
  if (!text) {
    throw new Error("LLM router returned an empty response.");
  }

  return text.trim();
}

export async function getCachedAnalysis(owner: string, repo: string) {
  const key = repoKeyFor(owner, repo);
  const row = await prisma.repoAnalysis.findUnique({
    where: { repoName: key },
  });

  if (!row) return null;

  const ageMs = Date.now() - new Date(row.updatedAt ?? row.analyzedAt ?? row.createdAt ?? Date.now()).getTime();
  const freshEnough = ageMs < 1000 * 60 * 60 * 24 * 3;

  if (!freshEnough) return null;

  const data = row.data as unknown as AnalysisResult | null;
  return data && typeof data === "object" ? data : null;
}

export async function saveAnalysis(owner: string, repo: string, result: AnalysisResult, context: RepoContext) {
  const key = repoKeyFor(owner, repo);
  const jsonContext = JSON.parse(JSON.stringify(context)) as Prisma.InputJsonValue;

  await prisma.repoAnalysis.upsert({
    where: { repoName: key },
    update: {
      data: result,
      ctx: jsonContext,
      analyzedAt: new Date(),
      updatedAt: new Date(),
      aiExplanation: JSON.stringify(result),
    },
    create: {
      repoName: key,
      data: result,
      ctx: jsonContext,
      analyzedAt: new Date(),
      aiExplanation: JSON.stringify(result),
    },
  });
}
