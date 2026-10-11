"use client"
import Link from "next/link"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { CopyButton } from "./copy-button"
import { FitRing } from "./fit-ring"
import {
  AlertIcon, ArrowRightIcon, BotIcon, CheckIcon, CrossIcon, ExternalIcon,
  GitBranchIcon, GitHubMark, MapIcon, ScanIcon, StarIcon,
} from "./icons"
import { useTyped } from "./motion"
import { Rail, RailNode } from "./rail"
import { RepoChat } from "./repo-chat"
import type { Analysis, RepoMeta } from "./types"

// `backticks` become inline code — the model sometimes quotes file names and commands that way.
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.length > 1 && part.startsWith("`") && part.endsWith("`") ? (
          <code key={i} className="inline-code">{part.slice(1, -1)}</code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

// The answer arrives as typing, same as GitLense. Screen readers get the full text at once.
function Summary({ text }: { text: string }) {
  const { shown, done } = useTyped(text)
  return (
    <p className="max-w-[64ch] text-[15px] leading-[1.7] text-[#ccc]">
      <span className="sr-only"><Inline text={text} /></span>
      <span aria-hidden="true">
        <Inline text={shown} />
        {!done && (
          <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-[#a8ff3e] align-text-bottom motion-reduce:animate-none" />
        )}
      </span>
    </p>
  )
}

const chip =
  "gap-1 rounded-md border-[#1a1a1a] bg-[#0a0a0a] px-2 py-1 text-[11.5px] font-normal text-[#999]"

function Header({ owner, repo, meta, summary }: { owner: string; repo: string; meta: RepoMeta | null; summary: string }) {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex min-w-0 items-center gap-2 text-[#a8ff3e]">
          <GitHubMark size={15} className="shrink-0" />
          <span className="truncate font-mono text-[14px] font-bold">{owner}/{repo}</span>
        </span>
        <a
          href={`https://github.com/${owner}/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#1a1a1a] px-2.5 text-[12px] text-[#888] transition-colors hover:border-[#a8ff3e]/35 hover:text-[#a8ff3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
        >
          GitHub <ExternalIcon size={10} />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>

      {meta && (
        <div className="mb-3.5 flex flex-wrap gap-1.5">
          {meta.stars !== null && (
            <Badge variant="outline" className={chip}><StarIcon size={10} /> {meta.stars.toLocaleString("en-US")}</Badge>
          )}
          {meta.language && <Badge variant="outline" className={`${chip} border-[#a8ff3e]/15 bg-[#a8ff3e]/[0.06] text-[#a8ff3e]`}>{meta.language}</Badge>}
          {meta.license && <Badge variant="outline" className={chip}>{meta.license}</Badge>}
        </div>
      )}

      {summary ? <Summary key={summary} text={summary} /> : <p className="text-[15px] text-[#888]">No summary came back for this repo.</p>}
    </>
  )
}

function Fit({ analysis, delayMs }: { analysis: Analysis; delayMs: number }) {
  const { fit, scoreKnown } = analysis
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
      {scoreKnown && <FitRing score={fit.score} delayMs={delayMs} />}
      <div className="min-w-0 flex-1">
        {fit.label && <p className="text-[16px] font-semibold leading-snug text-white"><Inline text={fit.label} /></p>}
        {fit.reasons.length > 0 && (
          <ul className={`flex flex-col gap-2.5 ${fit.label ? "mt-3" : ""}`}>
            {fit.reasons.map((r: { ok?: boolean; text?: string }, i: number) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-[#ccc]">
                <span
                  aria-hidden="true"
                  className={`mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full ${r.ok ? "bg-[#a8ff3e]/[0.12] text-[#a8ff3e]" : "bg-[#ffb84d]/[0.12] text-[#ffb84d]"}`}
                >
                  {r.ok ? <CheckIcon size={11} /> : <CrossIcon size={11} />}
                </span>
                <span className="sr-only">{r.ok ? "Good: " : "Heads up: "}</span>
                <span className="min-w-0"><Inline text={r.text ?? ""} /></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Steps({ steps }: { steps: Analysis["steps"] }) {
  if (!steps.length) {
    return <p className="max-w-[64ch] text-[14px] leading-relaxed text-[#888]">The repo&apos;s docs don&apos;t list clear setup steps. Ask the guide below and it will check the README with you.</p>
  }
  return (
    <ol className="flex flex-col gap-5">
      {steps.map((s: { title?: string; detail?: string; cmd?: string }, i: number) => (
        <li key={i} className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3">
          <span className="mt-px flex size-6 items-center justify-center rounded-md bg-[#a8ff3e]/[0.12] font-mono text-[11px] font-bold text-[#a8ff3e]">{i + 1}</span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-snug text-white"><Inline text={s.title ?? ""} /></p>
            {s.detail && <p className="mt-1 max-w-[64ch] text-[13.5px] leading-relaxed text-[#999]"><Inline text={s.detail} /></p>}
            {s.cmd && (
              <div className="mt-2.5 flex items-center rounded-lg border border-[#1a1a1a] bg-black pl-3">
                <span aria-hidden="true" className="select-none font-mono text-[12.5px] text-[#a8ff3e]/70">$</span>
                <code tabIndex={0} className="min-w-0 flex-1 overflow-x-auto whitespace-pre px-2.5 py-3 font-mono text-[12.5px] text-[#e0e0e0] focus-visible:outline-none [scrollbar-width:thin]">{s.cmd}</code>
                <CopyButton text={s.cmd} />
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Issues({ owner, repo, issues }: { owner: string; repo: string; issues: Analysis["issues"] }) {
  if (!issues.length) {
    return (
      <p className="max-w-[64ch] text-[14px] leading-relaxed text-[#888]">
        No open issues are labelled &ldquo;good first issue&rdquo; right now.{" "}
        <Link href="/hunt" className="text-[#a8ff3e] underline decoration-[#a8ff3e]/35 underline-offset-[3px] hover:decoration-[#a8ff3e]">Browse matching issues on Hunt</Link>
        {" "}or ask the guide below how to pick a first task.
      </p>
    )
  }
  return (
    <ul className="-mx-2 flex flex-col">
      {issues.map((it: { number?: number; title?: string; why?: string }, index: number) => (
        <li key={it.number ? `issue-${it.number}` : `issue-${index}`}>
          <a
            href={`https://github.com/${owner}/${repo}/issues/${it.number ?? 0}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-11 items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/50"
          >
            <span className="mt-px shrink-0 rounded-md border border-[#a8ff3e]/20 bg-[#a8ff3e]/[0.06] px-1.5 py-0.5 font-mono text-[11.5px] text-[#a8ff3e]">#{it.number ?? 0}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium leading-snug text-white transition-colors group-hover:text-[#a8ff3e]"><Inline text={it.title ?? ""} /></span>
              {it.why && <span className="mt-1 block text-[13px] leading-relaxed text-[#999]"><Inline text={it.why} /></span>}
            </span>
            <span aria-hidden="true" className="mt-1 shrink-0 text-[#555] transition-colors group-hover:text-[#a8ff3e]"><ExternalIcon size={12} /></span>
            <span className="sr-only">(opens GitHub in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

function Watch({ items }: { items: string[] }) {
  return (
    <ul className="flex max-w-[64ch] flex-col gap-2.5">
      {items.map((w, i) => (
        <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-[#ccc]">
          <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#ffb84d]" />
          <span className="min-w-0"><Inline text={w} /></span>
        </li>
      ))}
    </ul>
  )
}

function suggestionsFor(repo: string, a: Analysis) {
  const list = [a.issues.length ? "Which of these issues should I pick first?" : "What could I work on if there are no beginner issues?"]
  if (a.steps.some((s) => s.cmd)) list.push(`Walk me through running ${repo} on my computer`)
  list.push("What should I read before my first pull request?")
  return list.slice(0, 3)
}

type Block = { key: string; label: string; icon: ReactNode; body: ReactNode }

export function Results({ owner, repo, analysis, meta }: { owner: string; repo: string; analysis: Analysis; meta: RepoMeta | null }) {
  const hasFit = analysis.scoreKnown || Boolean(analysis.fit.label) || analysis.fit.reasons.length > 0

  const blocks: Block[] = [
    { key: "what", label: "What it does", icon: <ScanIcon size={16} />, body: <Header owner={owner} repo={repo} meta={meta} summary={analysis.summary} /> },
    ...(hasFit ? [{ key: "fit", label: "Good first repo?", icon: <GitBranchIcon size={16} />, body: <Fit analysis={analysis} delayMs={200} /> }] : []),
    { key: "steps", label: "How to start", icon: <MapIcon size={16} />, body: <Steps steps={analysis.steps} /> },
    { key: "issues", label: "Beginner issues", icon: <ArrowRightIcon size={15} />, body: <Issues owner={owner} repo={repo} issues={analysis.issues} /> },
    ...(analysis.watch.length ? [{ key: "watch", label: "Before you start", icon: <AlertIcon size={15} />, body: <Watch items={analysis.watch} /> }] : []),
    {
      key: "chat",
      label: "Ask about this repo",
      icon: <BotIcon size={16} />,
      body: <RepoChat key={`${owner}/${repo}`} owner={owner} repo={repo} suggestions={suggestionsFor(repo, analysis)} />,
    },
  ]

  return (
    <Rail>
      {blocks.map((b, i) => (
        <RailNode key={b.key} index={i} label={b.label} icon={b.icon} last={i === blocks.length - 1}>
          {b.body}
        </RailNode>
      ))}
    </Rail>
  )
}
