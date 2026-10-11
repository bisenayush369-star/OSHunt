import {
  BOOKMARK_KINDS,
  type BookmarkInput,
  type BookmarkKind,
  type BookmarkSnapshot,
} from "@/components/types/bookmarks";
import { BOOKMARK_LIMITS } from "./config";
import { BOOKMARK_KEY_RE, canonicalUrl, makeBookmarkKey } from "./key";

/**
 * Validation + cleaning for anything that crosses the network.
 * The server never trusts the browser: every PUT / import goes through here.
 */

export type ParseResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

const MAX_DEPTH = 6;
const MAX_STRING = 4_000;
const MAX_ARRAY = 100;
const MAX_KEYS = 100;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
/** Keys whose string value must be an http(s) URL (blocks `javascript:` / `data:` links). */
const URLISH_KEY = /(url|href|link|homepage|website)$/i;

export function isBookmarkKind(value: unknown): value is BookmarkKind {
  return typeof value === "string" && (BOOKMARK_KINDS as readonly string[]).includes(value);
}

export function isBookmarkKey(value: unknown): value is string {
  return typeof value === "string" && BOOKMARK_KEY_RE.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanValue(value: unknown, depth: number, key: string | null): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case "string": {
      if (key && URLISH_KEY.test(key) && value !== "" && !/^https?:\/\//i.test(value)) return undefined;
      return value.length > MAX_STRING ? value.slice(0, MAX_STRING) : value;
    }
    case "number":
      return Number.isFinite(value) ? value : undefined;
    case "boolean":
      return value;
    case "object": {
      if (depth >= MAX_DEPTH) return undefined;
      if (Array.isArray(value)) {
        const out: unknown[] = [];
        for (const item of value.slice(0, MAX_ARRAY)) {
          const cleaned = cleanValue(item, depth + 1, null);
          if (cleaned !== undefined) out.push(cleaned);
        }
        return out;
      }
      const out: Record<string, unknown> = {};
      let count = 0;
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (FORBIDDEN_KEYS.has(k)) continue;
        if (++count > MAX_KEYS) break;
        const cleaned = cleanValue(v, depth + 1, k);
        if (cleaned !== undefined) out[k] = cleaned;
      }
      return out;
    }
    default:
      return undefined; // undefined, function, symbol, bigint
  }
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Deep-clean a snapshot: JSON-safe values only, bounded size, safe URLs, no prototype tricks. */
export function sanitizeSnapshot(value: unknown): ParseResult<BookmarkSnapshot> {
  if (!isPlainObject(value)) {
    return { ok: false, code: "INVALID_SNAPSHOT", message: "`snapshot` must be an object." };
  }
  const cleaned = cleanValue(value, 0, null) as BookmarkSnapshot;
  if (byteLength(JSON.stringify(cleaned)) > BOOKMARK_LIMITS.maxSnapshotBytes) {
    return { ok: false, code: "SNAPSHOT_TOO_LARGE", message: "This item is too large to bookmark." };
  }
  return { ok: true, value: cleaned };
}

function cleanTitle(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  const title = text || fallback;
  return title.length > BOOKMARK_LIMITS.maxTitleLength ? title.slice(0, BOOKMARK_LIMITS.maxTitleLength) : title;
}

function cleanSavedAt(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = Date.parse(value);
  if (!Number.isFinite(t) || t < Date.parse("2015-01-01")) return undefined;
  return new Date(Math.min(t, Date.now())).toISOString();
}

/**
 * Validate one bookmark. `expectedKey` is the key from the request path (PUT); for bulk
 * import pass `null` and the key is derived from the URL instead of trusted.
 */
export function parseBookmark(
  kind: unknown,
  expectedKey: string | null,
  body: unknown,
): ParseResult<BookmarkInput> {
  if (!isBookmarkKind(kind)) return { ok: false, code: "INVALID_KIND", message: "Unknown bookmark kind." };
  if (!isPlainObject(body)) return { ok: false, code: "INVALID_BODY", message: "Body must be a JSON object." };

  const rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  if (rawUrl.length > BOOKMARK_LIMITS.maxUrlLength || canonicalUrl(rawUrl) === null) {
    return { ok: false, code: "INVALID_URL", message: "`url` must be an http(s) URL." };
  }
  const key = makeBookmarkKey(kind, rawUrl);
  if (!key) return { ok: false, code: "INVALID_URL", message: "`url` must be an http(s) URL." };
  if (expectedKey !== null && expectedKey !== key) {
    return { ok: false, code: "KEY_MISMATCH", message: "The key does not match the URL." };
  }

  const snapshot = sanitizeSnapshot(body.snapshot);
  if (!snapshot.ok) return snapshot;

  return {
    ok: true,
    value: {
      kind,
      key,
      title: cleanTitle(body.title, rawUrl),
      url: rawUrl,
      snapshot: snapshot.value,
      savedAt: cleanSavedAt(body.savedAt),
    },
  };
}
