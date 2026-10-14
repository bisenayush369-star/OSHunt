"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * BottomNav: a floating glass tab bar docked to the bottom of the screen, for mobile only.
 *
 * - narrower than the `hideFrom` breakpoint (default "lg", 1024px): shown in the thumb zone, safe-area aware
 * - at that width and wider: hidden with display: none, so laptops and desktops never see it
 *
 * Uses only shadcn tokens (background, foreground, primary, border), so it follows your
 * theme and dark mode. No animation library: the springs are CSS linear() easings and the
 * squash-and-stretch uses the Web Animations API. Left-to-right layouts only.
 */

/**
 * Screen width at which the bar goes away. Written out in full so Tailwind can find the classes.
 * "md" = phones only; "lg" = phones and small tablets (the default).
 */
const HIDE_FROM = {
  sm: "sm:hidden",
  md: "md:hidden",
  lg: "lg:hidden",
  xl: "xl:hidden",
} as const

export type BottomNavBreakpoint = keyof typeof HIDE_FROM

/** Damped-spring easings sampled into CSS linear() (ζ=0.74 gentle, ζ=0.5 bouncy). */
const SPRING =
  "linear(0, 0.036, 0.123, 0.239, 0.365, 0.49, 0.606, 0.708, 0.794, 0.864, 0.919, 0.96, 0.99, 1.01, 1.022, 1.029, 1.031, 1.031, 1.029, 1.025, 1.021, 1.017, 1.013, 1.01, 1.007, 1.005, 1)"
const POP =
  "linear(0, 0.059, 0.206, 0.397, 0.596, 0.779, 0.931, 1.044, 1.117, 1.154, 1.163, 1.151, 1.125, 1.094, 1.061, 1.032, 1.008, 0.991, 0.98, 0.974, 0.974, 0.976, 0.98, 0.986, 0.991, 0.995, 0.999, 1.002, 1.003, 1.004, 1)"

export type BottomNavItem = {
  value: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  href?: string
}

export interface BottomNavProps
  extends Omit<React.ComponentPropsWithoutRef<"nav">, "children" | "defaultValue"> {
  items: BottomNavItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  hideFrom?: BottomNavBreakpoint
  LinkComponent?: React.ElementType
}

