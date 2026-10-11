"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import type { BookmarkKind } from "@/components/types/bookmarks";
import { bookmarkIdOf } from "@/components/lib/bookmarks/adapters";
import {
  clearBookmarks,
  ensureLoaded,
  exportBookmarks,
  getServerSnapshot,
  getSnapshot,
  importBookmarks,
  refresh,
  removeBookmarkById,
  restoreBookmarks,
  subscribe,
  toggleBookmark,
} from "@/components/lib/bookmarks/store";

/**
 * The React side of the bookmark store.
 *
 *   const bookmarks = useBookmarks();
 *   bookmarks.isSaved("repo", repo)     // is this card saved?
 *   bookmarks.toggle("repo", repo)      // save / remove (instant, with Undo + error handling)
 *   bookmarks.items                     // everything saved, newest first
 */
export function useBookmarks() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Starts loading on first use anywhere; later calls are free.
  useEffect(() => {
    ensureLoaded();
  }, []);

  const isSaved = useCallback(
    (kind: BookmarkKind, source: unknown): boolean => {
      const id = bookmarkIdOf(kind, source);
      return id !== null && state.savedIds.has(id);
    },
    [state.savedIds],
  );

  const isPending = useCallback(
    (kind: BookmarkKind, source: unknown): boolean => {
      const id = bookmarkIdOf(kind, source);
      return id !== null && state.pendingIds.has(id);
    },
    [state.pendingIds],
  );

  return useMemo(
    () => ({
      ...state,
      /** Nothing to show yet. */
      loading: state.status === "idle" || state.status === "loading",
      ready: state.status === "ready",
      unauthenticated: state.status === "unauthenticated",
      count: state.items.length,
      isSaved,
      isPending,
      /** Save it if it isn't saved, remove it (with Undo) if it is. */
      toggle: toggleBookmark,
      /** Remove by bookmark id (`record.id`), with Undo. */
      remove: removeBookmarkById,
      /** Put removed bookmarks back where they were. */
      restore: restoreBookmarks,
      /** Remove everything (or one kind), with Undo. */
      clear: clearBookmarks,
      importItems: importBookmarks,
      exportJson: exportBookmarks,
      refresh,
    }),
    [state, isSaved, isPending],
  );
}

export type UseBookmarks = ReturnType<typeof useBookmarks>;

/**
 * "Which of these cards are saved?" as a Set of one of their fields, e.g. for the Discovery grid:
 *
 *   const savedRepoIds = useSavedSet("repo", discovery.repos, "id");   // Set<number>
 */
export function useSavedSet<T extends object, P extends keyof T>(
  kind: BookmarkKind,
  items: readonly T[],
  prop: P,
): Set<T[P]> {
  const { savedIds } = useBookmarks();
  return useMemo(() => {
    const out = new Set<T[P]>();
    for (const item of items) {
      const id = bookmarkIdOf(kind, item);
      if (id !== null && savedIds.has(id)) out.add(item[prop]);
    }
    return out;
  }, [items, savedIds, kind, prop]);
}
