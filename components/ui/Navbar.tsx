"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"

const NAV_LINKS = [
  { href: "/hunt", key: "hunt", label: "Hunt Issues" },
  { href: "/analyze", key: "analyze", label: "GitLense" },
  { href: "/trending", key: "trend", label: "Trending" },
  { href: "/discovery", key: "discovery", label: "Discovery" },
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fallbackInitial = session?.user?.name?.[0]?.toUpperCase() || "U"

  return (
    <>
      {/* This CSS hides the ugly scrollbar but keeps the swipe working */}
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* Hover + keyboard focus for nav pills — was mouse-only before (onMouseOver/onMouseOut
           mutating inline styles directly), which meant tabbing through the nav gave no visual
           feedback at all. This covers both, and keeps the active pill's look on hover/focus
           instead of overwriting it. */
        .nav-pill:hover, .nav-pill:focus-visible {
          color: #aaa;
          background-color: rgba(255,255,255,0.03);
        }
        .nav-pill.active:hover, .nav-pill.active:focus-visible {
          color: #fff;
          background-color: rgba(168,255,62,0.07);
        }
        .nav-pill:focus-visible {
          outline: 2px solid #a8ff3e;
          outline-offset: 2px;
        }
        .avatar-btn{background:none;border:1px solid rgba(255,255,255,0.12);border-radius:50%;padding:0;cursor:pointer;display:flex;align-items:center;justify-content:center;width:34px;height:34px;overflow:hidden;transition:border-color .15s;outline:none;}
        .avatar-btn:hover, .avatar-btn:focus-visible{border-color:#a8ff3e;}
        .avatar-img{width:100%;height:100%;object-fit:cover;}
        .avatar-fallback{width:100%;height:100%;background-color:#a8ff3e;color:#090909;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;}
        .dropdown-menu{position:absolute;top:calc(100% + 12px);right:0;background:#090909;border:1px solid rgba(255,255,255,0.08);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.6);display:flex;flex-direction:column;min-width:180px;padding:6px 0;z-index:50;}
        .dropdown-header{padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:4px;}
        .dropdown-name{font-size:14px;font-weight:600;color:#fff;line-height:1.2;}
        .dropdown-email{font-size:12px;color:#8d8d8d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;}
        .dropdown-item{padding:10px 16px;font-size:14px;color:#fff;text-decoration:none;text-align:left;background:none;border:none;cursor:pointer;font-family:inherit;transition:color .15s;width:100%;display:block;}
        .dropdown-item:hover, .dropdown-item:focus-visible{color:#a8ff3e;outline:none;background:rgba(255,255,255,0.02);}
        .dropdown-item.logout{color:#ff6b6b;}
      `}</style>

      <nav
        aria-label="Product navigation"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px 0 22px",
          background: "rgba(9,9,9,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Logo ── */}
        <div style={{ marginLeft: "10px", display: "flex", alignItems: "center" }}>
          <Link
            href="/"
            prefetch={false}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <Image
              src="/logo.png"
              alt="OSHunt Logo"
              width={45}
              height={45}
              style={{ display: "block", width: "45px", height: "45px", borderRadius: "4px", objectFit: "contain", marginLeft: "-18px" }}
            />
            <span style={{ fontSize: 20, fontWeight: 600, color: "#efefef", letterSpacing: "-0.01em" }}>
              <span style={{ color: "#a8ff3e" }}>OS</span>Hunt
            </span>
          </Link>
        </div>

        {/* ── Nav Links (Now Swipeable on Mobile) ── */}
        <div 
          className="hide-scroll"
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 4, 
            flex: 1, 
            overflowX: "auto", 
            whiteSpace: "nowrap", 
            margin: "0 16px" 
          }}
        >
          {NAV_LINKS.map(({ href, key, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={key}
                href={href}
                className={active ? "nav-pill active" : "nav-pill"}
                aria-current={active ? "page" : undefined}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 13px",
                  borderRadius: 7,
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "#555",
                  textDecoration: "none",
                  backgroundColor: active ? "rgba(168,255,62,0.07)" : "transparent",
                  border: active ? "1px solid rgba(168,255,62,0.12)" : "1px solid transparent",
                  transition: "color 0.15s, background-color 0.15s",
                  flexShrink: 0, /* This stops the buttons from squishing */
                }}
              >
                {/* Active dot indicator */}
                {active && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "#a8ff3e",
                      flexShrink: 0,
                      boxShadow: "0 0 6px #a8ff3e88",
                    }}
                  />
                )}
                {label}
              </Link>
            )
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {status === "loading" ? (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
              aria-label="Loading authentication status"
            />
          ) : status === "authenticated" ? (
            <div ref={menuRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {session?.user?.image ? (
                  <Image src={session.user.image} alt="Avatar" width={34} height={34} className="avatar-img" unoptimized />
                ) : (
                  <div className="avatar-fallback">
                    {fallbackInitial}
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="dropdown-menu" role="menu">
                  <div className="dropdown-header">
                    <div className="dropdown-name">{session?.user?.name}</div>
                    <div className="dropdown-email">{session?.user?.email}</div>
                  </div>
                  <Link href="/bookmark" className="dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>Bookmark</Link>
                  <Link href="/dashboard" className="dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <button type="button" className="dropdown-item logout" role="menuitem" onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/" }); }}>Sign out</button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "#a8ff3e",
                color: "#090909",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </>
  )
}