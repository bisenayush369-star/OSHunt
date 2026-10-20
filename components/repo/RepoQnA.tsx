"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GithubRepo } from "@/components/lib/github"
import type { RepoQnaMessage } from "@/components/lib/repo-types"
import { prefersReducedMotion } from "@/components/motion/FadeInView"
import { ACTION_BUTTON, ACTION_SIZE, AlertIcon, ArrowUpIcon, BotIcon, RetryIcon, SendIcon, SparklesIcon, cx } from "./repo-ui"

type RepoCardLike = GithubRepo & {
  fullName?: string
  full_name?: string
  owner?: { login?: string }
  name?: string
}

// Keep requests small: the server already gets the repo facts every time, so only the recent turns matter.
const MAX_HISTORY = 10
const MAX_QUESTION = 600

// The last few turns, starting on one of the user's. History always ends with the user's question, so it has an
// odd length and a plain slice(-10) would open with an assistant message — which chat APIs reject.
function recentTurns(history: RepoQnaMessage[]): RepoQnaMessage[] {
  const tail = history.slice(-MAX_HISTORY)
  const firstUser = tail.findIndex(m => m.role === "user")
  return firstUser > 0 ? tail.slice(firstUser) : tail
}

// ─── tiny, dependency-free renderer for the bits of Markdown models like to answer with ───────────────
// **bold**, `code`, [text](https://link), "- " / "1. " lists and "#" headings. Everything is built as React
// elements from plain text, so there is no HTML injection surface; links are limited to http(s), and the real
// host is always printed next to the link text (the model repeats whatever a repo's description tells it to,
// so "[Official docs](https://somewhere-else.example)" must not look like it goes where it says).
const INLINE = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g

function renderInline(text: string) {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.9em] text-[#e5e5e5]">
          {part.slice(1, -1)}
        </code>
      )
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part)
    if (link) {
      const [, label, href] = link
      let host = ""
      try {
        host = new URL(href).hostname.replace(/^www\./, "")
      } catch {
        // not a URL after all: fall through and show the text as it was written
      }
      if (host) {
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a8ff3e] underline underline-offset-2 hover:text-[#c4ff7a]"
            >
              {label}
            </a>
            {!label.toLowerCase().includes(host.toLowerCase()) && <span className="text-[#8a8a8a]"> ({host})</span>}
          </Fragment>
        )
      }
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

const BULLET = /^\s*[-*•]\s+/
const NUMBERED = /^\s*\d+[.)]\s+/

