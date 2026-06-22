"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import HomeNav from "@/components/ui/HomeNav";


const css = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#090909;--nav-bg:rgba(9,9,9,0.85);--text:#efefef;--muted:#666;--dim:#333;--border:rgba(255,255,255,0.07);--accent:#a8ff3e;--font:'Outfit',sans-serif;}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 24px 0 22px;height:64px;background:var(--nav-bg);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);}
  .nav-logo{display:flex;align-items:center;gap:0;text-decoration:none;flex-shrink:0}
  .nav-logo-text{font-weight:600;font-size:20px;color:var(--text);letter-spacing:-.01em}
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
  .mobile-links{display:flex;flex-direction:column;gap:0}
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
  const { status } = useSession();

  // Block background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);
  
  return (
    <>
      <style>{css}</style>

<HomeNav />

      <nav>
     <div style={{ marginLeft: "-10px" }}>
          <Link href="/" className="nav-logo">
            <img 
              src="/logo.png" 
              alt="OSHunt Logo" 
              width={45} 
              height={45} 
              style={{ display: "block", borderRadius: "4px", objectFit: "contain" }} 
            />
            <span className="nav-logo-text">
              <span style={{ color: "#a8ff3e" }}>OS</span>Hunt
            </span>
          </Link>
        </div>
        <div className="nav-links">
          <a href="/whatisoshunt">What is OSHunt</a>
          <a href="/bookmark">Bookmark</a>
          <a href="/progress">Progress</a>
          <a href="/learn-in-public">Learn in Public</a>
          <a href="/pricing">Pricing</a>
          <a href="/support">Support</a>
        </div>
      
        <div
          className="hamburger"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          tabIndex={0}
        >
          <div
            style={{
              backgroundColor: "rgb(255, 255, 255)",
              borderRadius: "10px",
              width: "24px", /* Added explicit width */
              height: "2px", /* Added explicit height */
              transform: "none",
              transformOrigin: "50% 50% 0px",
              willChange: "transform",
            }}
          />
          <div
            style={{
              backgroundColor: "rgb(255, 255, 255)",
              borderRadius: "10px",
              width: "24px", /* Added explicit width */
              height: "2px", /* Added explicit height */
              transform: "none",
              transformOrigin: "50% 50% 0px",
              willChange: "transform",
            }}
          />
        </div>
      </nav>

      <div className={`mobile-nav${mobileOpen ? " open" : ""}`}>
        <div className="mobile-nav-header">
          {/* <span style={{ fontWeight: 600, fontSize: 15 }}>OSHunt</span> */}
          <img 
  src="/white.png" 
  alt="OSHunt" 
  style={{ 
    height: "35px", 
    width: "35px", 
    display: "block",
    position: "relative", 
    top: "-12px",  /* The negative number pulls it UP */
    left: "-12px"   /* The positive number pushes it RIGHT */
  }} 
/>
         <button
  className="hamburger"
  onClick={() => setMobileOpen(!mobileOpen)}
  aria-label="Menu"
  style={{
    position: "relative",
    width: "32px",
    height: "32px",
    zIndex: 9999, /* Forces it above the black mobile menu */
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
    /* We keep the class "hamburger" so it still hides on desktop, 
       but we force it to center the lines on mobile */
    alignItems: "center",
    justifyContent: "center"
  }}
>
  {/* TOP LINE */}
  <div
    style={{
      position: "absolute",
      top: "50%", /* Pins to exact vertical center */
      left: "4px",
      width: "24px",
      height: "2px",
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: "2px",
      transformOrigin: "center",
      /* Moves up 6px when closed, snaps to center and rotates 45deg when open */
      transform: mobileOpen ? "translateY(0) rotate(45deg)" : "translateY(-6px) rotate(0)",
      transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      willChange: "transform"
    }}
  />
  
  {/* BOTTOM LINE */}
  <div
    style={{
      position: "absolute",
      top: "50%", /* Pins to exact vertical center */
      left: "4px",
      width: "24px",
      height: "2px",
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: "2px",
      transformOrigin: "center",
      /* Moves down 6px when closed, snaps to center and rotates -45deg when open */
      transform: mobileOpen ? "translateY(0) rotate(-45deg)" : "translateY(6px) rotate(0)",
      transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      willChange: "transform"
    }}
  />
</button>
        </div>
      <div className="mobile-links">
          {[
            { name: "What is OSHunt", href: "what is oshunt" },
            { name: "Bookmark", href: "bookmark" },
            { name: "Progress", href: "progress" },
            { name: "Learn in Public", href: "learn-in-public" },
            { name: "Pricing", href: "pricing" },
            { name: "Support", href: "support" },
          ].map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* ── MOBILE FOOTER START ── */}
        <div className="mobile-footer" style={{ 
          marginTop: "0", /* 🔥 Explicitly kills the hidden 2rem margin from your CSS */
          paddingTop: "16px", /* 🔥 Matches the exact 16px padding of your other links */
          borderTop: "none", /* 🔥 Removes the double line so it flows naturally */
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "16px"
        }}>
          {status === "authenticated" ? (
            /* Show Dashboard ONLY when logged in */
            <Link
              href="/hunt"
              style={{ 
                display: "flex", alignItems: "center", gap: "8px", 
                fontSize: "18px", fontWeight: "600", color: "#fff", 
                textDecoration: "none", padding: "4px 0" 
              }}
              onClick={() => setMobileOpen(false)}
            >
              Dashboard
              <span style={{ 
                fontSize: "11px", background: "#222", color: "#aaa", 
                padding: "2px 6px", borderRadius: "4px", 
                fontWeight: "bold", border: "1px solid #333" 
              }}>D</span>
            </Link>
          ) : (
            /* Show Login/Signup ONLY when logged out */
            <>
              <Link 
                href="/login" 
                className="mobile-login" 
                onClick={() => setMobileOpen(false)} 
                style={{ textDecoration: "none" }}
              >
                Log in
              </Link>
              <Link 
                href="/login" 
                className="mobile-signup" 
                onClick={() => setMobileOpen(false)} 
                style={{ textDecoration: "none" }}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
        {/* ── MOBILE FOOTER END ── */}

      </div>

      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-bg" />
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
          <a href="/hunt" className="cta-primary">
            Start hunting →
          </a>

          <a href="/analyze" className="cta-ghost">
            Analyze Profile
          </a>
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
