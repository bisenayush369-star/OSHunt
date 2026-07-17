"use client";
import React, { useState, useEffect } from "react";
import HomeNav from "@/components/ui/HomeNav";
import HeroLiveTerminal from "@/components/hero-terminal";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#090909;--nav-bg:rgba(9,9,9,0.85);--text:#efefef;--muted:#7d7d7d;--dim:#4a4a4a;--border:rgba(255,255,255,0.07);--accent:#a8ff3e;--font:'Outfit',sans-serif;--font-mono:'JetBrains Mono',monospace;}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  
  /* Existing Hero Styles */
  .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;position:relative;overflow:hidden;}
  .hero-text{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;position:relative;overflow:hidden;min-height:100vh;padding:4rem;}
  .hero-demo{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:4rem;border-left:1px solid var(--border);background-image:radial-gradient(rgba(255,255,255,0.07) 1.2px, transparent 1.2px);background-size:22px 22px;}
  .hero-demo a.no-underline{text-decoration:none;}
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
  .hw-wintitle { margin-left: auto; margin-right: auto; font-family: var(--font-mono); font-size: 12px; color: var(--dim); }
  .hw-body { padding: 2rem; display: flex; flex-direction: column; gap: 2.5rem; }
  .hw-step { opacity: 0.2; transition: opacity 0.4s ease, transform 0.4s ease; transform: translateY(10px); }
  .hw-step.active { opacity: 1; transform: translateY(0); }
  .hw-step-label { font-size: 11px; color: var(--accent); letter-spacing: 2px; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }
  .hw-step-title { font-size: 16px; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
  .hw-urlbar { display: flex; align-items: center; gap: 10px; background: #000; border: 1px solid var(--border); padding: 0.85rem 1.1rem; border-radius: 30px; font-family: var(--font-mono); color: var(--muted); font-size: 14px; min-height: 20px; }
  .hw-urlbar svg { flex-shrink: 0; opacity: 0.45; }
  .hw-urlbar .typing { color: var(--text); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hw-cursor { display: inline-block; width: 8px; height: 16px; background: var(--accent); vertical-align: middle; margin-left: 4px; flex-shrink: 0; animation: blink 1s step-start infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .hw-radar { position: relative; width: 52px; height: 52px; margin: 1rem auto 0; }
  .hw-radar-dot { position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
  .hw-radar-ring { position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px; border-radius: 50%; border: 1px solid var(--accent); opacity: 0; animation: radarPulse 1.8s ease-out infinite; }
  .hw-radar-ring:nth-child(2) { animation-delay: 0.6s; }
  .hw-radar-ring:nth-child(3) { animation-delay: 1.2s; }
  @keyframes radarPulse { 0% { width: 8px; height: 8px; margin: -4px; opacity: 0.55; } 100% { width: 52px; height: 52px; margin: -26px; opacity: 0; } }
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
  .diff-title-header { text-align: center; font-size: clamp(32px, 5vw, 48px); font-weight: 800; letter-spacing: -1.5px; text-transform: uppercase; margin-bottom: .75rem; opacity: 0; transition: opacity 0.6s ease; }
  .diff-title-header.show { opacity: 1; }
  .diff-sub { text-align:center; color:var(--muted); font-size:14px; font-weight:300; max-width:420px; margin:0 auto 3rem; }

  /* DIFF SECTION */
  .diff-section { opacity: 0; transform: translateY(20px); transition: all 0.6s ease; max-width: 900px; margin: 0 auto; }
  .diff-section.show { opacity: 1; transform: translateY(0); }
  .diff-eyebrow { display:flex; align-items:center; gap:7px; font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:.75rem; }
  .diff-eyebrow.red { color:#ff5f56; }
  .diff-eyebrow.green { color:var(--accent); }
  .diff-eyebrow-dot { width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 6px currentColor; flex-shrink:0; }
  .diff-card { background: #0c0c0c; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .diff-winbar { display:flex; align-items:center; gap:6px; padding:10px 14px; border-bottom:1px solid var(--border); background:rgba(255,255,255,.02); }
  .diff-wdot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .diff-wtitle { margin-left:6px; font-family:var(--font-mono); font-size:10.5px; color:var(--dim); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .diff-body { padding: 1.65rem 1.75rem; }
  .diff-text { font-family: var(--font-mono); font-size: 13px; color: var(--muted); line-height: 1.6; }
  .diff-text strong { color: var(--text); font-size: 15px; font-weight: 600; font-family: var(--font); }
  .diff-text em { color: #888; font-style: normal; }
  .diff-text.highlight { color: var(--text); }
  .diff-text.highlight .hl { color: var(--accent); font-weight: 600; }
  .diff-caption { margin-top:.85rem; font-size:12.5px; color:var(--muted); line-height:1.55; font-weight:300; max-width: 92%; }
  .diff-arrows { display: flex; justify-content: space-around; color: var(--accent); margin: 1.5rem 0; padding: 0 22%; }
  .diff-arrows > div { display:flex; }
  .diff-split { display: grid; grid-template-columns: 1fr 1fr; gap: 1.75rem; }

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
  .cta-primary{transition:opacity .15s, transform .25s ease, box-shadow .25s ease;}
  .cta-primary:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(255,255,255,.12);}

  /* FOOTER */
  .footer{border-top:1px solid var(--border);padding:4.5rem 2rem 2rem;}
  .footer-top{max-width:1060px;margin:0 auto;display:grid;grid-template-columns:1.5fr 1fr 1fr 1fr;gap:3rem;padding-bottom:3rem;}
  .footer-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px;letter-spacing:-.3px;margin-bottom:.85rem;}
  .footer-tagline{color:var(--muted);font-size:13.5px;line-height:1.6;max-width:220px;margin-bottom:1.5rem;font-weight:300;}
  .footer-social{display:flex;gap:10px;}
  .footer-social-link{width:34px;height:34px;border-radius:50%;border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--muted);transition:all .2s ease;}
  .footer-social-link:hover{color:var(--accent);border-color:rgba(168,255,62,.35);transform:translateY(-2px);}
  .footer-col-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:1rem;letter-spacing:.2px;}
  .footer-col{display:flex;flex-direction:column;gap:.75rem;}
  .footer-col a{color:var(--muted);font-size:13.5px;text-decoration:none;transition:color .15s ease;width:fit-content;}
  .footer-col a:hover{color:var(--text);}
  .footer-bottom{max-width:1060px;margin:0 auto;padding-top:2rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;font-size:12.5px;color:var(--dim);}
  .footer-status{display:inline-flex;align-items:center;gap:7px;}
  .footer-status-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);box-shadow:0 0 6px var(--accent);}

  /* SCROLL REVEAL SYSTEM */
  .reveal{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.16,1,.3,1),transform .8s cubic-bezier(.16,1,.3,1);}
  .reveal.show{opacity:1;transform:translateY(0);}

  /* HERO — status dot pulse + floating context chips + cursor parallax glow */
  .hero-badge-dot{animation:badgePulse 2.2s ease-in-out infinite;}
  @keyframes badgePulse{0%,100%{box-shadow:0 0 0 0 rgba(168,255,62,.55);}50%{box-shadow:0 0 0 6px rgba(168,255,62,0);}}
  .hero-bg{transition:transform .3s ease-out;}
  .float-chip{position:absolute;display:flex;align-items:center;gap:9px;padding:9px 16px;background:rgba(12,12,12,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(168,255,62,.25);border-radius:30px;font-family:var(--font-mono);font-size:12.5px;color:var(--text);box-shadow:0 14px 30px rgba(0,0,0,.5);opacity:0;z-index:5;animation:chipIn .7s ease forwards,chipFloat 5s ease-in-out infinite;}
  .float-chip .fc-dot{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);flex-shrink:0;}
  .float-chip.c1{top:6%;left:3%;animation-delay:.3s,.3s;}
  .float-chip.c2{bottom:7%;right:3%;animation-delay:.75s,.75s;}
  @keyframes chipIn{to{opacity:1;}}
  @keyframes chipFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-9px);}}

  /* CARD INTERACTION — tilt + cursor spotlight (feature + pricing cards) */
  .feat-card,.price-card{transition:transform .15s ease-out,background .2s ease-out,box-shadow .3s ease;}
  .feat-card{position:relative;}

  /* STATS STRIP — terminal-style readout, ties to the product's own numbers */
  .stats-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:0;max-width:1060px;margin:0 auto;border-top:1px solid var(--border);border-bottom:1px solid var(--border);}
  .stat-item{padding:2.75rem 1.5rem;text-align:center;border-left:1px solid var(--border);}
  .stat-item:first-child{border-left:none;}
  .stat-value{font-family:var(--font-mono);font-size:clamp(22px,3vw,30px);font-weight:700;color:var(--accent);margin-bottom:.5rem;letter-spacing:-.5px;}
  .stat-value::before{content:'> ';color:var(--dim);}
  .stat-label{font-size:12.5px;color:var(--muted);line-height:1.5;max-width:160px;margin:0 auto;}

  /* FAQ */
  .faq-section{padding:6rem 2rem;max-width:720px;margin:0 auto;}
  .faq-list{margin-top:2.5rem;}
  .faq-item{border-bottom:1px solid var(--border);}
  .faq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:1.5rem;padding:1.4rem 0;background:none;border:none;color:var(--text);font-family:var(--font);font-size:15.5px;font-weight:500;text-align:left;cursor:pointer;}
  .faq-q:hover{color:var(--accent);}
  .faq-icon{font-size:19px;color:var(--accent);flex-shrink:0;line-height:1;transition:transform .3s ease;font-weight:400;}
  .faq-item.open .faq-icon{transform:rotate(135deg);}
  .faq-a{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.16,1,.3,1);}
  .faq-a p{padding:0 0 1.5rem;color:var(--muted);font-size:14px;line-height:1.7;font-weight:300;max-width:600px;}

  /* Pro plan — quiet ambient signal that this is the recommended tier */
  .price-card.pro{animation:proGlow 4s ease-in-out infinite;}
  @keyframes proGlow{0%,100%{box-shadow:0 0 0 rgba(168,255,62,0);}50%{box-shadow:0 0 26px rgba(168,255,62,.10);}}

  /* Accessibility */
  a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:4px;}
  @media(prefers-reduced-motion:reduce){
    .reveal{transition:none !important;opacity:1 !important;transform:none !important;}
    .float-chip{animation:none !important;opacity:1 !important;}
    .hero-badge-dot{animation:none !important;}
    .price-card.pro{animation:none !important;}
    .feat-card,.price-card,.cta-primary,.hero-bg{transition:none !important;}
  }

  /* ============ RESPONSIVE — 1024 / 768 / 560 ============ */

  /* Small laptop / tablet landscape */
  @media(max-width:1024px){
    .hero{grid-template-columns:1fr;}
    .hero-text{min-height:auto;padding:6rem 1.5rem 3rem;align-items:center;text-align:center;}
    .hero-cta{justify-content:center;}
    .hero-demo{min-height:auto;padding:3rem 1.5rem 4rem;border-left:none;border-top:1px solid var(--border);}
    .feat-grid{grid-template-columns:repeat(2,1fr);}
    .float-chip{display:none;}
    .footer-top{grid-template-columns:1.5fr 1fr 1fr;}
    .footer-brand{grid-column:1 / -1;max-width:320px;margin-bottom:.5rem;}
  }

  /* Tablet portrait */
  @media(max-width:768px){
    .diff-split{grid-template-columns:1fr;gap:1.25rem;}
    .diff-arrows{padding:0;justify-content:center;margin:1.25rem 0;}
    .diff-arrows > div:nth-child(2){display:none;}
    .pricing-grid{grid-template-columns:1fr}
    .features,.cta-section{padding-left:1.25rem;padding-right:1.25rem}
    .stats-strip{grid-template-columns:1fr 1fr;}
    .stat-item:nth-child(odd){border-left:none;}
    .stat-item{padding:2rem 1rem;}
    .faq-section{padding:4.5rem 1.5rem;}
  }

  /* Phone */
  @media(max-width:560px){
    .feat-grid{grid-template-columns:1fr;}
    .hero-h1{letter-spacing:-1px;}
    .price-card,.feat-card{padding:1.5rem;}
    .price-amount{font-size:32px;}
    .hw-body{padding:1.5rem;gap:2rem;}
    .hw-urlbar{padding:.7rem .9rem;font-size:13px;}
    .diff-body{padding:1.25rem 1.4rem;}
    .diff-wtitle{max-width:120px;}
    .marquee-label{padding-left:1.25rem;}
    .marquee-track{padding:0 1.25rem;gap:2.5rem;}
    .footer{padding:3.5rem 1.5rem 1.5rem;}
    .footer-top{grid-template-columns:1fr;gap:2.25rem;}
    .footer-brand{grid-column:auto;max-width:none;}
    .footer-bottom{flex-direction:column;align-items:flex-start;}
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

const MailGlyph = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3 6.5 9 6.5 9-6.5" />
  </svg>
);

const CheckGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12.5 9 18 20 6" />
  </svg>
);

const ArrowDownGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v14M6 13l6 6 6-6" />
  </svg>
);

const LogoGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 36 36" fill="none">
    <path d="M 18 4 A 14 14 0 0 0 18 32 L 18 26 A 8 8 0 0 1 18 10 Z" fill="#a8ff3e" opacity="0.3" />
    <path d="M 18 4 L 32 18 L 18 32 L 18 26 L 26 18 L 18 10 Z" fill="#a8ff3e" />
    <circle cx="13" cy="18" r="2.5" fill="#a8ff3e" />
  </svg>
);

const GodModeIcon = ({ className = "w-8 h-8 md:w-9 md:h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2.2" /><circle cx="6" cy="17" r="2.2" /><circle cx="18" cy="17" r="2.2" />
    <path d="M12 7.2V12M12 12L6 14.8M12 12L18 14.8" />
  </svg>
);

const BountyIcon = ({ className = "w-8 h-8 md:w-9 md:h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M7 7h10M7 7l-3 6a3 3 0 006 0l-3-6zM17 7l-3 6a3 3 0 006 0l-3-6z" />
  </svg>
);

const TrendingIcon = ({ className = "w-8 h-8 md:w-9 md:h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 17 9 11 13 15 21 6" /><polyline points="14 6 21 6 21 13" />
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

const STATS = [
  { value: MARQUEE_ITEMS.length, suffix: "+", label: "Stacks matched to real issues" },
  { value: 100, suffix: "%", label: "Live from the GitHub API" },
  { value: 3, suffix: "-in-1", label: "Search, analyze & fix" },
  { value: 0, prefix: "₹", label: "To start, forever free" },
];

const FAQS = [
  { q: "Is OSHunt really free?", a: "Yes. The Free plan gives you 5 issue searches a day, a basic AI breakdown, bookmarking, and contribution tracking, with no credit card required. Pro adds unlimited searches and full GitLense repo analysis." },
  { q: "Do I need experience to start?", a: "No. OSHunt is built for beginners who mean it — you don't need years of experience, just the right issue and enough context, which is exactly what the AI breakdown gives you." },
  { q: "Which languages and frameworks are supported?", a: "OSHunt matches issues across React, Next.js, TypeScript, Node.js, Python, Django, Vue.js, and more. Pick your stack, and every issue you see is already filtered to what you can actually fix." },
  { q: "What is GitLense?", a: "Paste any GitHub repo URL and GitLense returns a plain-English breakdown of the architecture and stack, so you know exactly where to start before touching a single file." },
  { q: "Where do the issues come from?", a: "Straight from the GitHub API, never a curated list that goes stale. You always see fresh, real issues from repositories people actually use." },
];

// Fades an element up into view the first time it enters the viewport.
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

const Reveal = ({ children, delay = 0 }: { children: React.ReactElement<any>; delay?: number }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return React.cloneElement(children, {
    ref,
    className: [children.props.className, "reveal", visible ? "show" : ""].filter(Boolean).join(" "),
    style: { ...(children.props.style || {}), transitionDelay: `${delay}ms` },
  });
};

const Counter = ({ value, suffix = "", prefix = "", duration = 1300 }: { value: number; suffix?: string; prefix?: string; duration?: number }) => {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setDisplay(value); return; }
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
};

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button type="button" className="faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-icon">+</span>
      </button>
      <div className="faq-a" style={{ maxHeight: open ? "320px" : "0px" }}>
        <p>{a}</p>
      </div>
    </div>
  );
};

// Subtle tilt + cursor-following spotlight for feature/pricing cards.
const handleCardMove = (e: React.MouseEvent<HTMLDivElement>, base: string) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -3.5;
  const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 3.5;
  card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  card.style.background = `radial-gradient(260px circle at ${x}px ${y}px, rgba(168,255,62,.09), transparent 65%), ${base}`;
};
const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transform = "";
  e.currentTarget.style.background = "";
};

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
        await new Promise((r) => setTimeout(r, 500));

        for (let i = 0; i <= targetUrl.length; i++) {
          if (isCancelled) return;
          setTypedUrl(targetUrl.slice(0, i));
          await new Promise((r) => setTimeout(r, 35));
        }
        await new Promise((r) => setTimeout(r, 800));

        setPhase(2);
        await new Promise((r) => setTimeout(r, 1500));

        setPhase(3);
        await new Promise((r) => setTimeout(r, 2800));
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
              <div className="hw-radar">
                <div className="hw-radar-ring" />
                <div className="hw-radar-ring" />
                <div className="hw-radar-ring" />
                <div className="hw-radar-dot" />
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
        <p className="diff-sub">One confusing issue in. Two kinds of clarity out.</p>

        <div className={`diff-section ${phase >= 3 ? 'show' : ''}`}>

          <div className="diff-eyebrow red">
            <span className="diff-eyebrow-dot" />BEFORE
          </div>
          <div className="diff-card">
            <div className="diff-winbar">
              <span className="diff-wdot" style={{ background: "#ff5f56" }} />
              <span className="diff-wdot" style={{ background: "#ffbd2e" }} />
              <span className="diff-wdot" style={{ background: "#27c93f" }} />
              <span className="diff-wtitle">github.com/vercel/next.js</span>
            </div>
            <div className="diff-body">
              <div className="diff-text">
                <strong>Issue #59231: Hydration mismatch on useSearchParams</strong><br/>
                <span style={{ color: "var(--dim)" }}>2 days old · 6 replies · still unresolved</span>
              </div>
            </div>
          </div>

          <div className="diff-arrows">
            <div><ArrowDownGlyph /></div>
            <div><ArrowDownGlyph /></div>
          </div>

          <div className="diff-split">

            <div>
              <div className="diff-eyebrow green">
                <span className="diff-eyebrow-dot" />AI reads the bug
              </div>
              <div className="diff-card">
                <div className="diff-winbar">
                  <span className="diff-wdot" style={{ background: "#ff5f56" }} />
                  <span className="diff-wdot" style={{ background: "#ffbd2e" }} />
                  <span className="diff-wdot" style={{ background: "#27c93f" }} />
                  <span className="diff-wtitle">oshunt — ai breakdown</span>
                </div>
                <div className="diff-body">
                  <div className="diff-text highlight">
                    Root cause found in <code>/app/layout.tsx</code> — the fix is a 2-line Suspense wrap.
                  </div>
                </div>
              </div>
              <p className="diff-caption">Pinpoints the exact file and the smallest fix that works — no guessing which of the 6 replies is right.</p>
            </div>

            <div>
              <div className="diff-eyebrow green">
                <span className="diff-eyebrow-dot" />GitLense context
              </div>
              <div className="diff-card">
                <div className="diff-winbar">
                  <span className="diff-wdot" style={{ background: "#ff5f56" }} />
                  <span className="diff-wdot" style={{ background: "#ffbd2e" }} />
                  <span className="diff-wdot" style={{ background: "#27c93f" }} />
                  <span className="diff-wtitle">oshunt — gitlense</span>
                </div>
                <div className="diff-body">
                  <div className="diff-text highlight">
                    Root layouts are Server Components — a client hook there blocks SSR for the whole route tree.
                  </div>
                </div>
              </div>
              <p className="diff-caption">Explains why it broke, in plain English, so you understand the repo instead of just patching it.</p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};

