"use client"
import { useCallback, useEffect, useState } from "react"
import { ANALYSIS_ENDPOINT, JSON_HEADERS, isAbort, readError } from "./analysis-api"
import { pickMeta, pickResult, type Analysis, type RepoMeta, type RepoRef } from "./types"

type Entry =
  | { key: string; nonce: number; ok: true; analysis: Analysis; meta: RepoMeta | null }
  | { key: string; nonce: number; ok: false; error: string }

export type AnalysisStatus = "idle" | "loading" | "done" | "error"

/**
 * Fetches the analysis for one repo the moment it is set, so research starts
 * right under the search box with no extra click.
 *
 * "loading" is derived (the stored entry doesn't match the repo being asked for)
 * rather than set inside the effect, so switching repos never flashes the old
 * result and state is only ever set from the async callback.
 */
export function useAnalysis(repo: RepoRef | null) {
  const owner = repo?.owner ?? null
  const name = repo?.repo ?? null
  const key = owner && name ? `${owner}/${name}` : null

  const [nonce, setNonce] = useState(0)
  const [entry, setEntry] = useState<Entry | null>(null)

  useEffect(() => {
    if (!owner || !name) return
    const k = `${owner}/${name}`
    const controller = new AbortController()

    void (async () => {
      try {
        const res = await fetch(ANALYSIS_ENDPOINT, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ owner, repo: name }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(await readError(res))

        const data: unknown = await res.json()
        const analysis = pickResult(data)
        if (!analysis) throw new Error("The analysis came back in a shape this page can't read. Try again.")

        setEntry({ key: k, nonce, ok: true, analysis, meta: pickMeta(data) })
        window.dispatchEvent(new CustomEvent("usage:updated"))
      } catch (err) {
        if (isAbort(err)) return
        setEntry({
          key: k,
          nonce,
          ok: false,
          error: err instanceof Error ? err.message : "Something went wrong. Try again.",
        })
      }
    })()

    return () => controller.abort()
  }, [owner, name, nonce])

  const rerun = useCallback(() => setNonce((n) => n + 1), [])

  const current = key && entry && entry.key === key && entry.nonce === nonce ? entry : null
  const status: AnalysisStatus = !key ? "idle" : !current ? "loading" : current.ok ? "done" : "error"

  return {
    status,
    analysis: current?.ok ? current.analysis : null,
    meta: current?.ok ? current.meta : null,
    error: current && !current.ok ? current.error : "",
    rerun,
  }
}
