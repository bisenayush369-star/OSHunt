"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGitHubConnection } from "@/hooks/use-github-connection";
import { GitHubMark } from "./github-icons";

export function GitHubConnectionBadge() {
  const { status, loading } = useGitHubConnection();

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-white/5" />;
  }

  if (!status?.connected && !status?.expired) {
    return (
      <Link
        href="/connect-github"
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/20 hover:text-white"
      >
        <GitHubMark className="h-3.5 w-3.5" />
        Connect GitHub
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-8 w-8 shrink-0 rounded-full outline-none ring-offset-2 ring-offset-[#090909] focus-visible:ring-2 focus-visible:ring-[#a8ff3e]"
          aria-label={`GitHub ${status?.expired ? "connection expired" : `connected as @${status?.username}`}`}
        >
          {status?.avatarUrl ? (
            <img src={status.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
              <GitHubMark className="h-4 w-4 text-white/70" />
            </span>
          )}
          <span
            aria-hidden="true"
            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#090909] ${status?.expired ? "bg-amber-400" : "bg-[#a8ff3e]"}`}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#0d0d0d]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-white">{status?.expired ? "GitHub Expired" : "GitHub Connected"}</p>
          <p className="text-xs text-white/40">@{status?.username}</p>
        </div>
        <DropdownMenuItem asChild>
          <Link href="/settings/github" className="cursor-pointer text-sm text-white/70">
            Manage connection
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
