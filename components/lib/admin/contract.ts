/**
 * ADMIN CONTRACT: the single source of truth for every shape that crosses the network between
 * the admin UI (client) and the admin API (server).
 *
 * Rules
 *  1. Import this file from BOTH sides. It must stay free of server-only imports (prisma, jose,
 *     next/headers, node:crypto) because client bundles import it.
 *  2. Changing a type here means updating, in the same change:
 *       producers  -> components/lib/admin/{store,analytics,usage,billing,github,llm}.ts
 *       transport  -> app/api/admin/**
 *       consumers  -> components/admin/**
 *  3. Timestamps: entity fields (joinedAt, lastSeen, at, createdAt) are ISO-8601 strings. Chart and
 *     sync fields (bucket.t, updatedAt, LLM `at`/`until`) are epoch milliseconds.
 *  4. Naming: our entities say `githubUsername` (it matches Prisma). `login` only appears inside
 *     GitHubProfile because that is GitHub's own field name.
 *  5. There is NO global "recent activity" list on purpose. Activity is only ever shown for one
 *     account, inside that account's detail view (UserDetailResponse.activity).
 */

/* ── Paths ──────────────────────────────────────────────────────────────── */

export const ADMIN_PATHS = {
  home: "/admin",
  login: "/admin/login",
  api: {
    /** POST { step: "knock" } (heart click), POST { step: "login", id, password }, DELETE (sign out). */
    gate: "/api/admin/gate",
    stats: "/api/admin/stats",
    users: "/api/admin/users",
    llm: "/api/admin/llm",
  },
} as const;

/* ── Sign-in (the only way in: heart click, then ID + password) ─────────── */

export type GateRequest = { step: "knock" } | { step: "login"; id: string; password: string };
export type GateResponse = { ok: true; next: "login" | "admin" };

/** Error codes the login form reacts to. Every other code is shown as its `message`. */
export const GATE_ERRORS = {
  badOrigin: "bad_origin",
  notConfigured: "not_configured",
  rateLimited: "rate_limited",
  noKnock: "knock_expired",
  invalid: "invalid_credentials",
  badRequest: "bad_request",
} as const;

export function parseGateRequest(body: unknown): GateRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { step, id, password } = body as Record<string, unknown>;
  if (step === "knock") return { step };
  if (step === "login" && typeof id === "string" && typeof password === "string") {
    // Bounded so a huge body cannot be used to burn CPU in the constant-time compare.
    if (id.length > 256 || password.length > 1024) return null;
    return { step, id, password };
  }
  return null;
}

/* ── Ranges ─────────────────────────────────────────────────────────────── */

export const RANGES = ["24h", "7d", "30d", "6m"] as const;
export type RangeKey = (typeof RANGES)[number];
export const DEFAULT_RANGE: RangeKey = "7d";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Rolling window = bucketMs x bucketCount, ending "now".
 * `label` is what the switch shows (1D / 1W / 1M / 6M), `long` is for sentences, `unit` names one bucket.
 */
export const RANGE_META: Record<
  RangeKey,
  { label: string; long: string; unit: "hour" | "day" | "week"; bucketMs: number; bucketCount: number }
> = {
  "24h": { label: "1D", long: "24 hours", unit: "hour", bucketMs: HOUR, bucketCount: 24 },
  "7d": { label: "1W", long: "7 days", unit: "day", bucketMs: DAY, bucketCount: 7 },
  "30d": { label: "1M", long: "30 days", unit: "day", bucketMs: DAY, bucketCount: 30 },
  "6m": { label: "6M", long: "6 months", unit: "week", bucketMs: 7 * DAY, bucketCount: 26 },
};

const RANGE_ALIASES: Record<string, RangeKey> = { "1d": "24h", "1w": "7d", "1m": "30d" };

/** Accepts the canonical keys plus 1d / 1w / 1m. Returns null for anything else. */
export function parseRange(value: string | null | undefined): RangeKey | null {
  if (!value) return null;
  const key = value.trim().toLowerCase();
  const canonical = RANGE_ALIASES[key] ?? key;
  return (RANGES as readonly string[]).includes(canonical) ? (canonical as RangeKey) : null;
}

