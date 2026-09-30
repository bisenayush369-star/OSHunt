"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { FolderGit2, Search, SearchX, Star } from "lucide-react";
import { formatCount } from "@/components/lib/discovery/utils";
import type { Repo } from "@/components/types/discovery";
import "./search-suggest.css";

const MAX_SUGGESTIONS = 5;

// Results have to hold steady this long before they're trusted as "the answer
// for what's typed". The data hook's loading flag can lag the query by a frame
// or two; without this, that gap flashes stale results or a false "no matches"
// right after each search is committed.
const SETTLE_MS = 120;

export interface SearchSuggestConfig {
  /** Repos currently loaded for the active category + filters + query. */
  repos: Repo[];
  /** The debounced query those repos were fetched for (`filters.query`). */
  committedQuery: string;
  /** True while a fresh search is in flight (`initialLoading`). */
  loading: boolean;
  /** Turn the dropdown off entirely, e.g. while the API error banner is up. */
  disabled?: boolean;
  /** Selected category label — used in the "no matches" message. */
  scopeLabel?: string;
  /** Called when a suggestion is picked. */
  onSelect: (repo: Repo) => void;
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Omit to get the plain search box with no dropdown. */
  suggest?: SearchSuggestConfig;
}

/** Every typed word must show up somewhere in the repo's name, description or topics. */
function matchesQuery(repo: Repo, typed: string) {
  const haystack = `${repo.fullName} ${repo.description ?? ""} ${repo.topics.join(" ")}`.toLowerCase();
  return typed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/** Splits a repo name around the first place the typed text matches it, for highlighting. */
function splitOnMatch(name: string, typed: string): [string, string, string] | null {
  const lower = name.toLowerCase();
  const query = typed.toLowerCase();
  for (const term of [query, ...query.split(/\s+/)]) {
    if (!term) continue;
    const at = lower.indexOf(term);
    if (at !== -1) return [name.slice(0, at), name.slice(at, at + term.length), name.slice(at + term.length)];
  }
  return null;
}

export function SearchBar({ value, onChange, suggest }: SearchBarProps) {
  const listId = useId();
  const blurTimer = useRef<number | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [confirmed, setConfirmed] = useState(false);

  const typed = value.trim();
  const committed = (suggest?.committedQuery ?? "").trim();
  const enabled = Boolean(suggest) && !suggest?.disabled;

  // "Settled" = the loaded repos are the answer for exactly what's typed.
  const settled = typed === committed && !suggest?.loading;
  useEffect(() => {
    const t = window.setTimeout(() => setConfirmed(settled), settled ? SETTLE_MS : 0);
    return () => window.clearTimeout(t);
  }, [settled]);
  useEffect(() => () => window.clearTimeout(blurTimer.current), []);
  const trusted = settled && confirmed;

  // Trusted: the real results for this query. Not yet: keep showing the
  // previous search's results (so the list doesn't flicker between keystrokes),
  // but only the ones that still match what's typed — and never the category's
  // default listing, which isn't a search result at all.
  let items: Repo[] = [];
  if (enabled && suggest && typed) {
    items = trusted
      ? suggest.repos.slice(0, MAX_SUGGESTIONS)
      : committed
        ? suggest.repos.filter((r) => matchesQuery(r, typed)).slice(0, MAX_SUGGESTIONS)
        : [];
  }

  // Reset the keyboard highlight whenever the list itself changes.
  const itemsKey = items.map((r) => r.id).join(",");
  const [seenKey, setSeenKey] = useState(itemsKey);
  if (seenKey !== itemsKey) {
    setSeenKey(itemsKey);
    setActive(-1);
  }

  const showPanel = enabled && open && typed.length > 0;
  const hasItems = items.length > 0;

  function choose(repo: Repo) {
    suggest?.onSelect(repo);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!enabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!typed) return;
      e.preventDefault();
      if (!showPanel) {
        setOpen(true);
        return;
      }
      if (!hasItems) return;
      const last = items.length - 1;
      setActive((i) => (e.key === "ArrowDown" ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1));
    } else if (e.key === "Enter") {
      if (!showPanel) return;
      if (active >= 0 && items[active]) {
        e.preventDefault();
        choose(items[active]);
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape" && showPanel) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="search-wrap">
      <Search size={14} strokeWidth={2} className="search-icon" aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          window.clearTimeout(blurTimer.current);
          setOpen(true);
        }}
        onBlur={() => {
          // Small delay as a safety net so a click on a suggestion still lands.
          blurTimer.current = window.setTimeout(() => {
            setOpen(false);
            setActive(-1);
          }, 120);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search name, topic, description…"
        aria-label="Search repositories"
        autoComplete="off"
        className="search-input"
        role={enabled ? "combobox" : undefined}
        aria-expanded={enabled ? showPanel && hasItems : undefined}
        aria-controls={enabled && showPanel && hasItems ? listId : undefined}
        aria-autocomplete={enabled ? "list" : undefined}
        aria-activedescendant={showPanel && hasItems && active >= 0 ? `${listId}-opt-${active}` : undefined}
      />

      {showPanel && (
        <div className="search-suggest">
          {hasItems ? (
            <ul id={listId} role="listbox" aria-label="Repository suggestions" className="search-suggest-list">
              {items.map((repo, i) => {
                const parts = splitOnMatch(repo.fullName, typed);
                return (
                  <li
                    key={repo.id}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={i === active}
                    className={`search-suggest-item${i === active ? " active" : ""}`}
                    // Keep focus in the input while clicking, so the panel doesn't close first.
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => {
                      if (active !== i) setActive(i);
                    }}
                    onClick={() => choose(repo)}
                  >
                    {repo.ownerAvatar ? (
                      <img src={repo.ownerAvatar} alt="" className="search-suggest-avatar" loading="lazy" />
                    ) : (
                      <span className="search-suggest-avatar fallback">
                        <FolderGit2 size={12} strokeWidth={1.75} aria-hidden="true" />
                      </span>
                    )}
                    <span className="search-suggest-name" title={repo.fullName}>
                      {parts ? (
                        <>
                          {parts[0]}
                          <mark>{parts[1]}</mark>
                          {parts[2]}
                        </>
                      ) : (
                        repo.fullName
                      )}
                    </span>
                    <span className="search-suggest-stars">
                      <Star size={11} strokeWidth={2} aria-hidden="true" />
                      {formatCount(repo.stars)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : trusted ? (
            <div className="search-suggest-status" role="status">
              <SearchX size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>
                No matches for &ldquo;{typed}&rdquo;
                {suggest?.scopeLabel ? ` in ${suggest.scopeLabel}` : ""}
              </span>
            </div>
          ) : (
            <div className="search-suggest-status" role="status">
              <span className="search-suggest-spinner" aria-hidden="true" />
              <span>Searching…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}