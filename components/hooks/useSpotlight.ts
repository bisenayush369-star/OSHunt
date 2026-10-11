"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

/**
 * The soft "light follows the cursor" glow on cards. It only sets two CSS variables (--mx / --my);
 * the CSS draws the glow. Mouse only (touch and pen are ignored) and at most once per frame.
 */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const frame = useRef<number>(0);

  const setRef = useCallback((node: T | null) => {
    ref.current = node;
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - rect.left}px`);
      el.style.setProperty("--my", `${clientY - rect.top}px`);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { ref: setRef, onPointerMove };
}
