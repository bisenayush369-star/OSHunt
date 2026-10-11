"use client"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

/** SSR-safe and live: updates if the person flips the OS setting mid-session. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

/** Flips to true one frame after mount, so CSS transitions have a start state to leave from. */
export function useLanded() {
  const [landed, setLanded] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setLanded(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return landed
}

/** Eased count from 0 to `value`. Jumps straight to the end for reduced motion. */
export function useCountUp(value: number, duration = 900, delay = 0) {
  const reduced = useReducedMotion()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (reduced) return
    let raf = 0
    const t0 = performance.now() + delay
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / duration))
      setN(Math.round((1 - Math.pow(1 - p, 3)) * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, delay, reduced])

  return reduced ? value : n
}

/** Characters revealed so far. Parent should remount (via `key`) when the text changes. */
export function useTyped(text: string, charsPerTick = 4, tickMs = 12) {
  const reduced = useReducedMotion()
  const [count, setCount] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (reduced || !text) return
    timer.current = setInterval(() => {
      setCount((c) => {
        const next = c + charsPerTick
        if (next >= text.length && timer.current) clearInterval(timer.current)
        return next
      })
    }, tickMs)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [text, charsPerTick, tickMs, reduced])

  const shown = reduced ? text : text.slice(0, count)
  return { shown, done: shown.length >= text.length }
}
