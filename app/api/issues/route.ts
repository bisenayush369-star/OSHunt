import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGithubAuthHeader } from "@/lib/github";

type RepoHealth = { isActive: boolean; lastActivityAt: string | null };

// Feature 3: Check if a repo is active, and how long ago it last merged a PR.
async function checkRepoHealth(repoUrl: string, githubHeaders: Record<string, string>): Promise<RepoHealth> {
  const repoName = repoUrl.replace("https://api.github.com/repos/", "");

  try {
    const cached = await prisma.repoHealthCache.findUnique({
      where: { repoName }
    });

    if (cached && (Date.now() - new Date(cached.lastChecked).getTime()) < 86400000) {
      return {
        isActive: cached.isActive,
        lastActivityAt: new Date(cached.lastChecked).toISOString(),
      };
    }

    const res = await fetch(`https://api.github.com/repos/${repoName}/pulls?state=closed&per_page=10`, {
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
  } catch (error) {
    return { isActive: true, lastActivityAt: null };
  }
}

const DIFFICULTY_LABEL_QUERY: Record<string, string> = {
  easy: 'label:"good first issue"',
  medium: 'label:"help wanted"',
  // GitHub's REST search API rejects (or silently mis-runs) `label:a OR
  // label:b` between two qualifiers — confirmed against the live API. The
  // comma form is a separate, older, genuinely-supported GitHub feature for
  // OR-ing values of the SAME qualifier, verified working below.
  hard: 'label:"complex","bug"',
};

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

// Builds a GitHub search query for exactly one language-picker selection.
// Deliberately never combines multiple `language:` values into one query —
// see fetchIssuesForSelections() for why.
function buildQuery(selection: string, difficulty: string, bountyOnly: boolean): string {
  const key = selection.trim().toLowerCase();
  const difficultyClause = DIFFICULTY_LABEL_QUERY[difficulty] || "";
  let query: string;

  if (KEYWORD_ONLY.has(key)) {
    query = `"${selection}" in:title,body state:open ${difficultyClause}`;
  } else {
    const realLanguage = FRAMEWORK_TO_LANGUAGE[key] || key;
    query = `language:"${realLanguage}" state:open ${difficultyClause}`;
    if (realLanguage !== key) {
      query += ` "${selection}"`; // relevance hint for aliased frameworks
    }
  }

  if (bountyOnly) {
    query += ` (label:bounty OR "bounty" in:title OR "bounty" in:body)`;
  }
  return query;
}

/**
 * Runs one GitHub issue search per language-picker selection and merges the
 * results. GitHub's REST search API (api.github.com/search/issues) does not
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
async function fetchIssuesForSelections(
  selections: string[],
  difficulty: string,
  bountyOnly: boolean,
  page: string,
  headers: Record<string, string>
): Promise<{ items: any[]; rateLimited: boolean; ok: boolean }> {
  const responses = await Promise.all(
    selections.map(async (selection) => {
      const query = buildQuery(selection, difficulty, bountyOnly);
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=created&order=desc&per_page=15&page=${page}`;
      const res = await fetch(url, { headers });
      return { selection, res };
    })
  );

  if (responses.every(({ res }) => res.status === 403 || res.status === 429)) {
    return { items: [], rateLimited: true, ok: false };
  }

  // Keep each selection's results in their own (already newest-first) list —
  // do NOT flatten them together yet. Each item is tagged with the selection
  // that found it (`matchedLanguage`) since that's what the row badge should
  // show — a repo matched via "React" is still Linguist-detected as plain
  // "JavaScript", but the badge should reflect what the user picked.
  let anyOk = false;
  const perSelectionItems: any[][] = [];
  for (const { selection, res } of responses) {
    if (res.ok) {
      anyOk = true;
      const data = await res.json();
      const items = (data.items || []).map((item: any) => ({ ...item, matchedLanguage: selection }));
      perSelectionItems.push(items);
    } else {
      perSelectionItems.push([]);
    }
  }

  if (!anyOk) return { items: [], rateLimited: false, ok: false };

  // Round-robin one item from each selection in turn instead of flattening
  // everything and sorting by recency. A flat recency sort lets whichever
  // language happens to have the most GitHub traffic (TypeScript, say) fill
  // every slot before a slower-moving one (CSS, say) ever gets picked — with
  // 4 selections that can easily mean 3 of them show zero results, which is
  // exactly the "picked 4 languages, only see 1" bug. Round-robin guarantees
  // every selection gets a fair shot before we run out of room.
  const pointers = perSelectionItems.map(() => 0);
  const seen = new Set<number>();
  const merged: any[] = [];
  let progress = true;
  while (merged.length < 15 && progress) {
    progress = false;
    for (let s = 0; s < perSelectionItems.length; s++) {
      if (merged.length >= 15) break;
      const items = perSelectionItems[s];
      while (pointers[s] < items.length) {
        const candidate = items[pointers[s]];
        pointers[s]++;
        if (!seen.has(candidate.id)) {
          seen.add(candidate.id);
          merged.push(candidate);
          progress = true;
          break;
        }
      }
    }
  }

  // Fair selection is done — now sort just the picked set for a clean,
  // newest-first display order.
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { items: merged, rateLimited: false, ok: true };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const languageParam = searchParams.get("language") || "javascript";
    const difficulty = searchParams.get("difficulty") || "easy";
    const page = searchParams.get("page") || "1";
    const bountyOnly = searchParams.get("bounty") === "true";

    const selections = languageParam
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6); // safety cap — each selection is its own GitHub request

    // 1. Get Auth Headers
    const githubHeaders = await getGithubAuthHeader();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      ...githubHeaders,
    };

    // 2 & 3. Query GitHub — one request per selection, merged
    const { items: rawItems, rateLimited, ok } = await fetchIssuesForSelections(
      selections.length > 0 ? selections : ["javascript"],
      difficulty,
      bountyOnly,
      page,
      headers
    );

    if (rateLimited) {
      return NextResponse.json({ error: "Rate limit reached.", items: [] }, { status: 429 });
    }
    if (!ok) {
      return NextResponse.json({ error: "GitHub API error", items: [] }, { status: 502 });
    }

    let issues = rawItems;

    // 4. Add Repo Health Status (+ how long it's been inactive)
    const healthChecks = await Promise.all(
      issues.map((issue: any) => checkRepoHealth(issue.repository_url, githubHeaders))
    );

    issues = issues.map((issue: any, index: number) => ({
      ...issue,
      isActiveRepo: healthChecks[index].isActive,
      repoLastActivityAt: healthChecks[index].lastActivityAt,
    }));

    // ALL PAYWALL LOGIC REMOVED. Returning raw data.
    return NextResponse.json({ items: issues });

  } catch (error) {
    console.error("Error fetching issues:", error);
    return NextResponse.json({ error: "Failed to fetch issues", items: [] }, { status: 500 });
  }
}