import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { GithubApiError, NeedsGithubConnectError, createGithubClient, type GithubClient } from "@/components/lib/github"
import { readReadme } from "@/components/lib/readme-insight"
import { checkRateLimit } from "@/components/lib/ratelimit"
import { canAffordUsage, consumeQuota } from "@/components/lib/quota"

export const maxDuration = 30

// What one call costs against a signed-in user's GitHub allowance. Each call makes several GitHub requests
// (the usage log counts every one of them); raise this if the allowance should reflect that more closely.
const DETAILS_COST = 1

// Details load in two calls so the panel can show the facts, README and issues at once and the charts when they arrive:
//   core    repository, README, languages, issues, contributors, latest release
//   history star history and weekly commit activity (the slow part: GitHub counts stars page by page)
const querySchema = z.object({
  owner: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
  repo: z.string().regex(/^[A-Za-z0-9._-]{1,100}$/),
  part: z.enum(["core", "history"]).default("core"),
})

// ─── Reading GitHub's answers safely ───────────────────────────────────────
// Every value below is checked before it goes to the browser, so a surprise in GitHub's response never reaches the page.

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "")
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)
const iso = (v: unknown) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : "")
const hex = (v: unknown) => (typeof v === "string" && /^[0-9a-f]{6}$/i.test(v) ? `#${v}` : "#737373")
const avatar = (v: unknown) => (typeof v === "string" && v.startsWith("https://avatars.githubusercontent.com/") ? v.slice(0, 300) : "")
const login = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9-]{1,39}$/.test(v) ? v : "")
const web = (v: unknown) => {
  if (typeof v !== "string" || v.length > 200) return null
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
  } catch {
    return null
  }
}

async function read(gh: GithubClient, apiPath: string, label: string, extra: { revalidate?: number | false; emptyOn?: number[] } = {}) {
  const res = await gh.get(apiPath, { label, revalidate: extra.revalidate })
  if (extra.emptyOn?.includes(res.status)) return null
  if (!res.ok) throw await gh.fail(res, label)
  return res.json().catch(() => null) as Promise<unknown>
}

// ─── core ──────────────────────────────────────────────────────────────────

function issueRow(raw: unknown) {
  const o = obj(raw)
  if (o.pull_request) return null // GitHub lists pull requests among issues
  const number = num(o.number)
  const url = str(o.html_url, 300)
  if (!number || !url.startsWith("https://github.com/")) return null
  const labels = (Array.isArray(o.labels) ? o.labels : [])
    .map(l => (typeof l === "string" ? { name: l.slice(0, 40), color: "#737373" } : { name: str(obj(l).name, 40), color: hex(obj(l).color) }))
    .filter(l => l.name)
    .slice(0, 4)
  return { number, title: str(o.title, 160), url, labels, comments: num(o.comments), createdAt: iso(o.created_at), updatedAt: iso(o.updated_at), author: login(obj(o.user).login) }
}

async function issuesOf(gh: GithubClient, path: string, query: string, take: number) {
  const data = await read(gh, `/repos/${path}/issues?state=open&sort=updated&direction=desc&per_page=30${query}`, "/repos/{repo}/issues", { emptyOn: [404, 410] })
  return (Array.isArray(data) ? data : []).map(issueRow).filter((i): i is NonNullable<typeof i> => i !== null).slice(0, take)
}

