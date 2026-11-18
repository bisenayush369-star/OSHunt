"use client";

import * as React from "react";
import { Ban, BadgeCheck, FolderGit2, SearchX, Users } from "lucide-react";
import type { AdminUser } from "@/components/lib/admin/contract";
import type { AccountFilter, UsersPanelProps } from "./types";
import { Avatar, Button, Chip, EmptyState, Input, Notice, Panel, Segmented, Skeleton, type SegmentOption } from "./kit";
import { ago, cx, num, shortDate } from "./format";

/**
 * Accounts: search, filter, sort, then open one account's sheet. A table on wide screens and a card list on
 * phones (same rows, never a sideways-scrolling table). 50 rows at a time keeps 1,500 accounts snappy.
 */

type Sort = "joined" | "seen" | "actions";

const PAGE = 50;
const WEEK_MS = 7 * 24 * 3_600_000;

const SORTS: readonly SegmentOption<Sort>[] = [
  { value: "joined", label: "Newest", title: "Newest accounts first" },
  { value: "seen", label: "Last seen", title: "Seen most recently first" },
  { value: "actions", label: "Most active", title: "Most actions first" },
];

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

function matches(u: AdminUser, q: string): boolean {
  if (!q) return true;
  return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.githubUsername ?? "").toLowerCase().includes(q);
}

function passes(u: AdminUser, filter: AccountFilter, now: number): boolean {
  switch (filter) {
    case "blocked":
      return u.blocked;
    case "paid":
      return u.paid;
    case "active":
      return !u.blocked && now - time(u.lastSeen) <= WEEK_MS;
    default:
      return true;
  }
}

function Status({ u }: { u: AdminUser }) {
  return (
    <>
      {u.blocked ? (
        <Chip tone="bad" icon={Ban} title={u.blockReason ? `Blocked: ${u.blockReason}` : "Blocked"}>
          Blocked
        </Chip>
      ) : null}
      {u.paid ? (
        <Chip tone="lime" icon={BadgeCheck}>
          Paid
        </Chip>
      ) : null}
      {!u.onboarded && !u.blocked ? <Chip tone="mute">Setting up</Chip> : null}
    </>
  );
}

function Github({ name }: { name: string | null }) {
  if (!name) return <span className="osa-faint">Not linked</span>;
  return (
    <span className="osa-mono inline-flex min-w-0 items-center gap-1.5">
      <FolderGit2 className="size-3.5 flex-none osa-faint" aria-hidden />
      <span className="osa-truncate">{name}</span>
    </span>
  );
}

function Who({ u, size = 32 }: { u: AdminUser; size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <Avatar name={u.name || u.email} size={size} />
      <span className="min-w-0">
        <span className="osa-truncate block font-medium">{u.name || "Unnamed account"}</span>
        <span className="osa-truncate osa-faint block text-[12px]">{u.email}</span>
      </span>
    </span>
  );
}

