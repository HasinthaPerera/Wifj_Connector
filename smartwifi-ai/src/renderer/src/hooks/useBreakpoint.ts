import { useState, useEffect, useCallback } from 'react'

/**
 * Tailwind CSS v4 default breakpoints (px values, lower-bound inclusive):
 *   sm  ≥ 640
 *   md  ≥ 768
 *   lg  ≥ 1024
 *   xl  ≥ 1280
 *   2xl ≥ 1536
 */
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
}

function resolveBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

export interface UseBreakpointReturn {
  /** Resolved Tailwind breakpoint label for current window width */
  breakpoint: Breakpoint
  /** Window inner width in pixels */
  width: number
  /** True when width < 768 (below Tailwind md) */
  isMobile: boolean
  /** True when 768 ≤ width < 1024 (Tailwind md range) */
  isTablet: boolean
  /** True when width ≥ 1024 (Tailwind lg+) */
  isDesktop: boolean
  /** Returns true if the current breakpoint is ≥ the given one */
  isAtLeast: (bp: Breakpoint) => boolean
}

/**
 * `useBreakpoint` — reactively tracks the window width and exposes
 * Tailwind-aligned breakpoint utilities.
 *
 * Uses a single `resize` event listener with a 100ms debounce so it is
 * safe to use in multiple components simultaneously.
 */
export function useBreakpoint(): UseBreakpointReturn {
  const [width, setWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  )

  useEffect(() => {
    let raf: number | undefined

    const handleResize = (): void => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        setWidth(window.innerWidth)
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('resize', handleResize)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const breakpoint = resolveBreakpoint(width)

  const isAtLeast = useCallback((bp: Breakpoint): boolean => width >= BREAKPOINTS[bp], [width])

  return {
    breakpoint,
    width,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isAtLeast
  }
}
