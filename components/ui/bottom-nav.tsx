"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * BottomNav: oshunt's mobile tab bar, a floating glass dock.
 * Mobile only: shown below the `hideFrom` breakpoint (default "lg", 1024px) and display: none from there up.
 *
 * One rounded surface floats above the bottom edge (and above the home indicator), blurred and bordered by a hairline.
 * A soft pill slides behind the active tab; its icon turns lime and the top edge of the pill picks up a thin lime line.
 * No glow. The only motion answers a tap or a route change, and it stops for reduced motion. Behind the dock a short
 * fade lets the page dissolve instead of running into it.
 *
 * Four CSS variables on the <nav> set the colours. Point them at your own tokens if you have them:
 *   --bn-bg      dock surface                     #0b0b0b   (use your page background for a seamless dock)
 *   --bn-text    active label, pressed tab        #efefef
 *   --bn-muted   inactive tabs                    #8c8c8c   (keep it at 4.5:1 or better on --bn-bg)
 *   --bn-accent  active icon, pill edge, focus    #a8ff3e
 * Change them with className="[--bn-accent:#ff6b3d]" or style={{ "--bn-accent": "#ff6b3d" }}.
 * Labels use `font-family: var(--font)` when your site defines it, otherwise Outfit, then system-ui.
 *
 * Room for the dock: the dock is fixed, so the last content must clear it.
 *  - Normal pages: put <BottomNavSpacer /> at the end of the page or layout.
 *  - A page that scrolls inside its own container (h-dvh + overflow-y-auto): pad that container instead, with the same
 *    height as the spacer:  pb-[calc(88px+env(safe-area-inset-bottom,0px))] lg:pb-0   (lg = the `hideFrom` breakpoint).
 *    Do not also render the spacer there, or the page itself gains a second scroll.
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

  // Keep the pill parked on the last known tab when the current route is not in the bar.
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
        // The <nav> only positions things. Taps pass through everywhere except the dock itself.
        // The dock floats 12px above the edge, or just above the home indicator when there is one.
        "pointer-events-none fixed inset-x-0 bottom-0 z-50",
        "pb-[max(12px,calc(env(safe-area-inset-bottom,0px)_-_6px))] pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))]",
        // Mobile only: gone (display: none) from the chosen breakpoint up.
        HIDE_FROM[hideFrom],
        "[--bn-bg:#0b0b0b] [--bn-text:#efefef] [--bn-muted:#8c8c8c] [--bn-accent:#a8ff3e]",
        className,
      )}
      {...props}
    >
      {/* The fade: page content dissolves into the background just under the dock. Decorative, never takes a tap. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[calc(92px+env(safe-area-inset-bottom,0px))] bg-[linear-gradient(to_top,color-mix(in_srgb,var(--bn-bg)_97%,transparent)_0,color-mix(in_srgb,var(--bn-bg)_96%,transparent)_26px,color-mix(in_srgb,var(--bn-bg)_72%,transparent)_52px,color-mix(in_srgb,var(--bn-bg)_28%,transparent)_74px,transparent)]"
      />

      <div
        className={cn(
          // On tablets the dock stays one comfortable width in the middle instead of stretching across the screen.
          "pointer-events-auto relative mx-auto w-full max-w-[28rem] rounded-[24px] p-[6px]",
          // Solid where backdrop-filter is not supported. Otherwise mostly opaque, with a blur and a touch more colour.
          "bg-[color:var(--bn-bg)] supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--bn-bg)_86%,transparent)] supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
          // Hairline border and a lighter top edge, drawn inside. The drop shadow is dark, it lifts the dock and does not glow.
          "shadow-[0_16px_36px_-14px_rgba(0,0,0,0.9),inset_0_0_0_1px_color-mix(in_srgb,var(--bn-text)_10%,transparent),inset_0_1px_0_color-mix(in_srgb,var(--bn-text)_7%,transparent)]",
        )}
      >
        <div style={cssVars} className="relative">
          {/* The pill is 1/N of the dock wide and moved by index × 100%, so it needs no measuring. */}
          {/* Timing is inline on purpose: arbitrary duration-[…]/ease-[…] classes collide with tailwindcss-animate. */}
          <span
            data-slot="bottom-nav-pill"
            aria-hidden="true"
            style={{ transitionDuration: "420ms", transitionTimingFunction: EXPO_OUT }}
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-[calc(100%/var(--bn-count))] [transform:translateX(calc(var(--bn-index)*100%))]",
              "transition-[transform,opacity] motion-reduce:transition-none",
              activeIndex < 0 && "opacity-0",
            )}
          >
            <span className="absolute inset-0 rounded-[18px] bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bn-text)_13%,transparent),color-mix(in_srgb,var(--bn-text)_5%,transparent))] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--bn-accent)_60%,transparent),inset_0_0_0_1px_color-mix(in_srgb,var(--bn-text)_9%,transparent)]" />
          </span>

          <ul
            className={cn(
              "relative m-0 flex list-none p-0",
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
                      "group relative flex min-h-[52px] w-full min-w-0 flex-col items-center justify-center rounded-[18px] px-[2px] py-[7px] no-underline",
                      "[font-family:var(--font,Outfit,system-ui,sans-serif)]",
                      // Label grows with the user's font setting, but never past 16px or the width of its tab, so it is not cut off.
                      "text-[length:min(0.6875rem,var(--bn-label-max))] font-medium leading-none tracking-[0.01em]",
                      "text-[color:var(--bn-muted)]",
                      "[outline:none] [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]",
                      // Only the text colour animates. (In Tailwind 4, transition-colors also fades outline-color.)
                      "transition-[color] duration-200 motion-reduce:transition-none",
                      "data-[active=true]:text-[color:var(--bn-text)] active:text-[color:var(--bn-text)] [@media(hover:hover)]:hover:text-[color:var(--bn-text)]",
                      // The site's focus ring, drawn inside the tab so the dock's edges do not clip it.
                      "focus-visible:[outline:2px_solid_var(--bn-accent)] focus-visible:[outline-offset:-3px]",
                      "md:min-h-[56px] md:text-[length:min(0.75rem,var(--bn-label-max))]",
                      "[@media(max-height:480px)]:min-h-[44px] [@media(max-height:480px)]:py-[5px]",
                    )}
                  >
                    {/* Press feedback (150ms) on the whole stack. w-full + min-w-0 keep it inside the tab so long labels truncate. */}
                    <span className="flex w-full min-w-0 flex-col items-center gap-[4px] transition-transform duration-150 ease-out group-active:scale-[0.92] motion-reduce:transition-none motion-reduce:group-active:scale-100">
                      <span className="flex h-[24px] w-[24px] items-center justify-center transition-[color,transform] duration-300 group-data-[active=true]:-translate-y-px group-data-[active=true]:text-[color:var(--bn-accent)] motion-reduce:transition-none">
                        <Icon className="h-[22px] w-[22px] md:h-[24px] md:w-[24px]" strokeWidth={active ? 2.25 : 1.9} aria-hidden="true" />
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

/**
 * Drop this at the end of your page/layout so the last content is never hidden behind the dock.
 * It disappears at the same width as the dock, so pass the same `hideFrom` to both.
 * (A page with its own scroll container pads that container instead. See the note at the top of this file.)
 */
function BottomNavSpacer({ className, hideFrom = "lg" }: { className?: string; hideFrom?: BottomNavBreakpoint }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[calc(88px+env(safe-area-inset-bottom,0px))]", HIDE_FROM[hideFrom], className)}
    />
  )
}

export { BottomNav, BottomNavSpacer }