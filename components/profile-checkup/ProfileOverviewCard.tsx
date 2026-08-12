import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

export interface ProfileOverview {
  username: string
  name: string | null
  avatarUrl: string
  bio: string | null
  location: string | null
  website: string | null
  hireable: boolean
  followers: number
  following: number
  publicRepos: number
  publicGists: number
  accountAgeYears: number
  organizations: { login: string; avatarUrl: string }[]
  socialAccounts: { provider: string; url: string }[]
  hasProfileReadme: boolean
}

function Field({ label, value, present }: { label: string; value: string; present: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", present ? "border-white/10 bg-white/[0.015]" : "border-amber-500/15 bg-amber-500/[0.03]")}>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">{label}</p>
      <p className={cn("truncate text-xs font-medium", present ? "text-white/85" : "text-amber-200/70")}>{value}</p>
    </div>
  )
}

export default function ProfileOverviewCard({ overview: o }: { overview: ProfileOverview }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-5">
      <div className="mb-4 flex items-center gap-4">
        <img src={o.avatarUrl} alt={o.username} className="h-14 w-14 rounded-full border-2 border-white/10 object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{o.name || o.username}</p>
          <p className="truncate font-mono text-xs text-white/40">@{o.username} · on GitHub {o.accountAgeYears} {o.accountAgeYears === 1 ? "year" : "years"}</p>
        </div>
        {o.hireable && (
          <Badge variant="outline" className="ml-auto shrink-0 border-[#a8ff3e]/30 bg-[#a8ff3e]/10 font-mono text-[10px] text-[#a8ff3e]">
            Open to work
          </Badge>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Field label="Bio" value={o.bio || "Not set"} present={Boolean(o.bio)} />
        <Field label="Location" value={o.location || "Not set"} present={Boolean(o.location)} />
        <Field label="Website" value={o.website || "Not set"} present={Boolean(o.website)} />
        <Field label="Profile README" value={o.hasProfileReadme ? "Present" : "Not set up"} present={o.hasProfileReadme} />
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/5 pt-3.5 font-mono text-[11px] text-white/40">
        <span>{o.followers} followers</span>
        <span>{o.following} following</span>
        <span>{o.publicRepos} repos</span>
        <span>{o.publicGists} gists</span>
        {o.organizations.length > 0 && <span>{o.organizations.length} public {o.organizations.length === 1 ? "org" : "orgs"}</span>}
        {o.socialAccounts.length > 0 ? (
          <span>{o.socialAccounts.length} social {o.socialAccounts.length === 1 ? "link" : "links"} connected</span>
        ) : (
          <span className="text-amber-200/60">no social links connected</span>
        )}
      </div>
    </div>
  )
}
