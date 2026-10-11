/**
 * Everything you might want to tweak lives here.
 * Imported by both the browser code and the API routes, so keep it free of Node/DOM APIs.
 */

export const BOOKMARK_LIMITS = {
  /** Max bookmarks one user can keep. */
  maxItemsPerUser: 300,
  /** Max size of one saved snapshot (JSON bytes, after cleaning). */
  maxSnapshotBytes: 32_000,
  maxTitleLength: 300,
  maxUrlLength: 2_000,
  /** Max items accepted by one bulk import / restore request. */
  maxImportBatch: 100,
} as const;

/** Pages the UI links to. Change these to match your routes. */
export const BOOKMARK_ROUTES = {
  bookmarks: "/bookmark",
  discover: "/discovery",
  hunt: "/hunt",
  signIn: "/login",
} as const;

export const BOOKMARK_API_BASE = "/api/bookmarks";

/** Your previous (single-bookmark) endpoint. Only read, once, to offer a one-click import. */
export const LEGACY_BOOKMARK_API = "/api/bookmark";

/** localStorage key for the "which items are saved" cache (keeps buttons correct on first paint). */
export const BOOKMARK_CACHE_KEY = "oshunt:bookmarks:v1";
export const LEGACY_DISMISSED_KEY = "oshunt:bookmarks:legacy-dismissed";

/** How long toasts stay on screen (ms). They pause while hovered or focused. */
export const TOAST_MS = { info: 3200, error: 5000, undo: 6000 } as const;
