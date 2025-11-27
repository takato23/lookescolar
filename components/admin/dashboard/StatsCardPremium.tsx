'use client'

import { memo, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardPremiumProps {
  id?: string
  label: string
  value: number | string
  prefix?: string
  suffix?: string
  helper?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  icon: LucideIcon
  index?: number
  variant?: 'default' | 'gold' | 'blue' | 'purple' | 'green' | 'rose'
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
  onClick?: () => void
  /** Reduce motion for accessibility */
  reducedMotion?: boolean
  /** Custom aria-label for the card */
  ariaLabel?: string
}

// Size configuration - defined outside component
const SIZE_CLASSES = {
  sm: {
    padding: 'p-4',
    icon: 'h-10 w-10',
    iconInner: 'h-5 w-5',
    label: 'text-xs',
    value: 'text-2xl',
    helper: 'text-[10px]',
  },
  md: {
    padding: 'p-6',
    icon: 'h-12 w-12',
    iconInner: 'h-6 w-6',
    label: 'text-xs',
    value: 'text-4xl',
    helper: 'text-xs',
  },
  lg: {
    padding: 'p-8',
    icon: 'h-14 w-14',
    iconInner: 'h-7 w-7',
    label: 'text-sm',
    value: 'text-5xl',
    helper: 'text-sm',
  },
} as const

// Easing function - defined outside for reuse
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4)

