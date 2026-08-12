import { NextRequest, NextResponse } from "next/server"
import { generateLLMResponse } from "@/lib/llmRouter"

export const maxDuration = 30

// ─────────────────────────────────────────────────────────────────────────
// Combines 5 of the 9 Profile Checkup sections (Health, Optimization Tips,
// Readiness, Recruiter Perspective, Weekly Plan) into ONE LLM call instead
// of five — same reasoning is needed across all five anyway (what's present,
// what's missing, why it matters), so one grounded call is both cheaper and
// more internally consistent than five separate ones that might contradict
// each other.
//
// The other 4 sections deliberately do NOT come from here:
//   - Profile Overview: /api/profile-overview, pure data, no reasoning needed
//   - Achievements: static catalog, no API exposes "earned" status (see
//     that component for the citation on this)
//   - Learning Resources: static curated list, no reason to route this
//     through an LLM and risk a hallucinated URL
//   - Progress Tracking: not implemented — see the CheckupSnapshot shape
//     at the bottom of this file for the forward-compatible interface
//
// Same grounding discipline as profile-score: every claim ties to a real
// field from ProfileOverview or the existing cluster signals. No invented
// percentages, no hiring probabilities, no confident guesses where the data
// is thin — explicitly instructed to hedge instead.
// ─────────────────────────────────────────────────────────────────────────

const PROFILE_CHECKUP_PROMPT = `You are a career coach reviewing a developer's public GitHub PROFILE — not their code, their profile page: bio, avatar, pinned presentation, README, social links, organization visibility. The goal is helping them look credible and inviting to a stranger — a recruiter, a maintainer deciding whether to accept a first contribution, a collaborator — landing on their profile for the first time.

Ground every observation in the real fields given below. Never invent a fact, a percentage, a probability, or a confidence score that isn't directly derivable from the data. If a field is missing or empty, that IS the observation — don't guess why.

Do not generate a numeric readiness score or hiring probability anywhere in this response. "Readiness" and "recruiter perspective" are qualitative — reasoning in prose, not a fabricated number.

Respond with ONLY a JSON object in this exact shape — no markdown fences, no preamble:
{
  "health": {
    "good": ["2-4 specific things already present and working, each citing the actual field"],
    "missing": [{"title": "short gap name", "why": "1-2 sentences on why it matters to a visitor"}]
  },
  "optimizationTips": [
    {"title": "specific action", "detail": "1-2 sentences, concrete, tied to what's actually missing", "priority": "high" | "medium" | "low"}
  ],
  "readiness": {
    "verdict": "one direct sentence — is this profile ready for someone to land on and want to collaborate",
    "reasoning": ["2-4 specific observations backing the verdict, each grounded in a real field"]
  },
  "recruiterPerspective": {
    "positives": ["1-3 specific things a recruiter would likely notice favorably"],
    "concerns": ["1-3 specific things a recruiter might question or find thin"],
    "firstImpressionTips": ["1-3 concrete changes that would improve the first-glance impression"]
  },
  "weeklyPlan": {
    "thisWeek": ["3-4 concrete, doable-this-week actions, most impactful first"],
    "nextWeek": ["2-3 actions that build on this week, once the basics are done"]
  }
}`

interface OrganizationInput { login: string }
interface SocialAccountInput { provider: string }
interface ProfileOverviewInput {
  username: string
  name: string | null
  bio: string | null
  location: string | null
  website: string | null
  hireable: boolean
  followers: number
  following: number
  publicRepos: number
  publicGists: number
  accountAgeYears: number
  organizations: OrganizationInput[]
  socialAccounts: SocialAccountInput[]
  hasProfileReadme: boolean
}
interface ActivitySignalsInput {
  originalRepoCount?: number
  reposWithDescription?: number
  reposWithLicense?: number
  reposWithHomepage?: number
  reposWithTopics?: number
  externalActivityRepoCount?: number
}
interface CheckupBody {
  profile: ProfileOverviewInput
  signals?: ActivitySignalsInput
  topLanguages?: string[]
}

interface CheckupResult {
  health: {
    good: string[]
    missing: { title: string; why: string }[]
  }
  optimizationTips: { title: string; detail: string; priority: "high" | "medium" | "low" }[]
  readiness: {
    verdict: string
    reasoning: string[]
  }
  recruiterPerspective: {
    positives: string[]
    concerns: string[]
    firstImpressionTips: string[]
  }
  weeklyPlan: {
    thisWeek: string[]
    nextWeek: string[]
  }
}

