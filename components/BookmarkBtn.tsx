"use client"

import { useCallback, useEffect, useState } from "react"
import { Bookmark, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { isSameBookmarkUrl, normalizeBookmarkUrl } from "@/components/lib/bookmark"
import { cn } from "@/components/lib/utils"

interface BookmarkBtnProps {
  url: string
  title: string
  repoName: string
  /** Defaults to "repo" — pass "issue" for issue cards. Double check each call site. */
  type?: "issue" | "repo"
}

interface StoredBookmark {
  url: string
  title?: string
  repoName?: string
}

// A single shared promise so 15+ buttons on one page fire ONE request
// instead of one each.
let globalBookmarksPromise: Promise<StoredBookmark[]> | null = null

function patchGlobalCache(mutate: (bookmarks: StoredBookmark[]) => StoredBookmark[]) {
  const base = globalBookmarksPromise ?? Promise.resolve([])
  globalBookmarksPromise = base.then(mutate).catch(() => [])
}

export function syncBookmarkCache(mutate: (bookmarks: StoredBookmark[]) => StoredBookmark[]) {
  patchGlobalCache(mutate)
}

export default function BookmarkBtn({ url, title, repoName, type = "repo" }: BookmarkBtnProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [pending, setPending] = useState(false)

  // Quietly check status in the background
  const targetUrl = normalizeBookmarkUrl(url)

  useEffect(() => {
    let isMounted = true

    async function checkStatus() {
      try {
        if (!globalBookmarksPromise) {
          globalBookmarksPromise = fetch("/api/bookmark").then((res) => (res.ok ? res.json() : []))
        }
        const bookmarks = await globalBookmarksPromise
        if (isMounted) setIsSaved(bookmarks.some((b) => isSameBookmarkUrl(b.url, targetUrl)))
      } catch {
        console.error("Failed to fetch bookmarks")
      }
    }

    checkStatus()
    return () => {
      isMounted = false
    }
  }, [targetUrl])

  // Save/unsave with an optimistic update, correctly reverted on failure
  const toggleBookmark = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (pending) return

      const wasSaved = isSaved
      setIsSaved(!wasSaved)
      setPending(true)

      patchGlobalCache((prev) => {
        const withoutThis = prev.filter((b) => !isSameBookmarkUrl(b.url, targetUrl))
        return wasSaved ? withoutThis : [...withoutThis, { url: targetUrl, title, repoName }]
      })

      try {
        const res = await fetch("/api/bookmark", {
          method: wasSaved ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(wasSaved ? { url: targetUrl } : { url: targetUrl, title, repoName, type }),
        })

        if (!res.ok) {
          const contentType = res.headers.get("content-type")
          const message =
            contentType && contentType.includes("application/json")
              ? ((await res.json())?.error ?? "Save failed")
              : `Error ${res.status}: the server couldn't process the request`
          throw new Error(message)
        }
      } catch (error) {
        console.error("Failed to toggle bookmark, reverting UI:", error)
        setIsSaved(wasSaved)
      } finally {
        setPending(false)
      }
    },
    [isSaved, pending, targetUrl, title, repoName, type]
  )

  return (
    <Button
      onClick={toggleBookmark}
      variant="outline"
      size="sm"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${title} from bookmarks` : `Save ${title} to bookmarks`}
      className={cn(
        "ml-auto h-7 gap-1.5 rounded-md px-2.5 font-mono text-[11px] transition-colors",
        isSaved
          ? "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e] hover:bg-[#a8ff3e]/15 hover:text-[#a8ff3e]"
          : "border-white/10 bg-transparent text-zinc-500 hover:border-white/20 hover:text-zinc-300"
      )}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Bookmark className="h-3 w-3" fill={isSaved ? "currentColor" : "none"} />
      )}
      {isSaved ? "Saved" : "Save"}
    </Button>
  )
}
