"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -40px 0px") {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])
  return [ref, inView] as const
}

export function FadeInView({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const [ref, inView] = useInView<HTMLDivElement>()
  return (
    <div
      ref={ref}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
      className={cn(
        "transition-all duration-500 ease-out motion-reduce:transition-none",
        inView ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        className
      )}
    >
      {children}
    </div>
  )
}

export function useAnimatedNumber(target: number, duration = 1100, active = true) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!active) return
    if (prefersReducedMotion()) {
      setDisplay(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      setDisplay(Math.round((1 - Math.pow(1 - progress, 3)) * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])
  return display
}

export function CountUp({ value }: { value: number }) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px")
  const display = useAnimatedNumber(value, 900, inView)
  return <span ref={ref}>{display}</span>
}

// Kept as a bespoke component (rather than shadcn's plain animate-pulse
// Skeleton) for the shimmer sweep, which reads a level more polished for a
// data-heavy dashboard. Named distinctly so it won't collide if a plain
// shadcn Skeleton ever gets added to the project too.
export function ShimmerSkeleton({ w, h }: { w: string | number; h: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-md bg-white/[0.04] after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent motion-reduce:after:hidden"
      style={{ width: w, height: h }}
    />
  )
}
