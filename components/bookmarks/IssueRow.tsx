"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, Check, CircleDot, Clock, CodeXml, Copy, ExternalLink, FolderGit2, MessageSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookmarkRecord } from "@/components/types/bookmarks";
import { describeIssue, type Difficulty } from "@/components/lib/bookmarks/adapters";
import { relativeTime } from "@/components/lib/bookmarks/format";
import type { ProposalsApi } from "@/components/hooks/useProposals";
import { SavedBookmarkButton } from "./BookmarkButton";
import "./bookmarks.css";

/**
 * The default card for a saved issue. It shows everything the old Bookmarks row did (title, repo,
 * language, difficulty, date, "Proposal AI", copy draft, remove) and more when the saved issue has
 * it: number, comments, labels, open / closed.
 *
 * To make saved issues look EXACTLY like your Hunt cards, plug your own card in
 * `components/bookmarks/overrides.tsx` and this component is not used.
 */

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const MAX_LABELS = 4;
const EASE = [0.22, 1, 0.36, 1] as const;

export interface IssueRowProps {
  record: BookmarkRecord;
  proposals: ProposalsApi;
}

export function IssueRow({ record, proposals }: IssueRowProps) {
  const view = useMemo(() => describeIssue(record), [record]);
  const cardRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number>(0);
  const reduce = useReducedMotion();
  const panelId = useId();

  const open = proposals.openId === record.id;
  const draft = proposals.texts[record.id];
  const copied = Boolean(proposals.copied[record.id]);

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

  // Only the first few labels are shown; "+N" is a real button that reveals the rest (and hides them again).
  const [showAllLabels, setShowAllLabels] = useState(false);
  const labels = showAllLabels ? view.labels : view.labels.slice(0, MAX_LABELS);
  const extraLabels = Math.max(0, view.labels.length - MAX_LABELS);
  const created = relativeTime(view.createdAt);
  const saved = relativeTime(record.savedAt);

  return (
    <article
      ref={cardRef}
      onPointerMove={onPointerMove}
      className="bm-issue"
      data-state={view.state ?? undefined}
      aria-label={`Saved issue: ${view.title}`}
    >
      <div className="bm-issue__icon" aria-hidden="true">
        <CircleDot strokeWidth={2} />
      </div>

      <div className="bm-issue__main">
        <h3 className="bm-issue__title">
          <a href={view.url} target="_blank" rel="noopener noreferrer">
            {view.title}
            <span className="bm-sr"> (opens on GitHub in a new tab)</span>
          </a>
        </h3>

        <div className="bm-meta">
          {view.repoName ? (
            <span className="bm-meta__repo">
              <FolderGit2 aria-hidden="true" />
              {view.repoName}
            </span>
          ) : null}
          {view.number !== null ? <span>#{view.number}</span> : null}
          {view.state ? <span>{view.state}</span> : null}
          {created ? (
            <span title={view.createdAt ? new Date(view.createdAt).toLocaleString() : undefined}>
              <Clock aria-hidden="true" />
              {created}
            </span>
          ) : null}
          {view.comments !== null ? (
            <span>
              <MessageSquare aria-hidden="true" />
              {view.comments}
              <span className="bm-sr"> comments</span>
            </span>
          ) : null}
          {saved ? (
            <span title={`Saved ${new Date(record.savedAt).toLocaleString()}`}>
              <Bookmark aria-hidden="true" />
              saved {saved}
            </span>
          ) : null}
        </div>

        {view.language || view.difficulty || labels.length > 0 ? (
          <div className="bm-chips">
            {view.language ? (
              <span className="bm-chip bm-chip--lang">
                <CodeXml aria-hidden="true" />
                {view.language}
              </span>
            ) : null}
            {view.difficulty ? (
              <span className={`bm-chip bm-chip--${view.difficulty}`}>{DIFFICULTY_LABEL[view.difficulty]}</span>
            ) : null}
            {labels.map((label) => (
              <span
                key={label.name}
                className="bm-chip bm-chip--label"
                style={label.color ? ({ "--chip": `#${label.color}` } as CSSProperties) : undefined}
                title={label.name}
              >
                {label.name}
              </span>
            ))}
            {extraLabels > 0 ? (
              <button
                type="button"
                className="bm-chip bm-chip--more"
                aria-expanded={showAllLabels}
                onClick={() => setShowAllLabels((value) => !value)}
              >
                {showAllLabels ? (
                  "Show fewer"
                ) : (
                  <>
                    +{extraLabels}
                    <span className="bm-sr"> more labels</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="bm-issue__actions">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bm-btn bm-btn--accent bm-btn--sm"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() =>
            void proposals.toggle({
              id: record.id,
              title: view.title,
              repo: view.repoName,
              language: view.language ?? "Unknown",
            })
          }
        >
          <Sparkles aria-hidden="true" />
          Proposal AI
        </Button>
        <Button asChild variant="outline" size="sm" className="bm-btn bm-btn--sm">
          <a href={view.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            View on GitHub
          </a>
        </Button>
        <SavedBookmarkButton record={record} subject={view.title} />
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="proposal"
            id={panelId}
            className="bm-proposal-wrap"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <div className="bm-proposal" aria-live="polite" aria-busy={!draft}>
              <div className="bm-proposal__head">
                <Sparkles aria-hidden="true" />
                Proposal draft
                <button type="button" className="bm-proposal__close" aria-label="Close proposal" onClick={proposals.close}>
                  <X size={15} aria-hidden="true" />
                </button>
              </div>

              {draft ? (
                <>
                  <p className="bm-proposal__text">{draft}</p>
                  <div className="bm-proposal__foot">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bm-btn bm-btn--accent bm-btn--sm"
                      onClick={() => void proposals.copy(record.id)}
                    >
                      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                      {copied ? "Copied" : "Copy draft"}
                    </Button>
                    <span className="bm-proposal__hint">Edit it a little before you send it. Maintainers like a personal touch.</span>
                  </div>
                </>
              ) : (
                <div className="bm-proposal__lines" role="status" aria-label="Writing your proposal">
                  <Skeleton className="bm-skel" style={{ height: 13, width: "96%" }} />
                  <Skeleton className="bm-skel" style={{ height: 13, width: "88%" }} />
                  <Skeleton className="bm-skel" style={{ height: 13, width: "64%" }} />
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  );
}
