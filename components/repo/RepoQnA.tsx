"use client"

import { useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GithubRepo } from "@/lib/github"
import type { RepoQnaMessage } from "@/lib/repo-types"

type RepoCardLike = GithubRepo & {
  fullName?: string
  full_name?: string
  owner?: { login?: string }
  name?: string
}

const BotIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M12 8V4M8 4h8" />
    <circle cx="8.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
  </svg>
)
const SendIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
)

export function RepoQnA({ repo }: { repo: GithubRepo }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<RepoQnaMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const repoMeta = repo as RepoCardLike
  const fullName = repoMeta.fullName ?? repoMeta.full_name ?? `${repoMeta.owner?.login ?? ""}/${repoMeta.name ?? ""}`
  const shortName = (fullName && fullName.split("/")[1]) ?? fullName
  const suggestions = [
    `What is ${shortName} used for?`,
    "How mature/stable does this look?",
    "What would I need to know to try it?",
  ]

  const ask = async (question: string) => {
    const q = question.trim()
    if (!q || loading) return
    const next = [...messages, { role: "user" as const, content: q }]
    setMessages(next)
    setInput("")
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/repo-qna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoName: fullName,
          description: repo.description,
          language: repo.language,
          stars: repo.stars,
          topics: repo.topics,
          question: q,
          history: next,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "The agent didn't respond.")
      setMessages([...next, { role: "assistant", content: data.answer ?? "…" }])
      // Notify dashboard to refresh usage after a successful AI call
      try { window.dispatchEvent(new CustomEvent("usage:updated")) } catch (e) { /* ignore */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? ""

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, loading])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-[#1a1a1a] bg-[#050505] px-2.5 text-[12px] text-[#888] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e]"
        >
          <BotIcon /> Ask AI
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(92vw,520px)] border-[#1a1a1a] bg-[#090909]/95 p-0 text-[#e0e0e0] shadow-2xl shadow-black/40 sm:max-w-[520px]">
        <DialogHeader className="border-b border-[#141414] bg-[#050505]/90 px-4 py-4 sm:px-5">
          <DialogTitle className="flex items-center gap-2 font-mono text-[13px] font-semibold text-[#a8ff3e]">
            <BotIcon /> {fullName}
          </DialogTitle>
          <p className="mt-1 text-[12px] text-[#666]">
            Grounded in this repo&apos;s public metadata — ideal for quick context before diving into the code.
          </p>
        </DialogHeader>

        <div
          ref={chatScrollRef}
          className="flex max-h-[67vh] flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5 sm:max-h-[420px] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#2b2b2b]"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#141414] bg-[#0a0a0a]/90 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#666]">Quick prompts</p>
                <span className="rounded-full border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 px-2 py-0.5 text-[10px] text-[#a8ff3e]">
                  Context-aware
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => ask(q)}
                    className="cursor-pointer rounded-xl border border-[#1f1f1f] bg-[#111111] px-3 py-2.5 text-left text-[12px] text-[#bdbdbd] transition-all duration-200 hover:border-[#a8ff3e]/25 hover:bg-[#161616] hover:text-[#a8ff3e]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className="mb-1 text-[10px] uppercase tracking-[0.24em] text-[#666]">
                {m.role === "user" ? "You" : "AI agent"}
              </div>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[88%] rounded-2xl rounded-br-[4px] border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 px-3 py-2 text-[12.5px] leading-6 text-white shadow-sm shadow-black/20"
                    : "max-w-[94%] rounded-2xl border border-[#141414] bg-[#0f0f0f] px-3 py-2 text-[12.5px] leading-6 text-[#ccc]"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2 rounded-2xl border border-[#141414] bg-[#0f0f0f] px-3 py-2 text-[#888]">
              <span className="mt-1.5 h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e]" />
              <span className="mt-1.5 h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.2s]" />
              <span className="mt-1.5 h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.4s]" />
              <span className="text-[12px] text-[#7a7a7a]">Gathering context from the repo metadata…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#ff4d6d]/20 bg-[#ff4d6d]/5 px-3 py-2 text-[12px] text-[#ff8fa3]">
              {error}
              <button
                type="button"
                onClick={() => ask(lastUserMessage)}
                className="cursor-pointer font-semibold text-[#a8ff3e] hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-[#141414] bg-[#050505]/90 p-3 sm:p-4">
          <div className="flex items-center gap-2 rounded-2xl border border-[#1a1a1a] bg-black/80 p-1.5 pl-3 shadow-inner shadow-black/40 transition-all duration-200 focus-within:border-[#a8ff3e]/35 focus-within:bg-[#0b0b0b]">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask(input)
              }}
              placeholder="Ask about this repo…"
              className="h-8 flex-1 border-0 bg-transparent p-0 text-[12.5px] text-white shadow-none placeholder:text-[#4d4d4d] focus-visible:ring-0"
            />
            <Button
              type="button"
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-8 w-9 shrink-0 cursor-pointer rounded-xl bg-[#a8ff3e]/10 text-[#a8ff3e] transition-all duration-200 hover:bg-[#a8ff3e] hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
