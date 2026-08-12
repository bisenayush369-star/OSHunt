import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FILTERABLE_LANGUAGES } from "@/types/discovery";
import type { DiscoveryFilters, MaintenanceStatus } from "@/types/discovery";

const LICENSES = [
  { value: "mit", label: "MIT" },
  { value: "apache-2.0", label: "Apache 2.0" },
  { value: "gpl-3.0", label: "GPL 3.0" },
  { value: "bsd-3-clause", label: "BSD 3-Clause" },
];

const MAINTENANCE_OPTIONS: { value: MaintenanceStatus; label: string }[] = [
  { value: "active", label: "Active (not archived)" },
  { value: "recently-updated", label: "Updated in last 30 days" },
  { value: "archived", label: "Archived only" },
];

interface FiltersProps {
  open: boolean;
  onToggle: () => void;
  activeFilterCount: number;
  filters: DiscoveryFilters;
  onToggleLanguage: (lang: string) => void;
  onSetLicense: (license: string | null) => void;
  onSetOrg: (org: string | null) => void;
  onSetMinStars: (value: number | null) => void;
  onSetMinForks: (value: number | null) => void;
  onSetMaintenance: (value: MaintenanceStatus | null) => void;
  onReset: () => void;
}

export function FiltersToggle({ open, onToggle, activeFilterCount }: Pick<FiltersProps, "open" | "onToggle" | "activeFilterCount">) {
  return (
    <Button
      type="button"
      variant="outline"
      className={`toggle-btn ${activeFilterCount > 0 ? "has-active" : ""}`}
      onClick={onToggle}
      aria-expanded={open}
    >
      <SlidersHorizontal size={13} strokeWidth={2} aria-hidden="true" />
      Filters
      {activeFilterCount > 0 && <span className="count-pill">{activeFilterCount}</span>}
    </Button>
  );
}

export function FiltersPanel({
  filters,
  onToggleLanguage,
  onSetLicense,
  onSetOrg,
  onSetMinStars,
  onSetMinForks,
  onSetMaintenance,
  onReset,
}: Omit<FiltersProps, "open" | "onToggle" | "activeFilterCount">) {
  return (
    <div className="filters-panel">
      <div>
        <div className="filter-group-label">Language</div>
        <div className="filter-chip-row">
          {FILTERABLE_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              className={`filter-chip ${filters.languages.includes(lang) ? "selected" : ""}`}
              onClick={() => onToggleLanguage(lang)}
              aria-pressed={filters.languages.includes(lang)}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="filter-group-label">Maintenance</div>
        <div className="filter-chip-row">
          {MAINTENANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`filter-chip ${filters.maintenance === opt.value ? "selected" : ""}`}
              onClick={() => onSetMaintenance(filters.maintenance === opt.value ? null : opt.value)}
              aria-pressed={filters.maintenance === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-inline-row">
        <div className="filter-field">
          <label htmlFor="filter-license">License</label>
          <select
            id="filter-license"
            value={filters.license ?? ""}
            onChange={(e) => onSetLicense(e.target.value || null)}
          >
            <option value="">Any</option>
            {LICENSES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-org">Organization</label>
          <input
            id="filter-org"
            type="text"
            placeholder="e.g. vercel"
            value={filters.org ?? ""}
            onChange={(e) => onSetOrg(e.target.value)}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-min-stars">Min stars</label>
          <input
            id="filter-min-stars"
            type="number"
            min={0}
            placeholder="e.g. 500"
            value={filters.minStars ?? ""}
            onChange={(e) => onSetMinStars(e.target.value ? Number(e.target.value) : null)}
          />
        </div>

        <div className="filter-field">
          <label htmlFor="filter-min-forks">Min forks</label>
          <input
            id="filter-min-forks"
            type="number"
            min={0}
            placeholder="e.g. 50"
            value={filters.minForks ?? ""}
            onChange={(e) => onSetMinForks(e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      <button type="button" className="filters-clear" onClick={onReset}>
        Clear all filters
      </button>
    </div>
  );
}
