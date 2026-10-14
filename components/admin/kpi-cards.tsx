"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Crown, GitBranch, Minus, Sparkles, Users } from "lucide-react";
import { RANGE_META, type BillingSection, type RangeKey, type StatsResponse, type UsageSection } from "@/components/lib/admin/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { compact, figure, num, percent } from "./format";
import { useCountUp, usePrefersReducedMotion } from "./hooks";
import { Sparkline } from "./sparkline";

/** Percent change from `previous` to `now`, or null when there is nothing to compare against. */
export function pctChange(now: number, previous: number): number | null {
  if (!(previous > 0)) return null;
  return ((now - previous) / previous) * 100;
}

const pctText = (p: number) => {
  const abs = Math.abs(p);
  return `${abs >= 100 ? Math.round(abs) : abs.toFixed(1).replace(/\.0$/, "")}%`;
};

/**
 * A signed change with an arrow AND a sign AND a colour, so direction never relies on colour.
 * `good` says which direction is good news: more users is good, more blocked accounts is not.
 * `title` names the period it is compared with (it is also read out by screen readers).
 */
export function Delta({ amount, text, good = "up", title }: { amount: number | null; text: string; good?: "up" | "down"; title: string }) {
  if (amount === null) {
    return (
      <span className="osa-delta" data-tone="flat" title={title}>
        <Minus size={13} aria-hidden="true" />
        <span>New</span>
        <span className="osa-sr"> {title}</span>
      </span>
    );
  }
  const dir = Math.abs(amount) < 0.05 ? "flat" : amount > 0 ? "up" : "down";
  const tone = dir === "flat" ? "flat" : dir === good ? "good" : "bad";
  const Icon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;
  return (
    <span className="osa-delta" data-tone={tone} title={title}>
      <Icon size={13} aria-hidden="true" />
      <span>
        {dir === "up" ? "+" : dir === "down" ? "−" : ""}
        {text}
      </span>
      <span className="osa-sr"> {title}</span>
    </span>
  );
}

type Hue = "users" | "paid" | "github" | "llm";
const HUE_COLOR: Record<Hue, string> = {
  users: "var(--osa-signal)",
  paid: "var(--osa-gold)",
  github: "var(--osa-github)",
  llm: "var(--osa-llm)",
};

