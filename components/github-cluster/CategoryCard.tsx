"use client"

import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { FadeInView } from "./motion"
import type { CategoryScore } from "./types"

export function CategoryCard({ category, delay }: { category: CategoryScore; delay: number }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const pct = Math.round((category.score / 125) * 100)

  return (
    <FadeInView delay={delay}>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.015]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]/60"
        >
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white/90">{category.name}</span>
              <span className="shrink-0 font-mono text-xs text-[#a8ff3e]">{category.score}/125</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-[#a8ff3e] transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-white/30 transition-transform duration-300", open && "rotate-180")} />
        </button>

        <div id={panelId} role="region" className={cn("grid transition-all duration-300 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="space-y-2.5 px-4 pb-4">
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/30">Why this score</p>
                <p className="text-[11.5px] leading-relaxed text-white/50">{category.why}</p>
              </div>

              {category.weakness && (
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-white/30">Biggest weakness</p>
                  <p className="text-[11.5px] leading-relaxed text-white/50">{category.weakness}</p>
                </div>
              )}

              {category.howToImprove && (
                <div className="flex items-start gap-2 rounded-lg border border-[#a8ff3e]/15 bg-[#a8ff3e]/[0.04] p-2.5">
                  <span className="mt-0.5 shrink-0 text-[#a8ff3e]">→</span>
                  <p className="text-[11.5px] leading-relaxed text-white/75">{category.howToImprove}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FadeInView>
  )
}
