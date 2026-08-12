"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ConnectGithubModal } from "./connect-github-modal";

export function GitHubFeatureLock({
  connected,
  featureName,
  className,
  children,
}: {
  connected: boolean;
  featureName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (connected) return <>{children}</>;

  return (
    <div className={`relative ${className ?? ""}`}>
      <div aria-hidden="true" className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="max-w-xs rounded-2xl border border-white/10 bg-[#0d0d0d]/95 px-6 py-5 text-center shadow-xl backdrop-blur">
          <p className="mb-4 text-sm text-white/80">Connect GitHub to access {featureName || "this feature"}.</p>
          <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#a8ff3e] px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#bbff66]">
            Connect GitHub
          </button>
        </div>
      </div>

      <ConnectGithubModal open={open} onOpenChange={setOpen} returnTo={pathname} />
    </div>
  );
}
