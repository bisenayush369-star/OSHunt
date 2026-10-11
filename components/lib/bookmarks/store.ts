import type { BookmarkInput, BookmarkKind, BookmarkListData, BookmarkRecord } from "@/components/types/bookmarks";
import { BOOKMARK_CACHE_KEY, BOOKMARK_LIMITS, BOOKMARK_ROUTES, TOAST_MS } from "./config";
import { buildBookmarkInput, inputFromRecord } from "./adapters";
import { bookmarksApi, importAll, type ClientFailure } from "./client";
import { makeBookmarkId } from "./key";
import { toast } from "./toast";

/**
 * The browser-side bookmark store: ONE shared copy of "what is saved", used by every page.
 *
 *  - Optimistic: clicking save/remove changes the UI instantly; the request follows. If it fails
 *    the UI rolls back and a toast explains (with Retry).
 *  - Ordered: rapid clicks on one item are coalesced and sent one at a time, so the server always
 *    ends up in the state of your LAST click.
 *  - Shared: it is a module singleton, so it survives page navigation and every component sees
 *    the same data. Other tabs are told about changes (BroadcastChannel) and refresh.
 *  - Instant first paint: the ids of saved items are cached in localStorage, so heart/bookmark
 *    buttons are already filled before the first network answer arrives.
 *
 * No React in here (so it is easy to test); `components/hooks/useBookmarks.ts` is the React side.
 */

export type LoadStatus = "idle" | "loading" | "ready" | "error" | "unauthenticated";

export interface BookmarksState {
  status: LoadStatus;
  /** What the UI should show: the server's list with your unconfirmed changes applied, newest first. */
  items: readonly BookmarkRecord[];
  /** Ids (`kind:key`) of everything saved. Before the first load this comes from the local cache. */
  savedIds: ReadonlySet<string>;
  /** Ids with a change that the server has not confirmed yet. */
  pendingIds: ReadonlySet<string>;
  ownerKey: string | null;
  limit: number;
  error: string | null;
  /** True while a background refresh runs on top of data that is already shown. */
  refreshing: boolean;
}

/** A change the user made that is not confirmed by the server yet. */
type Overlay =
  | { kind: "add"; record: BookmarkRecord; input: BookmarkInput; onConfirmed?: () => void }
  | { kind: "remove"; record: BookmarkRecord | null; onConfirmed?: () => void };

const EMPTY_ITEMS: readonly BookmarkRecord[] = [];
const EMPTY_IDS: ReadonlySet<string> = new Set<string>();
const STALE_MS = 30_000;

/** What the server renders (and what the first client render must match). */
export const SERVER_STATE: BookmarksState = {
  status: "idle",
  items: EMPTY_ITEMS,
  savedIds: EMPTY_IDS,
  pendingIds: EMPTY_IDS,
  ownerKey: null,
  limit: BOOKMARK_LIMITS.maxItemsPerUser,
  error: null,
  refreshing: false,
};

// ── module state ─────────────────────────────────────────────────────────────────────────
let server = new Map<string, BookmarkRecord>(); // last state the server confirmed
const overlay = new Map<string, Overlay>(); // unconfirmed local changes, by id
const inflight = new Set<string>(); // ids with a request loop running
const listeners = new Set<() => void>();

let status: LoadStatus = "idle";
let ownerKey: string | null = null;
let limit: number = BOOKMARK_LIMITS.maxItemsPerUser;
let lastError: string | null = null;
let refreshing = false;
let cachedIds: ReadonlySet<string> = EMPTY_IDS;
let snapshot: BookmarksState = SERVER_STATE;

let initialised = false;
let wired = false;
let writeEpoch = 0; // bumps whenever the server confirms a change; used to spot stale list answers
let lastLoadedAt = 0;
let loadActive = false;
let loadPromise: Promise<void> = Promise.resolve();
let reloadRequested = false;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let cacheTimer: ReturnType<typeof setTimeout> | null = null;
let channel: BroadcastChannel | null = null;

// ── snapshot (what React reads) ──────────────────────────────────────────────────────────
const byNewest = (a: BookmarkRecord, b: BookmarkRecord) =>
  a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : a.id < b.id ? -1 : 1;

