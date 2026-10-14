import { prisma } from "@/components/lib/prisma";
import { isUserPaid, loadPaidUserIds } from "./billing";
import { BLOCK_REASON_MAX, type AdminActivity, type AdminUser } from "./contract";

/**
 * Data layer for users + activity. The ONLY place (with analytics.ts) that talks to Prisma
 * for admin features. Routes call these functions; the UI never does.
 *
 * Error policy
 *  - Reads/writes accept `{ strict: true }`. Admin routes always pass it so a database
 *    failure becomes an honest 500 instead of an empty table.
 *  - Without `strict`, the legacy behaviour is kept: log and return a fallback value.
 *    (isBlocked keeps this default so a schema hiccup cannot lock everyone out; see
 *    its `failClosed` option.)
 */

/** @deprecated Legacy names. Import AdminUser / AdminActivity from ./contract. */
export type User = AdminUser;
/** @deprecated */
export type Activity = AdminActivity;

type Strict = { strict?: boolean };

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  githubUsername: string | null;
  onboarded: boolean | null;
  blocked: boolean | null;
  blockReason: string | null;
  createdAt: Date;
  lastSeen: Date | null;
  githubConnection: { username: string | null } | null;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  githubUsername: true,
  onboarded: true,
  blocked: true,
  blockReason: true,
  createdAt: true,
  lastSeen: true,
  githubConnection: { select: { username: true } },
} as const;

export function displayName(user: {
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

async function safe<T>(label: string, fallback: T, run: () => Promise<T>, strict?: boolean): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`[admin-store] ${label} failed`, error);
    if (strict) throw error;
    return fallback;
  }
}

function rowToUser(row: UserRow, actions: number, paid: boolean): AdminUser {
  const githubUsername = row.githubUsername || row.githubConnection?.username || null;
  return {
    id: row.id,
    name: displayName({ ...row, githubUsername }),
    email: row.email || "No email",
    githubUsername,
    joinedAt: toIso(row.createdAt),
    lastSeen: toIso(row.lastSeen ?? row.createdAt),
    onboarded: Boolean(row.onboarded),
    blocked: Boolean(row.blocked),
    blockReason: row.blockReason || undefined,
    paid,
    actions,
  };
}

/* ── Users ──────────────────────────────────────────────────────────────── */

export async function listUsers(opts: Strict & { limit?: number } = {}): Promise<AdminUser[]> {
  return safe(
    "listUsers",
    [] as AdminUser[],
    async () => {
      const [rows, counts, paidIds] = await Promise.all([
        prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: opts.limit, select: userSelect }),
        prisma.activity.groupBy({ by: ["userId"], _count: { _all: true } }),
        loadPaidUserIds(),
      ]);
      const countMap = new Map<string, number>(counts.map((row) => [row.userId, row._count._all]));
      return rows.map((row) => rowToUser(row, countMap.get(row.id) ?? 0, paidIds?.has(row.id) ?? false));
    },
    opts.strict,
  );
}

export async function countUsers(opts: Strict = {}): Promise<number> {
  return safe("countUsers", 0, () => prisma.user.count(), opts.strict);
}

export async function getUser(id: string, opts: Strict = {}): Promise<AdminUser | null> {
  return safe<AdminUser | null>(
    "getUser",
    null,
    async () => {
      const [row, actions, paid] = await Promise.all([
        prisma.user.findUnique({ where: { id }, select: userSelect }),
        prisma.activity.count({ where: { userId: id } }),
        isUserPaid(id),
      ]);
      return row ? rowToUser(row, actions, paid) : null;
    },
    opts.strict,
  );
}

