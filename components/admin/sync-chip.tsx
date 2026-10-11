"use client";

import { SYNC } from "@/components/lib/admin/contract";
import { useNow } from "./hooks";

type State = "live" | "syncing" | "stale" | "error" | "offline";

const STATE_LABEL: Record<State, string> = {
  live: "Up to date",
  syncing: "Syncing",
  stale: "Out of date",
  error: "Last sync failed",
  offline: "Offline",
};

function ageText(ms: number) {
  const s = Math.floor(ms / 1000);
  if (s < 5) return "Synced just now";
  if (s < 90) return `Synced ${s}s ago`;
  return `Synced ${Math.floor(s / 60)}m ago`;
}

/**
 * Telemetry is only labelled "live" while a recent sync backs it. After SYNC.staleAfterMs
 * without a good sync the dot turns amber and the label says so. Screen readers hear the
 * state change once (the visible seconds counter is not announced).
 */
export function SyncChip({
  lastSyncAt,
  syncing,
  error,
  online,
  onSync,
}: {
  lastSyncAt: number | null;
  syncing: boolean;
  error: string | null;
  online: boolean;
  onSync: () => void;
}) {
  const now = useNow(1000);
  const age = lastSyncAt === null ? null : Math.max(0, now - lastSyncAt);
  const stale = age !== null && age > SYNC.staleAfterMs;

  const state: State = !online
    ? "offline"
    : age === null
      ? error
        ? "error"
        : "syncing"
      : error && stale
        ? "error"
        : stale
          ? "stale"
          : "live";

  const text =
    state === "live" && age !== null
      ? ageText(age)
      : state === "syncing"
        ? "Syncing…"
        : state === "stale"
          ? "Out of date"
          : state === "error"
            ? "Sync failed"
            : "Offline";

  return (
    <button
      type="button"
      className="osa-sync"
      data-state={state}
      data-busy={syncing}
      onClick={onSync}
      aria-label={`Sync now. ${STATE_LABEL[state]}.`}
      title={error ?? "Click to sync now"}
    >
      <span className="osa-sonar" aria-hidden="true">
        <i />
      </span>
      <span aria-hidden="true">{text}</span>
      <span className="osa-sr" role="status">
        {STATE_LABEL[state]}
      </span>
    </button>
  );
}
