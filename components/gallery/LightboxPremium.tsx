'use client'

import { useState, useCallback, useEffect, useRef, memo, useMemo } from 'react'
import Image from 'next/image'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  ShoppingCart,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Photo {
  id: string
  storage_path: string
  width: number | null
  height: number | null
  created_at: string
  signed_url: string
  filename?: string
}

interface LightboxPremiumProps {
  photos: Photo[]
  selectedIndex: number
  showFavorites?: boolean
  showShareButton?: boolean
  showZoomControls?: boolean
  showThumbnails?: boolean
  enableKeyboardNav?: boolean
  enableGestures?: boolean
  isItemInCart: (id: string) => boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onToggleSelect: (photo: Photo) => void
  onSelectPhoto: (index: number) => void
  onFavoriteToggle?: (photoId: string, isFavorite: boolean) => void
  favorites?: Set<string>
}

// Gesture thresholds
const SWIPE_THRESHOLD = 50
const PINCH_THRESHOLD = 0.1
const VELOCITY_THRESHOLD = 0.5

// Memoized Loading Spinner
const LoadingSpinner = memo(function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" aria-live="polite">
      <div
        className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin"
        role="status"
        aria-label="Cargando imagen"
      />
    </div>
  )
})

// Memoized Thumbnail Item
const ThumbnailItem = memo(function ThumbnailItem({
  photo,
  index,
  isActive,
  isInCart,
  onSelect
}: {
  photo: Photo
  index: number
  isActive: boolean
  isInCart: boolean
  onSelect: (index: number) => void
}) {
  return (
    <button
      onClick={() => onSelect(index)}
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-lg",
        "w-14 h-14 md:w-16 md:h-16",
        "transition-all duration-300",
        "hover:scale-105",
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black",
        isActive ? [
          "ring-2 ring-white ring-offset-2 ring-offset-black",
          "scale-110"
        ] : [
          "opacity-50 hover:opacity-80"
        ]
      )}
      aria-label={`Ver foto ${index + 1}`}
      aria-current={isActive ? 'true' : undefined}
      tabIndex={isActive ? 0 : -1}
    >
      <Image
        src={photo.signed_url}
        alt=""
        fill
        className="object-cover"
        unoptimized
        sizes="64px"
      />
      {isInCart && (
        <div className="absolute bottom-1 right-1 p-1 bg-emerald-500 rounded-full" aria-hidden="true">
          <Check className="w-2 h-2 text-white" />
        </div>
      )}
    </button>
  )
})

// Memoized Navigation Button
const NavigationButton = memo(function NavigationButton({
  direction,
  onClick,
  isVisible,
  disabled
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  isVisible: boolean
  disabled?: boolean
}) {
  const isPrev = direction === 'prev'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "hidden md:flex absolute top-1/2 -translate-y-1/2 z-10",
        isPrev ? "left-4" : "right-4",
        "p-4 rounded-full",
        "bg-white/10 backdrop-blur-md",
        "text-white/80 hover:text-white hover:bg-white/20",
        "transition-all duration-300",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100",
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      aria-label={isPrev ? "Foto anterior" : "Siguiente foto"}
    >
      {isPrev ? (
        <ChevronLeft className="w-8 h-8" aria-hidden="true" />
      ) : (
        <ChevronRight className="w-8 h-8" aria-hidden="true" />
      )}
    </button>
  )
})

// Memoized Action Button
const ActionButton = memo(function ActionButton({
  onClick,
  icon: Icon,
  label,
  isActive,
  activeColor,
  className
}: {
  onClick: () => void
  icon: React.ElementType
  label: string
  isActive?: boolean
  activeColor?: string
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-2 rounded-full",
        "bg-white/10 backdrop-blur-md",
        "transition-all duration-300",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50",
        isActive ? activeColor : 'text-white/90 hover:text-white hover:bg-white/20',
        className
      )}
      aria-label={label}
      aria-pressed={isActive}
    >
      <Icon className={cn("w-5 h-5", isActive && "fill-current")} aria-hidden="true" />
    </button>
  )
})

