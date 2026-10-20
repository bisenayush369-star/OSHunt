// Loading placeholder with the same anatomy (and the same spacing) as RepoCard, so nothing jumps when the
// real cards arrive: header row, description, topics, stats, AI summary, action buttons.
//
// Built on shadcn's <Skeleton> with the shimmer sweep your Analyze page uses instead of its pulse. The sweep
// depends on the `shimmer` keyframe defined in the trend page's own <style> block (app/trending/page.tsx);
// without it the bars simply stay static. (The sweep starts from an explicit `transform`, not Tailwind's
// translate-x utilities: on Tailwind v4 those use the separate `translate` property and would add to the keyframe.)

import { Skeleton } from "@/components/ui/skeleton"

function Bar({ className }: { className: string }) {
  return (
    <Skeleton
      className={`relative overflow-hidden bg-white/[0.06] animate-none after:absolute after:inset-0 after:[transform:translateX(-100%)] after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.07] after:to-transparent motion-reduce:after:hidden ${className}`}
    />
  )
}

export function RepoCardSkeleton() {
  return (
    // aria-hidden: the grid it sits in carries aria-busy, and a wall of empty boxes means nothing to a screen reader
    <div
      aria-hidden="true"
      className="flex h-full min-w-0 flex-col gap-4 rounded-xl border border-white/[0.06] bg-[#0a0a0a] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)] sm:p-5"
    >
      {/* header */}
      <div className="flex items-start gap-3">
        <Bar className="size-10 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
          <Bar className="h-4 w-3/5 rounded" />
          <Bar className="h-3 w-1/4 rounded" />
        </div>
        <Bar className="size-9 shrink-0 rounded-lg sm:size-8" />
      </div>

      {/* description + topics */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2.5">
          <Bar className="h-3.5 w-full rounded" />
          <Bar className="h-3.5 w-11/12 rounded" />
          <Bar className="h-3.5 w-2/3 rounded" />
        </div>
        <div className="flex gap-1.5">
          <Bar className="h-6 w-14 rounded-md" />
          <Bar className="h-6 w-[4.5rem] rounded-md" />
          <Bar className="h-6 w-12 rounded-md" />
        </div>
      </div>

      {/* footer */}
      <div className="mt-auto flex flex-col gap-3.5 border-t border-white/[0.06] pt-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <Bar className="h-3.5 w-10 rounded" />
            <Bar className="h-3.5 w-10 rounded" />
            <Bar className="h-3.5 w-14 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Bar className="h-6 w-12 rounded-full" />
            <Bar className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <Bar className="h-[5.5rem] w-full rounded-lg" />
        <div className="flex items-center gap-2">
          <Bar className="h-11 flex-1 rounded-lg sm:h-9 sm:w-[6.25rem] sm:flex-none" />
          <Bar className="h-11 flex-1 rounded-lg sm:h-9 sm:w-[5.5rem] sm:flex-none" />
          <Bar className="ml-auto size-11 shrink-0 rounded-lg sm:size-9" />
        </div>
      </div>
    </div>
  )
}