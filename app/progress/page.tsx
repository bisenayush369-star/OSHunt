"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// import Navbar from "@/components/ui/Navbar";
// import { Product, Bookmark, Progress, LearnInPublic, Pricing, Support } from "../components/section";

const css = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#090909;--nav-bg:rgba(9,9,9,0.85);--text:#efefef;--muted:#666;--dim:#333;--border:rgba(255,255,255,0.07);--accent:#a8ff3e;--font:'Outfit',sans-serif;}
  html{scroll-behavior:smooth}
  @keyframes spin3d{0%{transform:perspective(500px) rotateY(0deg) rotateX(12deg)}100%{transform:perspective(500px) rotateY(360deg) rotateX(12deg)}}
  @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
  @keyframes loadBar{0%{width:0%}60%{width:72%}85%{width:88%}100%{width:100%}}
  @keyframes gridP{0%,100%{opacity:.03}50%{opacity:.07}}
  @keyframes pFloat{0%{transform:translateY(0) translateX(0);opacity:0}20%{opacity:.8}80%{opacity:.8}100%{transform:translateY(-110px) translateX(var(--dx));opacity:0}}
  @keyframes splashFade{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.03)}}
  @keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
  @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes glitchA{0%,100%{clip-path:inset(25% 0 55% 0);transform:translate(-3px,1px)}50%{clip-path:inset(60% 0 15% 0)}}
  @keyframes glitchB{0%,100%{clip-path:inset(60% 0 15% 0);transform:translate(3px,-1px)}50%{clip-path:inset(25% 0 55% 0)}}
  @keyframes staggerReveal{0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0 0% 0 0)}}
  @keyframes orbFloat{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-48%,-52%) scale(1.05)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .ticker-inner{display:flex;animation:tickerScroll 32s linear infinite;will-change:transform}
  .ticker-inner:hover{animation-play-state:paused}
  .splash-out{animation:splashFade .5s ease forwards!important}
  .stagger-reveal{animation:staggerReveal .8s cubic-bezier(.77,0,.18,1) forwards}
  .stagger-reveal-2{animation:staggerReveal .8s .15s cubic-bezier(.77,0,.18,1) forwards;clip-path:inset(0 100% 0 0)}
  .stagger-reveal-3{animation:staggerReveal .8s .3s cubic-bezier(.77,0,.18,1) forwards;clip-path:inset(0 100% 0 0)}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:56px;background:var(--nav-bg);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);}
  .nav-logo{display:flex;align-items:center;gap:8px;text-decoration:none}
  .nav-logo-text{font-weight:600;font-size:15px;color:var(--text);letter-spacing:-.3px}
  .nav-links{display:flex;align-items:center;gap:0}
  .nav-links a{padding:6px 14px;font-size:14px;color:var(--muted);text-decoration:none;border-radius:6px;transition:color .15s}
  .nav-links a:hover{color:var(--text)}
  .nav-right{display:flex;align-items:center;gap:8px}
  .btn-login{padding:6px 14px;font-size:14px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:var(--font);transition:color .15s}
  .btn-login:hover{color:var(--text)}
  .btn-signup{padding:7px 16px;font-size:14px;font-weight:500;background:var(--text);color:#090909;border:none;border-radius:20px;cursor:pointer;font-family:var(--font);transition:opacity .15s;letter-spacing:-.1px}
  .btn-signup:hover{opacity:.88}
  .hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
  .hamburger span{display:block;width:20px;height:1.5px;background:var(--muted);transition:all .3s}
  .mobile-nav{position:fixed;inset:0;z-index:200;background:#090909;display:flex;flex-direction:column;padding:1.5rem 2rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.16,1,.3,1);}
  .mobile-nav.open{transform:translateX(0)}
  .mobile-nav-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:3rem}
  .mobile-close{background:none;border:none;cursor:pointer;color:var(--muted);font-size:22px;line-height:1;padding:4px}
  .mobile-links{flex:1;display:flex;flex-direction:column;gap:0}
  .mobile-links a{display:block;padding:16px 0;font-size:22px;font-weight:500;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border);transition:color .15s;letter-spacing:-.3px}
  .mobile-links a:hover{color:var(--accent)}
  .mobile-links a:first-child{border-top:1px solid var(--border)}
  .mobile-footer{margin-top:2rem;display:flex;flex-direction:column;gap:12px}
  .mobile-login{font-size:18px;font-weight:500;color:var(--muted);background:none;border:none;cursor:pointer;font-family:var(--font);text-align:left;padding:4px 0;transition:color .15s}
  .mobile-signup{padding:14px 24px;font-size:16px;font-weight:600;background:var(--text);color:#090909;border:none;border-radius:30px;cursor:pointer;font-family:var(--font);letter-spacing:-.2px;width:fit-content}
  .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:7rem 2rem 4rem;position:relative;overflow:hidden;}
  .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;border:1px solid var(--border);font-size:12px;color:var(--muted);margin-bottom:2rem;letter-spacing:.3px;}
  .hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}
  .hero-h1{font-size:clamp(42px,7vw,88px);font-weight:700;line-height:1.05;letter-spacing:-2.5px;max-width:900px;background:linear-gradient(180deg,#fff 0%,#888 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1.5rem;}
  .hero-h1 em{font-style:normal;-webkit-text-fill-color:var(--accent)}
  .hero-sub{font-size:clamp(15px,2vw,18px);color:var(--muted);max-width:480px;line-height:1.65;margin-bottom:2.5rem;font-weight:300;}
  .hero-cta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:center}
  .cta-primary{padding:12px 26px;font-size:15px;font-weight:600;background:var(--text);color:#090909;border:none;border-radius:30px;cursor:pointer;font-family:var(--font);letter-spacing:-.2px;transition:opacity .15s;text-decoration:none;display:inline-block;}
  .cta-primary:hover{opacity:.85}
  .cta-ghost{padding:12px 26px;font-size:15px;font-weight:500;background:none;color:var(--muted);border:1px solid var(--border);border-radius:30px;cursor:pointer;font-family:var(--font);transition:all .15s;}
  .cta-ghost:hover{color:var(--text);border-color:rgba(255,255,255,.2)}
  .hero-bg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(168,255,62,.04) 0%,transparent 70%);pointer-events:none;}
  .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse at center,black 0%,transparent 70%);pointer-events:none;}
  .proof{padding:0 2rem 5rem;text-align:center}
  .proof-label{font-size:12px;color:var(--dim);letter-spacing:1px;text-transform:uppercase;margin-bottom:1.5rem}
  .proof-logos{display:flex;align-items:center;justify-content:center;gap:2rem;flex-wrap:wrap}
  .proof-logo{font-size:13px;color:var(--dim);font-weight:500;letter-spacing:-.2px}
  .features{padding:5rem 2rem;max-width:1060px;margin:0 auto}
  .section-label{font-size:12px;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;font-weight:500;margin-bottom:1rem}
  .section-title{font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:-1.5px;margin-bottom:1rem;max-width:520px;line-height:1.1}
  .section-sub{font-size:15px;color:var(--muted);max-width:440px;line-height:1.65;font-weight:300;margin-bottom:3rem}
  .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden}
  .feat-card{background:#090909;padding:2rem;transition:background .2s}
  .feat-card:hover{background:#0f0f0f}
  .feat-title{font-size:15px;font-weight:600;letter-spacing:-.3px;margin-bottom:.5rem}
  .feat-text{font-size:13px;color:var(--muted);line-height:1.65;font-weight:300}
  .preview{padding:5rem 2rem;max-width:780px;margin:0 auto}
  .preview-window{border:1px solid var(--border);border-radius:14px;overflow:hidden}
  .preview-bar{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--border);background:#0e0e0e}
  .preview-dot{width:10px;height:10px;border-radius:50%}
  .preview-title-txt{margin-left:auto;margin-right:auto;font-size:12px;color:var(--dim);font-weight:400}
  .issue-row{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid var(--border);transition:background .15s;cursor:pointer;position:relative}
  .issue-row::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--accent);transform:scaleY(0);transition:transform .2s;transform-origin:center}
  .issue-row:hover{background:#0d0d0d}
  .issue-row:hover::before{transform:scaleY(1)}
  .issue-row:last-child{border-bottom:none}
  .issue-index{font-size:11px;color:var(--dim);font-family:monospace;width:24px;flex-shrink:0}
  .issue-info{flex:1;min-width:0}
  .issue-name{font-size:13px;font-weight:500;letter-spacing:-.2px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .issue-repo{font-size:11px;color:var(--muted)}
  .issue-pill{font-size:10px;padding:3px 9px;border-radius:20px;font-weight:500;flex-shrink:0;margin-left:12px}
  .pill-easy{background:rgba(168,255,62,.08);color:#a8ff3e;border:1px solid rgba(168,255,62,.18)}
  .pill-med{background:rgba(255,170,62,.08);color:#ffaa3e;border:1px solid rgba(255,170,62,.18)}
  .pill-hard{background:rgba(255,62,100,.08);color:#ff3e64;border:1px solid rgba(255,62,100,.18)}
  .issue-stars{font-size:11px;color:var(--dim);margin-left:12px;flex-shrink:0}
  .cta-section{padding:6rem 2rem;text-align:center}
  .cta-box{max-width:560px;margin:0 auto}
  .cta-h2{font-size:clamp(30px,5vw,52px);font-weight:700;letter-spacing:-2px;margin-bottom:1rem;line-height:1.05}
  .cta-p{font-size:15px;color:var(--muted);margin-bottom:2rem;line-height:1.65;font-weight:300}
  footer{border-top:1px solid var(--border);padding:2rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem}
  .footer-logo{font-size:14px;font-weight:600;letter-spacing:-.3px}
  .footer-links{display:flex;gap:20px}
  .footer-links a{font-size:12px;color:var(--dim);text-decoration:none;transition:color .15s}
  .footer-links a:hover{color:var(--muted)}
  .footer-copy{font-size:12px;color:var(--dim)}
  @media(max-width:768px){
    .nav-links,.nav-right{display:none}
    .hamburger{display:flex}
    .feat-grid{grid-template-columns:1fr}
    nav{padding:0 1.25rem}
    .hero{padding:6rem 1.25rem 3rem}
    .features,.preview,.proof,.cta-section{padding-left:1.25rem;padding-right:1.25rem}
    footer{flex-direction:column;align-items:flex-start}
  }
`;

const LogoMark = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2" />
    <circle
      cx="18"
      cy="18"
      r="4"
      stroke="#a8ff3e"
      strokeWidth="0.7"
      opacity="0.4"
    />
    <line
      x1="18"
      y1="2"
      x2="18"
      y2="0"
      stroke="#a8ff3e"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="18"
      y1="34"
      x2="18"
      y2="36"
      stroke="#a8ff3e"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="2"
      y1="18"
      x2="0"
      y2="18"
      stroke="#a8ff3e"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <line
      x1="34"
      y1="18"
      x2="36"
      y2="18"
      stroke="#a8ff3e"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="18" cy="18" r="1.8" fill="#a8ff3e" />
  </svg>
);

const Icon = ({ d }: { d: string }) => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#a8ff3e"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ marginBottom: "1.25rem", display: "block" }}
  >
    <path d={d} />
  </svg>
);

const FEATURES = [
  {
    d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-4a6 6 0 100-12 6 6 0 000 12zm0-4a2 2 0 100-4 2 2 0 000 4z",
    title: "Stack-matched issues",
    text: "Pick your stack. Every issue you see is already filtered to what you can actually fix — no Python issues when you write JavaScript.",
  },
  {
    d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    title: "AI reads the bug for you",
    text: "Gemini reads the issue and surrounding code. Tells you what's broken, how hard it is, and the exact concept you need to fix it.",
  },
  {
    d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    title: "GitLense — understand any repo",
    text: "Paste a GitHub URL. Get a plain-English breakdown of the architecture, stack, and where to start before you touch a single file.",
  },
  {
    d: "M18 20V10M12 20V4M6 20v-6",
    title: "Track your contributions",
    text: "Every issue you solve gets logged. Build a contribution streak. See your growth. Show it to anyone hiring.",
  },
  {
    d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22",
    title: "Real repos, real impact",
    text: "Everything comes straight from the GitHub API. No curated lists that go stale. Fresh issues from repos people actually use.",
  },
  {
    d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
    title: "Built for beginners who mean it",
    text: "You don't need 3 years of experience to contribute. You need the right issue and enough context. That's exactly what this gives you.",
  },
];

const ISSUES = [
  {
    n: "01",
    title: "useSearchParams causes hydration mismatch in layouts",
    repo: "vercel/next.js",
    pill: "pill-med",
    diff: "medium",
    stars: "122k",
  },
  {
    n: "02",
    title: "MongoDB _count returns undefined for empty relations",
    repo: "prisma/prisma",
    pill: "pill-easy",
    diff: "easy",
    stars: "38k",
  },
  {
    n: "03",
    title: "res.json() ignores replacer function in options",
    repo: "expressjs/express",
    pill: "pill-easy",
    diff: "easy",
    stars: "63k",
  },
  {
    n: "04",
    title: "useEffect cleanup skipped on fast refresh cycle",
    repo: "facebook/react",
    pill: "pill-hard",
    diff: "hard",
    stars: "224k",
  },
  {
    n: "05",
    title: "populate() with lean() drops virtuals on nested docs",
    repo: "mongoose/mongoose",
    pill: "pill-med",
    diff: "medium",
    stars: "26k",
  },
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [splashOut, setSplashOut] = useState(false);
  const [glitch, setGlitch] = useState(false);
  const [scanPos, setScanPos] = useState(0);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const shuffledIssues = useRef([...ISSUES].sort(() => Math.random() - 0.5)).current;

  useEffect(() => {
    const scan = setInterval(() => setScanPos(p => (p + 1) % 100), 18);
    const g1 = setTimeout(() => setGlitch(true), 900);
    const g2 = setTimeout(() => setGlitch(false), 1020);
    const g3 = setTimeout(() => setGlitch(true), 1200);
    const g4 = setTimeout(() => setGlitch(false), 1290);
    const out = setTimeout(() => setSplashOut(true), 2400);
    const done = setTimeout(() => setLoaded(true), 2850);
    return () => { clearInterval(scan); [g1,g2,g3,g4,out,done].forEach(clearTimeout); };
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => setCursor({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <>
      <style>{css}</style>

      {/* ── 3D LOADING SPLASH ── */}
      {!loaded && (
        <div className={splashOut ? "splash-out" : ""} style={{ position:"fixed", inset:0, zIndex:9999, background:"#050508", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
          <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(168,255,62,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(168,255,62,0.04) 1px,transparent 1px)", backgroundSize:"48px 48px", animation:"gridP 2s infinite" }}/>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,255,62,0.08) 0%,transparent 65%)", animation:"orbFloat 5s ease-in-out infinite" }}/>
          {/* noise grain overlay */}
          <div style={{ position:"absolute", inset:0, backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, opacity:0.4, pointerEvents:"none" }}/>
          {/* particles */}
          {Array.from({length:14},(_,i) => (
            <div key={i} style={{ position:"absolute", left:`${12+(i*6.8)%72}%`, bottom:`${8+(i*11)%40}%`, width:2+(i%3), height:2+(i%3), borderRadius:"50%", background:"#a8ff3e", animation:`pFloat ${2.2+(i%4)*.9}s ${(i*.28)%2}s infinite ease-out`, ["--dx" as string]:`${-30+(i%5)*14}px` }}/>
          ))}
          {/* 3D spinning scope */}
          <div style={{ position:"relative", marginBottom:"2.5rem", animation:"floatY 3s ease-in-out infinite" }}>
            <div style={{ animation:"spin3d 4s linear infinite" }}>
              <svg width="130" height="130" viewBox="0 0 130 130" fill="none">
                <circle cx="65" cy="65" r="60" stroke="#a8ff3e" strokeWidth="1" opacity="0.18"/>
                <circle cx="65" cy="65" r="45" stroke="#a8ff3e" strokeWidth="1" strokeDasharray="5 4" opacity="0.38"/>
                <circle cx="65" cy="65" r="28" stroke="#a8ff3e" strokeWidth="1.5"/>
                <circle cx="65" cy="65" r="10" stroke="#a8ff3e" strokeWidth="0.8" opacity="0.45"/>
                <line x1="65" y1="5"   x2="65" y2="30"  stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="65" y1="100" x2="65" y2="125" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="5"  y1="65"  x2="30"  y2="65" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="100" y1="65" x2="125" y2="65" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="65" cy="65" r="5" fill="#a8ff3e"/>
              </svg>
            </div>
            <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none" }}>
              <div style={{ position:"absolute", left:"8%", right:"8%", height:1, top:`${scanPos}%`, background:"linear-gradient(90deg,transparent,rgba(168,255,62,0.9),transparent)", boxShadow:"0 0 12px rgba(168,255,62,0.6)", transition:"top .018s linear" }}/>
            </div>
          </div>
          {/* glitch wordmark */}
          <div style={{ position:"relative", marginBottom:"1.25rem" }}>
            <h1 style={{ fontSize:58, fontWeight:800, letterSpacing:-3.5, color:"#fff", lineHeight:1, fontFamily:"'Outfit',sans-serif" }}>
              <span style={{ color:"#a8ff3e" }}>OS</span>Hunt
            </h1>
            {glitch && <>
              <h1 style={{ position:"absolute", inset:0, fontSize:58, fontWeight:800, letterSpacing:-3.5, lineHeight:1, color:"#a8ff3e", fontFamily:"'Outfit',sans-serif", animation:"glitchA .12s steps(1) infinite", mixBlendMode:"screen", opacity:.65 }}><span>OS</span>Hunt</h1>
              <h1 style={{ position:"absolute", inset:0, fontSize:58, fontWeight:800, letterSpacing:-3.5, lineHeight:1, color:"#ff4d6d", fontFamily:"'Outfit',sans-serif", animation:"glitchB .12s steps(1) infinite", mixBlendMode:"screen", opacity:.45 }}><span>OS</span>Hunt</h1>
            </>}
          </div>
          <p style={{ fontSize:11, color:"#222", fontFamily:"monospace", letterSpacing:2.5, textTransform:"uppercase", marginBottom:"2.25rem", animation:"pulseGlow 1.4s infinite" }}>initializing hunt sequence</p>
          <div style={{ width:220, height:2, background:"#111", borderRadius:2, overflow:"hidden" }}>
            <div style={{ height:"100%", background:"linear-gradient(90deg,#a8ff3e,#5aff00)", animation:"loadBar 2.5s ease forwards", borderRadius:2 }}/>
          </div>
        </div>
      )}

      <nav>
        <Link href="/" className="nav-logo">
          <LogoMark size={26} />
          <span className="nav-logo-text">
            <span style={{ color: "#a8ff3e" }}>OS</span>Hunt
          </span>
        </Link>
        <div className="nav-links">
          <a href="#product">Product</a>
          <a href="/bookmark">bookmark</a>
          <a href="#progress">Progress</a>
          <a href="#learn-in-public">Learn in Public</a>
          <a href="#pricing">Pricing</a>
          <a href="#support">Support</a>
        </div>
        <div className="nav-right">
          <Link href="/login" className="btn-login">
            Log in
          </Link>
          <Link
            href="/login"
            className="btn-signup"
            style={{ textDecoration: "none" }}
          >
            Sign up
          </Link>
        </div>
        <button
          className="hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div className={`mobile-nav${mobileOpen ? " open" : ""}`}>
        <div className="mobile-nav-header">
          <span style={{ fontWeight: 600, fontSize: 15 }}>OSHunt</span>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            ✕
          </button>
        </div>
        <div className="mobile-links">
          {[
            { name: "Product", id: "/Product" },
            { name: "bookmark", id: "bookmark" },
            { name: "Progress", id: "/Progress" },
            { name: "Learn in Public", id: "/Learn in Public" },
            { name: "Pricing", id: "/Pricing" },
            { name: "Support", id: "/Support" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.name}
            </a>
          ))}
        </div>
        <div className="mobile-footer">
          <Link
            href="/login"
            className="mobile-login"
            onClick={() => setMobileOpen(false)}
          >
            Log in
          </Link>
          <Link
            href="/signin"
            className="mobile-signup"
            style={{ textDecoration: "none" }}
            onClick={() => setMobileOpen(false)}
          >
            Sign up
          </Link>
        </div>
      </div>

      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-bg" />

        {/* cursor-reactive orb — framer style */}
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(168,255,62,0.06) 0%,transparent 65%)", pointerEvents:"none", transform:`translate(calc(${cursor.x*60-30}px),calc(${cursor.y*60-30}px))`, transition:"transform .8s ease", top:"50%", left:"50%", marginTop:-250, marginLeft:-250 }}/>

        {/* 3D floating cards — framer style */}
        <div style={{ position:"absolute", inset:0, pointerEvents:"none" }}>
          <div style={{ position:"absolute", top:"18%", left:"6%", transform:"perspective(600px) rotateY(18deg) rotateX(-8deg)", background:"rgba(12,12,12,0.9)", border:"1px solid rgba(168,255,62,0.12)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", animation:"floatY 4s ease-in-out infinite" }}>
            <div style={{ fontSize:9, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>ISSUE FOUND</div>
            <div style={{ fontSize:12, color:"#444" }}>vercel/next.js · easy</div>
          </div>
          <div style={{ position:"absolute", top:"22%", right:"5%", transform:"perspective(600px) rotateY(-16deg) rotateX(-6deg)", background:"rgba(12,12,12,0.9)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", animation:"floatY 4.5s .8s ease-in-out infinite" }}>
            <div style={{ fontSize:9, color:"#555", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>AI ANALYSIS</div>
            <div style={{ fontSize:12, color:"#333" }}>Fix in ~20 lines ✓</div>
          </div>
          <div style={{ position:"absolute", bottom:"28%", left:"7%", transform:"perspective(600px) rotateY(14deg) rotateX(6deg)", background:"rgba(12,12,12,0.9)", border:"1px solid rgba(255,255,255,0.05)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", animation:"floatY 5s 1.6s ease-in-out infinite" }}>
            <div style={{ fontSize:9, color:"#555", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>STREAK</div>
            <div style={{ fontSize:12, color:"#333" }}>7 days 🔥</div>
          </div>
          <div style={{ position:"absolute", bottom:"30%", right:"6%", transform:"perspective(600px) rotateY(-12deg) rotateX(5deg)", background:"rgba(12,12,12,0.9)", border:"1px solid rgba(168,255,62,0.08)", borderRadius:12, padding:"10px 14px", backdropFilter:"blur(8px)", animation:"floatY 3.8s 2.2s ease-in-out infinite" }}>
            <div style={{ fontSize:9, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:1, marginBottom:4 }}>PR MERGED</div>
            <div style={{ fontSize:12, color:"#444" }}>prisma/prisma ★38k</div>
          </div>
        </div>

        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Now in public beta
        </div>
        <h1 className="hero-h1">
          Find bugs.
          <br />
          <em>Fix them.</em>
          <br />
          Get known.
        </h1>
        <p className="hero-sub">
          OSHunt finds real open source issues matched to your stack — then AI
          explains exactly what&apos;s broken and how to fix it.
        </p>
        <div className="hero-cta">
          <a href="/hunt" className="cta-primary">Start hunting →</a>
          <a href="/analyze" className="cta-ghost">Analyze Profile</a>
        </div>

        {/* tokavy-style before/after */}
        <div style={{ display:"flex", gap:12, alignItems:"center", marginTop:"3rem", flexWrap:"wrap", justifyContent:"center" }}>
          <div style={{ background:"#0a0a0a", border:"1px solid #141414", borderRadius:12, padding:"1rem 1.25rem", maxWidth:240, textAlign:"left" }}>
            <p style={{ fontSize:9, color:"#2a2a2a", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>WITHOUT OSHUNT</p>
            <p style={{ fontSize:12, color:"#252525", lineHeight:1.65 }}>Browse GitHub... filter labels... wrong language... 2 hours wasted</p>
          </div>
          <span style={{ color:"#a8ff3e", fontSize:20, fontWeight:300 }}>→</span>
          <div style={{ background:"#0f0f0f", border:"1px solid rgba(168,255,62,0.18)", borderRadius:12, padding:"1rem 1.25rem", maxWidth:240, textAlign:"left", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-1, left:"15%", right:"15%", height:1, background:"linear-gradient(90deg,transparent,rgba(168,255,62,0.4),transparent)" }}/>
            <p style={{ fontSize:9, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>WITH OSHUNT</p>
            <p style={{ fontSize:12, color:"#555", lineHeight:1.65 }}>Stack matched → AI explains → fix in 30 mins → PR merged ✓</p>
          </div>
        </div>
      </section>

      <div className="proof">
        <p className="proof-label">Issues from repos you already know</p>
        <div className="proof-logos">
          {[
            "facebook/react",
            "vercel/next.js",
            "expressjs/express",
            "prisma/prisma",
            "mongoose/mongoose",
          ].map((r) => (
            <span key={r} className="proof-logo">
              {r}
            </span>
          ))}
        </div>
      </div>

      <section
        id="how-it-works"
        style={{ padding: "5rem 2rem", maxWidth: 780, margin: "0 auto" }}
      >
        <div className="section-label">How it works</div>
        <h2 className="section-title">Three steps to your first merged PR.</h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 0,
            marginTop: "3rem",
          }}
        >
          {[
            {
              n: "01",
              title: "Pick your stack",
              desc: "Select your language and difficulty. OSHunt filters thousands of real GitHub issues down to only what you can actually fix.",
            },
            {
              n: "02",
              title: "AI reads the bug for you",
              desc: "Gemini reads the issue and surrounding code. You get a plain-English breakdown — what's broken, how hard it is, where to start.",
            },
            {
              n: "03",
              title: "Understand the repo with GitLense",
              desc: "Paste the repo URL. GitLense explains the entire codebase architecture before you touch a single file.",
            },
            {
              n: "04",
              title: "Fix it and ship it",
              desc: "Open the issue on GitHub, apply your fix, submit a PR. Your contribution gets tracked on your profile.",
            },
          ].map((step, i, arr) => (
            <div
              key={step.n}
              style={{
                display: "flex",
                gap: 28,
                paddingBottom: i < arr.length - 1 ? "2.5rem" : 0,
                marginBottom: i < arr.length - 1 ? "2.5rem" : 0,
                borderBottom:
                  i < arr.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                  color: "#a8ff3e",
                  paddingTop: 4,
                  flexShrink: 0,
                  letterSpacing: 1,
                }}
              >
                {step.n}
              </div>
              <div>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: -0.4,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    color: "#666",
                    lineHeight: 1.7,
                    fontWeight: 300,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="preview">
        <div className="preview-window">
          <div className="preview-bar">
            <div className="preview-dot" style={{ background: "#ff5f56" }} />
            <div className="preview-dot" style={{ background: "#ffbd2e" }} />
            <div className="preview-dot" style={{ background: "#27c93f" }} />
            <span className="preview-title-txt">
              oshunt — matched to your stack
            </span>
          </div>
          {ISSUES.map((i) => (
            <div key={i.n} className="issue-row">
              <span className="issue-index">{i.n}</span>
              <div className="issue-info">
                <div className="issue-name">{i.title}</div>
                <div className="issue-repo">{i.repo}</div>
              </div>
              <span className={`issue-pill ${i.pill}`}>{i.diff}</span>
              <span className="issue-stars">★ {i.stars}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="features">
        <div className="section-label">Built different</div>
        <h2 className="section-title">Not just a list. A guide.</h2>
        <p className="section-sub">
          Every tool out there drops you at the issue page and says good luck.
          OSHunt holds your hand through the whole thing.
        </p>
        <div className="feat-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feat-card">
              <Icon d={f.d} />
              <div className="feat-title">{f.title}</div>
              <div className="feat-text">{f.text}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-h2">Your first merged PR is one hunt away.</h2>
          <p className="cta-p">
            Stop watching tutorials. Start fixing real bugs in repos with real
            users. Your GitHub profile will never look the same.
          </p>
          <a
            href="/hunt"
            className="cta-primary"
            style={{ fontSize: 15, padding: "13px 28px" }}
          >
            Start hunting for free →
          </a>
        </div>
      </section>

      {/* ── LIVE TICKER — shuffled on every refresh ── */}
      <div style={{ borderTop:"1px solid #0e0e0e", borderBottom:"1px solid #0e0e0e", background:"#050508", padding:"11px 0", overflow:"hidden", position:"relative" }}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:100, background:"linear-gradient(90deg,#050508,transparent)", zIndex:2, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", right:0, top:0, bottom:0, width:100, background:"linear-gradient(270deg,#050508,transparent)", zIndex:2, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", left:"1.5rem", top:"50%", transform:"translateY(-50%)", zIndex:3, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#a8ff3e", boxShadow:"0 0 6px #a8ff3e", animation:"pulseGlow 1.5s infinite" }}/>
          <span style={{ fontSize:9.5, color:"#a8ff3e", fontFamily:"monospace", letterSpacing:1.8, textTransform:"uppercase" }}>Live</span>
        </div>
        <div className="ticker-inner" style={{ paddingLeft:110 }}>
          {[...shuffledIssues,...shuffledIssues,...shuffledIssues,...shuffledIssues].map((i,idx) => (
            <span key={idx} style={{ display:"inline-flex", alignItems:"center", gap:10, marginRight:36, flexShrink:0 }}>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background: i.diff==="easy"?"rgba(168,255,62,0.08)":i.diff==="medium"?"rgba(255,170,62,0.08)":"rgba(255,62,100,0.08)", color: i.diff==="easy"?"#a8ff3e":i.diff==="medium"?"#ffaa3e":"#ff3e64", border:`1px solid ${i.diff==="easy"?"rgba(168,255,62,0.2)":i.diff==="medium"?"rgba(255,170,62,0.2)":"rgba(255,62,100,0.2)"}`, fontFamily:"monospace" }}>{i.diff}</span>
              <span style={{ fontSize:13, color:"#444", whiteSpace:"nowrap" }}>{i.title}</span>
              <span style={{ fontSize:11, color:"#1e1e1e", fontFamily:"monospace" }}>{i.repo}</span>
              <span style={{ color:"#1a1a1a" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      <footer>
        <span className="footer-logo">OSHunt.in</span>
        <div className="footer-links">
          <a href="#">Twitter</a>
          <a href="#">GitHub</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
        <span className="footer-copy">© 2026 OSHunt</span>
      </footer>
    </>
  );
}
