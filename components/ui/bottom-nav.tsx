"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * BottomNav: oshunt's mobile tab bar, docked to the bottom edge of the screen.
 * Mobile only: shown below the `hideFrom` breakpoint (default "lg", 1024px) and display: none from there up.
 *
 * One surface, one hairline, one accent. The active tab is the only coloured thing on the bar: its icon turns lime
 * and a 2px marker on the top edge slides across to it. No glow and no shadow. The only motion answers a tap.
 *
 * Four CSS variables on the <nav> set the colours. Point them at your own tokens if you have them:
 *   --bn-bg      bar surface                      #0b0b0b   (use your page background for a seamless bar)
 *   --bn-text    active label, pressed tab        #efefef
 *   --bn-muted   inactive tabs                    #8c8c8c   (keep it at 4.5:1 or better on --bn-bg)
 *   --bn-accent  active icon, marker, focus ring  #a8ff3e
 * Change them with className="[--bn-accent:#ff6b3d]" or style={{ "--bn-accent": "#ff6b3d" }}.
 * Labels use `font-family: var(--font)` when your site defines it, otherwise Outfit, then system-ui.
 *
 * Left-to-right layouts only.
 */

/**
 * Screen width at which the bar goes away. Written out in full so Tailwind can find the classes.
 * "md" = phones only; "lg" = phones and small tablets (the default).
 */
const HIDE_FROM = {
  sm: "sm:hidden", // 640px
  md: "md:hidden", // 768px
  lg: "lg:hidden", // 1024px
  xl: "xl:hidden", // 1280px
} as const

export type BottomNavBreakpoint = keyof typeof HIDE_FROM

/** The site's easing (GSAP "expo.out"): fast start, long soft landing, no overshoot. */
const EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)"

export type BottomNavItem = {
  /** Unique id. For route-based navigation use the path, e.g. "/hunt". */
  value: string
  /** Short label shown under the icon. Up to about 9 characters ("Discovery") fits at every text size; longer ones are cut with an ellipsis. */
  label: string
  /** Any lucide-react icon, or an SVG component that accepts className. */
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  /** When set the item renders as a link, otherwise as a button. */
  href?: string
}

export interface BottomNavProps
  extends Omit<React.ComponentPropsWithoutRef<"nav">, "children" | "defaultValue"> {
  /** 2–5 destinations (designed for 4). */
  items: BottomNavItem[]
  /** Controlled active value, e.g. the current pathname. */
  value?: string
  /** Initial active value when uncontrolled. */
  defaultValue?: string
  /** Fires on every tap, with the tapped item's value. */
  onValueChange?: (value: string) => void
  /**
   * Screen width from which the bar is hidden. Default "lg" (1024px): phones and small tablets get
   * the bar, laptops and desktops do not. Use "md" (768px) for phones only.
   * Give <BottomNavSpacer /> the same value.
   */
  hideFrom?: BottomNavBreakpoint
  /**
   * Component used for items that have an `href`. Defaults to a plain <a>.
   * Next.js:       LinkComponent={Link}
   * React Router:  define the adapter once at module level (NOT inline in a component, or it remounts every render):
   *                const RouterLink = ({ href, ...p }: any) => <Link to={href} {...p} />
   *                <BottomNav LinkComponent={RouterLink} … />
   */
  LinkComponent?: React.ElementType
}

