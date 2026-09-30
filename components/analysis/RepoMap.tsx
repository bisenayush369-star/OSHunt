"use client"
import { useEffect, useState } from "react"

type Ent = { name: string; path: string; type: "dir" | "file" }
const cache = new Map<string, Ent[]>()
const NOISE = /^(\.git|node_modules|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|poetry\.lock|\.gitignore|\.gitattributes|\.editorconfig)$/i
const HINT: Record<string, string> = {
  src: "Main source code", app: "App routes and pages", pages: "Page routes", components: "Reusable UI pieces", lib: "Shared helpers",
  utils: "Small helper functions", hooks: "Reusable hooks", api: "Server endpoints", server: "Server-side code", client: "Browser-side code",
  test: "Tests", tests: "Tests", __tests__: "Tests", spec: "Tests", docs: "Documentation", examples: "Example projects",
  scripts: "Build and dev scripts", packages: "Separate packages (monorepo)", apps: "Separate apps (monorepo)", public: "Static files like images and icons",
  assets: "Images and static files", styles: "CSS and styling", config: "Settings", ".github": "CI, issue and PR templates", ".vscode": "Editor settings",
  prisma: "Database schema", migrations: "Database changes", "package.json": "Dependencies and scripts", "readme.md": "What the project is",
  "contributing.md": "Rules for contributing", license: "What you may do with the code", dockerfile: "Run it in a container", makefile: "Shortcut commands",
}
const hintOf = (n: string) => HINT[n.toLowerCase()]
const Ic = ({ d, c = "size-4" }: { d: string; c?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={c} aria-hidden="true"><path d={d} /></svg>
)
const FOLDER = "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
const FILE = "M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8zM14 3v5h5"

export function RepoMap({ full, starts }: { full: string; starts: string[] }) {
  return (
    <div>
      <Dir full={full} path="" depth={0} starts={starts} />
      <p className="mt-4 text-xs leading-relaxed text-[#8a8a8a]">Pins come from the analysis. Folder notes are general guides based on common folder names.</p>
    </div>
  )
}

function Dir({ full, path, depth, starts }: { full: string; path: string; depth: number; starts: string[] }) {
  const k = `${full}:${path}`
  const [list, setList] = useState<Ent[] | null>(cache.get(k) ?? null)
  const [err, setErr] = useState("")

  useEffect(() => {
    if (cache.has(k)) return
    let live = true
    fetch(`https://api.github.com/repos/${full}/contents${path ? "/" + encodeURI(path) : ""}`, { headers: { Accept: "application/vnd.github+json" } })
      .then(async (r) => {
        if (r.status === 403 || r.status === 429) throw new Error("GitHub is limiting requests right now. Try again in a few minutes.")
        if (!r.ok) throw new Error("Could not load this folder.")
        const j = (await r.json()) as Array<{ name: string; path: string; type: string }>
        const e: Ent[] = j.filter((x) => !NOISE.test(x.name)).map((x) => ({
          name: x.name,
          path: x.path,
          type: x.type === "dir" ? "dir" as const : "file" as const,
        }))
          .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1))
        cache.set(k, e)
        if (live) setList(e)
      })
      .catch((e) => { if (live) setErr(e instanceof Error ? e.message : "Could not load this folder.") })
    return () => { live = false }
  }, [k, full, path])

  if (err) return <p role="alert" className="py-2 text-sm text-[#ff4d6d]">{err}</p>
  if (!list) return <div aria-busy="true" className="space-y-2 py-1">{[0, 1, 2].map((i) => <div key={i} className="h-6 animate-pulse rounded bg-white/[0.05]" />)}</div>

  return (
    <ul className={depth ? "ml-3 border-l border-[#1a1a1a] pl-3" : ""}>
      {list.map((e) => <Row key={e.path} e={e} full={full} depth={depth} starts={starts} />)}
    </ul>
  )
}

function Row({ e, full, depth, starts }: { e: Ent; full: string; depth: number; starts: string[] }) {
  const dir = e.type === "dir"
  const pin = starts.some((s) => s === e.path || s.startsWith(e.path + "/"))
  const [open, setOpen] = useState(dir && pin && depth < 2)
  const hint = hintOf(e.name)
  const cls = "flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#a8ff3e]"
  const inner = (
    <>
      {dir && <Ic d="M9 6l6 6-6 6" c={`size-3.5 shrink-0 text-[#8a8a8a] transition-transform ${open ? "rotate-90" : ""}`} />}
      <span className={`shrink-0 ${dir ? "text-[#a8ff3e]" : "text-[#8a8a8a]"}`}><Ic d={dir ? FOLDER : FILE} /></span>
      <span className="break-all font-mono text-sm text-white">{e.name}{dir ? "/" : ""}</span>
      {pin && <span className="rounded-full bg-[#a8ff3e]/15 px-2 py-0.5 text-[11px] font-medium text-[#a8ff3e]">start here</span>}
      {hint && <span className="basis-full pl-6 text-xs text-[#8a8a8a] sm:basis-auto sm:pl-0">{hint}</span>}
    </>
  )

  return (
    <li>
      {dir
        ? <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={cls}>{inner}</button>
        : <a href={`https://github.com/${full}/blob/HEAD/${e.path}`} target="_blank" rel="noreferrer" className={cls}>{inner}</a>}
      {dir && open && depth < 3 && <Dir full={full} path={e.path} depth={depth + 1} starts={starts} />}
    </li>
  )
}
