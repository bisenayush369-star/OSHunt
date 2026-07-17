"use client"

// Same pattern your Analyze page already defines inline (useInView /
// FadeInView / CountUp / prefersReducedMotion) — pulled out into one shared
// file so the new Trend page doesn't duplicate it a second time. Optional:
// your Analyze page can import from here too instead of its local copy, but
// I haven't touched that file since it already works and I can't test it
// end-to-end from here.

import { useEffect, useRef, useState } from "react"

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Fires once when the element first enters the viewport, then stops
// watching — entrances should happen once, not replay every time you scroll
// past something. Resolves as "already in view" immediately for
// prefers-reduced-motion, so those users see final-state content with no
// animation at all.
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -80px 0px") {
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
      { threshold: 0.15, rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, inView] as const
}

// Fades + slides an element up into place the first time it's scrolled into
// view. `delay` (ms) lets a list of siblings stagger instead of popping in
// together — pass index * 60-ish from the caller.
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
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        inView ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  )
}

// Counts up from 0 to `value` the first time it scrolls into view. Only use
// on numbers that are already real — never on invented stats.
export function CountUp({ value, duration = 900, className = "" }: { value: number; duration?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>("0px")
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    if (prefersReducedMotion()) {
      setDisplay(value)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  )
}