function Tile({
  index,
  hue,
  hero,
  icon,
  label,
  sample,
  state,
  value,
  delta,
  note,
  spark,
  reason,
}: {
  index: number;
  hue: Hue;
  hero?: boolean;
  icon: ReactNode;
  label: string;
  /** True while the numbers are the invented preview. Shown as a "Sample" tag. */
  sample?: boolean;
  state: "loading" | "off" | "ready";
  value?: number;
  delta?: ReactNode;
  note?: string;
  spark?: number[];
  /** Why the tile is off, shown as a tooltip and read by screen readers. */
  reason?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const shown = useCountUp(state === "ready" ? value : undefined, reduced);

  return (
    <article
      className="osa-kpi osa-glow osa-card"
      data-hue={hue}
      data-hero={hero || undefined}
      data-state={state}
      style={{ "--i": index } as CSSProperties}
    >
      <header className="osa-kpi-head">
        <span className="osa-kpi-icon" aria-hidden="true">
          {icon}
        </span>
        <h3 className="osa-kpi-label">{label}</h3>
        {sample && state === "ready" ? <span className="osa-sample-tag">Sample</span> : null}
      </header>

      {state === "loading" ? (
        <Skeleton className="osa-skel osa-kpi-skel" />
      ) : state === "off" ? (
        <p className="osa-kpi-off" title={reason}>
          Not connected
          {reason ? <span className="osa-sr">. {reason}</span> : null}
        </p>
      ) : (
        <p className="osa-kpi-value">
          {/* The animated figure is decorative; assistive tech reads the final value once. */}
          <span aria-hidden="true">{figure(shown ?? value ?? 0)}</span>
          <span className="osa-sr">{num(value ?? 0)}</span>
        </p>
      )}

      <div className="osa-kpi-meta">
        {state === "ready" ? delta : null}
        {state === "loading" ? <Skeleton className="osa-skel osa-kpi-note-skel" /> : <p className="osa-kpi-note">{state === "off" ? "Metering is not set up yet." : note}</p>}
      </div>

      {state === "ready" && spark ? <Sparkline values={spark} color={HUE_COLOR[hue]} /> : <div className="osa-spark osa-spark-off" aria-hidden="true" />}
    </article>
  );
}

/**
 * The four numbers that matter most: total users, paid users, GitHub API calls, LLM API calls.
 * Each shows its value, a signed change against a named period, and a sparkline of the window.
 * `usage` and `billing` are whatever the console decided to show (real data, or the labelled
 * sample preview), so this component never has to know which one it got.
 */
export function KpiCards({
  stats,
  usage,
  billing,
  range,
  sample,
}: {
  stats: StatsResponse | null;
  usage: UsageSection | null;
  billing: BillingSection | null;
  range: RangeKey;
  sample: { usage: boolean; billing: boolean };
}) {
  const { label: span, long } = RANGE_META[range];
  const totals = stats?.totals;

  const usersBase = totals ? totals.users - totals.signups : 0;
  const usersGrowth = totals ? pctChange(totals.users, usersBase) : null;

  const usageReady = stats && usage?.available ? usage : null;
  const billingReady = stats && billing?.available ? billing : null;

  return (
    <section className="osa-kpis" aria-label="Key numbers">
      <Tile
        index={0}
        hue="users"
        hero
        icon={<Users size={16} />}
        label="Total users"
        state={totals ? "ready" : "loading"}
        value={totals?.users}
        delta={totals ? <Delta amount={usersGrowth ?? (totals.signups > 0 ? null : 0)} text={usersGrowth === null ? "0%" : pctText(usersGrowth)} title={`vs ${long} ago`} /> : null}
        note={totals ? `+${num(totals.signups)} new in ${span}` : undefined}
        spark={stats?.buckets.map((b) => b.users)}
      />

      <Tile
        index={1}
        hue="paid"
        icon={<Crown size={16} />}
        label="Paid users"
        sample={sample.billing}
        state={!stats ? "loading" : billingReady ? "ready" : "off"}
        reason={billing && !billing.available ? billing.reason : undefined}
        value={billingReady?.totals.paid}
        delta={billingReady ? <Delta amount={billingReady.totals.netNew} text={num(Math.abs(billingReady.totals.netNew))} title={`vs ${long} ago`} /> : null}
        note={billingReady ? `${billingReady.totals.conversionPct}% of users` : undefined}
        spark={billingReady?.series}
      />

      <Tile
        index={2}
        hue="github"
        icon={<GitBranch size={16} />}
        label="GitHub API calls"
        sample={sample.usage}
        state={!stats ? "loading" : usageReady ? "ready" : "off"}
        reason={usage && !usage.available ? usage.reason : undefined}
        value={usageReady?.totals.github}
        delta={
          usageReady ? (
            <Delta
              amount={pctChange(usageReady.totals.github, usageReady.previous.github) ?? (usageReady.totals.github > 0 ? null : 0)}
              text={pctText(pctChange(usageReady.totals.github, usageReady.previous.github) ?? 0)}
              title={`vs the previous ${long}`}
            />
          ) : null
        }
        note={usageReady ? `vs ${num(usageReady.previous.github)} before` : undefined}
        spark={usageReady?.buckets.map((b) => b.github)}
      />

      <Tile
        index={3}
        hue="llm"
        icon={<Sparkles size={16} />}
        label="LLM API calls"
        sample={sample.usage}
        state={!stats ? "loading" : usageReady ? "ready" : "off"}
        reason={usage && !usage.available ? usage.reason : undefined}
        value={usageReady?.totals.llm}
        delta={
          usageReady ? (
            <Delta
              amount={pctChange(usageReady.totals.llm, usageReady.previous.llm) ?? (usageReady.totals.llm > 0 ? null : 0)}
              text={pctText(pctChange(usageReady.totals.llm, usageReady.previous.llm) ?? 0)}
              title={`vs the previous ${long}`}
            />
          ) : null
        }
        note={usageReady ? (usageReady.totals.tokens > 0 ? `${compact(usageReady.totals.tokens)} tokens` : `vs ${num(usageReady.previous.llm)} before`) : undefined}
        spark={usageReady?.buckets.map((b) => b.llm)}
      />
    </section>
  );
}

function Mini({
  label,
  value,
  note,
  tone,
  delta,
  meter,
}: {
  label: string;
  value?: number;
  note?: string;
  tone?: "alert";
  delta?: ReactNode;
  /** 0 to 100. Draws a thin progress line under the note. */
  meter?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const shown = useCountUp(value, reduced);

  return (
    <div className="osa-mini" data-tone={tone}>
      <p className="osa-mini-label">{label}</p>
      {shown === undefined ? (
        <Skeleton className="osa-skel osa-mini-skel" />
      ) : (
        <p className="osa-mini-value">
          <span aria-hidden="true">{figure(shown)}</span>
          <span className="osa-sr">{num(value ?? shown)}</span>
        </p>
      )}
      {value === undefined ? (
        <Skeleton className="osa-skel osa-kpi-note-skel" />
      ) : (
        <div className="osa-mini-foot">
          <p className="osa-mini-note">{note}</p>
          {delta}
        </div>
      )}
      {meter !== undefined && value !== undefined ? (
        <div className="osa-meter" role="img" aria-label={`${Math.round(meter)}%`}>
          <i style={{ width: `${Math.min(100, Math.max(0, meter))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

/** The quieter second row: active users, actions, onboarding and blocked accounts. */
export function MiniStats({ stats, range }: { stats: StatsResponse | null; range: RangeKey }) {
  const totals = stats?.totals;
  const { label: span, long } = RANGE_META[range];
  const actionChange = totals && stats ? pctChange(totals.activity, stats.previous.activity) : null;

  return (
    <section className="osa-minis osa-card" aria-label="More numbers" style={{ "--i": 4 } as CSSProperties}>
      <Mini label="Active users" value={totals?.active} note={totals ? `${percent(totals.active, totals.users)} of users in ${span}` : undefined} />
      <Mini
        label="Actions"
        value={totals?.activity}
        note={totals ? `in ${span}` : undefined}
        delta={
          totals && stats && stats.previous.activity > 0 ? (
            <Delta amount={actionChange} text={actionChange === null ? "0%" : pctText(actionChange)} title={`vs the previous ${long}`} />
          ) : undefined
        }
      />
      <Mini
        label="Onboarded"
        value={totals?.onboarded}
        note={totals ? `${percent(totals.onboarded, totals.users)} of users` : undefined}
        meter={totals && totals.users > 0 ? (totals.onboarded / totals.users) * 100 : 0}
      />
      <Mini
        label="Blocked"
        value={totals?.blocked}
        note={totals ? `${percent(totals.blocked, totals.users)} of users` : undefined}
        tone={totals && totals.blocked > 0 ? "alert" : undefined}
      />
    </section>
  );
}
