"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

export default function HomeNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const { data: session, status } = useSession();

  // Handle mobile drawer body scroll locking & keyboard focus trap
  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key === "Tab" && mobileNavRef.current) {
        const focusable = mobileNavRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  // Handle dropdown close on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const fallbackInitial = session?.user?.name?.[0]?.toUpperCase() || "U";

  return (
    <>
      <style>{`
        nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 24px 0 22px;height:64px;background:var(--nav-bg);backdrop-filter:blur(14px);border-bottom:1px solid var(--border);}
        .nav-logo{display:flex;align-items:center;gap:0;text-decoration:none;flex-shrink:0}
        .nav-logo-text{font-weight:600;font-size:20px;color:var(--text);letter-spacing:-.01em}
        .nav-links{display:flex;align-items:center;gap:0}
        .nav-links a{padding:6px 14px;font-size:14px;color:var(--muted);text-decoration:none;border-radius:6px;transition:color .15s}
        .nav-links a:hover{color:var(--text)}
        .btn-login{padding:6px 14px;font-size:14px;color:var(--muted);background:none;border:none;cursor:pointer;font-family:var(--font, var(--font-sans, sans-serif));transition:color .15s;text-decoration:none;}
        .btn-login:hover{color:var(--text)}
        .btn-signup{padding:7px 16px;font-size:14px;font-weight:500;background:var(--text);color:#090909;border:none;border-radius:20px;cursor:pointer;font-family:var(--font, var(--font-sans, sans-serif));transition:opacity .15s;letter-spacing:-.1px;text-decoration:none;}
        .btn-signup:hover{opacity:.88}
        
        /* HIDDEN BY DEFAULT ON LARGE SCREENS */
        .hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:4px}
        
        .mobile-nav{position:fixed;inset:0;z-index:200;background:#090909;display:flex;flex-direction:column;padding:1.5rem 2rem;transform:translateX(100%);transition:transform .35s cubic-bezier(.16,1,.3,1);}
        .mobile-nav.open{transform:translateX(0)}
        .mobile-nav-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:3rem}
        .mobile-links{display:flex;flex-direction:column;gap:0}
        .mobile-links a{display:block;padding:16px 0;font-size:22px;font-weight:500;color:var(--text);text-decoration:none;border-bottom:1px solid var(--border);transition:color .15s;letter-spacing:-.3px}
        .mobile-links a:hover, .mobile-links a:focus-visible{color:var(--accent);outline:none;}
        .mobile-links a:first-child{border-top:1px solid var(--border)}
        
        /* Avatar & Dropdown Styles */
        .avatar-btn{background:none;border:1px solid var(--border);border-radius:50%;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;width:32px;height:32px;overflow:hidden;transition:border-color .15s;outline:none;}
        .avatar-btn:hover, .avatar-btn:focus-visible{border-color:var(--accent);}
        .avatar-img{width:100%;height:100%;object-fit:cover;}
        .avatar-fallback{width:100%;height:100%;background-color:var(--accent);color:#090909;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;font-family:var(--font, var(--font-sans, sans-serif));}
        .dropdown-menu{position:absolute;top:calc(100% + 12px);right:0;background:#090909;border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:flex;flex-direction:column;min-width:180px;padding:6px 0;z-index:50;}
        .dropdown-header{padding:10px 16px;border-bottom:1px solid var(--border);margin-bottom:4px;}
        .dropdown-name{font-size:14px;font-weight:600;color:var(--text);line-height:1.2;}
        .dropdown-email{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;}
        .dropdown-item{padding:10px 16px;font-size:14px;color:var(--text);text-decoration:none;text-align:left;background:none;border:none;cursor:pointer;font-family:var(--font, var(--font-sans, sans-serif));transition:color .15s;width:100%;display:block;}
        .dropdown-item:hover, .dropdown-item:focus-visible{color:var(--accent);outline:none;background:rgba(255,255,255,0.02);}

        @media(max-width:768px){
          .nav-links{display:none}
          nav{padding:0 1.25rem}
          .btn-login{display:none}
          .hamburger{display:flex}
        }
      `}</style>

      <nav aria-label="Main Navigation">
        <div style={{ marginLeft: "10px", display: "flex", alignItems: "center" }}>
          <Link href="/" className="nav-logo">
            <Image src="/logo.png" alt="OSHunt Logo" width={45} height={45} style={{ display: "block", width: "45px", height: "45px", borderRadius: "4px", objectFit: "contain", marginLeft: "-18px" }} />
            <span className="nav-logo-text"><span style={{ color: "#a8ff3e" }}>OS</span>Hunt</span>
          </Link>
        </div>

        <div className="nav-links">
          <Link href="/about">About</Link>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/support">Support</Link>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", position: "relative", zIndex: 10 }}>
          <button
            type="button"
            className="hamburger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            style={{ position: "relative", zIndex: 11 }}
          >
            <div style={{ backgroundColor: "rgb(255, 255, 255)", borderRadius: "10px", width: "24px", height: "2px" }} />
            <div style={{ backgroundColor: "rgb(255, 255, 255)", borderRadius: "10px", width: "24px", height: "2px" }} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative", zIndex: 11 }}>
            {status === "loading" ? (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
                aria-label="Loading authentication status"
              />
            ) : status === "authenticated" ? (
              <div ref={dropdownRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="avatar-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  {session?.user?.image ? (
                    <Image src={session.user.image} alt="Avatar" width={32} height={32} className="avatar-img" unoptimized />
                  ) : (
                    <div className="avatar-fallback">
                      {fallbackInitial}
                    </div>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="dropdown-menu" role="menu">
                    <div className="dropdown-header">
                      <div className="dropdown-name">{session?.user?.name}</div>
                      <div className="dropdown-email">{session?.user?.email}</div>
                    </div>
                    <Link href="/bookmark" className="dropdown-item" role="menuitem" onClick={() => setDropdownOpen(false)}>Bookmark</Link>
                    <Link href="/dashboard" className="dropdown-item" role="menuitem" onClick={() => setDropdownOpen(false)}>Dashboard</Link>
                    <button type="button" className="dropdown-item logout" role="menuitem" onClick={() => { setDropdownOpen(false); signOut({ callbackUrl: "/" }); }}>Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-signup">Sign in</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div
        ref={mobileNavRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
        className={`mobile-nav${mobileOpen ? " open" : ""}`}
        aria-hidden={!mobileOpen}
      >
        <div className="mobile-nav-header">
          <Image src="/white.png" alt="OSHunt" width={45} height={45} style={{ height: "45px", width: "45px", display: "block", position: "relative", top: "-12px", left: "-12px" }} />
          <button
            type="button"
            className="hamburger"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            style={{ position: "relative", width: "32px", height: "32px", zIndex: 9999, background: "transparent", border: "none", cursor: "pointer", padding: 0, alignItems: "center", justifyContent: "center" }}
          >
            <div style={{ position: "absolute", top: "50%", left: "4px", width: "24px", height: "2px", backgroundColor: "rgb(255, 255, 255)", borderRadius: "2px", transform: mobileOpen ? "translateY(0) rotate(45deg)" : "translateY(-6px) rotate(0)", transition: "transform 0.4s" }} />
            <div style={{ position: "absolute", top: "50%", left: "4px", width: "24px", height: "2px", backgroundColor: "rgb(255, 255, 255)", borderRadius: "2px", transform: mobileOpen ? "translateY(0) rotate(-45deg)" : "translateY(6px) rotate(0)", transition: "transform 0.4s" }} />
          </button>
        </div>
        <div className="mobile-links">
          <Link href="/about" onClick={() => setMobileOpen(false)}>About</Link>
          <Link href="/features" onClick={() => setMobileOpen(false)}>Features</Link>
          <Link href="/pricing" onClick={() => setMobileOpen(false)}>Pricing</Link>
          <Link href="/contact" onClick={() => setMobileOpen(false)}>Contact</Link>
          <Link href="/faq" onClick={() => setMobileOpen(false)}>FAQ</Link>
          <Link href="/support" onClick={() => setMobileOpen(false)}>Support</Link>
        </div>
      </div>
    </>
  );
}