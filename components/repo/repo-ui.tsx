// Shared bits for the repo card family (RepoCard, BookmarkButton, CopyButton, RepoBlurbView, RepoQnA,
// SortControl). Nothing here is page-specific, so other screens can use it too.
//
//  - `cx`            tiny class joiner, so these files don't depend on where your `cn` helper lives
//  - `ACTION_BUTTON` the look (not the height — see ACTION_SIZE) of every small outlined action (Copy, Ask AI, Sort…). Pass it as the
//                    className of <Button variant="secondary" size="sm">. It's written so it wins over
//                    shadcn's own button classes in light AND dark themes (secondary has no `dark:` variants).
//  - colour helpers  `readableOn` & friends: make a brand colour legible as text on the near-black card
//  - icons           inline SVGs (Lucide shapes, ISC licence — https://lucide.dev) so the cards need no
//                    icon package. All are decorative: aria-hidden, sized with `size-*`, coloured by `currentColor`.

import type { SVGProps } from "react"

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

/** The accent used across the Trending UI. */
export const ACCENT = "#a8ff3e"

export const ACTION_BUTTON = cx(
  "gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[13px] font-medium text-[#c4c4c4] shadow-none has-[>svg]:px-3",
  "transition-[color,background-color,border-color,transform,scale] duration-200 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
  "hover:border-[#a8ff3e]/35 hover:bg-[#a8ff3e]/[0.07] hover:text-[#a8ff3e]",
  "data-[state=open]:border-[#a8ff3e]/40 data-[state=open]:bg-[#a8ff3e]/[0.07] data-[state=open]:text-[#a8ff3e]",
  "focus-visible:border-[#a8ff3e]/70 focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-0",
)

/** Height of the card's action buttons: 44px tap target on phones, a compact 36px from `sm` up. */
export const ACTION_SIZE = "h-11 sm:h-9"

// ─── colour helpers ──────────────────────────────────────────────────────────────────────────────────
// Language colours come from an icon library and can be #rrggbb, #rgb, rgb(...) or something else entirely, and
// the card is near-black, so a brand colour has to be checked against what it will actually sit on.
export type RGB = [number, number, number]

/** The card's background (`bg-[#0a0a0a]`). */
export const CARD_BG: RGB = [10, 10, 10]

/** "#rrggbb" for #rrggbb, #rgb and rgb()/rgba() inputs; null for anything else (names, hsl, var()…). */
export function toHex(color: string | undefined): string | null {
  const c = (color ?? "").trim()
  if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${[...c.slice(1)].map(ch => ch + ch).join("")}`.toLowerCase()
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(c)
  if (rgb) return rgbToHex([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])])
  return null
}

export const hexToRgb = (hex: string): RGB => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB

export const rgbToHex = (rgb: RGB): string =>
  `#${rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`

/** WCAG relative luminance, 0 (black) … 1 (white). */
export function relativeLuminance([r, g, b]: RGB): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1 … 21. Body text needs 4.5. */
export function contrastRatio(a: RGB, b: RGB): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** `from` moved `amount` (0…1) of the way towards `to` — also how a translucent fill looks over its backdrop. */
export const blend = (from: RGB, to: RGB, amount: number): RGB => from.map((v, i) => v + (to[i] - v) * amount) as RGB

/**
 * Lightens `hex` just enough for text in it to reach `minRatio` against `bg` (default: a little over the AA
 * minimum of 4.5, so rounding to whole colour values can't tip it under). Colours that already read well are
 * returned unchanged. The old version only compared against pure black, which missed the faint tint the chip
 * paints behind its own text — TypeScript-blue-ish colours landed at 4.3:1.
 */
export function readableOn(hex: string, bg: RGB = CARD_BG, minRatio = 4.6): string {
  const rgb = hexToRgb(hex)
  for (let step = 0; step <= 20; step++) {
    const candidate = blend(rgb, [255, 255, 255], step / 20)
    if (contrastRatio(candidate, bg) >= minRatio) return rgbToHex(candidate)
  }
  return "#ffffff"
}

type IconProps = SVGProps<SVGSVGElement>

function Icon({ className, children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const StarIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" />
  </Icon>
)
export const ForkIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" />
    <path d="M12 12v3" />
  </Icon>
)
export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </Icon>
)
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
)
export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Icon>
)
export const TerminalIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19h8" />
    <path d="m4 17 6-6-6-6" />
  </Icon>
)
export const LinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Icon>
)
export const BotIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </Icon>
)
export const SendIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
    <path d="m21.854 2.147-10.94 10.939" />
  </Icon>
)
export const SparklesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
    <path d="M20 2v4" />
    <path d="M22 4h-4" />
    <circle cx="4" cy="20" r="2" />
  </Icon>
)
export const BookmarkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z" />
  </Icon>
)
export const ExternalLinkIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  </Icon>
)
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </Icon>
)
export const RetryIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
)
export const SortIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m21 16-4 4-4-4" />
    <path d="M17 20V4" />
    <path d="m3 8 4-4 4 4" />
    <path d="M7 4v16" />
  </Icon>
)
export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <path d="M16 3.128a4 4 0 0 1 0 7.744" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <circle cx="9" cy="7" r="4" />
  </Icon>
)
export const ZapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z" />
  </Icon>
)
export const ArrowUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </Icon>
)