"use client"

import { useCallback, useEffect, useState } from "react"
import type { RepoWithBlurb } from "@/lib/repo-types"

const STORAGE_KEY = "gitlense:bookmarks"

// Bookmarks are stored as a full snapshot (repo + whatever blurb it had),
// not just the name, so the "Bookmarked" view can still render a card after
// that repo has scrolled out of today's trending top 10 or search results —
// the whole point of bookmarking something is to still see it later, after
// the list underneath has moved on.
type BookmarkMap = Record<string, RepoWithBlurb>

function readStorage(): BookmarkMap {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as BookmarkMap) : {}
  } catch {
    // Corrupted, or from before a shape change — reset rather than crash the page.
    return {}
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkMap>({})
  const [hydrated, setHydrated] = useState(false)

  // Read localStorage only after mount, so the server-rendered pass and the
  // first client render match (avoids a hydration-mismatch warning).
  useEffect(() => {
    setBookmarks(readStorage())
    setHydrated(true)
  }, [])

  const persist = useCallback((next: BookmarkMap) => {
    setBookmarks(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage full or unavailable (private browsing) — state still updates
      // for this session, it just won't survive a reload.
    }
  }, [])

  const isBookmarked = useCallback((fullName: string) => Boolean(bookmarks[fullName]), [bookmarks])

  const toggle = useCallback(
    (repo: RepoWithBlurb) => {
      const next = { ...bookmarks }
      if (next[repo.fullName]) {
        delete next[repo.fullName]
      } else {
        next[repo.fullName] = repo
      }
      persist(next)
    },
    [bookmarks, persist]
  )

  return {
    bookmarks: Object.values(bookmarks),
    isBookmarked,
    toggle,
    hydrated, // false until localStorage has been read — gate bookmark-filled state on this to avoid a flash of "unbookmarked"
  }
}
