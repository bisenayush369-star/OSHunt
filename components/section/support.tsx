"use client";

import { useState, useEffect } from "react"

const BG = "#090909"
const CARD = "#0d0d0d"
const BORDER = "#1a1a1a"
const ACCENT = "#a8ff3e"
const MUTED = "#555"

function useIsMobile() {
  // 1. Initialize with a static default value (matches the server)
  const [m, setM] = useState(false);

  useEffect(() => {
    // 2. Define the handler
    const h = () => setM(window.innerWidth < 768);
    
    // 3. Trigger it immediately on mount to update the UI for mobile users
    h();

    // 4. Attach the event listener for window resizing
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  return m;
}

const Logo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="9" stroke={ACCENT} strokeWidth="1.5"/>
    <circle cx="14" cy="14" r="2.5" fill={ACCENT}/>
    <line x1="14" y1="1" x2="14" y2="6.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="21.5" x2="14" y2="27" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="1" y1="14" x2="6.5" y2="14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="21.5" y1="14" x2="27" y2="14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

/* ── Icons ── */
const MailIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
)

const TwitterIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const GithubIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
)

const BookIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
    <line x1="8" y1="7" x2="16" y2="7"/>
    <line x1="8" y1="11" x2="13" y2="11"/>
  </svg>
)

const ShieldIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l7 4v6c0 4.5-3 8.5-7 10C8 20.5 5 16.5 5 12V6l7-4z"/>
    <polyline points="9 12 11 14 15 10"/>
  </svg>
)

const KeyIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="15" r="4"/>
    <path d="M12 15h8M16 15v3"/>
    <line x1="18" y1="15" x2="18" y2="18"/>
  </svg>
)

const BugIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2l1.5 1.5"/>
    <path d="M16 2l-1.5 1.5"/>
    <path d="M9 3.5A3 3 0 0115 3.5V8a3 3 0 01-6 0V3.5z"/>
    <path d="M6 8H3M21 8h-3M6 13H3M21 13h-3M6 18H3M21 18h-3"/>
    <path d="M9 8v11a3 3 0 006 0V8"/>
    <line x1="12" y1="8" x2="12" y2="19"/>
  </svg>
)

const SpeedIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a10 10 0 110 20 10 10 0 010-20z"/>
    <path d="M12 6v2M12 16v2M6 12H4M20 12h-2"/>
    <path d="M12 12l3-4"/>
    <circle cx="12" cy="12" r="1" fill={color}/>
  </svg>
)

const UserIcon = ({ size = 20, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
)

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease", flexShrink: 0 }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const TOPICS = [
  { Icon: SpeedIcon,  label: "Getting Started",    desc: "Set up your account, connect GitHub, and make your first match." },
  { Icon: KeyIcon,    label: "GitHub OAuth",        desc: "Permissions, scopes, revoking access, and what we read." },
  { Icon: ShieldIcon, label: "Privacy & Security",  desc: "How your data is stored, used, and protected." },
  { Icon: UserIcon,   label: "Account & Billing",   desc: "Manage your profile, preferences, and account deletion." },
  { Icon: BookIcon,   label: "Issue Hunter",         desc: "Stack matching, match scores, filters, and AI summaries." },
  { Icon: BugIcon,    label: "Bug Reports",          desc: "Something broken? Let us know and we'll fix it fast." },
]

