export function getUsageProgressPercent({
  githubUsed,
  githubLimit,
  aiUsed,
  aiLimit,
}: {
  githubUsed: number;
  githubLimit: number;
  aiUsed: number;
  aiLimit: number;
}) {
  const safeGithubUsed = Number.isFinite(githubUsed) ? Math.max(0, githubUsed) : 0;
  const safeAiUsed = Number.isFinite(aiUsed) ? Math.max(0, aiUsed) : 0;
  const safeGithubLimit = Number.isFinite(githubLimit) ? Math.max(0, githubLimit) : 0;
  const safeAiLimit = Number.isFinite(aiLimit) ? Math.max(0, aiLimit) : 0;

  const totalUsed = safeGithubUsed + safeAiUsed;
  const totalLimit = safeGithubLimit + safeAiLimit;

  if (totalLimit === 0) return 0;

  return Math.min(100, (totalUsed / totalLimit) * 100);
}
