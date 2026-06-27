"use client"

import { useState, useEffect } from "react"

interface BookmarkBtnProps {
  url: string;
  title: string;
  repoName: string;
}

interface Bookmark {
  url: string;
  title?: string;
  repoName?: string;
}

// 🔥 We create a single cache promise OUTSIDE the component.
// This forces all 15+ buttons to share exactly ONE network request 
// instead of firing 15 separate requests at the same time!
let globalBookmarksPromise: Promise<Bookmark[]> | null = null;

export default function BookmarkBtn({ url, title, repoName }: BookmarkBtnProps) {
  const [isSaved, setIsSaved] = useState(false)

  // 1. Quietly check status in the background
  useEffect(() => {
    let isMounted = true;

    async function checkStatus() {
      try {
        // If the fetch hasn't started yet, start it.
        if (!globalBookmarksPromise) {
          globalBookmarksPromise = fetch("/api/bookmark").then(res => 
            res.ok ? res.json() : []
          );
        }

        // Wait for the single shared network request to finish
        const bookmarks = await globalBookmarksPromise;
        
        if (isMounted) {
          const alreadySaved = bookmarks.some((b: { url: string }) => b.url === url)
          setIsSaved(alreadySaved)
        }
      } catch {
        console.error("Failed to fetch bookmarks")
      }
    }
    
    checkStatus()

    return () => { isMounted = false } // Cleanup to prevent memory leaks
  }, [url])

  // 2. Handle the Save/Unsave click (Optimistic Update)
  const toggleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() 
    
    // Instantly toggle it visually!
    const previousState = isSaved
    setIsSaved(!previousState)

    try {
      if (previousState) {
        const res = await fetch("/api/bookmark", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        })
        if (!res.ok) throw new Error("Delete failed")
      } else {
        const res = await fetch("/api/bookmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, title, repoName })
        })
        if (!res.ok) throw new Error("Save failed")
      }
    } catch (error) {
      console.error("Failed to toggle bookmark, reverting UI", error)
      setIsSaved(previousState)
    }
  }

  return (
    <button 
      onClick={toggleBookmark}
      style={{
        background: isSaved ? "rgba(168,255,62,0.1)" : "transparent",
        color: isSaved ? "#a8ff3e" : "#555",
        border: `1px solid ${isSaved ? "rgba(168,255,62,0.3)" : "#222"}`,
        padding: "5px 12px",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "monospace",
        cursor: "pointer",
        transition: "all 0.2s ease",
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}
    >
      {/* We removed the loading spinner entirely. It paints instantly! */}
      {isSaved ? (
        <>★ Saved</>
      ) : (
        <>☆ Save</>
      )}
    </button>
  )
}