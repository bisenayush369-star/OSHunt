import axios from "axios"
import * as zlib from "zlib"
import * as tar from "tar-stream"
import { getGithubAuthHeader } from "../github"
import type { GitTreeEntry } from "./types"

/**
 * getRepoTree() in github.ts never checks the `truncated` field GitHub's
 * tree API actually returns — for repos with enough files (GitHub's limit
 * is roughly 100k entries or a few hundred MB of tree data, whichever hits
 * first), the recursive tree call silently comes back INCOMPLETE with
 * `truncated: true`, and every downstream stage — scoring, reading,
 * detection — was quietly operating on a partial repo with no signal that
 * anything was missing. That's a real bug in what shipped earlier in this
 * conversation, not a hypothetical edge case.
 *
 * The fix for large repos isn't "paginate the tree API" (it doesn't
 * support pagination) — it's to stop using the per-file contents API
 * entirely once a repo is large enough, and instead download one tarball
 * (`codeload.github.com/{owner}/{repo}/tar.gz/{ref}`) that contains the
 * full tree AND every file's content in a single request. This is also
 * dramatically fewer GitHub API calls for a big repo: 1 request instead of
 * 1 (tree) + N (one per file read).
 */

export interface TarballFile {
  path: string
  size: number
  content: string
}

const LARGE_REPO_THRESHOLD_FILES = 3000

export async function isTreeTruncated(owner: string, repo: string, branch: string): Promise<boolean> {
  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: await authHeadersFor(), validateStatus: () => true }
  )
  return res.status === 200 && res.data?.truncated === true
}

async function authHeadersFor() {
  const authHeader = await getGithubAuthHeader()
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(authHeader.Authorization ? { Authorization: authHeader.Authorization } : {}),
  }
}

/**
 * Downloads and extracts the repo's tarball in one shot. Returns every
 * text-readable file's full content — the caller still applies the same
 * exclusion list (scoring.ts's isExcludedPath) and budget logic
 * (smartRead.ts's capForSection) on top of this, same as the per-file path;
 * this function only changes *how the bytes get onto the server*, not what
 * happens to them afterward.
 *
 * Binary files are skipped at the stream level (never even buffered into
 * memory as a string) rather than fetched-then-discarded, which matters
 * once you're pulling an entire repo instead of the ~15-20 files the
 * per-file path was fetching.
 */
export async function fetchRepoTarball(owner: string, repo: string, branch: string): Promise<TarballFile[]> {
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/${encodeURIComponent(branch)}`
  const res = await axios.get<NodeJS.ReadableStream>(url, {
    responseType: "stream",
    headers: await authHeadersFor(),
    timeout: 30_000,
  })

  const extract = tar.extract()
  const files: TarballFile[] = []

  const done = new Promise<void>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      // Tarball entries are prefixed with "{repo}-{branch}/" — strip it so
      // paths match what the tree API and everything downstream expects.
      const path = header.name.split("/").slice(1).join("/")
      const looksBinary = /\.(png|jpe?g|gif|ico|webp|woff2?|ttf|eot|zip|pdf|mp4|wasm)$/i.test(path)

      if (header.type !== "file" || looksBinary || !path) {
        stream.resume()
        stream.on("end", next)
        return
      }

      const chunks: Buffer[] = []
      stream.on("data", (c) => chunks.push(c))
      stream.on("end", () => {
        files.push({ path, size: header.size ?? 0, content: Buffer.concat(chunks).toString("utf-8") })
        next()
      })
      stream.on("error", reject)
    })
    extract.on("finish", resolve)
    extract.on("error", reject)
  })

  res.data.pipe(zlib.createGunzip()).pipe(extract)
  await done

  return files
}

export function tarballFilesToTreeEntries(files: TarballFile[]): GitTreeEntry[] {
  return files.map((f) => ({
    path: f.path,
    mode: "100644",
    type: "blob" as const,
    sha: "",
    size: f.size,
    url: "",
  }))
}

export { LARGE_REPO_THRESHOLD_FILES }
