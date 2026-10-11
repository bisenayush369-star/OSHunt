"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_PATHS, SYNC, type UserDetailResponse } from "@/components/lib/admin/contract";
import { adminFetch, isAbort } from "./api";

type DetailState = {
  id: string;
  data: UserDetailResponse | null;
  error: string | null;
  at: number | null;
};

/**
 * Detail for ONE account (profile row, activity, live GitHub snapshot).
 * Loads when `id` changes, refreshes every SYNC.detailPollMs while the tab is visible,
 * and cancels in-flight requests when the sheet closes or switches account.
 */
export function useUserDetail(id: string | null) {
  const [state, setState] = useState<DetailState | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      setState(null);
      return;
    }

    let alive = true;
    const controller = new AbortController();

    setState((prev) => (prev?.id === id ? prev : { id, data: null, error: null, at: null }));

    const load = async () => {
      try {
        const result = await adminFetch<UserDetailResponse>(
          `${ADMIN_PATHS.api.users}?id=${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        if (alive) setState({ id, data: result.data, error: null, at: result.at });
      } catch (e) {
        if (!alive || isAbort(e)) return;
        setState((prev) => ({
          id,
          data: prev?.id === id ? prev.data : null,
          error: e instanceof Error ? e.message : "Could not load this account.",
          at: prev?.id === id ? prev.at : null,
        }));
      }
    };

    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, SYNC.detailPollMs);

    return () => {
      alive = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [id, tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return { detail: state && state.id === id ? state : null, refresh };
}