function buildSnapshot(): BookmarksState {
  const merged = new Map(server);
  for (const [id, ov] of overlay) {
    if (ov.kind === "add") merged.set(id, ov.record);
    else merged.delete(id);
  }
  const items = [...merged.values()].sort(byNewest);
  const savedIds = new Set(merged.keys());
  if (status !== "ready") {
    // Not loaded yet: trust the local cache so buttons are right on first paint.
    for (const id of cachedIds) {
      const ov = overlay.get(id);
      if (!(ov && ov.kind === "remove")) savedIds.add(id);
    }
  }
  return {
    status,
    items,
    savedIds,
    pendingIds: new Set(overlay.keys()),
    ownerKey,
    limit,
    error: lastError,
    refreshing,
  };
}

function emit(): void {
  snapshot = buildSnapshot();
  scheduleCacheWrite();
  for (const listener of [...listeners]) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): BookmarksState {
  ensureInit();
  return snapshot;
}

export function getServerSnapshot(): BookmarksState {
  return SERVER_STATE;
}

// ── local cache (ids only: small, and never stale for long) ──────────────────────────────
function readCache(): ReadonlySet<string> {
  try {
    const raw = window.localStorage.getItem(BOOKMARK_CACHE_KEY);
    if (!raw) return EMPTY_IDS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && (parsed as { v?: unknown }).v === 1) {
      const ids = (parsed as { ids?: unknown }).ids;
      if (Array.isArray(ids)) {
        return new Set(ids.filter((x): x is string => typeof x === "string").slice(0, 1_000));
      }
    }
  } catch {
    /* storage blocked or corrupt: behave as if there is no cache */
  }
  return EMPTY_IDS;
}

function scheduleCacheWrite(): void {
  if (typeof window === "undefined" || status !== "ready") return;
  if (cacheTimer) clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    cacheTimer = null;
    try {
      window.localStorage.setItem(BOOKMARK_CACHE_KEY, JSON.stringify({ v: 1, ownerKey, ids: [...snapshot.savedIds] }));
    } catch {
      /* quota / private mode: the cache is only an optimisation */
    }
  }, 200);
}

function clearCache(): void {
  cachedIds = EMPTY_IDS;
  if (cacheTimer) {
    clearTimeout(cacheTimer);
    cacheTimer = null;
  }
  try {
    window.localStorage.removeItem(BOOKMARK_CACHE_KEY);
  } catch {
    /* ignore */
  }
}

function ensureInit(): void {
  if (initialised || typeof window === "undefined") return;
  initialised = true;
  cachedIds = readCache();
  if (cachedIds.size > 0) snapshot = buildSnapshot();
}

// ── lookups ──────────────────────────────────────────────────────────────────────────────
function visibleHas(id: string): boolean {
  const ov = overlay.get(id);
  if (ov) return ov.kind === "add";
  if (server.has(id)) return true;
  return status !== "ready" && cachedIds.has(id);
}

function visibleRecord(id: string): BookmarkRecord | null {
  const ov = overlay.get(id);
  if (ov) return ov.kind === "add" ? ov.record : null;
  return server.get(id) ?? null;
}

// ── messages ─────────────────────────────────────────────────────────────────────────────
function describeFailure(f: ClientFailure): string {
  switch (f.code) {
    case "LIMIT_REACHED":
    case "SNAPSHOT_TOO_LARGE":
    case "RATE_LIMITED":
      return f.message;
    default:
      return f.status === 0
        ? "You appear to be offline. Check your connection and try again."
        : "Something went wrong. Please try again.";
  }
}

function promptSignIn(): void {
  toast({
    tone: "info",
    message: "Sign in to save bookmarks.",
    action: { label: "Sign in", href: BOOKMARK_ROUTES.signIn },
  });
}

// ── loading ──────────────────────────────────────────────────────────────────────────────
function applyList(data: BookmarkListData): void {
  // A different account signed in on this device: forget the previous account's pending changes.
  if (ownerKey && ownerKey !== data.ownerKey) overlay.clear();
  server = new Map(data.items.map((item) => [item.id, item]));
  ownerKey = data.ownerKey;
  limit = data.limit;
  status = "ready";
  lastError = null;
}

