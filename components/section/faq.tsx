'use client';

import { useState, useMemo, useEffect } from 'react';
import Navbar from '@/components/ui/HomeNav';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  X,
  LayoutGrid,
  Info,
  Rocket,
  Target,
  CreditCard,
  ShieldCheck,
  LifeBuoy,
  Link2,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'general', label: 'General', icon: Info },
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'ai-matching', label: 'AI Matching', icon: Target },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { id: 'support', label: 'Support', icon: LifeBuoy },
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

const CATEGORY_COUNTS: Record<string, number> = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat.id === 'all' ? FAQS.length : FAQS.filter((f) => f.category === cat.id).length;
  return acc;
}, {} as Record<string, number>);

// ────────────────────────────────────────────────────────────────────────────
// Search-match highlighting — ties the FAQ page back to the product's own
// "AI matching" pitch: show exactly why a result surfaced, not just that it did.
// ────────────────────────────────────────────────────────────────────────────

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="rounded-[3px] bg-[#a8ff3e]/25 px-0.5 text-[#a8ff3e]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function CopyLinkButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={copy}
      title="Copy link to this question"
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] transition-colors',
        copied
          ? 'border-[#a8ff3e]/40 text-[#a8ff3e]'
          : 'border-white/10 text-white/40 hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]'
      )}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Link2 className="h-3 w-3" /> Copy link
        </>
      )}
    </button>
  );
}

export default function FAQPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesQuery = q === '' || (item.q + item.a).toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  // Deep-link support: /faq#some-id opens and scrolls to that question on load.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && FAQS.some((f) => f.id === hash)) {
      setOpenIds(new Set([hash]));
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, []);

  // While actively searching, auto-open items that matched only through their
  // answer text — otherwise there's no way to see why they showed up at all.
  // Runs once per query change (not on every render), so the user can still
  // freely collapse any of these afterward without it springing back open.
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    setOpenIds((prev) => {
      const auto = filtered.filter(
        (item) => !item.q.toLowerCase().includes(q) && item.a.toLowerCase().includes(q)
      );
      if (auto.length === 0) return prev;
      const next = new Set(prev);
      auto.forEach((item) => next.add(item.id));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const statusText = query.trim()
    ? `grep -i "${query.trim()}" → ${filtered.length} match${filtered.length === 1 ? '' : 'es'}`
    : activeCategory !== 'all'
    ? `${filtered.length} question${filtered.length === 1 ? '' : 's'} in ${
        CATEGORIES.find((c) => c.id === activeCategory)?.label
      }`
    : `${FAQS.length} questions indexed`;

  const showReset = query.trim() !== '' || activeCategory !== 'all';

  return (
    <main className="min-h-screen bg-[#090909] text-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* hero */}
        <div className="relative overflow-hidden text-center mb-10 sm:mb-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
              WebkitMaskImage: 'radial-gradient(circle at center, black 25%, transparent 72%)',
              maskImage: 'radial-gradient(circle at center, black 25%, transparent 72%)',
            }}
          />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-3 py-1 text-[11px] sm:text-xs font-semibold tracking-wide text-[#a8ff3e] mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a8ff3e]" />
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
        </div>

        {/* search */}
        <div className="relative mb-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="h-auto w-full rounded-xl border-white/10 bg-white/[0.04] pl-11 pr-10 py-3 text-sm sm:text-base text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 focus-visible:border-[#a8ff3e]/40"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mb-8 sm:mb-10 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-white/30">
          <span>{statusText}</span>
          {showReset && (
            <button
              onClick={() => {
                setQuery('');
                setActiveCategory('all');
              }}
              className="text-[#a8ff3e]/70 underline underline-offset-2 hover:text-[#a8ff3e]"
            >
              reset
            </button>
          )}
        </div>

        {/* category pills */}
        <div className="scroll-row flex gap-2 overflow-x-auto pb-2 mb-8 sm:mb-10 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50',
                  active
                    ? 'bg-[#a8ff3e] text-[#090909]'
                    : 'border border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px] font-semibold',
                    active ? 'bg-black/15' : 'bg-white/10 text-white/40'
                  )}
                >
                  {CATEGORY_COUNTS[cat.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* faq list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-8 w-8 text-white/15" />
            <p className="text-white/40 text-sm">
              No questions match &quot;{query}&quot;. Try a different search.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuery('')}
              className="border-white/10 bg-transparent text-white/60 hover:bg-white/5 hover:text-white"
            >
              Clear search
            </Button>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={Array.from(openIds)}
            onValueChange={(vals) => setOpenIds(new Set(vals))}
            className="space-y-3"
          >
            {filtered.map((item, i) => (
              <AccordionItem
                key={item.id}
                id={item.id}
                value={item.id}
                className="animate-in fade-in slide-in-from-bottom-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] scroll-mt-20 transition-colors hover:border-white/20 data-[state=open]:border-[#a8ff3e]/25"
                style={{ animationDelay: `${Math.min(i * 25, 200)}ms`, animationDuration: '300ms' }}
              >
                <AccordionTrigger className="px-4 sm:px-5 py-4 text-left hover:no-underline [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-[#a8ff3e]">
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-sm sm:text-base font-medium text-white/90">
                      <Highlight text={item.q} query={query} />
                    </span>
                    {activeCategory === 'all' && (
                      <Badge
                        variant="outline"
                        className="hidden sm:inline-flex shrink-0 border-white/10 bg-white/5 text-[10px] font-medium text-white/40"
                      >
                        {CATEGORIES.find((c) => c.id === item.category)?.label}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 sm:px-5 pb-4 text-sm sm:text-base text-white/50 leading-relaxed">
                  <p>
                    <Highlight text={item.a} query={query} />
                  </p>
                  <div className="mt-3 flex justify-end">
                    <CopyLinkButton id={item.id} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* footer cta */}
        <div className="mt-12 sm:mt-16 text-center border border-white/10 rounded-2xl px-6 py-8 bg-white/2">
          <p className="text-sm sm:text-base text-white/60 mb-4">Still stuck on something?</p>
          <Button
            asChild
            className="rounded-full bg-[#a8ff3e] text-[#090909] hover:bg-[#bdff66] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
          >
            <a href="/support" className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium">
              <LifeBuoy className="h-4 w-4" />
              Contact support
            </a>
          </Button>
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