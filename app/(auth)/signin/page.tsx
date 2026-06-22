"use client" // 💡 Enables browser click actions
import React from "react";
import Link from "next/link";
import { signIn } from "next-auth/react"; // 💡 Imports the engine to open the sign-in popups

const css = `
*, *::before, *::after { 
  box-sizing: border-box; 
  margin: 0; 
  padding: 0; 
  font-family: 'Outfit', system-ui, -apple-system, sans-serif; /* 💡 Applies the clean font style to the entire website */
}

* { scrollbar-width: thin; scrollbar-color: rgba(168,255,62,0.2) transparent; }
*::-webkit-scrollbar { width: 3px; }
*::-webkit-scrollbar-thumb { background: rgba(168,255,62,0.2); border-radius: 2px; }

@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
@keyframes spin  { to { transform: rotate(360deg) } }
@keyframes glow  { 0%,100% { box-shadow: 0 0 20px rgba(168,255,62,0.15) } 50% { box-shadow: 0 0 40px rgba(168,255,62,0.3) } }
@keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }

/* ── NAV ── */
.nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 50;
  height: 52px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem;
  background: rgba(9,9,9,0.9);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #141414;
}
.nav-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
.nav-logo-text { font-weight: 600; font-size: 15px; letter-spacing: -0.3px; color: #efefef; }
.nav-links { display: flex; gap: 2px; }
.nav-link { padding: 5px 12px; font-size: 13.5px; color: #444; text-decoration: none; border-radius: 6px; transition: color 0.15s; }
.nav-link:hover { color: #efefef; }

/* signed-in avatar example */
.avatar-wrap { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #a8ff3e, #5aff00); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #090909; border: 2px solid rgba(168,255,62,0.3); }
.avatar-name { font-size: 13px; color: #666; }

/* ── MAIN LAYOUT ── */
.page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 80px 2rem 2rem; position: relative; overflow: hidden; }

/* grid bg */
.grid-bg {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
  pointer-events: none;
}
/* radial glow */
.glow-bg {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 600px; height: 600px; border-radius: 50%;
  background: radial-gradient(circle, rgba(168,255,62,0.04) 0%, transparent 65%);
  pointer-events: none;
}

/* ── CONTENT ── */
.inner { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; max-width: 960px; width: 100%; position: relative; z-index: 1; align-items: center; }

/* LEFT */
.left { animation: fadeUp 0.5s ease forwards; }
.badge { display: inline-flex; align-items: center; gap: 7px; padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.07); font-size: 11px; color: #555; margin-bottom: 1.75rem; letter-spacing: 0.3px; }
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: #a8ff3e; animation: pulse 2s infinite; }
.headline {
  font-size: clamp(32px, 4vw, 48px); font-weight: 800;
  letter-spacing: -2px; line-height: 1.05;
  background: linear-gradient(180deg, #fff 20%, #888 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  margin-bottom: 1.25rem;
}
.headline em { font-style: normal; -webkit-text-fill-color: #a8ff3e; }
.sub { font-size: 15px; color: #555; line-height: 1.65; font-weight: 300; max-width: 340px; margin-bottom: 2rem; }

/* features */
.feat-list { display: flex; flex-direction: column; gap: 14px; }
.feat { display: flex; align-items: flex-start; gap: 12px; }
.feat-check {
  width: 20px; height: 20px; border-radius: 6px; flex-shrink: 0;
  background: rgba(168,255,62,0.1); border: 1px solid rgba(168,255,62,0.2);
  display: flex; align-items: center; justify-content: center;
  margin-top: 1px;
}
.feat-check svg { width: 11px; height: 11px; }
.feat-text { font-size: 13.5px; color: #555; line-height: 1.5; }
.feat-text strong { color: #d0d0d0; font-weight: 500; }

/* stats */
.stats { display: flex; gap: 28px; margin-top: 2.5rem; }
.stat-val { font-size: 22px; font-weight: 700; color: #a8ff3e; font-family: monospace; letter-spacing: -1px; }
.stat-lbl { font-size: 11px; color: #333; margin-top: 2px; }

/* RIGHT — auth card */
.card {
  background: #0f0f0f;
  border: 1px solid #1a1a1a;
  border-radius: 20px;
  padding: 2.5rem;
  animation: fadeUp 0.5s 0.1s ease both;
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
  width: 60%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168,255,62,0.4), transparent);
}
.card-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 1.75rem; }
.card-logo-text { font-weight: 700; font-size: 16px; letter-spacing: -0.3px; }
.card-title {
  font-size: 22px; font-weight: 700; letter-spacing: -0.8px; margin-bottom: 6px;
  background: linear-gradient(180deg, #fff 20%, #aaa 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
}
.card-sub { font-size: 13px; color: #444; margin-bottom: 2rem; line-height: 1.5; }

/* auth buttons */
.gh-btn {
  width: 100%; padding: 13px 20px; border-radius: 10px;
  background: #f0f0f0; color: #090909;
  border: none; cursor: pointer; font-family: 'Outfit', sans-serif;
  font-size: 14px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-bottom: 12px; transition: all 0.15s;
  letter-spacing: -0.2px;
}
.gh-btn:hover { background: #fff; }
.gg-btn {
  width: 100%; padding: 13px 20px; border-radius: 10px;
  background: transparent; color: #888;
  border: 1px solid #1e1e1e; cursor: pointer; font-family: 'Outfit', sans-serif;
  font-size: 14px; 
  font-weight: 600;         /* 💡 Changed from 500 to 600 to match GitHub typography */
  letter-spacing: -0.2px;   /* 💡 Added spacing configuration to mirror GitHub text exactly */
  display: flex; align-items: center; justify-content: center; gap: 10px;
  margin-bottom: 20px; transition: all 0.15s;
}
.gg-btn:hover { border-color: #2e2e2e; color: #aaa; }

/* divider */
.or { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; color: #222; font-size: 11px; }
.or-line { flex: 1; height: 1px; background: #1a1a1a; }

/* terms */
.terms { font-size: 11px; color: #2a2a2a; text-align: center; line-height: 1.6; }
.terms a { color: #3a3a3a; text-decoration: none; }
.terms a:hover { color: #a8ff3e; }

/* user unlock section */
.unlock { margin-top: 1.5rem; padding: 14px 16px; background: rgba(168,255,62,0.03); border: 1px solid rgba(168,255,62,0.08); border-radius: 10px; }
.unlock-label { font-size: 9px; color: #a8ff3e; font-family: monospace; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px; opacity: 0.6; }
.unlock-items { display: flex; flex-direction: column; gap: 5px; }
.unlock-item { font-size: 12px; color: #333; display: flex; align-items: center; gap: 7px; }
.unlock-item::before { content: '→'; color: #a8ff3e; opacity: 0.5; font-size: 10px; }

/* ── SECTION 2: Nav signed-in state ── */
.section-label { font-size: 10px; font-family: monospace; letter-spacing: 1.5px; text-transform: uppercase; color: #222; margin: 3rem 0 1rem; }
.nav-preview { border: 1px solid #141414; border-radius: 10px; overflow: hidden; }
.dropdown {
  position: relative; background: #0f0f0f;
  border: 1px solid #1a1a1a; border-radius: 12px;
  padding: 6px; width: 200px; margin: 1rem auto;
}
.dd-user { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; margin-bottom: 4px; }
.dd-name { font-size: 13px; font-weight: 500; color: #d0d0d0; }
.dd-email { font-size: 11px; color: #333; }
.dd-divider { height: 1px; background: #141414; margin: 4px 0; }
.dd-item { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 7px; font-size: 13px; color: #555; cursor: pointer; transition: all 0.15s; }
.dd-item:hover { background: #141414; color: #d0d0d0; }
.dd-item.danger { color: #555; }
.dd-item.danger:hover { color: #ff4d6d; background: rgba(255,77,109,0.06); }
`;

