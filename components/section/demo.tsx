'use client';

import { useState } from 'react';

const STACKS = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Ruby', 'C++'];

const ISSUE_POOL = [
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

export default function DemoPage() {
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | scanning | done
  const [results, setResults] = useState([]);

  function toggleStack(lang) {
    setSelected((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
    setStatus('idle');
  }

  function runDemo() {
    if (selected.length === 0) return;
    setStatus('scanning');

    setTimeout(() => {
      const langSet = new Set(selected);
      const scored = ISSUE_POOL.map((issue) => {
        const overlap = issue.langs.filter((l) => langSet.has(l)).length;
        const score = overlap === 0 ? null : Math.min(97, 60 + overlap * 14 + issue.bonus);
        return { ...issue, score };
      });
      const matched = scored
        .filter((i) => i.score !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      setResults(matched);
      setStatus('done');
    }, 900);
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-2xl mx-auto">
        {/* hero */}
        <div className="text-center mb-10 sm:mb-12">
          <span className="inline-block text-xs sm:text-sm font-medium tracking-wide text-[#a8ff3e] mb-3">
            LIVE DEMO
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            See your matches before you sign in
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/50 max-w-md mx-auto">
            Pick the languages you write, and the matching engine ranks real open issues against
            them — no GitHub connection required for this preview.
          </p>
        </div>

        {/* stack picker */}
        <div className="border border-white/10 rounded-2xl bg-white/[0.02] p-5 sm:p-6 mb-6">
          <p className="text-xs sm:text-sm font-medium text-white/60 mb-3">Select your stack</p>
          <div className="flex flex-wrap gap-2 mb-5">
            {STACKS.map((lang) => {
              const isActive = selected.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => toggleStack(lang)}
                  className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 ${
                    isActive
                      ? 'bg-[#a8ff3e] text-[#090909]'
                      : 'border border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
          <button
            onClick={runDemo}
            disabled={selected.length === 0 || status === 'scanning'}
            className="w-full rounded-xl bg-[#a8ff3e] text-[#090909] text-sm sm:text-base font-medium py-3 transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#bdff66] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
          >
            {status === 'scanning' ? 'Scanning repositories...' : 'Find my matches'}
          </button>
        </div>

        {/* scanning skeleton */}
        {status === 'scanning' && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl border border-white/10 bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* results */}
        {status === 'done' && results.length > 0 && (
          <div className="space-y-2">
            {results.map((item) => (
              <div
                key={item.repo + item.title}
                className="border border-white/10 rounded-xl px-4 sm:px-5 py-4 bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-sm sm:text-base font-medium text-white/90">{item.title}</p>
                    <p className="text-xs sm:text-sm text-white/40 mt-0.5">
                      {item.repo} · {item.difficulty}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs sm:text-sm font-medium text-[#a8ff3e]">
                    {item.score}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#a8ff3e]"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {status === 'done' && results.length === 0 && (
          <div className="text-center py-10 text-white/40 text-sm">
            No live matches for that combination yet — try adding another language.
          </div>
        )}

        {/* cta */}
        <div className="mt-12 sm:mt-14 text-center border border-white/10 rounded-2xl px-6 py-8 bg-white/[0.02]">
          <p className="text-sm sm:text-base text-white/60 mb-4">
            This is a sample of what real matching looks like. Connect GitHub to get ranked
            against your actual profile.
          </p>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#a8ff3e] text-[#090909] text-sm font-medium hover:bg-[#bdff66] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
          >
            Connect GitHub
          </a>
        </div>
      </div>
    </main>
  );
}