"use client"

import Image from "next/image"
import { m } from "framer-motion"
import { Check, Crosshair } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/components/lib/utils"

export const AUTH_PROVIDERS = [
  { id: "github", label: "GitHub", icon: "/github.svg" },
  { id: "google", label: "Google", icon: "/google.svg" },
] as const

export type AuthProviderId = (typeof AUTH_PROVIDERS)[number]["id"]

export function AuthProviderButtons({
  busy,
  opened,
  onOAuth,
  whiteButton,
  darkButton,
}: {
  busy: AuthProviderId | "credentials" | "onboarding" | null
  opened: AuthProviderId | null
  onOAuth: (provider: AuthProviderId) => void
  whiteButton: string
  darkButton: string
}) {
  return (
    <m.div className="mt-8 flex flex-col gap-2">
      <p role="status" className="sr-only">
        {opened ? `${AUTH_PROVIDERS.find((p) => p.id === opened)?.label ?? "The provider"} opened in a new tab.` : ""}
      </p>
      {AUTH_PROVIDERS.map((p) => {
        const isBusy = busy === p.id
        const isOpened = opened === p.id
        return (
          <Button
            key={p.id}
            type="button"
            onClick={() => onOAuth(p.id)}
            disabled={busy !== null}
            aria-busy={isBusy}
            className={cn(p.id === "github" ? whiteButton : darkButton, isBusy && "disabled:opacity-100")}
          >
            {isBusy ? (
              <Crosshair aria-hidden className="size-4 motion-safe:animate-spin" />
            ) : isOpened ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <Image src={p.icon} alt="" width={16} height={16} className={p.id === "github" ? "brightness-0" : undefined} />
            )}
            {isBusy ? "Redirecting..." : isOpened ? "Opened in a new tab" : `Continue with ${p.label}`}
          </Button>
        )
      })}
    </m.div>
  )
}
