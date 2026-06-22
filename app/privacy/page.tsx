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
  { id: "overview",    title: "Overview" },
  { id: "collection",  title: "Information We Collect" },
  { id: "usage",       title: "How We Use It" },
  { id: "github",      title: "GitHub OAuth & Permissions" },
  { id: "gemini",      title: "AI Processing & Gemini" },
  { id: "storage",     title: "Data Storage & Security" },
  { id: "cookies",     title: "Cookies & Tracking" },
  { id: "third-party", title: "Third-Party Services" },
  { id: "rights",      title: "Your Rights & Controls" },
  { id: "retention",   title: "Data Retention" },
  { id: "children",    title: "Children's Privacy" },
  { id: "changes",     title: "Changes to This Policy" },
  { id: "contact",     title: "Contact" },
]

function P({ children }) {
  return <p style={{ fontSize: 14, color: "#777", lineHeight: 1.85, margin: "0 0 16px" }}>{children}</p>
}

function Highlight({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#0a0a0a", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
      <span style={{ fontSize: 12.5, color: "#444" }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "#ccc", fontWeight: 500 }}>{value}</span>
    </div>
  )
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

export default function PrivacyPage() {
  const m = useIsMobile()
  const [active, setActive] = useState("overview")
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
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "#444", margin: 0 }}>
          Last updated: <span style={{ color: "#555" }}>June 15, 2025</span>
          &nbsp;·&nbsp;
          Effective: <span style={{ color: "#555" }}>June 15, 2025</span>
        </p>
      </div>

      {/* MOBILE: Jump dropdown */}
      {m && (
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "0 18px 24px" }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              backgroundColor: CARD, border: `1px solid ${BORDER}`,
              borderRadius: menuOpen ? "8px 8px 0 0" : 8, padding: "11px 16px",
              cursor: "pointer", fontFamily: "inherit", color: "#ccc", fontSize: 13
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

          <Section id="overview" title="Overview">
            <P>OSHunt is built by developers, for developers — and that means we're deliberate about privacy. This policy explains what data we collect when you use OSHunt, why we collect it, what we do with it, and what control you have over it. We collect the minimum needed to make the product work, we don't sell your data, and we don't share it with advertisers.</P>
            <P>This policy covers all OSHunt services — including Issue Hunter, GitLense, and any associated web properties under oshunt.io.</P>
          </Section>

          <Section id="collection" title="Information We Collect">
            <P>We collect two categories of information — what you give us directly and what we observe from your use of the platform.</P>
            <P>When you sign in via GitHub OAuth, we receive your public GitHub profile: name, email address, username, avatar, and a list of your public repositories. We use this to set up your account and power the stack-matching logic in Issue Hunter. We also collect any stack preferences, use-case selections, or newsletter preferences you set during onboarding.</P>
            <P>On the usage side, we log basic activity — which features you use, errors that occur during sessions, and general analytics like session duration and page views.</P>
            <div style={{ margin: "20px 0" }}>
              <Highlight label="GitHub name & email" value="Collected at sign-in via OAuth" />
              <Highlight label="Public repositories" value="Read-only, used for stack matching" />
              <Highlight label="Stack preferences" value="Set by you during onboarding" />
              <Highlight label="Usage analytics" value="Aggregated, not sold or shared" />
              <Highlight label="GitHub password" value="Never collected — ever" />
            </div>
          </Section>

          <Section id="usage" title="How We Use It">
            <P>The data we collect serves one purpose: making OSHunt actually useful to you. Your GitHub profile and declared tech stack power Issue Hunter's matching algorithm. Your email is used to send account-related messages and, if you opted in, occasional product updates. That's the full extent of email use.</P>
            <P>We don't use your data to build advertising profiles, sell leads, or infer demographic information for third parties. Aggregated, de-identified usage data may guide product decisions but can never be traced back to you individually.</P>
          </Section>

          <Section id="github" title="GitHub OAuth & Permissions">
            <P>OSHunt connects to GitHub via OAuth — the same standard used by tools like Vercel, Linear, and Netlify. During sign-in, GitHub shows you exactly what permissions OSHunt is requesting before you authorize anything. We request only the scopes we need: public profile information and read access to your public repositories. We don't request write access or access to private repositories.</P>
            <P>You can revoke OSHunt's access at any time from your GitHub account under Settings → Applications → Authorized OAuth Apps. Revoking access doesn't automatically delete your OSHunt account.</P>
          </Section>

          <Section id="gemini" title="AI Processing & Gemini">
            <P>Issue Hunter and GitLense are both powered by Google's Gemini API. When you search for issues or analyze a repository, relevant data — such as GitHub issue text, repository metadata, and your stack preferences — is sent to Gemini for processing.</P>
            <P>Data sent to Gemini is processed under Google's API Terms of Service. As of this policy's date, Google does not use API input/output data to train its models by default. You can review Google's current data practices at ai.google.dev/terms.</P>
            <P>We don't store the full text of every Gemini response. Summaries may be cached temporarily to reduce latency and API costs, but they're not retained indefinitely.</P>
          </Section>

          <Section id="storage" title="Data Storage & Security">
            <P>Your account data is stored in a PostgreSQL database hosted on Neon — a serverless Postgres provider with encryption at rest and data residency in the US. Data in transit between your browser, OSHunt's servers, and our database is encrypted via TLS 1.2 or higher at all times.</P>
            <P>OSHunt is deployed on Vercel. Access to production data is limited to the OSHunt team and is protected by strong authentication requirements.</P>
          </Section>

          <Section id="cookies" title="Cookies & Tracking">
            <P>OSHunt uses session cookies to keep you logged in between page loads. These are essential to the platform functioning. We don't use tracking cookies, advertising cookies, or third-party cookies for profiling purposes.</P>
            <P>You can disable cookies in your browser settings, but doing so will break authentication and make OSHunt unusable in its current form.</P>
          </Section>

          <Section id="third-party" title="Third-Party Services">
            <P>Beyond GitHub and Google Gemini, OSHunt relies on Neon for database hosting, Vercel for deployment, and NextAuth for authentication session management. Each of these providers processes some portion of your data as part of delivering the service.</P>
            <P>We don't currently use any advertising, remarketing, or data-broker services. If that changes, this section will be updated and registered users will be notified.</P>
          </Section>

          <Section id="rights" title="Your Rights & Controls">
            <P>You have the right to access the personal data OSHunt holds about you, request corrections to anything inaccurate, and ask for your account and associated data to be deleted. To exercise any of these rights, email us — we'll respond within five business days.</P>
            <P>If you're in the EU or UK, you also have rights under GDPR and UK GDPR — including the right to data portability and the right to object to certain processing activities.</P>
            <P>To delete your account entirely, email us with the subject line "Account deletion request" from the email associated with your OSHunt account. We'll complete deletion within 14 days.</P>
          </Section>

          <Section id="retention" title="Data Retention">
            <P>We keep your account data for as long as your account is active. If you haven't signed in for 24 months, we may reach out to confirm you'd like to keep the account — and delete it if we don't hear back within 30 days.</P>
            <P>Cached AI outputs and temporary usage logs are retained for no more than 90 days. After account deletion, your personal data is removed from our primary database within 14 days. Backups may retain copies for up to 30 additional days before those are cycled out through standard backup rotation.</P>
          </Section>

          <Section id="children" title="Children's Privacy">
            <P>OSHunt is not designed for or directed at children under the age of 13, and we don't knowingly collect personal information from anyone under 13. If you believe a child under 13 has created an account, please contact us immediately and we'll delete the account and associated data.</P>
          </Section>

          <Section id="changes" title="Changes to This Policy">
            <P>We'll update this policy as OSHunt grows. The "Last updated" date at the top always reflects the most recent revision. For changes that materially affect how we handle your data, we'll notify registered users by email at least 14 days before the new policy takes effect.</P>
          </Section>

          <Section id="contact" title="Contact">
            <P>For privacy-related questions, data requests, or anything covered in this policy, reach out at{" "}
              <a href="mailto:privacy@oshunt.io" style={{ color: ACCENT, textDecoration: "none", borderBottom: `1px solid #a8ff3e44` }}>privacy@oshunt.io</a>.
              For general product questions,{" "}
              <a href="mailto:hello@oshunt.io" style={{ color: ACCENT, textDecoration: "none", borderBottom: `1px solid #a8ff3e44` }}>hello@oshunt.io</a>{" "}
              is the right place. We aim to respond to all privacy-related requests within five business days.
            </P>
            <P>This policy is governed by the laws of India. Any disputes relating to privacy that can't be resolved directly will be subject to the jurisdiction of the courts of Bhopal, Madhya Pradesh.</P>
          </Section>

          <div style={{ marginTop: 48, padding: "20px 22px", backgroundColor: CARD, borderRadius: 10, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12, color: "#333", lineHeight: 1.7, margin: 0 }}>
              This Privacy Policy sits alongside our{" "}
              <a href="/terms" style={{ color: MUTED, textDecoration: "none", borderBottom: "1px solid #2e2e2e" }}>Terms and Conditions</a>.
              Last reviewed <strong style={{ color: "#444" }}>June 15, 2025</strong>. Questions?{" "}
              <a href="mailto:privacy@oshunt.io" style={{ color: MUTED, textDecoration: "none" }}>privacy@oshunt.io</a>
            </p>
          </div>

        </main>
      </div>
    </div>
  )
}