function applyUnauthenticated(): void {
  server = new Map();
  overlay.clear();
  ownerKey = null;
  lastError = null;
  status = "unauthenticated";
  clearCache();
}

function handleSignedOut(): void {
  applyUnauthenticated();
  emit();
  promptSignIn();
}

async function doLoad(visible: boolean): Promise<void> {
  if (status === "idle" || (visible && status !== "ready")) status = "loading";
  else refreshing = true;
  emit();
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const epoch = writeEpoch;
      const res = await bookmarksApi.list();
      if (res.ok) {
        // A write was confirmed while this list was on its way: the list may be older than that
        // write. Ask again instead of showing stale data.
        if (epoch !== writeEpoch && attempt < 2) continue;
        applyList(res.data);
      } else if (res.status === 401) {
        applyUnauthenticated();
      } else {
        lastError = describeFailure(res);
        if (status !== "ready") status = "error";
      }
      break;
    }
  } finally {
    loadActive = false;
    refreshing = false;
    lastLoadedAt = Date.now();
    emit();
    if (reloadRequested) {
      reloadRequested = false;
      void load();
    }
  }
}

function load(options: { visible?: boolean } = {}): Promise<void> {
  if (loadActive) {
    reloadRequested = true;
    return loadPromise;
  }
  loadActive = true;
  loadPromise = doLoad(Boolean(options.visible));
  return loadPromise;
}

function scheduleRefresh(): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void load();
  }, 150);
}

function notifyOthers(): void {
  try {
    channel?.postMessage({ type: "changed" });
  } catch {
    /* channel closed */
  }
}

function wire(): void {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel("oshunt-bookmarks");
    channel.onmessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === "changed") scheduleRefresh();
    };
  } else {
    window.addEventListener("storage", (event) => {
      if (event.key === BOOKMARK_CACHE_KEY) scheduleRefresh();
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const stale = Date.now() - lastLoadedAt > STALE_MS;
    if (status === "unauthenticated" || status === "error" || stale) void load();
  });
  window.addEventListener("online", () => void load());
}

/** Call once when something that shows bookmarks mounts. Safe to call as often as you like. */
export function ensureLoaded(): void {
  if (typeof window === "undefined") return;
  ensureInit();
  if (!wired) {
    wired = true;
    wire();
  }
  if (status === "idle") void load();
}

/** Ask the server again (the "Try again" button). */
export function refresh(): Promise<void> {
  return load({ visible: true });
}

// ── one item: save / remove ──────────────────────────────────────────────────────────────
async function perform(id: string, ov: Overlay): Promise<{ ok: true; record?: BookmarkRecord } | ClientFailure> {
  if (ov.kind === "add") {
    const res = await bookmarksApi.save(ov.input);
    return res.ok ? { ok: true, record: res.data.item } : res;
  }
  const split = id.indexOf(":");
  const res = await bookmarksApi.remove(id.slice(0, split) as BookmarkKind, id.slice(split + 1));
  return res.ok ? { ok: true } : res;
}

function reportFailure(id: string, ov: Overlay, failure: ClientFailure): void {
  const input = ov.kind === "add" ? ov.input : null;
  const retryable = failure.code !== "LIMIT_REACHED" && failure.code !== "SNAPSHOT_TOO_LARGE";
  toast({
    tone: "error",
    message: input ? "Couldn't save that bookmark" : "Couldn't remove that bookmark",
    description: describeFailure(failure),
    action: retryable
      ? {
          label: "Retry",
          onClick: () => {
            if (input) addInput(input);
            else removeById(id, { undo: true });
          },
        }
      : undefined,
  });
}

/**
 * Drives the server toward the user's latest intent for one item. Only one loop runs per id, so
 * requests for the same item are never in flight together and always go out in click order.
 */
