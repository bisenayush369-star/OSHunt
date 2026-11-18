"use client";

import * as React from "react";
import { KeyRound } from "lucide-react";
import { LLM_STATES, llmAttention, type LlmIssue, type LlmProvider, type LlmSection } from "@/components/lib/admin/contract";
import type { LlmPanelProps } from "./types";
import { Button, Meter, Notice, Panel, Skeleton } from "./kit";
import { StateChip } from "./llm-state";
import { ago, compact, cx, duration, num, pct, until } from "./format";

/**
 * LLM APIs: for each provider, its limit, what it did in the last 24 hours, and the one thing that needs
 * changing (if anything). Providers are matched by NAME, so swapping Gemini for Anthropic needs no code change.
 * Nothing here is a secret: no key, no URL, no text written by a provider. Only the NAMES of the .env
 * variables to edit.
 */

const ROUTING_TEXT: Record<"fixed" | "auto" | "random", string> = {
  fixed: "Fixed order (LLM_PROVIDER_ORDER)",
  auto: "Fastest first, learned from recent calls",
  random: "Random order (LLM_AUTO_ORDER is off)",
};

const ISSUE_EDGE: Record<LlmIssue["kind"], string> = {
  change: "var(--osa-bad)",
  limit: "var(--osa-bad)",
  failing: "var(--osa-serious)",
  unlinked: "var(--osa-warn)",
  paused: "var(--osa-warn)",
  near: "var(--osa-warn)",
};

function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="osa-eyebrow">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="osa-num text-[16px] font-medium sm:text-[18px]">{value}</span>
        {note ? <span className="osa-faint text-[12px]">{note}</span> : null}
      </dd>
    </div>
  );
}

function Issue({ issue, now }: { issue: LlmIssue; now: number }) {
  return (
    <li className="border-l-2 pl-3" style={{ borderColor: ISSUE_EDGE[issue.kind] }}>
      <p className="text-[13px] font-medium">{issue.title}</p>
      <p className="osa-muted mt-0.5 text-[13px]">{issue.fix}</p>
      {issue.at !== null || issue.until !== null ? (
        <p className="osa-faint mt-1 text-[12px]">
          {issue.at !== null ? `Seen ${ago(issue.at, now)}` : null}
          {issue.at !== null && issue.until !== null ? " · " : null}
          {issue.until !== null ? `Tries again ${until(issue.until, now)}` : null}
        </p>
      ) : null}
    </li>
  );
}

function Mini({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="osa-eyebrow">{label}</dt>
      <dd className="osa-num mt-0.5 text-[14px]">{children}</dd>
    </div>
  );
}

