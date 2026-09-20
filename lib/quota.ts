import { prisma } from "@/lib/prisma";

export type Tier = "free" | "pro";

export type QuotaBucket = {
  used: number;
  limit: number;
};

export type FeatureState = {
  key: string;
  locked: boolean;
  cost?: { github?: number; ai?: number };
};

export type UsageSummary = {
  tier: Tier;
  resetsAt: string;
  usage: {
    github: QuotaBucket;
    ai: QuotaBucket;
  };
  features: FeatureState[];
};

type QuotaRecord = {
  userId: string;
  tier: Tier;
  githubCallsUsed: number;
  aiMessagesUsed: number;
  resetsAt: Date;
};

type QuotaClient = {
  findUnique: (args: { where: { userId: string } }) => Promise<QuotaRecord | null>;
  create: (args: { data: Omit<QuotaRecord, "createdAt" | "updatedAt"> }) => Promise<QuotaRecord>;
  update: (args: { where: { userId: string }; data: Partial<QuotaRecord> }) => Promise<QuotaRecord>;
  updateMany: (args: { where: Record<string, unknown>; data: Partial<QuotaRecord> & { tier?: Tier } }) => Promise<{ count: number }>;
};

export const TIER_LIMITS: Record<Tier, { github: number; ai: number }> = {
  free: { github: 15, ai: 5 },
  pro: { github: 5000, ai: 500 },
};

const FEATURE_DEFINITIONS = [
  { key: "git_analyzer", freeLocked: false, cost: { github: 1, ai: 1 } },
  { key: "agent_chat", freeLocked: false, cost: { ai: 1 } },
  { key: "team_workspaces", freeLocked: true },
  { key: "deep_repos", freeLocked: true },
] as const;

function getResetDateForUser(now: Date): Date {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

async function getOrCreateQuotaRecord(userId: string, _createdAt: Date, isPro: boolean, now = new Date()) {
  const quotaClient = prisma as typeof prisma & { userQuota?: QuotaClient };
  const model = quotaClient.userQuota;

  if (!model) {
    return {
      userId,
      tier: isPro ? "pro" : "free",
      githubCallsUsed: 0,
      aiMessagesUsed: 0,
      resetsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    } satisfies QuotaRecord;
  }

  let quota = await model.findUnique({ where: { userId } });

  if (!quota) {
    const resetsAt = getResetDateForUser(now);
    const tier: Tier = isPro ? "pro" : "free";
    quota = await model.create({
      data: {
        userId,
        tier,
        githubCallsUsed: 0,
        aiMessagesUsed: 0,
        resetsAt,
      },
    });
    return quota;
  }

  if (quota.resetsAt <= now) {
    const nextReset = getResetDateForUser(now);
    const nextTier: Tier = isPro ? "pro" : "free";
    quota = await model.update({
      where: { userId },
      data: {
        tier: nextTier,
        githubCallsUsed: 0,
        aiMessagesUsed: 0,
        resetsAt: nextReset,
      },
    });
  }

  if (isPro && quota.tier !== "pro") {
    quota = await model.update({
      where: { userId },
      data: { tier: "pro" },
    });
  }

  return quota;
}

async function resetQuotaIfExpired(userId: string, isPro: boolean, now = new Date()) {
  const quotaClient = prisma as typeof prisma & { userQuota?: QuotaClient };
  const model = quotaClient.userQuota;

  if (!model) return;

  const existing = await model.findUnique({ where: { userId } });
  if (!existing) return;

  if (existing.resetsAt > now) return;

  await model.update({
    where: { userId },
    data: {
      tier: isPro ? "pro" : "free",
      githubCallsUsed: 0,
      aiMessagesUsed: 0,
      resetsAt: getResetDateForUser(now),
    },
  });
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPro: true, createdAt: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await resetQuotaIfExpired(userId, user.isPro);
  const quota = await getOrCreateQuotaRecord(user.id, user.createdAt, user.isPro);
  const tier: Tier = quota.tier === "pro" || user.isPro ? "pro" : "free";
  const limits = TIER_LIMITS[tier];

  const features: FeatureState[] = FEATURE_DEFINITIONS.map((feature) => {
    const locked = tier === "free" && feature.freeLocked;
    const cost = "cost" in feature ? feature.cost : undefined;
    return {
      key: feature.key,
      locked,
      ...(locked ? {} : { cost }),
    };
  });

  return {
    tier,
    resetsAt: quota.resetsAt.toISOString(),
    usage: {
      github: { used: quota.githubCallsUsed, limit: limits.github },
      ai: { used: quota.aiMessagesUsed, limit: limits.ai },
    },
    features,
  };
}

export async function canAffordUsage(userId: string, cost: { github?: number; ai?: number } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPro: true, createdAt: true },
  });

  if (!user) {
    return { allowed: false, reason: "user_not_found" as const };
  }

  await resetQuotaIfExpired(userId, user.isPro);
  const quota = await getOrCreateQuotaRecord(user.id, user.createdAt, user.isPro);
  const tier: Tier = quota.tier === "pro" || user.isPro ? "pro" : "free";
  const limits = TIER_LIMITS[tier];

  if (cost.github && quota.githubCallsUsed + cost.github > limits.github) {
    return { allowed: false, reason: "github_quota_exhausted" as const };
  }

  if (cost.ai && quota.aiMessagesUsed + cost.ai > limits.ai) {
    return { allowed: false, reason: "ai_quota_exhausted" as const };
  }

  return { allowed: true, reason: null, quota };
}

export async function consumeQuota(userId: string, cost: { github?: number; ai?: number } = {}) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isPro: true, createdAt: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await resetQuotaIfExpired(userId, user.isPro);
  const quota = await getOrCreateQuotaRecord(user.id, user.createdAt, user.isPro);
  const tier: Tier = quota.tier === "pro" || user.isPro ? "pro" : "free";
  const limits = TIER_LIMITS[tier];

  const githubIncrement = cost.github ?? 0;
  const aiIncrement = cost.ai ?? 0;

  if (githubIncrement && quota.githubCallsUsed + githubIncrement > limits.github) {
    throw new Error("github_quota_exhausted");
  }

  if (aiIncrement && quota.aiMessagesUsed + aiIncrement > limits.ai) {
    throw new Error("ai_quota_exhausted");
  }

  const quotaClient = prisma as typeof prisma & { userQuota?: QuotaClient };
  if (!quotaClient.userQuota) {
    return { success: true, skipped: true };
  }

  await quotaClient.userQuota.update({
    where: { userId },
    data: {
      githubCallsUsed: quota.githubCallsUsed + githubIncrement,
      aiMessagesUsed: quota.aiMessagesUsed + aiIncrement,
      tier,
    },
  });

  return { success: true };
}