/** Exact match wins; otherwise the longest path prefix ("/hunt" ⊂ "/hunt/42"). */
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
  "aria-label": ariaLabel = "Mobile",
  ...props
}: BottomNavProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.value)
  const current = value ?? internal
  const activeIndex = resolveActiveIndex(items, current)

  // Keep the marker parked on the last known tab when the current route is not in the bar.
  const [pos, setPos] = React.useState(Math.max(activeIndex, 0))
  if (activeIndex >= 0 && activeIndex !== pos) setPos(activeIndex)

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
        // Docked edge to edge. The padding adds the home-indicator and notch insets, so the surface reaches the
        // screen edge while the tabs stay clear of them.
        "fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]",
        // Solid where backdrop-filter is not supported. Otherwise just barely see-through, with a light blur.
        "bg-[color:var(--bn-bg)] supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--bn-bg)_95%,transparent)] supports-[backdrop-filter]:backdrop-blur-xl",
        // The hairline along the top edge.
        "shadow-[inset_0_1px_0_color-mix(in_srgb,var(--bn-text)_9%,transparent)]",
        // Mobile only: gone (display: none) from the chosen breakpoint up.
        HIDE_FROM[hideFrom],
        "[--bn-bg:#0b0b0b] [--bn-text:#efefef] [--bn-muted:#8c8c8c] [--bn-accent:#a8ff3e]",
        className,
      )}
      {...props}
    >
      {/* On tablets the tabs stay together in the middle instead of spreading across the whole width. */}
      <div style={cssVars} className="relative mx-auto w-full max-w-[32rem]">
        {/* The marker is sized 1/N of the bar and moved by index × 100%, so it needs no measuring. */}
        {/* Timing is inline on purpose: arbitrary duration-[…]/ease-[…] classes collide with tailwindcss-animate. */}
        <span
          data-slot="bottom-nav-marker"
          aria-hidden="true"
          style={{ transitionDuration: "380ms", transitionTimingFunction: EXPO_OUT }}
          className={cn(
            "pointer-events-none absolute left-0 top-0 flex h-[2px] w-[calc(100%/var(--bn-count))] justify-center [transform:translateX(calc(var(--bn-index)*100%))]",
            "transition-[transform,opacity] motion-reduce:transition-none",
            activeIndex < 0 && "opacity-0",
          )}
        >
          <span className="block h-full w-7 rounded-b-full bg-[color:var(--bn-accent)]" />
        </span>

        <ul
          className={cn(
            "m-0 flex list-none p-0",
            // Biggest label size that still fits a tab: the longest label (about 9 characters, "Discovery") is 4.5em wide.
            // Plain 16px where container query units are not supported.
            "[--bn-label-max:16px] supports-[width:1cqi]:[--bn-label-max:min(16px,max(11px,calc((100cqi/var(--bn-count)_-_6px)/4.7)))]",
            "[container-type:inline-size]",
          )}
        >
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
                    // Sizes are px on purpose: touch targets must not balloon when the user raises the browser font size.
                    "group relative flex min-h-[56px] w-full min-w-0 flex-col items-center justify-center rounded-[14px] px-[2px] py-[8px] no-underline",
                    "[font-family:var(--font,Outfit,system-ui,sans-serif)]",
                    // Label grows with the user's font setting, but never past 16px or the width of its tab, so it is not cut off.
                    "text-[length:min(0.6875rem,var(--bn-label-max))] font-medium leading-none tracking-[0.01em]",
                    "text-[color:var(--bn-muted)]",
                    "[outline:none] [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]",
                    // Only the text colour animates. (In Tailwind 4, transition-colors also fades outline-color.)
                    "transition-[color] duration-150 motion-reduce:transition-none",
                    "data-[active=true]:text-[color:var(--bn-text)] active:text-[color:var(--bn-text)] [@media(hover:hover)]:hover:text-[color:var(--bn-text)]",
                    // The site's focus ring, drawn inside the tab so the bar's edges do not clip it.
                    "focus-visible:[outline:2px_solid_var(--bn-accent)] focus-visible:[outline-offset:-4px]",
                    "md:min-h-[60px] md:text-[length:min(0.75rem,var(--bn-label-max))]",
                    "[@media(max-height:480px)]:min-h-[48px] [@media(max-height:480px)]:py-[6px]",
                  )}
                >
                  {/* Press feedback (150ms) on the whole stack. w-full + min-w-0 keep it inside the tab so long labels truncate. */}
                  <span className="flex w-full min-w-0 flex-col items-center gap-[4px] transition-transform duration-150 ease-out group-active:scale-[0.94] motion-reduce:transition-none motion-reduce:group-active:scale-100">
                    <span className="flex h-[24px] w-[24px] items-center justify-center transition-colors duration-200 group-data-[active=true]:text-[color:var(--bn-accent)] motion-reduce:transition-none">
                      <Icon className="h-[22px] w-[22px] md:h-[24px] md:w-[24px]" strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                  </span>
                </Comp>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

/**
 * Drop this at the end of your page/layout so the last content is never hidden behind the bar.
 * It disappears at the same width as the bar, so pass the same `hideFrom` to both.
 */
function BottomNavSpacer({ className, hideFrom = "lg" }: { className?: string; hideFrom?: BottomNavBreakpoint }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[calc(64px+env(safe-area-inset-bottom,0px))]", HIDE_FROM[hideFrom], className)}
    />
  )
}

export { BottomNav, BottomNavSpacer }