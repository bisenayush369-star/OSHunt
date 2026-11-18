"use client";

import { useRef } from "react";
import { Heart } from "lucide-react";
import { ADMIN_PATHS } from "@/components/lib/admin/contract";

/**
 * The footer heart. To everyone it is a heart. For the owner it is the first step of the only way into the admin:
 * a click asks the server for a 10-minute "knock" cookie and opens the sign-in page, where the ID and password do
 * the rest. If the server says no (admin not set up, or too many tries) nothing visible happens on purpose.
 * Keeps the look and the accessible name it always had.
 */
export function SecretHeart() {
  const busy = useRef(false);

  const knock = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(ADMIN_PATHS.api.gate, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "knock" }),
      });
      if (res.ok) {
        // A full page load, so the server sees the cookie that was just set.
        window.location.assign(ADMIN_PATHS.login);
        return;
      }
    } catch {
      /* stay quiet: this is a hidden door */
    }
    busy.current = false;
  };

  return (
    <button
      type="button"
      onClick={knock}
      aria-label="Love for open source"
      className="inline-flex cursor-default items-center justify-center rounded-full border border-white/10 bg-black/20 p-1.5 text-pink-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a8ff3e]"
      title="Built with love"
    >
      <Heart className="h-3.5 w-3.5" fill="currentColor" aria-hidden />
    </button>
  );
}
