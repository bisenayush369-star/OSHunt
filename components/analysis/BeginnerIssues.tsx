"use client"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Issue = { number: number; title: string; body: string; url: string; comments: number; claimed: boolean; created: string }
type GithubIssueSummary = {
  number?: number;
  title?: string;
  body?: string | null;
  html_url?: string;
  comments?: number;
  assignee?: { login?: string } | null;
  assignees?: Array<{ login?: string }> | null;
  pull_request?: unknown;
  created_at?: string;
};

const cache = new Map<string, { list: Issue[]; via: string }>()
const age = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); return d < 1 ? "today" : d < 60 ? `${d} days ago` : `${Math.round(d / 30)} months ago` }

async function load(full: string, label: string): Promise<Issue[]> {
  const r = await fetch(`https://api.github.com/repos/${full}/issues?labels=${encodeURIComponent(label)}&state=open&per_page=10`, { headers: { Accept: "application/vnd.github+json" } })
  if (r.status === 403 || r.status === 429) throw new Error("GitHub is limiting requests right now. Try again in a few minutes.")
  if (!r.ok) throw new Error("Could not load issues for this repository.")
  return ((await r.json()) as GithubIssueSummary[]).filter((i) => !i.pull_request).map((i) => ({
    number: i.number ?? 0,
    title: i.title ?? "Untitled issue",
    body: String(i.body ?? "").slice(0, 700),
    url: i.html_url ?? `https://github.com/${full}/issues`,
    comments: i.comments ?? 0,
    claimed: !!i.assignee || (i.assignees?.length ?? 0) > 0,
    created: i.created_at ?? new Date().toISOString(),
  }))
}

export function BeginnerIssues({ full, onAsk }: { full: string; onAsk: (text: string, ctx?: string) => void }) {
  const [data, setData] = useState<{ list: Issue[]; via: string } | null>(cache.get(full) ?? null)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (cache.has(full)) return
    let live = true
    ;(async () => {
      try {
        let via = "good first issue"
        let list = await load(full, via)
        if (!list.length) { via = "help wanted"; list = await load(full, via) }
        cache.set(full, { list, via })
        if (live) setData({ list, via })
      } catch (e) { if (live) setErr(e instanceof Error ? e.message : "Could not load issues.") }
    })()
    return () => { live = false }
  }, [full])

  if (err) return <p role="alert" className="text-sm text-[#ff4d6d]">{err}</p>
  if (!data) return <div aria-busy="true" className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>
  if (!data.list.length) return (
    <p className="text-sm text-[#8a8a8a]">No open issues are labelled for beginners right now. <a href={`https://github.com/${full}/issues`} target="_blank" rel="noreferrer" className="text-[#a8ff3e] underline">Browse all issues on GitHub</a></p>
  )

  const sorted = [...data.list].sort((a, b) => Number(a.claimed) - Number(b.claimed) || +new Date(b.created) - +new Date(a.created))
  return (
    <div>
      {data.via !== "good first issue" && <p className="mb-4 text-sm text-[#8a8a8a]">This repo has no beginner label, so these are labelled {data.via} instead.</p>}
      <ul className="space-y-3">
        {sorted.map((i) => (
          <li key={i.number} className="rounded-xl border border-[#1a1a1a] p-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className="font-mono text-[#a8ff3e]">#{i.number}</span>
              <Badge variant="outline" className={i.claimed ? "border-[#ffb84d]/40 text-[#ffb84d]" : "border-[#a8ff3e]/40 text-[#a8ff3e]"}>{i.claimed ? "Someone is on it" : "Free to take"}</Badge>
              <span className="text-[#8a8a8a]">{i.comments} {i.comments === 1 ? "comment" : "comments"}</span>
              <span className="text-[#8a8a8a]">Opened {age(i.created)}</span>
            </div>
            <p className="mt-2 break-words font-medium text-white">{i.title}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" className="h-11 cursor-pointer bg-[#a8ff3e] px-4 text-black hover:bg-[#bdff6b]"
                onClick={() => onAsk(`Explain issue #${i.number} in very simple words.`, `Issue title: ${i.title}\nIssue text:\n${i.body || "(no description)"}\n\nTell me what it asks for, which files I would probably change, and my first step.`)}>
                Explain it to me
              </Button>
              <Button asChild variant="outline" className="h-11 border-[#1a1a1a] bg-transparent text-white hover:bg-white/5">
                <a href={i.url} target="_blank" rel="noreferrer">Open on GitHub</a>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