async function loadCore(gh: GithubClient, path: string) {
  const repo = obj(await read(gh, `/repos/${path}`, "/repos/{repo}", { revalidate: 600 }))
  const topics = (Array.isArray(repo.topics) ? repo.topics : []).filter((t): t is string => typeof t === "string").slice(0, 20)
  const description = str(repo.description, 500)
  const partial: string[] = []
  const soft = async <T,>(name: string, run: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await run()
    } catch (err) {
      if (err instanceof NeedsGithubConnectError) throw err
      partial.push(name)
      return fallback
    }
  }

  const [languages, readme, recent, goodFirst, contributors, release] = await Promise.all([
    soft(
      "languages",
      async () => {
        const data = obj(await read(gh, `/repos/${path}/languages`, "/repos/{repo}/languages"))
        return Object.entries(data)
          .map(([name, bytes]) => ({ name: name.slice(0, 40), bytes: num(bytes) }))
          .filter(l => l.bytes > 0)
          .sort((a, b) => b.bytes - a.bytes)
          .slice(0, 10)
      },
      [] as { name: string; bytes: number }[]
    ),
    soft(
      "readme",
      async () => {
        const res = await gh.get(`/repos/${path}/readme`, { label: "/repos/{repo}/readme", accept: "application/vnd.github.raw+json" })
        if (res.status === 404) return null
        if (!res.ok) throw await gh.fail(res, "readme")
        return readReadme(await res.text(), topics, description)
      },
      null
    ),
    soft("issues", () => issuesOf(gh, path, "", 10), []),
    soft("issues", () => issuesOf(gh, path, "&labels=good%20first%20issue", 5), []),
    soft(
      "contributors",
      async () => {
        const res = await gh.get(`/repos/${path}/contributors?per_page=8`, { label: "/repos/{repo}/contributors" })
        if (res.status === 204) return []
        if (!res.ok) throw await gh.fail(res, "contributors")
        const rows = await res.json().catch(() => null)
        return (Array.isArray(rows) ? rows : [])
          .map(r => ({ login: login(obj(r).login), avatarUrl: avatar(obj(r).avatar_url), contributions: num(obj(r).contributions) }))
          .filter(c => c.login)
          .slice(0, 8)
      },
      [] as { login: string; avatarUrl: string; contributions: number }[]
    ),
    soft(
      "release",
      async () => {
        const r = obj(await read(gh, `/repos/${path}/releases/latest`, "/repos/{repo}/releases/latest", { emptyOn: [404] }))
        const url = str(r.html_url, 300)
        return r.tag_name && url.startsWith("https://github.com/") ? { tag: str(r.tag_name, 80), name: str(r.name, 120), publishedAt: iso(r.published_at), url, prerelease: r.prerelease === true } : null
      },
      null
    ),
  ])

  const license = obj(repo.license)
  const spdx = str(license.spdx_id, 40)
  const owner = obj(repo.owner)
  return {
    repo: {
      fullName: str(repo.full_name, 200),
      description: description || null,
      homepage: web(repo.homepage),
      license: spdx && spdx !== "NOASSERTION" ? spdx : str(license.name, 80) || null,
      defaultBranch: str(repo.default_branch, 100),
      createdAt: iso(repo.created_at),
      pushedAt: iso(repo.pushed_at),
      stars: num(repo.stargazers_count),
      forks: num(repo.forks_count),
      watchers: num(repo.subscribers_count),
      openIssues: num(repo.open_issues_count), // GitHub counts open pull requests in this number
      archived: repo.archived === true,
      isFork: repo.fork === true,
      topics,
      language: str(repo.language, 40) || null,
      sizeKb: num(repo.size),
      hasDiscussions: repo.has_discussions === true,
      owner: { login: login(owner.login), avatarUrl: avatar(owner.avatar_url), type: str(owner.type, 20) },
    },
    languages,
    readme,
    issues: { recent, goodFirst },
    contributors,
    release,
    partial: [...new Set(partial)],
  }
}

// ─── history ───────────────────────────────────────────────────────────────

const STAR_ACCEPT = "application/vnd.github.star+json" // adds `starred_at` to each stargazer
const PER_PAGE = 100
const SAMPLES = 10
// If the last page of a very large repository cannot be read, pages are sampled only from the start, up to here.
const FALLBACK_PAGES = 400

type Point = { t: number; n: number }

// Evenly spaced page numbers from 1 to `last`, both included.
function spread(last: number, count: number) {
  if (last <= count) return Array.from({ length: last }, (_, i) => i + 1)
  const pages = new Set<number>([1, last])
  for (let i = 1; i < count - 1; i++) pages.add(Math.round(1 + (i * (last - 1)) / (count - 1)))
  return [...pages].sort((a, b) => a - b)
}

