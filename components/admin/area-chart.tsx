"use client";

import { useId, useMemo } from "react";
import type { RangeKey } from "@/components/lib/admin/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { niceScale, pickTicks, smoothPath, useScrub, useTipPlacement } from "./chart-core";
import { PERIOD, bucketTick, bucketTitle, compact, num, tickGap } from "./format";
import { useElementWidth } from "./hooks";

const PAD = { l: 46, r: 14, t: 14, b: 30 };

type Props = {
  /** Identifies the series. The draw-in animation replays when this or the range changes. */
  id: string;
  times: number[];
  values: number[];
  range: RangeKey;
  /** A CSS colour for the series, normally a token such as "var(--osa-signal)". */
  color: string;
  /** What the numbers are ("Total users"). Used by the tooltip and by screen readers. */
  label: string;
  /** Pin the baseline at 0 (counts per period). Off for running totals, so growth is visible. */
  zero: boolean;
  /** Optional second tooltip line for one point, e.g. "+12 new in this period". */
  detail?: (index: number) => string | null;
};

/**
 * One series as a smooth line over a faint wash, with a crosshair and a tooltip.
 *  - Pointer, touch (sideways scrub, vertical scroll still works) and keyboard (arrow keys,
 *    Home, End, Escape) all drive the same "current point".
 *  - Every value the tooltip shows is also in the hidden table at the bottom, so nothing is
 *    available only on hover.
 *  - Marks follow the house spec: 2px line, ~10% wash, solid hairline grid, 8px end dot with a
 *    2px surface ring.
 */
export function AreaChart({ id, times, values, range, color, label, zero, detail }: Props) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = Math.min(times.length, values.length);
  const scrub = useScrub(n, "point", ref);
  const height = width > 0 && width < 520 ? 232 : 292;

  const geo = useMemo(() => {
    if (!width || n < 2) return null;
    const plotW = Math.max(40, width - PAD.l - PAD.r);
    const plotH = height - PAD.t - PAD.b;
    const used = values.slice(0, n);
    const scale = niceScale(Math.min(...used), Math.max(...used), zero);
    const span = scale.max - scale.min || 1;
    const y = (v: number) => PAD.t + plotH - ((v - scale.min) / span) * plotH;
    const pts = used.map((v, i) => ({ x: PAD.l + (i / (n - 1)) * plotW, y: y(v) }));
    const line = smoothPath(pts);
    const base = PAD.t + plotH;
    const first = pts[0]!;
    const last = pts[n - 1]!;
    return {
      plotW,
      plotH,
      scale,
      pts,
      line,
      base,
      y,
      area: `${line} L${last.x} ${base} L${first.x} ${base} Z`,
      labels: pickTicks(n, plotW, tickGap(times.slice(0, n), range)),
    };
  }, [width, height, n, values, times, zero, range]);

  const index = scrub.index;
  const active = geo && index !== null ? geo.pts[index] : undefined;
  const extra = index !== null && detail ? detail(index) : null;
  const [tipRef, tip] = useTipPlacement(active ? active.x : null, width, `${index}|${index !== null ? values[index] : ""}|${extra ?? ""}`);

  return (
    <div
      ref={ref}
      className="osa-chart"
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`${label} per ${PERIOD[range]}. Use the arrow keys to inspect each ${PERIOD[range]}.`}
      onKeyDown={scrub.onKeyDown}
      onBlur={scrub.onBlur}
    >
      {geo ? (
        <svg className="osa-chart-svg" width={width} height={height} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`${uid}-fill`} gradientUnits="userSpaceOnUse" x1="0" y1={PAD.t} x2="0" y2={geo.base}>
              <stop offset="0" style={{ stopColor: color, stopOpacity: 0.2 }} />
              <stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {geo.scale.ticks.map((tick) => {
            const y = geo.y(tick);
            return (
              <g key={tick}>
                <line className={tick === geo.scale.min ? "osa-grid osa-grid-base" : "osa-grid"} x1={PAD.l} x2={width - PAD.r} y1={y} y2={y} />
                <text className="osa-svg-tick" x={PAD.l - 10} y={y + 4} textAnchor="end">
                  {compact(tick)}
                </text>
              </g>
            );
          })}

          <g key={`${id}:${range}`} className="osa-reveal">
            <path d={geo.area} fill={`url(#${uid}-fill)`} stroke="none" />
            <path className="osa-series-line" d={geo.line} style={{ stroke: color }} />
          </g>

          {geo.pts.length > 0 ? (
            <g pointerEvents="none">
              <circle className="osa-end-halo" cx={geo.pts[n - 1]!.x} cy={geo.pts[n - 1]!.y} r={5} style={{ fill: color }} />
              <circle className="osa-dot" cx={geo.pts[n - 1]!.x} cy={geo.pts[n - 1]!.y} r={5} style={{ fill: color }} />
            </g>
          ) : null}

          {active ? (
            <g pointerEvents="none">
              <line className="osa-cross" x1={active.x} x2={active.x} y1={PAD.t} y2={geo.base} />
              <circle className="osa-dot" cx={active.x} cy={active.y} r={6} style={{ fill: color }} />
            </g>
          ) : null}

          {geo.labels.map((i) => {
            const point = geo.pts[i]!;
            const last = i === n - 1;
            return (
              <text
                key={times[i]}
                className="osa-svg-tick"
                x={last ? point.x + 6 : point.x}
                y={height - 8}
                textAnchor={last ? "end" : "middle"}
              >
                {bucketTick(times[i]!, range)}
              </text>
            );
          })}

          <rect
            x={PAD.l}
            y={PAD.t}
            width={geo.plotW}
            height={geo.plotH}
            fill="transparent"
            style={{ touchAction: "pan-y" }}
            {...scrub.pointer}
          />
        </svg>
      ) : (
        <Skeleton className="osa-skel" style={{ height }} />
      )}

      {active && index !== null ? (
        <div
          ref={tipRef}
          className="osa-tip"
          data-side={tip.side}
          style={{ left: tip.left, top: PAD.t + 6 }}
          aria-live={scrub.byKeyboard ? "polite" : "off"}
        >
          <p className="osa-tip-title">{bucketTitle(times[index]!, range)}</p>
          <p className="osa-tip-row">
            <i className="osa-tip-key" style={{ background: color }} aria-hidden="true" />
            <b>{num(values[index]!)}</b>
            <span>{label}</span>
          </p>
          {extra ? <p className="osa-tip-detail">{extra}</p> : null}
        </div>
      ) : null}

      <table className="osa-sr">
        <caption>
          {label} per {PERIOD[range]}
        </caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>{label}</th>
          </tr>
        </thead>
        <tbody>
          {times.slice(0, n).map((t, i) => (
            <tr key={t}>
              <td>{bucketTitle(t, range)}</td>
              <td>{values[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
