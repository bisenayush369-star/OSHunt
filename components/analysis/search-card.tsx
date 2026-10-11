"use client"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { parseRepo, repoKey } from "./parse-repo"
import { ArrowRightIcon, SearchIcon } from "./icons"
import type { RepoRef } from "./types"

type Props = {
  /** Text to start with (from the URL). The page remounts this card when the URL changes. */
  initial: string
  initialError?: string
  busy: boolean
  examples: string[]
  onSubmit: (repo: RepoRef) => void
}

export function SearchCard({ initial, initialError = "", busy, examples, onSubmit }: Props) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState(initialError)
  const inputId = useId()
  const errorId = useId()

  function submit(raw: string) {
    const parsed = parseRepo(raw)
    if (!parsed) {
      setError("That doesn't look like a GitHub repo. Use owner/name, or paste the link.")
      return
    }
    setError("")
    setValue(repoKey(parsed))
    onSubmit(parsed)
  }

  return (
    <Card className="mb-8 gap-0 rounded-2xl border-[#141414] bg-[#0a0a0a] py-0 shadow-[0_1px_0_rgba(255,255,255,0.02)_inset] sm:mb-10">
      <CardContent className="p-4 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit(value)
          }}
          noValidate
        >
          <label htmlFor={inputId} className="mb-3 block font-mono text-[11px] uppercase tracking-[0.15em] text-[#8a8a8a]">
            GitHub repo
          </label>

          <div className="flex flex-col gap-2 rounded-xl border border-[#141414] bg-black p-2 transition-colors focus-within:border-[#a8ff3e]/40 focus-within:ring-4 focus-within:ring-[#a8ff3e]/[0.06] data-[invalid=true]:border-[#ff4d6d]/40 sm:flex-row sm:items-center sm:p-1.5 sm:pl-4" data-invalid={Boolean(error)}>
            <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 sm:px-0">
              <span className="flex shrink-0 text-[#a8ff3e]"><SearchIcon size={16} /></span>
              <Input
                id={inputId}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (error) setError("")
                }}
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                enterKeyHint="go"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
                placeholder="owner/repo or https://github.com/owner/repo"
                className="h-11 min-w-0 flex-1 border-0 bg-transparent p-0 font-mono dark:bg-transparent text-base text-white shadow-none placeholder:text-[#7a7a7a] focus-visible:ring-0 sm:h-10 md:text-[13px]"
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !value.trim()}
              className="group h-11 w-full shrink-0 gap-2 rounded-lg bg-[#a8ff3e] px-5 text-[13px] font-bold text-black transition-colors hover:bg-[#bdff6b] disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
            >
              {busy ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black motion-reduce:animate-none" />
                  Analyzing
                </>
              ) : (
                <>
                  Analyze
                  <span className="flex transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"><ArrowRightIcon size={13} /></span>
                </>
              )}
            </Button>
          </div>

          {error && (
            <p id={errorId} role="alert" className="mt-2.5 text-[12.5px] text-[#ff4d6d]">
              {error}
            </p>
          )}
        </form>

        {examples.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-[#8a8a8a]">try:</span>
            {examples.map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy}
                onClick={() => submit(r)}
                className="min-h-10 rounded-md border border-[#1a1a1a] px-3 py-2 font-mono text-[11.5px] text-[#9a9a9a] transition-colors hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50 disabled:opacity-40 sm:min-h-8 sm:py-1"
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
