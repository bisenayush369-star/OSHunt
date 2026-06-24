"use client";
import { useSession } from "next-auth/react";
import HomeNav from "@/components/ui/HomeNav";

// ---- Design Tokens (Matched directly to Tokavy's aesthetic) ----
const c = {
  bg: "#050505", // True dark background
  card: "#111111", // Subtle card background
  border: "rgba(255, 255, 255, 0.05)",
  borderHover: "rgba(255, 255, 255, 0.1)",
  text: "#ffffff",
  textDim: "#9e9e9e",
  textFaint: "#5e5e5e",
  lime: "#ccff00", // Tokavy's vibrant lime/yellow
  label: "#7a7a7a", // Darker gray for section labels
};

export default function DashboardPage() {
  const { data: session } = useSession();

  // Fallbacks based on your reference images
  const fallbackName = "Ayush Bisen";
  const fallbackEmail = "bisenayush369@gmail.com";

  const name = session?.user?.name || fallbackName;
  const email = session?.user?.email || fallbackEmail;
  const initial = name.charAt(0).toUpperCase();

  // Mock usage data (you will connect this to your DB later)
  const usageCount = 12;
  const usageLimit = 50;
  const progressPercent = (usageCount / usageLimit) * 100;

  return (
    <div style={{ background: c.bg, color: c.text, minHeight: "100vh", fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        .dash * { font-family: 'Outfit', sans-serif; box-sizing: border-box; }
        
        /* Layout */
        .layout-container { max-width: 600px; margin: 0 auto; padding: 7rem 1.5rem 4rem; }
        
        /* Typography */
        .page-title { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 2rem; color: #fff; text-transform: uppercase; }
        .section-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em; color: ${c.label}; margin-bottom: 1rem; text-transform: uppercase; }
        
        /* Cards */
        .dash-card { 
          background: ${c.card}; 
          border-radius: 16px; 
          padding: 1.5rem; 
          margin-bottom: 1rem; 
          border: 1px solid transparent;
          transition: border-color 0.2s ease;
        }
        .dash-card:hover { border-color: ${c.borderHover}; }
        
        /* Account Section */
        .acc-row { display: flex; align-items: center; gap: 1rem; }
        .acc-avatar { 
          width: 48px; height: 48px; border-radius: 50%; 
          background: #1f1f1f; color: ${c.lime}; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 1.25rem; font-weight: 700;
        }
        .acc-name { font-size: 1.1rem; font-weight: 600; color: #fff; margin: 0 0 0.1rem 0; }
        .acc-email { font-size: 0.85rem; color: ${c.textDim}; margin: 0; }

        /* Usage Section */
        .usage-row { display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 1rem; }
        .usage-big { font-size: 3rem; font-weight: 500; line-height: 1; color: #fff; }
        .usage-small { font-size: 0.9rem; color: ${c.textDim}; font-weight: 400; }
        
        .progress-track { width: 100%; height: 6px; background: #222; border-radius: 4px; overflow: hidden; margin-bottom: 1rem; }
        .progress-fill { height: 100%; background: #444; border-radius: 4px; transition: width 0.5s ease; }
        
        .reset-text { font-size: 0.8rem; color: ${c.textFaint}; margin: 0; }

        /* Plan Section */
        .plan-title { font-size: 1.5rem; font-weight: 600; color: #fff; margin: 0 0 0.5rem 0; }
        .plan-desc { font-size: 0.9rem; color: ${c.textDim}; margin: 0 0 1.5rem 0; }
        
        .btn-upgrade {
          width: 100%;
          background: ${c.lime};
          color: #000;
          font-weight: 700;
          font-size: 0.95rem;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          transition: transform 0.1s ease, opacity 0.15s ease;
        }
        .btn-upgrade:hover { opacity: 0.9; }
        .btn-upgrade:active { transform: scale(0.98); }
      `}</style>

      {/* Global Navigation */}
      <HomeNav />

      <div className="dash layout-container">
        <h1 className="page-title">Dashboard</h1>

        {/* 1. Account Card */}
        <div className="dash-card">
          <div className="section-label">Account</div>
          <div className="acc-row">
            <div className="acc-avatar">{initial}</div>
            <div>
              <p className="acc-name">{name}</p>
              <p className="acc-email">{email}</p>
            </div>
          </div>
        </div>

        {/* 2. Daily Usage Card */}
        <div className="dash-card">
          <div className="section-label">Daily Usage</div>
          <div className="usage-row">
            <span className="usage-big">{usageCount}</span>
            <span className="usage-small">/ {usageLimit} searches today</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="reset-text">Resets daily at midnight UTC.</p>
        </div>

        {/* 3. Current Plan Card */}
        <div className="dash-card">
          <div className="section-label">Current Plan</div>
          <h2 className="plan-title">Free</h2>
          <p className="plan-desc">{usageLimit} searches/day · Basic Filters</p>
          
          <button className="btn-upgrade">
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
}