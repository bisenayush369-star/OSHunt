"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus, Table2, TriangleAlert, X } from "lucide-react";
import { RANGE_META, RANGES, type RangeKey, type StatsBucket, type StatsResponse, type UsageSection } from "@/components/lib/admin/contract";
import { Button, Chip, Panel, Segmented, Skeleton, type SegmentOption } from "./kit";
import { axisLabel, bucketLabel, changePct, compact, cx, niceTicks, num, pct, signed } from "./format";
import { useMediaQuery } from "./hooks";

/**
 * Charts. One system, see /design.md.
 *  - Single-series charts use the lime accent. Two-series charts add the validated dark slot-1 blue and are
 *    labelled directly, so colour is never the only cue.
 *  - Every chart has a table twin (the "Table" button) holding the same numbers.
 *  - A refetch keeps the old frame on screen (dimmed) until the new numbers arrive.
 *  - No animation: counts jumping into place is decoration, and it fights prefers-reduced-motion.
 */

export const RANGE_OPTIONS: readonly SegmentOption<RangeKey>[] = RANGES.map((r) => ({ value: r, label: RANGE_META[r].label, title: `Last ${RANGE_META[r].long}` }));

const LIME = "var(--osa-lime)";
const BLUE = "var(--osa-series-2)";
const GRID = "var(--osa-grid)";

/* ── Pieces ─────────────────────────────────────────────────────────────── */

/** Change versus the previous window, as icon + word + number. Hidden when there is nothing to compare. */
export function Delta({ current, previous, className, goodWhen = "up" }: { current: number; previous: number; className?: string; goodWhen?: "up" | "down" | "none" }) {
  const change = changePct(current, previous);
  if (change === null) return <span className={cx("osa-faint text-[12px]", className)}>no earlier data</span>;
  const flat = Math.abs(change) < 0.5;
  const up = change > 0;
  const good = goodWhen === "none" ? null : goodWhen === "up" ? up : !up;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <Chip tone={flat || good === null ? "mute" : good ? "good" : "serious"} icon={Icon} className={className}>
      <span className="osa-num">{flat ? "0%" : `${up ? "+" : "−"}${pct(Math.abs(change), Math.abs(change) < 10 ? 1 : 0)}`}</span>
      <span className="sr-only">{flat ? "no change" : up ? "up" : "down"} versus the previous period</span>
    </Chip>
  );
}

/** Tiny trend line for a stat tile. Decorative: the number next to it carries the information. */
export function Sparkline({ values, height = 28, className }: { values: readonly number[]; height?: number; className?: string }) {
  if (values.length < 2) return null;
  const w = 100;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 3 - ((v - min) / span) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={cx("h-7 w-full", className)} aria-hidden focusable="false">
      <path d={d} fill="none" stroke={LIME} strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.2} fill={LIME} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

type TipEntry = { value?: number | string; name?: string | number; color?: string };
type TipProps = { active?: boolean; payload?: ReadonlyArray<TipEntry>; label?: string | number; labels: Map<number, string>; unit: string };

function Tip({ active, payload, label, labels, unit }: TipProps) {
  if (!active || !payload?.length) return null;
  const title = labels.get(Number(label)) ?? String(label ?? "");
  return (
    <div className="osa-chart-tip">
      <div className="osa-faint mb-1">{title}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="osa-legend-key" style={{ background: p.color, marginRight: 0 }} />
          <span className="osa-num">{num(Number(p.value ?? 0))}</span>
          <span className="osa-muted">{payload.length > 1 ? String(p.name) : unit}</span>
        </div>
      ))}
    </div>
  );
}

