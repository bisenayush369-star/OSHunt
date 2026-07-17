// Mirrors the shimmer treatment your Analyze page already uses for its
// loading skeleton — same visual language, just laid out for a card grid
// instead of a single results column. Depends on the `shimmer` keyframe
// defined in the trend page's own <style> block (see app/trending/page.tsx),
// the same way your Analyze page scopes its own keyframe locally.

function Bar({ w, h }: { w: string | number; h: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-md bg-[#141414] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent motion-reduce:after:hidden"
      style={{ width: w, height: h }}
    />
  )
}

export function RepoCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[#141414] bg-[#0a0a0a] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <Bar w="45%" h={15} />
        <Bar w={28} h={28} />
      </div>
      <div className="flex gap-3">
        <Bar w={40} h={11} />
        <Bar w={40} h={11} />
        <Bar w={56} h={11} />
      </div>
      <div className="flex flex-col gap-2">
        <Bar w="100%" h={11} />
        <Bar w="80%" h={11} />
        <Bar w="60%" h={11} />
      </div>
      <div className="flex gap-2 pt-1">
        <Bar w={78} h={28} />
        <Bar w={32} h={28} />
        <Bar w={78} h={28} />
      </div>
    </div>
  )
}
