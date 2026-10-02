"use client"
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import Navbar from "@/components/ui/Navbar"
import { RequireAuth } from "@/components/auth/RequireAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { RepoMap } from "@/components/analysis/RepoMap"
import { BeginnerIssues } from "@/components/analysis/BeginnerIssues"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ─── Types (same shape /api/analyze already returns) ─────────────────────────
interface Result {
  purpose: string
  techStack: string[]
  startFiles: { path: string; why: string }[]
  howToRun: string
  howToContribute: string
  architecture?: string | null
  framework?: string | null
  repositoryType?: "single-package" | "monorepo" | null
  metadata?: { stars?: number; forks?: number; license?: string | null; lastPushed?: string | null; openIssues?: number; primaryLanguage?: string | null }
}
interface Msg { role: "user" | "assistant"; content: string; ctx?: string } // ctx is sent to the agent but not shown
type Sig = { level: 0 | 1 | 2; text: string }
type Stat = { k: string; i: string; n?: number; t?: string }

// ─── Inline icons only ───────────────────────────────────────────────────────
const P = {
  ok: "M5 12l4 4L19 7", no: "M6 6l12 12M18 6L6 18", mid: "M6 12h12", back: "M15 6l-6 6 6 6", out: "M7 17L17 7M8 7h9v9",
  chat: "M4 5h16v11H9l-5 4z", copy: "M9 9h11v11H9zM5 15V5h10", send: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  run: "M4 17l6-6-6-6M12 19h8", map: "M9 3L3 6v15l6-3 6 3 6-3V3l-6 3zM9 3v15M15 6v15", stop: "M6 6h12v12H6z", branch: "M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9",
  file: "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5", stack: "M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5",
  pulse: "M3 12h4l3-8 4 16 3-8h4", star: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2 2 9.3l6.9-1z",
  fork: "M6 3v6a3 3 0 003 3h6a3 3 0 003-3V3M12 12v9", issue: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v5M12 16h.01",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2", scale: "M12 3v18M5 7h14M5 7l-3 8a4 4 0 006 0zM19 7l-3 8a4 4 0 006 0z",
}
const Ico = ({ d, c = "size-4" }: { d: string; c?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c} aria-hidden="true"><path d={d} /></svg>
)

const VALID = /^(?!\.+$)[\w.-]{1,100}$/
const CMD = /^(npm|pnpm|yarn|bun|npx|git|pip3?|python3?|cargo|go|make|docker|cd|node|deno|poetry|uv)\b/
const SCAN_LINES = ["Reading the file tree", "Finding the files that matter", "Working out how to run it", "Writing it in plain words"]
const CHIPS = ["Where do I start?", "Explain it in simpler words", "What is a good first change?"]
const card = "border-[#1a1a1a] bg-[#0a0a0a]"
const ghost = "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-[#8a8a8a] transition-colors hover:text-[#a8ff3e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]"
const lime = "h-11 cursor-pointer bg-[#a8ff3e] px-5 font-medium text-black hover:bg-[#bdff6b]"

// ─── Helpers ─────────────────────────────────────────────────────────────────
const Sk = ({ c = "" }: { c?: string }) => <Skeleton className={`bg-white/[0.06] ${c}`} />

function Inline({ text }: { text: string }) {
  return <>{text.split("`").map((p, i) => i % 2
    ? <code key={i} className="rounded bg-white/[0.07] px-1.5 py-0.5 font-mono text-[0.85em] text-[#bdff6b]">{p}</code>
    : p)}</>
}

