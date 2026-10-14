"use client";

import { useId, useMemo, type CSSProperties } from "react";
import { TriangleAlert } from "lucide-react";
import type { RangeKey, UsageBucket } from "@/components/lib/admin/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { niceScale, pickTicks, useScrub, useTipPlacement } from "./chart-core";
import { PERIOD, bucketTick, bucketTitle, compact, num, tickGap } from "./format";
import { useElementWidth, useMediaQuery } from "./hooks";

/** One colour per service. The same tokens colour the KPI cards, the legend and the tooltip. */
export const USAGE_COLORS = { github: "var(--osa-github)", llm: "var(--osa-llm)" } as const;

const PAD = { l: 46, r: 14, t: 14, b: 30 };
const MAX_BAR = 24; // bars are never wider than this, however much room there is
const GAP = 2; // surface-coloured gap between the two stacked segments
const RADIUS = 4; // rounded data end; the bottom edge stays square on the baseline

/** A bar with only its top corners rounded. */
function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.max(0, Math.min(RADIUS, w / 2, h));
  return `M${x} ${y + h}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h}Z`;
}

type Segment = { key: "github" | "llm"; y: number; h: number; top: boolean };

/**
 * Calls per period, stacked: GitHub at the bottom, LLM on top. The legend sits in the card header
 * (with the totals), so this component is only the plot.
 *  - Marks: 24px at most, 4px rounded data end, square on the baseline, a 2px gap between the
 *    two segments. No stroke is drawn around a bar.
 *  - Hover: each period is a full-height target (wide enough for a thumb), the column lights up
 *    and one tooltip lists both services, failures and tokens.
 *  - The two series differ by hue AND lightness, so they stay apart for colour-blind readers
 *    without any pattern (the palette is checked in COPILOT_HANDOFF.md). Under forced colours
 *    the LLM bars switch to a hatch.
 */
