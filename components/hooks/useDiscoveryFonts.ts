"use client";

import { useEffect } from "react";

/**
 * Loads the same Google Fonts the Discovery page loads (Outfit + JetBrains Mono), so the
 * Bookmarks page looks identical. Harmless if your layout already loads them.
 */
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap";

export function useDiscoveryFonts(): void {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_HREF;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);
}
