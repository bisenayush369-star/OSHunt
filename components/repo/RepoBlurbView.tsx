"use client"

import type { BlurbState } from "@/lib/repo-types"

const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
const UsersIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
)
const BoltIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

function Eyebrow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#a8ff3e]/80">
      <span className="flex opacity-90">{icon}</span>
      {children}
    </div>
  )
}

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
  // Search results start here — no eager blurb, opt-in per card so the app
  // never fires an AI call on every keystroke, only when someone actually
  // wants an explanation.
  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[#1a1a1a] py-3 text-[12.5px] text-[#777] transition-colors hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
      >
        <SparkleIcon /> Explain this repo
      </button>
    )
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-3 w-4/5 animate-pulse rounded bg-[#141414]" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-[#141414]" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-[#141414]" />
      </div>
    )
  }

  // The other half of the "AI throws an error" fix — a failed generation
  // shows an inline, scoped retry instead of an error the user has to make
  // sense of, and it never blocks the rest of the card (stats/links/copy
  // above this still work fine).
  if (state.status === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.05] px-3 py-2.5 text-[12px] text-[#ff8fa3]">
        <span>{state.message || "AI summary unavailable right now."}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 cursor-pointer font-semibold text-[#a8ff3e] hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  const { blurb } = state
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] font-medium leading-snug text-white">{blurb.tagline}</p>
      <p className="text-[12.5px] leading-relaxed text-[#999]">{blurb.whatItDoes}</p>

      {!compact && blurb.whyDevsLoveIt.length > 0 && (
        <div>
          <Eyebrow icon={<UsersIcon />}>Why devs like it</Eyebrow>
          <ul className="flex flex-col gap-1">
            {blurb.whyDevsLoveIt.map((point, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-[#aaa]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#a8ff3e]/60" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!compact && blurb.standoutFeature && (
        <div className="rounded-lg border border-[#a8ff3e]/[0.12] bg-[#a8ff3e]/[0.03] px-3 py-2">
          <Eyebrow icon={<BoltIcon />}>What sets it apart</Eyebrow>
          <p className="text-[12px] leading-snug text-[#ccc]">{blurb.standoutFeature}</p>
        </div>
      )}
    </div>
  )
}
