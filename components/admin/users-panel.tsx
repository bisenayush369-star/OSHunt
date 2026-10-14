"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronDown, Crown, Search, X } from "lucide-react";
import type { AdminUser } from "@/components/lib/admin/contract";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Face } from "./face";
import { ago, num, shortDate } from "./format";
import { useMediaQuery } from "./hooks";

type Status = "all" | "active" | "blocked" | "paid";
type Sort = "recent" | "newest" | "actions" | "name";

const PAGE = 25;
const ONLINE_MS = 5 * 60_000;

const SORTS: Array<{ key: Sort; label: string; compare: (a: AdminUser, b: AdminUser) => number }> = [
  { key: "recent", label: "Last seen", compare: (a, b) => Date.parse(b.lastSeen) - Date.parse(a.lastSeen) },
  { key: "newest", label: "Newest", compare: (a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt) },
  { key: "actions", label: "Most actions", compare: (a, b) => b.actions - a.actions },
  { key: "name", label: "Name", compare: (a, b) => a.name.localeCompare(b.name) },
];

/** Gold "Paid" pill. Only rendered for accounts with an active paid subscription. */
export function PaidBadge() {
  return (
    <Badge variant="outline" className="osa-badge" data-tone="gold">
      <Crown size={12} aria-hidden="true" />
      Paid
    </Badge>
  );
}

export function StatusBadge({ blocked }: { blocked: boolean }) {
  return (
    <Badge variant="outline" className="osa-badge" data-tone={blocked ? "alert" : "ok"}>
      <i aria-hidden="true" />
      {blocked ? "Blocked" : "Active"}
    </Badge>
  );
}

function Seen({ user, now }: { user: AdminUser; now: number }) {
  const online = now - Date.parse(user.lastSeen) < ONLINE_MS;
  return (
    <span className="osa-seen" data-online={online}>
      {online ? <span className="osa-sonar osa-sonar-sm" aria-hidden="true"><i /></span> : null}
      {online ? "Online now" : ago(user.lastSeen, now)}
    </span>
  );
}

