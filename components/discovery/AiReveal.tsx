"use client";

import { useEffect, useState } from "react";

interface AiRevealProps {
  text?: string;
}

export function AiReveal({ text }: AiRevealProps) {
  const [shown, setShown] = useState("");

  useEffect(() => {
    let resetId: number | undefined;

    if (!text) {
      resetId = window.setTimeout(() => setShown(""), 0);
      return () => {
        if (resetId) window.clearTimeout(resetId);
      };
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resetId = window.setTimeout(() => setShown(""), 0);

    if (reduce) {
      resetId = window.setTimeout(() => setShown(text), 0);
      return () => {
        if (resetId) window.clearTimeout(resetId);
      };
    }

    const intervalId = window.setInterval(() => {
      setShown((prev) => {
        const nextLength = Math.min(text.length, prev.length + 3);
        const next = text.slice(0, nextLength);
        if (nextLength >= text.length) {
          window.clearInterval(intervalId);
        }
        return next;
      });
    }, 12);

    return () => {
      window.clearInterval(intervalId);
      if (resetId) window.clearTimeout(resetId);
    };
  }, [text]);

  const done = !text || shown.length >= (text?.length ?? 0);
  return (
    <span aria-live="polite" aria-busy={!done}>
      {shown}
      {!done && <span className="reveal-cursor" />}
    </span>
  );
}
