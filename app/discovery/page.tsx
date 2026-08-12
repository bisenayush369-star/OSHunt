"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import Navbar from "@/components/ui/Navbar";
import "@/components/discovery/discovery.css";
import { CategoryBar, CATEGORIES } from "@/components/discovery/CategoryBar";
import { SearchBar } from "@/components/discovery/SearchBar";
import { SortDropdown } from "@/components/discovery/SortDropdown";
import { FiltersToggle, FiltersPanel } from "@/components/discovery/Filters";
import { ErrorBanner } from "@/components/discovery/ErrorBanner";
import { RepoGrid } from "@/components/discovery/RepoGrid";
import { DetailModal } from "@/components/discovery/DetailModal";
import { useDiscovery } from "@/hooks/useDiscovery";
import { fetchAiInsights } from "@/lib/discovery/ai";
import type { AiTakeState, Repo } from "@/types/discovery";

/**
 * Restore `import Navbar from "@/components/ui/Navbar";` and render <Navbar />
 * in your real app — omitted here so this renders standalone as a preview.
 */

export default function DiscoveryPage() {
  const discovery = useDiscovery(CATEGORIES[0]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openRepo, setOpenRepo] = useState<Repo | null>(null);
  const [aiStates, setAiStates] = useState<Record<number, AiTakeState>>({});

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  async function handleGetAiTake(repo: Repo, isRetry = false) {
    const current = aiStates[repo.id];
    if (!isRetry && (current?.status === "loading" || current?.status === "done")) return;
    setAiStates((prev) => ({ ...prev, [repo.id]: { status: "loading" } }));
    try {
      const insights = await fetchAiInsights(repo);
      setAiStates((prev) => ({ ...prev, [repo.id]: { status: "done", insights } }));
    } catch {
      setAiStates((prev) => ({ ...prev, [repo.id]: { status: "error" } }));
    }
  }

  return (
    <div className="discovery-page">
      <Navbar />
      <div className="container">
        <div className="eyebrow">
          <Sparkles size={14} strokeWidth={2} style={{ color: "var(--accent)" }} aria-hidden="true" />
          <span className="eyebrow-label">Live from GitHub</span>
        </div>
        <h1 className="h1">Discover open source,<br /><span className="grad">straight from the source.</span></h1>
        <p className="subhead">
          Every repo below is fetched live from the GitHub API — real stars, real activity. Nothing here is hardcoded.
        </p>

        <div className="toolbar">
          <CategoryBar active={discovery.category} onSelect={discovery.setCategory} />
          <div className="control-row">
            <SearchBar value={discovery.queryInput} onChange={discovery.setQuery} />
            <FiltersToggle
              open={filtersOpen}
              onToggle={() => setFiltersOpen((o) => !o)}
              activeFilterCount={discovery.activeFilterCount}
            />
            <SortDropdown value={discovery.filters.sort} onChange={discovery.setSort} />
          </div>
        </div>

        {filtersOpen && (
          <FiltersPanel
            filters={discovery.filters}
            onToggleLanguage={discovery.toggleLanguage}
            onSetLicense={discovery.setLicense}
            onSetOrg={discovery.setOrg}
            onSetMinStars={discovery.setMinStars}
            onSetMinForks={discovery.setMinForks}
            onSetMaintenance={discovery.setMaintenance}
            onReset={discovery.reset}
          />
        )}

        {discovery.error && <ErrorBanner error={discovery.error} onRetry={discovery.retry} />}

        <RepoGrid
          repos={discovery.repos}
          initialLoading={discovery.initialLoading}
          loadingMore={discovery.loadingMore}
          hasMore={discovery.hasMore}
          onLoadMore={discovery.loadMore}
          hasActiveQuery={discovery.activeFilterCount > 0 || discovery.filters.query.length > 0}
          onClearFilters={discovery.reset}
          aiStates={aiStates}
          onGetAiTake={handleGetAiTake}
          onOpenRepo={setOpenRepo}
          savedRepoIds={discovery.savedRepoIds}
          onToggleSaved={discovery.toggleSaved}
        />
      </div>

      {openRepo && <DetailModal repo={openRepo} onClose={() => setOpenRepo(null)} />}
    </div>
  );
}