/**
 * The viewer's UTC offset in minutes EAST of UTC (India: 330), sent as `?tz=330`. The server aligns
 * buckets to the viewer's local hours, midnights and Mondays, so a bar for "Tue" really is Tuesday
 * for them. Missing or bad values fall back to 0 (UTC).
 */
export function parseTzMinutes(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= 14 * 60 ? Math.round(n) : 0;
}

export type BucketWindow = {
  /** Start of the first bucket of the CURRENT window, epoch ms. */
  start: number;
  /** End of the last bucket (the next boundary after `now`), epoch ms. The last bucket is still filling. */
  end: number;
  bucketMs: number;
  bucketCount: number;
  /** Start of the same-length window just before this one. */
  prevStart: number;
};

/** 1970-01-01 was a Thursday; weekly buckets start on Monday, which is 4 days later. */
const MONDAY_PHASE = 4 * DAY;

/** Pure: where the buckets of a range sit for a given moment and viewer offset. */
export function bucketWindow(range: RangeKey, now: number, tzMinutes = 0): BucketWindow {
  const { bucketMs, bucketCount, unit } = RANGE_META[range];
  const offset = tzMinutes * 60_000;
  const phase = unit === "week" ? MONDAY_PHASE : 0;
  const end = Math.floor((now + offset - phase) / bucketMs) * bucketMs + bucketMs + phase - offset;
  const start = end - bucketMs * bucketCount;
  return { start, end, bucketMs, bucketCount, prevStart: start - bucketMs * bucketCount };
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
  /** Has an active paid subscription right now. Always false while billing is not connected. */
  paid: boolean;
  /** Number of Activity rows for this account. */
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
  /** Total accounts at the END of this bucket (a running total, for the growth chart). */
  users: number;
  /** Accounts created inside this bucket. */
  signups: number;
  /** Activity rows created inside this bucket. */
  activity: number;
};

export type StatsTotals = {
  users: number;
  blocked: number;
  onboarded: number;
  /** Distinct accounts with at least one action inside the range. */
  active: number;
  /** Accounts created inside the range. */
  signups: number;
  /** Activity rows inside the range. */
  activity: number;
};

/* ── API usage (GitHub + LLM calls) ─────────────────────────────────────── */

export const USAGE_SERVICES = ["github", "llm"] as const;
export type UsageService = (typeof USAGE_SERVICES)[number];

export type UsageBucket = {
  /** Bucket start, epoch ms. Same grid as StatsResponse.buckets. */
  t: number;
  github: number;
  llm: number;
  /** Calls with ok = false, both services. */
  errors: number;
  /** tokensIn + tokensOut, LLM calls. */
  tokens: number;
};

/**
 * `available: false` means the ApiUsage table cannot be read, so the UI shows a "not connected" state
 * instead of zeros.
 */
export type UsageSection =
  | { available: false; reason: string }
  | {
      available: true;
      buckets: UsageBucket[];
      totals: { github: number; llm: number; errors: number; tokens: number };
      /** Same-length window immediately before this one, for "vs previous" deltas. */
      previous: { github: number; llm: number };
      /** Top providers/models by calls in the window. */
      models: Array<{ service: UsageService; name: string; calls: number }>;
    };

/* ── Billing (paid accounts) ────────────────────────────────────────────── */

export type PlanSlice = { plan: string; users: number };

export type BillingSection =
  | { available: false; reason: string }
  | {
      available: true;
      /** Paid accounts at the END of each bucket. Same grid as StatsResponse.buckets. */
      series: number[];
      totals: {
        paid: number;
        free: number;
        /** Paid now minus paid at the start of the window. */
        netNew: number;
        /** Paid / total accounts, 0 to 100, one decimal. */
        conversionPct: number;
      };
      plans: PlanSlice[];
    };

