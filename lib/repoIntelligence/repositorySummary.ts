import type { ReadFile, RepoMetadata, ScoredFile, TechDetection, RepositorySummary } from "./types"

/**
 * Builds the reusable per-repo summary. Takes the TechDetection that already
 * exists (detect.ts is untouched) and adds the pieces it doesn't cover:
 * folders, entry points, routing/state/auth/library signals. This is meant
 * to be computed ONCE per indexed commit and reused — see cache.ts for the
 * "once" part; this file only knows how to compute it, not when to.
 */

function detectRouting(deps: Record<string, string>, treePaths: string[], framework: string | null): string | null {
  const has = (n: string) => n in deps
  if (framework === "Next.js") {
    return treePaths.some((p) => /^(app|src\/app)\//.test(p)) ? "Next.js App Router" : "Next.js Pages Router"
  }
  if (has("react-router-dom") || has("react-router")) return "React Router"
  if (has("@tanstack/react-router")) return "TanStack Router"
  if (has("express") && treePaths.some((p) => /routes?\//.test(p))) return "Express routes"
  if (has("@nestjs/core")) return "NestJS controllers/routing"
  return null
}

function detectStateManagement(deps: Record<string, string>): string[] {
  const has = (n: string) => n in deps
  return [
    has("redux") || has("@reduxjs/toolkit") ? "Redux" : null,
    has("zustand") && "Zustand",
    has("jotai") && "Jotai",
    has("recoil") && "Recoil",
    has("mobx") && "MobX",
    has("@tanstack/react-query") && "TanStack Query",
    has("swr") && "SWR",
  ].filter((x): x is string => Boolean(x))
}

function detectAuth(deps: Record<string, string>): string[] {
  const has = (n: string) => n in deps
  return [
    has("next-auth") && "NextAuth.js",
    has("@clerk/nextjs") || has("@clerk/clerk-react") ? "Clerk" : null,
    has("passport") && "Passport.js",
    has("@auth0/nextjs-auth0") || has("auth0") ? "Auth0" : null,
    has("firebase") && "Firebase Auth",
    has("@supabase/supabase-js") && "Supabase Auth",
    has("lucia") && "Lucia",
  ].filter((x): x is string => Boolean(x))
}

function detectApiLayer(deps: Record<string, string>, detection: TechDetection): string[] {
  const has = (n: string) => n in deps
  const layers: string[] = []
  if (has("graphql")) layers.push("GraphQL")
  if (has("@trpc/server")) layers.push("tRPC")
  if (detection.framework && ["Express", "Fastify", "NestJS", "Next.js"].includes(detection.framework)) {
    layers.push(`REST (${detection.framework})`)
  }
  return layers
}

/** Folders worth knowing about, ranked by how many scored files fall under
 *  them and how highly those files scored — reuses scoring.ts's output
 *  instead of re-walking the tree with new heuristics. */
function importantFolders(scoredFiles: ScoredFile[], max = 8): { path: string; reason: string }[] {
  const byFolder = new Map<string, { count: number; totalScore: number }>()
  for (const f of scoredFiles) {
    const parts = f.path.split("/")
    if (parts.length < 2) continue
    const folder = parts.slice(0, -1).join("/")
    const entry = byFolder.get(folder) ?? { count: 0, totalScore: 0 }
    entry.count += 1
    entry.totalScore += f.score
    byFolder.set(folder, entry)
  }

  return Array.from(byFolder.entries())
    .map(([path, { count, totalScore }]) => ({ path, avg: totalScore / count, count }))
    .sort((a, b) => b.avg * Math.log(b.count + 1) - a.avg * Math.log(a.count + 1))
    .slice(0, max)
    .map(({ path, count }) => ({ path, reason: `${count} high-priority file${count === 1 ? "" : "s"}` }))
}

function majorLibraries(deps: Record<string, string>, exclude: Set<string>, max = 10): string[] {
  return Object.keys(deps)
    .filter((name) => !name.startsWith("@types/") && !exclude.has(name))
    .slice(0, max)
}

export function buildRepositorySummary(
  metadata: RepoMetadata,
  detection: TechDetection,
  scoredFiles: ScoredFile[],
  readFiles: ReadFile[],
  packageJson: Record<string, any> | null
): RepositorySummary {
  const deps: Record<string, string> = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) }

  const entryPoints = readFiles.filter((f) => f.section === "entryPoints").map((f) => f.path)

  const alreadyNamedElsewhere = new Set([
    ...detectStateManagement(deps),
    ...detectAuth(deps),
    detection.framework,
    detection.buildTool,
  ].filter((x): x is string => Boolean(x)))

  return {
    framework: detection.framework,
    language: detection.language,
    packageManager: detection.packageManager,
    buildTool: detection.buildTool,
    repositoryType: detection.repositoryType,
    monorepoTool: detection.monorepoTool,
    importantFolders: importantFolders(scoredFiles),
    entryPoints,
    routing: detectRouting(deps, scoredFiles.map((f) => f.path), detection.framework),
    stateManagement: detectStateManagement(deps),
    databaseLayer: detection.database,
    apiLayer: detectApiLayer(deps, detection),
    authentication: detectAuth(deps),
    majorLibraries: majorLibraries(deps, alreadyNamedElsewhere),
  }
}
