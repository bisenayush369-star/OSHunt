"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function SecretHeart() {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/gate", { method: "POST" });
      if (res.ok) {
        window.location.href = "/admin/login";
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Open owner admin gate"
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 p-1.5 text-pink-300 transition hover:scale-105 hover:border-pink-400/60 hover:text-pink-200 disabled:cursor-not-allowed disabled:opacity-60"
      title="Owner area"
    >
      <Heart className={`h-3.5 w-3.5 ${loading ? "animate-pulse" : ""}`} fill="currentColor" />
    </button>
  );
}
