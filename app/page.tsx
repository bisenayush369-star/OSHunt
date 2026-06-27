"use client";
import React, { useState, useEffect } from "react";
import HomeNav from "@/components/ui/HomeNav";

const css = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#090909;--nav-bg:rgba(9,9,9,0.85);--text:#efefef;--muted:#666;--dim:#333;--border:rgba(255,255,255,0.07);--accent:#a8ff3e;--font:'Outfit',sans-serif;}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  
  /* Existing Hero Styles */
  .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;position:relative;overflow:hidden;}
  .hero-text{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;position:relative;overflow:hidden;min-height:100vh;padding:4rem;}
  .hero-demo{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:4rem;border-left:1px solid var(--border);background-image:radial-gradient(rgba(255,255,255,0.07) 1.2px, transparent 1.2px);background-size:22px 22px;}
  .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;border:1px solid var(--border);font-size:12px;color:var(--muted);margin-bottom:2rem;letter-spacing:.3px;}
  .hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}
  .hero-h1{font-size:clamp(36px,6vw,72px);font-weight:700;line-height:1.05;letter-spacing:-2px;max-width:560px;background:linear-gradient(180deg,#fff 0%,#888 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1.5rem;}
  .hero-h1 em{font-style:normal;-webkit-text-fill-color:var(--accent)}
  .hero-sub{font-size:clamp(15px,2vw,18px);color:var(--muted);max-width:440px;line-height:1.65;margin-bottom:2.5rem;font-weight:300;}
  .hero-cta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-start}
  .cta-primary{padding:12px 26px;font-size:15px;font-weight:600;background:var(--text);color:#090909;border:none;border-radius:30px;cursor:pointer;font-family:var(--font);letter-spacing:-.2px;transition:opacity .15s;text-decoration:none;display:inline-block;}
  .cta-primary:hover{opacity:.85}
  .cta-ghost{padding:12px 26px;font-size:15px;font-weight:500;background:none;color:var(--muted);border:1px solid var(--border);border-radius:30px;cursor:pointer;font-family:var(--font);transition:all .15s;}
  .cta-ghost:hover{color:var(--text);border-color:rgba(255,255,255,.2)}
  .hero-bg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(168,255,62,.04) 0%,transparent 70%);pointer-events:none;}
  .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse at center,black 0%,transparent 70%);pointer-events:none;}
  
  /* ANIMATED HOW IT WORKS CSS */
  .hw-container { max-width: 860px; margin: 4rem auto; padding: 0 1.25rem; }
  .hw-terminal { background: #0c0c0c; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 6rem; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
  .hw-winbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #111; border-bottom: 1px solid var(--border); }
  .hw-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
  .hw-wintitle { margin-left: auto; margin-right: auto; font-family: monospace; font-size: 12px; color: var(--dim); }
  .hw-body { padding: 2rem; display: flex; flex-direction: column; gap: 2.5rem; }
  .hw-step { opacity: 0.2; transition: opacity 0.4s ease, transform 0.4s ease; transform: translateY(10px); }
  .hw-step.active { opacity: 1; transform: translateY(0); }
  .hw-step-label { font-size: 11px; color: var(--accent); letter-spacing: 2px; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }
  .hw-step-title { font-size: 16px; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
  .hw-urlbar { display: flex; align-items: center; gap: 10px; background: #000; border: 1px solid var(--border); padding: 0.85rem 1.1rem; border-radius: 30px; font-family: monospace; color: var(--muted); font-size: 14px; min-height: 20px; }
  .hw-urlbar svg { flex-shrink: 0; opacity: 0.45; }
  .hw-urlbar .typing { color: var(--text); }
  .hw-cursor { display: inline-block; width: 8px; height: 16px; background: var(--accent); vertical-align: middle; margin-left: 4px; animation: blink 1s step-start infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .hw-scan { position: relative; height: 56px; border: 1px solid var(--border); border-radius: 8px; background: #000; overflow: hidden; margin-top: 0.85rem; }
  .hw-scan-row { position: absolute; height: 2px; background: rgba(255,255,255,0.07); border-radius: 2px; }
  .hw-scan-beam { position: absolute; top: 0; bottom: 0; left: -140px; width: 140px; background: linear-gradient(90deg, transparent, rgba(168,255,62,.55), transparent); animation: sweep 1.3s ease-in-out infinite; }
  @keyframes sweep { 0% { left: -140px; } 100% { left: 100%; } }
  .hw-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(168,255,62,0.1); border: 1px solid rgba(168,255,62,0.3); color: var(--accent); padding: 10px 18px; border-radius: 30px; font-size: 13px; font-weight: 500; margin-top: 0.85rem; }
  .hw-badge-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); }
  .hw-check { display: flex; align-items: center; gap: 12px; }
  .hw-check-circle { width: 28px; height: 28px; border-radius: 50%; background: rgba(168,255,62,.12); border: 1px solid rgba(168,255,62,.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 14px rgba(168,255,62,.25); }
  .hw-result { display: inline-flex; align-items: center; gap: 10px; margin-top: 1.5rem; padding: 10px 20px; border: 1px solid rgba(168,255,62,.35); border-radius: 999px; background: #0c0c0c; font-size: 14px; opacity: 0; transform: translateY(8px); transition: opacity .5s ease, transform .5s ease; }
  .hw-result.show { opacity: 1; transform: translateY(0); }
  .hw-result strong { color: #fff; font-weight: 700; }
  .hw-result-sub { color: var(--muted); }

  /* SLOGAN QUOTE */
  .slogan-section { padding: 3.5rem 2rem; text-align: center; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .slogan-text { font-size: clamp(18px,2.4vw,24px); font-style: italic; color: var(--text); font-weight: 500; max-width: 700px; margin: 0 auto; line-height: 1.5; }

  /* LIME BANNER */
  .banner-section { background: var(--accent); padding: 2.5rem 2rem; text-align: center; }
  .banner-text { font-size: clamp(20px,3vw,28px); font-weight: 600; color: #090909; letter-spacing: -.3px; }
  .banner-text strong { font-weight: 800; }

  /* PRICING */
  .pricing-section { padding: 6rem 2rem; max-width: 900px; margin: 0 auto; text-align: center; }
  .pricing-title { font-size: clamp(32px,5vw,44px); font-weight: 800; letter-spacing: -1px; margin-bottom: .75rem; }
  .pricing-sub { color: var(--muted); font-size: 15px; margin-bottom: 3rem; }
  .pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; text-align: left; }
  .price-card { background: #0c0c0c; border: 1px solid var(--border); border-radius: 16px; padding: 2rem; position: relative; }
  .price-card.pro { border-color: rgba(168,255,62,.4); }
  .price-popular { position: absolute; top: -12px; right: 24px; background: var(--accent); color: #090909; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; letter-spacing: .3px; }
  .price-tier { font-size: 18px; font-weight: 700; margin-bottom: 1rem; }
  .price-amount { font-size: 38px; font-weight: 800; letter-spacing: -1px; display: flex; align-items: baseline; gap: 6px; }
  .price-amount span { font-size: 14px; font-weight: 400; color: var(--muted); }
  .price-features { list-style: none; margin: 1.5rem 0 2rem; display: flex; flex-direction: column; gap: .75rem; }
  .price-features li { display: flex; align-items: center; gap: 10px; font-size: 14px; color: var(--muted); }
  .price-features li svg { flex-shrink: 0; }
  .price-btn { display: block; width: 100%; text-align: center; padding: 12px; border-radius: 8px; font-weight: 600; font-size: 14px; text-decoration: none; transition: all .15s; }
  .price-btn.free { border: 1px solid var(--border); color: var(--text); }
  .price-btn.free:hover { border-color: rgba(255,255,255,.25); }
  .price-btn.pro { background: var(--accent); color: #090909; }
  .price-btn.pro:hover { opacity: .88; }
  
  .diff-wrap { position: relative; padding: 3rem 1rem 1rem; background-image: radial-gradient(rgba(255,255,255,0.09) 1.2px, transparent 1.2px); background-size: 22px 22px; background-position: center top; }
  .diff-title-header { text-align: center; font-size: clamp(32px, 5vw, 48px); font-weight: 800; letter-spacing: -1.5px; text-transform: uppercase; margin-bottom: 3rem; opacity: 0; transition: opacity 0.6s ease; }
  .diff-title-header.show { opacity: 1; }

  /* DIFF SECTION */
  .diff-section { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; }
  .diff-section.show { opacity: 1; transform: translateY(0); }
  .diff-card { background: #0c0c0c; border: 1px solid var(--border); border-radius: 12px; padding: 2rem; position: relative; }
  .diff-badge { position: absolute; top: -12px; left: 2rem; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 4px; letter-spacing: 1px; }
  .diff-badge.red { background: #1a0505; color: #ff5f56; border: 1px solid rgba(255,95,86,0.3); }
  .diff-badge.green { background: #051a05; color: var(--accent); border: 1px solid rgba(168,255,62,0.3); }
  .diff-text { font-family: monospace; font-size: 13px; color: var(--muted); line-height: 1.6; }
  .diff-text strong { color: var(--text); font-size: 15px; font-weight: 600; font-family: var(--font); }
  .diff-text em { color: #888; font-style: normal; }
  .diff-text.highlight { color: var(--text); }
  .diff-text.highlight .hl { color: var(--accent); font-weight: 600; }
  .diff-arrows { display: flex; justify-content: space-around; font-size: 20px; color: var(--dim); margin: 1.5rem 0; padding: 0 20%; }
  .diff-split { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }

  /* ANIMATED MARQUEE SECTION */
  .marquee-section { padding: 3rem 0; overflow: hidden; display: flex; flex-direction: column; background: #090909; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
  .marquee-label { font-size: 11px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2rem; font-weight: 600; padding-left: 2rem; max-width: 1060px; margin-left: auto; margin-right: auto; width: 100%; }
  .marquee-container { width: 100vw; overflow: hidden; display: flex; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
  .marquee-track { display: flex; gap: 4rem; align-items: center; width: max-content; animation: scroll 35s linear infinite; padding: 0 2rem; }
  .marquee-item { font-size: 16px; color: var(--muted); font-weight: 600; letter-spacing: -0.3px; transition: color 0.2s ease; white-space: nowrap; cursor: default; }
  .marquee-item:hover { color: var(--text); }
  @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

  /* Remaining Sections */
  .features{padding:5rem 2rem;max-width:1060px;margin:0 auto}
  .section-label{font-size:12px;color:var(--accent);letter-spacing:1.5px;text-transform:uppercase;font-weight:500;margin-bottom:1rem;text-align:center;}
  .section-title{font-size:clamp(28px,4vw,42px);font-weight:700;letter-spacing:-1.5px;margin-bottom:1rem;line-height:1.1;text-align:center;}
  .section-sub{font-size:15px;color:var(--muted);max-width:440px;line-height:1.65;font-weight:300;margin:0 auto 3rem;text-align:center;}
  .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden}
  .feat-card{background:#090909;padding:2rem;transition:background .2s}
  .feat-card:hover{background:#0f0f0f}
  .feat-title{font-size:15px;font-weight:600;letter-spacing:-.3px;margin-bottom:.5rem}
  .feat-text{font-size:13px;color:var(--muted);line-height:1.65;font-weight:300}
  
  .cta-section{padding:6rem 2rem;text-align:center}
  .cta-box{max-width:560px;margin:0 auto}
  .cta-h2{font-size:clamp(30px,5vw,52px);font-weight:700;letter-spacing:-2px;margin-bottom:1rem;line-height:1.05}
  .cta-p{font-size:15px;color:var(--muted);margin-bottom:2rem;line-height:1.65;font-weight:300}

  @media(max-width:900px){
    .hero{grid-template-columns:1fr;}
    .hero-text{min-height:auto;padding:6rem 1.5rem 3rem;align-items:center;text-align:center;}
    .hero-cta{justify-content:center;}
    .hero-demo{min-height:auto;padding:3rem 1.5rem 4rem;border-left:none;border-top:1px solid var(--border);}
  }

  @media(max-width:768px){
    .diff-split { grid-template-columns: 1fr; }
    .diff-arrows { display: none; }
    .feat-grid{grid-template-columns:1fr}
    .pricing-grid{grid-template-columns:1fr}
    .features,.cta-section{padding-left:1.25rem;padding-right:1.25rem}
  }
`;

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1.25rem", display: "block" }}>
    <path d={d} />
  </svg>
);

const GithubGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.58 2 12.2c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.5 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.1-1.49-1.1-1.49-.9-.63.07-.62.07-.62.99.07 1.51 1.04 1.51 1.04.89 1.55 2.33 1.1 2.9.84.09-.66.34-1.1.62-1.36-2.22-.26-4.55-1.13-4.55-5.02 0-1.11.38-2.02 1.01-2.73-.1-.26-.44-1.31.1-2.72 0 0 .83-.27 2.72 1.04a9.2 9.2 0 0 1 4.96 0c1.89-1.31 2.72-1.04 2.72-1.04.54 1.41.2 2.46.1 2.72.63.71 1.01 1.62 1.01 2.73 0 3.9-2.34 4.76-4.57 5.01.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .28.18.6.69.5A10.02 10.02 0 0 0 22 12.2C22 6.58 17.52 2 12 2Z" />
  </svg>
);

const CheckGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5 9 18 20 6" />
  </svg>
);

const LogoGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
    <path d="M 18 4 A 14 14 0 0 0 18 32 L 18 26 A 8 8 0 0 1 18 10 Z" fill="#a8ff3e" opacity="0.3" />
    <path d="M 18 4 L 32 18 L 18 32 L 18 26 L 26 18 L 18 10 Z" fill="#a8ff3e" />
    <circle cx="13" cy="18" r="2.5" fill="#a8ff3e" />
  </svg>
);

const FEATURES = [
  { d: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-4a6 6 0 100-12 6 6 0 000 12zm0-4a2 2 0 100-4 2 2 0 000 4z", title: "Stack-matched issues", text: "Pick your stack. Every issue you see is already filtered to what you can actually fix — no Python issues when you write JavaScript." },
  { d: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", title: "AI reads the bug for you", text: "Gemini reads the issue and surrounding code. Tells you what's broken, how hard it is, and the exact concept you need to fix it." },
  { d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", title: "GitLense — understand any repo", text: "Paste a GitHub URL. Get a plain-English breakdown of the architecture, stack, and where to start before you touch a single file." },
  { d: "M18 20V10M12 20V4M6 20v-6", title: "Track your contributions", text: "Every issue you solve gets logged. Build a contribution streak. See your growth. Show it to anyone hiring." },
  { d: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22", title: "Real repos, real impact", text: "Everything comes straight from the GitHub API. No curated lists that go stale. Fresh issues from repos people actually use." },
  { d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", title: "Built for beginners who mean it", text: "You don't need 3 years of experience to contribute. You need the right issue and enough context. That's exactly what this gives you." },
];

const MARQUEE_ITEMS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "Django", "Vue.js", 
  "Express", "Prisma", "MongoDB", "PostgreSQL", "Go", "Rust", "Tailwind"
];

const OSHuntAnimatedFlow = () => {
  const [phase, setPhase] = useState(1);
  const [typedUrl, setTypedUrl] = useState("");
  const targetUrl = "https://github.com/vercel/next.js/issues/59231";

  useEffect(() => {
    let isCancelled = false;

    const runAnimation = async () => {
      while (!isCancelled) {
        setPhase(1);
        setTypedUrl("");
        await new Promise((r) => setTimeout(r, 1000));

        for (let i = 0; i <= targetUrl.length; i++) {
          if (isCancelled) return;
          setTypedUrl(targetUrl.slice(0, i));
          await new Promise((r) => setTimeout(r, 35));
        }
        await new Promise((r) => setTimeout(r, 800));

        setPhase(2);
        await new Promise((r) => setTimeout(r, 1500));

        setPhase(3);
        await new Promise((r) => setTimeout(r, 6000));
      }
    };

    runAnimation();
    return () => { isCancelled = true; };
  }, []);

  return (
    <div className="hw-container" id="how-it-works">
      
      <div className="hw-terminal">
        <div className="hw-winbar">
          <span className="hw-dot" style={{ background: "#ff5f56" }} />
          <span className="hw-dot" style={{ background: "#ffbd2e" }} />
          <span className="hw-dot" style={{ background: "#27c93f" }} />
          <span className="hw-wintitle">oshunt — issue analyzer</span>
        </div>
        <div className="hw-body">
          
          <div className={`hw-step ${phase >= 1 ? 'active' : ''}`}>
            <span className="hw-step-label">Step 01</span>
            <div className="hw-step-title">Paste a confusing GitHub issue</div>
            <div className="hw-urlbar">
              <GithubGlyph />
              <span className="typing">{typedUrl}</span>
              {phase === 1 && <span className="hw-cursor" />}
            </div>
          </div>

          <div className={`hw-step ${phase >= 2 ? 'active' : ''}`}>
            <span className="hw-step-label">Step 02</span>
            <div className="hw-step-title">Let AI analyze the repository</div>
            {phase === 2 && (
              <div className="hw-scan">
                <div className="hw-scan-row" style={{ top: 14, left: 14, width: "70%" }} />
                <div className="hw-scan-row" style={{ top: 27, left: 14, width: "85%" }} />
                <div className="hw-scan-row" style={{ top: 40, left: 14, width: "55%" }} />
                <div className="hw-scan-beam" />
              </div>
            )}
            {phase >= 3 && (
              <div className="hw-badge">
                <div className="hw-badge-dot" />
                100% codebase context gathered
              </div>
            )}
          </div>

          <div className={`hw-step ${phase >= 3 ? 'active' : ''}`}>
            <span className="hw-step-label">Step 03</span>
            <div className="hw-check">
              <div className="hw-check-circle">
                <CheckGlyph />
              </div>
              <div className="hw-step-title" style={{ color: "var(--accent)", marginBottom: 0 }}>Start fixing with full context</div>
            </div>
          </div>

        </div>
      </div>

      <div className={`hw-result ${phase >= 3 ? 'show' : ''}`}>
        <LogoGlyph />
        <strong>1 read.</strong>
        <span className="hw-result-sub">instead of 12 tabs.</span>
      </div>

      <div className="diff-wrap">
        <h2 className={`diff-title-header ${phase >= 3 ? 'show' : ''}`}>See the difference</h2>

        <div className={`diff-section ${phase >= 3 ? 'show' : ''}`}>
          
          <div className="diff-card">
            <div className="diff-badge red">BEFORE</div>
            <div className="diff-text">
              <strong>Issue #59231: Hydration mismatch on useSearchParams</strong><br/>
              <em>opened 2 days ago by dev_newbie</em><br/><br/>
              Hey, whenever I wrap my layout in Suspense to read search params, my entire app flashes and I get a hydration error in the console. Anyone know why?<br/><br/>
              <em>commenter1:</em> +1 having this issue.<br/>
              <em>commenter2:</em> I think it&apos;s a bug in the router cache?
            </div>
          </div>

          <div className="diff-arrows">
            <div>↓</div>
            <div>↓</div>
          </div>

          <div className="diff-split">
            
            <div className="diff-card">
              <div className="diff-badge green">AI READS THE BUG</div>
              <div className="diff-text highlight">
                <span className="hl">Root Cause:</span> Client components using <code>useSearchParams</code> de-opt the closest Suspense boundary, forcing CSR.<br/><br/>
                <span className="hl">Where to fix:</span> <code>/app/layout.tsx</code><br/><br/>
                <span className="hl">Action Plan:</span> Move the hook into a separate client component and wrap <em>only that component</em> in a <code>&lt;Suspense&gt;</code> fallback.
              </div>
            </div>

            <div className="diff-card">
              <div className="diff-badge green">GITLENSE CONTEXT</div>
              <div className="diff-text highlight">
                <span className="hl">Architecture:</span> Next.js 14 App Router.<br/><br/>
                <span className="hl">Concept:</span> Server vs Client Components.<br/><br/>
                <span className="hl">Impact:</span> Layouts are Server Components by default. Injecting client hooks directly at the root blocks SSR for the entire route tree.
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default function Home() {
  return (
    <>
      <style>{css}</style>
      
      <HomeNav />

      <section id="/whatisoshunt" className="hero">
        <div className="hero-text">
          <div className="hero-grid" />
          <div className="hero-bg" />
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Now in public beta
          </div>
          <h1 className="hero-h1">
            Find bugs.<br />
            <em>Fix them.</em><br />
            Get known.
          </h1>
          <p className="hero-sub">
            OSHunt finds real open source issues matched to your stack — then AI explains exactly what&apos;s broken and how to fix it.
          </p>
          <div className="hero-cta">
            <a href="/hunt" className="cta-primary">Start hunting →</a>
            <a href="/analyze" className="cta-ghost">Analyze Profile</a>
          </div>
        </div>

        <div className="hero-demo">
          <div className="">
            <div className="">
              {/* <span className="hw-dot" style={{ background: "#ff5f56" }} /> */}
              {/* <span className="hw-dot" style={{ background: "#ffbd2e" }} /> */}
              {/* <span className="hw-dot" style={{ background: "#27c93f" }} /> */}
              {/* <span className="hw-wintitle">oshunt — issue analyzer</span> */}
            </div>
            {/* <div style={{ padding: "1.75rem" }}>
              <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, margin: 0 }}>
                Issue #4821: res.json() ignores<br/><code style={{ color: "var(--accent)" }}>replacer</code> function in options
              </p>
            </div> */}
          </div>
          <div className="" style={{}}>
            {/* <LogoGlyph /> */}
            {/* <strong>1 read.</strong> */}
            {/* <span className="hw-result-sub">instead of 12 tabs.</span> */}
          </div>
        </div>
      </section>

      <div className="marquee-section">
        <div className="marquee-label">Hunt bugs in the stacks you already use</div>
        <div className="marquee-container">
          <div className="marquee-track">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
              <span key={idx} className="marquee-item">{item}</span>
            ))}
          </div>
        </div>
      </div>

      <OSHuntAnimatedFlow />

      <div className="slogan-section">
        <p className="slogan-text">&quot;Once you fix your first bug, you can&apos;t go back to tutorials.&quot;</p>
      </div>

      <div className="banner-section">
        <p className="banner-text">Confused by the issue. <strong>Confident in the fix.</strong></p>
      </div>

      <section className="features" style={{ marginTop: "4rem" }}>
        <div className="section-label">Built different</div>
        <h2 className="section-title">Not just a list. A guide.</h2>
        <p className="section-sub">Every tool out there drops you at the issue page and says good luck. OSHunt holds your hand through the whole thing.</p>
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

      <section className="pricing-section">
        <h2 className="pricing-title">Pricing</h2>
        <p className="pricing-sub">Simple. No surprises. Cancel anytime.</p>
        <div className="pricing-grid">

          <div className="price-card">
            <div className="price-tier">Free</div>
            <div className="price-amount">₹0 <span>per month</span></div>
            <ul className="price-features">
              {["5 issue searches per day", "Basic AI issue breakdown", "Bookmark issues", "Contribution tracking", "Community support"].map(f => (
                <li key={f}><CheckGlyph /> {f}</li>
              ))}
            </ul>
            <a href="/signup" className="price-btn free">Get started free</a>
          </div>

          <div className="price-card pro">
            <span className="price-popular">MOST POPULAR</span>
            <div className="price-tier">Pro</div>
            <div className="price-amount">₹149 <span>per month</span></div>
            <ul className="price-features">
              {["Unlimited issue searches", "Everything in Free", "Full GitLense repo analysis", "Priority AI response speed", "Early access to new features"].map(f => (
                <li key={f}><CheckGlyph /> {f}</li>
              ))}
            </ul>
            <a href="/upgrade" className="price-btn pro">Upgrade to Pro</a>
          </div>

        </div>
      </section>

      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-h2">Your first merged PR is one hunt away.</h2>
          <p className="cta-p">Stop watching tutorials. Start fixing real bugs in repos with real users. Your GitHub profile will never look the same.</p>
          <a href="/hunt" className="cta-primary" style={{ fontSize: 15, padding: "13px 28px" }}>Start hunting for free →</a>
        </div>
      </section>
    </>
  );
}