"use client";

import type { ReactNode } from "react";
import { RANGE_META, type RangeKey, type StatsResponse } from "@/components/lib/admin/contract";
import { Skeleton } from "@/components/ui/skeleton";
import { num, percent } from "./format";
import { useCountUp, usePrefersReducedMotion } from "./hooks";

function Kpi({
  label,
  value,
  note,
  tone,
  children,
}: {
  label: string;
  value?: number;
  note?: string;
  tone?: "alert";
  children?: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const shown = useCountUp(value, reduced);

  return (
    <div className="osa-kpi" data-tone={tone}>
      <p className="osa-kpi-label">{label}</p>
      {shown === undefined ? (
        <Skeleton className="osa-skel osa-kpi-skel" />
      ) : (
        <p className="osa-kpi-value">
          {/* The animated figure is decorative; assistive tech reads the final value once. */}
          <span aria-hidden="true">{num(shown)}</span>
          <span className="osa-sr">{num(value ?? shown)}</span>
        </p>
      )}
      {value === undefined ? <Skeleton className="osa-skel osa-kpi-note-skel" /> : <p className="osa-kpi-note">{note}</p>}
      {children}
    </div>
  );
}

export function KpiStrip({ stats, range }: { stats: StatsResponse | null; range: RangeKey }) {
  const totals = stats?.totals;
  const span = RANGE_META[range].label;
  const onboarded = totals ? percent(totals.onboarded, totals.users) : "";
  const onboardedWidth = totals && totals.users > 0 ? Math.min(100, (totals.onboarded / totals.users) * 100) : 0;

  return (
    <section className="osa-kpis" aria-label="Key numbers">
      <Kpi label="Total users" value={totals?.users} note={totals ? `+${num(totals.signups)} in ${span}` : undefined}>
        {totals ? (
          <div className="osa-meter-row">
            <div className="osa-meter" role="img" aria-label={`${onboarded} of users have onboarded`}>
              <i style={{ width: `${onboardedWidth}%` }} />
            </div>
            <span>{onboarded} onboarded</span>
          </div>
        ) : null}
      </Kpi>
      <Kpi
        label="Active users"
        value={totals?.active}
        note={totals ? `${percent(totals.active, totals.users)} of users` : undefined}
      />
      <Kpi label="Actions" value={totals?.activity} note={totals ? `in ${span}` : undefined} />
      <Kpi
        label="Blocked"
        value={totals?.blocked}
        note={totals ? `${percent(totals.blocked, totals.users)} of users` : undefined}
        tone={totals && totals.blocked > 0 ? "alert" : undefined}
      />
    </section>
  );
}
