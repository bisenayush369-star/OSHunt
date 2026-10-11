"use client";

// The same stylesheet your Discovery page uses, so the saved repo cards are styled identically.
import "@/components/discovery/discovery.css";
import "./bookmarks.css";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bookmark, LoaderCircle, TriangleAlert, Trash2 } from "lucide-react";

import Navbar from "@/components/ui/Navbar";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RepoGrid } from "@/components/discovery/RepoGrid";
import { DetailModal } from "@/components/discovery/DetailModal";
import type { Repo } from "@/components/types/discovery";
import type { BookmarkInput, BookmarkKind, BookmarkRecord } from "@/components/types/bookmarks";

import { useBookmarks } from "@/components/hooks/useBookmarks";
import { useAiTakes } from "@/components/hooks/useAiTakes";
import { useProposals } from "@/components/hooks/useProposals";
import { useDiscoveryFonts } from "@/components/hooks/useDiscoveryFonts";
import { isFullRepoSnapshot, snapshotOf } from "@/components/lib/bookmarks/adapters";
import { makeBookmarkId } from "@/components/lib/bookmarks/key";
import { plural } from "@/components/lib/bookmarks/format";
import { exportFileName, MAX_IMPORT_FILE_BYTES, parseImportText } from "@/components/lib/bookmarks/importFile";
import { dismissLegacy, fetchLegacyBookmarks, isLegacyDismissed, legacyToInput, type LegacyBookmark } from "@/components/lib/bookmarks/legacy";
import { toast } from "@/components/lib/bookmarks/toast";
import {
  DEFAULT_SORT,
  DEFAULT_TAB,
  cleanQuery,
  countKinds,
  isBookmarkTab,
  matchesWords,
  queryWords,
  sortRecords,
  type BookmarkSort,
  type BookmarkTab,
} from "@/components/lib/bookmarks/view";

import { BookmarksToolbar } from "./BookmarksToolbar";
import { CompactRepoRow } from "./CompactRepoRow";
import { IssueRow } from "./IssueRow";
import { renderIssue } from "./overrides";
import {
  EmptyState,
  ErrorState,
  LegacyBanner,
  LimitBanner,
  LoadingState,
  NoResultsState,
  SignInState,
} from "./BookmarkStates";

/**
 * The Bookmarks page.
 *
 * Saved repos are drawn by YOUR `RepoGrid` (the same component Discovery uses) from the exact repo
 * object that was saved, so every card has the same info, buttons (AI take, details, bookmark) and
 * look. Saved issues use `IssueRow`, or your own card if you plug it in (see overrides.tsx).
 */

export interface BookmarksViewProps {
  /** Values parsed from the URL on the server (?tab=issues&sort=stars&q=react). */
  initialTab?: BookmarkTab;
  initialQuery?: string;
  initialSort?: BookmarkSort;
}

const EASE = [0.22, 1, 0.36, 1] as const;
const noop = () => {};

/** Enter / exit / re-order animation shared by every row in a list. */
function rowMotion(index: number, reduce: boolean) {
  return {
    layout: reduce ? (false as const) : ("position" as const),
    initial: reduce ? (false as const) : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    exit: reduce ? { opacity: 0 } : { opacity: 0, x: -28, scale: 0.98, transition: { duration: 0.2 } },
    transition: { duration: 0.28, ease: EASE, delay: reduce ? 0 : Math.min(index, 8) * 0.035 },
  };
}

/**
 * Section title. The bookmark tabs are now repo / issue specific, so each section heading remains
 * visible and keeps the page outline consistent (h1 → h2 → h3).
 */
