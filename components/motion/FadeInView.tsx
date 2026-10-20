"use client"

// Scroll-in helpers shared by the Trending and Analyze pages: useInView / FadeInView / CountUp /
// prefersReducedMotion. Same exports and props as before.
//
// What changed:
//  • Reduced-motion is read through useSyncExternalStore, so server and client agree during hydration
//    (the old `useState(() => matchMedia(...))` made reduced-motion visitors hydrate to different markup)
//    and it also reacts if the setting is toggled while the page is open.
//  • For reduced-motion users the content is simply never hidden — done in CSS (`motion-reduce:`), so there
//    is not even a one-frame flash.
//  • Once an element has appeared it carries no transform / opacity at all. The old `translate-y-0` left a
//    transform on every card forever, which makes a containing block for any fixed-position child.
//  • Browsers without IntersectionObserver show the content instead of leaving it invisible.
//  • CountUp no longer sticks on a stale number for reduced-motion users, and when `value` changes it
//    counts from where it is instead of restarting at 0.

import { useEffect, useRef, useState, useSyncExternalStore } from "react"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_MOTION).matches
}

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}

// Fires once when the element first enters the viewport, then stops
// watching — entrances should happen once, not replay every time you scroll
// past something. Resolves as "already in view" immediately for
// prefers-reduced-motion, so those users see final-state content with no
// animation at all.
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -80px 0px") {
  const ref = useRef<T | null>(null)
  const [seen, setSeen] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduced || seen) return
    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setSeen(true), 0)
      return () => window.clearTimeout(id)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin, reduced, seen])

  return [ref, reduced || seen] as const
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
      // `translate` is listed next to `transform` because Tailwind v4's translate-* utilities use the
      // individual `translate` property while v3's use `transform`.
      className={`transition-[opacity,transform,translate] duration-700 ease-out motion-reduce:transition-none ${
        inView ? "" : "translate-y-6 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100"
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
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    if (!inView || reduced) return
    let raf = 0
    const from = shown.current
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = Math.round(from + (value - from) * eased)
      shown.current = next
      setDisplay(next)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduced, value, duration])

  return (
    <span ref={ref} className={className}>
      {reduced ? value : display}
    </span>
  )
}