// GitHub lists stargazers oldest first, 100 to a page, and says when each one starred. A repository with up to
// SAMPLES pages is read in full and its curve is exact. A bigger one is sampled: the first star of SAMPLES pages
// spread across the list, which gives the shape of its growth for SAMPLES requests instead of thousands.
async function starHistoryOf(gh: GithubClient, path: string, stars: number, createdAt: string) {
  if (stars < 1) return null
  const pages = Math.ceil(stars / PER_PAGE)
  const page = async (p: number): Promise<unknown[] | null> => {
    const res = await gh.get(`/repos/${path}/stargazers?per_page=${PER_PAGE}&page=${p}`, { label: "/repos/{repo}/stargazers", accept: STAR_ACCEPT })
    if (res.status === 404 || res.status === 422) return null // a page GitHub will not serve
    if (!res.ok) throw await gh.fail(res, "stargazers")
    const rows = await res.json().catch(() => null)
    return Array.isArray(rows) ? rows : null
  }

  const exact = pages <= SAMPLES
  let reach = pages
  let probe: unknown[] | null = null
  if (!exact) {
    probe = await page(pages)
    if (!probe?.length) reach = Math.min(pages, FALLBACK_PAGES)
  }
  const wanted = spread(reach, SAMPLES)
  const got = await Promise.all(wanted.map(p => (p === pages && probe ? probe : page(p))))

  const raw: Point[] = []
  const take = (row: unknown, p: number, k: number) => {
    const t = Date.parse(str(obj(row).starred_at, 40))
    if (Number.isFinite(t)) raw.push({ t, n: (p - 1) * PER_PAGE + k + 1 })
  }
  wanted.forEach((p, i) => {
    const rows = got[i]
    if (!rows?.length) return
    if (exact) rows.forEach((row, k) => take(row, p, k))
    else {
      take(rows[0], p, 0)
      if (p === reach) take(rows[rows.length - 1], p, rows.length - 1)
    }
  })
  if (raw.length < 2 && !(exact && raw.length === 1)) return null

  raw.sort((a, b) => a.t - b.t || a.n - b.n)
  let top = 0
  const ordered = raw.map(p => ({ t: p.t, n: (top = Math.max(top, p.n)) })) // an unstarred repo shifts positions a little
  const now = Date.now()
  let points: Point[]
  if (exact) {
    // Every star is known: one point per equal slice of time, so the chart and the per-day bars have even steps.
    const start = Math.min(Date.parse(createdAt) || ordered[0].t, ordered[0].t)
    const slices = Math.max(1, Math.min(48, Math.ceil((now - start) / 3600_000)))
    points = [{ t: start, n: 0 }]
    let k = 0
    for (let s = 1; s <= slices; s++) {
      const end = start + ((now - start) * s) / slices
      while (k < ordered.length && ordered[k].t <= end) k++
      points.push({ t: Math.round(end), n: k })
    }
    points[points.length - 1].n = Math.max(points[points.length - 1].n, Math.min(stars, ordered[ordered.length - 1].n))
  } else {
    points = ordered.filter((p, i) => i === 0 || p.t > ordered[i - 1].t)
    const created = Date.parse(createdAt)
    if (Number.isFinite(created) && created < points[0].t) points.unshift({ t: created, n: 0 })
  }
  const measuredTo = points[points.length - 1].n
  if (!exact && points[points.length - 1].t < now) points.push({ t: now, n: Math.max(stars, measuredTo) })
  // `limited`: the last stretch is a straight line from the last page GitHub would serve to today's star count.
  return { points, exact, limited: !exact && reach < pages, measuredTo }
}

