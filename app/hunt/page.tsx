"use client"
import { useState } from "react"
import Link from "next/link";
import Select from "react-select";
import BookmarkBtn from "@/components/BookmarkBtn"
import Navbar from "@/components/ui/Navbar";

interface Issue {
  id: number
  html_url: string
  title: string
  repository_url: string
  created_at: string
  comments: number
  reactions: Record<string, number>
}

const LANGUAGES = ["JavaScript", "TypeScript", "Python", "Go", "Rust", "C#", "C++", "PHP", "Ruby", "java"]
const DIFFICULTIES = ["easy", "medium", "hard"] as const
type Difficulty = typeof DIFFICULTIES[number]

const DIFF = {
  easy:   { color: "#a8ff3e", bg: "rgba(168,255,62,0.08)",   border: "rgba(168,255,62,0.2)"   },
  medium: { color: "#ffd166", bg: "rgba(255,209,102,0.08)",  border: "rgba(255,209,102,0.2)"  },
  hard:   { color: "#ff4d6d", bg: "rgba(255,77,109,0.08)",   border: "rgba(255,77,109,0.2)"   },
}

const LogoMark = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Left Arc: The "O" (Organic, Open Source, Community) */}
    <path d="M 18 4 A 14 14 0 0 0 18 32 L 18 26 A 8 8 0 0 1 18 10 Z" fill="#a8ff3e" opacity="0.3" />
    
    {/* Right Chevron: The ">" (The Hunt, Precision, Code Bracket) */}
    <path d="M 18 4 L 32 18 L 18 32 L 18 26 L 26 18 L 18 10 Z" fill="#a8ff3e" />
    
    {/* The Target Issue: The exact bug isolated in the center void */}
    <circle cx="13" cy="18" r="2.5" fill="#a8ff3e" />
  </svg>
);

const ScopeIcon = ({ dim = false }) => (
  <svg width="40" height="40" viewBox="0 0 36 36" fill="none" style={{ flexShrink: 0 }}>
  {/* Subtle Internal Grid */}
  <path d="M12 12 h12 v12 h-12 z" stroke="#a8ff3e" strokeWidth="0.4" opacity="0.08" />
  <line x1="18" y1="6" x2="18" y2="30" stroke="#a8ff3e" strokeWidth="0.4" opacity="0.1" strokeDasharray="2 2" />
  <line x1="6" y1="18" x2="30" y2="18" stroke="#a8ff3e" strokeWidth="0.4" opacity="0.1" strokeDasharray="2 2" />

  {/* Segmented Outer Tracking Ring */}
  <circle cx="18" cy="18" r="14" stroke="#a8ff3e" strokeWidth="1.2" strokeDasharray="16 6 4 6" opacity="0.85" />
  
  {/* Radar Ring */}
  <circle cx="18" cy="18" r="9" stroke="#a8ff3e" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.4" />

  {/* Target Containment Brackets [ ] */}
  <path d="M11 15 V11 H15" stroke="#a8ff3e" strokeWidth="1.3" strokeLinecap="round" />
  <path d="M25 15 V11 H21" stroke="#a8ff3e" strokeWidth="1.3" strokeLinecap="round" />
  <path d="M11 21 V25 H15" stroke="#a8ff3e" strokeWidth="1.3" strokeLinecap="round" />
  <path d="M25 21 V25 H21" stroke="#a8ff3e" strokeWidth="1.3" strokeLinecap="round" />

  {/* Tactical Inward Crosshair Pinpoints */}
  <line x1="18" y1="6" x2="18" y2="9" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
  <line x1="18" y1="30" x2="18" y2="27" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
  <line x1="6" y1="18" x2="9" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
  <line x1="30" y1="18" x2="27" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />

  {/* Center Issue Anomaly Core */}
  <circle cx="18" cy="18" r="2" fill="#a8ff3e" />
  <circle cx="18" cy="18" r="4.5" stroke="#a8ff3e" strokeWidth="0.5" opacity="0.6" />
</svg>
)

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1)  return "just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function repoName(url: string) {
  return url.replace("https://api.github.com/repos/", "")
}

