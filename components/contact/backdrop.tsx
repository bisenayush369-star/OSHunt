"use client";

export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] overflow-hidden">
      <div className="oh-glow absolute inset-0 opacity-90" />
      <div className="oh-backdrop absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,255,62,0.11),transparent_38%),linear-gradient(to_bottom,rgba(168,255,62,0.04),transparent_55%)]" />
    </div>
  );
}
