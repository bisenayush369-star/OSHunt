import type { BookmarkKind } from "@/components/types/bookmarks";

/**
 * Bookmark identity = the item's canonical URL.
 *
 * Why URL and not `repo.id`: every page that can bookmark something has its URL, but
 * not every page has the same id field. Using the URL means "Save" on Discovery and
 * "Save" on any other page agree that it is the same bookmark.
 */

const GITHUB_API_REPO = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/;

/** Normalise a URL so the same repo / issue always maps to the same string. */
export function canonicalUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2_000) return null;
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  let host = u.hostname.toLowerCase().replace(/^www\./, "");
  let path = u.pathname.replace(/\/+$/, "").replace(/\.git$/i, "");

  // https://api.github.com/repos/o/r/issues/1  ->  https://github.com/o/r/issues/1
  if (host === "api.github.com") {
    const m = GITHUB_API_REPO.exec(path);
    if (m) {
      host = "github.com";
      path = `/${m[1]}/${m[2]}${m[3] ?? ""}`;
    }
  }
  // GitHub owner / repo names are case-insensitive.
  if (host === "github.com") path = path.toLowerCase();

  return `https://${host}${path}`;
}

/** 53-bit string hash (cyrb53). Fast, synchronous, identical in browser and Node. */
function hash53(str: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Lowercase base-36, 6-16 chars. Used in URLs and as part of the record id. */
export const BOOKMARK_KEY_RE = /^[0-9a-z]{6,16}$/;

export function makeBookmarkKey(kind: BookmarkKind, url: unknown): string | null {
  const canonical = canonicalUrl(url);
  if (!canonical) return null;
  return hash53(`${kind}|${canonical}`).toString(36).padStart(11, "0");
}

export function makeBookmarkId(kind: BookmarkKind, key: string): string {
  return `${kind}:${key}`;
}
