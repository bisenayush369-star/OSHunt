import type { BookmarkKind, BookmarkRecord } from "@/components/types/bookmarks";

/**
 * The whole storage contract. Seven small methods, no business rules (limits, validation and
 * "keep the original savedAt" live in `service.ts`), so a new database is ~50 lines.
 * Every method is scoped to one user: a user can never see or touch another user's rows.
 */
export interface BookmarkStorage {
  /** All of the user's bookmarks, newest first. */
  list(userId: string): Promise<BookmarkRecord[]>;
  count(userId: string): Promise<number>;
  get(userId: string, id: string): Promise<BookmarkRecord | null>;
  /** Insert or fully replace one record. */
  put(userId: string, record: BookmarkRecord): Promise<void>;
  /** Insert or fully replace many records. */
  putMany(userId: string, records: BookmarkRecord[]): Promise<void>;
  /** Resolves true when something was deleted. */
  delete(userId: string, id: string): Promise<boolean>;
  /** Delete all of the user's bookmarks (optionally one kind). Resolves with how many were deleted. */
  deleteAll(userId: string, kind?: BookmarkKind): Promise<number>;
}
