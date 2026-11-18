"use client";

import * as React from "react";
import { ArrowRight, Ban } from "lucide-react";
import { RANGE_META, llmAttention, type BillingSection, type LlmSection } from "@/components/lib/admin/contract";
import type { Navigate, OverviewProps } from "./types";
import { Delta, GrowthChart, Sparkline, UsageChart } from "./charts";
import { Button, Chip, Notice, Panel, PanelHead, Skeleton } from "./kit";
import { StateChip } from "./llm-state";
import { num, pct, signed, thin } from "./format";

/**
 * Overview: attention first (only when something needs the owner), then the numbers, the growth chart,
 * API usage and an at-a-glance view of the LLM APIs. There is deliberately no global "recent activity" feed:
 * activity lives on each account's own sheet.
 */

function Tile({ label, value, children, onClick, spark, title }: { label: string; value: React.ReactNode; children?: React.ReactNode; onClick?: () => void; spark?: readonly number[]; title?: string }) {
  const inner = (
    <>
      <span className="osa-eyebrow block">{label}</span>
      <span className="osa-hero-num mt-2 block text-[26px]">{value}</span>
      <span className="mt-2 flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">{children}</span>
      {spark && spark.length > 1 ? (
        <span className="mt-2 block">
          <Sparkline values={spark} />
        </span>
      ) : null}
    </>
  );
  return onClick ? (
    <button type="button" className="osa-tile" onClick={onClick} title={title}>
      {inner}
    </button>
  ) : (
    <div className="osa-tile" title={title}>
      {inner}
    </div>
  );
}

function TileSkeletons() {
  return (
    <>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="osa-tile" aria-hidden>
          <Skeleton w={64} h={10} />
          <Skeleton w={88} h={26} className="mt-3" />
          <Skeleton w={110} h={10} className="mt-3" />
        </div>
      ))}
    </>
  );
}

function limitLine(p: { limit: { used: number; max: number; pct: number } | null; summary: string }): string {
  return p.limit ? `${num(p.limit.used)} of ${num(p.limit.max)} requests (${pct(p.limit.pct)})` : p.summary;
}

