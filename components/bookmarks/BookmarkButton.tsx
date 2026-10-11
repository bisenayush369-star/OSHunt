"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bookmark } from "lucide-react";
import type { BookmarkKind, BookmarkRecord } from "@/components/types/bookmarks";
import { useBookmarks } from "@/components/hooks/useBookmarks";
import { removeBookmarkById, type ToggleResult } from "@/components/lib/bookmarks/store";
import "./bookmarks.css";

/**
 * Save / Saved button.
 *
 *   <BookmarkButton kind="issue" item={issue} />      // on a Hunt card: saves the issue exactly as shown
 *   <BookmarkButton kind="repo" item={repo} variant="pill" />
 *
 * It looks up its own saved state, so it is always right after a reload, in another tab, or on
 * another page. Clicking is instant (optimistic); a toast with Undo / Retry handles the rest.
 */

type Size = "sm" | "md" | "lg";
type Variant = "icon" | "pill";

export interface BookmarkToggleProps {
  saved: boolean;
  /** A change is on its way to the server (shows a tiny pulse). The button stays clickable. */
  pending?: boolean;
  /** Return "blocked" / false when nothing was changed (limit reached, signed out) to skip the burst. */
  onToggle: () => ToggleResult | boolean | void;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Names the item for screen readers: "Save bookmark: acme/project". */
  subject?: string;
  /** Texts of the "pill" variant. */
  labels?: { save: string; saved: string };
  /** Cards are usually clickable themselves; this stops the click from reaching them. Default true. */
  stopPropagation?: boolean;
}

const PARTICLES = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  return { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 };
});

/** The presentational part: no store, no network. Use this if you manage the state yourself. */
export function BookmarkToggle({
  saved,
  pending = false,
  onToggle,
  variant = "icon",
  size = "md",
  className,
  subject,
  labels = { save: "Save", saved: "Saved" },
  stopPropagation = true,
}: BookmarkToggleProps) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(0);

  // The burst plays for ~600ms, then is removed.
  useEffect(() => {
    if (burst === 0) return;
    const timer = window.setTimeout(() => setBurst(0), 650);
    return () => window.clearTimeout(timer);
  }, [burst]);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (stopPropagation) event.stopPropagation();
    event.preventDefault(); // harmless on a plain button; stops navigation when the card is a link
    const result = onToggle();
    if (!saved && !reduce && result !== "blocked" && result !== false) setBurst((n) => n + 1);
  }

  const action = saved ? "Remove bookmark" : "Save bookmark";
  const label = subject ? `${action}: ${subject}` : action;

  return (
    <button
      type="button"
      className={["bm-save", `bm-save--${size}`, variant === "pill" ? "bm-save--pill" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={saved}
      aria-label={label}
      title={action}
      data-pending={pending ? "true" : undefined}
      onClick={handleClick}
    >
      <motion.span
        // A new key replays the pop animation each time the state flips (no exit animation, so rapid taps never queue up).
        key={saved ? "saved" : "unsaved"}
        className="bm-save__icon"
        aria-hidden="true"
        initial={reduce ? false : { scale: 0.55, rotate: saved ? -16 : 10, opacity: 0.4 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 20, mass: 0.7 }}
      >
        <Bookmark strokeWidth={2} />
      </motion.span>

      {variant === "pill" ? <span>{saved ? labels.saved : labels.save}</span> : null}

      {burst > 0 ? (
        <span className="bm-burst" aria-hidden="true" key={burst}>
          <motion.span
            className="bm-burst__ring"
            initial={{ scale: 0.7, opacity: 0.8 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          {PARTICLES.map((p, i) => (
            <motion.i
              key={i}
              className="bm-burst__dot"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.3 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}

export interface BookmarkButtonProps extends Omit<BookmarkToggleProps, "saved" | "pending" | "onToggle"> {
  kind: BookmarkKind;
  /** The object the card renders (a repo, an issue). It is stored exactly as it is. */
  item: unknown;
  /** Called with what happened: "saved", "removed" or "blocked". */
  onToggled?: (result: ToggleResult) => void;
}

/** Connected button for any card: knows if `item` is saved, and saves / removes it. */
export function BookmarkButton({ kind, item, onToggled, ...rest }: BookmarkButtonProps) {
  const { isSaved, isPending, toggle } = useBookmarks();
  return (
    <BookmarkToggle
      {...rest}
      saved={isSaved(kind, item)}
      pending={isPending(kind, item)}
      onToggle={() => {
        const result = toggle(kind, item);
        onToggled?.(result);
        return result;
      }}
    />
  );
}

export interface SavedBookmarkButtonProps extends Omit<BookmarkToggleProps, "saved" | "pending" | "onToggle"> {
  record: BookmarkRecord;
}

/** For the Bookmarks page: a button that is always "saved" and removes the record (with Undo). */
export function SavedBookmarkButton({ record, ...rest }: SavedBookmarkButtonProps) {
  const { pendingIds } = useBookmarks();
  return (
    <BookmarkToggle
      {...rest}
      saved
      pending={pendingIds.has(record.id)}
      onToggle={() => {
        removeBookmarkById(record.id);
      }}
    />
  );
}
