"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

/** SSR-safe media query. Returns false on the server and the first client render. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useMemo(
    () => (notify: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", notify);
      return () => list.removeEventListener("change", notify);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** One shared clock for relative times. Re-renders its consumer every `intervalMs`. */
export function useNow(intervalMs = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Animates a number toward `target` (ease-out cubic). When `disabled` (reduced motion) or
 * the first value arrives with nothing to animate from, it jumps straight to the target.
 */
export function useCountUp(target: number | undefined, disabled: boolean, ms = 650): number | undefined {
  const [value, setValue] = useState<number | undefined>(target);
  const from = useRef(0);

  useEffect(() => {
    if (target === undefined) {
      setValue(undefined);
      return;
    }
    if (disabled || from.current === target) {
      from.current = target;
      setValue(target);
      return;
    }

    const begin = from.current;
    let startedAt: number | null = null;
    let frame = 0;

    const step = (now: number) => {
      // Start the clock on the first frame so start and progress share one time source.
      if (startedAt === null) startedAt = now;
      const progress = Math.min(1, (now - startedAt) / ms);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(begin + (target - begin) * eased);
      from.current = next;
      setValue(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, disabled, ms]);

  return value;
}

/** Width of an element in CSS pixels, kept current by a ResizeObserver. 0 until measured. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** True while the element is on screen. Used to pause animation that nobody can see. */
export function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInView(entry.isIntersecting);
    }, { threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView] as const;
}
