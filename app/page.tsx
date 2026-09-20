"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import HomeNav from "@/components/ui/HomeNav";
import HeroLiveTerminal from "@/components/hero-terminal";
// import Footer from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#090909;--nav-bg:rgba(9,9,9,0.85);--text:#efefef;--muted:#7d7d7d;--dim:#7a7a7a;--border:rgba(255,255,255,0.07);--accent:#a8ff3e;--font:'Outfit',sans-serif;--font-mono:'JetBrains Mono',monospace;}
  html{scroll-behavior:smooth}
  body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased}
  
  /* Existing Hero Styles */
  .hero{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;position:relative;overflow:visible;}
  .hero-text{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;text-align:left;position:relative;overflow:visible;min-height:100vh;padding:4rem;}
  .hero-demo{position:relative;overflow:visible;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:4rem;border-left:1px solid var(--border);background-image:radial-gradient(rgba(255,255,255,0.07) 1.2px, transparent 1.2px);background-size:22px 22px;z-index:1;}
  .hero-demo a.no-underline{text-decoration:none;}
  .hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:20px;border:1px solid var(--border);font-size:12px;color:var(--muted);margin-bottom:2rem;letter-spacing:.3px;}
  .hero-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);}
  .hero-h1{font-size:clamp(36px,6vw,72px);font-weight:700;line-height:1.05;letter-spacing:-2px;max-width:560px;background:linear-gradient(180deg,#fff 0%,#888 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1.5rem;}
  .hero-h1 em{font-style:normal;-webkit-text-fill-color:var(--accent)}
  .hero-sub{font-size:clamp(15px,2vw,18px);color:var(--muted);max-width:500px;line-height:1.7;margin-bottom:1.5rem;font-weight:300;}
  .hero-proof{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:2rem;}
  .hero-proof-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);color:var(--muted);font-size:12px;font-family:var(--font-mono);}
  .hero-proof-pill strong{color:var(--text);font-weight:600;}
  .hero-cta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:flex-start}
  .cta-primary{padding:12px 26px;font-size:15px;font-weight:600;background:var(--text);color:#090909;border:none;border-radius:30px;cursor:pointer;font-family:var(--font);letter-spacing:-.2px;transition:all .15s;text-decoration:none;display:inline-block;box-shadow:0 14px 28px rgba(168,255,62,.14);}
  .cta-primary:hover{opacity:.85}
  .cta-ghost{padding:12px 26px;font-size:15px;font-weight:500;background:none;color:var(--muted);border:1px solid var(--border);border-radius:30px;cursor:pointer;font-family:var(--font);transition:all .15s;}
  .cta-ghost:hover{color:var(--text);border-color:rgba(255,255,255,.2)}
  .hero-bg{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(168,255,62,.04) 0%,transparent 70%);pointer-events:none;}
  .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse at center,black 0%,transparent 70%);pointer-events:none;}

  @media (max-width: 980px){
    .hero{grid-template-columns:1fr;}
    .hero-text,.hero-demo{min-height:auto;padding:3rem 1.25rem;}
    .hero-demo{border-left:none;border-top:1px solid var(--border);}
    .hero-text{padding-bottom:1.5rem;}
    .hero-bg{width:440px;height:440px;}
  }

  @media (max-width: 560px){
    .hero-text{padding:2.5rem 1rem 1.25rem;}
    .hero-demo{padding:1.5rem 1rem 2rem;}
    .hero-badge{margin-bottom:1.25rem;}
    .hero-h1{font-size:clamp(30px,11vw,46px);letter-spacing:-1.2px;}
    .hero-sub{font-size:15px;}
    .hero-proof{gap:8px;}
    .hero-proof-pill{width:100%;justify-content:center;}
    .hero-cta{flex-direction:column;align-items:stretch;}
    .cta-primary,.cta-ghost{width:100%;text-align:center;justify-content:center;}
    .hero-bg{width:280px;height:280px;}
  }
  
  /* ANIMATED HOW IT WORKS CSS */
  .hw-container { max-width: 980px; margin: 4rem auto 5rem; padding: 0 clamp(1rem, 2.6vw, 1.5rem); position: relative; }
  .hw-glow { position: absolute; top: 6%; left: 50%; transform: translateX(-50%); width: 680px; max-width: 95%; height: 320px; background: radial-gradient(ellipse, rgba(168,255,62,.12) 0%, transparent 72%); filter: blur(54px); pointer-events: none; z-index: 0; }
  .hw-terminal { position: relative; z-index: 1; overflow: hidden; margin-bottom: 1.4rem; border-radius: 24px; background: linear-gradient(180deg, rgba(16,16,16,.98) 0%, rgba(9,9,9,.98) 100%); border: 1px solid rgba(255,255,255,.08); box-shadow: 0 1px 0 rgba(255,255,255,.04) inset, 0 30px 80px -28px rgba(0,0,0,.85); }
  .hw-winbar { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(255,255,255,.02); border-bottom: 1px solid rgba(255,255,255,.06); }
  .hw-dot { width: 11px; height: 11px; border-radius: 50%; flex-shrink: 0; }
  .hw-wintitle { margin-left: auto; margin-right: auto; font-family: var(--font-mono); font-size: 12px; color: var(--dim); }
  .hw-body { position: relative; padding: clamp(1.2rem, 2.3vw, 2rem); display: flex; flex-direction: column; gap: clamp(1.25rem, 2.2vw, 2rem); overflow: hidden; }
  .hw-sweep { position: absolute; top: 0; left: -30%; width: 30%; height: 100%; background: linear-gradient(90deg, transparent, rgba(168,255,62,.06), transparent); animation: hwsweep 2.2s ease-in-out infinite; pointer-events: none; }
  @keyframes hwsweep { 0% { transform: translateX(0); } 100% { transform: translateX(420%); } }
  .hw-step { opacity: 0.24; transform: translateY(8px) scale(0.99); transition: opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1); }
  .hw-step.active { opacity: 1; transform: translateY(0) scale(1); }
  .hw-step-label { font-size: 11px; color: var(--accent); letter-spacing: 2px; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: block; }
  .hw-step-title { font-size: 16px; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
  .hw-urlbar { display: flex; align-items: center; gap: 10px; background: #000; border: 1px solid rgba(255,255,255,.07); padding: 0.85rem 1.1rem; border-radius: 999px; font-family: var(--font-mono); color: var(--muted); font-size: 14px; min-height: 20px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.02); }
  .hw-urlbar svg { flex-shrink: 0; opacity: 0.45; }
  .hw-urlbar .typing { color: var(--text); flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hw-cursor { display: inline-block; width: 8px; height: 16px; background: var(--accent); vertical-align: middle; margin-left: 4px; flex-shrink: 0; animation: blink 1s step-start infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .hw-scan { margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.95rem; }
  .hw-progress { height: 3px; border-radius: 999px; background: rgba(255,255,255,.07); overflow: hidden; }
  .hw-scan-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.58rem; }
  .hw-scan-item { display: flex; align-items: center; gap: 0.65rem; font-size: 13px; color: var(--dim); transition: color .25s ease; }
  .hw-scan-item.active { color: var(--text); }
  .hw-scan-item.done { color: var(--muted); }
  .hw-scan-mark { position: relative; width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.16); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color .25s ease, background .25s ease; }
  .hw-scan-item.active .hw-scan-mark { border-color: var(--accent); }
  .hw-scan-item.active .hw-scan-mark::before { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid var(--accent); border-right-color: transparent; border-top-color: transparent; animation: hwspin .8s linear infinite; }
  .hw-scan-item.done .hw-scan-mark { border-color: transparent; background: rgba(168,255,62,.15); }
  @keyframes hwspin { to { transform: rotate(360deg); } }
  .hw-result-panel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; margin-top: 0.45rem; }
  .hw-result-card { min-height: 80px; padding: 0.9rem 1rem; border: 1px solid rgba(255,255,255,.07); border-radius: 14px; background: linear-gradient(180deg, rgba(255,255,255,.025) 0%, rgba(255,255,255,.012) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
  .hw-result-card .label { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--dim); margin-bottom: 0.35rem; }
  .hw-result-card .value { font-size: 13px; color: var(--text); line-height: 1.5; }
  .hw-badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(168,255,62,0.1); border: 1px solid rgba(168,255,62,0.3); color: var(--accent); padding: 10px 18px; border-radius: 30px; font-size: 13px; font-weight: 500; margin-top: 0.85rem; }
  .hw-badge-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); }
  .hw-check { display: flex; align-items: center; gap: 12px; }
  .hw-check-circle { width: 28px; height: 28px; border-radius: 50%; background: rgba(168,255,62,.12); border: 1px solid rgba(168,255,62,.4); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 14px rgba(168,255,62,.25); }
  .hw-result { display: inline-flex; align-items: center; justify-content: center; gap: 10px; padding: 10px 18px; border: 1px solid rgba(168,255,62,.24); border-radius: 999px; background: rgba(12,12,12,.85); backdrop-filter: blur(10px); font-size: 14px; opacity: 0; transform: translateY(8px); transition: opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1); box-shadow: 0 10px 25px rgba(0,0,0,.28); }
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

  /* FEATURE DEEP-DIVES */
  .feat-row { position: relative; padding: 5.5rem 2rem; max-width: 1080px; margin: 0 auto; background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 24px 24px; }
  .feat-row-glow { position: absolute; top: 10%; width: 380px; height: 380px; border-radius: 50%; filter: blur(90px); opacity: .5; pointer-events: none; z-index: 0; }
  .feat-row-inner { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 3.5rem; align-items: center; }
  .feat-row-inner.reverse > *:first-child { order: 2; }
  .feat-row-eyebrow { display: flex; align-items: center; gap: .55rem; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: .9rem; }
  .feat-row-eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 8px currentColor; }
  .feat-row h2 { font-size: clamp(26px, 3.4vw, 34px); font-weight: 800; letter-spacing: -0.8px; line-height: 1.15; margin-bottom: .9rem; }
  .feat-row p { font-size: 15px; color: var(--muted); line-height: 1.7; margin-bottom: 1.5rem; max-width: 440px; }
  .feat-row-points { display: flex; flex-direction: column; gap: .65rem; margin: 0; padding: 0; }
  .feat-row-points li { display: flex; align-items: flex-start; gap: .6rem; font-size: 13.5px; color: var(--text); list-style: none; }
  .feat-row-points li svg { flex-shrink: 0; margin-top: 2px; color: var(--accent); }
  .feat-visual { border: 1px solid var(--border); border-radius: 16px; background: #0c0c0c; overflow: hidden; box-shadow: 0 30px 70px -30px rgba(0,0,0,.65); transition: transform .3s ease; }
  .hunt-issue { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .9rem 1.1rem; border-bottom: 1px solid var(--border); }
  .hunt-issue:last-child { border-bottom: none; }
  .hunt-issue-title { font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hunt-issue-repo { font-family: var(--font-mono); font-size: 11px; color: var(--dim); margin-top: 2px; }
  .hunt-pill { flex-shrink: 0; white-space: nowrap; border-radius: 999px; padding: .3rem .7rem; font-size: 10.5px; font-weight: 600; border: 1px solid; }
  .roadmap-step { display: flex; align-items: center; gap: .75rem; padding: .7rem 0; }
  .roadmap-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; background: rgba(255,184,77,.12); color: #ffb84d; }

  /* CAREER HUB */
  .career-hub { padding: 5rem 2rem 4rem; max-width: 960px; margin: 0 auto; }
  .career-hub-sub { text-align: center; color: var(--muted); font-size: 14px; font-weight: 300; max-width: 540px; margin: 0.75rem auto 3rem; line-height: 1.65; }
  .career-coming-soon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1rem;
    padding: 6px 12px;
    border-radius: 999px;
    border: 1px solid rgba(168,255,62,0.18);
    background: rgba(168,255,62,0.04);
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: .12em;
    text-transform: uppercase;
    font-weight: 700;
  }
  .ch-tabs { display: flex; justify-content: center; gap: .5rem; margin-bottom: 2.5rem; }
  .ch-tab { padding: .65rem 1.4rem; border-radius: 999px; border: 1px solid var(--border); background: rgba(255,255,255,.02); color: var(--muted); font-family: var(--font-mono); font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .2s ease; }
  .ch-tab:hover { color: var(--text); }
  .ch-tab.active { border-color: rgba(168,255,62,.35); background: rgba(168,255,62,.08); color: var(--accent); }
  .ch-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .ch-stat { border: 1px solid var(--border); border-radius: 14px; padding: 1.25rem; background: #0c0c0c; transition: border-color .2s ease; }
  .ch-stat-label { font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--dim); }
  .ch-stat-value { margin-top: .5rem; font-size: 24px; font-weight: 800; color: var(--text); }
  .ch-timeline { display: flex; flex-direction: column; gap: .6rem; }
  .ch-timeline-item { display: flex; align-items: flex-start; gap: .75rem; border: 1px solid var(--border); border-radius: 12px; padding: .85rem 1rem; background: rgba(255,255,255,.015); }
  .ch-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
  .ch-score-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 2rem; border: 1px solid rgba(168,255,62,.2); background: rgba(168,255,62,.03); border-radius: 18px; padding: 1.75rem; margin-bottom: 1.5rem; }
  .ch-categories { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: .75rem; margin-bottom: 1.5rem; }
  .ch-cat { border: 1px solid var(--border); border-radius: 12px; padding: .9rem 1rem; background: #0c0c0c; }
  .ch-cat-bar { height: 5px; border-radius: 999px; background: rgba(255,255,255,.06); overflow: hidden; margin-top: .5rem; }
  .ch-cat-fill { height: 100%; border-radius: 999px; background: var(--accent); transition: width 1s cubic-bezier(.16,1,.3,1); }
  .ch-mentor { border: 1px solid var(--border); border-radius: 16px; overflow: hidden; background: #0c0c0c; margin-bottom: 2rem; }
  .ch-mentor-head { display: flex; align-items: center; gap: .5rem; padding: .85rem 1.1rem; border-bottom: 1px solid var(--border); background: rgba(255,255,255,.02); font-family: var(--font-mono); font-size: 11px; letter-spacing: .05em; color: var(--dim); }
  .ch-mentor-body { padding: 1.1rem; display: flex; flex-direction: column; gap: .65rem; }
  .ch-bubble { max-width: 82%; border-radius: 12px; padding: .6rem .85rem; font-size: 12.5px; line-height: 1.55; }
  .ch-bubble.bot { background: rgba(255,255,255,.04); border: 1px solid var(--border); color: var(--muted); align-self: flex-start; }
  .ch-bubble.user { background: rgba(168,255,62,.08); border: 1px solid rgba(168,255,62,.2); color: var(--text); align-self: flex-end; font-family: var(--font-mono); }

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

  .proof-row{display:flex;flex-wrap:wrap;justify-content:center;gap:.5rem 1.75rem;padding:1.5rem 2rem 0;max-width:900px;margin:0 auto;}
  .proof-item{display:flex;align-items:center;gap:.4rem;font-family:var(--font-mono);font-size:11.5px;color:var(--dim);}
  .proof-item b{color:var(--muted);font-weight:600;}

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
    .hw-sweep{display:none !important;}
    .hw-cursor{animation:none !important;}
    .hw-scan-item.active .hw-scan-mark::before{animation:none !important;}
    .hw-step{transition:none !important;transform:none !important;}
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
    .ch-grid,.ch-categories{grid-template-columns:1fr 1fr;}
    .feat-row-inner{gap:2.25rem;}
  }

  /* Phone */
  @media(max-width:560px){
    .feat-grid{grid-template-columns:1fr;}
    .hero-h1{letter-spacing:-1px;}
    .price-card,.feat-card{padding:1.5rem;}
    .price-amount{font-size:32px;}
    .hw-container{margin:3rem auto 4rem;}
    .hw-body{padding:1.25rem;gap:1.5rem;}
    .hw-urlbar{padding:.7rem .9rem;font-size:13px;}
    .hw-result-panel{grid-template-columns:1fr;}
    .hw-scan-item{font-size:12.5px;}
    .hw-result{width:100%;}
    .diff-body{padding:1.25rem 1.4rem;}
    .diff-wtitle{max-width:120px;}
    .marquee-label{padding-left:1.25rem;}
    .marquee-track{padding:0 1.25rem;gap:2.5rem;}
    .ch-grid,.ch-categories{grid-template-columns:1fr;}
    .ch-score-wrap{flex-direction:column;align-items:flex-start;gap:1.25rem;}
    .ch-bubble{max-width:94%;}
    .feat-row{padding:3.75rem 1.25rem;}
    .feat-row-inner,.feat-row-inner.reverse > *:first-child{grid-template-columns:1fr;order:unset;}
    .feat-row-inner{display:flex;flex-direction:column;}
    .feat-row p{max-width:none;}
  }

  @media(max-width:390px){
    .hw-body{padding:1rem;gap:1.2rem;}
    .hw-winbar{padding:10px 12px;}
    .hw-urlbar{padding:.65rem .8rem;font-size:12px;}
    .hw-step-title{font-size:15px;}
    .hw-result{padding:10px 14px;font-size:13px;}
  }
`;

const Icon = ({ d }: { d: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1.25rem", display: "block" }}>
    <path d={d} />
  </svg>
);

const GithubGlyph = ({ size = 16 }: { size?: number }) => (
  <Image src="/github.svg" alt="GitHub" width={size} height={size} />
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
  { d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", title: "Score your whole profile", text: "Not just one issue — your entire GitHub history, scored out of 1000, with an AI mentor that tells you what to ship next." },
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

// Fades an element up into view the first time it enters the viewport.
function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

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

const Reveal = ({
  children,
  delay = 0,
}: {
  children: React.ReactElement<{ className?: string; style?: React.CSSProperties; ref?: React.Ref<HTMLDivElement> }>;
  delay?: number;
}) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return React.cloneElement(children, {
    // attach the div ref with a properly typed Ref
    ref: ref as unknown as React.Ref<HTMLDivElement>,
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
    if (reduceMotion) { 
      // avoid synchronous setState inside effect to prevent cascading renders
      const t = window.setTimeout(() => setDisplay(value), 0);
      return () => clearTimeout(t);
    }
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

const HUNT_ISSUES = [
  { repo: "supabase/supabase", title: "Add pagination to logs viewer", diff: "Good first issue" },
  { repo: "trpc/trpc", title: "Improve error message for invalid input", diff: "Intermediate" },
  { repo: "vitejs/vite", title: "Support custom cache directory", diff: "Advanced" },
];

const HUNT_PILL_STYLE: Record<string, React.CSSProperties> = {
  "Good first issue": { background: "rgba(168,255,62,.1)", color: "#a8ff3e", borderColor: "rgba(168,255,62,.25)" },
  Intermediate: { background: "rgba(255,184,77,.1)", color: "#ffb84d", borderColor: "rgba(255,184,77,.25)" },
  Advanced: { background: "rgba(255,255,255,.04)", color: "#999", borderColor: "var(--border)" },
};

const HuntSection = () => (
  <section className="feat-row" id="hunt">
    <span className="feat-row-glow" style={{ left: "-6%", background: "#a8ff3e" }} />
    <div className="feat-row-inner">
      <Reveal>
        <div>
          <div className="feat-row-eyebrow" style={{ color: "#a8ff3e" }}><span className="dot" />Hunt</div>
          <h2>Every issue, scored for you.</h2>
          <p>Filter by language, difficulty, and bounty. Every result is ranked against your real skill level — not a good-first-issue label some maintainer set two years ago and forgot about.</p>
          <ul className="feat-row-points">
            <li><CheckGlyph />Segmented difficulty control, from first PR to advanced</li>
            <li><CheckGlyph />Sort by freshness, match score, or bounty value</li>
            <li><CheckGlyph />Filters that actually narrow it down, not decorate the page</li>
          </ul>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="feat-visual" onMouseMove={(e) => handleCardMove(e, "#0c0c0c")} onMouseLeave={handleCardLeave}>
          {HUNT_ISSUES.map((issue) => (
            <div className="hunt-issue" key={issue.title}>
              <div style={{ minWidth: 0 }}>
                <div className="hunt-issue-title">{issue.title}</div>
                <div className="hunt-issue-repo">{issue.repo}</div>
              </div>
              <span className="hunt-pill" style={HUNT_PILL_STYLE[issue.diff]}>{issue.diff}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

const GITLENSE_ROWS = [
  { label: "Entry point", value: "src/index.ts" },
  { label: "Core loop", value: "src/reconciler" },
  { label: "Good first area", value: "src/events" },
];

const GitLenseSection = () => (
  <section className="feat-row" id="gitlense">
    <span className="feat-row-glow" style={{ right: "-6%", background: "#a8ff3e" }} />
    <div className="feat-row-inner reverse">
      <Reveal>
        <div>
          <div className="feat-row-eyebrow" style={{ color: "#a8ff3e" }}><span className="dot" />GitLense</div>
          <h2>Point it at any repo. Get the tour.</h2>
          <p>Paste a GitHub URL and GitLense walks the architecture, flags the entry points, and explains it back in plain English — so you&apos;re not reading a stranger&apos;s codebase cold.</p>
          <ul className="feat-row-points">
            <li><CheckGlyph />Entry points and core modules flagged automatically</li>
            <li><CheckGlyph />Plain-English breakdown, not a wall of file names</li>
            <li><CheckGlyph />Answers &quot;where do I even start&quot; in seconds</li>
          </ul>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="feat-visual" onMouseMove={(e) => handleCardMove(e, "#0c0c0c")} onMouseLeave={handleCardLeave}>
          <div className="diff-winbar">
            <span className="diff-wdot" style={{ background: "#ff5f56" }} />
            <span className="diff-wdot" style={{ background: "#ffbd2e" }} />
            <span className="diff-wdot" style={{ background: "#27c93f" }} />
            <span className="diff-wtitle">repo — architecture tour</span>
          </div>
          <div className="diff-body">
            {GITLENSE_ROWS.map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: ".6rem 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{row.label}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>{row.value}</span>
              </div>
            ))}
            <p style={{ marginTop: "1rem", padding: "0.85rem 1rem", borderRadius: 10, background: "rgba(168,255,62,.06)", fontSize: 12.5, lineHeight: 1.6, color: "var(--muted)" }}>
              &quot;Start in the events module — it&apos;s self-contained, well-tested, and gets reviewed fast.&quot;
            </p>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

const ROADMAP_STEPS = ["Fix the flaky test suite", "Add missing types to the API client", "Write the migration guide"];

const GodModeSection = () => (
  <section className="feat-row" id="god-mode">
    <span className="feat-row-glow" style={{ left: "-6%", background: "#ffb84d" }} />
    <div className="feat-row-inner">
      <Reveal>
        <div>
          <div className="feat-row-eyebrow" style={{ color: "#ffb84d" }}><span className="dot" />God Mode &amp; Bounty Strategist</div>
          <h2>Ask the repo anything. Get a plan back.</h2>
          <p>Staring at a stack trace with no idea what&apos;s wrong wastes an evening. God Mode answers questions about the codebase in plain language. Bounty Strategist goes further — it maps your next three contributions before you&apos;ve opened a single file.</p>
          <ul className="feat-row-points">
            <li><CheckGlyph />AI terminal trained on the exact repo you&apos;re viewing</li>
            <li><CheckGlyph />A real roadmap, not just a task list</li>
            <li><CheckGlyph />Available on Pro</li>
          </ul>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="feat-visual" onMouseMove={(e) => handleCardMove(e, "#0c0c0c")} onMouseLeave={handleCardLeave}>
            <div className="diff-winbar">
              <span className="diff-wdot" style={{ background: "#ff5f56" }} />
              <span className="diff-wdot" style={{ background: "#ffbd2e" }} />
              <span className="diff-wdot" style={{ background: "#27c93f" }} />
              <span className="diff-wtitle">God Mode</span>
            </div>
            <div className="diff-body" style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
              <p style={{ color: "var(--dim)" }}>› why does this test keep timing out?</p>
              <p style={{ marginTop: ".5rem", color: "var(--muted)", lineHeight: 1.6 }}>
                The mock server spins up on a fixed port — it&apos;s colliding with another suite. Run with <span style={{ color: "var(--accent)" }}>--runInBand</span>.
              </p>
            </div>
          </div>
          <div className="feat-visual" onMouseMove={(e) => handleCardMove(e, "#0c0c0c")} onMouseLeave={handleCardLeave}>
            <div className="diff-winbar">
              <span className="diff-wdot" style={{ background: "#ff5f56" }} />
              <span className="diff-wdot" style={{ background: "#ffbd2e" }} />
              <span className="diff-wdot" style={{ background: "#27c93f" }} />
              <span className="diff-wtitle">Bounty Strategist</span>
            </div>
            <div className="diff-body" style={{ paddingTop: ".4rem", paddingBottom: ".4rem" }}>
              {ROADMAP_STEPS.map((step, i) => (
                <div className="roadmap-step" key={step}>
                  <span className="roadmap-num">{i + 1}</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

const TRENDING_REPOS = [
  { name: "shadcn-ui/ui", note: "Blowing up this week — mostly docs and a11y fixes needed.", delta: "+2.1k" },
  { name: "biomejs/biome", note: "Fast-moving Rust toolchain, good if you know TS internals.", delta: "+890" },
  { name: "t3-oss/create-t3-app", note: "Great for first PRs — small, well-scoped issues.", delta: "+540" },
];

const TrendingSection = () => (
  <section className="feat-row" id="trending">
    <span className="feat-row-glow" style={{ right: "-6%", background: "#a8ff3e" }} />
    <div className="feat-row-inner reverse">
      <Reveal>
        <div>
          <div className="feat-row-eyebrow" style={{ color: "#a8ff3e" }}><span className="dot" />Trending</div>
          <h2>Live GitHub search that explains itself.</h2>
          <p>See what&apos;s gaining traction right now, with a one-line reason it&apos;s worth your time — not just a raw star count you have to interpret yourself.</p>
          <ul className="feat-row-points">
            <li><CheckGlyph />Live search straight from the GitHub API</li>
            <li><CheckGlyph />A one-line explainer under every result</li>
            <li><CheckGlyph />Surfaces momentum before it's obvious</li>
          </ul>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="feat-visual" onMouseMove={(e) => handleCardMove(e, "#0c0c0c")} onMouseLeave={handleCardLeave}>
          {TRENDING_REPOS.map((repo) => (
            <div key={repo.name} className="ch-timeline-item" style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}>
              <span className="ch-dot" style={{ background: "#a8ff3e", marginTop: 5 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{repo.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--accent)", flexShrink: 0 }}>{repo.delta}</span>
                </div>
                <p style={{ marginTop: 3, fontSize: 12, lineHeight: 1.5, color: "var(--dim)" }}>{repo.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

const CH_STATS: Array<{ label: string; value?: number; text?: string }> = [
  { label: "Total Repositories", value: 34 },
  { label: "Open Issues Found", value: 6 },
  { label: "Recent Velocity", text: "High" },
  { label: "Last Activity", text: "2h ago" },
];

const CH_TIMELINE = [
  { action: "Opened pull request", target: "vercel/next.js#59231", type: "pr" },
  { action: "Pushed 3 commits", target: "torvalds/linux", type: "commit" },
  { action: "Closed issue", target: "prisma/prisma#8842", type: "issue" },
];

const CH_CATEGORIES = [
  { name: "Code Quality", score: 108 },
  { name: "Consistency", score: 92 },
  { name: "Collaboration", score: 115 },
];

const CH_CHAT = [
  { sender: "user", text: "which repo should I contribute to next?" },
  { sender: "bot", text: "prisma/prisma — you've worked with similar ORMs before, and there are 6 good-first-issues open right now." },
];

const ScoreRing = ({ score, max = 1000, size = 96 }: { score: number; max?: number; size?: number }) => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / max, 1);
  return (
    <div ref={ref} style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#a8ff3e"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={visible ? circumference * (1 - pct) : circumference}
          style={{ transition: "stroke-dashoffset 1.3s cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>
          <Counter value={score} />
        </span>
        <span style={{ fontSize: 10, color: "var(--dim)" }}>/ {max}</span>
      </div>
    </div>
  );
};

const CareerHubSection = () => {
  const [tab, setTab] = useState<"activity" | "score">("activity");

  return (
    <section className="career-hub" id="career-hub">
      <Reveal><div className="section-label">Open Source Career Hub</div></Reveal>
      <Reveal delay={80}><div className="career-coming-soon">Coming soon</div></Reveal>
      <Reveal delay={100}><h2 className="section-title">Your whole profile, scored and coached</h2></Reveal>
      <Reveal delay={140}>
        <p className="career-hub-sub" style={{ marginBottom: 18 }}>
          This GitHub intelligence layer is still in active development. Once live, it will show your activity, strengths, and best next contribution opportunities in one place.
        </p>
      </Reveal>

      <Reveal delay={180}>
        <div className="ch-tabs" role="tablist" aria-label="Career Hub view">
          <button
            type="button"
            role="tab"
            id="ch-tab-activity"
            aria-selected={tab === "activity"}
            aria-controls="ch-panel"
            className={`ch-tab ${tab === "activity" ? "active" : ""}`}
            onClick={() => setTab("activity")}
          >
            Live Activity
          </button>
          <button
            type="button"
            role="tab"
            id="ch-tab-score"
            aria-selected={tab === "score"}
            aria-controls="ch-panel"
            className={`ch-tab ${tab === "score" ? "active" : ""}`}
            onClick={() => setTab("score")}
          >
            My Score
          </button>
        </div>
      </Reveal>

      {tab === "activity" ? (
        <div id="ch-panel" role="tabpanel" aria-labelledby="ch-tab-activity">
          <div className="ch-grid">
            {CH_STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 60}>
                <div className="ch-stat" onMouseMove={(e) => handleCardMove(e, "#0c0c0c")} onMouseLeave={handleCardLeave}>
                  <div className="ch-stat-label">{s.label}</div>
                  <div className="ch-stat-value">{s.value !== undefined ? <Counter value={s.value} /> : s.text}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="ch-timeline">
            {CH_TIMELINE.map((t, i) => (
              <Reveal key={t.target} delay={i * 60}>
                <div className="ch-timeline-item">
                  <span
                    className="ch-dot"
                    style={{ background: t.type === "pr" ? "#a8ff3e" : t.type === "commit" ? "#5b9dff" : "#ffb84d" }}
                  />
                  <span style={{ fontSize: 13.5, color: "var(--text)" }}>
                    {t.action} <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--dim)" }}>{'// '}{t.target}</span>
                  </span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      ) : (
        <div id="ch-panel" role="tabpanel" aria-labelledby="ch-tab-score">
          <Reveal>
            <div className="ch-score-wrap">
              <ScoreRing score={743} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--dim)", marginBottom: 4 }}>
                  Overall Score
                </p>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>
                  Based on 8 real signals from your public activity — expand any category for exactly why, and what to do about it.
                </p>
              </div>
            </div>
          </Reveal>

          <div className="ch-categories">
            {CH_CATEGORIES.map((cat, i) => (
              <Reveal key={cat.name} delay={i * 60}>
                <div className="ch-cat">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--text)" }}>
                    <span>{cat.name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{cat.score}/125</span>
                  </div>
                  <div className="ch-cat-bar">
                    <div className="ch-cat-fill" style={{ width: `${(cat.score / 125) * 100}%` }} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="ch-mentor">
              <div className="ch-mentor-head">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8ff3e", display: "inline-block" }} />
                AI MENTOR
              </div>
              <div className="ch-mentor-body">
                {CH_CHAT.map((m, i) => (
                  <div key={i} className={`ch-bubble ${m.sender}`}>
                    {m.text}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      )}

    </section>
  );
};

const GITLENSE_SCAN_ITEMS = [
  "Reading the repo tree",
  "Tracing entry points",
  "Mapping architecture",
  "Cross-checking source files",
];

const OSHuntAnimatedFlow = () => {
  const [phase, setPhase] = useState(1);
  const [typedUrl, setTypedUrl] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const targetUrl = "https://github.com/vercel/next.js";

  useEffect(() => {
    let isCancelled = false;
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

    const runAnimation = async () => {
      while (!isCancelled) {
        setPhase(1);
        setTypedUrl("");
        setScanStep(0);
        await wait(550);

        for (let i = 0; i <= targetUrl.length; i++) {
          if (isCancelled) return;
          setTypedUrl(targetUrl.slice(0, i));
          await wait(28);
        }
        await wait(700);
        if (isCancelled) return;

        setPhase(2);
        for (let i = 0; i < GITLENSE_SCAN_ITEMS.length; i++) {
          if (isCancelled) return;
          await wait(480);
          setScanStep(i + 1);
        }
        await wait(500);
        if (isCancelled) return;

        setPhase(3);
        await wait(3200);
      }
    };

    runAnimation();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="hw-container" id="how-it-works">
      <div className="hw-glow" />

      <Card className="hw-terminal">
        <div className="hw-winbar">
          <span className="hw-dot" style={{ background: "#ff5f56" }} />
          <span className="hw-dot" style={{ background: "#ffbd2e" }} />
          <span className="hw-dot" style={{ background: "#27c93f" }} />
          <span className="hw-wintitle">oshunt — gitlense</span>
        </div>
        <div className="hw-body">
          {phase === 2 && <div className="hw-sweep" />}

          <div className={`hw-step ${phase >= 1 ? 'active' : ''}`}>
            <span className="hw-step-label">Step 01</span>
            <div className="hw-step-title">Paste a public repo URL</div>
            <div className="hw-urlbar">
              <GithubGlyph />
              <span className="typing">{typedUrl}</span>
              {phase === 1 && <span className="hw-cursor" />}
            </div>
          </div>

          <div className={`hw-step ${phase >= 2 ? 'active' : ''}`}>
            <span className="hw-step-label">Step 02</span>
            <div className="hw-step-title">GitLense reads the codebase</div>
            {phase === 2 && (
              <div className="hw-scan">
                <Progress
                  value={(scanStep / GITLENSE_SCAN_ITEMS.length) * 100}
                  className="hw-progress [&>div]:bg-gradient-to-r [&>div]:from-[#a8ff3e] [&>div]:to-[#d4ff9e]"
                />
                <ul className="hw-scan-list">
                  {GITLENSE_SCAN_ITEMS.map((item, i) => {
                    const done = i < scanStep;
                    const active = i === scanStep - 1;
                    return (
                      <li key={item} className={`hw-scan-item ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                        <span className="hw-scan-mark">{done && <CheckGlyph />}</span>
                        {item}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {phase >= 3 && (
              <div className="hw-result-panel">
                <div className="hw-result-card">
                  <div className="label">Architecture</div>
                  <div className="value">Framework, layers, and runtime entry points.</div>
                </div>
                <div className="hw-result-card">
                  <div className="label">Entry points</div>
                  <div className="value">Where requests start and how the app boots.</div>
                </div>
                <div className="hw-result-card">
                  <div className="label">Contrib guide</div>
                  <div className="value">Fast paths for setup, testing, and first changes.</div>
                </div>
              </div>
            )}
          </div>

          <div className={`hw-step ${phase >= 3 ? 'active' : ''}`}>
            <span className="hw-step-label">Step 03</span>
            <div className="hw-check">
              <div className="hw-check-circle">
                <CheckGlyph />
              </div>
              <div className="hw-step-title" style={{ color: "var(--accent)", marginBottom: 0 }}>Start contributing with full context</div>
            </div>
          </div>
        </div>
      </Card>

      <Badge variant="outline" className={`hw-result ${phase >= 3 ? 'show' : ''}`}>
        <LogoGlyph />
        <strong>1 repo scan.</strong>
        <span className="hw-result-sub">instead of 12 tabs.</span>
      </Badge>
    </div>
  );
};

