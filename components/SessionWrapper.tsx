"use client"
import { SessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

export default function SessionWrapper({
  children,
  session = null,
}: {
  children: React.ReactNode
  session?: Session | null
}) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
      refetchInterval={5 * 60}
    >
      {children}
    </SessionProvider>
  )
}