const FAQS = [
  {
    cat: "Getting Started",
    items: [
      {
        q: "Do I need a GitHub account to use OSHunt?",
        a: "Yes — OSHunt authenticates via GitHub OAuth and reads your public repositories to understand your tech stack. You don't need to grant any write permissions; read-only public access is all we request."
      },
      {
        q: "Is OSHunt really free?",
        a: "Yes, completely free during the open beta for individual contributors. We'll introduce paid plans in the future for teams or advanced features, but the core contribution-finding experience will remain free for individuals."
      },
      {
        q: "How do I set up my tech stack after signing in?",
        a: "After signing in, OSHunt's onboarding walks you through selecting your stack. You can update your preferences anytime from your profile settings. The more specific you are, the better your issue matches will be."
      },
    ]
  },
  {
    cat: "Issue Hunter",
    items: [
      {
        q: "How does Issue Hunter match issues to my stack?",
        a: "Issue Hunter sends your declared tech stack to Gemini along with metadata from open GitHub issues — labels, language, description, and repo activity. Gemini scores each issue by how well it maps to your skills, filters out stale repos and closed issues, and surfaces the highest-confidence matches first."
      },
      {
        q: "Why am I not seeing issues for my stack?",
        a: "A few common causes: your stack might be set too broadly (e.g. 'JavaScript' alone won't narrow much), the repos in scope might not have open issues right now, or the GitHub API rate limit may have temporarily limited our scan. Try narrowing your stack to specific frameworks and refreshing."
      },
      {
        q: "How often are issues refreshed?",
        a: "Issue data is refreshed every few hours. If you're looking for issues in a specific repo and don't see them, it may take up to 6 hours for new issues to surface after they're opened on GitHub."
      },
      {
        q: "What does the match score mean exactly?",
        a: "The match score (e.g. '94% match') is Gemini's confidence that this issue fits your declared stack. It's not a guarantee — it's a signal. A 90%+ score means the issue uses tech you know well. Below 70% means the repo might use some adjacent tech you'd need to learn on the fly."
      },
    ]
  },
  {
    cat: "GitLense",
    items: [
      {
        q: "How does GitLense work?",
        a: "Paste any public GitHub repository URL into GitLense. It fetches the repo's metadata, file structure, README, and key source files, then sends that context to Gemini with a prompt designed to extract architecture, entry points, and contribution guidance — all written in plain English."
      },
      {
        q: "Does GitLense work on private repositories?",
        a: "Not currently. GitLense only works on public GitHub repositories. Private repo support would require additional OAuth scopes we don't currently request, and we want to be careful about what permissions we ask for."
      },
    ]
  },
  {
    cat: "Account & Privacy",
    items: [
      {
        q: "How do I delete my account?",
        a: "Email privacy@oshunt.io with the subject line 'Account deletion request' from the email linked to your OSHunt account. We'll permanently delete your account and all associated data within 14 days and send you a confirmation when it's done."
      },
      {
        q: "What GitHub permissions does OSHunt request?",
        a: "We request read access to your public profile (name, email, username) and your public repositories. We never request write access, we never touch private repos, and we never see your GitHub password. You can verify and revoke our access anytime at github.com/settings/applications."
      },
      {
        q: "Can I use OSHunt without letting it read my repositories?",
        a: "Not fully — repo access is how we infer your stack automatically. But you can manually set your tech stack preferences in settings and limit what we scan. We're working on a 'manual stack only' mode for users who prefer more control."
      },
    ]
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, padding: "18px 0", background: "none", border: "none",
          cursor: "pointer", fontFamily: "inherit", textAlign: "left"
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: open ? "#e8e8e8" : "#aaa", lineHeight: 1.4, transition: "color 0.15s" }}>{q}</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.8, margin: "0 0 18px", paddingRight: 24 }}>{a}</p>
      )}
    </div>
  )
}