async function pump(id: string): Promise<void> {
  if (inflight.has(id)) return;
  inflight.add(id);
  try {
    for (;;) {
      const ov = overlay.get(id);
      if (!ov) return;

      const serverHas = server.has(id);
      if ((ov.kind === "add" && serverHas) || (ov.kind === "remove" && !serverHas)) {
        overlay.delete(id); // the server is already in the wanted state
        emit();
        return;
      }

      const result = await perform(id, ov);
      if (result.ok) {
        writeEpoch++;
        if (ov.kind === "add" && result.record) server.set(id, result.record);
        else server.delete(id);
        const stillLatest = overlay.get(id) === ov;
        if (stillLatest) overlay.delete(id);
        emit();
        notifyOthers();
        if (stillLatest) ov.onConfirmed?.();
        continue; // the user may have clicked again while this request was running
      }

      if (result.status === 401) {
        handleSignedOut();
        return;
      }
      if (overlay.get(id) === ov) overlay.delete(id); // roll back to the last confirmed state
      emit();
      reportFailure(id, ov, result);
    }
  } finally {
    inflight.delete(id);
  }
}

function addInput(input: BookmarkInput, onConfirmed?: () => void): boolean {
  if (status === "unauthenticated") {
    promptSignIn();
    void load(); // maybe they signed in in another tab
    return false;
  }
  const id = makeBookmarkId(input.kind, input.key);
  if (!visibleHas(id) && snapshot.items.length >= limit) {
    toast({ tone: "error", message: `You can keep up to ${limit} bookmarks. Remove one to save another.` });
    return false;
  }
  const record: BookmarkRecord = {
    id,
    kind: input.kind,
    key: input.key,
    title: input.title,
    url: input.url,
    snapshot: input.snapshot,
    savedAt: input.savedAt ?? new Date().toISOString(),
  };
  overlay.set(id, { kind: "add", record, input, onConfirmed });
  emit();
  void pump(id);
  return true;
}

function removeById(id: string, options: { undo?: boolean } = {}): void {
  if (status === "unauthenticated") {
    promptSignIn();
    void load();
    return;
  }
  const record = visibleRecord(id);
  overlay.set(id, {
    kind: "remove",
    record,
    onConfirmed: options.undo
      ? () =>
          toast({
            tone: "success",
            message: "Removed from bookmarks",
            action: record ? { label: "Undo", onClick: () => restoreBookmarks([record]) } : undefined,
            duration: TOAST_MS.undo,
          })
      : undefined,
  });
  emit();
  void pump(id);
}

export type ToggleResult = "saved" | "removed" | "blocked";

/** The one call behind every bookmark button: save it if it is not saved, remove it if it is. */
export function toggleBookmark(kind: BookmarkKind, source: unknown): ToggleResult {
  ensureLoaded();
  const built = buildBookmarkInput(kind, source);
  if (!built.ok) {
    toast({
      tone: "error",
      message: built.reason === "too-large" ? "This item is too large to bookmark." : "Can't bookmark this item: it has no link.",
    });
    return "blocked";
  }
  const { input } = built;
  const id = makeBookmarkId(kind, input.key);
  if (visibleHas(id)) {
    removeById(id, { undo: true });
    return "removed";
  }
  const accepted = addInput(input, () =>
    toast({
      tone: "success",
      message: "Saved to bookmarks",
      action: { label: "View", href: BOOKMARK_ROUTES.bookmarks },
    }),
  );
  return accepted ? "saved" : "blocked";
}

/** Remove one bookmark by id, with an Undo toast. */
export function removeBookmarkById(id: string): void {
  removeById(id, { undo: true });
}

// ── many items ───────────────────────────────────────────────────────────────────────────
async function restoreMany(records: readonly BookmarkRecord[]): Promise<void> {
  const added = new Map<string, Overlay>();
  for (const record of records) {
    const ov: Overlay = { kind: "add", record, input: inputFromRecord(record) };
    overlay.set(record.id, ov);
    added.set(record.id, ov);
  }
  emit();

  const res = await importAll(records.map(inputFromRecord));
  writeEpoch++;
  if (res.ok) {
    for (const [id, ov] of added) {
      if (ov.kind === "add") server.set(id, ov.record);
      if (overlay.get(id) === ov) overlay.delete(id);
    }
    emit();
    notifyOthers();
  } else {
    for (const [id, ov] of added) if (overlay.get(id) === ov) overlay.delete(id);
    if (res.status === 401) {
      handleSignedOut();
      return;
    }
    emit();
    toast({ tone: "error", message: "Couldn't restore your bookmarks", description: describeFailure(res) });
  }
  void load(); // line up with what the server really stored (it may have skipped some at the limit)
}

