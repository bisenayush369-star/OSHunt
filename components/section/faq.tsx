'use client';

/**
 * OSHunt · FAQ — ONE self-contained file (rebuilt from zero in the look of your Hunt page)
 * Save as: app/faq/page.tsx
 *
 * Everything this page needs is in this file: the text, the page layout, the sidebar / toolbar / Sheet chrome, the
 * hooks, the typographic helpers and the scoped stylesheet (LG_CSS, bottom of the file). It imports only packages,
 * your shadcn components and your navbar.
 *
 * NEEDS (a standard shadcn + Next.js project — nothing new to install)
 *   @/components/ui/HomeNav (default export) · @/components/lib/utils (cn) · lucide-react 1.x
 *   shadcn: @/components/ui/{accordion,badge,button,input,sheet,tooltip}
 *   The Sheet slides in and the Tooltip fades with shadcn’s own animation classes (tw-animate-css or
 *   tailwindcss-animate, whichever your shadcn setup uses). framer-motion is NOT needed any more.
 *
 * EDIT HERE
 *   Questions + categories .. FAQS / CATEGORIES (section 2). Counts, search, topics and /faq#<id> links follow.
 *   Emails + routes ......... SITE / ROUTES (section 1). Assumes /contact exists (your old FAQ linked to it too).
 *   Navbar height ........... --lg-nav-h and --lg-hero-inset at the top of LG_CSS.
 *                             Fixed navbar: leave as is.  Sticky navbar: --lg-hero-inset: 0px.
 *                             Static navbar (scrolls away): set both to 0px.
 *   Sidebar width ........... --lg-side-w (300px, the same as the Hunt page’s filter rail).
 *   Text width .............. --lg-measure (34rem ≈ 70 characters a line; wider than ~75 gets tiring to read).
 *   Surfaces ................ --lg-bg / --lg-rail / --lg-raise (#090909 / #0b0b0b / #0d0d0d — the Hunt page’s own).
 *   Lime .................... --lg-accent and --lg-accent-rgb (#a8ff3e). Used only for the primary button, progress,
 *                             the step you are on, the open FAQ row and the hover glow.
 *
 * WHAT CHANGED
 *   Layout .......... an app shell like the Hunt page: a 300px sidebar (brand, the four legal pages, topics, an
 *                     “Open all answers” switch, pinned Reset / Email us) next to a sticky blurred toolbar (live
 *                     count, topic chip, search chip, Clear) and the page. Below 1024px the sidebar becomes a
 *                     shadcn Sheet: a right drawer from 640px up, a bottom sheet with a grabber on phones.
 *   Kept ............ all 15 questions and answers word for word · search with match highlight · answers that
 *                     match only in their text open by themselves · per-answer copy-link · “/” focuses the search,
 *                     Esc clears it · /faq#<id> deep links · empty state · the “Still stuck on something?” banner.
 *   New ............. topics as a vertical radio list with a sliding thumb (arrow keys work) · “Open all answers”
 *                     switch (follows the rows you open and close) · border beam on the search field while it has
 *                     focus · count in the toolbar that eases to its new value · rows as Hunt’s raised list (lime bar
 *                     and tinted tile on the open row, chevron) · “Show N in all topics” when a search is empty
 *                     inside one topic · one load sequence (pill wipe, blurred headline, rise) · reduced-motion
 *                     respected · 16px search input on phones · touch targets of 40px and up.
 *   Different ....... no framer-motion any more: motion is CSS only. The category pills became the sidebar’s
 *                     topic list; the banner is now a composer-style card.
 *   Heads-up ........ the FAQ says paid plans exist and can be cancelled in account settings, while the Refund
 *                     Policy says OSHunt is free during beta. Left as written — decide which is true.
 *
 * SEO — title + description in the server-rendered HTML
 *   A 'use client' page cannot export Next `metadata`, so the tab title is set in the browser instead.
 *   To have them in the HTML as well (search results, link previews), add app/faq/layout.tsx:
 *     import type { Metadata } from 'next';
 *     export const metadata: Metadata = {
 *       title: 'FAQ | OSHunt',
 *       description:
 *         'Answers about how OSHunt matches you with open source issues, connects ' +
 *         'to GitHub, handles your data, and more.',
 *     };
 *     export default function Layout({ children }: { children: React.ReactNode }) {
 *       return <>{children}</>;
 *     }
 *
 * RULES FOR FUTURE EDITS (Copilot: please follow these)
 *   - Keep the `lg-` class prefix and the `.lg-root` / `.lg-sheet` / `.lg-tip` scopes. No !important (the
 *     reduced-motion and print blocks are the only exceptions), no Tailwind arbitrary values — colours, spacing,
 *     radii and motion are CSS custom properties at the top of LG_CSS.
 *   - The Sheet and the Tooltip render in a portal, outside .lg-root. That is why they have their own scope
 *     (.lg-sheet, .lg-tip) and receive the font variables as classes. Do not style them from .lg-root.
 *   - shadcn parts are re-skinned from LG_CSS with 2-4 class selectors. If a utility class seems to win, raise
 *     the selector’s specificity — do not add !important.
 *   - lucide-react: canonical icon names only. v1 removed brand icons (GitHub etc.) and they break the build.
 *   - Motion is CSS only: entrances are .lg-rise / .lg-blur / .lg-wipe (fill-mode `backwards`, so hover transforms
 *     keep working). Scroll and pointer listeners only write CSS variables (--lg-read, --lg-scroll, --lg-mx,
 *     --lg-my) or data attributes — never React state per frame. Never read `window` during render (hydration).
 *   - No `overflow: hidden` on ancestors of sticky elements (the sidebar and the toolbar are sticky) — use
 *     `overflow-x: clip`.
 *   - faq.tsx, terms.tsx, privacy.tsx and refund.tsx each carry their own copy of the shared chrome / hooks /
 *     styles (one self-contained file per page, as you asked), so a change to a shared part has to be made in
 *     every one of them — search the other three for the same name.
 *   - This is a client file, so it cannot export Next `metadata`; see SEO above. The tab title is set with
 *     document.title (usePageTitle).
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode, RefObject } from 'react';
import Link from 'next/link';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import {
  ArrowUp,
  Check,
  CircleDollarSign,
  CircleHelp,
  CreditCard,
  FileText,
  Info,
  LayoutGrid,
  LifeBuoy,
  Link2,
  ListTree,
  Mail,
  Rocket,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import HomeNav from '@/components/ui/HomeNav';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/components/lib/utils';

// ════════════════════════════════════════════════════════════════════════════
// 1 · CONFIG
// Site name, emails and routes — edit here.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Site-wide constants used by this page.
 * Change a route or an email here and every link and call-to-action below follows.
 * (faq.tsx, terms.tsx, privacy.tsx and refund.tsx each carry their own copy — keep them in sync.)
 */

const SITE = {
  name: 'OSHunt',
  lastUpdated: 'September 30, 2026',
  emails: {
    hello: 'hello@oshunt.io',
    privacy: 'privacy@oshunt.io',
    legal: 'legal@oshunt.io',
  },
} as const;

/** Adjust if your folders differ (e.g. `/refund-policy` instead of `/refund`). */
const ROUTES = {
  home: '/',
  faq: '/faq',
  terms: '/terms',
  privacy: '/privacy',
  refund: '/refund',
  contact: '/contact',
} as const;

// ════════════════════════════════════════════════════════════════════════════
// 2 · DATA
// Categories and questions — edit here. Counts, search, topics and /faq#<id> deep links follow automatically.
// ════════════════════════════════════════════════════════════════════════════

type FaqCategory = { id: string; label: string; icon: LucideIcon };

type FaqItem = { id: string; category: string; q: string; a: string };

const CATEGORIES: FaqCategory[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'general', label: 'General', icon: Info },
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'ai-matching', label: 'AI Matching', icon: Target },
  { id: 'pricing', label: 'Pricing', icon: CreditCard },
  { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { id: 'support', label: 'Support', icon: LifeBuoy },
];

// Copy is unchanged from the original page.
const FAQS: FaqItem[] = [
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

const CATEGORY_COUNTS: Record<string, number> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat.id === 'all' ? FAQS.length : FAQS.filter((f) => f.category === cat.id).length;
    return acc;
  },
  {} as Record<string, number>
);

// ════════════════════════════════════════════════════════════════════════════
// 3 · PAGE
// Hero, search, topics, accordion, call-to-action.
// ════════════════════════════════════════════════════════════════════════════

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/* ── search-match highlighting: show exactly why a result surfaced ── */

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'ig'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="lg-hit">
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
  const [copied, copy] = useCopy();
  return (
    <>
      <button
        type="button"
        className="lg-action"
        data-copied={copied ? 'true' : undefined}
        onClick={() => {
          void copy(`${window.location.origin}${window.location.pathname}#${id}`);
        }}
      >
        {copied ? (
          <>
            <Check aria-hidden="true" /> Copied
          </>
        ) : (
          <>
            <Link2 aria-hidden="true" /> Copy link
          </>
        )}
        <span className="lg-sr-only"> to this question</span>
      </button>
      <span className="lg-sr-only" role="status">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </>
  );
}

/* ── sidebar controls ── */

