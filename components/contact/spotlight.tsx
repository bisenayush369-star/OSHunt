"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Spotlight({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const onMove = (event: MouseEvent) => {
      const rect = node.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      node.style.setProperty("--mx", `${x}px`);
      node.style.setProperty("--my", `${y}px`);
    };

    node.addEventListener("pointermove", onMove);
    return () => node.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#0a0a0a]/90",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,50%),rgba(168,255,62,0.18),transparent_30%)] before:opacity-0 before:transition-opacity before:duration-300 before:content-[''] group-hover:before:opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
