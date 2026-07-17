"use client";

/**
 * Features page — /features
 *
 * Assumptions (adjust if they don't match the repo):
 * - A shared Navbar/Footer already comes from a parent layout, so this file
 *   starts straight at the hero (extra top padding assumes a fixed navbar).
 * - shadcn `button` and `badge` are already installed. If `badge` isn't,
 *   run: npx shadcn@latest add badge
 * - CTA hrefs (/dashboard, /demo, /pricing) are guesses — point them at your
 *   real routes.
 * - This is a client component (for the tilt/reveal/terminal motion), so it
 *   can't export `metadata`. Add SEO tags via the parent layout if needed.
 */

import { useEffect, useRef, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement>;

interface ModuleData {
  id: string;
  title: string;
  path: string;
  status: "ACTIVE" | "PRO";
  accent: "lime" | "amber";
  tagline: string;
  bullets: string[];
  Icon: ComponentType<IconProps>;
}

interface PersonaData {
  id: string;
  name: string;
  role: string;
  accent: "lime" | "amber";
  description: string;
  sample: string;
}

interface ComparisonRow {
  feature: string;
  free: boolean;
  pro: boolean;
}

/* ------------------------------------------------------------------ */
/* Icons — hand-drawn inline SVG, no external icon library             */
/* ------------------------------------------------------------------ */

function IconRadar({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.4" opacity="0.3" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 12L12 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconGhost({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M4 20V11a8 8 0 0 1 16 0v9l-2.7-1.8L15 20l-2.3-1.8L10.4 20l-2.7-1.8L4 20Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPulse({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M3 12h3.2l1.6-4.5 3 9L13.5 8l1.8 4h3.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="12" r="1.1" fill="currentColor" />
    </svg>
  );
}

function IconSpark({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} {...props}>
      <path d="M12 2c.6 3.6 1.9 6 4.6 7.4-2.7 1.4-4 3.8-4.6 7.4-.6-3.6-1.9-6-4.6-7.4C10.1 8 11.4 5.6 12 2Z" />
      <path
        d="M19 14c.3 1.6.9 2.6 2 3.2-1.1.6-1.7 1.6-2 3.2-.3-1.6-.9-2.6-2-3.2 1.1-.6 1.7-1.6 2-3.2Z"
        opacity="0.7"
      />
    </svg>
  );
}

