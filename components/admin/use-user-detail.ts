"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_PATHS, SYNC, type UserDetailResponse } from "@/components/lib/admin/contract";
import { adminFetch, errorMessage } from "./api";
import { usePageVisible } from "./hooks";
import { startLoop } from "./poll";

type Slot = { id: string; data: UserDetailResponse | null; error: string | null };

/**
 * One account's own activity and live GitHub data, refreshed every 30 s while its sheet is open.
 * Switching accounts shows the loading state, never the previous person's numbers.
 */
export function useUserDetail(userId: string | null): { detail: UserDetailResponse | null; error: string | null; loading: boolean; reload: () => void } {
  const visible = usePageVisible();
  const [slot, setSlot] = useState<Slot | null>(null);
  const [tick, setTick] = useState(0);
  const okAt = useRef(0);

  useEffect(() => {
    okAt.current = 0;
  }, [userId]);

  useEffect(() => {
    if (!userId || !visible) return;
    return startLoop({
      pollMs: SYNC.detailMs,
      lastOk: () => okAt.current,
      onStart: () => undefined,
      onEnd: () => undefined,
      onFail: (error) => setSlot((prev) => (prev && prev.id === userId && prev.data ? prev : { id: userId, data: null, error: errorMessage(error, "Could not load this account.") })),
      load: async (signal) => {
        const data = await adminFetch<UserDetailResponse>(`${ADMIN_PATHS.api.users}?id=${encodeURIComponent(userId)}`, { signal });
        if (signal.aborted) return;
        okAt.current = Date.now();
        setSlot({ id: userId, data, error: null });
      },
    });
  }, [userId, visible, tick]);

  const reload = useCallback(() => {
    okAt.current = 0;
    setTick((t) => t + 1);
  }, []);

  const current = slot && slot.id === userId ? slot : null;
  return { detail: current?.data ?? null, error: current?.error ?? null, loading: userId !== null && !current, reload };
}
