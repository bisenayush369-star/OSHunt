'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/ui/HomeNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const STACKS = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Ruby', 'C++'];

type Issue = {
  repo: string;
  title: string;
  langs: string[];
  difficulty: string;
  bonus: number;
};

type MatchedIssue = Issue & {
  score: number;
};

const ISSUE_POOL: Issue[] = [
  { repo: 'denoland/deno', title: 'Improve error message for invalid import specifiers', langs: ['Rust', 'TypeScript'], difficulty: 'good first issue', bonus: 3 },
  { repo: 'vercel/next.js', title: 'Fix flaky test in middleware matcher', langs: ['JavaScript', 'TypeScript'], difficulty: 'good first issue', bonus: 5 },
  { repo: 'expressjs/express', title: 'Add types for custom error handlers', langs: ['JavaScript'], difficulty: 'intermediate', bonus: 2 },
  { repo: 'django/django', title: 'Update docs for async views', langs: ['Python'], difficulty: 'good first issue', bonus: 4 },
  { repo: 'pallets/flask', title: 'Add deprecation warning for old config key', langs: ['Python'], difficulty: 'intermediate', bonus: 1 },
  { repo: 'golang/go', title: 'Clarify error wrapping example in docs', langs: ['Go'], difficulty: 'good first issue', bonus: 3 },
  { repo: 'gin-gonic/gin', title: 'Add benchmark for route matching', langs: ['Go'], difficulty: 'intermediate', bonus: 0 },
  { repo: 'rust-lang/rust', title: 'Improve diagnostic for borrow checker edge case', langs: ['Rust'], difficulty: 'advanced', bonus: 2 },
  { repo: 'tokio-rs/tokio', title: 'Add test coverage for timeout edge cases', langs: ['Rust'], difficulty: 'intermediate', bonus: 4 },
  { repo: 'spring-projects/spring-boot', title: 'Fix typo in actuator endpoint docs', langs: ['Java'], difficulty: 'good first issue', bonus: 3 },
  { repo: 'elastic/elasticsearch', title: 'Add validation for negative shard count', langs: ['Java'], difficulty: 'intermediate', bonus: 1 },
  { repo: 'rails/rails', title: 'Update changelog formatting guide', langs: ['Ruby'], difficulty: 'good first issue', bonus: 5 },
  { repo: 'jekyll/jekyll', title: 'Fix broken anchor links in docs site', langs: ['Ruby'], difficulty: 'good first issue', bonus: 2 },
  { repo: 'nlohmann/json', title: 'Add example for custom serializer', langs: ['C++'], difficulty: 'intermediate', bonus: 3 },
  { repo: 'opencv/opencv', title: 'Improve build instructions for ARM', langs: ['C++'], difficulty: 'intermediate', bonus: 1 },
  { repo: 'microsoft/TypeScript', title: 'Improve error message for generic constraint mismatch', langs: ['TypeScript'], difficulty: 'advanced', bonus: 4 },
  { repo: 'nodejs/node', title: 'Add test for fs.promises edge case', langs: ['JavaScript'], difficulty: 'intermediate', bonus: 2 },
  { repo: 'fastapi/fastapi', title: 'Add example for dependency overrides', langs: ['Python'], difficulty: 'good first issue', bonus: 6 },
];

function buildScanLines(langs: string[]): string[] {
  return [
    `oshunt scan --stack=${langs.join(',')}`,
    'authenticating with github search api...',
    'indexing tracked repositories across your stack...',
    'cross-referencing open issues...',
    'scoring by skill overlap and issue freshness...',
    'ranking top matches...',
  ];
}

/* ---------------------------------------------------------------------- */
/* Small local icons — inline SVG only, matching the rest of the app      */
/* ---------------------------------------------------------------------- */

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.77.11 3.06.74.81 1.18 1.84 1.18 3.1 0 4.43-2.7 5.41-5.27 5.69.42.36.78 1.08.78 2.18 0 1.57-.02 2.84-.02 3.23 0 .3.21.66.79.55C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function SpinnerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('animate-spin', className)} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const tone =
    difficulty === 'good first issue'
      ? 'border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-[#a8ff3e]'
      : difficulty === 'advanced'
        ? 'border-white/15 bg-white/[0.06] text-white/70'
        : 'border-white/10 bg-white/[0.03] text-white/50';

  return (
    <Badge variant="outline" className={cn('px-1.5 py-0 text-[10px] font-medium normal-case', tone)}>
      {difficulty}
    </Badge>
  );
}

/* ---------------------------------------------------------------------- */
/* Page                                                                    */
/* ---------------------------------------------------------------------- */