// howToRun / howToContribute arrive as free text: split into steps by line, else by sentence.
function parseSteps(text: string): string[] {
  const lines = (text || "").split(/\r?\n/).map(l => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim()).filter(Boolean)
  if (lines.length > 1) return lines
  return (text || "").split(/\.\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean).map(s => (/[.!?:]$/.test(s) ? s : s + "."))
}
const cmds = (s: string) => (s.match(/`[^`]+`/g) ?? []).map(x => x.slice(1, -1)).filter(x => CMD.test(x))
const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
const ago = (iso: string) => { const d = days(iso); return d < 1 ? "Today" : d < 60 ? `${d} days ago` : `${Math.round(d / 30)} months ago` }

function statsOf(m?: Result["metadata"]): Stat[] {
  if (!m) return []
  return ([
    typeof m.stars === "number" && { k: "Stars", i: P.star, n: m.stars },
    typeof m.forks === "number" && { k: "Forks", i: P.fork, n: m.forks },
    typeof m.openIssues === "number" && { k: "Open issues", i: P.issue, n: m.openIssues },
    m.lastPushed && { k: "Last update", i: P.clock, t: ago(m.lastPushed) },
    m.license && { k: "License", i: P.scale, t: m.license },
  ].filter(Boolean) as Stat[]).slice(0, 4)
}

// Readiness is computed from real repo metadata, never from the model, so it can't be invented.
function signals(m: NonNullable<Result["metadata"]>): Sig[] {
  const out: Sig[] = []
  if (m.lastPushed) {
    const d = days(m.lastPushed)
    out.push(d <= 30 ? { level: 2, text: "Updated in the last month" } : d <= 180 ? { level: 1, text: `Last updated ${Math.round(d / 30)} months ago` } : { level: 0, text: `Not updated for ${Math.round(d / 30)} months` })
  }
  if (m.license !== undefined) out.push(m.license ? { level: 2, text: `Open license (${m.license})` } : { level: 1, text: "No license listed" })
  if (typeof m.openIssues === "number") out.push(m.openIssues > 0 ? { level: 2, text: `${m.openIssues} open issues to pick from` } : { level: 1, text: "No open issues right now" })
  if (typeof m.stars === "number") out.push(m.stars >= 100 ? { level: 2, text: `${m.stars.toLocaleString()} stars, so people use it` } : { level: 1, text: `Small project with ${m.stars} stars` })
  return out
}

function Count({ to }: { to: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setV(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1100)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{v.toLocaleString()}</>
}

function useActive(ids: string[]) {
  const [a, setA] = useState("")
  const key = ids.join()
  useEffect(() => {
    const els = ids.map(i => document.getElementById(i)).filter(Boolean) as HTMLElement[]
    if (!els.length) return
    setA(els[0].id)
    const io = new IntersectionObserver(es => {
      const v = es.filter(e => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0]
      if (v) setA(v.target.id)
    }, { rootMargin: "-25% 0px -60% 0px" })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return a
}

// ─── Page ────────────────────────────────────────────────────────────────────
function Content() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>()
  const router = useRouter()
  const full = `${owner}/${repo}`
  const url = `https://github.com/${full}`
  const [res, setRes] = useState<Result | null>(null)
  const [raw, setRaw] = useState("")
  const [err, setErr] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([])
  const started = useRef("")
  const [open, setOpen] = useState(false)
  const [queued, setQueued] = useState<{ text: string; ctx?: string; id: number } | null>(null)
  // Other sections hand a question to the agent; on small screens this also opens the chat sheet.
  const ask = (text: string, ctx?: string) => { setQueued({ text, ctx, id: Date.now() }); if (!matchMedia("(min-width: 1024px)").matches) setOpen(true) }
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

  const run = useCallback(async () => {
    setErr(""); setRes(null); setRaw("")
    const key = `oshunt:analysis:${full.toLowerCase()}`
    try { const c = sessionStorage.getItem(key); if (c) { setRes(JSON.parse(c)); return } } catch {}
    try {
      const r = await fetch("/api/analyze", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: url, expertiseLevel: "Explorer" }),
      })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || "We could not analyze this repository.") }
      const d = await r.json()
      if (!alive.current) return
      if (d?.result && typeof d.result === "object") {
        setRes(d.result)
        try { sessionStorage.setItem(key, JSON.stringify(d.result)) } catch {}
      } else if (typeof d?.raw === "string") setRaw(d.raw)
      else throw new Error("The analysis came back in a format we did not expect.")
      window.dispatchEvent(new CustomEvent("usage:updated"))
    } catch (e) {
      if (alive.current) setErr(e instanceof Error ? e.message : "Something went wrong.")
    }
  }, [full, url])

  // Once per repo. The ref also stops React Strict Mode from calling the API twice in dev.
  useEffect(() => {
    if (!VALID.test(owner ?? "") || !VALID.test(repo ?? "")) { setErr("This link is not a valid GitHub repository."); return }
    if (started.current === full) return
    started.current = full
    setMsgs([])
    run()
  }, [owner, repo, full, run])

  const retry = () => { started.current = full; run() }
  const ready = !!(res || raw)
  const m = res?.metadata
  const st = statsOf(m)
  const sigs = m ? signals(m) : []
  const steps = { run: res ? parseSteps(res.howToRun) : [], change: res ? parseSteps(res.howToContribute) : [] }
  const secs = res ? [
    sigs.length > 1 && { id: "ready", label: "Readiness" },
    steps.run.length > 0 && { id: "run", label: "Run it" },
    { id: "map", label: "Repo map" },
    (res.startFiles ?? []).length > 0 && { id: "files", label: "Key files" },
    { id: "issues", label: "Issues" },
    steps.change.length > 0 && { id: "change", label: "First change" },
    
    (res.techStack?.length > 0 || res.framework) && { id: "stack", label: "Stack" },
  ].filter(Boolean) as { id: string; label: string }[] : []
  const active = useActive(secs.map(s => s.id))
  // keep the active chip visible in the scrollable nav on small screens
  useEffect(() => { document.querySelector('nav[aria-label="Sections"] [aria-current="true"]')?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }) }, [active])
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })

  const analysisText = raw || (res
    ? [`Purpose: ${res.purpose}`, `Tech stack: ${(res.techStack ?? []).join(", ")}`,
       `Start here: ${(res.startFiles ?? []).map(f => `${f.path} — ${f.why}`).join("; ")}`,
       `How to run: ${res.howToRun}`, `How to contribute: ${res.howToContribute}`].join("\n\n")
    : "")
  const chat = <Chat ready={ready} url={url} analysis={analysisText} msgs={msgs} setMsgs={setMsgs} name={repo} queued={queued} />

  return (
    <main className="relative min-h-dvh bg-[#090909] text-[#e0e0e0]">
      <TooltipProvider delayDuration={150}>
      <style>{CSS}</style>
      <Navbar />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[90vw] max-w-[760px] -translate-x-1/2 rounded-full bg-[#a8ff3e]/[0.04] blur-[110px]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl gap-6 px-4 pb-28 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-12 lg:pt-8">
        <div className="min-w-0 space-y-5">
          <button onClick={() => router.back()} className={ghost}><Ico d={P.back} /> Back to discovery</button>

          {/* Hero: always visible, fills in as the analysis lands */}
          <Card className={`${card} hero relative overflow-hidden ${ready || err ? "" : "loading"}`}>
            <CardContent className="p-5 sm:p-8">
              <div className="flex items-start gap-4 sm:gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://github.com/${owner}.png?size=120`} alt="" width={64} height={64} className="size-14 shrink-0 rounded-xl border border-[#1a1a1a] bg-[#111] sm:size-16" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e]">Analysis</Badge>
                    {m?.primaryLanguage && <Badge variant="outline" className="border-[#1a1a1a] text-[#8a8a8a]">{m.primaryLanguage}</Badge>}
                    {res?.repositoryType && <Badge variant="outline" className="border-[#1a1a1a] text-[#8a8a8a]">{res.repositoryType}</Badge>}
                  </div>
                  <h1 aria-label={full} className="mt-2 break-words text-2xl font-semibold tracking-tight text-white sm:text-4xl"><span aria-hidden="true" className="text-[#8a8a8a]">{owner}/</span><Scramble text={repo} /></h1>
                </div>
              </div>

              <div className="mt-5 min-h-14">
                {res ? <p className="break-words text-base leading-relaxed text-white sm:text-lg"><Inline text={res.purpose} /></p>
                  : ready || err ? null : <Working />}
              </div>

              {(!ready && !err) || st.length > 0 ? (
                <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#1a1a1a] sm:grid-cols-4">
                  {ready ? st.map(s => (
                    <Tip key={s.k} tip={TIPS[s.k]}>
                      <dt className="flex items-center gap-1.5 text-xs text-[#8a8a8a]"><Ico d={s.i} c="size-3.5" />{s.k}</dt>
                      <dd className="mt-1 truncate text-xl font-semibold text-white">{s.n !== undefined ? <Count to={s.n} /> : s.t}</dd>
                    </Tip>
                  )) : [0, 1, 2, 3].map(i => <div key={i} className="bg-[#0a0a0a] p-4"><Sk c="h-3 w-16" /><Sk c="mt-2 h-6 w-20" /></div>)}
                </dl>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild className={`${lime} w-full sm:w-auto`}><a href={url} target="_blank" rel="noreferrer">Open on GitHub <Ico d={P.out} /></a></Button>
              </div>
            </CardContent>
          </Card>

          {/* Section nav */}
          {secs.length > 1 && (
            <nav aria-label="Sections" className="sticky top-16 z-30 -mx-4 overflow-x-auto border-b border-[#1a1a1a] bg-[#090909]/90 px-4 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2"> {/* top-16 = Navbar height, adjust if yours differs */}
              <ul className="flex min-w-max gap-1 py-1.5">
                {secs.map(s => (
                  <li key={s.id}>
                    <button type="button" onClick={() => go(s.id)} aria-current={active === s.id ? "true" : undefined}
                      className={`min-h-11 cursor-pointer rounded-lg px-4 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e] ${active === s.id ? "bg-[#a8ff3e]/10 text-[#a8ff3e]" : "text-[#8a8a8a] hover:text-white"}`}>{s.label}</button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {err ? (
            <div role="alert" className="rounded-xl border border-[#ff4d6d]/30 bg-[#ff4d6d]/[0.04] p-5">
              <p className="font-medium text-white">{err}</p>
              <p className="mt-1 text-sm text-[#8a8a8a]">Check that this is a public GitHub repository, then try again.</p>
              <Button onClick={retry} className={`mt-4 ${lime}`}>Try again</Button>
            </div>
          ) : !ready ? <Placeholder />
          : raw ? <Card className={card}><CardContent className="md p-5 text-[15px] leading-relaxed sm:p-7"><ReactMarkdown>{raw}</ReactMarkdown></CardContent></Card>
          : res && (
            <>
              {sigs.length > 1 && <Sec id="ready" icon={P.pulse} title="Is this repo ready for you?" sub="Worked out from live GitHub data"><Readiness sigs={sigs} /></Sec>}
              {steps.run.length > 0 && <Sec id="run" icon={P.run} title="Run it on your computer" sub="Open a terminal and follow these in order"><Rail steps={steps.run} k={`${full}:run`} /></Sec>}
              <Sec id="map" icon={P.map} title="Where things live" sub="Open folders to explore. Pins mark the way to your first files"><RepoMap full={full} starts={(res.startFiles ?? []).map(f => f.path)} /></Sec>
              {(res.startFiles ?? []).length > 0 && (
                <Sec id="files" icon={P.file} title="Open these files first" sub="The best places to start reading">
                  <ul className="-my-2 divide-y divide-[#1a1a1a]">
                    {res.startFiles.map(f => (
                      <li key={f.path}>
                        <a href={`${url}/blob/HEAD/${f.path}`} target="_blank" rel="noreferrer" className="block min-h-11 cursor-pointer rounded-md py-4 transition-colors hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]">
                          <p className="break-all font-mono text-sm text-[#bdff6b]">{f.path}</p>
                          <p className="mt-1 text-sm leading-relaxed text-[#8a8a8a]"><Inline text={f.why} /></p>
                        </a>
                      </li>
                    ))}
                  </ul>
                </Sec>
              )}
              <Sec id="issues" icon={P.issue} title="Pick a beginner issue" sub="Live from GitHub. Ask the agent to explain any of them"><BeginnerIssues full={full} onAsk={ask} /></Sec>
              {steps.change.length > 0 && <Sec id="change" icon={P.branch} title="Make your first change" sub="From idea to pull request"><Rail steps={steps.change} k={`${full}:change`} /></Sec>}
              {(res.techStack?.length > 0 || res.framework) && (
                <Sec id="stack" icon={P.stack} title="What it is built with">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set([res.framework, ...(res.techStack ?? [])].filter(Boolean) as string[])).map(t => (
                      <Badge key={t} variant="outline" className="border-[#1a1a1a] px-3 py-1 text-[13px] font-normal text-[#e0e0e0]">{t}</Badge>
                    ))}
                  </div>
                  {res.architecture && (
                    <Accordion type="single" collapsible className="mt-5 border-t border-[#1a1a1a]">
                      <AccordionItem value="tech" className="border-b-0">
                        <AccordionTrigger className="min-h-11 text-sm font-normal text-[#8a8a8a] hover:text-[#a8ff3e] hover:no-underline">Show the technical view</AccordionTrigger>
                        <AccordionContent><p className="leading-relaxed text-[#8a8a8a]"><Inline text={res.architecture} /></p></AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </Sec>
              )}
            </>
          )}

          {ready && (
            <Card className="border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.04]">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div>
                  <h2 className="text-lg font-semibold text-white">Ready to pick a task?</h2>
                  <p className="mt-1 text-sm text-[#8a8a8a]">Issues labelled for beginners make the safest first pull request.</p>
                </div>
                <Button asChild className={`${lime} w-full shrink-0 sm:w-auto`}>
                  <a href={`${url}/issues?q=${encodeURIComponent('is:issue is:open label:"good first issue"')}`} target="_blank" rel="noreferrer">Find beginner issues <Ico d={P.out} /></a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <aside className="sticky top-20 hidden h-[calc(100dvh-6.5rem)] lg:block">{chat}</aside>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button className={`${lime} fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 gap-2 rounded-full lg:hidden`}><Ico d={P.chat} /> Ask about this repo</Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85dvh] rounded-t-2xl border-[#1a1a1a] bg-[#0a0a0a] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15" />
          <SheetTitle className="sr-only">Ask about this repo</SheetTitle>
          {chat}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
    </main>
  )
}

// ─── Building blocks ─────────────────────────────────────────────────────────
// Reveals a block as it scrolls into view (same idea as GitLense, own implementation).
function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) { setOn(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } }, { rootMargin: "0px 0px -8% 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} className={`transition-all duration-700 ease-out ${on ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>{children}</div>
}

// Repo name decrypts left to right on load. The h1 carries the real text for screen readers.
const GLYPH = "abcdefghijklmnopqrstuvwxyz0123456789/_-"
function Scramble({ text }: { text: string }) {
  const [out, setOut] = useState(text)
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let f = 0
    const id = setInterval(() => {
      f++
      if (f / 2 >= text.length) { clearInterval(id); setOut(text); return }
      setOut(text.split("").map((c, i) => (c === " " || i < f / 2 ? c : GLYPH[Math.floor(Math.random() * GLYPH.length)])).join(""))
    }, 40)
    return () => clearInterval(id)
  }, [text])
  return <span aria-hidden="true">{out}</span>
}

const TIPS: Record<string, string> = {
  Stars: "How many people saved this repo. More stars usually means more people use it.",
  Forks: "Copies other people made to work on. You will make one too.",
  "Open issues": "Tasks and bugs people reported. These are what you can work on.",
  "Last update": "When someone last changed the code. Recent means the project is alive.",
  License: "The rules for using and sharing the code.",
}
function Tip({ tip, children }: { tip: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div tabIndex={0} className="bg-[#0a0a0a] p-4 outline-none transition-colors hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#a8ff3e]">{children}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-60 border-[#1a1a1a] bg-[#111] text-[#e0e0e0]">{tip}</TooltipContent>
    </Tooltip>
  )
}

// Section label (icon plus small lime caps) matches GitLense's result labels.
const LABEL: Record<string, string> = { ready: "Readiness", run: "Setup", map: "Repo map", files: "Key files", issues: "Issues", change: "Contribute", stack: "Stack" }
function Sec({ id, icon, title, sub, children }: { id: string; icon: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <Reveal>
      <Card id={id} className={`${card} scroll-mt-32`}>
        <CardContent className="p-5 sm:p-7">
          <header className="mb-6">
            <div className="mb-2.5 flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-wider text-[#a8ff3e]"><Ico d={icon} c="size-3.5" />{LABEL[id] ?? id}</div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {sub && <p className="mt-0.5 text-sm text-[#8a8a8a]">{sub}</p>}
          </header>
          {children}
        </CardContent>
      </Card>
    </Reveal>
  )
}

function Working() {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI(n => (n + 1) % SCAN_LINES.length), 2400); return () => clearInterval(t) }, [])
  return <p role="status" aria-live="polite" className="flex items-center gap-2.5 text-[#e0e0e0]"><span className="dot" />{SCAN_LINES[i]}…</p>
}

function Placeholder() {
  return (
    <div aria-busy="true" className="space-y-5">
      {[0, 1, 2].map(i => (
        <Card key={i} className={card}><CardContent className="space-y-3 p-5 sm:p-7"><Sk c="h-5 w-40" /><Sk c="h-4 w-full" /><Sk c="h-4 w-5/6" /><Sk c="h-4 w-2/3" /></CardContent></Card>
      ))}
    </div>
  )
}

function Readiness({ sigs }: { sigs: Sig[] }) {
  const score = Math.round((sigs.reduce((a, s) => a + s.level, 0) / (sigs.length * 2)) * 100)
  const tone = score >= 75 ? "#a8ff3e" : score >= 45 ? "#ffb84d" : "#ff4d6d"
  const label = score >= 75 ? "Good place to start" : score >= 45 ? "Worth a look" : "Check before you start"
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4 sm:w-56 sm:shrink-0" role="img" aria-label={`Readiness ${score} out of 100: ${label}`}>
        <svg viewBox="0 0 72 72" className="size-[72px]" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => { const lit = i < Math.round((score / 100) * 24); return (
            <rect key={i} x="35" y="2" width="2" height="9" rx="1" transform={`rotate(${i * 15} 36 36)`} fill={lit ? tone : "rgba(255,255,255,.1)"} className={lit ? "seg" : ""} style={{ animationDelay: `${200 + i * 35}ms` }} />
          ) })}
        </svg>
        <div><p className="text-2xl font-semibold text-white">{score}</p><p className="text-sm text-[#8a8a8a]">{label}</p></div>
      </div>
      <ul className="grid flex-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {sigs.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm">
            <span className="mt-0.5 shrink-0" style={{ color: s.level === 2 ? "#a8ff3e" : s.level === 1 ? "#ffb84d" : "#ff4d6d" }}><Ico d={s.level === 2 ? P.ok : s.level === 1 ? P.mid : P.no} c="size-3.5" /></span>
            <span className="text-[#e0e0e0]">{s.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Interactive path: tick a step and the line fills down to it. Progress is saved per repo in this browser.
function Rail({ steps, k }: { steps: string[]; k: string }) {
  const key = `oshunt:done:${k.toLowerCase()}`
  const [done, setDone] = useState<number[]>([])
  useEffect(() => { try { setDone(JSON.parse(localStorage.getItem(key) || "[]")) } catch {} }, [key])
  const save = (n: number[]) => { setDone(n); try { n.length ? localStorage.setItem(key, JSON.stringify(n)) : localStorage.removeItem(key) } catch {} }
  const count = steps.filter((_, i) => done.includes(i)).length
  return (
    <div>
      <div className="mb-6 flex items-center gap-3" aria-live="polite">
        <Progress value={(count / steps.length) * 100} aria-label="Steps done" className="h-1.5 flex-1 bg-white/[0.06] [&>div]:bg-[#a8ff3e]" />
        <span className="shrink-0 text-sm text-[#8a8a8a]">{count} of {steps.length} done</span>
        {count > 0 && <button type="button" onClick={() => save([])} className="min-h-11 cursor-pointer px-2 text-sm text-[#8a8a8a] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]">Reset</button>}
      </div>
      <ol className="relative ml-3 space-y-7 border-l border-[#1a1a1a] pl-8">
        {steps.map((s, i) => {
          const on = done.includes(i)
          return (
            <li key={i} className={`step relative ${on ? "on" : ""}`}>
              <button type="button" role="checkbox" aria-checked={on} aria-label={`Step ${i + 1}, ${on ? "done" : "mark as done"}`} onClick={() => save(on ? done.filter(x => x !== i) : [...done, i])} className="node">
                {on ? <Ico d={P.ok} c="size-3" /> : i + 1}
              </button>
              <p className={`break-words leading-relaxed transition-colors ${on ? "text-[#8a8a8a]" : "text-[#e0e0e0]"}`}><Inline text={s} /></p>
              {cmds(s).length > 0 && <div className="mt-2 space-y-2">{cmds(s).map((c, j) => <Cmd key={j} text={c} />)}</div>}
            </li>
          )
        })}
      </ol>
      {count === steps.length && <p className="mt-6 text-sm text-[#a8ff3e]">Every step is done. Move on to the next section.</p>}
    </div>
  )
}

function Cmd({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <div className="flex items-center rounded-lg border border-[#1a1a1a] bg-[#050505] pl-3">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-3 font-mono text-xs text-[#bdff6b]">{text}</code>
      <button type="button" aria-label={ok ? "Copied" : "Copy command"} onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500) }}
        className="grid size-11 shrink-0 cursor-pointer place-items-center text-[#8a8a8a] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]"><Ico d={ok ? P.ok : P.copy} /></button>
    </div>
  )
}

// Chat: typing reveal, stop button, follow-up chips, and hand-offs from other sections (issue explainers).
const FOLLOW = ["Explain that more simply", "Show me an example", "What should I do next?"]
function Chat({ ready, url, analysis, msgs, setMsgs, name, queued }: {
  ready: boolean; url: string; analysis: string; msgs: Msg[]; setMsgs: (m: Msg[]) => void; name: string
  queued: { text: string; ctx?: string; id: number } | null
}) {
  const [q, setQ] = useState("")
  const [busy, setBusy] = useState(false)
  const [typing, setTyping] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const ac = useRef<AbortController | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const halt = useRef(false)
  const seen = useRef(0)
  const latest = useRef(msgs)
  latest.current = msgs
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [msgs, busy])
  useEffect(() => () => { ac.current?.abort(); if (timer.current) clearInterval(timer.current) }, [])

  const stop = () => { halt.current = true; ac.current?.abort() }

  const reveal = (base: Msg[], full: string) => new Promise<void>(done => {
    const words = full.split(" ")
    let i = 0
    halt.current = false
    setMsgs([...base, { role: "assistant", content: "" }])
    setTyping(true)
    timer.current = setInterval(() => {
      if (halt.current || i >= words.length) {
        if (timer.current) clearInterval(timer.current)
        timer.current = null
        setTyping(false)
        done()
        return
      }
      i += 3
      setMsgs([...base, { role: "assistant", content: words.slice(0, i).join(" ") }])
    }, 32)
  })

  async function send(text: string, ctx?: string) {
    const t = text.trim()
    if (!t || busy || typing || !ready) return
    const next: Msg[] = [...latest.current, { role: "user", content: t, ctx }]
    setMsgs(next); setQ(""); setBusy(true)
    const c = new AbortController()
    ac.current = c
    let reply = "That did not go through. Send it again."
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: c.signal,
        body: JSON.stringify({ repoUrl: url, analysis, expertiseLevel: "Explorer", messages: next.map(m => ({ role: m.role, content: m.ctx ? `${m.content}\n\n${m.ctx}` : m.content })) }),
      })
      const d = await r.json().catch(() => null)
      if (r.ok) window.dispatchEvent(new CustomEvent("usage:updated"))
      const v = typeof d === "string" ? d : d?.reply ?? d?.response ?? d?.message ?? d?.answer ?? (r.ok ? null : d?.error)
      if (typeof v === "string" && v) reply = v
    } catch (e) {
      if ((e as Error)?.name === "AbortError") { setBusy(false); return }
    }
    setBusy(false)
    await reveal(next, reply)
  }

  useEffect(() => {
    if (queued && ready && queued.id !== seen.current) { seen.current = queued.id; send(queued.text, queued.ctx) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, ready])

  const working = busy || typing
  const last = msgs[msgs.length - 1]
  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] ${working ? "live" : ""}`}>
      <div className="border-b border-[#1a1a1a] px-4 py-3 text-sm font-medium text-white">Ask about {name}</div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live={typing ? "off" : "polite"}>
        {msgs.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-[#8a8a8a]">{ready ? "Ask anything about this repo." : "You can ask questions as soon as the analysis is ready."}</p>
            <div className="flex flex-wrap gap-2">
              {CHIPS.map(c => (
                <button key={c} type="button" onClick={() => send(c)} disabled={!ready}
                  className="min-h-11 cursor-pointer rounded-full border border-[#1a1a1a] px-4 text-sm text-[#e0e0e0] transition-colors hover:border-[#a8ff3e]/50 hover:text-[#a8ff3e] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]">{c}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => m.role === "user" ? (
          <div key={i} className="flex justify-end"><p className="max-w-[88%] whitespace-pre-wrap break-words rounded-2xl bg-[#a8ff3e] px-4 py-2.5 text-sm text-black">{m.content}</p></div>
        ) : (
          <div key={i} className="md max-w-[92%] rounded-2xl bg-white/[0.04] px-4 py-2.5 text-sm leading-relaxed"><ReactMarkdown>{m.content}</ReactMarkdown>{typing && i === msgs.length - 1 && <span className="caret" />}</div>
        ))}
        {busy && <p className="text-sm text-[#8a8a8a]">Thinking…</p>}
        {!working && last?.role === "assistant" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {FOLLOW.map(c => (
              <button key={c} type="button" onClick={() => send(c)}
                className="min-h-11 cursor-pointer rounded-full border border-[#1a1a1a] px-4 text-sm text-[#8a8a8a] transition-colors hover:border-[#a8ff3e]/50 hover:text-[#a8ff3e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]">{c}</button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="flex gap-2 border-t border-[#1a1a1a] p-3">
        <Input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && send(q)} disabled={!ready}
          placeholder={ready ? "Ask a question" : "Waiting for the analysis…"} className="h-11 border-[#1a1a1a] bg-transparent" />
        <Button onClick={() => (working ? stop() : send(q))} disabled={!ready} aria-label={working ? "Stop" : "Send"}
          className="size-11 shrink-0 cursor-pointer bg-[#a8ff3e] p-0 text-black hover:bg-[#bdff6b]"><Ico d={working ? P.stop : P.send} /></Button>
      </div>
    </div>
  )
}

export default function AnalysisPage() {
  return (
    <RequireAuth>
      <Content />
    </RequireAuth>
  )
}

const CSS = `
@keyframes beam{0%{top:0;opacity:0}12%,88%{opacity:1}100%{top:100%;opacity:0}}
@keyframes draw{from{stroke-dashoffset:176}}
@keyframes blink{50%{opacity:.25}}
.hero.loading::after{content:"";position:absolute;inset-inline:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#a8ff3e,transparent);box-shadow:0 0 22px #a8ff3e;animation:beam 2.4s ease-in-out infinite;pointer-events:none}
.dot{width:8px;height:8px;border-radius:9999px;background:#a8ff3e;box-shadow:0 0 10px #a8ff3e;animation:blink 1.2s ease-in-out infinite}
.gauge{animation:draw 1.3s .2s cubic-bezier(.2,.7,.2,1) both}
.node{position:absolute;left:calc(-2rem - 11.5px);top:0;width:22px;height:22px;border-radius:9999px;display:grid;place-items:center;font-size:11px;font-weight:600;background:#0f0f0f;border:1.5px solid #2a2a2a;color:#8a8a8a;cursor:pointer;transition:all .4s}
.node::before{content:"";position:absolute;inset:-11px}
.node:focus-visible{outline:2px solid #a8ff3e;outline-offset:3px}
.step.on::before{content:"";position:absolute;left:calc(-2rem - 1px);top:22px;bottom:-1.75rem;width:2px;background:#a8ff3e;box-shadow:0 0 10px rgba(168,255,62,.45)}
.step:last-child::before{display:none}
.caret{display:inline-block;width:7px;height:1em;margin-left:2px;vertical-align:-2px;background:#a8ff3e;animation:blink 1s steps(2) infinite}
.step.on .node{background:#a8ff3e;border-color:#a8ff3e;color:#000;box-shadow:0 0 0 4px rgba(168,255,62,.14),0 0 16px rgba(168,255,62,.5)}
.md p{margin:.4rem 0}.md p:first-child{margin-top:0}.md p:last-child{margin-bottom:0}
.md ul,.md ol{margin:.4rem 0;padding-left:1.2rem}.md ul{list-style:disc}.md ol{list-style:decimal}
.md code{background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;font-size:.85em}
.md pre{overflow-x:auto;background:#050505;border:1px solid #1a1a1a;border-radius:8px;padding:10px;margin:.5rem 0}.md pre code{background:none;padding:0}
.md a{color:#a8ff3e}
@property --a{syntax:"<angle>";initial-value:0deg;inherits:false}
@keyframes ang{to{--a:360deg}}
@keyframes segin{from{opacity:.1}}
.live::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.5px;pointer-events:none;background:conic-gradient(from var(--a),transparent 62%,#a8ff3e);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ang 2.2s linear infinite}
.seg{animation:segin .4s both}
@media (prefers-reduced-motion:reduce){.hero.loading::after,.dot,.gauge,.live::before,.seg,.caret{animation:none}.rail,.node{transition:none}}
`