export type StatsResponse = {
  range: RangeKey;
  /** Epoch ms when the server computed this payload. */
  updatedAt: number;
  buckets: StatsBucket[];
  totals: StatsTotals;
  /** Same-length window immediately before this one. */
  previous: { signups: number; activity: number; active: number };
  usage: UsageSection;
  billing: BillingSection;
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
  /** This account's own activity, newest first. The only place activity is listed. */
  activity: AdminActivity[];
  /** null when the account has no GitHub username. */
  github: GitHubSnapshot | null;
  updatedAt: number;
};

export type BlockRequest = { id: string; blocked: boolean; reason?: string };
export type BlockResponse = { user: AdminUser };

/** Every non-2xx response from /api/admin/** has this shape. */
export type ApiError = { error: string; message?: string };

/* ── LLM APIs: limits, and which one to change ──────────────────────────── */

/**
 * A provider counts as "near its limit" from this share of its limit on. The router e-mails the owner
 * from the same point (sendApiLimitAlert in llmRouter.ts).
 */
export const LLM_NEAR_LIMIT_PCT = 80;

/**
 * One word per provider, worst first. A provider has ONE name everywhere (the router, the ApiProvider
 * table, the ApiUsage rows and this page): the names in KNOWN_LLM_PROVIDERS (GEMINI, ANTHROPIC, ...),
 * matched ignoring case and spaces. After you swap Gemini for Anthropic, the page shows Anthropic's
 * limit and problems without a code change.
 *
 *  change    a human must change something now: the key, the credit, a permission or the model name
 *  limit     the limit kept in the ApiProvider table is used up, so the router skips this provider
 *  unlinked  an ApiProvider row that no provider in llmRouter.ts is called (a typo, or a new provider)
 *  paused    the router skips it for a few minutes (rate limit, or the server cannot be reached)
 *  failing   its last call failed for a reason you cannot fix here, for example HTTP 503
 *  near      LLM_NEAR_LIMIT_PCT percent or more of the limit is used
 *  ok        its last call worked
 *  ready     a key is set, but there was no call in the last 24 hours
 *  off       switched off in the ApiProvider table (isActive is false)
 *  nokey     no key in .env
 */
export const LLM_STATES = ["change", "limit", "unlinked", "paused", "failing", "near", "ok", "ready", "off", "nokey"] as const;
export type LlmState = (typeof LLM_STATES)[number];

/** Words for the status chip. */
export const LLM_STATE_LABEL: Record<LlmState, string> = {
  change: "Change now",
  limit: "Limit reached",
  unlinked: "Check table name",
  paused: "Paused",
  failing: "Failing",
  near: "Near limit",
  ok: "Working",
  ready: "Ready",
  off: "Off",
  nokey: "No key",
};

/** States where the owner has to do something (red badge on the menu, banner on the overview). */
export const LLM_ACTION_STATES: readonly LlmState[] = ["change", "limit"];
/** States worth a look where nothing is broken yet (amber). */
export const LLM_WATCH_STATES: readonly LlmState[] = ["unlinked", "paused", "failing", "near"];

export type LlmIssueKind = Extract<LlmState, "change" | "limit" | "unlinked" | "paused" | "failing" | "near">;

export type LlmIssue = {
  kind: LlmIssueKind;
  /** A short headline in plain words ("Invalid or deleted API key"), taken from the router's own wording. Never text written by a provider. */
  title: string;
  /** What to do about it. */
  fix: string;
  /** Epoch ms when it was seen: the first time the router saw it, or the time of the failing call. null when unknown. */
  at: number | null;
  /** Epoch ms when the router tries a "paused" provider again. null for everything else. */
  until: number | null;
};

/** The limit kept for a provider in the ApiProvider table (counted in requests, not tokens). */
export type LlmLimit = {
  /** The row's name exactly as written in the table (it can differ from the provider name in case or spaces). */
  rowName: string;
  used: number;
  max: number;
  /** used / max in percent, rounded. Can be above 100. */
  pct: number;
  active: boolean;
};

/** What the ApiUsage rows say about the last 24 hours. */
export type LlmUsage = {
  calls: number;
  failed: number;
  tokensIn: number;
  tokensOut: number;
  /** Average time of the calls that worked, in ms. null when none worked. */
  avgMs: number | null;
  /** Epoch ms of the latest call, the latest good call and the latest failed call. */
  lastCallAt: number | null;
  lastOkAt: number | null;
  lastFailAt: number | null;
  /** HTTP status of the latest failed call. null when there was none, or when no answer came at all. */
  lastFailStatus: number | null;
};