/** Radio list with a sliding thumb (the Hunt page's segmented control, stacked). Arrow keys move the choice. */
function TopicList({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, CATEGORIES.findIndex((c) => c.id === value));

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
    const next = (index + dir + CATEGORIES.length) % CATEGORIES.length;
    onChange(CATEGORIES[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Filter questions by topic"
      className="lg-topics"
      style={{ '--i': index } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      <span className="lg-topics-thumb" aria-hidden="true" />
      {CATEGORIES.map((cat, i) => {
        const Icon = cat.icon;
        const active = cat.id === value;
        return (
          <button
            key={cat.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className="lg-topic"
            onClick={() => onChange(cat.id)}
          >
            <Icon aria-hidden="true" />
            <span className="lg-topic-label">{cat.label}</span>
            <span className="lg-topic-count">{CATEGORY_COUNTS[cat.id]}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One accessible on/off row (role=switch): label and hint on the left, a switch on the right. */
function ToggleRow({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="lg-toggles">
      <button type="button" role="switch" aria-checked={checked} className="lg-toggle" onClick={() => onChange(!checked)}>
        <span className="lg-toggle-text">
          <span className="lg-toggle-label">{label}</span>
          <span className="lg-toggle-hint">{description}</span>
        </span>
        <span className="lg-switch" aria-hidden="true">
          <span />
        </span>
      </button>
    </div>
  );
}

/** The count in the toolbar: eases to its new value, and a hidden live region says it for screen readers. */
function ResultCount({ n }: { n: number }) {
  const shown = useCountUp(n);
  return (
    <span className="lg-count-line">
      <span aria-hidden="true">
        <b>{shown}</b> {n === 1 ? 'question' : 'questions'}
      </span>
      <span role="status" className="lg-sr-only">
        {n} {n === 1 ? 'question' : 'questions'} found
      </span>
    </span>
  );
}

/* ── the page ── */

export default function FaqPage() {
  usePageTitle(`FAQ | ${SITE.name}`);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [openIds, setOpenIds] = useState<string[]>([]);
  // Answers opened by the search itself (as opposed to by the reader),
  // so clearing the search can close exactly those again.
  const autoOpened = useRef<Set<string>>(new Set());

  const q = query.trim();
  const qLower = q.toLowerCase();
  const activeCategory = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];
  const TopicIcon = activeCategory.icon;

  const filtered = useMemo(
    () =>
      FAQS.filter((item) => {
        const inCategory = category === 'all' || item.category === category;
        const inQuery = qLower === '' || `${item.q} ${item.a}`.toLowerCase().includes(qLower);
        return inCategory && inQuery;
      }),
    [category, qLower]
  );
  // Matches in the other topics, for the empty state ("Show 2 in all topics").
  const elsewhere = useMemo(
    () => (category === 'all' || !qLower ? 0 : FAQS.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(qLower)).length),
    [category, qLower]
  );

  // Typing on a phone opens the keyboard over the list, so when the reader starts searching or filtering,
  // bring the field up under the toolbar and the results come into view with it.
  function revealResults() {
    const field = fieldRef.current;
    const bar = document.querySelector<HTMLElement>('.lg-bar');
    if (!field || !bar) return;
    const delta = field.getBoundingClientRect().top - (bar.getBoundingClientRect().bottom + 12);
    if (delta > 8) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollBy({ top: delta, behavior: smooth ? 'smooth' : 'auto' });
    }
  }

  function handleQuery(value: string) {
    if (!q && value.trim()) revealResults();
    const next = value.trim().toLowerCase();
    const open = new Set(openIds);
    autoOpened.current.forEach((id) => open.delete(id));
    const auto = new Set<string>();
    if (next) {
      for (const item of FAQS) {
        const inQuestion = item.q.toLowerCase().includes(next);
        const inAnswer = item.a.toLowerCase().includes(next);
        // The match lives in the answer only — open it so the highlight is visible.
        if (!inQuestion && inAnswer && !open.has(item.id)) {
          open.add(item.id);
          auto.add(item.id);
        }
      }
    }
    autoOpened.current = auto;
    setQuery(value);
    setOpenIds(Array.from(open));
  }

  function handleOpenChange(values: string[]) {
    autoOpened.current.forEach((id) => {
      if (!values.includes(id)) autoOpened.current.delete(id);
    });
    setOpenIds(values);
  }

  const allOpen = filtered.length > 0 && filtered.every((item) => openIds.includes(item.id));

  function setAll(on: boolean) {
    const visible = new Set(filtered.map((item) => item.id));
    autoOpened.current = new Set();
    setOpenIds((prev) => (on ? Array.from(new Set([...prev, ...visible])) : prev.filter((id) => !visible.has(id))));
  }

  function reset() {
    handleQuery('');
    setCategory('all');
  }

  function onSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape' && query) {
      e.preventDefault();
      handleQuery('');
    }
  }

  // "/" focuses the search, like the docs sites people already know.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Deep links: /faq#github-connect opens that answer and scrolls to it.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !FAQS.some((f) => f.id === id)) return;
      setCategory('all');
      setQuery('');
      setOpenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
      }, 220);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, []);

  const count = filtered.length;
  const filtersOn = category !== 'all';
  const showReset = q !== '' || filtersOn;

  return (
    <LegalShell
      page="faq"
      brand={{ title: 'FAQ', sub: 'Quick answers about how OSHunt works.' }}
      menu={{
        label: 'Topics',
        title: 'Topics',
        description: 'Choose a topic to filter the questions, or open every answer at once.',
        icon: SlidersHorizontal,
        badge: filtersOn ? (
          <>
            <span className="lg-count" aria-hidden="true">
              1
            </span>
            <span className="lg-sr-only">, 1 active</span>
          </>
        ) : undefined,
      }}
      panel={() => (
        <>
          <div className="lg-group">
            <Caption aside={<span className="lg-count">{CATEGORIES.length}</span>}>Topics</Caption>
            <TopicList
              value={category}
              onChange={(id) => {
                setCategory(id);
                if (id !== 'all') revealResults();
              }}
            />
          </div>
          <div className="lg-group">
            <Caption>View</Caption>
            <ToggleRow
              checked={allOpen}
              onChange={setAll}
              label="Open all answers"
              description="Expand every answer on the page"
            />
          </div>
        </>
      )}
      footer={() => (
        <>
          <Button type="button" variant="outline" className="lg-btn lg-btn-line" onClick={reset} disabled={!showReset}>
            <RotateCcw aria-hidden="true" />
            Reset
          </Button>
          <Button asChild className="lg-btn lg-btn-lime">
            <a href={`mailto:${SITE.emails.hello}`}>
              <Mail aria-hidden="true" />
              Email us
            </a>
          </Button>
        </>
      )}
      strip={
        <div className="lg-chips" role="group" aria-label="Search summary">
          <ResultCount n={count} />
          <span className="lg-chips-sep" aria-hidden="true" />
          <Badge variant="outline" className="lg-chip">
            <TopicIcon aria-hidden="true" />
            {filtersOn ? activeCategory.label : 'All topics'}
          </Badge>
          {q && (
            <Badge variant="outline" className="lg-chip lg-chip-q" title={q}>
              <Search aria-hidden="true" />
              <span>“{q}”</span>
            </Badge>
          )}
        </div>
      }
      tools={
        showReset ? (
          <button type="button" className="lg-clearall" onClick={reset}>
            Clear
            <span className="lg-sr-only"> search and topic</span>
          </button>
        ) : undefined
      }
    >
      {/* ───────── hero + search ───────── */}
      <header className="lg-hero">
        <div className="lg-hero-in">
          <Badge variant="outline" className="lg-pill lg-wipe" style={delay(0)}>
            <CircleHelp aria-hidden="true" />
            FAQ
          </Badge>

          <h1 className="lg-h1">
            <span className="lg-h1-a lg-blur" style={delay(70)}>
              Got questions?
            </span>{' '}
            <span className="lg-h1-b lg-blur" style={delay(160)}>
              We&apos;ve got answers.
            </span>
          </h1>

          <p className="lg-lead lg-rise" style={delay(250)}>
            Everything you need to know about finding your next open source contribution.
          </p>

          <div ref={fieldRef} className="lg-search lg-rise" style={delay(330)} role="search">
            <label htmlFor="faq-search" className="lg-sr-only">
              Search questions
            </label>
            <Search className="lg-search-icon" aria-hidden="true" />
            <Input
              id="faq-search"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => handleQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Search questions…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              className="lg-search-input"
            />
            <div className="lg-search-end">
              {query ? (
                <button
                  type="button"
                  className="lg-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    handleQuery('');
                    inputRef.current?.focus();
                  }}
                >
                  <X aria-hidden="true" />
                </button>
              ) : (
                <kbd className="lg-kbd" aria-hidden="true">
                  /
                </kbd>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ───────── questions ───────── */}
      <section className="lg-faq" aria-labelledby="faq-results-title">
        <h2 id="faq-results-title" className="lg-sr-only">
          Frequently asked questions
        </h2>
        {count === 0 ? (
          <div className="lg-state" role="status">
            <span className="lg-state-icon" aria-hidden="true">
              <Search />
            </span>
            <h2 className="lg-state-title">
              No questions match &ldquo;{q}&rdquo;
              {filtersOn ? ` in ${activeCategory.label}` : ''}
            </h2>
            <p className="lg-state-text">
              Try fewer or different words — or ask us directly and we&apos;ll point you to the answer.
            </p>
            <div className="lg-state-actions">
              {elsewhere > 0 && (
                <Button type="button" variant="outline" className="lg-btn lg-btn-line" onClick={() => setCategory('all')}>
                  Show {elsewhere} in all topics
                </Button>
              )}
              <Button type="button" variant="outline" className="lg-btn lg-btn-line" onClick={reset}>
                Clear search
              </Button>
              <Button asChild className="lg-btn lg-btn-lime">
                <Link href={ROUTES.contact}>
                  <LifeBuoy aria-hidden="true" />
                  Contact us
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <Accordion type="multiple" value={openIds} onValueChange={handleOpenChange} className="lg-list">
            {filtered.map((item, i) => {
              const cat = CATEGORIES.find((c) => c.id === item.category) ?? CATEGORIES[0];
              const Icon = cat.icon;
              return (
                <AccordionItem
                  key={item.id}
                  id={item.id}
                  value={item.id}
                  className="lg-faq-item lg-rise"
                  style={delay(Math.min(i, 9) * 28)}
                >
                  <AccordionTrigger className="lg-faq-trigger">
                    <span className="lg-tile" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="lg-faq-main">
                      <span className="lg-faq-q">
                        <Highlight text={item.q} query={q} />
                      </span>
                      <span className="lg-faq-meta">{cat.label}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="lg-faq-a">
                    <p>
                      <Highlight text={item.a} query={q} />
                    </p>
                    <div className="lg-faq-foot">
                      <CopyLinkButton id={item.id} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </section>

      {/* ───────── still stuck ───────── */}
      <aside className="lg-compose lg-compose--faq" aria-labelledby="lg-compose-title">
        <div className="lg-compose-bar">
          <span className="lg-compose-title" id="lg-compose-title">
            <LifeBuoy aria-hidden="true" />
            Still stuck on something?
          </span>
        </div>
        <div className="lg-compose-body">
          We&apos;re a small team, so questions come straight to us — no ticket queue in between.
        </div>
        <div className="lg-compose-foot">
          <span />
          <div className="lg-compose-actions">
            <Button asChild variant="outline" className="lg-btn lg-btn-line">
              <a href={`mailto:${SITE.emails.hello}`}>
                <Mail aria-hidden="true" />
                {SITE.emails.hello}
              </a>
            </Button>
            <Button asChild className="lg-btn lg-btn-lime">
              <Link href={ROUTES.contact}>
                <LifeBuoy aria-hidden="true" />
                Contact us
              </Link>
            </Button>
          </div>
        </div>
      </aside>
    </LegalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4 · CHROME
// Skip link → your navbar → sidebar + sticky toolbar + page, and the Sheet below 1024px. The navbar renders OUTSIDE .lg-root on purpose.
// ════════════════════════════════════════════════════════════════════════════

/* ─────────────────────────────────────────────────────────────
   The four pages. Used by the sidebar's page switcher and the "keep reading" cards.
   ───────────────────────────────────────────────────────────── */

type PageSlug = 'faq' | 'terms' | 'privacy' | 'refund';

const PAGES: {
  slug: PageSlug;
  href: string;
  short: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  { slug: 'faq', href: ROUTES.faq, short: 'FAQ', title: 'FAQ', desc: 'Quick answers about how OSHunt works.', icon: CircleHelp },
  { slug: 'terms', href: ROUTES.terms, short: 'Terms', title: 'Terms & Conditions', desc: 'The ground rules for using OSHunt.', icon: FileText },
  { slug: 'privacy', href: ROUTES.privacy, short: 'Privacy', title: 'Privacy Policy', desc: 'What we collect, and why.', icon: ShieldCheck },
  { slug: 'refund', href: ROUTES.refund, short: 'Refund', title: 'Refund Policy', desc: 'Free during beta, clear terms after.', icon: CircleDollarSign },
];

/** Small mono group heading used inside the sidebar / sheet. `aside` sits at the right edge. */
function Caption({ children, aside, id }: { children: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="lg-caption">
      <p className="lg-caption-text" id={id}>
        {children}
      </p>
      {aside}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Back to top — a ring that fills with the page's scroll position
   ───────────────────────────────────────────────────────────── */

function BackToTop() {
  return (
    <button
      type="button"
      className="lg-top"
      aria-label="Back to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        })
      }
    >
      <svg className="lg-top-ring" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <circle className="lg-top-track" cx="22" cy="22" r="20.5" />
        <circle className="lg-top-fill" cx="22" cy="22" r="20.5" pathLength="100" />
      </svg>
      <ArrowUp aria-hidden="true" />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   Shell
   skip link → your navbar → [ sidebar | toolbar + page ] → sheet (below 1024px)

   The navbar and the sheet are rendered OUTSIDE .lg-root on purpose: nothing here can restyle your
   navbar, and the sheet (a portal) carries its own tokens (.lg-sheet).
   ───────────────────────────────────────────────────────────── */

/** What the page gets to draw inside the sidebar / the sheet. `run` waits for the sheet to close before it runs `fn`. */
type PanelCtx = { variant: 'sidebar' | 'sheet'; run: (fn: () => void) => void };

type ShellProps = {
  page: PageSlug;
  rootRef?: RefObject<HTMLDivElement | null>;
  brand: { title: string; sub: string };
  fact?: { label: string; value: ReactNode };
  /** The toolbar button (below 1024px) that opens the sheet. */
  menu: { label: string; title: string; description: string; badge?: ReactNode; icon?: LucideIcon };
  panel: (ctx: PanelCtx) => ReactNode;
  footer: (ctx: PanelCtx) => ReactNode;
  strip: ReactNode;
  tools?: ReactNode;
  /** Draw the reading-progress line on the toolbar's lower edge. */
  progress?: boolean;
  children: ReactNode;
};

function Panel({
  ctx,
  page,
  brand,
  fact,
  panel,
  footer,
}: {
  ctx: PanelCtx;
  page: PageSlug;
  brand: ShellProps['brand'];
  fact: ShellProps['fact'];
  panel: ShellProps['panel'];
  footer: ShellProps['footer'];
}) {
  return (
    <div className="lg-panel" data-variant={ctx.variant}>
      <div className="lg-panel-scroll lg-scroll">
        {ctx.variant === 'sidebar' && (
          <div className="lg-brand">
            <div className="lg-brand-row">
              <span className="lg-brand-tile">
                <Mark />
              </span>
              <div className="lg-brand-text">
                <p className="lg-brand-title">{brand.title}</p>
                <p className="lg-brand-sub">{brand.sub}</p>
              </div>
            </div>
            {fact && (
              <div className="lg-fact-row">
                <span>{fact.label}</span>
                <span className="lg-fact-row-value">{fact.value}</span>
              </div>
            )}
          </div>
        )}

        <nav className="lg-pages" aria-label="Legal pages">
          <ul className="lg-pages-grid">
            {PAGES.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.slug}>
                  <Link href={p.href} className="lg-pagelink" aria-current={p.slug === page ? 'page' : undefined}>
                    <Icon aria-hidden="true" />
                    {p.short}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {panel(ctx)}
      </div>
      <div className="lg-panel-foot">{footer(ctx)}</div>
    </div>
  );
}

function LegalShell({
  page,
  rootRef,
  brand,
  fact,
  menu,
  panel,
  footer,
  strip,
  tools,
  progress,
  children,
}: ShellProps) {
  const ownRef = useRef<HTMLDivElement>(null);
  const root = rootRef ?? ownRef;
  const MenuIcon = menu.icon ?? ListTree;
  useSpotlight(root);
  useScrollVars(root);

  const [open, setOpen] = useState(false);
  // Tablets and up get the sheet as a right-hand drawer; phones get a bottom sheet.
  const wide = useMediaQuery('(min-width: 640px)');
  const pending = useRef<(() => void) | null>(null);

  // Radix locks page scrolling until the sheet has finished closing, so navigation waits for that.
  const run = useCallback((fn: () => void) => {
    pending.current = fn;
    setOpen(false);
  }, []);
  const sidebarCtx: PanelCtx = { variant: 'sidebar', run: (fn) => fn() };
  const sheetCtx: PanelCtx = { variant: 'sheet', run };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LG_CSS }} />
      <a className="lg-skip" href="#lg-main">
        Skip to content
      </a>
      <div className="lg-nav-slot">
        <HomeNav />
      </div>

      <TooltipProvider delayDuration={150}>
        <Sheet open={open} onOpenChange={setOpen}>
          <div ref={root} className={cn('lg-root', legalSans.variable, legalMono.variable)} data-page={page}>
            <div className="lg-shell">
              <aside className="lg-side" aria-label="Legal and help">
                <Panel ctx={sidebarCtx} page={page} brand={brand} fact={fact} panel={panel} footer={footer} />
              </aside>

              <div className="lg-col">
                <div className="lg-bar" role="region" aria-label="Page tools">
                  <div className="lg-bar-in">
                    <SheetTrigger asChild>
                      <button type="button" className="lg-menu">
                        <MenuIcon aria-hidden="true" />
                        <span className="lg-menu-label">{menu.label}</span>
                        {menu.badge}
                      </button>
                    </SheetTrigger>
                    <div className="lg-strip">{strip}</div>
                    {tools && <div className="lg-tools">{tools}</div>}
                  </div>
                  {progress && (
                    <div className="lg-bar-line" aria-hidden="true">
                      <i />
                    </div>
                  )}
                </div>

                <main id="lg-main" tabIndex={-1} className="lg-main">
                  {children}
                </main>
              </div>
            </div>
            <BackToTop />
          </div>

          <SheetContent
            side={wide ? 'right' : 'bottom'}
            data-side={wide ? 'right' : 'bottom'}
            className={cn('lg-sheet', legalSans.variable, legalMono.variable)}
            style={
              wide
                ? { width: 'min(100vw, 400px)', maxWidth: 'none', backgroundColor: '#0b0b0b' }
                : { maxHeight: '88dvh', backgroundColor: '#0b0b0b' }
            }
            onCloseAutoFocus={(e) => {
              const fn = pending.current;
              if (!fn) return;
              e.preventDefault();
              pending.current = null;
              fn();
            }}
          >
            {!wide && <div className="lg-grab" aria-hidden="true" />}
            <SheetHeader className="lg-sheet-head">
              <SheetTitle className="lg-sheet-title">
                <MenuIcon aria-hidden="true" />
                {menu.title}
              </SheetTitle>
              <SheetDescription className="lg-sr-only">{menu.description}</SheetDescription>
            </SheetHeader>
            <Panel ctx={sheetCtx} page={page} brand={brand} fact={fact} panel={panel} footer={footer} />
          </SheetContent>
        </Sheet>
      </TooltipProvider>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 5 · HOOKS
// Spotlight, scroll state, copy-to-clipboard, count-up, media query, tab title.
// ════════════════════════════════════════════════════════════════════════════

/* ─────────────────────────────────────────────────────────────
   Clipboard — navigator.clipboard with a legacy fallback
   ───────────────────────────────────────────────────────────── */

function legacyCopy(text: string) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** `[copied, copy]` — `copied` is true for `resetMs` after a successful copy. */
function useCopy(resetMs = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string) => {
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        ok = legacyCopy(text);
      }
      if (ok) {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetMs);
      }
      return ok;
    },
    [resetMs]
  );

  return [copied, copy] as const;
}

/* ─────────────────────────────────────────────────────────────
   Media query that is safe to use during hydration:
   the server (and the first client render) answer `false`.
   ───────────────────────────────────────────────────────────── */

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  );
}

/* ─────────────────────────────────────────────────────────────
   Count-up — a number that eases to its new value (the result count).
   Reduced motion: the value is applied on the next frame, no tween.
   ───────────────────────────────────────────────────────────── */

function useCountUp(target: number, ms = 420) {
  const [shown, setShown] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (current.current === target) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = current.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / ms);
      const value = Math.round(from + (target - from) * (1 - Math.pow(1 - t, 3)));
      current.current = value;
      setShown(value);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);

  return shown;
}

/* ─────────────────────────────────────────────────────────────
   Spotlight — one delegated listener for every `.lg-spot` in the root.
   It only writes two CSS variables; the glow itself is pure CSS.
   Mouse only (pointer: fine): touch never pays for it.
   ───────────────────────────────────────────────────────────── */

function useSpotlight(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let raf = 0;
    let last: PointerEvent | null = null;

    const apply = () => {
      raf = 0;
      if (!last) return;
      const el = (last.target as Element | null)?.closest?.('.lg-spot') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--lg-mx', `${last.clientX - r.left}px`);
      el.style.setProperty('--lg-my', `${last.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    root.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      root.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

/* ─────────────────────────────────────────────────────────────
   Page scroll state, written straight to the DOM (no React re-render per frame):
     --lg-scroll     0…1 across the whole page      (back-to-top ring)
     data-scrolled   the toolbar gets its shadow once the page moves
     data-past       the back-to-top button appears after ~one screen
   ───────────────────────────────────────────────────────────── */

function useScrollVars(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;

    const run = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty('--lg-scroll', max > 0 ? Math.min(1, Math.max(0, y / max)).toFixed(4) : '0');
      root.dataset.scrolled = y > 4 ? 'true' : 'false';
      root.dataset.past = y > 560 ? 'true' : 'false';
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(run);
    };

    run();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

/** Sets the browser-tab title (a 'use client' file cannot export Next `metadata`). Restores it on leave. */
function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

// ════════════════════════════════════════════════════════════════════════════
// 6 · PRIMITIVES
// Small building blocks.
// ════════════════════════════════════════════════════════════════════════════

/** OSHunt's reticle mark, drawn in the brand lime (the same drawing as the Hunt page). */
function Mark({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn('lg-mark', className)}
    >
      <path d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" stroke="currentColor" strokeWidth="0.5" opacity="0.15" strokeDasharray="3 4" />
      <path d="M13 7 L7 10.5 L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 7 L29 10.5 L29 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 29 L7 25.5 L7 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M23 29 L29 25.5 L29 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 11 L25 18 L18 25 L11 18 Z" stroke="currentColor" strokeWidth="1.2" fill="currentColor" fillOpacity="0.06" />
      <line x1="18" y1="2" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="29" x2="18" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="18" x2="7" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="29" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="18" r="2.5" fill="currentColor" />
      <circle cx="18" cy="18" r="6.5" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 3" opacity="0.7" />
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 8 · FONTS
// Self-hosted through next/font.
// ════════════════════════════════════════════════════════════════════════════

/**
 * Self-hosted by next/font (no render-blocking Google request, no layout shift).
 *
 * Already loading Outfit / JetBrains Mono in your root layout? Replace the two exports below with
 *   export const legalSans = { variable: '' };
 *   export const legalMono = { variable: '' };
 * and LG_CSS falls back to `--font-outfit` / `--font-jetbrains-mono` / the plain family name.
 */
const legalSans = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--lg-font-sans',
});

const legalMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--lg-font-mono',
});

// ════════════════════════════════════════════════════════════════════════════
// 9 · STYLES
// One scoped stylesheet. Tokens (colours, spacing, motion) are CSS custom properties at the top.
// ════════════════════════════════════════════════════════════════════════════

const LG_CSS = String.raw`
/* =====================================================================
   OSHunt — FAQ + legal pages · design system v2
   ---------------------------------------------------------------------
   Built from the Hunt page's own language (app shell, hairlines, mono
   captions, lime reserved for action / progress) with the polish of the
   earlier Framer-style pages.

   · Everything is scoped: classes are prefixed lg-, rules live under
     .lg-root / .lg-sheet / .lg-tip, so nothing leaks into the rest of the app.
   · All colour, size and motion lives in the token block below.
     Change a token, not a rule.
   · shadcn/ui parts (Accordion, Badge, Button, Card, Input, Sheet, Tooltip)
     are re-skinned with 2–4 class selectors instead of !important, so they
     win against Tailwind v3 and v4 utilities alike.
   · The Sheet and the Tooltip render in a portal (outside .lg-root), so they
     carry their own copy of the tokens.
   · No external animation library: motion is CSS keyframes + a few CSS
     variables written by scroll / pointer listeners.
   ===================================================================== */

@property --lg-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

/* ───────────────────────── tokens ───────────────────────── */

.lg-root,
.lg-sheet {
  /* surfaces (Hunt: canvas / rail / raised) */
  --lg-bg: #090909;
  --lg-rail: #0b0b0b;
  --lg-raise: #0d0d0d;
  --lg-field: rgb(255 255 255 / 0.03);
  --lg-field-2: rgb(255 255 255 / 0.05);
  --lg-hair: rgb(255 255 255 / 0.06);
  --lg-hair-2: rgb(255 255 255 / 0.09);
  --lg-hair-3: rgb(255 255 255 / 0.13);
  --lg-hover: rgb(255 255 255 / 0.05);
  --lg-press: rgb(255 255 255 / 0.09);

  /* text — every step is >= 4.5:1 on the canvas AND on the raised surfaces (checked on rendered pixels) */
  --lg-text: #ffffff;
  --lg-text-2: #a8a8a8; /* body copy */
  --lg-text-3: #9a9a9a; /* secondary UI, meta lines */
  --lg-text-4: #8f8f8f; /* the floor for small text */
  --lg-text-dim: #888888; /* second headline line (large text only) */

  /* brand — lime is reserved for the primary action, progress, the active step, the open row and the spotlight */
  --lg-accent: #a8ff3e;
  --lg-accent-rgb: 168 255 62;
  --lg-accent-hover: #bcff6a;
  --lg-accent-ink: #0a0a0a;

  /* shape */
  --lg-r-sm: 8px;
  --lg-r-md: 10px;
  --lg-r-lg: 12px;
  --lg-r-xl: 16px;

  /* type */
  --lg-sans: var(--lg-font-sans, var(--font-outfit, 'Outfit')), ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
    Roboto, 'Helvetica Neue', Arial, sans-serif;
  --lg-mono: var(--lg-font-mono, var(--font-jetbrains-mono, 'JetBrains Mono')), ui-monospace, SFMono-Regular, Menlo,
    Consolas, monospace;

  /* motion */
  --lg-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --lg-ease-io: cubic-bezier(0.65, 0, 0.35, 1);

  font-family: var(--lg-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

.lg-root {
  /* layout — --lg-nav-h = height of your navbar (0px if it is neither fixed nor sticky).
     --lg-hero-inset = space the page must clear at the top: keep it equal to --lg-nav-h for a
     position:fixed navbar, set it to 0px when the navbar is sticky or static (it already takes room). */
  --lg-nav-h: 64px;
  --lg-hero-inset: var(--lg-nav-h);
  --lg-side-w: 300px;
  --lg-bar-h: 52px;
  --lg-gutter: clamp(16px, 4vw, 40px);
  --lg-doc: 48rem;
  --lg-wrap: calc(var(--lg-doc) + 2 * var(--lg-gutter));
  --lg-measure: 34rem; /* body text width: ~70 characters per line in Outfit at 16px (measured), inside the 65–75 target */
  --lg-anchor-y: calc(var(--lg-nav-h) + var(--lg-bar-h) + 20px);

  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--lg-bg);
  color: var(--lg-text-2);
  font-size: 1rem;
  line-height: 1.6;
  text-rendering: optimizeLegibility;
  overflow-x: clip;
}

@media (max-width: 639px) {
  .lg-root {
    --lg-bar-h: 56px;
  }
}

.lg-sheet {
  color: var(--lg-text-2);
  line-height: 1.6;
}

/* ───────────────────────── resets (zero specificity: component rules always win) ───────────────────────── */
:where(.lg-root a, .lg-sheet a) {
  color: inherit;
  text-decoration: none;
}
:where(.lg-root button, .lg-sheet button) {
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
:where(.lg-root h1, .lg-root h2, .lg-root h3, .lg-root p, .lg-root ul, .lg-root ol, .lg-root dl, .lg-root dd, .lg-sheet h2, .lg-sheet p) {
  margin: 0;
}
:where(.lg-root ul, .lg-root ol, .lg-sheet ul) {
  padding: 0;
  list-style: none;
}
:where(.lg-root, .lg-sheet) :where(a, button, input, [tabindex]):focus-visible {
  outline: 2px solid rgb(255 255 255 / 0.7);
  outline-offset: 2px;
}
/* a focused control must never end up hidden under the sticky navbar + toolbar */
:where(.lg-root) :where(a, button, input, [role='switch'], [role='radio']) {
  scroll-margin-top: var(--lg-anchor-y);
  scroll-margin-bottom: 24px;
}
.lg-root ::selection {
  background: rgb(var(--lg-accent-rgb) / 0.28);
  color: #fff;
}

.lg-nav-slot {
  display: contents; /* keeps a sticky / fixed navbar working and gives print a hook */
}

.lg-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.lg-skip {
  position: fixed;
  left: 12px;
  top: -72px;
  z-index: 100;
  padding: 12px 16px;
  border-radius: 10px;
  background: #a8ff3e;
  color: #0a0a0a;
  font: 600 14px/1 system-ui, -apple-system, 'Segoe UI', sans-serif;
  text-decoration: none;
  transition: top 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}
.lg-skip:focus {
  top: 12px;
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

.lg-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgb(255 255 255 / 0.16) transparent;
  overscroll-behavior: contain;
}
.lg-scroll::-webkit-scrollbar {
  width: 8px;
}
.lg-scroll::-webkit-scrollbar-thumb {
  border-radius: 8px;
  border: 2px solid transparent;
  background: rgb(255 255 255 / 0.16);
  background-clip: content-box;
}

/* ───────────────────────── motion ───────────────────────── */
/* backwards (not both): once an entrance has played the element is back to its normal style,
   so hover transforms and filters keep working. */

@keyframes lg-rise {
  from {
    opacity: 0;
    transform: translate3d(0, 14px, 0);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
@keyframes lg-blur {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0);
    filter: blur(12px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: none;
  }
}
@keyframes lg-wipe {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0 round 999px);
  }
  to {
    opacity: 1;
    clip-path: inset(0 0 0 0 round 999px);
  }
}
@keyframes lg-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes lg-spin {
  to {
    --lg-angle: 360deg;
  }
}

.lg-root .lg-rise {
  animation: lg-rise 0.75s var(--lg-ease) backwards;
  animation-delay: var(--d, 0ms);
}
.lg-root .lg-blur {
  animation: lg-blur 0.9s var(--lg-ease) backwards;
  animation-delay: var(--d, 0ms);
}
.lg-root .lg-wipe {
  animation: lg-wipe 0.7s var(--lg-ease) backwards;
  animation-delay: var(--d, 0ms);
}

/* ───────────────────────── shell: sidebar | toolbar + page ───────────────────────── */

.lg-shell {
  padding-top: var(--lg-hero-inset);
  min-height: 100vh;
  min-height: 100dvh;
}
.lg-col {
  min-width: 0;
}
.lg-side {
  display: none;
}

@media (min-width: 1024px) {
  .lg-shell {
    display: grid;
    grid-template-columns: var(--lg-side-w) minmax(0, 1fr);
    align-items: start;
  }
  .lg-side {
    display: block;
    position: sticky;
    top: var(--lg-nav-h);
    z-index: 20;
    height: 100vh;
    height: calc(100dvh - var(--lg-nav-h));
    border-right: 1px solid var(--lg-hair);
    background: var(--lg-rail);
  }
}

.lg-main {
  display: block;
  outline: 0;
  padding-bottom: clamp(56px, 8vw, 96px);
  container: lgmain / inline-size;
}

/* ───────────────────────── panel (sidebar on desktop, sheet below 1024px) ───────────────────────── */

.lg-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--lg-rail);
}
.lg-panel-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding: 16px 14px 24px;
}

.lg-brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.lg-brand-tile {
  position: relative;
  display: grid;
  place-items: center;
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: var(--lg-r-lg);
  border: 1px solid var(--lg-hair-3);
  background: radial-gradient(circle at 30% 15%, rgb(var(--lg-accent-rgb) / 0.16), transparent 70%), var(--lg-raise);
}
.lg-mark {
  display: block;
  width: 24px;
  height: 24px;
  color: var(--lg-accent);
}
.lg-brand-text {
  min-width: 0;
}
.lg-brand-title {
  color: var(--lg-text);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.01em;
}
.lg-brand-sub {
  margin-top: 2px;
  color: var(--lg-text-3);
  font-size: 12.5px;
  line-height: 1.4;
}
.lg-fact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 9px 12px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-md);
  background: var(--lg-field);
  color: var(--lg-text-3);
  font-size: 12px;
  line-height: 1.3;
}
.lg-fact-row-value {
  color: var(--lg-text);
  font-family: var(--lg-mono);
  font-size: 11.5px;
  font-weight: 500;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.lg-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 2px 10px;
}
.lg-caption-text {
  color: var(--lg-text-3);
  font-family: var(--lg-mono);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.lg-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 7px;
  border: 1px solid var(--lg-hair-2);
  border-radius: 999px;
  background: var(--lg-field-2);
  color: var(--lg-text-2);
  font-family: var(--lg-mono);
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.lg-group {
  display: block;
}

/* the four pages, as a 2×2 switcher */
.lg-pages-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.lg-pagelink {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-sm);
  background: var(--lg-field);
  color: var(--lg-text-2);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.lg-pagelink > svg {
  flex: none;
  width: 15px;
  height: 15px;
}
.lg-pagelink:hover {
  border-color: var(--lg-hair-3);
  background: rgb(255 255 255 / 0.07);
  color: var(--lg-text);
}
.lg-pagelink[aria-current='page'] {
  border-color: rgb(255 255 255 / 0.16);
  background: rgb(255 255 255 / 0.1);
  color: var(--lg-text);
}
.lg-pagelink[aria-current='page'] > svg {
  color: var(--lg-accent);
}

/* pinned footer, with a fade where the list scrolls under it */
.lg-panel-foot {
  position: relative;
  flex: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--lg-hair);
  background: var(--lg-rail);
}
.lg-panel-foot::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 100%;
  height: 20px;
  background: linear-gradient(to top, var(--lg-rail), transparent);
  pointer-events: none;
}

