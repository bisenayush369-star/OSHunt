import type { RepoRef } from "./types"

// Same rule as NAME_RE in analysis.ts. Copied (not imported) because that file
// pulls in Prisma and must stay out of the client bundle. Keep the two in sync.
const NAME_RE = /^(?![.]+$)(?!.*[\\/\s])(?=.{1,100}$)[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/

export const repoKey = (r: RepoRef) => `${r.owner}/${r.repo}`

/**
 * Takes whatever people paste — `owner/repo`, a full GitHub URL, a URL with
 * /tree/main/src on the end, `.git` suffixes — and returns a clean ref or null.
 */
export function parseRepo(input: string | null | undefined): RepoRef | null {
  if (!input) return null
  let s = input.trim()
  if (!s) return null

  s = s.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "")
  s = s.split(/[?#]/)[0].replace(/^\/+/, "")

  const [owner, rawRepo] = s.split("/")
  const repo = rawRepo?.replace(/\.git$/i, "")
  if (!owner || !repo) return null
  if (!NAME_RE.test(owner) || !NAME_RE.test(repo)) return null
  return { owner, repo }
}
