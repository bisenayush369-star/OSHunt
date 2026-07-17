"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import {
  Radar,
  SearchX,
  EyeOff,
  GitPullRequestClosed,
  Layers,
  Gauge,
  HeartPulse,
  Sparkles,
  FolderGit2,
  Aperture,
  Zap,
  Map,
  DoorOpen,
  Lightbulb,
  GraduationCap,
  Compass,
  Rocket,
  Code2,
  ArrowRight,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dropping this into the real Next.js project:
 *  1) restore  import Navbar from "@/components/ui/HomeNav";
 *  2) restore  import Link from "next/link";  and swap the two <a> tags
 *     in the CTA section for <Link>.
 * Both were swapped out only so this file renders standalone as a preview.
 */

/* ---------------------------------------------------------------- */
/* Brand mark — this is OSHunt's own logo, kept custom on purpose    */
/* ---------------------------------------------------------------- */
function Logo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="9" stroke="var(--accent)" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="2.5" fill="var(--accent)" />
      <line x1="14" y1="1" x2="14" y2="6.5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="21.5" x2="14" y2="27" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="14" x2="6.5" y2="14" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="21.5" y1="14" x2="27" y2="14" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- */
/* Content — unchanged from the original, only icons were remapped   */
/* ---------------------------------------------------------------- */
const issues = [
  { title: "Add rate limiting to Express API routes", repo: "expressjs/express", labels: ["good first issue", "help wanted"], match: 97, lang: "JS" },
  { title: "Fix TypeScript types for useSession hook", repo: "nextauthjs/next-auth", labels: ["good first issue", "typescript"], match: 94, lang: "TS" },
  { title: "Prisma schema validation in CI pipeline", repo: "prisma/prisma", labels: ["enhancement"], match: 89, lang: "TS" },
  { title: "MongoDB aggregation pipeline for analytics", repo: "mongodb/mongoose", labels: ["good first issue"], match: 82, lang: "JS" },
];

const lenseData = {
  summary: "Next.js is a React framework for building full-stack web applications. It extends React with file-based routing, server-side rendering, and API routes — all in one dev experience.",
  structure: [
    { path: "packages/next/src/server/", desc: "Core SSR logic & routing engine" },
    { path: "packages/next/src/client/", desc: "Client-side hydration & navigation" },
    { path: "packages/next/src/build/", desc: "Webpack config & build pipeline" },
  ],
  start: "Start in packages/next/src/server/app-render/ — this is where RSC rendering happens. Good first issues usually touch the client/ directory.",
};

const PROBLEMS = [
  { Icon: SearchX, title: "GitHub search is noise", body: "Searching \u2018good first issue\u2019 returns thousands of issues in repos you know nothing about, using tech you don't use." },
  { Icon: EyeOff, title: "Codebases are opaque", body: "Even if you find a good issue, understanding a 500-file codebase takes hours before you touch a single line of code." },
  { Icon: GitPullRequestClosed, title: "Mismatched PRs get ignored", body: "Contributing to a repo in a stack you half-know means bad code, slow reviews, and PRs that never merge." },
];

const HUNTER_FEATURES = [
  { Icon: Layers, t: "Stack matching", d: "Issues ranked by how well they map to your skills — not just keywords." },
  { Icon: Gauge, t: "Difficulty scoring", d: "Each issue labeled by complexity so you're not hitting brick walls." },
  { Icon: HeartPulse, t: "Repo health check", d: "Dead repos with no maintainers are filtered out automatically." },
  { Icon: Sparkles, t: "AI summaries", d: "Gemini writes a plain-English explanation of what each issue asks for." },
];

const LENSE_FEATURES = [
  { Icon: Zap, t: "No setup", d: "Paste a URL. That's it." },
  { Icon: Map, t: "Architecture map", d: "Understand layout before you clone." },
  { Icon: DoorOpen, t: "Entry-point guide", d: "Know which files to read first and why." },
  { Icon: Lightbulb, t: "Contribution context", d: "AI hints for where the issue actually lives." },
];

