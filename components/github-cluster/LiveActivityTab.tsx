"use client"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Activity, Bug, Clock, FolderGit2, Terminal } from "lucide-react"
import { CountUp, FadeInView } from "./motion"
import { Timeline } from "./Timeline"
import type { ActivityInsights, ClusterMetrics, TimelineItem } from "./types"

interface LiveActivityTabProps {
  metrics: ClusterMetrics
  timeline: TimelineItem[]
  clusterInsight: string | null
  activityInsights: ActivityInsights | null
  isLoading: boolean
  error: string | null
}

export function LiveActivityTab({ metrics, timeline, clusterInsight, activityInsights, isLoading, error }: LiveActivityTabProps) {
  const STAT_CARDS = [
    { label: "Total Repositories", icon: FolderGit2, value: metrics.totalRepos, kind: "count" as const },
    { label: "Open Repo Issues", icon: Bug, value: metrics.activeBugs, kind: "count" as const, warn: metrics.activeBugs > 0 },
    { label: "Recent Velocity", icon: Activity, value: metrics.gitVelocity, kind: "text" as const },
    { label: "Last Activity", icon: Clock, value: metrics.lastContributionTime, kind: "text" as const, accent: true },
  ]

  const hasInsights = activityInsights && (activityInsights.busiestDay || activityInsights.mostCommonActivity)

  return (
    <div className={cn("space-y-6 transition-opacity", isLoading && "opacity-40")}>
      <div className="grid grid-cols-2 gap-3 font-mono sm:grid-cols-4 sm:gap-4">
        {STAT_CARDS.map((card, i) => (
          <FadeInView key={card.label} delay={i * 60}>
            <Card
              className={cn(
                "flex h-full flex-col justify-between border-white/10 bg-white/[0.01] p-4 transition-colors hover:border-white/20",
                card.accent && "border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.02]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs uppercase tracking-wider", card.accent ? "text-[#a8ff3e]/70" : "text-white/40")}>{card.label}</span>
                <card.icon className={cn("h-3.5 w-3.5", card.accent ? "text-[#a8ff3e]/60" : "text-white/25")} />
              </div>
              {card.kind === "count" ? (
                <span className={cn("mt-2 text-3xl font-bold", card.warn ? "text-amber-400" : "text-white")}>
                  {isLoading ? "—" : error ? <span className="text-white/25">—</span> : <CountUp value={card.value as number} />}
                </span>
              ) : (
                <span className="mt-2 block truncate text-lg font-bold text-white">
                  {error && !isLoading ? <span className="text-white/25">Unavailable</span> : (card.value as string)}
                </span>
              )}
            </Card>
          </FadeInView>
        ))}
      </div>

      {clusterInsight && (
        <FadeInView delay={240}>
          <div className="rounded-xl border border-[#a8ff3e]/15 bg-[#a8ff3e]/[0.04] p-4">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-[#a8ff3e]/60">Cluster Insight</p>
            <p className="text-sm leading-relaxed text-white/80">{clusterInsight}</p>
          </div>
        </FadeInView>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-wider text-white/60">
            <Terminal className="h-4 w-4 text-[#a8ff3e]" />
            Live Public GitHub Timeline <span className="normal-case text-white/30">// Raw /events API</span>
          </h3>

          {hasInsights && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-white/40">
              {activityInsights?.busiestDay && (
                <span>
                  Busiest day <span className="text-white/70">{activityInsights.busiestDay}</span>
                </span>
              )}
              {activityInsights?.mostCommonActivity && (
                <span>
                  Most common <span className="text-white/70">{activityInsights.mostCommonActivity}</span>
                </span>
              )}
              {activityInsights?.trend && (
                <span>
                  Trend <span className="text-white/70">{activityInsights.trend}</span>
                </span>
              )}
            </div>
          )}
        </div>
        <Timeline items={timeline} isLoading={isLoading} />
      </div>
    </div>
  )
}