function LlmGlance({ llm, error, onNavigate }: { llm: LlmSection | null; error: string | null; onNavigate: Navigate }) {
  return (
    <Panel aria-labelledby="glance-title" className="overflow-hidden">
      <PanelHead
        id="glance-title"
        title="LLM APIs"
        hint="Limit and health, by provider"
        actions={
          <Button size="sm" variant="ghost" onClick={() => onNavigate("llm")}>
            Open
            <ArrowRight />
          </Button>
        }
      />
      {llm === null ? (
        error ? (
          <p className="osa-muted p-4 text-[13px]">{error}</p>
        ) : (
          <div className="grid gap-3 p-4" aria-hidden>
            <Skeleton h={14} />
            <Skeleton h={14} />
            <Skeleton h={14} />
          </div>
        )
      ) : !llm.available ? (
        <p className="osa-muted p-4 text-[13px]">{llm.reason}</p>
      ) : llm.providers.length === 0 ? (
        <p className="osa-muted p-4 text-[13px]">No providers are set up in the router.</p>
      ) : (
        <ul className="osa-list">
          {llm.providers.slice(0, 6).map((p) => {
            const level = p.limit ? (p.limit.pct >= 100 ? "bad" : p.limit.pct >= 80 ? "warn" : "") : "";
            return (
              <li key={p.name}>
                <button type="button" className="osa-row" onClick={() => onNavigate("llm", { provider: p.name })}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.label}</span>
                    <span className="osa-faint block truncate text-[12px]">{limitLine(p)}</span>
                    {p.limit ? (
                      <span className={`osa-bar mt-1.5 block ${level ? `osa-bar--${level}` : ""}`} aria-hidden>
                        <i style={{ width: `${Math.min(100, Math.max(p.limit.pct > 0 ? 2 : 0, p.limit.pct))}%` }} />
                      </span>
                    ) : null}
                  </span>
                  <StateChip state={p.state} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function PlansPanel({ billing }: { billing: BillingSection | undefined }) {
  if (!billing || !billing.available || billing.plans.length === 0) return null;
  const all = billing.plans.reduce((sum, p) => sum + p.users, 0) || 1;
  return (
    <Panel aria-labelledby="plans-title" className="overflow-hidden">
      <PanelHead id="plans-title" title="Plans" hint={`${num(billing.totals.paid)} paid, ${num(billing.totals.free)} free`} />
      <ul className="osa-list">
        {billing.plans.map((p) => (
          <li key={p.plan}>
            <div className="osa-row flex-col items-stretch gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{p.plan}</span>
                <span className="osa-num flex-none text-[13px]">
                  {num(p.users)} <span className="osa-faint">({pct((p.users / all) * 100)})</span>
                </span>
              </div>
              <span className="osa-bar" aria-hidden>
                <i style={{ width: `${Math.max(2, (p.users / all) * 100)}%` }} />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export function Overview({ range, onRange, sync, onNavigate }: OverviewProps) {
  const { stats, llm, errors } = sync;
  const { act, watch } = llmAttention(llm);
  // The router logs a call as GEMINI; the table and every other screen say Gemini. Show the readable name.
  const providerLabels = React.useMemo(
    () => (llm && llm.available ? new Map(llm.providers.map((prov) => [prov.name.toUpperCase(), prov.label] as const)) : undefined),
    [llm],
  );
  const firstLoadFailed = stats === null && errors.stats !== null;
  const rangeFailed = stats !== null && errors.stats !== null;
  const shown = stats?.range ?? range;
  const long = RANGE_META[shown].long;
  const t = stats?.totals;
  const p = stats?.previous;
  const billing = stats?.billing;

  return (
    <div className="flex flex-col gap-4 md:gap-5" aria-busy={sync.stale || undefined}>
      {act.length > 0 ? (
        <Notice
          tone="bad"
          title={act.length === 1 ? "1 LLM API needs you" : `${act.length} LLM APIs need you`}
          action={
            <Button size="sm" variant="danger" onClick={() => onNavigate("llm", { provider: act[0]!.name })}>
              Open
              <ArrowRight />
            </Button>
          }
        >
          <ul className="grid gap-0.5">
            {act.slice(0, 3).map((a) => (
              <li key={a.name}>
                <button type="button" className="osa-link" onClick={() => onNavigate("llm", { provider: a.name })}>
                  {a.label}
                </button>
                <span className="osa-muted">: {a.issues[0]?.fix ?? a.summary}</span>
              </li>
            ))}
          </ul>
        </Notice>
      ) : watch.length > 0 ? (
        <Notice
          tone="warn"
          title={watch.length === 1 ? "1 LLM API is worth a look" : `${watch.length} LLM APIs are worth a look`}
          action={
            <Button size="sm" onClick={() => onNavigate("llm", { provider: watch[0]!.name })}>
              Open
              <ArrowRight />
            </Button>
          }
        >
          {watch
            .slice(0, 4)
            .map((a) => a.label)
            .join(", ")}
        </Notice>
      ) : null}

      {firstLoadFailed ? (
        <Notice
          tone="bad"
          title="Could not load the numbers"
          action={
            <Button size="sm" onClick={() => void sync.syncNow()}>
              Try again
            </Button>
          }
        >
          {errors.stats}
        </Notice>
      ) : (
        <>
          {rangeFailed ? (
            <Notice
              tone="warn"
              title={`Could not load ${RANGE_META[range].long}`}
              action={
                <Button size="sm" onClick={() => void sync.syncNow()}>
                  Try again
                </Button>
              }
            >
              Showing the last {long} until it loads.
            </Notice>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {t && p ? (
              <>
                <Tile label="Accounts" value={num(t.users)} onClick={() => onNavigate("accounts", { filter: "all" })} title="Open the account list">
                  <span className="osa-muted">
                    <b className="osa-num font-medium text-[var(--osa-ink)]">{signed(t.signups)}</b> in {long}
                  </span>
                </Tile>
                <Tile label="Active" value={num(t.active)} title={`Accounts with at least one action in the last ${long}`}>
                  <Delta current={t.active} previous={p.active} />
                </Tile>
                <Tile label="Actions" value={num(t.activity)} spark={thin(stats.buckets.map((b) => b.activity), 24)} title={`Everything accounts did in the last ${long}`}>
                  <Delta current={t.activity} previous={p.activity} />
                </Tile>
                <Tile label="Onboarded" value={num(t.onboarded)}>
                  <span className="osa-muted">{pct(t.users > 0 ? (t.onboarded / t.users) * 100 : 0)} of accounts</span>
                </Tile>
                <Tile label="Blocked" value={num(t.blocked)} onClick={() => onNavigate("accounts", { filter: "blocked" })} title="Open the blocked accounts">
                  {t.blocked > 0 ? (
                    <Chip tone="serious" icon={Ban}>
                      View list
                    </Chip>
                  ) : (
                    <span className="osa-faint">Nobody blocked</span>
                  )}
                </Tile>
                {billing && billing.available ? (
                  <Tile label="Paid" value={num(billing.totals.paid)} onClick={() => onNavigate("accounts", { filter: "paid" })} title="Open the paid accounts">
                    <span className="osa-muted">{pct(billing.totals.conversionPct, 1)} of accounts</span>
                  </Tile>
                ) : (
                  <Tile label="Paid" value={"—"} title={billing && !billing.available ? billing.reason : undefined}>
                    <span className="osa-faint">Not connected</span>
                  </Tile>
                )}
              </>
            ) : (
              <TileSkeletons />
            )}
          </div>

          <GrowthChart stats={stats} range={range} onRange={onRange} stale={sync.stale} />

          <div className="grid gap-4 md:gap-5 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <UsageChart usage={stats?.usage} range={shown} stale={sync.stale} onOpenLlm={() => onNavigate("llm")} providerLabels={providerLabels} />
            </div>
            <div className="flex min-w-0 flex-col gap-4 md:gap-5">
              <LlmGlance llm={llm} error={errors.llm} onNavigate={onNavigate} />
              <PlansPanel billing={billing} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
