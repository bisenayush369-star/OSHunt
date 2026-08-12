"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useGitHubConnection } from "@/hooks/use-github-connection";

export function GitHubConnectionSettings() {
  const { status, loading, refresh } = useGitHubConnection();
  const pathname = usePathname();
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleDisconnect() {
    const confirmed = window.confirm("Disconnect GitHub? This will stop GitHub-powered features until you reconnect.");
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await fetch("/api/github/disconnect", { method: "POST" });
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.02]" />;
  }

  const hasRecord = status?.connected || status?.expired;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-base font-medium text-white">GitHub Connection</h3>
        <StatusPill connected={!!status?.connected} expired={!!status?.expired} />
      </div>

      {hasRecord ? (
        <div className="space-y-3 text-sm">
          <Row label="Username" value={`@${status?.username}`} />
          <Row
            label="Connected since"
            value={
              status?.connectedAt
                ? new Date(status.connectedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"
            }
          />
          <Row label="Scopes" value={status?.scopes?.length ? status.scopes.join(", ") : "read:user"} />
        </div>
      ) : (
        <p className="text-sm text-white/50">Not connected yet. Connect your GitHub account to unlock GitHub-powered features.</p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/api/github/connect?from=${encodeURIComponent(pathname)}`}
          className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          {hasRecord ? "Reconnect" : "Connect GitHub"}
        </a>

        {hasRecord && (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/50 transition-colors hover:border-red-400/30 hover:text-red-400"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-white/40">{label}</span>
      <span className="text-right text-white/80">{value}</span>
    </div>
  );
}

function StatusPill({ connected, expired }: { connected: boolean; expired: boolean }) {
  if (expired) {
    return <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-400">Expired</span>;
  }
  if (connected) {
    return <span className="rounded-full bg-[#a8ff3e]/10 px-2.5 py-1 text-xs font-medium text-[#a8ff3e]">Connected</span>;
  }
  return <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-medium text-white/40">Not connected</span>;
}
