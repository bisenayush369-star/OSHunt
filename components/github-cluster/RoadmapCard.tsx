"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { FadeInView } from "./motion"
import type { WeeklyRoadmap } from "./types"

export function RoadmapCard({ roadmap, delay }: { roadmap: WeeklyRoadmap; delay: number }) {
  const [checked, setChecked] = useState<boolean[]>(() => roadmap.tasks.map(() => false))
  const doneCount = checked.filter(Boolean).length

  return (
    <FadeInView delay={delay}>
      <div className="rounded-xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.03] p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">{roadmap.weekLabel} roadmap</h4>
          <div className="flex gap-2">
            {roadmap.estimatedScoreGain > 0 && (
              <Badge variant="outline" className="border-[#a8ff3e]/30 bg-[#a8ff3e]/10 font-mono text-[10px] text-[#a8ff3e]">
                +{roadmap.estimatedScoreGain} pts
              </Badge>
            )}
            {roadmap.estimatedTime && (
              <Badge variant="outline" className="border-white/10 bg-white/5 font-mono text-[10px] text-white/50">
                {roadmap.estimatedTime}
              </Badge>
            )}
          </div>
        </div>
        <p className="mb-4 text-[11px] text-white/35">
          {doneCount}/{roadmap.tasks.length} checked · local to this session, nothing's saved yet
        </p>
        <div className="space-y-1">
          {roadmap.tasks.map((task, i) => (
            <label
              key={i}
              className="group -mx-1 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-1 transition-colors hover:bg-white/[0.02]"
            >
              <input
                type="checkbox"
                checked={checked[i] || false}
                onChange={() => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))}
                className="h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]"
              />
              <span className={cn("text-xs leading-relaxed transition-colors", checked[i] ? "text-white/30 line-through" : "text-white/75 group-hover:text-white")}>
                {task}
              </span>
            </label>
          ))}
        </div>
      </div>
    </FadeInView>
  )
}
