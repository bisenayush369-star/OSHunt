import type {
  ApiResult,
  BookmarkInput,
  BookmarkKind,
  BookmarkListData,
  BookmarkRecord,
} from "@/components/types/bookmarks";
import { BOOKMARK_API_BASE, BOOKMARK_LIMITS } from "./config";

/**
 * Typed wrapper around `fetch` for the bookmark API. It never throws: every call resolves with
 * `{ ok: true, data }` or `{ ok: false, status, code, message }` (status 0 = network problem),
 * so the store can decide what to do without try/catch everywhere.
 */

export interface ClientFailure {
  ok: false;
  /** HTTP status, or 0 when the request never got an answer (offline, timeout). */
  status: number;
  code: string;
  message: string;
}
export type ClientResult<T> = { ok: true; data: T } | ClientFailure;

const REQUEST_TIMEOUT_MS = 15_000;

function failure(status: number, code: string, message: string): ClientFailure {
  return { ok: false, status, code, message };
}

function isEnvelope(value: unknown): value is ApiResult<unknown> {
  return typeof value === "object" && value !== null && typeof (value as { ok?: unknown }).ok === "boolean";
}

async function request<T>(suffix: string, init: RequestInit = {}): Promise<ClientResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const hasBody = typeof init.body === "string";
    const res = await fetch(`${BOOKMARK_API_BASE}${suffix}`, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json", ...(hasBody ? { "Content-Type": "application/json" } : {}) },
    });

    // A login middleware that redirects API calls to the sign-in page ends up here.
    if (res.redirected) return failure(401, "UNAUTHENTICATED", "Sign in to use bookmarks.");

    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      /* not JSON: a proxy or framework error page */
    }

    if (isEnvelope(payload)) {
      if (payload.ok) return { ok: true, data: payload.data as T };
      return failure(res.status, payload.error?.code ?? "ERROR", payload.error?.message ?? "The request failed.");
    }
    if (res.status === 401) return failure(401, "UNAUTHENTICATED", "Sign in to use bookmarks.");
    return failure(res.status, res.ok ? "BAD_RESPONSE" : "HTTP_ERROR", "The server sent an unexpected response.");
  } catch (error) {
    const aborted = (error as { name?: string } | null)?.name === "AbortError";
    return failure(
      0,
      aborted ? "TIMEOUT" : "NETWORK",
      aborted ? "The request took too long." : "You appear to be offline.",
    );
  } finally {
    clearTimeout(timer);
  }
}

export const bookmarksApi = {
  list: () => request<BookmarkListData>("", { method: "GET" }),

  save: (input: BookmarkInput) =>
    request<{ item: BookmarkRecord; created: boolean }>(`/${input.kind}/${input.key}`, {
      method: "PUT",
      body: JSON.stringify({ url: input.url, title: input.title, snapshot: input.snapshot, savedAt: input.savedAt }),
    }),

  remove: (kind: BookmarkKind, key: string) =>
    request<{ removed: boolean }>(`/${kind}/${key}`, { method: "DELETE" }),

  /** Remove every bookmark (optionally only one kind). */
  clear: (kind?: BookmarkKind) =>
    request<{ removed: number }>(`?confirm=true${kind ? `&kind=${kind}` : ""}`, { method: "DELETE" }),

  importBatch: (items: BookmarkInput[]) =>
    request<{ imported: number; skipped: number }>("", { method: "POST", body: JSON.stringify({ items }) }),
};

/** Import any number of items, in server-sized batches. Stops at the first failed batch. */
export async function importAll(items: BookmarkInput[]): Promise<ClientResult<{ imported: number; skipped: number }>> {
  let imported = 0;
  let skipped = 0;
  for (let i = 0; i < items.length; i += BOOKMARK_LIMITS.maxImportBatch) {
    const res = await bookmarksApi.importBatch(items.slice(i, i + BOOKMARK_LIMITS.maxImportBatch));
    if (!res.ok) return res;
    imported += res.data.imported;
    skipped += res.data.skipped;
  }
  return { ok: true, data: { imported, skipped } };
}