export default function SupportPage() {
  const m = useIsMobile()
  const [activeTab, setActiveTab] = useState("All")
  const [query, setQuery] = useState("")

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  const allCats = ["All", ...FAQS.map(f => f.cat)]

  const filteredFAQs = FAQS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      (activeTab === "All" || section.cat === activeTab) &&
      (query === "" || item.q.toLowerCase().includes(query.toLowerCase()) || item.a.toLowerCase().includes(query.toLowerCase()))
    )
  })).filter(s => s.items.length > 0)

  return (
    <div style={{ backgroundColor: BG, minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: "#fff", WebkitFontSmoothing: "antialiased" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: m ? "0 18px" : "0 48px", height: 54,
        backgroundColor: "rgba(9,9,9,0.92)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${BORDER}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={m ? 18 : 20} />
          <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: "-0.02em" }}>OSHunt</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!m && <button style={{ background: "none", border: `1px solid ${BORDER}`, color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "6px 16px", borderRadius: 7 }}>Sign in</button>}
          <button style={{ backgroundColor: ACCENT, color: "#000", border: "none", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 300, background: "radial-gradient(ellipse at top, #a8ff3e0d 0%, transparent 65%)", pointerEvents: "none" }} />
        {!m && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, #ffffff06 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 100%)" }} />}

        <div style={{ maxWidth: 680, margin: "0 auto", padding: m ? "96px 18px 48px" : "120px 48px 72px", textAlign: "center", position: "relative" }}>
          <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 14 }}>Support</p>
          <h1 style={{ fontSize: m ? 32 : 48, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, margin: "0 0 16px" }}>
            How can we help?
          </h1>
          <p style={{ fontSize: m ? 13.5 : 15, color: "#666", lineHeight: 1.7, margin: "0 0 32px" }}>
            Browse the FAQ, search for answers, or reach out directly — we usually respond within a business day.
          </p>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 480, margin: "0 auto" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7"/><line x1="16" y1="16" x2="21" y2="21"/>
              </svg>
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search questions..."
              style={{
                width: "100%", padding: "13px 16px 13px 40px",
                backgroundColor: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 10, color: "#ccc", fontSize: 14,
                fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s"
              }}
              onFocus={e => e.target.style.borderColor = "#2e2e2e"}
              onBlur={e => e.target.style.borderColor = BORDER}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: MUTED, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>×</button>
            )}
          </div>
        </div>
      </section>

      {/* TOPICS */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: m ? "48px 18px" : "72px 48px" }}>
        <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 24 }}>Browse by topic</p>
        <div style={{ display: "grid", gridTemplateColumns: m ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12 }}>
          {TOPICS.map(({ Icon, label, desc }) => (
            <button
              key={label}
              onClick={() => { setActiveTab(label === "Getting Started" ? "Getting Started" : label === "Issue Hunter" ? "Issue Hunter" : label === "GitHub OAuth" || label === "Privacy & Security" || label === "Account & Billing" ? "Account & Privacy" : "All"); document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" }) }}
              style={{
                backgroundColor: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: m ? "16px 14px" : "20px 18px",
                textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s"
              }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = "#111"; e.currentTarget.style.borderColor = "#252525" }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = CARD; e.currentTarget.style.borderColor = BORDER }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: "#111", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Icon size={17} color="#666" />
              </div>
              <p style={{ fontSize: m ? 12.5 : 13.5, fontWeight: 600, color: "#ccc", margin: "0 0 5px", letterSpacing: "-0.01em" }}>{label}</p>
              {!m && <p style={{ fontSize: 12, color: "#444", margin: 0, lineHeight: 1.5 }}>{desc}</p>}
            </button>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: m ? "48px 18px" : "72px 48px" }}>
          <div style={{ display: "flex", alignItems: m ? "flex-start" : "center", justifyContent: "space-between", flexDirection: m ? "column" : "row", gap: m ? 20 : 0, marginBottom: 40 }}>
            <div>
              <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 8 }}>FAQ</p>
              <h2 style={{ fontSize: m ? 24 : 32, fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>Frequently asked questions</h2>
            </div>

            {/* Category tabs */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {allCats.map(cat => (
                <button key={cat} onClick={() => setActiveTab(cat)} style={{
                  padding: "6px 14px", borderRadius: 99, fontSize: 12, fontFamily: "inherit",
                  cursor: "pointer", border: "none", transition: "all 0.15s",
                  backgroundColor: activeTab === cat ? ACCENT : "#111",
                  color: activeTab === cat ? "#000" : "#555",
                  fontWeight: activeTab === cat ? 600 : 400
                }}>{cat}</button>
              ))}
            </div>
          </div>

          {filteredFAQs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <p style={{ fontSize: 14, color: "#333", marginBottom: 8 }}>No results for &quot;{query}&quot;</p>
              <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: ACCENT, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Clear search</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
              {filteredFAQs.map(section => (
                <div key={section.cat}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>{section.cat}</p>
                  <div>
                    {section.items.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: m ? "48px 18px" : "72px 48px" }}>
          <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>Still stuck?</p>
          <h2 style={{ fontSize: m ? 24 : 32, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 36px", lineHeight: 1.1 }}>
            Reach out directly.
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "repeat(3, 1fr)", gap: 12 }}>
            {[
              {
                Icon: MailIcon,
                title: "Email us",
                body: "For account issues, bugs, or anything that needs a human response.",
                cta: "hello@oshunt.io",
                href: "mailto:hello@oshunt.io",
                accent: true
              },
              {
                Icon: TwitterIcon,
                title: "Twitter / X",
                body: "Quick questions, feedback, or just want to say hi. We're active here.",
                cta: "@AyushdevX",
                href: "https://twitter.com/AyushdevX",
                accent: false
              },
              {
                Icon: GithubIcon,
                title: "GitHub Issues",
                body: "Found a bug or want to request a feature? Open an issue on our repo.",
                cta: "Open an issue →",
                href: "https://github.com/AyushdevX",
                accent: false
              }
            ].map(({ Icon, title, body, cta, href, accent }) => (
              <div key={title} style={{
                backgroundColor: CARD, border: `1px solid ${accent ? "#a8ff3e22" : BORDER}`,
                borderRadius: 14, padding: "26px 22px",
                display: "flex", flexDirection: "column", gap: 0
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: accent ? "#a8ff3e12" : "#111", border: `1px solid ${accent ? "#a8ff3e25" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <Icon size={18} color={accent ? ACCENT : "#666"} />
                </div>
                <p style={{ fontSize: 14.5, fontWeight: 600, color: "#ccc", margin: "0 0 8px", letterSpacing: "-0.01em" }}>{title}</p>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, margin: "0 0 20px", flex: 1 }}>{body}</p>
                <a href={href} style={{
                  display: "inline-block", fontSize: 13, fontWeight: 600,
                  color: accent ? ACCENT : "#555",
                  textDecoration: "none",
                  borderBottom: `1px solid ${accent ? "#a8ff3e44" : "#2a2a2a"}`,
                  paddingBottom: 1, width: "fit-content"
                }}>{cta}</a>
              </div>
            ))}
          </div>

          {/* Response time note */}
          <div style={{ marginTop: 24, padding: "16px 20px", backgroundColor: "#0a0a0a", border: `1px solid ${BORDER}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: ACCENT, flexShrink: 0 }} />
            <p style={{ fontSize: 12.5, color: "#444", margin: 0, lineHeight: 1.6 }}>
              Average response time is <span style={{ color: "#666" }}>under 24 hours</span> on weekdays. For urgent issues, reach out on Twitter — it&apos;s the fastest way to get a response.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: m ? "22px 18px" : "26px 48px", display: "flex", flexDirection: m ? "column" : "row", alignItems: m ? "flex-start" : "center", justifyContent: "space-between", gap: m ? 14 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={17} />
            <span style={{ fontSize: 12, color: "#2a2a2a" }}>OSHunt.io © 2025</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["Twitter / X", "GitHub", "Privacy", "Terms"].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: "#2a2a2a", textDecoration: "none" }}
                onMouseOver={e => (e.target as HTMLAnchorElement).style.color = "#666"}
                onMouseOut={e => (e.target as HTMLAnchorElement).style.color = "#2a2a2a"}
              >{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}