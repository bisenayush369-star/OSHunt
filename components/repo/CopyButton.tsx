"use client"

import { useEffect, useRef, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const CopyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ChevronIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// This is the actual bug fix: the old copy button most likely relied on
// navigator.clipboard alone, which silently no-ops on http:// origins and
// some in-app/webview browsers, and probably wasn't stopping the click from
// bubbling into whatever the card wrapped it in. This version falls back to
// a hidden-textarea + execCommand for non-secure contexts, and — more
// importantly — the button is never nested inside another clickable
// element in the first place (see RepoCard: nothing wraps the whole card).
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    const el = document.createElement("textarea")
    el.value = text
    el.style.position = "fixed"
    el.style.opacity = "0"
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand("copy")
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}

export function CopyButton({ cloneCommand, url }: { cloneCommand: string; url: string }) {
  const [copied, setCopied] = useState<"clone" | "url" | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const runCopy = async (kind: "clone" | "url", text: string) => {
    const ok = await copyText(text)
    if (!ok) return
    setCopied(kind)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(null), 1800)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Copy repository link"
          title="Copy"
          className="group flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1a1a1a] bg-[#050505] px-2.5 text-[12px] text-[#888] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e]"
        >
          {copied ? <span className="text-[#a8ff3e]"><CheckIcon /></span> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
          <span className="opacity-60"><ChevronIcon /></span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="w-56 border-[#1a1a1a] bg-[#0a0a0a]/95 p-1.5 backdrop-blur-md"
      >
        <DropdownMenuItem
          onSelect={() => runCopy("clone", cloneCommand)}
          className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-[#ddd] focus:bg-[#151515] focus:text-[#a8ff3e]"
        >
          Copy clone command
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => runCopy("url", url)}
          className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-[#ddd] focus:bg-[#151515] focus:text-[#a8ff3e]"
        >
          Copy repository URL
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
