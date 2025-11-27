'use client'

import { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface AuroraBackgroundProps {
  children?: React.ReactNode
  className?: string
  showRadialGradient?: boolean
  colors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  speed?: 'slow' | 'normal' | 'fast'
  intensity?: 'subtle' | 'normal' | 'intense'
  interactive?: boolean
  /** Pause animations when not visible */
  pauseWhenHidden?: boolean
  /** Reduce motion for accessibility */
  reducedMotion?: boolean
}

// Static configuration maps - defined outside component to prevent recreation
const SPEED_MAP = {
  slow: '20s',
  normal: '12s',
  fast: '6s',
} as const

const INTENSITY_MAP = {
  subtle: 0.3,
  normal: 0.5,
  intense: 0.7,
} as const

// Throttle helper for mouse events
function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  limit: number
): T {
  let inThrottle = false
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }) as T
}

export const AuroraBackground = memo(function AuroraBackground({
  children,
  className,
  showRadialGradient = true,
  colors = {
    primary: 'var(--aurora-primary, #3b82f6)',
    secondary: 'var(--aurora-secondary, #8b5cf6)',
    accent: 'var(--aurora-accent, #06b6d4)',
  },
  speed = 'normal',
  intensity = 'normal',
  interactive = false,
  pauseWhenHidden = true,
  reducedMotion = false,
}: AuroraBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const rafRef = useRef<number | null>(null)

  // Memoized computed values
  const animationDuration = useMemo(() => SPEED_MAP[speed], [speed])
  const opacity = useMemo(() => INTENSITY_MAP[intensity], [intensity])

  // Memoized hex opacity calculations
  const opacityHex = useMemo(
    () => Math.round(opacity * 255).toString(16).padStart(2, '0'),
    [opacity]
  )
  const opacityHex80 = useMemo(
    () => Math.round(opacity * 0.8 * 255).toString(16).padStart(2, '0'),
    [opacity]
  )
  const opacityHex60 = useMemo(
    () => Math.round(opacity * 0.6 * 255).toString(16).padStart(2, '0'),
    [opacity]
  )

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (reducedMotion) {
      setIsPaused(true)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setIsPaused(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsPaused(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [reducedMotion])

  // Intersection Observer for pause when hidden
  useEffect(() => {
    if (!pauseWhenHidden) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [pauseWhenHidden])

  // Throttled mouse move handler using RAF
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePosition({ x, y })
    })
  }, [])

  // Throttled version for better performance
  const throttledMouseMove = useMemo(
    () => throttle(handleMouseMove, 16), // ~60fps
    [handleMouseMove]
  )

  // Interactive mouse tracking
  useEffect(() => {
    if (!interactive || isPaused) return

    const container = containerRef.current
    container?.addEventListener('mousemove', throttledMouseMove)

    return () => {
      container?.removeEventListener('mousemove', throttledMouseMove)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [interactive, isPaused, throttledMouseMove])

  // Memoized animation state
  const animationState = useMemo(() => {
    if (isPaused || !isVisible) {
      return 'paused'
    }
    return 'running'
  }, [isPaused, isVisible])

  // Memoized gradient styles to prevent recalculation
  const gradientStyles = useMemo(() => {
    const baseX = interactive ? mousePosition.x : 50
    const baseY = interactive ? mousePosition.y : 0

    return {
      primary: `
        radial-gradient(
          ellipse 80% 50% at ${baseX}% ${baseY}%,
          ${colors.primary}${opacityHex},
          transparent 60%
        )
      `,
      secondary: `
        radial-gradient(
          ellipse 60% 60% at ${interactive ? 100 - mousePosition.x : 80}% ${interactive ? mousePosition.y + 20 : 30}%,
          ${colors.secondary}${opacityHex80},
          transparent 50%
        )
      `,
      accent: `
        radial-gradient(
          ellipse 50% 40% at ${interactive ? mousePosition.x + 10 : 20}% ${interactive ? 100 - mousePosition.y : 80}%,
          ${colors.accent}${opacityHex60},
          transparent 40%
        )
      `,
      wave: `
        linear-gradient(
          ${interactive ? Math.atan2(mousePosition.y - 50, mousePosition.x - 50) * (180 / Math.PI) : 45}deg,
          transparent 0%,
          ${colors.primary}15 25%,
          ${colors.secondary}10 50%,
          ${colors.accent}15 75%,
          transparent 100%
        )
      `,
    }
  }, [interactive, mousePosition, colors, opacityHex, opacityHex80, opacityHex60])

  // Shared animation style for will-change optimization
  const sharedAnimationStyle = useMemo(() => ({
    animationPlayState: animationState,
    willChange: isPaused ? 'auto' : 'transform, opacity',
  }), [animationState, isPaused])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex flex-col overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      {/* Aurora Gradient Layer 1 - Primary */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: gradientStyles.primary,
          animation: `aurora-breathe ${animationDuration} ease-in-out infinite`,
          filter: 'blur(40px)',
          ...sharedAnimationStyle,
        }}
      />

      {/* Aurora Gradient Layer 2 - Secondary */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: gradientStyles.secondary,
          animation: `aurora-shift ${animationDuration} ease-in-out infinite reverse`,
          animationDelay: '-3s',
          filter: 'blur(60px)',
          ...sharedAnimationStyle,
        }}
      />

      {/* Aurora Gradient Layer 3 - Accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: gradientStyles.accent,
          animation: `aurora-pulse ${animationDuration} ease-in-out infinite`,
          animationDelay: '-6s',
          filter: 'blur(50px)',
          ...sharedAnimationStyle,
        }}
      />

      {/* Aurora Wave Effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: gradientStyles.wave,
          animation: `aurora-wave ${animationDuration} linear infinite`,
          backgroundSize: '200% 200%',
          ...sharedAnimationStyle,
        }}
      />

      {/* Shimmer Effect - only render if not paused */}
      {!isPaused && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `
              linear-gradient(
                90deg,
                transparent 0%,
                rgba(255,255,255,0.1) 45%,
                rgba(255,255,255,0.2) 50%,
                rgba(255,255,255,0.1) 55%,
                transparent 100%
              )
            `,
            animation: `aurora-shimmer ${parseFloat(animationDuration) * 2}s ease-in-out infinite`,
            backgroundSize: '200% 100%',
            ...sharedAnimationStyle,
          }}
        />
      )}

      {/* Radial vignette for depth */}
      {showRadialGradient && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
          }}
        />
      )}

      {/* Noise texture overlay for organic feel - static, no animation needed */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex-1">
        {children}
      </div>
    </div>
  )
})

export default AuroraBackground
