"use client"

import { cn } from "@/lib/utils"
import { FadeInView } from "./motion"
import type { TimelineItem as TimelineItemType } from "./types"

const DOT_COLOR: Record<TimelineItemType["type"], string> = {
  pr: "bg-[#a8ff3e]",
  commit: "bg-blue-400",
  issue: "bg-amber-400",
  review: "bg-amber-400",
}

export function Timeline({ items, isLoading }: { items: TimelineItemType[]; isLoading: boolean }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 p-8 text-center font-mono text-xs text-white/40">
        {isLoading ? "Loading recent activity…" : "No recent public events found. Push a commit or open a PR to see it here."}
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {items.map((step, i) => (
        <FadeInView key={step.id} delay={i * 40}>
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 transition-colors hover:border-white/10">
            <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT_COLOR[step.type])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/90">
                {step.action} <span className="font-mono text-xs text-white/35">// {step.target}</span>
              </p>
              <span className="mt-1 block font-mono text-[11px] text-white/40">{step.timestamp}</span>
            </div>
          </div>
        </FadeInView>
      ))}
    </div>
  )
}
