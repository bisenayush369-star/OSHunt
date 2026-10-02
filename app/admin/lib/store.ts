import { prisma } from "@/components/lib/prisma";

export type User = {
  id: string;
  name: string;
  email: string;
  githubUsername?: string | null;
  joinedAt: string;
  lastSeen: string;
  blocked: boolean;
  blockReason?: string;
  actions: number;
};

export type Activity = {
  id: string;
  userId: string;
  action: string;
  detail?: string;
  at: string;
};

function normalizeDisplayName(user: {
  name?: string | null;
  githubUsername?: string | null;
  email?: string | null;
  id?: string;
}): string {
  const candidates = [user.name, user.githubUsername, user.email?.split("@")[0]];

  for (const candidate of candidates) {
    const clean = candidate?.trim();
    if (clean) return clean;
  }

  return user.id ? `User ${user.id.slice(0, 6)}` : "Unknown user";
}

function toIso(date: Date | string | null | undefined): string {
  if (!date) return new Date().toISOString();
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

async function safe<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.warn("[admin-store] fallback used due to Prisma schema mismatch:", error);
    return fallback;
  }
}

async function syncGitHubUsernames() {
  const connections = await prisma.gitHubConnection.findMany({
    select: { userId: true, username: true },
  });

  for (const connection of connections) {
    if (!connection.username) continue;

    const user = await prisma.user.findUnique({
      where: { id: connection.userId },
      select: { githubUsername: true },
    });

    if (user?.githubUsername !== connection.username) {
      await prisma.user.update({
        where: { id: connection.userId },
        data: { githubUsername: connection.username },
      }).catch(() => {});
    }
  }
}

export async function listUsers(): Promise<User[]> {
  return safe<User[]>([], async () => {
    await syncGitHubUsernames();

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        githubConnection: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    const counts = await prisma.activity.groupBy({
      by: ["userId"],
      _count: { _all: true },
    });

    const countMap = new Map<string, number>(counts.map((row) => [row.userId, row._count._all]));

    return users.map((user) => ({
      id: user.id,
      name: normalizeDisplayName({
        ...user,
        githubUsername: user.githubUsername || user.githubConnection?.username || null,
      }),
      email: user.email || "No email",
      githubUsername: user.githubUsername || user.githubConnection?.username || null,
      joinedAt: toIso(user.createdAt),
      lastSeen: toIso(user.lastSeen ?? user.createdAt),
      blocked: Boolean(user.blocked),
      blockReason: user.blockReason || undefined,
      actions: countMap.get(user.id) ?? 0,
    }));
  });
}

export async function listActivity(userId: string): Promise<Activity[]> {
  return safe<Activity[]>([], async () => {
    const rows = await prisma.activity.findMany({
      where: { userId },
      orderBy: { at: "desc" },
      select: { id: true, userId: true, action: true, detail: true, at: true },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      action: row.action,
      detail: row.detail || undefined,
      at: toIso(row.at),
    }));
  });
}

export async function setBlocked(userId: string, blocked: boolean, reason?: string) {
  return safe<null | Omit<User, "actions"> & { actions?: number }>(null, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        githubUsername: true,
        createdAt: true,
        blocked: true,
        blockReason: true,
        lastSeen: true,
      },
    });

    if (!user) return null;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        blocked,
        blockReason: blocked ? (reason?.trim() || "Blocked by admin") : null,
        lastSeen: user.lastSeen ?? user.createdAt,
      },
      select: {
        id: true,
        name: true,
        email: true,
        githubUsername: true,
        createdAt: true,
        blocked: true,
        blockReason: true,
        lastSeen: true,
      },
    });

    const activityCount = await prisma.activity.count({ where: { userId } });

    return {
      id: updatedUser.id,
      name: normalizeDisplayName(updatedUser),
      email: updatedUser.email || "No email",
      joinedAt: toIso(updatedUser.createdAt),
      lastSeen: toIso(updatedUser.lastSeen ?? updatedUser.createdAt),
      blocked: Boolean(updatedUser.blocked),
      blockReason: updatedUser.blockReason || undefined,
      actions: activityCount,
    };
  });
}

export async function logActivity(userId: string, action: string, detail?: string) {
  await safe(undefined, async () => {
    await prisma.activity.create({
      data: {
        userId,
        action,
        detail: detail?.trim() ? detail.trim() : undefined,
        at: new Date(),
      },
    });
    return undefined;
  });
}

export async function isBlocked(userId: string) {
  return safe(false, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { blocked: true },
    });
    return Boolean(user?.blocked);
  });
}
