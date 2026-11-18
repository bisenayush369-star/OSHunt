"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Small browser-state hooks, all built on useSyncExternalStore: the browser is the source of truth, React only
 * subscribes. Each has a server value, so nothing time- or browser-dependent renders during SSR (no hydration
 * mismatch); the real value arrives right after hydration.
 */

/* ── A clock that ticks every `ms` ───────────────────────────────────────── */

type Clock = { value: number; listeners: Set<() => void>; timer: number | undefined };
const clocks = new Map<number, Clock>();

function clockFor(ms: number): Clock {
  let clock = clocks.get(ms);
  if (!clock) {
    clock = { value: 0, listeners: new Set(), timer: undefined };
    clocks.set(ms, clock);
  }
  return clock;
}

/**
 * The current time, refreshed every `ms`. 0 on the server and on the first client render. Anything that shows
 * "5 min ago" only renders once data has arrived, which is always after that first tick.
 */
export function useNow(ms = 15_000): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const clock = clockFor(ms);
      clock.listeners.add(onChange);
      if (clock.listeners.size === 1) {
        clock.value = Date.now();
        clock.timer = window.setInterval(() => {
          clock.value = Date.now();
          clock.listeners.forEach((listener) => listener());
        }, ms);
      }
      return () => {
        clock.listeners.delete(onChange);
        if (clock.listeners.size === 0) {
          window.clearInterval(clock.timer);
          clock.timer = undefined;
        }
      };
    },
    [ms],
  );
  return useSyncExternalStore(subscribe, () => clockFor(ms).value, () => 0);
}

/* ── matchMedia ──────────────────────────────────────────────────────────── */

/** A media query as a boolean. `fallback` is what the server and the first client render use. */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => fallback);
}

/* ── Tab visibility and connectivity ─────────────────────────────────────── */

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/** Is the tab visible right now? Polling pauses while it is hidden. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== "hidden", () => true);
}

const subscribeOnline = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/** Browser online/offline. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/* ── A remembered choice ─────────────────────────────────────────────────── */

// localStorage can be blocked (private windows, strict settings). `memory` keeps the choice working for this tab anyway.
const memory = new Map<string, string>();
const storedListeners = new Set<() => void>();

function readStored(key: string): string | null {
  const remembered = memory.get(key);
  if (remembered !== undefined) return remembered;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribeStored(onChange: () => void) {
  storedListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    storedListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Remembers a small per-viewer convenience (the chart range) in localStorage. Nothing depends on it working. */
export function useStoredState<T extends string>(key: string, initial: T, allowed?: readonly T[]): readonly [T, (next: T) => void] {
  const raw = useSyncExternalStore(subscribeStored, () => readStored(key), () => null);
  const value = raw !== null && (!allowed || (allowed as readonly string[]).includes(raw)) ? (raw as T) : initial;

  const update = useCallback(
    (next: T) => {
      memory.set(key, next);
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* blocked: the in-memory copy above still applies */
      }
      storedListeners.forEach((listener) => listener());
    },
    [key],
  );

  return [value, update] as const;
}
