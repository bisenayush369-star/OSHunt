import { BLOCK_REASON_MAX, type AdminActivity, type AdminUser } from "./contract";
import { isUserPaid, loadPaidUserIds } from "./billing";
import { exec, n, newId, q } from "./db";

/**
 * Data layer for accounts and activity. With analytics.ts it is the ONLY place the admin talks to the
 * database for users. Routes call these functions; the UI never does. Server only.
 *
 * Error policy
 *  - Reads and writes accept `{ strict: true }`. Admin routes always pass it so a database failure becomes
 *    an honest 500 instead of an empty table.
 *  - Without `strict` the legacy behaviour is kept: log and return a fallback value. isBlocked keeps this
 *    default so a schema hiccup cannot lock everyone out (see its `failClosed` option).
 *  - Soft-deleted accounts (User.deletedAt set) are not listed or counted.
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
  createdAt: Date | string;
  lastSeen: Date | string | null;
  actions: number | bigint | null;
};

export function displayName(user: { name?: string | null; githubUsername?: string | null; email?: string | null; id?: string }): string {
  for (const candidate of [user.name, user.githubUsername, user.email?.split("@")[0]]) {
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

function isDatabaseUnavailableError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error ?? "");
  const code = typeof (error as { code?: string } | null)?.code === "string" ? (error as { code?: string }).code : "";
  return /can't reach database server|database server.*running|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|P1001|P1002|P1017|connection.*timeout|timeout.*database/i.test(`${text} ${code}`);
}

async function safe<T>(label: string, fallback: T, run: () => Promise<T>, strict?: boolean): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn(`[admin-store] ${label} skipped because the database is unavailable.`);
      return fallback;
    }

    console.error(`[admin-store] ${label} failed`, error);
    if (strict) throw error;
    return fallback;
  }
}

const toUser = (row: UserRow, paid: boolean): AdminUser => ({
  id: row.id,
  name: displayName(row),
  email: row.email || "No email",
  githubUsername: row.githubUsername,
  joinedAt: toIso(row.createdAt),
  lastSeen: toIso(row.lastSeen ?? row.createdAt),
  onboarded: Boolean(row.onboarded),
  blocked: Boolean(row.blocked),
  blockReason: row.blockReason || undefined,
  paid,
  actions: n(row.actions),
});

/** One account per row: the GitHub name falls back to the connected GitHub account, actions = Activity rows. */
const USER_SELECT = `
  SELECT u.id, u.name, u.email, u.onboarded, u.blocked, u."blockReason", u."createdAt", u."lastSeen",
         COALESCE(NULLIF(btrim(u."githubUsername"), ''), gc.username) AS "githubUsername",
         COALESCE(a.n, 0)::int AS actions
    FROM "User" u
    LEFT JOIN "GitHubConnection" gc ON gc."userId" = u.id
    LEFT JOIN (SELECT "userId", count(*)::int AS n FROM "Activity" GROUP BY "userId") a ON a."userId" = u.id`;

/* ── Users ──────────────────────────────────────────────────────────────── */

export async function listUsers(opts: Strict & { limit?: number } = {}): Promise<AdminUser[]> {
  return safe(
    "listUsers",
    [] as AdminUser[],
    async () => {
      const limit = Math.max(1, Math.min(opts.limit ?? 1500, 5000));
      const [rows, paidIds] = await Promise.all([
        q<UserRow>(`${USER_SELECT} WHERE u."deletedAt" IS NULL ORDER BY u."createdAt" DESC, u.id LIMIT $1`, limit),
        loadPaidUserIds(),
      ]);
      return rows.map((row) => toUser(row, paidIds?.has(row.id) ?? false));
    },
    opts.strict,
  );
}

export async function countUsers(opts: Strict = {}): Promise<number> {
  return safe("countUsers", 0, async () => n((await q<{ n: number }>(`SELECT count(*)::int AS n FROM "User" WHERE "deletedAt" IS NULL`))[0]?.n), opts.strict);
}