function SectionHeading({ id, label, count, visible }: { id: string; label: string; count: number; visible: boolean }) {
  if (!visible) {
    return (
      <h2 id={id} className="bm-sr">
        {label}
      </h2>
    );
  }
  return (
    <h2 id={id} className="bm-section__head">
      {label}
      <span className="bm-section__count">{count}</span>
      <span className="bm-section__rule" aria-hidden="true" />
    </h2>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSavedRepo(raw: unknown): Repo {
  const obj = isRecord(raw) ? raw : {};
  const ownerObj = obj.owner;
  const ownerLogin =
    typeof ownerObj === "string" ? ownerObj :
    typeof ownerObj === "object" && ownerObj !== null && "login" in ownerObj && typeof (ownerObj as { login?: unknown }).login === "string"
      ? (ownerObj as { login: string }).login
      : "unknown";

  const fullName =
    typeof obj.fullName === "string" ? obj.fullName :
    typeof obj.full_name === "string" ? obj.full_name :
    `${ownerLogin}/${typeof obj.name === "string" ? obj.name : "repository"}`;

  const name = typeof obj.name === "string" ? obj.name : (fullName.includes("/") ? fullName.split("/").slice(1).join("/") : "Repository");
  const licenseValue =
    typeof obj.license === "string" ? obj.license :
    typeof obj.license === "object" && obj.license !== null && "spdx_id" in obj.license && typeof (obj.license as { spdx_id?: unknown }).spdx_id === "string"
      ? (obj.license as { spdx_id: string }).spdx_id
      : typeof obj.license === "object" && obj.license !== null && "name" in obj.license && typeof (obj.license as { name?: unknown }).name === "string"
        ? (obj.license as { name: string }).name
        : null;

  const ownerAvatar =
    typeof obj.ownerAvatar === "string" ? obj.ownerAvatar :
    typeof ownerObj === "object" && ownerObj !== null && "avatar_url" in ownerObj && typeof (ownerObj as { avatar_url?: unknown }).avatar_url === "string"
      ? (ownerObj as { avatar_url: string }).avatar_url
      : null;

  return {
    ...(obj as Record<string, unknown> as Partial<Repo>),
    id: typeof obj.id === "number" ? obj.id : 0,
    name,
    fullName,
    owner: ownerLogin,
    ownerAvatar,
    description: typeof obj.description === "string" ? obj.description : null,
    homepage: typeof obj.homepage === "string" ? obj.homepage : null,
    language: typeof obj.language === "string" ? obj.language : null,
    topics: Array.isArray(obj.topics) ? obj.topics.filter((t): t is string => typeof t === "string") : [],
    stars: typeof obj.stars === "number" ? obj.stars : typeof obj.stargazers_count === "number" ? obj.stargazers_count : 0,
    forks: typeof obj.forks === "number" ? obj.forks : 0,
    openIssues: typeof obj.openIssues === "number" ? obj.openIssues : typeof obj.open_issues === "number" ? obj.open_issues : 0,
    watchers: typeof obj.watchers === "number" ? obj.watchers : 0,
    license: licenseValue,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : typeof obj.updated_at === "string" ? obj.updated_at : null,
    createdAt: typeof obj.createdAt === "string" ? obj.createdAt : typeof obj.created_at === "string" ? obj.created_at : null,
    htmlUrl: typeof obj.htmlUrl === "string" ? obj.htmlUrl : typeof obj.html_url === "string" ? obj.html_url : typeof obj.url === "string" ? obj.url : "",
    archived: Boolean(obj.archived),
    frameworks: Array.isArray(obj.frameworks) ? obj.frameworks.filter((f): f is string => typeof f === "string") : [],
    reliabilityScore: typeof obj.reliabilityScore === "number" ? obj.reliabilityScore : 0,
    trendingScore: typeof obj.trendingScore === "number" ? obj.trendingScore : 0,
  } as Repo;
}

export function BookmarksView({ initialTab = DEFAULT_TAB, initialQuery = "", initialSort = DEFAULT_SORT }: BookmarksViewProps) {
  useDiscoveryFonts();
  const reduce = useReducedMotion() ?? false;
  const bookmarks = useBookmarks();
  const ai = useAiTakes();
  const proposals = useProposals();

  const [tab, setTab] = useState<BookmarkTab>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<BookmarkSort>(initialSort);
  const [openRepo, setOpenRepo] = useState<Repo | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [legacy, setLegacy] = useState<LegacyBookmark[]>([]);
  const [legacyBusy, setLegacyBusy] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { items, status, savedIds } = bookmarks;
  const importItems = bookmarks.importItems;

  // ── what to show ─────────────────────────────────────────────────────────────────────────
  const deferredQuery = useDeferredValue(query);
  const words = useMemo(() => queryWords(deferredQuery), [deferredQuery]);

  const repos = useMemo(() => items.filter((item) => item.kind === "repo"), [items]);
  const issues = useMemo(() => items.filter((item) => item.kind === "issue"), [items]);

  const visibleRepos = useMemo(() => sortRecords(repos.filter((r) => matchesWords(r, words)), sort), [repos, words, sort]);
  const visibleIssues = useMemo(() => sortRecords(issues.filter((r) => matchesWords(r, words)), sort), [issues, words, sort]);

  // Full snapshots go to your RepoGrid; thin ones (imported / old list) get a compact row instead.
  const fullRepos = useMemo(() => visibleRepos.filter((r) => isFullRepoSnapshot(r.snapshot)), [visibleRepos]);
  const compactRepos = useMemo(() => visibleRepos.filter((r) => !isFullRepoSnapshot(r.snapshot)), [visibleRepos]);
  const repoCards = useMemo(() => fullRepos.map((r) => normalizeSavedRepo(snapshotOf<Repo>(r))), [fullRepos]);
  const savedRepoIds = useMemo(() => {
    const ids = new Set<string>();
    for (const repo of repoCards) {
      const rawUrl =
        (repo as Partial<Repo> & { htmlUrl?: string; html_url?: string; url?: string }).htmlUrl ??
        (repo as Partial<Repo> & { htmlUrl?: string; html_url?: string; url?: string }).html_url ??
        (repo as Partial<Repo> & { htmlUrl?: string; html_url?: string; url?: string }).url ??
        "";
      const value = String(rawUrl).trim().replace(/\/+$/, "").toLowerCase();
      if (value) ids.add(value);
    }
    return ids;
  }, [repoCards]);

  const cachedCounts = useMemo(() => countKinds(savedIds), [savedIds]);
  const counts = bookmarks.ready ? { repos: repos.length, issues: issues.length } : cachedCounts;
  const tabCounts: Record<BookmarkTab, number> = { repos: counts.repos, issues: counts.issues };

  const showRepos = tab !== "issues";
  const showIssues = tab !== "repos";
  const shownCount = (showRepos ? visibleRepos.length : 0) + (showIssues ? visibleIssues.length : 0);
  const scopeTotal = tabCounts[tab];
  const searching = words.length > 0;
  const clearKind: BookmarkKind | undefined = tab === "repos" ? "repo" : tab === "issues" ? "issue" : undefined;
  const nearLimit = bookmarks.ready && items.length >= bookmarks.limit;

  // ── page behaviours ──────────────────────────────────────────────────────────────────────

  // Keep ?tab=&sort=&q= in the address bar (no new history entries), so reload / share keep the view.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const set = (key: string, value: string, fallback: string) => {
        if (value && value !== fallback) params.set(key, value);
        else params.delete(key);
      };
      set("tab", tab, DEFAULT_TAB);
      set("sort", sort, DEFAULT_SORT);
      set("q", cleanQuery(query), "");
      const search = params.toString();
      const next = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next !== current) window.history.replaceState(window.history.state, "", next);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [tab, sort, query]);

  // "/" jumps to search (like GitHub), unless you are already typing somewhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // When the item you were focused on disappears (removed), keep keyboard focus on the page.
  const previousCount = useRef(items.length);
  useEffect(() => {
    if (items.length < previousCount.current && document.activeElement === document.body) {
      panelRef.current?.focus({ preventScroll: true });
    }
    previousCount.current = items.length;
  }, [items.length]);

  // Offer to import the old bookmark list once (only when you actually have one).
  const legacyRequested = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (status !== "ready" || legacyRequested.current || isLegacyDismissed()) return;
    legacyRequested.current = true;
    void fetchLegacyBookmarks().then((list) => {
      if (!alive.current) return;
      const fresh = list.filter((item) => {
        const input = legacyToInput(item);
        return input !== null && !savedIds.has(makeBookmarkId(input.kind, input.key));
      });
      setLegacy(fresh);
    });
  }, [status, savedIds]);

  // ── actions ──────────────────────────────────────────────────────────────────────────────
  const handleTab = useCallback((value: string) => {
    if (isBookmarkTab(value)) setTab(value);
  }, []);

  const handleToggleRepo = useCallback(
    (repo: Repo) => {
      bookmarks.toggle("repo", repo);
    },
    [bookmarks],
  );

  const handleClearSearch = useCallback(() => setQuery(""), []);

  const handleExport = useCallback(() => {
    const blob = new Blob([bookmarks.exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName();
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ tone: "success", message: `Exported ${plural(items.length, "bookmark")}` });
  }, [bookmarks, items.length]);

  const handleFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = ""; // lets you pick the same file again later
      if (!file) return;
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        toast({ tone: "error", message: "That file is too large to import." });
        return;
      }
      let text: string;
      try {
        text = await file.text();
      } catch {
        toast({ tone: "error", message: "Couldn&apos;t read that file." });
        return;
      }
      const parsed = parseImportText(text);
      if (!parsed.ok) {
        toast({ tone: "error", message: parsed.message });
        return;
      }
      const result = await importItems(parsed.inputs);
      if (!result) return;
      const notes = [
        result.skipped > 0 ? `${result.skipped} already saved or over the limit` : "",
        parsed.invalid > 0 ? `${parsed.invalid} couldn&apos;t be read` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      toast({ tone: "success", message: `Imported ${plural(result.imported, "bookmark")}`, description: notes || undefined });
    },
    [importItems],
  );

  const handleLegacyImport = useCallback(async () => {
    setLegacyBusy(true);
    try {
      const inputs = legacy.map(legacyToInput).filter((input): input is BookmarkInput => input !== null);
      const result = await importItems(inputs);
      if (result) {
        dismissLegacy();
        setLegacy([]);
        toast({ tone: "success", message: `Imported ${plural(result.imported, "bookmark")} from your old list` });
      }
    } finally {
      setLegacyBusy(false);
    }
  }, [legacy, importItems]);

  const handleLegacyDismiss = useCallback(() => {
    dismissLegacy();
    setLegacy([]);
  }, []);

  const confirmRemoveAll = useCallback(() => {
    void bookmarks.clear(clearKind);
  }, [bookmarks, clearKind]);

  // ── body ─────────────────────────────────────────────────────────────────────────────────
  const dialogNoun = tab === "repos" ? "saved repos" : tab === "issues" ? "saved issues" : "bookmarks";
  const clearLabel = tab === "repos" ? "Remove all repos…" : tab === "issues" ? "Remove all issues…" : "Remove all bookmarks…";

  let body: React.ReactNode;
  if (bookmarks.unauthenticated) {
    body = <SignInState />;
  } else if (status === "error" && items.length === 0) {
    body = <ErrorState message={bookmarks.error} busy={false} onRetry={() => void bookmarks.refresh()} />;
  } else if (bookmarks.loading) {
    body = <LoadingState tab={tab} counts={cachedCounts} />;
  } else if (items.length === 0) {
    body = <EmptyState scope="repos" />;
  } else if (scopeTotal === 0) {
    body = <EmptyState scope={tab} />;
  } else if (shownCount === 0) {
    body = <NoResultsState query={cleanQuery(deferredQuery)} onClear={handleClearSearch} />;
  } else {
    body = (
      <>
        {showRepos && visibleRepos.length > 0 ? (
          <section className="bm-section" aria-labelledby="bm-h-repos">
            <SectionHeading id="bm-h-repos" label="Repositories" count={visibleRepos.length} visible />

            {repoCards.length > 0 ? (
              <RepoGrid
                repos={repoCards}
                initialLoading={false}
                loadingMore={false}
                hasMore={false}
                onLoadMore={noop}
                hasActiveQuery={searching}
                onClearFilters={handleClearSearch}
                aiStates={ai.states}
                onGetAiTake={ai.getAiTake}
                onOpenRepo={setOpenRepo}
                savedRepoIds={savedRepoIds}
                onToggleSaved={handleToggleRepo}
              />
            ) : null}

            {compactRepos.length > 0 ? (
              <>
                {repoCards.length > 0 ? <h3 className="bm-subhead">Saved with limited details</h3> : null}
                <ul className="bm-list" role="list" style={repoCards.length === 0 ? undefined : { marginTop: 0 }}>
                  <AnimatePresence mode="popLayout">
                    {compactRepos.map((record, index) => (
                      <motion.li key={record.id} {...rowMotion(index, reduce)}>
                        <CompactRepoRow record={record} />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        {showIssues && visibleIssues.length > 0 ? (
          <section className="bm-section" aria-labelledby="bm-h-issues">
            <SectionHeading id="bm-h-issues" label="Issues" count={visibleIssues.length} visible />
            <ul className="bm-list" role="list">
              <AnimatePresence mode="popLayout">
                {visibleIssues.map((record: BookmarkRecord, index) => (
                  <motion.li key={record.id} {...rowMotion(index, reduce)}>
                    {renderIssue ? (
                      renderIssue(record, { index, remove: () => bookmarks.remove(record.id) })
                    ) : (
                      <IssueRow record={record} proposals={proposals} />
                    )}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}
      </>
    );
  }

  // The little line under the toolbar: counts on the left, sync state on the right.
  let summary: React.ReactNode = null;
  if (bookmarks.ready && items.length > 0) {
    summary = searching ? (
      <>
        Showing <strong>{shownCount}</strong> of {scopeTotal}
      </>
    ) : (
      <>
        <strong>{plural(scopeTotal, "bookmark")}</strong>
      </>
    );
  } else if (bookmarks.loading) {
    summary = <>Loading your bookmarks…</>;
  }

  const refreshFailed = bookmarks.ready && Boolean(bookmarks.error);

  return (
    <div className="discovery-page bm-page">
      <Navbar />

      <main className="container" id="bookmarks-main">
        <header className="bm-hero">
          <div className="eyebrow">
            <Bookmark size={14} strokeWidth={2} style={{ color: "var(--accent)" }} aria-hidden="true" />
            <span className="eyebrow-label">Your collection</span>
          </div>
          <h1 className="h1">
            Everything you saved,
            <br />
            <span className="grad">right where you left it.</span>
          </h1>
          <p className="subhead">
            Repos and issues look and behave exactly like they do in Discovery and Hunt: AI takes, proposals, links and all.
          </p>
        </header>

        {legacy.length > 0 ? (
          <LegacyBanner count={legacy.length} busy={legacyBusy} onImport={() => void handleLegacyImport()} onDismiss={handleLegacyDismiss} />
        ) : null}
        {nearLimit ? <LimitBanner limit={bookmarks.limit} /> : null}

        <Tabs value={tab} onValueChange={handleTab} className="bm-tabs-root">
          <BookmarksToolbar
            counts={tabCounts}
            query={query}
            onQuery={setQuery}
            searchRef={searchRef}
            sort={sort}
            onSort={setSort}
            onRefresh={() => void bookmarks.refresh()}
            onExport={handleExport}
            onImport={() => fileRef.current?.click()}
            onClear={() => setConfirmClear(true)}
            exportDisabled={items.length === 0}
            clearDisabled={scopeTotal === 0 || !bookmarks.ready}
            clearLabel={clearLabel}
          />

          <div className="bm-statusbar">
            <div className="bm-statusbar__left" aria-live="polite">
              {summary}
            </div>
            <div className="bm-statusbar__right">
              {bookmarks.refreshing ? (
                <span role="status">
                  <LoaderCircle className="bm-spin" aria-hidden="true" /> Syncing…
                </span>
              ) : refreshFailed ? (
                <span role="status">
                  <TriangleAlert aria-hidden="true" /> Couldn&apos;t refresh.{" "}
                  <button type="button" className="bm-linkbtn" onClick={() => void bookmarks.refresh()}>
                    Retry
                  </button>
                </span>
              ) : null}
            </div>
          </div>

          <TabsContent value={tab} className="bm-panel">
            <div ref={panelRef} tabIndex={-1} className="bm-panel">
              <motion.div
                key={tab}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                {body}
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {openRepo ? <DetailModal repo={openRepo} onClose={() => setOpenRepo(null)} /> : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="bm-sr"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleFile(event)}
      />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="bm-dialog" style={{ background: "#101010", borderColor: "#262626", color: "#ededed" }}>
          <AlertDialogHeader>
            <div className="bm-dialog__icon" aria-hidden="true">
              <Trash2 />
            </div>
            <AlertDialogTitle className="bm-dialog__title">
              {scopeTotal === 1 ? "Remove this bookmark?" : `Remove all ${scopeTotal} ${dialogNoun}?`}
            </AlertDialogTitle>
            <AlertDialogDescription className="bm-dialog__text">
              They&apos;ll be removed from your account on every device. You&apos;ll have a few seconds to undo it afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="bm-dialog__footer">
            <AlertDialogCancel className="bm-btn">Keep them</AlertDialogCancel>
            <AlertDialogAction className="bm-btn bm-btn--danger-solid" onClick={confirmRemoveAll}>
              {scopeTotal === 1 ? "Remove" : `Remove ${scopeTotal}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BookmarksView;