/* ───────────────────────── reading log (the contents list) ───────────────────────── */
/* the track: one segment from each step to the next */
/* the fill: a lime line from the first step to wherever you are; the height is written by the reader hook */

/* ───────────────────────── toolbar (sticky, blurred, with a reading-progress line) ───────────────────────── */

.lg-bar {
  position: sticky;
  top: var(--lg-nav-h);
  z-index: 30;
  min-height: var(--lg-bar-h);
  border-bottom: 1px solid var(--lg-hair);
  background: rgb(9 9 9 / 0.9);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  backdrop-filter: blur(16px) saturate(1.4);
  transition: border-color 0.3s, box-shadow 0.3s;
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .lg-bar {
    background: var(--lg-bg);
  }
}
.lg-root[data-scrolled='true'] .lg-bar {
  border-bottom-color: var(--lg-hair-3);
  box-shadow: 0 14px 30px -20px rgb(0 0 0 / 0.9);
}
.lg-bar-in {
  display: flex;
  align-items: center;
  gap: 10px;
  width: min(100%, var(--lg-wrap));
  min-height: var(--lg-bar-h);
  margin-inline: auto;
  padding-inline: var(--lg-gutter);
}
.lg-strip {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
}
.lg-tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
}
.lg-bar-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s;
}
.lg-root[data-scrolled='true'] .lg-bar-line {
  opacity: 1;
}
.lg-bar-line > i {
  display: block;
  height: 100%;
  background: var(--lg-accent);
  box-shadow: 0 0 12px rgb(var(--lg-accent-rgb) / 0.7);
  transform-origin: 0 50%;
  transform: scaleX(var(--lg-read, 0));
}

