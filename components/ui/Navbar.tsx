"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import AuthButton from "@/components/AuthButton"
import { GitHubConnectionBadge } from "@/components/github/github-connection-badge"

const NAV_LINKS = [
  { href: "/hunt", key: "hunt", label: "Hunt Issues" },
  { href: "/analyze", key: "analyze", label: "GitLense" },
  { href: "/trend", key: "trend", label: "Trending" },
  { href: "/cluster", key: "cluster", label: "Cluster" },
  { href: "/discovery", key: "discovery", label: "Discovery" },
]

export default function Navbar() {
  const pathname = usePathname()

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
          paddingTop: 0,
          paddingBottom: 0,
          paddingLeft: 12,   
          paddingRight: 24, 
          background: "rgba(9,9,9,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* ── Logo ── */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0, /* This forces the text to touch the logo */
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <Image
            src="/logo.png"
            alt="OSHunt Logo"
            width={45}
            height={45}
            style={{ display: "block", borderRadius: "4px", objectFit: "contain" }}
          />
          <span style={{ fontSize: 20, fontWeight: 600, color: "#efefef", letterSpacing: "-0.01em" }}>
            <span style={{ color: "#a8ff3e" }}>OS</span>Hunt
          </span>
        </Link>

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

        {/* ── Auth / GitHub ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <GitHubConnectionBadge />
          <AuthButton />
        </div>
      </nav>
    </>
  )
}