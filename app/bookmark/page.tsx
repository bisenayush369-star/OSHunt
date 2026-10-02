"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bookmark, CircleDot, FolderGit2, Trash2, Loader2, X, Sparkles } from "lucide-react"

import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import "@/components/discovery/discovery.css"
import { timeAgo } from "@/components/lib/discovery/utils"

type BookmarkType = "issue" | "repo"

type BookmarkItem = {
  id: string
  url: string
  title: string
  repoName: string
  type: BookmarkType
  createdAt: string
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [filter, setFilter] = useState<"all" | BookmarkType>("all")
  const [removing, setRemoving] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [proposalOpenId, setProposalOpenId] = useState<string | null>(null)
  const [proposalTexts, setProposalTexts] = useState<Record<string, string>>({})
  const [copiedIds, setCopiedIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    setLoadError(false)
    fetch("/api/bookmark")
      .then((r) => {
        if (r.status === 401) {
          setBookmarks([])
          setLoading(false)
          return []
        }
        if (!r.ok) throw new Error("Request failed")
        return r.json()
      })
      .then((data) => {
        setBookmarks(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoading(false)
      })
  }

  async function remove(url: string) {
    setRemoving(url)
    setActionError(null)
    const removedId = bookmarks.find((b) => b.url === url)?.id
    setBookmarks((prev) => prev.filter((b) => b.url !== url))
    if (removedId) {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(removedId)
        return next
      })
    }

    try {
      const res = await fetch("/api/bookmark", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error("Delete failed")
    } catch {
      setBookmarks((prev) => {
        const item = bookmarks.find((b) => b.url === url)
        if (!item) return prev
        return [item, ...prev]
      })
      setActionError("Couldn't remove that bookmark. Try again.")
    } finally {
      setRemoving(null)
    }
  }

  async function bulkDelete() {
    const targets = bookmarks.filter((b) => selected.has(b.id))
    if (targets.length === 0) return
    setBulkDeleting(true)
    setActionError(null)
    const ids = new Set(targets.map((b) => b.id))
    setBookmarks((prev) => prev.filter((b) => !ids.has(b.id)))
    setSelected(new Set())

    try {
      const res = await fetch("/api/bookmark", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: targets.map((b) => b.url) }),
      })
      if (!res.ok) throw new Error("Bulk delete failed")
    } catch {
      setBookmarks((prev) => [...prev, ...targets.filter((b) => !prev.some((item) => item.id === b.id))])
      setActionError("Couldn't delete the selected bookmarks. Try again.")
    } finally {
      setBulkDeleting(false)
    }
  }

  async function copyText(value: string, key: string) {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = value
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopiedIds((prev) => ({ ...prev, [key]: true }))
      window.setTimeout(() => {
        setCopiedIds((prev) => ({ ...prev, [key]: false }))
      }, 1400)
    } catch {
      setActionError("Copy failed in this browser. Please copy manually.")
    }
  }

  async function generateProposal(item: BookmarkItem) {
    const existing = proposalTexts[item.id]
    if (existing) {
      setProposalOpenId((prev) => (prev === item.id ? null : item.id))
      return
    }

    setProposalOpenId(item.id)
    try {
      const repo = item.repoName || "unknown"
      const language = /javascript|js|react|next|node|typescript|vue|svelte|vite|astro/i.test(repo) ? "javascript" : "javascript"
      const res = await fetch("/api/proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          repo,
          language,
        }),
      })

      if (!res.ok) {
        throw new Error("Proposal request failed")
      }

      const data = await res.json()
      setProposalTexts((prev) => ({ ...prev, [item.id]: data?.proposal || `Hi maintainers! 👋 I'd love to work on "${item.title}". Could you please assign it to me?` }))
    } catch {
      setProposalTexts((prev) => ({
        ...prev,
        [item.id]: `Hi maintainers! 👋 I'd love to work on "${item.title}". Could you please assign it to me? Let me know if there are any specific implementation guidelines you'd like me to follow.`,
      }))
    }
  }


  const filtered = bookmarks.filter((b) => filter === "all" || b.type === filter)
  const someSelected = filtered.some((b) => selected.has(b.id))
  const issueCount = bookmarks.filter((b) => b.type === "issue").length
  const repoCount = bookmarks.filter((b) => b.type === "repo").length

  return (
    <div className="discovery-page min-h-screen bg-[#090909] text-zinc-200 antialiased" style={{ fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { scrollbar-width: thin; scrollbar-color: rgba(168,255,62,.2) transparent; }
        *::-webkit-scrollbar { width: 3px; }
        *::-webkit-scrollbar-thumb { background: rgba(168,255,62,.2); border-radius: 2px; }
      `}</style>

      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8">
        {/* Filter tabs */}
        <div className="mb-4 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-[#0b0b0b] px-3 py-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | BookmarkType)} className="w-full">
            <TabsList className="h-auto gap-1 border-0 bg-transparent p-0">
              <TabsTrigger value="all" className="rounded-full border border-transparent px-3 py-1.5 text-[12px] text-zinc-400 data-[state=active]:border-[#a8ff3e]/30 data-[state=active]:bg-[#a8ff3e]/10 data-[state=active]:text-[#a8ff3e]">All ({bookmarks.length})</TabsTrigger>
              <TabsTrigger value="issue" className="rounded-full border border-transparent px-3 py-1.5 text-[12px] text-zinc-400 data-[state=active]:border-[#a8ff3e]/30 data-[state=active]:bg-[#a8ff3e]/10 data-[state=active]:text-[#a8ff3e]">Issues ({issueCount})</TabsTrigger>
              <TabsTrigger value="repo" className="rounded-full border border-transparent px-3 py-1.5 text-[12px] text-zinc-400 data-[state=active]:border-[#a8ff3e]/30 data-[state=active]:bg-[#a8ff3e]/10 data-[state=active]:text-[#a8ff3e]">Repos ({repoCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-[13px] text-red-300">
            {actionError}
            <button onClick={() => setActionError(null)} aria-label="Dismiss" className="text-red-300/70 hover:text-red-200">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" style={{ opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        )}

        {/* Load error */}
        {!loading && loadError && (
          <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] py-16 text-center">
            <p className="mb-4 text-sm text-zinc-500">Couldn&apos;t load your bookmarks.</p>
            <Button variant="outline" size="sm" onClick={load}>
              Try again
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !loadError && filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bookmark className="mx-auto mb-4 h-8 w-8 text-zinc-800" strokeWidth={1.2} />
            <p className="mb-4 text-sm text-zinc-600">{filter === "all" ? "No bookmarks yet" : `No saved ${filter}s yet`}</p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-[#a8ff3e]/20 text-[#a8ff3e] hover:bg-[#a8ff3e]/10 hover:text-[#a8ff3e]"
            >
              <Link href="/hunt">Start hunting →</Link>
            </Button>
          </div>
        )}

        {/* Cards grid */}
        {!loading && !loadError && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((b) => {
              const repoName = b.repoName || "repository"
              const cardTitle = b.title || repoName
              const isRepo = b.type === "repo"
              const jsish = /javascript|js|react|next|node|typescript|vue|svelte|nuxt|vite|astro/i.test(repoName)
              const showJsLogo = b.type === "issue" || jsish

              return (
                <div key={b.id} className="space-y-2">
                  <div className="flex items-center gap-3 rounded-[20px] border border-[#1d1d1d] bg-[#0a0a0a] px-3 py-2.5 transition-colors hover:border-[#a8ff3e]/20">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[#2a2a2a] bg-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                      {isRepo ? (
                        <FolderGit2 className="h-4 w-4 text-zinc-300" />
                      ) : showJsLogo ? (
                        <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-[#f7df1e] text-[9px] font-black text-[#111111]">JS</span>
                      ) : (
                        <CircleDot className="h-4 w-4 text-zinc-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-white">{cardTitle}</p>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">{repoName}</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 px-2 py-1 text-[10.5px] font-medium text-[#a8ff3e]">
                        <span className="h-2 w-2 rounded-full bg-[#a8ff3e] shadow-[0_0_6px_rgba(168,255,62,0.7)]" />
                        Easy
                      </span>

                      <span className="font-mono text-[10.5px] text-zinc-500">{timeAgo(b.createdAt)}</span>

                      <button
                        type="button"
                        onClick={() => generateProposal(b)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] bg-[#111111] px-2.5 py-1.5 text-[10.5px] font-medium text-zinc-300 transition-colors hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
                      >
                        Proposal
                        <span className="rounded-[4px] bg-[#a8ff3e] px-[4px] py-[1px] text-[8px] font-black tracking-wide text-neutral-950">AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => remove(b.url)}
                        disabled={removing === b.url}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#111111] text-zinc-400 transition-colors hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
                        aria-label={`Remove ${cardTitle} from bookmarks`}
                      >
                        {removing === b.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {proposalOpenId === b.id && (
                    <div className="rounded-xl border border-[#1d1d1d] bg-[#0f0f0f] p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#a8ff3e]">
                          <Sparkles className="h-3 w-3" /> AI draft
                        </span>
                        <button
                          type="button"
                          onClick={() => setProposalOpenId(null)}
                          className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
                        >
                          close
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={proposalTexts[b.id] || "Generating your proposal..."}
                        className="h-[76px] w-full resize-none rounded-lg border border-[#1d1d1d] bg-[#0b0b0b] px-3 py-2 font-mono text-[12px] leading-relaxed text-zinc-200 outline-none"
                      />
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => copyText(proposalTexts[b.id] || "", `proposal:${b.id}`)}
                          className="rounded-md border border-[#a8ff3e]/30 bg-[#a8ff3e]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#a8ff3e]"
                        >
                          {copiedIds[`proposal:${b.id}`] ? "Copied" : "Copy draft"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

      </main>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#111]/95 px-4 py-2.5 shadow-2xl shadow-black/50 backdrop-blur-md">
            <span className="text-[13px] text-zinc-300">{selected.size} selected</span>
            <Separator orientation="vertical" className="h-4" />
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
