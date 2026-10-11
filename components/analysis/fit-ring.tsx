"use client"
import { useCountUp, useLanded, useReducedMotion } from "./motion"

const R = 40
const C = 2 * Math.PI * R

// Colour is never the only signal: the number and the server's label sit next to the ring.
function toneFor(score: number) {
  if (score >= 70) return "#a8ff3e"
  if (score >= 40) return "#ffb84d"
  return "#ff4d6d"
}

export function FitRing({ score, delayMs = 0 }: { score: number; delayMs?: number }) {
  const landed = useLanded()
  const reduced = useReducedMotion()
  const shown = useCountUp(score, 1000, delayMs)
  const tone = toneFor(score)
  const drawn = landed || reduced
  const offset = C * (1 - (drawn ? score : 0) / 100)

  return (
    <div
      role="img"
      aria-label={`Fit score ${score} out of 100`}
      className="relative size-[92px] shrink-0 sm:size-[104px]"
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#161616" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={tone}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{
            transition: reduced ? "none" : `stroke-dashoffset 1000ms cubic-bezier(.22,.8,.3,1) ${delayMs}ms`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-mono text-[26px] font-bold tabular-nums text-white sm:text-[30px]">{shown}</span>
        <span className="mt-1 text-[10px] text-[#808080]">out of 100</span>
      </div>
    </div>
  )
}
