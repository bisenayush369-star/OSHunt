"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { signIn } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// ─── Icons — matching your existing hand-rolled convention in this file ────
const GitMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>);
const TerminalMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>);
const SendMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>);
const SpinnerMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={cn("animate-spin", className)} fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>);
const FolderMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /></svg>);
const BugMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="7" y="8" width="10" height="10" rx="4" /><path d="M12 8V5M9 5h6M4.5 11h2.5M17 11h2.5M4.5 16h2.5M17 16h2.5M9 21l1-3M15 21l-1-3" /></svg>);
const PulseMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>);
const ClockMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>);
const UserMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>);
const ChevronMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>);
const TargetMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></svg>);
const WrenchMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.8 2.8-2-2z" /></svg>);
const CheckMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
const AlertMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 9v4M12 17h.01M10.3 3.86 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0Z" /></svg>);

// ─── Motion helpers — same pattern used on your analyze/trending pages ─────
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -40px 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) { setInView(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.unobserve(el); } },
      { threshold: 0.1, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}
function FadeInView({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={cn("transition-all duration-500 ease-out motion-reduce:transition-none", inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0", className)}
    >
      {children}
    </div>
  );
}
function useAnimatedNumber(target: number, duration = 1100, active = true) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) { setDisplay(target); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setDisplay(Math.round((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return display;
}
function CountUp({ value }: { value: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px");
  const display = useAnimatedNumber(value, 900, inView);
  return <span ref={ref}>{display}</span>;
}
function Skeleton({ w, h }: { w: string | number; h: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-md bg-white/[0.04] motion-reduce:after:hidden after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent"
      style={{ width: w, height: h }}
    />
  );
}

// ─── Score ring — animated circular progress for the overall /1000 score ───
function ScoreRing({ score, max = 1000, size = 116 }: { score: number; max?: number; size?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>("0px");
  const animated = useAnimatedNumber(score, 1300, inView);
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, animated / max));
  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="#a8ff3e" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white">{animated}</span>
        <span className="text-[10px] text-white/40">/ {max}</span>
      </div>
    </div>
  );
}

function CategoryCard({ category, delay }: { category: CategoryScore; delay: number }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round((category.score / 125) * 100);
  return (
    <FadeInView delay={delay}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.015]">
        <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white/90">{category.name}</span>
              <span className="shrink-0 font-mono text-xs text-[#a8ff3e]">{category.score}/125</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-[#a8ff3e] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <ChevronMark className={cn("h-3.5 w-3.5 shrink-0 text-white/30 transition-transform duration-300", open && "rotate-180")} />
        </button>
        <div className={cn("grid transition-all duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="space-y-2.5 px-4 pb-4">
              <p className="text-[11.5px] leading-relaxed text-white/50">{category.why}</p>
              {category.howToImprove && (
                <div className="flex items-start gap-2 rounded-lg border border-[#a8ff3e]/15 bg-[#a8ff3e]/[0.04] p-2.5">
                  <span className="mt-0.5 shrink-0 text-[#a8ff3e]">→</span>
                  <p className="text-[11.5px] leading-relaxed text-white/75">{category.howToImprove}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FadeInView>
  );
}

function RoadmapCard({ roadmap, delay }: { roadmap: WeeklyRoadmap; delay: number }) {
  const [checked, setChecked] = useState<boolean[]>(() => roadmap.tasks.map(() => false));
  return (
    <FadeInView delay={delay}>
      <div className="rounded-xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.03] p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">{roadmap.weekLabel} roadmap</h4>
          <div className="flex gap-2">
            {roadmap.estimatedScoreGain > 0 && (
              <Badge variant="outline" className="border-[#a8ff3e]/30 bg-[#a8ff3e]/10 font-mono text-[10px] text-[#a8ff3e]">
                +{roadmap.estimatedScoreGain} pts
              </Badge>
            )}
            {roadmap.estimatedTime && (
              <Badge variant="outline" className="border-white/10 bg-white/5 font-mono text-[10px] text-white/50">
                {roadmap.estimatedTime}
              </Badge>
            )}
          </div>
        </div>
        <p className="mb-4 text-[11px] text-white/35">Checks are local to this session — nothing's saved yet.</p>
        <div className="space-y-2.5">
          {roadmap.tasks.map((task, i) => (
            <label key={i} className="group flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={checked[i] || false}
                onChange={() => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[#a8ff3e]"
              />
              <span className={cn("text-xs leading-relaxed transition-colors", checked[i] ? "text-white/30 line-through" : "text-white/75 group-hover:text-white")}>
                {task}
              </span>
            </label>
          ))}
        </div>
      </div>
    </FadeInView>
  );
}

function RepoAuditCard({
  repo,
  audit,
  loading,
  error,
  onRun,
  delay,
  detail,
  detailLoading,
  detailError,
  detailOpen,
  onToggleDetail,
}: {
  repo: TopRepo;
  audit?: RepoAudit;
  loading?: boolean;
  error?: string;
  onRun: () => void;
  delay: number;
  detail?: RepoDetail;
  detailLoading?: boolean;
  detailError?: string;
  detailOpen?: boolean;
  onToggleDetail: () => void;
}) {
  const pct = audit && audit.maxScore ? Math.round((audit.qualityScore / audit.maxScore) * 100) : 0;
  const missing = audit?.items?.filter((i) => !i.present) ?? [];

  return (
    <FadeInView delay={delay}>
      <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <a href={`https://github.com/${repo.fullName}`} target="_blank" rel="noreferrer" className="min-w-0 truncate font-mono text-xs font-semibold text-white hover:text-[#a8ff3e]">
            {repo.fullName}
          </a>
          {audit && <span className="shrink-0 font-mono text-xs text-[#a8ff3e]">{audit.qualityScore}/{audit.maxScore}</span>}
        </div>

        {!audit && !loading && !error && (
          <Button onClick={onRun} className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white">
            Audit this repo
          </Button>
        )}

        {loading && (
          <div className="space-y-2">
            <Skeleton w="100%" h={10} />
            <Skeleton w="70%" h={10} />
          </div>
        )}

        {error && !loading && (
          <button onClick={onRun} className="w-full rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-left text-[11px] text-red-300 hover:bg-red-500/10">
            {error} — tap to retry
          </button>
        )}

        {audit && !loading && (
          <div className="space-y-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-[#a8ff3e] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            {missing.length === 0 ? (
              <p className="flex items-center gap-1.5 text-[11.5px] text-white/50">
                <CheckMark className="h-3 w-3 text-[#a8ff3e]" /> Nothing missing from this check.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <a
                    key={item.key}
                    href={item.fixUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[11px] text-amber-200/80 transition-colors hover:border-[#a8ff3e]/30 hover:bg-[#a8ff3e]/10 hover:text-[#a8ff3e]"
                  >
                    <AlertMark className="h-3 w-3" />
                    Missing {item.label}
                    <WrenchMark className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            )}
            <p className="text-[10.5px] text-white/30">Tap a missing item to fix it directly on GitHub.</p>
          </div>
        )}

        {/* Repository detail — real languages/README/commits/contributors,
            fetched on demand when opened, not eagerly for every card. */}
        <button
          onClick={onToggleDetail}
          className="mt-3 flex w-full items-center justify-between border-t border-white/5 pt-3 text-left text-[11px] font-medium text-white/40 hover:text-white/70"
        >
          Explore repository
          <ChevronMark className={cn("h-3 w-3 transition-transform duration-300", detailOpen && "rotate-180")} />
        </button>

        {detailOpen && (
          <div className="mt-3 space-y-4">
            {detailLoading && (
              <div className="space-y-2">
                <Skeleton w="100%" h={10} />
                <Skeleton w="90%" h={10} />
                <Skeleton w="60%" h={10} />
              </div>
            )}

            {detailError && !detailLoading && (
              <button onClick={onToggleDetail} className="w-full rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-left text-[11px] text-red-300 hover:bg-red-500/10">
                {detailError} — tap to retry
              </button>
            )}

            {detail && !detailLoading && (
              <>
                {detail.languages.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Languages</p>
                    {detail.languages.map((lang) => (
                      <div key={lang.name} className="flex items-center gap-2">
                        <span className="w-16 shrink-0 truncate text-[10.5px] text-white/60">{lang.name}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${lang.percentage}%`, backgroundColor: languageColor(lang.name) }}
                          />
                        </div>
                        <span className="w-9 shrink-0 text-right font-mono text-[10px] text-white/35">{lang.percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">README</p>
                  {detail.readme ? (
                    <div className="prose-chat relative max-h-28 overflow-hidden rounded-lg border border-white/5 bg-black/20 p-3">
                      <ReactMarkdown>{detail.readme.slice(0, 500)}</ReactMarkdown>
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#0d0d0d]" />
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/30">No README found in the default branch root.</p>
                  )}
                  <a href={`https://github.com/${repo.fullName}#readme`} target="_blank" rel="noreferrer" className="inline-block text-[10.5px] text-[#a8ff3e] hover:underline">
                    View full README on GitHub →
                  </a>
                </div>

                {detail.commits.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Latest commits</p>
                    {detail.commits.map((c) => (
                      <a key={c.sha} href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/[0.03]">
                        <span className="shrink-0 font-mono text-[10px] text-white/30">{c.sha}</span>
                        <span className="min-w-0 flex-1 truncate text-[11px] text-white/65">{c.message}</span>
                      </a>
                    ))}
                  </div>
                )}

                {detail.contributors.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Contributors</p>
                    <div className="flex -space-x-2">
                      {detail.contributors.map((c) => (
                        <a key={c.login} href={c.url} target="_blank" rel="noreferrer" title={`${c.login} · ${c.contributions} commits`}>
                          <img
                            src={c.avatarUrl}
                            alt={c.login}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                            className="h-7 w-7 rounded-full border-2 border-[#0d0d0d] object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </FadeInView>
  );
}

type GitHubClusterSectionProps = {
  username?: string;
  connected?: boolean;
  plan?: string;
  avatarUrl?: string;
  stats?: { reposScanned?: number; matches?: number };
};

interface CategoryScore {
  name: string;
  score: number;
  why: string;
  howToImprove: string;
}
interface WeeklyRoadmap {
  weekLabel: string;
  tasks: string[];
  estimatedScoreGain: number;
  estimatedTime: string;
}
interface ProfileScoreResult {
  overallScore: number;
  categories: CategoryScore[];
  roadmap: WeeklyRoadmap;
}
interface TopRepo {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch?: string;
  hasDescription: boolean;
  hasLicense: boolean;
  hasHomepage: boolean;
  hasTopics: boolean;
  stars: number;
}
interface RepoAuditItem {
  key: string;
  label: string;
  present: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  points: number;
  fixUrl: string;
}
interface RepoAudit {
  qualityScore: number;
  maxScore: number;
  items: RepoAuditItem[];
}
interface LanguageBreakdown {
  name: string;
  bytes: number;
  percentage: number;
}
interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}
interface ContributorSummary {
  login: string;
  avatarUrl: string;
  contributions: number;
  url: string;
}
interface RepoDetail {
  languages: LanguageBreakdown[];
  readme: string | null;
  commits: CommitSummary[];
  contributors: ContributorSummary[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "#F7DF1E", TypeScript: "#3178C6", Python: "#3776AB", Go: "#00ADD8",
  Rust: "#CE422B", Java: "#ED8B00", Ruby: "#CC342D", PHP: "#777BB4",
  CSS: "#663399", HTML: "#E34C26", Shell: "#89E051", "C++": "#00599C",
};
function languageColor(name: string): string {
  return LANGUAGE_COLORS[name] || "#6b7280";
}

export default function GitHubClusterSection({
  username = "torvalds",
  connected = false,
  plan = "free",
  avatarUrl,
  stats,
}: GitHubClusterSectionProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "career" | "audit">("overview");
  const [, startTabTransition] = useTransition();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ totalRepos: 0, activeBugs: 0, gitVelocity: "Loading...", lastContributionTime: "Fetching..." });
  const [timeline, setTimeline] = useState<any[]>([]);
  const [rawContext, setRawContext] = useState<any>(null);
  const [avatarError, setAvatarError] = useState(false);

  const [auditResults, setAuditResults] = useState<Record<string, RepoAudit>>({});
  const [auditLoading, setAuditLoading] = useState<Record<string, boolean>>({});
  const [auditErrors, setAuditErrors] = useState<Record<string, string>>({});

  const [detailResults, setDetailResults] = useState<Record<string, RepoDetail>>({});
  const [detailLoading, setDetailLoading] = useState<Record<string, boolean>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [detailOpen, setDetailOpen] = useState<Record<string, boolean>>({});


  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scoreResult, setScoreResult] = useState<ProfileScoreResult | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Disconnected users can have `username` fall back to a display name that
  // was never a real GitHub handle — route them to the public demo account
  // instead of attempting (and failing) a live fetch with a bad username.
  const effectiveUsername = connected ? username : "torvalds";

  const fetchRawGitHubData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cluster?username=${effectiveUsername}`);
      if (!res.ok) throw new Error("Failed to pull live GitHub API telemetry.");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMetrics(data.metrics);
      setTimeline(data.timeline);
      setRawContext(data.rawContext);
      setMessages([
        { id: "m1", sender: "bot", text: `Connected to @${data.rawContext.username}. Found ${data.metrics.totalRepos} repos utilizing ${data.rawContext.topLanguages.join(", ")}. Ready to score your profile whenever you are.`, time: "Just now" }
      ]);
    } catch (err: any) {
      setError(err.message || "Network error fetching GitHub API.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchRawGitHubData(); }, [effectiveUsername]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isBotTyping]);

  const triggerScore = async () => {
    if (!rawContext) return;
    setIsAnalyzing(true);
    setScoreResult(null);
    setScoreError(null);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContext, promptType: "diagnostic" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Scoring failed.");
      setScoreResult(data.result);
    } catch (err: any) {
      setScoreError(err.message || "Failed to score your profile. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // On-demand, one repo at a time — same "don't fire work nobody asked for"
  // principle as the trending page's blurb generation. Deterministic, no LLM
  // call: quality score is arithmetic on real file/metadata presence, not a
  // guessed number.
  const runAudit = async (repo: TopRepo) => {
    setAuditLoading((s) => ({ ...s, [repo.fullName]: true }));
    setAuditErrors((s) => ({ ...s, [repo.fullName]: "" }));
    try {
      const res = await fetch(`/api/repo-audit?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}&branch=${encodeURIComponent(repo.defaultBranch || "main")}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Audit failed.");
      setAuditResults((s) => ({ ...s, [repo.fullName]: data.result }));
    } catch (err: any) {
      setAuditErrors((s) => ({ ...s, [repo.fullName]: err.message || "Couldn't audit this repo." }));
    } finally {
      setAuditLoading((s) => ({ ...s, [repo.fullName]: false }));
    }
  };

  // Toggles the detail panel open/closed; only actually fetches the first
  // time it's opened for a given repo, then reuses the cached result.
  const toggleDetail = async (repo: TopRepo) => {
    const alreadyOpen = detailOpen[repo.fullName];
    setDetailOpen((s) => ({ ...s, [repo.fullName]: !alreadyOpen }));
    if (alreadyOpen || detailResults[repo.fullName] || detailLoading[repo.fullName]) return;

    setDetailLoading((s) => ({ ...s, [repo.fullName]: true }));
    setDetailErrors((s) => ({ ...s, [repo.fullName]: "" }));
    try {
      const res = await fetch(`/api/repo-detail?owner=${encodeURIComponent(repo.owner)}&repo=${encodeURIComponent(repo.name)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Couldn't load repository detail.");
      setDetailResults((s) => ({ ...s, [repo.fullName]: data.result }));
    } catch (err: any) {
      setDetailErrors((s) => ({ ...s, [repo.fullName]: err.message || "Couldn't load repository detail." }));
    } finally {
      setDetailLoading((s) => ({ ...s, [repo.fullName]: false }));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !rawContext) return;
    const userText = inputValue;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: userText, time: "Just now" }]);
    setInputValue("");
    setIsBotTyping(true);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContext, promptType: "question", userQuestion: userText }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: data.result || data.error || "No response.", time: "Just now" }]);
    } catch {
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: "Error communicating with AI mentor.", time: "Just now" }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const STAT_CARDS = [
    { label: "Total Repositories", icon: FolderMark, value: metrics.totalRepos, kind: "count" as const },
    { label: "Open Repo Issues", icon: BugMark, value: metrics.activeBugs, kind: "count" as const, warn: metrics.activeBugs > 0 },
    { label: "Recent Velocity", icon: PulseMark, value: metrics.gitVelocity, kind: "text" as const },
    { label: "Last Activity", icon: ClockMark, value: metrics.lastContributionTime, kind: "text" as const, accent: true },
  ];

  return (
    <section
      className="w-full px-4 py-12 sm:px-6 sm:py-16 text-white bg-[#090909]"
      style={{ fontFamily: '"Outfit", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-5xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 border-b border-white/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl && !avatarError ? (
              <img
                src={avatarUrl}
                alt={username}
                onError={() => setAvatarError(true)}
                className="h-12 w-12 shrink-0 rounded-full border-2 border-[#a8ff3e]/30 object-cover sm:h-14 sm:w-14"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-white/[0.03] text-white/30 sm:h-14 sm:w-14">
                <UserMark className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-[#a8ff3e] font-mono text-[11px]">
                  LIVE REST API PIPELINE
                </Badge>
                <span className="inline-flex items-center gap-1.5 text-xs text-white/40 font-mono">
                  <span className={cn("h-2 w-2 rounded-full", isLoading ? "bg-amber-400 animate-ping" : "bg-[#a8ff3e] animate-pulse")} />
                  {isLoading ? "Scraping GitHub Servers..." : `Connected: @${rawContext?.username || effectiveUsername}`}
                </span>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-white/40 font-mono">
                <span>{connected ? "GitHub linked" : "GitHub disconnected"}</span>
                <span className="text-white/40">•</span>
                <span>{plan.toUpperCase()} PLAN</span>
              </div>
              <h2 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
                Open Source Career Hub
              </h2>
            </div>
          </div>

          <Button
            onClick={fetchRawGitHubData}
            disabled={isLoading}
            className="w-full shrink-0 rounded-lg border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-white transition-all hover:bg-white/10 sm:w-auto"
          >
            {isLoading ? <SpinnerMark className="mr-2 h-4 w-4" /> : "Force Live Scan ↻"}
          </Button>
        </div>

        {!connected && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GitMark className="mt-0.5 h-4 w-4 shrink-0 text-[#a8ff3e]" />
              <p className="text-xs leading-relaxed text-white/70">
                You're viewing a live demo using <span className="font-mono text-[#a8ff3e]">@{effectiveUsername}</span>'s public data. Connect your own GitHub to score your real profile here.
              </p>
            </div>
            <Button
              onClick={() => signIn("github")}
              className="shrink-0 rounded-lg bg-[#a8ff3e] px-4 py-2 text-xs font-semibold text-black hover:bg-[#a8ff3e]/90"
            >
              Connect GitHub
            </Button>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300">
            [API ERROR]: {error} Make sure the username is valid or your GitHub token is set.
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1 font-mono">
          <button
            onClick={() => startTabTransition(() => setActiveTab("overview"))}
            className={cn("shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all", activeTab === "overview" ? "border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-[#a8ff3e]" : "text-white/50 hover:text-white/80")}
          >
            Live Activity
          </button>
          <button
            onClick={() => startTabTransition(() => setActiveTab("career"))}
            className={cn("shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all", activeTab === "career" ? "border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-[#a8ff3e]" : "text-white/50 hover:text-white/80")}
          >
            My Score
          </button>
          <button
            onClick={() => startTabTransition(() => setActiveTab("audit"))}
            className={cn("shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all", activeTab === "audit" ? "border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-[#a8ff3e]" : "text-white/50 hover:text-white/80")}
          >
            Repo Audit
          </button>
        </div>

        {/* Tab 1: Live Activity */}
        {activeTab === "overview" && (
          <div className={cn("space-y-6 transition-opacity", isLoading && "opacity-40")}>
            <div className="grid grid-cols-2 gap-3 font-mono sm:grid-cols-4 sm:gap-4">
              {STAT_CARDS.map((card, i) => (
                <FadeInView key={card.label} delay={i * 60}>
                  <Card className={cn("flex h-full flex-col justify-between border-white/10 bg-white/[0.01] p-4 transition-colors hover:border-white/20", card.accent && "border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.02]")}>
                    <div className="flex items-center justify-between">
                      <span className={cn("text-xs uppercase tracking-wider", card.accent ? "text-[#a8ff3e]/70" : "text-white/40")}>{card.label}</span>
                      <card.icon className={cn("h-3.5 w-3.5", card.accent ? "text-[#a8ff3e]/60" : "text-white/25")} />
                    </div>
                    {card.kind === "count" ? (
                      <span className={cn("mt-2 text-3xl font-bold", card.warn ? "text-amber-400" : "text-white")}>
                        {isLoading || error ? "—" : <CountUp value={card.value as number} />}
                      </span>
                    ) : (
                      <span className="mt-2 block truncate text-lg font-bold text-white">{error ? "—" : (card.value as string)}</span>
                    )}
                  </Card>
                </FadeInView>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-white/60">
                <TerminalMark className="h-4 w-4 text-[#a8ff3e]" />
                Live Public GitHub Timeline (Raw /events API)
              </h3>
              <div className="space-y-2.5">
                {timeline.length === 0 ? (
                  <div className="rounded-xl border border-white/5 p-8 text-center font-mono text-xs text-white/40">
                    {error ? "Couldn't load timeline data." : "No recent public events found on GitHub servers."}
                  </div>
                ) : (
                  timeline.map((step, i) => (
                    <FadeInView key={step.id} delay={i * 40}>
                      <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 transition-colors hover:border-white/10">
                        <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", step.type === "pr" ? "bg-[#a8ff3e]" : step.type === "commit" ? "bg-blue-400" : "bg-amber-400")} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white/90">
                            {step.action} <span className="font-mono text-xs text-white/35">// {step.target}</span>
                          </p>
                          <span className="mt-1 block font-mono text-[11px] text-white/40">{step.timestamp}</span>
                        </div>
                      </div>
                    </FadeInView>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Score (Profile Score + Weekly Roadmap) */}
        {activeTab === "career" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              {!scoreResult && !isAnalyzing && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 text-center">
                  <TargetMark className="mx-auto mb-3 h-8 w-8 text-[#a8ff3e]/60" />
                  <h3 className="mb-1.5 text-sm font-bold text-white">Score your profile</h3>
                  <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-white/45">
                    Scores 8 real categories out of 1000 using your actual repo and activity data, then gives you one week's worth of concrete next steps.
                  </p>
                  <Button
                    onClick={triggerScore}
                    disabled={!rawContext}
                    className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-[#a8ff3e] px-6 py-2.5 text-xs font-semibold text-black hover:bg-[#a8ff3e]/90"
                  >
                    Score My Profile ⚡
                  </Button>
                </div>
              )}

              {isAnalyzing && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6">
                  <div className="mb-5 flex items-center justify-center">
                    <SpinnerMark className="h-6 w-6 text-[#a8ff3e]" />
                  </div>
                  <div className="space-y-2.5">
                    <Skeleton w="100%" h={12} />
                    <Skeleton w="85%" h={12} />
                    <Skeleton w="92%" h={12} />
                    <Skeleton w="70%" h={12} />
                  </div>
                </div>
              )}

              {scoreError && !isAnalyzing && (
                <button onClick={triggerScore} className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left text-xs font-medium text-red-300 hover:bg-red-500/10">
                  {scoreError} — tap to retry
                </button>
              )}

              {scoreResult && !isAnalyzing && (
                <div className="space-y-5">
                  <FadeInView>
                    <div className="flex items-center gap-5 rounded-2xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.04] p-5">
                      <ScoreRing score={scoreResult.overallScore} />
                      <div className="min-w-0">
                        <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">Overall Score</p>
                        <p className="text-sm leading-snug text-white/80">
                          Based on {scoreResult.categories.length} real signals from your public activity — expand any category below for exactly why, and what to do about it.
                        </p>
                      </div>
                    </div>
                  </FadeInView>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {scoreResult.categories.map((cat, i) => (
                      <CategoryCard key={cat.name} category={cat} delay={80 + i * 50} />
                    ))}
                  </div>

                  <RoadmapCard roadmap={scoreResult.roadmap} delay={80 + scoreResult.categories.length * 50 + 80} />

                  <button onClick={triggerScore} className="text-xs font-medium text-white/40 hover:text-white/70">
                    Re-score profile
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="flex h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] sm:h-[480px]">
                <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3 font-mono">
                  <span className="flex items-center gap-2 text-xs font-bold tracking-wide">
                    <span className="h-2 w-2 rounded-full bg-[#a8ff3e]" />
                    AI MENTOR // Context: @{effectiveUsername}
                  </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-black/10 p-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex max-w-[85%] flex-col rounded-xl px-3.5 py-2.5 text-xs leading-relaxed", msg.sender === "user" ? "ml-auto border border-white/10 bg-white/5 font-mono text-white" : "mr-auto border border-white/5 bg-[#121212] text-white/90")}>
                      {msg.sender === "bot" ? (
                        <div className="prose-chat"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      )}
                    </div>
                  ))}
                  {isBotTyping && <div className="p-2 font-mono text-xs text-white/40">Thinking it through...</div>}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/5 bg-black/50 p-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Which repo should I contribute to next?"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs text-white focus:border-[#a8ff3e]/40 focus:outline-none"
                  />
                  <Button type="submit" disabled={!inputValue.trim() || isBotTyping} className="shrink-0 rounded-lg bg-[#a8ff3e] p-2 text-black hover:bg-[#a8ff3e]/90">
                    <SendMark className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Repo Audit */}
        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.01] p-4">
              <p className="text-xs leading-relaxed text-white/50">
                Deterministic check against your top repos — no AI guessing involved. Each item below is either present or it isn't; the score is arithmetic, not an estimate.
              </p>
            </div>

            {!rawContext?.topRepos || rawContext.topRepos.length === 0 ? (
              <div className="rounded-xl border border-white/5 p-8 text-center font-mono text-xs text-white/40">
                {isLoading ? "Loading repositories..." : "No repositories found to audit."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rawContext.topRepos.map((repo: TopRepo, i: number) => (
                  <RepoAuditCard
                    key={repo.fullName}
                    repo={repo}
                    audit={auditResults[repo.fullName]}
                    loading={auditLoading[repo.fullName]}
                    error={auditErrors[repo.fullName]}
                    onRun={() => runAudit(repo)}
                    delay={i * 60}
                    detail={detailResults[repo.fullName]}
                    detailLoading={detailLoading[repo.fullName]}
                    detailError={detailErrors[repo.fullName]}
                    detailOpen={detailOpen[repo.fullName]}
                    onToggleDetail={() => toggleDetail(repo)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <style>{`
        .prose-chat p { margin: 0 0 0.5em; }
        .prose-chat p:last-child { margin-bottom: 0; }
        .prose-chat ul, .prose-chat ol { margin: 0.3em 0 0.5em; padding-left: 1.1em; }
        .prose-chat li { margin-bottom: 0.2em; }
        .prose-chat strong { color: white; font-weight: 600; }
        .prose-chat code { background: rgba(255,255,255,0.08); padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.95em; }
      `}</style>
    </section>
  );
}