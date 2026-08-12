"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { RepoCard } from "./RepoCard";
import type { AiTakeState, Repo } from "@/types/discovery";

interface RepoGridProps {
  repos: Repo[];
  initialLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  hasActiveQuery: boolean;
  onClearFilters: () => void;
  aiStates: Record<number, AiTakeState>;
  onGetAiTake: (repo: Repo, isRetry?: boolean) => void;
  onOpenRepo: (repo: Repo) => void;
  savedRepoIds: Set<number>;
  onToggleSaved: (repoId: number) => void;
}

function SkeletonCard({ keyPrefix }: { keyPrefix: string }) {
  return (
    <Card className="repo-card">
      <CardContent className="repo-card-body">
        <div className="repo-top-row"><Skeleton w={26} h={26} /><Skeleton w={110} h={14} /></div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <Skeleton w="100%" h={11} />
          <Skeleton w="80%" h={11} />
        </div>
        <Skeleton w={100} h={20} />
      </CardContent>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid">
      {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} keyPrefix="initial" />)}
    </div>
  );
}

export function RepoGrid({
  repos,
  initialLoading,
  loadingMore,
  hasMore,
  onLoadMore,
  hasActiveQuery,
  onClearFilters,
  aiStates,
  onGetAiTake,
  onOpenRepo,
  savedRepoIds,
  onToggleSaved,
}: RepoGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isFetchingRef = useRef(false);

  // Keep the ref in sync with the real loading state coming from useDiscovery.
  useEffect(() => {
    isFetchingRef.current = loadingMore || initialLoading;
  }, [loadingMore, initialLoading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || isFetchingRef.current) return;
        // Lock synchronously, before onLoadMore's own state-based guard even
        // runs — the "prevent duplicate requests" requirement needs this to
        // hold even against a fast double-fire, which a state-only guard
        // (checked after a React re-render) can't fully rule out on its own.
        isFetchingRef.current = true;
        onLoadMore();
        // Safety valve: the sync effect above normally clears this once
        // loadingMore/initialLoading reflect the real fetch — this timeout
        // just guarantees the lock can never wedge shut permanently if
        // onLoadMore ever no-ops without those flipping true for some reason.
        setTimeout(() => { isFetchingRef.current = false; }, 8000);
      },
      { rootMargin: "400px" } // start loading before the user actually hits bottom
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (initialLoading) return <SkeletonGrid />;
  if (repos.length === 0) return <EmptyState hasActiveQuery={hasActiveQuery} onClear={onClearFilters} />;

  return (
    <>
      <div className="grid">
        {repos.map((repo, i) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            index={i}
            aiState={aiStates[repo.id]}
            onGetAiTake={onGetAiTake}
            onOpen={onOpenRepo}
            isSaved={savedRepoIds.has(repo.id)}
            onToggleSaved={onToggleSaved}
          />
        ))}
        {loadingMore && [0, 1, 2].map((i) => <SkeletonCard key={`more-${i}`} keyPrefix="more" />)}
      </div>
      {hasMore && (
        <div className="load-more-controls">
          <button
            type="button"
            className="load-more-button"
            onClick={onLoadMore}
            disabled={loadingMore}
            aria-busy={loadingMore}
          >
            {loadingMore ? "Loading more…" : "Load more"}
          </button>
        </div>
      )}
      <div ref={sentinelRef} className="load-more-sentinel" aria-hidden="true" />
      {!hasMore && repos.length > 0 && (
        <div className="load-more-status">That&apos;s everything for this search.</div>
      )}
    </>
  );
}
