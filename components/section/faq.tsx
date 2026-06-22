'use client';

import { useState, useMemo } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'general', label: 'General' },
  { id: 'getting-started', label: 'Getting Started' },
  { id: 'ai-matching', label: 'AI Matching' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'support', label: 'Support' },
];

const FAQS = [
  {
    id: 'what-is-oshunt',
    category: 'general',
    q: 'What is OSHunt?',
    a: "OSHunt is an AI-powered tool that matches you with open source issues based on your actual skill set — not just tags and labels. Instead of scrolling through hundreds of \"good first issue\" threads, you tell OSHunt your stack and it surfaces issues you're actually equipped to solve.",
  },
  {
    id: 'who-is-it-for',
    category: 'general',
    q: 'Who is OSHunt built for?',
    a: 'Anyone who wants real, verifiable open source experience — students building a portfolio, self-taught developers proving their skills, or experienced engineers looking to contribute somewhere that matters. If you can write code and want it to count for something, OSHunt is for you.',
  },
  {
    id: 'never-contributed',
    category: 'general',
    q: "I've never contributed to open source before. Can I still use this?",
    a: "Yes — that's actually the main problem OSHunt solves. The AI factors in your experience level when matching issues, so first-timers get pointed toward approachable, well-scoped tickets instead of getting lost in massive codebases.",
  },
  {
    id: 'github-connect',
    category: 'getting-started',
    q: 'Do I need to connect my GitHub account?',
    a: 'Yes. OSHunt signs you in through GitHub so it can read your public repos and languages to build your stack profile. It never asks for write access and never touches your private repos.',
  },
  {
    id: 'progress-page',
    category: 'getting-started',
    q: "What's the Progress page?",
    a: "It's your contribution dashboard — a GitHub-style heatmap of your activity, a Kanban board of issues you're actively working, and milestone badges that unlock as you close out PRs.",
  },
  {
    id: 'milestone-badges',
    category: 'getting-started',
    q: 'How do milestone badges work?',
    a: 'Badges unlock automatically as you hit contribution milestones — your first merged PR, your first five issues closed, your first maintainer reply, and so on. They live on your Progress page and your public profile.',
  },
  {
    id: 'matching-algorithm',
    category: 'ai-matching',
    q: 'How does the matching algorithm actually work?',
    a: "OSHunt reads your GitHub activity to build a stack profile, then scans open issues across tracked repos and scores each one against that profile — language match, issue complexity, and how recently it's been touched. You get a ranked list, not a dump of every open issue.",
  },
  {
    id: 'no-match',
    category: 'ai-matching',
    q: "What if there's no good match for my stack?",
    a: "OSHunt is constantly indexing new repos, so coverage grows over time. If your exact stack isn't well covered yet, you'll still see the closest matches ranked by relevance, and stack coverage bars show you which languages have the most active issues right now.",
  },
  {
    id: 'multiple-repos',
    category: 'ai-matching',
    q: 'Can OSHunt match me with issues across multiple repos or orgs?',
    a: "Yes. It's not limited to one project — it pulls from a wide range of tracked repositories and organizations and ranks results across all of them together.",
  },
  {
    id: 'is-it-free',
    category: 'pricing',
    q: 'Is OSHunt free?',
    a: 'Core matching, the Progress dashboard, and badges are free. Paid plans add things like priority matching and deeper analytics — full pricing lives on the pricing page.',
  },
  {
    id: 'cancel-refund',
    category: 'pricing',
    q: 'How do I cancel or get a refund?',
    a: "You can cancel anytime from your account settings — no questions asked. For refund requests, reach out through the Support page and we'll sort it out.",
  },
  {
    id: 'store-code',
    category: 'privacy',
    q: 'Does OSHunt store my code?',
    a: 'No. OSHunt only reads metadata — your public repo languages, issue activity, and contribution history. It never clones, stores, or has access to your actual source code.',
  },
  {
    id: 'revoke-access',
    category: 'privacy',
    q: 'Can I revoke GitHub access at any time?',
    a: "Yes, anytime, directly from your GitHub settings or from inside OSHunt's account page. Revoking access immediately stops any further data reads.",
  },
  {
    id: 'learn-in-public',
    category: 'support',
    q: 'What is "Learn in Public"?',
    a: "It's a feed where you can post what you're working on, learning, or stuck on — and get visibility for the work itself, not just the merged PR at the end.",
  },
  {
    id: 'report-bug',
    category: 'support',
    q: 'I found a bug or have feedback. Who do I tell?',
    a: 'Head to the Support page and send it through there — every report gets read.',
  },
];

function ChevronIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openIds, setOpenIds] = useState(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery = q === '' || (item.q + item.a).toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  function toggle(id) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-[#090909] text-white px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto">
        {/* hero */}
        <div className="text-center mb-10 sm:mb-14">
          <span className="inline-block text-xs sm:text-sm font-medium tracking-wide text-[#a8ff3e] mb-3">
            FAQ
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
            Got questions? <br className="hidden sm:block" />
            We&apos;ve got answers.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/50 max-w-md mx-auto">
            Everything you need to know about finding your next open source contribution.
          </p>
        </div>

        {/* search */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm sm:text-base text-white placeholder:text-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 focus:border-[#a8ff3e]/40 transition-colors"
          />
        </div>

        {/* category pills */}
        <div className="scroll-row flex gap-2 overflow-x-auto pb-2 mb-8 sm:mb-10 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 ${
                activeCategory === cat.id
                  ? 'bg-[#a8ff3e] text-[#090909]'
                  : 'border border-white/10 text-white/60 hover:border-white/25 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* faq list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-white/40 text-sm">
              No questions match &quot;{query}&quot;. Try a different search.
            </div>
          ) : (
            filtered.map((item) => {
              const isOpen = openIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className="border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden"
                >
                  <button
                    onClick={() => toggle(item.id)}
                    aria-expanded={isOpen}
                    aria-controls={`panel-${item.id}`}
                    className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 rounded-xl"
                  >
                    <span className="text-sm sm:text-base font-medium text-white/90">
                      {item.q}
                    </span>
                    <ChevronIcon
                      className={`w-4 h-4 shrink-0 text-[#a8ff3e] transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    id={`panel-${item.id}`}
                    className={`grid transition-all duration-300 ease-in-out ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden px-4 sm:px-5">
                      <p className="pb-4 text-sm sm:text-base text-white/50 leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* footer cta */}
        <div className="mt-12 sm:mt-16 text-center border border-white/10 rounded-2xl px-6 py-8 bg-white/[0.02]">
          <p className="text-sm sm:text-base text-white/60 mb-4">Still stuck on something?</p>
          <a
            href="/support"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#a8ff3e] text-[#090909] text-sm font-medium hover:bg-[#bdff66] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
          >
            Contact support
          </a>
        </div>
      </div>

      <style jsx>{`
        .scroll-row::-webkit-scrollbar {
          display: none;
        }
        .scroll-row {
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}