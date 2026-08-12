import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";

export class GitHubNotConnectedError extends Error {
  constructor() {
    super("GitHub account is not connected");
    this.name = "GitHubNotConnectedError";
  }
}

export class GitHubTokenExpiredError extends Error {
  constructor() {
    super("GitHub connection has expired");
    this.name = "GitHubTokenExpiredError";
  }
}

export class GitHubAccountAlreadyLinkedError extends Error {
  constructor() {
    super("That GitHub account is already linked to another OSHunt account");
    this.name = "GitHubAccountAlreadyLinkedError";
  }
}

type UpsertInput = {
  userId: string;
  githubUserId: string;
  username: string;
  avatarUrl?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  scopes: string[];
  tokenExpiresAt?: Date | null;
};

export async function upsertGitHubConnection(input: UpsertInput) {
  const data = {
    githubUserId: input.githubUserId,
    username: input.username,
    avatarUrl: input.avatarUrl ?? null,
    accessToken: encrypt(input.accessToken),
    refreshToken: input.refreshToken ? encrypt(input.refreshToken) : null,
    scopes: input.scopes,
    tokenExpiresAt: input.tokenExpiresAt ?? null,
    revokedAt: null,
  };

  const existing = await prisma.gitHubConnection.findFirst({
    where: { githubUserId: input.githubUserId },
    select: { userId: true },
  });

  if (existing && existing.userId !== input.userId) {
    throw new GitHubAccountAlreadyLinkedError();
  }

  try {
    return await prisma.gitHubConnection.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, ...data, connectedAt: new Date() },
      update: { ...data, connectedAt: new Date() },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const targets = Array.isArray(error.meta?.target) ? (error.meta.target as string[]) : [];
      if (targets.includes("githubUserId")) {
        throw new GitHubAccountAlreadyLinkedError();
      }
    }
    throw error;
  }
}

export async function disconnectGitHub(userId: string) {
  return prisma.gitHubConnection.update({
    where: { userId },
    data: {
      revokedAt: new Date(),
      accessToken: "",
      refreshToken: null,
    },
  });
}

export async function getConnectionStatus(userId: string) {
  const connection = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!connection) return { connected: false as const, expired: false as const };

  const expired = Boolean(connection.revokedAt || (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()));

  return {
    connected: !expired,
    expired,
    username: connection.username,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.connectedAt,
    scopes: connection.scopes,
  };
}

export async function getGithubAuthHeader(userId: string): Promise<{ Authorization: string }> {
  const connection = await prisma.gitHubConnection.findUnique({ where: { userId } });
  if (!connection) throw new GitHubNotConnectedError();
  if (connection.revokedAt) throw new GitHubTokenExpiredError();

  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    const refreshed = await tryRefreshToken(userId, connection.refreshToken);
    if (!refreshed) throw new GitHubTokenExpiredError();
    return { Authorization: `Bearer ${refreshed}` };
  }

  prisma.gitHubConnection.update({ where: { userId }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { Authorization: `Bearer ${decrypt(connection.accessToken)}` };
}

async function tryRefreshToken(userId: string, encryptedRefreshToken: string | null) {
  if (!encryptedRefreshToken) return null;

  const clientId = process.env.GITHUB_CONNECT_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CONNECT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: decrypt(encryptedRefreshToken),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) return null;

    await prisma.gitHubConnection.update({
      where: { userId },
      data: {
        accessToken: encrypt(data.access_token),
        refreshToken: data.refresh_token ? encrypt(data.refresh_token) : undefined,
        tokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      },
    });
    return data.access_token;
  } catch {
    return null;
  }
}
