"use client"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Header } from "./Header"
import { LiveActivityTab } from "./LiveActivityTab"
import { ScoreTab } from "./ScoreTab"
import { ProfileCheckupTab } from "./ProfileCheckupTab"
import type {
  ActivityInsights,
  ChatMessage,
  ClusterMetrics,
  ClusterTab,
  GitHubClusterSectionProps,
  ProfileScoreResult,
  RawContext,
  TimelineItem,
} from "./types"

const EMPTY_METRICS: ClusterMetrics = { totalRepos: 0, activeBugs: 0, gitVelocity: "Loading...", lastContributionTime: "Fetching..." }

const TAB_TRIGGER_CLASS =
  "shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-white/50 data-[state=active]:border data-[state=active]:border-[#a8ff3e]/20 data-[state=active]:bg-[#a8ff3e]/10 data-[state=active]:text-[#a8ff3e] data-[state=active]:shadow-none"

export default function GitHubClusterSection({ username = "torvalds", connected = false, plan = "free", avatarUrl, stats }: GitHubClusterSectionProps) {
  const [activeTab, setActiveTab] = useState<ClusterTab>("overview")

  // Data shared across tabs — owned here (not inside the tab components) so
  // it isn't lost when shadcn's Tabs unmounts inactive panels.
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ClusterMetrics>(EMPTY_METRICS)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [rawContext, setRawContext] = useState<RawContext | null>(null)
  const [clusterInsight, setClusterInsight] = useState<string | null>(null)
  const [activityInsights, setActivityInsights] = useState<ActivityInsights | null>(null)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scoreResult, setScoreResult] = useState<ProfileScoreResult | null>(null)
  const [scoreError, setScoreError] = useState<string | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isBotTyping, setIsBotTyping] = useState(false)

  // Disconnected users can have `username` fall back to a display name that
  // was never a real GitHub handle — route them to the public demo account
  // instead of attempting (and failing) a live fetch with a bad username.
  const effectiveUsername = connected ? username : "torvalds"

  const fetchRawGitHubData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cluster?username=${effectiveUsername}`)
      if (!res.ok) throw new Error("Failed to pull live GitHub API telemetry.")
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMetrics(data.metrics)
      setTimeline(data.timeline)
      setRawContext(data.rawContext)
      setClusterInsight(data.clusterInsight || null)
      setActivityInsights(data.activityInsights || null)
      setMessages([
        {
          id: "m1",
          sender: "bot",
          text: `Connected to @${data.rawContext.username}. Found ${data.metrics.totalRepos} repos utilizing ${data.rawContext.topLanguages.join(", ")}. Ready to score your profile whenever you are.`,
          time: "Just now",
        },
      ])
    } catch (err: any) {
      setError(err.message || "Network error fetching GitHub API.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRawGitHubData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveUsername])

  const triggerScore = async () => {
    if (!rawContext) return
    setIsAnalyzing(true)
    setScoreResult(null)
    setScoreError(null)
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContext, promptType: "diagnostic" }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Scoring failed.")
      setScoreResult(data.result)
      // Refresh usage on successful diagnostic/score run
      try { window.dispatchEvent(new CustomEvent("usage:updated")) } catch (e) { /* ignore */ }
    } catch (err: any) {
      setScoreError(err.message || "Failed to score your profile. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !rawContext) return
    const userText = chatInput
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: userText, time: "Just now" }])
    setChatInput("")
    setIsBotTyping(true)
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContext, promptType: "question", userQuestion: userText }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: data.result || data.error || "No response.", time: "Just now" }])
      // Refresh usage after an interactive diagnostic message
      try { window.dispatchEvent(new CustomEvent("usage:updated")) } catch (e) { /* ignore */ }
    } catch {
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: "Error communicating with AI mentor.", time: "Just now" }])
    } finally {
      setIsBotTyping(false)
    }
  }

  return (
    <section
      className="w-full bg-[#090909] px-4 py-12 text-white sm:px-6 sm:py-16"
      style={{ fontFamily: '"Outfit", "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <div className="mx-auto w-full max-w-5xl">
        <Header
          username={username}
          connected={connected}
          plan={plan}
          avatarUrl={avatarUrl}
          isLoading={isLoading}
          error={error}
          connectedUsername={rawContext?.username}
          effectiveUsername={effectiveUsername}
          onRescan={fetchRawGitHubData}
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ClusterTab)}>
          <TabsList className="mb-6 flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1 font-mono">
            <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
              Live Activity
            </TabsTrigger>
            <TabsTrigger value="career" className={TAB_TRIGGER_CLASS}>
              My Score
            </TabsTrigger>
            <TabsTrigger value="checkup" className={TAB_TRIGGER_CLASS}>
              Profile Checkup
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <LiveActivityTab
              metrics={metrics}
              timeline={timeline}
              clusterInsight={clusterInsight}
              activityInsights={activityInsights}
              isLoading={isLoading}
              error={error}
            />
          </TabsContent>

          <TabsContent value="career">
            <ScoreTab
              rawContext={rawContext}
              effectiveUsername={effectiveUsername}
              isAnalyzing={isAnalyzing}
              scoreResult={scoreResult}
              scoreError={scoreError}
              onTriggerScore={triggerScore}
              chatMessages={messages}
              chatInput={chatInput}
              onChatInputChange={setChatInput}
              isBotTyping={isBotTyping}
              onSendChatMessage={handleSendMessage}
            />
          </TabsContent>

          <TabsContent value="checkup">
            <ProfileCheckupTab effectiveUsername={effectiveUsername} rawContext={rawContext} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}
