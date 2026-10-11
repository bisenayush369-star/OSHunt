"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADMIN_PATHS,
  SYNC,
  type AdminUser,
  type BlockResponse,
  type RangeKey,
  type StatsResponse,
  type UsersResponse,
} from "@/components/lib/admin/contract";
import { AdminApiError, adminFetch } from "./api";

export type RequestLogEntry = { url: string; ok: boolean; status: number; ms: number; at: number };

/**
 * THE sync engine for the console. Everything on screen that comes from the server flows
 * through this hook, so there is exactly one place that decides when data is refreshed.
 *
 *  - First load on mount, then every SYNC.pollMs while the tab is visible.
 *  - Instant refresh when the tab regains focus (if stale) and when the network returns.
 *  - Consecutive failures slow polling down (x2, x4) instead of hammering a sick server.
 *  - Stats are cached per range, so switching ranges shows the last result immediately
 *    while a fresh one loads.
 *  - Block/unblock is optimistic: the table updates at once, and rolls back on failure.
 */
export function useAdminSync(range: RangeKey) {
  const [usersRes, setUsersRes] = useState<UsersResponse | null>(null);
  const [statsByRange, setStatsByRange] = useState<Partial<Record<RangeKey, StatsResponse>>>({});
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [log, setLog] = useState<RequestLogEntry[]>([]);

  const rangeRef = useRef(range);
  const requestedRange = useRef<RangeKey | null>(null);
  const usersRef = useRef<UsersResponse | null>(null);
  const failures = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    rangeRef.current = range;
  }, [range]);

  useEffect(() => {
    usersRef.current = usersRes;
  }, [usersRes]);

  const record = useCallback((entry: RequestLogEntry) => {
    setLog((entries) => [entry, ...entries].slice(0, 8));
  }, []);

  /** fetch + request log. The log feeds the Sync inspector. */
  const tracked = useCallback(
    async <T,>(url: string, init?: Parameters<typeof adminFetch>[1]): Promise<T> => {
      const startedAt = Date.now();
      try {
        const result = await adminFetch<T>(url, init);
        record({ url, ok: true, status: result.status, ms: result.ms, at: result.at });
        return result.data;
      } catch (e) {
        record({
          url,
          ok: false,
          status: e instanceof AdminApiError ? e.status : 0,
          ms: Date.now() - startedAt,
          at: Date.now(),
        });
        throw e;
      }
    },
    [record],
  );

  const loadUsers = useCallback(async () => {
    setUsersRes(await tracked<UsersResponse>(ADMIN_PATHS.api.users));
  }, [tracked]);

  const loadStats = useCallback(
    async (key: RangeKey) => {
      const data = await tracked<StatsResponse>(`${ADMIN_PATHS.api.stats}?range=${key}`);
      setStatsByRange((cur) => ({ ...cur, [key]: data }));
    },
    [tracked],
  );

  /** Refresh everything. Concurrent calls share one in-flight request. Never rejects. */
  const syncAll = useCallback((): Promise<void> => {
    if (inflight.current) return inflight.current;

    setSyncing(true);
    requestedRange.current = rangeRef.current;

    const run = (async () => {
      const results = await Promise.allSettled([loadUsers(), loadStats(rangeRef.current)]);
      const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");

      if (failed) {
        failures.current += 1;
        setError(failed.reason instanceof Error ? failed.reason.message : "Sync failed.");
      } else {
        failures.current = 0;
        setError(null);
        lastRef.current = Date.now();
        setLastSyncAt(lastRef.current);
      }
    })().finally(() => {
      inflight.current = null;
      setSyncing(false);
    });

    inflight.current = run;
    return run;
  }, [loadUsers, loadStats]);

  // Polling, focus and network listeners.
  useEffect(() => {
    // Capture the initial browser connectivity state before scheduling polling.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);

    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      if (stopped) return;
      const step = Math.min(failures.current, SYNC.maxBackoff);
      timer = setTimeout(async () => {
        if (!document.hidden && navigator.onLine) await syncAll();
        schedule();
      }, SYNC.pollMs * 2 ** step);
    };

    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRef.current > SYNC.focusMs) void syncAll();
    };
    const onOnline = () => {
      setOnline(true);
      void syncAll();
    };
    const onOffline = () => setOnline(false);

    void syncAll();
    schedule();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncAll]);

  // Switching range: load that range now (cached data, if any, shows meanwhile).
  useEffect(() => {
    if (requestedRange.current === range) return;
    requestedRange.current = range;
    void loadStats(range).catch(() => undefined);
  }, [range, loadStats]);

  const setBlocked = useCallback(
    async (id: string, blocked: boolean, reason?: string): Promise<AdminUser> => {
      const snapshot = usersRef.current;

      setUsersRes(
        (cur) =>
          cur && {
            ...cur,
            users: cur.users.map((u) =>
              u.id === id
                ? { ...u, blocked, blockReason: blocked ? reason?.trim() || "Blocked by admin" : undefined }
                : u,
            ),
          },
      );

      try {
        const { user } = await tracked<BlockResponse>(ADMIN_PATHS.api.users, {
          method: "PATCH",
          body: JSON.stringify({ id, blocked, reason }),
        });
        setUsersRes((cur) => cur && { ...cur, users: cur.users.map((u) => (u.id === id ? user : u)) });
        void loadStats(rangeRef.current).catch(() => undefined); // totals.blocked changed
        return user;
      } catch (e) {
        setUsersRes(snapshot);
        throw e;
      }
    },
    [tracked, loadStats],
  );

  return {
    users: usersRes?.users ?? null,
    total: usersRes?.total ?? 0,
    stats: statsByRange[range] ?? null,
    lastSyncAt,
    syncing,
    error,
    online,
    log,
    syncNow: syncAll,
    setBlocked,
  };
}

export type AdminSync = ReturnType<typeof useAdminSync>;
