import { SYNC } from "@/components/lib/admin/contract";
import { isAbort } from "./api";

export type LoopOptions = {
  /** Milliseconds between loads. null = load once, then stop (the effect that started the loop decides when to start again). */
  pollMs: number | null;
  /** When the last good load of this data finished (0 = never). Data that is fresher than SYNC.focusMs is not loaded again. */
  lastOk: () => number;
  /** Fetches and applies the data. Must check `signal.aborted` before applying, so a stale answer can never win. */
  load: (signal: AbortSignal) => Promise<void>;
  onStart: () => void;
  onFail: (error: unknown) => void;
  onEnd: () => void;
};

/**
 * A self-scheduling load loop. Used by effects: `return startLoop({...})`.
 *  - every failure doubles the wait (up to 2^SYNC.maxBackoff), a success resets it
 *  - cleaning up aborts the request in flight and cancels the next one
 *  - a loop that starts while data is still fresh waits out the rest of SYNC.focusMs first
 */
export function startLoop(o: LoopOptions): () => void {
  const abort = new AbortController();
  let cancelled = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async () => {
    if (cancelled) return;
    o.onStart();
    try {
      await o.load(abort.signal);
      failures = 0;
    } catch (error) {
      if (!cancelled && !isAbort(error)) {
        failures += 1;
        o.onFail(error);
      }
    }
    o.onEnd();
    if (cancelled || o.pollMs === null) return;
    timer = setTimeout(run, o.pollMs * 2 ** Math.min(failures, SYNC.maxBackoff));
  };

  timer = setTimeout(run, Math.max(0, SYNC.focusMs - (Date.now() - o.lastOk())));

  return () => {
    cancelled = true;
    abort.abort();
    if (timer) clearTimeout(timer);
  };
}
