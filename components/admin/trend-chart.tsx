"use client";

import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { RANGE_META, type RangeKey, type StatsBucket } from "@/components/lib/admin/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { bucketTick, bucketTitle, num } from "./format";
import { useElementWidth } from "./hooks";

const PANEL = 100; // height of each panel
const GAP = 28; // between panels (holds the second label)
const TOP = 20; // room for the first label
const AXIS = 26; // x-axis labels
const HEIGHT = TOP + PANEL + GAP + PANEL + AXIS;
const HEADROOM = 14;

const UNIT: Record<RangeKey, string> = { "24h": "hour", "7d": "day", "30d": "day", "6m": "week" };

/**
 * Two series, two shapes (never hue alone): new users as columns, actions as a dashed line.
 * They share one crosshair. A live readout above the plot replaces floating tooltips, so
 * nothing clips on a phone. Pointer, touch (horizontal scrub, vertical scroll still works)
 * and keyboard (arrows, Home, End, Escape) all drive the same state. A hidden table gives
 * assistive tech the raw numbers.
 */
export function TrendChart({ buckets, range }: { buckets: StatsBucket[]; range: RangeKey }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [byKeyboard, setByKeyboard] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = buckets.length;
  const hi = hover !== null && hover < n ? hover : null;

  const sums = useMemo(
    () =>
      buckets.reduce(
        (acc, b) => ({ signups: acc.signups + b.signups, activity: acc.activity + b.activity }),
        { signups: 0, activity: 0 },
      ),
    [buckets],
  );

  const geo = useMemo(() => {
    if (!width || n === 0) return null;

    const band = width / n;
    const maxS = Math.max(1, ...buckets.map((b) => b.signups));
    const maxA = Math.max(1, ...buckets.map((b) => b.activity));
    const topA = TOP + PANEL + GAP;
    const colW = Math.max(2, Math.min(26, band * 0.62));

    const cols = buckets.map((b, i) => {
      const h = b.signups ? Math.max(3, (b.signups / maxS) * (PANEL - HEADROOM)) : 0;
      return { x: i * band + (band - colW) / 2, y: TOP + PANEL - h, w: colW, h };
    });
    const pts = buckets.map((b, i) => ({
      x: (i + 0.5) * band,
      y: topA + PANEL - (b.activity / maxA) * (PANEL - HEADROOM),
    }));

    const first = pts[0];
    const last = pts[pts.length - 1];
    if (!first || !last) return null;

    const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const area = `${line} L${last.x.toFixed(1)} ${topA + PANEL} L${first.x.toFixed(1)} ${topA + PANEL} Z`;
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(width / 72))));

    return { band, maxS, maxA, topA, cols, pts, line, area, every };
  }, [buckets, n, width]);

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const index = Math.floor(((e.clientX - box.left) / Math.max(1, box.width)) * n);
    setByKeyboard(false);
    setHover(Math.min(n - 1, Math.max(0, index)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const move = (to: (current: number | null) => number) => {
      e.preventDefault();
      setByKeyboard(true);
      setHover((current) => Math.min(n - 1, Math.max(0, to(current))));
    };
    if (e.key === "ArrowRight") move((c) => (c === null ? 0 : c + 1));
    else if (e.key === "ArrowLeft") move((c) => (c === null ? n - 1 : c - 1));
    else if (e.key === "Home") move(() => 0);
    else if (e.key === "End") move(() => n - 1);
    else if (e.key === "Escape") setHover(null);
  };

  const active = hi !== null ? buckets[hi] : undefined;
  const hoverPoint = geo && hi !== null ? geo.pts[hi] : undefined;
  const long = RANGE_META[range].long;

  return (
    <div
      ref={ref}
      className="osa-chart"
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`New users and actions per ${UNIT[range]}, last ${long}. Use the arrow keys to inspect each ${UNIT[range]}.`}
      aria-describedby={`${uid}-readout`}
      onKeyDown={onKeyDown}
      onBlur={() => byKeyboard && setHover(null)}
    >
      <p className="osa-readout" id={`${uid}-readout`} aria-live={byKeyboard ? "polite" : "off"}>
        {active ? (
          <>
            <b>{bucketTitle(active.t, range)}</b>
            <span>{num(active.signups)} new users</span>
            <span>{num(active.activity)} actions</span>
          </>
        ) : (
          <>
            <b>Last {long}</b>
            <span>{num(sums.signups)} new users</span>
            <span>{num(sums.activity)} actions</span>
          </>
        )}
      </p>

      {geo ? (
        <svg className="osa-chart-svg" width={width} height={HEIGHT} aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--osa-ink)", stopOpacity: 0.16 }} />
              <stop offset="1" style={{ stopColor: "var(--osa-ink)", stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          <text className="osa-svg-label" x={0} y={TOP - 7}>
            New users
          </text>
          <text className="osa-svg-label osa-svg-label-dim" x={width} y={TOP - 7} textAnchor="end">
            peak {num(Math.max(...buckets.map((b) => b.signups)))}
          </text>
          <text className="osa-svg-label" x={0} y={geo.topA - 7}>
            Actions
          </text>
          <text className="osa-svg-label osa-svg-label-dim" x={width} y={geo.topA - 7} textAnchor="end">
            peak {num(Math.max(...buckets.map((b) => b.activity)))}
          </text>

          <line className="osa-grid" x1={0} x2={width} y1={TOP + PANEL} y2={TOP + PANEL} />
          <line className="osa-grid" x1={0} x2={width} y1={geo.topA + PANEL} y2={geo.topA + PANEL} />
          <line className="osa-grid osa-grid-dash" x1={0} x2={width} y1={TOP + PANEL / 2} y2={TOP + PANEL / 2} />
          <line className="osa-grid osa-grid-dash" x1={0} x2={width} y1={geo.topA + PANEL / 2} y2={geo.topA + PANEL / 2} />

          {/* key={range}: the reveal replays when the person changes range, not on every sync */}
          <g key={range} className="osa-reveal">
            {geo.cols.map((col, i) =>
              col.h > 0 ? (
                <rect
                  key={buckets[i]?.t ?? i}
                  className="osa-col"
                  data-dim={hi !== null && hi !== i}
                  x={col.x}
                  y={col.y}
                  width={col.w}
                  height={col.h}
                  rx={Math.min(3, col.w / 2)}
                />
              ) : null,
            )}
            <path className="osa-area" d={geo.area} fill={`url(#${uid}-area)`} />
            <path className="osa-line" d={geo.line} />
          </g>

          {hoverPoint ? (
            <g pointerEvents="none">
              <line className="osa-cross" x1={hoverPoint.x} x2={hoverPoint.x} y1={TOP} y2={geo.topA + PANEL} />
              <circle className="osa-dot" cx={hoverPoint.x} cy={hoverPoint.y} r={4.5} />
            </g>
          ) : null}

          {buckets.map((b, i) => {
            if ((n - 1 - i) % geo.every !== 0) return null;
            const x = (i + 0.5) * geo.band;
            const anchor = x < 22 ? "start" : x > width - 22 ? "end" : "middle";
            return (
              <text
                key={b.t}
                className="osa-svg-tick"
                x={anchor === "start" ? 0 : anchor === "end" ? width : x}
                y={HEIGHT - 8}
                textAnchor={anchor}
              >
                {bucketTick(b.t, range)}
              </text>
            );
          })}

          <rect
            x={0}
            y={TOP}
            width={width}
            height={HEIGHT - TOP - AXIS}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setHover(null);
            }}
          />
        </svg>
      ) : (
        <Skeleton className="osa-skel" style={{ height: HEIGHT }} />
      )}

      <table className="osa-sr">
        <caption>
          New users and actions per {UNIT[range]}, last {long}
        </caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>New users</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.t}>
              <td>{bucketTitle(b.t, range)}</td>
              <td>{b.signups}</td>
              <td>{b.activity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
