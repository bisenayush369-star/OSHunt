"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/lib/bookmarks/toast";

/**
 * The "Proposal AI" panel of an issue row: asks `/api/proposal` for a message you can send to the
 * maintainers, falls back to a friendly template if that fails, and copies it to the clipboard.
 * Same behaviour as your previous Bookmarks page, packaged as a hook.
 */

export interface ProposalRequest {
  /** A stable id for the row (the bookmark id). */
  id: string;
  title: string;
  repo: string;
  language: string;
}

function fallbackText(title: string): string {
  return `Hi maintainers! 👋 I'd love to work on "${title}". Could you please assign it to me? Let me know if there are any specific implementation guidelines you'd like me to follow.`;
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function useProposals() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const toggle = useCallback(
    async (request: ProposalRequest) => {
      if (texts[request.id]) {
        setOpenId((current) => (current === request.id ? null : request.id));
        return;
      }
      setOpenId(request.id);
      try {
        const res = await fetch("/api/proposal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: request.title,
            repo: request.repo || "unknown",
            language: request.language || "Unknown",
          }),
        });
        if (!res.ok) throw new Error("Proposal request failed");
        const data: unknown = await res.json();
        const proposal = typeof (data as { proposal?: unknown })?.proposal === "string" ? (data as { proposal: string }).proposal : "";
        setTexts((prev) => ({ ...prev, [request.id]: proposal || fallbackText(request.title) }));
      } catch {
        setTexts((prev) => ({ ...prev, [request.id]: fallbackText(request.title) }));
      }
    },
    [texts],
  );

  const close = useCallback(() => setOpenId(null), []);

  const copy = useCallback(async (id: string) => {
    const ok = await copyToClipboard(texts[id] ?? "");
    if (!ok) {
      toast({ tone: "error", message: "Copy failed in this browser. Please copy it manually." });
      return;
    }
    setCopied((prev) => ({ ...prev, [id]: true }));
    timers.current.push(
      window.setTimeout(() => setCopied((prev) => ({ ...prev, [id]: false })), 1400),
    );
  }, [texts]);

  return { openId, texts, copied, toggle, close, copy };
}

export type ProposalsApi = ReturnType<typeof useProposals>;
