"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

/**
 * Shared chart maths and interaction. No chart library: the maths here is small, the output is
 * plain SVG, and everything is covered by tests.
 */

export type Pt = { x: number; y: number };

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * Smooth line through the points: monotone cubic interpolation (Fritsch-Carlson, the same idea
 * as d3's curveMonotoneX). Unlike a plain spline it never overshoots, so a running total never
 * dips below a flat stretch and a count never goes negative between two points.
 */
export function smoothPath(pts: readonly Pt[]): string {
  const n = pts.length;
  const first = pts[0];
  if (!first) return "";
  if (n === 1) return `M${f(first.x)} ${f(first.y)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const run = b.x - a.x || 1e-6;
    dx.push(run);
    slope.push((b.y - a.y) / run);
  }

  const tangent: number[] = new Array<number>(n).fill(0);
  tangent[0] = slope[0]!;
  tangent[n - 1] = slope[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    const before = slope[i - 1]!;
    const after = slope[i]!;
    tangent[i] = before * after <= 0 ? 0 : (before + after) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    const m = slope[i]!;
    if (m === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i]! / m;
    const b = tangent[i + 1]! / m;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      tangent[i] = k * a * m;
      tangent[i + 1] = k * b * m;
    }
  }

  let d = `M${f(first.x)} ${f(first.y)}`;
  for (let i = 0; i < n - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const h = dx[i]! / 3;
    d += ` C${f(a.x + h)} ${f(a.y + tangent[i]! * h)} ${f(b.x - h)} ${f(b.y - tangent[i + 1]! * h)} ${f(b.x)} ${f(b.y)}`;
  }
  return d;
}

const NICE = [1, 2, 5, 10];

function niceStep(raw: number): number {
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const fraction = raw / power;
  return (NICE.find((s) => fraction <= s + 1e-9) ?? 10) * power;
}

export type Scale = { min: number; max: number; step: number; ticks: number[] };

/**
 * Axis for whole-number data (counts). `zero` pins the baseline at 0; otherwise the axis hugs
 * the data, which is what a running total needs, since a total that starts at 12,000 would
 * otherwise draw as a flat line. Ticks land on round numbers.
 */
export function niceScale(lo: number, hi: number, zero: boolean, target = 4): Scale {
  let min = zero ? 0 : Math.min(lo, hi);
  let max = Math.max(lo, hi);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (max === min) {
    if (zero) {
      max = Math.max(4, max * 1.25); // all zeros -> 0..4, a flat 7 -> 0..8.75
    } else {
      const pad = Math.max(2, Math.abs(min) * 0.04); // a flat total sits in the middle, not on an edge
      min -= pad;
      max += pad;
    }
  }

  const step = Math.max(1, niceStep((max - min) / target));
  const start = zero ? 0 : Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 1e6; v += step) ticks.push(Math.round(v));
  return { min: start, max: end === start ? start + step : end, step, ticks };
}

/**
 * Which x labels to draw: every `every`-th, counted back from the newest point so the "now" end
 * is always labelled, and wide enough apart (minGap px) that neighbours never touch.
 */
export function pickTicks(n: number, plotWidth: number, minGap: number): number[] {
  if (n <= 0) return [];
  const per = n > 1 ? plotWidth / (n - 1) : plotWidth;
  const every = Math.max(1, Math.ceil(minGap / Math.max(1, per)));
  const out: number[] = [];
  for (let i = 0; i < n; i++) if ((n - 1 - i) % every === 0) out.push(i);
  return out;
}

/**
 * Pointer, touch and keyboard all drive one "current index".
 *  - "point": the plot spans first point to last point (line / area charts).
 *  - "band": the plot is n equal columns (bar charts).
 * The pointer handlers go on a transparent rect that covers the plot. Give that rect
 * `touch-action: pan-y` so a finger can scrub sideways while the page still scrolls.
 */
export function useScrub(n: number, mode: "point" | "band", root?: RefObject<HTMLElement | null>) {
  const [raw, setRaw] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);
  const index = raw !== null && raw < n ? raw : null;

  // A mouse clears its reading when it leaves, a keyboard when focus leaves, but a finger never
  // "leaves". So a touch (or click) anywhere outside the chart puts the reading away.
  useEffect(() => {
    if (raw === null || byKeyboard || !root) return;
    const away = (e: Event) => {
      if (!root.current?.contains(e.target as Node)) setRaw(null);
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [raw, byKeyboard, root]);

  const fromPointer = useCallback(
    (e: PointerEvent<Element>) => {
      const box = e.currentTarget.getBoundingClientRect();
      const t = (e.clientX - box.left) / Math.max(1, box.width);
      const i = mode === "point" ? Math.round(t * (n - 1)) : Math.floor(t * n);
      setByKeyboard(false);
      setRaw(Math.min(n - 1, Math.max(0, i)));
    },
    [mode, n],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const go = (next: (current: number | null) => number) => {
        e.preventDefault();
        setByKeyboard(true);
        setRaw((current) => Math.min(n - 1, Math.max(0, next(current))));
      };
      if (e.key === "ArrowRight") go((c) => (c === null ? 0 : c + 1));
      else if (e.key === "ArrowLeft") go((c) => (c === null ? n - 1 : c - 1));
      else if (e.key === "Home") go(() => 0);
      else if (e.key === "End") go(() => n - 1);
      else if (e.key === "Escape") setRaw(null);
    },
    [n],
  );

  return {
    index,
    byKeyboard,
    pointer: {
      onPointerMove: fromPointer,
      onPointerDown: fromPointer,
      onPointerLeave: (e: PointerEvent<Element>) => {
        if (e.pointerType === "mouse") setRaw(null);
      },
    },
    onKeyDown,
    onBlur: () => {
      if (byKeyboard) setRaw(null);
    },
    clear: () => setRaw(null),
  };
}

const TIP_GAP = 14; // pointer to tooltip
const TIP_EDGE = 4; // tooltip to the edge of the chart

/**
 * Where a tooltip goes, decided from its REAL width so it never leaves the chart.
 * It opens to the right of the pointer when it fits, otherwise to the left; when neither side has
 * room (a narrow phone chart) it takes the roomier side and slides in until it fits. The
 * measurement happens in a layout effect, so the corrected position is applied before the browser
 * paints and the tooltip never flashes in the wrong place. `contentKey` is any string that changes
 * when the tooltip's text changes (the active index and its values).
 */
export function useTipPlacement(anchorX: number | null, chartWidth: number, contentKey: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<{ left: number; side: "left" | "right" }>({ left: 0, side: "right" });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || anchorX === null) return;
    const w = el.offsetWidth;
    const right = anchorX + TIP_GAP;
    const left = anchorX - TIP_GAP - w;
    const side: "left" | "right" =
      right + w <= chartWidth - TIP_EDGE ? "right" : left >= TIP_EDGE ? "left" : anchorX > chartWidth / 2 ? "left" : "right";
    const wanted = side === "right" ? right : left;
    const fitted = Math.max(TIP_EDGE, Math.min(wanted, chartWidth - w - TIP_EDGE));
    setPlace((cur) => (cur.left === fitted && cur.side === side ? cur : { left: fitted, side }));
    // contentKey changes whenever the text inside the tooltip (and so its width) can change.
  }, [anchorX, chartWidth, contentKey]);

  return [ref, place] as const;
}
