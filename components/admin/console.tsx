"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, MotionConfig } from "framer-motion";
import { LayoutDashboard, LogOut, Search, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { Toaster } from "sonner";
import { ADMIN_PATHS, DEFAULT_RANGE, type RangeKey } from "@/components/lib/admin/contract";
import { CommandMenu } from "./command-menu";
import { useMediaQuery, useNow } from "./hooks";
import { Overview } from "./overview";
import { SyncChip } from "./sync-chip";
import { useAdminSync } from "./use-admin-sync";
import { UserSheet } from "./user-sheet";
import { UsersPanel } from "./users-panel";

type View = "overview" | "users";

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Accounts", icon: UsersIcon },
] as const;

/**
 * The admin shell. State that must survive switching screens lives here (range, selected
 * account). All server data comes from ONE hook, useAdminSync, and is passed down, so no panel
 * fetches on its own. Everything is always visible: there is no privacy blur.
 */
export function Console() {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mod, setMod] = useState("Ctrl");

  const sync = useAdminSync(range);
  const now = useNow(15_000);
  const wide = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    setMod(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Pointer spotlight: one delegated listener tells the card under the mouse where the pointer
  // is (--mx / --my), and the CSS paints the glow. Mouse only, throttled to one write per frame.
  useEffect(() => {
    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const paint = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      const box = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${Math.round(x - box.left)}px`);
      el.style.setProperty("--my", `${Math.round(y - box.top)}px`);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = (e.target as Element | null)?.closest?.(".osa-glow");
      if (!(el instanceof HTMLElement)) return;
      pending = { el, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const signOut = useCallback(async () => {
    await fetch(ADMIN_PATHS.api.gate, { method: "DELETE", credentials: "same-origin" }).catch(() => undefined);
    router.replace(ADMIN_PATHS.login);
    router.refresh();
  }, [router]);

  const go = useCallback((next: View) => {
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  const listUser = useMemo(
    () => sync.users?.find((u) => u.id === selectedId) ?? null,
    [sync.users, selectedId],
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="osa-app">
        <a className="osa-skip" href="#osa-main">
          Skip to content
        </a>

        <nav className="osa-nav" aria-label="Admin sections">
          <div className="osa-brand">
            <Image src="/white.png" alt="" width={26} height={26} priority />
            <span>OSHunt</span>
            <span className="osa-tag">Admin</span>
          </div>

          <div className="osa-navlist">
            {NAV.map(({ key, label, icon: Icon }) => {
              const on = view === key;
              return (
                <button
                  key={key}
                  type="button"
                  className="osa-navbtn"
                  data-on={on}
                  aria-current={on ? "page" : undefined}
                  onClick={() => go(key)}
                >
                  {on ? (
                    <motion.i
                      layoutId="osa-nav-rail"
                      className="osa-navrail"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <Icon size={18} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="osa-navfoot">
            <div className="osa-who">
              <span className="osa-who-icon" aria-hidden="true">
                <ShieldCheck size={16} />
              </span>
              <span className="osa-who-text">
                <b>Owner</b>
                <span>Signed in</span>
              </span>
            </div>
            <button type="button" className="osa-navbtn" onClick={() => void signOut()}>
              <LogOut size={18} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </nav>

        <div className="osa-column">
          <header className="osa-header">
            <div className="osa-brand osa-brand-mobile">
              <Image src="/white.png" alt="" width={24} height={24} />
              <span>OSHunt</span>
            </div>
            <p className="osa-headtitle">{view === "overview" ? "Overview" : "Accounts"}</p>
            <button
              type="button"
              className="osa-search-trigger"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command menu"
              aria-keyshortcuts="Meta+K Control+K"
            >
              <Search size={16} aria-hidden="true" />
              <span>Search accounts and actions</span>
              <kbd>{mod} K</kbd>
            </button>
            <SyncChip
              lastSyncAt={sync.lastSyncAt}
              syncing={sync.syncing}
              error={sync.error}
              online={sync.online}
              onSync={() => void sync.syncNow()}
            />
          </header>

          <main id="osa-main" className="osa-main" tabIndex={-1}>
            {view === "overview" ? (
              <Overview range={range} onRange={setRange} sync={sync} now={now} onOpenUser={setSelectedId} />
            ) : (
              <UsersPanel
                users={sync.users}
                total={sync.total}
                error={sync.error}
                now={now}
                selectedId={selectedId}
                onOpen={setSelectedId}
                onRetry={() => void sync.syncNow()}
                billingConnected={Boolean(sync.stats?.billing.available)}
              />
            )}
          </main>
        </div>

        <UserSheet
          userId={selectedId}
          listUser={listUser}
          side={wide ? "right" : "bottom"}
          now={now}
          onClose={() => setSelectedId(null)}
          onBlock={sync.setBlocked}
        />

        <CommandMenu
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          users={sync.users}
          onView={go}
          onRange={setRange}
          onOpenUser={setSelectedId}
          onSync={() => void sync.syncNow()}
          onSignOut={() => void signOut()}
        />

        <Toaster theme="dark" position="top-center" closeButton toastOptions={{ classNames: { toast: "osa-toast" } }} />
      </div>
    </MotionConfig>
  );
}
