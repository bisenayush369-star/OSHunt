"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface HeaderProps {
  username: string
  connected: boolean
  plan: string
  avatarUrl?: string
  isLoading: boolean
  error: string | null
  connectedUsername?: string
  effectiveUsername: string
  onRescan: () => void
}

export function Header({
  username,
  connected,
  plan,
  avatarUrl,
  isLoading,
  error,
  connectedUsername,
  effectiveUsername,
  onRescan,
}: HeaderProps) {
  return (
    <>
      <div className="mb-8 flex flex-col gap-5 border-b border-white/5 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="h-12 w-12 shrink-0 border-2 border-[#a8ff3e]/30 sm:h-14 sm:w-14">
            <AvatarImage src={avatarUrl} alt={username} />
            <AvatarFallback className="bg-white/[0.03] text-white/30">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[#a8ff3e]/20 bg-[#a8ff3e]/10 font-mono text-[11px] text-[#a8ff3e]">
                LIVE REST API PIPELINE
              </Badge>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-white/40">
                <span className={cn("h-2 w-2 rounded-full", isLoading ? "animate-ping bg-amber-400" : "animate-pulse bg-[#a8ff3e]")} />
                {isLoading ? "Scraping GitHub servers…" : `Connected: @${connectedUsername || effectiveUsername}`}
              </span>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2 font-mono text-xs text-white/40">
              <span>{connected ? "GitHub linked" : "GitHub disconnected"}</span>
              <span className="text-white/20">•</span>
              <span>{plan.toUpperCase()} PLAN</span>
            </div>
            <h2 className="truncate text-[clamp(1.375rem,1.1rem+1.1vw,1.875rem)] font-extrabold tracking-tight">
              Open Source Career Hub
            </h2>
          </div>
        </div>

        <Button
          onClick={onRescan}
          disabled={isLoading}
          variant="outline"
          className="h-11 w-full shrink-0 gap-2 rounded-lg border-white/10 bg-white/5 px-4 font-mono text-xs text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] disabled:opacity-60 sm:w-auto"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isLoading ? "Scanning…" : "Force Live Scan ↻"}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 font-mono text-xs text-red-300">
          [API ERROR]: {error} Make sure the username is valid or your GitHub token is set.
        </div>
      )}
    </>
  )
}
