/**
 * Bookmark types shared by the browser code and the API routes.
 *
 * A bookmark is a *snapshot*: the exact repo / issue object the card was showing
 * when the user clicked save. The Bookmarks page re-renders that snapshot with the
 * same card components, so it shows the same info, buttons and features.
 */

export const BOOKMARK_KINDS = ["repo", "issue"] as const;
export type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

/** Plain JSON object: whatever the card rendered (a `Repo`, an issue, ...). */
export type BookmarkSnapshot = Record<string, unknown>;

export interface BookmarkRecord {
  /** `${kind}:${key}`, unique per user. */
  id: string;
  kind: BookmarkKind;
  /** Derived from the item's canonical URL (see `makeBookmarkKey`). Same item => same key, on any page. */
  key: string;
  title: string;
  /** Absolute http(s) URL of the repo / issue, as shown on the card. */
  url: string;
  snapshot: BookmarkSnapshot;
  /** ISO-8601 timestamp. */
  savedAt: string;
}

/** What the browser sends to save something. */
export interface BookmarkInput {
  kind: BookmarkKind;
  key: string;
  title: string;
  url: string;
  snapshot: BookmarkSnapshot;
  /** Optional: only used to restore an item in its old position (Undo / import). */
  savedAt?: string;
}

export interface BookmarkListData {
  items: BookmarkRecord[];
  /** Short hash of the signed-in user id. Lets the browser cache notice an account switch. */
  ownerKey: string;
  limit: number;
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ApiSuccess<T> | ApiFailure;
