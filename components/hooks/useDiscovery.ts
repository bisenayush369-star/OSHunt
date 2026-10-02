"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDiscoveryPage } from "@/components/lib/discovery/github";
import { useAsync } from "./useGithub";
import { useFilters } from "./useFilters";
import type { Category, MaintenanceStatus, Repo, SortOption } from "@/components/types/discovery";

const normalizeRepoKey = (value: string) => value.trim().replace(/\/+$/, "").toLowerCase();

export function useDiscovery(initialCategory: Category) {
  const [category, setCategoryState] = useState(initialCategory);

  const [page, setPage] = useState(1);
  const [allRepos, setAllRepos] = useState<Repo[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const resetPagination = useCallback(() => {
    setPage(1);
    setAllRepos([]);
    setHasMore(true);
  }, []);

  const filtersApi = useFilters(resetPagination);
  const { filters } = filtersApi;

  // Every action below calls resetPagination() synchronously, in the SAME
  // event handler that changes category/filters. React 18 batches these
  // into one render, so the fetch effect below sees the new category AND
  // page:1 together on its very next run — never a stale page number
  // paired with a new category. That matters more than it sounds: doing
  // this reactively (a useEffect that "notices" the change and resets
  // page a render later) means one extra, wasted GitHub search call every
  // time — real money out of a 10-req/minute budget.
  function setCategory(next: Category) {
    setCategoryState(next);
    resetPagination();
  }
  function toggleLanguage(lang: string) { filtersApi.toggleLanguage(lang); resetPagination(); }
  function setLicense(v: string | null) { filtersApi.setLicense(v); resetPagination(); }
  function setOrg(v: string | null) { filtersApi.setOrg(v); resetPagination(); }
  function setMinStars(v: number | null) { filtersApi.setMinStars(v); resetPagination(); }
  function setMinForks(v: number | null) { filtersApi.setMinForks(v); resetPagination(); }
  function setMaintenance(v: MaintenanceStatus | null) { filtersApi.setMaintenance(v); resetPagination(); }
  function setSort(v: SortOption) { filtersApi.setSort(v); resetPagination(); }
  function reset() { filtersApi.reset(); resetPagination(); }

  const filtersKey = JSON.stringify(filters);

  const handleFetchSuccess = useCallback(
    (data: { items: Repo[]; hasMore: boolean }) => {
      setAllRepos((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(data.hasMore);
      // Discovery fetch hits GitHub — notify dashboard to refresh usage
      try { window.dispatchEvent(new CustomEvent("usage:updated")) } catch { /* ignore */ }
    },
    [page]
  );

  const { status, error, retry } = useAsync(
    () => fetchDiscoveryPage(category, filters, page),
    [category.id, filtersKey, page],
    handleFetchSuccess
  );

  const initialLoading = page === 1 && status === "loading";
  const loadingMore = page > 1 && status === "loading";

  const loadMore = useCallback(() => {
    if (status === "loading" || !hasMore) return;
    setPage((p) => p + 1);
  }, [status, hasMore]);

  const [savedRepoIds, setSavedRepoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    async function hydrateSavedRepos() {
      try {
        const res = await fetch("/api/bookmark", { cache: "no-store" });
        if (res.status === 401) {
          if (isMounted) setSavedRepoIds(new Set());
          return;
        }
        if (!res.ok) {
          throw new Error(`bookmark load failed: ${res.status}`);
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          if (isMounted) setSavedRepoIds(new Set());
          return;
        }

        const repoUrls = new Set<string>();
        for (const item of data) {
          if (item?.type === "repo" && typeof item.url === "string") {
            repoUrls.add(normalizeRepoKey(item.url));
          }
        }

        if (isMounted) setSavedRepoIds(repoUrls);
      } catch {
        if (isMounted) setSavedRepoIds(new Set());
      }
    }

    hydrateSavedRepos();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleSaved = useCallback(async (repo: Repo) => {
    const repoKey = normalizeRepoKey(repo.htmlUrl);
    const wasSaved = savedRepoIds.has(repoKey);

    setSavedRepoIds((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(repoKey);
      else next.add(repoKey);
      return next;
    });

    try {
      const payload = wasSaved
        ? { url: repo.htmlUrl }
        : { url: repo.htmlUrl, title: repo.name, repoName: repo.fullName, type: "repo" };

      const res = await fetch("/api/bookmark", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || `bookmark update failed: ${res.status}`);
      }
    } catch {
      setSavedRepoIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(repoKey);
        else next.delete(repoKey);
        return next;
      });
    }
  }, [savedRepoIds]);

  return {
    category,
    setCategory,
    repos: allRepos,
    initialLoading,
    loadingMore,
    error,
    retry,
    hasMore,
    loadMore,
    savedRepoIds,
    toggleSaved,
    filters: filtersApi.filters,
    queryInput: filtersApi.queryInput,
    activeFilterCount: filtersApi.activeFilterCount,
    setQuery: filtersApi.setQuery,
    toggleLanguage,
    setLicense,
    setOrg,
    setMinStars,
    setMinForks,
    setMaintenance,
    setSort,
    reset,
  };
}
