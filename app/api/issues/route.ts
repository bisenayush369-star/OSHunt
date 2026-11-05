import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/components/lib/auth";
import { prisma } from "@/components/lib/prisma";
import { getGithubAuthHeader } from "@/components/lib/github";
import { canAffordUsage, consumeQuota } from "@/components/lib/quota";

export const maxDuration = 30;

const GITHUB_API = "https://api.github.com";
const PER_PAGE = 15;
const MAX_SELECTIONS = 6; // each selection is its own GitHub request, and the picker enforces the same cap
const MAX_BODY_CHARS = 4000; // the page only shows an excerpt, so there is no reason to ship 60 KB bodies
const HEALTH_TTL_MS = 86_400_000;

type RepoHealth = { isActive: boolean; lastActivityAt: string | null };
type Send = (event: Record<string, unknown>) => void;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Feature 3: Check if a repo is active, and how long ago it last merged a PR.
async function checkRepoHealth(repoName: string, githubHeaders: Record<string, string>): Promise<RepoHealth> {
  try {
    const cached = await prisma.repoHealthCache.findUnique({
      where: { repoName }
    });

    if (cached && (Date.now() - new Date(cached.lastChecked).getTime()) < HEALTH_TTL_MS) {
      // The cache stores when the repo was CHECKED, not when it last merged, so the merge date is unknown here.
      // (Returning lastChecked made a quiet repo read "Inactive 3h" for the rest of the day.)
      return { isActive: cached.isActive, lastActivityAt: null };
    }

    const res = await fetch(`${GITHUB_API}/repos/${repoName}/pulls?state=closed&per_page=10`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...githubHeaders
      }
    });

    if (!res.ok) return { isActive: true, lastActivityAt: null };
    const pulls = await res.json();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    let lastMergedAt: Date | null = null;
    for (const pr of pulls) {
      if (pr.merged_at) {
        const mergedDate = new Date(pr.merged_at);
        if (!lastMergedAt || mergedDate > lastMergedAt) lastMergedAt = mergedDate;
      }
    }

    const isActive = lastMergedAt !== null && lastMergedAt > sixMonthsAgo;

    await prisma.repoHealthCache.upsert({
      where: { repoName },
      update: { isActive, lastChecked: new Date() },
      create: { repoName, isActive, lastChecked: new Date() }
    });

    return { isActive, lastActivityAt: lastMergedAt ? lastMergedAt.toISOString() : null };
  } catch {
    return { isActive: true, lastActivityAt: null };
  }
}

// Label names maintainers commonly use for each level. The Hunt page sorts issues into the same four levels using
// the same names, so keep the two lists in step (DIFFICULTY_LABELS in app/hunt/page.tsx).
//
// GitHub's REST search rejects (or silently mis-runs) `label:a OR label:b` between two qualifiers. The comma form
// is the supported way to OR several values of ONE qualifier: `label:"a","b","c"`. It is written once per level,
// not repeated as `label:"a",label:"b"`.
const DIFFICULTY_LABELS: Record<string, string[]> = {
  easy: ["good first issue", "good-first-issue", "first-timers-only", "beginner", "beginner-friendly", "starter", "easy", "low-hanging-fruit", "first contribution", "difficulty: easy", "difficulty/easy", "difficulty-easy"],
  medium: ["intermediate", "moderate", "medium", "difficulty: medium", "difficulty/medium", "difficulty-medium", "complexity: medium", "complexity/medium", "level: intermediate"],
  hard: ["hard", "difficult", "advanced", "complex", "challenging", "difficulty: hard", "difficulty/hard", "difficulty-hard", "complexity: high", "complexity/high", "level: advanced"],
  extreme: ["expert", "very hard", "extreme", "extremely difficult", "highly complex", "difficulty: extreme", "difficulty/extreme", "difficulty: expert", "difficulty/expert", "complexity: extreme", "complexity/very-high", "level: expert"],
};

const DIFFICULTY_LABEL_QUERY: Record<string, string> = Object.fromEntries(
  Object.entries(DIFFICULTY_LABELS).map(([level, names]) => [level, `label:${names.map((n) => `"${n}"`).join(",")}`])
);