export function BarsChart({ buckets, range }: { buckets: UsageBucket[]; range: RangeKey }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const n = buckets.length;
  const scrub = useScrub(n, "band", ref);
  const forced = useMediaQuery("(forced-colors: active)");
  const height = width > 0 && width < 520 ? 232 : 292;

  const geo = useMemo(() => {
    if (!width || n < 1) return null;
    const plotW = Math.max(40, width - PAD.l - PAD.r);
    const plotH = height - PAD.t - PAD.b;
    const scale = niceScale(0, Math.max(0, ...buckets.map((b) => b.github + b.llm)), true);
    const y = (v: number) => PAD.t + plotH - (v / (scale.max || 1)) * plotH;
    const base = PAD.t + plotH;
    const band = plotW / n;
    const barW = Math.max(3, Math.min(MAX_BAR, band * 0.62));

    const bars = buckets.map((b, i) => {
      const x = PAD.l + band * i + (band - barW) / 2;
      const yMid = y(b.github);
      const yTop = y(b.github + b.llm);
      const segments: Segment[] = [];
      if (b.github > 0) {
        const trim = b.llm > 0 ? GAP / 2 : 0;
        const h = Math.max(2, base - yMid - trim);
        segments.push({ key: "github", y: base - h, h, top: b.llm === 0 });
      }
      if (b.llm > 0) {
        const trim = b.github > 0 ? GAP / 2 : 0;
        const h = Math.max(2, yMid - yTop - trim);
        const bottom = b.github > 0 ? yMid - trim : base;
        segments.push({ key: "llm", y: bottom - h, h, top: true });
      }
      return { x, segments };
    });

    return {
      plotW,
      plotH,
      scale,
      y,
      base,
      band,
      barW,
      bars,
      labels: pickTicks(n, (plotW * (n - 1)) / n, tickGap(buckets.map((b) => b.t), range)),
    };
  }, [width, height, n, buckets, range]);

  const index = scrub.index;
  const current = index !== null ? buckets[index] : undefined;
  const [tipRef, tip] = useTipPlacement(
    geo && current && index !== null ? PAD.l + geo.band * (index + 0.5) : null,
    width,
    `${index}|${current?.github}|${current?.llm}|${current?.errors}|${current?.tokens}`,
  );

  return (
    <div
      ref={ref}
      className="osa-chart"
      tabIndex={0}
      role="group"
      aria-roledescription="chart"
      aria-label={`GitHub and LLM calls per ${PERIOD[range]}. Use the arrow keys to inspect each ${PERIOD[range]}.`}
      onKeyDown={scrub.onKeyDown}
      onBlur={scrub.onBlur}
    >
      {geo ? (
        <svg className="osa-chart-svg" width={width} height={height} aria-hidden="true" focusable="false">
          <defs>
            {(["github", "llm"] as const).map((key) => (
              <linearGradient key={key} id={`${uid}-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" className={`osa-stop-${key}-top`} />
                <stop offset="1" className={`osa-stop-${key}`} />
              </linearGradient>
            ))}
            <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" className="osa-hatch-bg" />
              <rect width="2.5" height="6" className="osa-hatch-ink" />
            </pattern>
          </defs>

          {geo.scale.ticks.map((tick) => {
            const y = geo.y(tick);
            return (
              <g key={tick}>
                <line className={tick === 0 ? "osa-grid osa-grid-base" : "osa-grid"} x1={PAD.l} x2={width - PAD.r} y1={y} y2={y} />
                <text className="osa-svg-tick" x={PAD.l - 10} y={y + 4} textAnchor="end">
                  {compact(tick)}
                </text>
              </g>
            );
          })}

          {index !== null ? (
            <rect className="osa-band" x={PAD.l + geo.band * index} y={PAD.t} width={geo.band} height={geo.plotH} rx={6} />
          ) : null}

          <g key={range}>
            {geo.bars.map((bar, i) => (
              <g
                key={buckets[i]?.t ?? i}
                className="osa-bar"
                data-dim={index !== null && index !== i}
                style={{ "--i": i } as CSSProperties}
              >
                {bar.segments.map((seg) => {
                  const d = seg.top
                    ? roundedTop(bar.x, seg.y, geo.barW, seg.h)
                    : `M${bar.x} ${seg.y}H${bar.x + geo.barW}V${seg.y + seg.h}H${bar.x}Z`;
                  const paint = forced && seg.key === "llm" ? `${uid}-hatch` : `${uid}-${seg.key}`;
                  return <path key={seg.key} className="osa-seg-fill" data-service={seg.key} d={d} fill={`url(#${paint})`} />;
                })}
              </g>
            ))}
          </g>

          {geo.labels.map((i) => {
            const centre = PAD.l + geo.band * i + geo.band / 2;
            const last = i === n - 1;
            return (
              <text key={buckets[i]!.t} className="osa-svg-tick" x={last ? centre + 6 : centre} y={height - 8} textAnchor={last ? "end" : "middle"}>
                {bucketTick(buckets[i]!.t, range)}
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

      {geo && current && index !== null ? (
        <div ref={tipRef} className="osa-tip" data-side={tip.side} style={{ left: tip.left, top: PAD.t + 6 }} aria-live={scrub.byKeyboard ? "polite" : "off"}>
          <p className="osa-tip-title">{bucketTitle(current.t, range)}</p>
          <p className="osa-tip-row">
            <i className="osa-tip-key" style={{ background: USAGE_COLORS.github }} aria-hidden="true" />
            <b>{num(current.github)}</b>
            <span>GitHub calls</span>
          </p>
          <p className="osa-tip-row">
            <i className="osa-tip-key" style={{ background: USAGE_COLORS.llm }} aria-hidden="true" />
            <b>{num(current.llm)}</b>
            <span>LLM calls</span>
          </p>
          {current.errors > 0 ? (
            <p className="osa-tip-detail" data-tone="alert">
              <TriangleAlert size={13} aria-hidden="true" />
              {num(current.errors)} failed
            </p>
          ) : null}
          {current.tokens > 0 ? <p className="osa-tip-detail">{compact(current.tokens)} tokens</p> : null}
        </div>
      ) : null}

      <table className="osa-sr">
        <caption>GitHub and LLM calls per {PERIOD[range]}</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>GitHub calls</th>
            <th>LLM calls</th>
            <th>Failed</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.t}>
              <td>{bucketTitle(b.t, range)}</td>
              <td>{b.github}</td>
              <td>{b.llm}</td>
              <td>{b.errors}</td>
              <td>{b.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
