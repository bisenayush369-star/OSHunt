"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "./types"

interface MentorChatProps {
  effectiveUsername: string
  messages: ChatMessage[]
  inputValue: string
  onInputChange: (value: string) => void
  isBotTyping: boolean
  onSendMessage: (e: React.FormEvent) => void
}

export function MentorChat({ effectiveUsername, messages, inputValue, onInputChange, isBotTyping, onSendMessage }: MentorChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isBotTyping])

  return (
    <div className="flex h-[420px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] sm:h-[480px]">
      <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3 font-mono">
        <span className="flex items-center gap-2 text-xs font-bold tracking-wide">
          <span className="h-2 w-2 rounded-full bg-[#a8ff3e]" />
          AI MENTOR // Context: @{effectiveUsername}
        </span>
      </div>

      <ScrollArea className="flex-1 bg-black/10">
        <div className="space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex max-w-[85%] flex-col rounded-xl px-3.5 py-2.5 text-xs leading-relaxed",
                msg.sender === "user" ? "ml-auto border border-white/10 bg-white/5 font-mono text-white" : "mr-auto border border-white/5 bg-[#121212] text-white/90"
              )}
            >
              {msg.sender === "bot" ? (
                <div className="prose-chat">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{msg.text}</div>
              )}
            </div>
          ))}
          {isBotTyping && <div className="p-2 font-mono text-xs text-white/40">Thinking it through…</div>}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={onSendMessage} className="flex gap-2 border-t border-white/5 bg-black/50 p-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Which repo should I contribute to next?"
          aria-label="Message the AI mentor"
          className="h-11 flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-xs text-white focus-visible:border-[#a8ff3e]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/30"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || isBotTyping}
          className="h-11 w-11 shrink-0 rounded-lg bg-[#a8ff3e] p-0 text-black hover:bg-[#a8ff3e]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>

      <style>{`
        .prose-chat p { margin: 0 0 0.5em; }
        .prose-chat p:last-child { margin-bottom: 0; }
        .prose-chat ul, .prose-chat ol { margin: 0.3em 0 0.5em; padding-left: 1.1em; }
        .prose-chat li { margin-bottom: 0.2em; }
        .prose-chat strong { color: white; font-weight: 600; }
        .prose-chat code { background: rgba(255,255,255,0.08); padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.95em; }
      `}</style>
    </div>
  )
}
