'use client'

import { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, Camera, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuroraBackground } from '@/components/ui/aurora-background'

interface GalleryCoverPremiumProps {
  coverImage: string
  coverTitle: string
  coverSubtitle?: string
  logoUrl?: string
  photoCount: number
  school?: string
  onEnterGallery: () => void
  variant?: 'default' | 'minimal' | 'immersive'
  auroraColors?: {
    primary?: string
    secondary?: string
    accent?: string
  }
  /** Enable parallax effects */
  enableParallax?: boolean
  /** Disable for reduced motion preference */
  reducedMotion?: boolean
}

// Memoized floating particles - generated once
const FloatingParticles = memo(function FloatingParticles() {
  // Generate particles only once with stable random values
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      width: Math.random() * 4 + 2,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
    })),
  [])

  return (
    <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-white/20 animate-float"
          style={{
            width: `${particle.width}px`,
            height: `${particle.width}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  )
})

// Memoized Stats Row
const StatsRow = memo(function StatsRow({ photoCount }: { photoCount: number }) {
  return (
    <div
      className="flex items-center gap-8 mt-12 animate-fade-in"
      style={{ animationDelay: '1.2s' }}
      role="list"
      aria-label="Estadísticas de la galería"
    >
      <div className="text-center" role="listitem">
        <div className="text-2xl font-light text-white">{photoCount}</div>
        <div className="text-[10px] tracking-[0.2em] text-white/50">FOTOS</div>
      </div>
      <div className="w-px h-8 bg-white/20" aria-hidden="true" />
      <div className="text-center" role="listitem">
        <div className="text-2xl font-light text-white">HD</div>
        <div className="text-[10px] tracking-[0.2em] text-white/50">CALIDAD</div>
      </div>
      <div className="w-px h-8 bg-white/20" aria-hidden="true" />
      <div className="text-center" role="listitem">
        <div className="text-2xl font-light text-white">24h</div>
        <div className="text-[10px] tracking-[0.2em] text-white/50">ENTREGA</div>
      </div>
    </div>
  )
})

export const GalleryCoverPremium = memo(function GalleryCoverPremium({
  coverImage,
  coverTitle,
  coverSubtitle,
  logoUrl,
  photoCount,
  school,
  onEnterGallery,
  variant = 'default',
  auroraColors,
  enableParallax = true,
  reducedMotion = false,
}: GalleryCoverPremiumProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotion)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  // Check for prefers-reduced-motion
  useEffect(() => {
    if (reducedMotion) {
      setPrefersReducedMotion(true)
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [reducedMotion])

  // Throttled parallax effect on scroll
  useEffect(() => {
    if (!enableParallax || prefersReducedMotion) return

    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        rafRef.current = requestAnimationFrame(() => {
          setScrollY(window.scrollY)
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [enableParallax, prefersReducedMotion])

  // Throttled mouse parallax effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !enableParallax || prefersReducedMotion) return

    // Cancel any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height
      setMousePosition({ x, y })
    })
  }, [enableParallax, prefersReducedMotion])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // Calculate parallax transforms - memoized to prevent recalculation
  const parallaxTransforms = useMemo(() => {
    if (prefersReducedMotion) {
      return {
        parallaxY: 0,
        parallaxScale: 1,
        imageTranslateX: 0,
        imageTranslateY: 0,
        textTranslateX: 0,
        textTranslateY: 0,
      }
    }
    return {
      parallaxY: Math.min(scrollY * 0.3, 100),
      parallaxScale: 1 + Math.min(scrollY * 0.0003, 0.1),
      imageTranslateX: (mousePosition.x - 0.5) * 20,
      imageTranslateY: (mousePosition.y - 0.5) * 20,
      textTranslateX: (mousePosition.x - 0.5) * -10,
      textTranslateY: (mousePosition.y - 0.5) * -10,
    }
  }, [scrollY, mousePosition, prefersReducedMotion])

  const {
    parallaxY,
    parallaxScale,
    imageTranslateX,
    imageTranslateY,
    textTranslateX,
    textTranslateY,
  } = parallaxTransforms

  // Memoized aurora color tint style
  const auroraTintStyle = useMemo(() => ({
    background: `linear-gradient(135deg,
      ${auroraColors?.primary || 'var(--aurora-primary)'}30 0%,
      transparent 50%,
      ${auroraColors?.accent || 'var(--aurora-accent)'}30 100%
    )`,
  }), [auroraColors])

  // Keyboard handler for accessibility
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onEnterGallery()
    }
  }, [onEnterGallery])

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen overflow-hidden"
      onMouseMove={handleMouseMove}
      aria-label={`Portada de galería: ${coverTitle}`}
    >
      {/* Aurora Background Layer */}
      <AuroraBackground
        className="absolute inset-0 z-0"
        showRadialGradient={false}
        colors={auroraColors}
        speed="slow"
        intensity="subtle"
        interactive={!prefersReducedMotion}
        pauseWhenHidden
        reducedMotion={prefersReducedMotion}
      >
        <div className="absolute inset-0" />
      </AuroraBackground>

      {/* Cover Image with Parallax */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          transform: `translateY(${parallaxY}px) scale(${parallaxScale})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div
          style={{
            transform: `translate(${imageTranslateX}px, ${imageTranslateY}px)`,
            transition: 'transform 0.3s ease-out',
          }}
          className="absolute inset-0"
        >
          <Image
            src={coverImage}
            alt={coverTitle}
            fill
            className={cn(
              'object-cover transition-all duration-1000',
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            )}
            priority
            unoptimized
            onLoad={() => setImageLoaded(true)}
          />
        </div>

        {/* Multi-layer gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

        {/* Aurora color tint overlay */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay"
          style={auroraTintStyle}
          aria-hidden="true"
        />
      </div>

      {/* Floating particles effect - only render if not reduced motion */}
      {!prefersReducedMotion && <FloatingParticles />}

      {/* Logo (if exists) */}
      {logoUrl && (
        <div
          className="absolute top-8 left-1/2 -translate-x-1/2 z-20"
          style={{
            transform: `translateX(calc(-50% + ${textTranslateX * 0.5}px)) translateY(${textTranslateY * 0.5}px)`,
            transition: 'transform 0.3s ease-out',
            animationDelay: '0.2s',
          }}
        >
          <div className="relative animate-fade-in">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 blur-xl bg-white/20 scale-150" />
            <Image
              src={logoUrl}
              alt="Logo"
              width={140}
              height={70}
              className="relative object-contain opacity-95 drop-shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Main Content with parallax */}
      <div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center text-white text-center px-4"
        style={{
          transform: `translate(${textTranslateX}px, ${textTranslateY}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Premium badge */}
        {variant === 'immersive' && (
          <div className="flex items-center gap-2 mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs tracking-[0.3em] text-white/70 uppercase">
              Galería Premium
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
        )}

        {/* Main Title with glassmorphism effect */}
        <div className="relative mb-4">
          {/* Title glow */}
          <div className="absolute inset-0 blur-3xl bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-cyan-500/30 scale-150 animate-pulse" />

          <h1
            className={cn(
              'relative font-light tracking-[0.15em] md:tracking-[0.2em]',
              'animate-cover-text',
              variant === 'minimal'
                ? 'text-3xl md:text-5xl'
                : 'text-4xl md:text-6xl lg:text-7xl'
            )}
            style={{
              textShadow: '0 4px 30px rgba(0,0,0,0.5), 0 0 60px rgba(255,255,255,0.1)',
            }}
          >
            {coverTitle.toUpperCase()}
          </h1>
        </div>

        {/* Subtitle */}
        {coverSubtitle && (
          <p
            className="text-sm md:text-base tracking-[0.3em] text-white/80 mb-4 animate-fade-in"
            style={{
              animationDelay: '0.6s',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            }}
          >
            {coverSubtitle}
          </p>
        )}

        {/* Photo count with icon */}
        <div
          className="flex items-center gap-2 text-white/60 mb-12 animate-fade-in"
          style={{ animationDelay: '0.8s' }}
        >
          <Camera className="w-4 h-4" />
          <span className="text-xs tracking-[0.2em]">
            {photoCount} FOTOGRAFÍAS
          </span>
        </div>

        {/* CTA Button with premium styling */}
        <button
          onClick={onEnterGallery}
          onKeyDown={handleKeyDown}
          className={cn(
            'group relative overflow-hidden',
            'px-12 py-4 text-sm tracking-[0.2em]',
            'border border-white/40',
            'transition-all duration-500',
            'hover:border-white/80 hover:scale-105',
            'active:scale-95',
            'focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black',
            'animate-fade-in-up'
          )}
          style={{ animationDelay: '1s' }}
          aria-label={`Ver galería de ${coverTitle} con ${photoCount} fotos`}
        >
          {/* Button gradient background on hover */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
            aria-hidden="true"
          />

          {/* Button glow on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl bg-white/20"
            aria-hidden="true"
          />

          <span className="relative flex items-center gap-2">
            VER GALERÍA
            <ChevronDown className="w-4 h-4 animate-bounce" aria-hidden="true" />
          </span>
        </button>

        {/* Quick stats row */}
        {variant === 'immersive' && <StatsRow photoCount={photoCount} />}
      </div>

      {/* Footer credit with glassmorphism */}
      <div
        className="absolute bottom-8 left-0 right-0 text-center z-10 animate-fade-in"
        style={{ animationDelay: '1.4s' }}
      >
        <div className="inline-block px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
          <p className="text-white/50 text-xs tracking-[0.2em]">
            {school?.toUpperCase() || 'FOTOGRAFÍA ESCOLAR'}
          </p>
        </div>
      </div>

      {/* Scroll indicator - hide if reduced motion */}
      {!prefersReducedMotion && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 animate-bounce"
          style={{ animationDelay: '1.5s' }}
          aria-hidden="true"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2 backdrop-blur-sm">
            <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-[5] pointer-events-none" aria-hidden="true" />
    </section>
  )
})

export default GalleryCoverPremium