export type LlmProvider = {
  /** The one name, in capitals (GEMINI, ANTHROPIC, ...). For an unlinked row: the row's name, normalised. */
  name: string;
  /** For people: "Anthropic", "Hugging Face". For an unlinked row: the row's own name. */
  label: string;
  state: LlmState;
  /** One line about the state, without times (the screen adds those). */
  summary: string;
  /** Everything wrong or worth a look, worst first. Empty for ok, ready, off and nokey. */
  issues: LlmIssue[];
  /** false for a table row that no provider in llmRouter.ts is called. */
  known: boolean;
  /** The model from .env (or the router's default). null when the router has no such provider. */
  model: string | null;
  /** Is there a key in .env? Yes or no. The key itself never leaves the router. */
  keySet: boolean;
  /** Names of the .env variables to change. Names only, never values. */
  envVar: string | null;
  modelEnvVar: string | null;
  limit: LlmLimit | null;
  /** null when the ApiUsage table is not set up. */
  last24h: LlmUsage | null;
};

/**
 * `available: false` only happens when the router status itself cannot be read. A missing ApiProvider or
 * ApiUsage table does not make the section unavailable: that part is switched off and says why
 * (`limits`, `usage`).
 */
export type LlmSection =
  | { available: false; reason: string }
  | {
      available: true;
      /** Epoch ms when the server worked this out. */
      at: number;
      /** Worst first. */
      providers: LlmProvider[];
      counts: Record<LlmState, number>;
      /** Could the ApiProvider table be read? When not, limits are not shown. */
      limits: { connected: boolean; note: string | null };
      /** Could the ApiUsage table be read? When not, the 24-hour numbers are not shown. */
      usage: { connected: boolean; note: string | null };
      /** fixed = LLM_PROVIDER_ORDER is set, auto = fastest first (learned), random = LLM_AUTO_ORDER=off. */
      routing: { mode: "fixed" | "auto" | "random"; order: string[] };
      /** Requests the router did not have to send (same prompt shared, or answered from the cache) since this server started. */
      savings: { since: number; shared: number; cacheHits: number; tokens: number };
      /** The 24-hour numbers of the providers above, added up. */
      totals: { calls: number; failed: number; tokensIn: number; tokensOut: number };
    };

export type LlmResponse = { llm: LlmSection; updatedAt: number };

/** The providers that need the owner, and the ones worth a look. One answer for the menu badge, the banner and the page. */
export function llmAttention(llm: LlmSection | null | undefined): { act: LlmProvider[]; watch: LlmProvider[] } {
  if (!llm || !llm.available) return { act: [], watch: [] };
  return {
    act: llm.providers.filter((p) => LLM_ACTION_STATES.includes(p.state)),
    watch: llm.providers.filter((p) => LLM_WATCH_STATES.includes(p.state)),
  };
}

/* ── Limits, names and sync cadence ─────────────────────────────────────── */

export const USERS_LIMIT = 1500;
export const ACTIVITY_LIMIT = 100;
export const BLOCK_REASON_MAX = 200;
export const BLOCK_REASON_PRESETS = ["Spam", "Harassment", "Fake account", "Policy violation"] as const;

/** Activity.action values written by the admin console itself. */
export const ADMIN_ACTIONS = { blocked: "admin_blocked", unblocked: "admin_unblocked" } as const;

export const SYNC = {
  /** Stats refresh interval while the tab is visible. */
  statsMs: 20_000,
  /** LLM status refresh interval while the tab is visible. */
  llmMs: 30_000,
  /** Account list refresh interval while the Accounts view is open. */
  usersMs: 60_000,
  /** Open account sheet refresh interval. */
  detailMs: 30_000,
  /** The sync chip turns "out of date" after this long without a good sync. */
  staleAfterMs: 75_000,
  /** Refresh when the tab regains focus if the last sync is older than this. */
  focusMs: 5_000,
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
