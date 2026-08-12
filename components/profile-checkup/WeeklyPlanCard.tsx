"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

function TaskList({ label, tasks }: { label: string; tasks: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(() => tasks.map(() => false))
  if (tasks.length === 0) return null
  return (
    <div>
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <div className="space-y-2">
        {tasks.map((task, i) => (
          <label key={i} className="group flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={checked[i] || false}
              onChange={() => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[#a8ff3e]"
            />
            <span className={cn("text-xs leading-relaxed transition-colors", checked[i] ? "text-white/30 line-through" : "text-white/75 group-hover:text-white")}>
              {task}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default function WeeklyPlanCard({ plan }: { plan: { thisWeek: string[]; nextWeek: string[] } }) {
  return (
    <div className="rounded-xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.03] p-5">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-bold text-white">Weekly Improvement Plan</h4>
      </div>
      <p className="mb-4 text-[11px] text-white/35">Checks are local to this session — nothing's saved yet.</p>
      <div className="space-y-5">
        <TaskList label="This week" tasks={plan.thisWeek} />
        <TaskList label="Next week" tasks={plan.nextWeek} />
      </div>
    </div>
  )
}
