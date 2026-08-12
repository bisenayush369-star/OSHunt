import { SearchX } from "lucide-react";

interface EmptyStateProps {
  hasActiveQuery: boolean;
  onClear: () => void;
}

export function EmptyState({ hasActiveQuery, onClear }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <SearchX size={28} strokeWidth={1.5} aria-hidden="true" />
      <p>
        {hasActiveQuery
          ? "Nothing matches your search and filters right now."
          : "No repos came back for this category."}
      </p>
      {hasActiveQuery && (
        <button type="button" onClick={onClear} className="filters-clear" style={{ margin: "0 auto" }}>
          Clear search &amp; filters
        </button>
      )}
    </div>
  );
}
