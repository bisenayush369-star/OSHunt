"use client";
import "./admin.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, MotionConfig, useReducedMotion } from "framer-motion";
import { Ban, ExternalLink, Eye, EyeOff, LayoutDashboard, LogOut, Search, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { AnimatedNumber, EASE, UsagePanel, spot } from "@/components/admin/charts";

type Range = "1d" | "7d" | "30d" | "6m";
type User = { id: string; name: string; email: string; githubLogin?: string; joinedAt: string; lastSeen: string; actions: number; blocked: boolean; blockReason?: string };
type Act = { id: string; action: string; detail?: string; at: string };
type Gh =
  | { error: string }
  | { login: string; avatar: string; url: string; followers: number; repos: number; createdAt: string; events: { id: string; type: string; repo?: string; at: string }[] }
  | null;
type Stats = { demo?: boolean; updatedAt?: number; buckets: { t: number; signups: number; activity: number }[]; totals: { users: number; blocked: number; active: number; signups: number; activity: number } };

const RANGES: { key: Range; label: string; long: string }[] = [
  { key: "1d", label: "24h", long: "24 hours" },
  { key: "7d", label: "7d", long: "7 days" },
  { key: "30d", label: "30d", long: "30 days" },
  { key: "6m", label: "6m", long: "6 months" },
];
const NAV: { key: "overview" | "users"; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users },
];

