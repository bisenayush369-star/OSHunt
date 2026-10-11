import type { NextRequest } from "next/server";
import { BOOKMARK_LIMITS } from "@/components/lib/bookmarks/config";
import { isBookmarkKey, isBookmarkKind, parseBookmark } from "@/components/lib/bookmarks/validate";
import { ApiError, readJsonBody } from "@/components/lib/bookmarks/server/http";
import { serve } from "@/components/lib/bookmarks/server/serve";
import { removeBookmark, saveBookmark } from "@/components/lib/bookmarks/server/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ kind: string; key: string }> }) {
  const { kind, key } = await context.params;
  return serve(req, {}, async (caller) => {
    if (!isBookmarkKind(kind)) throw new ApiError(400, "INVALID_KIND", "Unknown bookmark kind.");
    if (!isBookmarkKey(key)) throw new ApiError(400, "INVALID_KEY", "Unknown bookmark key.");

    const { getStorage } = await import("@/components/lib/bookmarks/server/storage");
    const item = await getStorage().get(caller.userId, `${kind}:${key}`);
    return { data: { item: item ?? null } };
  });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ kind: string; key: string }> }) {
  const { kind, key } = await context.params;
  return serve(req, { write: true }, async (caller) => {
    if (!isBookmarkKind(kind)) throw new ApiError(400, "INVALID_KIND", "Unknown bookmark kind.");
    if (!isBookmarkKey(key)) throw new ApiError(400, "INVALID_KEY", "Unknown bookmark key.");

    const maxBytes = BOOKMARK_LIMITS.maxSnapshotBytes + 2_000;
    const body = await readJsonBody(req, maxBytes);
    const parsed = parseBookmark(kind, key, body);
    if (!parsed.ok) {
      throw new ApiError(400, parsed.code, parsed.message);
    }

    const result = await saveBookmark(caller.userId, parsed.value);
    return { data: { item: result.record, created: result.created } };
  });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ kind: string; key: string }> }) {
  const { kind, key } = await context.params;
  return serve(req, { write: true }, async (caller) => {
    if (!isBookmarkKind(kind)) throw new ApiError(400, "INVALID_KIND", "Unknown bookmark kind.");
    if (!isBookmarkKey(key)) throw new ApiError(400, "INVALID_KEY", "Unknown bookmark key.");

    const removed = await removeBookmark(caller.userId, kind, key);
    return { data: { removed } };
  });
}
