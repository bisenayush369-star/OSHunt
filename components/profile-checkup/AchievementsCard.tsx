import { ACHIEVEMENT_CATALOG } from "./achievementCatalog"

export default function AchievementsCard({ profileUsername }: { profileUsername: string }) {
  const obtainable = ACHIEVEMENT_CATALOG.filter((a) => a.obtainable)
  const retired = ACHIEVEMENT_CATALOG.filter((a) => !a.obtainable)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-sm font-bold text-white">GitHub Achievements</h4>
        <a
          href={`https://github.com/${profileUsername}?tab=achievements`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[11px] font-medium text-[#a8ff3e] hover:text-[#bdff6b]"
        >
          View yours on GitHub →
        </a>
      </div>
      <p className="mb-4 text-[11px] leading-relaxed text-white/40">
        No GitHub API — REST or GraphQL — exposes which achievements you've actually earned, so this can't show a personalized earned/locked list. What it can show: every achievement that currently exists and exactly how to earn it.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {obtainable.map((a) => (
          <div key={a.slug} className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-white/90">{a.name}</p>
              {a.tiers && <span className="shrink-0 font-mono text-[10px] text-white/35">{a.tiers.join(" · ")}</span>}
            </div>
            <p className="text-[11px] leading-relaxed text-white/50">{a.howToEarn}</p>
          </div>
        ))}
      </div>

      {retired.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/30">No longer obtainable</p>
          <div className="space-y-1">
            {retired.map((a) => (
              <p key={a.slug} className="text-[11px] text-white/35">
                <span className="text-white/55">{a.name}</span> — {a.howToEarn}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
