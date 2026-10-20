import { cn } from "@/components/lib/utils"
import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

export const BTN_PRIMARY =
  "rounded-md border border-[#a8ff3e]/80 bg-[#a8ff3e] px-4 py-2 text-[13px] font-semibold text-[#0b0b0b] shadow-[0_0_28px_rgba(168,255,62,0.2)] transition hover:bg-[#c3ff72]"

export const BTN_SECONDARY =
  "rounded-md border border-[#2a2a2a] bg-[#121212] px-4 py-2 text-[13px] font-semibold text-white transition hover:border-[#4a4a4a] hover:bg-[#171717]"

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg"
}

export function Container({ size = "md", className, ...props }: ContainerProps) {
  const sizeClass =
    size === "sm" ? "max-w-3xl" : size === "lg" ? "max-w-6xl" : "max-w-5xl"

  return <div className={cn("mx-auto w-full px-4 sm:px-6", sizeClass, className)} {...props} />
}

export function PageShell({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-h-screen bg-[#090909] text-white", className)} {...props}>
      {children}
    </div>
  )
}

export function Backdrop({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,255,62,0.10),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,255,62,0.08),transparent_48%)]",
        className
      )}
      {...props}
    />
  )
}

export function HeroPill({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-[#a8ff3e]/25 bg-[#a8ff3e]/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#a8ff3e]",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function Reveal({
  children,
  intro = false,
  delay = 0,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { intro?: boolean; delay?: number }) {
  return (
    <div
      className={cn(
        "transition-all duration-700 ease-out",
        intro ? "opacity-100" : "opacity-100",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </div>
  )
}

export function Counter({ to, duration = 900 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(to * eased))

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [duration, to])

  return <>{value}</>
}

export function SectionHead({
  eyebrow,
  title,
  className,
}: {
  eyebrow?: string
  title: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      {eyebrow ? (
        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a8ff3e]">{eyebrow}</span>
      ) : null}
      <h2 className="mt-3 text-balance text-[28px] font-semibold tracking-tight text-white sm:text-[36px]">{title}</h2>
    </div>
  )
}

export function LockFrame({
  children,
  radius = 16,
  className,
}: {
  children: ReactNode
  radius?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-[#2a2a2a] bg-[#111111] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_20px_50px_-20px_rgba(0,0,0,0.75)]",
        className
      )}
      style={{ borderRadius: radius, clipPath: "inset(0 round 0)" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(168,255,62,0.06),transparent_42%)]" />
      {children}
    </div>
  )
}

export function LockCard({
  children,
  flat = false,
  locked = false,
  className,
  style,
}: {
  children: ReactNode
  flat?: boolean
  locked?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-[#292929] bg-[#121212]",
        !flat && "shadow-[0_20px_80px_rgba(0,0,0,0.45)]",
        locked && "before:absolute before:inset-0 before:border before:border-[#a8ff3e]/20",
        className
      )}
      style={style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,255,62,0.08),transparent_36%)]" />
      <div className="relative">{children}</div>
    </div>
  )
}

export function TerminalWindow({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-[#2a2a2a] bg-[#0c0c0c] text-left shadow-[0_18px_50px_-15px_rgba(0,0,0,0.7)]",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#1d1d1d] bg-[#141414] px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#989898]">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  )
}

export function IconArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn(className)} aria-hidden="true">
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(className)} aria-hidden="true">
      <path
        d="M5 10.5 8.2 13.7 15 6.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconCross({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={cn(className)} aria-hidden="true">
      <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const fill = node.querySelector(".os-rail-fill") as HTMLElement | null
    if (!fill) return

    const onScroll = () => {
      const rect = node.getBoundingClientRect()
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / (rect.height + window.innerHeight)))
      fill.style.height = `${Math.max(0, progress * 100)}%`
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)

    return () => {
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])

  return ref
}

export default {
  BTN_PRIMARY,
  BTN_SECONDARY,
  Backdrop,
  Container,
  Counter,
  HeroPill,
  IconArrowRight,
  IconCheck,
  IconCross,
  LockCard,
  LockFrame,
  PageShell,
  Reveal,
  SectionHead,
  TerminalWindow,
  useScrollProgress,
}
