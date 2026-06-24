import { useState, useEffect } from "react"
import type { ReactNode } from "react"

const BG = "#090909"
const CARD = "#0d0d0d"
const BORDER = "#1a1a1a"
const ACCENT = "#a8ff3e"
const MUTED = "#555"

function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const h = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  return m;
}

const Logo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="9" stroke={ACCENT} strokeWidth="1.5"/>
    <circle cx="14" cy="14" r="2.5" fill={ACCENT}/>
    <line x1="14" y1="1" x2="14" y2="6.5" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="21.5" x2="14" y2="27" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="1" y1="14" x2="6.5" y2="14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="21.5" y1="14" x2="27" y2="14" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

/* ── Custom SVGs ── */
const SearchNoiseIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="6.5" strokeWidth="1.5"/>
    <line x1="15" y1="15" x2="21" y2="21" strokeWidth="1.5"/>
    <line x1="7.5" y1="8.5" x2="9.5" y2="8.5" strokeWidth="1.2" opacity="0.5"/>
    <line x1="7.5" y1="10.5" x2="12.5" y2="10.5" strokeWidth="1.2" opacity="0.35"/>
    <line x1="7.5" y1="12.5" x2="10.5" y2="12.5" strokeWidth="1.2" opacity="0.2"/>
    <circle cx="13" cy="7.5" r="0.8" fill={color} opacity="0.4"/>
    <circle cx="8.5" cy="7" r="0.6" fill={color} opacity="0.3"/>
  </svg>
)

const OpaqueCodeIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="16" rx="2" strokeWidth="1.5"/>
    <line x1="7" y1="7.5" x2="11" y2="7.5" strokeWidth="1.4" opacity="0.6"/>
    <line x1="7" y1="10.5" x2="15" y2="10.5" strokeWidth="1.4" opacity="0.3"/>
    <line x1="7" y1="13.5" x2="12" y2="13.5" strokeWidth="1.4" opacity="0.15"/>
    <path d="M13 20 L11 23" strokeWidth="1.5" opacity="0.4"/>
    <path d="M11 20 L13 23" strokeWidth="1.5" opacity="0.4"/>
    <circle cx="17" cy="13.5" r="3.5" fill={BG} stroke={color} strokeWidth="1.4"/>
    <line x1="15.8" y1="13.5" x2="18.2" y2="13.5" strokeWidth="1.2"/>
    <line x1="17" y1="12.3" x2="17" y2="14.7" strokeWidth="1.2"/>
  </svg>
)

const PRCrossIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="6" r="2" strokeWidth="1.5"/>
    <circle cx="5" cy="18" r="2" strokeWidth="1.5"/>
    <circle cx="19" cy="6" r="2" strokeWidth="1.5"/>
    <path d="M5 8v8" strokeWidth="1.5"/>
    <path d="M7 6h7" strokeWidth="1.5"/>
    <path d="M14 9 L20 15" strokeWidth="1.5"/>
    <path d="M20 9 L14 15" strokeWidth="1.5"/>
  </svg>
)

const GradCapIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,3 22,8.5 12,14 2,8.5" strokeWidth="1.5"/>
    <path d="M6 11v5c0 0 2 3 6 3s6-3 6-3v-5" strokeWidth="1.5"/>
    <line x1="22" y1="8.5" x2="22" y2="14" strokeWidth="1.5"/>
    <circle cx="22" cy="14.5" r="0.8" fill={color}/>
  </svg>
)

const PivotIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 18 L20 6" strokeWidth="1.5"/>
    <path d="M14 6 L20 6 L20 12" strokeWidth="1.5"/>
    <path d="M10 18 L4 18 L4 12" strokeWidth="1.5"/>
  </svg>
)

const LightningIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeWidth="1.5"/>
  </svg>
)

