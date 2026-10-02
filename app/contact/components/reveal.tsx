"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Eases content in the first time it scrolls into view.
 *
 * Content is fully visible in the server HTML and stays that way without
 * JavaScript, for reduced-motion users, and for anything already on screen.
 * Only blocks that start below the fold are hidden, and only after hydration.
 * The transition is attached to the "shown" state alone, so hiding a block is
 * instant and never flashes. State lives in a data attribute, so revealing
 * never re-renders.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Milliseconds; staggers siblings that reveal together. */
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.dataset.reveal = "pending";
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.dataset.reveal = "shown";
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      delete el.dataset.reveal;
    };
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "data-[reveal=pending]:translate-y-3 data-[reveal=pending]:opacity-0",
        "data-[reveal=shown]:transition-all data-[reveal=shown]:duration-500 data-[reveal=shown]:ease-out",
        className,
      )}
    >
      {children}
    </div>
  );
}
