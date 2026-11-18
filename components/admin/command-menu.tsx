"use client";

import * as React from "react";
import { Dialog, VisuallyHidden } from "radix-ui";
import { Clock, Cpu, LayoutDashboard, LogOut, RefreshCw, Search, User, Users, type LucideIcon } from "lucide-react";
import { LLM_STATE_LABEL, RANGES, RANGE_META, type AdminUser, type LlmSection } from "@/components/lib/admin/contract";
import type { CommandMenuProps } from "./types";
import { Kbd, useRestoreFocus } from "./kit";
import { cx } from "./format";

/**
 * Command menu (Ctrl/Cmd + K). A small combobox + listbox written for this admin, so it adds no dependency.
 * Go to a screen, change the chart range, jump to an LLM provider, open an account by name / e-mail / GitHub,
 * refresh, or sign out. Arrow keys move, Enter runs, Escape closes.
 */

type Item = { id: string; group: string; label: string; hint?: string; icon: LucideIcon; search: string; run: () => void };

const MAX_ACCOUNTS = 6;

function buildItems(p: Pick<CommandMenuProps, "users" | "llm" | "onNavigate" | "onRange" | "onOpenUser" | "onSync" | "onSignOut">, query: string): Item[] {
  const items: Item[] = [
    { id: "go-overview", group: "Go to", label: "Overview", icon: LayoutDashboard, search: "overview home numbers growth", run: () => p.onNavigate("overview") },
    { id: "go-accounts", group: "Go to", label: "Accounts", icon: Users, search: "accounts users people", run: () => p.onNavigate("accounts") },
    { id: "go-llm", group: "Go to", label: "LLM APIs", icon: Cpu, search: "llm apis providers limits keys models", run: () => p.onNavigate("llm") },
    ...RANGES.map<Item>((r) => ({
      id: `range-${r}`,
      group: "Growth chart",
      label: `Show the last ${RANGE_META[r].long}`,
      hint: RANGE_META[r].label,
      icon: Clock,
      search: `range chart growth ${RANGE_META[r].label} ${RANGE_META[r].long}`,
      run: () => {
        p.onRange(r);
        p.onNavigate("overview");
      },
    })),
  ];

  const llm: LlmSection | null = p.llm;
  if (llm && llm.available) {
    for (const prov of llm.providers) {
      items.push({ id: `llm-${prov.name}`, group: "LLM APIs", label: prov.label, hint: LLM_STATE_LABEL[prov.state], icon: Cpu, search: `llm api provider ${prov.name} ${prov.label}`, run: () => p.onNavigate("llm", { provider: prov.name }) });
    }
  }

  items.push(
    { id: "act-refresh", group: "Actions", label: "Refresh now", icon: RefreshCw, search: "refresh sync reload update", run: p.onSync },
    { id: "act-signout", group: "Actions", label: "Sign out", icon: LogOut, search: "sign out log out exit", run: p.onSignOut },
  );

  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const fits = (text: string) => tokens.every((t) => text.includes(t));
  const filtered = tokens.length ? items.filter((i) => fits(`${i.label} ${i.hint ?? ""} ${i.search}`.toLowerCase())) : items;

  // Accounts only show once you type: a list of everyone is the Accounts screen's job.
  if (tokens.length && p.users) {
    const people = p.users.filter((u: AdminUser) => fits(`${u.name} ${u.email} ${u.githubUsername ?? ""}`.toLowerCase())).slice(0, MAX_ACCOUNTS);
    return [
      ...people.map<Item>((u) => ({ id: `user-${u.id}`, group: "Accounts", label: u.name || u.email, hint: u.name ? u.email : undefined, icon: User, search: "", run: () => p.onOpenUser(u.id) })),
      ...filtered,
    ];
  }
  return filtered;
}

function Body({ onOpenChange, ...props }: CommandMenuProps) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listId = React.useId();

  const items = React.useMemo(() => buildItems(props, query), [props, query]);
  const current = Math.min(active, Math.max(0, items.length - 1));
  const optionId = (i: number) => `${listId}-opt-${i}`;

  React.useEffect(() => {
    document.getElementById(optionId(current))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, items]);

  const run = (item: Item | undefined) => {
    if (!item) return;
    onOpenChange(false);
    item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current - 1 + items.length) % items.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(items[current]);
    }
  };

  return (
    <>
      <div className="osa-cmd-search flex items-center gap-3 border-b border-[var(--osa-line)] px-4">
        <Search className="size-4 flex-none osa-faint" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items.length ? optionId(current) : undefined}
          aria-autocomplete="list"
          aria-label="Search the admin"
          autoComplete="off"
          spellCheck={false}
          placeholder="Go to, search accounts, switch range"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="osa-cmd-input h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-[var(--osa-ink)] placeholder:text-[var(--osa-ink-3)] focus:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>

      <div id={listId} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {items.length === 0 ? (
          <p className="osa-muted px-3 py-8 text-center text-[13px]">No results for &ldquo;{query.trim()}&rdquo;</p>
        ) : (
          items.map((item, i) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.id}>
                {i === 0 || items[i - 1]!.group !== item.group ? (
                  <div role="presentation" className="osa-eyebrow px-3 pb-1 pt-3 first:pt-1">
                    {item.group}
                  </div>
                ) : null}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === current}
                  data-active={i === current}
                  className={cx("osa-cmd-item")}
                  onMouseMove={() => i !== current && setActive(i)}
                  onClick={() => run(item)}
                >
                  <Icon aria-hidden />
                  <span className="osa-truncate flex-1">{item.label}</span>
                  {item.hint ? <span className="osa-faint osa-truncate max-w-[45%] text-[12px]">{item.hint}</span> : null}
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <div className="hidden items-center gap-4 border-t border-[var(--osa-line)] px-4 py-2 text-[12px] osa-faint sm:flex">
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Kbd>↵</Kbd> open
        </span>
      </div>
    </>
  );
}

export function CommandMenu(props: CommandMenuProps) {
  const focus = useRestoreFocus();
  return (
    <Dialog.Root open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-osa-portal className="osa-overlay" />
        <Dialog.Content data-osa-portal className="osa-cmd" aria-describedby={undefined} {...focus}>
          <VisuallyHidden.Root>
            <Dialog.Title>Command menu</Dialog.Title>
          </VisuallyHidden.Root>
          {/* Mounted only while open, so every opening starts with an empty search. */}
          <Body {...props} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
