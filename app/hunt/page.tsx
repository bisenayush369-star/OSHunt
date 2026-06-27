"use client"
import { useState, useMemo } from "react"
import Select from "react-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
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

const DIFFICULTIES = ["easy", "medium", "hard"] as const
type Difficulty = typeof DIFFICULTIES[number]

const SORT_OPTIONS = [
  { value: "newest",          label: "Newest first" },
  { value: "least-commented", label: "Least commented · uncontested" },
  { value: "most-commented",  label: "Most commented · active discussion" },
  { value: "most-reactions",  label: "Most reactions" },
] as const
type SortBy = typeof SORT_OPTIONS[number]["value"]

const DIFF = {
  easy:   { color: "#a8ff3e", bg: "rgba(168,255,62,0.08)",   border: "rgba(168,255,62,0.2)"   },
  medium: { color: "#ffd166", bg: "rgba(255,209,102,0.08)",  border: "rgba(255,209,102,0.2)"  },
  hard:   { color: "#ff4d6d", bg: "rgba(255,77,109,0.08)",   border: "rgba(255,77,109,0.2)"   },
}

function GithubMiniIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.5 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.1-1.49-1.1-1.49-.9-.63.07-.62.07-.62.99.07 1.51 1.04 1.51 1.04.89 1.55 2.33 1.1 2.9.84.09-.66.34-1.1.62-1.36-2.22-.26-4.55-1.13-4.55-5.02 0-1.11.38-2.02 1.01-2.73-.1-.26-.44-1.31.1-2.72 0 0 .83-.27 2.72 1.04a9.2 9.2 0 0 1 4.96 0c1.89-1.31 2.72-1.04 2.72-1.04.54 1.41.2 2.46.1 2.72.63.71 1.01 1.62 1.01 2.73 0 3.9-2.34 4.76-4.57 5.01.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckMiniIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 12.5 9 18 20 6" />
    </svg>
  );
}

function FilterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="7" y1="12" x2="17" y2="12" /><line x1="10" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  );
}

function ChevronIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortBy,      setSortBy]      = useState<SortBy>("newest")
  const [copiedId,    setCopiedId]    = useState<number | null>(null)

  function copyRepoLink(id: number, repo: string) {
    navigator.clipboard?.writeText(`https://github.com/${repo}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const sortedIssues = useMemo(() => {
    const arr = [...issues]
    switch (sortBy) {
      case "least-commented": return arr.sort((a, b) => a.comments - b.comments)
      case "most-commented":  return arr.sort((a, b) => b.comments - a.comments)
      case "most-reactions":  return arr.sort((a, b) => (b.reactions?.total_count || 0) - (a.reactions?.total_count || 0))
      default:                return arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }
  }, [issues, sortBy])

async function fetchIssues(p = 1, reset = false, customLang?: string) {
  if (reset) setLoading(true); else setLoadingMore(true)
  try {
    const targetLang = customLang || language;
    const res  = await fetch(`/api/issues?language=${targetLang.toLowerCase()}&difficulty=${difficulty}&page=${p}`)
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

        /* This is an app shell, not a marketing page — the global footer doesn't belong here.
           Scoped to this style tag, so it only hides while Hunt is mounted and comes back
           automatically on every other route. No layout.tsx/footer.tsx changes needed. */
        .oshunt-footer { display: none !important; }

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
        @keyframes popIn    { from { opacity:0; transform: scale(0.94) } to { opacity:1; transform: scale(1) } }

        .issue-row { transition: background 0.15s, border-color 0.15s }
        .issue-row:hover { background: #111 !important }
        .issue-row:active { background: #0d0d0d !important }
        .issue-row:hover .issue-bar { transform: scaleY(1) !important }
        .issue-row:hover .issue-title-text { color: #fff !important }

        .diff-segment { position:relative; display:grid; grid-template-columns:repeat(3,1fr); background:#0a0a0a; border:1px solid #1a1a1a; border-radius:10px; padding:4px; }
        .diff-seg-indicator { position:absolute; top:4px; left:4px; width:calc(33.333% - 2.67px); height:calc(100% - 8px); border-radius:7px; border:1px solid; transition:transform .25s cubic-bezier(.4,0,.2,1), background .25s, border-color .25s; z-index:0; }
        .diff-seg-btn { position:relative; z-index:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 4px; border:none; background:transparent; font-size:12.5px; font-weight:600; font-family:inherit; cursor:pointer; transition:color .15s; }
        .diff-seg-btn:active { transform: scale(0.96); }

        .copy-btn:active { transform: scale(0.9); }

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

        /* Quick repos — redesigned, real touch target, icon instead of bare monospace text */
        .quick-repo-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 11px; font-size:12px; color:#666; text-decoration:none; border-radius:20px; border:1px solid #1a1a1a; transition:all .15s; font-family:'Outfit',sans-serif; }
        .quick-repo-chip:hover { background:rgba(168,255,62,0.06); color:#a8ff3e; border-color:rgba(168,255,62,0.25); }
        .quick-repo-chip:active { transform: scale(0.96); }
        .quick-repo-link svg { flex-shrink:0; opacity:.55; transition:opacity .15s; }
        .quick-repo-link:hover svg { opacity:1; }

        /* Copy repo link button on each issue row */
        .copy-btn {
          display:flex; align-items:center; gap:4px; background:none; border:1px solid #1a1a1a;
          color:#333; padding:4px 8px; border-radius:6px; font-size:10.5px; cursor:pointer;
          font-family:'Outfit',sans-serif; transition:all .15s; flex-shrink:0;
        }
        .copy-btn:hover { border-color:rgba(168,255,62,0.3); color:#a8ff3e; }
        .copy-btn.copied { border-color:rgba(168,255,62,0.4); color:#a8ff3e; }

        /* Sort select, styled to match the rest of the dark UI */
        /* Sort trigger + shadcn DropdownMenu content, styled to match your account dropdown */
        .sort-trigger {
          background:#0f0f0f; border:1px solid #1e1e1e; color:#999; font-size:12.5px;
          padding:7px 12px; border-radius:7px; font-family:'Outfit',sans-serif; cursor:pointer;
          display:flex; align-items:center; gap:6px; outline:none; transition:border-color .15s;
        }
        .sort-trigger:hover { border-color:rgba(168,255,62,0.3); }
        .sort-menu-content {
          background:#0e0e0e !important; border:1px solid #1e1e1e !important;
          border-radius:10px !important; padding:6px !important; min-width:230px !important;
        }
        .sort-menu-item {
          font-size:13px !important; color:#999 !important; border-radius:7px !important;
          padding:9px 10px !important; cursor:pointer !important;
        }
        .sort-menu-item:hover, .sort-menu-item[data-highlighted] {
          background:rgba(168,255,62,0.08) !important; color:#a8ff3e !important;
        }

        @media (max-width: 860px) {
          .search-btn { padding:13px !important; font-size:14.5px !important; box-shadow:0 0 12px rgba(168,255,62,0.15) !important; }
        }

        /* Mobile filter drawer */
        .mobile-topbar { display:none; }
        .sidebar-backdrop { display:none; }
        .sidebar-mobile-header { display:none; }
        .sidebar-drag-handle { display:none; }

        @media (max-width: 860px) {
          .mobile-topbar {
            display:flex; align-items:center; justify-content:space-between;
            padding:10px 1.25rem; border-bottom:1px solid #141414; background:#0a0a0a; flex-shrink:0;
          }
          .mobile-filter-btn {
            display:flex; align-items:center; gap:8px; background:rgba(168,255,62,0.08);
            border:1px solid rgba(168,255,62,0.25); color:#a8ff3e; font-size:13px; font-weight:600;
            padding:8px 14px; border-radius:8px; cursor:pointer; font-family:inherit;
          }
          /* bottom sheet, not a side drawer — this is a filter panel, sheets are the right pattern for that */
          .sidebar {
            position:fixed !important; left:0 !important; right:0 !important; top:auto !important; bottom:0;
            width:100% !important; max-width:100% !important;
            height:auto !important; max-height:85vh;
            border-radius:20px 20px 0 0 !important;
            border-right:none !important; border-top:1px solid #1e1e1e;
            transform:translateY(100%);
            transition:transform .32s cubic-bezier(.32,.72,0,1);
            box-shadow:0 -24px 60px rgba(0,0,0,0.6);
            z-index:60;
          }
          .sidebar.open { transform:translateY(0); }
          .sidebar-drag-handle {
            display:block; width:36px; height:4px; background:#2a2a2a;
            border-radius:99px; margin:0 auto 14px;
          }
          .sidebar-mobile-header {
            display:flex; align-items:center; justify-content:space-between;
            padding-bottom:14px; margin-bottom:14px; border-bottom:1px solid #1a1a1a;
          }
          .sidebar-close-btn {
            display:flex; align-items:center; justify-content:center;
            width:30px; height:30px; border-radius:8px; background:rgba(255,255,255,0.04);
            border:1px solid #1e1e1e; color:#888; cursor:pointer;
          }
          .sidebar-backdrop.open {
            display:block; position:fixed; inset:0; background:rgba(0,0,0,0.6);
            z-index:55; backdrop-filter:blur(2px);
          }
        }
      `}</style>

     {/* ── NAV ── */}
      <Navbar />

      {/* ── MOBILE FILTER TRIGGER (hidden on desktop) ── */}
      <div className="mobile-topbar">
        <button className="mobile-filter-btn" onClick={() => setMobileFiltersOpen(true)}>
          <FilterIcon /> Filters
        </button>
        {searched && (
          <span style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>{language} · {difficulty}</span>
        )}
      </div>

      {/* Backdrop for the mobile drawer */}
      <div
        className={`sidebar-backdrop ${mobileFiltersOpen ? "open" : ""}`}
        onClick={() => setMobileFiltersOpen(false)}
      />

      {/* ── BODY ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── SIDEBAR ── */}
        <aside className={`scroll-area sidebar ${mobileFiltersOpen ? "open" : ""}`} style={{
          width: 248, flexShrink: 0,
          borderRight: "1px solid #141414",
          overflowY: "auto",
          background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
          padding: "1.75rem 1.25rem"
        }}>

          <div className="sidebar-drag-handle" />
          <div className="sidebar-mobile-header">
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#efefef" }}>
              <FilterIcon /> Filters
            </span>
            <button className="sidebar-close-btn" onClick={() => setMobileFiltersOpen(false)}>
              <XIcon />
            </button>
          </div>

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
  <p style={{ fontSize: 13.5, color: "#4a4a4a", lineHeight: 1.5 }}>
    Real bugs from real repos — matched to your stack
  </p>

  {/* Plan badge — honest static nudge, not a fake usage counter */}
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
    <span style={{ fontSize: 10.5, fontWeight: 600, color: "#888", background: "rgba(255,255,255,0.04)", padding: "3px 9px", borderRadius: 20, border: "1px solid #1a1a1a" }}>Free plan</span>
    <a href="/pricing" style={{ fontSize: 10.5, fontWeight: 600, color: "#a8ff3e", textDecoration: "none" }}>Upgrade →</a>
  </div>
</div>

          {/* Language */}
<p style={{ fontSize: 10.5, fontWeight: 700, color: "#444", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 8, fontFamily: "monospace" }}>Language</p>
<Select
  instanceId="language-select" // 💡 just paste this line right here!
  value={{ value: language.toLowerCase(), label: language }}
  onChange={(opt) => {
    if (opt) {
      setLanguage(opt.label)
      setSearched(false)
      setIssues([])
    }
  }}
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
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#444", letterSpacing: 1.3, textTransform: "uppercase", margin: "22px 0 10px", fontFamily: "monospace" }}>Difficulty</p>
          <div className="diff-segment">
            <div className="diff-seg-indicator" style={{
              transform: `translateX(${DIFFICULTIES.indexOf(difficulty) * 100}%)`,
              background: DIFF[difficulty].bg,
              borderColor: DIFF[difficulty].border,
            }} />
            {DIFFICULTIES.map(dif => {
              const active = difficulty === dif
              return (
                <button key={dif} className="diff-seg-btn" onClick={() => {
                  setDifficulty(dif)
                  setSearched(false)
                  setIssues([])
                }} style={{ color: active ? DIFF[dif].color : "#666" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: DIFF[dif].color, flexShrink: 0 }} />
                  <span style={{ textTransform: "capitalize" }}>{dif}</span>
                </button>
              )
            })}
          </div>

          {/* Search */}
          <button className="search-btn" onClick={() => { fetchIssues(1, true); setMobileFiltersOpen(false); }} disabled={loading} style={{
            marginTop: 24, width: "100%", padding: "15px", borderRadius: 10, border: "none",
            background: loading ? "rgba(168,255,62,0.3)" : "#a8ff3e",
            color: "#090909", fontWeight: 700, fontSize: 16,
            cursor: loading ? "default" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "all 0.15s",
            boxShadow: loading ? "none" : "0 0 28px rgba(168,255,62,0.22)"
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
            <div style={{ marginBottom: 20, padding: "12px 14px", background: "#0f0f0f", borderRadius: 8, border: "1px solid #1a1a1a", animation: "popIn 0.3s ease" }}>
              <p style={{ fontSize: 10.5, color: "#444", fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Results</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "#a8ff3e", letterSpacing: -1, fontFamily: "monospace" }}>{issues.length}</p>
              <p style={{ fontSize: 11, color: "#555" }}>{language} · {difficulty}</p>
            </div>
          )}

          {/* Quick repos — compact chips instead of 5 stacked full-width rows */}
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#444", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 10, fontFamily: "monospace" }}>Quick repos</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[
              { short: "next.js", full: "vercel/next.js" },
              { short: "express", full: "expressjs/express" },
              { short: "prisma", full: "prisma/prisma" },
              { short: "react", full: "facebook/react" },
              { short: "vite", full: "vitejs/vite" },
            ].map(r => (
              <a key={r.full} href={`/analyze?repo=https://github.com/${r.full}`} className="quick-repo-chip" title={r.full}>
                <GithubMiniIcon />
                <span>{r.short}</span>
              </a>
            ))}
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="scroll-area" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

          {/* Top bar */}
          <div style={{
            position: "sticky", top: 0, zIndex: 10,
            background: "#0a0a0a",
            borderBottom: "1px solid #141414",
            padding: "0 1.5rem",
            height: 44, display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {searched && !loading && (
                <>
                  <span style={{ fontSize: 13, color: "#555", fontFamily: "monospace" }}>
                    {sortedIssues.length} issues
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: d.bg, color: d.color, border: `1px solid ${d.border}`, textTransform: "capitalize" }}>{difficulty}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "#888" }}>{language}</span>
                </>
              )}
              {!searched && (
                <span style={{ fontSize: 12, color: "#3a3a3a", display: "flex", alignItems: "center", gap: 6 }}>
                  <FilterIcon /> pick a filter and search
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {searched && !loading && issues.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="sort-trigger">
                      {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
                      <ChevronIcon />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="sort-menu-content">
                    {SORT_OPTIONS.map(opt => (
                      <DropdownMenuItem
                        key={opt.value}
                        className="sort-menu-item"
                        onClick={() => setSortBy(opt.value)}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {loading && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width:10, height:10, border:"1.5px solid rgba(168,255,62,0.2)", borderTopColor:"#a8ff3e", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                  <span style={{ fontSize: 11, color: "#444444", fontFamily: "monospace" }}>searching</span>
                </div>
              )}
            </div>
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

          {/* Empty state
          {!loading && !searched && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "calc(100% - 44px)", gap: 12, color: "#1e1e1e" }}>
              <ScopeIcon dim/>
              <p style={{ fontSize: 13, color: "#222222" }}>Pick your stack and hit Search</p>
            </div>
          )} */}

{/* ZERO STATE DASHBOARD (Replaces the old empty state entirely) */}
          {!loading && !searched && (
            <div className="relative flex flex-col items-center justify-start pt-16 pb-12 w-full min-h-[calc(100%-44px)] bg-[#090909] overflow-y-auto">
              
              {/* Subtle Grid Background */}
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{
                  backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
                  backgroundSize: '40px 40px',
                  WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
                  maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
                }}
              />

              {/* Content Wrapper */}
              <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-6 text-center">
                <h2 className="text-4xl font-extrabold text-[#efefef] mb-3 tracking-tight">
                  What do you want to hunt today?
                </h2>
                <p className="text-[#666] text-base mb-12 font-light max-w-lg">
                  Select a quick-start template or use the custom filters on the left to find your next open-source contribution.
                </p>

              {/* 2x2 Grid format on all screen sizes — sizes scale down beautifully on mobile */}
<div className="grid grid-cols-2 gap-3 md:gap-6 w-full text-left pb-2">
  
  {/* Card 1: React */}
  <div onClick={() => { setLanguage("JavaScript"); fetchIssues(1, true, "JavaScript"); }} className="group relative bg-[#0c0c0c] border border-[#61DAFB]/15 hover:border-[#61DAFB]/40 p-4 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 overflow-hidden">
    <div className="absolute inset-0 bg-linear-to-br from-[#61DAFB]/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="mb-4 md:mb-6 text-[#61DAFB] opacity-80 group-hover:opacity-100 transition-opacity animate-float">
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="2.5"></circle>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)"></ellipse>
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)"></ellipse>
          <ellipse cx="12" cy="12" rx="10" ry="4"></ellipse>
        </svg>
      </div>
      <h3 className="text-[#efefef] font-semibold text-sm md:text-lg mb-1 md:mb-2 group-hover:text-[#61DAFB] transition-colors">React Ecosystem</h3>
      <p className="text-[#666] text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none">Find good first issues in frontend React and Next.js repositories.</p>
    </div>
  </div>

  {/* Card 2: Express/Node */}
  <div onClick={() => { setLanguage("TypeScript"); fetchIssues(1, true, "TypeScript"); }} className="group relative bg-[#0c0c0c] border border-[#68A063]/15 hover:border-[#68A063]/40 p-4 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 overflow-hidden">
    <div className="absolute inset-0 bg-linear-to-br from-[#68A063]/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="mb-4 md:mb-6 text-[#68A063] opacity-80 group-hover:opacity-100 transition-opacity animate-float" style={{ animationDelay: '0.2s' }}>
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
          <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
          <line x1="6" y1="6" x2="6.01" y2="6"></line>
          <line x1="6" y1="18" x2="6.01" y2="18"></line>
        </svg>
      </div>
      <h3 className="text-[#efefef] font-semibold text-sm md:text-lg mb-1 md:mb-2 group-hover:text-[#68A063] transition-colors">Express & Node</h3>
      <p className="text-[#666] text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none">Tackle backend API routing, controllers, and middleware bugs.</p>
    </div>
  </div>

  {/* Card 3: Database */}
  <div onClick={() => { setLanguage("Python"); fetchIssues(1, true, "Python"); }} className="group relative bg-[#0c0c0c] border border-[#4DB33D]/15 hover:border-[#4DB33D]/40 p-4 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 overflow-hidden">
    <div className="absolute inset-0 bg-linear-to-br from-[#4DB33D]/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="mb-4 md:mb-6 text-[#4DB33D] opacity-80 group-hover:opacity-100 transition-opacity animate-float" style={{ animationDelay: '0.4s' }}>
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
        </svg>
      </div>
      <h3 className="text-[#efefef] font-semibold text-sm md:text-lg mb-1 md:mb-2 group-hover:text-[#4DB33D] transition-colors">Database Core</h3>
      <p className="text-[#666] text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none">Fix easy schema, indexing, and query logic in backend data tools.</p>
    </div>
  </div>

  {/* Card 4: Tooling */}
  <div onClick={() => { setLanguage("Go"); fetchIssues(1, true, "Go"); }} className="group relative bg-[#0c0c0c] border border-[#a8ff3e]/15 hover:border-[#a8ff3e]/40 p-4 md:p-8 rounded-2xl cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 overflow-hidden">
    <div className="absolute inset-0 bg-linear-to-br from-[#a8ff3e]/10 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="relative z-10">
      <div className="mb-4 md:mb-6 text-[#a8ff3e] opacity-80 group-hover:opacity-100 transition-opacity animate-float" style={{ animationDelay: '0.6s' }}>
        <svg className="w-8 h-8 md:w-10 md:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="4 17 10 11 4 5"></polyline>
          <line x1="12" y1="19" x2="20" y2="19"></line>
        </svg>
      </div>
      <h3 className="text-[#efefef] font-semibold text-sm md:text-lg mb-1 md:mb-2 group-hover:text-[#a8ff3e] transition-colors">Tooling & Config</h3>
      <p className="text-[#666] text-xs md:text-sm leading-relaxed line-clamp-2 md:line-clamp-none">Help out with automation scripts, build environments, and configurations.</p>
    </div>
  </div>

</div>
              </div>
            </div>
          )}

    {/* </div> */}
  {/* </div> */}
{/* </div> */}
         
          

          {/* Issue list */}
          {!loading && sortedIssues.length > 0 && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              {sortedIssues.map((issue, i) => (
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
                      fontSize: 14.5, fontWeight: 500,
                      color: "#e2e2e2", marginBottom: 4,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      letterSpacing: -0.2, transition: "color 0.15s"
                    }}>{issue.title}</p>
                    <p style={{ fontSize: 11.5, color: "#3a3a3a", fontFamily: "monospace" }}>
                      {repoName(issue.repository_url)}
                    </p>
                  </div>

                  {/* Meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                      background: d.bg, color: d.color, border: `1px solid ${d.border}`,
                      textTransform: "capitalize"
                    }}>{difficulty}</span>
                    <span style={{ fontSize: 11, color: "#2a2a2a", fontFamily: "monospace", minWidth: 48, textAlign: "right" }}>
                      {timeAgo(issue.created_at)}
                    </span>
                  </div>

                  {/* Copy repo link — for pasting into GitLense or a web search */}
                  <button
                    className={`copy-btn ${copiedId === issue.id ? "copied" : ""}`}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyRepoLink(issue.id, repoName(issue.repository_url)) }}
                    title="Copy repo link"
                  >
                    {copiedId === issue.id ? <><CheckMiniIcon /> Copied</> : <CopyIcon />}
                  </button>

                  <BookmarkBtn
                    url={issue.html_url}
                    title={issue.title}
                    repoName={repoName(issue.repository_url)}
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