const ago = (iso: string) => {
  const m = Math.max(0, (Date.now() - Date.parse(iso)) / 6e4);
  return m < 1 ? "just now" : m < 60 ? `${Math.round(m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};
const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const words = (s: string) => s.replace(/_/g, " ");

function Face({ u, size = 36 }: { u: User; size?: number }) {
  return (
    <Avatar className="adm-av pii" style={{ width: size, height: size }}>
      {u.githubLogin && <AvatarImage src={`https://github.com/${u.githubLogin}.png?size=${size * 2}`} alt="" />}
      <AvatarFallback className="adm-fb">{u.name[0]?.toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

function Segmented({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <div className="adm-seg" role="tablist" aria-label="Time range">
      {RANGES.map((r) => (
        <button key={r.key} role="tab" aria-selected={r.key === value} data-on={r.key === value} onClick={() => onChange(r.key)}>
          {r.key === value && <motion.span layoutId="adm-seg" className="adm-seg-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
          <span>{r.label}</span>
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, i, sp }: { label: string; value?: number; sub: string; i: number; sp: ReturnType<typeof spot> }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: i * 0.07 }}>
      <Card className="adm-card adm-spot adm-stat" {...sp}>
        <span className="adm-mono-label">{label}</span>
        {value === undefined ? <Skeleton className="adm-skel adm-skel-num" /> : <b><AnimatedNumber value={value} /></b>}
        <small>{sub}</small>
      </Card>
    </motion.div>
  );
}

export default function AdminHome() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const sp = spot(reduce);
  const [view, setView] = useState<"overview" | "users">("overview");
  const [range, setRange] = useState<Range>("7d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<User | null>(null);
  const [acts, setActs] = useState<Act[]>([]);
  const [gh, setGh] = useState<Gh>(null);
  const [reason, setReason] = useState("");
  const [mask, setMask] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const api = useCallback(async (url: string, init?: RequestInit) => {
    const r = await fetch(url, { cache: "no-store", ...init });
    if (!r.ok) {
      router.replace("/");
      return null;
    }
    return r.json();
  }, [router]);

  useEffect(() => {
    api("/api/admin/users").then((d) => {
      if (d) setUsers(d.users);
      setLoaded(true);
    });
  }, [api]);

  useEffect(() => {
    api(`/api/admin/stats?range=${range}`).then((d) => d && setStats(d));
  }, [api, range]);

  const open = async (u: User) => {
    setSel(u);
    setReason("");
    setActs([]);
    setGh(null);
    const d = await api(`/api/admin/users?id=${encodeURIComponent(u.id)}`);
    if (d) {
      setActs(d.activity);
      setGh(d.github);
    }
  };

  const setBlocked = async (blocked: boolean) => {
    if (!sel) return;
    const d = await api("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: sel.id, blocked, reason }),
    });
    if (!d) return;
    setUsers((cur) => cur.map((u) => (u.id === sel.id ? { ...u, ...d.user } : u)));
    await open({ ...sel, ...d.user });
    api(`/api/admin/stats?range=${range}`).then((s) => s && setStats(s));
  };

  const signOut = async () => {
    await fetch("/api/admin/gate", { method: "DELETE" });
    router.replace("/");
  };

  const cur = RANGES.find((r) => r.key === range)!;
  const t = stats?.totals;
  const labels = useMemo(
    () => (stats?.buckets ?? []).map((b) => new Date(b.t).toLocaleString("en-US", range === "1d" ? { hour: "numeric" } : { month: "short", day: "numeric" })),
    [stats, range]
  );
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return users.filter((u) => !s || `${u.name} ${u.email} ${u.githubLogin ?? ""}`.toLowerCase().includes(s));
  }, [users, q]);

  const rawSnapshot = useMemo(() => ({
    range,
    generatedAt: stats?.updatedAt ?? Date.now(),
    totals: t ?? null,
    users: users.slice(0, 10).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      githubLogin: u.githubLogin ?? null,
      joinedAt: u.joinedAt,
      lastSeen: u.lastSeen,
      blocked: u.blocked,
      actions: u.actions,
    })),
    selectedUser: sel ? {
      id: sel.id,
      name: sel.name,
      email: sel.email,
      githubLogin: sel.githubLogin ?? null,
      blocked: sel.blocked,
      blockReason: sel.blockReason ?? null,
      activity: acts.slice(0, 10),
      github: gh,
    } : null,
  }), [acts, gh, range, sel, stats?.updatedAt, t, users]);

  return (
    <MotionConfig reducedMotion="user">
      <main className={`adm-scope adm adm-app${mask ? " mask" : ""}`}>
        <div className="adm-bg" aria-hidden />

        <aside className="adm-nav">
          <div className="adm-brand"><Image src="/white.png" alt="" width={32} height={32} className="adm-logo-img" /><span>OSHunt</span><Badge className="adm-admin">ADMIN</Badge></div>
          <nav className="adm-navgroup" aria-label="Admin">
            {NAV.map(({ key, label, icon: Icon }) => (
              <button key={key} className="adm-navbtn" data-on={view === key} aria-current={view === key ? "page" : undefined} onClick={() => setView(key)}>
                <Icon size={18} /><span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="adm-navgroup adm-nav-foot">
            <button className="adm-navbtn" aria-pressed={mask} onClick={() => setMask(!mask)}>
              {mask ? <EyeOff size={18} /> : <Eye size={18} />}<span>{mask ? "Privacy on" : "Privacy off"}</span>
            </button>
            <button className="adm-navbtn" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button>
          </div>
        </aside>

        <section className="adm-main">
          {view === "overview" ? (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <div className="adm-hero">
                <div>
                  <span className="adm-label lime">Overview</span>
                  <h1>OSHunt hits <em><AnimatedNumber value={t?.users} /></em> users</h1>
                  <div className="adm-pills">
                    <span className="adm-pill"><i className="adm-pdot" />{stats?.demo ? "Demo data" : stats?.updatedAt ? `Updated ${ago(new Date(stats.updatedAt).toISOString())}` : "Loading"}</span>
                    <span className="adm-pill"><b>+{t?.signups ?? 0}</b> joined in {cur.long}</span>
                    <span className="adm-pill"><b>{t?.active ?? 0}</b> active</span>
                  </div>
                </div>
                <Segmented value={range} onChange={setRange} />
              </div>

              <div className="adm-cards">
                <Stat i={0} sp={sp} label="Total users" value={t?.users} sub={`+${t?.signups ?? 0} in ${cur.label}`} />
                <Stat i={1} sp={sp} label="Active users" value={t?.active} sub={`seen in ${cur.label}`} />
                <Stat i={2} sp={sp} label="Activity" value={t?.activity} sub={`actions in ${cur.label}`} />
                <Stat i={3} sp={sp} label="Blocked" value={t?.blocked} sub={t ? `${((t.blocked / Math.max(1, t.users)) * 100).toFixed(1)}% of users` : ""} />
              </div>

              <div className="adm-charts">
                {([
                  { key: "signups", title: "signups", sub: "new users", color: "#a8ff3e", dashed: false },
                  { key: "activity", title: "activity", sub: "actions", color: "#efefef", dashed: true },
                ] as const).map((c, i) => (
                  <motion.div key={c.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.3 + i * 0.1 }}>
                    <UsagePanel title={c.title} sub={c.sub} color={c.color} dashed={c.dashed} range={range} ranges={RANGES} onRange={setRange}
                      data={(stats?.buckets ?? []).map((b, k) => ({ label: labels[k], value: b[c.key] }))} />
                  </motion.div>
                ))}
              </div>

              <div className="adm-raw-block">
                <div className="adm-raw-header">
                  <div>
                    <span className="adm-mono-label">Raw data</span>
                    <h2>Admin payload snapshot</h2>
                  </div>
                  <button type="button" className="adm-raw-toggle" onClick={() => setShowRaw((v) => !v)}>
                    {showRaw ? "Hide payload" : "Show payload"}
                  </button>
                </div>
                {showRaw && <pre className="adm-raw-json">{JSON.stringify(rawSnapshot, null, 2)}</pre>}
              </div>
            </motion.div>
          ) : (
            <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
              <div className="adm-hero">
                <div><span className="adm-label lime">Users</span><h1><em>{shown.length}</em> accounts</h1></div>
                <div className="adm-search">
                  <Search size={16} />
                  <Input className="adm-input" aria-label="Search users" placeholder="Search name, email or GitHub" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>

              <Card className="adm-card adm-tablecard">
                <div className="adm-desktop">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Account</TableHead><TableHead>GitHub</TableHead><TableHead>Joined</TableHead><TableHead>Last seen</TableHead><TableHead>Actions</TableHead><TableHead>Status</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {!loaded && Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={6}><Skeleton className="adm-skel" style={{ height: 36 }} /></TableCell></TableRow>
                      ))}
                      {loaded && shown.map((u) => (
                        <TableRow key={u.id} className="adm-row" tabIndex={0} onClick={() => open(u)} onKeyDown={(e) => e.key === "Enter" && open(u)}>
                          <TableCell><div className="adm-acct"><Face u={u} /><div><span className="pii">{u.name}</span><small className="pii">{u.email}</small></div></div></TableCell>
                          <TableCell className="pii mono">{u.githubLogin ? `@${u.githubLogin}` : "—"}</TableCell>
                          <TableCell>{day(u.joinedAt)}</TableCell>
                          <TableCell>{ago(u.lastSeen)}</TableCell>
                          <TableCell className="tnum">{u.actions}</TableCell>
                          <TableCell><Badge className={u.blocked ? "adm-badge red" : "adm-badge"}>{u.blocked ? "Blocked" : "Active"}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="adm-list">
                  {loaded && shown.map((u) => (
                    <li key={u.id}>
                      <button onClick={() => open(u)}>
                        <Face u={u} size={40} />
                        <div className="adm-li-main"><span className="pii">{u.name}</span><small className="pii">{u.githubLogin ? `@${u.githubLogin}` : u.email}</small></div>
                        <div className="adm-li-meta"><Badge className={u.blocked ? "adm-badge red" : "adm-badge"}>{u.blocked ? "Blocked" : "Active"}</Badge><small>{ago(u.lastSeen)}</small></div>
                      </button>
                    </li>
                  ))}
                </ul>
                {loaded && !shown.length && <p className="adm-empty">No accounts match this search.</p>}
              </Card>
            </motion.div>
          )}
        </section>

        <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
          <SheetContent side="right" className={`adm-scope adm-sheet${mask ? " mask" : ""}`}>
            {sel && (
              <>
                <SheetHeader>
                  <div className="adm-who">
                    <Face u={sel} size={52} />
                    <div><SheetTitle className="pii">{sel.name}</SheetTitle><SheetDescription className="pii">{sel.email}</SheetDescription></div>
                  </div>
                </SheetHeader>
                <div className="adm-sheet-body">
                  {sel.blocked && <p className="adm-err">Blocked{sel.blockReason ? `: ${sel.blockReason}` : ""}</p>}

                  <span className="adm-mono-label">GitHub</span>
                  {!sel.githubLogin ? <p className="adm-muted">No GitHub account linked.</p>
                    : !gh ? <Skeleton className="adm-skel" style={{ height: 92 }} />
                    : "error" in gh ? <p className="adm-muted">{gh.error}</p>
                    : (
                      <>
                        <div className="adm-gh">
                          <a className="pii" href={gh.url} target="_blank" rel="noopener noreferrer">@{gh.login} <ExternalLink size={13} /></a>
                          <div className="adm-ghstats"><span><b>{gh.followers}</b> followers</span><span><b>{gh.repos}</b> repos</span><span>joined {day(gh.createdAt)}</span></div>
                        </div>
                        <ul className="adm-feed">
                          {gh.events.map((e) => <li key={e.id}><div className="l"><b>{e.type}</b><small>{e.repo}</small></div><time>{ago(e.at)}</time></li>)}
                          {!gh.events.length && <li className="adm-muted">No public activity.</li>}
                        </ul>
                      </>
                    )}

                  <span className="adm-mono-label">On OSHunt</span>
                  <ul className="adm-feed">
                    {acts.map((a) => <li key={a.id}><div className="l"><b>{words(a.action)}</b>{a.detail && <small>{a.detail}</small>}</div><time>{ago(a.at)}</time></li>)}
                    {!acts.length && <li className="adm-muted">No activity recorded yet.</li>}
                  </ul>

                  {sel.blocked ? (
                    <Button className="adm-btn" onClick={() => setBlocked(false)}><ShieldCheck size={16} /> Unblock account</Button>
                  ) : (
                    <>
                      <Input className="adm-input plain" aria-label="Reason" placeholder="Reason (optional)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="outline" className="adm-btn-danger"><Ban size={16} /> Block account</Button></AlertDialogTrigger>
                        <AlertDialogContent className="adm-scope adm-alert">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Block this account?</AlertDialogTitle>
                            <AlertDialogDescription>It is flagged as blocked and the action is logged. The block only takes effect once your login check calls isBlocked.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="adm-btn-ghost">Cancel</AlertDialogCancel>
                            <AlertDialogAction className="adm-btn-danger solid" onClick={() => setBlocked(true)}>Block</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </main>
    </MotionConfig>
  );
}
