"use client"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckIcon, CopyIcon } from "./icons"

export function CopyButton({ text, label = "Copy command" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // Clipboard API is blocked on non-secure origins and some in-app browsers; fall back to a hidden textarea.
      const ta = document.createElement("textarea")
      ta.value = text
      ta.setAttribute("readonly", "")
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
      } finally {
        document.body.removeChild(ta)
      }
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className="size-11 shrink-0 rounded-md text-[#8a8a8a] hover:bg-white/[0.06] hover:text-[#a8ff3e] dark:hover:bg-white/[0.06] sm:size-9"
    >
      <span className={copied ? "text-[#a8ff3e]" : ""}>{copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}</span>
      <span role="status" aria-live="polite" className="sr-only">{copied ? "Copied to clipboard" : ""}</span>
    </Button>
  )
}
