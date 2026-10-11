import type { BookmarkInput, BookmarkKind, BookmarkRecord } from "@/components/types/bookmarks";
import { canonicalUrl, makeBookmarkId, makeBookmarkKey } from "./key";
import { sanitizeSnapshot } from "./validate";

/**
 * Adapters turn "the object your card renders" into a bookmark, and back into the few
 * display facts the Bookmarks page needs (title, repo name, stars, ...).
 *
 * They are deliberately tolerant: they look for several common field names
 * (`html_url` / `htmlUrl` / `url`, `stargazers_count` / `stars`, ...) so they keep working
 * if a page names things slightly differently. The *card itself* is always drawn from the
 * untouched snapshot, so tolerance here never changes what a card shows.
 */

type Obj = Record<string, unknown>;

function isObj(value: unknown): value is Obj {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(obj: Obj, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return undefined;
}

function num(obj: Obj, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return undefined;
}

/** Use the browsable URL even when a page only has the API URL (api.github.com/repos/...). */
function webUrl(raw: string): string {
  try {
    if (new URL(raw).hostname.toLowerCase() === "api.github.com") return canonicalUrl(raw) ?? raw;
  } catch {
    /* fall through */
  }
  return raw;
}

const URL_KEYS = ["html_url", "htmlUrl", "url", "link", "href"];

function ownerLogin(obj: Obj): string | undefined {
  const owner = obj.owner;
  if (typeof owner === "string" && owner) return owner;
  if (isObj(owner)) return str(owner, ["login", "name"]);
  return undefined;
}

function repoFullName(obj: Obj): string | undefined {
  const full = str(obj, ["full_name", "fullName", "nameWithOwner"]);
  if (full && full.includes("/")) return full;
  const owner = ownerLogin(obj);
  const name = str(obj, ["name", "repo"]);
  return owner && name ? `${owner}/${name}` : undefined;
}

/** "Owner/Repo" (original case) from https://github.com/o/r/... or the api.github.com/repos/o/r form. */
function repoFromUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return "";
  }
  const parts = u.pathname.split("/").filter(Boolean);
  if (u.hostname.toLowerCase() === "api.github.com") {
    return parts[0] === "repos" && parts.length >= 3 ? `${parts[1]}/${parts[2].replace(/\.git$/i, "")}` : "";
  }
  return parts.length >= 2 ? `${parts[0]}/${parts[1].replace(/\.git$/i, "")}` : "";
}

/** The page URL an item will be bookmarked under (null when the object has none). */
function sourceUrl(kind: BookmarkKind, source: Obj): string | null {
  let rawUrl = str(source, URL_KEYS);
  if (kind === "repo" && !rawUrl) {
    const full = repoFullName(source);
    if (full) rawUrl = `https://github.com/${full}`;
  }
  return rawUrl ? webUrl(rawUrl) : null;
}

/**
 * `${kind}:${key}` for a card's source object, or null when it has no usable URL.
 * Cheap (no deep copy), so it is safe to call for every card on every render.
 */
export function bookmarkIdOf(kind: BookmarkKind, source: unknown): string | null {
  if (!isObj(source)) return null;
  const url = sourceUrl(kind, source);
  if (!url) return null;
  const key = makeBookmarkKey(kind, url);
  return key ? makeBookmarkId(kind, key) : null;
}

// ---------------------------------------------------------------------------------------
// Source object -> bookmark
// ---------------------------------------------------------------------------------------

export type BuildResult =
  | { ok: true; input: BookmarkInput }
  | { ok: false; reason: "no-url" | "too-large" | "invalid" };

export function buildBookmarkInput(kind: BookmarkKind, source: unknown): BuildResult {
  if (!isObj(source)) return { ok: false, reason: "invalid" };

  const url = sourceUrl(kind, source);
  if (!url) return { ok: false, reason: "no-url" };
  const key = makeBookmarkKey(kind, url);
  if (!key) return { ok: false, reason: "no-url" };

  const snapshot = sanitizeSnapshot(source);
  if (!snapshot.ok) return { ok: false, reason: snapshot.code === "SNAPSHOT_TOO_LARGE" ? "too-large" : "invalid" };

  const title =
    kind === "repo"
      ? (repoFullName(source) ?? str(source, ["title", "name"]) ?? url)
      : (str(source, ["title", "name"]) ?? url);

  return { ok: true, input: { kind, key, title, url, snapshot: snapshot.value } };
}

export function toBookmarkInput(kind: BookmarkKind, source: unknown): BookmarkInput | null {
  const result = buildBookmarkInput(kind, source);
  return result.ok ? result.input : null;
}

export function inputFromRecord(record: BookmarkRecord): BookmarkInput {
  const { kind, key, title, url, snapshot, savedAt } = record;
  return { kind, key, title, url, snapshot, savedAt };
}

/** The snapshot, typed as whatever your card expects (`Repo`, issue type, ...). */
export function snapshotOf<T>(record: BookmarkRecord): T {
  return record.snapshot as unknown as T;
}

// ---------------------------------------------------------------------------------------
// Bookmark -> display facts (used for search / sort / the issue row)
// ---------------------------------------------------------------------------------------

export function starsOf(record: BookmarkRecord): number {
  return num(record.snapshot, ["stargazers_count", "stargazersCount", "stars", "star_count", "starCount"]) ?? 0;
}

