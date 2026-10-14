"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import type { RecentEvent } from "@/components/lib/admin/contract";
import { ago, hash32, humanize, spanLabel } from "./format";
import { useInView, usePrefersReducedMotion } from "./hooks";

const R_MIN = 9;
const R_MAX = 44;
const RINGS = 4;

type Blip = RecentEvent & { x: number; y: number };

/** Dots that arrived since the previous sync, for a one-off ripple. Reset when the range changes. */
function useFreshIds(events: RecentEvent[], resetKey: string) {
  const seen = useRef<Set<string> | null>(null);
  const key = useRef(resetKey);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const ids = new Set(events.map((e) => e.id));

    if (seen.current === null || key.current !== resetKey) {
      key.current = resetKey;
      seen.current = ids;
      setFresh((prev) => (prev.size ? new Set() : prev));
      return;
    }

    const added = [...ids].filter((id) => !seen.current?.has(id));
    seen.current = ids;
    if (added.length === 0) return;

    setFresh(new Set(added));
    const timer = setTimeout(() => setFresh(new Set()), 1800);
    return () => clearTimeout(timer);
  }, [events, resetKey]);

  return fresh;
}

/**
 * HOW TO READ IT
 *  - One dot per recent action. Bearing (angle) is a stable hash of the user, so one
 *    person's actions line up along one spoke. Distance from the centre is age (square-root
 *    scale, so fresh actions do not pile up). Blocked accounts are hollow and red.
 *  - The sweep is CSS only. A masked, rotating layer reveals a bright copy of the dots,
 *    and a counter-rotating child keeps that copy still, so dots light as the beam passes
 *    without any per-dot timing code and without drifting out of sync when data refreshes.
 *  - It pauses when scrolled out of view or on request, and it renders a static snapshot
 *    when the person prefers reduced motion. The activity list next to it has the same
 *    events as plain text.
 */
export function Radar({
  events,
  asOf,
  resetKey,
  now,
  onOpen,
}: {
  events: RecentEvent[];
  asOf: number;
  resetKey: string;
  now: number;
  onOpen: (userId: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [wrapRef, inView] = useInView<HTMLDivElement>();
  const [paused, setPaused] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fresh = useFreshIds(events, resetKey);

  const model = useMemo(() => {
    const ages = events.map((e) => Math.max(0, asOf - Date.parse(e.at)));
    const maxAge = Math.max(60_000, ...ages);
    const blips: Blip[] = events.map((e, i) => {
      const bearing = ((hash32(e.userId) % 3600) / 10) * (Math.PI / 180);
      const f = Math.sqrt((ages[i] ?? 0) / maxAge);
      const r = R_MIN + (R_MAX - R_MIN) * f;
      return { ...e, x: Number((r * Math.sin(bearing)).toFixed(2)), y: Number((-r * Math.cos(bearing)).toFixed(2)) };
    });
    return { blips, maxAge };
  }, [events, asOf]);

  const rings = useMemo(
    () =>
      Array.from({ length: RINGS }, (_, k) => {
        const f = (k + 1) / RINGS;
        return { r: R_MIN + (R_MAX - R_MIN) * f, label: spanLabel(model.maxAge * f * f) };
      }),
    [model.maxAge],
  );

  const current = activeId ? model.blips.find((b) => b.id === activeId) : undefined;

  const dots = (kind: "base" | "lit") =>
    model.blips.map((b) => (
      <g
        key={b.id}
        className="osa-blip"
        data-kind={kind}
        data-blocked={b.blocked}
        data-active={b.id === activeId}
        style={{ transform: `translate(${b.x}px, ${b.y}px)` }}
      >
        {kind === "lit" ? <circle className="osa-blip-halo" r={4.4} /> : null}
        {b.blocked ? (
          <circle className="osa-blip-ring" r={kind === "lit" ? 2.2 : 1.8} />
        ) : (
          <circle className="osa-blip-dot" r={kind === "lit" ? 2 : 1.5} />
        )}
        {kind === "base" && fresh.has(b.id) ? <circle className="osa-ping" r={2} /> : null}
      </g>
    ));

  return (
    <div ref={wrapRef} className="osa-radar-wrap" data-idle={paused || !inView}>
      <div
        className="osa-radar"
        role="img"
        aria-label={`Radar of the ${events.length} most recent actions. Dots farther from the centre are older. The activity list has the newest ones as text.`}
      >
        <svg className="osa-radar-base" viewBox="-50 -50 100 100">
          {rings.map((ring) => (
            <circle key={ring.r} className="osa-ring" r={ring.r} />
          ))}
          <line className="osa-axis" x1={-R_MAX} x2={R_MAX} y1={0} y2={0} />
          <line className="osa-axis" x1={0} x2={0} y1={-R_MAX} y2={R_MAX} />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const long = i % 3 === 0;
            const r1 = R_MAX + 1.5;
            const r2 = r1 + (long ? 2.6 : 1.4);
            return (
              <line
                key={i}
                className="osa-tick"
                x1={r1 * Math.sin(a)}
                y1={-r1 * Math.cos(a)}
                x2={r2 * Math.sin(a)}
                y2={-r2 * Math.cos(a)}
              />
            );
          })}
          <g>{dots("base")}</g>
          <g>
            {model.blips.map((b) => (
              <circle
                key={b.id}
                className="osa-hit"
                cx={b.x}
                cy={b.y}
                r={3.6}
                onPointerEnter={() => setActiveId(b.id)}
                onClick={() => setActiveId(b.id)}
              />
            ))}
          </g>
        </svg>

        <div className="osa-radar-lit" aria-hidden="true">
          <svg viewBox="-50 -50 100 100">{dots("lit")}</svg>
        </div>
        <div className="osa-radar-wedge" aria-hidden="true" />
        <span className="osa-radar-core" aria-hidden="true" />

        {rings.map((ring) => (
          <span
            key={ring.r}
            className="osa-ring-label"
            aria-hidden="true"
            style={{ left: `${50 + ring.r * 0.7071}%`, top: `${50 - ring.r * 0.7071}%` }}
          >
            {ring.label}
          </span>
        ))}
      </div>

      <div className="osa-radar-foot">
        <div className="osa-radar-caption" aria-live="polite">
          {current ? (
            <>
              <b>{current.name}</b>
              <span>
                {humanize(current.action)}, {ago(current.at, now)}
              </span>
              <button type="button" className="osa-link" onClick={() => onOpen(current.userId)}>
                Open account
              </button>
            </>
          ) : (
            <span>{events.length ? "Hover or tap a dot to see the action." : "No actions in this window yet."}</span>
          )}
        </div>
        {reduced ? null : (
          <button
            type="button"
            className="osa-iconbtn"
            aria-pressed={paused}
            aria-label={paused ? "Resume radar sweep" : "Pause radar sweep"}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}
