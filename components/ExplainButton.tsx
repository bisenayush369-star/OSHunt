"use client"
import { useState } from "react"
import Navbar from "@/components/ui/Navbar"

type AnalysisResult = {
  purpose: string
  techStack: string[]
  startingPoint: string
}

const BookIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
const LayersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
const MapIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>

// ─── Parse a GitHub URL into owner/repo ────────────────────────────────────
function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.trim().replace(/\/$/, "")
  const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") }
}

export default function ExplainerPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [wasCached, setWasCached] = useState(false)

  const handleAnalyze = async () => {
    if (!repoUrl) return
    setIsAnalyzing(true)
    setError("")
    setResult(null)

    try {
      const parsed = parseGithubUrl(repoUrl)
      if (!parsed) {
        throw new Error("That doesn't look like a valid GitHub URL.")
      }

      // ── Step 1: get real repo metadata via our own server route ──────────
      // This proxies GitHub server-side so GITHUB_TOKEN never reaches the browser.
      const ghRes = await fetch(`/api/github-repo?owner=${parsed.owner}&repo=${parsed.repo}`)

      if (!ghRes.ok) {
        const errData = await ghRes.json().catch(() => ({}))
        if (ghRes.status === 404) throw new Error("Repo not found. Check the URL.")
        if (ghRes.status === 429) throw new Error("GitHub rate limit hit — wait a minute and try again.")
        throw new Error(errData.error || "GitHub lookup failed. Try again in a moment.")
      }

      const ghData = await ghRes.json()
      const repoName = ghData.repoName as string
      const rawDescription = [
        ghData.description,
        ghData.language ? `Primary language: ${ghData.language}.` : "",
        Array.isArray(ghData.topics) && ghData.topics.length ? `Topics: ${ghData.topics.join(", ")}.` : "",
      ].filter(Boolean).join(" ")

      if (!rawDescription) {
        throw new Error("This repo has no description on GitHub — not enough context to analyze yet.")
      }

      // ── Step 2: call your real analyze route ──────────────────────────────
      // TODO: confirm this path matches where route.ts actually lives.
      // If it's at app/api/analyze/route.ts, "/api/analyze" is correct.
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName, rawDescription }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Analysis failed. Try again.")
      }

      const data = await res.json()
      setWasCached(Boolean(data.cached))
      window.dispatchEvent(new CustomEvent("usage:updated"))

      // ── Parse the LLM response ─────────────────────────────────────────
      // route.ts returns { text: string }. We expect TREND_ANALYST_PROMPT
      // to instruct JSON matching {purpose, techStack, startingPoint} —
      // if it doesn't yet, this falls back to showing raw text instead
      // of silently crashing.
      try {
        const cleanedText = data.text.replace(/```json|```/g, "").trim()
        const parsedResult = JSON.parse(cleanedText)
        setResult({
          purpose: parsedResult.purpose ?? "",
          techStack: Array.isArray(parsedResult.techStack) ? parsedResult.techStack : [],
          startingPoint: parsedResult.startingPoint ?? "",
        })
      } catch {
        setResult({ purpose: data.text, techStack: [], startingPoint: "" })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#090909", color: "#e0e0e0", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        .search-bar { border: 1px solid #141414; transition: border-color 0.15s; }
        .search-bar:focus-within { border-color: rgba(168,255,62,0.4); }

        button, input { outline: none; }
        button:focus-visible, input:focus-visible {
          outline: 2px solid rgba(168,255,62,0.5);
          outline-offset: 2px;
          border-radius: 6px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Navbar />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 2rem" }}>

        <div style={{ width: "100%", maxWidth: 700, textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Deconstruct Any Codebase</h1>
          <p style={{ fontSize: 15, color: "#888", marginBottom: 24 }}>Paste a GitHub URL below. The AI will break down what it does, how it is built, and exactly where you should start reading the code.</p>

          <div className="search-bar" style={{ display: "flex", gap: 12, background: "#000", padding: "8px", borderRadius: 12 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, paddingLeft: 16 }}>
              <span style={{ color: "#a8ff3e" }}><SearchIcon /></span>
              <input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="https://github.com/facebook/react"
                style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 15, fontFamily: "monospace" }}
              />
            </div>
            <button
              onClick={handleAnalyze} disabled={isAnalyzing}
              style={{ display: "flex", alignItems: "center", gap: 8, background: isAnalyzing ? "rgba(168,255,62,0.1)" : "#a8ff3e", color: isAnalyzing ? "#a8ff3e" : "#000", border: isAnalyzing ? "1px solid #a8ff3e" : "none", padding: "12px 24px", borderRadius: 8, fontWeight: 700, cursor: isAnalyzing ? "wait" : "pointer", transition: "all 0.2s" }}
            >
              {isAnalyzing && (
                <span style={{
                  width: 13, height: 13,
                  border: "2px solid rgba(168,255,62,0.25)",
                  borderTopColor: "#a8ff3e",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }} />
              )}
              {isAnalyzing ? "Deconstructing..." : "Explain Repo"}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "rgba(255,77,109,0.06)",
              border: "1px solid rgba(255,77,109,0.18)",
              borderRadius: 8, color: "#ff4d6d", fontSize: 13, textAlign: "left",
            }}>
              {error}
            </div>
          )}
        </div>

        {result && (
          <div style={{ width: "100%", maxWidth: 800 }}>
            {wasCached && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <span style={{
                  fontSize: 11, color: "#a8ff3e",
                  background: "rgba(168,255,62,0.06)",
                  border: "1px solid rgba(168,255,62,0.15)",
                  borderRadius: 20, padding: "3px 12px",
                }}>
                  ⚡ Served instantly from cache
                </span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>

              <div style={{ background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, padding: "24px" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}><span style={{ color: "#a8ff3e" }}><BookIcon/></span> What It Solves</h3>
                <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{result.purpose}</p>
              </div>

              {result.techStack.length > 0 && (
                <div style={{ background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, padding: "24px" }}>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}><span style={{ color: "#a8ff3e" }}><LayersIcon/></span> Core Tech Stack</h3>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.techStack.map((tech: string, i: number) => (
                      <li key={i} style={{ fontSize: 13, color: "#e0e0e0", background: "#000", padding: "6px 12px", borderRadius: 6, border: "1px solid #1a1a1a" }}>
                        {tech}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.startingPoint && (
                <div style={{ gridColumn: "1 / -1", background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, padding: "24px" }}>
                  <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}><span style={{ color: "#a8ff3e" }}><MapIcon/></span> Where To Start Reading</h3>
                  <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>
                    {result.startingPoint.split(/(`[^`]+`)/).map((part: string, i: number) =>
                      part.startsWith('`') ? <code key={i} style={{ color: "#a8ff3e", background: "rgba(168,255,62,0.05)", border: "1px solid rgba(168,255,62,0.2)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{part.slice(1, -1)}</code> : part
                    )}
                  </p>
                </div>
              )}

            </div>
          </div>
        )}

      </main>
    </div>
  )
}