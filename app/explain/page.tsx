"use client"

import { useState } from "react"
import Navbar from "@/components/ui/Navbar"
import { FadeInView } from "@/components/motion/FadeInView"

type AnalysisResult = {
  purpose: string
  techStack: string[]
  startingPoint: string
}

const EXAMPLE_REPOS = ["vercel/next.js", "facebook/react", "microsoft/vscode", "prisma/prisma"]

const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)
const LayersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)
const MapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const SparkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
)
const ScatterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h.01M4 12h.01M4 18h.01M8 6h.01M8 12h.01M8 18h.01M12 6h.01M12 12h.01M12 18h.01" />
  </svg>
)

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.trim().replace(/\/$/, "")
  const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") }
}

function CodeText({ text }: { text: string }) {
  return (
    <span className="leading-7">
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
          <code key={i} className="rounded border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 px-1.5 py-0.5 font-mono text-[12px] text-[#a8ff3e]">
            {part.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  )
}

function CardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#141414] bg-[#0a0a0a] p-6 shadow-[0_0_45px_rgba(0,0,0,0.35)]">
      <div className="h-2.5 w-24 rounded-full bg-[#1c1c1c]" />
      <div className="mt-5 space-y-3">
        <div className="h-3 w-full rounded-full bg-[#111]" />
        <div className="h-3 w-5/6 rounded-full bg-[#111]" />
        <div className="h-3 w-4/6 rounded-full bg-[#111]" />
      </div>
      <div className="mt-6 flex gap-2">
        <div className="h-8 flex-1 rounded-lg bg-[#111]" />
        <div className="h-8 w-20 rounded-lg bg-[#111]" />
      </div>
    </div>
  )
}