const WHO = [
  { Icon: GraduationCap, title: "Students & self-taught devs", body: "You have the skills but not the history. OSHunt builds a real contribution record that speaks louder than any tutorial project." },
  { Icon: Compass, title: "Career switchers", body: "Pivoting into dev? Merged PRs in real repos prove you can work in production codebases — without the overwhelm." },
  { Icon: Rocket, title: "Side project builders", body: "You already build in public. OSHunt connects that energy to established open source projects and multiplies your GitHub presence." },
  { Icon: Code2, title: "Junior devs pre-interview", body: "Nothing kills an interview answer like vague portfolio projects. Merged OSS contributions are concrete, verifiable, and impressive." },
];

const LANG_COLOR: Record<string, string> = { TS: "#3178c6", JS: "#f1e05a" };

function spotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/* ---------------------------------------------------------------- */
/* Small presentational helpers                                      */
/* ---------------------------------------------------------------- */
function IconChip({ Icon, size = 19 }: { Icon: LucideIcon; size?: number }) {
  return (
    <div className="icon-chip">
      <Icon size={size} strokeWidth={1.6} aria-hidden="true" />
    </div>
  );
}

function FeatureRow({ Icon, t, d }: { Icon: LucideIcon; t: string; d: string }) {
  return (
    <div className="feature-row">
      <div className="feature-row-icon">
        <Icon size={14} strokeWidth={2} aria-hidden="true" />
      </div>
      <div>
        <span className="feature-row-title">{t} — </span>
        <span className="feature-row-desc">{d}</span>
      </div>
    </div>
  );
}

/* ================================================================ */

