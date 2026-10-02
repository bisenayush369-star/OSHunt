"use client"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/ui/Navbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

const EXAMPLES = ["vercel/next.js", "microsoft/vscode", "facebook/react", "openai/openai-cookbook"]
const VALID = /^(?!\.+$)[\w.-]{1,100}$/ // same rule as the analysis page: blocks "." and ".."
const TREE = ["README.md", "package.json", "src/", "src/index.ts", "CONTRIBUTING.md"]
const COVERS = [
  { t: "What it does", d: "The project explained in plain words.", i: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v5M12 16h.01" },
  { t: "How to run it", d: "Setup steps you can copy and tick off.", i: "M4 17l6-6-6-6M12 19h8" },
  { t: "Where things live", d: "A folder map with the first files to read.", i: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" },
  { t: "Your first task", d: "Open beginner issues, explained by an agent.", i: "M5 12l4 4L19 7" },
]

// Accepts owner/repo, github.com/owner/repo, full URLs (extra path, query, .git) and git@github.com:owner/repo.git
function parse(input: string) {
  const s = input.trim().replace(/^git@github\.com:/i, "").replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
  const [owner, rest] = s.split("/")
  const repo = (rest ?? "").split(/[?#]/)[0].replace(/\.git$/i, "")
  return VALID.test(owner ?? "") && VALID.test(repo) ? { owner, repo } : null
}

function Chip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="min-h-11 cursor-pointer rounded-full border border-[#1a1a1a] bg-[#0f0f0f] px-4 text-sm text-[#e0e0e0] transition-colors hover:border-[#a8ff3e]/50 hover:text-[#a8ff3e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]">
      {children}
    </button>
  )
}

export default function AnalysisRootPage() {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [recent, setRecent] = useState<string[]>([])
  const field = useRef<HTMLInputElement>(null)

  // Repos already analyzed in this tab (the analysis page caches them in sessionStorage)
  useEffect(() => {
    try { setRecent(Object.keys(sessionStorage).filter(k => k.startsWith("oshunt:analysis:")).map(k => k.replace("oshunt:analysis:", "")).slice(0, 6)) } catch {}
  }, [])

  const go = (full: string) => router.push(`/analysis/${full.split("/").map(encodeURIComponent).join("/")}`)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!value.trim()) { setError("Paste a GitHub repo link first."); field.current?.focus(); return }
    const p = parse(value)
    if (!p) { setError("That does not look like a GitHub repo. Try https://github.com/vercel/next.js or vercel/next.js"); field.current?.focus(); return }
    setError("")
    go(`${p.owner}/${p.repo}`)
  }

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[#090909] text-[#e0e0e0]">
      <style>{CSS}</style>
      <Navbar />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(168,255,62,0.10),transparent_60%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-20">
        <section>
          <Badge variant="outline" className="border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e]">Analysis</Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">Read any repo in plain words</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#8a8a8a] sm:text-lg">
            Paste a public GitHub repo. OSHunt explains what it does, how to run it, and where to make your first change.
          </p>

          <form onSubmit={submit} noValidate className="mt-8">
            <label htmlFor="repo" className="sr-only">GitHub repository</label>
            <div className="sweep rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="repo" ref={field} value={value} onChange={e => { setValue(e.target.value); if (error) setError("") }}
                  placeholder="github.com/vercel/next.js" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false}
                  aria-invalid={!!error} aria-describedby={error ? "repo-err" : undefined}
                  className="h-12 flex-1 border-0 bg-transparent px-3 text-base text-white shadow-none placeholder:text-[#6d6d6d] focus-visible:ring-0" />
                <Button type="submit" className="h-12 w-full cursor-pointer rounded-xl bg-[#a8ff3e] px-8 text-base font-semibold text-black hover:bg-[#bdff6b] sm:w-auto">Analyze</Button>
              </div>
            </div>
            {error && <p id="repo-err" role="alert" className="mt-3 text-sm text-[#ff7b7b]">{error}</p>}
          </form>

          <div className="mt-6">
            <p className="mb-2 text-sm text-[#8a8a8a]">Try one</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(x => <Chip key={x} onClick={() => { setValue(`https://github.com/${x}`); setError(""); field.current?.focus() }}>{x}</Chip>)}
            </div>
          </div>

          {recent.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm text-[#8a8a8a]">Analyzed in this session</p>
              <div className="flex flex-wrap gap-2">{recent.map(r => <Chip key={r} onClick={() => go(r)}>{r}</Chip>)}</div>
            </div>
          )}
        </section>

        <aside>
          <Card className="border-[#1a1a1a] bg-[#0d0d0d]">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-white">What you get</h2>
                <Badge variant="outline" className="border-[#1a1a1a] text-[#8a8a8a]">Preview</Badge>
              </div>
              <ul className="mt-5 space-y-4">
                {COVERS.map(c => (
                  <li key={c.t} className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#a8ff3e]/10 text-[#a8ff3e]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true"><path d={c.i} /></svg>
                    </span>
                    <div className="min-w-0"><p className="font-medium text-white">{c.t}</p><p className="text-sm leading-relaxed text-[#8a8a8a]">{c.d}</p></div>
                  </li>
                ))}
              </ul>
              <div aria-hidden="true" className="scanbox relative mt-6 overflow-hidden rounded-xl border border-[#1a1a1a] bg-[#080808] px-4 py-3 font-mono text-xs">
                {TREE.map((t, i) => <p key={t} className="row py-1 text-[#8a8a8a]" style={{ animationDelay: `${i * 0.72}s` }}>{t}</p>)}
                <span className="beam" />
              </div>
              <p className="mt-3 text-xs text-[#8a8a8a]">Sample file list. A real analysis reads the repo you paste.</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}

const CSS = `
@property --a{syntax:"<angle>";initial-value:0deg;inherits:false}
@keyframes ang{to{--a:360deg}}
@keyframes beam{0%{top:0;opacity:0}10%,90%{opacity:1}100%{top:100%;opacity:0}}
@keyframes lit{0%,18%{color:#a8ff3e;text-shadow:0 0 12px rgba(168,255,62,.6)}30%,100%{color:#8a8a8a;text-shadow:none}}
.sweep{position:relative}
.sweep:focus-within::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1.5px;pointer-events:none;background:conic-gradient(from var(--a),rgba(168,255,62,.15) 55%,#a8ff3e);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:ang 2.4s linear infinite}
.scanbox .beam{position:absolute;inset-inline:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#a8ff3e,transparent);box-shadow:0 0 18px #a8ff3e;animation:beam 3.6s ease-in-out infinite}
.scanbox .row{animation:lit 3.6s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.sweep:focus-within::before,.scanbox .beam,.scanbox .row{animation:none}}
`
