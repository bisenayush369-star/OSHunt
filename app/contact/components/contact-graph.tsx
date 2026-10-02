"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The signature of the page: a GitHub-style contribution graph in the form
 * header. The pattern is decoration only. It shows no numbers and claims
 * nothing. One cell, at the right end, is live and belongs to the visitor:
 * it gains a level for every required field they complete, and when the
 * message is sent it reaches full strength and a pulse ripples back through
 * the graph.
 */

const COLUMNS = 44;
const ROWS = 7;
const LIVE_ROW = 3;
const MAX_LEVEL = 4;

/* ---------------------------------------------------------------------- */
/* Progress: a tiny external store so the form can drive the live cell.    */
/* ---------------------------------------------------------------------- */

let progress = 0;
const listeners = new Set<() => void>();

/** 0–3 = required fields completed, 4 = message sent. */
export function setContactProgress(next: number) {
  const level = Math.max(0, Math.min(MAX_LEVEL, Math.round(next)));
  if (level === progress) return;
  progress = level;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useContactProgress() {
  return React.useSyncExternalStore(
    subscribe,
    () => progress,
    () => 0,
  );
}

/* ---------------------------------------------------------------------- */
/* Decorative pattern. Seeded, so server and client render the same cells. */
/* ---------------------------------------------------------------------- */

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CELLS: number[][] = (() => {
  const rand = mulberry32(0x050a17);
  let busy = 0.35;
  return Array.from({ length: COLUMNS }, (_, column) => {
    // Weeks come in busy and quiet streaks, like a real graph.
    busy = Math.min(0.85, Math.max(0.08, busy + (rand() - 0.5) * 0.5));
    return Array.from({ length: ROWS }, (_, row) => {
      // The last column stays empty so the live cell reads as the visitor's.
      if (column === COLUMNS - 1) return 0;
      const weekend = row === 0 || row === ROWS - 1;
      if (rand() >= busy * (weekend ? 0.45 : 1)) return 0;
      return 1 + Math.floor(rand() ** 1.6 * 4);
    });
  });
})();

const LEVEL_CLASS = [
  "bg-foreground/[0.07]",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
] as const;

const CELL = "size-2.5 rounded-[3px] sm:size-3";

/* ---------------------------------------------------------------------- */
/* Motion: one moment, played once when the message is sent.               */
/* ---------------------------------------------------------------------- */

function playCommit(root: HTMLElement) {
  if (typeof root.animate !== "function") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const left = root.getBoundingClientRect().left;
  const columns = Array.from(root.querySelectorAll<HTMLElement>("[data-col]"));
  const last = columns.length - 1;

  columns.forEach((column, index) => {
    if (column.getBoundingClientRect().right < left) return; // cropped out of view
    const delay = (last - index) * 22;
    for (const cell of Array.from(column.children) as HTMLElement[]) {
      if (cell.hasAttribute("data-live")) continue;
      const resting = getComputedStyle(cell).backgroundColor;
      cell.animate(
        [{ backgroundColor: "currentColor" }, { backgroundColor: resting }],
        { duration: 600, delay, easing: "ease-out" },
      );
    }
  });

  root.querySelector<HTMLElement>("[data-ping]")?.animate(
    [
      { transform: "scale(1)", opacity: 0.9 },
      { transform: "scale(2.4)", opacity: 0 },
    ],
    { duration: 900, easing: "ease-out" },
  );
}

export function ContactGraph({ className }: { className?: string }) {
  const level = useContactProgress();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const previous = React.useRef(level);

  React.useEffect(() => {
    if (previous.current !== MAX_LEVEL && level === MAX_LEVEL && rootRef.current) {
      playCommit(rootRef.current);
    }
    previous.current = level;
  }, [level]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        "relative flex justify-end overflow-hidden py-2 pr-2 text-primary",
        "[mask-image:linear-gradient(to_right,transparent,black_20%)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_20%)]",
        className,
      )}
    >
      <div className="flex shrink-0 gap-[3px]">
        {CELLS.map((column, c) => (
          <div key={c} data-col className="flex flex-col gap-[3px]">
            {column.map((cellLevel, r) => {
              if (c === COLUMNS - 1 && r === LIVE_ROW) {
                return (
                  <div
                    key={r}
                    data-live
                    data-level={level}
                    className={cn(
                      CELL,
                      LEVEL_CLASS[level],
                      "relative ring-1 ring-primary/80 transition-colors duration-300 motion-reduce:transition-none",
                    )}
                  >
                    <span
                      data-ping
                      className="pointer-events-none absolute inset-0 rounded-[3px] border border-current opacity-0"
                    />
                  </div>
                );
              }
              return <div key={r} className={cn(CELL, LEVEL_CLASS[cellLevel])} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
