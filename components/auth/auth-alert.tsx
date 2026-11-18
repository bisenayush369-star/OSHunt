"use client"

import { AnimatePresence, m } from "framer-motion"
import { TriangleAlert } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/components/lib/utils"

export function AuthAlert({
  error,
  className,
  id = "auth-error",
}: {
  error: string | null
  className?: string
  id?: string
}) {
  return (
    <AnimatePresence initial={false}>
      {error && (
        <m.div
          key="error"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={cn("overflow-hidden", className)}
        >
          <Alert
            id={id}
            variant="destructive"
            className="rounded-[10px] border-red-500/25 bg-red-500/[0.07] px-3 py-2.5 text-red-200 *:data-[slot=alert-description]:text-red-200/90 [&>svg]:text-red-300"
          >
            <TriangleAlert className="size-4" />
            <AlertDescription className="text-[13px] leading-snug text-red-200/90">{error}</AlertDescription>
          </Alert>
        </m.div>
      )}
    </AnimatePresence>
  )
}