export default function ExplainerPage() {
  const [repoUrl, setRepoUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [wasCached, setWasCached] = useState(false)

  const handleAnalyze = async () => {
    if (!repoUrl.trim()) return
    setIsAnalyzing(true)
    setError("")
    setResult(null)

    try {
      const parsed = parseGithubUrl(repoUrl)
      if (!parsed) {
        throw new Error("That doesn't look like a valid GitHub URL.")
      }

      const ghRes = await fetch(`/api/github-repo?owner=${parsed.owner}&repo=${parsed.repo}`)

      if (!ghRes.ok) {
        const errData = await ghRes.json().catch(() => ({}))
        if (ghRes.status === 404) throw new Error("Repo not found. Check the URL.")
        if (ghRes.status === 429) throw new Error("GitHub rate limit hit — wait a minute and try again.")
        throw new Error(errData.error || "GitHub lookup failed. Try again in a moment.")
      }

      const ghData = await ghRes.json()
      const repoName = ghData.repoName as string
      const rawDescription = [
        ghData.description,
        ghData.language ? `Primary language: ${ghData.language}.` : "",
        Array.isArray(ghData.topics) && ghData.topics.length ? `Topics: ${ghData.topics.join(", ")}.` : "",
      ].filter(Boolean).join(" ")

      if (!rawDescription) {
        throw new Error("This repo has no description on GitHub — not enough context to analyze yet.")
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoName, rawDescription }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Analysis failed. Try again.")
      }

      const data = await res.json()
      setWasCached(Boolean(data.cached))
      window.dispatchEvent(new CustomEvent("usage:updated"))

      try {
        const cleanedText = data.text.replace(/```json|```/g, "").trim()
        const parsedResult = JSON.parse(cleanedText)
        setResult({
          purpose: parsedResult.purpose ?? "",
          techStack: Array.isArray(parsedResult.techStack) ? parsedResult.techStack : [],
          startingPoint: parsedResult.startingPoint ?? "",
        })
      } catch {
        setResult({ purpose: data.text, techStack: [], startingPoint: "" })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[420px] w-[420px] rounded-full bg-[#a8ff3e]/[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute top-96 right-0 h-[380px] w-[380px] rounded-full bg-[#a8ff3e]/[0.04] blur-[120px]" />

      <Navbar />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-24 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        <FadeInView>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#a8ff3e]/80">
            <SparkIcon /> GitLense · Explain
          </div>
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-[30px] font-bold leading-[1.15] tracking-tight text-white sm:text-[40px]">
              Deconstruct any codebase in a few seconds.
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-relaxed text-[#888] sm:text-[15px]">
              Drop in a public GitHub URL and get a clear breakdown of what the project does, the stack behind it, and where to start reading first.
            </p>
          </div>
        </FadeInView>

        <FadeInView delay={80} className="mt-8">
          <div className="mx-auto w-full max-w-3xl rounded-[22px] border border-[#1a1a1a] bg-[#0a0a0a]/95 p-3 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#141414] bg-[#050505] px-3 py-3 sm:px-4">
                <span className="shrink-0 text-[#a8ff3e]"><SearchIcon /></span>
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="https://github.com/facebook/react"
                  aria-label="GitHub repository URL"
                  className="w-full border-0 bg-transparent font-mono text-[13px] text-white outline-none placeholder:text-[#555]"
                />
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#a8ff3e] px-4 py-3 text-[13px] font-semibold text-black transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#baff6a] disabled:cursor-wait disabled:opacity-80"
              >
                {isAnalyzing ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <ScatterIcon />}
                {isAnalyzing ? "Deconstructing…" : "Explain Repo"}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_REPOS.map((repo) => (
                <button
                  key={repo}
                  type="button"
                  onClick={() => setRepoUrl(`https://github.com/${repo}`)}
                  className="rounded-full border border-[#1a1a1a] bg-[#070707] px-2.5 py-1 text-[11px] text-[#888] transition-colors hover:border-[#a8ff3e]/25 hover:text-[#a8ff3e]"
                >
                  {repo}
                </button>
              ))}
            </div>
          </div>
        </FadeInView>

        {error && (
          <FadeInView delay={120} className="mx-auto mt-6 w-full max-w-3xl">
            <div className="rounded-2xl border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.05] px-4 py-3 text-[13px] text-[#ff8fa3]">
              {error}
            </div>
          </FadeInView>
        )}

        {isAnalyzing && (
          <FadeInView delay={140} className="mt-8">
            <div className="mb-3 flex items-center gap-2 text-[12px] text-[#666]">
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e]" />
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.2s]" />
              <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#a8ff3e] [animation-delay:0.4s]" />
              Reading the repo structure, docs, and entry points…
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </FadeInView>
        )}

        {result && (
          <FadeInView delay={120} className="mt-8 w-full">
            {wasCached && (
              <div className="mb-4 flex justify-center">
                <span className="rounded-full border border-[#a8ff3e]/20 bg-[#a8ff3e]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a8ff3e]">
                  ⚡ Served instantly from cache
                </span>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[22px] border border-[#141414] bg-[#0a0a0a]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-[#a8ff3e]/20">
                <div className="flex items-center gap-2 text-[15px] font-semibold text-white">
                  <span className="text-[#a8ff3e]"><BookIcon /></span>
                  What it solves
                </div>
                <p className="mt-3 text-[14px] leading-7 text-[#c4c4c4]">{result.purpose}</p>
              </div>

              {result.techStack.length > 0 && (
                <div className="rounded-[22px] border border-[#141414] bg-[#0a0a0a]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-[#a8ff3e]/20">
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-white">
                    <span className="text-[#a8ff3e]"><LayersIcon /></span>
                    Core tech stack
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.techStack.map((tech, i) => (
                      <span key={i} className="rounded-full border border-[#1a1a1a] bg-[#060606] px-3 py-1.5 text-[12px] text-[#ddd]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.startingPoint && (
                <div className="rounded-[22px] border border-[#141414] bg-[#0a0a0a]/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-1 hover:border-[#a8ff3e]/20 lg:col-span-2">
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-white">
                    <span className="text-[#a8ff3e]"><MapIcon /></span>
                    Where to start reading
                  </div>
                  <p className="mt-3 text-[14px] leading-7 text-[#c4c4c4]">
                    <CodeText text={result.startingPoint} />
                  </p>
                </div>
              )}
            </div>
          </FadeInView>
        )}
      </main>
    </div>
  )
}