// ── Progress Tracking (section 9) ──────────────────────────────────────
// Not implemented — no Prisma schema was available to build real
// persistence against, and guessing at one risks colliding with your
// actual schema. This is the shape a future persistence layer would store
// per checkup run, so the frontend and this route are already built to be
// forward-compatible with it landing later without a rewrite: the response
// below already includes `generatedAt`, and this route is a pure function
// of (profile, signals) with no side effects — a POST to a future
// `/api/checkup-history` with this exact result object is the only thing
// that would need to be added, not a redesign of this route.
export interface CheckupSnapshot {
  id: string
  userId: string
  generatedAt: string
  overallHealthSummary: string
  result: CheckupResult
}

function buildContext(profile: ProfileOverviewInput, signals: ActivitySignalsInput = {}, topLanguages: string[] = []): string {
  return [
    `Username: ${profile.username}`,
    `Display name set: ${profile.name ? "yes" : "no"}`,
    `Bio: ${profile.bio ? `"${profile.bio}"` : "not set"}`,
    `Location: ${profile.location || "not set"}`,
    `Website/blog link: ${profile.website || "not set"}`,
    `Hireable flag: ${profile.hireable ? "on" : "off"}`,
    `Followers: ${profile.followers}, Following: ${profile.following}`,
    `Public repos: ${profile.publicRepos}, Public gists: ${profile.publicGists}`,
    `Account age: ${profile.accountAgeYears} years`,
    `Public organizations: ${profile.organizations.length ? profile.organizations.map((o) => o.login).join(", ") : "none"}`,
    `Social accounts linked: ${profile.socialAccounts.length ? profile.socialAccounts.map((s) => s.provider).join(", ") : "none"}`,
    `Profile README (username/username repo): ${profile.hasProfileReadme ? "present" : "not present"}`,
    `Top languages across repos: ${topLanguages.length ? topLanguages.join(", ") : "none detected"}`,
    `Of non-fork repos: ${signals.reposWithDescription ?? "unknown"} have a description, ${signals.reposWithLicense ?? "unknown"} have a license, ${signals.reposWithHomepage ?? "unknown"} have a homepage, ${signals.reposWithTopics ?? "unknown"} have topics (out of ${signals.originalRepoCount ?? "unknown"} total)`,
    `Distinct repos active in the last 7 days (own or others'): ${signals.externalActivityRepoCount ?? "unknown"}`,
  ].join("\n")
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1).trim()
  }

  return trimmed
}

function parseCheckupResult(text: string): CheckupResult {
  const cleaned = extractJsonObject(text)
  const parsed = JSON.parse(cleaned)
  return {
    health: {
      good: Array.isArray(parsed.health?.good) ? parsed.health.good : [],
      missing: Array.isArray(parsed.health?.missing) ? parsed.health.missing : [],
    },
    optimizationTips: Array.isArray(parsed.optimizationTips) ? parsed.optimizationTips : [],
    readiness: {
      verdict: parsed.readiness?.verdict || "",
      reasoning: Array.isArray(parsed.readiness?.reasoning) ? parsed.readiness.reasoning : [],
    },
    recruiterPerspective: {
      positives: Array.isArray(parsed.recruiterPerspective?.positives) ? parsed.recruiterPerspective.positives : [],
      concerns: Array.isArray(parsed.recruiterPerspective?.concerns) ? parsed.recruiterPerspective.concerns : [],
      firstImpressionTips: Array.isArray(parsed.recruiterPerspective?.firstImpressionTips) ? parsed.recruiterPerspective.firstImpressionTips : [],
    },
    weeklyPlan: {
      thisWeek: Array.isArray(parsed.weeklyPlan?.thisWeek) ? parsed.weeklyPlan.thisWeek : [],
      nextWeek: Array.isArray(parsed.weeklyPlan?.nextWeek) ? parsed.weeklyPlan.nextWeek : [],
    },
  }
}

export async function POST(req: NextRequest) {
  let body: CheckupBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.profile?.username) {
    return NextResponse.json({ error: "`profile.username` is required." }, { status: 400 })
  }

  const context = buildContext(body.profile, body.signals, body.topLanguages)

  try {
    const { text } = await generateLLMResponse(
      [{ role: "user", content: `Profile data:\n${context}` }],
      PROFILE_CHECKUP_PROMPT
    )

    let result: CheckupResult
    try {
      result = parseCheckupResult(text ?? "")
    } catch {
      return NextResponse.json({ error: "The checkup response didn't match the expected format — try again." }, { status: 502 })
    }

    return NextResponse.json({ result, generatedAt: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The checkup didn't complete." },
      { status: 502 }
    )
  }
}