.lg-menu {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--lg-hair-3);
  border-radius: var(--lg-r-sm);
  background: var(--lg-field);
  color: var(--lg-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  transition: background-color 0.2s, border-color 0.2s;
}
.lg-menu > svg {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--lg-text-3);
}
.lg-menu:hover {
  border-color: rgb(255 255 255 / 0.2);
  background: rgb(255 255 255 / 0.07);
}
@media (min-width: 1024px) {
  .lg-menu {
    display: none;
  }
}

/* ───────────────────────── tiles (the 36px icon square used everywhere) ───────────────────────── */

.lg-tile {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-md);
  background: rgb(255 255 255 / 0.04);
  color: var(--lg-text-2);
  transition: background-color 0.3s var(--lg-ease), border-color 0.3s var(--lg-ease), color 0.3s var(--lg-ease);
}
.lg-tile > svg {
  width: 18px;
  height: 18px;
}

/* ───────────────────────── hero ───────────────────────── */

.lg-hero {
  position: relative;
  isolation: isolate;
  padding: clamp(32px, 5.5vw, 64px) 0 clamp(24px, 4vw, 40px);
}
.lg-hero::before,
.lg-hero::after {
  content: '';
  position: absolute;
  z-index: -1;
  pointer-events: none;
}
.lg-hero::before {
  inset: 0 0 auto 0;
  height: 460px;
  background: radial-gradient(60% 70% at 16% 0%, rgb(var(--lg-accent-rgb) / 0.1), transparent 70%),
    radial-gradient(40% 60% at 88% 8%, rgb(97 218 251 / 0.05), transparent 70%);
}
.lg-hero::after {
  inset: 0;
  background-image: radial-gradient(rgb(255 255 255 / 0.11) 1px, transparent 1.3px);
  background-size: 24px 24px;
  -webkit-mask-image: radial-gradient(70% 85% at 26% 0%, #000, transparent 78%);
  mask-image: radial-gradient(70% 85% at 26% 0%, #000, transparent 78%);
}
.lg-hero-in {
  width: min(100%, var(--lg-wrap));
  margin-inline: auto;
  padding-inline: var(--lg-gutter);
}

.lg-root .lg-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: auto;
  height: 28px;
  padding: 0 12px 0 10px;
  border: 1px solid var(--lg-hair-3);
  border-radius: 999px;
  background: var(--lg-field);
  color: var(--lg-text-2);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
  transition: none;
}
.lg-root .lg-pill.lg-pill > svg {
  width: 14px;
  height: 14px;
  color: var(--lg-text-2);
}

.lg-h1 {
  margin-top: 20px;
  color: var(--lg-text);
  font-size: clamp(2.5rem, 1.5rem + 3.6vw, 3.75rem);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.035em;
}
.lg-h1-a,
.lg-h1-b {
  display: block;
  text-wrap: balance;
}
.lg-h1-b {
  color: var(--lg-text-dim);
}
.lg-lead {
  max-width: 36rem;
  margin-top: 20px;
  color: var(--lg-text-2);
  font-size: clamp(1.0625rem, 1rem + 0.35vw, 1.25rem);
  line-height: 1.6;
  text-wrap: pretty;
}

/* ───────────────────────── tl;dr + at-a-glance cards ───────────────────────── */
/* shadcn <Card> wearing the Hunt TemplateCard skin */

/* ───────────────────────── spotlight (cursor-following glow, mouse only) ───────────────────────── */

.lg-root .lg-spot {
  position: relative;
  isolation: isolate;
  --lg-c: var(--lg-accent-rgb);
}
.lg-root .lg-spot > * {
  position: relative;
  z-index: 1;
}
@media (hover: hover) and (pointer: fine) {
  .lg-root .lg-spot::before,
  .lg-root .lg-spot::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    border-radius: inherit;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.35s var(--lg-ease);
  }
  .lg-root .lg-spot::before {
    background: radial-gradient(340px circle at var(--lg-mx, 50%) var(--lg-my, 0%), rgb(var(--lg-c) / 0.11), transparent 70%);
  }
  .lg-root .lg-spot::after {
    padding: 1px;
    background: radial-gradient(240px circle at var(--lg-mx, 50%) var(--lg-my, 0%), rgb(var(--lg-c) / 0.6), transparent 70%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }
  .lg-root .lg-spot:hover::before,
  .lg-root .lg-spot:hover::after,
  .lg-root .lg-spot:focus-visible::before,
  .lg-root .lg-spot:focus-visible::after {
    opacity: 1;
  }
  .lg-root .lg-spot:hover {
    translate: 0 -2px;
  }
}

/* ───────────────────────── article: one block per clause ───────────────────────── */
/* answers a click in the contents list: the tile flashes where you landed */

/* ───────────────────────── composer card (questions? write to us) ───────────────────────── */

.lg-compose {
  margin-top: clamp(28px, 4vw, 44px);
  border: 1px solid var(--lg-hair-3);
  border-radius: var(--lg-r-xl);
  background: var(--lg-raise);
  overflow: hidden;
}
.lg-compose-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--lg-hair);
  background: rgb(255 255 255 / 0.02);
}
.lg-compose-title {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--lg-text);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.3;
}
.lg-compose-title > svg {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--lg-text-3);
}
.lg-compose-body {
  padding: 16px;
  color: var(--lg-text-2);
  font-size: 15px;
  line-height: 1.7;
  text-wrap: pretty;
}
.lg-compose-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--lg-hair);
  background: rgb(255 255 255 / 0.02);
}
.lg-compose-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.lg-compose--faq {
  width: min(calc(100% - 2 * var(--lg-gutter)), var(--lg-doc));
  margin-inline: auto;
  margin-top: clamp(28px, 4vw, 44px);
}

