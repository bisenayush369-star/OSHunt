"use client"
import { useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import Navbar from "@/components/ui/Navbar";

const LogoMark = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2"/>
    <circle cx="18" cy="18" r="4" stroke="#a8ff3e" strokeWidth="0.7" opacity="0.4"/>
    <line x1="18" y1="2" x2="18" y2="0" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="18" y1="34" x2="18" y2="36" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="2" y1="18" x2="0" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="34" y1="18" x2="36" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="18" cy="18" r="1.8" fill="#a8ff3e"/>
  </svg>
)

export default function Analyze() {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [owner, setOwner] = useState("")
  const [repo, setRepo] = useState("")
  const [error, setError] = useState("")

  const analyze = async () => {
    if (!url) return
    setLoading(true)
    setError("")
    setResult("")
    setOwner("")
    setRepo("")
    
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url }), // Keep your existing variable name here
      });

      // 🔥 NEW: Catch the specific Rate Limit Block
      if (response.status === 429) {
        const errorData = await response.json();
        setError(errorData.error); // Displays "Whoa, slow down!"
        setLoading(false);
        return; // Stop running
      }

      // Handle other errors (500, etc.)
      if (!response.ok) {
        throw new Error("Failed to analyze repository");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const repoName = owner && repo ? `${owner}/${repo}` : url.replace("https://github.com/", "").split("/").slice(0, 2).join("/")

  return (
      <>
    <div style={{
      minHeight: "100vh",
      background: "#090909",
      color: "#dde0f0",
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes shimmer { 0% { transform:translateX(-100%) } 100% { transform:translateX(100%) } }
        .prose-dark { color: #9090b0; line-height: 1.75; font-size: 14px; }
        .prose-dark h1,.prose-dark h2,.prose-dark h3 { color: #e0e0f0; font-weight: 600; margin: 1.5rem 0 0.5rem; letter-spacing: -0.3px; }
        .prose-dark h1 { font-size: 18px; }
        .prose-dark h2 { font-size: 16px; }
        .prose-dark h3 { font-size: 14px; }
        .prose-dark p { margin-bottom: 0.75rem; }
        .prose-dark code { background: #14142a; color: #a8ff3e; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-family: monospace; }
        .prose-dark pre { background: #0c0c1a; border: 1px solid #1c1c30; border-radius: 8px; padding: 1rem; overflow-x: auto; margin: 1rem 0; }
        .prose-dark pre code { background: none; padding: 0; color: #c0c0d8; }
        .prose-dark ul,.prose-dark ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        .prose-dark li { margin-bottom: 0.25rem; }
        .prose-dark strong { color: #dde0f0; font-weight: 600; }
        .prose-dark a { color: #a8ff3e; text-decoration: none; }
        .url-input:focus { border-color: rgba(168,255,62,0.4) !important; outline: none; }
        .analyze-btn:hover { opacity: 0.88; }
        .analyze-btn:disabled { opacity: 0.5; cursor: default; }
        .nav-link { padding: 6px 14px; font-size: 14px; color: #555; text-decoration: none; border-radius: 6px; transition: color 0.15s; }
        .nav-link:hover { color: #efefef; }
        .nav-link.active { color: #efefef; }
        .skel { background: #0f0f1e; border-radius: 8px; position: relative; overflow: hidden; }
        .skel::after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent); animation:shimmer 1.5s infinite; }
      `}</style>

     <Navbar />

      {/* Main */}
      <div style={{ paddingTop: 56, maxWidth: 780, margin: "0 auto", padding: "80px 1.5rem 4rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {/* The NEW AI AI Code-Core Scanner - Vibrant State */}
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              {/* Abstract Code Grid (faint backdrop) */}
              <path d="M10 6 L18 10 L26 6 M6 10 L18 18 L30 10 M10 18 L18 22 L26 18" stroke="#a8ff3e" strokeWidth="0.3" opacity="0.1"/>
              {/* Geometric AI Neural Core - The Claude Robot brain */}
           {/* Scanning Prism Arrays */}
<path d="M18 12 L23 18 L18 24 L13 18 Z" stroke="#a8ff3e" strokeWidth="1" strokeDasharray="2 2"/>
{/* Fracture/Problem Detection Beams (the netlify issue vibe) */}
<path d="M4 4 L12 12 M32 4 L24 12 M4 32 L12 24 M32 32 L24 24" stroke="#a8ff3e" strokeWidth="1" opacity="0.4"/>
<path d="M12 12 L18 18 M24 12 L18 18 M12 24 L18 18 M24 24 L18 18" stroke="#a8ff3e" strokeWidth="0.8" opacity="0.2"/>
{/* Problem identified focus pulse */}
<circle cx="18" cy="18" r="1.5" fill="#a8ff3e" fillOpacity="0.8"/>
<circle cx="18" cy="18" r="3" stroke="#a8ff3e" strokeWidth="0.5" strokeDasharray="1 1"/>
            </svg>
            <span style={{ fontSize: 11, color: "#a8ff3e", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 500 }}>GitLense</span>
          </div>
          <h1 style={{ fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 10 }}>
            Understand any repo<br />before you touch it.
          </h1>
          <p style={{ fontSize: 15, color: "#555", lineHeight: 1.65, fontWeight: 300, maxWidth: 480 }}>
            Paste a GitHub URL. AI reads the codebase and gives you a plain-English breakdown — architecture, stack, how to contribute.
          </p>
        </div>

        {/* Input */}
        <div style={{
          background: "#0c0c1a",
          border: "1px solid #14142a",
          borderRadius: 14,
          padding: "1.5rem"
        }}>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="url-input"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
              placeholder="https://github.com/user/repo"
              style={{
                flex: 1, padding: "11px 15px",
                background: "#06060e",
                border: "1px solid #1c1c30",
                borderRadius: 10,
                color: "#dde0f0",
                fontSize: 13,
                fontFamily: "monospace",
                transition: "border-color 0.15s"
              }}
            />
            <button
              className="analyze-btn"
              onClick={analyze}
              disabled={loading || !url}
              style={{
                padding: "11px 22px",
                background: "#a8ff3e",
                color: "#090909",
                border: "none",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
                transition: "opacity 0.15s"
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: "2px solid rgba(9,9,9,0.3)",
                    borderTopColor: "#090909",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.7s linear infinite"
                  }} />
                  Analyzing
                </>
              ) : "Analyze →"}
            </button>
          </div>

          {/* Example repos */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#2a2a3a", fontFamily: "monospace" }}>try:</span>
            {["vercel/next.js", "expressjs/express", "prisma/prisma"].map(r => (
              <button key={r} onClick={() => setUrl(`https://github.com/${r}`)} style={{
                fontSize: 11, color: "#3a3a5a", background: "none",
                border: "1px solid #1a1a2e", borderRadius: 6,
                padding: "3px 8px", cursor: "pointer", fontFamily: "monospace",
                transition: "all 0.15s"
              }}
              onMouseOver={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(168,255,62,0.3)"
                ;(e.currentTarget as HTMLElement).style.color = "#a8ff3e"
              }}
              onMouseOut={e => {
                (e.currentTarget as HTMLElement).style.borderColor = "#1a1a2e"
                ;(e.currentTarget as HTMLElement).style.color = "#3a3a5a"
              }}
              >{r}</button>
            ))}
          </div>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: "#0c0c1a", border: "1px solid #14142a", borderRadius: 14, padding: "1.5rem" }}>
              <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                {[120, 80, 100].map((w, i) => (
                  <div key={i}>
                    <div className="skel" style={{ height: 10, width: 60, marginBottom: 6 }} />
                    <div className="skel" style={{ height: 14, width: w }} />
                  </div>
                ))}
              </div>
              <div className="skel" style={{ height: 10, width: 80, marginBottom: 10 }} />
              <div className="skel" style={{ height: 13, width: "100%", marginBottom: 6 }} />
              <div className="skel" style={{ height: 13, width: "88%", marginBottom: 6 }} />
              <div className="skel" style={{ height: 13, width: "75%" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ background: "#0c0c1a", border: "1px solid #14142a", borderRadius: 10, padding: "10px 14px" }}>
                  <div className="skel" style={{ height: 9, width: 60, marginBottom: 6 }} />
                  <div className="skel" style={{ height: 13, width: "70%" }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 20, padding: "1rem 1.25rem",
            background: "rgba(255,77,109,0.06)",
            border: "1px solid rgba(255,77,109,0.18)",
            borderRadius: 10, color: "#ff4d6d", fontSize: 13
          }}>{error}</div>
        )}

        {/* Result */}
        {result && !loading && (
          <div style={{ marginTop: 20, animation: "fadeUp 0.35s ease forwards" }}>

            {/* Repo header */}
            <div style={{
              background: "#0c0c1a",
              border: "1px solid #14142a",
              borderRadius: 14,
              padding: "1.25rem 1.5rem",
              marginBottom: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#a8ff3e", fontFamily: "monospace" }}>{repoName}</span>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12, color: "#3a3a5a", textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 5,
                    border: "1px solid #1c1c30", borderRadius: 6,
                    padding: "4px 10px", transition: "all 0.15s"
                  }}
                  onMouseOver={e => {
                    (e.currentTarget as HTMLElement).style.color = "#a8ff3e"
                    ;(e.currentTarget as HTMLElement).style.borderColor = "rgba(168,255,62,0.3)"
                  }}
                  onMouseOut={e => {
                    (e.currentTarget as HTMLElement).style.color = "#3a3a5a"
                    ;(e.currentTarget as HTMLElement).style.borderColor = "#1c1c30"
                  }}
                >
                  View on GitHub
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
                  </svg>
                </a>
              </div>

              {/* AI explanation */}
              <div style={{
                borderTop: "1px solid #10101e",
                paddingTop: 14
              }}>
                <p style={{ fontSize: 10, color: "#2a2a3a", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>AI Analysis</p>
                <div className="prose-dark">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            </div>

            {/* Hunt issues from this repo CTA */}
            <div style={{
              padding: "1rem 1.5rem",
              background: "rgba(168,255,62,0.04)",
              border: "1px solid rgba(168,255,62,0.12)",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 12
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>Ready to contribute to this repo?</p>
                <p style={{ fontSize: 12, color: "#3a3a5a" }}>Hunt real open issues matched to your stack</p>
              </div>
              <a href="/hunt" style={{
                padding: "8px 18px", background: "#a8ff3e",
                color: "#090909", borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                textDecoration: "none", whiteSpace: "nowrap"
              }}>Hunt Issues →</a>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={{ marginTop: 40, textAlign: "center" }}>
            {/* The NEW AI Code-Core Scanner - Muted Idle State */}
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" style={{ margin: "0 auto 12px" }}>
              {/* Abstract Code Grid (faint backdrop) */}
              <path d="M10 6 L18 10 L26 6 M6 10 L18 18 L30 10 M10 18 L18 22 L26 18" stroke="#1c1c2e" strokeWidth="0.3" opacity="0.1"/>
              {/* Geometric AI Neural Core - The Claude Robot brain */}
              <path d="M18 6 L28 18 L18 30 L8 18 Z" stroke="#1c1c2e" strokeWidth="1.2"/>
              {/* Scanning Prism Arrays */}
              <path d="M18 12 L23 18 L18 24 L13 18 Z" stroke="#a8ff3e" strokeWidth="1" strokeDasharray="2 2"/>
              {/* Muted Problem Detection Beams (the repo finding problem vibe) */}
              <path d="M4 4 L12 12 M32 4 L24 12 M4 32 L12 24 M32 32 L24 24" stroke="#1c1c2e" strokeWidth="1" opacity="0.4"/>
              <path d="M12 12 L18 18 M24 12 L18 18 M12 24 L18 18 M24 24 L18 18" stroke="#1c1c2e" strokeWidth="0.8" opacity="0.2"/>
              {/* Muted pulse point */}
              <circle cx="18" cy="18" r="1.5" fill="#1c1c2e" fillOpacity="0.8"/>
            </svg>
            <p style={{ fontSize: 14, color: "#2a2a3a" }}>Paste a repo URL above to get started</p>
          </div>
        )}
      </div>
    </div>
    </>
  )
}