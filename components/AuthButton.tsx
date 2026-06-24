"use client";
import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the dropdown if the user clicks anywhere outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show a blank circle while NextAuth is figuring out if they are logged in
  if (status === "loading") {
    return <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />;
  }

  // Not logged in? Show a single Sign In button
  if (status === "unauthenticated") {
    return (
      <button
        onClick={() => signIn()}
        style={{
          padding: "7px 16px",
          fontSize: "13px",
          fontWeight: 600,
          backgroundColor: "#fff",
          color: "#000",
          border: "none",
          borderRadius: "7px",
          cursor: "pointer",
          transition: "opacity 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = "0.8")}
        onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
      >
        Sign In
      </button>
    );
  }

  // User IS logged in. Grab their data.
  const user = session?.user;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : "?";

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      
      {/* 1. THE AVATAR TRIGGER */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: 0,
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "50%",
          width: "36px",
          height: "36px",
          cursor: "pointer",
          background: "#111",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.2s",
        }}
        onMouseOver={(e) => (e.currentTarget.style.borderColor = "#a8ff3e")}
        onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
      >
        {user?.image ? (
          <Image src={user.image} alt="Profile" width={36} height={36} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: "#a8ff3e", fontSize: "15px", fontWeight: 600 }}>{initial}</span>
        )}
      </button>

      {/* 2. THE DROPDOWN MENU */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "46px",
            right: 0,
            width: "200px",
            background: "#090909",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            zIndex: 200,
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          }}
        >
          {/* User Info Header */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "4px" }}>
            <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name || "Developer"}
            </p>
            <p style={{ margin: 0, fontSize: "11.5px", color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </p>
          </div>

          {/* Links */}
          <Link href="/account" onClick={() => setIsOpen(false)} style={{ textDecoration: "none", padding: "8px 10px", fontSize: "13px", color: "#ccc", borderRadius: "6px" }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#ccc"; }}>
            Account
          </Link>
          <Link href="/bookmark" onClick={() => setIsOpen(false)} style={{ textDecoration: "none", padding: "8px 10px", fontSize: "13px", color: "#ccc", borderRadius: "6px" }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#ccc"; }}>
            Bookmark
          </Link>
          <Link href="/dashboard" onClick={() => setIsOpen(false)} style={{ textDecoration: "none", padding: "8px 10px", fontSize: "13px", color: "#ccc", borderRadius: "6px" }} onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "#fff"; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#ccc"; }}>
            Dashboard
          </Link>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              textAlign: "left",
              padding: "8px 10px",
              marginTop: "4px",
              fontSize: "13px",
              color: "#ff5f56",
              background: "transparent",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              width: "100%",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 95, 86, 0.1)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}