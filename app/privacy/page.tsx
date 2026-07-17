"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Database,
  Workflow,
  KeyRound,
  Sparkles,
  Lock,
  Cookie,
  Puzzle,
  Scale,
  Clock,
  Baby,
  RefreshCw,
  Mail,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dropping this into the real Next.js project: restore
 * `import Navbar from "@/components/ui/HomeNav";` and render <Navbar /> —
 * omitted here only so this file renders standalone as a preview.
 *
 * Note: the original had a "storage" entry in its section list ("Data
 * Storage & Security") with no matching <Section id="storage"> anywhere
 * in the page — its content was folded into the Gemini section instead.
 * That meant clicking it in the sidebar/dropdown did nothing. Split it
 * into its own section below so every nav item actually scrolls somewhere.
 */

const SECTIONS = [
  { id: "overview", title: "Overview", Icon: FileText },
  { id: "collection", title: "Information We Collect", Icon: Database },
  { id: "usage", title: "How We Use It", Icon: Workflow },
  { id: "github", title: "GitHub OAuth & Permissions", Icon: KeyRound },
  { id: "gemini", title: "AI Processing & Gemini", Icon: Sparkles },
  { id: "storage", title: "Data Storage & Security", Icon: Lock },
  { id: "cookies", title: "Cookies & Tracking", Icon: Cookie },
  { id: "third-party", title: "Third-Party Services", Icon: Puzzle },
  { id: "rights", title: "Your Rights & Controls", Icon: Scale },
  { id: "retention", title: "Data Retention", Icon: Clock },
  { id: "children", title: "Children's Privacy", Icon: Baby },
  { id: "changes", title: "Changes to This Policy", Icon: RefreshCw },
  { id: "contact", title: "Contact", Icon: Mail },
];

function P({ children }) {
  return <p className="policy-p">{children}</p>;
}

function Highlight({ label, value, positive }) {
  return (
    <div className="highlight-row">
      <div className="highlight-label">
        <span className={`highlight-check${positive ? " positive" : ""}`}>
          <Check size={10} strokeWidth={3} aria-hidden="true" />
        </span>
        {label}
      </div>
      <span className={`highlight-value${positive ? " positive" : ""}`}>{value}</span>
    </div>
  );
}

function Section({ id, title, Icon, children }) {
  return (
    <div id={id} className="policy-section">
      <div className="policy-section-head">
        <div className="policy-section-bar" />
        {Icon && <Icon size={15} strokeWidth={2} className="policy-section-icon" aria-hidden="true" />}
        <h2 className="policy-h2">{title}</h2>
      </div>
      {children}
      <Separator className="policy-sep" style={{ backgroundColor: "var(--border)" }} />
    </div>
  );
}

export default function PrivacyPage() {
  const [active, setActive] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let ticking = false;
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
      setShowBackToTop(scrollTop > 480);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  };

  const activeSection = SECTIONS.find((s) => s.id === active);

  return (
    <div className="oshunt-privacy">
      <style>{`
        .oshunt-privacy {
          --bg: #090909;
          --surface: #0e0e0e;
          --surface-2: #141414;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.16);
          --accent: #a8ff3e;
          --accent-ink: #0a0a0a;
          --accent-dim: rgba(168,255,62,0.10);
          --accent-border: rgba(168,255,62,0.28);
          --text: #f2f2f2;
          --text-dim: #8c8c8c;
          --text-faint: #5e5e5e;
          --font-display: 'Outfit', ui-sans-serif, system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-display);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .oshunt-privacy *, .oshunt-privacy *::before, .oshunt-privacy *::after { box-sizing: border-box; }
        .oshunt-privacy a { color: inherit; }
        .oshunt-privacy button { font-family: inherit; }
        .oshunt-privacy :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

        .progress-rail { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.04); z-index: 60; }
        .progress-bar { height: 100%; background: var(--accent); width: 0%; }
        @media (prefers-reduced-motion: no-preference) { .progress-bar { transition: width .1s linear; } }

        .container { max-width: 1060px; margin: 0 auto; }

        @media (prefers-reduced-motion: no-preference) {
          .fade-in { opacity: 0; transform: translateY(10px); animation: fadeIn .5s ease forwards; }
          @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
        }

        /* ---------- header ---------- */
        .page-header { padding: clamp(76px, 10vw, 104px) clamp(18px, 4vw, 48px) clamp(28px, 4vw, 44px); }
        .eyebrow-label { font-size: 10.5px; font-weight: 600; color: var(--text-faint); letter-spacing: 0.09em; text-transform: uppercase; margin: 0 0 10px; }
        .h1-page { font-size: clamp(1.8rem, 1.3rem + 2vw, 2.6rem); font-weight: 800; letter-spacing: -0.03em; line-height: 1.08; margin: 0 0 14px; }
        .meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
        .meta-badge { font-size: 11px !important; font-weight: 500; }

        /* ---------- mobile TOC dropdown ---------- */
        .mobile-toc { display: block; padding: 0 clamp(18px, 4vw, 48px) 24px; }
        @media (min-width: 1024px) { .mobile-toc { display: none; } }
        .mobile-toc-trigger {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px;
          cursor: pointer; color: var(--text-dim); font-size: 13px; transition: border-color .2s ease;
        }
        .mobile-toc-trigger:hover { border-color: var(--border-hover); }
        .mobile-toc-trigger.open { border-radius: 10px 10px 0 0; }
        .mobile-toc-current { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .mobile-toc-current span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .mobile-toc-panel { background: var(--surface); border: 1px solid var(--border); border-top: none; border-radius: 0 0 10px 10px; overflow: hidden; max-height: 340px; overflow-y: auto; }
        .mobile-toc-item {
          all: unset; box-sizing: border-box; cursor: pointer; width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 11px 16px; font-size: 13px; color: var(--text-faint); border-bottom: 1px solid var(--border);
          border-left: 3px solid transparent; transition: all .15s ease;
        }
        .mobile-toc-item:last-child { border-bottom: none; }
        .mobile-toc-item:hover { color: var(--text-dim); background: rgba(255,255,255,0.02); }
        .mobile-toc-item.active { color: var(--text); background: var(--surface-2); border-left-color: var(--accent); }
        .mobile-toc-item svg { flex-shrink: 0; color: var(--text-faint); }
        .mobile-toc-item.active svg { color: var(--accent); }

        /* ---------- layout ---------- */
        .layout { padding: 0 clamp(18px, 4vw, 48px) clamp(64px, 8vw, 100px); display: flex; gap: 56px; align-items: flex-start; }

        /* ---------- sidebar (desktop) ---------- */
        .sidebar { display: none; }
        @media (min-width: 1024px) {
          .sidebar { display: block; width: 216px; flex-shrink: 0; position: sticky; top: 28px; max-height: calc(100vh - 56px); overflow-y: auto; }
        }
        .sidebar-label { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px; font-weight: 600; }
        .toc-list { display: flex; flex-direction: column; gap: 2px; }
        .toc-btn {
          display: flex; align-items: center; gap: 9px; background: none; border: none; cursor: pointer;
          text-align: left; padding: 7px 10px; border-radius: 6px; font-size: 12.5px; font-family: inherit;
          color: var(--text-faint); border-left: 2px solid transparent; transition: all .15s ease;
        }
        .toc-btn:hover:not(.active) { color: var(--text-dim); background: rgba(255,255,255,0.03); }
        .toc-btn.active { color: var(--text-dim); background: var(--surface); border-left-color: var(--accent); }
        .toc-btn svg { flex-shrink: 0; color: var(--text-faint); }
        .toc-btn.active svg { color: var(--accent); }
        .toc-btn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ---------- main content ---------- */
        .main-content { flex: 1; min-width: 0; }
        .policy-section { scroll-margin-top: 88px; }
        .policy-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .policy-section-bar { width: 3px; height: 20px; background: var(--accent); border-radius: 2px; flex-shrink: 0; }
        .policy-section-icon { color: var(--accent); flex-shrink: 0; opacity: 0.85; }
        .policy-h2 { font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; margin: 0; }
        .policy-p { font-size: 14px; color: var(--text-dim); line-height: 1.85; margin: 0 0 16px; }
        .policy-p:last-of-type { margin-bottom: 0; }
        .policy-sep { margin-top: 24px !important; }
        .policy-link { color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent-border); transition: border-color .2s ease; }
        .policy-link:hover { border-bottom-color: var(--accent); }
        .mono-link { font-family: var(--font-mono); font-size: 13px; }

        /* ---------- highlight rows ---------- */
        .highlight-group { margin: 22px 0; display: flex; flex-direction: column; gap: 8px; }
        .highlight-row {
          display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          transition: border-color .2s ease;
        }
        .highlight-row:hover { border-color: var(--border-hover); }
        .highlight-label { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--text-faint); }
        .highlight-check {
          width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); color: var(--text-faint); flex-shrink: 0;
        }
        .highlight-check.positive { background: var(--accent-dim); color: var(--accent); }
        .highlight-value { font-size: 12.5px; color: var(--text-dim); font-weight: 500; text-align: right; }
        .highlight-value.positive { color: var(--accent); font-weight: 600; }

        /* ---------- disclaimer card ---------- */
        .disclaimer-card { margin-top: 44px; border-radius: 12px; }
        .disclaimer-card p { font-size: 12px; color: var(--text-faint); line-height: 1.75; margin: 0; }
        .disclaimer-card strong { color: var(--text-dim); font-weight: 600; }

        /* ---------- back to top ---------- */
        .back-to-top {
          position: fixed; right: 20px; bottom: 20px; z-index: 40; cursor: pointer;
          transition: all .2s ease; box-shadow: 0 8px 24px -8px rgba(0,0,0,0.6);
        }
        .back-to-top:hover { border-color: var(--accent-border) !important; color: var(--accent) !important; transform: translateY(-2px); }
      `}</style>

      {/* reading progress */}
      <div className="progress-rail" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
      </div>

      {/* PAGE HEADER */}
      <div className="container page-header fade-in">
        <p className="eyebrow-label">Legal</p>
        <h1 className="h1-page">Privacy Policy</h1>
        <div className="meta-row">
          <Badge variant="outline" className="meta-badge" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-faint)" }}>
            Last updated: June 15, 2025
          </Badge>
          <Badge variant="outline" className="meta-badge" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", color: "var(--text-faint)" }}>
            Effective: June 15, 2025
          </Badge>
        </div>
      </div>

      {/* MOBILE TOC */}
      <div className="mobile-toc container">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className={`mobile-toc-trigger${menuOpen ? " open" : ""}`}
          aria-expanded={menuOpen}
        >
          <span className="mobile-toc-current">
            Jump to:&nbsp;
            <span style={{ color: "var(--accent)" }}>{activeSection?.title}</span>
          </span>
          {menuOpen ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>
        {menuOpen && (
          <div className="mobile-toc-panel">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`mobile-toc-item${active === s.id ? " active" : ""}`}
              >
                <s.Icon size={14} strokeWidth={2} aria-hidden="true" />
                {s.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="container layout">
        {/* SIDEBAR — desktop only */}
        <aside className="sidebar">
          <p className="sidebar-label">On this page</p>
          <div className="toc-list">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`toc-btn${active === s.id ? " active" : ""}`}
              >
                <s.Icon size={13} strokeWidth={2} aria-hidden="true" />
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* CONTENT */}
        <main className="main-content">
          <Section id="overview" title="Overview" Icon={FileText}>
            <P>
              OSHunt is built by developers, for developers — and that means we&apos;re deliberate about
              privacy. This policy explains what data we collect when you use OSHunt, why we collect it, what
              we do with it, and what control you have over it. We collect the minimum needed to make the
              product work, we don&apos;t sell your data, and we don&apos;t share it with advertisers.
            </P>
            <P>
              This policy covers all OSHunt services — including Issue Hunter, GitLense, and any associated
              web properties under oshunt.io.
            </P>
          </Section>

          <Section id="collection" title="Information We Collect" Icon={Database}>
            <P>
              We collect two categories of information — what you give us directly and what we observe from
              your use of the platform.
            </P>
            <P>
              When you sign in via GitHub OAuth, we receive your public GitHub profile: name, email address,
              username, avatar, and a list of your public repositories. We use this to set up your account and
              power the stack-matching logic in Issue Hunter. We also collect any stack preferences, use-case
              selections, or newsletter preferences you set during onboarding.
            </P>
            <P>
              On the usage side, we log basic activity — which features you use, errors that occur during
              sessions, and general analytics like session duration and page views.
            </P>
            <div className="highlight-group">
              <Highlight label="GitHub name & email" value="Collected at sign-in via OAuth" />
              <Highlight label="Public repositories" value="Read-only, used for stack matching" />
              <Highlight label="Stack preferences" value="Set by you during onboarding" />
              <Highlight label="Usage analytics" value="Aggregated, not sold or shared" />
              <Highlight label="GitHub password" value="Never collected — ever" positive />
            </div>
          </Section>

          <Section id="usage" title="How We Use It" Icon={Workflow}>
            <P>
              The data we collect serves one purpose: making OSHunt actually useful to you. Your GitHub
              profile and declared tech stack power Issue Hunter&apos;s matching algorithm. Your email is used
              to send account-related messages and, if you opted in, occasional product updates. That&apos;s
              the full extent of email use.
            </P>
            <P>
              We don&apos;t use your data to build advertising profiles, sell leads, or infer demographic
              information for third parties. Aggregated, de-identified usage data may guide product decisions
              but can never be traced back to you individually.
            </P>
          </Section>

          <Section id="github" title="GitHub OAuth & Permissions" Icon={KeyRound}>
            <P>
              OSHunt connects to GitHub via OAuth — the same standard used by tools like Vercel, Linear, and
              Netlify. During sign-in, GitHub shows you exactly what permissions OSHunt is requesting before
              you authorize anything. We request only the scopes we need: public profile information and read
              access to your public repositories. We don&apos;t request write access or access to private
              repositories.
            </P>
            <P>
              You can revoke OSHunt&apos;s access at any time from your GitHub account under Settings →
              Applications → Authorized OAuth Apps. Revoking access doesn&apos;t automatically delete your
              OSHunt account.
            </P>
          </Section>

          <Section id="gemini" title="AI Processing & Gemini" Icon={Sparkles}>
            <P>
              Issue Hunter and GitLense are both powered by Google&apos;s Gemini API. When you search for
              issues or analyze a repository, relevant data — such as GitHub issue text, repository metadata,
              and your stack preferences — is sent to Gemini for processing.
            </P>
            <P>
              Data sent to Gemini is processed under Google&apos;s API Terms of Service. As of this
              policy&apos;s date, Google does not use API input/output data to train its models by default. You
              can review Google&apos;s current data practices at ai.google.dev/terms.
            </P>
            <P>
              We don&apos;t store the full text of every Gemini response. Summaries may be cached temporarily
              to reduce latency and API costs, but they&apos;re not retained indefinitely.
            </P>
          </Section>

          <Section id="storage" title="Data Storage & Security" Icon={Lock}>
            <P>
              Your account data is stored in a PostgreSQL database hosted on Neon — a serverless Postgres
              provider with encryption at rest and data residency in the US. Data in transit between your
              browser, OSHunt&apos;s servers, and our database is encrypted via TLS 1.2 or higher at all times.
            </P>
            <P>
              OSHunt is deployed on Vercel. Access to production data is limited to the OSHunt team and is
              protected by strong authentication requirements.
            </P>
          </Section>

          <Section id="cookies" title="Cookies & Tracking" Icon={Cookie}>
            <P>
              OSHunt uses session cookies to keep you logged in between page loads. These are essential to the
              platform functioning. We don&apos;t use tracking cookies, advertising cookies, or third-party
              cookies for profiling purposes.
            </P>
            <P>
              You can disable cookies in your browser settings, but doing so will break authentication and make
              OSHunt unusable in its current form.
            </P>
          </Section>

          <Section id="third-party" title="Third-Party Services" Icon={Puzzle}>
            <P>
              Beyond GitHub and Google Gemini, OSHunt relies on Neon for database hosting, Vercel for
              deployment, and NextAuth for authentication session management. Each of these providers processes
              some portion of your data as part of delivering the service.
            </P>
            <P>
              We don&apos;t currently use any advertising, remarketing, or data-broker services. If that
              changes, this section will be updated and registered users will be notified.
            </P>
          </Section>

          <Section id="rights" title="Your Rights & Controls" Icon={Scale}>
            <P>
              You have the right to access the personal data OSHunt holds about you, request corrections to
              anything inaccurate, and ask for your account and associated data to be deleted. To exercise any
              of these rights, email us — we&apos;ll respond within five business days.
            </P>
            <P>
              If you&apos;re in the EU or UK, you also have rights under GDPR and UK GDPR — including the right
              to data portability and the right to object to certain processing activities.
            </P>
            <P>
              To delete your account entirely, email us with the subject line &quot;Account deletion
              request&quot; from the email associated with your OSHunt account. We&apos;ll complete deletion
              within 14 days.
            </P>
          </Section>

          <Section id="retention" title="Data Retention" Icon={Clock}>
            <P>
              We keep your account data for as long as your account is active. If you haven&apos;t signed in
              for 24 months, we may reach out to confirm you&apos;d like to keep the account — and delete it if
              we don&apos;t hear back within 30 days.
            </P>
            <P>
              Cached AI outputs and temporary usage logs are retained for no more than 90 days. After account
              deletion, your personal data is removed from our primary database within 14 days. Backups may
              retain copies for up to 30 additional days before those are cycled out through standard backup
              rotation.
            </P>
          </Section>

          <Section id="children" title="Children's Privacy" Icon={Baby}>
            <P>
              OSHunt is not designed for or directed at children under the age of 13, and we don&apos;t
              knowingly collect personal information from anyone under 13. If you believe a child under 13 has
              created an account, please contact us immediately and we&apos;ll delete the account and
              associated data.
            </P>
          </Section>

          <Section id="changes" title="Changes to This Policy" Icon={RefreshCw}>
            <P>
              We&apos;ll update this policy as OSHunt grows. The &quot;Last updated&quot; date at the top
              always reflects the most recent revision. For changes that materially affect how we handle your
              data, we&apos;ll notify registered users by email at least 14 days before the new policy takes
              effect.
            </P>
          </Section>

          <Section id="contact" title="Contact" Icon={Mail}>
            <P>
              For privacy-related questions, data requests, or anything covered in this policy, reach out at{" "}
              <a href="mailto:privacy@oshunt.io" className="policy-link mono-link">
                privacy@oshunt.io
              </a>
              . For general product questions,{" "}
              <a href="mailto:hello@oshunt.io" className="policy-link mono-link">
                hello@oshunt.io
              </a>{" "}
              is the right place. We aim to respond to all privacy-related requests within five business days.
            </P>
            <P>
              This policy is governed by the laws of India. Any disputes relating to privacy that can&apos;t be
              resolved directly will be subject to the jurisdiction of the courts of Bhopal, Madhya Pradesh.
            </P>
          </Section>

          <Card className="disclaimer-card" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
            <CardContent style={{ padding: "20px 22px" }}>
              <p>
                This Privacy Policy sits alongside our{" "}
                <a href="/terms" className="policy-link" style={{ color: "var(--text-faint)", borderBottomColor: "var(--border-hover)" }}>
                  Terms and Conditions
                </a>
                . Last reviewed <strong>June 15, 2025</strong>. Questions?{" "}
                <a href="mailto:privacy@oshunt.io" className="mono-link" style={{ color: "var(--text-faint)" }}>
                  privacy@oshunt.io
                </a>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>

      {showBackToTop && (
        <Button
          type="button"
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text-dim)",
            width: 42,
            height: 42,
            borderRadius: "50%",
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowUp size={18} strokeWidth={2.25} aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}