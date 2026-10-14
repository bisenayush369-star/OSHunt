"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Plug, TriangleAlert } from "lucide-react";
import {
  RANGE_META,
  RANGES,
  type BillingSection,
  type RangeKey,
  type RecentEvent,
  type StatsResponse,
  type UsageSection,
} from "@/components/lib/admin/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart } from "./area-chart";
import { BarsChart, USAGE_COLORS } from "./bars-chart";
import { Donut, type DonutSlice } from "./donut";
import { Face } from "./face";
import { PERIOD, ago, compact, humanize, num } from "./format";
import { KpiCards, MiniStats } from "./kpi-cards";
import { Radar } from "./radar";
import { sampleBilling, sampleUsage } from "./sample-data";
import type { AdminSync } from "./use-admin-sync";

/* ── Small shared pieces ────────────────────────────────────────────────── */

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  pill,
  quiet,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (next: T) => void;
  label: string;
  /** layoutId of the sliding highlight. Each control on the page needs its own. */
  pill: string;
  /** A calmer look for secondary controls (the primary range switch stays bright). */
  quiet?: boolean;
}) {
  return (
    <div className="osa-seg" data-quiet={quiet || undefined} role="group" aria-label={label}>
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button key={option.value} type="button" aria-pressed={on} data-on={on} onClick={() => onChange(option.value)}>
            {on ? (
              <motion.span layoutId={pill} className="osa-seg-pill" transition={{ type: "spring", stiffness: 520, damping: 42 }} />
            ) : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const RANGE_OPTIONS = RANGES.map((range) => ({ value: range, label: RANGE_META[range].label }));

export function RangeSwitch({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return <Segmented value={value} options={RANGE_OPTIONS} onChange={onChange} label="Time range" pill="osa-range-pill" />;
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <CardTitle className="osa-panel-title" role="heading" aria-level={2}>
      {children}
    </CardTitle>
  );
}

const SampleTag = () => <span className="osa-sample-tag">Sample</span>;

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${num(Math.abs(n))}`;

/* ── Sample preview preference (persisted, never required) ──────────────── */

const SAMPLE_KEY = "osa-sample";

/** ON by default, so a fresh install shows the finished layout. "Turn off" is remembered. */
function useSamplePreference(): readonly [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SAMPLE_KEY) === "off") setOn(false);
    } catch {
      /* storage can be blocked (private windows, strict settings) */
    }
  }, []);

  const update = useCallback((next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(SAMPLE_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
  }, []);

  return [on, update] as const;
}

/** What to show where the server has no data: a labelled way to preview, never an empty box. */
function Placeholder({ title, reason, onPreview }: { title: string; reason?: string; onPreview: () => void }) {
  return (
    <div className="osa-placeholder">
      <svg className="osa-ghost" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 96 C60 90 90 70 140 74 S230 40 280 46 S350 20 400 12 V120 H0Z" className="osa-ghost-fill" />
        <path d="M0 96 C60 90 90 70 140 74 S230 40 280 46 S350 20 400 12" className="osa-ghost-line" />
      </svg>
      <div className="osa-placeholder-copy">
        <Plug size={20} aria-hidden="true" />
        <p className="osa-placeholder-title">{title}</p>
        <p className="osa-muted">{reason ?? "Nothing has been recorded yet."}</p>
        <Button className="osa-btn osa-btn-ghost" onClick={onPreview}>
          <FlaskConical size={16} aria-hidden="true" />
          Preview with sample data
        </Button>
      </div>
    </div>
  );
}

/* ── Growth card ────────────────────────────────────────────────────────── */

type GrowthKey = "users" | "paid" | "signups" | "actions";

const GROWTH_TABS: ReadonlyArray<{ value: GrowthKey; label: string }> = [
  { value: "users", label: "Users" },
  { value: "paid", label: "Paid" },
  { value: "signups", label: "Signups" },
  { value: "actions", label: "Actions" },
];

type GrowthModel = {
  id: string;
  color: string;
  label: string;
  zero: boolean;
  values: number[];
  summary: string;
  detail?: (index: number) => string | null;
};

function growthModel(tab: GrowthKey, stats: StatsResponse, billing: BillingSection | null, range: RangeKey): GrowthModel | null {
  const { totals, buckets } = stats;
  const long = RANGE_META[range].long;
  const period = PERIOD[range];

  switch (tab) {
    case "users":
      return {
        id: "users",
        color: "var(--osa-signal)",
        label: "Total users",
        zero: false,
        values: buckets.map((b) => b.users),
        summary: `${num(totals.users)} in total, ${signed(totals.signups)} in the last ${long}`,
        detail: (i) => {
          const added = buckets[i]?.signups ?? 0;
          return added > 0 ? `+${num(added)} new this ${period}` : `No new users this ${period}`;
        },
      };
    case "paid": {
      if (!billing?.available) return null;
      const series = billing.series;
      return {
        id: "paid",
        color: "var(--osa-gold)",
        label: "Paid users",
        zero: false,
        values: series,
        summary: `${num(billing.totals.paid)} paid, ${signed(billing.totals.netNew)} in the last ${long}`,
        detail: (i) => (i === 0 ? null : `${signed((series[i] ?? 0) - (series[i - 1] ?? 0))} this ${period}`),
      };
    }
    case "signups":
      return {
        id: "signups",
        color: "var(--osa-signal)",
        label: "New users",
        zero: true,
        values: buckets.map((b) => b.signups),
        summary: `${num(totals.signups)} new users in the last ${long}`,
      };
    case "actions":
      return {
        id: "actions",
        color: "var(--osa-actions)",
        label: "Actions",
        zero: true,
        values: buckets.map((b) => b.activity),
        summary: `${num(totals.activity)} actions in the last ${long}`,
      };
  }
}

/* ── Plans card ─────────────────────────────────────────────────────────── */

const PLAN_COLORS = ["var(--osa-plan-1)", "var(--osa-plan-2)", "var(--osa-plan-3)", "var(--osa-plan-4)", "var(--osa-plan-5)"] as const;

function planSlices(billing: Extract<BillingSection, { available: true }>): DonutSlice[] {
  const sorted = [...billing.plans].sort((a, b) => b.users - a.users);
  const head = sorted.length > PLAN_COLORS.length ? sorted.slice(0, PLAN_COLORS.length - 1) : sorted;
  const rest = sorted.slice(head.length);
  const slices: DonutSlice[] = head.map((p, i) => ({ key: p.plan, label: p.plan, value: p.users, color: PLAN_COLORS[i] ?? PLAN_COLORS[0] }));
  if (rest.length > 0) {
    slices.push({ key: "__other", label: "Other", value: rest.reduce((sum, p) => sum + p.users, 0), color: PLAN_COLORS[PLAN_COLORS.length - 1] ?? PLAN_COLORS[0] });
  }
  return slices;
}

/* ── Lists ──────────────────────────────────────────────────────────────── */

function Feed({ events, now, onOpen }: { events: RecentEvent[]; now: number; onOpen: (userId: string) => void }) {
  if (events.length === 0) return <p className="osa-muted osa-pad">No actions in this window yet.</p>;

  return (
    <ul className="osa-feed">
      {events.slice(0, 8).map((event) => (
        <li key={event.id}>
          <button type="button" className="osa-feed-row osa-reticle" data-blocked={event.blocked} onClick={() => onOpen(event.userId)}>
            <Face name={event.name} size={30} />
            <span className="osa-feed-text">
              <span className="osa-feed-name">{event.name}</span>
              <span className="osa-feed-action">
                {humanize(event.action)}
                {event.blocked ? " (blocked account)" : ""}
              </span>
            </span>
            <time className="osa-feed-time" dateTime={event.at}>
              {ago(event.at, now)}
            </time>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** For developers (and Copilot): shows exactly what the sync engine last received. */
function Inspector({ sync, range, now }: { sync: AdminSync; range: RangeKey; now: number }) {
  const { stats, users, total, lastSyncAt, log } = sync;

  const snapshot = useMemo(
    () =>
      JSON.stringify(
        {
          range,
          syncedAt: lastSyncAt ? new Date(lastSyncAt).toISOString() : null,
          totals: stats?.totals ?? null,
          previous: stats?.previous ?? null,
          usage: stats ? (stats.usage.available ? { available: true, totals: stats.usage.totals, previous: stats.usage.previous } : stats.usage) : null,
          billing: stats ? (stats.billing.available ? { available: true, totals: stats.billing.totals, plans: stats.billing.plans } : stats.billing) : null,
          users: {
            total,
            loaded: users?.length ?? 0,
            sample: (users ?? []).slice(0, 2).map((u) => ({
              id: u.id,
              name: u.name,
              githubUsername: u.githubUsername,
              paid: u.paid,
              blocked: u.blocked,
              actions: u.actions,
            })),
          },
          recent: (stats?.recent ?? []).slice(0, 2),
        },
        null,
        2,
      ),
    [range, lastSyncAt, stats, users, total],
  );

  return (
    <details className="osa-inspector osa-card osa-cfull">
      <summary>
        <span>Sync inspector</span>
        <span className="osa-muted">What the console last received</span>
      </summary>
      <div className="osa-inspector-body">
        <ul className="osa-reqlog" aria-label="Recent requests">
          {log.length === 0 ? <li className="osa-muted">No requests yet.</li> : null}
          {log.map((entry, i) => (
            <li key={`${entry.at}-${i}`} data-ok={entry.ok}>
              <code>{entry.url}</code>
              <span>{entry.ok ? entry.status : entry.status || "failed"}</span>
              <span>{entry.ms} ms</span>
              <span className="osa-muted">{ago(entry.at, now)}</span>
            </li>
          ))}
        </ul>
        <pre className="osa-code" tabIndex={0}>
          {snapshot}
        </pre>
      </div>
    </details>
  );
}

/* ── The screen ─────────────────────────────────────────────────────────── */

export function Overview({
  range,
  onRange,
  sync,
  now,
  onOpenUser,
}: {
  range: RangeKey;
  onRange: (range: RangeKey) => void;
  sync: AdminSync;
  now: number;
  onOpenUser: (id: string) => void;
}) {
  const { stats, error } = sync;
  const totals = stats?.totals;
  const long = RANGE_META[range].long;
  const [sampleOn, setSampleOn] = useSamplePreference();
  const [growthTab, setGrowthTab] = useState<GrowthKey>("users");

  // Real data always wins. The sample only stands in for a section the server says is not connected.
  const usageSample = sampleOn && stats !== null && !stats.usage.available;
  const billingSample = sampleOn && stats !== null && !stats.billing.available;

  const usage = useMemo<UsageSection | null>(
    () => (!stats ? null : usageSample ? sampleUsage(stats) : stats.usage),
    [stats, usageSample],
  );
  const billing = useMemo<BillingSection | null>(
    () => (!stats ? null : billingSample ? sampleBilling(stats) : stats.billing),
    [stats, billingSample],
  );

  const growth = useMemo(() => (stats ? growthModel(growthTab, stats, billing, range) : null), [growthTab, stats, billing, range]);
  const slices = useMemo(() => (billing?.available ? planSlices(billing) : []), [billing]);

  const bannerAbout = usageSample && billingSample ? "API-calls and paid-users graphs are" : usageSample ? "API-calls graphs are" : "paid-users graphs are";
  const preview = () => setSampleOn(true);

  return (
    <div className="osa-overview">
      <div className="osa-pagehead">
        <div>
          <h1>Overview</h1>
          <p className="osa-sub">
            {totals ? `${num(totals.users)} users in total. ${num(totals.signups)} joined and ${num(totals.active)} were active in the last ${long}.` : "Loading the latest numbers."}
          </p>
        </div>
        <RangeSwitch value={range} onChange={onRange} />
      </div>

      {error && !stats ? (
        <div className="osa-alert" role="alert">
          <p>{error}</p>
          <Button className="osa-btn osa-btn-ghost" onClick={() => void sync.syncNow()}>
            Try again
          </Button>
        </div>
      ) : null}

      {usageSample || billingSample ? (
        <div className="osa-banner" role="note">
          <FlaskConical size={18} aria-hidden="true" />
          <p>
            <b>Sample data.</b> The {bannerAbout} invented, so you can see the layout before real data is connected.
          </p>
          <Button className="osa-btn osa-btn-ghost osa-btn-sm" onClick={() => setSampleOn(false)}>
            Turn off
          </Button>
        </div>
      ) : null}

      <KpiCards stats={stats} usage={usage} billing={billing} range={range} sample={{ usage: usageSample, billing: billingSample }} />
      <MiniStats stats={stats} range={range} />

      <div className="osa-bento">
        <Card className="osa-panel osa-glow osa-card osa-c8" style={{ "--i": 5 } as CSSProperties}>
          <CardHeader className="osa-panel-head">
            <div className="osa-panel-titles">
              <PanelTitle>
                Growth {growthTab === "paid" && billingSample ? <SampleTag /> : null}
              </PanelTitle>
              <p className="osa-panel-note">{growth?.summary ?? (stats ? "Not connected" : "Loading")}</p>
            </div>
            <Segmented value={growthTab} options={GROWTH_TABS} onChange={setGrowthTab} label="Measure" pill="osa-growth-pill" quiet />
          </CardHeader>
          <CardContent className="osa-panel-body">
            {!stats ? (
              <Skeleton className="osa-skel osa-chart-skel" />
            ) : growth ? (
              <AreaChart
                id={growth.id}
                times={stats.buckets.map((b) => b.t)}
                values={growth.values}
                range={range}
                color={growth.color}
                label={growth.label}
                zero={growth.zero}
                detail={growth.detail}
              />
            ) : (
              <Placeholder
                title="Paid users are not connected"
                reason={billing && !billing.available ? billing.reason : undefined}
                onPreview={preview}
              />
            )}
          </CardContent>
        </Card>

        <Card className="osa-panel osa-glow osa-card osa-c4" style={{ "--i": 6 } as CSSProperties}>
          <CardHeader className="osa-panel-head">
            <div className="osa-panel-titles">
              <PanelTitle>Paid plans {billingSample ? <SampleTag /> : null}</PanelTitle>
              <p className="osa-panel-note">
                {billing?.available ? `${signed(billing.totals.netNew)} paid users in the last ${long}` : stats ? "Not connected" : "Loading"}
              </p>
            </div>
          </CardHeader>
          <CardContent className="osa-panel-body">
            {!stats || !totals ? (
              <Skeleton className="osa-skel osa-plans-skel" />
            ) : billing?.available ? (
              <Donut
                slices={slices}
                rows={[{ key: "free", label: "Free", value: billing.totals.free }]}
                totalUsers={totals.users > 0 ? totals.users : billing.totals.paid + billing.totals.free}
                centerValue={`${billing.totals.conversionPct}%`}
                centerLabel="of users paid"
              />
            ) : (
              <Placeholder title="Plans are not connected" reason={billing?.reason} onPreview={preview} />
            )}
          </CardContent>
        </Card>

        <Card className="osa-panel osa-glow osa-card osa-c8" style={{ "--i": 7 } as CSSProperties}>
          <CardHeader className="osa-panel-head">
            <div className="osa-panel-titles">
              <PanelTitle>API calls {usageSample ? <SampleTag /> : null}</PanelTitle>
              <p className="osa-panel-note">GitHub and LLM calls made by the app in the last {long}</p>
            </div>
            {usage?.available ? (
              <ul className="osa-legend" aria-label="Series">
                <li>
                  <i className="osa-swatch" style={{ background: USAGE_COLORS.github }} aria-hidden="true" />
                  <span>GitHub</span>
                  <b>{num(usage.totals.github)}</b>
                </li>
                <li>
                  <i className="osa-swatch" style={{ background: USAGE_COLORS.llm }} aria-hidden="true" />
                  <span>LLM</span>
                  <b>{num(usage.totals.llm)}</b>
                </li>
              </ul>
            ) : null}
          </CardHeader>
          <CardContent className="osa-panel-body">
            {!stats ? (
              <Skeleton className="osa-skel osa-chart-skel" />
            ) : usage?.available ? (
              <>
                <BarsChart buckets={usage.buckets} range={range} />
                {usage.models.length > 0 || usage.totals.errors > 0 ? (
                  <ul className="osa-models" aria-label="Top models and failures">
                    {usage.models.map((m) => (
                      <li key={`${m.service}:${m.name}`} className="osa-model">
                        <span>{m.name}</span>
                        <b>{compact(m.calls)}</b>
                      </li>
                    ))}
                    {usage.totals.errors > 0 ? (
                      <li className="osa-model" data-tone="alert">
                        <TriangleAlert size={13} aria-hidden="true" />
                        <span>Failed</span>
                        <b>{compact(usage.totals.errors)}</b>
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </>
            ) : (
              <Placeholder title="API usage is not connected" reason={usage?.reason} onPreview={preview} />
            )}
          </CardContent>
        </Card>

        <Card className="osa-panel osa-glow osa-card osa-c4" style={{ "--i": 8 } as CSSProperties}>
          <CardHeader className="osa-panel-head">
            <PanelTitle>Latest actions</PanelTitle>
            {stats && totals ? (
              <p className="osa-panel-note">
                {stats.recent.length} of {num(totals.activity)}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="osa-panel-body">
            {stats ? (
              <Radar events={stats.recent} asOf={stats.updatedAt} resetKey={range} now={now} onOpen={onOpenUser} />
            ) : (
              <Skeleton className="osa-skel osa-radar-skel" />
            )}
          </CardContent>
        </Card>

        <Card className="osa-panel osa-glow osa-card osa-cfull" style={{ "--i": 9 } as CSSProperties}>
          <CardHeader className="osa-panel-head">
            <PanelTitle>Recent activity</PanelTitle>
          </CardHeader>
          <CardContent className="osa-panel-body osa-flush">
            {stats ? (
              <Feed events={stats.recent} now={now} onOpen={onOpenUser} />
            ) : (
              <div className="osa-pad">
                <Skeleton className="osa-skel osa-feed-skel" />
              </div>
            )}
          </CardContent>
        </Card>

        <Inspector sync={sync} range={range} now={now} />
      </div>
    </div>
  );
}