function IconTrendingArrow({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M3.5 16.5 9 11l3.5 3.5L20.5 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 6h5.5v5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlug({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M9 3v4M15 3v4M7 7h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 15v3M9.5 21h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLock({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCheck({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M4.5 12.5 9.5 17.5 19.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMinus({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconArrowUpRight({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <path
        d="M7 17 17 7M9 7h8v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Motion hooks                                                        */
/* ------------------------------------------------------------------ */

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}

function useHoverCapability() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
  }, []);

  return canHover;
}

function useReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, threshold]);

  return { ref, visible };
}

function useTilt<T extends HTMLElement>(maxDeg = 6) {
  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();
  const canHover = useHoverCapability();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !canHover) return;

    let frame = 0;

    function handleMove(e: MouseEvent) {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (py - 0.5) * -2 * maxDeg;
      const ry = (px - 0.5) * 2 * maxDeg;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
    }

    function handleLeave() {
      cancelAnimationFrame(frame);
      el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    }

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      cancelAnimationFrame(frame);
    };
  }, [reduced, canHover, maxDeg]);

  return ref;
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data                                                                 */
/* ------------------------------------------------------------------ */

const BOOT_LINES = [
  "$ oshunt modules --list",
  "[ok]   gitlense.mod            active",
  "[ok]   profile-optimizer.mod   active",
  "[ok]   repo-explorer.mod       active",
  "[ok]   github-sync.mod         active",
  "[pro]  bounty-radar.mod        locked",
  "[pro]  ghost-town.mod          locked",
  "— 6 modules found, ready to scan.",
];

const MODULES: ModuleData[] = [
  {
    id: "bounty-radar",
    title: "Bounty Hunter Radar",
    path: "modules/bounty-radar.mod",
    status: "PRO",
    accent: "amber",
    tagline: "Finds paid issues before the crowd does.",
    bullets: [
      "Continuously scans GitHub for issues with bounties attached",
      "Filters by language, stack, and payout size",
      "Ranks results by payout against likely competition",
    ],
    Icon: IconRadar,
  },
  {
    id: "ghost-town",
    title: "Ghost Town Detector",
    path: "modules/ghost-town.mod",
    status: "PRO",
    accent: "amber",
    tagline: "Surfaces maintained repos nobody else is farming.",
    bullets: [
      "Surfaces maintained repos with open issues and few contributors",
      "Scores how likely a PR is to actually get merged",
      "Flags maintainers who reply and merge quickly",
    ],
    Icon: IconGhost,
  },
  {
    id: "gitlense",
    title: "GitLense Analyzer",
    path: "modules/gitlense.mod",
    status: "ACTIVE",
    accent: "lime",
    tagline: "Repo health, scored before you spend an hour on it.",
    bullets: [
      "Scores commit velocity, issue turnaround, and maintainer activity",
      "One health score instead of ten tabs of digging",
      "Results are cached and refresh automatically",
    ],
    Icon: IconPulse,
  },
  {
    id: "profile-optimizer",
    title: "AI Profile Optimizer",
    path: "modules/profile-optimizer.mod",
    status: "ACTIVE",
    accent: "lime",
    tagline: "Turns your GitHub into a profile recruiters read.",
    bullets: [
      "Reviews your pinned repos, README, and contribution graph",
      "Gives specific, concrete edit suggestions — not generic tips",
      "Shows a clear profile-strength score you can act on",
    ],
    Icon: IconSpark,
  },
  {
    id: "repo-explorer",
    title: "Repo Explainer & Trending",
    path: "modules/repo-explorer.mod",
    status: "ACTIVE",
    accent: "lime",
    tagline: "Understand any repo before you read a line of it.",
    bullets: [
      "Plain-English breakdown of what a repo does and how it's built",
      "Trending repos filtered to match your actual stack",
      "AI-generated primers instead of cold source-diving",
    ],
    Icon: IconTrendingArrow,
  },
  {
    id: "github-sync",
    title: "GitHub Sync",
    path: "modules/github-sync.mod",
    status: "ACTIVE",
    accent: "lime",
    tagline: "Your account, your rate limit, one click.",
    bullets: [
      "One-click GitHub OAuth, nothing to configure",
      "Your own API rate limit instead of a shared pool",
      "Disconnect any time, no strings attached",
    ],
    Icon: IconPlug,
  },
];

const PERSONAS: PersonaData[] = [
  {
    id: "god-mode",
    name: "God Mode",
    role: "Senior Enterprise Architect",
    accent: "lime",
    description:
      "Reviews a repo like a principal engineer would — where the real risk is, and whether a contribution actually moves the needle.",
    sample: '$ oshunt ask god-mode "is this repo worth my time?"',
  },
  {
    id: "bounty-strategist",
    name: "Bounty Strategist",
    role: "ROI Evaluator",
    accent: "amber",
    description:
      "Weighs payout against effort and competition, then tells you which bounty on your list is actually worth chasing.",
    sample: '$ oshunt ask bounty-strategist "rank my shortlist"',
  },
];

const COMPARISON: ComparisonRow[] = [
  { feature: "GitHub OAuth sync", free: true, pro: true },
  { feature: "GitLense repo health scoring", free: true, pro: true },
  { feature: "AI Profile Optimizer", free: true, pro: true },
  { feature: "Repo Explainer & Trending", free: true, pro: true },
  { feature: "God Mode & Bounty Strategist personas", free: true, pro: true },
  { feature: "Bounty Hunter Radar", free: false, pro: true },
  { feature: "Ghost Town Detector", free: false, pro: true },
];

/* ------------------------------------------------------------------ */
/* Sections                                                             */
/* ------------------------------------------------------------------ */

function HeroSection() {
  const reduced = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (reduced) {
      setRevealed(BOOT_LINES.length);
      return;
    }
    if (revealed >= BOOT_LINES.length) return;
    const t = setTimeout(() => setRevealed((n) => n + 1), 160);
    return () => clearTimeout(t);
  }, [revealed, reduced]);

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-28 sm:pb-28 sm:pt-32 lg:pb-32 lg:pt-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #a8ff3e 1px, transparent 1px), linear-gradient(to bottom, #a8ff3e 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "#a8ff3e" }}
      />

      <div className="relative mx-auto max-w-5xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-white/50">
          <span className="h-1.5 w-1.5 rounded-full bg-[#a8ff3e]" />
          feature manifest
        </span>

        <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
          Six modules.
          <br />
          <span className="text-[#a8ff3e]">One scan.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base text-white/60 sm:text-lg">
          OSHunt runs a suite of modules against GitHub so you don&apos;t have to —
          finding paid work, quiet repos, and the exact next contribution worth
          your time.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full bg-[#a8ff3e] text-black hover:bg-[#bfff70] sm:w-auto">
            <Link href="/dashboard">
              Connect GitHub
              <IconArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full border-white/15 bg-transparent text-white hover:bg-white/5 sm:w-auto"
          >
            <Link href="/demo">Watch a live scan</Link>
          </Button>
        </div>
      </div>

      <div className="relative mx-auto mt-14 max-w-2xl">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
            <span className="ml-2 font-mono text-[11px] text-white/30">oshunt — zsh</span>
          </div>
          <div className="overflow-x-auto px-5 py-5 font-mono text-[12.5px] leading-6 sm:text-[13px]">
            {BOOT_LINES.slice(0, revealed).map((line, i) => (
              <div
                key={i}
                className={cn(
                  "whitespace-pre text-white/70",
                  i === 0 && "text-white",
                  line.startsWith("[pro]") && "text-amber-300/80",
                  line.startsWith("[ok]") && "text-white/55",
                  i === BOOT_LINES.length - 1 && "mt-1 text-[#a8ff3e]/90"
                )}
              >
                {line}
              </div>
            ))}
            {revealed >= BOOT_LINES.length && (
              <span className="mt-1 inline-block h-4 w-2 animate-pulse bg-[#a8ff3e] align-middle" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModuleCard({ mod, index }: { mod: ModuleData; index: number }) {
  const tiltRef = useTilt<HTMLDivElement>(5);
  const { ref: revealRef, visible } = useReveal<HTMLDivElement>();
  const Icon = mod.Icon;
  const accentColor = mod.accent === "amber" ? "#fbbf24" : "#a8ff3e";

  return (
    <div
      ref={revealRef}
      className={cn(
        "h-full transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={{ transitionDelay: visible ? `${index * 90}ms` : "0ms" }}
    >
      <div
        ref={tiltRef}
        className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition-colors duration-300 will-change-transform hover:border-white/20"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(360px circle at 50% 0%, ${accentColor}14, transparent 70%)`,
          }}
        />

        <div className="relative flex items-start justify-between gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10"
            style={{ color: accentColor, backgroundColor: `${accentColor}14` }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 border-white/15 font-mono text-[10px] uppercase tracking-wider",
              mod.status === "PRO" ? "text-amber-300" : "text-white/50"
            )}
          >
            {mod.status === "PRO" && <IconLock className="h-2.5 w-2.5" />}
            {mod.status}
          </Badge>
        </div>

        <p className="relative mt-4 font-mono text-[11px] text-white/30">{mod.path}</p>
        <h3 className="relative mt-1.5 text-lg font-semibold text-white">{mod.title}</h3>
        <p className="relative mt-1.5 text-sm text-white/55">{mod.tagline}</p>

        <ul className="relative mt-4 space-y-2 border-t border-white/10 pt-4">
          {mod.bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-white/65">
              <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: accentColor }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ModuleGridSection() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="mb-12 max-w-xl">
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">module registry</span>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Everything OSHunt runs, one card each.
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonasSection() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <div className="mb-10 max-w-xl">
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">terminal personas</span>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Ask the terminal, not the docs.</h2>
            <p className="mt-3 text-white/55">
              Two AI personas live inside the OSHunt terminal — each one answers a different question about where to
              spend your next hour.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {PERSONAS.map((p, i) => (
            <Reveal key={p.id} delay={i * 120}>
              <div
                className="h-full rounded-2xl border p-6 sm:p-7"
                style={{
                  borderColor: p.accent === "amber" ? "rgba(251,191,36,0.25)" : "rgba(168,255,62,0.25)",
                  background:
                    p.accent === "amber"
                      ? "linear-gradient(180deg, rgba(251,191,36,0.06), transparent 60%)"
                      : "linear-gradient(180deg, rgba(168,255,62,0.06), transparent 60%)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: p.accent === "amber" ? "#fbbf24" : "#a8ff3e" }}
                  >
                    {p.name}
                  </h3>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-white/40">{p.role}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{p.description}</p>
                <div className="mt-5 overflow-x-auto rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                  <code className="whitespace-pre font-mono text-[12px] text-white/50">{p.sample}</code>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="font-mono text-[11px] uppercase tracking-widest text-white/40">free vs pro</span>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
              Two modules gated. Everything else is yours.
            </h2>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-4 text-sm font-medium text-white/60">Module</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-white/60">Free</th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-[#a8ff3e]">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 1 ? "bg-white/[0.015]" : undefined}>
                    <td className="px-6 py-4 text-sm text-white/80">{row.feature}</td>
                    <td className="px-6 py-4 text-center">
                      {row.free ? (
                        <IconCheck className="mx-auto h-4 w-4 text-white/50" />
                      ) : (
                        <IconMinus className="mx-auto h-4 w-4 text-white/20" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.pro ? (
                        <IconCheck className="mx-auto h-4 w-4 text-[#a8ff3e]" />
                      ) : (
                        <IconMinus className="mx-auto h-4 w-4 text-white/20" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {COMPARISON.map((row) => (
              <div
                key={row.feature}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5"
              >
                <span className="pr-3 text-sm text-white/80">{row.feature}</span>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/30">Free</span>
                    {row.free ? (
                      <IconCheck className="h-4 w-4 text-white/50" />
                    ) : (
                      <IconMinus className="h-4 w-4 text-white/20" />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[#a8ff3e]/70">Pro</span>
                    {row.pro ? (
                      <IconCheck className="h-4 w-4 text-[#a8ff3e]" />
                    ) : (
                      <IconMinus className="h-4 w-4 text-white/20" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <Reveal>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center sm:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-[100px]"
            style={{ background: "#a8ff3e" }}
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Run your first scan today.</h2>
            <p className="mx-auto mt-3 max-w-md text-white/60">
              Connect GitHub, and OSHunt starts looking for your next contribution immediately — free tier included.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full bg-[#a8ff3e] text-black hover:bg-[#bfff70] sm:w-auto">
                <Link href="/dashboard">
                  Connect GitHub
                  <IconArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="w-full text-white hover:bg-white/5 sm:w-auto">
                <Link href="/pricing">Compare plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <HeroSection />
      <ModuleGridSection />
      <PersonasSection />
      <ComparisonSection />
      <CTASection />
    </main>
  );
}