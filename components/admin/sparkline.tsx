"use client";

import { useId, useMemo, type CSSProperties } from "react";
import { smoothPath } from "./chart-core";

const W = 100;
const H = 40;
const PAD_Y = 5;

/**
 * The small trend line inside a stat tile. Decorative: the tile's text already carries every
 * number, so this is hidden from assistive tech. It stretches to its container (the SVG uses
 * preserveAspectRatio="none" with a non-scaling stroke), and the line brightens toward the newest
 * value, where the end dot sits. A flat series draws a flat line in the middle.
 */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const model = useMemo(() => {
    const n = values.length;
    if (n < 2) return null;
    const lo = Math.min(...values);
    const span = Math.max(...values) - lo;
    const pts = values.map((v, i) => ({
      x: (i / (n - 1)) * W,
      y: span === 0 ? H / 2 : PAD_Y + (1 - (v - lo) / span) * (H - PAD_Y * 2),
    }));
    const line = smoothPath(pts);
    return { line, area: `${line} L${W} ${H} L0 ${H} Z`, last: pts[n - 1]! };
  }, [values]);

  return (
    <div className="osa-spark" aria-hidden="true" style={{ "--c": color } as CSSProperties}>
      {model ? (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id={`${uid}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={H}>
                <stop offset="0" className="osa-stop-fill-top" />
                <stop offset="1" className="osa-stop-fill-bottom" />
              </linearGradient>
              <linearGradient id={`${uid}-line`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0">
                <stop offset="0" className="osa-stop-line-dim" />
                <stop offset="1" className="osa-stop-line-hot" />
              </linearGradient>
            </defs>
            <path d={model.area} fill={`url(#${uid}-fill)`} stroke="none" />
            <path className="osa-spark-line" d={model.line} stroke={`url(#${uid}-line)`} vectorEffect="non-scaling-stroke" />
          </svg>
          <i className="osa-spark-dot" style={{ left: `${(model.last.x / W) * 100}%`, top: `${(model.last.y / H) * 100}%` }} />
        </>
      ) : null}
    </div>
  );
}
