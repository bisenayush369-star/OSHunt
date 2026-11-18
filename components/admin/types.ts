import type { AdminUser, LlmSection, RangeKey, StatsResponse } from "@/components/lib/admin/contract";

/**
 * Interfaces between the console shell and the screens. A screen never fetches and never navigates by
 * itself: it receives data and callbacks through these props. Change a prop here and TypeScript tells
 * you every screen that has to follow.
 */

export type AdminView = "overview" | "accounts" | "llm";
export type AccountFilter = "all" | "active" | "blocked" | "paid";

/** Ask the console to switch screen. `filter` pre-selects the Accounts filter, `provider` highlights an LLM card. */
export type Navigate = (view: AdminView, opts?: { filter?: AccountFilter; provider?: string }) => void;

export type AdminSync = {
  stats: StatsResponse | null;
  users: AdminUser[] | null;
  /** Total accounts in the table (users.length can be capped). */
  total: number;
  llm: LlmSection | null;
  /** A hard error for the FIRST load of each part. Null once that part has data on screen. */
  errors: { stats: string | null; users: string | null; llm: string | null };
  lastSyncAt: number | null;
  syncing: boolean;
  online: boolean;
  /** The session expired or was revoked (a 401 came back). The shell shows a "session ended" screen. */
  sessionEnded: boolean;
  /** True while stats for a new range are loading and the previous range is still on screen. */
  stale: boolean;
  syncNow: () => Promise<void>;
  /** Optimistic: the list updates first and rolls back when the server refuses. Resolves to the server's copy. */
  setBlocked: (id: string, blocked: boolean, reason?: string) => Promise<AdminUser>;
};

export type OverviewProps = {
  range: RangeKey;
  onRange: (range: RangeKey) => void;
  sync: AdminSync;
  now: number;
  onNavigate: Navigate;
};

export type UsersPanelProps = {
  users: AdminUser[] | null;
  total: number;
  error: string | null;
  now: number;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onRetry: () => void;
  /** False until the Subscription table can be read. Hides the Paid filter, which could only be empty. */
  billingConnected: boolean;
  /** Filter to start with (the Overview "blocked" tile sends "blocked"). */
  initialFilter?: AccountFilter;
};

export type LlmPanelProps = {
  llm: LlmSection | null;
  error: string | null;
  now: number;
  /** Provider name to scroll to and highlight (from the command menu or the overview banner). */
  focus: string | null;
  onFocusDone: () => void;
  onRetry: () => void;
};

export type UserSheetProps = {
  userId: string | null;
  /** The row from the synced list. It carries optimistic block state, so it wins over the fetched copy. */
  listUser: AdminUser | null;
  side: "right" | "bottom";
  now: number;
  onClose: () => void;
  onBlock: AdminSync["setBlocked"];
};

export type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminUser[] | null;
  llm: LlmSection | null;
  onNavigate: Navigate;
  onRange: (range: RangeKey) => void;
  onOpenUser: (id: string) => void;
  onSync: () => void;
  onSignOut: () => void;
};