export function UsersPanel({ users, total, error, now, selectedId, onOpen, onRetry, billingConnected, initialFilter }: UsersPanelProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<AccountFilter>(initialFilter ?? "all");
  const [sort, setSort] = React.useState<Sort>("joined");
  const [shown, setShown] = React.useState(PAGE);
  const searchId = React.useId();

  // The console renders this with a new key when a tile sends it here with a filter, so useState's initial value is enough.

  const filters = React.useMemo<SegmentOption<AccountFilter>[]>(() => {
    const base: SegmentOption<AccountFilter>[] = [
      { value: "all", label: "All" },
      { value: "active", label: "Active", title: "Seen in the last 7 days" },
      { value: "blocked", label: "Blocked" },
    ];
    if (billingConnected || filter === "paid") base.push({ value: "paid", label: "Paid" });
    return base;
  }, [billingConnected, filter]);

  const rows = React.useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const list = users.filter((u) => passes(u, filter, now) && matches(u, q));
    const key: Record<Sort, (u: AdminUser) => number> = { joined: (u) => time(u.joinedAt), seen: (u) => time(u.lastSeen), actions: (u) => u.actions };
    return list.sort((a, b) => key[sort](b) - key[sort](a) || a.name.localeCompare(b.name));
  }, [users, query, filter, sort, now]);

  const changeFilter = (next: AccountFilter) => {
    setFilter(next);
    setShown(PAGE);
  };

  const visible = rows.slice(0, shown);
  const capped = users !== null && total > users.length;

  if (users === null) {
    return (
      <Panel className="overflow-hidden" aria-labelledby="accounts-title">
        <h2 id="accounts-title" className="sr-only">
          Accounts
        </h2>
        {error ? (
          <div className="p-4">
            <Notice
              tone="bad"
              title="Could not load accounts"
              action={
                <Button size="sm" onClick={onRetry}>
                  Try again
                </Button>
              }
            >
              {error}
            </Notice>
          </div>
        ) : (
          <div className="grid gap-4 p-4" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton w={32} h={32} radius={999} />
                <div className="grid flex-1 gap-2">
                  <Skeleton w="40%" h={12} />
                  <Skeleton w="60%" h={10} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    );
  }

  return (
    <Panel className="overflow-hidden" aria-labelledby="accounts-title">
      <div className="osa-panel-head">
        <div className="min-w-0">
          <h2 id="accounts-title" className="text-[15px] font-semibold leading-tight">
            Accounts
          </h2>
          <p className="osa-faint mt-0.5 text-[12px]" aria-live="polite">
            {rows.length === users.length ? `${num(users.length)} ${users.length === 1 ? "account" : "accounts"}` : `${num(rows.length)} of ${num(users.length)}`}
            {capped ? ` (newest ${num(users.length)} of ${num(total)})` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={filter} onChange={changeFilter} options={filters} label="Filter accounts" />
          <Segmented value={sort} onChange={setSort} options={SORTS} label="Sort accounts" />
        </div>
      </div>

      <div className="border-b border-[var(--osa-line)] p-3">
        <label htmlFor={searchId} className="sr-only">
          Search accounts by name, e-mail or GitHub username
        </label>
        <Input
          id={searchId}
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search name, e-mail or GitHub"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShown(PAGE);
          }}
        />
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No accounts yet">
          Accounts appear here as soon as someone signs in to OSHunt.
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Nothing matches"
          action={
            <Button
              size="sm"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Clear search and filter
            </Button>
          }
        >
          Try a different name, or switch the filter back to All.
        </EmptyState>
      ) : (
        <>
          {/* Wide screens: a table. */}
          <div className="hidden md:block">
            <table className="osa-table">
              <caption className="sr-only">Accounts. Choose a name to open the account.</caption>
              <thead>
                <tr>
                  <th scope="col">Account</th>
                  <th scope="col">GitHub</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-right">
                    Actions
                  </th>
                  <th scope="col">Last seen</th>
                  <th scope="col">Joined</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr key={u.id} aria-selected={u.id === selectedId} onClick={() => onOpen(u.id)}>
                    <td className="max-w-[280px]">
                      <button type="button" className="block w-full min-w-0 border-0 bg-transparent p-0 text-left text-inherit [font:inherit]" onClick={(e) => {
                          e.stopPropagation();
                          onOpen(u.id);
                        }}>
                        <Who u={u} />
                      </button>
                    </td>
                    <td className="max-w-[160px]">
                      <Github name={u.githubUsername} />
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1.5">
                        <Status u={u} />
                      </span>
                    </td>
                    <td className="osa-num text-right">{num(u.actions)}</td>
                    <td className="osa-muted whitespace-nowrap">{ago(u.lastSeen, now)}</td>
                    <td className="osa-muted whitespace-nowrap">{shortDate(u.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per account. */}
          <ul className="osa-list md:hidden">
            {visible.map((u) => (
              <li key={u.id}>
                <button type="button" className={cx("osa-row flex-col items-stretch gap-2")} data-selected={u.id === selectedId} onClick={() => onOpen(u.id)}>
                  <Who u={u} />
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]">
                    <Status u={u} />
                    <Github name={u.githubUsername} />
                  </span>
                  <span className="osa-faint flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]">
                    <span>Seen {ago(u.lastSeen, now)}</span>
                    <span>Joined {shortDate(u.joinedAt)}</span>
                    <span>{num(u.actions)} actions</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--osa-line)] px-4 py-3">
            <p className="osa-faint text-[12px]">
              Showing {num(visible.length)} of {num(rows.length)}
            </p>
            {visible.length < rows.length ? (
              <Button size="sm" onClick={() => setShown((n) => n + PAGE)}>
                Show {num(Math.min(PAGE, rows.length - visible.length))} more
              </Button>
            ) : null}
          </div>
        </>
      )}
    </Panel>
  );
}