export function UsersPanel({
  users,
  total,
  error,
  now,
  selectedId,
  onOpen,
  onRetry,
  billingConnected,
}: {
  users: AdminUser[] | null;
  total: number;
  error: string | null;
  now: number;
  selectedId: string | null;
  onOpen: (id: string) => void;
  onRetry: () => void;
  /** False until the Subscription table exists. Hides the Paid filter, which could only ever be empty. */
  billingConnected: boolean;
}) {
  const wide = useMediaQuery("(min-width: 768px)");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [limit, setLimit] = useState(PAGE);
  const term = useDeferredValue(query).trim().toLowerCase();

  useEffect(() => setLimit(PAGE), [term, status, sort]);

  const blockedCount = useMemo(() => (users ?? []).filter((u) => u.blocked).length, [users]);
  const paidCount = useMemo(() => (users ?? []).filter((u) => u.paid).length, [users]);
  const activeStatus: Status = status === "paid" && !billingConnected ? "all" : status;

  const rows = useMemo(() => {
    if (!users) return [];
    const compare = SORTS.find((s) => s.key === sort)?.compare ?? SORTS[0]!.compare;
    return users
      .filter((u) => {
        if (activeStatus === "blocked" && !u.blocked) return false;
        if (activeStatus === "active" && u.blocked) return false;
        if (activeStatus === "paid" && !u.paid) return false;
        if (!term) return true;
        return (
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          (u.githubUsername ?? "").toLowerCase().includes(term)
        );
      })
      .sort(compare);
  }, [users, activeStatus, term, sort]);

  const visible = rows.slice(0, limit);
  const filtered = term !== "" || activeStatus !== "all";
  const capped = users !== null && users.length < total;

  const chips: Array<{ key: Status; label: string; count: number }> = [
    { key: "all", label: "All", count: users?.length ?? 0 },
    { key: "active", label: "Active", count: (users?.length ?? 0) - blockedCount },
    { key: "blocked", label: "Blocked", count: blockedCount },
    ...(billingConnected ? [{ key: "paid" as const, label: "Paid", count: paidCount }] : []),
  ];

  return (
    <section className="osa-users" aria-labelledby="osa-users-title">
      <div className="osa-pagehead">
        <div>
          <h1 id="osa-users-title">Accounts</h1>
          <p className="osa-sub">
            {users ? `${num(total)} total${capped ? `, showing the newest ${num(users.length)}` : ""}.` : "Loading accounts."}
          </p>
        </div>
      </div>

      <div className="osa-toolbar">
        <div className="osa-search">
          <Search size={16} aria-hidden="true" />
          <Input
            type="search"
            inputMode="search"
            autoComplete="off"
            aria-label="Search accounts"
            placeholder="Search name, email or GitHub"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button type="button" className="osa-clear" aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="osa-chips" role="group" aria-label="Filter by status">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="osa-chip"
              aria-pressed={activeStatus === chip.key}
              data-on={activeStatus === chip.key}
              onClick={() => setStatus(chip.key)}
            >
              {chip.label}
              <span>{num(chip.count)}</span>
            </button>
          ))}
        </div>

        <label className="osa-select">
          <span className="osa-sr">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
      </div>

      {users === null && error ? (
        <div className="osa-alert" role="alert">
          <p>{error}</p>
          <Button className="osa-btn osa-btn-ghost" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : users === null ? (
        <div className="osa-panel osa-pad" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="osa-skel osa-row-skel" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="osa-panel osa-empty">
          <p>{filtered ? "No accounts match those filters." : "No accounts yet."}</p>
          {filtered ? (
            <Button
              className="osa-btn osa-btn-ghost"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      ) : wide ? (
        <div className="osa-panel osa-tablewrap">
          <Table className="osa-table">
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>GitHub</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="osa-num">Actions</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id} className="osa-row" data-selected={u.id === selectedId} onClick={() => onOpen(u.id)}>
                  <TableCell>
                    <button type="button" className="osa-acct">
                      <Face name={u.name} github={u.githubUsername} size={34} />
                      <span className="osa-acct-text">
                        <span className="osa-acct-name">{u.name}</span>
                        <span className="osa-acct-sub">{u.email}</span>
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="osa-mono">{u.githubUsername ? `@${u.githubUsername}` : "None"}</TableCell>
                  <TableCell>{shortDate(u.joinedAt)}</TableCell>
                  <TableCell>
                    <Seen user={u} now={now} />
                  </TableCell>
                  <TableCell className="osa-num">{num(u.actions)}</TableCell>
                  <TableCell>
                    <span className="osa-badges">
                      <StatusBadge blocked={u.blocked} />
                      {u.paid ? <PaidBadge /> : null}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ul className="osa-cards">
          {visible.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                className="osa-acct-card osa-reticle"
                data-selected={u.id === selectedId}
                data-blocked={u.blocked}
                onClick={() => onOpen(u.id)}
              >
                <Face name={u.name} github={u.githubUsername} size={44} />
                <span className="osa-card-main">
                  <span className="osa-acct-name">{u.name}</span>
                  <span className="osa-acct-sub">{u.email}</span>
                  <span className="osa-card-meta">
                    <span>{num(u.actions)} actions</span>
                    <Seen user={u} now={now} />
                  </span>
                </span>
                <span className="osa-badges-col">
                  <StatusBadge blocked={u.blocked} />
                  {u.paid ? <PaidBadge /> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > visible.length ? (
        <div className="osa-more">
          <Button className="osa-btn osa-btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>
            Show {Math.min(PAGE, rows.length - visible.length)} more
          </Button>
          <span className="osa-muted">
            {visible.length} of {num(rows.length)}
          </span>
        </div>
      ) : null}
    </section>
  );
}
