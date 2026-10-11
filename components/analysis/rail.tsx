"use client"
import { useId, type ReactNode } from "react"
import { useLanded } from "./motion"

/**
 * The page's one signature move: results are laid out on a git-style rail.
 * While the repo is being researched the rail is dim with a light travelling
 * down it. When the answer arrives the nodes fill top to bottom, like commits
 * landing, once. Nothing else on the page animates on scroll.
 */

const STEP_MS = 150 // gap between one node filling and the next

export function Rail({ children, className = "" }: { children: ReactNode; className?: string }) {
  const landed = useLanded()
  return (
    <div data-landed={landed} className={`group/rail relative ${className}`}>
      {children}
    </div>
  )
}

type NodeProps = {
  index: number
  label: string
  icon?: ReactNode
  last?: boolean
  children: ReactNode
}

export function RailNode({ index, label, icon, last = false, children }: NodeProps) {
  const headingId = useId()
  const delay = `${index * STEP_MS}ms`
  const lineDelay = `${index * STEP_MS + 100}ms`

  return (
    <section
      aria-labelledby={headingId}
      className="grid grid-cols-[20px_minmax(0,1fr)] gap-x-3 sm:gap-x-5"
    >
      <div aria-hidden="true" className="flex flex-col items-center pt-[3px]">
        <span
          style={{ transitionDelay: delay }}
          className="relative z-10 size-[11px] shrink-0 rounded-full border border-[#2a2a2a] bg-[#090909] transition-[background-color,border-color,box-shadow] duration-500 group-data-[landed=true]/rail:border-[#a8ff3e] group-data-[landed=true]/rail:bg-[#a8ff3e] group-data-[landed=true]/rail:shadow-[0_0_0_4px_rgba(168,255,62,0.12)]"
        />
        {!last && (
          <span className="relative mt-1 w-px flex-1 bg-[#161616]">
            <span
              style={{ transitionDelay: lineDelay }}
              className="absolute inset-0 origin-top scale-y-0 bg-gradient-to-b from-[#a8ff3e]/60 to-[#a8ff3e]/10 transition-transform duration-700 ease-out group-data-[landed=true]/rail:scale-y-100"
            />
          </span>
        )}
      </div>

      <div className={`min-w-0 ${last ? "pb-2" : "pb-9 sm:pb-11"}`}>
        <h2
          id={headingId}
          className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase leading-[18px] tracking-wider text-[#a8ff3e]"
        >
          {icon && <span className="flex opacity-90">{icon}</span>}
          {label}
        </h2>
        {children}
      </div>
    </section>
  )
}

/** A band of light that slides down the rail's line while research runs. */
export function RailScanLine() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-3 left-[10px] top-3 w-px -translate-x-1/2 overflow-hidden motion-reduce:hidden"
    >
      <div className="h-[200%] w-full animate-[rail-scan_2.1s_cubic-bezier(.45,.05,.55,.95)_infinite] bg-[linear-gradient(to_bottom,transparent_0%,transparent_42%,#a8ff3e_50%,transparent_58%,transparent_100%)]" />
    </div>
  )
}
