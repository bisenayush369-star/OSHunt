'use client';

/**
 * OSHunt · Refund Policy — ONE self-contained file (rebuilt from zero in the look of your Hunt page)
 * Save as: app/refund/page.tsx
 *
 * Everything this page needs is in this file: the text, the page layout, the sidebar / toolbar / Sheet chrome, the
 * hooks, the typographic helpers and the scoped stylesheet (LG_CSS, bottom of the file). It imports only packages,
 * your shadcn components and your navbar.
 *
 * NEEDS (a standard shadcn + Next.js project — nothing new to install)
 *   @/components/ui/HomeNav (default export) · @/components/lib/utils (cn) · lucide-react 1.x
 *   shadcn: @/components/ui/{badge,button,card,sheet,tooltip}
 *   <TooltipContent> is used with only `side` and `className`, so a minimal tooltip.tsx (children / className /
 *   side) works as well as stock shadcn. The page does not pass `sideOffset`.
 *   The Sheet slides in and the Tooltip fades with shadcn’s own animation classes (tw-animate-css or
 *   tailwindcss-animate, whichever your shadcn setup uses). framer-motion is NOT needed any more.
 *
 * EDIT HERE
 *   Text ..................... `doc` in section 2 (title, tagline, lead, TL;DR, the three highlight cards, sections,
 *                              banner). Adding a section updates the numbering, the reading log, the reading
 *                              position and the reading time.
 *   Emails, routes, dates .... SITE / ROUTES (section 1). Assumes /contact exists.
 *   Navbar height ........... --lg-nav-h and --lg-hero-inset at the top of LG_CSS.
 *                             Fixed navbar: leave as is.  Sticky navbar: --lg-hero-inset: 0px.
 *                             Static navbar (scrolls away): set both to 0px.
 *   Sidebar width ........... --lg-side-w (300px, the same as the Hunt page’s filter rail).
 *   Text width .............. --lg-measure (34rem ≈ 70 characters a line; wider than ~75 gets tiring to read).
 *   Surfaces ................ --lg-bg / --lg-rail / --lg-raise (#090909 / #0b0b0b / #0d0d0d — the Hunt page’s own).
 *   Lime .................... --lg-accent and --lg-accent-rgb (#a8ff3e). Used only for the primary button, progress,
 *                             the step you are on, the open FAQ row and the hover glow.
 *   Tooltip gap ............. --lg-tip-gap (0px = whatever your tooltip.tsx does; 6px if the tip sits flush on the button).
 *
 * WHAT CHANGED
 *   Build fix ....... <TooltipContent> no longer receives `sideOffset`: your tooltip.tsx does not accept it and the
 *                     Netlify build stopped with TS2322 on this line. The gap is now the --lg-tip-gap token.
 *   Kept ............ all 7 sections, the 3 highlight cards, the TL;DR note, the amber “charged in error” callout
 *                     and the “Have a billing question?” banner — word for word. The “Last updated” date is kept
 *                     too (now in the hero’s meta row, without the colon).
 *   Layout .......... an app shell like the Hunt page: a 300px sidebar with the four legal pages and a “reading
 *                     log” (each section is a step: done, being read, still to come, with a lime line that fills as
 *                     you scroll) next to a sticky blurred toolbar (current section, reading percentage, copy link,
 *                     print, progress line). Below 1024px the same list opens in a shadcn Sheet: a right drawer from
 *                     640px up, a bottom sheet with a grabber on phones.
 *   New ............. the highlight cards are shadcn Card in the Hunt template-card skin, with a cursor glow (mouse
 *                     only) · copy-link anchors on headings · back-to-top button with a progress ring · reading time
 *                     counted from the text · “keep reading” cards · print stylesheet · one load sequence (pill wipe,
 *                     blurred headline, rise) · responsive 320 → 1920px · reduced-motion respected.
 *   Fixed ........... the Google Font was loaded with a CSS @import inside a <style> tag (blocks rendering) → now
 *                     next/font (self-hosted, no layout shift).
 *   Different ....... shadcn Separator is not used any more (dividers are CSS borders). The banner button (Button),
 *                     the “Legal” chip (Badge) and the highlight cards (Card) are shadcn.
 *   New copy ........ the tagline “Free during beta.”, screen-reader labels, and the “keep reading” cards, which
 *                     replace your footer links (Terms of Service / Privacy Policy / Contact Us / back to home).
 *   Heads-up ........ this page says “Terms of Service”; the rest of the site says “Terms and Conditions”. Your FAQ
 *                     mentions paid plans and cancelling in account settings, while this page says OSHunt is free
 *                     during beta. Left as written — decide which is true.
 *
 * SEO — title + description in the server-rendered HTML
 *   A 'use client' page cannot export Next `metadata`, so the tab title is set in the browser instead.
 *   To have them in the HTML as well (search results, link previews), add app/refund/layout.tsx:
 *     import type { Metadata } from 'next';
 *     export const metadata: Metadata = {
 *       title: 'Refund Policy | OSHunt',
 *       description:
 *         'How refunds work for OSHunt — currently free during our open beta, ' +
 *         'with clear terms for when paid plans launch.',
 *     };
 *     export default function Layout({ children }: { children: React.ReactNode }) {
 *       return <>{children}</>;
 *     }
 *   (Your old page exported exactly this title and description.)
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

import {
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import Link from 'next/link';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpRight,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  CircleCheck,
  CircleDollarSign,
  CircleHelp,
  CircleSlash,
  Clock,
  FileText,
  Info,
  LifeBuoy,
  Link2,
  ListTree,
  LogOut,
  Mail,
  MessageSquareText,
  Printer,
  RefreshCw,
  Scale,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import HomeNav from '@/components/ui/HomeNav';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
// 2 · CONTENT
// This document's text — edit here. Add a clause by adding a section; numbering, the reading log, reading position and reading time follow.
// ════════════════════════════════════════════════════════════════════════════

/** Refund Policy — copy is unchanged from the original page. */
const doc: LegalDoc = {
  slug: 'refund',
  title: 'Refund Policy',
  tagline: 'Free during beta.',
  lead: (
    <>
      OSHunt is currently free to use during our open beta. This page explains where things stand today, and how
      refunds will work if and when paid plans launch.
    </>
  ),
  updated: SITE.lastUpdated,
  numbered: true,
  summary: (
    <>
      OSHunt is free right now, so there&apos;s nothing to refund. When that changes, you&apos;ll know before
      you&apos;re ever charged.
    </>
  ),
  highlights: [
    {
      icon: CircleDollarSign,
      title: 'Free During Beta',
      accent: '#a8ff3e',
      body: (
        <>
          OSHunt&apos;s core features don&apos;t cost anything right now. There&apos;s no purchase to make, so
          there&apos;s nothing to refund.
        </>
      ),
    },
    {
      icon: CircleSlash,
      title: 'No Charges, No Refunds',
      accent: '#61dafb',
      body: (
        <>
          Without a paid plan in place, we&apos;re not processing any payments — so a traditional refund process
          doesn&apos;t apply yet.
        </>
      ),
    },
    {
      icon: CalendarClock,
      title: 'Paid Plans Are Coming',
      accent: '#8b8cf9',
      body: (
        <>
          When we introduce paid plans, we&apos;ll publish clear refund terms here before any charges begin.
        </>
      ),
    },
  ],
  sections: [
    {
      id: 'current-pricing',
      title: 'Current Pricing',
      icon: CircleDollarSign,
      body: (
        <P>
          OSHunt&apos;s Issue Hunter and GitLense tools are free to use for individual contributors during this
          open beta period, as described in our <A href={ROUTES.terms}>Terms of Service</A>. We&apos;re not
          currently charging for access, and no payment information is collected to use the core product.
        </P>
      ),
    },
    {
      id: 'future-plans',
      title: 'Future Paid Plans',
      icon: CalendarClock,
      body: (
        <P>
          We plan to introduce paid plans in the future for teams or advanced features. When we do, pricing and
          any applicable refund terms will be presented clearly before you&apos;re ever charged, and we&apos;ll
          update this policy ahead of launch to reflect them.
        </P>
      ),
    },
    {
      id: 'charged-in-error',
      title: 'If You Were Charged in Error',
      icon: TriangleAlert,
      body: (
        <>
          <P>
            If you ever notice a charge from OSHunt that you don&apos;t recognize or believe was made in error,
            contact us right away. We&apos;ll look into it, and where a charge shouldn&apos;t have happened,
            we&apos;ll reverse it.
          </P>
          <Callout tone="warn" title="Think you were charged incorrectly?">
            Email us at <Email address={SITE.emails.hello} /> with as much detail as you can — we aim to respond
            within 24 hours.
          </Callout>
        </>
      ),
    },
    {
      id: 'cancelling',
      title: 'Cancelling Your Account',
      icon: LogOut,
      body: (
        <>
          <P>Because OSHunt is free, there&apos;s no subscription to cancel today. At any point, you can:</P>
          <UL
            items={[
              'Stop using OSHunt whenever you like — nothing to cancel, no charges to stop.',
              'Revoke GitHub OAuth access anytime from your GitHub account settings.',
              'Request full account deletion by emailing us, as described in our Terms of Service.',
            ]}
          />
        </>
      ),
    },
    {
      id: 'your-rights',
      title: 'Your Rights',
      icon: Scale,
      body: (
        <P>
          Nothing in this policy limits any rights you have under applicable consumer protection law. Where local
          law grants you a right that conflicts with something written here, the law prevails.
        </P>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to This Policy',
      icon: RefreshCw,
      body: (
        <P>
          We&apos;ll update this page as our pricing changes. When we do, we&apos;ll revise the &quot;Last
          updated&quot; date above, and for material changes — like the introduction of paid plans — we&apos;ll
          make a reasonable effort to notify users in advance.
        </P>
      ),
    },
    {
      id: 'contact',
      title: 'Contact',
      icon: Mail,
      body: (
        <P>
          Questions about this policy or a billing concern? Reach us at <Email address={SITE.emails.hello} />.
          For anything related to our Terms of Service, use <Email address={SITE.emails.legal} />.
        </P>
      ),
    },
  ],
  banner: {
    title: 'Have a billing question?',
    body: (
      <>
        We&apos;re a small team, so questions come straight to us — no ticket queue in between.
      </>
    ),
    email: SITE.emails.hello,
    note: 'Typical response time: under 24 hours',
  },
};

export default function RefundPage() {
  return <LegalDocument doc={doc} />;
}

// ════════════════════════════════════════════════════════════════════════════
// 3 · LAYOUT
// Hero, TL;DR, highlight cards, clauses, banner, “keep reading”.
// ════════════════════════════════════════════════════════════════════════════

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

const pad = (n: number) => String(n).padStart(2, '0');

/** "#61dafb" → "97 218 251", so a highlight's accent can be used with any alpha: rgb(var(--lg-c) / .2). */
function rgbTriplet(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : '168 255 62';
}

/* ── reading time, counted from the JSX itself so it never drifts from the copy ── */

type FactLike = { label?: ReactNode; value?: ReactNode };

function nodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(' ');
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode; items?: unknown[] };
    // <Facts items={[{ label, value }]}> and <UL items={[…]}> keep their text in `items`
    const items = Array.isArray(props.items)
      ? props.items
          .map((it) =>
            it && typeof it === 'object' && 'label' in it
              ? `${nodeText((it as FactLike).label)} ${nodeText((it as FactLike).value)}`
              : nodeText(it as ReactNode)
          )
          .join(' ')
      : '';
    return `${nodeText(props.children)} ${items}`;
  }
  return '';
}