export default function Hunt() {
  const [issues,      setIssues]      = useState<Issue[]>([])
  const [loading,     setLoading]     = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,        setPage]        = useState(1)
  const [language,    setLanguage]    = useState("JavaScript")
  const [difficulty,  setDifficulty]  = useState<Difficulty>("easy")
  const [done,        setDone]        = useState(false)
  const [searched,    setSearched]    = useState(false)

  async function fetchIssues(p = 1, reset = false) {
    if (reset) setLoading(true); else setLoadingMore(true)
    try {
      const res  = await fetch(`/api/issues?language=${language.toLowerCase()}&difficulty=${difficulty}&page=${p}`)
      const data = await res.json()
      const fetched: Issue[] = (data.items || []).filter((i: Issue) => i.repository_url)
      if (reset) { setIssues(fetched); setDone(false) }
      else        { setIssues(prev => [...prev, ...fetched]) }
      if (fetched.length < 10) setDone(true)
      setPage(p)
      setSearched(true)
    } catch { /* silent */ }
    setLoading(false)
    setLoadingMore(false)
  }

  const d = DIFF[difficulty]

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#090909", color: "#e0e0e0", fontFamily: "'Outfit', 'Inter', sans-serif", overflow: "hidden" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        /* Scrollbar */
        .scroll-area::-webkit-scrollbar       { width: 3px }
        .scroll-area::-webkit-scrollbar-track { background: transparent }
        .scroll-area::-webkit-scrollbar-thumb { background: rgba(168,255,62,0.2); border-radius: 2px }
        .scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(168,255,62,0.4) }

        @keyframes shimmer  { 0%   { transform: translateX(-100%) } 100% { transform: translateX(100%) } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn   { from { opacity:0 } to { opacity:1 } }
        @keyframes spin     { to   { transform: rotate(360deg) } }
        @keyframes pulse    { 0%,100% { opacity:1 } 50% { opacity:.4 } }

        .issue-row { transition: background 0.15s, border-color 0.15s }
        .issue-row:hover { background: #111 !important }
        .issue-row:hover .issue-bar { transform: scaleY(1) !important }
        .issue-row:hover .issue-title-text { color: #fff !important }

        .filter-btn { transition: all 0.15s; border: 1px solid transparent }
        .filter-btn:hover { color: #efefef !important }

        .search-btn:hover { filter: brightness(1.08) }
        .search-btn:active { transform: scale(0.98) }

        .load-more:hover { border-color: rgba(168,255,62,0.3) !important; color: #a8ff3e !important }

        .nav-link { color: #444; text-decoration: none; font-size: 13.5px; padding: 5px 12px; border-radius: 6px; transition: color 0.15s }
        .nav-link:hover { color: #efefef }
        .nav-link.active { color: #efefef }

        .example-btn { font-size: 11px; background: none; border: 1px solid #1a1a2e; border-radius: 5px; padding: 3px 8px; cursor: pointer; font-family: monospace; color: #444444; transition: all 0.15s }
        .example-btn:hover { border-color: rgba(168,255,62,0.3); color: #a8ff3e }
      `}</style>

     {/* ── NAV ── */}
      <Navbar />

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <aside className="scroll-area" style={{
          width: 248, flexShrink: 0,
          borderRight: "1px solid #141414",
          overflowY: "auto",
          background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
          padding: "1.75rem 1.25rem"
        }}>

          {/* Gradient title like "Get known." */}
          <div style={{ marginBottom: "2rem" }}>
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none" style={{ flexShrink: 0, marginRight: "12px" }}>
  {/* Outer Cyber-Hexagon Perimeter */}
  <path d="M18 3 L31 10.5 V25.5 L18 33 L5 25.5 V10.5 Z" stroke="#a8ff3e" strokeWidth="0.5" opacity="0.15" strokeDasharray="3 4"/>
  
  {/* Angular Lock-on Brackets (Aggressive Hunter Vibe) */}
  <path d="M13 7 L7 10.5 L7 15" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M23 7 L29 10.5 L29 15" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M13 29 L7 25.5 L7 21" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  <path d="M23 29 L29 25.5 L29 21" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>

  {/* Internal Threat Diamond Matrix */}
  <path d="M18 11 L25 18 L18 25 L11 18 Z" stroke="#a8ff3e" strokeWidth="1.2" fill="rgba(168,255,62,0.06)"/>

  {/* Precision Scope Laser Lines */}
  <line x1="18" y1="2" x2="18" y2="7" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
  <line x1="18" y1="29" x2="18" y2="34" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
  <line x1="2" y1="18" x2="7" y2="18" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
  <line x1="29" y1="18" x2="34" y2="18" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>

  {/* The "Bug" Target Core */}
  <circle cx="18" cy="18" r="2.5" fill="#a8ff3e" />
  <circle cx="18" cy="18" r="6.5" stroke="#a8ff3e" strokeWidth="0.6" strokeDasharray="1 3" opacity="0.7"/>
</svg>
    <h1 style={{ 
      fontSize: 22, 
      fontWeight: 800, 
      letterSpacing: -0.8, 
      background: "linear-gradient(180deg,#fff 20%,#888 100%)", 
      WebkitBackgroundClip: "text", 
      WebkitTextFillColor: "transparent" 
    }}>
      Hunt Issues
    </h1>
  </div>
  <p style={{ fontSize: 13, color: "#333" }}>
    Real bugs from real repos — matched to your stack
  </p>
</div>

          {/* Language */}
<p style={{ fontSize: 9, fontWeight: 700, color: "#2a2a2a", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>Language</p>
<Select
  instanceId="language-select" // 💡 just paste this line right here!
  value={{ value: language.toLowerCase(), label: language }}
  onChange={(opt) => opt && setLanguage(opt.label)}
  options={[
              { value: "javascript", label: "JavaScript" },
              { value: "typescript", label: "TypeScript" },
              { value: "python",     label: "Python"     },
              { value: "go",         label: "Go"         },
              { value: "rust",       label: "Rust"       },
              { value: "java",       label: "Java"       },
              { value: "kotlin",     label: "Kotlin"     },
              { value: "swift",      label: "Swift"      },
              { value: "csharp",     label: "C#"         },
              { value: "cpp",        label: "C++"        },
              { value: "c",          label: "C"          },
              { value: "php",        label: "PHP"        },
              { value: "ruby",       label: "Ruby"       },
              { value: "scala",      label: "Scala"      },
              { value: "dart",       label: "Dart"       },
              { value: "elixir",     label: "Elixir"     },
              { value: "haskell",    label: "Haskell"    },
              { value: "lua",        label: "Lua"        },
              { value: "r",          label: "R"          },
              { value: "shell",      label: "Shell"      },
              { value: "ocaml",      label: "OCaml"      },
              { value: "julia",      label: "Julia"      },
              { value: "zig",        label: "Zig"        },
              { value: "clojure",    label: "Clojure"    },
              { value: "erlang",     label: "Erlang"     },
              { value: "svelte",     label: "Svelte"     },
              { value: "vue",        label: "Vue"        },
              { value: "solidity",   label: "Solidity"   },
              { value: "gleam",      label: "Gleam"      },
              { value: "nim",        label: "Nim"        },
            ]}
            isSearchable={true}
            placeholder="Search language..."
            styles={{
              control: (base, state) => ({
                ...base, background: "#0f0f0f",
                border: `1px solid ${state.isFocused ? "rgba(168,255,62,0.4)" : "#1e1e1e"}`,
                borderRadius: 8, boxShadow: "none", minHeight: 38, cursor: "pointer",
                transition: "border-color 0.15s",
                "&:hover": { borderColor: "rgba(168,255,62,0.25)" },
              }),
              valueContainer:     (base) => ({ ...base, padding: "0 10px" }),
              singleValue:        (base) => ({ ...base, color: "#a8ff3e", fontSize: 13, fontWeight: 500 }),
              placeholder:        (base) => ({ ...base, color: "#2e2e2e", fontSize: 13 }),
              indicatorSeparator: ()     => ({ display: "none" }),
              dropdownIndicator:  (base) => ({ ...base, color: "#2a2a2a", padding: "0 8px", "&:hover": { color: "#a8ff3e" } }),
              menu: (base) => ({
                ...base, background: "#0f0f0f", border: "1px solid #1e1e1e",
                borderRadius: 8, boxShadow: "0 12px 32px rgba(0,0,0,0.7)", overflow: "hidden", zIndex: 999,
              }),
              menuList: (base) => ({ ...base, padding: 4 }),
              option:   (base, state) => ({
                ...base,
                background: state.isSelected ? "rgba(168,255,62,0.1)" : state.isFocused ? "rgba(255,255,255,0.04)" : "transparent",
                color: state.isSelected ? "#a8ff3e" : "#555",
                fontSize: 13, borderRadius: 6, cursor: "pointer",
                "&:active": { background: "rgba(168,255,62,0.08)" },
              }),
              input: (base) => ({ ...base, color: "#e0e0e0" }),
            }}
          />

          {/* Difficulty */}
          <p style={{ fontSize: 9, fontWeight: 700, color: "#2a2a2a", letterSpacing: 1.5, textTransform: "uppercase", margin: "22px 0 10px", fontFamily: "monospace" }}>Difficulty</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DIFFICULTIES.map(dif => {
              const active = difficulty === dif
              return (
                <button key={dif} onClick={() => setDifficulty(dif)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  width: "100%", padding: "9px 12px", borderRadius: 8,
                  background: active ? DIFF[dif].bg : "transparent",
                  border: `1px solid ${active ? DIFF[dif].border : "transparent"}`,
                  borderLeft: `3px solid ${active ? DIFF[dif].color : "transparent"}`,
                  color: active ? DIFF[dif].color : "#444",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: DIFF[dif].color, flexShrink: 0,
                    boxShadow: active ? `0 0 8px ${DIFF[dif].color}` : "none",
                    transition: "box-shadow 0.15s"
                  }}/>
                  <span style={{ fontSize: 13, textTransform: "capitalize", fontWeight: active ? 600 : 400 }}>{dif}</span>
                  {active && <span style={{ marginLeft: "auto", fontSize: 9, color: DIFF[dif].color, fontFamily: "monospace", opacity: 0.7 }}>✓</span>}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <button className="search-btn" onClick={() => fetchIssues(1, true)} disabled={loading} style={{
            marginTop: 24, width: "100%", padding: "11px", borderRadius: 8, border: "none",
            background: loading ? "rgba(168,255,62,0.3)" : "#a8ff3e",
            color: "#090909", fontWeight: 700, fontSize: 13,
            cursor: loading ? "default" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "all 0.15s",
            boxShadow: loading ? "none" : "0 0 20px rgba(168,255,62,0.15)"
          }}>
            {loading
              ? <><span style={{ width:13, height:13, border:"2px solid rgba(0,0,0,0.2)", borderTopColor:"#090909", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/> Searching</>
              : "Search →"
            }
          </button>

          {/* Divider */}
          <div style={{ margin: "24px 0", height: 1, background: "linear-gradient(90deg, transparent, #1e1e1e, transparent)" }}/>

          {/* Live stats */}
          {searched && !loading && (
            <div style={{ marginBottom: 20, padding: "10px 12px", background: "#0f0f0f", borderRadius: 8, border: "1px solid #1a1a1a" }}>
              <p style={{ fontSize: 9, color: "#2a2a2a", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Results</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#a8ff3e", letterSpacing: -1, fontFamily: "monospace" }}>{issues.length}</p>
              <p style={{ fontSize: 10, color: "#2e2e2e", marginTop: 2 }}>{language} · {difficulty}</p>
            </div>
          )}

          {/* Quick repos */}
          <p style={{ fontSize: 9, fontWeight: 700, color: "#2a2a2a", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, fontFamily: "monospace" }}>Quick repos</p>
          {["vercel/next.js", "expressjs/express", "prisma/prisma", "facebook/react", "vitejs/vite"].map(r => (
            <a key={r} href={`/analyze?repo=https://github.com/${r}`} style={{
              display: "block", padding: "6px 10px",
              fontSize: 11, color: "#2a2a2a",
              fontFamily: "monospace", textDecoration: "none",
              borderRadius: 6, marginBottom: 2, transition: "all 0.15s"
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = "#a8ff3e"; (e.currentTarget as HTMLElement).style.background = "rgba(168,255,62,0.04)" }}
            onMouseOut={e  => { (e.currentTarget as HTMLElement).style.color = "#2a2a2a"; (e.currentTarget as HTMLElement).style.background = "transparent" }}
            >{r}</a>
          ))}
        </aside>

        {/* ── MAIN ── */}
        <main className="scroll-area" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

          {/* Top bar */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "rgba(9,9,9,0.92)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #141414",
            padding: "0 1.5rem",
            height: 44, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {searched && !loading && (
                <>
                  <span style={{ fontSize: 12, color: "#333333", fontFamily: "monospace" }}>
                    {issues.length} issues
                  </span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: d.bg, color: d.color, border: `1px solid ${d.border}`, fontFamily: "monospace", textTransform: "capitalize" }}>{difficulty}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.04)", color: "#444444", fontFamily: "monospace" }}>{language}</span>
                </>
              )}
              {!searched && (
                <span style={{ fontSize: 12, color: "#333333", fontFamily: "monospace" }}>pick a filter and search</span>
              )}
            </div>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width:10, height:10, border:"1.5px solid rgba(168,255,62,0.2)", borderTopColor:"#a8ff3e", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                <span style={{ fontSize: 11, color: "#444444", fontFamily: "monospace" }}>searching</span>
              </div>
            )}
          </div>

          {/* Skeletons */}
          {loading && (
            <div style={{ padding: "0.5rem 0" }}>
              {[1,2,3,4,5,6,7].map((_, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "16px 1.5rem",
                  borderBottom: "1px solid #0d0d0d",
                  opacity: 1 - i * 0.1,
                }}>
                  <div style={{ width: 22, height: 10, borderRadius: 4, background: "#141414", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)", animation: "shimmer 1.5s infinite" }}/>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ height: 13, borderRadius: 4, background: "#141414", width: `${55 + (i % 3) * 15}%`, position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)", animation: "shimmer 1.5s infinite" }}/>
                    </div>
                    <div style={{ height: 10, borderRadius: 4, background: "#0e0e0e", width: "30%", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent)", animation: "shimmer 1.5s infinite" }}/>
                    </div>
                  </div>
                  <div style={{ width: 50, height: 20, borderRadius: 20, background: "#0e0e0e", flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent)", animation: "shimmer 1.5s infinite" }}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && !searched && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100% - 44px)", gap: 12, color: "#1e1e1e" }}>
              <ScopeIcon dim/>
              <p style={{ fontSize: 13, color: "#222222" }}>Pick your stack and hit Search</p>
            </div>
          )}

          {/* No results */}
          {!loading && searched && issues.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100% - 44px)", gap: 12 }}>
              <ScopeIcon dim/>
              <p style={{ fontSize: 13, color: "#222222" }}>No issues found — try a different filter</p>
            </div>
          )}

          {/* Issue list */}
          {!loading && issues.length > 0 && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {issues.map((issue, i) => (
                <a
                  key={issue.id}
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="issue-row"
                  style={{
                    display: "flex", alignItems: "center", gap: 0,
                    padding: "15px 1.5rem",
                    borderBottom: "1px solid #0d0d0d",
                    textDecoration: "none", color: "inherit",
                    position: "relative", cursor: "pointer",
                    background: "transparent",
                    animationDelay: `${Math.min(i * 30, 300)}ms`
                  }}
                >
                  {/* Left accent bar */}
                  <div className="issue-bar" style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: 2, background: "#a8ff3e",
                    transform: "scaleY(0)", transformOrigin: "center",
                    transition: "transform 0.18s ease"
                  }}/>

                  {/* Index */}
                  <span style={{ fontSize: 10.5, color: "#1e1e1e", fontFamily: "monospace", width: 28, flexShrink: 0, paddingLeft: 6 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
                    <p className="issue-title-text" style={{
                      fontSize: 13.5, fontWeight: 500,
                      color: "#d8d8d8", marginBottom: 4,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      letterSpacing: -0.2, transition: "color 0.15s"
                    }}>{issue.title}</p>
                    <p style={{ fontSize: 11, color: "#2e2e2e", fontFamily: "monospace" }}>
                      {repoName(issue.repository_url)}
                    </p>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 10, padding: "2px 9px", borderRadius: 20,
                      background: d.bg, color: d.color, border: `1px solid ${d.border}`,
                      fontFamily: "monospace", textTransform: "capitalize"
                    }}>{difficulty}</span>
                    <span style={{ fontSize: 11, color: "#1e1e1e", fontFamily: "monospace", minWidth: 48, textAlign: "right" }}>
                      {timeAgo(issue.created_at)}
                    </span>
                  </div>
                  <BookmarkBtn
      url={issue.html_url}
      title={issue.title}
      repoName={repoName(issue.repository_url)} // Use your defined repoName function
      type="issue"
    />
                </a>
              ))}

              {/* Load more skeletons */}
              {loadingMore && [1,2].map((_, i) => (
                <div key={i} style={{
                  height: 72, borderBottom: "1px solid #0d0d0d",
                  background: "#0a0a0a", opacity: 1 - i * 0.4,
                  position: "relative", overflow: "hidden"
                }}>
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.02),transparent)", animation: "shimmer 1.5s infinite" }}/>
                </div>
              ))}

              {/* Load more */}
              {!loadingMore && !done && (
                <div style={{ padding: "1rem 1.5rem" }}>
                  <button className="load-more" onClick={() => fetchIssues(page + 1)} style={{
                    width: "100%", padding: "12px",
                    background: "transparent",
                    border: "1px dashed #1a1a1a",
                    borderRadius: 10, color: "#333333",
                    fontSize: 12, cursor: "pointer",
                    fontFamily: "monospace", letterSpacing: 0.5,
                    transition: "all 0.15s"
                  }}>load more →</button>
                </div>
              )}

              {done && (
                <p style={{ textAlign: "center", color: "#1a1a1a", fontSize: 11, fontFamily: "monospace", padding: "1.25rem" }}>
                  — end of results —
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}