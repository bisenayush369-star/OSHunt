"use client";

import * as React from "react";
import { Ban, BadgeCheck, Calendar, Clock, ExternalLink, FolderGit2, History, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import {
  BLOCK_REASON_MAX,
  BLOCK_REASON_PRESETS,
  isGitHubError,
  type AdminActivity,
  type AdminUser,
  type GitHubProfile,
} from "@/components/lib/admin/contract";
import type { UserSheetProps } from "./types";
import { AdminApiError } from "./api";
import { Avatar, Button, Chip, Confirm, Drawer, DrawerClose, Input, Notice, Skeleton } from "./kit";
import { ago, cx, dateTime, humanize, num, shortDate } from "./format";
import { useUserDetail } from "./use-user-detail";

/**
 * One account: who they are, their GitHub (live), their OWN activity (newest first) and the block switch.
 * This is the only place activity is listed. Blocking always asks first and always writes an audit row.
 */

/** Only ever link to github.com: the URL came from a third party, so it is checked, not trusted. */
function safeGithubUrl(url: string, login: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && u.hostname === "github.com") return u.toString();
  } catch {
    /* fall through */
  }
  return `https://github.com/${encodeURIComponent(login)}`;
}

/** "PushEvent" -> "Push", "PullRequestReviewEvent" -> "Pull request review". */
function eventName(type: string): string {
  const words = type.replace(/Event$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return words ? words.charAt(0).toUpperCase() + words.slice(1).toLowerCase() : "Event";
}

function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[var(--osa-line)] bg-[var(--osa-panel)] p-3">
      <dt className="osa-eyebrow flex items-center gap-1.5">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1.5 min-w-0 text-[13px]">{children}</dd>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--osa-line)] px-4 py-4 sm:px-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="text-[13px] font-semibold">{title}</h3>
        {hint ? <span className="osa-faint text-[12px]">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function GithubBlock({ github, username }: { github: NonNullable<ReturnType<typeof useUserDetail>["detail"]>["github"]; username: string | null }) {
  if (!username) return <p className="osa-muted text-[13px]">No GitHub username on this account.</p>;
  if (github === null) return <p className="osa-muted text-[13px]">No GitHub data yet.</p>;
  if (isGitHubError(github)) {
    return (
      <Notice tone="warn" title="GitHub data unavailable">
        {github.error}
      </Notice>
    );
  }
  const g: GitHubProfile = github;
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={g.login} src={g.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <a href={safeGithubUrl(g.url, g.login)} target="_blank" rel="noopener noreferrer" className="osa-mono inline-flex max-w-full items-center gap-1.5 font-medium underline decoration-[var(--osa-line-strong)] underline-offset-4 hover:decoration-[var(--osa-lime)]">
            <span className="osa-truncate">{g.login}</span>
            <ExternalLink className="size-3.5 flex-none" aria-hidden />
            <span className="sr-only">(opens GitHub in a new tab)</span>
          </a>
          <p className="osa-faint text-[12px]">On GitHub since {shortDate(g.createdAt)}</p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <Fact icon={Users} label="Followers">
          <span className="osa-num">{num(g.followers)}</span>
        </Fact>
        <Fact icon={FolderGit2} label="Public repos">
          <span className="osa-num">{num(g.repos)}</span>
        </Fact>
      </dl>
      {g.events.length > 0 ? (
        <div>
          <p className="osa-eyebrow mb-1.5">Recent public events</p>
          <ul className="grid gap-1.5 text-[13px]">
            {g.events.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  {eventName(e.type)}
                  {e.repo ? <span className="osa-mono osa-faint osa-truncate block text-[12px]">{e.repo}</span> : null}
                </span>
                <span className="osa-faint flex-none text-[12px]">{shortDate(e.at)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="osa-faint text-[12px]">No public events lately.</p>
      )}
    </div>
  );
}

function ActivityList({ items, now }: { items: AdminActivity[]; now: number }) {
  if (items.length === 0) return <p className="osa-muted text-[13px]">This account has not done anything yet.</p>;
  return (
    <ol className="grid gap-0">
      {items.map((a) => (
        <li key={a.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 border-b border-[var(--osa-line)] py-2 last:border-b-0">
          <span className={cx("osa-dot translate-y-[1px]", a.action.startsWith("admin_") && "!bg-[var(--osa-warn)]")} aria-hidden />
          <span className="min-w-0 text-[13px]">
            {humanize(a.action)}
            {a.detail ? <span className="osa-faint osa-truncate block text-[12px]">{a.detail}</span> : null}
          </span>
          <time dateTime={a.at} title={dateTime(a.at)} className="osa-faint whitespace-nowrap text-[12px]">
            {ago(a.at, now)}
          </time>
        </li>
      ))}
    </ol>
  );
}

export function UserSheet({ userId, listUser, side, now, onClose, onBlock }: UserSheetProps) {
  // The console renders this with key={userId}, so a different account starts with a clean slate.
  const { detail, error, reload } = useUserDetail(userId);
  const [askBlock, setAskBlock] = React.useState<"block" | "unblock" | null>(null);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  const user: AdminUser | null = listUser ?? (detail && detail.user.id === userId ? detail.user : null);

  const submit = async () => {
    if (!user || !askBlock) return;
    setBusy(true);
    setProblem(null);
    try {
      await onBlock(user.id, askBlock === "block", reason);
      setAskBlock(null);
      setReason("");
      reload(); // pulls the audit row the server just wrote
    } catch (e) {
      setProblem(e instanceof AdminApiError ? e.message : "Could not update that account.");
    } finally {
      setBusy(false);
    }
  };

  const title = user ? user.name || user.email : "Account";

  return (
    <>
      <Drawer open={userId !== null} onOpenChange={(open) => !open && onClose()} side={side} title={title} description="Account details, GitHub data, this account's own activity, and the block switch.">
        <header className="flex items-start gap-3 border-b border-[var(--osa-line)] p-4 sm:p-5">
          {user ? <Avatar name={user.name || user.email} size={44} /> : <Skeleton w={44} h={44} radius={999} />}
          <div className="min-w-0 flex-1">
            {user ? (
              <>
                <p className="osa-truncate text-[17px] font-semibold leading-snug">{user.name || "Unnamed account"}</p>
                <p className="osa-truncate osa-muted text-[13px]">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.blocked ? (
                    <Chip tone="bad" icon={Ban}>
                      Blocked
                    </Chip>
                  ) : (
                    <Chip tone="good" icon={ShieldCheck}>
                      In good standing
                    </Chip>
                  )}
                  {user.paid ? (
                    <Chip tone="lime" icon={BadgeCheck}>
                      Paid
                    </Chip>
                  ) : null}
                  {!user.onboarded ? <Chip tone="mute">Setting up</Chip> : null}
                </div>
              </>
            ) : error ? (
              <p className="text-[13px] text-[var(--osa-bad-text)]">{error}</p>
            ) : (
              <div className="grid gap-2">
                <Skeleton w="50%" h={16} />
                <Skeleton w="70%" h={12} />
              </div>
            )}
          </div>
          <DrawerClose label="Close account" />
        </header>

        {/* Focusable so the keyboard can scroll it even when the account has nothing to tab to in here. */}
        <div role="region" aria-label="Account details" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {user ? (
            <>
              {user.blocked && user.blockReason ? (
                <div className="px-4 pt-4 sm:px-5">
                  <Notice tone="bad" title="This account is blocked">
                    Reason: {user.blockReason}
                  </Notice>
                </div>
              ) : null}

              <dl className="grid grid-cols-2 gap-2 p-4 sm:p-5">
                <Fact icon={Calendar} label="Joined">
                  {shortDate(user.joinedAt)}
                </Fact>
                <Fact icon={Clock} label="Last seen">
                  <time dateTime={user.lastSeen} title={dateTime(user.lastSeen)}>
                    {ago(user.lastSeen, now)}
                  </time>
                </Fact>
                <Fact icon={History} label="Actions">
                  <span className="osa-num">{num(user.actions)}</span>
                </Fact>
                <Fact icon={FolderGit2} label="GitHub">
                  {user.githubUsername ? <span className="osa-mono osa-truncate block">{user.githubUsername}</span> : <span className="osa-faint">Not linked</span>}
                </Fact>
              </dl>

              <Section title="GitHub" hint={detail ? `Live, ${ago(detail.updatedAt, now)}` : undefined}>
                {detail ? (
                  <GithubBlock github={detail.github} username={user.githubUsername} />
                ) : error ? (
                  <p className="osa-muted text-[13px]">{error}</p>
                ) : (
                  <div className="grid gap-2" aria-hidden>
                    <Skeleton w="45%" h={14} />
                    <Skeleton h={48} />
                  </div>
                )}
              </Section>

              <Section title="Activity" hint="This account only, newest first">
                {detail ? (
                  <ActivityList items={detail.activity} now={now} />
                ) : error ? (
                  <p className="osa-muted text-[13px]">{error}</p>
                ) : (
                  <div className="grid gap-2" aria-hidden>
                    <Skeleton h={14} />
                    <Skeleton h={14} />
                    <Skeleton h={14} />
                  </div>
                )}
              </Section>
            </>
          ) : null}
        </div>

        {user ? (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--osa-line)] p-4 sm:px-5">
            <p className="osa-faint max-w-[30ch] text-[12px]">{user.blocked ? "Unblocking lets them use OSHunt again." : "Blocking signs them out of OSHunt features until you unblock."}</p>
            {user.blocked ? (
              <Button variant="primary" onClick={() => setAskBlock("unblock")}>
                Unblock
              </Button>
            ) : (
              <Button variant="danger" onClick={() => setAskBlock("block")}>
                <Ban />
                Block account
              </Button>
            )}
          </footer>
        ) : null}
      </Drawer>

      <Confirm
        open={askBlock !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAskBlock(null);
            setProblem(null);
          }
        }}
        title={askBlock === "block" ? `Block ${title}?` : `Unblock ${title}?`}
        description={askBlock === "block" ? "They lose access until you unblock them. This is written to their activity so you can see it later." : "They get their access back straight away. This is written to their activity."}
        confirmLabel={askBlock === "block" ? "Block account" : "Unblock"}
        tone={askBlock === "block" ? "danger" : "primary"}
        busy={busy}
        onConfirm={() => void submit()}
      >
        <div className="grid gap-3">
          <div>
            <label htmlFor="osa-block-reason" className="osa-label">
              Reason {askBlock === "block" ? "(optional)" : "(optional note)"}
            </label>
            <Input id="osa-block-reason" value={reason} maxLength={BLOCK_REASON_MAX} onChange={(e) => setReason(e.target.value)} placeholder="Why? Only you will see this" autoComplete="off" />
          </div>
          {askBlock === "block" ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Common reasons">
              {BLOCK_REASON_PRESETS.map((p) => (
                <Button key={p} size="sm" variant={reason === p ? "primary" : "default"} aria-pressed={reason === p} onClick={() => setReason(p)}>
                  {p}
                </Button>
              ))}
            </div>
          ) : null}
          {problem ? (
            <Notice tone="bad" title="Not saved">
              {problem}
            </Notice>
          ) : null}
        </div>
      </Confirm>
    </>
  );
}
