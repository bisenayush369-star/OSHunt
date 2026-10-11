"use client"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ANALYSIS_CHAT_ENDPOINT, JSON_HEADERS, isAbort, pickReply, readError } from "./analysis-api"
import { ArrowRightIcon, BotIcon, SendIcon, StopIcon } from "./icons"
import type { ChatMessage } from "./types"

const mdComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
}

export function RepoChat({ owner, repo, suggestions }: { owner: string; repo: string; suggestions: string[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  useEffect(() => () => abortRef.current?.abort(), [])

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return

    const history: ChatMessage[] = [...messages, { role: "user", content: message }]
    setMessages(history)
    setInput("")
    setError("")
    setBusy(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(ANALYSIS_CHAT_ENDPOINT, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ owner, repo, messages: history }),
        signal: controller.signal,
      })
      if (!res.ok) throw new Error(await readError(res))
      const reply = pickReply(await res.json())
      if (!reply) throw new Error("The guide sent back an empty answer. Try asking again.")
      setMessages([...history, { role: "assistant", content: reply }])
      window.dispatchEvent(new CustomEvent("usage:updated"))
    } catch (err) {
      // Failed or stopped: drop the unanswered question and put it back in the box, so history stays clean
      // and retrying is one tap.
      setMessages(messages)
      setInput(message)
      if (!isAbort(err)) setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <div>
      <p className="mb-3 max-w-[64ch] text-[13px] leading-relaxed text-[#8a8a8a]">
        Ask anything about <span className="font-mono text-[#a8ff3e]">{repo}</span>. The guide only answers from this repo&apos;s README, docs and file list.
      </p>

      {messages.length > 0 && (
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-busy={busy}
          className="mb-3 flex max-h-[60dvh] flex-col gap-1 overflow-y-auto pr-1 sm:max-h-[420px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#a8ff3e]/20 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col py-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${m.role === "user" ? "text-[#a8ff3e]" : "text-[#888]"}`}>
                {m.role === "user" ? "You" : <><BotIcon size={12} /> Guide</>}
              </div>
              {m.role === "user" ? (
                <div className="max-w-[88%] rounded-xl rounded-br-[3px] border border-[#a8ff3e]/[0.18] bg-[#a8ff3e]/[0.08] px-3.5 py-2.5 text-[14px] leading-relaxed text-white [overflow-wrap:anywhere] sm:max-w-[78%]">
                  {m.content}
                </div>
              ) : (
                <div className="prose-dark max-w-full sm:max-w-[92%]">
                  <ReactMarkdown components={mdComponents}>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {busy && (
            <div role="status" className="flex items-center gap-2 py-2 text-[12.5px] text-[#8a8a8a]">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-[5px] animate-pulse rounded-full bg-[#a8ff3e] motion-reduce:animate-none" />
                <span className="size-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.2s] motion-reduce:animate-none" />
                <span className="size-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.4s] motion-reduce:animate-none" />
              </span>
              Thinking…
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.06] px-3.5 py-2.5 text-[13px] text-[#ff4d6d]">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy) void send(input)
        }}
        className="flex items-center gap-2 rounded-xl border border-[#1a1a1a] bg-[#050505] p-1.5 pl-3.5 transition-colors focus-within:border-[#a8ff3e]/40 focus-within:ring-4 focus-within:ring-[#a8ff3e]/[0.05]"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          autoComplete="off"
          enterKeyHint="send"
          aria-label={`Ask about ${repo}`}
          placeholder={`Ask about ${repo}…`}
          className="h-10 flex-1 border-0 bg-transparent p-0 text-base dark:bg-transparent text-white shadow-none placeholder:text-[#7a7a7a] focus-visible:ring-0 md:text-[13px]"
        />
        {busy ? (
          <Button
            key="stop"
            type="button"
            size="icon"
            onClick={(e) => {
              // Without the separate key + preventDefault, React reuses this node and flips it back to
              // type="submit" mid-click, so Stop would instantly re-send the question it just cancelled.
              e.preventDefault()
              abortRef.current?.abort()
            }}
            aria-label="Stop"
            title="Stop"
            className="size-11 shrink-0 rounded-lg bg-[#a8ff3e]/10 text-[#a8ff3e] hover:bg-[#a8ff3e] hover:text-black sm:size-10"
          >
            <StopIcon size={12} />
          </Button>
        ) : (
          <Button
            key="send"
            type="submit"
            size="icon"
            disabled={!input.trim()}
            aria-label="Send"
            title="Send"
            className="size-11 shrink-0 rounded-lg bg-[#a8ff3e]/10 text-[#a8ff3e] transition-colors hover:bg-[#a8ff3e] hover:text-black disabled:opacity-30 sm:size-10"
          >
            <SendIcon size={14} />
          </Button>
        )}
      </form>

      {messages.length === 0 && !busy && (
        <div className="mt-3 flex flex-col gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void send(q)}
              className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-[#a8ff3e]/[0.12] bg-[#a8ff3e]/[0.03] px-3.5 py-2.5 text-left text-[13px] text-[#aaa] transition-colors hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
            >
              <span className="min-w-0">{q}</span>
              <span aria-hidden="true" className="shrink-0 text-[#555] transition-colors group-hover:text-[#a8ff3e]"><ArrowRightIcon size={13} /></span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