export async function getUser(id: string, opts: Strict = {}): Promise<AdminUser | null> {
  return safe<AdminUser | null>(
    "getUser",
    null,
    async () => {
      const [rows, paid] = await Promise.all([q<UserRow>(`${USER_SELECT} WHERE u.id = $1 AND u."deletedAt" IS NULL`, id), isUserPaid(id)]);
      return rows[0] ? toUser(rows[0], paid) : null;
    },
    opts.strict,
  );
}

/** Returns the updated account, or null when the id does not exist. Does not write an audit row (the route does). */
export async function setBlocked(userId: string, blocked: boolean, reason?: string, opts: Strict = {}): Promise<AdminUser | null> {
  return safe<AdminUser | null>(
    "setBlocked",
    null,
    async () => {
      const blockReason = blocked ? reason?.trim().slice(0, BLOCK_REASON_MAX) || "Blocked by admin" : null;
      const changed = await exec(`UPDATE "User" SET blocked = $2, "blockReason" = $3, "updatedAt" = $4 WHERE id = $1 AND "deletedAt" IS NULL`, userId, blocked, blockReason, new Date());
      if (!changed) return null;
      return getUser(userId, { strict: true });
    },
    opts.strict,
  );
}

/**
 * Policy check for the USER-FACING auth / session path (not the admin console). Default is fail-open to match
 * the old behaviour. Pass `failClosed: true` in sensitive paths so a database error blocks instead of allows.
 */
export async function isBlocked(userId: string, opts: { failClosed?: boolean } = {}): Promise<boolean> {
  return safe("isBlocked", Boolean(opts.failClosed), async () => {
    const rows = await q<{ blocked: boolean | null }>(`SELECT blocked FROM "User" WHERE id = $1`, userId);
    return Boolean(rows[0]?.blocked);
  });
}

/* ── Activity ───────────────────────────────────────────────────────────── */

export async function listActivity(userId: string, opts: Strict & { limit?: number } = {}): Promise<AdminActivity[]> {
  return safe(
    "listActivity",
    [] as AdminActivity[],
    async () => {
      const limit = Math.max(1, Math.min(opts.limit ?? 100, 500));
      const rows = await q<{ id: string; userId: string; action: string; detail: string | null; at: Date | string }>(
        `SELECT id, "userId", action, detail, "at" FROM "Activity" WHERE "userId" = $1 ORDER BY "at" DESC, id LIMIT $2`,
        userId,
        limit,
      );
      return rows.map((row) => ({ id: row.id, userId: row.userId, action: row.action, detail: row.detail || undefined, at: toIso(row.at) }));
    },
    opts.strict,
  );
}

/** The only writer of Activity rows. Never throws; returns whether the row was saved. */
export async function logActivity(userId: string, action: string, detail?: string): Promise<boolean> {
  try {
    await exec(`INSERT INTO "Activity" (id, "userId", action, detail, "at") VALUES ($1, $2, $3, $4, $5)`, newId(), userId, action, detail?.trim().slice(0, 500) || null, new Date());
    return true;
  } catch (error) {
    console.error("[admin-store] logActivity failed", error);
    return false;
  }
}

/* ── GitHub username sync ───────────────────────────────────────────────── */

let lastReconcileAt = 0;

/**
 * Copies GitHubConnection.username onto User.githubUsername where they differ, in ONE statement (the old
 * version did one query per account on every list call). Throttled per server instance. Best also called
 * with { force: true } from the GitHub OAuth callback so the value is right the moment someone connects.
 */
export async function reconcileGitHubUsernames(opts: { force?: boolean; minIntervalMs?: number } = {}) {
  const now = Date.now();
  if (!opts.force && now - lastReconcileAt < (opts.minIntervalMs ?? 5 * 60_000)) return { checked: 0, updated: 0, skipped: true as const };
  lastReconcileAt = now;

  const [updated, checked] = await Promise.all([
    exec(
      `UPDATE "User" u SET "githubUsername" = gc.username, "updatedAt" = $1
         FROM "GitHubConnection" gc
        WHERE gc."userId" = u.id AND gc.username <> '' AND u."githubUsername" IS DISTINCT FROM gc.username`,
      new Date(),
    ),
    q<{ n: number }>(`SELECT count(*)::int AS n FROM "GitHubConnection"`),
  ]);
  return { checked: n(checked[0]?.n), updated, skipped: false as const };
}
