"use client";

import type { RefObject } from "react";
import { ArrowUpDown, Download, Ellipsis, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BOOKMARK_SORTS,
  MAX_QUERY_LENGTH,
  SORT_LABELS,
  isBookmarkSort,
  type BookmarkSort,
  type BookmarkTab,
} from "@/components/lib/bookmarks/view";
import "./bookmarks.css";

/** Tabs + search + sort + "more" menu. Must be rendered inside the page's <Tabs>. */

// The menus open in a portal outside the page, so their critical colours are set right here too.
const MENU_STYLE = { background: "#101010", borderColor: "#262626", color: "#ededed" } as const;

const TAB_LABELS: Record<BookmarkTab, string> = { repos: "Repos", issues: "Issues" };
const TAB_ORDER: readonly BookmarkTab[] = ["repos", "issues"];

export interface BookmarksToolbarProps {
  counts: Record<BookmarkTab, number>;
  query: string;
  onQuery: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  sort: BookmarkSort;
  onSort: (value: BookmarkSort) => void;
  onRefresh: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  exportDisabled: boolean;
  clearDisabled: boolean;
  clearLabel: string;
}

export function BookmarksToolbar({
  counts,
  query,
  onQuery,
  searchRef,
  sort,
  onSort,
  onRefresh,
  onExport,
  onImport,
  onClear,
  exportDisabled,
  clearDisabled,
  clearLabel,
}: BookmarksToolbarProps) {
  return (
    <div className="bm-toolbar">
      <TabsList className="bm-tabs" aria-label="Filter bookmarks by type">
        {TAB_ORDER.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="bm-tab">
            <span>{TAB_LABELS[tab]}</span>
            <span className="bm-tab__count" aria-label={`${counts[tab]} saved`}>
              {counts[tab]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="bm-controls">
        <div className="bm-search">
          <Search className="bm-search__icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="search"
            className="bm-search__input"
            value={query}
            maxLength={MAX_QUERY_LENGTH}
            placeholder="Search saved repos & issues"
            aria-label="Search bookmarks"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return;
              if (query) {
                event.preventDefault();
                onQuery("");
              } else {
                event.currentTarget.blur();
              }
            }}
          />
          {query ? (
            <button
              type="button"
              className="bm-search__clear"
              aria-label="Clear search"
              onClick={() => {
                onQuery("");
                searchRef.current?.focus();
              }}
            >
              <X aria-hidden="true" />
            </button>
          ) : (
            <kbd className="bm-search__kbd" aria-hidden="true">
              /
            </kbd>
          )}
        </div>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="bm-btn bm-sort" aria-label={`Sort bookmarks. Current: ${SORT_LABELS[sort]}`}>
              <ArrowUpDown aria-hidden="true" />
              <span>{SORT_LABELS[sort]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bm-menu" style={MENU_STYLE}>
            <DropdownMenuLabel className="bm-menu-label">Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(value) => isBookmarkSort(value) && onSort(value)}>
              {BOOKMARK_SORTS.map((value) => (
                <DropdownMenuRadioItem key={value} value={value} className="bm-menu-item">
                  {SORT_LABELS[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="bm-btn bm-btn--icon" aria-label="More actions">
              <Ellipsis aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bm-menu" style={MENU_STYLE}>
            <DropdownMenuItem className="bm-menu-item" onSelect={onRefresh}>
              <RefreshCw aria-hidden="true" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuItem className="bm-menu-item" disabled={exportDisabled} onSelect={onExport}>
              <Download aria-hidden="true" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem className="bm-menu-item" onSelect={onImport}>
              <Upload aria-hidden="true" />
              Import from JSON…
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bm-menu-sep" />
            <DropdownMenuItem className="bm-menu-item bm-menu-item--danger" disabled={clearDisabled} onSelect={onClear}>
              <Trash2 aria-hidden="true" />
              {clearLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
