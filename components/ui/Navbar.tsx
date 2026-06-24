"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import AuthButton from "@/components/AuthButton"

const NAV_LINKS = [
  { href: "/hunt",    label: "Hunt Issues" },
  { href: "/analyze", label: "GitLense"    },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav
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
        <img 
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

      {/* ── Nav Links ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
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
                whiteSpace: "nowrap",
              }}
              onMouseOver={e => {
                if (!active) {
                  e.currentTarget.style.color = "#aaa"
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"
                }
              }}
              onMouseOut={e => {
                if (!active) {
                  e.currentTarget.style.color = "#555"
                  e.currentTarget.style.backgroundColor = "transparent"
                }
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

      {/* ── Auth ── */}
      <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
        <AuthButton />
      </div>
    </nav>
  )
}
