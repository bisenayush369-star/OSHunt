import { cn } from "@/lib/utils"

const CheckMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
const AlertMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 9v4M12 17h.01M10.3 3.86 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0Z" /></svg>);
const EyeMark = ({ className }: { className?: string }) => (<svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>);

export interface CheckupResult {
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

function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#a8ff3e]">
      <span className="flex opacity-90">{icon}</span>
      {children}
    </div>
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  high: "border-[#a8ff3e]/30 bg-[#a8ff3e]/10 text-[#a8ff3e]",
  medium: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  low: "border-white/10 bg-white/5 text-white/45",
}

export default function CheckupInsights({ checkup }: { checkup: CheckupResult }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Profile Health */}
      <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4">
        <SectionLabel icon={<CheckMark className="h-3.5 w-3.5" />}>Profile Health</SectionLabel>
        {checkup.health.good.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {checkup.health.good.map((g, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-white/70">
                <span className="shrink-0 text-[#a8ff3e]">·</span>{g}
              </li>
            ))}
          </ul>
        )}
        {checkup.health.missing.length > 0 && (
          <div className="space-y-2">
            {checkup.health.missing.map((m, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
                <p className="text-xs font-semibold text-white/90">{m.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">{m.why}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open Source Readiness */}
      <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4">
        <SectionLabel icon={<EyeMark className="h-3.5 w-3.5" />}>Open Source Readiness</SectionLabel>
        <p className="mb-2.5 text-xs font-semibold leading-snug text-white/90">{checkup.readiness.verdict}</p>
        <ul className="space-y-1.5">
          {checkup.readiness.reasoning.map((r, i) => (
            <li key={i} className="flex gap-2 text-[11.5px] leading-relaxed text-white/55">
              <span className="shrink-0 text-white/30">·</span>{r}
            </li>
          ))}
        </ul>
      </div>

      {/* Optimization Tips */}
      <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4 lg:col-span-2">
        <SectionLabel icon={<AlertMark className="h-3.5 w-3.5" />}>Optimization Tips</SectionLabel>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[...checkup.optimizationTips]
            .sort((a, b) => (a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0))
            .map((tip, i) => (
              <div key={i} className="rounded-lg border border-white/5 bg-white/[0.01] p-2.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white/90">{tip.title}</p>
                  <span className={cn("shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase", PRIORITY_STYLES[tip.priority] || PRIORITY_STYLES.low)}>
                    {tip.priority}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-white/50">{tip.detail}</p>
              </div>
            ))}
        </div>
      </div>

      {/* Recruiter Perspective */}
      <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4 lg:col-span-2">
        <SectionLabel icon={<EyeMark className="h-3.5 w-3.5" />}>What would a recruiter notice?</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-white/40">Positives</p>
            <ul className="space-y-1">
              {checkup.recruiterPerspective.positives.map((p, i) => (
                <li key={i} className="text-[11.5px] leading-relaxed text-white/65">{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-white/40">Concerns</p>
            <ul className="space-y-1">
              {checkup.recruiterPerspective.concerns.map((c, i) => (
                <li key={i} className="text-[11.5px] leading-relaxed text-white/65">{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-white/40">First-impression fixes</p>
            <ul className="space-y-1">
              {checkup.recruiterPerspective.firstImpressionTips.map((t, i) => (
                <li key={i} className="text-[11.5px] leading-relaxed text-white/65">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