function readingMinutes(doc: LegalDoc) {
  const text = [doc.lead, doc.summary, ...(doc.highlights ?? []).map((h) => h.body), ...doc.sections.map((s) => s.body)]
    .map(nodeText)
    .join(' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/* ── "keep reading" targets: the other pages, plus the contact page ── */

type Related = { slug: string; href: string; title: string; desc: string; icon: LucideIcon };

function relatedTo(slug: string): Related[] {
  return [
    ...PAGES.map((p) => ({ slug: p.slug, href: p.href, title: p.title, desc: p.desc, icon: p.icon })),
    { slug: 'contact', href: ROUTES.contact, title: 'Contact us', desc: 'Questions go straight to the team.', icon: LifeBuoy },
  ].filter((r) => r.slug !== slug);
}

/* ── toolbar pieces ── */

/** The reading percentage: written straight to the DOM by the reader, so scrolling never re-renders React. */
function Percent({ reader }: { reader: Reader }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { subscribe } = reader;
  useEffect(
    () =>
      subscribe((_pos, read) => {
        if (ref.current) ref.current.textContent = `${Math.round(read * 100)}%`;
      }),
    [subscribe]
  );
  return (
    <span ref={ref} className="lg-pct" aria-hidden="true">
      0%
    </span>
  );
}

function CopyPageLink() {
  const [copied, copy] = useCopy();
  return (
    <>
      <ToolButton
        label={copied ? 'Link copied' : 'Copy link to this page'}
        active={copied}
        onClick={() => {
          void copy(`${window.location.origin}${window.location.pathname}`);
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      </ToolButton>
      <span className="lg-sr-only" role="status">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </>
  );
}

/* ── one clause ── */

function AnchorButton({ id, title }: { id: string; title: string }) {
  const [copied, copy] = useCopy();
  return (
    <>
      <button
        type="button"
        className="lg-anchor"
        data-copied={copied ? 'true' : undefined}
        aria-label={copied ? `Link to “${title}” copied` : `Copy link to “${title}”`}
        onClick={() => {
          void copy(`${window.location.origin}${window.location.pathname}#${id}`);
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
      </button>
      <span className="lg-sr-only" role="status">
        {copied ? 'Link copied to clipboard' : ''}
      </span>
    </>
  );
}

function SectionBlock({
  section,
  index,
  numbered,
  flash,
}: {
  section: LegalSection;
  index: number;
  numbered?: boolean;
  flash: boolean;
}) {
  const Icon = section.icon;
  return (
    <section id={section.id} className="lg-sec" aria-labelledby={`${section.id}-title`} data-flash={flash ? 'true' : undefined}>
      <header className="lg-sec-head">
        <span className="lg-sec-tile" aria-hidden="true">
          <Icon />
        </span>
        <h2 className="lg-h2" id={`${section.id}-title`} tabIndex={-1}>
          {numbered && (
            <span className="lg-num" aria-hidden="true">
              {pad(index + 1)}
            </span>
          )}
          {section.title}
        </h2>
        <AnchorButton id={section.id} title={section.title} />
      </header>
      <div className="lg-prose">{section.body}</div>
    </section>
  );
}

/* ── the page ── */

function LegalDocument({ doc }: { doc: LegalDoc }) {
  usePageTitle(`${doc.title} | ${SITE.name}`);
  const rootRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const ids = useMemo(() => doc.sections.map((s) => s.id), [doc.sections]);
  const reader = useReader(ids, rootRef, articleRef);
  const minutes = useMemo(() => readingMinutes(doc), [doc]);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { select } = reader;

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  const goTo = useCallback(
    (index: number) => {
      const id = ids[index];
      const el = document.getElementById(id);
      if (!el) return;
      select(index);
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
      el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
      setFlash(id);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 2200);
    },
    [ids, select]
  );

  const email = doc.banner?.email ?? SITE.emails.hello;
  const related = relatedTo(doc.slug);
  const current = reader.active >= 0 ? doc.sections[reader.active] : null;
  const items = useMemo(() => doc.sections.map((s) => ({ id: s.id, title: s.title })), [doc.sections]);

  return (
    <LegalShell
      page={doc.slug}
      rootRef={rootRef}
      brand={{ title: 'Legal & help', sub: 'Terms, privacy, refunds and FAQ' }}
      menu={{
        label: 'On this page',
        title: 'On this page',
        description: `Sections of the ${doc.title}. Choose one to jump to it.`,
        badge: (
          <span className="lg-count" aria-hidden="true">
            {reader.active + 1}/{doc.sections.length}
          </span>
        ),
      }}
      progress
      panel={(ctx) => (
        <ReadingLog items={items} reader={reader} numbered={doc.numbered} onGo={(i) => ctx.run(() => goTo(i))} />
      )}
      footer={() => (
        <>
          <Button type="button" variant="outline" className="lg-btn lg-btn-line" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
            Print
          </Button>
          <Button asChild className="lg-btn lg-btn-lime">
            <a href={`mailto:${email}`}>
              <Mail aria-hidden="true" />
              Email us
            </a>
          </Button>
        </>
      )}
      strip={
        <p className="lg-now" key={current ? current.id : 'intro'}>
          {current && doc.numbered && (
            <span className="lg-now-no" aria-hidden="true">
              {pad(reader.active + 1)}
            </span>
          )}
          <span className="lg-now-title">{current ? current.title : doc.title}</span>
        </p>
      }
      tools={
        <>
          <Percent reader={reader} />
          <CopyPageLink />
          <ToolButton label="Print or save as PDF" onClick={() => window.print()}>
            <Printer aria-hidden="true" />
          </ToolButton>
        </>
      }
    >
      {/* ───────── hero ───────── */}
      <header className="lg-hero">
        <div className="lg-hero-in">
          <Badge variant="outline" className="lg-pill lg-wipe" style={delay(0)}>
            <Scale aria-hidden="true" />
            Legal
          </Badge>

          <h1 className="lg-h1">
            <span className="lg-h1-a lg-blur" style={delay(70)}>
              {doc.title}
            </span>{' '}
            <span className="lg-h1-b lg-blur" style={delay(160)}>
              {doc.tagline}
            </span>
          </h1>

          {doc.lead && (
            <p className="lg-lead lg-rise" style={delay(250)}>
              {doc.lead}
            </p>
          )}

          <ul className="lg-meta lg-rise" style={delay(330)}>
            <li>
              <CalendarDays aria-hidden="true" />
              Last updated {doc.updated}
            </li>
            {doc.effective && (
              <li>
                <CalendarCheck aria-hidden="true" />
                Effective {doc.effective}
              </li>
            )}
            <li>
              <Clock aria-hidden="true" />
              {minutes} min read
            </li>
          </ul>

          {doc.draft && (
            <div className="lg-draft lg-rise" style={delay(400)}>
              <Callout tone="warn" title="Draft for review">
                These terms are still being finalised and aren&apos;t in force yet. Check back soon for the final
                version.
              </Callout>
            </div>
          )}
        </div>
      </header>

      {/* ───────── tl;dr + at-a-glance ───────── */}
      {(doc.summary || doc.highlights) && (
        <div className="lg-glance">
          {doc.summary && (
            <div className="lg-tldr lg-rise" style={delay(430)} role="note">
              <span className="lg-tile" aria-hidden="true">
                <MessageSquareText />
              </span>
              <p>
                <strong>TL;DR —</strong> {doc.summary}
              </p>
            </div>
          )}

          {doc.highlights && <h2 className="lg-sr-only">At a glance</h2>}
          {doc.highlights && (
            <div className="lg-cards">
              {doc.highlights.map((h, i) => {
                const Icon = h.icon;
                return (
                  <Card
                    key={h.title}
                    className="lg-hl lg-spot lg-rise"
                    style={{ '--lg-c': rgbTriplet(h.accent), '--d': `${480 + i * 70}ms` } as CSSProperties}
                  >
                    <CardContent className="lg-hl-in">
                      <span className="lg-hl-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <h3 className="lg-hl-title">{h.title}</h3>
                      <p className="lg-hl-text">{h.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ───────── clauses ───────── */}
      <article ref={articleRef} className="lg-article">
        {doc.sections.map((s, i) => (
          <SectionBlock key={s.id} section={s} index={i} numbered={doc.numbered} flash={flash === s.id} />
        ))}

        {doc.banner && (
          <aside className="lg-compose" aria-labelledby="lg-compose-title">
            <div className="lg-compose-bar">
              <span className="lg-compose-title" id="lg-compose-title">
                <Mail aria-hidden="true" />
                {doc.banner.title}
              </span>
            </div>
            <div className="lg-compose-body">{doc.banner.body}</div>
            <div className="lg-compose-foot">
              {doc.banner.note ? <span className="lg-compose-note">{doc.banner.note}</span> : <span />}
              <Button asChild className="lg-btn lg-btn-lime">
                <a href={`mailto:${doc.banner.email}`}>
                  <Mail aria-hidden="true" />
                  Email {doc.banner.email}
                </a>
              </Button>
            </div>
          </aside>
        )}

        {doc.footnote && <div className="lg-footnote">{doc.footnote}</div>}
      </article>

      {/* ───────── keep reading ───────── */}
      <section className="lg-related" aria-labelledby="lg-related-title">
        <h2 id="lg-related-title" className="lg-related-title">
          Keep reading
        </h2>
        <div className="lg-related-grid">
          {related.map((r) => {
            const Icon = r.icon;
            return (
              <Link key={r.slug} href={r.href} className="lg-rel lg-spot">
                <span className="lg-tile" aria-hidden="true">
                  <Icon />
                </span>
                <span className="lg-rel-text">
                  <span className="lg-rel-title">{r.title}</span>
                  <span className="lg-rel-desc">{r.desc}</span>
                </span>
                <ArrowUpRight className="lg-rel-arrow" aria-hidden="true" />
              </Link>
            );
          })}
        </div>

        <div className="lg-foot">
          <Link href={ROUTES.home}>
            <ArrowLeft aria-hidden="true" />
            Back to OSHunt homepage
          </Link>
        </div>
      </section>
    </LegalShell>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4 · CHROME
// Skip link → your navbar → sidebar (reading log) + sticky toolbar + page, and the Sheet below 1024px. The navbar renders OUTSIDE .lg-root on purpose.
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
   Icon button with a tooltip (toolbar actions)
   ───────────────────────────────────────────────────────────── */

function ToolButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="lg-tool" aria-label={label} data-active={active ? 'true' : undefined} onClick={onClick}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className={cn('lg-tip', legalSans.variable, legalMono.variable)}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* ─────────────────────────────────────────────────────────────
   Reading log — the contents list.
   Every section is a step: read ✓, being read (pulsing), still to come (hollow).
   A lime line runs through the steps and fills as you scroll, so the list doubles as a progress bar.
   The same component lives in the sidebar (desktop) and in the sheet (phones, tablets).
   ───────────────────────────────────────────────────────────── */

function ReadingLog({
  items,
  reader,
  numbered,
  onGo,
}: {
  items: { id: string; title: string }[];
  reader: Reader;
  numbered?: boolean;
  onGo: (index: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const centers = useRef<number[]>([]);
  const pos = useRef(0);
  const { active, atEnd, subscribe } = reader;

  const place = useCallback((p: number) => {
    const ol = listRef.current;
    const c = centers.current;
    if (!ol || c.length < 2) return;
    const i = Math.min(Math.floor(p), c.length - 1);
    const next = c[Math.min(i + 1, c.length - 1)];
    ol.style.setProperty('--lg-log-fill', `${(c[i] + (next - c[i]) * (p - i) - c[0]).toFixed(1)}px`);
  }, []);

  // Where the centre of every step is — measured again whenever the list changes size (width, wrapped titles, fonts).
  useEffect(() => {
    const ol = listRef.current;
    if (!ol) return;
    const measure = () => {
      const top = ol.getBoundingClientRect().top;
      centers.current = Array.from(ol.querySelectorAll<HTMLElement>('.lg-log-node')).map((node) => {
        const r = node.getBoundingClientRect();
        return r.top - top + r.height / 2;
      });
      place(pos.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ol);
    return () => ro.disconnect();
  }, [items.length, place]);

  useEffect(
    () =>
      subscribe((p) => {
        pos.current = p;
        place(p);
      }),
    [subscribe, place]
  );

  // Keep the step being read in view when the list is taller than its panel.
  useEffect(() => {
    const link = listRef.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const scroller = link?.closest<HTMLElement>('.lg-panel-scroll');
    if (!link || !scroller || scroller.scrollHeight <= scroller.clientHeight) return;
    const s = scroller.getBoundingClientRect();
    const l = link.getBoundingClientRect();
    if (l.top < s.top + 8) scroller.scrollTop -= s.top + 8 - l.top;
    else if (l.bottom > s.bottom - 8) scroller.scrollTop += l.bottom - (s.bottom - 8);
  }, [active]);

  return (
    <nav className="lg-log" aria-label="On this page">
      <Caption
        aside={
          <span className="lg-count" aria-hidden="true">
            {active + 1} / {items.length}
          </span>
        }
      >
        On this page
      </Caption>
      <ol ref={listRef} className="lg-log-list">
        {items.map((s, i) => {
          const state = i < active || (atEnd && i === active) ? 'done' : i === active ? 'active' : 'todo';
          return (
            <li key={s.id} className="lg-log-item" data-state={state}>
              <a
                href={`#${s.id}`}
                className="lg-log-link"
                aria-current={i === active ? 'location' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onGo(i);
                }}
              >
                <span className="lg-log-node" aria-hidden="true">
                  {state === 'done' ? <Check strokeWidth={3} /> : state === 'active' ? <i className="lg-log-dot" /> : null}
                </span>
                {numbered && (
                  <span className="lg-log-no" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                )}
                <span className="lg-log-title">{s.title}</span>
                {state === 'done' && <span className="lg-sr-only"> (read)</span>}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
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
// Spotlight, scroll state, reading position, copy-to-clipboard, media query, tab title.
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

/* ─────────────────────────────────────────────────────────────
   Reader — where is the reader in a long document?

   · active   index of the section being read, or -1 while the intro is still on screen
              (React state, changes only at section borders)
   · pos      continuous position, e.g. 3.4 = 40% of the way from section 3 to section 4
   · read     0…1 across the whole article

   `pos` and `read` change every frame, so they are NOT React state: they are written to the
   `--lg-read` CSS variable and handed to subscribers (the contents list moves its line, the
   toolbar prints the percentage).

   The reading line sits at each section's own scroll-margin-top + 32px, so it stays right when
   the navbar height or the breakpoint layout changes. Reaching the bottom of the page always
   selects the last section, and a click on the contents locks the choice while the smooth
   scroll runs.
   ───────────────────────────────────────────────────────────── */

type ReaderListener = (pos: number, read: number) => void;

type Reader = {
  active: number;
  atEnd: boolean;
  select: (index: number) => void;
  subscribe: (fn: ReaderListener) => () => void;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function useReader(
  ids: readonly string[],
  rootRef: RefObject<HTMLElement | null>,
  articleRef: RefObject<HTMLElement | null>
): Reader {
  const [state, setState] = useState({ active: -1, atEnd: false });
  const listeners = useRef(new Set<ReaderListener>());
  const latest = useRef({ pos: 0, read: 0 });
  const lockUntil = useRef(0);
  const key = ids.join('|');

  useEffect(() => {
    const list = key ? key.split('|') : [];
    const root = rootRef.current;
    if (!list.length || !root) return;
    let raf = 0;

    const compute = () => {
      raf = 0;
      const els = list.map((id) => document.getElementById(id));
      if (els.some((el) => !el)) return;
      const tops = els.map((el) => (el as HTMLElement).getBoundingClientRect().top);
      const margin = parseFloat(getComputedStyle(els[0] as HTMLElement).scrollMarginTop) || 96;
      const line = margin + 32;
      const last = list.length - 1;
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

      let index = 0;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] <= line) index = i;
        else break;
      }
      if (atEnd) index = last;
      const active = tops[0] <= line || atEnd ? index : -1;

      let pos = 0;
      if (atEnd || index >= last) pos = last;
      else if (tops[0] <= line) pos = index + clamp01((line - tops[index]) / (tops[index + 1] - tops[index] || 1));

      let read = atEnd ? 1 : 0;
      const article = articleRef.current;
      if (article && !atEnd) {
        const r = article.getBoundingClientRect();
        const span = r.height - (window.innerHeight - line);
        read = span > 0 ? clamp01((line - r.top) / span) : 1;
      }

      latest.current = { pos, read };
      root.style.setProperty('--lg-read', read.toFixed(4));
      listeners.current.forEach((fn) => fn(pos, read));

      if (performance.now() >= lockUntil.current) {
        setState((s) => (s.active === active && s.atEnd === atEnd ? s : { active, atEnd }));
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Fonts and wrapped lines change section heights after the first paint.
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onScroll);
    if (ro && articleRef.current) ro.observe(articleRef.current);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [key, rootRef, articleRef]);

  const select = useCallback((index: number) => {
    lockUntil.current = performance.now() + 900;
    setState({ active: index, atEnd: false });
    window.setTimeout(() => window.dispatchEvent(new Event('scroll')), 950);
  }, []);

  const subscribe = useCallback((fn: ReaderListener) => {
    listeners.current.add(fn);
    fn(latest.current.pos, latest.current.read);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return { active: state.active, atEnd: state.atEnd, select, subscribe };
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
// Typographic building blocks used by the content: P, UL, A, Email, Callout, Facts, …
// ════════════════════════════════════════════════════════════════════════════

/**
 * Building blocks for legal copy. Section bodies are plain JSX made of these,
 * so editing a policy never means touching layout code.
 *
 * No hooks in here — safe to use from server or client modules.
 */

function P({ children }: { children?: ReactNode }) {
  return <p className="lg-p">{children}</p>;
}

function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="lg-ul">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/** Link that picks next/link, mailto or a new-tab external link by itself. */
function A({ href, children, mono }: { href: string; children: ReactNode; mono?: boolean }) {
  const className = cn('lg-link', mono && 'lg-mono');
  if (href.startsWith('mailto:')) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    );
  }
  if (/^https?:\/\//.test(href)) {
    return (
      <a className={className} href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

/** An email address as a monospace mailto link. */
function Email({ address }: { address: string }) {
  return (
    <A href={`mailto:${address}`} mono>
      {address}
    </A>
  );
}

type Tone = 'info' | 'warn' | 'success' | 'neutral';

const CALLOUT_ICON: Record<Tone, LucideIcon> = {
  info: Info,
  warn: TriangleAlert,
  success: CircleCheck,
  neutral: Info,
};

/** A boxed note. The tone changes colour and icon, and the title says what it is, so it never relies on colour alone. */
function Callout({
  tone = 'info',
  icon,
  title,
  children,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  title?: ReactNode;
  children: ReactNode;
}) {
  const Icon = icon ?? CALLOUT_ICON[tone];
  return (
    <div className="lg-callout" data-tone={tone} role="note">
      <span className="lg-callout-icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="lg-callout-body">
        {title ? <p className="lg-callout-title">{title}</p> : null}
        <div className="lg-callout-text">{children}</div>
      </div>
    </div>
  );
}

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
// 7 · TYPES
// Shape of a LegalDoc.
// ════════════════════════════════════════════════════════════════════════════

/** One clause / section of a legal document. `body` is plain JSX built from the primitives (P, UL, Callout, …) below. */
type LegalSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  body: ReactNode;
};

/** One of the "at a glance" cards (used by the refund policy). */
type LegalHighlight = {
  icon: LucideIcon;
  title: string;
  /** A hex colour such as '#61dafb'. Drives the icon tint and the spotlight on hover. */
  accent: string;
  body: ReactNode;
};

type LegalBanner = {
  title: string;
  body: ReactNode;
  /** Primary action — a mailto link. */
  email: string;
  note?: string;
};

type LegalDoc = {
  slug: 'terms' | 'privacy' | 'refund';
  /** First (white) line of the headline. */
  title: string;
  /** Second (grey) line of the headline. */
  tagline: string;
  lead?: ReactNode;
  updated: string;
  effective?: string;
  /** Show clause numbers (1, 2, 3 …) in the contents list and headings. */
  numbered?: boolean;
  /** TL;DR banner under the hero. */
  summary?: ReactNode;
  highlights?: LegalHighlight[];
  sections: LegalSection[];
  /** "Questions?" call-to-action at the end of the article. */
  banner?: LegalBanner;
  /** A quiet closing note (used instead of the banner on the privacy policy). */
  footnote?: ReactNode;
  /** Show the amber "draft" notice. */
  draft?: boolean;
};

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
.lg-sheet,
.lg-tip {
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

  /* tooltip — extra space between a toolbar button and its tooltip, ON TOP of what your tooltip.tsx adds itself.
     The page no longer passes sideOffset (your TooltipContent does not accept it), so tooltip.tsx decides the gap.
     If the tooltip sits flush against the button, raise this to 6px. */
  --lg-tip-gap: 0px;

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

:where(.lg-root, .lg-sheet, .lg-tip),
:where(.lg-root, .lg-sheet, .lg-tip) :where(*, *::before, *::after) {
  box-sizing: border-box;
}
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
@keyframes lg-swap {
  from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes lg-pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(var(--lg-accent-rgb) / 0.55);
  }
  70%,
  100% {
    box-shadow: 0 0 0 7px rgb(var(--lg-accent-rgb) / 0);
  }
}
@keyframes lg-flash {
  0% {
    box-shadow: 0 0 0 0 rgb(var(--lg-accent-rgb) / 0.5);
    background-color: rgb(var(--lg-accent-rgb) / 0.22);
  }
  100% {
    box-shadow: 0 0 0 12px rgb(var(--lg-accent-rgb) / 0);
    background-color: rgb(255 255 255 / 0.04);
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

.lg-log-list {
  --lg-pad-y: 8px;
  position: relative;
}
.lg-log-item {
  position: relative;
}
/* the track: one segment from each step to the next */
.lg-log-item::before {
  content: '';
  position: absolute;
  left: 17px;
  top: calc(var(--lg-pad-y) + 10px);
  width: 1px;
  height: 100%;
  background: var(--lg-hair-3);
}
.lg-log-item:last-child::before {
  display: none;
}
/* the fill: a lime line from the first step to wherever you are; the height is written by the reader hook */
.lg-log-list::after {
  content: '';
  position: absolute;
  left: 16.5px;
  top: calc(var(--lg-pad-y) + 10px);
  width: 2px;
  height: var(--lg-log-fill, 0px);
  max-height: calc(100% - 2 * var(--lg-pad-y) - 20px);
  border-radius: 2px;
  background: var(--lg-accent);
  box-shadow: 0 0 10px rgb(var(--lg-accent-rgb) / 0.55);
  pointer-events: none;
}
.lg-log-link {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: var(--lg-pad-y) 10px var(--lg-pad-y) 8px;
  border-radius: var(--lg-r-sm);
  color: var(--lg-text-3);
  font-size: 13.5px;
  line-height: 20px;
  transition: background-color 0.2s, color 0.2s;
}
.lg-log-link:hover {
  background: var(--lg-hover);
  color: var(--lg-text);
}
.lg-log-item[data-state='done'] .lg-log-link {
  color: var(--lg-text-2);
}
.lg-log-item[data-state='active'] .lg-log-link {
  background: rgb(255 255 255 / 0.06);
  color: var(--lg-text);
  font-weight: 500;
}
.lg-log-node {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border: 1.5px solid rgb(255 255 255 / 0.22);
  border-radius: 50%;
  background: var(--lg-rail);
  color: var(--lg-accent-ink);
  transition: background-color 0.3s var(--lg-ease), border-color 0.3s var(--lg-ease);
}
.lg-log-node > svg {
  width: 10px;
  height: 10px;
}
.lg-log-item[data-state='done'] .lg-log-node {
  border-color: var(--lg-accent);
  background: var(--lg-accent);
}
.lg-log-item[data-state='active'] .lg-log-node {
  border-color: var(--lg-accent);
}
.lg-log-dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--lg-accent);
  animation: lg-pulse 1.8s ease-out infinite;
}
.lg-log-no {
  flex: none;
  min-width: 1.6em;
  padding-top: 1px;
  color: var(--lg-text-4);
  font-family: var(--lg-mono);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.lg-log-title {
  min-width: 0;
  text-wrap: pretty;
}

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

.lg-now {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  animation: lg-swap 0.32s var(--lg-ease);
}
.lg-now-no {
  flex: none;
  color: var(--lg-text-4);
  font-family: var(--lg-mono);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}
.lg-now-title {
  min-width: 0;
  overflow: hidden;
  color: var(--lg-text);
  font-size: 13.5px;
  font-weight: 500;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lg-pct {
  min-width: 3.4ch;
  padding-right: 6px;
  color: var(--lg-text-3);
  font-family: var(--lg-mono);
  font-size: 12px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.lg-tool {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: var(--lg-r-sm);
  color: var(--lg-text-3);
  transition: background-color 0.2s, color 0.2s;
}
.lg-tool > svg {
  width: 17px;
  height: 17px;
}
.lg-tool:hover {
  background: var(--lg-press);
  color: var(--lg-text);
}
.lg-tool[data-active='true'] {
  color: var(--lg-accent);
}

/* ───────────────────────── tiles (the 36px icon square used everywhere) ───────────────────────── */

.lg-tile,
.lg-sec-tile {
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
.lg-tile > svg,
.lg-sec-tile > svg {
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

.lg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}
.lg-meta > li {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-sm);
  background: var(--lg-field);
  color: var(--lg-text-3);
  font-family: var(--lg-mono);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}
.lg-meta > li > svg {
  flex: none;
  width: 13px;
  height: 13px;
}
.lg-draft {
  max-width: 36rem;
  margin-top: 22px;
}

/* ───────────────────────── tl;dr + at-a-glance cards ───────────────────────── */

.lg-glance {
  display: grid;
  gap: 12px;
  width: min(100%, var(--lg-wrap));
  margin-inline: auto;
  padding: 8px var(--lg-gutter) 0;
}
.lg-tldr {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-xl);
  background: linear-gradient(90deg, rgb(var(--lg-accent-rgb) / 0.07), transparent 65%), var(--lg-raise);
}
.lg-tldr .lg-tile {
  border-color: rgb(var(--lg-accent-rgb) / 0.26);
  background: rgb(var(--lg-accent-rgb) / 0.1);
  color: var(--lg-accent);
}
.lg-tldr > p {
  min-width: 0;
  max-width: calc(var(--lg-measure) * 0.94); /* 15px type, so a slightly narrower measure keeps the same line length */
  padding-top: 7px;
  color: var(--lg-text-2);
  font-size: 15px;
  line-height: 1.65;
  text-wrap: pretty;
}
.lg-tldr strong {
  color: var(--lg-text);
  font-weight: 600;
}

.lg-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14.5rem), 1fr));
  gap: 12px;
}
/* shadcn <Card> wearing the Hunt TemplateCard skin */
.lg-root .lg-hl.lg-spot {
  gap: 0;
  padding: 0;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-xl);
  background: var(--lg-raise);
  color: var(--lg-text-2);
  box-shadow: none;
  overflow: hidden;
  transition: border-color 0.3s var(--lg-ease), translate 0.3s var(--lg-ease);
}
.lg-root .lg-hl .lg-hl-in {
  padding: 18px;
}
.lg-hl-icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgb(var(--lg-c, var(--lg-accent-rgb)) / 0.26);
  border-radius: var(--lg-r-md);
  background: rgb(var(--lg-c, var(--lg-accent-rgb)) / 0.12);
  color: rgb(var(--lg-c, var(--lg-accent-rgb)));
}
.lg-hl-icon > svg {
  width: 18px;
  height: 18px;
}
.lg-hl-title {
  margin-top: 14px;
  color: var(--lg-text);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.lg-hl-text {
  margin-top: 6px;
  color: var(--lg-text-2);
  font-size: 14.5px;
  line-height: 1.65;
  text-wrap: pretty;
}

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

.lg-article {
  width: min(100%, var(--lg-wrap));
  margin-inline: auto;
  padding: clamp(32px, 5vw, 56px) var(--lg-gutter) 0;
}
.lg-sec {
  position: relative;
  padding-block: clamp(26px, 4vw, 40px);
  border-top: 1px solid var(--lg-hair);
  scroll-margin-top: var(--lg-anchor-y);
}
.lg-sec:first-child {
  padding-top: 0;
  border-top: 0;
}
.lg-sec-head {
  display: flex;
  align-items: center;
  gap: 14px;
}
.lg-h2 {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--lg-text);
  font-size: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
  text-wrap: balance;
  outline: 0;
}
.lg-num {
  margin-right: 10px;
  color: var(--lg-text-4);
  font-family: var(--lg-mono);
  font-size: 0.62em;
  font-weight: 500;
  letter-spacing: 0;
  vertical-align: 0.18em;
  font-variant-numeric: tabular-nums;
}
.lg-anchor {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--lg-r-sm);
  color: var(--lg-text-4);
  transition: opacity 0.2s, background-color 0.2s, color 0.2s;
}
.lg-anchor > svg {
  width: 16px;
  height: 16px;
}
.lg-anchor:hover {
  background: var(--lg-press);
  color: var(--lg-text);
}
.lg-anchor[data-copied='true'] {
  color: var(--lg-accent);
}
@media (hover: hover) and (pointer: fine) {
  .lg-anchor {
    opacity: 0;
  }
  .lg-sec-head:hover .lg-anchor,
  .lg-anchor:focus-visible,
  .lg-anchor[data-copied='true'] {
    opacity: 1;
  }
}
/* answers a click in the contents list: the tile flashes where you landed */
.lg-sec[data-flash='true'] .lg-sec-tile {
  border-color: rgb(var(--lg-accent-rgb) / 0.4);
  color: var(--lg-accent);
  animation: lg-flash 1.6s var(--lg-ease) 1;
}

.lg-prose {
  max-width: calc(var(--lg-measure) + 50px);
  margin-top: 18px;
  padding-left: 50px;
}
.lg-prose > * + * {
  margin-top: 1rem;
}
.lg-prose strong {
  color: var(--lg-text);
  font-weight: 600;
}
.lg-p {
  color: var(--lg-text-2);
  font-size: 1rem;
  line-height: 1.75;
  text-wrap: pretty;
}
.lg-ul {
  display: grid;
  gap: 0.65rem;
}
.lg-ul > li {
  position: relative;
  padding-left: 1.6rem;
  color: var(--lg-text-2);
  line-height: 1.7;
  text-wrap: pretty;
}
.lg-ul > li::before {
  content: '';
  position: absolute;
  left: 0.3rem;
  top: 0.72em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--lg-text-4);
}

.lg-root .lg-link {
  color: var(--lg-text);
  text-decoration: underline;
  text-decoration-color: rgb(var(--lg-accent-rgb) / 0.5);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: color 0.2s, text-decoration-color 0.2s;
}
.lg-root .lg-link:hover {
  color: var(--lg-accent);
  text-decoration-color: var(--lg-accent);
}
.lg-root .lg-link.lg-mono {
  font-family: var(--lg-mono);
  font-size: 0.9em;
  overflow-wrap: anywhere;
}

/* ───────────────────────── callout + facts ───────────────────────── */

.lg-callout {
  --lg-tone: 97 218 251;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgb(var(--lg-tone) / 0.24);
  border-radius: var(--lg-r-lg);
  background: rgb(var(--lg-tone) / 0.06);
}
.lg-callout[data-tone='warn'] {
  --lg-tone: 245 185 66;
}
.lg-callout[data-tone='success'] {
  --lg-tone: 168 255 62;
}
.lg-callout[data-tone='neutral'] {
  --lg-tone: 255 255 255;
}
.lg-callout-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--lg-r-sm);
  background: rgb(var(--lg-tone) / 0.14);
  color: rgb(var(--lg-tone));
}
.lg-callout-icon > svg {
  width: 16px;
  height: 16px;
}
.lg-callout-body {
  min-width: 0;
  padding-top: 3px;
}
.lg-callout-title {
  color: var(--lg-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}
.lg-callout-title + .lg-callout-text {
  margin-top: 2px;
}
.lg-callout-text {
  color: var(--lg-text-2);
  font-size: 14px;
  line-height: 1.65;
  text-wrap: pretty;
}

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
.lg-compose-note {
  color: var(--lg-text-3);
  font-family: var(--lg-mono);
  font-size: 12px;
  line-height: 1.4;
}

.lg-footnote {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--lg-hair);
  color: var(--lg-text-3);
  font-size: 13.5px;
  line-height: 1.7;
  text-wrap: pretty;
}

/* ───────────────────────── keep reading ───────────────────────── */

.lg-related {
  width: min(100%, var(--lg-wrap));
  margin-inline: auto;
  padding: clamp(40px, 6vw, 72px) var(--lg-gutter) 0;
}
.lg-related-title {
  margin-bottom: 14px;
  color: var(--lg-text);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.lg-related-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
@container lgmain (min-width: 34rem) {
  .lg-related-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.lg-root .lg-rel {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--lg-hair-2);
  border-radius: var(--lg-r-lg);
  background: var(--lg-raise);
  transition: border-color 0.3s var(--lg-ease), translate 0.3s var(--lg-ease);
}
.lg-root .lg-rel:hover {
  border-color: var(--lg-hair-3);
}
.lg-rel-text {
  display: grid;
  flex: 1 1 auto;
  gap: 2px;
  min-width: 0;
}
.lg-rel-title {
  color: var(--lg-text);
  font-size: 14.5px;
  font-weight: 600;
  line-height: 1.35;
}
.lg-rel-desc {
  color: var(--lg-text-3);
  font-size: 13px;
  line-height: 1.45;
}
.lg-rel-arrow {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--lg-text-4);
  transition: color 0.2s, transform 0.3s var(--lg-ease);
}
.lg-rel:hover .lg-rel-arrow {
  color: var(--lg-accent);
  transform: translate(2px, -2px);
}
.lg-foot {
  margin-top: 24px;
}
.lg-foot > a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: var(--lg-text-3);
  font-size: 13.5px;
  font-weight: 500;
  transition: color 0.2s;
}
.lg-foot > a > svg {
  width: 15px;
  height: 15px;
  transition: transform 0.3s var(--lg-ease);
}
.lg-foot > a:hover {
  color: var(--lg-text);
}
.lg-foot > a:hover > svg {
  transform: translateX(-3px);
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
/* shadcn <Input> with its own border, ring and background switched off (the wrapper draws them) */

/* ───────────────────────── FAQ · sidebar controls ───────────────────────── */

/* a radio list with a sliding thumb (Hunt's segmented control, stacked) */

/* toolbar summary: count, topic, search term */

/* ───────────────────────── FAQ · the list (shadcn <Accordion> as Hunt's raised list) ───────────────────────── */
/* the lime bar on the open row */
/* the chevron shadcn ships (always the last child of the trigger) */

/* the answer's height animation (does not depend on tailwindcss-animate / tw-animate-css being present) */

/* what the search matched */

/* nothing matched */

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

/* ───────────────────────── tooltip (shadcn <Tooltip>, no arrow) ───────────────────────── */

.lg-tip.lg-tip {
  padding: 6px 10px;
  border: 1px solid var(--lg-hair-3);
  border-radius: var(--lg-r-sm);
  background: #161616;
  color: #f2f2f2;
  box-shadow: 0 12px 28px -10px rgb(0 0 0 / 0.85);
  font-family: var(--lg-sans);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.3;
}
.lg-tip.lg-tip svg {
  display: none;
}
/* the gap to the button is --lg-tip-gap (0 by default); only tooltips that report their side (Radix) get it */
.lg-tip.lg-tip[data-side='bottom'] {
  margin-top: var(--lg-tip-gap);
}
.lg-tip.lg-tip[data-side='top'] {
  margin-bottom: var(--lg-tip-gap);
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
  .lg-prose {
    max-width: var(--lg-measure);
    padding-left: 0;
  }
  .lg-sec-head {
    gap: 12px;
  }
  .lg-compose-foot {
    align-items: stretch;
  }
  .lg-compose-foot > .lg-btn {
    width: 100%;
  }
  .lg-compose-foot > .lg-btn {
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
  .lg-tldr {
    padding: 14px;
  }
}

@media (max-width: 479px) {
  .lg-bar-in {
    gap: 6px;
  }
  .lg-pct {
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
  .lg-tool,
.lg-anchor {
    width: 40px;
    height: 40px;
  }
  .lg-menu {
    height: 40px;
  }
  .lg-pagelink {
    height: 44px;
  }
  .lg-log-list {
    --lg-pad-y: 11px;
  }
}

/* ───────────────────────── reduced motion: no entrances, no beam, no slide, no tween ───────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .lg-root *,
  .lg-root *::before,
  .lg-root *::after,
  .lg-sheet,
  .lg-sheet *,
  .lg-tip {
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
.lg-anchor,
.lg-sheet,
.lg-compose-foot,
.lg-foot,
.lg-related,
.lg-hero::before,
.lg-hero::after {
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
.lg-h2,
.lg-hl-title,
.lg-callout-title,
.lg-tldr strong,
.lg-prose strong,
.lg-root .lg-link,
.lg-compose-title {
    color: #000 !important;
  }
  .lg-h1-b,
.lg-lead,
.lg-p,
.lg-ul > li,
.lg-hl-text,
.lg-callout-text,
.lg-tldr > p,
.lg-compose-body,
.lg-footnote,
.lg-meta > li {
    color: #333 !important;
  }
  .lg-tldr,
.lg-hl,
.lg-callout,
.lg-compose,
.lg-meta > li {
    background: #fff !important;
    border-color: #bbb !important;
  }
  .lg-sec,
.lg-footnote,
.lg-compose-bar {
    border-color: #ccc !important;
  }
  .lg-sec,
.lg-hl,
.lg-callout,
.lg-compose {
    break-inside: avoid;
  }
  .lg-h2 {
    break-after: avoid;
  }
  .lg-sec-tile,
  .lg-tile,
  .lg-hl-icon,
  .lg-callout-icon {
    display: none !important;
  }
  .lg-prose {
    max-width: none;
    padding-left: 0;
  }
  .lg-root a[href^='http']::after {
    content: ' (' attr(href) ')';
    color: #555;
    font-size: 0.85em;
    word-break: break-all;
  }
}
`;