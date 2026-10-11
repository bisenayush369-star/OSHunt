/**
 * ADMIN CONTRACT: the single source of truth for every shape that crosses the
 * network between the admin UI (client) and the admin API (server).
 *
 * Rules
 *  1. Import this file from BOTH sides. It must stay free of server-only imports
 *     (prisma, jose, next/headers) because client bundles import it.
 *  2. Changing a type here means updating, in the same commit:
 *       producers  -> lib/admin/store.ts, analytics.ts, github.ts
 *       transport  -> app/api/admin/**
 *       consumers  -> components/admin/**
 *  3. Timestamps: entity fields (joinedAt, lastSeen, at, createdAt) are ISO-8601
 *     strings. Chart and sync fields (bucket.t, updatedAt) are epoch milliseconds.
 *  4. Naming: our entities say `githubUsername` (it matches Prisma). `login` only
 *     appears inside GitHubSnapshot because that is GitHub's own field name.
 */

/* ── Paths ──────────────────────────────────────────────────────────────── */

export const ADMIN_PATHS = {
  home: "/admin",
  login: "/admin/login",
  api: {
    gate: "/api/admin/gate",
    stats: "/api/admin/stats",
    users: "/api/admin/users",
  },
} as const;

/* ── Ranges ─────────────────────────────────────────────────────────────── */

export const RANGES = ["24h", "7d", "30d", "6m"] as const;
export type RangeKey = (typeof RANGES)[number];
export const DEFAULT_RANGE: RangeKey = "7d";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Rolling window = bucketMs x bucketCount, ending "now". */
export const RANGE_META: Record<
  RangeKey,
  { label: string; long: string; bucketMs: number; bucketCount: number }
> = {
  "24h": { label: "24h", long: "24 hours", bucketMs: HOUR, bucketCount: 24 },
  "7d": { label: "7d", long: "7 days", bucketMs: DAY, bucketCount: 7 },
  "30d": { label: "30d", long: "30 days", bucketMs: DAY, bucketCount: 30 },
  "6m": { label: "6m", long: "6 months", bucketMs: 7 * DAY, bucketCount: 26 },
};

/** Accepts the canonical keys plus the legacy "1d" alias the old page used. */
export function parseRange(value: string | null | undefined): RangeKey | null {
  if (!value) return null;
  const key = value === "1d" ? "24h" : value;
  return (RANGES as readonly string[]).includes(key) ? (key as RangeKey) : null;
}

/* ── Entities ───────────────────────────────────────────────────────────── */

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  githubUsername: string | null;
  joinedAt: string;
  lastSeen: string;
  onboarded: boolean;
  blocked: boolean;
  blockReason?: string;
  /** Number of Activity rows for this user. */
  actions: number;
};

export type AdminActivity = {
  id: string;
  userId: string;
  /** snake_case verb, e.g. "opened_issue". Admin actions use ADMIN_ACTIONS. */
  action: string;
  detail?: string;
  at: string;
};

/* ── Stats ──────────────────────────────────────────────────────────────── */

export type StatsBucket = {
  /** Bucket start, epoch ms. */
  t: number;
  /** Users created inside this bucket. */
  signups: number;
  /** Activity rows created inside this bucket. */
  activity: number;
};

export type StatsTotals = {
  users: number;
  blocked: number;
  onboarded: number;
  /** Distinct users with at least one action inside the range. */
  active: number;
  /** Users created inside the range. */
  signups: number;
  /** Activity rows inside the range. */
  activity: number;
};

/** One dot on the radar. Newest first. */
export type RecentEvent = {
  id: string;
  userId: string;
  name: string;
  action: string;
  at: string;
  /** True when the account is blocked right now. */
  blocked: boolean;
};

export type StatsResponse = {
  range: RangeKey;
  /** Epoch ms when the server computed this payload. */
  updatedAt: number;
  buckets: StatsBucket[];
  totals: StatsTotals;
  recent: RecentEvent[];
};

/* ── Users ──────────────────────────────────────────────────────────────── */

export type UsersResponse = {
  users: AdminUser[];
  /** Total rows in the table (users.length can be capped by USERS_LIMIT). */
  total: number;
  updatedAt: number;
};

export type GitHubEvent = { id: string; type: string; repo?: string; at: string };

export type GitHubProfile = {
  login: string;
  avatar: string;
  url: string;
  followers: number;
  repos: number;
  createdAt: string;
  events: GitHubEvent[];
};

export type GitHubSnapshot = GitHubProfile | { error: string };

export const isGitHubError = (g: GitHubSnapshot | null | undefined): g is { error: string } =>
  Boolean(g && "error" in g);

export type UserDetailResponse = {
  user: AdminUser;
  activity: AdminActivity[];
  /** null when the account has no GitHub username. */
  github: GitHubSnapshot | null;
  updatedAt: number;
};

export type BlockRequest = { id: string; blocked: boolean; reason?: string };
export type BlockResponse = { user: AdminUser };

/** Every non-2xx response from /api/admin/** has this shape. */
export type ApiError = { error: string; message?: string };

/* ── Limits, names and sync cadence ─────────────────────────────────────── */

export const USERS_LIMIT = 500;
export const RECENT_LIMIT = 48;
export const ACTIVITY_LIMIT = 100;
export const BLOCK_REASON_MAX = 200;
export const BLOCK_REASON_PRESETS = ["Spam", "Harassment", "Fake account", "Policy violation"] as const;

/** Activity.action values written by the admin console itself. */
export const ADMIN_ACTIONS = { blocked: "admin_blocked", unblocked: "admin_unblocked" } as const;

export const SYNC = {
  /** List + stats refresh interval while the tab is visible. */
  pollMs: 20_000,
  /** The sync chip turns "out of date" after this long without a good sync. */
  staleAfterMs: 50_000,
  /** Refresh when the tab regains focus if the last sync is older than this. */
  focusMs: 5_000,
  /** Open user sheet refresh interval. */
  detailPollMs: 30_000,
  /** Poll interval doubles per consecutive failure, up to 2^maxBackoff. */
  maxBackoff: 2,
} as const;

/* ── Validation (pure, shared) ──────────────────────────────────────────── */

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
export const isValidId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);

export function parseBlockRequest(body: unknown): BlockRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { id, blocked, reason } = body as Record<string, unknown>;
  if (!isValidId(id) || typeof blocked !== "boolean") return null;
  if (reason != null && typeof reason !== "string") return null;
  const clean = typeof reason === "string" ? reason.trim().slice(0, BLOCK_REASON_MAX) : "";
  return { id, blocked, reason: clean || undefined };
}
