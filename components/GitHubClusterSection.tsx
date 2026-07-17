"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const GitMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>);
const TerminalMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>);
const SendMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>);
const SpinnerMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={cn("animate-spin", className)} fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>);

export default function GitHubClusterSection({ username = "torvalds" }: { username?: string }) {
  const [activeTab, setActiveTab] = useState<"overview" | "ai-assistant">("overview");
  const [isTabPending, startTabTransition] = useTransition();
  
  // LIVE RAW DATA STATE
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ totalRepos: 0, activeBugs: 0, totalContributions: 0, gitVelocity: "Loading...", lastContributionTime: "Fetching..." });
  const [timeline, setTimeline] = useState<any[]>([]);
  const [rawContext, setRawContext] = useState<any>(null);

  // AI & CHAT STATE
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. FETCH FROM YOUR EXACT ROUTE: /api/cluster
  const fetchRawGitHubData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cluster?username=${username}`);
      if (!res.ok) throw new Error("Failed to pull live GitHub API telemetry.");
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setMetrics(data.metrics);
      setTimeline(data.timeline);
      setRawContext(data.rawContext);
      setMessages([
        { id: "m1", sender: "bot", text: `Connected to @${data.rawContext.username}. Found ${data.metrics.totalRepos} repos utilizing ${data.rawContext.topLanguages.join(", ")}. What would you like to optimize today?`, time: "Just now" }
      ]);
    } catch (err: any) {
      setError(err.message || "Network error fetching GitHub API.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRawGitHubData();
  }, [username]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  // 2. CALL YOUR EXACT ROUTE: /api/diagnostic (For AI diagnostic button)
  const triggerAiDiagnostic = async () => {
    if (!rawContext) return;
    setIsAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContext, promptType: "diagnostic" })
      });
      const data = await res.json();
      setAiAnalysisResult(data.result);
    } catch {
      setAiAnalysisResult("Failed to generate AI analysis. Please check your API endpoint.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. CALL YOUR EXACT ROUTE: /api/diagnostic (For chatbot queries)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !rawContext) return;

    const userText = inputValue;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: "user", text: userText, time: "Just now" }]);
    setInputValue("");
    setIsBotTyping(true);

    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawContext, promptType: "question", userQuestion: userText })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: data.result, time: "Just now" }]);
    } catch {
      setMessages((prev) => [...prev, { id: `b-${Date.now()}`, sender: "bot", text: "Error communicating with AI optimizer.", time: "Just now" }]);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <section className="w-full px-4 py-12 sm:px-6 sm:py-16 text-white bg-[#090909]">
      <div className="mx-auto w-full max-w-5xl">
        
        {/* Header with Live Sync Status */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="border-[#a8ff3e]/20 bg-[#a8ff3e]/10 text-[#a8ff3e] font-mono text-[11px]">
                LIVE REST API PIPELINE
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs text-white/40 font-mono">
                <span className={cn("h-2 w-2 rounded-full", isLoading ? "bg-amber-400 animate-ping" : "bg-[#a8ff3e] animate-pulse")} />
                {isLoading ? "Scraping GitHub Servers..." : `Connected: @${username}`}
              </span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight font-sans">
              GitHub Raw Telemetry Console
            </h2>
          </div>
          
          <Button 
            onClick={fetchRawGitHubData}
            disabled={isLoading}
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-mono text-xs px-4 py-2 rounded-lg transition-all"
          >
            {isLoading ? <SpinnerMark className="h-4 w-4 mr-2" /> : "Force Live Scan ↻"}
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 font-mono text-xs">
            [API ERROR]: {error}. Make sure the username is valid or your GitHub token is set.
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6 inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1 font-mono">
          <button
            onClick={() => startTabTransition(() => setActiveTab("overview"))}
            className={cn("rounded-lg px-4 py-2 text-xs font-semibold transition-all", activeTab === "overview" ? "bg-[#a8ff3e]/10 text-[#a8ff3e] border border-[#a8ff3e]/20" : "text-white/50 hover:text-white/80")}
          >
            Raw Overview & Timeline
          </button>
          <button
            onClick={() => startTabTransition(() => setActiveTab("ai-assistant"))}
            className={cn("rounded-lg px-4 py-2 text-xs font-semibold transition-all", activeTab === "ai-assistant" ? "bg-[#a8ff3e]/10 text-[#a8ff3e] border border-[#a8ff3e]/20" : "text-white/50 hover:text-white/80")}
          >
            AI Profile Optimizer
          </button>
        </div>

        {/* Tab 1: Live Overview */}
        {activeTab === "overview" && (
          <div className={cn("space-y-6 transition-opacity", isLoading && "opacity-40")}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 font-mono">
              <Card className="border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider">Total Repositories</span>
                <span className="text-3xl font-bold text-white mt-2">{metrics.totalRepos}</span>
              </Card>

              <Card className="border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider">Open Repo Issues</span>
                <span className={cn("text-3xl font-bold mt-2", metrics.activeBugs > 0 ? "text-amber-400" : "text-[#a8ff3e]")}>{metrics.activeBugs}</span>
              </Card>

              <Card className="border-white/10 bg-white/[0.01] p-4 flex flex-col justify-between">
                <span className="text-xs text-white/40 uppercase tracking-wider">Recent Velocity</span>
                <span className="text-lg font-bold text-white mt-2 block truncate">{metrics.gitVelocity}</span>
              </Card>

              <Card className="border-white/10 bg-[#a8ff3e]/[0.02] border-[#a8ff3e]/20 p-4 flex flex-col justify-between">
                <span className="text-xs text-[#a8ff3e]/70 uppercase tracking-wider">Last Activity</span>
                <span className="text-md font-bold text-white mt-2 block truncate">{metrics.lastContributionTime}</span>
              </Card>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase font-mono text-white/60 tracking-wider flex items-center gap-2">
                <TerminalMark className="h-4 w-4 text-[#a8ff3e]" />
                Live Public GitHub Timeline (Raw /events API)
              </h3>
              
              <div className="space-y-2.5">
                {timeline.length === 0 ? (
                  <div className="p-8 text-center border border-white/5 rounded-xl text-white/40 font-mono text-xs">
                    No recent public events found on GitHub servers.
                  </div>
                ) : (
                  timeline.map((step) => (
                    <div key={step.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-3.5 flex items-start gap-3 hover:border-white/10 transition-colors">
                      <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", step.type === "pr" ? "bg-[#a8ff3e]" : step.type === "commit" ? "bg-blue-400" : "bg-amber-400")} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white/90">
                          {step.action} <span className="text-white/35 font-mono text-xs">// {step.target}</span>
                        </p>
                        <span className="text-[11px] font-mono text-white/40 mt-1 block">{step.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Optimizer */}
        {activeTab === "ai-assistant" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-5 space-y-4">
                <h3 className="text-sm font-semibold uppercase font-mono text-white/70">Raw Data AI Optimizer</h3>
                <p className="text-xs text-white/40 font-mono leading-relaxed">
                  Sends your real repository names, language distribution, and star count to the LLM for deep analysis.
                </p>

                <Button
                  onClick={triggerAiDiagnostic}
                  disabled={isAnalyzing || !rawContext}
                  className="w-full bg-[#a8ff3e] text-black font-semibold text-xs hover:bg-[#a8ff3e]/90 py-2.5 rounded-lg flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? <><SpinnerMark className="h-4 w-4" /> Analyzing Repos...</> : "Generate Makeover From Live Data ⚡"}
                </Button>

                {aiAnalysisResult && (
                  <div className="rounded-xl border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.02] p-4 text-xs font-mono text-white/80 space-y-2 whitespace-pre-wrap leading-relaxed">
                    {aiAnalysisResult}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] flex flex-col h-[460px] overflow-hidden">
                <div className="border-b border-white/5 bg-black/40 px-4 py-3 flex items-center justify-between font-mono">
                  <span className="text-xs font-bold tracking-wide flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#a8ff3e]" />
                    AI ASSISTANT // Context: @{username}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/10">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs font-mono leading-relaxed", msg.sender === "user" ? "bg-white/5 border border-white/10 text-white ml-auto" : "bg-[#121212] border border-white/5 text-white/90 mr-auto")}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  ))}
                  {isBotTyping && <div className="text-xs font-mono text-white/40 p-2">AI is reading your GitHub stack...</div>}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-white/5 bg-black/50 p-3 flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Ask how to optimize your real repos or claim badges..."
                    className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#a8ff3e]/40"
                  />
                  <Button type="submit" disabled={!inputValue.trim() || isBotTyping} className="bg-[#a8ff3e] text-black hover:bg-[#a8ff3e]/90 p-2 rounded-lg">
                    <SendMark className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}