const CodeBracketIcon = ({ size = 22, color = "#555" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" strokeWidth="1.5"/>
    <polyline points="8 6 2 12 8 18" strokeWidth="1.5"/>
    <line x1="14" y1="4" x2="10" y2="20" strokeWidth="1.2" opacity="0.5"/>
  </svg>
)

const LensIcon = ({ size = 22, color = "#888" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeLinecap="round">
    <circle cx="10.5" cy="10.5" r="6.5" strokeWidth="1.5"/>
    <line x1="15.5" y1="15.5" x2="21" y2="21" strokeWidth="1.5"/>
    <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" strokeWidth="1.2" opacity="0.6"/>
    <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" strokeWidth="1.2" opacity="0.6"/>
    <circle cx="10.5" cy="10.5" r="1.5" strokeWidth="1.2"/>
  </svg>
)

const issues = [
  { title: "Add rate limiting to Express API routes", repo: "expressjs/express", labels: ["good first issue", "help wanted"], match: 97, lang: "JS" },
  { title: "Fix TypeScript types for useSession hook", repo: "nextauthjs/next-auth", labels: ["good first issue", "typescript"], match: 94, lang: "TS" },
  { title: "Prisma schema validation in CI pipeline", repo: "prisma/prisma", labels: ["enhancement"], match: 89, lang: "TS" },
  { title: "MongoDB aggregation pipeline for analytics", repo: "mongodb/mongoose", labels: ["good first issue"], match: 82, lang: "JS" },
]

const lenseData = {
  summary: "Next.js is a React framework for building full-stack web applications. It extends React with file-based routing, server-side rendering, and API routes — all in one dev experience.",
  structure: [
    { path: "packages/next/src/server/", desc: "Core SSR logic & routing engine" },
    { path: "packages/next/src/client/", desc: "Client-side hydration & navigation" },
    { path: "packages/next/src/build/", desc: "Webpack config & build pipeline" },
  ],
  start: "Start in packages/next/src/server/app-render/ — this is where RSC rendering happens. Good first issues usually touch the client/ directory.",
}

function Tag({ children, green = false }: { children: ReactNode; green?: boolean }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 99,
      backgroundColor: green ? "#a8ff3e14" : "#ffffff08",
      color: green ? ACCENT : "#666",
      border: `1px solid ${green ? "#a8ff3e33" : "#1e1e1e"}`,
      fontWeight: 500, whiteSpace: "nowrap"
    }}>{children}</span>
  )
}

const WHO = [
  { Icon: GradCapIcon,    title: "Students & self-taught devs",   body: "You have the skills but not the history. OSHunt builds a real contribution record that speaks louder than any tutorial project." },
  { Icon: PivotIcon,      title: "Career switchers",              body: "Pivoting into dev? Merged PRs in real repos prove you can work in production codebases — without the overwhelm." },
  { Icon: LightningIcon,  title: "Side project builders",         body: "You already build in public. OSHunt connects that energy to established open source projects and multiplies your GitHub presence." },
  { Icon: CodeBracketIcon,title: "Junior devs pre-interview",     body: "Nothing kills an interview answer like vague portfolio projects. Merged OSS contributions are concrete, verifiable, and impressive." },
]

const PROBLEMS = [
  { Icon: SearchNoiseIcon, title: "GitHub search is noise",        body: "Searching 'good first issue' returns thousands of issues in repos you know nothing about, using tech you don't use." },
  { Icon: OpaqueCodeIcon,  title: "Codebases are opaque",          body: "Even if you find a good issue, understanding a 500-file codebase takes hours before you touch a single line of code." },
  { Icon: PRCrossIcon,     title: "Mismatched PRs get ignored",    body: "Contributing to a repo in a stack you half-know means bad code, slow reviews, and PRs that never merge." },
]

