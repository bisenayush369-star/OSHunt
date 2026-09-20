-- Add missing schema for the quota and GitHub connection feature set.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "githubTrialUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "newsletter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "useCase" TEXT,
  ADD COLUMN IF NOT EXISTS "onboarded" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isPro" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "UserQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "githubCallsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "resetsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserQuota_userId_key"
    ON "UserQuota"("userId");

CREATE INDEX IF NOT EXISTS "UserQuota_userId_idx"
    ON "UserQuota"("userId");

CREATE TABLE IF NOT EXISTS "GitHubConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GitHubConnection_userId_key"
    ON "GitHubConnection"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "GitHubConnection_githubUserId_key"
    ON "GitHubConnection"("githubUserId");

CREATE INDEX IF NOT EXISTS "GitHubConnection_userId_idx"
    ON "GitHubConnection"("userId");

CREATE TABLE IF NOT EXISTS "RepoAnalysis" (
    "id" TEXT NOT NULL,
    "repoName" TEXT NOT NULL,
    "aiExplanation" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RepoAnalysis_repoName_key"
    ON "RepoAnalysis"("repoName");

CREATE TABLE IF NOT EXISTS "RepoHealthCache" (
    "repoName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepoHealthCache_pkey" PRIMARY KEY ("repoName")
);

ALTER TABLE "UserQuota"
    ADD CONSTRAINT "UserQuota_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GitHubConnection"
    ADD CONSTRAINT "GitHubConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
