"use client";

import { useCallback, useEffect, useState } from "react";

export type GitHubConnectionStatus = {
  connected: boolean;
  expired: boolean;
  username?: string;
  avatarUrl?: string | null;
  connectedAt?: string;
  scopes?: string[];
};

export function useGitHubConnection() {
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/github/status", { cache: "no-store" });
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, expired: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, refresh };
}