function resolveActiveIndex(items: BottomNavItem[], current?: string) {
  if (!current) return -1
  const path = current.split(/[?#]/, 1)[0]
  let best = -1
  let bestScore = -1
  items.forEach((item, index) => {
    let score = -1
    if (path === item.value) score = Number.MAX_SAFE_INTEGER
    else if (item.value !== "/" && path.startsWith(item.value.endsWith("/") ? item.value : `${item.value}/`)) {
      score = item.value.length
    }
    if (score > bestScore) {
      best = index
      bestScore = score
    }
  })
  return best
}

function BottomNav({
  items,
  value,
  defaultValue,
  onValueChange,
  hideFrom = "lg",
  LinkComponent,
  className,
  "aria-label": ariaLabel = "Primary",
  ...props
}: BottomNavProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.value)
  const current = value ?? internal
  const activeIndex = resolveActiveIndex(items, current)

  const [pos, setPos] = React.useState(Math.max(activeIndex, 0))
  if (activeIndex >= 0 && activeIndex !== pos) setPos(activeIndex)

  const pillRef = React.useRef<HTMLSpanElement>(null)
  const prevPos = React.useRef(pos)
  React.useEffect(() => {
    const from = prevPos.current
    prevPos.current = pos
    const el = pillRef.current
    if (from === pos || !el || typeof el.animate !== "function") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const distance = Math.abs(pos - from)
    const long = Math.min(1 + 0.1 * distance, 1.3)
    const short = Math.max(1 - 0.05 * distance, 0.86)
    el.animate(
      [
        { transform: "scale(1, 1)" },
        { transform: `scale(${long}, ${short})`, offset: 0.35 },
        { transform: "scale(1, 1)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    )
  }, [pos])

  if (items.length === 0) return null

  const select = (item: BottomNavItem) => {
    if (value === undefined) setInternal(item.value)
    onValueChange?.(item.value)
  }

  const cssVars = { "--bn-count": items.length, "--bn-index": pos } as React.CSSProperties

  return (
    <nav
      data-slot="bottom-nav"
      aria-label={ariaLabel}
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] sm:px-4",
        HIDE_FROM[hideFrom],
        className,
      )}
      {...props}
    >
      <div
        style={cssVars}
        className={cn(
          "pointer-events-auto relative w-full max-w-[26rem] rounded-[1.75rem] border border-border/60 p-1.5",
          "bg-background/95 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/90",
          "shadow-[0_12px_40px_-12px_rgb(0_0_0/0.3),0_2px_8px_rgb(0_0_0/0.06)] dark:shadow-[0_12px_40px_-12px_rgb(0_0_0/0.8),0_2px_8px_rgb(0_0_0/0.4)]",
          "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_0_rgb(255_255_255/0.6)] dark:after:shadow-[inset_0_1px_0_rgb(255_255_255/0.07)]",
        )}
      >
        <div className="relative">
          <span
            aria-hidden="true"
            style={{ transitionDuration: "560ms", transitionTimingFunction: SPRING }}
            className={cn(
              "pointer-events-none absolute left-0 top-0 h-full w-[calc(100%/var(--bn-count))] [transform:translateX(calc(var(--bn-index)*100%))]",
              "transition-transform motion-reduce:transition-none",
            )}
          >
            <span
              ref={pillRef}
              className={cn(
                "relative block h-full w-full rounded-[1.375rem] bg-primary/10 ring-1 ring-inset ring-primary/10 transition-opacity duration-200",
                activeIndex < 0 && "opacity-0",
              )}
            >
              <span className="absolute left-1/2 top-0 h-[3px] w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_14px_2px] shadow-primary/45" />
            </span>
          </span>

          <ul className="relative m-0 flex list-none p-0">
            {items.map((item, index) => {
              const active = index === activeIndex
              const Icon = item.icon
              const Comp: React.ElementType = item.href ? (LinkComponent ?? "a") : "button"
              const elementProps = item.href ? { href: item.href } : { type: "button" as const }

              return (
                <li key={item.value} className="min-w-0 flex-1">
                  <Comp
                    {...elementProps}
                    aria-current={active ? "page" : undefined}
                    data-active={active}
                    onClick={() => select(item)}
                    className={cn(
                      "group relative z-10 flex min-h-[56px] w-full min-w-0 flex-col items-center justify-center rounded-[1.375rem] px-0.5 py-2",
                      "text-[length:min(0.6875rem,16px)] font-medium leading-none tracking-[0.01em] text-foreground/65",
                      "outline-none [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]",
                      "transition-colors duration-200 motion-reduce:transition-none",
                      "data-[active=true]:text-foreground [@media(hover:hover)]:hover:text-foreground",
                      "focus-visible:ring-2 focus-visible:ring-foreground/80",
                      "md:min-h-[60px] md:text-[length:min(0.75rem,16px)]",
                      "[@media(max-height:480px)]:min-h-[48px]",
                    )}
                  >
                    <span className="flex w-full min-w-0 flex-col items-center gap-1 transition-transform duration-150 ease-out group-active:scale-[0.92] motion-reduce:transition-none motion-reduce:group-active:scale-100">
                      <span
                        style={{ transitionTimingFunction: POP }}
                        className={cn(
                          "flex h-6 w-6 items-center justify-center",
                          "transition-[transform,translate,scale,color] duration-500 motion-reduce:transition-none",
                          "group-data-[active=true]:-translate-y-0.5 group-data-[active=true]:scale-110 group-data-[active=true]:text-primary",
                        )}
                      >
                        <Icon className="h-[22px] w-[22px] md:h-6 md:w-6" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="max-w-full truncate">{item.label}</span>
                    </span>
                  </Comp>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}

function BottomNavSpacer({ className, hideFrom = "lg" }: { className?: string; hideFrom?: BottomNavBreakpoint }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[calc(5.75rem+env(safe-area-inset-bottom,0px))]", HIDE_FROM[hideFrom], className)}
    />
  )
}

export { BottomNav, BottomNavSpacer }