/* ───────────────────────── buttons (shadcn <Button> in two skins) ───────────────────────── */

:is(.lg-root, .lg-sheet) .lg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 40px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--lg-r-md);
  box-shadow: none;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.005em;
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.25s, transform 0.15s var(--lg-ease);
}
:is(.lg-root, .lg-sheet) .lg-btn > svg {
  flex: none;
  width: 16px;
  height: 16px;
}
:is(.lg-root, .lg-sheet) .lg-btn:active:not(:disabled) {
  transform: translateY(1px);
}
:is(.lg-root, .lg-sheet) .lg-btn:focus-visible {
  outline: 2px solid rgb(255 255 255 / 0.75);
  outline-offset: 2px;
  box-shadow: none;
}

:is(.lg-root, .lg-sheet) .lg-btn.lg-btn-lime {
  border-color: transparent;
  background: var(--lg-accent);
  color: var(--lg-accent-ink);
}
:is(.lg-root, .lg-sheet) .lg-btn.lg-btn-lime:hover {
  background: var(--lg-accent-hover);
  color: var(--lg-accent-ink);
  box-shadow: 0 10px 28px -12px rgb(var(--lg-accent-rgb) / 0.6);
}
:is(.lg-root, .lg-sheet) .lg-btn.lg-btn-line {
  border-color: var(--lg-hair-3);
  background: rgb(255 255 255 / 0.04);
  color: #e8e8e8;
}
:is(.lg-root, .lg-sheet) .lg-btn.lg-btn-line:hover {
  border-color: rgb(255 255 255 / 0.2);
  background: rgb(255 255 255 / 0.08);
  color: #ffffff;
}
:is(.lg-root, .lg-sheet) .lg-btn.lg-btn-line:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: rgb(255 255 255 / 0.04);
  border-color: var(--lg-hair-3);
}

