import { LEARNING_RESOURCES } from "./learningResources"

export default function LearningResourcesCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.015] p-4">
      <h4 className="mb-3 text-sm font-bold text-white">Learning Resources</h4>
      <div className="space-y-2">
        {LEARNING_RESOURCES.map((r) => (
          <a
            key={r.url}
            href={r.url}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.01] p-2.5 transition-colors hover:border-[#a8ff3e]/20"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white/90 group-hover:text-[#a8ff3e]">{r.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/45">{r.description}</p>
            </div>
            <span className="mt-0.5 shrink-0 text-white/25 transition-colors group-hover:text-[#a8ff3e]">↗</span>
          </a>
        ))}
      </div>
    </div>
  )
}
