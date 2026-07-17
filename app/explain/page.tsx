"use client"
import { useState } from "react"
import Navbar from "@/components/ui/Navbar"

type AnalysisResult = {
  purpose: string
  techStack: string[]
  startingPoint: string
}

const BookIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
const LayersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 17 22 12"></polyline></svg>
const MapIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>

export default function ExplainerPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    setIsAnalyzing(true)
    
    setTimeout(() => {
      setResult({
        purpose: "A seamless, full-stack framework built on top of React. It solves the problem of Client-Side Rendering (CSR) by introducing Server-Side Rendering (SSR) and Static Site Generation (SSG) out of the box, drastically improving SEO and initial page load times.",
        techStack: ["React.js (UI Library)", "Node.js (Server Environment)", "Webpack/Turbopack (Bundler)", "SWC (Rust-based compiler)"],
        startingPoint: "Do not start by reading the core compiler logic in Rust. Start by looking at `packages/next/src/server/next-server.ts`. This file handles the fundamental request/response lifecycle. It will show you exactly how an incoming HTTP request gets routed to a specific page component."
      })
      setIsAnalyzing(false)
    }, 2500)
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#090909", color: "#e0e0e0", fontFamily: "'Outfit', sans-serif" }}>
      <Navbar />
      
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem 2rem" }}>
        
        <div style={{ width: "100%", maxWidth: 700, textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Deconstruct Any Codebase</h1>
          <p style={{ fontSize: 15, color: "#888", marginBottom: 24 }}>Paste a GitHub URL below. The AI will break down what it does, how it is built, and exactly where you should start reading the code.</p>
          
          <div style={{ display: "flex", gap: 12, background: "#000", padding: "8px", borderRadius: 12, border: "1px solid #141414" }} className="focus-within:border-[#a8ff3e]/40">
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, paddingLeft: 16 }}>
              <span style={{ color: "#a8ff3e" }}><SearchIcon /></span>
              <input 
                value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/facebook/react" 
                style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 15, fontFamily: "monospace" }}
              />
            </div>
            <button 
              onClick={handleAnalyze} disabled={isAnalyzing}
              style={{ background: isAnalyzing ? "rgba(168,255,62,0.1)" : "#a8ff3e", color: isAnalyzing ? "#a8ff3e" : "#000", border: isAnalyzing ? "1px solid #a8ff3e" : "none", padding: "12px 24px", borderRadius: 8, fontWeight: 700, cursor: isAnalyzing ? "wait" : "pointer", transition: "all 0.2s" }}
            >
              {isAnalyzing ? "Deconstructing..." : "Explain Repo"}
            </button>
          </div>
        </div>

        {result && (
          <div style={{ width: "100%", maxWidth: 800, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            
            <div style={{ background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, padding: "24px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}><span style={{ color: "#a8ff3e" }}><BookIcon/></span> What It Solves</h3>
              <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>{result.purpose}</p>
            </div>

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

            <div style={{ gridColumn: "1 / -1", background: "#0a0a0a", border: "1px solid #141414", borderRadius: 12, padding: "24px" }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}><span style={{ color: "#a8ff3e" }}><MapIcon/></span> Where To Start Reading</h3>
              <p style={{ fontSize: 14, color: "#ccc", lineHeight: 1.7 }}>
                {result.startingPoint.split(/(`[^`]+`)/).map((part: string, i: number) => 
                  part.startsWith('`') ? <code key={i} style={{ color: "#a8ff3e", background: "rgba(168,255,62,0.05)", border: "1px solid rgba(168,255,62,0.2)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>{part.slice(1, -1)}</code> : part
                )}
              </p>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}