"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * Tracks the scroll progress of a scrollable element (or the window)
 * as a value between 0 and 1. Uses a mutable ref so R3F components
 * can read it every frame without triggering React re-renders.
 */
export function useScrollProgress() {
  const progressRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)

  const update = useCallback(() => {
    const el = containerRef.current
    if (!el) {
      // Fallback to window scroll
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      progressRef.current = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) : 0
    } else {
      const scrollTop = el.scrollTop
      const maxScroll = el.scrollHeight - el.clientHeight
      progressRef.current = maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        update()
        rafRef.current = null
      })
    }

    const target = containerRef.current || window
    target.addEventListener("scroll", handleScroll, { passive: true })
    // Initial calculation
    update()

    return () => {
      target.removeEventListener("scroll", handleScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [update])

  return { progressRef, containerRef }
}
