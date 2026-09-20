"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bookmark, CircleDot, FolderGit2, Trash2, Loader2, ArrowUpRight, ArrowRight, X } from "lucide-react"

import Navbar from "@/components/ui/Navbar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type BookmarkType = "issue" | "repo"

type BookmarkItem = {
  id: string
  url: string
  title: string
  repoName: string
  type: BookmarkType
  createdAt: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d === 0) return "today"
  if (d === 1) return "1d ago"
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
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

  useEffect(() => {
    load()
  }, [])

  function load() {
    setLoading(true)
    setLoadError(false)
    fetch("/api/bookmark")
      .then((r) => {
        if (!r.ok) throw new Error("Request failed")
        return r.json()
      })
      .then((data) => {
        setBookmarks(data)
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
    try {
      const res = await fetch("/api/bookmark", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) throw new Error("Delete failed")
      const removedId = bookmarks.find((b) => b.url === url)?.id
      setBookmarks((prev) => prev.filter((b) => b.url !== url))
      if (removedId) {
        setSelected((prev) => {
          const next = new Set(prev)
          next.delete(removedId)
          return next
        })
      }
    } catch {
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
    try {
      const res = await fetch("/api/bookmark", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: targets.map((b) => b.url) }),
      })
      if (!res.ok) throw new Error("Bulk delete failed")
      const ids = new Set(targets.map((b) => b.id))
      setBookmarks((prev) => prev.filter((b) => !ids.has(b.id)))
      setSelected(new Set())
    } catch {
      setActionError("Couldn't delete the selected bookmarks. Try again.")
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const filtered = bookmarks.filter((b) => filter === "all" || b.type === filter)
  const allSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id))
  const someSelected = filtered.some((b) => selected.has(b.id))
  const issueCount = bookmarks.filter((b) => b.type === "issue").length
  const repoCount = bookmarks.filter((b) => b.type === "repo").length

  return (
    <div className="min-h-screen bg-[#090909] text-zinc-200 antialiased" style={{ fontFamily: "'Outfit','Inter',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { scrollbar-width: thin; scrollbar-color: rgba(168,255,62,.2) transparent; }
        *::-webkit-scrollbar { width: 3px; }
        *::-webkit-scrollbar-thumb { background: rgba(168,255,62,.2); border-radius: 2px; }
      `}</style>

      <Navbar />

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
        {/* Header */}
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <Bookmark className="h-5 w-5 text-[#a8ff3e]" />
              <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-xl font-extrabold tracking-tight text-transparent sm:text-2xl">
                Bookmarks
              </h1>
              {bookmarks.length > 0 && (
                <Badge className="border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.08] font-mono text-[11px] text-[#a8ff3e]">
                  {bookmarks.length}
                </Badge>
              )}
            </div>
            <p className="text-[13px] text-zinc-600">Saved issues and repos — pick up where you left off</p>
          </div>
          <Button asChild className="bg-[#a8ff3e] font-semibold text-[#090909] hover:bg-[#bdff6e]">
            <Link href="/hunt">
              Hunt more <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | BookmarkType)} className="mb-4">
          <TabsList className="h-auto gap-1 border-b border-white/[0.06] bg-transparent p-0">
            <TabsTrigger value="all">All ({bookmarks.length})</TabsTrigger>
            <TabsTrigger value="issue">Issues ({issueCount})</TabsTrigger>
            <TabsTrigger value="repo">Repos ({repoCount})</TabsTrigger>
          </TabsList>
        </Tabs>

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

        {/* List */}
        {!loading && !loadError && filtered.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/[0.05] bg-white/[0.02] px-4 py-2.5 sm:px-5">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => setSelected(checked ? new Set(filtered.map((b) => b.id)) : new Set())}
                aria-label="Select all bookmarks"
              />
              <span className="text-[11px] uppercase tracking-wide text-zinc-600">
                {someSelected ? `${selected.size} selected` : "Select all"}
              </span>
            </div>

            {filtered.map((b, i) => (
              <div
                key={b.id}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.02] sm:px-5",
                  i < filtered.length - 1 && "border-b border-white/[0.04]"
                )}
              >
                <div className="absolute inset-y-0 left-0 w-0.5 origin-center scale-y-0 bg-[#a8ff3e] transition-transform group-hover:scale-y-100" />

                <Checkbox
                  checked={selected.has(b.id)}
                  onCheckedChange={(checked) => toggleSelect(b.id, checked === true)}
                  aria-label={`Select ${b.title}`}
                />

                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
                    b.type === "issue" ? "border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.08]" : "border-white/10 bg-white/[0.04]"
                  )}
                >
                  {b.type === "issue" ? (
                    <CircleDot className="h-3.5 w-3.5 text-[#a8ff3e]" />
                  ) : (
                    <FolderGit2 className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-zinc-300 transition-colors group-hover:text-white">
                    {b.title}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate font-mono text-[11px] text-zinc-600">{b.repoName}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "hidden shrink-0 border-0 px-1.5 py-0 font-mono text-[9px] sm:inline-flex",
                        b.type === "issue" ? "bg-[#a8ff3e]/[0.07] text-[#a8ff3e]" : "bg-white/[0.04] text-zinc-500"
                      )}
                    >
                      {b.type}
                    </Badge>
                  </div>
                </div>

                <span className="hidden shrink-0 font-mono text-[11px] text-zinc-700 sm:block">{timeAgo(b.createdAt)}</span>

                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden shrink-0 items-center gap-0.5 text-[12px] text-zinc-600 transition-colors hover:text-[#a8ff3e] sm:inline-flex"
                >
                  View <ArrowUpRight className="h-3 w-3" />
                </a>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => remove(b.url)}
                  disabled={removing === b.url}
                  aria-label={`Remove ${b.title} from bookmarks`}
                >
                  {removing === b.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}
          </Card>
        )}

        {/* Stats */}
        {!loading && bookmarks.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Card>
              <CardContent className="p-4">
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600">Saved issues</p>
                <p className="font-mono text-2xl font-bold tracking-tight text-[#a8ff3e]">{issueCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600">Saved repos</p>
                <p className="font-mono text-2xl font-bold tracking-tight text-[#a8ff3e]">{repoCount}</p>
              </CardContent>
            </Card>
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