// Many entries in the frontend's language picker aren't real GitHub/Linguist
// languages — they're frameworks or runtimes that happen to be written in one.
// `language:"react"` matches zero repos (nothing is Linguist-tagged "react"),
// and GitHub's search silently DROPS a `language:` qualifier it doesn't
// recognize rather than returning zero results — which is what caused
// "select React" to come back with a random, unfiltered, mostly-unrelated
// feed. Verified against the live API: filtering by the real underlying
// language and adding the original term as a free-text hint (no OR, no
// qualifier tricks — just an ordinary keyword) gives relevant results.
const FRAMEWORK_TO_LANGUAGE: Record<string, string> = {
  "react": "javascript",
  "next.js": "javascript",
  "vue": "javascript",
  "nuxt": "javascript",
  "svelte": "javascript",
  "sveltekit": "javascript",
  "angular": "typescript",
  "astro": "javascript",
  "remix": "javascript",
  "solidjs": "javascript",
  "qwik": "javascript",
  "alpine.js": "javascript",
  "lit": "javascript",
  "electron": "javascript",
  "tauri": "rust",
  "shadcn/ui": "typescript",
  "material ui": "javascript",
  "chakra ui": "typescript",
  "ant design": "typescript",
  "mantine": "typescript",
  "radix ui": "typescript",
  "framer motion": "javascript",
  "node.js": "javascript",
  "express": "javascript",
  "nestjs": "typescript",
  "fastify": "javascript",
  "hono": "typescript",
  "django": "python",
  "flask": "python",
  "fastapi": "python",
  "laravel": "php",
  "symfony": "php",
  "spring boot": "java",
  "asp.net core": "csharp",
  "ruby on rails": "ruby",
  "phoenix": "elixir",
  "prisma": "typescript",
  "drizzle orm": "typescript",
  "sequelize": "javascript",
  "typeorm": "typescript",
  "mongoose": "javascript",
  "hibernate": "java",
  "trpc": "typescript",
  "jest": "javascript",
  "vitest": "javascript",
  "playwright": "typescript",
  "cypress": "javascript",
  "testing library": "javascript",
  "mocha": "javascript",
  "vite": "typescript",
  "webpack": "javascript",
  "rollup": "javascript",
  "parcel": "javascript",
  "babel": "javascript",
  "swc": "rust",
  "esbuild": "go",
  "turbopack": "rust",
  "openai": "python",
  "langchain": "python",
  "llamaindex": "python",
  "ollama": "go",
  "hugging face": "python",
  "tensorflow": "python",
  "pytorch": "python",
  "android": "kotlin",
  "ios": "swift",
  "react native": "javascript",
  "flutter": "dart",
  "expo": "typescript",
  "unity": "c#",
  "unreal engine": "c++",
  "godot": "c++",
  "bevy": "rust",
  "pandas": "python",
  "numpy": "python",
  "matplotlib": "python",
  "jupyter": "python",
};

// Databases, cloud platforms, and other infra tools don't have one dominant
// language at all (Postgres itself is C, but nobody picking "PostgreSQL"
// here wants C issues) — for these we skip `language:` entirely and search
// by keyword instead.
const KEYWORD_ONLY = new Set([
  "postgresql", "mysql", "sqlite", "mongodb", "redis",
  "docker", "kubernetes", "terraform", "graphql",
  "tailwind css", "bootstrap",
  "mariadb", "supabase", "firebase", "appwrite", "planetscale", "cockroachdb", "cassandra",
  "aws", "azure", "google cloud", "cloudflare", "nginx", "apache",
  "vercel", "netlify", "railway", "render", "fly.io",
  "rest api", "grpc", "openapi",
]);

/** One GitHub search: a picker selection, plus the language to filter on (null = keyword search only). */
type Plan = { selection: string; language: string | null };

// Picking "React" used to search JavaScript repos only, which hides most modern React and Next.js projects (they
// are TypeScript). A framework that maps to JavaScript is now searched in TypeScript as well, as a second request
// for the same selection. Choosing the plain language "JavaScript" still means exactly JavaScript.
function plansFor(selection: string): Plan[] {
  const key = selection.toLowerCase();
  if (KEYWORD_ONLY.has(key)) return [{ selection, language: null }];
  const realLanguage = FRAMEWORK_TO_LANGUAGE[key] || key;
  if (realLanguage === "javascript" && key !== "javascript") {
    return [
      { selection, language: "javascript" },
      { selection, language: "typescript" },
    ];
  }
  return [{ selection, language: realLanguage }];
}

// Builds a GitHub search query for exactly one request.
// Deliberately never combines multiple `language:` values into one query —
// see fetchIssuesForSelections() for why.
function buildQuery({ selection, language }: Plan, difficulty: string, bountyOnly: boolean): string {
  const difficultyClause = DIFFICULTY_LABEL_QUERY[difficulty] || "";
  let query: string;

  if (language === null) {
    query = `"${selection}" in:title,body state:open ${difficultyClause}`;
  } else {
    query = `language:"${language}" state:open ${difficultyClause}`;
    if (language !== selection.toLowerCase()) {
      query += ` "${selection}"`; // relevance hint for aliased frameworks
    }
  }

  if (bountyOnly) {
    query += ` (label:bounty OR "bounty" in:title OR "bounty" in:body)`;
  }
  return query;
}

