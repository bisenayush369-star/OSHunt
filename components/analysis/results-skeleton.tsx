"use client"
import { useEffect, useState } from "react"
import { AlertIcon, ArrowRightIcon, BotIcon, GitBranchIcon, MapIcon, ScanIcon } from "./icons"
import { RailNode, RailScanLine } from "./rail"

// Shown while the server works. None of these lines claims a specific step is "done" —
// the request is one call, so there is no real per-step progress to report.
const TIPS = [
  "Reading the README, contributing guide, file list and open beginner issues…",
  "Tip: a CONTRIBUTING.md file, if the repo has one, is worth reading first.",
  "Tip: filter GitHub issues by “good first issue” before you pick a task.",
  "Tip: a repo's .github/workflows folder shows how its tests run.",
  "Tip: skim recent commits to see what is being worked on right now.",
  "Tip: fixing a typo in the docs is a perfectly good first pull request.",
  "Tip: comment on an issue before you start, so nobody repeats your work.",
]

function Sk({ w, h, round = false }: { w: string | number; h: number; round?: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{ width: w, height: h, maxWidth: "100%" }}
      className={`relative overflow-hidden bg-[#111] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent motion-reduce:after:hidden ${round ? "rounded-full" : "rounded-md"}`}
    />
  )
}

function Lines({ widths }: { widths: (string | number)[] }) {
  return (
    <div className="flex flex-col gap-2">
      {widths.map((w, i) => <Sk key={i} w={w} h={13} />)}
    </div>
  )
}

export function ResultsSkeleton({ owner, repo }: { owner: string; repo: string }) {
  const [tip, setTip] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3600)
    return () => clearInterval(id)
  }, [])

  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">Analyzing {owner}/{repo}</p>
      <div className="mb-6 flex items-start gap-2.5 pl-[2px]" aria-hidden="true">
        <span className="mt-[7px] size-[5px] shrink-0 animate-pulse rounded-full bg-[#a8ff3e] motion-reduce:animate-none" />
        <p className="min-w-0 text-[12.5px] italic leading-relaxed text-[#8a8a8a]">{TIPS[tip]}</p>
      </div>

      <div className="relative">
        <RailScanLine />

        <RailNode index={0} label="What it does" icon={<ScanIcon size={16} />}>
          <div className="mb-3.5 flex items-center gap-2">
            <Sk w={150} h={16} />
            <Sk w={64} h={28} />
          </div>
          <Lines widths={["100%", "92%", "78%"]} />
        </RailNode>

        <RailNode index={1} label="Good first repo?" icon={<GitBranchIcon size={16} />}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
            <div className="shrink-0"><Sk w={96} h={96} round /></div>
            <div className="min-w-0 flex-1">
              <div className="mb-3"><Sk w={160} h={18} /></div>
              <Lines widths={["96%", "84%", "90%"]} />
            </div>
          </div>
        </RailNode>

        <RailNode index={2} label="How to start" icon={<MapIcon size={16} />}>
          <div className="flex flex-col gap-4">
            <Lines widths={["62%", "88%"]} />
            <Sk w="100%" h={44} />
          </div>
        </RailNode>

        <RailNode index={3} label="Beginner issues" icon={<ArrowRightIcon size={15} />}>
          <div className="flex flex-col gap-4">
            <Lines widths={["70%", "94%"]} />
            <Lines widths={["58%", "86%"]} />
          </div>
        </RailNode>

        <RailNode index={4} label="Before you start" icon={<AlertIcon size={15} />}>
          <Lines widths={["90%", "74%"]} />
        </RailNode>

        <RailNode index={5} label="Ask about this repo" icon={<BotIcon size={16} />} last>
          <Sk w="100%" h={48} />
        </RailNode>
      </div>
    </div>
  )
}
