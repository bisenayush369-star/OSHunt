"use client";

import { useState, useEffect } from "react";
import { User, Activity, Crown, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Dropping this into the real Next.js project:
 *  1) restore  import { useSession } from "next-auth/react";  and delete
 *     the `const session = null;` stand-in a few lines down.
 *  2) restore  import HomeNav from "@/components/ui/HomeNav";  and render
 *     <HomeNav /> above the layout container.
 * Both were swapped out only so this file renders standalone as a preview
 * (next-auth needs a real session provider this sandbox doesn't have).
 */

function spotlight(e) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export default function DashboardPage() {
  const session = null; // preview stand-in for useSession()

  const fallbackName = "Ayush Bisen";
  const fallbackEmail = "bisenayush369@gmail.com";

  const name = session?.user?.name || fallbackName;
  const email = session?.user?.email || fallbackEmail;
  const image = session?.user?.image || null;
  const initial = name.charAt(0).toUpperCase();

  // TODO: replace with a real fetch to your usage-tracking endpoint —
  // these two numbers are still mock data
  const usageCount = 12;
  const usageLimit = 50;
  const progressPercent = (usageCount / usageLimit) * 100;

  const [mounted, setMounted] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplayCount(usageCount);
      return;
    }
    let raf;
    const start = performance.now();
    const duration = 800;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayCount(Math.round(eased * usageCount));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [usageCount]);

  const inCls = mounted ? " is-in" : "";

  return (
    <div className="oshunt-dash">
      <style>{`
        .oshunt-dash {
          --bg: #090909;
          --surface: #0e0e0e;
          --border: rgba(255,255,255,0.08);
          --border-hover: rgba(255,255,255,0.16);
          --accent: #a8ff3e;
          --accent-ink: #0a0a0a;
          --accent-dim: rgba(168,255,62,0.10);
          --accent-border: rgba(168,255,62,0.28);
          --text: #f2f2f2;
          --text-dim: #8c8c8c;
          --text-faint: #5e5e5e;
          --font-display: 'Outfit', ui-sans-serif, system-ui, sans-serif;
          --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace;
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-display);
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .oshunt-dash *, .oshunt-dash *::before, .oshunt-dash *::after { box-sizing: border-box; }
        .oshunt-dash button { font-family: inherit; }
        .oshunt-dash :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }

        @media (prefers-reduced-motion: no-preference) {
          .reveal { opacity: 0; transform: translateY(14px); transition: opacity .55s cubic-bezier(.16,1,.3,1), transform .55s cubic-bezier(.16,1,.3,1); }
          .reveal.is-in { opacity: 1; transform: translateY(0); }
        }

        .layout-container { max-width: 560px; margin: 0 auto; padding: clamp(84px, 12vw, 112px) clamp(16px, 4vw, 24px) clamp(48px, 6vw, 64px); }

        .page-title {
          font-size: clamp(1.5rem, 1.2rem + 1vw, 1.875rem); font-weight: 700; letter-spacing: -0.02em; margin: 0 0 0.3rem;
          background: linear-gradient(180deg, #fff 20%, #aaa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .page-sub { color: var(--text-dim); font-size: 0.875rem; margin: 0 0 2rem; }

        .section-label { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.13em; color: var(--text-dim); text-transform: uppercase; }
        .section-label svg { color: var(--text-faint); }
        .section-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
        .section-label-row .section-label { margin-bottom: 0; }
        .card-body > .section-label { margin-bottom: 1rem; }

        .dash-card { position: relative; overflow: hidden; border-radius: 16px; margin-bottom: 1rem; transition: border-color .3s ease, transform .3s ease, background-color .3s ease; }
        .dash-card::before {
          content: ""; position: absolute; inset: 0; opacity: 0; transition: opacity .4s ease; pointer-events: none;
          background: radial-gradient(320px circle at var(--mx, 50%) var(--my, 50%), var(--accent-dim), transparent 45%);
        }
        .dash-card:hover { border-color: var(--border-hover) !important; transform: translateY(-2px); }
        .dash-card:hover::before { opacity: 1; }
        .card-body { position: relative; z-index: 1; padding: 1.5rem; }

        .acc-row { display: flex; align-items: center; gap: 1rem; }
        .acc-avatar { width: 48px; height: 48px; border: 1px solid var(--border); transition: border-color .3s ease, box-shadow .3s ease; flex-shrink: 0; }
        .dash-card:hover .acc-avatar { border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-dim); }
        .acc-avatar-fallback { background: #1a1a1a; color: var(--accent); font-size: 1.1rem; font-weight: 700; }
        .acc-text { min-width: 0; flex: 1; }
        .acc-name { font-size: 1.05rem; font-weight: 600; color: var(--text); margin: 0 0 0.15rem; }
        .acc-email { font-size: 0.85rem; color: var(--text-dim); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .usage-row { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1rem; }
        .usage-big { font-size: 2.75rem; font-weight: 700; line-height: 1; color: var(--accent); font-family: var(--font-mono); letter-spacing: -1px; font-variant-numeric: tabular-nums; }
        .usage-small { font-size: 0.85rem; color: var(--text-dim); font-weight: 400; }

        .progress-track { width: 100%; height: 6px; background: #1a1a1a; border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
        .progress-fill { height: 100%; background: var(--accent); border-radius: 4px; width: 0%; transition: width 1s cubic-bezier(.16,1,.3,1); }

        .reset-text { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--text-faint); margin: 0; }

        .plan-title { font-size: 1.4rem; font-weight: 700; color: var(--text); margin: 0 0 0.4rem; }
        .plan-desc { font-size: 0.85rem; color: var(--text-dim); margin: 0 0 1.5rem; }

        .btn-upgrade { position: relative; overflow: hidden; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
        .btn-upgrade::after { content: ""; position: absolute; top: 0; left: -60%; width: 40%; height: 100%; transform: skewX(-20deg);
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.4), transparent); transition: left .7s ease; }
        .btn-upgrade:hover::after { left: 130%; }
        .btn-upgrade svg { transition: transform .3s ease; }
        .btn-upgrade:hover svg { transform: rotate(12deg) scale(1.1); }
      `}</style>

      <div className="layout-container">
        <h1 className={`page-title reveal${inCls}`}>Dashboard</h1>
        <p className={`page-sub reveal${inCls}`}>Your account, usage, and plan — at a glance.</p>

        {/* Account */}
        <Card
          className={`dash-card reveal${inCls}`}
          onMouseMove={spotlight}
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", transitionDelay: "0ms" }}
        >
          <CardContent className="card-body">
            <div className="section-label">
              <User size={12} strokeWidth={2.25} aria-hidden="true" />
              Account
            </div>
            <div className="acc-row">
              <Avatar className="acc-avatar">
                {image && <AvatarImage src={image} alt={name} />}
                <AvatarFallback className="acc-avatar-fallback">{initial}</AvatarFallback>
              </Avatar>
              <div className="acc-text">
                <p className="acc-name">{name}</p>
                <p className="acc-email">{email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily usage */}
        <Card
          className={`dash-card reveal${inCls}`}
          onMouseMove={spotlight}
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", transitionDelay: "80ms" }}
        >
          <CardContent className="card-body">
            <div className="section-label">
              <Activity size={12} strokeWidth={2.25} aria-hidden="true" />
              Daily Usage
            </div>
            <div className="usage-row">
              <span className="usage-big">{displayCount}</span>
              <span className="usage-small">/ {usageLimit} searches today</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: mounted ? `${progressPercent}%` : "0%" }} />
            </div>
            <p className="reset-text">
              <RefreshCw size={11} strokeWidth={2} aria-hidden="true" />
              Resets daily at midnight UTC.
            </p>
          </CardContent>
        </Card>

        {/* Current plan */}
        <Card
          className={`dash-card reveal${inCls}`}
          onMouseMove={spotlight}
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)", transitionDelay: "160ms" }}
        >
          <CardContent className="card-body">
            <div className="section-label-row">
              <div className="section-label">
                <Crown size={12} strokeWidth={2.25} aria-hidden="true" />
                Current Plan
              </div>
              <Badge
                variant="outline"
                style={{ backgroundColor: "var(--accent-dim)", borderColor: "var(--accent-border)", color: "var(--accent)", fontSize: 10 }}
              >
                Active
              </Badge>
            </div>
            <h2 className="plan-title">Free</h2>
            <p className="plan-desc">{usageLimit} searches/day &middot; Basic filters</p>
            <Button
              type="button"
              className="btn-upgrade"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-ink)",
                border: "none",
                borderRadius: 10,
                padding: "13px 20px",
                height: "auto",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Upgrade to Pro
              <Sparkles size={15} strokeWidth={2.25} aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}