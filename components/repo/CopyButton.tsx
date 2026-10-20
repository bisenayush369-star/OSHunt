"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ACTION_BUTTON,
  ACTION_SIZE,
  AlertIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  LinkIcon,
  TerminalIcon,
  cx,
} from "./repo-ui"

type CopyState = "clone" | "url" | "error" | null

// navigator.clipboard only exists in secure contexts (https / localhost) and is blocked in some in-app
// webviews, so fall back to a hidden textarea + execCommand. Two details matter here:
//  • `host`: while the dropdown is open, Radix traps focus inside the menu and pulls it back from anything
//    outside, so a textarea appended to <body> never gets focus — execCommand("copy") then reports success
//    while copying nothing. Appending it inside the menu item keeps it within the trap.
//  • focus goes back where it was afterwards, so keyboard users don't get thrown to the top of the page.
async function copyText(text: string, host: HTMLElement = document.body): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path below
  }
  const previouslyFocused = document.activeElement as HTMLElement | null
  const el = document.createElement("textarea")
  try {
    el.value = text
    el.setAttribute("readonly", "")
    el.setAttribute("aria-hidden", "true")
    el.tabIndex = -1
    // fixed + top/left 0 so focusing it can't scroll the page; 16px so iOS doesn't zoom
    el.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px;pointer-events:none"
    host.appendChild(el)
    el.focus({ preventScroll: true })
    el.select()
    el.setSelectionRange(0, text.length)
    // Only report success if the textarea really had focus and its selection — otherwise nothing was copied.
    return document.activeElement === el && document.execCommand("copy")
  } catch {
    return false
  } finally {
    el.remove()
    previouslyFocused?.focus?.({ preventScroll: true })
  }
}

const ITEM =
  "cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-[13px] text-[#e5e5e5] focus:bg-white/[0.07] focus:text-white"
const ITEM_ICON = "mt-0.5 size-4 shrink-0 text-[#8a8a8a]"
const ITEM_HINT = "block truncate font-mono text-[11px] font-normal text-[#8a8a8a]"

export function CopyButton({
  cloneCommand,
  url,
  className,
}: {
  cloneCommand: string
  url: string
  className?: string
}) {
  const [copied, setCopied] = useState<CopyState>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const runCopy = async (kind: "clone" | "url", text: string, host?: EventTarget | null) => {
    const ok = await copyText(text, host instanceof HTMLElement ? host : undefined)
    setCopied(ok ? kind : "error")
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(null), 1800)
  }

  const label = copied === "error" ? "Failed" : copied ? "Copied" : "Copy"
  const announcement =
    copied === "clone" ? "Clone command copied" : copied === "url" ? "Repository URL copied" : copied === "error" ? "Couldn't copy" : ""

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          title="Copy the clone command or the repository URL"
          onClick={event => event.stopPropagation()}
          className={cx(
            ACTION_BUTTON,
            ACTION_SIZE,
            "justify-center sm:min-w-[6.25rem]",
            copied === "error" && "border-[#ff4d6d]/40 text-[#ff8fa3]",
            className,
          )}
        >
          {copied === "error" ? <AlertIcon /> : copied ? <CheckIcon className="text-[#a8ff3e]" /> : <CopyIcon />}
          <span>{label}</span>
          <ChevronDownIcon className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        // The menu is portalled, but React still bubbles its events up through the card — don't let a click on an item reach it.
        onClick={event => event.stopPropagation()}
        className="w-[min(19rem,calc(100vw-1.5rem))] rounded-xl border-white/10 bg-[#0c0c0c]/95 p-1.5 text-[#e5e5e5] shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <DropdownMenuItem onSelect={event => runCopy("clone", cloneCommand, event.currentTarget)} className={ITEM}>
          <TerminalIcon className={ITEM_ICON} />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Copy clone command</span>
            <span className={ITEM_HINT}>{cloneCommand}</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={event => runCopy("url", url, event.currentTarget)} className={ITEM}>
          <LinkIcon className={ITEM_ICON} />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Copy repository URL</span>
            <span className={ITEM_HINT}>{url.replace(/^https?:\/\//, "")}</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
      {/* Screen readers don't see the label flip to "Copied", so say it out loud. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </DropdownMenu>
  )
}