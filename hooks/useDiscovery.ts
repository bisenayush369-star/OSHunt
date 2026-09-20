"use client";

import { useCallback, useState } from "react";
import { fetchDiscoveryPage } from "@/lib/discovery/github";
import { useAsync } from "./useGithub";
import { useFilters } from "./useFilters";
import type { Category, MaintenanceStatus, Repo, SortOption } from "@/types/discovery";

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
      try { window.dispatchEvent(new CustomEvent("usage:updated")) } catch (e) { /* ignore */ }
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

  /**
   * In-memory only — resets on refresh. Persisted collections, contribution
   * tracking, and XP/streaks (spec sections 12-14) need a signed-in user
   * and a database, neither of which exists in this environment. This
   * exists so SaveButton has something real to call and you can see the
   * interaction; it's not pretending to actually save anything.
   */
  const [savedRepoIds, setSavedRepoIds] = useState<Set<number>>(new Set());
  const toggleSaved = useCallback((repoId: number) => {
    setSavedRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) next.delete(repoId);
      else next.add(repoId);
      return next;
    });
  }, []);

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
