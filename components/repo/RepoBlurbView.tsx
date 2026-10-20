"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { BlurbState } from "@/components/lib/repo-types"
import { AlertIcon, RetryIcon, SparklesIcon, UsersIcon, ZapIcon, cx } from "./repo-ui"

// `className` replaces the default bottom margin (the class joiner can't "override" mb-1.5 with an extra mb-0).
function Eyebrow({ icon, children, className = "mb-1.5" }: { icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a8ff3e]/90", className)}>
      <span className="flex">{icon}</span>
      {children}
    </div>
  )
}

// Every state sits in the same frame so the card doesn't jump when it goes idle → loading → ready.
const FRAME = "rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"

export function RepoBlurbView({
  state,
  onGenerate,
  onRetry,
  compact = false,
}: {
  state: BlurbState
  onGenerate?: () => void
  onRetry?: () => void
  compact?: boolean
}) {
  const regionRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef(false)

  // "Explain this repo" and "Retry" are replaced by the next state the moment they're pressed, which would
  // drop a keyboard user back at the top of the page. If focus got lost that way, park it on this region.
  // (If they've already moved on to something else, it is left alone.)
  useEffect(() => {
    if (!restoreFocus.current) return
    const active = document.activeElement
    if (!active || active === document.body) regionRef.current?.focus({ preventScroll: true })
  }, [state.status])

  const generate = () => {
    restoreFocus.current = true
    onGenerate?.()
  }
  const retry = () => {
    restoreFocus.current = true
    onRetry?.()
  }

  let body: React.ReactNode
  if (state.status === "idle") {
    // Search results start here — no eager blurb, opt-in per card so the app never fires an AI call
    // on every keystroke, only when someone actually wants an explanation.
    body = (
      <Button
        type="button"
        variant="secondary"
        onClick={generate}
        // relative z-10: stays clickable above the card's stretched "open details" link.
        className={cx(
          "relative z-10 h-11 w-full gap-2 rounded-lg border border-dashed border-white/15 bg-transparent px-3 text-[13px] font-medium text-[#9a9a9a] shadow-none sm:h-10",
          "transition-[color,background-color,border-color,transform,scale] duration-200 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
          "hover:border-[#a8ff3e]/40 hover:bg-[#a8ff3e]/[0.05] hover:text-[#a8ff3e]",
          "focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0",
        )}
      >
        <SparklesIcon className="size-4 text-[#a8ff3e]" />
        Explain this repo
      </Button>
    )
  } else if (state.status === "loading") {
    body = (
      <div className={cx(compact && FRAME)}>
        <span className="sr-only">Generating a summary…</span>
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          {compact && (
            <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#a8ff3e]/60">
              <SparklesIcon className="size-3 motion-safe:animate-pulse" />
              Writing summary…
            </div>
          )}
          <Skeleton className="h-3.5 w-11/12 bg-white/[0.07]" />
          <Skeleton className="h-3 w-full bg-white/[0.07]" />
          <Skeleton className="h-3 w-3/5 bg-white/[0.07]" />
        </div>
      </div>
    )
  } else if (state.status === "error") {
    // A failed generation shows an inline, scoped retry instead of an error the user has to make sense
    // of, and it never blocks the rest of the card (stats / links / copy still work fine).
    body = (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ff4d6d]/25 bg-[#ff4d6d]/[0.06] px-3 py-2.5 text-[13px] leading-snug text-[#ff9fb0]">
        <span className="flex min-w-0 items-start gap-2">
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{state.message || "AI summary unavailable right now."}</span>
        </span>
        {onRetry && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={retry}
            className={cx(
              "relative z-10 h-11 shrink-0 gap-1.5 rounded-md border border-[#a8ff3e]/30 bg-[#a8ff3e]/[0.08] px-2.5 text-[13px] font-semibold text-[#a8ff3e] shadow-none has-[>svg]:px-2.5 sm:h-9",
              "hover:border-[#a8ff3e]/50 hover:bg-[#a8ff3e]/15 hover:text-[#a8ff3e]",
              "focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0",
            )}
          >
            <RetryIcon className="size-3.5" />
            Retry
          </Button>
        )}
      </div>
    )
  } else {
    const { blurb } = state
    const reasons = blurb.whyDevsLoveIt ?? []
    body = (
      <div className={cx("flex flex-col gap-2.5", compact && FRAME)}>
        {compact && (
          <Eyebrow icon={<SparklesIcon className="size-3" />} className="mb-0">
            AI summary
          </Eyebrow>
        )}
        <p className="text-[14px] font-medium leading-snug text-white [overflow-wrap:anywhere]">{blurb.tagline}</p>
        <p className={cx("text-[13px] leading-relaxed text-[#a3a3a3] [overflow-wrap:anywhere]", compact && "line-clamp-4")}>
          {blurb.whatItDoes}
        </p>

        {!compact && reasons.length > 0 && (
          <div>
            <Eyebrow icon={<UsersIcon className="size-3" />}>Why devs like it</Eyebrow>
            <ul className="flex flex-col gap-1.5">
              {reasons.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-[#b4b4b4]">
                  <span aria-hidden="true" className="mt-[7px] size-1 shrink-0 rounded-full bg-[#a8ff3e]/70" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!compact && blurb.standoutFeature && (
          <div className="rounded-lg border border-[#a8ff3e]/15 bg-[#a8ff3e]/[0.04] px-3 py-2.5">
            <Eyebrow icon={<ZapIcon className="size-3" />}>What sets it apart</Eyebrow>
            <p className="text-[13px] leading-snug text-[#d4d4d4]">{blurb.standoutFeature}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    // One persistent live region: what's inside changes (idle → loading → ready or error) and screen readers
    // announce each change politely — "Generating a summary…", then the summary, or the error. Content that is
    // already here when a card mounts is not announced, so a page of cards doesn't read out a dozen summaries
    // (or a dozen errors, when the AI service is down).
    <div
      ref={regionRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      tabIndex={-1}
      className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
    >
      {body}
    </div>
  )
}