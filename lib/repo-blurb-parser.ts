// lib/repo-blurb-parser.ts
//
// Turns the Trend Analyst's raw text response into a RepoBlurb, or null if
// it doesn't parse. This is the fix for "AI is not giving me an explanation,
// it throws an error" — a malformed or fenced response should degrade to
// "couldn't generate a summary" for that one card, never an unhandled
// exception that takes out the request rendering the other nine.

import type { RepoBlurb } from "@/lib/repo-types"

// Models sometimes wrap JSON in ```json fences even when told not to, and
// occasionally add a stray sentence before/after the object — this pulls out
// the first {...} block rather than assuming the whole string is clean JSON.
function extractJsonObject(raw: string): string | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : raw
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end < start) return null
  return candidate.slice(start, end + 1)
}

function isValidShape(v: unknown): v is RepoBlurb {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return (
    typeof o.tagline === "string" &&
    typeof o.whatItDoes === "string" &&
    Array.isArray(o.whyDevsLoveIt) &&
    o.whyDevsLoveIt.every(x => typeof x === "string") &&
    typeof o.standoutFeature === "string" &&
    typeof o.idealFor === "string"
  )
}

// Never throws — a malformed model response should degrade to "couldn't
// parse", not take down whatever request is rendering nine other repos fine.
export function parseBlurbResponse(raw: string): RepoBlurb | null {
  const jsonText = extractJsonObject(raw)
  if (!jsonText) return null
  try {
    const parsed = JSON.parse(jsonText)
    return isValidShape(parsed) ? parsed : null
  } catch {
    return null
  }
}
