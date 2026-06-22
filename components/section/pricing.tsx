"use client";

import React, { useState } from "react";
import Link from "next/link";

// 💡 Your Premium Intersecting Dual-Nature Main Logo
const LogoMark = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <path d="M 18 4 A 14 14 0 0 0 18 32 L 18 26 A 8 8 0 0 1 18 10 Z" fill="#a8ff3e" opacity="0.3" />
    <path d="M 18 4 L 32 18 L 18 32 L 18 26 L 26 18 L 18 10 Z" fill="#a8ff3e" />
    <circle cx="13" cy="18" r="2.5" fill="#a8ff3e" />
  </svg>
);

export default function Pricing() {
  // 💡 React state to manage the Monthly vs Yearly toggle seamlessly
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#090909",
      color: "#e0e0e0",
      fontFamily: "'Outfit', sans-serif",
      WebkitFontSmoothing: "antialiased"
    }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        *{scrollbar-width:thin;scrollbar-color:rgba(168,255,62,0.2) transparent}
        *::-webkit-scrollbar{width:3px}
        *::-webkit-scrollbar-thumb{background:rgba(168,255,62,0.2);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(168,255,62,0.15)}50%{box-shadow:0 0 40px rgba(168,255,62,0.35)}}
        
        /* NAV */
        nav{position:sticky;top:0;z-index:50;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;background:rgba(9,9,9,0.85);backdrop-filter:blur(12px);border-bottom:1px solid #141414}
        .logo{display:flex;align-items:center;gap:8px;text-decoration:none}
        .logo-text{font-weight:600;font-size:15px;color:#efefef;letter-spacing:-.3px}
        .nav-links{display:flex;gap:2px}
        .nav-link{padding:5px 12px;font-size:13.5px;color:#666;text-decoration:none;border-radius:6px;transition:color .15s}
        .nav-link:hover,.nav-link.active{color:#efefef}

        /* SECTION */
        .section{padding:6rem 2rem;max-width:1060px;margin:0 auto; animation: fadeUp 0.4s ease-out forwards;}
        .section-tag{font-size:10px;color:#a8ff3e;letter-spacing:1.8px;text-transform:uppercase;font-weight:600;margin-bottom:1rem;font-family:monospace}
        .section-title{font-size:clamp(32px,5vw,52px);font-weight:800;letter-spacing:-2px;line-height:1.05;margin-bottom:1rem;background:linear-gradient(180deg,#fff 20%,#888 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .section-sub{font-size:15px;color:#888;line-height:1.65;font-weight:300;max-width:480px;margin-bottom:3rem}

        /* TOGGLE */
        .toggle-wrap{display:inline-flex;align-items:center;gap:12px;background:#0f0f0f;border:1px solid #1a1a1a;border-radius:30px;padding:5px;margin-bottom:3rem}
        .toggle-btn{padding:7px 20px;border-radius:24px;font-size:13px;font-weight:500;cursor:pointer;border:none;font-family:'Outfit',sans-serif;transition:all .2s}
        .toggle-btn.active{background:#a8ff3e;color:#090909}
        .toggle-btn.inactive{background:transparent;color:#666}
        .save-badge{font-size:10px;color:#a8ff3e;background:rgba(168,255,62,0.1);border:1px solid rgba(168,255,62,0.2);border-radius:20px;padding:2px 8px;font-family:monospace}

        /* CARDS */
        .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;align-items:stretch}

        /* Student */
        .card{background:#0c0c0c;border:1px solid #141414;border-radius:18px;padding:2rem;display:flex;flex-direction:column;position:relative;overflow:hidden;transition:border-color .2s}
        .card:hover{border-color:#1e1e1e}

        /* Pro — highlighted */
        .card.pro{border-color:rgba(168,255,62,0.3);background:linear-gradient(180deg,#111 0%,#0c0c0c 100%);animation:glow 3s infinite}
        .card.pro::before{content:'';position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:70%;height:1px;background:linear-gradient(90deg,transparent,rgba(168,255,62,0.6),transparent)}

        /* Professional */
        .card.professional{border-color:#1e1e1e;background:linear-gradient(180deg,#111 0%,#0c0c0c 100%)}
        .card.professional::before{content:'';position:absolute;top:-1px;left:50%;transform:translateX(-50%);width:70%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)}

        /* POPULAR BADGE */
        .popular-badge{position:absolute;top:1.25rem;right:1.25rem;font-size:9px;color:#090909;background:#a8ff3e;border-radius:20px;padding:3px 9px;font-weight:700;font-family:monospace;letter-spacing:.5px;text-transform:uppercase}

        /* CARD CONTENT */
        .plan-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;flex-shrink:0}
        .plan-name{font-size:13px;font-weight:600;color:#888;letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;font-family:monospace}
        .plan-desc{font-size:13px;color:#666;line-height:1.55;margin-bottom:1.5rem;min-height: 40px;}

        /* PRICE */
        .price-wrap{margin-bottom:1.5rem}
        .price-main{display:flex;align-items:baseline;gap:4px;margin-bottom:4px}
        .price-currency{font-size:18px;font-weight:600;color:#888;margin-top:6px}
        .price-amount{font-size:42px;font-weight:800;letter-spacing:-2px;line-height:1;transition: color 0.3s;}
        .price-period{font-size:13px;color:#555;margin-left:2px}
        .price-trial{font-size:11px;font-family:monospace;margin-top:4px;display:flex;align-items:center;gap:5px; height: 14px;}

        /* FEATURES */
        .features{flex:1;display:flex;flex-direction:column;gap:10px;margin-bottom:1.75rem}
        .feature{display:flex;align-items:flex-start;gap:10px;font-size:13px;color:#888;line-height:1.45}
        .feature.excluded{color:#333;text-decoration:line-through;text-decoration-color:#222}
        .check{width:16px;height:16px;border-radius:5px;flex-shrink:0;display:flex;align-items:center;justify-content:center;margin-top:2px}
        .check.yes{background:rgba(168,255,62,0.1);border:1px solid rgba(168,255,62,0.2)}
        .check.no{background:#111;border:1px solid #1a1a1a}
        .check svg{width:9px;height:9px}

        /* CTA BUTTONS */
        .cta-free{width:100%;padding:12px;border-radius:10px;background:transparent;border:1px solid #1e1e1e;color:#888;font-size:14px;font-weight:500;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s;text-align:center;text-decoration:none;display:block}
        .cta-free:hover{border-color:#2e2e2e;color:#bbb}
        .cta-pro{width:100%;padding:12px;border-radius:10px;background:#a8ff3e;border:none;color:#090909;font-size:14px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;transition:opacity .15s;box-shadow:0 0 24px rgba(168,255,62,0.2);display:block;text-align:center;text-decoration:none}
        .cta-pro:hover{opacity:.88}
        .cta-professional{width:100%;padding:12px;border-radius:10px;background:transparent;border:1px solid rgba(255,255,255,0.1);color:#d0d0d0;font-size:14px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s;display:block;text-align:center;text-decoration:none}
        .cta-professional:hover{border-color:rgba(255,255,255,0.2);color:#fff}

        /* DIVIDER */
        .plan-divider{height:1px;background:linear-gradient(90deg,transparent,#1a1a1a,transparent);margin-bottom:1.25rem}

        /* FAQ / PAYMENT INFO */
        .payment-info{margin-top:3rem;padding:1.5rem;background:#0c0c0c;border:1px solid #141414;border-radius:16px}
        .payment-title{font-size:14px;font-weight:600;letter-spacing:-.3px;margin-bottom:1rem;display:flex;align-items:center;gap:8px}
        .payment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .payment-item{padding:14px;background:#060606;border:1px solid #141414;border-radius:10px}
        .payment-item-icon{font-size:18px;margin-bottom:8px}
        .payment-item-title{font-size:13px;font-weight:600;color:#d0d0d0;margin-bottom:4px}
        .payment-item-text{font-size:12px;color:#666;line-height:1.55}

        /* ENTERPRISE */
        .enterprise{margin-top:1.5rem;padding:1.25rem 1.5rem;background:rgba(168,255,62,0.03);border:1px solid rgba(168,255,62,0.08);border-radius:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
        .enterprise-text{font-size:13.5px;color:#888}
        .enterprise-text strong{color:#d0d0d0;font-weight:500}
        .enterprise-btn{padding:8px 18px;background:transparent;border:1px solid rgba(168,255,62,0.2);border-radius:8px;color:#a8ff3e;font-size:13px;cursor:pointer;font-family:'Outfit',sans-serif;transition:all .15s}
        .enterprise-btn:hover{background:rgba(168,255,62,0.08)}

        @media(max-width:900px){.cards{grid-template-columns:1fr}.payment-grid{grid-template-columns:1fr}}
        @media(max-width:768px){nav .nav-links{display:none}.section{padding:4rem 1.25rem}}
      `}</style>

      {/* Navbar */}
      <nav>
        <Link href="/" className="logo">
          <LogoMark size={24} />
          <span className="logo-text"><span style={{ color: "#a8ff3e" }}>OS</span>Hunt</span>
        </Link>
        <div className="nav-links">
          <Link href="/hunt" className="nav-link">Hunt Issues</Link>
          <Link href="/analyze" className="nav-link">GitLense</Link>
          <Link href="/pricing" className="nav-link active">Pricing</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a8ff3e", boxShadow: "0 0 8px #a8ff3e", animation: "pulse 2s infinite" }} />
          <button style={{ padding: "6px 15px", background: "#a8ff3e", color: "#090909", border: "none", borderRadius: 18, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
            Sign up free
          </button>
        </div>
      </nav>

      <div className="section">
        {/* HEADER */}
        <div className="section-tag">Pricing</div>
        <h2 className="section-title">Simple pricing.<br /><span style={{ WebkitTextFillColor: "#a8ff3e" }}>No surprises.</span></h2>
        <p className="section-sub">Start free. Upgrade when you need more. First 3 months on any paid plan are ₹0 — no card required to start.</p>

        {/* TOGGLE */}
        <div>
          <div className="toggle-wrap">
            <button
              className={`toggle-btn ${!isYearly ? 'active' : 'inactive'}`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </button>
            <button
              className={`toggle-btn ${isYearly ? 'active' : 'inactive'}`}
              onClick={() => setIsYearly(true)}
            >
              Yearly <span className="save-badge">Save 30%</span>
            </button>
          </div>
        </div>

        {/* CARDS */}
        <div className="cards">

          {/* STUDENT */}
          <div className="card">
            <div className="plan-icon" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1a1a1a" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
            </div>
            <div className="plan-name">Student</div>
            <div className="plan-desc">Perfect for getting started with open source. Free forever, no card needed.</div>
            <div className="price-wrap">
              <div className="price-main">
                <span className="price-currency">₹</span>
                <span className="price-amount" style={{ color: "#e0e0e0" }}>0</span>
                <span className="price-period">/month</span>
              </div>
              <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace", marginTop: 4, height: 14 }}>Free forever · no credit card</div>
            </div>
            <div className="plan-divider"></div>
            <div className="features">
              <div className="feature included"><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Hunt 10 issues per day</div>
              <div className="feature included"><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>JavaScript & TypeScript only</div>
              <div className="feature included"><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Easy difficulty only</div>
              <div className="feature included"><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Basic AI summary (50/day)</div>
              <div className="feature excluded"><div className="check no"><svg viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#333" strokeWidth="1.5" strokeLinecap="round" /></svg></div>GitLense repo analyzer</div>
              <div className="feature excluded"><div className="check no"><svg viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#333" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Contribution tracking</div>
              <div className="feature excluded"><div className="check no"><svg viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#333" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Streak & public profile</div>
              <div className="feature excluded"><div className="check no"><svg viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="#333" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Learn in Public templates</div>
            </div>
            <Link href="/signup" className="cta-free">Get started free</Link>
          </div>

          {/* PRO */}
          <div className="card pro">
            <div className="popular-badge">Most Popular</div>
            <div className="plan-icon" style={{ background: "rgba(168,255,62,0.1)", border: "1px solid rgba(168,255,62,0.2)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6M8 11h6" />
              </svg>
            </div>
            <div className="plan-name" style={{ color: "#a8ff3e" }}>Pro</div>
            <div className="plan-desc">For developers serious about open source. Full access to GitLense + contribution tracking.</div>
            <div className="price-wrap">
              <div className="price-main">
                <span className="price-currency" style={{ color: "#a8ff3e" }}>₹</span>
                <span className="price-amount" style={{ color: "#a8ff3e" }}>{isYearly ? "139" : "199"}</span>
                <span className="price-period">/month</span>
              </div>
              <div className="price-trial" style={{ color: "#a8ff3e" }}>
                {isYearly ? "₹1,668/year — save ₹720 · 3 months free" : "3 months free then ₹199/mo via autopay"}
              </div>
            </div>
            <div className="plan-divider" style={{ background: "linear-gradient(90deg,transparent,rgba(168,255,62,0.2),transparent)" }}></div>
            <div className="features">
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Unlimited issue hunting</div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>All 30+ languages</div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>All difficulty levels</div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Full AI analysis (unlimited)</div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div><strong>GitLense repo analyzer</strong></div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Contribution tracking + streak</div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Saved stack preferences</div>
              <div className="feature included" style={{ color: "#d0d0d0" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Learn in Public templates</div>
            </div>
            <Link href="/checkout?plan=pro" className="cta-pro">Start 3-month free trial →</Link>
          </div>

          {/* PROFESSIONAL */}
          <div className="card professional">
            <div className="plan-icon" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d0d0d0" strokeWidth="1.5" strokeLinecap="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <div className="plan-name" style={{ color: "#999" }}>Professional</div>
            <div className="plan-desc">For power users and job hunters. Everything plus AI fix suggestions and analytics.</div>
            <div className="price-wrap">
              <div className="price-main">
                <span className="price-currency">₹</span>
                <span className="price-amount" style={{ color: "#e0e0e0" }}>{isYearly ? "349" : "499"}</span>
                <span className="price-period">/month</span>
              </div>
              <div className="price-trial" style={{ color: "#888" }}>
                {isYearly ? "₹4,188/year — save ₹1,800 · 3 months free" : "3 months free then ₹499/mo via autopay"}
              </div>
            </div>
            <div className="plan-divider"></div>
            <div className="features">
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Everything in Pro</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>AI-powered fix suggestions</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Custom contribution reports</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Public OSHunt profile URL</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Advanced analytics dashboard</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Priority Gemini AI processing</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Resume-ready contribution export</div>
              <div className="feature included" style={{ color: "#888" }}><div className="check yes"><svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5 3.5-4" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" /></svg></div>Priority support</div>
            </div>
            <Link href="/checkout?plan=professional" className="cta-professional">Start 3-month free trial →</Link>
          </div>
        </div>

        {/* PAYMENT INFO */}
        <div className="payment-info" style={{ marginTop: "2.5rem" }}>
          <div className="payment-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            How payment works
          </div>
          <div className="payment-grid">
            <div className="payment-item">
              <div className="payment-item-icon">🎯</div>
              <div className="payment-item-title">3 Months Free</div>
              <div className="payment-item-text">Start any paid plan today with ₹0. No card needed for the first 3 months. Cancel anytime.</div>
            </div>
            <div className="payment-item">
              <div className="payment-item-icon">🔄</div>
              <div className="payment-item-title">Autopay via Razorpay</div>
              <div className="payment-item-text">After 3 months, we charge automatically via UPI autopay or card. You will get a reminder 7 days before.</div>
            </div>
            <div className="payment-item">
              <div className="payment-item-icon">🔒</div>
              <div className="payment-item-title">Cancel anytime</div>
              <div className="payment-item-text">No lock-in. Cancel before the trial ends and you will never be charged. Secure payments via Razorpay.</div>
            </div>
          </div>
        </div>

        {/* ENTERPRISE */}
        <div className="enterprise">
          <div className="enterprise-text">Need OSHunt for your <strong>college club or team</strong>? We have special rates for institutions.</div>
          <button className="enterprise-btn">Contact us →</button>
        </div>
      </div>
    </div>
  );
}