function ProviderCard({ p, llm, now, focused, setRef }: { p: LlmProvider; llm: Extract<LlmSection, { available: true }>; now: number; focused: boolean; setRef: (name: string, el: HTMLElement | null) => void }) {
  const u = p.last24h;
  const failRate = u && u.calls > 0 ? (u.failed / u.calls) * 100 : 0;
  const headingId = `llm-${p.name}`;

  return (
    <Panel ref={(el) => setRef(p.name, el)} aria-labelledby={headingId} className="osa-card flex flex-col" data-focus={focused || undefined}>
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <h3 id={headingId} className="osa-truncate text-[16px] font-semibold leading-tight">
            {p.label}
          </h3>
          <p className="osa-mono osa-faint osa-truncate mt-0.5 text-[12px]">{p.known ? p.model ?? "model not set" : "not in llmRouter.ts"}</p>
        </div>
        <StateChip state={p.state} className="flex-none" />
      </div>

      {/* With a problem, the summary is the same words as the first issue's headline below: say it once. */}
      {p.issues.length > 0 && p.summary === p.issues[0]!.title ? null : <p className="osa-muted px-4 text-[13px]">{p.summary}</p>}

      {p.issues.length > 0 ? (
        <ul className="mx-4 mt-3 grid gap-3 rounded-[10px] bg-[var(--osa-raised)] p-3">
          {p.issues.map((issue, i) => (
            <Issue key={`${issue.kind}-${i}`} issue={issue} now={now} />
          ))}
        </ul>
      ) : null}

      {/* Limit */}
      <div className="px-4 pt-4">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="osa-eyebrow">Limit</span>
          {p.limit ? (
            <span className="osa-num text-[12px]">
              {num(p.limit.used)} <span className="osa-faint">of</span> {num(p.limit.max)} <span className="osa-faint">requests</span>
            </span>
          ) : null}
        </div>
        {p.limit ? (
          <>
            <Meter value={p.limit.used} max={p.limit.max} label={`${p.label} requests used`} />
            <p className="osa-faint mt-1.5 text-[12px]">
              {pct(p.limit.pct)} used{p.limit.active ? "" : ", switched off in the table"}
              {p.limit.rowName.toUpperCase().replace(/\s+/g, "") !== p.name ? ` (row "${p.limit.rowName}")` : ""}
            </p>
          </>
        ) : !llm.limits.connected ? (
          <p className="osa-faint text-[12px]">Limits are not connected.</p>
        ) : p.known ? (
          <p className="osa-faint text-[12px]">No limit set in the ApiProvider table.</p>
        ) : null}
      </div>

      {/* Last 24 hours */}
      <div className="px-4 pt-4">
        <p className="osa-eyebrow mb-2">Last 24 hours</p>
        {u ? (
          <>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-4">
              <Mini label="Calls">{num(u.calls)}</Mini>
              <Mini label="Failed">
                <span className={cx(u.failed > 0 && "text-[var(--osa-bad-text)]")}>{num(u.failed)}</span>
                {u.calls > 0 && u.failed > 0 ? <span className="osa-faint text-[11px]"> {pct(failRate, failRate < 10 ? 1 : 0)}</span> : null}
              </Mini>
              <Mini label="Avg time">{u.avgMs === null ? "—" : duration(u.avgMs)}</Mini>
              <Mini label="Tokens">
                {/* Each number keeps its unit: when the cell is narrow it breaks between "in" and the next number, never inside a pair. */}
                <span className="whitespace-nowrap">
                  {compact(u.tokensIn)}
                  <span className="osa-faint"> in</span>
                </span>{" "}
                <span className="whitespace-nowrap">
                  {compact(u.tokensOut)}
                  <span className="osa-faint"> out</span>
                </span>
              </Mini>
            </dl>
            <p className="osa-faint mt-2 text-[12px]">
              {u.lastCallAt === null ? "No calls yet." : `Last call ${ago(u.lastCallAt, now)}`}
              {u.lastOkAt !== null && u.lastOkAt !== u.lastCallAt ? `, last good ${ago(u.lastOkAt, now)}` : ""}
              {u.lastFailAt !== null ? `, last failure ${ago(u.lastFailAt, now)}${u.lastFailStatus !== null ? ` (HTTP ${u.lastFailStatus})` : ""}` : ""}
            </p>
          </>
        ) : (
          <p className="osa-faint text-[12px]">24-hour numbers are not connected.</p>
        )}
      </div>

      {/* What to edit */}
      <div className="mt-auto px-4 pb-4 pt-4">
        <p className="osa-eyebrow mb-1.5 flex items-center gap-1.5">
          <KeyRound className="size-3.5" aria-hidden />
          .env
        </p>
        <p className="text-[12px]">
          <span className={cx("font-medium", p.keySet ? "text-[var(--osa-ink)]" : "text-[var(--osa-warn)]")}>{p.keySet ? "Key is set" : "No key set"}</span>
          {p.envVar || p.modelEnvVar ? (
            <span className="osa-faint">
              {" "}
              ·{" "}
              {[p.envVar, p.modelEnvVar]
                .filter((v): v is string => Boolean(v))
                .map((v, i) => (
                  <React.Fragment key={v}>
                    {i > 0 ? ", " : null}
                    <span className="osa-mono">{v}</span>
                  </React.Fragment>
                ))}
            </span>
          ) : null}
        </p>
      </div>
    </Panel>
  );
}

