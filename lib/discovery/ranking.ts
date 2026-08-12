import type { Framework, Repo, RepoDetail, ScoreFactor } from "@/types/discovery";

/**
 * Reliability Score (0-100) — how trustworthy/usable a repo looks as a free
 * resource RIGHT NOW: is it maintained, licensed, documented, stable. This
 * is NOT about how good a repo is to contribute code to — that's a
 * different question this feature isn't answering. Two tiers, both cheap:
 *
 * BASE (this file, computed for every repo in the grid): recency, stars,
 * license, topics, issue/fork ratios, archived status. Search-response data
 * only — zero extra API calls, so it's fine to run for a whole page of
 * results. Ceiling: 70 points.
 *
 * REFINED (computed once the modal's detail fetch resolves — see
 * refineReliabilityScore below): adds README substance, contributor count,
 * and release presence. These three need data that's ONLY fetched when a
 * repo is actually opened (languages/contributors/README/release are
 * already being fetched there for other reasons), so scoring with them is
 * free at that point too — just not available any earlier. Ceiling: +30,
 * for a combined 100.
 */

function baseFactors(repo: Repo): ScoreFactor[] {
  const daysSincePush = repo.updatedAt
    ? (Date.now() - new Date(repo.updatedAt).getTime()) / 86_400_000
    : Infinity;
  const recencyPoints = daysSincePush <= 14 ? 20 : daysSincePush <= 60 ? 14 : daysSincePush <= 180 ? 6 : 0;

  const starPoints = repo.stars >= 5000 ? 10 : repo.stars >= 500 ? 6 : repo.stars >= 50 ? 3 : 0;

  const forkRatio = repo.forks / Math.max(repo.stars, 1);
  const healthyForkRatio = forkRatio >= 0.02 && forkRatio <= 0.5;

  const issueRatio = repo.openIssues / Math.max(repo.stars, 1);
  const healthyIssueRatio = issueRatio < 0.15;

  return [
    { label: recencyPoints > 0 ? "Still actively maintained" : "No recent updates", met: recencyPoints > 0, points: recencyPoints },
    { label: "Widely used", met: starPoints > 0, points: starPoints },
    { label: repo.license ? "Clearly licensed" : "No license found", met: !!repo.license, points: repo.license ? 15 : 0 },
    { label: "Tagged for discoverability", met: repo.topics.length > 0, points: repo.topics.length > 0 ? 8 : 0 },
    { label: "Known issues get addressed", met: healthyIssueRatio, points: healthyIssueRatio ? 10 : 0 },
    { label: "Others build on this too", met: healthyForkRatio, points: healthyForkRatio ? 7 : 0 },
  ];
}

export function reliabilityScoreFactors(repo: Repo): ScoreFactor[] {
  return baseFactors(repo);
}

export function computeReliabilityScore(repo: Repo): number {
  const raw = baseFactors(repo).reduce((sum, f) => sum + f.points, 0);
  // Archived is a near-total gate, not just another factor: an archived repo
  // won't get security fixes or bug fixes going forward, so it's a real risk
  // to depend on regardless of how good everything else about it looks.
  return repo.archived ? Math.min(12, raw) : Math.max(0, Math.min(100, raw));
}

/**
 * Called once the modal's detail fetch resolves. Same base factors, plus
 * README substance, contributor count, and release presence. Contributor
 * count is capped at 6 by the fetch itself (see github.ts) — enough to
 * tell "one person's side project" from "a real team is behind this"
 * without paying for a second request just to get an exact total.
 */
export function refineReliabilityScore(
  repo: Repo,
  detail: RepoDetail
): { score: number; factors: ScoreFactor[] } {
  const base = reliabilityScoreFactors(repo);

  const hasReadme = Boolean(detail.readmeExcerpt && detail.readmeExcerpt.length > 40);
  const readmePoints = hasReadme ? 12 : 0;

  const contributorCount = detail.contributors.length;
  const contributorPoints = contributorCount >= 5 ? 14 : contributorCount >= 2 ? 6 : 0;

  const hasRelease = Boolean(detail.latestRelease);
  const releasePoints = hasRelease ? 6 : 0;

  const refinedFactors: ScoreFactor[] = [
    ...base,
    { label: hasReadme ? "Well documented" : "No README found", met: hasReadme, points: readmePoints },
    {
      label: contributorCount >= 2 ? "Backed by a real team" : "Single-maintainer project",
      met: contributorCount >= 2,
      points: contributorPoints,
    },
    { label: hasRelease ? "Ships stable versions" : "No versioned releases yet", met: hasRelease, points: releasePoints },
  ];

  const raw = refinedFactors.reduce((sum, f) => sum + f.points, 0);
  const score = repo.archived ? Math.min(12, raw) : Math.max(0, Math.min(100, raw));
  return { score, factors: refinedFactors };
}

/**
 * "Trending" heuristic (0-1, higher = more trending). GitHub's search API
 * has no queryable "stars gained this week" field — this proxies it with
 * push recency weighted against a log-scaled star count, so an already-huge
 * repo doesn't win just for being huge. Literal day-over-day deltas would
 * need a small cron job snapshotting star counts over time, not one call.
 */
export function computeTrendingScore(repo: Repo): number {
  const daysSincePush = repo.updatedAt
    ? (Date.now() - new Date(repo.updatedAt).getTime()) / 86_400_000
    : 365;
  const recencyScore = Math.max(0, 1 - daysSincePush / 30);
  const starScore = Math.min(1, Math.log10(repo.stars + 1) / 5);
  return recencyScore * 0.65 + starScore * 0.35;
}

const FRAMEWORK_TOPIC_MAP: Record<string, Framework> = {
  react: "React", reactjs: "React",
  nextjs: "Next.js", "next-js": "Next.js",
  vue: "Vue", vuejs: "Vue", vue3: "Vue",
  angular: "Angular",
  svelte: "Svelte", sveltekit: "Svelte",
  express: "Express", expressjs: "Express",
  nestjs: "NestJS",
  fastify: "Fastify",
  fastapi: "FastAPI",
  django: "Django",
  laravel: "Laravel",
  "spring-boot": "Spring Boot", springboot: "Spring Boot", spring: "Spring Boot",
  flutter: "Flutter",
  "react-native": "React Native", reactnative: "React Native",
};

/** Reads topics already present on the repo object — no extra API calls. Works for every language/ecosystem. */
export function detectFrameworks(topics: string[]): Framework[] {
  const found = new Set<Framework>();
  for (const topic of topics) {
    const match = FRAMEWORK_TOPIC_MAP[topic.toLowerCase()];
    if (match) found.add(match);
  }
  return Array.from(found);
}

const PACKAGE_JSON_FRAMEWORK_MAP: Record<string, Framework> = {
  next: "Next.js",
  react: "React",
  vue: "Vue",
  "@angular/core": "Angular",
  svelte: "Svelte",
  express: "Express",
  "@nestjs/core": "NestJS",
  fastify: "Fastify",
  "react-native": "React Native",
};

/**
 * Secondary detection signal, only run when the modal already fetches
 * package.json (see github.ts) — catches frameworks a repo didn't bother
 * tagging as a topic. JS/TS-ecosystem only: Python/PHP/Java frameworks
 * would need requirements.txt/composer.json/pom.xml parsing instead, which
 * isn't included here to keep this to one lightweight check.
 */
export function detectFrameworksFromPackageJson(pkg: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): Framework[] {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const found = new Set<Framework>();
  for (const [dep, framework] of Object.entries(PACKAGE_JSON_FRAMEWORK_MAP)) {
    if (dep in deps) found.add(framework);
  }
  return Array.from(found);
}