function FormattedAnswer({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, bi) => {
        const lines = block.split("\n")
        if (lines.every(l => BULLET.test(l))) {
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5 marker:text-[#a8ff3e]/70">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(BULLET, ""))}</li>
              ))}
            </ul>
          )
        }
        if (lines.every(l => NUMBERED.test(l))) {
          return (
            <ol key={bi} className="list-decimal space-y-1 pl-5 marker:text-[#a8ff3e]/70">
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(NUMBERED, ""))}</li>
              ))}
            </ol>
          )
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {/^#{1,6}\s/.test(l) ? <strong className="font-semibold text-white">{renderInline(l.replace(/^#{1,6}\s+/, ""))}</strong> : renderInline(l)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export function RepoQnA({ repo, className }: { repo: GithubRepo; className?: string }) {
  const [messages, setMessages] = useState<RepoQnaMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const chatScrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // True while a request is in flight. `loading` (state) lags a render behind, so two quick submits could both
  // get through; this can't.
  const busyRef = useRef(false)

  const repoMeta = repo as RepoCardLike
  const fullName =
    repoMeta.fullName ?? repoMeta.full_name ?? (repoMeta.owner?.login && repoMeta.name ? `${repoMeta.owner.login}/${repoMeta.name}` : repoMeta.name ?? "")
  const shortName = fullName.split("/")[1] || fullName || "this repo"
  const suggestions = [
    `What is ${shortName} used for?`,
    "How mature/stable does this look?",
    "What would I need to know to try it?",
  ]

  // `history` always ends with the user's question. Retrying after a failure sends the SAME history again
  // (the question is already in it) — the old version appended it a second time.
  //
  // Not aborted if the card unmounts mid-request: the server is already counting that AI call, and the
  // "usage:updated" refresh below should still happen when it finishes (state updates after unmount are ignored).
  const request = async (history: RepoQnaMessage[]) => {
    const question = history[history.length - 1]?.content ?? ""
    busyRef.current = true
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
          stars: repo.stars ?? repo.stargazers_count,
          topics: repo.topics,
          question,
          history: recentTurns(history),
        }),
      })
      const parsed = await res.json().catch(() => null)
      const data: { error?: unknown; answer?: unknown } = parsed && typeof parsed === "object" ? parsed : {}
      if (!res.ok) throw new Error(typeof data.error === "string" && data.error ? data.error : "The agent didn't respond.")
      const answer = typeof data.answer === "string" && data.answer.trim() ? data.answer : "…"
      setMessages([...history, { role: "assistant", content: answer }])
      // Notify dashboard to refresh usage after a successful AI call
      try {
        window.dispatchEvent(new CustomEvent("usage:updated"))
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      busyRef.current = false
      setLoading(false)
    }
  }

  const ask = (question: string) => {
    const q = question.trim().slice(0, MAX_QUESTION)
    if (!q || loading || busyRef.current) return
    const next = [...messages, { role: "user" as const, content: q }]
    setMessages(next)
    setInput("")
    void request(next)
  }

  const retry = () => {
    if (loading || busyRef.current || messages[messages.length - 1]?.role !== "user") return
    void request(messages)
  }

  const focusInput = () => inputRef.current?.focus({ preventScroll: true })

  // Stable ref callback: jump to the newest message when the dialog opens, without re-running on every render
  // (which would yank the scroll position back down while someone is reading older messages).
  const attachChat = useCallback((node: HTMLDivElement | null) => {
    chatScrollRef.current = node
    if (node) node.scrollTop = node.scrollHeight
  }, [])

  useEffect(() => {
    const el = chatScrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" })
  }, [messages, loading, error])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={event => event.stopPropagation()}
          className={cx(ACTION_BUTTON, ACTION_SIZE, "justify-center", className)}
        >
          <BotIcon />
          Ask AI
        </Button>
      </DialogTrigger>
      <DialogContent
        // The dialog is portalled, but React still bubbles its events up through the card — keep them in here.
        onClick={event => event.stopPropagation()}
        // Mouse/keyboard: focus the question box straight away. Touch: leave it alone, or the keyboard
        // pops up and hides the suggestions.
        onOpenAutoFocus={event => {
          if (window.matchMedia("(pointer: fine)").matches) {
            event.preventDefault()
            inputRef.current?.focus()
          }
        }}
        className={cx(
          "flex max-h-[min(40rem,calc(100dvh-2rem))] w-[calc(100%-1.5rem)] max-w-[34rem] flex-col gap-0 overflow-hidden rounded-2xl border-white/10 bg-[#0a0a0a] p-0 text-[#e5e5e5] shadow-2xl shadow-black/70 sm:max-w-[34rem] sm:rounded-2xl",
          // enlarge the built-in close button's tap target (it's the last child of the dialog)
          "[&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:rounded-lg [&>button:last-child]:p-2 [&>button:last-child]:text-[#c4c4c4] [&>button:last-child]:opacity-100 [&>button:last-child]:hover:bg-white/10 [&>button:last-child]:hover:text-white",
        )}
      >
        <DialogHeader className="shrink-0 gap-1.5 border-b border-white/[0.08] px-4 py-4 pr-14 text-left sm:px-5 sm:text-left">
          <DialogTitle className="flex min-w-0 items-center gap-2.5 text-[15px] font-semibold leading-tight text-white">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[#a8ff3e]/10 text-[#a8ff3e] ring-1 ring-[#a8ff3e]/20">
              <BotIcon className="size-4" />
            </span>
            <span className="min-w-0 truncate font-mono text-[13.5px]">{fullName || "this repository"}</span>
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-snug text-[#9a9a9a]">
            Answers are based on this repo&apos;s public metadata, so they&apos;re a quick orientation before you dive into the code.
          </DialogDescription>
        </DialogHeader>

        {/* role=log makes new answers get announced; the tab stop lets keyboard users scroll back through them. */}
        <div
          ref={attachChat}
          role="log"
          aria-label="Conversation"
          aria-live="polite"
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable with the keyboard
          tabIndex={0}
          className="flex min-h-[11rem] flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4 [scrollbar-color:#2b2b2b_transparent] [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]/50 sm:px-5"
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
                <SparklesIcon className="size-3.5 text-[#a8ff3e]" />
                Try asking
              </p>
              <ul className="flex flex-col gap-2">
                {suggestions.map(q => (
                  <li key={q}>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        ask(q)
                        // the suggestion list is replaced by the conversation; keep a mouse/keyboard user typing
                        if (window.matchMedia("(pointer: fine)").matches) focusInput()
                      }}
                      className="group h-auto min-h-11 w-full justify-between gap-3 whitespace-normal rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-left text-[14px] font-normal leading-snug text-[#d4d4d4] shadow-none transition-colors hover:border-[#a8ff3e]/30 hover:bg-[#a8ff3e]/[0.05] hover:text-white focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0 motion-reduce:transition-none"
                    >
                      <span>{q}</span>
                      <ArrowUpIcon className="size-4 shrink-0 rotate-45 text-[#8a8a8a] transition-colors group-hover:text-[#a8ff3e]" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={cx("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
              <div className="px-1 text-[11px] font-medium text-[#8a8a8a]">{m.role === "user" ? "You" : "AI"}</div>
              <div
                className={cx(
                  "max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-6 [overflow-wrap:anywhere]",
                  m.role === "user"
                    ? "whitespace-pre-wrap rounded-br-md border border-[#a8ff3e]/25 bg-[#a8ff3e]/10 text-white"
                    : "rounded-bl-md border border-white/[0.08] bg-white/[0.04] text-[#d4d4d4]",
                )}
              >
                {m.role === "user" ? m.content : <FormattedAnswer text={m.content} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 self-start rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.04] px-3.5 py-3 text-[13px] text-[#9a9a9a]">
              <span aria-hidden="true" className="flex gap-1">
                <span className="size-1.5 rounded-full bg-[#a8ff3e] motion-safe:animate-pulse" />
                <span className="size-1.5 rounded-full bg-[#a8ff3e] motion-safe:animate-pulse [animation-delay:0.2s]" />
                <span className="size-1.5 rounded-full bg-[#a8ff3e] motion-safe:animate-pulse [animation-delay:0.4s]" />
              </span>
              Gathering context from the repo…
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-[#ff4d6d]/25 bg-[#ff4d6d]/[0.06] px-3 py-2.5 text-[13px] leading-snug text-[#ff9fb0]"
            >
              <span className="flex min-w-0 items-start gap-2">
                <AlertIcon className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{error}</span>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={retry}
                disabled={loading}
                className="h-11 shrink-0 gap-1.5 rounded-md border border-[#a8ff3e]/30 bg-[#a8ff3e]/[0.08] px-2.5 text-[13px] font-semibold text-[#a8ff3e] shadow-none has-[>svg]:px-2.5 sm:h-9 hover:border-[#a8ff3e]/50 hover:bg-[#a8ff3e]/15 hover:text-[#a8ff3e] focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0"
              >
                <RetryIcon className="size-3.5" />
                Retry
              </Button>
            </div>
          )}
        </div>

        <form
          onSubmit={event => {
            event.preventDefault()
            ask(input)
            // Send was pressed with the keyboard (or tapped): it is about to go disabled, so hand focus back.
            if (document.activeElement !== inputRef.current) focusInput()
          }}
          className="shrink-0 border-t border-white/[0.08] bg-[#080808] p-3 sm:p-4"
        >
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 p-1.5 pl-3.5 transition-[border-color,box-shadow] duration-200 focus-within:border-[#a8ff3e]/50 focus-within:ring-2 focus-within:ring-[#a8ff3e]/25 motion-reduce:transition-none">
            <Input
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Ask about this repo…"
              aria-label={`Ask a question about ${fullName || "this repository"}`}
              maxLength={MAX_QUESTION}
              autoComplete="off"
              enterKeyHint="send"
              // 16px on phones stops iOS from zooming the page when the field is focused
              className="h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 text-base text-white shadow-none placeholder:text-[#7d7d7d] focus-visible:border-transparent focus-visible:ring-0 sm:h-9 sm:text-sm dark:bg-transparent"
            />
            <Button
              type="submit"
              size="icon"
              disabled={loading || !input.trim()}
              aria-label="Send question"
              // keep focus in the text box when the button is clicked, so the keyboard stays open on phones
              onMouseDown={event => event.preventDefault()}
              className="size-11 shrink-0 rounded-lg bg-[#a8ff3e] text-black sm:size-9 shadow-none transition-colors hover:bg-[#c4ff7a] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0 disabled:bg-white/[0.06] disabled:text-[#6a6a6a] disabled:opacity-100 motion-reduce:transition-none"
            >
              <SendIcon className="size-4" />
            </Button>
          </div>
          <p className="mt-2 hidden text-[11px] leading-snug text-[#7d7d7d] sm:block">
            AI answers can be wrong — double-check anything important on GitHub.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}