"use client"

import { useState, useEffect } from "react"

interface BookmarkBtnProps {
  url: string;
  title: string;
  repoName: string;
  type?: string;
}

export default function BookmarkBtn({ url, title, repoName, type }: BookmarkBtnProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // 1. Check if the user already saved this issue when the page loads
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/bookmark")
        if (res.ok) {
          const bookmarks = await res.json()
          // Look through their bookmarks to see if this exact URL exists
          const alreadySaved = bookmarks.some((b: { url: string }) => b.url === url)
          setIsSaved(alreadySaved)
        }
      } catch (error) {
        console.error("Failed to fetch bookmarks")
      } finally {
        setLoading(false)
      }
    }
    checkStatus()
  }, [url])

  // 2. Handle the Save/Unsave click
  const toggleBookmark = async (e: React.MouseEvent) => {
    // 🔥 CRITICAL: Prevents the click from opening the GitHub link in a new tab!
    e.preventDefault() 
    
    if (loading) return
    setLoading(true)

    try {
      if (isSaved) {
        // UN-SAVE: Trigger the DELETE route
        await fetch("/api/bookmark", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        })
        setIsSaved(false)
      } else {
        // SAVE: Trigger the POST route
        await fetch("/api/bookmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, title, repoName })
        })
        setIsSaved(true)
      }
    } catch (error) {
      console.error("Failed to toggle bookmark", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={toggleBookmark}
      disabled={loading}
      style={{
        background: isSaved ? "rgba(168,255,62,0.1)" : "transparent",
        color: isSaved ? "#a8ff3e" : "#555",
        border: `1px solid ${isSaved ? "rgba(168,255,62,0.3)" : "#222"}`,
        padding: "5px 12px",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "monospace",
        cursor: loading ? "wait" : "pointer",
        transition: "all 0.2s ease",
        marginLeft: "auto", // Pushes the button to the far right of the row
        display: "flex",
        alignItems: "center",
        gap: "6px"
      }}
    >
      {loading ? (
        <span style={{ opacity: 0.5 }}>...</span>
      ) : isSaved ? (
        <>★ Saved</>
      ) : (
        <>☆ Save</>
      )}
    </button>
  )
}