export function LlmPanel({ llm, error, now, focus, onFocusDone, onRetry }: LlmPanelProps) {
  const refs = React.useRef(new Map<string, HTMLElement>());
  const [picked, setPicked] = React.useState<string | null>(null);
  const setRef = React.useCallback((name: string, el: HTMLElement | null) => {
    if (el) refs.current.set(name, el);
    else refs.current.delete(name);
  }, []);

  /** A click on a name in the red box: scroll to that card and outline it for a moment. */
  const pick = (name: string) => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    refs.current.get(name)?.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    setPicked(name);
    window.setTimeout(() => setPicked((now) => (now === name ? null : now)), 2600);
  };

  // Scroll to the provider the console asked for, keep it highlighted for a moment, then let go.
  const ready = llm !== null && llm.available;
  React.useEffect(() => {
    if (!focus || !ready) return;
    const el = refs.current.get(focus);
    if (el) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: calm ? "auto" : "smooth" });
    }
    const timer = window.setTimeout(onFocusDone, 2600);
    return () => window.clearTimeout(timer);
  }, [focus, ready, onFocusDone]);

  if (llm === null) {
    return error ? (
      <Notice
        tone="bad"
        title="Could not load the LLM status"
        action={
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {error}
      </Notice>
    ) : (
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="osa-panel p-4">
            <Skeleton w="40%" h={16} />
            <Skeleton w="70%" h={12} className="mt-3" />
            <Skeleton h={8} className="mt-6" />
            <Skeleton h={40} className="mt-6" />
          </div>
        ))}
      </div>
    );
  }

  if (!llm.available) {
    return (
      <Notice
        tone="warn"
        title="LLM status is not available"
        action={
          <Button size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {llm.reason}
      </Notice>
    );
  }

  const { act } = llmAttention(llm);
  const present = LLM_STATES.filter((s) => llm.counts[s] > 0);

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {act.length > 0 ? (
        <Notice tone="bad" title={act.length === 1 ? "1 API needs you" : `${act.length} APIs need you`}>
          <ul className="grid gap-1">
            {act.map((a) => (
              <li key={a.name}>
                <button type="button" className="osa-link" onClick={() => pick(a.name)}>
                  {a.label}
                </button>
                <span className="osa-muted">: {a.issues[0]?.fix ?? a.summary}</span>
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {!llm.limits.connected || !llm.usage.connected ? (
        <Notice tone="info" title={!llm.limits.connected && !llm.usage.connected ? "Limits and 24-hour numbers are not connected" : !llm.limits.connected ? "Limits are not connected" : "24-hour numbers are not connected"}>
          {[!llm.limits.connected ? llm.limits.note : null, !llm.usage.connected ? llm.usage.note : null].filter(Boolean).join(" ")}
        </Notice>
      ) : null}

      <Panel aria-labelledby="router-title" className="overflow-hidden">
        <div className="osa-panel-head">
          <div className="min-w-0">
            <h2 id="router-title" className="text-[15px] font-semibold leading-tight">
              Router
            </h2>
            <p className="osa-faint mt-0.5 text-[12px]">{ROUTING_TEXT[llm.routing.mode]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {present.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <StateChip state={s} />
                <span className="osa-num osa-faint text-[12px]">{llm.counts[s]}</span>
              </span>
            ))}
          </div>
        </div>
        {llm.routing.order.length > 0 ? (
          <p className="osa-mono osa-muted border-b border-[var(--osa-line)] px-4 py-2.5 text-[12px] [overflow-wrap:anywhere]">
            <span style={{ color: "var(--osa-lime)" }}>$</span> {llm.routing.order.join(" → ")}
          </p>
        ) : null}
        <dl className="grid grid-cols-2 lg:grid-cols-4 [&>div:nth-child(2n)]:border-l [&>div:nth-child(2n)]:border-[var(--osa-line)] [&>div:nth-child(n+3)]:border-t [&>div:nth-child(n+3)]:border-[var(--osa-line)] lg:[&>div:nth-child(n+3)]:border-t-0 lg:[&>div:nth-child(n+2)]:border-l lg:[&>div:nth-child(n+2)]:border-[var(--osa-line)]">
          <Stat label="Calls, 24 h" value={num(llm.totals.calls)} />
          <Stat label="Failed" value={num(llm.totals.failed)} note={llm.totals.calls > 0 && llm.totals.failed > 0 ? pct((llm.totals.failed / llm.totals.calls) * 100, 1) : undefined} />
          <Stat
            label="Tokens in / out"
            value={
              <>
                <span className="whitespace-nowrap">{compact(llm.totals.tokensIn)} /</span> <span className="whitespace-nowrap">{compact(llm.totals.tokensOut)}</span>
              </>
            }
          />
          <Stat label="Requests saved" value={num(llm.savings.shared + llm.savings.cacheHits)} note={`since ${ago(llm.savings.since, now)}`} />
        </dl>
      </Panel>

      {llm.providers.length === 0 ? (
        <Notice tone="info" title="No providers yet">
          Add a key for a provider in your .env file and it shows up here.
        </Notice>
      ) : (
        <div className="grid items-stretch gap-4 md:gap-5 lg:grid-cols-2">
          {llm.providers.map((p) => (
            <ProviderCard key={p.name} p={p} llm={llm} now={now} focused={focus === p.name || picked === p.name} setRef={setRef} />
          ))}
        </div>
      )}
    </div>
  );
}
