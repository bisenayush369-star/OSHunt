"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Bookmark, CloudOff, Compass, Crosshair, Download, History, LoaderCircle, LogIn, SearchX, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RepoGrid } from "@/components/discovery/RepoGrid";
import type { AiTakeState, Repo } from "@/components/types/discovery";
import { BOOKMARK_ROUTES } from "@/components/lib/bookmarks/config";
import { plural } from "@/components/lib/bookmarks/format";
import type { BookmarkTab } from "@/components/lib/bookmarks/view";
import "./bookmarks.css";

/** Everything the Bookmarks page shows when it is not simply a list: empty, loading, errors, banners. */

function StatePanel({
  icon,
  title,
  text,
  tone,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone?: "error";
  children?: ReactNode;
}) {
  return (
    <div className={`bm-state${tone === "error" ? " bm-state--error" : ""}`} role={tone === "error" ? "alert" : undefined}>
      <div className="bm-state__icon" aria-hidden="true">
        {icon}
      </div>
      <h2 className="bm-state__title">{title}</h2>
      <p className="bm-state__text">{text}</p>
      {children ? <div className="bm-state__actions">{children}</div> : null}
    </div>
  );
}

function LinkButton({ href, primary, children }: { href: string; primary?: boolean; children: ReactNode }) {
  return (
    <Button asChild variant="outline" className={`bm-btn ${primary ? "bm-btn--primary" : ""}`}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

export function EmptyState({ scope }: { scope: BookmarkTab }) {
  const discover = (
    <LinkButton href={BOOKMARK_ROUTES.discover} primary>
      <Compass aria-hidden="true" />
      Discover repos
    </LinkButton>
  );
  const hunt = (
    <LinkButton href={BOOKMARK_ROUTES.hunt} primary={scope === "issues"}>
      <Crosshair aria-hidden="true" />
      {scope === "issues" ? "Start hunting" : "Find issues"}
      {scope === "issues" ? <ArrowRight aria-hidden="true" /> : null}
    </LinkButton>
  );

  if (scope === "repos") {
    return (
      <StatePanel
        icon={<Bookmark />}
        title="No saved repos yet"
        text="Tap the bookmark on any repo in Discovery and it will show up here, with the same card, AI take and details."
      >
        {discover}
      </StatePanel>
    );
  }
  if (scope === "issues") {
    return (
      <StatePanel
        icon={<Bookmark />}
        title="No saved issues yet"
        text="Save an issue from Hunt and it will wait for you here, so you can come back and pitch the maintainers."
      >
        {hunt}
      </StatePanel>
    );
  }
  return (
    <StatePanel
      icon={<Bookmark />}
      title="No bookmarks yet"
      text="Save repos from Discovery or issues from Hunt. They show up here looking exactly the way you saved them."
    >
      {discover}
      {hunt}
    </StatePanel>
  );
}

export function NoResultsState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <StatePanel
      icon={<SearchX />}
      title={`No matches for “${query}”`}
      text="Try another word. Search looks at names, descriptions, languages, topics and labels."
    >
      <Button type="button" variant="outline" className="bm-btn bm-btn--primary" onClick={onClear}>
        Clear search
      </Button>
    </StatePanel>
  );
}

export function SignInState() {
  return (
    <StatePanel
      icon={<LogIn />}
      title="Sign in to see your bookmarks"
      text="Your saved repos and issues belong to your account, so they follow you to every device."
    >
      <LinkButton href={BOOKMARK_ROUTES.signIn} primary>
        <LogIn aria-hidden="true" />
        Sign in
      </LinkButton>
      <LinkButton href={BOOKMARK_ROUTES.discover}>
        <Compass aria-hidden="true" />
        Browse Discovery
      </LinkButton>
    </StatePanel>
  );
}

export function ErrorState({ message, busy, onRetry }: { message: string | null; busy: boolean; onRetry: () => void }) {
  return (
    <StatePanel
      tone="error"
      icon={<CloudOff />}
      title="We couldn&apos;t load your bookmarks"
      text={message ?? "Something went wrong on our side. Your bookmarks are safe. Please try again."}
    >
      <Button type="button" variant="outline" className="bm-btn bm-btn--primary" disabled={busy} onClick={onRetry}>
        {busy ? <LoaderCircle className="bm-spin" aria-hidden="true" /> : null}
        Try again
      </Button>
    </StatePanel>
  );
}

