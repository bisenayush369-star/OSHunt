"use client";

import { useEffect, useRef, useState } from "react";
import { GithubRateLimitError } from "@/lib/discovery/github";
import type { DiscoveryError, FetchStatus } from "@/types/discovery";

/**
 * Runs an async fetcher whenever `deps` changes, guarding against race
 * conditions: if the deps change again before a request resolves, the
 * stale response is discarded instead of overwriting newer state. This is
 * the one thing worth centralizing — every fetch in this feature
 * (category list, repo detail) needs the same guard, and it's easy to get
 * subtly wrong copy-pasted three times.
 */
export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  onSuccess?: (result: T) => void
) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [error, setError] = useState<DiscoveryError | null>(null);
  const seq = useRef(0);

  const run = () => {
    const mySeq = ++seq.current;
    setStatus("loading");
    setError(null);
    fetcher()
      .then((result) => {
        if (mySeq !== seq.current) return;
        setData(result);
        onSuccess?.(result);
        setStatus("loaded");
      })
      .catch((err) => {
        if (mySeq !== seq.current) return;
        setError(
          err instanceof GithubRateLimitError
            ? { type: "rate-limit", resetInSeconds: err.resetInSeconds }
            : { type: "generic" }
        );
        setStatus("error");
      });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, status, error, retry: run };
}