const LogoMark = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2" />
    <circle cx="18" cy="18" r="4" stroke="#a8ff3e" strokeWidth="0.7" opacity="0.4" />
    <line x1="18" y1="2" x2="18" y2="0" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="18" y1="34" x2="18" y2="36" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="2" y1="18" x2="0" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="34" y1="18" x2="36" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="18" cy="18" r="1.8" fill="#a8ff3e" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="#a8ff3e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function AuthPagePreview() {
  return (
    <>
      <style>{css}</style>

      {/* Nav with signed-in state */}
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <LogoMark />
          <span className="nav-logo-text">
            <span style={{ color: "#a8ff3e" }}>OS</span>Hunt
          </span>
        </Link>
        <div className="nav-links">
          <a href="#" className="nav-link">Hunt</a>
          <a href="#" className="nav-link">GitLense</a>
        </div>
        {/* signed-in user */}
        <div className="avatar-wrap">
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#a8ff3e",
              boxShadow: "0 0 8px #a8ff3e",
              animation: "pulse 2s infinite",
            }}
          />
          <span style={{ fontSize: "11px", color: "#333", fontFamily: "monospace" }}>
            3 contributions
          </span>
          <div className="avatar">A</div>
        </div>
      </nav>

      {/* Sign in page */}
      <div className="page">
        <div className="grid-bg" />
        <div className="glow-bg" />

        <div className="inner">
          {/* LEFT */}
          <div className="left">
            <div className="badge">
              <span className="badge-dot" />
              Free forever for open source
            </div>
            <h1 className="headline">
              Hunt.<br />
              <em>Contribute.</em><br />
              Get known.
            </h1>
            <p className="sub">
              Sign in to track your contributions, save your stack, and build your open source reputation — one merged PR at a time.
            </p>

            <div className="feat-list">
              <div className="feat">
                <div className="feat-check"><CheckIcon /></div>
                <p className="feat-text">
                  <strong>Track every contribution</strong> — issues solved, PRs merged, repos contributed to
                </p>
              </div>
              <div className="feat">
                <div className="feat-check"><CheckIcon /></div>
                <p className="feat-text">
                  <strong>Save your stack</strong> — picks up where you left off every session
                </p>
              </div>
              <div className="feat">
                <div className="feat-check"><CheckIcon /></div>
                <p className="feat-text">
                  <strong>Contribution streak</strong> — stay consistent, grow your GitHub presence
                </p>
              </div>
              <div className="feat">
                <div className="feat-check"><CheckIcon /></div>
                <p className="feat-text">
                  <strong>Public profile</strong> — share your OSHunt stats with recruiters and teams
                </p>
              </div>
            </div>

            <div className="stats">
              <div>
                <div className="stat-val">4.2k+</div>
                <div className="stat-lbl">Open issues tracked</div>
              </div>
              <div>
                <div className="stat-val">280+</div>
                <div className="stat-lbl">Repos indexed</div>
              </div>
              <div>
                <div className="stat-val">Free</div>
                <div className="stat-lbl">Always</div>
              </div>
            </div>
          </div>

          {/* RIGHT: card */}
          <div className="card">
            <div className="card-logo">
              <LogoMark size={22} />
              <span className="card-logo-text">
                <span style={{ color: "#a8ff3e" }}>OS</span>Hunt
              </span>
            </div>

            <h2 className="card-title">Welcome back.</h2>
            <p className="card-sub">
              Sign in to track your contributions and build your open source reputation.
            </p>

           {/* GitHub — primary */}
