"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import ProfileOverviewCard, { type ProfileOverview } from "./ProfileOverviewCard"
import CheckupInsights, { type CheckupResult } from "./CheckupInsights"
import WeeklyPlanCard from "./WeeklyPlanCard"
import AchievementsCard from "./AchievementsCard"
import LearningResourcesCard from "./LearningResourcesCard"

const SpinnerMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={cn("animate-spin", className)} fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>);
const ClipboardMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="6" y="4" width="12" height="16" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 10h6M9 14h6" /></svg>);

interface ActivityContext {
  topLanguages?: string[]
  signals?: {
    originalRepoCount?: number
    reposWithDescription?: number
    reposWithLicense?: number
    reposWithHomepage?: number
    reposWithTopics?: number
    externalActivityRepoCount?: number
  }
}

export default function ProfileCheckup({
  effectiveUsername,
  activityContext,
}: {
  effectiveUsername: string
  activityContext: ActivityContext | null
}) {
  const [overview, setOverview] = useState<ProfileOverview | null>(null)
  const [checkup, setCheckup] = useState<CheckupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runCheckup = async () => {
    setLoading(true)
    setError(null)
    setOverview(null)
    setCheckup(null)
    try {
      const overviewRes = await fetch(`/api/profile-overview?username=${encodeURIComponent(effectiveUsername)}`)
      const overviewData = await overviewRes.json()
      if (!overviewRes.ok || overviewData.error) throw new Error(overviewData.error || "Couldn't fetch profile overview.")
      setOverview(overviewData.result)

      const checkupRes = await fetch("/api/profile-checkup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: overviewData.result,
          signals: activityContext?.signals,
          topLanguages: activityContext?.topLanguages,
        }),
      })
      const checkupData = await checkupRes.json()
      if (!checkupRes.ok || checkupData.error) throw new Error(checkupData.error || "Couldn't complete the checkup.")
      setCheckup(checkupData.result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message || "Something went wrong running the checkup.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {!overview && !loading && !error && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 text-center">
          <ClipboardMark className="mx-auto mb-3 h-8 w-8 text-[#a8ff3e]/60" />
          <h3 className="mb-1.5 text-sm font-bold text-white">GitHub Profile Checkup</h3>
          <p className="mx-auto mb-5 max-w-md text-xs leading-relaxed text-white/45">
            Reviews your public profile — bio, README, pinned presentation, first impression — separate from your repo activity in My Score. Grounded in what is actually on your profile; no invented percentages.
          </p>
          <Button
            onClick={runCheckup}
            className="mx-auto flex items-center justify-center gap-2 rounded-lg bg-[#a8ff3e] px-6 py-2.5 text-xs font-semibold text-black hover:bg-[#a8ff3e]/90"
          >
            Run Checkup ⚡
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.01] p-10">
          <SpinnerMark className="h-6 w-6 text-[#a8ff3e]" />
        </div>
      )}

      {error && !loading && (
        <button onClick={runCheckup} className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left text-xs font-medium text-red-300 hover:bg-red-500/10">
          {error} — tap to retry
        </button>
      )}

      {overview && !loading && (
        <div className="space-y-5">
          <ProfileOverviewCard overview={overview} />

          {checkup && (
            <>
              <CheckupInsights checkup={checkup} />
              <WeeklyPlanCard plan={checkup.weeklyPlan} />
            </>
          )}

          <AchievementsCard profileUsername={overview.username} />
          <LearningResourcesCard />

          <button onClick={runCheckup} className="text-xs font-medium text-white/40 hover:text-white/70">
            Re-run checkup
          </button>
        </div>
      )}
    </div>
  )
}