/* ───────────────────────── FAQ · search ───────────────────────── */

.lg-root .lg-search {
  position: relative;
  isolation: isolate;
  max-width: 36rem;
  margin-top: 30px;
  border-radius: var(--lg-r-lg);
  background: rgb(255 255 255 / 0.04);
  transition: box-shadow 0.35s var(--lg-ease);
}
@supports (mask-composite: exclude) or (-webkit-mask-composite: xor) {
  .lg-root .lg-search::before,
  .lg-root .lg-search::after {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    pointer-events: none;
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }
  .lg-root .lg-search::before {
    background: var(--lg-hair-3);
    transition: background-color 0.3s var(--lg-ease);
  }
  /* the focus beam: a lime arc that travels round the field while it is focused */
  .lg-root .lg-search::after {
    background: conic-gradient(
      from var(--lg-angle),
      transparent 0 62%,
      rgb(var(--lg-accent-rgb) / 0.15) 72%,
      var(--lg-accent) 92%,
      transparent 100%
    );
    opacity: 0;
    transition: opacity 0.4s var(--lg-ease);
    animation: lg-spin 3.6s linear infinite;
  }
  .lg-root .lg-search:focus-within::before {
    background: rgb(var(--lg-accent-rgb) / 0.35);
  }
  .lg-root .lg-search:focus-within::after {
    opacity: 1;
  }
}
.lg-root .lg-search:focus-within {
  box-shadow: 0 0 0 4px rgb(var(--lg-accent-rgb) / 0.08), 0 18px 48px -22px rgb(var(--lg-accent-rgb) / 0.35);
}
.lg-root .lg-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  translate: 0 -50%;
  width: 18px;
  height: 18px;
  color: var(--lg-text-3);
  pointer-events: none;
  transition: color 0.2s;
}
.lg-root .lg-search:focus-within .lg-search-icon {
  color: var(--lg-accent);
}
/* shadcn <Input> with its own border, ring and background switched off (the wrapper draws them) */
.lg-root .lg-search .lg-search-input {
  display: block;
  width: 100%;
  height: 52px;
  min-width: 0;
  padding: 0 78px 0 46px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
  outline: 0;
  color: var(--lg-text);
  font-family: inherit;
  font-size: 16px; /* never below 16px: stops iOS zooming in on focus */
  font-weight: 500;
  line-height: 1;
  -webkit-appearance: none;
  appearance: none;
}
.lg-root .lg-search .lg-search-input::placeholder {
  color: #9a9a9a;
  opacity: 1;
}
.lg-root .lg-search .lg-search-input:focus,
.lg-root .lg-search .lg-search-input:focus-visible {
  border: 0;
  box-shadow: none;
  outline: 0;
}
.lg-root .lg-search .lg-search-input::-webkit-search-cancel-button,
.lg-root .lg-search .lg-search-input::-webkit-search-decoration {
  -webkit-appearance: none;
  display: none;
}
.lg-search-end {
  position: absolute;
  right: 10px;
  top: 50%;
  translate: 0 -50%;
  display: flex;
  align-items: center;
}
.lg-kbd {
  display: inline-grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 7px;
  border: 1px solid var(--lg-hair-3);
  border-radius: 7px;
  background: rgb(255 255 255 / 0.05);
  color: var(--lg-text-3);
  font-family: var(--lg-mono);
  font-size: 12px;
  line-height: 1;
}
.lg-clear {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--lg-text-3);
  transition: background-color 0.2s, color 0.2s;
}
.lg-clear > svg {
  width: 16px;
  height: 16px;
}
.lg-clear:hover {
  background: var(--lg-press);
  color: var(--lg-text);
}

