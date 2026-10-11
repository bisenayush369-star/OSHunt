// Inline SVGs only — same rule as the rest of OSHunt (no icon libraries, no emojis).
import type { SVGProps } from "react"

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 16, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const SearchIcon = (p: P) => (
  <Svg {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
)
export const ArrowRightIcon = (p: P) => (
  <Svg strokeWidth={2.2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
)
export const ExternalIcon = (p: P) => (
  <Svg {...p}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" /></Svg>
)
export const CheckIcon = (p: P) => (
  <Svg strokeWidth={2.5} {...p}><polyline points="20 6 9 17 4 12" /></Svg>
)
export const CrossIcon = (p: P) => (
  <Svg strokeWidth={2.5} {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
)
export const CopyIcon = (p: P) => (
  <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Svg>
)
export const SendIcon = (p: P) => (
  <Svg {...p}><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></Svg>
)
export const StopIcon = (p: P) => (
  <Svg fill="currentColor" stroke="none" {...p}><rect x="5" y="5" width="14" height="14" rx="2" /></Svg>
)
export const BotIcon = (p: P) => (
  <Svg strokeWidth={1.8} {...p}>
    <rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" /><line x1="16" y1="16" x2="16" y2="16" />
  </Svg>
)
export const StarIcon = (p: P) => (
  <Svg fill="currentColor" stroke="none" {...p}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </Svg>
)
export const ScanIcon = (p: P) => (
  <Svg strokeWidth={1.6} {...p}>
    <path d="M12 3L19 8V16L12 21L5 16V8L12 3Z" /><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
  </Svg>
)
export const TerminalIcon = (p: P) => (
  <Svg strokeWidth={1.6} {...p}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></Svg>
)
export const GitBranchIcon = (p: P) => (
  <Svg strokeWidth={1.6} {...p}>
    <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" />
  </Svg>
)
export const MapIcon = (p: P) => (
  <Svg {...p}>
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
  </Svg>
)
export const AlertIcon = (p: P) => (
  <Svg {...p}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </Svg>
)
export const GitHubMark = (p: P) => (
  <Svg fill="currentColor" stroke="none" {...p}>
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 015.76 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0023.5 12C23.5 5.65 18.35.5 12 .5z" />
  </Svg>
)
