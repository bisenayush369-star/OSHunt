"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { RANGE_META, RANGES, type RangeKey, type RecentEvent } from "@/components/lib/admin/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Face } from "./face";
import { ago, humanize, num } from "./format";
import { KpiStrip } from "./kpi-strip";
import { Radar } from "./radar";
import { TrendChart } from "./trend-chart";
import type { AdminSync } from "./use-admin-sync";

export function RangeSwitch({ value, onChange }: { value: RangeKey; onChange: (range: RangeKey) => void }) {
  return (
    <div className="osa-seg" role="group" aria-label="Time range">
      {RANGES.map((range) => {
        const on = range === value;
        return (
          <button key={range} type="button" aria-pressed={on} data-on={on} onClick={() => onChange(range)}>
            {on ? (
              <motion.span
                layoutId="osa-range-pill"
                className="osa-seg-pill"
                transition={{ type: "spring", stiffness: 520, damping: 42 }}
              />
            ) : null}
            <span>{RANGE_META[range].label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Feed({ events, now, onOpen }: { events: RecentEvent[]; now: number; onOpen: (userId: string) => void }) {
  if (events.length === 0) return <p className="osa-muted osa-pad">No actions in this window yet.</p>;

  return (
    <ul className="osa-feed">
      {events.slice(0, 8).map((event) => (
        <li key={event.id}>
          <button
            type="button"
            className="osa-feed-row osa-reticle"
            data-blocked={event.blocked}
            onClick={() => onOpen(event.userId)}
          >
            <Face name={event.name} size={30} />
            <span className="osa-feed-text">
              <span className="osa-pii osa-feed-name">{event.name}</span>
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
          users: {
            total,
            loaded: users?.length ?? 0,
            sample: (users ?? []).slice(0, 2).map((u) => ({
              id: u.id,
              name: u.name,
              githubUsername: u.githubUsername,
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
    <details className="osa-inspector osa-ov-wide">
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
        <pre className="osa-code osa-pii" tabIndex={0}>
          {snapshot}
        </pre>
      </div>
    </details>
  );
}

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

  return (
    <div className="osa-overview">
      <div className="osa-pagehead osa-ov-wide">
        <div>
          <h1>Overview</h1>
          <p className="osa-sub">
            {totals
              ? `${num(totals.signups)} new users and ${num(totals.active)} active in the last ${long}.`
              : "Loading the latest numbers."}
          </p>
        </div>
        <RangeSwitch value={range} onChange={onRange} />
      </div>

      {error && !stats ? (
        <div className="osa-alert osa-ov-wide" role="alert">
          <p>{error}</p>
          <Button className="osa-btn osa-btn-ghost" onClick={() => void sync.syncNow()}>
            Try again
          </Button>
        </div>
      ) : null}

      <div className="osa-ov-main">
        <KpiStrip stats={stats} range={range} />

        <Card className="osa-panel">
          <CardHeader className="osa-panel-head">
            <CardTitle className="osa-panel-title">Growth and activity</CardTitle>
          </CardHeader>
          <CardContent className="osa-panel-body">
            {stats ? (
              <TrendChart buckets={stats.buckets} range={range} />
            ) : (
              <Skeleton className="osa-skel osa-chart-skel" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="osa-ov-side">
        <Card className="osa-panel">
          <CardHeader className="osa-panel-head">
            <CardTitle className="osa-panel-title">Latest actions</CardTitle>
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

        <Card className="osa-panel">
          <CardHeader className="osa-panel-head">
            <CardTitle className="osa-panel-title">Recent activity</CardTitle>
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
      </div>

      <Inspector sync={sync} range={range} now={now} />
    </div>
  );
}