<button className="gh-btn" onClick={() => signIn("github", { callbackUrl: "/hunt" })}>
  <img src="/github.svg" alt="GitHub" width="18" height="18" />
  Continue with GitHub
</button>

            <div className="or">
              <div className="or-line" />or<div className="or-line" />
            </div>

          {/* Google — secondary */}
<button className="gg-btn" onClick={() => signIn("google", { callbackUrl: "/hunt" })}>
  <img src="/google.svg" alt="Google" width="18" height="18" />
  Continue with Google
</button>

            <div className="unlock">
              <div className="unlock-label">What you unlock</div>
              <div className="unlock-items">
                <div className="unlock-item">Contribution tracker + streak</div>
                <div className="unlock-item">Saved stack preferences</div>
                <div className="unlock-item">Public OSHunt profile</div>
              </div>
            </div>

            <p className="terms" style={{ marginTop: "1.25rem" }}>
              By signing in you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.<br />
              No passwords. No spam. Just GitHub.
            </p>
          </div>
        </div>
      </div>

      {/* User dropdown preview */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 2rem 3rem" }}>
        <p className="section-label">↑ sign in page &nbsp;·&nbsp; ↓ signed-in dropdown (in nav)</p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="dropdown">
            <div className="dd-user">
              <div className="avatar" style={{ width: "34px", height: "34px", fontSize: "14px" }}>A</div>
              <div>
                <div className="dd-name">Ayush Bisen</div>
                <div className="dd-email">@AyushdevX</div>
              </div>
            </div>
            <div className="dd-divider" />
            <div className="dd-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
              My Profile
            </div>
            <div className="dd-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
              Contributions
              <span style={{ marginLeft: "auto", fontSize: "10px", color: "#a8ff3e", fontFamily: "monospace" }}>
                3
              </span>
            </div>
            <div className="dd-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Hunt Issues
            </div>
            <div className="dd-divider" />
            <div className="dd-item danger">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </div>
          </div>
        </div>
      </div>
    </>
  );
}