const DiffSection = () => {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <section className="diff-wrap" id="difference" ref={ref}>
      <h2 className={`diff-title-header ${visible ? 'show' : ''}`}>See the difference</h2>
      <p className="diff-sub">One confusing issue in. Two kinds of clarity out.</p>

      <div className={`diff-section ${visible ? 'show' : ''}`}>

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
    </section>
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
            Stop reading tutorials.<br />
            <em>Start fixing real issues.</em>
          </h1>
          <p className="hero-sub">
            OSHunt finds the right open-source bug for your stack, explains the fix in plain English, and helps you move from issue to PR faster.
          </p>
          <div className="hero-proof">
            <span className="hero-proof-pill"><strong>Free</strong> to start</span>
            <span className="hero-proof-pill"><strong>No</strong> extension required</span>
          </div>
          <div className="hero-cta">
            <a href="/hunt" className="cta-primary">Explore issues →</a>
            <a href="/analyze" className="cta-ghost">See how it works</a>
          </div>
        </div>

       <div className="hero-demo">
          <HeroLiveTerminal />
        </div>
      </section>

      <div className="marquee-section">
        <div className="marquee-label">Hunt issues in the stacks you already use</div>
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

      <div className="proof-row">
        {["repos analyzed", "developers joined", "issues matched", "PRs opened"].map((label) => (
          <span key={label} className="proof-item"><b>—</b> {label}</span>
        ))}
      </div>

      <OSHuntAnimatedFlow />

      <div className="slogan-section">
        <Reveal><p className="slogan-text">&quot;The first real fix makes the rest of the repo feel a lot less intimidating.&quot;</p></Reveal>
      </div>

      <div className="banner-section">
        <p className="banner-text">Confused by the issue. <strong>Confident in the fix.</strong></p>
      </div>

      <HuntSection />
      <GitLenseSection />
      <GodModeSection />
      <TrendingSection />

      <section className="features">
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

      <CareerHubSection />

      <DiffSection />

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
                {["5 issue searches per day", "Basic AI issue breakdown", "Trending — live repo search", "Career Hub — basic profile score", "Bookmark issues & track contributions"].map(f => (
                  <li key={f}><CheckGlyph /> {f}</li>
                ))}
              </ul>
              <a href="/signup" className="price-btn free">Start hunting free</a>
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
                {["Unlimited issue searches", "Everything in Free", "Full GitLense repo analysis", "God Mode AI terminal", "Bounty Strategist roadmap", "Full Career Hub + AI Mentor"].map(f => (
                  <li key={f}><CheckGlyph /> {f}</li>
                ))}
              </ul>
              <a href="/upgrade" className="price-btn pro">Upgrade to Pro</a>
            </div>
          </Reveal>

        </div>
      </section>

      <section className="cta-section">
        <Reveal>
          <div className="cta-box">
            <h2 className="cta-h2">Your next contribution starts with one good hunt.</h2>
            <p className="cta-p">Stop browsing issues in isolation. Start finding the right bug for your stack, understanding the fix, and moving toward your next contribution.</p>
            <a href="/hunt" className="cta-primary" style={{ fontSize: 15, padding: "13px 28px" }}>Start hunting for free →</a>
            <p style={{ marginTop: "1.1rem", fontSize: 12.5, color: "var(--dim)" }}>Works with any public repository · nothing to install · you&apos;re always in control</p>
          </div>
        </Reveal>
      </section>

      {/* <Footer /> */}
    </>
  );
}