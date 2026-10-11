import type { BookmarkInput } from "@/components/types/bookmarks";
import { BOOKMARK_LIMITS } from "./config";
import { parseBookmark } from "./validate";

/** Reading a bookmarks backup file (the JSON that "Export" produces). Runs in the browser. */

export const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;

export type ImportParse =
  | { ok: true; inputs: BookmarkInput[]; invalid: number }
  | { ok: false; message: string };

export function parseImportText(text: string): ImportParse {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "That file isn't valid JSON." };
  }

  const list: unknown[] | null = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : null;
  if (!list) return { ok: false, message: "That doesn't look like a bookmarks export." };

  const inputs: BookmarkInput[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  for (const item of list.slice(0, BOOKMARK_LIMITS.maxItemsPerUser * 2)) {
    const kind = typeof item === "object" && item !== null ? (item as { kind?: unknown }).kind : undefined;
    const parsed = parseBookmark(kind, null, item);
    if (!parsed.ok) {
      invalid++;
      continue;
    }
    const id = `${parsed.value.kind}:${parsed.value.key}`;
    if (seen.has(id)) continue;
    seen.add(id);
    inputs.push(parsed.value);
  }

  if (inputs.length === 0) {
    return {
      ok: false,
      message: invalid > 0 ? "None of the items in that file could be imported." : "That file has no bookmarks in it.",
    };
  }
  return { ok: true, inputs: inputs.slice(0, BOOKMARK_LIMITS.maxItemsPerUser), invalid };
}

export function exportFileName(date: Date = new Date()): string {
  return `oshunt-bookmarks-${date.toISOString().slice(0, 10)}.json`;
}