function TableTwin({ caption, columns, rows }: { caption: string; columns: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="max-h-64 overflow-auto border-t border-[var(--osa-line)]">
      <table className="osa-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={c} scope="col" className={i ? "text-right" : undefined}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ cursor: "default" }}>
              {r.map((cell, j) => (
                <td key={j} className={j ? "osa-num text-right" : "osa-muted"}>
                  {typeof cell === "number" ? num(cell) : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const xTick = { fontSize: 11 } as const;

/* ── Growth: the terminal chart ─────────────────────────────────────────── */

type Metric = "signups" | "activity";
const METRICS: readonly SegmentOption<Metric>[] = [
  { value: "signups", label: "New accounts" },
  { value: "activity", label: "Activity" },
];
const METRIC_TEXT: Record<Metric, { unit: string; cmd: string; empty: string }> = {
  signups: { unit: "new accounts", cmd: "signups", empty: "Nobody signed up in this period." },
  activity: { unit: "actions", cmd: "activity", empty: "No activity in this period." },
};

export function GrowthChart({ stats, range, onRange, stale }: { stats: StatsResponse | null; range: RangeKey; onRange: (r: RangeKey) => void; stale: boolean }) {
  const [metric, setMetric] = React.useState<Metric>("signups");
  const [hover, setHover] = React.useState<number | null>(null);
  const [table, setTable] = React.useState(false);
  const compactScreen = useMediaQuery("(max-width: 639px)", false);

  const buckets = React.useMemo<StatsBucket[]>(() => stats?.buckets ?? [], [stats]);
  const shownRange = stats?.range ?? range;
  const values = buckets.map((b) => b[metric]);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? total / values.length : 0;
  const peakIdx = values.length ? values.indexOf(Math.max(...values)) : -1;
  const peak = peakIdx >= 0 ? values[peakIdx]! : 0;
  const previous = stats ? stats.previous[metric] : 0;
  const unit = RANGE_META[shownRange].unit;

  const data = buckets.map((b) => ({ t: b.t, v: b[metric] }));
  const yTicks = niceTicks(Math.max(0, ...values));
  const labels = React.useMemo(() => new Map(buckets.map((b) => [b.t, bucketLabel(b.t, shownRange)] as const)), [buckets, shownRange]);
  const focusIdx = hover ?? (buckets.length ? buckets.length - 1 : null);
  const focus = focusIdx !== null ? buckets[focusIdx] : undefined;

  return (
    <Panel className="overflow-hidden" aria-labelledby="growth-title">
      <div className="osa-panel-head">
        <div className="min-w-0">
          <h2 id="growth-title" className="sr-only">
            Growth
          </h2>
          <p className="osa-prompt osa-truncate" aria-hidden>
            osh {METRIC_TEXT[metric].cmd} --last {RANGE_META[range].label.toLowerCase()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={metric} onChange={setMetric} options={METRICS} label="Metric" />
          <Segmented value={range} onChange={onRange} options={RANGE_OPTIONS} label="Time range" mono />
        </div>
      </div>

      {stats === null ? (
        <div className="p-4">
          <Skeleton h={14} w="60%" />
          <Skeleton h={220} className="mt-4" />
        </div>
      ) : (
        <>
          <p className="osa-readout px-4 pt-3" aria-hidden>
            <span style={{ color: "var(--osa-lime)" }}>&gt;</span> {focus ? <b>{labels.get(focus.t)}</b> : null}
            {focus ? (
              <>
                <span className="osa-faint"> · </span>
                <b>{num(focus[metric])}</b> {METRIC_TEXT[metric].unit}
                {hover === null ? <span className="osa-faint"> (so far)</span> : null}
              </>
            ) : null}
          </p>

          <div className={cx("px-2 pb-2 pt-2 sm:px-4", stale && "opacity-50")} style={{ transition: "opacity 150ms" }}>
            {total === 0 ? (
              <div className="grid h-[200px] place-items-center text-center sm:h-[240px]">
                <p className="osa-muted text-[13px]">{METRIC_TEXT[metric].empty}</p>
              </div>
            ) : (
              <div className="osa-chart h-[200px] min-w-0 sm:h-[240px]" role="img" aria-label={`${METRIC_TEXT[metric].unit} per ${unit}, last ${RANGE_META[shownRange].long}: ${num(total)} in total, peak ${num(peak)}. The Table button shows the same numbers.`}>
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 240 }}>
                  <AreaChart
                    data={data}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                    onMouseMove={(s) => {
                      const i = Number(s?.activeTooltipIndex);
                      setHover(s?.isTooltipActive && Number.isInteger(i) ? i : null);
                    }}
                    onMouseLeave={() => setHover(null)}
                  >
                    <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="t" tickFormatter={(t: number) => axisLabel(t, shownRange)} tickLine={false} axisLine={{ stroke: GRID }} tick={xTick} minTickGap={compactScreen ? 28 : 36} interval="preserveStartEnd" />
                    <YAxis width={compactScreen ? 30 : 38} tickLine={false} axisLine={false} tick={xTick} allowDecimals={false} ticks={yTicks} domain={[0, yTicks[yTicks.length - 1]!]} interval={0} tickFormatter={(v: number) => compact(v)} />
                    <Tooltip content={(p) => <Tip {...(p as unknown as Omit<TipProps, "labels" | "unit">)} labels={labels} unit={METRIC_TEXT[metric].unit} />} cursor={{ stroke: "var(--osa-ink-3)", strokeDasharray: "3 3" }} isAnimationActive={false} />
                    <Area type="monotone" dataKey="v" name={METRIC_TEXT[metric].unit} stroke={LIME} strokeWidth={2} fill={LIME} fillOpacity={0.12} dot={false} activeDot={{ r: 4, fill: LIME, stroke: "var(--osa-panel)", strokeWidth: 2 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 border-t border-[var(--osa-line)] sm:grid-cols-4">
            {[
              { k: "Total", v: num(total), d: <Delta current={total} previous={previous} /> },
              { k: `Average / ${unit}`, v: avg >= 10 ? num(Math.round(avg)) : avg.toFixed(1), d: null },
              { k: "Peak", v: num(peak), d: peakIdx >= 0 && peak > 0 ? <span className="osa-faint text-[12px]">{axisLabel(buckets[peakIdx]!.t, shownRange)}</span> : null },
              { k: "Accounts now", v: num(stats.totals.users), d: null },
            ].map((s, i) => (
              <div key={s.k} className={cx("min-w-0 px-4 py-3", i % 2 === 1 && "border-l border-[var(--osa-line)]", i >= 2 && "border-t border-[var(--osa-line)] sm:border-t-0", i === 2 && "sm:border-l")}>
                <dt className="osa-eyebrow">{s.k}</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="osa-num text-[18px] font-medium">{s.v}</span>
                  {s.d}
                </dd>
              </div>
            ))}
          </dl>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--osa-line)] px-4 py-2">
            <p className="osa-faint text-[12px]">{stale ? "Updating…" : `Each point is one ${unit}, ${RANGE_META[shownRange].long} in total.`}</p>
            <Button size="sm" variant="ghost" onClick={() => setTable((t) => !t)} aria-expanded={table}>
              {table ? <X /> : <Table2 />}
              {table ? "Hide table" : "Table"}
            </Button>
          </div>
          {table ? (
            <TableTwin caption={`${METRIC_TEXT[metric].unit} per ${unit}`} columns={["Period", METRIC_TEXT[metric].unit]} rows={[...buckets].reverse().map((b) => [bucketLabel(b.t, shownRange), b[metric]])} />
          ) : null}
        </>
      )}
    </Panel>
  );
}

/* ── Usage: GitHub + LLM calls ──────────────────────────────────────────── */

export function UsageChart({ usage, range, stale, onOpenLlm, providerLabels }: { usage: UsageSection | undefined; range: RangeKey; stale: boolean; onOpenLlm?: () => void; providerLabels?: ReadonlyMap<string, string> }) {
  const [table, setTable] = React.useState(false);
  const compactScreen = useMediaQuery("(max-width: 639px)", false);

  return (
    <Panel aria-labelledby="usage-title" className="overflow-hidden">
      <div className="osa-panel-head">
        <div className="min-w-0">
          <h2 id="usage-title" className="text-[15px] font-semibold leading-tight">
            API calls
          </h2>
          <p className="osa-faint mt-0.5 text-[12px]">GitHub and LLM requests made by OSHunt</p>
        </div>
        {onOpenLlm ? (
          <Button size="sm" variant="ghost" onClick={onOpenLlm}>
            LLM APIs
            <ArrowRight />
          </Button>
        ) : null}
      </div>

      {usage === undefined ? (
        <div className="p-4">
          <Skeleton h={180} />
        </div>
      ) : !usage.available ? (
        <div className="p-4">
          <p className="text-[13px] font-medium">Not connected</p>
          <p className="osa-muted mt-1 text-[13px]">{usage.reason}</p>
        </div>
      ) : (
        <UsageBody usage={usage} range={range} stale={stale} table={table} setTable={setTable} compactScreen={compactScreen} providerLabels={providerLabels} />
      )}
    </Panel>
  );
}

function UsageBody({ usage, range, stale, table, setTable, compactScreen, providerLabels }: { usage: Extract<UsageSection, { available: true }>; range: RangeKey; stale: boolean; table: boolean; setTable: (v: boolean) => void; compactScreen: boolean; providerLabels?: ReadonlyMap<string, string> }) {
  const labels = React.useMemo(() => new Map(usage.buckets.map((b) => [b.t, bucketLabel(b.t, range)] as const)), [usage.buckets, range]);
  const calls = usage.totals.github + usage.totals.llm;
  const errorRate = calls > 0 ? (usage.totals.errors / calls) * 100 : 0;
  const yTicks = niceTicks(Math.max(0, ...usage.buckets.map((b) => b.llm + b.github)));

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 text-[13px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="osa-legend-key" style={{ background: LIME, marginRight: 0 }} />
          LLM <b className="osa-num ml-1 font-medium">{num(usage.totals.llm)}</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="osa-legend-key" style={{ background: BLUE, marginRight: 0 }} />
          GitHub <b className="osa-num ml-1 font-medium">{num(usage.totals.github)}</b>
        </span>
        {usage.totals.errors > 0 ? (
          <Chip tone={errorRate >= 10 ? "bad" : "warn"} icon={TriangleAlert}>
            {num(usage.totals.errors)} failed ({pct(errorRate, errorRate < 10 ? 1 : 0)})
          </Chip>
        ) : null}
      </div>

      <div className={cx("px-2 pb-2 pt-2 sm:px-4", stale && "opacity-50")}>
        {calls === 0 ? (
          <div className="grid h-[180px] place-items-center">
            <p className="osa-muted text-[13px]">No API calls in this period.</p>
          </div>
        ) : (
          <div className="osa-chart h-[180px] min-w-0 sm:h-[200px]" role="img" aria-label={`API calls per ${RANGE_META[range].unit}: ${num(usage.totals.llm)} LLM and ${num(usage.totals.github)} GitHub. The Table button shows the same numbers.`}>
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 200 }}>
              <BarChart data={usage.buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={usage.buckets.length > 14 ? "18%" : "30%"}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 4" vertical={false} />
                <XAxis dataKey="t" tickFormatter={(t: number) => axisLabel(t, range)} tickLine={false} axisLine={{ stroke: GRID }} tick={xTick} minTickGap={compactScreen ? 28 : 36} interval="preserveStartEnd" />
                <YAxis width={compactScreen ? 30 : 38} tickLine={false} axisLine={false} tick={xTick} allowDecimals={false} ticks={yTicks} domain={[0, yTicks[yTicks.length - 1]!]} interval={0} tickFormatter={(v: number) => compact(v)} />
                <Tooltip content={(p) => <Tip {...(p as unknown as Omit<TipProps, "labels" | "unit">)} labels={labels} unit="calls" />} cursor={{ fill: "rgba(255,255,255,0.05)" }} isAnimationActive={false} />
                <Bar dataKey="llm" name="LLM" stackId="calls" fill={LIME} isAnimationActive={false} />
                <Bar dataKey="github" name="GitHub" stackId="calls" fill={BLUE} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {usage.models.length > 0 ? (
        <div className="border-t border-[var(--osa-line)] px-4 py-3">
          <p className="osa-eyebrow mb-2">Most used</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {usage.models.slice(0, 4).map((m) => (
              <li key={`${m.service}:${m.name}`} className="inline-flex items-center gap-1.5">
                <span className="osa-mono">{providerLabels?.get(m.name.toUpperCase()) ?? m.name}</span>
                <span className="osa-num osa-faint">{num(m.calls)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-[var(--osa-line)] px-4 py-2">
        <p className="osa-faint text-[12px]">{stale ? "Updating…" : `${signed(usage.totals.llm + usage.totals.github - usage.previous.llm - usage.previous.github)} vs the period before`}</p>
        <Button size="sm" variant="ghost" onClick={() => setTable(!table)} aria-expanded={table}>
          {table ? <X /> : <Table2 />}
          {table ? "Hide table" : "Table"}
        </Button>
      </div>
      {table ? <TableTwin caption="API calls per period" columns={["Period", "LLM", "GitHub", "Failed"]} rows={[...usage.buckets].reverse().map((b) => [bucketLabel(b.t, range), b.llm, b.github, b.errors])} /> : null}
    </>
  );
}