export default function WhatIsOSHunt() {
  const m = useIsMobile()
  const [activeIssue, setActiveIssue] = useState(0)
  const [typed, setTyped] = useState("")
  const fullUrl = "https://github.com/vercel/next.js"

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap"
    document.head.appendChild(link)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      i += 1
      setTyped(fullUrl.slice(0, i))
      if (i >= fullUrl.length) clearInterval(iv)
    }, 40)
    return () => clearInterval(iv)
  }, [])

  const sectionPad = m ? "52px 18px" : "80px 48px"
  const maxW = 900

  return (
    <div style={{ backgroundColor: BG, minHeight: "100vh", fontFamily: "'Outfit', sans-serif", color: "#fff", WebkitFontSmoothing: "antialiased" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: m ? "0 18px" : "0 48px", height: 54,
        backgroundColor: "rgba(9,9,9,0.9)", backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${BORDER}`
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Logo size={m ? 20 : 22} />
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em" }}>OSHunt</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!m && <button style={{ background: "none", border: `1px solid ${BORDER}`, color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: "6px 16px", borderRadius: 7 }}>Sign in</button>}
          <button style={{ backgroundColor: ACCENT, color: "#000", border: "none", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Get started</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden", paddingTop: m ? 80 : 120 }}>
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse at top, #a8ff3e0f 0%, transparent 65%)", pointerEvents: "none" }} />
        {!m && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(circle, #ffffff07 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(ellipse 90% 50% at 50% 0%, black 30%, transparent 100%)" }} />}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: m ? "40px 18px 56px" : "60px 48px 80px", textAlign: "center", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, backgroundColor: "#a8ff3e0c", border: "1px solid #a8ff3e25", borderRadius: 99, padding: "4px 14px 4px 10px", marginBottom: 24 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: ACCENT }} />
            <span style={{ fontSize: 11.5, color: ACCENT, fontWeight: 500 }}>What is OSHunt?</span>
          </div>
          <h1 style={{ fontSize: m ? 34 : 56, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05, margin: "0 0 20px" }}>
            The missing layer<br />between you and<br />
            <span style={{ color: ACCENT }}>open source.</span>
          </h1>
          <p style={{ fontSize: m ? 14 : 16, color: "#666", lineHeight: 1.75, margin: "0 auto", maxWidth: 520 }}>
            OSHunt is an AI-powered platform that finds GitHub issues matching your tech stack — and explains any codebase in plain English before you write a line. Not just a search engine. A contribution co-pilot.
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
          <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>The problem</p>
          <h2 style={{ fontSize: m ? 26 : 36, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 36px", lineHeight: 1.1 }}>
            Open source is overwhelming<br />to break into.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
            {PROBLEMS.map(({ Icon, title, body }) => (
              <div key={title} style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 20px" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "#111", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={19} color="#555" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ISSUE HUNTER */}
      <section style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: m ? 36 : 56, alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#a8ff3e12", border: "1px solid #a8ff3e25", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Logo size={17} />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: ACCENT, letterSpacing: "0.07em", textTransform: "uppercase" }}>Issue Hunter</span>
              </div>
              <h2 style={{ fontSize: m ? 24 : 30, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.15 }}>
                Issues matched to<br />your exact stack.
              </h2>
              <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.75, margin: "0 0 22px" }}>
                Paste your skills, connect GitHub. The Gemini-powered engine scans thousands of open issues and surfaces ones that match your exact stack — sorted by difficulty, repo health, and fit score.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Stack matching", "Issues ranked by how well they map to your skills — not just keywords."],
                  ["Difficulty scoring", "Each issue labeled by complexity so you're not hitting brick walls."],
                  ["Repo health check", "Dead repos with no maintainers are filtered out automatically."],
                  ["AI summaries", "Gemini writes a plain-English explanation of what each issue asks for."]
                ].map(([t, d]) => (
                  <div key={t} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: ACCENT, flexShrink: 0, marginTop: 7 }} />
                    <div><span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{t} — </span><span style={{ fontSize: 13, color: "#555" }}>{d}</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Issue cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {issues.map((iss, i) => (
                <div key={i} onClick={() => setActiveIssue(i)} style={{ backgroundColor: activeIssue === i ? "#131313" : CARD, border: `1px solid ${activeIssue === i ? "#2a2a2a" : BORDER}`, borderRadius: 10, padding: "13px 14px", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
                    {iss.labels.map(l => <Tag key={l} green={l === "good first issue"}>{l}</Tag>)}
                  </div>
                  <p style={{ margin: "0 0 8px", fontSize: 12.5, color: "#ccc", fontWeight: 500, lineHeight: 1.4 }}>{iss.title}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10.5, color: "#3a3a3a", fontFamily: "monospace" }}>{iss.repo}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: ACCENT }} />
                      <span style={{ fontSize: 10.5, color: ACCENT, fontWeight: 700 }}>{iss.match}% match</span>
                    </div>
                  </div>
                  {activeIssue === i && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                      <p style={{ fontSize: 11.5, color: "#555", lineHeight: 1.6, margin: 0 }}>
                        <span style={{ color: ACCENT, fontWeight: 600 }}>Gemini says: </span>
                        Beginner-friendly issue matching your {iss.lang === "TS" ? "TypeScript" : "JavaScript"} background. Estimated 2–4 hours to complete.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* GITLENSE */}
      <section style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: m ? 36 : 56, alignItems: "center" }}>

            {/* Terminal — on mobile this goes first */}
            <div style={{ order: m ? 2 : 1, backgroundColor: "#080808", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ backgroundColor: "#111", padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 7 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#222" }} />)}
                <span style={{ fontSize: 11, color: "#2a2a2a", marginLeft: 8, fontFamily: "monospace" }}>GitLense</span>
              </div>
              <div style={{ padding: "13px 15px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #a8ff3e22", borderRadius: 7, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <LensIcon size={14} color="#a8ff3e66" />
                  <span style={{ fontSize: m ? 10 : 11.5, color: "#555", fontFamily: "monospace", wordBreak: "break-all" }}>{typed}<span style={{ borderRight: "1px solid #a8ff3e", marginLeft: 1 }}>&nbsp;</span></span>
                </div>
              </div>
              <div style={{ padding: 15 }}>
                <div style={{ marginBottom: 13 }}>
                  <p style={{ fontSize: 9.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>What it does</p>
                  <p style={{ fontSize: 11.5, color: "#777", lineHeight: 1.65, margin: 0 }}>{lenseData.summary}</p>
                </div>
                <div style={{ marginBottom: 13 }}>
                  <p style={{ fontSize: 9.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 7 }}>Key directories</p>
                  {lenseData.structure.map(s => (
                    <div key={s.path} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                      <span style={{ fontSize: m ? 9 : 10, color: ACCENT, fontFamily: "monospace", flexShrink: 0, marginTop: 1, wordBreak: "break-all" }}>{s.path}</span>
                      <span style={{ fontSize: 10.5, color: "#444" }}>{s.desc}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ fontSize: 9.5, color: MUTED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Where to start</p>
                  <p style={{ fontSize: 11, color: "#555", lineHeight: 1.6, margin: 0 }}>{lenseData.start}</p>
                </div>
              </div>
            </div>

            {/* Text */}
            <div style={{ order: m ? 1 : 2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "#111", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <LensIcon size={18} />
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#888", letterSpacing: "0.07em", textTransform: "uppercase" }}>GitLense</span>
              </div>
              <h2 style={{ fontSize: m ? 24 : 30, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 14px", lineHeight: 1.15 }}>
                Any codebase,<br />in plain English.
              </h2>
              <p style={{ fontSize: 13.5, color: "#666", lineHeight: 1.75, margin: "0 0 22px" }}>
                Drop a GitHub URL. GitLense reads the repo and gives you a breakdown you can actually understand — what it does, how it&apos;s structured, and where a first-timer should look.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["No setup", "Paste a URL. That's it."],
                  ["Architecture map", "Understand layout before you clone."],
                  ["Entry-point guide", "Know which files to read first and why."],
                  ["Contribution context", "AI hints for where the issue actually lives."]
                ].map(([t, d]) => (
                  <div key={t} style={{ display: "flex", gap: 10 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#333", flexShrink: 0, marginTop: 7 }} />
                    <div><span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{t} — </span><span style={{ fontSize: 13, color: "#555" }}>{d}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
          <p style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 10 }}>Who it&apos;s for</p>
          <h2 style={{ fontSize: m ? 26 : 36, fontWeight: 700, letterSpacing: "-0.03em", margin: "0 0 36px", lineHeight: 1.1 }}>
            Built for devs ready to stop<br />watching and start shipping.
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 14 }}>
            {WHO.map(({ Icon, title, body }) => (
              <div key={title} style={{ backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 20px" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: "#111", border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon size={19} color="#555" />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.015em", margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "#555", lineHeight: 1.65, margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: sectionPad }}>
          <div style={{ position: "relative", overflow: "hidden", backgroundColor: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: m ? "40px 24px" : "60px 52px", textAlign: "center" }}>
            <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: "radial-gradient(ellipse at top, #a8ff3e0d 0%, transparent 70%)", pointerEvents: "none" }} />
            <h2 style={{ fontSize: m ? 24 : 34, fontWeight: 700, letterSpacing: "-0.035em", margin: "0 0 10px", lineHeight: 1.1, position: "relative" }}>
              Ready to make your first<br />contribution land?
            </h2>
            <p style={{ fontSize: 13.5, color: "#555", margin: "0 0 28px", position: "relative" }}>Free forever for individual contributors.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
              <button style={{ backgroundColor: ACCENT, color: "#000", border: "none", padding: "12px 24px", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}>Start hunting free →</button>
              <button style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, padding: "12px 22px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>View landing page</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", padding: m ? "22px 18px" : "26px 48px", display: "flex", flexDirection: m ? "column" : "row", alignItems: m ? "flex-start" : "center", justifyContent: "space-between", gap: m ? 14 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={17} />
            <span style={{ fontSize: 12, color: "#2a2a2a" }}>OSHunt.io © 2025</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["Twitter / X", "GitHub", "Privacy", "Terms"].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: "#2a2a2a", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>

    </div>
  )
}