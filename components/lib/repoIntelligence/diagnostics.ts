import axios from "axios"
import { getGithubAuthHeader } from "../github"
import type { DiagnosticsSummary } from "./types"

/**
 * "If available" is the operative phrase in the original ask — this reads
 * the LATEST CI run's own conclusion via the GitHub Actions API. It does
 * NOT clone the repo and run `tsc`/`eslint`/a build itself.
 *
 * That's a deliberate scope line, not a shortcut: actually running a
 * repo's build would mean installing its dependencies and executing its
 * code — for an arbitrary public repo a user points this at, that's a real
 * supply-chain/code-execution risk (arbitrary postinstall scripts, arbitrary
 * build scripts), plus a genuinely different engineering problem (sandboxed
 * execution, per-language toolchains, resource limits). That's a distinct
 * feature, not a small addition to this one, and isn't what "keep it
 * simple" was asking for.
 *
 * If a repo has no GitHub Actions configured, this returns `ciStatus: null`
 * rather than "unknown" — those are different facts (no CI exists, vs. CI
 * exists but we couldn't read it) and the prompt should be able to say
 * which one it is.
 */

async function authHeaders() {
  const authHeader = await getGithubAuthHeader()
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
  }
}

export async function getDiagnostics(owner: string, repo: string, branch: string): Promise<DiagnosticsSummary | null> {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs`,
      {
        headers: await authHeaders(),
        params: { branch, per_page: 1 },
        timeout: 8_000,
        validateStatus: () => true,
      }
    )

    if (res.status !== 200) return null // no Actions access / not enabled — not an error worth surfacing
    const run = res.data?.workflow_runs?.[0]
    if (!run) return { ciStatus: null, ciWorkflowName: null, ciCheckedAt: null, notes: [] }

    const status: DiagnosticsSummary["ciStatus"] =
      run.conclusion === "success" ? "passing" : run.status === "completed" ? "failing" : "unknown"

    const notes: string[] = []
    if (status === "failing") {
      notes.push(`Latest run of "${run.name}" concluded: ${run.conclusion}`)
    }

    return {
      ciStatus: status,
      ciWorkflowName: run.name ?? null,
      ciCheckedAt: run.updated_at ?? null,
      notes,
    }
  } catch {
    // Best-effort by design — diagnostics are extra context, never worth
    // failing the whole analysis over.
    return null
  }
}
