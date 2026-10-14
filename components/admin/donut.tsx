"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { num, percent } from "./format";

const SIZE = 140;
const R = 54;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * R;
const GAP = 3; // surface gap between slices, in viewBox units

export type DonutSlice = { key: string; label: string; value: number; color: string };

/** A line in the legend that is NOT drawn on the ring (for example "Free"). */
export type DonutRow = { key: string; label: string; value: number };

/**
 * Part-to-whole for a handful of paid plans (five at most; the caller folds the rest into
 * "Other"). The ring splits the PAID users between plans, the centre shows the share of ALL users
 * who pay, and the legend lists every row with its count and its share of all users, so the
 * numbers are always readable without the colours. Hover or focus a legend row (or a slice) and
 * the centre switches to that plan.
 */
export function Donut({
  slices,
  rows = [],
  totalUsers,
  centerValue,
  centerLabel,
}: {
  slices: DonutSlice[];
  rows?: DonutRow[];
  /** Everyone, paid or not. The legend percentages are shares of this. */
  totalUsers: number;
  centerValue: string;
  centerLabel: string;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const paid = slices.reduce((sum, s) => sum + s.value, 0);

  const arcs = useMemo(() => {
    let offset = 0;
    const gap = slices.length > 1 ? GAP : 0;
    return slices.map((s) => {
      const share = paid > 0 ? s.value / paid : 0;
      const span = share * CIRCUMFERENCE;
      const arc = { len: Math.max(1.5, span - gap), offset };
      offset += span;
      return arc;
    });
  }, [slices, paid]);

  const active = hi !== null ? slices[hi] : undefined;

  return (
    <div className="osa-donut">
      <div className="osa-donut-ring">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${centerValue} ${centerLabel}`} focusable="false">
          <circle className="osa-donut-track" cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE} />
          {slices.map((s, i) => (
            <circle
              key={s.key}
              className="osa-donut-arc"
              data-dim={hi !== null && hi !== i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              strokeWidth={STROKE}
              style={
                {
                  stroke: s.color,
                  strokeDashoffset: -(arcs[i]?.offset ?? 0),
                  "--len": arcs[i]?.len ?? 0,
                  "--c": CIRCUMFERENCE,
                  "--k": i,
                } as CSSProperties
              }
              onPointerEnter={() => setHi(i)}
              onPointerLeave={() => setHi(null)}
            />
          ))}
        </svg>
        <div className="osa-donut-center" aria-hidden="true">
          <b>{active ? num(active.value) : centerValue}</b>
          <span>{active ? active.label : centerLabel}</span>
        </div>
      </div>

      <ul className="osa-legend-list" aria-label="Plans">
        {slices.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className="osa-legend-row"
              data-on={hi === i}
              onPointerEnter={() => setHi(i)}
              onPointerLeave={() => setHi(null)}
              onFocus={() => setHi(i)}
              onBlur={() => setHi(null)}
            >
              <i className="osa-swatch" style={{ background: s.color }} aria-hidden="true" />
              <span className="osa-legend-name">{s.label}</span>
              <b>{num(s.value)}</b>
              <span className="osa-legend-share">{percent(s.value, totalUsers)}</span>
            </button>
          </li>
        ))}
        {rows.map((row) => (
          <li key={row.key}>
            <div className="osa-legend-row" data-plain="true">
              <i className="osa-swatch osa-swatch-hollow" aria-hidden="true" />
              <span className="osa-legend-name">{row.label}</span>
              <b>{num(row.value)}</b>
              <span className="osa-legend-share">{percent(row.value, totalUsers)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
