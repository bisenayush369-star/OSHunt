"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { useState, useRef, useEffect } from "react"

export default function AuthButton() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (status === "loading") {
    return <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1a1a1a", animation: "pulse 1.5s infinite" }} />
  }

  // 1. Logged IN State: Avatar with Dropdown
  if (session && session.user) {
    return (
      <div style={{ position: "relative" }} ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          style={{ 
            background: "none", 
            border: "2px solid transparent", 
            borderRadius: "50%", 
            padding: 2, 
            cursor: "pointer",
            transition: "border-color 0.2s",
            borderColor: isOpen ? "#a8ff3e" : "transparent"
          }}
        >
          {session.user.image ? (
            <img 
              src={session.user.image} 
              alt="Profile" 
              style={{ width: 32, height: 32, borderRadius: "50%", display: "block" }} 
            />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#333", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              {session.user.name?.charAt(0) || "U"}
            </div>
          )}
        </button>

        {isOpen && (
          <div style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "8px",
            background: "#111",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "8px",
            minWidth: "150px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 50
          }}>
            <div style={{ padding: "8px 12px", borderBottom: "1px solid #222", marginBottom: "4px" }}>
              <div style={{ fontSize: "14px", color: "#fff", fontWeight: 500 }}>{session.user.name}</div>
              <div style={{ fontSize: "12px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{session.user.email}</div>
            </div>
            <button 
              onClick={() => signOut()}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "transparent",
                border: "none",
                color: "#ff4d6d",
                fontSize: "14px",
                textAlign: "left",
                cursor: "pointer",
                borderRadius: "4px",
                transition: "background 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 77, 109, 0.1)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    )
  }

  // 2. Logged OUT State: Standard Login/Signup Buttons
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <button 
        onClick={() => signIn()} 
        style={{ fontSize: 14, color: "#aaa", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
        onMouseOver={e => e.currentTarget.style.color = "#fff"}
        onMouseOut={e => e.currentTarget.style.color = "#aaa"}
      >
        Log in
      </button>
      <button 
        onClick={() => signIn()} 
        style={{ fontSize: 14, fontWeight: 500, background: "#efefef", color: "#000", border: "none", borderRadius: "20px", padding: "8px 16px", cursor: "pointer" }}
      >
        Sign up
      </button>
    </div>
  )
}