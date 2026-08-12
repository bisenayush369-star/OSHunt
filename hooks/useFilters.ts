"use client";

import { useMemo, useState } from "react";
import { DEFAULT_FILTERS } from "@/types/discovery";
import type { DiscoveryFilters, MaintenanceStatus, SortOption } from "@/types/discovery";
import { debounce } from "@/lib/discovery/utils";

const SEARCH_DEBOUNCE_MS = 450;

export function useFilters(onQueryCommitted?: () => void) {
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [queryInput, setQueryInput] = useState("");

  const commitQuery = useMemo(
    () =>
      debounce((value: string) => {
        setFilters((f) => ({ ...f, query: value }));
        onQueryCommitted?.();
      }, SEARCH_DEBOUNCE_MS),
    [onQueryCommitted]
  );

  function setQuery(value: string) {
    setQueryInput(value); // updates the input immediately
    commitQuery(value); // updates the actual filter (and triggers a fetch) after a pause
  }

  function toggleLanguage(lang: string) {
    setFilters((f) => ({
      ...f,
      languages: f.languages.includes(lang) ? f.languages.filter((l) => l !== lang) : [...f.languages, lang],
    }));
  }

  function setLicense(license: string | null) {
    setFilters((f) => ({ ...f, license }));
  }
  function setOrg(org: string | null) {
    setFilters((f) => ({ ...f, org: org?.trim() || null }));
  }
  function setMinStars(value: number | null) {
    setFilters((f) => ({ ...f, minStars: value }));
  }
  function setMinForks(value: number | null) {
    setFilters((f) => ({ ...f, minForks: value }));
  }
  function setMaintenance(value: MaintenanceStatus | null) {
    setFilters((f) => ({ ...f, maintenance: value }));
  }
  function setSort(value: SortOption) {
    setFilters((f) => ({ ...f, sort: value }));
  }
  function reset() {
    setFilters(DEFAULT_FILTERS);
    setQueryInput("");
  }

  const activeFilterCount =
    filters.languages.length +
    (filters.license ? 1 : 0) +
    (filters.org ? 1 : 0) +
    (filters.minStars ? 1 : 0) +
    (filters.minForks ? 1 : 0) +
    (filters.maintenance ? 1 : 0);

  return {
    filters,
    queryInput,
    activeFilterCount,
    setQuery,
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
