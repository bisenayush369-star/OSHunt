"use client"

import { useState } from "react"
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

  const fullName = (repo as any).fullName ?? (repo as any).full_name ?? `${(repo as any).owner?.login ?? ""}/${(repo as any).name ?? ""}`
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content ?? ""

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
      <DialogContent className="max-w-[440px] border-[#1a1a1a] bg-[#0a0a0a] text-[#e0e0e0]">
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-[13px] font-bold text-[#a8ff3e]">
            <BotIcon /> {fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[50vh] flex-col gap-3 overflow-y-auto py-1 pr-1">
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[12px] text-[#666]">
                Grounded in this repo&apos;s public metadata only — for a full codebase read, use Analyze instead.
              </p>
              {suggestions.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="cursor-pointer rounded-lg border border-[#a8ff3e]/[0.12] bg-[#a8ff3e]/[0.03] px-3 py-2 text-left text-[12px] text-[#aaa] transition-colors hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-xl rounded-br-[3px] border border-[#a8ff3e]/[0.18] bg-[#a8ff3e]/[0.08] px-3 py-2 text-[12.5px] text-white"
                    : "max-w-[92%] text-[12.5px] leading-relaxed text-[#ccc]"
                }
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-1.5 py-1 text-[#888]">
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e]" />
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.2s]" />
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.4s]" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.05] px-3 py-2 text-[12px] text-[#ff8fa3]">
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

        <div className="flex items-center gap-2 rounded-xl border border-[#1a1a1a] bg-black p-1.5 pl-3">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
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
            className="h-8 w-9 shrink-0 cursor-pointer rounded-lg bg-[#a8ff3e]/10 text-[#a8ff3e] hover:bg-[#a8ff3e] hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
          >
            <SendIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
