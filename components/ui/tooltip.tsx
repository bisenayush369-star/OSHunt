"use client"

import {
  cloneElement,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

type TooltipContextValue = {
  open: boolean
  setOpen: (value: boolean) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

export function TooltipProvider({
  children,
  delayDuration: _delayDuration,
}: {
  children: ReactNode
  delayDuration?: number
}) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  const value = useMemo<TooltipContextValue>(() => ({ open, setOpen }), [open])

  return (
    <div className="relative inline-flex">
      <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>
    </div>
  )
}

export function TooltipTrigger({
  children,
  asChild = false,
}: {
  children: ReactNode
  asChild?: boolean
}) {
  const context = useContext(TooltipContext)

  if (!context) {
    return <>{children}</>
  }

  const handleOpen = () => context.setOpen(true)
  const handleClose = () => context.setOpen(false)

  if (asChild && typeof children === "object" && children !== null && "props" in children) {
    const child = children as ReactElement
    return cloneElement(child, {
      onMouseEnter: (event: MouseEvent) => {
        handleOpen()
        child.props?.onMouseEnter?.(event)
      },
      onMouseLeave: (event: MouseEvent) => {
        handleClose()
        child.props?.onMouseLeave?.(event)
      },
      onFocus: (event: FocusEvent) => {
        handleOpen()
        child.props?.onFocus?.(event)
      },
      onBlur: (event: FocusEvent) => {
        handleClose()
        child.props?.onBlur?.(event)
      },
    })
  }

  return (
    <span
      className="inline-flex"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onFocus={handleOpen}
      onBlur={handleClose}
    >
      {children}
    </span>
  )
}

export function TooltipContent({
  children,
  className,
  side = "top",
}: {
  children: ReactNode
  className?: string
  side?: "top" | "bottom"
}) {
  const context = useContext(TooltipContext)

  if (!context?.open) return null

  return (
    <div
      role="tooltip"
      className={cn(
        "absolute z-20 whitespace-nowrap rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 shadow-lg",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        className,
      )}
    >
      {children}
    </div>
  )
}