export default function DemoPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [results, setResults] = useState<MatchedIssue[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function handleStackChange(value: string[]) {
    setSelected(value);
    setStatus('idle');
    setResults([]);
  }

  function runDemo() {
    if (selected.length === 0) return;
    setStatus('scanning');

    window.setTimeout(() => {
      const langSet = new Set(selected);
      const scored = ISSUE_POOL.map((issue) => {
        const overlap = issue.langs.filter((l) => langSet.has(l)).length;
        const score = overlap === 0 ? null : Math.min(97, 60 + overlap * 14 + issue.bonus);
        return { ...issue, score };
      });
      const matched = scored
        .filter((i): i is MatchedIssue => i.score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setResults(matched);
      setStatus('done');
    }, 1800);
  }

  const scanLines = buildScanLines(selected);

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />

      {/* self-contained keyframes, scoped so reduced-motion users just see end states */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .demo-enter { animation: demo-fade-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        }
        @keyframes demo-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes demo-blink { 50% { opacity: 0; } }
        .demo-cursor { animation: demo-blink 1s step-end infinite; }
      `}</style>

      <div className="relative mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
        {/* ambient hero glow — signature moment, kept restrained */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden">
          <div className="h-[420px] w-[620px] -translate-y-1/3 rounded-full bg-[#a8ff3e]/[0.08] blur-[100px]" />
        </div>

        {/* hero */}
        <div className="mb-10 text-center sm:mb-12">
          <span className="mb-4 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-[#a8ff3e] sm:text-sm">
            <span className="relative flex h-1.5 w-1.5">
              {!reducedMotion && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a8ff3e] opacity-75" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a8ff3e]" />
            </span>
            LIVE DEMO
          </span>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            See your matches before you sign in
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/50 sm:text-base">
            Pick the languages you write, and the matching engine ranks real open issues against
            them — no GitHub connection required for this preview.
          </p>
        </div>

        {/* stack picker */}
        <Card className="mb-6 border-white/10 bg-white/[0.02] p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-white/60 sm:text-sm">Select your stack</p>
            {selected.length > 0 && (
              <span className="text-[11px] text-white/35">{selected.length} selected</span>
            )}
          </div>

          <ToggleGroup
            type="multiple"
            value={selected}
            onValueChange={handleStackChange}
            className="mb-5 flex flex-wrap justify-start gap-2"
          >
            {STACKS.map((lang) => (
              <ToggleGroupItem
                key={lang}
                value={lang}
                className="rounded-full border border-white/10 bg-transparent px-3.5 py-2 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:bg-transparent hover:text-white focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 data-[state=on]:border-transparent data-[state=on]:bg-[#a8ff3e] data-[state=on]:text-[#090909] data-[state=on]:hover:bg-[#bdff66] sm:text-sm"
              >
                {lang}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <Button
            type="button"
            onClick={runDemo}
            disabled={selected.length === 0 || status === 'scanning'}
            className="w-full rounded-xl bg-[#a8ff3e] py-3 text-sm font-medium text-[#090909] hover:bg-[#bdff66] disabled:cursor-not-allowed disabled:opacity-30 sm:text-base"
          >
            {status === 'scanning' ? (
              <>
                <SpinnerMark className="mr-2 h-4 w-4" />
                Scanning repositories...
              </>
            ) : (
              'Find my matches'
            )}
          </Button>
        </Card>

        {/* scanning — terminal-style log, on-brand with the rest of the app's terminal components */}
        {status === 'scanning' && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-xs leading-relaxed text-white/50 sm:p-6 sm:text-sm"
          >
            {scanLines.map((line, i) => (
              <p key={line} className="demo-enter" style={{ animationDelay: `${i * 220}ms` }}>
                <span className="text-[#a8ff3e]">{i === 0 ? '$' : '>'}</span> {line}
              </p>
            ))}
            {!reducedMotion && <span className="demo-cursor mt-1 inline-block h-3.5 w-1.5 bg-[#a8ff3e]" />}
          </div>
        )}

        {/* results — ranked, so numbered markers are earning their place here */}
        {status === 'done' && results.length > 0 && (
          <div className="space-y-2">
            {results.map((item, i) => (
              <div
                key={item.repo + item.title}
                className="demo-enter flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/30 hover:shadow-[0_12px_24px_rgba(0,0,0,0.25)] sm:gap-4 sm:px-5"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-xs font-semibold text-[#a8ff3e]">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90 sm:text-base">{item.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40 sm:text-sm">
                        <span>{item.repo}</span>
                        <DifficultyBadge difficulty={item.difficulty} />
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[#a8ff3e] sm:text-sm">{item.score}%</span>
                  </div>
                  <Progress value={item.score} className="h-1.5 bg-white/[0.06] [&>div]:bg-[#a8ff3e]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'done' && results.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] py-10 text-center text-sm text-white/40">
            No matches in this preview pool for that combination — try adding another language.
          </div>
        )}

        {/* cta — references the scan the visitor just watched, not a generic pitch */}
        <Card className="mt-12 border-white/10 bg-white/[0.02] px-6 py-8 text-center sm:mt-14">
          <p className="mx-auto mb-4 max-w-sm text-sm text-white/60 sm:text-base">
            {status === 'done' && results.length > 0
              ? `That's ${results.length} matches ranked on language overlap alone. Connect GitHub and every issue gets scored against your actual repos and contribution history — not just the boxes you checked.`
              : 'This is a sample of what real matching looks like. Connect GitHub to get ranked against your actual profile.'}
          </p>
          <Button
            asChild
            className="rounded-full bg-[#a8ff3e] px-5 py-2.5 text-sm font-medium text-[#090909] hover:bg-[#bdff66]"
          >
            <Link href="/onboarding" className="inline-flex items-center gap-2">
              <GitHubMark className="h-4 w-4" />
              Connect GitHub
            </Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}