/* ───────────────────────── FAQ · sidebar controls ───────────────────────── */

/* a radio list with a sliding thumb (Hunt's segmented control, stacked) */
.lg-topics {
  --lg-row: 40px;
  position: relative;
  display: grid;
  padding: 3px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-lg);
  background: var(--lg-field);
}
.lg-topics-thumb {
  position: absolute;
  left: 3px;
  right: 3px;
  top: 3px;
  height: var(--lg-row);
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 9px;
  background: rgb(255 255 255 / 0.09);
  transform: translateY(calc(var(--i, 0) * var(--lg-row)));
  transition: transform 0.35s var(--lg-ease);
  pointer-events: none;
}
.lg-topic {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--lg-row);
  padding: 0 10px;
  border-radius: 9px;
  color: var(--lg-text-3);
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1;
  text-align: left;
  transition: color 0.2s;
}
.lg-topic > svg {
  flex: none;
  width: 16px;
  height: 16px;
}
.lg-topic:hover {
  color: var(--lg-text);
}
.lg-topic[aria-checked='true'] {
  color: var(--lg-text);
}
.lg-topic-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lg-topic-count {
  color: var(--lg-text-4);
  font-family: var(--lg-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.lg-topic[aria-checked='true'] .lg-topic-count {
  color: var(--lg-text-2);
}

.lg-toggles {
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-lg);
  background: var(--lg-field);
  overflow: hidden;
}
.lg-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  padding: 12px 14px;
  text-align: left;
  transition: background-color 0.2s;
}
.lg-toggle:hover {
  background: rgb(255 255 255 / 0.035);
}
.lg-toggle:focus-visible {
  outline-offset: -2px;
}
.lg-toggle-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.lg-toggle-label {
  color: var(--lg-text);
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.3;
}
.lg-toggle-hint {
  color: var(--lg-text-3);
  font-size: 12px;
  line-height: 1.4;
}
.lg-switch {
  display: inline-flex;
  flex: none;
  align-items: center;
  width: 36px;
  height: 20px;
  padding: 2px;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.12);
  transition: background-color 0.25s var(--lg-ease), border-color 0.25s var(--lg-ease);
}
.lg-switch > span {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #a8a8a8;
  transition: transform 0.3s var(--lg-ease), background-color 0.25s;
}
.lg-toggle[aria-checked='true'] .lg-switch {
  border-color: #f5f5f5;
  background: #f5f5f5;
}
.lg-toggle[aria-checked='true'] .lg-switch > span {
  background: #0a0a0a;
  transform: translateX(16px);
}

/* toolbar summary: count, topic, search term */
.lg-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.lg-count-line {
  flex: none;
  color: var(--lg-text-2);
  font-size: 13.5px;
}
.lg-count-line b {
  margin-right: 1px;
  color: var(--lg-text);
  font-family: var(--lg-mono);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.lg-chips-sep {
  flex: none;
  width: 1px;
  height: 16px;
  background: var(--lg-hair-3);
}
.lg-root .lg-chip {
  flex: none;
  gap: 6px;
  width: auto;
  height: 26px;
  padding: 0 10px 0 8px;
  border: 1px solid var(--lg-hair-3);
  border-radius: 999px;
  background: var(--lg-field);
  color: var(--lg-text-2);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  transition: none;
}
.lg-root .lg-chip.lg-chip > svg {
  flex: none;
  width: 13px;
  height: 13px;
}
.lg-root .lg-chip.lg-chip-q {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 14rem;
}
.lg-chip-q > span {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lg-clearall {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--lg-r-sm);
  color: var(--lg-text-3);
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  transition: background-color 0.2s, color 0.2s;
}
.lg-clearall:hover {
  background: var(--lg-press);
  color: var(--lg-text);
}

/* ───────────────────────── FAQ · the list (shadcn <Accordion> as Hunt's raised list) ───────────────────────── */

.lg-faq {
  width: min(100%, var(--lg-wrap));
  margin-inline: auto;
  padding: 8px var(--lg-gutter) 0;
}
.lg-root .lg-list {
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-xl);
  background: var(--lg-raise);
  overflow: hidden;
}
.lg-root .lg-list .lg-faq-item {
  position: relative;
  border: 0;
  border-top: 1px solid var(--lg-hair);
  border-radius: 0;
  background: transparent;
  scroll-margin-top: var(--lg-anchor-y);
  transition: background-color 0.3s var(--lg-ease);
}
.lg-root .lg-list .lg-faq-item:first-child {
  border-top: 0;
}
.lg-root .lg-list .lg-faq-item[data-state='open'] {
  background: rgb(255 255 255 / 0.025);
}
/* the lime bar on the open row */
.lg-root .lg-list .lg-faq-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 1;
  width: 2px;
  background: var(--lg-accent);
  box-shadow: 0 0 14px rgb(var(--lg-accent-rgb) / 0.6);
  transform: scaleY(0);
  transform-origin: 50% 0;
  transition: transform 0.4s var(--lg-ease);
  pointer-events: none;
}
.lg-root .lg-list .lg-faq-item[data-state='open']::before {
  transform: scaleY(1);
}
.lg-root .lg-list .lg-faq-item > h3 {
  margin: 0;
  font-size: inherit;
}

.lg-root .lg-list .lg-faq-trigger {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  width: 100%;
  min-height: 66px;
  padding: 14px 16px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--lg-text);
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.4;
  text-align: left;
  text-decoration: none;
  transition: background-color 0.2s;
}
.lg-root .lg-list .lg-faq-trigger:hover {
  background: rgb(255 255 255 / 0.03);
  text-decoration: none;
}
.lg-root .lg-list .lg-faq-trigger:focus-visible {
  outline: 2px solid rgb(255 255 255 / 0.7);
  outline-offset: -3px;
  border: 0;
  box-shadow: none;
}
.lg-root .lg-list .lg-faq-item[data-state='open'] .lg-tile {
  border-color: rgb(var(--lg-accent-rgb) / 0.3);
  background: rgb(var(--lg-accent-rgb) / 0.1);
  color: var(--lg-accent);
}
.lg-faq-main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.lg-faq-q {
  text-wrap: pretty;
}
.lg-faq-meta {
  color: var(--lg-text-3);
  font-size: 12.5px;
  font-weight: 400;
  line-height: 1.3;
}
/* the chevron shadcn ships (always the last child of the trigger) */
.lg-root .lg-list .lg-faq-trigger > svg {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0 2px 0 0;
  translate: none;
  rotate: none;
  transform: none;
  color: var(--lg-text-4);
  transition: transform 0.35s var(--lg-ease), color 0.2s;
}
.lg-root .lg-list .lg-faq-trigger:hover > svg {
  color: var(--lg-text);
}
.lg-root .lg-list .lg-faq-trigger[data-state='open'] > svg {
  rotate: none;
  transform: rotate(180deg);
  color: var(--lg-accent);
}

