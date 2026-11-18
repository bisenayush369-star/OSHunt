"use client";

import * as React from "react";
import Link from "next/link";
import { CircleCheck, CloudOff, Cpu, Heart, LayoutDashboard, LoaderCircle, Lock, LogOut, RefreshCw, Search, Users, WifiOff } from "lucide-react";
import { ADMIN_PATHS, DEFAULT_RANGE, RANGES, SYNC, llmAttention, type RangeKey } from "@/components/lib/admin/contract";
import type { AccountFilter, AdminView, Navigate } from "./types";
import { AdminApiError, adminFetch } from "./api";
import { CommandMenu } from "./command-menu";
import { Button, Chip, Count, Kbd, Notice, Tabs, type TabItem } from "./kit";
import { AdminRoot } from "./scope";
import { LlmPanel } from "./llm-panel";
import { Overview } from "./overview";
import { UserSheet } from "./user-sheet";
import { UsersPanel } from "./users-panel";
import { useAdminSync } from "./use-admin-sync";
import { ago } from "./format";
import { useMediaQuery, useNow, useStoredState } from "./hooks";

/**
 * The console shell: top bar, three screens (Overview, Accounts, LLM APIs), the account sheet and the command
 * menu. It owns the only state that crosses screens (range, selected account, which provider to highlight) and
 * hands every screen plain props, so a screen never fetches or navigates by itself.
 */

const VIEWS: readonly AdminView[] = ["overview", "accounts", "llm"];
const isView = (v: string): v is AdminView => (VIEWS as readonly string[]).includes(v);
const VIEW_LABEL: Record<AdminView, string> = { overview: "Overview", accounts: "Accounts", llm: "LLM APIs" };

/** The screen lives in the URL hash (#accounts), so reload and the back button keep your place. The hash is only a screen name. */
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.slice(1);
const serverHash = () => "";

function SyncChip({ online, lastSyncAt, now, syncing }: { online: boolean; lastSyncAt: number | null; now: number; syncing: boolean }) {
  let chip: React.ReactNode;
  if (!online) {
    chip = (
      <Chip tone="warn" icon={WifiOff}>
        <span className="sr-only sm:not-sr-only">Offline</span>
      </Chip>
    );
  } else if (lastSyncAt === null) {
    chip = (
      <Chip tone="mute" icon={LoaderCircle}>
        <span className="sr-only sm:not-sr-only">Loading</span>
      </Chip>
    );
  } else if (now - lastSyncAt > SYNC.staleAfterMs) {
    chip = (
      <Chip tone="warn" icon={CloudOff} title={`Last synced ${ago(lastSyncAt, now)}`}>
        <span className="sr-only sm:not-sr-only">Out of date</span>
      </Chip>
    );
  } else {
    chip = (
      <Chip tone="good" icon={CircleCheck} title={syncing ? "Updating" : undefined}>
        <span className="sr-only sm:not-sr-only">{syncing ? "Updating" : `Synced ${ago(lastSyncAt, now)}`}</span>
      </Chip>
    );
  }
  return <span role="status">{chip}</span>;
}

function SessionEnded() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="osa-panel w-full max-w-[420px] p-6 text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-full border border-[var(--osa-line-strong)] bg-[var(--osa-raised)]">
          <Lock className="size-4 osa-muted" aria-hidden />
        </span>
        <h1 className="mt-4 text-[18px] font-semibold">Session ended</h1>
        <p className="osa-muted mt-1.5 text-[14px]">Your 2-hour session is over. Open the heart in the OSHunt footer to sign in again.</p>
        <Link href="/" prefetch={false} className="osa-btn osa-btn--primary mt-5">
          Back to OSHunt
        </Link>
      </div>
    </main>
  );
}

