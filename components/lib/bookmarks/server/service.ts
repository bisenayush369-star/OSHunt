import type { BookmarkInput, BookmarkKind, BookmarkRecord } from "@/components/types/bookmarks";
import { BOOKMARK_LIMITS } from "../config";
import { makeBookmarkId } from "../key";
import { ApiError } from "./http";
import { getStorage } from "./storage";

/**
 * Business rules. Storage stays dumb; everything about *how bookmarks behave* is here:
 * idempotent save, the per-user limit, keeping the original `savedAt` when re-saving.
 */

export async function listBookmarks(userId: string, kind?: BookmarkKind): Promise<BookmarkRecord[]> {
  const items = await getStorage().list(userId);
  return kind ? items.filter((item) => item.kind === kind) : items;
}

/** Save (or refresh) one bookmark. Saving the same item twice is harmless. */
export async function saveBookmark(
  userId: string,
  input: BookmarkInput,
): Promise<{ record: BookmarkRecord; created: boolean }> {
  const storage = getStorage();
  const id = makeBookmarkId(input.kind, input.key);

  const existing = await storage.get(userId, id);
  if (!existing && (await storage.count(userId)) >= BOOKMARK_LIMITS.maxItemsPerUser) {
    throw new ApiError(
      409,
      "LIMIT_REACHED",
      `You can keep up to ${BOOKMARK_LIMITS.maxItemsPerUser} bookmarks. Remove one to save another.`,
    );
  }

  const record: BookmarkRecord = {
    id,
    kind: input.kind,
    key: input.key,
    title: input.title,
    url: input.url,
    snapshot: input.snapshot,
    savedAt: existing?.savedAt ?? input.savedAt ?? new Date().toISOString(),
  };
  await storage.put(userId, record);
  return { record, created: !existing };
}

/** Idempotent: removing something that is already gone is not an error. */
export async function removeBookmark(userId: string, kind: BookmarkKind, key: string): Promise<boolean> {
  return getStorage().delete(userId, makeBookmarkId(kind, key));
}

export async function clearBookmarks(userId: string, kind?: BookmarkKind): Promise<number> {
  return getStorage().deleteAll(userId, kind);
}

/** Bulk save, used by "Undo clear all" and "Import". Stops at the per-user limit. */
export async function importBookmarks(
  userId: string,
  inputs: BookmarkInput[],
): Promise<{ imported: number; skipped: number }> {
  const storage = getStorage();

  const unique = new Map<string, BookmarkInput>();
  for (const input of inputs) unique.set(makeBookmarkId(input.kind, input.key), input);

  const existing = new Map((await storage.list(userId)).map((r) => [r.id, r]));
  let room = BOOKMARK_LIMITS.maxItemsPerUser - existing.size;

  const now = Date.now();
  const records: BookmarkRecord[] = [];
  let skipped = 0;
  let index = 0;
  for (const [id, input] of unique) {
    const prior = existing.get(id);
    if (!prior) {
      if (room <= 0) {
        skipped++;
        continue;
      }
      room--;
    }
    records.push({
      id,
      kind: input.kind,
      key: input.key,
      title: input.title,
      url: input.url,
      snapshot: input.snapshot,
      // Without a date, keep the order of the file: first item = newest.
      savedAt: prior?.savedAt ?? input.savedAt ?? new Date(now - index).toISOString(),
    });
    index++;
  }
  await storage.putMany(userId, records);
  return { imported: records.length, skipped };
}
