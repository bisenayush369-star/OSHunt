"use client"
import { useState, useEffect } from "react"
import Link from "next/link"

// const LogoMark = () => (
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

const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24"
    fill={filled ? "#a8ff3e" : "none"}
    stroke={filled ? "#a8ff3e" : "#2a2a2a"}
    strokeWidth="1.5" strokeLinecap="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
)

type Bookmark = {
  id: string
  url: string
  title: string
  repoName: string
  type: "issue" | "repo"
  createdAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d === 0) return "today"
  if (d === 1) return "1d ago"
  if (d < 7)   return `${d}d ago`
  if (d < 30)  return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks]   = useState<Bookmark[]>([])
  const [loading,   setLoading]     = useState(true)
  const [filter,    setFilter]      = useState<"all" | "issue" | "repo">("all")
  const [removing,  setRemoving]    = useState<string | null>(null)
  const [hovRow,    setHovRow]      = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/bookmark")
      .then(r => r.json())
      .then(data => { setBookmarks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function remove(url: string) {
    setRemoving(url)
    await fetch("/api/bookmark", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
    setBookmarks(prev => prev.filter(b => b.url !== url))
    setRemoving(null)
  }

  const filtered = bookmarks.filter(b => filter === "all" || b.type === filter)

  return (
    <div style={{ minHeight:"100vh", background:"#090909", color:"#e0e0e0", fontFamily:"'Outfit','Inter',sans-serif", WebkitFontSmoothing:"antialiased" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        *{scrollbar-width:thin;scrollbar-color:rgba(168,255,62,.2) transparent}
        *::-webkit-scrollbar{width:3px}
        *::-webkit-scrollbar-thumb{background:rgba(168,255,62,.2);border-radius:2px}
        .nl:hover{color:#efefef!important}
        .tab:hover{color:#d0d0d0!important}
        .brow:hover{background:#111!important}
        .rmv:hover{opacity:1!important}
        .open:hover{color:#a8ff3e!important}
        .skel{background:#111;border-radius:6px;position:relative;overflow:hidden}
        .skel::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.03),transparent);animation:shimmer 1.5s infinite}
      `}</style>

      {/* NAV */}
      <nav style={{ position:"sticky", top:0, zIndex:50, height:52, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.75rem", background:"rgba(9,9,9,0.95)", backdropFilter:"blur(14px)", borderBottom:"1px solid #141414" }}>
       {/* ✅ To this */}
<Link href="/" style={{ display:"flex", alignItems:"center", gap:8, textDecoration:"none" }}>
  <LogoMark/>
  <span style={{ fontWeight:600, fontSize:15, color:"#efefef", letterSpacing:-0.3 }}><span style={{ color:"#a8ff3e" }}>OS</span>Hunt</span>
</Link>
        <div style={{ display:"flex", gap:2 }}>
          {[["Hunt","/hunt"],["GitLense","/analyze"],["Profile","/profile"],["Bookmarks","/bookmarks"]].map(([l,h]) => (
            <a key={l} href={h} className="nl" style={{ padding:"5px 12px", fontSize:13.5, color: l==="Bookmarks"?"#efefef":"#444", textDecoration:"none", borderRadius:6, transition:"color .15s" }}>{l}</a>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#a8ff3e", boxShadow:"0 0 7px #a8ff3e", animation:"pulse 2s infinite" }}/>
          <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#a8ff3e,#5aff00)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#090909", border:"2px solid rgba(168,255,62,0.3)" }}>A</div>
        </div>
      </nav>

      <div style={{ maxWidth:860, margin:"0 auto", padding:"2.5rem 1.5rem 4rem" }}>

        {/* HEADER */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"2rem", flexWrap:"wrap", gap:12, animation:"fadeUp .4s ease" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:5 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
              <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:-0.8, background:"linear-gradient(180deg,#fff 20%,#aaa 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Bookmarks</h1>
              {bookmarks.length > 0 && (
                <span style={{ fontSize:11, padding:"2px 9px", borderRadius:20, background:"rgba(168,255,62,0.08)", color:"#a8ff3e", border:"1px solid rgba(168,255,62,0.2)", fontFamily:"monospace" }}>{bookmarks.length}</span>
              )}
            </div>
            <p style={{ fontSize:13, color:"#333" }}>Saved issues and repos — pick up where you left off</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <a href="/hunt" style={{ padding:"8px 16px", background:"#a8ff3e", color:"#090909", borderRadius:8, fontSize:13, fontWeight:700, textDecoration:"none" }}>Hunt More →</a>
          </div>
        </div>

        {/* FILTER TABS */}
        <div style={{ display:"flex", gap:0, marginBottom:"1.5rem", borderBottom:"1px solid #141414", animation:"fadeUp .4s .05s ease both" }}>
          {(["all","issue","repo"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className="tab" style={{
              padding:"9px 18px", background:"none", border:"none",
              borderBottom: filter===f ? "2px solid #a8ff3e" : "2px solid transparent",
              color: filter===f ? "#a8ff3e" : "#444",
              fontSize:13, fontWeight: filter===f ? 600 : 400,
              cursor:"pointer", fontFamily:"inherit",
              transition:"all .15s", marginBottom:-1,
              textTransform:"capitalize"
            }}>
              {f === "all" ? `All (${bookmarks.length})` : f === "issue" ? `Issues (${bookmarks.filter(b=>b.type==="issue").length})` : `Repos (${bookmarks.filter(b=>b.type==="repo").length})`}
            </button>
          ))}
        </div>

        {/* LOADING */}
        {loading && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {[1,2,3,4].map((_, i) => (
              <div key={i} style={{ height:72, borderRadius:10, background:"#0f0f0f", border:"1px solid #141414", opacity: 1 - i * 0.15, position:"relative", overflow:"hidden" }}>
                <div className="skel" style={{ position:"absolute", inset:0 }}/>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY */}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:"center", padding:"4rem 0", animation:"fadeUp .4s ease" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e1e1e" strokeWidth="1.2" strokeLinecap="round" style={{ margin:"0 auto 14px", display:"block" }}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
            <p style={{ fontSize:14, color:"#222", marginBottom:14 }}>
              {filter === "all" ? "No bookmarks yet" : `No saved ${filter}s yet`}
            </p>
            <a href="/hunt" style={{ fontSize:13, color:"#a8ff3e", textDecoration:"none", padding:"8px 18px", border:"1px solid rgba(168,255,62,0.2)", borderRadius:8 }}>Start hunting →</a>
          </div>
        )}

        {/* BOOKMARK LIST */}
        {!loading && filtered.length > 0 && (
          <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:14, overflow:"hidden", animation:"fadeUp .4s .1s ease both" }}>
            {filtered.map((b, i) => (
              <div key={b.id}
                className="brow"
                onMouseEnter={() => setHovRow(b.id)}
                onMouseLeave={() => setHovRow(null)}
                style={{ display:"flex", alignItems:"center", gap:0, padding:"14px 1.25rem", borderBottom: i < filtered.length-1 ? "1px solid #0d0d0d" : "none", position:"relative", transition:"background .15s", background:"transparent" }}>

                {/* left accent bar */}
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:"#a8ff3e", transform: hovRow===b.id ? "scaleY(1)" : "scaleY(0)", transformOrigin:"center", transition:"transform .18s" }}/>

                {/* type badge */}
                <div style={{ width:28, height:28, borderRadius:8, flexShrink:0, marginRight:14, display:"flex", alignItems:"center", justifyContent:"center", background: b.type==="issue" ? "rgba(168,255,62,0.08)" : "rgba(255,255,255,0.04)", border:`1px solid ${b.type==="issue" ? "rgba(168,255,62,0.2)" : "#1a1a1a"}` }}>
                  {b.type === "issue"
                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/></svg>
                  }
                </div>

                {/* info */}
                <div style={{ flex:1, minWidth:0, paddingRight:16 }}>
                  <p style={{ fontSize:13.5, fontWeight:500, color: hovRow===b.id ? "#fff" : "#d0d0d0", marginBottom:3, letterSpacing:-0.2, transition:"color .15s", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{b.title}</p>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <p style={{ fontSize:11, color:"#252525", fontFamily:"monospace" }}>{b.repoName}</p>
                    <span style={{ fontSize:9, padding:"1px 7px", borderRadius:20, background: b.type==="issue" ? "rgba(168,255,62,0.07)" : "rgba(255,255,255,0.04)", color: b.type==="issue" ? "#a8ff3e" : "#444", fontFamily:"monospace" }}>{b.type}</span>
                  </div>
                </div>

                {/* date */}
                <span style={{ fontSize:11, color:"#1e1e1e", fontFamily:"monospace", flexShrink:0, marginRight:14 }}>{timeAgo(b.createdAt)}</span>

                {/* open link */}
                <a href={b.url} target="_blank" rel="noopener noreferrer" className="open" style={{ fontSize:12, color:"#2a2a2a", textDecoration:"none", marginRight:10, transition:"color .15s", flexShrink:0 }}>
                  View →
                </a>

                {/* remove */}
                <button onClick={() => remove(b.url)} disabled={removing === b.url} className="rmv" title="Remove bookmark" style={{ background:"none", border:"none", cursor:"pointer", padding:4, opacity:0.3, transition:"opacity .15s", display:"flex", alignItems:"center", flexShrink:0 }}>
                  {removing === b.url
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    : <BookmarkIcon filled/>
                  }
                </button>
              </div>
            ))}
          </div>
        )}

        {/* STATS */}
        {!loading && bookmarks.length > 0 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:16, animation:"fadeUp .4s .15s ease both" }}>
            <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:12, padding:"1rem 1.25rem" }}>
              <p style={{ fontSize:9, color:"#222", fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Saved Issues</p>
              <p style={{ fontSize:24, fontWeight:700, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:-1 }}>{bookmarks.filter(b=>b.type==="issue").length}</p>
            </div>
            <div style={{ background:"#0f0f0f", border:"1px solid #141414", borderRadius:12, padding:"1rem 1.25rem" }}>
              <p style={{ fontSize:9, color:"#222", fontFamily:"monospace", letterSpacing:1, textTransform:"uppercase", marginBottom:5 }}>Saved Repos</p>
              <p style={{ fontSize:24, fontWeight:700, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:-1 }}>{bookmarks.filter(b=>b.type==="repo").length}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}