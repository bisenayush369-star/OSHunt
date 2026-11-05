"use client";

import { AlertTriangle, CheckCircle2, CircleDashed, ShieldAlert } from "lucide-react";
import type { LlmSection } from "@/components/lib/admin/contract";

function StateDot({ state }: { state: string }) {
  const tone =
    state === "limit" || state === "failing" || state === "unlinked"
      ? "alert"
      : state === "near" || state === "paused" || state === "nokey"
        ? "warn"
        : "ok";

  return <span className={`osa-llm-dot osa-llm-dot-${tone}`} aria-hidden="true" />;
}

export function LlmPanel({ llm }: { llm: LlmSection | null }) {
  if (!llm || !llm.available) {
    return (
      <div className="osa-card osa-panel osa-cfull osa-llm-panel">
        <div className="osa-llm-empty">
          <ShieldAlert size={18} aria-hidden="true" />
          <p>{llm && !llm.available ? llm.reason : "The LLM router status is not available yet."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="osa-card osa-panel osa-cfull osa-llm-panel">
      <div className="osa-panel-head">
        <div className="osa-panel-titles">
          <h2 className="osa-panel-title">LLM router</h2>
          <p className="osa-panel-note">
            {llm.providers.filter((p) => p.state === "ok" || p.state === "ready").length} providers ready · {llm.totals.calls} calls in 24h
          </p>
        </div>
      </div>

      <div className="osa-llm-grid">
        {llm.providers.map((provider) => (
          <div key={provider.name} className="osa-llm-card">
            <div className="osa-llm-topline">
              <div className="osa-llm-namewrap">
                <StateDot state={provider.state} />
                <strong>{provider.label}</strong>
              </div>
              <span className="osa-llm-state">{provider.state}</span>
            </div>

            <p className="osa-llm-summary">{provider.summary}</p>

            <dl className="osa-llm-meta">
              <div>
                <dt>Model</dt>
                <dd>{provider.model ?? "—"}</dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd>{provider.keySet ? "Set" : "Missing"}</dd>
              </div>
              <div>
                <dt>Usage</dt>
                <dd>{provider.last24h ? `${provider.last24h.calls} calls` : "No data"}</dd>
              </div>
            </dl>

            {provider.issues.length > 0 ? (
              <ul className="osa-llm-issues">
                {provider.issues.map((issue, i) => (
                  <li key={`${provider.name}-${issue.kind}-${i}`}>
                    {issue.kind === "failing" || issue.kind === "limit" || issue.kind === "unlinked" ? (
                      <AlertTriangle size={14} aria-hidden="true" />
                    ) : issue.kind === "near" || issue.kind === "paused" ? (
                      <CircleDashed size={14} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={14} aria-hidden="true" />
                    )}
                    <span>{issue.title}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
