"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"

const LogoMark = () => (
  <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2"/>
    <circle cx="18" cy="18" r="4"  stroke="#a8ff3e" strokeWidth="0.7" opacity="0.4"/>
    <line x1="18" y1="2"  x2="18" y2="0"  stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="18" y1="34" x2="18" y2="36" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="2"  y1="18" x2="0"  y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <line x1="34" y1="18" x2="36" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="18" cy="18" r="1.8" fill="#a8ff3e"/>
  </svg>
)

const solvedRecords = [
  { id: 1, title: "Fix memory leak in image processor", repo: "facebook/react", date: "2 days ago", type: "Merged PR" },
  { id: 2, title: "Resolve hydration mismatch error", repo: "vercel/next.js", date: "1 week ago", type: "Issue Closed" },
  { id: 3, title: "Update outdated API documentation", repo: "tailwindlabs/tailwindcss", date: "3 weeks ago", type: "Merged PR" },
]

export default function RecordsPage() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // This closes the dropdown if you click anywhere else on the screen
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div style={{ minHeight:"100vh", background:"#090909", color:"#e0e0e0", fontFamily:"'Outfit','Inter',sans-serif", WebkitFontSmoothing:"antialiased" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .nl:hover{color:#efefef!important}
        .brow:hover{background:#111!important}
      `}</style>

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:50, height:52, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.75rem", background:"rgba(9,9,9,0.95)", backdropFilter:"blur(14px)", borderBottom:"1px solid #141414" }}>
        <Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
          <LogoMark/>
          <span style={{ fontWeight:600, fontSize:15, color:"#efefef", letterSpacing:-0.3 }}><span style={{ color:"#a8ff3e" }}>OS</span>Hunt</span>
        </Link>
        <div style={{ display:"flex", gap:2 }}>
          {[["Hunt","/hunt"],["GitLense","/analyze"],["Saved","/saved"]].map(([l,h]) => (
            <Link key={l} href={h} className="nl" style={{ padding:"5px 12px", fontSize:13.5, color: "#444", textDecoration:"none", borderRadius:6, transition:"color .15s" }}>{l}</Link>
          ))}
        </div>
        
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#a8ff3e", boxShadow:"0 0 7px #a8ff3e", animation:"pulse 2s infinite" }}/>
          
          {/* USER DROPDOWN (Clickable Avatar) */}
          <div style={{ position: "relative" }} ref={dropdownRef}>
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#a8ff3e,#5aff00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#090909", border:"2px solid rgba(168,255,62,0.3)", cursor:"pointer", transition:"transform 0.15s" }}
            >
              A
            </div>

            {dropdownOpen && (
              <div style={{ position: "absolute", top: "120%", right: 0, width: 200, background: "#0f0f0f", border: "1px solid #141414", borderRadius: 12, padding: "0.5rem", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", zIndex: 100, animation: "fadeUp 0.2s ease" }}>
                
                <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid #141414", marginBottom: "0.5rem" }}>
                  <p style={{ fontSize: 13, color: "#efefef", fontWeight: 600 }}>Ayush Bisen</p>
                  <p style={{ fontSize: 11, color: "#666" }}>ayush@gmail.com</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Link href="/records" onClick={() => setDropdownOpen(false)} style={{ display: "block", padding: "0.5rem 0.75rem", fontSize: 13, color: "#d0d0d0", textDecoration: "none", borderRadius: 6 }}>
                    📊 My Records
                  </Link>
                  
                  <Link href="/dashboard" onClick={() => setDropdownOpen(false)} style={{ display: "block", padding: "0.5rem 0.75rem", fontSize: 13, color: "#d0d0d0", textDecoration: "none", borderRadius: 6 }}>
                    ⚙️ Settings & Billing
                  </Link>

                  <button style={{ width: "100%", textAlign: "left", padding: "0.5rem 0.75rem", fontSize: 13, color: "#ff4d6d", background: "none", border: "none", borderRadius: 6, cursor: "pointer", marginTop: "0.25rem" }}>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </nav>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"2.5rem 1.5rem 4rem" }}>

        {/* HEADER */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"2rem", flexWrap:"wrap", gap:12, animation:"fadeUp .4s ease" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, background:"linear-gradient(180deg,#fff 20%,#aaa 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>My Records</h1>
            </div>
            <p style={{ fontSize:13, color:"#333" }}>Your open-source contribution history and solved problems.</p>
          </div>
        </div>

        {/* STATS ROW */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:"2rem", animation:"fadeUp .4s .05s ease both" }}>
          <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:12, padding:"1.25rem" }}>
            <p style={{ fontSize:10, color:"#444", fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Total Solved</p>
            <p style={{ fontSize:28, fontWeight:700, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:-1 }}>12</p>
          </div>
          <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:12, padding:"1.25rem" }}>
            <p style={{ fontSize:10, color:"#444", fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>PRs Merged</p>
            <p style={{ fontSize:28, fontWeight:700, color:"#efefef", fontFamily:"monospace", letterSpacing:-1 }}>8</p>
          </div>
          <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:12, padding:"1.25rem" }}>
            <p style={{ fontSize:10, color:"#444", fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Current Streak</p>
            <p style={{ fontSize:28, fontWeight:700, color:"#efefef", fontFamily:"monospace", letterSpacing:-1 }}>3 Days</p>
          </div>
        </div>

        {/* HISTORY LIST */}
        <h2 style={{ fontSize:14, fontWeight:600, color:"#888", marginBottom:"1rem", animation:"fadeUp .4s .1s ease both" }}>Recent Activity</h2>
        
        <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:14, overflow:"hidden", animation:"fadeUp .4s .15s ease both" }}>
          {solvedRecords.map((record, i) => (
            <div key={record.id} className="brow" style={{ display:"flex", alignItems:"center", gap:0, padding:"14px 1.25rem", borderBottom: i < solvedRecords.length-1 ? "1px solid #0d0d0d" : "none", transition:"background .15s" }}>
              
              <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, marginRight:14, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(168,255,62,0.08)", border:"1px solid rgba(168,255,62,0.2)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>

              <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
                <p style={{ fontSize:13.5, fontWeight:500, color:"#d0d0d0", marginBottom:3, letterSpacing:-0.2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{record.title}</p>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <p style={{ fontSize:11, color:"#252525", fontFamily:"monospace" }}>{record.repo}</p>
                  <span style={{ fontSize:9, padding:"1px 7px", borderRadius:20, background:"rgba(255,255,255,0.04)", color:"#666", fontFamily:"monospace" }}>{record.type}</span>
                </div>
              </div>

              <span style={{ fontSize:11, color:"#1e1e1e", fontFamily:"monospace", flexShrink:0 }}>{record.date}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}