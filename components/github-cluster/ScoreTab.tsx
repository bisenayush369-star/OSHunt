"use client"

import { Loader2, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FadeInView, ShimmerSkeleton, useAnimatedNumber, useInView } from "./motion"
import { CategoryCard } from "./CategoryCard"
import { RoadmapCard } from "./RoadmapCard"
import { MentorChat } from "./MentorChat"
import type { ChatMessage, ProfileScoreResult, RawContext } from "./types"

function ScoreRing({ score, max = 1000, size = 116 }: { score: number; max?: number; size?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>("0px")
  const animated = useAnimatedNumber(score, 1300, inView)
  const stroke = 9
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, animated / max))

  return (
    <div ref={ref} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Overall score: ${score} out of ${max}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#a8ff3e"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-white">{animated}</span>
        <span className="text-[10px] text-white/40">/ {max}</span>
      </div>
    </div>
  )
}

interface ScoreTabProps {
  rawContext: RawContext | null
  effectiveUsername: string
  isAnalyzing: boolean
  scoreResult: ProfileScoreResult | null
  scoreError: string | null
  onTriggerScore: () => void
  chatMessages: ChatMessage[]
  chatInput: string
  onChatInputChange: (value: string) => void
  isBotTyping: boolean
  onSendChatMessage: (e: React.FormEvent) => void
}

export function ScoreTab({
  rawContext,
  effectiveUsername,
  isAnalyzing,
  scoreResult,
  scoreError,
  onTriggerScore,
  chatMessages,
  chatInput,
  onChatInputChange,
  isBotTyping,
  onSendChatMessage,
}: ScoreTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        {!scoreResult && !isAnalyzing && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-[#a8ff3e]/60" />
            <h3 className="mb-1.5 text-sm font-bold text-white">Score your profile</h3>
            <p className="mx-auto mb-5 max-w-sm text-xs leading-relaxed text-white/45">
              Scores 8 real categories out of 1000 using your actual repo and activity data, then gives you one week's worth of concrete next
              steps.
            </p>
            <Button
              onClick={onTriggerScore}
              disabled={!rawContext}
              className="mx-auto flex h-11 items-center justify-center gap-2 rounded-lg bg-[#a8ff3e] px-6 text-xs font-semibold text-black hover:bg-[#a8ff3e]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:opacity-40"
            >
              Score My Profile ⚡
            </Button>
          </div>
        )}

        {isAnalyzing && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-6">
            <div className="mb-5 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#a8ff3e]" />
              <span className="font-mono text-xs text-white/40">Reading your repos and activity…</span>
            </div>
            <div className="space-y-2.5">
              <ShimmerSkeleton w="100%" h={12} />
              <ShimmerSkeleton w="85%" h={12} />
              <ShimmerSkeleton w="92%" h={12} />
              <ShimmerSkeleton w="70%" h={12} />
            </div>
          </div>
        )}

        {scoreError && !isAnalyzing && (
          <button
            onClick={onTriggerScore}
            className="min-h-11 w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left text-xs font-medium text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          >
            {scoreError} — tap to retry
          </button>
        )}

        {scoreResult && !isAnalyzing && (
          <div className="space-y-5">
            <FadeInView>
              <div className="flex items-center gap-5 rounded-2xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.04] p-5">
                <ScoreRing score={scoreResult.overallScore} />
                <div className="min-w-0">
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-white/40">Overall Score</p>
                  <p className="text-sm leading-snug text-white/80">
                    Based on {scoreResult.categories.length} real signals from your public activity — expand any category below for exactly why,
                    and what to do about it.
                  </p>
                </div>
              </div>
            </FadeInView>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {scoreResult.categories.map((cat, i) => (
                <CategoryCard key={cat.name} category={cat} delay={80 + i * 50} />
              ))}
            </div>

            <RoadmapCard roadmap={scoreResult.roadmap} delay={80 + scoreResult.categories.length * 50 + 80} />

            <button
              onClick={onTriggerScore}
              className="min-h-11 rounded px-1 text-xs font-medium text-white/40 hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60"
            >
              Re-score profile
            </button>
          </div>
        )}
      </div>

      <div className="lg:col-span-5">
        <MentorChat
          effectiveUsername={effectiveUsername}
          messages={chatMessages}
          inputValue={chatInput}
          onInputChange={onChatInputChange}
          isBotTyping={isBotTyping}
          onSendMessage={onSendChatMessage}
        />
      </div>
    </div>
  )
}