/** Put removed bookmarks back, in their old positions (the Undo button). */
export function restoreBookmarks(records: readonly BookmarkRecord[]): void {
  if (records.length === 0) return;
  if (records.length === 1) {
    addInput(inputFromRecord(records[0]));
    return;
  }
  void restoreMany(records);
}

/** Remove everything (or one kind) with an Undo toast. Resolves with how many were removed. */
export async function clearBookmarks(kind?: BookmarkKind): Promise<number> {
  if (status === "unauthenticated") {
    promptSignIn();
    return 0;
  }
  const records = snapshot.items.filter((item) => !kind || item.kind === kind);
  if (records.length === 0) return 0;

  const removed = new Map<string, Overlay>();
  for (const record of records) {
    const ov: Overlay = { kind: "remove", record };
    overlay.set(record.id, ov);
    removed.set(record.id, ov);
  }
  emit();

  const res = await bookmarksApi.clear(kind);
  writeEpoch++;
  if (res.ok) {
    for (const [id, ov] of removed) {
      server.delete(id);
      if (overlay.get(id) === ov) overlay.delete(id);
    }
    emit();
    notifyOthers();
    toast({
      tone: "success",
      message: records.length === 1 ? "Removed 1 bookmark" : `Removed ${records.length} bookmarks`,
      action: { label: "Undo", onClick: () => restoreBookmarks(records) },
      duration: TOAST_MS.undo,
    });
    void load();
    return records.length;
  }

  for (const [id, ov] of removed) if (overlay.get(id) === ov) overlay.delete(id);
  if (res.status === 401) {
    handleSignedOut();
    return 0;
  }
  emit();
  toast({ tone: "error", message: "Couldn't remove your bookmarks", description: describeFailure(res) });
  return 0;
}

/** Save many items at once (import from a file, or from the old bookmark list). */
export async function importBookmarks(inputs: BookmarkInput[]): Promise<{ imported: number; skipped: number } | null> {
  if (status === "unauthenticated") {
    promptSignIn();
    return null;
  }
  const res = await importAll(inputs);
  writeEpoch++;
  if (!res.ok) {
    if (res.status === 401) handleSignedOut();
    else toast({ tone: "error", message: "Couldn't import your bookmarks", description: describeFailure(res) });
    if (res.status !== 401) void load(); // some batches may have gone through
    return null;
  }
  await load();
  notifyOthers();
  return res.data;
}

/** Everything saved, as JSON text ready to download. */
export function exportBookmarks(): string {
  const items = snapshot.items.map(inputFromRecord);
  return JSON.stringify(
    { app: "oshunt", type: "bookmarks", version: 1, exportedAt: new Date().toISOString(), count: items.length, items },
    null,
    2,
  );
}

/** For tests: forget everything. */
export function __resetForTests(): void {
  server = new Map();
  overlay.clear();
  inflight.clear();
  listeners.clear();
  status = "idle";
  ownerKey = null;
  limit = BOOKMARK_LIMITS.maxItemsPerUser;
  lastError = null;
  refreshing = false;
  cachedIds = EMPTY_IDS;
  snapshot = SERVER_STATE;
  initialised = false;
  wired = false;
  writeEpoch = 0;
  lastLoadedAt = 0;
  loadActive = false;
  loadPromise = Promise.resolve();
  reloadRequested = false;
  if (refreshTimer) clearTimeout(refreshTimer);
  if (cacheTimer) clearTimeout(cacheTimer);
  refreshTimer = null;
  cacheTimer = null;
}

/** For tests: wait until nothing is loading or being sent. */
export async function __settleForTests(): Promise<void> {
  for (let i = 0; i < 200; i++) {
    await loadPromise;
    if (!loadActive && inflight.size === 0 && overlay.size === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