/**
 * True when a repo snapshot has the fields a full Discovery card needs. We support both
 * GitHub's API field names and the app's discovery Repo shape, so a saved repo from Discovery
 * renders in the full card layout instead of falling back to the compact row.
 */
export function isFullRepoSnapshot(snapshot: Obj): boolean {
  const hasId = typeof snapshot.id === "number";
  const fullName = typeof snapshot.full_name === "string" ? snapshot.full_name : typeof snapshot.fullName === "string" ? snapshot.fullName : "";
  const htmlUrl = typeof snapshot.html_url === "string" ? snapshot.html_url : typeof snapshot.htmlUrl === "string" ? snapshot.htmlUrl : "";
  const stars = typeof snapshot.stargazers_count === "number" ? snapshot.stargazers_count : typeof snapshot.stars === "number" ? snapshot.stars : null;
  const owner = isObj(snapshot.owner)
    ? typeof snapshot.owner.login === "string" || typeof snapshot.owner.name === "string"
    : typeof snapshot.owner === "string";

  return hasId && !!fullName && !!htmlUrl && typeof stars === "number" && owner;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface IssueView {
  title: string;
  url: string;
  repoName: string;
  language: string | null;
  difficulty: Difficulty | null;
  createdAt: string | null;
  labels: { name: string; color: string | null }[];
  comments: number | null;
  state: "open" | "closed" | null;
  number: number | null;
}

function difficultyOf(value: string | undefined): Difficulty | null {
  if (!value) return null;
  const v = value.toLowerCase();
  if (/easy|beginner|good[ -]first|starter|trivial/.test(v)) return "easy";
  if (/medium|intermediate|moderate/.test(v)) return "medium";
  if (/hard|advanced|difficult|expert/.test(v)) return "hard";
  return null;
}

function labelsOf(snapshot: Obj): IssueView["labels"] {
  const raw = snapshot.labels;
  if (!Array.isArray(raw)) return [];
  const out: IssueView["labels"] = [];
  for (const item of raw) {
    if (typeof item === "string" && item) out.push({ name: item, color: null });
    else if (isObj(item)) {
      const name = str(item, ["name", "label"]);
      if (name) {
        const color = str(item, ["color"]);
        out.push({ name, color: color && /^#?[0-9a-f]{6}$/i.test(color) ? color.replace("#", "") : null });
      }
    }
  }
  return out;
}

export function describeIssue(record: BookmarkRecord): IssueView {
  const s = record.snapshot;
  const repoObj = isObj(s.repository) ? s.repository : isObj(s.repo) ? s.repo : null;

  const repoName =
    str(s, ["repoName", "repo_name", "repositoryFullName", "repository_full_name"]) ??
    (typeof s.repo === "string" ? s.repo : undefined) ??
    (typeof s.repository === "string" && s.repository.includes("/") ? s.repository : undefined) ??
    (repoObj ? repoFullName(repoObj) : undefined) ??
    (typeof s.repository_url === "string" ? repoFromUrl(s.repository_url) : undefined) ??
    repoFromUrl(record.url);

  const labels = labelsOf(s);
  const difficulty =
    difficultyOf(str(s, ["difficulty", "level", "complexity", "difficultyLevel"])) ??
    difficultyOf(labels.map((l) => l.name).join(" "));

  const state = str(s, ["state", "status"])?.toLowerCase();

  return {
    title: record.title,
    url: record.url,
    repoName,
    language:
      str(s, ["language", "lang", "repoLanguage", "primaryLanguage"]) ?? (repoObj ? str(repoObj, ["language"]) : undefined) ?? null,
    difficulty,
    createdAt: str(s, ["created_at", "createdAt", "updated_at", "updatedAt", "date"]) ?? null,
    labels,
    comments: num(s, ["comments", "comments_count", "commentsCount"]) ?? null,
    state: state === "open" || state === "closed" ? state : null,
    number: num(s, ["number", "issueNumber"]) ?? null,
  };
}

// ---------------------------------------------------------------------------------------
// Search text: every readable string in the snapshot, without URLs / ids / colours.
// ---------------------------------------------------------------------------------------

const SKIP_KEY = /(url|href|link|avatar|node_id|sha|etag|color|^id)$/i;
const searchCache = new WeakMap<BookmarkRecord, string>();

function collectStrings(value: unknown, depth: number, key: string | null, out: string[]): void {
  if (out.length > 400 || depth > 4) return;
  if (typeof value === "string") {
    if (!(key && SKIP_KEY.test(key))) out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value.slice(0, 60)) collectStrings(item, depth + 1, key, out);
  } else if (isObj(value)) {
    for (const [k, v] of Object.entries(value)) collectStrings(v, depth + 1, k, out);
  }
}

export function searchTextOf(record: BookmarkRecord): string {
  const cached = searchCache.get(record);
  if (cached !== undefined) return cached;
  const parts: string[] = [record.title, record.kind];
  collectStrings(record.snapshot, 0, null, parts);
  if (record.kind === "issue") parts.push(describeIssue(record).repoName);
  const text = parts.join(" ").toLowerCase().slice(0, 6_000);
  searchCache.set(record, text);
  return text;
}
