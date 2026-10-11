import type { NextRequest } from "next/server";
import type { BookmarkInput, BookmarkListData } from "@/components/types/bookmarks";
import { BOOKMARK_LIMITS } from "@/components/lib/bookmarks/config";
import { isBookmarkKind, parseBookmark } from "@/components/lib/bookmarks/validate";
import { ApiError, readJsonBody } from "@/components/lib/bookmarks/server/http";
import { serve } from "@/components/lib/bookmarks/server/serve";
import { clearBookmarks, importBookmarks, listBookmarks } from "@/components/lib/bookmarks/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/bookmarks[?kind=repo|issue]  ->  { items, ownerKey, limit } */
export function GET(req: NextRequest) {
  return serve<BookmarkListData>(req, {}, async (caller) => {
    const kind = req.nextUrl.searchParams.get("kind");
    if (kind !== null && !isBookmarkKind(kind)) throw new ApiError(400, "INVALID_KIND", "Unknown bookmark kind.");
    const items = await listBookmarks(caller.userId, kind ?? undefined);
    return { data: { items, ownerKey: caller.ownerKey, limit: BOOKMARK_LIMITS.maxItemsPerUser } };
  });
}

/**
 * POST /api/bookmarks   body: { items: [{ kind, url, title, snapshot, savedAt? }, ...] }
 * Bulk save (Undo "clear all", import). Invalid items are skipped and counted.
 */
export function POST(req: NextRequest) {
  return serve(req, { write: true }, async (caller) => {
    const maxBytes = BOOKMARK_LIMITS.maxImportBatch * (BOOKMARK_LIMITS.maxSnapshotBytes + 2_000);
    const body = (await readJsonBody(req, maxBytes)) as { items?: unknown } | null;
    if (!body || !Array.isArray(body.items)) throw new ApiError(400, "INVALID_BODY", "Body must be { items: [...] }.");
    if (body.items.length > BOOKMARK_LIMITS.maxImportBatch) {
      throw new ApiError(413, "BATCH_TOO_LARGE", `Send at most ${BOOKMARK_LIMITS.maxImportBatch} items at a time.`);
    }

    const valid: BookmarkInput[] = [];
    let invalid = 0;
    for (const item of body.items) {
      const kind = typeof item === "object" && item !== null ? (item as { kind?: unknown }).kind : undefined;
      const parsed = parseBookmark(kind, null, item);
      if (parsed.ok) valid.push(parsed.value);
      else invalid++;
    }

    const result = await importBookmarks(caller.userId, valid);
    return { data: { imported: result.imported, skipped: result.skipped + invalid } };
  });
}

/** DELETE /api/bookmarks?confirm=true[&kind=repo|issue]  ->  { removed: number } */
export function DELETE(req: NextRequest) {
  return serve(req, { write: true }, async (caller) => {
    const params = req.nextUrl.searchParams;
    if (params.get("confirm") !== "true") {
      throw new ApiError(400, "CONFIRM_REQUIRED", "Add ?confirm=true to delete bookmarks in bulk.");
    }
    const kind = params.get("kind");
    if (kind !== null && !isBookmarkKind(kind)) throw new ApiError(400, "INVALID_KIND", "Unknown bookmark kind.");
    const removed = await clearBookmarks(caller.userId, kind ?? undefined);
    return { data: { removed } };
  });
}
