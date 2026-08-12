"use client";

import { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/ui/HomeNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  X,
  Rocket,
  KeyRound,
  ShieldCheck,
  UserCircle,
  Target,
  Bug,
  Send,
  Loader2,
  CircleCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT = "#a8ff3e";

// ────────────────────────────────────────────────────────────────────────────
// Brand marks — kept exactly as-is. TwitterIcon/GithubIcon are the actual
// brand logo paths (not swapped for generic lucide icons, since the point of
// a GitHub/Twitter link is instant recognition of *that specific* mark).
// ────────────────────────────────────────────────────────────────────────────

function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="9" stroke={ACCENT} strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2.5" fill={ACCENT} />
      <line x1="14" y1="1" x2="14" y2="6.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="21.5" x2="14" y2="27" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="14" x2="6.5" y2="14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21.5" y1="14" x2="27" y2="14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function XIcon({ size = 20, color = "#555" }: { size?: number; color?: string }) {
  return <Image src="/X.svg" alt="X" width={size} height={size} className="rounded-sm" />;
}

function GitHubIcon({ size = 20, color = "#555" }: { size?: number; color?: string }) {
  return <Image src="/github.svg" alt="GitHub" width={size} height={size} />;
}

function MailIcon({ size = 20, color = "#555" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Data — every string below is copied verbatim from the original file.
// ────────────────────────────────────────────────────────────────────────────

const TOPICS: { Icon: LucideIcon; label: string; desc: string; cat: string; accent: string }[] = [
  { Icon: Rocket, label: "Getting Started", desc: "Set up your account, connect GitHub, and make your first match.", cat: "Getting Started", accent: "#a8ff3e" },
  { Icon: KeyRound, label: "GitHub OAuth", desc: "Permissions, scopes, revoking access, and what we read.", cat: "Account & Privacy", accent: "#8b8cf9" },
  { Icon: ShieldCheck, label: "Privacy & Security", desc: "How your data is stored, used, and protected.", cat: "Account & Privacy", accent: "#61dafb" },
  { Icon: UserCircle, label: "Account & Billing", desc: "Manage your profile, preferences, and account deletion.", cat: "Account & Privacy", accent: "#f0c14b" },
  { Icon: Target, label: "Issue Hunter", desc: "Stack matching, match scores, filters, and AI summaries.", cat: "Issue Hunter", accent: "#ff4d6d" },
  { Icon: Bug, label: "Bug Reports", desc: "Something broken? Let us know and we'll fix it fast.", cat: "All", accent: "#ff9f5b" },
];

const FAQS = [
  {
    cat: "Getting Started",
    items: [
      {
        q: "Do I need a GitHub account to use OSHunt?",
        a: "Yes — OSHunt authenticates via GitHub OAuth and reads your public repositories to understand your tech stack. You don't need to grant any write permissions; read-only public access is all we request.",
      },
      {
        q: "Is OSHunt really free?",
        a: "Yes, completely free during the open beta for individual contributors. We'll introduce paid plans in the future for teams or advanced features, but the core contribution-finding experience will remain free for individuals.",
      },
      {
        q: "How do I set up my tech stack after signing in?",
        a: "After signing in, OSHunt's onboarding walks you through selecting your stack. You can update your preferences anytime from your profile settings. The more specific you are, the better your issue matches will be.",
      },
    ],
  },
  {
    cat: "Issue Hunter",
    items: [
      {
        q: "How does Issue Hunter match issues to my stack?",
        a: "Issue Hunter sends your declared tech stack to Gemini along with metadata from open GitHub issues — labels, language, description, and repo activity. Gemini scores each issue by how well it maps to your skills, filters out stale repos and closed issues, and surfaces the highest-confidence matches first.",
      },
      {
        q: "Why am I not seeing issues for my stack?",
        a: "A few common causes: your stack might be set too broadly (e.g. 'JavaScript' alone won't narrow much), the repos in scope might not have open issues right now, or the GitHub API rate limit may have temporarily limited our scan. Try narrowing your stack to specific frameworks and refreshing.",
      },
      {
        q: "How often are issues refreshed?",
        a: "Issue data is refreshed every few hours. If you're looking for issues in a specific repo and don't see them, it may take up to 6 hours for new issues to surface after they're opened on GitHub.",
      },
      {
        q: "What does the match score mean exactly?",
        a: "The match score (e.g. '94% match') is Gemini's confidence that this issue fits your declared stack. It's not a guarantee — it's a signal. A 90%+ score means the issue uses tech you know well. Below 70% means the repo might use some adjacent tech you'd need to learn on the fly.",
      },
    ],
  },
  {
    cat: "GitLense",
    items: [
      {
        q: "How does GitLense work?",
        a: "Paste any public GitHub repository URL into GitLense. It fetches the repo's metadata, file structure, README, and key source files, then sends that context to Gemini with a prompt designed to extract architecture, entry points, and contribution guidance — all written in plain English.",
      },
      {
        q: "Does GitLense work on private repositories?",
        a: "Not currently. GitLense only works on public GitHub repositories. Private repo support would require additional OAuth scopes we don't currently request, and we want to be careful about what permissions we ask for.",
      },
    ],
  },
  {
    cat: "Account & Privacy",
    items: [
      {
        q: "How do I delete my account?",
        a: "Email privacy@oshunt.io with the subject line 'Account deletion request' from the email linked to your OSHunt account. We'll permanently delete your account and all associated data within 14 days and send you a confirmation when it's done.",
      },
      {
        q: "What GitHub permissions does OSHunt request?",
        a: "We request read access to your public profile (name, email, username) and your public repositories. We never request write access, we never touch private repos, and we never see your GitHub password. You can verify and revoke our access anytime at github.com/settings/applications.",
      },
      {
        q: "Can I use OSHunt without letting it read my repositories?",
        a: "Not fully — repo access is how we infer your stack automatically. But you can manually set your tech stack preferences in settings and limit what we scan. We're working on a 'manual stack only' mode for users who prefer more control.",
      },
    ],
  },
];

type ContactIcon = (props: { size?: number; color?: string }) => React.JSX.Element;

const CONTACTS: { Icon: ContactIcon; title: string; body: string; cta: string; href: string; accent: boolean }[] = [
  {
    Icon: MailIcon,
    title: "Email us",
    body: "For account issues, bugs, or anything that needs a human response.",
    cta: "hello@oshunt.io",
    href: "mailto:hello@oshunt.io",
    accent: true,
  },
  {
    Icon: XIcon,
    title: "X",
    body: "Quick questions, feedback, or just want to say hi. We're active here.",
    cta: "@AyushdevX",
    href: "https://x.com/AyushdevX",
    accent: false,
  },
  {
    Icon: GitHubIcon,
    title: "GitHub Issues",
    body: "Found a bug or want to request a feature? Open an issue on our repo.",
    cta: "Open an issue →",
    href: "https://github.com/AyushdevX",
    accent: false,
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Search-match highlighting (same mechanic as the standalone FAQ page)
// ────────────────────────────────────────────────────────────────────────────

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
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

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-[#a8ff3e30] bg-[#a8ff3e0a] px-6 py-12 text-center">
        <CircleCheck className="h-8 w-8 text-[#a8ff3e]" />
        <p className="text-[15px] font-semibold text-[#e8e8e8]">Message sent</p>
        <p className="max-w-sm text-[13px] leading-[1.6] text-[#666]">
          We usually reply within a business day. If it&apos;s urgent, ping us on Twitter in the meantime.
        </p>
        <Button
          variant="ghost"
          onClick={() => setStatus("idle")}
          className="h-auto p-0 text-[13px] font-normal text-[#a8ff3e] hover:bg-transparent hover:text-[#bdff66]"
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-[#1a1a1a] bg-[#0d0d0d] px-6 py-8 md:px-9 md:py-10">
      <p className="mb-1 text-[15px] font-semibold text-[#ccc]">Send us a message</p>
      <p className="mb-6 text-[13px] text-[#555]">Prefer not to leave the page? Fill this in instead.</p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-name" className="text-[11.5px] font-medium text-[#666]">
            Name
          </label>
          <Input
            id="contact-name"
            required
            value={form.name}
            onChange={update("name")}
            className="border-[#1a1a1a] bg-[#090909] text-sm text-[#ccc] placeholder:text-[#444] focus-visible:border-[#2e2e2e] focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="contact-email" className="text-[11.5px] font-medium text-[#666]">
            Email
          </label>
          <Input
            id="contact-email"
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="border-[#1a1a1a] bg-[#090909] text-sm text-[#ccc] placeholder:text-[#444] focus-visible:border-[#2e2e2e] focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label htmlFor="contact-subject" className="text-[11.5px] font-medium text-[#666]">
            Subject <span className="text-[#444]">(optional)</span>
          </label>
          <Input
            id="contact-subject"
            value={form.subject}
            onChange={update("subject")}
            className="border-[#1a1a1a] bg-[#090909] text-sm text-[#ccc] placeholder:text-[#444] focus-visible:border-[#2e2e2e] focus-visible:ring-0"
          />
        </div>
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label htmlFor="contact-message" className="text-[11.5px] font-medium text-[#666]">
            Message
          </label>
          <Textarea
            id="contact-message"
            required
            rows={5}
            value={form.message}
            onChange={update("message")}
            className="resize-none border-[#1a1a1a] bg-[#090909] text-sm text-[#ccc] placeholder:text-[#444] focus-visible:border-[#2e2e2e] focus-visible:ring-0"
          />
        </div>

        {status === "error" && (
          <p className="text-[12.5px] text-[#ff4d6d] md:col-span-2">
            Something went wrong sending that — try again, or email us directly at hello@oshunt.io.
          </p>
        )}

        <div className="md:col-span-2">
          <Button
            type="submit"
            disabled={status === "sending"}
            className="gap-2 rounded-[10px] bg-[#a8ff3e] px-6 font-semibold text-black hover:bg-[#bdff66] disabled:opacity-60"
          >
            {status === "sending" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Send message
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function SupportPage() {
  const [activeTab, setActiveTab] = useState("All");
  const [query, setQuery] = useState("");

  const allCats = ["All", ...FAQS.map((f) => f.cat)];

  const filteredFAQs = FAQS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (activeTab === "All" || section.cat === activeTab) &&
        (query === "" ||
          item.q.toLowerCase().includes(query.toLowerCase()) ||
          item.a.toLowerCase().includes(query.toLowerCase()))
    ),
  })).filter((s) => s.items.length > 0);

  const totalFAQs = FAQS.reduce((sum, s) => sum + s.items.length, 0);
  const totalMatches = filteredFAQs.reduce((sum, s) => sum + s.items.length, 0);

  const statusText = query.trim()
    ? `grep -i "${query.trim()}" → ${totalMatches} match${totalMatches === 1 ? "" : "es"}`
    : activeTab !== "All"
    ? `${totalMatches} question${totalMatches === 1 ? "" : "s"} in ${activeTab}`
    : `${totalFAQs} questions indexed`;

  function goToTopic(cat: string) {
    setActiveTab(cat);
    document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white antialiased" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');`}</style>

      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#1a1a1a]">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[700px] -translate-x-1/2"
          style={{ background: "radial-gradient(ellipse at top, #a8ff3e0d 0%, transparent 65%)" }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff06 1px, transparent 1px)",
            backgroundSize: "26px 26px",
            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)",
          }}
        />

        <div className="relative mx-auto max-w-[680px] px-[18px] pb-[48px] pt-[96px] text-center md:px-12 md:pb-[72px] md:pt-[120px]">
          <p className="mb-3.5 text-[10.5px] uppercase tracking-[0.09em] text-[#555]">Support</p>
          <h1 className="mb-4 text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] md:text-[48px]">
            How can we help?
          </h1>
          <p className="mb-8 text-[13.5px] leading-[1.7] text-[#666] md:text-[15px]">
            Browse the FAQ, search for answers, or reach out directly — we usually respond within a business day.
          </p>

          <div className="relative mx-auto max-w-[480px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#444]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions..."
              className="h-auto w-full rounded-[10px] border-[#1a1a1a] bg-[#0d0d0d] py-[13px] pl-10 pr-9 text-sm text-[#ccc] placeholder:text-[#444] focus-visible:border-[#2e2e2e] focus-visible:ring-0"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] transition-colors hover:text-[#999]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="mt-3 font-mono text-[11px] text-white/20">{statusText}</p>
        </div>
      </section>

      {/* TOPICS */}
      <section className="mx-auto max-w-[900px] px-[18px] py-[48px] md:px-12 md:py-[72px]">
        <p className="mb-6 text-[10.5px] uppercase tracking-[0.09em] text-[#555]">Browse by topic</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {TOPICS.map(({ Icon, label, desc, cat, accent }) => (
            <button
              key={label}
              onClick={() => goToTopic(cat)}
              className="group relative overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-4 text-left transition-colors hover:border-[#252525] hover:bg-[#111] md:py-5 md:px-[18px]"
            >
              <span
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `radial-gradient(circle at 20% 0%, ${accent}14, transparent 70%)` }}
              />
              <div
                className="relative z-10 mb-3.5 flex h-9 w-9 items-center justify-center rounded-[9px] border"
                style={{ backgroundColor: `${accent}12`, borderColor: `${accent}25` }}
              >
                <Icon size={17} color={accent} />
              </div>
              <p className="relative z-10 mb-1 text-[12.5px] font-semibold tracking-[-0.01em] text-[#ccc] md:text-[13.5px]">
                {label}
              </p>
              <p className="relative z-10 hidden text-xs leading-[1.5] text-[#444] md:block">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#1a1a1a]">
        <div className="mx-auto max-w-[900px] px-[18px] py-[48px] md:px-12 md:py-[72px]">
          <div className="mb-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center md:gap-0">
            <div>
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.09em] text-[#555]">FAQ</p>
              <h2 className="text-2xl font-bold leading-[1.1] tracking-[-0.03em] md:text-[32px]">
                Frequently asked questions
              </h2>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allCats.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                    activeTab === cat ? "bg-[#a8ff3e] font-semibold text-black" : "bg-[#111] text-[#555] hover:text-[#888]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredFAQs.length === 0 ? (
            <div className="py-[60px] text-center">
              <p className="mb-2 text-sm text-[#333]">No results for &quot;{query}&quot;</p>
              <Button
                variant="ghost"
                onClick={() => setQuery("")}
                className="h-auto p-0 text-[13px] font-normal text-[#a8ff3e] hover:bg-transparent hover:text-[#bdff66]"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-10">
              {filteredFAQs.map((section) => (
                <div key={section.cat}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a8ff3e]">
                    {section.cat}
                  </p>
                  <Accordion type="multiple">
                    {section.items.map((item) => (
                      <AccordionItem key={item.q} value={item.q} className="border-[#1a1a1a]">
                        <AccordionTrigger className="py-[18px] text-left text-sm font-medium text-[#aaa] hover:text-[#e8e8e8] hover:no-underline data-[state=open]:text-[#e8e8e8] [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:text-[#555]">
                          <Highlight text={item.q} query={query} />
                        </AccordionTrigger>
                        <AccordionContent className="pb-[18px] pr-6 pt-0 text-[13.5px] leading-[1.8] text-[#666]">
                          <Highlight text={item.a} query={query} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section className="border-t border-[#1a1a1a]">
        <div className="mx-auto max-w-[900px] px-[18px] py-[48px] md:px-12 md:py-[72px]">
          <p className="mb-2.5 text-[10.5px] uppercase tracking-[0.09em] text-[#555]">Still stuck?</p>
          <h2 className="mb-9 text-2xl font-bold leading-[1.1] tracking-[-0.03em] md:text-[32px]">
            Reach out directly.
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CONTACTS.map(({ Icon, title, body, cta, href, accent }) => (
              <div
                key={title}
                className={cn(
                  "group flex flex-col rounded-[14px] border bg-[#0d0d0d] px-[22px] py-[26px] transition-all hover:-translate-y-0.5",
                  accent ? "border-[#a8ff3e22] hover:border-[#a8ff3e44]" : "border-[#1a1a1a] hover:border-[#252525]"
                )}
              >
                <div
                  className="mb-[18px] flex h-10 w-10 items-center justify-center rounded-[10px] border"
                  style={{
                    backgroundColor: accent ? "#a8ff3e12" : "#111",
                    borderColor: accent ? "#a8ff3e25" : "#1a1a1a",
                  }}
                >
                  <Icon size={18} color={accent ? ACCENT : "#666"} />
                </div>
                <p className="mb-2 text-[14.5px] font-semibold tracking-[-0.01em] text-[#ccc]">{title}</p>
                <p className="mb-5 flex-1 text-[13px] leading-[1.65] text-[#555]">{body}</p>
                <a
                  href={href}
                  className={cn(
                    "w-fit border-b pb-px text-[13px] font-semibold no-underline transition-colors",
                    accent ? "border-[#a8ff3e44] text-[#a8ff3e] hover:border-[#a8ff3e]" : "border-[#2a2a2a] text-[#555] hover:text-[#888]"
                  )}
                >
                  {cta}
                </a>
              </div>
            ))}
          </div>

          {/* Response time note */}
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[10px] border border-[#1a1a1a] bg-[#0a0a0a] px-5 py-4">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#a8ff3e]" />
            <p className="text-[12.5px] leading-[1.6] text-[#444]">
              Average response time is <span className="text-[#666]">under 24 hours</span> on weekdays. For urgent
              issues, reach out on Twitter — it&apos;s the fastest way to get a response.
            </p>
          </div>

          <ContactForm />
        </div>
      </section>
    </div>
  );
}