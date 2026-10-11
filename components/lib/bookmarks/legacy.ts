import { LEGACY_BOOKMARK_API, LEGACY_DISMISSED_KEY } from "./config";
import type { BookmarkInput } from "@/components/types/bookmarks";
import { makeBookmarkKey } from "./key";
import { sanitizeSnapshot } from "./validate";

/**
 * One-time help for people who already have bookmarks in the OLD list (your `/api/bookmark`
 * endpoint, which only kept url / title / repoName / type / createdAt).
 *
 * The Bookmarks page checks for them and offers "Import". Old items cannot become full cards
 * (the data was never saved), so they are imported as compact rows that link to GitHub; save the
 * item again from Discovery to get the full card.
 */

export interface LegacyBookmark {
  url: string;
  title: string;
  repoName: string;
  type: "issue" | "repo";
  createdAt: string | null;
}

function normalise(raw: unknown): LegacyBookmark | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const url = typeof r.url === "string" ? r.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    url,
    title: typeof r.title === "string" ? r.title.trim() : "",
    repoName: typeof r.repoName === "string" ? r.repoName.trim() : "",
    type: r.type === "repo" ? "repo" : "issue",
    createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
  };
}

/** Resolves with the old list, or [] when there is none (or the old endpoint does not exist). */
export async function fetchLegacyBookmarks(): Promise<LegacyBookmark[]> {
  try {
    const res = await fetch(LEGACY_BOOKMARK_API, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok || res.redirected) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(normalise).filter((b): b is LegacyBookmark => b !== null);
  } catch {
    return [];
  }
}

export function legacyToInput(item: LegacyBookmark): BookmarkInput | null {
  const kind = item.type;
  const key = makeBookmarkKey(kind, item.url);
  if (!key) return null;
  const title = item.title || item.repoName || item.url;
  const parsedDate = item.createdAt ? Date.parse(item.createdAt) : NaN;
  const savedAt = Number.isFinite(parsedDate) ? new Date(parsedDate).toISOString() : undefined;

  const raw =
    kind === "issue"
      ? { title, html_url: item.url, repoName: item.repoName || undefined, created_at: item.createdAt ?? undefined, imported: true }
      : { full_name: item.repoName || title, html_url: item.url, imported: true };
  const snapshot = sanitizeSnapshot(raw);
  if (!snapshot.ok) return null;
  return { kind, key, title, url: item.url, snapshot: snapshot.value, savedAt };
}

export function isLegacyDismissed(): boolean {
  try {
    return window.localStorage.getItem(LEGACY_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissLegacy(): void {
  try {
    window.localStorage.setItem(LEGACY_DISMISSED_KEY, "1");
  } catch {
    /* ignore */
  }
}
