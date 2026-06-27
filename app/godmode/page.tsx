"use client"
import { useState, useRef, useEffect } from "react"
import Navbar from "@/components/ui/Navbar"

// Inline IDE Icons
const TerminalIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
const FolderIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
const FileIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
const LockIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
const SettingsIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>

interface TerminalLog {
  role: 'system' | 'user' | 'architect' | 'error';
  text: string;
}

export default function GodMode() {
  // Toggle this to false to see the Glassmorphism Pro-Lock
  const isPro = true; 
  
  const [repoUrl, setRepoUrl] = useState("")
  const [issueId, setIssueId] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [tokensUsed, setTokensUsed] = useState(1450)
  const [inputStr, setInputStr] = useState("")
  
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const [terminalOutput, setTerminalOutput] = useState<TerminalLog[]>([
    { role: 'system', text: 'God Mode Engine v2.4 initialized.' },
    { role: 'system', text: 'Architect instance ready. Awaiting telemetry parameters...' }
  ])

  // Auto-scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [terminalOutput])

  const handleExecute = async () => {
    if (!repoUrl) {
      setTerminalOutput(prev => [...prev, { role: 'error', text: 'ERR: Repository target is required to instantiate Architect.' }])
      return
    }
    
    setIsAnalyzing(true)
    setTerminalOutput(prev => [...prev, 
      { role: 'user', text: `> EXECUTE TARGET: ${repoUrl} ${issueId ? `| ISSUE: ${issueId}` : ''}` },
      { role: 'system', text: 'Spawning isolated compute cluster...' },
      { role: 'system', text: 'Mapping dependency trees...' }
    ])

    // Mock API Latency for UI mapping
    setTimeout(() => {
      setTerminalOutput(prev => [...prev, {
        role: 'architect', 
        text: "### [Status: Dependency Map Acquired]\n\n**Technical Breakdown:**\nI have successfully cloned the abstract syntax tree for the target repository. The core architecture relies on a Next.js App Router pattern with React Server Components.\n\n**Architectural Note:**\nBe warned—modifying standard components inside the `/app` directory will trigger hydration conflicts if client hooks (like `useEffect`) are introduced without the `'use client'` directive.\n\nInput required: What specific logic flow do you want to refactor?"
      }])
      setTokensUsed(prev => prev + 452)
      setIsAnalyzing(false)
    }, 2800)
  }

  const handleUserChat = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputStr.trim()) {
      setTerminalOutput(prev => [...prev, { role: 'user', text: `> ${inputStr}` }])
      const query = inputStr;
      setInputStr("")
      setIsAnalyzing(true)

      // Mock Architect response to user query
      setTimeout(() => {
        setTerminalOutput(prev => [...prev, {
          role: 'architect',
          text: `Analyzing query: "${query}"\n\n**Next Steps:**\n1. Locate \`src/components/layout.tsx\`.\n2. Wrap the dynamic ID generation in a \`useId()\` hook (React 18+).\n3. Ensure \`instanceId\` is statically passed to the component props to prevent SSR mismatch.\n\n**Pattern Mismatch Warning:** Do not use \`Math.random()\` for IDs in this repo, it violates their deterministic rendering guidelines.`
        }])
        setTokensUsed(prev => prev + 210)
        setIsAnalyzing(false)
      }, 1500)
    }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#050505", color: "#e0e0e0", fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>
      
      <style>{`
        .oshunt-footer { display: none !important; }
        .gm-input:focus { outline: none; border-color: rgba(168,255,62,0.4); box-shadow: 0 0 12px rgba(168,255,62,0.05); }
        .terminal-scroll::-webkit-scrollbar { width: 4px; }
        .terminal-scroll::-webkit-scrollbar-track { background: transparent; }
        .terminal-scroll::-webkit-scrollbar-thumb { background: rgba(168,255,62,0.15); border-radius: 2px; }
        .terminal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(168,255,62,0.3); }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
      `}</style>

      <Navbar />

      <main style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        
        {/* ── PAYWALL OVERLAY (Glassmorphism) ── */}
        {!isPro && (
          <div style={{ 
            position: "absolute", inset: 0, zIndex: 50, 
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", 
            background: "rgba(5, 5, 5, 0.6)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" 
          }}>
            <div style={{ 
              background: "#0a0a0a", border: "1px solid #1a1a1a", padding: "3rem", 
              borderRadius: 16, textAlign: "center", maxWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.8)"
            }}>
              <div style={{ display: "inline-flex", padding: 16, background: "rgba(168,255,62,0.05)", borderRadius: "50%", marginBottom: 20, color: "#a8ff3e" }}>
                <LockIcon />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Architect Offline</h2>
              <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 24 }}>
                God Mode provides deep architectural mapping, dependency tracing, and clinical refactoring steps. Upgrade to Pro to unlock the terminal.
              </p>
              <a href="/pricing" style={{
                display: "inline-block", width: "100%", padding: "12px", background: "#a8ff3e",
                color: "#000", fontWeight: 700, borderRadius: 8, textDecoration: "none", fontSize: 14
              }}>Unlock God Mode for ₹149/mo</a>
            </div>
          </div>
        )}

        {/* ── PANE 1: CONFIG & GITLENSE MAPPER ── */}
        <aside style={{ width: 340, flexShrink: 0, borderRight: "1px solid #141414", display: "flex", flexDirection: "column", background: "#080808" }}>
          
          {/* Header */}
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #141414", background: "#0a0a0a" }}>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8, letterSpacing: -0.5 }}>
              <div style={{ width: 6, height: 6, background: "#a8ff3e", borderRadius: "50%", boxShadow: "0 0 8px #a8ff3e" }} />
              God Mode Engine
            </h1>
          </div>

          {/* Input Vector */}
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#555", fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase" }}>Repository Target</label>
              <input 
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="vercel/next.js"
                className="gm-input"
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", background: "#000", border: "1px solid #1e1e1e", borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 600, color: "#555", fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase" }}>Issue Context (Optional)</label>
              <input 
                value={issueId}
                onChange={(e) => setIssueId(e.target.value)}
                placeholder="#41923"
                className="gm-input"
                style={{ width: "100%", marginTop: 6, padding: "8px 10px", background: "#000", border: "1px solid #1e1e1e", borderRadius: 6, color: "#fff", fontSize: 12, fontFamily: "monospace" }}
              />
            </div>

            <button 
              onClick={handleExecute}
              disabled={isAnalyzing}
              style={{
                marginTop: 4, width: "100%", padding: "10px", borderRadius: 6,
                background: isAnalyzing ? "rgba(168,255,62,0.1)" : "rgba(168,255,62,0.08)",
                border: "1px solid rgba(168,255,62,0.3)",
                color: "#a8ff3e", fontWeight: 600, fontSize: 12, cursor: isAnalyzing ? "wait" : "pointer",
                fontFamily: "monospace", transition: "all 0.15s"
              }}
            >
              {isAnalyzing ? "Processing..." : "Run Initialization"}
            </button>
          </div>

          {/* Dependency Mapper (GitLense abstraction) */}
          <div style={{ flex: 1, borderTop: "1px solid #141414", display: "flex", flexDirection: "column", padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
               <label style={{ fontSize: 10, fontWeight: 600, color: "#555", fontFamily: "monospace", letterSpacing: 0.5, textTransform: "uppercase" }}>Dependency Map</label>
               <SettingsIcon />
            </div>
            
            <div style={{ flex: 1, background: "#000", border: "1px solid #141414", borderRadius: 6, padding: "1rem", color: "#666", fontSize: 11.5, fontFamily: "monospace", overflowY: "auto" }}>
              {repoUrl ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                   <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 6 }}><FolderIcon/> root/</span>
                   <span style={{ color: "#a8ff3e", display: "flex", alignItems: "center", gap: 6, paddingLeft: 12 }}><FolderIcon/> src/</span>
                   <span style={{ color: "#a8ff3e", display: "flex", alignItems: "center", gap: 6, paddingLeft: 24 }}><FolderIcon/> app/</span>
                   <span style={{ color: "#ccc", display: "flex", alignItems: "center", gap: 6, paddingLeft: 36, background: "rgba(255,255,255,0.05)", padding: "2px 4px", borderRadius: 4, marginLeft: 32 }}><FileIcon/> layout.tsx</span>
                   <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 6, paddingLeft: 36 }}><FileIcon/> page.tsx</span>
                   <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 6, paddingLeft: 24 }}><FolderIcon/> components/</span>
                   <span style={{ color: "#888", display: "flex", alignItems: "center", gap: 6, paddingLeft: 12 }}><FileIcon/> package.json</span>
                </div>
              ) : (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>
                  {/* Awaiting target vector */}
                </div>
              )}
            </div>
          </div>
          
          {/* Telemetry Footer */}
          <div style={{ padding: "12px 1.5rem", borderTop: "1px solid #141414", background: "#050505", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "#555", fontFamily: "monospace" }}>Model: Claude 3.5 Sonnet</span>
            <span style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}><span style={{ color: "#a8ff3e" }}>{tokensUsed}</span> tokens utilized</span>
          </div>

        </aside>

        {/* ── PANE 2: ARCHITECT TERMINAL ── */}
        <section style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0a0a", position: "relative" }}>
          
          {/* Mock CRT Scanline effect */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))", backgroundSize: "100% 2px, 3px 100%", zIndex: 10 }} />

          {/* Terminal Header */}
          <div style={{ padding: "12px 1.5rem", borderBottom: "1px solid #141414", background: "#050505", display: "flex", alignItems: "center", gap: 10 }}>
            <TerminalIcon />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#666", fontFamily: "monospace", letterSpacing: 0.5 }}>TERMINAL // ARCHITECT_OVERRIDE</span>
            {isAnalyzing && <span style={{ marginLeft: "auto", fontSize: 10, color: "#a8ff3e", fontFamily: "monospace", animation: "blink 1s infinite" }}>EXECUTING...</span>}
          </div>

          {/* Terminal Output Area */}
          <div className="terminal-scroll" style={{ flex: 1, padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20, zIndex: 20 }}>
            {terminalOutput.map((log, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                
                {/* Role Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ 
                    fontSize: 9, fontFamily: "monospace", textTransform: "uppercase", padding: "2px 6px", borderRadius: 4, fontWeight: 700,
                    background: log.role === 'system' ? '#111' : log.role === 'architect' ? 'rgba(168,255,62,0.1)' : log.role === 'error' ? 'rgba(255,0,0,0.1)' : '#1a1a1a',
                    color: log.role === 'system' ? '#555' : log.role === 'architect' ? '#a8ff3e' : log.role === 'error' ? '#ff4444' : '#fff'
                  }}>
                    {log.role}
                  </span>
                </div>

                {/* Content block */}
                <div style={{ 
                  fontSize: 12.5, color: log.role === 'system' ? '#666' : log.role === 'error' ? '#ff4444' : '#e0e0e0', 
                  fontFamily: log.role === 'user' ? "monospace" : "inherit",
                  whiteSpace: "pre-wrap", lineHeight: 1.6,
                }}>
                  {log.text.split('\n').map((line, index) => {
                    // Simple logic to style markdown headers and bold text in the terminal
                    if (line.startsWith('###')) return <h3 key={index} style={{ color: "#fff", fontSize: 14, margin: "8px 0", fontWeight: 600 }}>{line.replace('###', '')}</h3>
                    if (line.includes('**')) {
                      const parts = line.split('**');
                      return <p key={index} style={{ margin: "4px 0" }}>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#a8ff3e", fontWeight: 600 }}>{p}</strong> : p)}</p>
                    }
                    return <p key={index} style={{ margin: "4px 0" }}>{line}</p>
                  })}
                </div>
              </div>
            ))}
            
            {/* Blinking Cursor when waiting */}
            {isAnalyzing && (
              <div style={{ width: 8, height: 16, background: "#a8ff3e", animation: "blink 1s infinite" }} />
            )}
            
            <div ref={terminalEndRef} />
          </div>

          {/* Interactive Chat Input */}
          <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #141414", background: "#050505", zIndex: 20 }}>
            <div style={{ display: "flex", alignItems: "center", background: "#000", border: "1px solid #1a1a1a", borderRadius: 8, padding: "2px 12px", transition: "border 0.15s" }} className="focus-within:border-[#a8ff3e]/40">
              <span style={{ color: "#a8ff3e", fontFamily: "monospace", fontSize: 14, marginRight: 10 }}>$</span>
              <input 
                value={inputStr}
                onChange={(e) => setInputStr(e.target.value)}
                placeholder="Instruct the architect... (e.g. 'Generate a refactor roadmap')"
                disabled={isAnalyzing || terminalOutput.length < 3}
                style={{ width: "100%", padding: "12px 0", background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: 13, fontFamily: "monospace" }}
                onKeyDown={handleUserChat}
              />
            </div>
          </div>

        </section>
      </main>
    </div>
  )
}