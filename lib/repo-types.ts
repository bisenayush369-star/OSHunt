// lib/repo-types.ts
//
// Shared types for the repo-card system (trending grid, search results,
// bookmarks, AI blurbs). This does NOT redeclare GithubRepo — that already
// lives in @/lib/github and every route in this app imports it from there.
// Everything here is additive so it composes with your existing type
// instead of competing with it.

import type { GithubRepo } from "@/lib/github"

// ─── AI blurb (structured) ──────────────────────────────────────────────────
// Replaces the old single free-text blurb. Each field maps to one visual
// section on the card, so the UI can render an explanation instead of a
// wall of text the user has to parse themselves.
export interface RepoBlurb {
  tagline: string // <= ~12 words, the one-line hook
  whatItDoes: string // 2-3 plain-language sentences
  whyDevsLoveIt: string[] // 2-4 short, concrete bullets
  standoutFeature: string // one sentence: what makes it different from the obvious alternatives
  idealFor: string // short phrase: who/what project this fits best
}

// A card can be showing an eagerly-generated blurb (trending), no blurb yet
// (search result — generated on demand), a blurb that's loading, or one
// that failed. Four distinct states the UI needs to render differently,
// not just a `string | undefined`.
export type BlurbState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; blurb: RepoBlurb }
  | { status: "error"; message: string }

export type RepoWithBlurb = GithubRepo & { blurb?: RepoBlurb | null }

// ─── Q&A ─────────────────────────────────────────────────────────────────
export interface RepoQnaMessage {
  role: "user" | "assistant"
  content: string
}

// ─── Sorting ─────────────────────────────────────────────────────────────
export type SortKey = "trending" | "forks" | "updated" | "created" | "name"

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "trending", label: "Trending (stars)" },
  { value: "forks", label: "Most forked" },
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
  { value: "name", label: "Name (A–Z)" },
]

export function sortRepos<T extends GithubRepo>(repos: T[], key: SortKey): T[] {
  const copy = [...repos]
  switch (key) {
    case "forks":
      return copy.sort((a, b) => (b.forks ?? 0) - (a.forks ?? 0))
    case "updated":
      return copy.sort((a, b) => +new Date(b.pushedAt ?? "") - +new Date(a.pushedAt ?? ""))
    case "created":
      return copy.sort((a, b) => +new Date(b.createdAt ?? "") - +new Date(a.createdAt ?? ""))
    case "name":
      return copy.sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""))
    case "trending":
    default:
      return copy.sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
  }
}

// ─── GitHub links ────────────────────────────────────────────────────────
// `fullName` ("owner/repo") is the one field every GithubRepo is guaranteed
// to have, so links are derived from it instead of depending on a possible
// `htmlUrl` field that may or may not exist on your type. This is also the
// actual fix for "clicking a repo doesn't go to GitHub" — the link no
// longer depends on a field that might be missing or misnamed.
export function repoUrl(fullName: string): string {
  return `https://github.com/${fullName}`
}

export function repoCloneCommand(fullName: string): string {
  return `git clone https://github.com/${fullName}.git`
}
