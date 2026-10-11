"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import {
  dismissToast,
  getServerToasts,
  getToasts,
  registerToaster,
  subscribeToasts,
  type ToastItem,
} from "@/components/lib/bookmarks/toast";
import "./bookmarks.css";

/**
 * Renders the toasts. Put <BookmarkToaster /> ONCE in your root layout (app/layout.tsx), inside <body>.
 *
 *  - Bottom-right on desktop, full-width at the bottom on phones (respects the iOS home bar).
 *  - The timer pauses while a toast is hovered or has keyboard focus.
 *  - Errors are announced immediately to screen readers; other messages politely.
 */

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info } as const;

function ToastCard({ item, reduce }: { item: ToastItem; reduce: boolean }) {
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const startedAt = useRef(0);
  const Icon = ICONS[item.tone];

  // Count down, but stop the clock while the toast is paused. Remember how much time was left.
  useEffect(() => {
    if (paused) return;
    startedAt.current = performance.now();
    const timer = window.setTimeout(() => dismissToast(item.id), Math.max(0, remaining.current));
    return () => {
      window.clearTimeout(timer);
      remaining.current -= performance.now() - startedAt.current;
    };
  }, [paused, item.id]);

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
  }

  const action = item.action;

  return (
    <motion.div
      layout={reduce ? false : "position"}
      className="bm-toast"
      data-tone={item.tone}
      role={item.tone === "error" ? "alert" : "status"}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={onBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") dismissToast(item.id);
      }}
    >
      <span className="bm-toast__icon" aria-hidden="true">
        <Icon strokeWidth={2} />
      </span>

      <div className="bm-toast__body">
        <p className="bm-toast__message">{item.message}</p>
        {item.description ? <p className="bm-toast__desc">{item.description}</p> : null}
        {action?.href ? (
          <Link href={action.href} className="bm-toast__action" onClick={() => dismissToast(item.id)}>
            {action.label}
          </Link>
        ) : action ? (
          <button
            type="button"
            className="bm-toast__action"
            onClick={() => {
              action.onClick?.();
              dismissToast(item.id);
            }}
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <button type="button" className="bm-toast__close" aria-label="Dismiss notification" onClick={() => dismissToast(item.id)}>
        <X strokeWidth={2} />
      </button>

      <span
        className="bm-toast__bar"
        aria-hidden="true"
        style={{ animationDuration: `${item.duration}ms`, animationPlayState: paused ? "paused" : "running" }}
      />
    </motion.div>
  );
}

export function BookmarkToaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => registerToaster(), []);

  return (
    <div className="bm-toaster" role="region" aria-label="Notifications">
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} reduce={reduce} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export default BookmarkToaster;