export const LightboxPremium = memo(function LightboxPremium({
  photos,
  selectedIndex,
  showFavorites = true,
  showShareButton = true,
  showZoomControls = true,
  showThumbnails = true,
  enableKeyboardNav = true,
  enableGestures = true,
  isItemInCart,
  onClose,
  onPrev,
  onNext,
  onToggleSelect,
  onSelectPhoto,
  onFavoriteToggle,
  favorites,
}: LightboxPremiumProps) {
  const currentPhoto = photos[selectedIndex]

  // State
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [internalFavorite, setInternalFavorite] = useState(false)

  // Controlled vs uncontrolled favorite state
  const isFavorited = favorites ? favorites.has(currentPhoto.id) : internalFavorite

  // Touch gesture state with velocity tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const touchEndRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)

  // Preload adjacent images for faster navigation
  const adjacentPhotos = useMemo(() => {
    const prevIndex = selectedIndex > 0 ? selectedIndex - 1 : photos.length - 1
    const nextIndex = selectedIndex < photos.length - 1 ? selectedIndex + 1 : 0
    return [photos[prevIndex]?.signed_url, photos[nextIndex]?.signed_url].filter(Boolean)
  }, [photos, selectedIndex])

  // Preload effect
  useEffect(() => {
    adjacentPhotos.forEach(url => {
      const img = new window.Image()
      img.src = url
    })
  }, [adjacentPhotos])

  // Reset state when photo changes
  useEffect(() => {
    setIsZoomed(false)
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
    setImageLoaded(false)
    setSwipeDirection(null)
  }, [selectedIndex])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // Auto-hide controls after inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isZoomed) setShowControls(false)
      }, 3000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isZoomed])

  // Enhanced Keyboard navigation
  useEffect(() => {
    if (!enableKeyboardNav) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for handled keys
      const handledKeys = ['Escape', 'ArrowLeft', 'ArrowRight', '+', '=', '-', 'f', 'r', ' ', 'Home', 'End']
      if (handledKeys.includes(e.key)) {
        e.preventDefault()
      }

      switch (e.key) {
        case 'Escape':
          if (isZoomed) {
            setIsZoomed(false)
            setZoomLevel(1)
            setPosition({ x: 0, y: 0 })
          } else {
            onClose()
          }
          break
        case 'ArrowLeft':
          if (!isZoomed) onPrev()
          break
        case 'ArrowRight':
          if (!isZoomed) onNext()
          break
        case '+':
        case '=':
          handleZoomIn()
          break
        case '-':
          handleZoomOut()
          break
        case 'f':
          toggleFullscreen()
          break
        case 'r':
          handleRotate()
          break
        case ' ':
          // Space to add/remove from cart
          onToggleSelect(currentPhoto)
          break
        case 'Home':
          // Jump to first photo
          onSelectPhoto(0)
          break
        case 'End':
          // Jump to last photo
          onSelectPhoto(photos.length - 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardNav, isZoomed, onClose, onPrev, onNext, currentPhoto, onToggleSelect, onSelectPhoto, photos.length])

  // Enhanced Touch handlers with velocity tracking
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableGestures) return

    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now()
      }
      touchEndRef.current = null
      setSwipeDirection(null)
    } else if (e.touches.length === 2) {
      // Pinch gesture start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setInitialPinchDistance(distance)
    }
  }, [enableGestures])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableGestures) return

    const touchStart = touchStartRef.current

    if (e.touches.length === 1 && touchStart) {
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY

      touchEndRef.current = {
        x: currentX,
        y: currentY,
        time: Date.now()
      }

      // Show swipe direction indicator (only when not zoomed)
      if (!isZoomed) {
        const distanceX = touchStart.x - currentX
        if (Math.abs(distanceX) > SWIPE_THRESHOLD / 2) {
          setSwipeDirection(distanceX > 0 ? 'left' : 'right')
        } else {
          setSwipeDirection(null)
        }
      }

      // Handle drag when zoomed - use RAF for smooth movement
      if (isZoomed && zoomLevel > 1) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
        rafRef.current = requestAnimationFrame(() => {
          const deltaX = currentX - touchStart.x
          const deltaY = currentY - touchStart.y
          setPosition(prev => ({
            x: Math.max(-200, Math.min(200, prev.x + deltaX * 0.3)),
            y: Math.max(-200, Math.min(200, prev.y + deltaY * 0.3))
          }))
        })
      }
    } else if (e.touches.length === 2 && initialPinchDistance) {
      // Pinch gesture move with RAF
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = currentDistance / initialPinchDistance

      if (Math.abs(scale - 1) > PINCH_THRESHOLD) {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
        rafRef.current = requestAnimationFrame(() => {
          const newZoom = Math.max(1, Math.min(4, zoomLevel * scale))
          setZoomLevel(newZoom)
          setIsZoomed(newZoom > 1)
        })
      }
    }
  }, [enableGestures, isZoomed, zoomLevel, initialPinchDistance])

  const handleTouchEnd = useCallback(() => {
    if (!enableGestures) return

    const touchStart = touchStartRef.current
    const touchEnd = touchEndRef.current

    setSwipeDirection(null)

    if (!touchStart || !touchEnd || isZoomed) {
      touchStartRef.current = null
      touchEndRef.current = null
      setInitialPinchDistance(null)
      return
    }

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const duration = touchEnd.time - touchStart.time
    const velocityX = Math.abs(distanceX) / duration
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)

    // Check for swipe with velocity consideration
    const isValidSwipe = Math.abs(distanceX) > SWIPE_THRESHOLD || velocityX > VELOCITY_THRESHOLD

    if (isHorizontalSwipe && isValidSwipe) {
      if (distanceX > 0) {
        onNext()
      } else {
        onPrev()
      }
    }

    // Vertical swipe to close (with higher threshold)
    if (!isHorizontalSwipe && Math.abs(distanceY) > SWIPE_THRESHOLD * 2) {
      if (distanceY > 0) {
        onClose()
      }
    }

    touchStartRef.current = null
    touchEndRef.current = null
    setInitialPinchDistance(null)
  }, [enableGestures, isZoomed, onNext, onPrev, onClose])

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(4, zoomLevel + 0.5)
    setZoomLevel(newZoom)
    setIsZoomed(newZoom > 1)
  }, [zoomLevel])

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(1, zoomLevel - 0.5)
    setZoomLevel(newZoom)
    setIsZoomed(newZoom > 1)
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [zoomLevel])

  const handleResetView = useCallback(() => {
    setIsZoomed(false)
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }, [])

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360)
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (isZoomed) {
      handleResetView()
    } else {
      setIsZoomed(true)
      setZoomLevel(2)
    }
  }, [isZoomed, handleResetView])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Share handler
  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mira esta foto',
          url: window.location.href
        })
      } catch {
        // User cancelled or error
      }
    }
  }, [])

  // Favorite toggle handler
  const handleFavoriteToggle = useCallback(() => {
    const newValue = !isFavorited
    if (onFavoriteToggle) {
      onFavoriteToggle(currentPhoto.id, newValue)
    } else {
      setInternalFavorite(newValue)
    }
  }, [isFavorited, onFavoriteToggle, currentPhoto.id])

  const inCart = isItemInCart(currentPhoto.id)

  // Memoized visible thumbnails calculation
  const visibleThumbnails = useMemo(() => {
    const start = Math.max(0, selectedIndex - 5)
    const end = Math.min(photos.length, selectedIndex + 6)
    return photos.slice(start, end).map((photo, idx) => ({
      photo,
      actualIndex: start + idx
    }))
  }, [photos, selectedIndex])

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed inset-0 z-50",
        "bg-black/95 backdrop-blur-xl",
        "animate-fade-in"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de fotos - Foto ${selectedIndex + 1} de ${photos.length}`}
    >
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Foto {selectedIndex + 1} de {photos.length}
        {inCart && ' - En el carrito'}
        {isFavorited && ' - Marcada como favorita'}
      </div>

      {/* Keyboard shortcuts help - hidden but accessible */}
      <div className="sr-only">
        Atajos de teclado: Flechas izquierda y derecha para navegar,
        Escape para cerrar, Espacio para agregar al carrito,
        F para pantalla completa, R para rotar, + y - para zoom
      </div>

      {/* Header Controls */}
      <header className={cn(
        "absolute top-0 left-0 right-0 z-20",
        "flex items-center justify-between px-4 md:px-6 py-4",
        "bg-gradient-to-b from-black/80 via-black/40 to-transparent",
        "transition-all duration-300",
        showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      )}>
        {/* Left: Close button */}
        <button
          onClick={onClose}
          className={cn(
            "p-3 rounded-full",
            "bg-white/10 backdrop-blur-md",
            "text-white/90 hover:text-white hover:bg-white/20",
            "transition-all duration-300",
            "hover:scale-105 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
          )}
          aria-label="Cerrar visor (Escape)"
        >
          <X className="w-6 h-6" aria-hidden="true" />
        </button>

        {/* Center: Photo counter */}
        <div
          className="text-white/80 text-sm font-medium tracking-wider"
          aria-label={`Foto ${selectedIndex + 1} de ${photos.length}`}
        >
          {selectedIndex + 1} / {photos.length}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2" role="toolbar" aria-label="Controles de imagen">
          {/* Zoom controls */}
          {showZoomControls && (
            <div className="hidden md:flex items-center gap-1 mr-2">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 1}
                className={cn(
                  "p-2 rounded-full",
                  "bg-white/10 backdrop-blur-md",
                  "text-white/90 hover:text-white hover:bg-white/20",
                  "transition-all duration-300",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
                )}
                aria-label="Alejar zoom (-)"
              >
                <ZoomOut className="w-5 h-5" aria-hidden="true" />
              </button>
              <span
                className="text-white/60 text-xs w-12 text-center tabular-nums"
                aria-label={`Nivel de zoom: ${Math.round(zoomLevel * 100)}%`}
              >
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 4}
                className={cn(
                  "p-2 rounded-full",
                  "bg-white/10 backdrop-blur-md",
                  "text-white/90 hover:text-white hover:bg-white/20",
                  "transition-all duration-300",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
                )}
                aria-label="Acercar zoom (+)"
              >
                <ZoomIn className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}

          {/* Rotate */}
          <button
            onClick={handleRotate}
            className={cn(
              "hidden md:flex p-2 rounded-full",
              "bg-white/10 backdrop-blur-md",
              "text-white/90 hover:text-white hover:bg-white/20",
              "transition-all duration-300",
              "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            )}
            aria-label="Rotar imagen (R)"
          >
            <RotateCw className="w-5 h-5" aria-hidden="true" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={cn(
              "hidden md:flex p-2 rounded-full",
              "bg-white/10 backdrop-blur-md",
              "text-white/90 hover:text-white hover:bg-white/20",
              "transition-all duration-300",
              "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            )}
            aria-label={isFullscreen ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)'}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Maximize2 className="w-5 h-5" aria-hidden="true" />
            )}
          </button>

          {/* Favorite */}
          {showFavorites && (
            <ActionButton
              onClick={handleFavoriteToggle}
              icon={Heart}
              label={isFavorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              isActive={isFavorited}
              activeColor="text-rose-500"
            />
          )}

          {/* Share */}
          {showShareButton && (
            <ActionButton
              onClick={handleShare}
              icon={Share2}
              label="Compartir"
            />
          )}

          {/* Add to cart */}
          <button
            onClick={() => onToggleSelect(currentPhoto)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full",
              "font-medium text-sm tracking-wide",
              "transition-all duration-300",
              "hover:scale-105 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              inCart ? [
                "bg-emerald-500 text-white",
                "shadow-lg shadow-emerald-500/30",
                "focus:ring-emerald-400 focus:ring-offset-black"
              ] : [
                "bg-white text-neutral-900",
                "hover:bg-white/90",
                "focus:ring-white focus:ring-offset-black"
              ]
            )}
            aria-label={inCart ? 'Quitar del carrito (Espacio)' : 'Agregar al carrito (Espacio)'}
            aria-pressed={inCart}
          >
            {inCart ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Seleccionada</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Comprar</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Image Container */}
      <main
        ref={imageRef}
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          "pt-20 pb-28 px-4 md:px-16",
          isZoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        )}
        onDoubleClick={handleDoubleClick}
        aria-label="Área de imagen - doble clic para zoom"
      >
        <div className="relative w-full h-full max-w-7xl">
          {/* Loading state */}
          {!imageLoaded && <LoadingSpinner />}

          <Image
            src={currentPhoto.signed_url}
            alt={`Foto ${currentPhoto.filename || selectedIndex + 1} del evento`}
            fill
            className={cn(
              "object-contain transition-all duration-300",
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            style={{
              transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px) rotate(${rotation}deg)`
            }}
            priority
            unoptimized
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
        </div>
      </main>

      {/* Navigation Arrows - Desktop only */}
      <NavigationButton
        direction="prev"
        onClick={onPrev}
        isVisible={showControls}
        disabled={selectedIndex === 0}
      />

      <NavigationButton
        direction="next"
        onClick={onNext}
        isVisible={showControls}
        disabled={selectedIndex === photos.length - 1}
      />

      {/* Thumbnail Strip */}
      {showThumbnails && (
        <footer className={cn(
          "absolute bottom-0 left-0 right-0 z-10",
          "bg-gradient-to-t from-black/90 via-black/60 to-transparent",
          "py-4 px-4",
          "transition-all duration-300",
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        )}>
          {/* Swipe indicator for mobile */}
          <div className="md:hidden flex justify-center mb-3" aria-hidden="true">
            <div className="flex items-center gap-2 text-white/50 text-xs">
              <ChevronLeft className="w-4 h-4" />
              <span>Desliza para navegar</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Thumbnails */}
          <nav
            className="flex gap-2 justify-center overflow-x-auto scrollbar-hide pb-safe-bottom"
            role="tablist"
            aria-label="Miniaturas de fotos"
          >
            {visibleThumbnails.map(({ photo, actualIndex }) => (
              <ThumbnailItem
                key={photo.id}
                photo={photo}
                index={actualIndex}
                isActive={actualIndex === selectedIndex}
                isInCart={isItemInCart(photo.id)}
                onSelect={onSelectPhoto}
              />
            ))}
          </nav>
        </footer>
      )}

      {/* Touch gesture visual feedback */}
      {swipeDirection && !isZoomed && (
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "pointer-events-none"
          )}
          aria-hidden="true"
        >
          <div className={cn(
            "w-24 h-24 rounded-full",
            "bg-white/10 backdrop-blur-sm",
            "flex items-center justify-center",
            "animate-pulse"
          )}>
            {swipeDirection === 'left' ? (
              <ChevronRight className="w-12 h-12 text-white/50" />
            ) : (
              <ChevronLeft className="w-12 h-12 text-white/50" />
            )}
          </div>
        </div>
      )}
    </div>
  )
})

export default LightboxPremium
