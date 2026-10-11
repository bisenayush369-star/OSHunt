"use client"
import { Suspense } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import Navbar from "@/components/ui/Navbar"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { Button } from "@/components/ui/button"
import { AnalysisStyles } from "@/components/analysis/analysis-styles"
import { ScanIcon } from "@/components/analysis/icons"
import { parseRepo, repoKey } from "@/components/analysis/parse-repo"
import { Results } from "@/components/analysis/results"
import { ResultsSkeleton } from "@/components/analysis/results-skeleton"
import { SearchCard } from "@/components/analysis/search-card"
import type { RepoRef } from "@/components/analysis/types"
import { useAnalysis } from "@/components/analysis/use-analysis"

const EXAMPLES = ["vitejs/vite", "expressjs/express", "trpc/trpc"]

/**
 * Research starts the moment a repo is set — from the Discovery button
 * (/analysis?repo=owner/name) or from this search box — and renders directly
 * underneath it. The URL is the single source of truth, so refresh, back and
 * shared links all land on the same analysis.
 */
function AnalysisContent() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const param = params.get("repo") ?? ""
  const repo = parseRepo(param)
  const badParam = param.trim() !== "" && !repo
  const { status, analysis, meta, error, rerun } = useAnalysis(repo)

  function open(next: RepoRef) {
    if (repo && repoKey(next) === repoKey(repo)) {
      rerun() // same repo asked again: run it again instead of silently doing nothing
      return
    }
    router.push(`${pathname}?repo=${repoKey(next)}`, { scroll: false })
  }

  return (
    <div className="min-h-dvh bg-[#090909] font-['Outfit',_'Inter',_sans-serif] text-[#e0e0e0] antialiased selection:bg-[#a8ff3e]/20 selection:text-[#a8ff3e]">
      <AnalysisStyles />
      <Navbar />

      {/* Ambient glow — fixed so it never adds scroll height on any device */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[90vw] max-w-[820px] -translate-x-1/2 rounded-full bg-[#a8ff3e]/[0.05] blur-[110px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[840px] px-4 pb-20 pt-14 [overflow-wrap:anywhere] sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <header className="mb-9 sm:mb-12">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[#a8ff3e]"><ScanIcon size={20} /></span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a8ff3e]">Analysis</span>
          </div>
          <h1 className="text-balance text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em] text-white sm:text-[38px] lg:text-[44px]">
            Know if a repo is worth<br />
            <span className="bg-gradient-to-r from-[#a8ff3e] to-[#7fe62c] bg-clip-text text-transparent">your first contribution.</span>
          </h1>
          <p className="mt-3.5 max-w-[520px] text-[15px] font-light leading-relaxed text-[#9a9a9a] sm:mt-4">
            Pick a repo and get a plain-English read: what it does, whether it suits a beginner, how to start, and which issues to try.
          </p>
        </header>

        <SearchCard
          key={param}
          initial={repo ? repoKey(repo) : param}
          initialError={badParam ? "That doesn't look like a GitHub repo. Use owner/name, or paste the link." : ""}
          busy={status === "loading"}
          examples={status === "idle" ? EXAMPLES : []}
          onSubmit={open}
        />

        {repo && status === "loading" && <ResultsSkeleton owner={repo.owner} repo={repo.repo} />}

        {repo && status === "error" && (
          <div role="alert" className="rounded-xl border border-[#ff4d6d]/20 bg-[#ff4d6d]/[0.06] px-5 py-4">
            <p className="text-[13.5px] leading-relaxed text-[#ff4d6d]">{error}</p>
            <Button
              type="button"
              variant="outline"
              onClick={rerun}
              className="mt-3 h-11 rounded-lg border-[#ff4d6d]/30 bg-transparent px-4 text-[13px] text-[#ff4d6d] hover:bg-[#ff4d6d]/10 hover:text-[#ff4d6d] dark:border-[#ff4d6d]/30 dark:bg-transparent dark:hover:bg-[#ff4d6d]/10 sm:h-9"
            >
              Try again
            </Button>
          </div>
        )}

        {repo && status === "done" && analysis && (
          <>
            <p role="status" className="sr-only">Analysis ready for {repoKey(repo)}</p>
            <Results key={repoKey(repo)} owner={repo.owner} repo={repo.repo} analysis={analysis} meta={meta} />
          </>
        )}

        {status === "idle" && (
          <div className="pt-2 text-center">
            <div className="mb-2.5 flex justify-center text-[#333]"><ScanIcon size={20} /></div>
            <p className="text-[13px] text-[#8a8a8a]">Paste a repo above, or open one from Discovery.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <RequireAuth>
      {/* useSearchParams needs a Suspense boundary in the App Router */}
      <Suspense fallback={null}>
        <AnalysisContent />
      </Suspense>
    </RequireAuth>
  )
}