// ── loading ────────────────────────────────────────────────────────────────────────────────

const NO_REPOS: Repo[] = [];
const NO_IDS = new Set<string>();
const NO_AI: Record<number, AiTakeState> = {};
const noop = () => {};

export function IssueSkeleton() {
  return (
    <div className="bm-skel-row" aria-hidden="true">
      <Skeleton className="bm-skel" style={{ width: 40, height: 40, borderRadius: 12 }} />
      <div className="bm-skel-row__body">
        <Skeleton className="bm-skel" style={{ height: 18, width: "62%" }} />
        <Skeleton className="bm-skel" style={{ height: 13, width: "40%" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <Skeleton className="bm-skel" style={{ height: 24, width: 74, borderRadius: 999 }} />
          <Skeleton className="bm-skel" style={{ height: 24, width: 58, borderRadius: 999 }} />
          <Skeleton className="bm-skel" style={{ height: 24, width: 90, borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton shaped like what is about to appear. Repos use your RepoGrid's own loading state, so the
 * placeholder is identical to Discovery's. `counts` come from the id cache, so it is usually right.
 */
export function LoadingState({ tab, counts }: { tab: BookmarkTab; counts: { repos: number; issues: number } }) {
  const showRepos = tab === "repos";
  const showIssues = tab === "issues";
  const issueRows = Math.min(Math.max(counts.issues, 2), 4);

  return (
    <div aria-busy="true">
      <p className="bm-sr" role="status">
        Loading your bookmarks…
      </p>
      {showRepos ? (
        <RepoGrid
          repos={NO_REPOS}
          initialLoading
          loadingMore={false}
          hasMore={false}
          onLoadMore={noop}
          hasActiveQuery={false}
          onClearFilters={noop}
          aiStates={NO_AI}
          onGetAiTake={noop}
          onOpenRepo={noop}
          savedRepoIds={NO_IDS}
          onToggleSaved={noop}
        />
      ) : null}
      {showIssues ? (
        <div className="bm-list" style={{ marginTop: showRepos ? 24 : 0 }}>
          {Array.from({ length: issueRows }, (_, i) => (
            <IssueSkeleton key={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── banners ────────────────────────────────────────────────────────────────────────────────

export function LegacyBanner({
  count,
  busy,
  onImport,
  onDismiss,
}: {
  count: number;
  busy: boolean;
  onImport: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="bm-banner bm-banner--accent" role="region" aria-label="Import your old bookmarks">
      <span className="bm-banner__icon" aria-hidden="true">
        <History />
      </span>
      <div className="bm-banner__body">
        <p className="bm-banner__title">Found {plural(count, "bookmark")} from your old list</p>
        <p className="bm-banner__text">
          Import them here. They appear as simple links; save an item again from Discovery or Hunt to get its full card.
        </p>
      </div>
      <div className="bm-banner__actions">
        <Button type="button" variant="outline" size="sm" className="bm-btn bm-btn--primary bm-btn--sm" disabled={busy} onClick={onImport}>
          {busy ? <LoaderCircle className="bm-spin" aria-hidden="true" /> : <Download aria-hidden="true" />}
          Import
        </Button>
        <Button type="button" variant="ghost" size="sm" className="bm-btn bm-btn--ghost bm-btn--sm" disabled={busy} onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </div>
  );
}

export function LimitBanner({ limit }: { limit: number }) {
  return (
    <div className="bm-banner bm-banner--warn" role="status">
      <span className="bm-banner__icon" aria-hidden="true">
        <TriangleAlert />
      </span>
      <div className="bm-banner__body">
        <p className="bm-banner__title">You&apos;ve reached the limit of {limit} bookmarks</p>
        <p className="bm-banner__text">Remove a few you no longer need to make room for new ones.</p>
      </div>
    </div>
  );
}
