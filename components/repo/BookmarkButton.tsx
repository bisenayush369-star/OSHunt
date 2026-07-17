"use client"

import type { RepoWithBlurb } from "@/lib/repo-types"

const BookmarkIcon = ({ filled }: { filled: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
)

export function BookmarkButton({
  repo,
  bookmarked,
  onToggle,
}: {
  repo: RepoWithBlurb
  bookmarked: boolean
  onToggle: (repo: RepoWithBlurb) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(repo)}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this repo"}
      aria-pressed={bookmarked}
      title={bookmarked ? "Bookmarked" : "Bookmark"}
      className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all duration-200 hover:-translate-y-0.5 ${
        bookmarked
          ? "border-[#a8ff3e]/35 bg-[#a8ff3e]/10 text-[#a8ff3e]"
          : "border-[#1a1a1a] bg-[#050505] text-[#666] hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e]"
      }`}
    >
      <BookmarkIcon filled={bookmarked} />
    </button>
  )
}
