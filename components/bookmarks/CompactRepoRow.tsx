"use client";

import { useCallback, useEffect, useRef } from "react";
import { FolderGit2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookmarkRecord } from "@/components/types/bookmarks";
import { relativeTime } from "@/components/lib/bookmarks/format";
import { SavedBookmarkButton } from "./BookmarkButton";
import "./bookmarks.css";

function repoDifficulty(score: number): "Easy" | "Medium" | "Hard" {
  if (score >= 80) return "Easy";
  if (score >= 55) return "Medium";
  return "Hard";
}

export function CompactRepoRow({ record }: { record: BookmarkRecord }) {
  const cardRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number>(0);
  const s = record.snapshot as Record<string, unknown>;
  const fullName = typeof s.full_name === "string" && s.full_name ? s.full_name : typeof s.fullName === "string" ? s.fullName : record.title;
  const repoName = typeof s.name === "string" && s.name ? s.name : record.title;
  const score = typeof s.reliabilityScore === "number" ? s.reliabilityScore : 0;
  const difficulty = repoDifficulty(score);
  const saved = relativeTime(record.savedAt);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const el = cardRef.current;
    if (!el) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${clientX - rect.left}px`);
      el.style.setProperty("--my", `${clientY - rect.top}px`);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return (
    <article
      ref={cardRef}
      onPointerMove={onPointerMove}
      className="bm-issue bm-repo-compact"
      data-compact="true"
      aria-label={`Saved repository: ${fullName}`}
    >
      <div className="bm-issue__icon" aria-hidden="true">
        <FolderGit2 strokeWidth={2} />
      </div>

      <div className="bm-issue__main bm-repo-compact__main">
        <h3 className="bm-issue__title bm-repo-compact__title">
          <a href={record.url} target="_blank" rel="noopener noreferrer">
            {repoName}
            <span className="bm-sr"> (opens on GitHub in a new tab)</span>
          </a>
        </h3>
        <div className="bm-repo-compact__full-name">{fullName}</div>
      </div>

      <div className="bm-issue__actions bm-repo-compact__actions">
        <div className={`bm-repo-compact__status bm-chip--${difficulty.toLowerCase()}`}>
          <span className="bm-repo-compact__status-dot" aria-hidden="true" />
          {difficulty}
          {saved ? <span className="bm-repo-compact__time">{saved}</span> : null}
        </div>

        <Button type="button" variant="outline" size="sm" className="bm-btn bm-btn--accent bm-btn--sm">
          <Sparkles aria-hidden="true" />
          Proposal AI
        </Button>

        <SavedBookmarkButton record={record} subject={repoName} size="sm" className="bm-repo-compact__save" />
      </div>
    </article>
  );
}
