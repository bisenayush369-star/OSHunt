"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADMIN_PATHS,
  BLOCK_REASON_MAX,
  SYNC,
  type AdminUser,
  type BlockResponse,
  type LlmResponse,
  type LlmSection,
  type RangeKey,
  type StatsResponse,
  type UsersResponse,
} from "@/components/lib/admin/contract";
import { AdminApiError, adminFetch, errorMessage, viewerTzMinutes } from "./api";
import { useOnline, usePageVisible } from "./hooks";
import { startLoop } from "./poll";
import type { AdminSync, AdminView } from "./types";

type Part = "stats" | "users" | "llm";

/**
 * The console's data. One hook, three loops (numbers, accounts, LLM status), one `AdminSync` out.
 *
 *  - Numbers refresh every 20 s on the Overview and are loaded once elsewhere; accounts every 60 s on Accounts;
 *    LLM status every 30 s everywhere (it drives the red badge on the menu).
 *  - Nothing polls while the tab is hidden or the browser is offline; coming back refreshes at once (unless the
 *    data is fresher than SYNC.focusMs).
 *  - A failed refresh keeps what is on screen. Only a part that never loaded shows an error.
 *  - Changing the range aborts the request in flight; the old range stays visible, dimmed (`stale`).
 *  - A 401 anywhere ends the session screen. Nothing retries a 401.
 */
export function useAdminSync({ range, view }: { range: RangeKey; view: AdminView }): AdminSync {
  const visible = usePageVisible();
  const online = useOnline();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [llm, setLlm] = useState<LlmSection | null>(null);
  const [errors, setErrors] = useState<AdminSync["errors"]>({ stats: null, users: null, llm: null });
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [inflight, setInflight] = useState(0);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [kick, setKick] = useState(0);
  const [statsKick, setStatsKick] = useState(0);

  const okAt = useRef<Record<Part, number>>({ stats: 0, users: 0, llm: 0 });
  const hasData = useRef<Record<Part, boolean>>({ stats: false, users: false, llm: false });
  const statsRange = useRef<RangeKey | null>(null);
  const usersRef = useRef<AdminUser[] | null>(null);
  /** Rows with a block/unblock in flight: a poll that lands meanwhile must not undo the optimistic state. */
  const pending = useRef(new Map<string, AdminUser>());

  const enabled = visible && online && !sessionEnded;
  const statsPollMs = view === "overview" ? SYNC.statsMs : null;
  const usersPollMs = view === "accounts" ? SYNC.usersMs : null;

  const bump = useCallback(() => setInflight((n) => n + 1), []);
  const settle = useCallback(() => setInflight((n) => Math.max(0, n - 1)), []);

  const done = useCallback((part: Part) => {
    const now = Date.now();
    okAt.current[part] = now;
    hasData.current[part] = true;
    setErrors((prev) => (prev[part] === null ? prev : { ...prev, [part]: null }));
    setLastSyncAt(now);
  }, []);

  /** `quiet` = something for this part is already on screen, so the sync chip says "out of date" and nothing else shouts. */
  const failed = useCallback((part: Part, error: unknown, quiet: boolean) => {
    if (error instanceof AdminApiError && error.signedOut) {
      setSessionEnded(true);
      return;
    }
    if (quiet) return;
    setErrors((prev) => ({ ...prev, [part]: errorMessage(error, "Could not load this.") }));
  }, []);

  /* Numbers ---------------------------------------------------------------- */
  useEffect(() => {
    if (!enabled) return;
    const tz = viewerTzMinutes();
    return startLoop({
      pollMs: statsPollMs,
      lastOk: () => (statsRange.current === range ? okAt.current.stats : 0),
      onStart: () => {
        bump();
        if (statsRange.current !== range) setErrors((prev) => (prev.stats === null ? prev : { ...prev, stats: null }));
      },
      onEnd: settle,
      onFail: (error) => failed("stats", error, statsRange.current === range),
      load: async (signal) => {
        const data = await adminFetch<StatsResponse>(`${ADMIN_PATHS.api.stats}?range=${range}&tz=${tz}`, { signal });
        if (signal.aborted) return;
        statsRange.current = data.range;
        setStats(data);
        done("stats");
      },
    });
  }, [enabled, range, statsPollMs, kick, statsKick, bump, settle, done, failed]);

  /* Accounts --------------------------------------------------------------- */
  useEffect(() => {
    if (!enabled) return;
    return startLoop({
      pollMs: usersPollMs,
      lastOk: () => okAt.current.users,
      onStart: bump,
      onEnd: settle,
      onFail: (error) => failed("users", error, hasData.current.users),
      load: async (signal) => {
        const data = await adminFetch<UsersResponse>(ADMIN_PATHS.api.users, { signal });
        if (signal.aborted) return;
        const list = data.users.map((u) => pending.current.get(u.id) ?? u);
        usersRef.current = list;
        setUsers(list);
        setTotal(data.total);
        done("users");
      },
    });
  }, [enabled, usersPollMs, kick, bump, settle, done, failed]);

  /* LLM status ------------------------------------------------------------- */
  useEffect(() => {
    if (!enabled) return;
    return startLoop({
      pollMs: SYNC.llmMs,
      lastOk: () => okAt.current.llm,
      onStart: bump,
      onEnd: settle,
      onFail: (error) => failed("llm", error, hasData.current.llm),
      load: async (signal) => {
        const data = await adminFetch<LlmResponse>(ADMIN_PATHS.api.llm, { signal });
        if (signal.aborted) return;
        setLlm(data.llm);
        done("llm");
      },
    });
  }, [enabled, kick, bump, settle, done, failed]);

  /* Actions ---------------------------------------------------------------- */

  const syncNow = useCallback(async () => {
    okAt.current = { stats: 0, users: 0, llm: 0 };
    setKick((k) => k + 1);
  }, []);

  const setBlocked = useCallback<AdminSync["setBlocked"]>(async (id, blocked, reason) => {
    const clean = blocked ? reason?.trim().slice(0, BLOCK_REASON_MAX) || undefined : undefined;
    const before = usersRef.current?.find((u) => u.id === id) ?? null;

    const put = (next: AdminUser) => {
      if (!usersRef.current) return;
      const list = usersRef.current.map((u) => (u.id === id ? next : u));
      usersRef.current = list;
      setUsers(list);
    };

    if (before) {
      const optimistic: AdminUser = { ...before, blocked, blockReason: clean };
      pending.current.set(id, optimistic);
      put(optimistic);
    }

    try {
      const { user } = await adminFetch<BlockResponse>(ADMIN_PATHS.api.users, { method: "PATCH", body: JSON.stringify({ id, blocked, reason }) });
      pending.current.delete(id);
      put(user);
      // The Blocked tile and the numbers behind it changed: reload them now instead of waiting for the next poll.
      okAt.current.stats = 0;
      setStatsKick((k) => k + 1);
      return user;
    } catch (error) {
      pending.current.delete(id);
      if (before) put(before);
      if (error instanceof AdminApiError && error.signedOut) setSessionEnded(true);
      throw error;
    }
  }, []);

  return {
    stats,
    users,
    total,
    llm,
    errors,
    lastSyncAt,
    syncing: inflight > 0,
    online,
    sessionEnded,
    // The previous range is still on screen while the new one loads. A failed load clears this (errors.stats is set).
    stale: stats !== null && stats.range !== range && errors.stats === null,
    syncNow,
    setBlocked,
  };
}
