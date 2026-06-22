import { useState, useEffect } from "react"

const BG = "#090909"
const CARD = "#0d0d0d"
const BORDER = "#1a1a1a"
const ACCENT = "#a8ff3e"
const MUTED = "#555"

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false)
  useEffect(() => {
    const h = () => setM(window.innerWidth < 768)
    window.addEventListener("resize", h)
    return () => window.removeEventListener("resize", h)
  }, [])
  return m
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

const sections = [
  { id: "acceptance",  title: "Acceptance of Terms" },
  { id: "service",     title: "Description of Service" },
  { id: "accounts",    title: "User Accounts" },
  { id: "acceptable",  title: "Acceptable Use" },
  { id: "ip",          title: "Intellectual Property" },
  { id: "third-party", title: "Third-Party Services" },
  { id: "privacy",     title: "Privacy & Data" },
  { id: "disclaimers", title: "Disclaimers" },
  { id: "liability",   title: "Limitation of Liability" },
  { id: "termination", title: "Termination" },
  { id: "changes",     title: "Changes to Terms" },
  { id: "contact",     title: "Contact" },
]

function P({ children }) {
  return <p style={{ fontSize: 14, color: "#777", lineHeight: 1.85, margin: "0 0 16px" }}>{children}</p>
}

function Section({ id, title, children }) {
  return (
    <div id={id} style={{ paddingTop: 56, marginTop: -56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 22, backgroundColor: ACCENT, borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8e8", letterSpacing: "-0.02em", margin: 0 }}>{title}</h2>
      </div>
      {children}
      <div style={{ borderBottom: `1px solid ${BORDER}`, marginTop: 16 }} />
    </div>
  )
}

export default function TermsPage() {
  const m = useIsMobile()
  const [active, setActive] = useState("acceptance")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap"
    document.head.appendChild(link)
    return () => document.head.removeChild(link)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }) },
      { rootMargin: "-30% 0px -60% 0px" }
    )
    sections.forEach(s => { const el = document.getElementById(s.id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    setMenuOpen(false)
  }

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

      {/* PAGE HEADER */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: m ? "88px 18px 32px" : "100px 48px 48px" }}>
        <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>Legal</p>
        <h1 style={{ fontSize: m ? 30 : 42, fontWeight: 800, letterSpacing: "-0.04em", margin: "0 0 12px", lineHeight: 1.05 }}>
          Terms & Conditions
        </h1>
        <p style={{ fontSize: 13, color: "#444", margin: 0 }}>
          Last updated: <span style={{ color: "#555" }}>June 15, 2025</span>
          &nbsp;·&nbsp;
          Effective: <span style={{ color: "#555" }}>June 15, 2025</span>
        </p>
      </div>

      {/* MOBILE: Jump to section dropdown */}
      {m && (
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 18px 24px" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              backgroundColor: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 8, padding: "11px 16px", cursor: "pointer",
              fontFamily: "inherit", color: "#ccc", fontSize: 13
            }}
          >
            <span>Jump to: <span style={{ color: ACCENT }}>{sections.find(s => s.id === active)?.title}</span></span>
            <span style={{ color: MUTED, fontSize: 10 }}>{menuOpen ? "▲" : "▼"}</span>
          </button>
          {menuOpen && (
            <div style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
              {sections.map(s => (
                <button key={s.id} onClick={() => scrollTo(s.id)} style={{
                  width: "100%", textAlign: "left", padding: "11px 16px",
                  background: active === s.id ? "#111" : "none",
                  border: "none", borderBottom: `1px solid ${BORDER}`,
                  color: active === s.id ? "#ccc" : "#444",
                  fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  borderLeft: `3px solid ${active === s.id ? ACCENT : "transparent"}`
                }}>{s.title}</button>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ maxWidth: 1060, margin: "0 auto", padding: m ? "0 18px 80px" : "0 48px 100px", display: "flex", gap: 64, alignItems: "flex-start" }}>

        {/* SIDEBAR — desktop only */}
        {!m && (
          <aside style={{ width: 200, flexShrink: 0, position: "sticky", top: 80 }}>
            <p style={{ fontSize: 10, color: "#2e2e2e", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14, fontWeight: 600 }}>On this page</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {sections.map(s => (
                <button key={s.id} onClick={() => scrollTo(s.id)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  textAlign: "left", padding: "6px 10px", borderRadius: 6,
                  fontSize: 12.5, fontFamily: "inherit",
                  color: active === s.id ? "#ccc" : "#3a3a3a",
                  backgroundColor: active === s.id ? "#111" : "transparent",
                  borderLeft: `2px solid ${active === s.id ? ACCENT : "transparent"}`,
                  transition: "all 0.15s"
                }}>{s.title}</button>
              ))}
            </div>
          </aside>
        )}

        {/* CONTENT */}
        <main style={{ flex: 1, minWidth: 0 }}>

          <Section id="acceptance" title="Acceptance of Terms">
            <P>By accessing or using OSHunt — including any of its sub-products such as Issue Hunter and GitLense — you agree to be bound by these Terms and Conditions in full. If you don't agree with any part of these terms, you shouldn't use the platform.</P>
            <P>These Terms constitute a legally binding agreement between you ("User") and OSHunt ("we," "us," or "our"). Continued use of the platform after any update to these Terms constitutes your acceptance of the revised version.</P>
          </Section>

          <Section id="service" title="Description of Service">
            <P>OSHunt is an AI-powered open source contribution platform consisting of two core tools. Issue Hunter scans public GitHub repositories for open issues and matches them to a user's declared tech stack using Gemini-powered analysis — surfacing contributions that are genuinely likely to succeed. GitLense accepts any public GitHub repository URL and generates a plain-English breakdown of the project's structure, purpose, and recommended entry points for new contributors.</P>
            <P>OSHunt is not a GitHub product, nor is it affiliated with or endorsed by GitHub, Inc. in any way. It operates as a third-party tool that reads publicly available data via the GitHub API under the terms of GitHub's own policies.</P>
            <P>The platform is currently offered in an open beta. Features may change, be removed, or be limited without prior notice. We make no guarantees about uptime, data availability, or the continued existence of any specific feature during the beta period.</P>
          </Section>

          <Section id="accounts" title="User Accounts">
            <P>OSHunt uses GitHub OAuth via NextAuth for authentication. By signing in, you grant OSHunt permission to read your public profile and repository information as described during the OAuth consent flow. We do not request or store your GitHub password — ever.</P>
            <P>You're responsible for any activity that occurs under your account. If you suspect unauthorized access, you should revoke OSHunt's OAuth access from your GitHub account settings immediately and notify us.</P>
            <P>Accounts are personal and non-transferable. Creating multiple accounts to circumvent usage limits or platform policies is a violation of these Terms and may result in all associated accounts being suspended.</P>
          </Section>

          <Section id="acceptable" title="Acceptable Use">
            <P>OSHunt is built for individual developers who want to contribute to open source. You agree to use the platform in a way that's consistent with that purpose. Specifically, you may not use OSHunt to scrape or bulk-export GitHub issue data for commercial resale, to circumvent GitHub's own API rate limits or terms of service, or to automate contribution workflows in a way that misrepresents your involvement to repository maintainers.</P>
            <P>You also agree not to attempt to reverse-engineer, decompile, or extract the underlying AI prompts or model configuration powering Issue Hunter or GitLense. And you won't use OSHunt in any way that violates applicable law — including but not limited to privacy law, intellectual property law, or computer fraud statutes.</P>
            <P>We reserve the right to determine, at our sole discretion, what constitutes a violation of acceptable use and to act accordingly — including by suspending or terminating access.</P>
          </Section>

          <Section id="ip" title="Intellectual Property">
            <P>All original content on OSHunt — including the product design, UI, logo, copywriting, and AI-generated analysis outputs produced by the platform — is owned by OSHunt and protected under applicable intellectual property law. You're granted a limited, non-exclusive, non-transferable license to use the platform for your personal, non-commercial contribution activity.</P>
            <P>Content you submit to OSHunt — such as your declared tech stack, preferences, or any feedback — remains yours. By submitting it, you grant us a royalty-free license to use it for the purpose of delivering and improving the service.</P>
            <P>OSHunt does not claim ownership over any GitHub repository content, issue text, or codebase data accessed through the platform. That content belongs to its respective owners under their own licenses.</P>
          </Section>

          <Section id="third-party" title="Third-Party Services">
            <P>OSHunt integrates with several third-party services to function — notably the GitHub API and Google's Gemini API. Your use of OSHunt is therefore also subject to GitHub's Terms of Service and Google's Terms of Service for the Gemini API. We strongly encourage you to review those documents independently.</P>
            <P>We're not responsible for outages, data changes, or policy shifts imposed by those third-party providers that affect OSHunt's functionality. If GitHub changes its API or Gemini's behavior shifts, certain features may degrade or behave unexpectedly — and that's outside our control.</P>
            <P>Any links or references to external websites or services on OSHunt are provided for convenience only. We don't endorse those services and take no responsibility for their content or practices.</P>
          </Section>

          <Section id="privacy" title="Privacy & Data">
            <P>OSHunt collects limited personal data — specifically, your name, email, and GitHub profile information obtained during sign-in, along with any stack preferences you configure on the platform. This data is used solely to personalize your experience and is not sold to third parties.</P>
            <P>We use Neon (PostgreSQL) for data storage and standard industry practices for encryption at rest and in transit. Our full Privacy Policy, which covers data retention, deletion rights, and cookie use in more detail, is available at oshunt.io/privacy.</P>
            <P>Users in the EU and UK have rights under GDPR and UK GDPR respectively, including the right to access, correct, or delete their data. To exercise those rights, contact us at the address listed in the Contact section below.</P>
          </Section>

          <Section id="disclaimers" title="Disclaimers">
            <P>OSHunt is provided "as is" and "as available" — without warranties of any kind, express or implied. We don't warrant that the platform will be uninterrupted, error-free, or free of harmful components. We don't guarantee that Issue Hunter's match scores are accurate, that GitLense's codebase summaries are complete, or that any contribution you make based on OSHunt's suggestions will be accepted by a repository maintainer.</P>
            <P>AI-generated outputs are probabilistic by nature. Not just imperfect — genuinely unpredictable at times. You should use your own judgment when acting on any analysis produced by Issue Hunter or GitLense, and always verify information against the actual GitHub repository before writing or submitting code.</P>
          </Section>

          <Section id="liability" title="Limitation of Liability">
            <P>To the maximum extent permitted by applicable law, OSHunt and its team will not be liable for any indirect, incidental, special, consequential, or punitive damages — including loss of data, lost profits, or reputational harm — arising from your use of or inability to use the platform.</P>
            <P>Our total liability to you for any claim arising under these Terms, regardless of the form of action, is limited to the amount you've paid to OSHunt in the twelve months preceding the claim. Since OSHunt is currently free, that amount is zero — which reflects the nature of a no-cost beta product offered in good faith.</P>
          </Section>

          <Section id="termination" title="Termination">
            <P>You may stop using OSHunt at any time and revoke our GitHub OAuth access from your GitHub settings. If you'd like us to delete your account and associated data, email us at the address in the Contact section.</P>
            <P>We may suspend or terminate your access if you violate these Terms, if we're required to do so by law, or if we decide to shut down the platform. In cases of a material violation, termination may be immediate and without notice. In other cases, we'll make reasonable efforts to notify you in advance.</P>
            <P>Upon termination, your license to use OSHunt ends immediately. Sections of these Terms that should reasonably survive termination — including Intellectual Property, Disclaimers, and Limitation of Liability — will continue to apply.</P>
          </Section>

          <Section id="changes" title="Changes to Terms">
            <P>We may update these Terms at any time. When we do, we'll update the "Last updated" date at the top of this page. For material changes, we'll make a reasonable effort to notify registered users by email or via an in-app notice.</P>
            <P>Your continued use of OSHunt after a change takes effect constitutes your acceptance of the revised Terms. If you disagree with a change, the right move is to stop using the platform and, if you'd like, reach out to us.</P>
          </Section>

          <Section id="contact" title="Contact">
            <P>These Terms are governed by the laws of India. Any disputes arising from your use of OSHunt will be subject to the exclusive jurisdiction of the courts of Bhopal, Madhya Pradesh.</P>
            <P>If you have questions about these Terms, want to report a violation, or need to exercise a data right, reach out at{" "}
              <a href="mailto:legal@oshunt.io" style={{ color: ACCENT, textDecoration: "none", borderBottom: `1px solid #a8ff3e44` }}>legal@oshunt.io</a>.
              For general product questions, use{" "}
              <a href="mailto:hello@oshunt.io" style={{ color: ACCENT, textDecoration: "none", borderBottom: `1px solid #a8ff3e44` }}>hello@oshunt.io</a>.
              We aim to respond within 3 business days.
            </P>
          </Section>

          <div style={{ marginTop: 48, padding: "20px 22px", backgroundColor: CARD, borderRadius: 10, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12, color: "#333", lineHeight: 1.7, margin: 0 }}>
              These Terms were last reviewed on <strong style={{ color: "#444" }}>June 15, 2025</strong>. Questions?{" "}
              <a href="mailto:legal@oshunt.io" style={{ color: MUTED, textDecoration: "none" }}>legal@oshunt.io</a>
            </p>
          </div>

        </main>
      </div>
    </div>
  )
}