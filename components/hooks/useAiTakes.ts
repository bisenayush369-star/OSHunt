"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAiInsights } from "@/components/lib/discovery/ai";
import type { AiTakeState, Repo } from "@/components/types/discovery";

/**
 * The same "AI take" logic the Discovery page has inline, as a hook, so the Bookmarks page
 * behaves identically: first click loads, a failed one can be retried, a finished one is kept.
 */
export function useAiTakes() {
  const [states, setStates] = useState<Record<number, AiTakeState>>({});

  // The latest states, readable from callbacks without re-creating them on every change.
  const latest = useRef(states);
  useEffect(() => {
    latest.current = states;
  }, [states]);

  const getAiTake = useCallback(async (repo: Repo, isRetry = false) => {
    const current = latest.current[repo.id];
    if (!isRetry && (current?.status === "loading" || current?.status === "done")) return;

    latest.current = { ...latest.current, [repo.id]: { status: "loading" } };
    setStates((prev) => ({ ...prev, [repo.id]: { status: "loading" } }));
    try {
      const insights = await fetchAiInsights(repo);
      setStates((prev) => ({ ...prev, [repo.id]: { status: "done", insights } }));
    } catch {
      setStates((prev) => ({ ...prev, [repo.id]: { status: "error" } }));
    }
  }, []);

  return { states, getAiTake };
}
