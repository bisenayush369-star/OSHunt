"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import type { RepoWithBlurb } from "@/components/lib/repo-types"
import { BookmarkIcon, cx } from "./repo-ui"

export function BookmarkButton({
  repo,
  bookmarked,
  onToggle,
  className,
}: {
  repo: RepoWithBlurb
  bookmarked: boolean
  onToggle: (repo: RepoWithBlurb) => void
  className?: string
}) {
  // A quick "pop" on the icon when something is saved. State (not a CSS keyframe) so it works anywhere,
  // with no global stylesheet needed; reduced-motion users get the fill change only.
  const [popping, setPopping] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const name = repo.fullName ?? repo.full_name ?? repo.name ?? "repository"

  const handleClick = (event: React.MouseEvent) => {
    // Same contract as before: pressing this never counts as a click on whatever the card sits inside.
    event.stopPropagation()
    onToggle(repo)
    if (bookmarked) return
    setPopping(true)
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPopping(false), 220)
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      onClick={handleClick}
      // One stable name + aria-pressed (instead of swapping the label as well): a screen reader hears
      // "Bookmark vercel/next.js, toggle button, pressed" and nothing contradictory.
      aria-label={`Bookmark ${name}`}
      aria-pressed={bookmarked}
      title={bookmarked ? "Remove bookmark" : "Bookmark"}
      className={cx(
        // z-10: sits above the card's stretched "open details" link. The ::after widens the tap target
        // to 44px on phones without changing how the button looks (-5px because it is measured from the
        // inside of the 1px border: 34 + 2×5 = 44).
        "relative z-10 size-9 shrink-0 rounded-lg border bg-transparent shadow-none sm:size-8",
        "after:absolute after:-inset-[5px] after:content-[''] sm:after:inset-0",
        "transition-[color,background-color,border-color,transform,scale] duration-200 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0",
        bookmarked
          ? "border-[#a8ff3e]/40 bg-[#a8ff3e]/10 text-[#a8ff3e] hover:bg-[#a8ff3e]/15"
          : "border-white/10 text-[#9a9a9a] hover:border-[#a8ff3e]/35 hover:bg-[#a8ff3e]/[0.07] hover:text-[#a8ff3e]",
        className,
      )}
    >
      <BookmarkIcon
        className={cx(
          "size-4 transition-[fill,transform,scale] duration-200 motion-reduce:transition-none",
          bookmarked ? "fill-current" : "fill-transparent",
          popping && "scale-125",
        )}
      />
    </Button>
  )
}