export default function WhatIsOSHunt() {
  const [activeIssue, setActiveIssue] = useState(0);
  const [typed, setTyped] = useState("");
  const fullUrl = "https://github.com/vercel/next.js";

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setTyped(fullUrl.slice(0, i));
      if (i >= fullUrl.length) clearInterval(iv);
    }, 40);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="oshunt-explainer">
      <style>{`
        .oshunt-explainer {
          --bg: #08090a;
          --surface: #0e0f10;
          --surface-2: #141516;
          --border: #1d1f21;
          --border-hover: #2b2e30;
          --accent: #a8ff3e;
          --accent-soft: #d9ffa0;
          --accent-ink: #04150a;
          --accent-dim: rgba(168,255,62,0.10);
          --accent-dim-hover: rgba(168,255,62,0.18);
          --accent-border: rgba(168,255,62,0.28);
          --text: #f5f6f4;
          --muted: #9a9d9c;
          --dim: #6b6e6c;
          --faint: #3a3c3b;
          --font-display: 'Outfit', ui-sans-serif, system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-display);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .oshunt-explainer *, .oshunt-explainer *::before, .oshunt-explainer *::after { box-sizing: border-box; }
        .oshunt-explainer a { color: inherit; text-decoration: none; }
        .oshunt-explainer button { font-family: inherit; }
        .oshunt-explainer :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }

        .container { max-width: 900px; margin: 0 auto; padding-left: clamp(18px, 4vw, 48px); padding-right: clamp(18px, 4vw, 48px); }
        .section { border-top: 1px solid var(--border); padding-top: clamp(52px, 7vw, 88px); padding-bottom: clamp(52px, 7vw, 88px); }

        .eyebrow-label { font-size: 11px; color: var(--dim); letter-spacing: 0.09em; text-transform: uppercase; margin: 0 0 10px; font-weight: 600; }
        .h2 { font-size: clamp(1.6rem, 1.05rem + 2vw, 2.3rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.14; margin: 0 0 36px; }
        .h2-feature { font-size: clamp(1.4rem, 0.95rem + 1.8vw, 1.9rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.18; margin: 0 0 14px; }
        .lead { font-size: clamp(0.85rem, 0.78rem + 0.25vw, 0.9rem); color: var(--muted); line-height: 1.75; margin: 0 0 22px; }
        .card-title { font-size: 15px; font-weight: 600; letter-spacing: -0.015em; margin: 0 0 8px; color: var(--text); }
        .card-body { font-size: 13px; color: var(--muted); line-height: 1.65; margin: 0; }

        /* ---------- hero ---------- */
        .hero { position: relative; overflow: hidden; padding-top: clamp(64px, 11vw, 124px); }
        .hero-field { position: absolute; inset: 0; pointer-events: none; overflow: hidden;
          mask-image: radial-gradient(ellipse 85% 55% at 50% 0%, black 25%, transparent 100%);
          -webkit-mask-image: radial-gradient(ellipse 85% 55% at 50% 0%, black 25%, transparent 100%); }
        .hero-dots { position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 26px 26px; }
        .hero-glow { position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 640px; height: 420px; background: radial-gradient(ellipse at top, rgba(168,255,62,0.14), transparent 65%); }
        .hero-scan { position: absolute; top: -260px; left: 50%; width: 900px; height: 900px; margin-left: -450px; border-radius: 50%; filter: blur(8px);
          background: conic-gradient(from 0deg, transparent 0deg, rgba(168,255,62,0.16) 10deg, transparent 55deg, transparent 360deg); }
        @media (prefers-reduced-motion: no-preference) { .hero-scan { animation: spin-slow 10s linear infinite; } }
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .hero-inner { max-width: 760px; margin: 0 auto; padding: clamp(36px, 6vw, 60px) clamp(18px, 5vw, 48px) clamp(56px, 8vw, 80px); text-align: center; position: relative; }
        .eyebrow-pill { display: inline-flex; align-items: center; gap: 8px; background: var(--accent-dim); border: 1px solid var(--accent-border); border-radius: 999px; padding: 6px 16px 6px 12px; margin-bottom: 24px; }
        .eyebrow-pill span { font-size: 11.5px; color: var(--accent); font-weight: 600; }
        .pulse-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); position: relative; flex-shrink: 0; }
        @media (prefers-reduced-motion: no-preference) {
          .pulse-dot::after { content: ""; position: absolute; inset: -4px; border-radius: 50%; background: var(--accent); opacity: 0.55; animation: pulse-ring 2.2s ease-out infinite; }
        }
        @keyframes pulse-ring { 0% { transform: scale(0.6); opacity: 0.55; } 100% { transform: scale(2.4); opacity: 0; } }
        .h1-hero { font-size: clamp(2.1rem, 1.2rem + 3.6vw, 3.6rem); font-weight: 800; letter-spacing: -0.04em; line-height: 1.08; margin: 0 0 20px; }
        .accent-grad { background: linear-gradient(135deg, var(--accent), var(--accent-soft)); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .hero-sub { font-size: clamp(0.9rem, 0.8rem + 0.3vw, 1rem); color: var(--muted); line-height: 1.75; margin: 0 auto; max-width: 520px; }

        /* ---------- reveal on scroll ---------- */
        @media (prefers-reduced-motion: no-preference) {
          .reveal { opacity: 0; transform: translateY(18px); transition: opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1); }
          .reveal.is-in { opacity: 1; transform: translateY(0); }
          .stagger > *:nth-child(1) { transition-delay: 0ms; }
          .stagger > *:nth-child(2) { transition-delay: 90ms; }
          .stagger > *:nth-child(3) { transition-delay: 180ms; }
          .stagger > *:nth-child(4) { transition-delay: 270ms; }
        }

        /* ---------- responsive grids ---------- */
        .grid-3 { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .grid-3 { grid-template-columns: 1fr 1fr; } }
        @media (min-width: 1024px) { .grid-3 { grid-template-columns: 1fr 1fr 1fr; } }

        .grid-2 { display: grid; grid-template-columns: 1fr; gap: 14px; }
        @media (min-width: 640px) { .grid-2 { grid-template-columns: 1fr 1fr; } }

        .split { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; }
        @media (min-width: 1024px) { .split { grid-template-columns: 1fr 1fr; gap: 64px; } }
        .split-text { order: 1; }
        .split-visual { order: 2; }
        @media (min-width: 1024px) {
          .split-alt .split-text { order: 2; }
          .split-alt .split-visual { order: 1; }
        }

        /* ---------- cards (problem / who-for) ---------- */
        .card { position: relative; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 24px 20px; overflow: hidden;
          transition: border-color .35s ease, transform .35s ease, box-shadow .35s ease, background-color .35s ease; }
        .card::before { content: ""; position: absolute; inset: 0; opacity: 0; transition: opacity .4s ease; pointer-events: none;
          background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), var(--accent-dim), transparent 45%); }
        .card:hover { border-color: var(--border-hover); transform: translateY(-3px); box-shadow: 0 20px 40px -26px rgba(0,0,0,0.7); background: var(--surface-2); }
        .card:hover::before { opacity: 1; }

        .icon-chip { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-bottom: 14px;
          background: linear-gradient(160deg, var(--surface-2), var(--surface)); border: 1px solid var(--border); color: var(--muted);
          transition: color .3s ease, border-color .3s ease, box-shadow .3s ease, transform .3s ease; }
        .card:hover .icon-chip { color: var(--accent); border-color: var(--accent-border); box-shadow: 0 0 0 1px var(--accent-border), 0 10px 26px -10px var(--accent-dim-hover); transform: translateY(-2px); }

        /* ---------- section tag (Issue Hunter / GitLense label) ---------- */
        .section-tag { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .section-tag-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; background: var(--accent-dim); border: 1px solid var(--accent-border); color: var(--accent); }
        .section-tag-icon.neutral { background: var(--surface-2); border-color: var(--border); color: #8b8e8c; }
        .section-tag-label { font-size: 10.5px; font-weight: 700; color: var(--accent); letter-spacing: 0.07em; text-transform: uppercase; }
        .section-tag-label.neutral { color: #8b8e8c; }

        /* ---------- feature rows ---------- */
        .feature-list { display: flex; flex-direction: column; gap: 12px; }
        .feature-row { display: flex; gap: 12px; align-items: flex-start; }
        .feature-row-icon { width: 26px; height: 26px; border-radius: 8px; background: var(--accent-dim); border: 1px solid var(--accent-border); color: var(--accent);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .feature-row-title { font-size: 13px; font-weight: 600; color: #dcdedc; }
        .feature-row-desc { font-size: 13px; color: var(--muted); }

        /* ---------- issue cards ---------- */
        .issue-list { display: flex; flex-direction: column; gap: 8px; }
        .issue-card { all: unset; box-sizing: border-box; cursor: pointer; display: block; width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 13px 14px; transition: all .22s ease; }
        .issue-card:hover { border-color: var(--border-hover); background: var(--surface-2); }
        .issue-card.active { background: var(--surface-2); border-color: var(--accent-border); box-shadow: 0 0 0 1px var(--accent-border); }
        .issue-card-labels { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
        .issue-card-title { margin: 0 0 10px; font-size: 12.5px; color: #dcdedc; font-weight: 500; line-height: 1.45; }
        .issue-card-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .issue-repo { display: flex; align-items: center; gap: 5px; font-size: 10.5px; color: #5a5d5b; font-family: var(--font-mono); min-width: 0; }
        .issue-repo span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lang-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .match-wrap { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
        .match-num { font-size: 10.5px; color: var(--accent); font-weight: 700; font-family: var(--font-mono); }
        .match-bar { width: 40px; height: 4px; border-radius: 2px; background: var(--faint); overflow: hidden; }
        .match-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; width: 0%; transition: width 1s cubic-bezier(.16,1,.3,1); }
        .issue-detail { margin-top: 12px; padding-top: 12px; }
        .issue-detail p { font-size: 11.5px; color: var(--dim); line-height: 1.6; margin: 0; }
        .issue-detail b { color: var(--accent); font-weight: 600; }

        /* ---------- terminal mock ---------- */
        .terminal-wrap { background: #08090a; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
        .terminal-head { background: #111214; padding: 10px 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 7px; }
        .terminal-dot { width: 10px; height: 10px; border-radius: 50%; opacity: 0.85; }
        .terminal-title { font-size: 11px; color: #3a3c3b; margin-left: 8px; font-family: var(--font-mono); }
        .terminal-input-row { padding: 13px 15px; border-bottom: 1px solid var(--border); }
        .terminal-input { background: #0f1011; border: 1px solid var(--accent-border); border-radius: 8px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; }
        .terminal-input span.url { font-size: 11.5px; color: #a7aaa8; font-family: var(--font-mono); word-break: break-all; }
        .blink-cursor { border-right: 1px solid var(--accent); margin-left: 1px; }
        @media (prefers-reduced-motion: no-preference) { .blink-cursor { animation: blink 1s step-end infinite; } }
        @keyframes blink { 50% { border-color: transparent; } }
        .terminal-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
        .terminal-label { font-size: 9.5px; color: var(--dim); text-transform: uppercase; letter-spacing: 0.07em; margin: 0 0 6px; font-weight: 600; }
        .terminal-summary { font-size: 11.5px; color: #a3a6a4; line-height: 1.65; margin: 0; }
        .terminal-dir-row { display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start; }
        .terminal-dir-row:last-child { margin-bottom: 0; }
        .terminal-dir-path { font-size: 10px; color: var(--accent); font-family: var(--font-mono); flex-shrink: 0; margin-top: 1px; word-break: break-all; }
        .terminal-dir-desc { font-size: 10.5px; color: #757876; }
        .terminal-start { font-size: 11px; color: #9a9d9c; line-height: 1.6; margin: 0; }

        /* ---------- buttons ---------- */
        .btn-shine { position: relative; overflow: hidden; }
        .btn-shine::after { content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; transform: skewX(-20deg);
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent); transition: left .7s ease; }
        .btn-shine:hover::after { left: 130%; }
        .btn-primary-inner, .btn-secondary-inner { display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary-inner svg { transition: transform .3s ease; }
        .btn-shine:hover .btn-primary-inner svg { transform: translateX(3px); }

        /* ---------- CTA ---------- */
        .cta-card { position: relative; overflow: hidden; border-radius: 20px; padding: clamp(36px, 6vw, 60px) clamp(20px, 6vw, 52px); text-align: center; }
        .cta-glow { position: absolute; top: -80px; left: 50%; transform: translateX(-50%); width: 520px; height: 300px; pointer-events: none;
          background: radial-gradient(ellipse at top, var(--accent-dim), transparent 70%); }
      `}</style>

      {/* HERO */}
      <section className="hero">
        <div className="hero-field" aria-hidden="true">
          <div className="hero-scan" />
          <div className="hero-glow" />
          <div className="hero-dots" />
        </div>
        <div className="hero-inner reveal">
          <div className="eyebrow-pill">
            <span className="pulse-dot" />
            <Radar size={13} strokeWidth={2} style={{ color: "var(--accent)" }} aria-hidden="true" />
            <span>What is OSHunt?</span>
          </div>
          <h1 className="h1-hero">
            The missing layer<br />between you and<br />
            <span className="accent-grad">open source.</span>
          </h1>
          <p className="hero-sub">
            OSHunt is an AI-powered platform that finds GitHub issues matching your tech stack — and explains any codebase in plain English before you write a line. Not just a search engine. A contribution co-pilot.
          </p>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section">
        <div className="container">
          <p className="eyebrow-label reveal">The problem</p>
          <h2 className="h2 reveal">Open source is overwhelming<br />to break into.</h2>
          <div className="grid-3 stagger">
            {PROBLEMS.map(({ Icon, title, body }) => (
              <div key={title} className="card reveal" onMouseMove={spotlight}>
                <IconChip Icon={Icon} />
                <h3 className="card-title">{title}</h3>
                <p className="card-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ISSUE HUNTER */}
      <section className="section">
        <div className="container">
          <div className="split">
            <div className="split-text reveal">
              <div className="section-tag">
                <div className="section-tag-icon"><Logo size={17} /></div>
                <span className="section-tag-label">Issue Hunter</span>
              </div>
              <h2 className="h2-feature">Issues matched to<br />your exact stack.</h2>
              <p className="lead">
                Paste your skills, connect GitHub. The Gemini-powered engine scans thousands of open issues and surfaces ones that match your exact stack — sorted by difficulty, repo health, and fit score.
              </p>
              <div className="feature-list">
                {HUNTER_FEATURES.map((f) => <FeatureRow key={f.t} {...f} />)}
              </div>
            </div>

            <div className="split-visual reveal">
              <div className="issue-list">
                {issues.map((iss, i) => (
                  <button
                    key={iss.title}
                    type="button"
                    onClick={() => setActiveIssue(activeIssue === i ? -1 : i)}
                    className={`issue-card${activeIssue === i ? " active" : ""}`}
                    aria-expanded={activeIssue === i}
                  >
                    <div className="issue-card-labels">
                      {iss.labels.map((l) => (
                        <Badge
                          key={l}
                          variant="outline"
                          className="rounded-full font-medium"
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            lineHeight: "16px",
                            backgroundColor: l === "good first issue" ? "var(--accent-dim)" : "rgba(255,255,255,0.03)",
                            color: l === "good first issue" ? "var(--accent)" : "#8b8e8c",
                            borderColor: l === "good first issue" ? "var(--accent-border)" : "var(--border)",
                          }}
                        >
                          {l}
                        </Badge>
                      ))}
                    </div>
                    <p className="issue-card-title">{iss.title}</p>
                    <div className="issue-card-meta">
                      <div className="issue-repo">
                        <FolderGit2 size={12} strokeWidth={1.75} aria-hidden="true" />
                        <span>{iss.repo}</span>
                        <span className="lang-dot" style={{ backgroundColor: LANG_COLOR[iss.lang] }} title={iss.lang === "TS" ? "TypeScript" : "JavaScript"} />
                      </div>
                      <div className="match-wrap">
                        <div className="match-bar"><div className="match-bar-fill" style={{ width: activeIssue === i ? `${iss.match}%` : "0%" }} /></div>
                        <span className="match-num">{iss.match}%</span>
                      </div>
                    </div>
                    {activeIssue === i && (
                      <>
                        <Separator style={{ backgroundColor: "var(--border)", marginTop: 12 }} />
                        <div className="issue-detail">
                          <p><b>Gemini says: </b>Beginner-friendly issue matching your {iss.lang === "TS" ? "TypeScript" : "JavaScript"} background. Estimated 2–4 hours to complete.</p>
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GITLENSE */}
      <section className="section">
        <div className="container">
          <div className="split split-alt">
            <div className="split-visual reveal">
              <div className="terminal-wrap">
                <div className="terminal-head">
                  <div className="terminal-dot" style={{ backgroundColor: "#ff5f57" }} />
                  <div className="terminal-dot" style={{ backgroundColor: "#febc2e" }} />
                  <div className="terminal-dot" style={{ backgroundColor: "#28c840" }} />
                  <span className="terminal-title">GitLense</span>
                </div>
                <div className="terminal-input-row">
                  <div className="terminal-input">
                    <Aperture size={14} strokeWidth={1.75} style={{ color: "var(--accent)", opacity: 0.65 }} aria-hidden="true" />
                    <span className="url">{typed}<span className="blink-cursor">&nbsp;</span></span>
                  </div>
                </div>
                <div className="terminal-body">
                  <div>
                    <p className="terminal-label">What it does</p>
                    <p className="terminal-summary">{lenseData.summary}</p>
                  </div>
                  <div>
                    <p className="terminal-label">Key directories</p>
                    {lenseData.structure.map((s) => (
                      <div key={s.path} className="terminal-dir-row">
                        <span className="terminal-dir-path">{s.path}</span>
                        <span className="terminal-dir-desc">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="terminal-label">Where to start</p>
                    <p className="terminal-start">{lenseData.start}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="split-text reveal">
              <div className="section-tag">
                <div className="section-tag-icon neutral"><Aperture size={17} strokeWidth={1.75} aria-hidden="true" /></div>
                <span className="section-tag-label neutral">GitLense</span>
              </div>
              <h2 className="h2-feature">Any codebase,<br />in plain English.</h2>
              <p className="lead">
                Drop a GitHub URL. GitLense reads the repo and gives you a breakdown you can actually understand — what it does, how it&apos;s structured, and where a first-timer should look.
              </p>
              <div className="feature-list">
                {LENSE_FEATURES.map((f) => <FeatureRow key={f.t} {...f} />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="section">
        <div className="container">
          <p className="eyebrow-label reveal">Who it&apos;s for</p>
          <h2 className="h2 reveal">Built for devs ready to stop<br />watching and start shipping.</h2>
          <div className="grid-2 stagger">
            {WHO.map(({ Icon, title, body }) => (
              <div key={title} className="card reveal" onMouseMove={spotlight}>
                <IconChip Icon={Icon} />
                <h3 className="card-title">{title}</h3>
                <p className="card-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <Card className="cta-card reveal border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
            <div className="cta-glow" aria-hidden="true" />
            <CardContent className="p-0" style={{ position: "relative" }}>
              <h2 className="h2" style={{ marginBottom: 10 }}>Ready to make your first<br />contribution land?</h2>
              <p className="lead" style={{ margin: "0 auto 28px", maxWidth: 420 }}>Free forever for individual contributors.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="btn-shine"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-ink)",
                    border: "none",
                    borderRadius: 999,
                    padding: "13px 26px",
                    height: "auto",
                    fontWeight: 700,
                    fontSize: 14,
                    letterSpacing: "-0.01em",
                  }}
                >
                  <a href="/hunt">
                    <span className="btn-primary-inner">Start hunting free <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" /></span>
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "var(--border)",
                    color: "var(--muted)",
                    borderRadius: 999,
                    padding: "13px 24px",
                    height: "auto",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  <Link href="/">
                    <span className="btn-secondary-inner">View landing page <ChevronRight size={16} aria-hidden="true" /></span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}