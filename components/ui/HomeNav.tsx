"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HomeNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status } = useSession();

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
      <style>{`
        nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 24px 0 22px;height:64px;background:var(--nav-bg);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);}
        .nav-logo{display:flex;align-items:center;gap:0;text-decoration:none;flex-shrink:0}
        .nav-logo-text{font-weight:600;font-size:20px;color:var(--text);letter-spacing:-.01em}
        .nav-links{display:flex;align-items:center;gap:0}
        .nav-links a{padding:6px 14px;font-size:14px;color:var(--muted);text-decoration:none;border-radius:6px;transition:color .15s}
        .nav-links a:hover{color:var(--text)}
        
        /* Account Buttons */
        .btn-login{padding:6px 14px;font-size:14px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:var(--font);transition:color .15s;text-decoration:none;}
        .btn-login:hover{color:var(--text)}
        .btn-signup{padding:7px 16px;font-size:14px;font-weight:500;background:var(--text);color:#090909;border:none;border-radius:20px;cursor:pointer;font-family:var(--font);transition:opacity .15s;letter-spacing:-.1px;text-decoration:none;}
        .btn-signup:hover{opacity:.88}
        
        .hamburger{display:flex;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
        
        .mobile-nav{position:fixed;inset:0;z-index:200;background:#090909;display:flex;flex-direction:column;padding:1.5rem 2rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.16,1,.3,1);}
        .mobile-nav.open{transform:translateX(0)}
        .mobile-nav-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:3rem}
        .mobile-links{display:flex;flex-direction:column;gap:0}
        .mobile-links a{display:block;padding:16px 0;font-size:22px;font-weight:500;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border);transition:color .15s;letter-spacing:-.3px}
        .mobile-links a:hover{color:var(--accent)}
        .mobile-links a:first-child{border-top:1px solid var(--border)}
        
        @media(max-width:768px){
          .nav-links{display:none} 
          nav{padding:0 1.25rem}
          .btn-login{display:none} /* Hides just "Log in" on tiny screens so it doesn't overlap */
        }
      `}</style>

      <nav>
        {/* LOGO SHIFTED RIGHT */}
        <div style={{ marginLeft: "10px" }}>
          <Link href="/" className="nav-logo">
            <img src="/logo.png" alt="OSHunt Logo" width={45} height={45} style={{ display: "block", borderRadius: "4px", objectFit: "contain" }} />
            <span className="nav-logo-text"><span style={{ color: "#a8ff3e" }}>OS</span>Hunt</span>
          </Link>
        </div>

        {/* DESKTOP LINKS */}
        <div className="nav-links">
          <Link href="/whatisoshunt">What is OSHunt</Link>
          <Link href="/bookmark">Bookmark</Link>
          <Link href="/progress">Progress</Link>
          <Link href="/learn-in-public">Learn in Public</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/support">Support</Link>
        </div>
      
        {/* RIGHT SIDE: HAMBURGER THEN ACCOUNT */}
<div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative", zIndex: 10 }}>
  
  {/* 1. HAMBURGER MENU */}
  <div className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Menu" tabIndex={0} style={{ position: "relative", zIndex: 11 }}>
    <div style={{ backgroundColor: "rgb(255, 255, 255)", borderRadius: "10px", width: "24px", height: "2px" }} />
    <div style={{ backgroundColor: "rgb(255, 255, 255)", borderRadius: "10px", width: "24px", height: "2px" }} />
  </div>

  {/* 2. ACCOUNT SECTION */}
  <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative", zIndex: 11 }}>
    {status === "authenticated" ? (
      <Link href="/hunt" className="btn-signup">Account</Link>
    ) : (
      <>
        <Link href="/login" className="btn-login">Log in</Link>
        <Link href="/login" className="btn-signup">Sign up</Link>
      </>
    )}
  </div>

</div>
      </nav>

      {/* MOBILE FULL-SCREEN MENU */}
      <div className={`mobile-nav${mobileOpen ? " open" : ""}`}>
        <div className="mobile-nav-header">
          <img src="/white.png" alt="OSHunt" style={{ height: "35px", width: "35px", display: "block", position: "relative", top: "-12px", left: "-12px" }} />
          <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)} style={{ position: "relative", width: "32px", height: "32px", zIndex: 9999, background: "transparent", border: "none", cursor: "pointer", padding: 0, alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", top: "50%", left: "4px", width: "24px", height: "2px", backgroundColor: "rgb(255, 255, 255)", borderRadius: "2px", transform: mobileOpen ? "translateY(0) rotate(45deg)" : "translateY(-6px) rotate(0)", transition: "transform 0.4s" }} />
            <div style={{ position: "absolute", top: "50%", left: "4px", width: "24px", height: "2px", backgroundColor: "rgb(255, 255, 255)", borderRadius: "2px", transform: mobileOpen ? "translateY(0) rotate(-45deg)" : "translateY(6px) rotate(0)", transition: "transform 0.4s" }} />
          </button>
        </div>
        <div className="mobile-links">
          {["What is OSHunt", "Bookmark", "Progress", "Learn in Public", "Pricing", "Support"].map((name) => (
            <Link key={name} href={`/${name.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMobileOpen(false)}>{name}</Link>
          ))}
        </div>
      </div>
    </>
  );
}