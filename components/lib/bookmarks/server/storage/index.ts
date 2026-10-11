import { connect } from "../connect";
import { ApiError } from "../http";
import { createFileStorage } from "./file";
import { createPostgresStorage } from "./postgres";
import type { BookmarkStorage } from "./types";

let cached: BookmarkStorage | null = null;

/** Hosts where the disk is read-only / throw-away, so the JSON-file storage would lose data. */
function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function getStorage(): BookmarkStorage {
  if (cached) return cached;

  if (connect.sql) {
    cached = createPostgresStorage(connect.sql);
  } else if (isServerless() && process.env.BOOKMARKS_ALLOW_FILE_STORAGE !== "true") {
    throw new ApiError(
      503,
      "STORAGE_NOT_CONFIGURED",
      "Bookmark storage is not configured on the server yet.",
    );
  } else {
    cached = createFileStorage();
  }
  return cached;
}

/** For tests: swap the storage. */
export function setStorageForTests(storage: BookmarkStorage | null): void {
  cached = storage;
}