/**
 * Runs one GitHub issue search per language-picker selection (two for a framework that maps to JavaScript) and
 * merges the results. GitHub's REST search API (api.github.com/search/issues) does not
 * support OR between qualifiers — confirmed directly against the live API:
 *
 *   language:"a" OR language:"b"    -> HTTP 422, "logical operators only
 *                                       apply to text, not to qualifiers"
 *   (language:"a" OR language:"b")  -> no error, but silently wrong (matches
 *                                       almost nothing sensible)
 *   language:"a","b"                -> no error, but silently drops
 *                                       everything after the first value
 *
 * (This is different from `label:`, where the comma form genuinely works —
 * see DIFFICULTY_LABEL_QUERY above.) A single `language:"x"` query is the
 * only form that's reliable, so for N selections we run N requests in
 * parallel and merge them here instead of trying to OR them in one query.
 */
type GitHubIssueItem = Record<string, unknown> & {
  id?: number;
  repository_url?: string;
  created_at?: string;
  body?: unknown;
  matchedLanguage?: string;
};

const newestFirst = (a: GitHubIssueItem, b: GitHubIssueItem) =>
  new Date(String(b.created_at ?? 0)).getTime() - new Date(String(a.created_at ?? 0)).getTime();

// "https://api.github.com/repos/owner/name" -> "owner/name"
const repoOf = (item: GitHubIssueItem) => String(item.repository_url ?? "").replace(/^.*\/repos\//, "");

async function searchOnce(plan: Plan, perPage: number, difficulty: string, bountyOnly: boolean, page: number, headers: Record<string, string>, send: Send) {
  const query = buildQuery(plan, difficulty, bountyOnly);
  const url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=${perPage}&page=${page}`;
  const started = Date.now();
  let status = 0;
  let items: GitHubIssueItem[] = [];
  try {
    const res = await fetch(url, { headers });
    status = res.status;
    if (res.ok) items = ((await res.json()) as { items?: GitHubIssueItem[] }).items ?? [];
  } catch {
    // network failure: counted as a failed search, the others can still succeed
  }
  send({ t: "search", selection: plan.selection, language: plan.language, ok: status >= 200 && status < 300, found: items.length, ms: Date.now() - started });
  return { plan, perPage, status, items };
}

async function fetchIssuesForSelections(
  selections: string[],
  difficulty: string,
  bountyOnly: boolean,
  page: number,
  headers: Record<string, string>,
  send: Send
): Promise<{ items: GitHubIssueItem[]; hasMore: boolean; partial: boolean }> {
  const plans = selections.flatMap(plansFor);
  send({ t: "start", selections, queries: plans.length });

  // Every selection gets an equal share of a page, split between its own searches, and a search always asks for the
  // same number of results. Page N of a selection is therefore always the next slice of it: nothing is skipped
  // between pages, nothing has to be trimmed afterwards, and a busy language cannot push a quiet one out.
  const share = Math.max(1, Math.floor(PER_PAGE / selections.length));
  const perPageOf = (plan: Plan) => Math.max(1, Math.floor(share / plansFor(plan.selection).length));
  const results = await Promise.all(plans.map((plan) => searchOnce(plan, perPageOf(plan), difficulty, bountyOnly, page, headers, send)));

  if (results.every(({ status }) => status === 403 || status === 429)) {
    throw new HttpError(429, "Rate limit reached.");
  }
  if (!results.some(({ status }) => status >= 200 && status < 300)) {
    throw new HttpError(502, "GitHub API error");
  }

  // Each item is tagged with the selection that found it (`matchedLanguage`) since that's what the row badge should
  // show: a repo matched via "React" is Linguist-detected as plain "JavaScript", but the badge reflects what was picked.
  // An issue found by two selections stays with the first one picked.
  const seen = new Set<number>();
  const merged: GitHubIssueItem[] = [];
  for (const selection of selections) {
    for (const { plan, items } of results) {
      if (plan.selection !== selection) continue;
      for (const item of items) {
        if (item.id == null || seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push({ ...item, matchedLanguage: selection });
      }
    }
  }
  merged.sort(newestFirst);

  const found = results.reduce((sum, { items }) => sum + items.length, 0);
  send({ t: "merge", found, kept: merged.length });
  // A search that came back full has another page behind it.
  const hasMore = results.some(({ items, perPage }) => items.length >= perPage);
  // A failed search leaves its stack under-represented, so the page is told and can say so.
  const partial = results.some(({ status }) => status < 200 || status >= 300);

  // Repo health is per REPOSITORY, so a repo with four issues is checked once, not four times.
  const repos = [...new Set(merged.map(repoOf).filter(Boolean))];
  send({ t: "repos", total: repos.length });
  const health = new Map<string, RepoHealth>();
  let done = 0;
  await Promise.all(
    repos.map(async (repo) => {
      const result = await checkRepoHealth(repo, headers);
      health.set(repo, result);
      done += 1;
      send({ t: "health", repo, active: result.isActive, last: result.lastActivityAt, done, total: repos.length });
    })
  );

  const items = merged.map((item) => {
    const repoHealth = health.get(repoOf(item));
    return {
      ...item,
      body: typeof item.body === "string" ? item.body.slice(0, MAX_BODY_CHARS) : null,
      isActiveRepo: repoHealth ? repoHealth.isActive : true,
      repoLastActivityAt: repoHealth ? repoHealth.lastActivityAt : null,
    };
  });
  return { items, hasMore, partial };
}

/**
 * One JSON object per line, so the page can show what the server is doing as it does it. Failures before the
 * stream starts are ordinary JSON responses; from the first byte on they are `error` events.
 */
function ndjson(run: (send: Send) => Promise<void>) {
  const encoder = new TextEncoder();
  let open = true;
  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        const send: Send = (event) => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
          } catch {
            open = false;
          }
        };
        try {
          await run(send);
        } catch (error) {
          if (error instanceof HttpError) {
            send({ t: "error", status: error.status, error: error.message });
          } else {
            console.error("Error fetching issues:", error);
            send({ t: "error", status: 500, error: "Failed to fetch issues" });
          }
        } finally {
          if (open) {
            open = false;
            try {
              controller.close();
            } catch {
              // already closed by the client
            }
          }
        }
      },
      cancel() {
        open = false;
      },
    }),
    { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } }
  );
}

/** Quotes and control characters would break out of the quoted GitHub qualifier, and nothing in the picker needs them. */
const cleanSelection = (raw: string) => raw.replace(/["\\\u0000-\u001f]/g, "").trim().slice(0, 40);

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const quotaCheck = await canAffordUsage(userId, { github: 1 });
    if (!quotaCheck.allowed) {
      return NextResponse.json({ error: quotaCheck.reason, reason: quotaCheck.reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const languageParam = searchParams.get("language") || "javascript";
    const requested = searchParams.get("difficulty") || "easy";
    const difficulty = Object.prototype.hasOwnProperty.call(DIFFICULTY_LABELS, requested) ? requested : "easy";
    const page = Math.min(10, Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1));
    const bountyOnly = searchParams.get("bounty") === "true";
    const streaming = searchParams.get("stream") === "1"; // `sort` is ignored on purpose: the page sorts what it has loaded

    const selections = [...new Map(languageParam.split(",").map(cleanSelection).filter(Boolean).map((s) => [s.toLowerCase(), s])).values()].slice(0, MAX_SELECTIONS);

    // 1. Get Auth Headers
    let githubHeaders = {} as Record<string, string>;
    try {
      githubHeaders = await getGithubAuthHeader();
    } catch (err) {
      const appError = err as Error & { name?: string };
      if (appError?.name === "NeedsGithubConnectError") {
        return NextResponse.json({ error: "needs_github_connect" }, { status: 403 });
      }
      throw err;
    }
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      ...githubHeaders,
    };

    // 2, 3 & 4. Query GitHub (one request per selection, merged), then add repo health
    const find = (send: Send) =>
      fetchIssuesForSelections(selections.length > 0 ? selections : ["javascript"], difficulty, bountyOnly, page, headers, send);

    if (!streaming) {
      const { items, hasMore, partial } = await find(() => {});
      await consumeQuota(userId, { github: 1 });
      return NextResponse.json({ items, hasMore, partial });
    }

    return ndjson(async (send) => {
      const { items, hasMore, partial } = await find(send);
      await consumeQuota(userId, { github: 1 });
      send({ t: "result", items, hasMore, partial });
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message, items: [] }, { status: error.status });
    }
    console.error("Error fetching issues:", error);
    return NextResponse.json({ error: "Failed to fetch issues", items: [] }, { status: 500 });
  }
}