export default function Home() {
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const handleHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setHeroTilt({ x, y });
  };

  return (
    <>
      <style>{css}</style>
      
      <HomeNav />

      <section id="/whatisoshunt" className="hero" onMouseMove={handleHeroMove}>
        <div className="hero-text">
          <div className="hero-grid" />
          <div
            className="hero-bg"
            style={{ transform: `translate(calc(-50% + ${heroTilt.x * 24}px), calc(-50% + ${heroTilt.y * 24}px))` }}
          />
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
          <div className="float-chip c1"><span className="fc-dot" />match found · typescript</div>
          <div className="float-chip c2"><span className="fc-dot" />explained in 8s</div>
          <HeroLiveTerminal />
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

      <div className="stats-strip">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 90}>
            <div className="stat-item">
              <div className="stat-value"><Counter value={s.value} prefix={s.prefix} suffix={s.suffix} /></div>
              <div className="stat-label">{s.label}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <OSHuntAnimatedFlow />

      <div className="slogan-section">
        <Reveal><p className="slogan-text">&quot;Once you fix your first bug, you can&apos;t go back to tutorials.&quot;</p></Reveal>
      </div>

      <div className="banner-section">
        <p className="banner-text">Confused by the issue. <strong>Confident in the fix.</strong></p>
      </div>

      <section className="features" style={{ marginTop: "4rem" }}>
        <Reveal><div className="section-label">Built different</div></Reveal>
        <Reveal delay={80}><h2 className="section-title">Not just a list. A guide.</h2></Reveal>
        <Reveal delay={140}><p className="section-sub">Every tool out there drops you at the issue page and says good luck. OSHunt holds your hand through the whole thing.</p></Reveal>
        <div className="feat-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div
                className="feat-card"
                onMouseMove={(e) => handleCardMove(e, "#0f0f0f")}
                onMouseLeave={handleCardLeave}
              >
                <Icon d={f.d} />
                <div className="feat-title">{f.title}</div>
                <div className="feat-text">{f.text}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pricing-section" id="pricing">
        <Reveal><h2 className="pricing-title">Pricing</h2></Reveal>
        <Reveal delay={80}><p className="pricing-sub">Simple. No surprises. Cancel anytime.</p></Reveal>
        <div className="pricing-grid">

          <Reveal>
            <div
              className="price-card"
              onMouseMove={(e) => handleCardMove(e, "#0c0c0c")}
              onMouseLeave={handleCardLeave}
            >
              <div className="price-tier">Free</div>
              <div className="price-amount">₹0 <span>per month</span></div>
              <ul className="price-features">
                {["5 issue searches per day", "Basic AI issue breakdown", "Bookmark issues", "Contribution tracking", "Community support"].map(f => (
                  <li key={f}><CheckGlyph /> {f}</li>
                ))}
              </ul>
              <a href="/signup" className="price-btn free">Get started free</a>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div
              className="price-card pro"
              onMouseMove={(e) => handleCardMove(e, "#0c0c0c")}
              onMouseLeave={handleCardLeave}
            >
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
          </Reveal>

        </div>
      </section>

      <section className="faq-section" id="faq">
        <Reveal><div className="section-label">FAQ</div></Reveal>
        <Reveal delay={80}><h2 className="section-title">Questions, answered</h2></Reveal>
        <div className="faq-list">
          {FAQS.map((item, i) => (
            <Reveal key={item.q} delay={i * 70}>
              <div><FAQItem q={item.q} a={item.a} /></div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <Reveal>
          <div className="cta-box">
            <h2 className="cta-h2">Your first merged PR is one hunt away.</h2>
            <p className="cta-p">Stop watching tutorials. Start fixing real bugs in repos with real users. Your GitHub profile will never look the same.</p>
            <a href="/hunt" className="cta-primary" style={{ fontSize: 15, padding: "13px 28px" }}>Start hunting for free →</a>
          </div>
        </Reveal>
      </section>

      
    </>
  );
}