// Animated counter hook with RAF optimization
function useAnimatedCounter(
  targetValue: number,
  duration: number = 1500,
  enabled: boolean = true
) {
  const [count, setCount] = useState(enabled ? 0 : targetValue)
  const frameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const previousTargetRef = useRef<number>(targetValue)

  useEffect(() => {
    // If disabled, show final value immediately
    if (!enabled) {
      setCount(targetValue)
      return
    }

    // Reset animation if target changed
    if (previousTargetRef.current !== targetValue) {
      startTimeRef.current = null
      previousTargetRef.current = targetValue
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp
      }

      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutQuart(progress)
      const currentValue = Math.floor(easedProgress * targetValue)

      setCount(currentValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setCount(targetValue)
        frameRef.current = null
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [targetValue, duration, enabled])

  return count
}

// Pre-generated stable particle positions (prevents hydration mismatch)
const PARTICLE_CONFIG = [
  { left: 15, top: 20, duration: 4.2, delay: 0.3 },
  { left: 45, top: 15, duration: 5.1, delay: 1.2 },
  { left: 75, top: 35, duration: 3.8, delay: 0.7 },
  { left: 25, top: 70, duration: 4.5, delay: 1.8 },
  { left: 85, top: 60, duration: 5.5, delay: 0.5 },
  { left: 55, top: 85, duration: 4.0, delay: 1.5 },
] as const

// Floating particles component - memoized with stable positions
const FloatingParticles = memo(function FloatingParticles({
  color,
}: {
  color: string
}) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {PARTICLE_CONFIG.map((particle, i) => (
        <div
          key={i}
          className={cn(
            'absolute w-1 h-1 rounded-full opacity-40',
            color
          )}
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animation: `floatParticle ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  )
})

// Color variants
const variants = {
  default: {
    gradient: 'from-neutral-500/20 to-neutral-600/20',
    glow: 'bg-neutral-400',
    icon: 'text-neutral-500',
    ring: 'ring-neutral-400/30',
    particle: 'bg-neutral-400',
    trend: {
      up: 'text-emerald-500 bg-emerald-500/10',
      down: 'text-red-500 bg-red-500/10',
      neutral: 'text-neutral-500 bg-neutral-500/10',
    },
  },
  gold: {
    gradient: 'from-amber-500/20 to-yellow-500/20',
    glow: 'bg-amber-400',
    icon: 'text-amber-500',
    ring: 'ring-amber-400/30',
    particle: 'bg-amber-400',
    trend: {
      up: 'text-emerald-500 bg-emerald-500/10',
      down: 'text-red-500 bg-red-500/10',
      neutral: 'text-amber-500 bg-amber-500/10',
    },
  },
  blue: {
    gradient: 'from-blue-500/20 to-cyan-500/20',
    glow: 'bg-blue-400',
    icon: 'text-blue-500',
    ring: 'ring-blue-400/30',
    particle: 'bg-blue-400',
    trend: {
      up: 'text-emerald-500 bg-emerald-500/10',
      down: 'text-red-500 bg-red-500/10',
      neutral: 'text-blue-500 bg-blue-500/10',
    },
  },
  purple: {
    gradient: 'from-purple-500/20 to-pink-500/20',
    glow: 'bg-purple-400',
    icon: 'text-purple-500',
    ring: 'ring-purple-400/30',
    particle: 'bg-purple-400',
    trend: {
      up: 'text-emerald-500 bg-emerald-500/10',
      down: 'text-red-500 bg-red-500/10',
      neutral: 'text-purple-500 bg-purple-500/10',
    },
  },
  green: {
    gradient: 'from-emerald-500/20 to-teal-500/20',
    glow: 'bg-emerald-400',
    icon: 'text-emerald-500',
    ring: 'ring-emerald-400/30',
    particle: 'bg-emerald-400',
    trend: {
      up: 'text-emerald-500 bg-emerald-500/10',
      down: 'text-red-500 bg-red-500/10',
      neutral: 'text-emerald-500 bg-emerald-500/10',
    },
  },
  rose: {
    gradient: 'from-rose-500/20 to-pink-500/20',
    glow: 'bg-rose-400',
    icon: 'text-rose-500',
    ring: 'ring-rose-400/30',
    particle: 'bg-rose-400',
    trend: {
      up: 'text-emerald-500 bg-emerald-500/10',
      down: 'text-red-500 bg-red-500/10',
      neutral: 'text-rose-500 bg-rose-500/10',
    },
  },
}

// Trend badge component
const TrendBadge = memo(function TrendBadge({
  trend,
  colors,
}: {
  trend: { value: number; direction: 'up' | 'down' | 'neutral' }
  colors: typeof variants.default
}) {
  const arrowSymbol = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
  const trendLabel = trend.direction === 'up' ? 'aumentó' : trend.direction === 'down' ? 'disminuyó' : 'sin cambio'

  return (
    <span
      className={cn(
        'px-2 py-1 rounded-full text-xs font-medium',
        colors.trend[trend.direction]
      )}
      role="status"
      aria-label={`Tendencia: ${trendLabel} ${Math.abs(trend.value)}%`}
    >
      <span aria-hidden="true">{arrowSymbol}</span>
      {' '}{Math.abs(trend.value)}%
    </span>
  )
})

export const StatsCardPremium = memo(function StatsCardPremium({
  id,
  label,
  value,
  prefix = '',
  suffix = '',
  helper,
  trend,
  icon: Icon,
  index = 0,
  variant = 'default',
  size = 'md',
  animate = true,
  onClick,
  reducedMotion: reducedMotionProp = false,
  ariaLabel,
}: StatsCardPremiumProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotionProp)
  const cardRef = useRef<HTMLDivElement>(null)

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (reducedMotionProp) {
      setPrefersReducedMotion(true)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [reducedMotionProp])

  // Intersection observer for animation trigger
  useEffect(() => {
    // If reduced motion, show immediately
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2, rootMargin: '50px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [prefersReducedMotion])

  // Animated counter for numeric values
  const numericValue = useMemo(() => {
    if (typeof value === 'number') return value
    const parsed = parseInt(value.toString().replace(/[^0-9]/g, ''), 10)
    return isNaN(parsed) ? 0 : parsed
  }, [value])

  const shouldAnimate = animate && isVisible && typeof value === 'number' && !prefersReducedMotion
  const animatedValue = useAnimatedCounter(numericValue, 1500, shouldAnimate)

  const displayValue = typeof value === 'number' ? animatedValue : value

  const colors = variants[variant]
  const sizeClass = SIZE_CLASSES[size]

  // Memoized formatted display value
  const formattedValue = useMemo(() => {
    if (typeof value === 'number') {
      return displayValue.toLocaleString('es-AR')
    }
    return displayValue
  }, [value, displayValue])

  // Generate aria-label
  const computedAriaLabel = useMemo(() => {
    if (ariaLabel) return ariaLabel
    const trendText = trend
      ? ` (${trend.direction === 'up' ? 'subió' : trend.direction === 'down' ? 'bajó' : 'sin cambio'} ${Math.abs(trend.value)}%)`
      : ''
    return `${label}: ${prefix}${formattedValue}${suffix}${trendText}`
  }, [ariaLabel, label, prefix, formattedValue, suffix, trend])

  // Keyboard handler for clickable cards
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }, [onClick])

  // Animation delay
  const animationDelay = prefersReducedMotion ? '0s' : `${index * 0.1}s`

  return (
    <article
      ref={cardRef}
      id={id}
      className={cn(
        'group relative overflow-hidden rounded-2xl',
        'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl',
        'border border-white/20 dark:border-neutral-800/50',
        'shadow-lg dark:shadow-2xl',
        'transition-all ease-out',
        !prefersReducedMotion && 'duration-500 animate-fade-in-up',
        sizeClass.padding,
        isHovered && !prefersReducedMotion && 'shadow-2xl dark:shadow-3xl -translate-y-1',
        onClick && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
      )}
      style={{
        animationDelay,
        animationFillMode: 'backwards',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={computedAriaLabel}
    >
      {/* Animated background gradient */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br transition-opacity',
          !prefersReducedMotion && 'duration-500',
          colors.gradient,
          isHovered ? 'opacity-70' : 'opacity-50'
        )}
        aria-hidden="true"
      />

      {/* Floating particles - skip if reduced motion */}
      {animate && !prefersReducedMotion && <FloatingParticles color={colors.particle} />}

      {/* Glow effect on hover - skip if reduced motion */}
      {!prefersReducedMotion && (
        <div
          className={cn(
            'absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none',
            colors.glow,
            isHovered ? 'opacity-30' : 'opacity-0'
          )}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Header with icon and helper */}
        <div className="flex items-start justify-between">
          {/* Icon with animated glow */}
          <div className="relative">
            {!prefersReducedMotion && (
              <div
                className={cn(
                  'absolute inset-0 rounded-xl blur-lg transition-all duration-500',
                  `bg-gradient-to-br ${colors.gradient}`,
                  isHovered && 'blur-xl scale-110'
                )}
                aria-hidden="true"
              />
            )}
            <div
              className={cn(
                'relative flex items-center justify-center rounded-xl',
                'bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm',
                `ring-2 ${colors.ring}`,
                'transition-all',
                !prefersReducedMotion && 'duration-500',
                sizeClass.icon,
                isHovered && !prefersReducedMotion && 'scale-110'
              )}
            >
              <Icon
                className={cn(sizeClass.iconInner, colors.icon, 'transition-all duration-300')}
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Helper badge / Trend */}
          {(helper || trend) && (
            <div className="flex items-center gap-2">
              {trend && <TrendBadge trend={trend} colors={colors} />}
              {helper && (
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-full',
                    'bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm',
                    'text-neutral-600 dark:text-neutral-300',
                    sizeClass.helper,
                    'font-medium shadow-sm'
                  )}
                >
                  {helper}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Label */}
        <p
          className={cn(
            'mt-6 font-bold uppercase tracking-wider',
            'text-neutral-500 dark:text-neutral-400',
            sizeClass.label
          )}
        >
          {label}
        </p>

        {/* Value with animated counter */}
        <p
          className={cn(
            'mt-2 font-bold tabular-nums',
            'bg-gradient-to-br from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-300',
            'bg-clip-text text-transparent',
            sizeClass.value
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {prefix}
          {formattedValue}
          {suffix}
        </p>

        {/* Progress bar */}
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/50 dark:bg-neutral-700/50"
          role="progressbar"
          aria-valuenow={Math.min(100, (index + 1) * 25)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso: ${Math.min(100, (index + 1) * 25)}%`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all ease-out',
              !prefersReducedMotion && 'duration-1000',
              `bg-gradient-to-r ${colors.gradient.replace('/20', '')}`
            )}
            style={{
              width: isVisible ? `${Math.min(100, (index + 1) * 25)}%` : '0%',
              transitionDelay: prefersReducedMotion ? '0s' : `${index * 0.1 + 0.3}s`,
            }}
          />
        </div>

        {/* Hover shine effect - skip if reduced motion */}
        {!prefersReducedMotion && (
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent',
              '-translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out',
              'pointer-events-none'
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </article>
  )
})

export default StatsCardPremium
