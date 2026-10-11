import type { BookmarkRecord } from "@/components/types/bookmarks";
import { searchTextOf, starsOf } from "./adapters";

/**
 * The Bookmarks page's view state (which tab, what you typed in search, how it is sorted), plus the
 * pure functions that apply it. No React in here, so the server page can parse the URL with it
 * and it is easy to test.
 */

export const BOOKMARK_TABS = ["repos", "issues"] as const;
export type BookmarkTab = (typeof BOOKMARK_TABS)[number];

export const BOOKMARK_SORTS = ["newest", "oldest", "stars", "name"] as const;
export type BookmarkSort = (typeof BOOKMARK_SORTS)[number];

export const DEFAULT_TAB: BookmarkTab = "repos";
export const DEFAULT_SORT: BookmarkSort = "newest";
export const MAX_QUERY_LENGTH = 100;

export const SORT_LABELS: Record<BookmarkSort, string> = {
  newest: "Newest saved",
  oldest: "Oldest saved",
  stars: "Most stars",
  name: "Name (A–Z)",
};

export interface BookmarkViewState {
  tab: BookmarkTab;
  sort: BookmarkSort;
  q: string;
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function isBookmarkTab(value: unknown): value is BookmarkTab {
  return typeof value === "string" && (BOOKMARK_TABS as readonly string[]).includes(value);
}

export function isBookmarkSort(value: unknown): value is BookmarkSort {
  return typeof value === "string" && (BOOKMARK_SORTS as readonly string[]).includes(value);
}

export function cleanQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
}

/** `?tab=issues&sort=stars&q=react` -> a safe view state (unknown values fall back to the defaults). */
export function parseBookmarkView(params: RawParams = {}): BookmarkViewState {
  const tab = first(params.tab);
  const sort = first(params.sort);
  return {
    tab: isBookmarkTab(tab) ? tab : DEFAULT_TAB,
    sort: isBookmarkSort(sort) ? sort : DEFAULT_SORT,
    q: cleanQuery(first(params.q) ?? ""),
  };
}

/** "react  hooks" -> ["react", "hooks"]. A bookmark matches when it contains every word. */
export function queryWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesWords(record: BookmarkRecord, words: readonly string[]): boolean {
  if (words.length === 0) return true;
  const text = searchTextOf(record);
  return words.every((word) => text.includes(word));
}

function savedTime(record: BookmarkRecord): number {
  const t = Date.parse(record.savedAt);
  return Number.isFinite(t) ? t : 0;
}

export function sortRecords(records: readonly BookmarkRecord[], sort: BookmarkSort): BookmarkRecord[] {
  const out = [...records];
  const newestFirst = (a: BookmarkRecord, b: BookmarkRecord) => savedTime(b) - savedTime(a) || a.id.localeCompare(b.id);
  switch (sort) {
    case "oldest":
      out.sort((a, b) => savedTime(a) - savedTime(b) || a.id.localeCompare(b.id));
      break;
    case "stars":
      out.sort((a, b) => starsOf(b) - starsOf(a) || newestFirst(a, b));
      break;
    case "name":
      out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || newestFirst(a, b));
      break;
    default:
      out.sort(newestFirst);
  }
  return out;
}

/** Repo / issue counts from the cached id list (known before the first network answer). */
export function countKinds(ids: ReadonlySet<string>): { repos: number; issues: number } {
  let repos = 0;
  let issues = 0;
  for (const id of ids) {
    if (id.startsWith("repo:")) repos++;
    else if (id.startsWith("issue:")) issues++;
  }
  return { repos, issues };
}
