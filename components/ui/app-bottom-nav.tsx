"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Compass, FolderSearch, Sparkles, Sword } from "lucide-react";

import { BottomNav, type BottomNavItem } from "@/components/ui/bottom-nav";

const items: BottomNavItem[] = [
  { value: "/hunt", label: "Hunt", icon: Sword, href: "/hunt" },
  { value: "/discovery", label: "Discovery", icon: Compass, href: "/discovery" },
  { value: "/trending", label: "Trending", icon: Sparkles, href: "/trending" },
  { value: "/gitlense", label: "Gitlense", icon: FolderSearch, href: "/gitlense" },
];

export function AppBottomNav() {
  const pathname = usePathname();
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsMobileView(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  if (!pathname || !isMobileView) return null;

  const isAllowedPage = items.some(
    (item) => pathname === item.value || pathname.startsWith(`${item.value}/`),
  );

  if (!isAllowedPage) return null;

  return <BottomNav items={items} value={pathname} hideFrom="md" LinkComponent={Link} />;
}
