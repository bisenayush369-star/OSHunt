"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  BLOCK_REASON_MAX,
  BLOCK_REASON_PRESETS,
  isGitHubError,
  type AdminUser,
  type GitHubProfile,
} from "@/components/lib/admin/contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Face } from "./face";
import { ago, cx, humanize, num, shortDate } from "./format";
import { useUserDetail } from "./use-user-detail";
import { PaidBadge, StatusBadge } from "./users-panel";

function GitHubCard({ gh, now }: { gh: GitHubProfile; now: number }) {
  return (
    <div className="osa-gh">
      <a className="osa-link" href={gh.url} target="_blank" rel="noreferrer">
        @{gh.login}
        <ExternalLink size={14} aria-hidden="true" />
        <span className="osa-sr"> (opens GitHub)</span>
      </a>
      <dl className="osa-facts osa-facts-3">
        <div>
          <dt>Followers</dt>
          <dd>{num(gh.followers)}</dd>
        </div>
        <div>
          <dt>Public repos</dt>
          <dd>{num(gh.repos)}</dd>
        </div>
        <div>
          <dt>On GitHub since</dt>
          <dd>{shortDate(gh.createdAt)}</dd>
        </div>
      </dl>
      {gh.events.length > 0 ? (
        <ul className="osa-ghevents">
          {gh.events.slice(0, 5).map((event) => (
            <li key={event.id}>
              <span>{humanize(event.type)}</span>
              <span className="osa-muted">{event.repo ?? ""}</span>
              <time className="osa-muted" dateTime={event.at}>
                {ago(event.at, now)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p className="osa-muted">No public activity.</p>
      )}
    </div>
  );
}

export function UserSheet({
  userId,
  listUser,
  side,
  now,
  onClose,
  onBlock,
}: {
  userId: string | null;
  /** The row from the synced list. It carries optimistic block state, so it wins over the fetched copy. */
  listUser: AdminUser | null;
  side: "right" | "bottom";
  now: number;
  onClose: () => void;
  onBlock: (id: string, blocked: boolean, reason?: string) => Promise<AdminUser>;
}) {
  const { detail, refresh } = useUserDetail(userId);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const fresh = listUser ?? detail?.data?.user ?? null;
  // Keep the last account on screen while the sheet animates closed.
  const [held, setHeld] = useState<AdminUser | null>(null);
  useEffect(() => {
    if (fresh) setHeld(fresh);
  }, [fresh]);
  const user = fresh ?? held;

  useEffect(() => setReason(""), [userId]);

  async function run(blocked: boolean) {
    if (!user) return;
    setBusy(true);
    try {
      await onBlock(user.id, blocked, blocked ? reason : undefined);
      toast.success(blocked ? "Account blocked" : "Account unblocked", {
        description: blocked ? "The block applies wherever the app calls isBlocked()." : undefined,
      });
      setReason("");
      refresh();
    } catch (e) {
      toast.error("Could not update the account", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setBusy(false);
    }
  }

  const data = detail?.data ?? null;

  return (
    <Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={side}
        className={cx("osa-surface", "osa-sheet", side === "bottom" ? "osa-sheet-bottom" : "osa-sheet-right")}
        // Radix would focus the first button (copy ID) and draw a stray ring on it. Focus the panel instead.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
      >
        {user ? (
          <>
            <SheetHeader className="osa-sheet-head">
              <div className="osa-sheet-who">
                <Face name={user.name} github={user.githubUsername} size={56} />
                <div className="osa-sheet-names">
                  <SheetTitle>{user.name}</SheetTitle>
                  <SheetDescription>{user.email}</SheetDescription>
                </div>
              </div>
              <span className="osa-badges-col">
                <StatusBadge blocked={user.blocked} />
                {user.paid ? <PaidBadge /> : null}
              </span>
            </SheetHeader>

            <div className="osa-sheet-body">
              {user.blocked ? (
                <p className="osa-callout" data-tone="alert" role="status">
                  <ShieldAlert size={18} aria-hidden="true" />
                  <span>
                    Blocked{user.blockReason ? `: ${user.blockReason}` : "."}
                  </span>
                </p>
              ) : null}

              <dl className="osa-facts">
                <div>
                  <dt>Joined</dt>
                  <dd>{shortDate(user.joinedAt)}</dd>
                </div>
                <div>
                  <dt>Last seen</dt>
                  <dd>{ago(user.lastSeen, now)}</dd>
                </div>
                <div>
                  <dt>Actions</dt>
                  <dd>{num(user.actions)}</dd>
                </div>
                <div>
                  <dt>Onboarded</dt>
                  <dd>{user.onboarded ? "Yes" : "Not yet"}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="osa-link osa-idcopy"
                onClick={() => {
                  void navigator.clipboard?.writeText(user.id);
                  toast("Account ID copied");
                }}
              >
                <Copy size={14} aria-hidden="true" />
                <code>{user.id}</code>
                <span className="osa-sr">Copy account ID</span>
              </button>

              <section className="osa-section" aria-labelledby="osa-gh-title">
                <h3 id="osa-gh-title">GitHub</h3>
                {!user.githubUsername ? (
                  <p className="osa-muted">No GitHub account linked.</p>
                ) : !data ? (
                  <Skeleton className="osa-skel osa-gh-skel" />
                ) : data.github && isGitHubError(data.github) ? (
                  <p className="osa-muted">{data.github.error}</p>
                ) : data.github ? (
                  <GitHubCard gh={data.github} now={now} />
                ) : null}
              </section>

              <section className="osa-section" aria-labelledby="osa-act-title">
                <h3 id="osa-act-title">Activity on OSHunt</h3>
                {detail?.error && !data ? (
                  <div className="osa-alert" role="alert">
                    <p>{detail.error}</p>
                    <Button className="osa-btn osa-btn-ghost" onClick={refresh}>
                      Try again
                    </Button>
                  </div>
                ) : !data ? (
                  <Skeleton className="osa-skel osa-tl-skel" />
                ) : data.activity.length === 0 ? (
                  <p className="osa-muted">No actions recorded yet.</p>
                ) : (
                  <ol className="osa-timeline">
                    {data.activity.map((item) => (
                      <li key={item.id}>
                        <span className="osa-tl-dot" aria-hidden="true" />
                        <div>
                          <p>{humanize(item.action)}</p>
                          {item.detail ? <p className="osa-muted">{item.detail}</p> : null}
                        </div>
                        <time dateTime={item.at} title={new Date(item.at).toLocaleString()}>
                          {ago(item.at, now)}
                        </time>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </div>

            <div className="osa-sheet-actions">
              {user.blocked ? (
                <Button className="osa-btn" disabled={busy} onClick={() => void run(false)}>
                  Unblock account
                </Button>
              ) : (
                <>
                  <label className="osa-label" htmlFor="osa-reason">
                    Reason (optional)
                  </label>
                  <Input
                    id="osa-reason"
                    maxLength={BLOCK_REASON_MAX}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is this account being blocked?"
                    autoComplete="off"
                  />
                  <div className="osa-presets" role="group" aria-label="Reason presets">
                    {BLOCK_REASON_PRESETS.map((preset) => (
                      <button key={preset} type="button" className="osa-chip" onClick={() => setReason(preset)}>
                        {preset}
                      </button>
                    ))}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="osa-btn osa-btn-danger" disabled={busy}>
                        Block account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="osa-surface osa-dialog">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Block {user.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This flags the account as blocked and logs the action. The block applies wherever the app
                          calls isBlocked(). You can undo it at any time.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="osa-btn osa-btn-ghost">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="osa-btn osa-btn-danger" onClick={() => void run(true)}>
                          Block account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="osa-sheet-head">
              <SheetTitle>Account</SheetTitle>
              <SheetDescription>{detail?.error ? "This account could not be loaded." : "Loading account details."}</SheetDescription>
            </SheetHeader>
            <div className="osa-sheet-body">
              {/* An account that is not in the loaded list (the list is capped) and cannot be fetched
                  must end in a message, never in a skeleton that never goes away. */}
              {detail?.error ? (
                <div className="osa-alert" role="alert">
                  <p>{detail.error}</p>
                  <Button className="osa-btn osa-btn-ghost" onClick={refresh}>
                    Try again
                  </Button>
                </div>
              ) : (
                <Skeleton className="osa-skel osa-tl-skel" />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