export function Console() {
  const [range, setRange] = useStoredState<RangeKey>("osa:range", DEFAULT_RANGE, RANGES);
  const hash = React.useSyncExternalStore(subscribeHash, readHash, serverHash);
  const view: AdminView = isView(hash) ? hash : "overview";

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [focusProvider, setFocusProvider] = React.useState<string | null>(null);
  const [accountsFilter, setAccountsFilter] = React.useState<{ filter: AccountFilter; nonce: number }>({ filter: "all", nonce: 0 });
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [signOutError, setSignOutError] = React.useState<string | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);

  const sync = useAdminSync({ range, view });
  const now = useNow(15_000);
  const wide = useMediaQuery("(min-width: 768px)", true);
  const { act } = llmAttention(sync.llm);

  const navigate = React.useCallback<Navigate>((next, opts) => {
    if (next === "accounts" && opts?.filter) {
      const filter = opts.filter;
      setAccountsFilter((prev) => ({ filter, nonce: prev.nonce + 1 }));
    }
    setFocusProvider(next === "llm" && opts?.provider ? opts.provider : null);
    window.location.hash = next;
    if (!(next === "llm" && opts?.provider)) window.scrollTo({ top: 0 });
  }, []);

  // Ctrl/Cmd + K opens the command menu from anywhere.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenuOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = React.useCallback(async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await adminFetch(ADMIN_PATHS.api.gate, { method: "DELETE" });
      window.location.assign("/");
    } catch (error) {
      setSigningOut(false);
      setSignOutError(error instanceof AdminApiError && error.status === 0 ? "Could not sign out: the server cannot be reached. You are still signed in." : "Could not sign out. You are still signed in; try again.");
    }
  }, []);

  const onFocusDone = React.useCallback(() => setFocusProvider(null), []);
  const { syncNow } = sync;
  const retry = React.useCallback(() => void syncNow(), [syncNow]);

  if (sync.sessionEnded) {
    return (
      <AdminRoot>
        <SessionEnded />
      </AdminRoot>
    );
  }

  const tabs: readonly TabItem<AdminView>[] = [
    { value: "overview", label: VIEW_LABEL.overview, icon: LayoutDashboard },
    { value: "accounts", label: VIEW_LABEL.accounts, icon: Users },
    { value: "llm", label: VIEW_LABEL.llm, icon: Cpu, badge: <Count n={act.length} label={act.length === 1 ? "LLM API needs you" : "LLM APIs need you"} /> },
  ];

  const listUser = selectedId && sync.users ? (sync.users.find((u) => u.id === selectedId) ?? null) : null;

  return (
    <AdminRoot>
      <a href="#main" className="osa-skip">
        Skip to content
      </a>

      <header className="osa-topbar">
        <div className="osa-shell flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-8 flex-none place-items-center rounded-lg border border-[var(--osa-lime-line)] bg-[var(--osa-lime-soft)]">
              <Heart className="size-4 text-[var(--osa-lime)]" fill="currentColor" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="osa-truncate text-[15px] font-semibold leading-tight">OSHunt admin</p>
              <p className="osa-faint osa-truncate text-[12px] leading-tight">Owner only</p>
            </div>
          </div>

          <div className="flex flex-none items-center gap-1.5 sm:gap-2">
            <SyncChip online={sync.online} lastSyncAt={sync.lastSyncAt} now={now} syncing={sync.syncing} />
            {/* The name is the visible word ("Search"), so voice control and screen readers agree on it; the shortcut is announced through aria-keyshortcuts instead of by reading the hint aloud. */}
            <Button size="sm" onClick={() => setMenuOpen(true)} aria-keyshortcuts="Control+K Meta+K">
              <Search />
              <span className="sr-only sm:not-sr-only">Search</span>
              <span className="hidden sm:inline" aria-hidden="true">
                <Kbd>Ctrl K</Kbd>
              </span>
            </Button>
            <Button size="sm" variant="ghost" onClick={retry} aria-label="Refresh now">
              <RefreshCw className={sync.syncing ? "animate-spin" : undefined} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void signOut()} loading={signingOut} aria-label="Sign out">
              {signingOut ? null : <LogOut />}
            </Button>
          </div>
        </div>
        <div className="osa-shell">
          <Tabs value={view} onChange={(v) => navigate(v)} tabs={tabs} label="Admin sections" idPrefix="osa" />
        </div>
      </header>

      <main id="main" tabIndex={-1} className="osa-shell osa-main outline-none">
        <h1 className="sr-only">{VIEW_LABEL[view]}</h1>

        {signOutError ? <Notice tone="bad" title={signOutError} className="mb-4" /> : null}

        <div role="tabpanel" id={`osa-panel-${view}`} aria-labelledby={`osa-tab-${view}`}>
          {view === "overview" ? <Overview range={range} onRange={setRange} sync={sync} now={now} onNavigate={navigate} /> : null}
          {view === "accounts" ? (
            <UsersPanel
              key={accountsFilter.nonce}
              users={sync.users}
              total={sync.total}
              error={sync.errors.users}
              now={now}
              selectedId={selectedId}
              onOpen={setSelectedId}
              onRetry={retry}
              billingConnected={sync.stats?.billing.available ?? false}
              initialFilter={accountsFilter.filter}
            />
          ) : null}
          {view === "llm" ? <LlmPanel llm={sync.llm} error={sync.errors.llm} now={now} focus={focusProvider} onFocusDone={onFocusDone} onRetry={retry} /> : null}
        </div>
      </main>

      <UserSheet key={selectedId ?? "none"} userId={selectedId} listUser={listUser} side={wide ? "right" : "bottom"} now={now} onClose={() => setSelectedId(null)} onBlock={sync.setBlocked} />

      <CommandMenu
        open={menuOpen}
        onOpenChange={setMenuOpen}
        users={sync.users}
        llm={sync.llm}
        onNavigate={navigate}
        onRange={setRange}
        onOpenUser={setSelectedId}
        onSync={retry}
        onSignOut={() => void signOut()}
      />
    </AdminRoot>
  );
}
