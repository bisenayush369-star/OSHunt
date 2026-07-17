"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { label: "Hunt", href: "/hunt" },
  { label: "GitLense", href: "/analyze" },
  { label: "Profile", href: "/profile" },
  { label: "Bookmarks", href: "/bookmarks" },
] as const

function LogoMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="15" stroke="#a8ff3e" strokeWidth="1.2" />
      <circle cx="18" cy="18" r="4" stroke="#a8ff3e" strokeWidth="0.7" opacity="0.4" />
      <line x1="18" y1="2" x2="18" y2="0" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="18" y1="34" x2="18" y2="36" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="2" y1="18" x2="0" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="34" y1="18" x2="36" y2="18" stroke="#a8ff3e" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="18" cy="18" r="1.8" fill="#a8ff3e" />
    </svg>
  )
}

export default function SiteNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#090909]/95 backdrop-blur-md">
      <div className="flex h-[52px] items-center justify-between px-4 sm:px-7">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
            <span className="text-[#a8ff3e]">OS</span>Hunt
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-[5px] text-[13.5px] transition-colors",
                l.label === active ? "text-zinc-100" : "text-zinc-600 hover:text-zinc-300"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#a8ff3e] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#a8ff3e]" />
            </span>
            <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-[#a8ff3e]/30 bg-gradient-to-br from-[#a8ff3e] to-[#5aff00] text-[12px] font-bold text-[#090909]">
              A
            </div>
          </div>
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-zinc-400 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.06] bg-[#0c0c0c] px-4 py-2 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-md px-3 py-2.5 text-sm",
                l.label === active ? "text-[#a8ff3e]" : "text-zinc-400"
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
