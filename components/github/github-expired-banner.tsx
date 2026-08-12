"use client";

import { usePathname } from "next/navigation";
import { WarningIcon } from "./github-icons";

export function GitHubExpiredBanner() {
  const pathname = usePathname();

  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-amber-200">
        <WarningIcon className="h-4 w-4 shrink-0" />
        <span>GitHub connection expired. Reconnect GitHub to continue.</span>
      </div>
      <a href={`/api/github/connect?from=${encodeURIComponent(pathname)}`} className="shrink-0 rounded-full bg-amber-400 px-3 py-2 text-center text-xs font-medium text-black transition-colors hover:bg-amber-300 sm:py-1.5">
        Reconnect
      </a>
    </div>
  );
}