/** Returns the updated user, or null when the id does not exist. Does not write an audit row. */
export async function setBlocked(
  userId: string,
  blocked: boolean,
  reason?: string,
  opts: Strict = {},
): Promise<AdminUser | null> {
  return safe<AdminUser | null>(
    "setBlocked",
    null,
    async () => {
      const blockReason = blocked ? reason?.trim().slice(0, BLOCK_REASON_MAX) || "Blocked by admin" : null;

      const row = await prisma.user
        .update({ where: { id: userId }, data: { blocked, blockReason }, select: userSelect })
        .catch((error: unknown) => {
          if ((error as { code?: string } | null)?.code === "P2025") return null; // record not found
          throw error;
        });

      if (!row) return null;
      const [actions, paid] = await Promise.all([prisma.activity.count({ where: { userId } }), isUserPaid(userId)]);
      return rowToUser(row, actions, paid);
    },
    opts.strict,
  );
}

/**
 * Policy check for the USER-FACING auth/session path (not the admin console).
 * Default is fail-open to match the old behaviour. Pass `failClosed: true` in sensitive
 * paths so a database error blocks instead of allowing.
 */
export async function isBlocked(userId: string, opts: { failClosed?: boolean } = {}): Promise<boolean> {
  return safe(
    "isBlocked",
    Boolean(opts.failClosed),
    async () => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { blocked: true } });
      return Boolean(user?.blocked);
    },
  );
}

/* ── Activity ───────────────────────────────────────────────────────────── */

export async function listActivity(
  userId: string,
  opts: Strict & { limit?: number } = {},
): Promise<AdminActivity[]> {
  return safe(
    "listActivity",
    [] as AdminActivity[],
    async () => {
      const rows = await prisma.activity.findMany({
        where: { userId },
        orderBy: { at: "desc" },
        take: opts.limit ?? 100,
        select: { id: true, userId: true, action: true, detail: true, at: true },
      });

      return rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        action: row.action,
        detail: row.detail || undefined,
        at: toIso(row.at),
      }));
    },
    opts.strict,
  );
}

/** The only writer of Activity rows. Never throws; returns whether the row was saved. */
export async function logActivity(userId: string, action: string, detail?: string): Promise<boolean> {
  try {
    await prisma.activity.create({
      data: { userId, action, detail: detail?.trim() || undefined, at: new Date() },
    });
    return true;
  } catch (error) {
    console.error("[admin-store] logActivity failed", error);
    return false;
  }
}

/* ── GitHub username sync ───────────────────────────────────────────────── */

let lastReconcileAt = 0;

/**
 * Copies GitHubConnection.username onto User.githubUsername where they differ.
 *
 * Replaces the old syncGitHubUsernames(), which ran on EVERY listUsers() call and did
 * one findUnique (plus maybe one update) per connection. This version reads once,
 * updates only the rows that differ, and is throttled per server instance.
 *
 * Best: also call it (with { force: true }) from the GitHub OAuth callback, so the
 * value is correct the moment a user connects.
 */
export async function reconcileGitHubUsernames(opts: { force?: boolean; minIntervalMs?: number } = {}) {
  const now = Date.now();
  if (!opts.force && now - lastReconcileAt < (opts.minIntervalMs ?? 5 * 60_000)) {
    return { checked: 0, updated: 0, skipped: true as const };
  }
  lastReconcileAt = now;

  const rows = await prisma.user.findMany({
    where: { githubConnection: { isNot: null } },
    select: { id: true, githubUsername: true, githubConnection: { select: { username: true } } },
  });

  const stale = rows.filter((row) => {
    const next = row.githubConnection?.username;
    return Boolean(next) && next !== row.githubUsername;
  });

  let updated = 0;
  for (let i = 0; i < stale.length; i += 20) {
    const results = await Promise.allSettled(
      stale.slice(i, i + 20).map((row) =>
        prisma.user.update({
          where: { id: row.id },
          data: { githubUsername: row.githubConnection?.username ?? null },
          select: { id: true },
        }),
      ),
    );
    updated += results.filter((r) => r.status === "fulfilled").length;
  }

  return { checked: rows.length, updated, skipped: false as const };
}