/* the answer's height animation (does not depend on tailwindcss-animate / tw-animate-css being present) */
@keyframes lg-acc-open {
  from {
    height: 0;
    opacity: 0;
  }
  to {
    height: var(--radix-accordion-content-height);
    opacity: 1;
  }
}
@keyframes lg-acc-close {
  from {
    height: var(--radix-accordion-content-height);
    opacity: 1;
  }
  to {
    height: 0;
    opacity: 0;
  }
}
.lg-root .lg-list .lg-faq-item [role='region'] {
  overflow: hidden;
  transition: none;
}
.lg-root .lg-list .lg-faq-item [role='region'][data-state='open'] {
  animation: lg-acc-open 0.38s var(--lg-ease);
}
.lg-root .lg-list .lg-faq-item [role='region'][data-state='closed'] {
  animation: lg-acc-close 0.26s var(--lg-ease);
}
.lg-root .lg-list .lg-faq-a {
  padding: 0 18px 18px 66px;
  color: var(--lg-text-2);
  font-size: 1rem;
  line-height: 1.75;
}
.lg-faq-a > p {
  max-width: var(--lg-measure);
  text-wrap: pretty;
}
.lg-faq-foot {
  display: flex;
  margin-top: 14px;
}
.lg-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 11px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-sm);
  color: var(--lg-text-3);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1;
  transition: background-color 0.2s, border-color 0.2s, color 0.2s;
}
.lg-action > svg {
  width: 14px;
  height: 14px;
}
.lg-action:hover {
  border-color: var(--lg-hair-3);
  background: var(--lg-hover);
  color: var(--lg-text);
}
.lg-action[data-copied='true'] {
  color: var(--lg-accent);
}

/* what the search matched */
.lg-root .lg-hit {
  padding: 0 2px;
  border-radius: 3px;
  background: rgb(var(--lg-accent-rgb) / 0.2);
  color: var(--lg-accent);
}

/* nothing matched */
.lg-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(36px, 7vw, 64px) 20px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-xl);
  background: var(--lg-raise);
  text-align: center;
  animation: lg-fade 0.35s var(--lg-ease);
}
.lg-state-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--lg-hair-3);
  border-radius: var(--lg-r-lg);
  background: var(--lg-field-2);
  color: var(--lg-text-2);
}
.lg-state-icon > svg {
  width: 22px;
  height: 22px;
}
.lg-state-title {
  max-width: 28rem;
  margin-top: 16px;
  color: var(--lg-text);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.lg-state-text {
  max-width: 26rem;
  margin-top: 6px;
  color: var(--lg-text-3);
  font-size: 14px;
  line-height: 1.6;
  text-wrap: pretty;
}
.lg-state-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
}

/* ───────────────────────── sheet (shadcn <Sheet>: right drawer ≥640px, bottom sheet below) ───────────────────────── */

.lg-sheet[data-side] {
  gap: 0;
  padding: 0;
  border-color: var(--lg-hair-3);
  background: var(--lg-rail);
  color: var(--lg-text-2);
  box-shadow: 0 0 80px rgb(0 0 0 / 0.65);
  overflow: hidden;
}
.lg-sheet[data-side='right'] {
  border-width: 0 0 0 1px;
}
.lg-sheet[data-side='bottom'] {
  border-width: 1px 0 0;
  border-radius: 20px 20px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.lg-grab {
  flex: none;
  width: 40px;
  height: 4px;
  margin: 10px auto 2px;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.2);
}
.lg-sheet .lg-sheet-head {
  display: flex;
  flex: none;
  flex-direction: row;
  align-items: center;
  gap: 0;
  padding: 14px 60px 12px 16px;
  border-bottom: 1px solid var(--lg-hair);
  text-align: start;
}
.lg-sheet .lg-sheet-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-align: start;
  color: var(--lg-text);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
}
.lg-sheet .lg-sheet-title > svg {
  width: 16px;
  height: 16px;
  color: var(--lg-text-3);
}
.lg-sheet .lg-panel {
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
}
/* shadcn's own close button: always the last child of the content */
.lg-sheet[data-side] > button:last-child {
  position: absolute;
  top: 8px;
  right: 10px;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--lg-r-sm);
  background: transparent;
  color: var(--lg-text-3);
  opacity: 1;
  transition: background-color 0.2s, color 0.2s;
}
.lg-sheet[data-side='bottom'] > button:last-child {
  top: 14px;
}
.lg-sheet[data-side] > button:last-child > svg {
  width: 18px;
  height: 18px;
}
.lg-sheet[data-side] > button:last-child:hover {
  background: var(--lg-press);
  color: var(--lg-text);
  opacity: 1;
}
.lg-sheet[data-side] > button:last-child:focus-visible {
  outline: 2px solid rgb(255 255 255 / 0.75);
  outline-offset: 0;
  box-shadow: none;
}

/* ───────────────────────── back to top (a ring that fills with the page's scroll position) ───────────────────────── */

.lg-top {
  position: fixed;
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  z-index: 40;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgb(13 13 13 / 0.92);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 28px -12px rgb(0 0 0 / 0.9);
  color: var(--lg-text);
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px) scale(0.92);
  pointer-events: none;
  transition: opacity 0.3s, transform 0.35s var(--lg-ease), visibility 0s linear 0.35s, background-color 0.2s;
}
.lg-root[data-past='true'] .lg-top {
  opacity: 1;
  visibility: visible;
  transform: none;
  pointer-events: auto;
  transition-delay: 0s;
}
.lg-top:hover {
  background: #1a1a1a;
}
.lg-top > svg:last-child {
  position: relative;
  width: 18px;
  height: 18px;
}
.lg-top-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.lg-top-track,
.lg-top-fill {
  fill: none;
  stroke-width: 2;
}
.lg-top-track {
  stroke: rgb(255 255 255 / 0.14);
}
.lg-top-fill {
  stroke: var(--lg-accent);
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: calc(100 - var(--lg-scroll, 0) * 100);
}

/* ───────────────────────── responsive ───────────────────────── */

/* the page column is narrower than the viewport (sidebar!), so these follow the column, not the screen */
@container lgmain (max-width: 34rem) {
  .lg-compose-foot {
    align-items: stretch;
  }
  .lg-compose-foot > .lg-btn,
  .lg-compose-actions,
  .lg-compose-actions > .lg-btn {
    width: 100%;
  }
  .lg-compose-foot > .lg-btn {
    flex: 1 1 100%;
  }
  .lg-root .lg-list .lg-faq-a {
    padding-left: 18px;
  }
  .lg-root .lg-list .lg-faq-trigger {
    gap: 12px;
  }
  .lg-state-actions > .lg-btn {
    flex: 1 1 100%;
  }
}

@media (max-width: 639px) {
  .lg-hero {
    padding-top: 32px;
  }
  .lg-hero-in .lg-lead {
    margin-top: 16px;
  }
}

@media (max-width: 479px) {
  .lg-bar-in {
    gap: 6px;
  }
  .lg-chips-sep,
  .lg-root .lg-chip:not(.lg-chip-q) {
    display: none;
  }
  .lg-menu-label {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .lg-menu {
    gap: 6px;
    padding: 0 9px;
  }
}

/* fingers: bigger targets, no hover-only affordances */
@media (pointer: coarse) {
  .lg-clear {
    width: 40px;
    height: 40px;
  }
  .lg-menu {
    height: 40px;
  }
  .lg-pagelink {
    height: 44px;
  }
  .lg-topics {
    --lg-row: 44px;
  }
  .lg-toggle {
    min-height: 64px;
  }
  .lg-action,
  .lg-clearall {
    height: 40px;
  }
  .lg-kbd {
    display: none;
  }
  .lg-root .lg-list .lg-faq-trigger {
    min-height: 70px;
  }
}

/* ───────────────────────── reduced motion: no entrances, no beam, no slide, no tween ───────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .lg-root *,
.lg-root *::before,
.lg-root *::after,
.lg-sheet,
.lg-sheet * {
    animation: none !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0s !important;
    scroll-behavior: auto !important;
  }
}

/* ───────────────────────── print: just the words ───────────────────────── */

@media print {
  @page {
    margin: 16mm;
  }
  .lg-nav-slot,
.lg-skip,
.lg-side,
.lg-bar,
.lg-top,
.lg-sheet,
.lg-compose-foot,
.lg-hero::before,
.lg-hero::after,
.lg-search,
.lg-action {
    display: none !important;
  }
  .lg-root {
    min-height: 0;
    background: #fff !important;
    color: #222 !important;
    overflow: visible;
  }
  .lg-shell {
    display: block;
    padding-top: 0;
    min-height: 0;
  }
  .lg-root *,
  .lg-root *::before,
  .lg-root *::after {
    animation: none !important;
    transition: none !important;
    opacity: 1 !important;
    filter: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  .lg-hero {
    padding: 0 0 16px;
  }
  .lg-h1,
.lg-faq-q,
.lg-compose-title {
    color: #000 !important;
  }
  .lg-h1-b,
.lg-lead,
.lg-compose-body,
.lg-faq-meta,
.lg-faq-a {
    color: #333 !important;
  }
  .lg-compose,
.lg-list,
.lg-state {
    background: #fff !important;
    border-color: #bbb !important;
  }
  .lg-compose-bar {
    border-color: #ccc !important;
  }
  .lg-compose {
    break-inside: avoid;
  }
  .lg-tile {
    display: none !important;
  }
  .lg-root a[href^='http']::after {
    content: ' (' attr(href) ')';
    color: #555;
    font-size: 0.85em;
    word-break: break-all;
  }
}
`;