async function commitActivityOf(gh: GithubClient, path: string) {
  const apiPath = `/repos/${path}/stats/commit_activity`
  const options = { label: "/repos/{repo}/stats/commit_activity", revalidate: false as const } // a 202 must not be cached
  let res = await gh.get(apiPath, options)
  if (res.status === 202) {
    // GitHub is still computing it; one more look after a moment, then the page offers to try again.
    await new Promise(resolve => setTimeout(resolve, 1500))
    res = await gh.get(apiPath, options)
  }
  if (res.status === 202) return { pending: true, weeks: [] as { t: number; total: number }[] }
  if (res.status === 204) return { pending: false, weeks: [] as { t: number; total: number }[] }
  if (!res.ok) throw await gh.fail(res, "commit activity")
  const rows = await res.json().catch(() => null)
  const weeks = (Array.isArray(rows) ? rows : []).map(r => ({ t: num(obj(r).week) * 1000, total: num(obj(r).total) })).filter(w => w.t > 0)
  return { pending: false, weeks }
}

async function loadHistory(gh: GithubClient, path: string) {
  const repo = obj(await read(gh, `/repos/${path}`, "/repos/{repo}", { revalidate: 600 }))
  const stars = num(repo.stargazers_count)
  const createdAt = iso(repo.created_at)
  const partial: string[] = []
  const soft = async <T,>(name: string, run: () => Promise<T>): Promise<T | null> => {
    try {
      return await run()
    } catch (err) {
      if (err instanceof NeedsGithubConnectError) throw err
      partial.push(name)
      return null
    }
  }
  const [starHistory, commitActivity] = await Promise.all([soft("stars", () => starHistoryOf(gh, path, stars, createdAt)), soft("commits", () => commitActivityOf(gh, path))])
  return { starHistory, commitActivity, partial }
}

// ─── Route ─────────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

// GitHub's own error text can carry account details, so the page only gets the readable message the shared
// helper already wrote.
function failure(err: unknown) {
  if (err instanceof NeedsGithubConnectError) {
    return NextResponse.json({ error: "Connect your GitHub account to load repositories.", code: "needs_github_connect" }, { status: 403 })
  }
  if (err instanceof GithubApiError) {
    if (err.status === 404) return NextResponse.json({ error: "That repository was not found, or it is private." }, { status: 404 })
    const status = err.rateLimited ? 429 : err.status === 401 ? 401 : err.status === 504 ? 504 : 502
    const headers: Record<string, string> = {}
    if (err.rateLimited) {
      const wait = err.retryAfterSeconds ?? (err.resetAt ? Math.max(1, Math.ceil((err.resetAt - Date.now()) / 1000)) : null)
      if (wait) headers["Retry-After"] = String(wait)
    }
    return NextResponse.json({ error: err.message }, { status, headers })
  }
  console.error("[/api/trending/repo]", err)
  return NextResponse.json({ error: "Failed to load this repository." }, { status: 500 })
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const parsed = querySchema.safeParse({ owner: sp.get("owner") ?? "", repo: sp.get("repo") ?? "", part: sp.get("part") || "core" })
  if (!parsed.success) return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 })
  const { owner, repo, part } = parsed.data

  const limited = await checkRateLimit(`trending-repo:${getClientIp(req)}`, { limit: 8, windowMs: 10_000 })
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter || 10) } })
  }

  try {
    const gh = await createGithubClient()
    const path = gh.path(owner, repo)
    if (!path) return NextResponse.json({ error: "Invalid query parameters." }, { status: 400 })

    // Check the allowance first and spend it after the data arrived, as the list route does. If the check itself
    // fails, the details still load and nothing is charged.
    let charge = false
    if (gh.userId) {
      try {
        const allowance = await canAffordUsage(gh.userId, { github: DETAILS_COST })
        if (!allowance.allowed) return NextResponse.json({ error: allowance.reason }, { status: 403 })
        charge = true
      } catch (err) {
        console.error("[/api/trending/repo] quota check failed:", err)
      }
    }

    const data = part === "core" ? await loadCore(gh, path) : await loadHistory(gh, path)

    if (charge && gh.userId) {
      try {
        await consumeQuota(gh.userId, { github: DETAILS_COST })
      } catch (err) {
        console.error("[/api/trending/repo] quota update failed:", err)
      }
    }
    return NextResponse.json({ part, ...data }, { headers: { "Cache-Control": "private, max-age=120" } })
  } catch (err) {
    return failure(err)
  }
}