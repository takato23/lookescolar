'use client'

import { useState, useCallback, memo, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Heart, Check, ShoppingCart, Eye, Sparkles } from 'lucide-react'
import { usePublicCartStore } from '@/lib/stores/unified-cart-store'
import { cn } from '@/lib/utils'

interface PhotoCardPremiumProps {
  photo: {
    id: string
    signed_url: string
    filename?: string
  }
  price?: number
  onOpenModal?: (photoId: string) => void
  index?: number
  variant?: 'default' | 'compact' | 'featured'
  lazy?: boolean
  showBadge?: boolean
  showPrice?: boolean
  showFavorite?: boolean
  onFavoriteToggle?: (photoId: string, isFavorite: boolean) => void
  isFavorite?: boolean
}

const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=='

// Separate loading skeleton for better performance
const LoadingSkeleton = memo(function LoadingSkeleton() {
  return (
    <div
      className="absolute inset-0 bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700"
      style={{
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite'
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-indigo-500 animate-spin" />
      </div>
    </div>
  )
})

// Memoized overlay buttons
const OverlayButtons = memo(function OverlayButtons({
  isVisible,
  isSelected,
  onView,
  onToggleSelect,
}: {
  isVisible: boolean
  isSelected: boolean
  onView: () => void
  onToggleSelect: (e: React.MouseEvent) => void
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        "transition-all duration-300",
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      aria-hidden={!isVisible}
    >
      <div className={cn(
        "flex flex-col items-center gap-3 p-4",
        "transform transition-all duration-300",
        isVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
      )}>
        <button
          onClick={onView}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full",
            "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md",
            "text-sm font-medium text-neutral-900 dark:text-white",
            "shadow-lg shadow-black/10",
            "transform transition-all duration-200",
            "hover:scale-105 hover:bg-white dark:hover:bg-neutral-800",
            "active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          )}
          aria-label="Ver foto en tamaño completo"
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          Ver foto
        </button>

        <button
          onClick={onToggleSelect}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full",
            "text-xs font-medium transition-all duration-200",
            "transform hover:scale-105 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            isSelected ? [
              "bg-emerald-500 text-white",
              "shadow-lg shadow-emerald-500/30",
              "focus:ring-emerald-500"
            ] : [
              "bg-indigo-500 text-white",
              "shadow-lg shadow-indigo-500/30",
              "hover:bg-indigo-600",
              "focus:ring-indigo-500"
            ]
          )}
          aria-label={isSelected ? 'Quitar foto del carrito' : 'Agregar foto al carrito'}
          aria-pressed={isSelected}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Agregada</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Agregar</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
})

export const PhotoCardPremium = memo(function PhotoCardPremium({
  photo,
  price = 1000,
  onOpenModal,
  index = 0,
  variant = 'default',
  lazy = true,
  showBadge = true,
  showPrice = true,
  showFavorite = true,
  onFavoriteToggle,
  isFavorite: controlledFavorite,
}: PhotoCardPremiumProps) {
  const [internalFavorite, setInternalFavorite] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(!lazy)
  const cardRef = useRef<HTMLDivElement>(null)

  // Controlled vs uncontrolled favorite state
  const isLiked = controlledFavorite ?? internalFavorite

  // Cart store - use selectors for better performance
  const addItem = usePublicCartStore((state) => state.addItem)
  const removeItem = usePublicCartStore((state) => state.removeItem)
  const isItemInCart = usePublicCartStore((state) => state.isItemInCart)

  const isSelected = isItemInCart(photo.id)
  const isSignedUrl = photo.signed_url.includes('token=')

  // Intersection observer for lazy loading
  useEffect(() => {
    if (!lazy) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.1
      }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [lazy])

  const handleToggleSelect = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isSelected) {
      removeItem(photo.id)
    } else {
      addItem({
        photoId: photo.id,
        filename: photo.filename ?? photo.id,
        price,
        watermarkUrl: photo.signed_url,
      })
    }
  }, [isSelected, photo.id, photo.filename, photo.signed_url, price, addItem, removeItem])

  const handleImageClick = useCallback(() => {
    onOpenModal?.(photo.id)
  }, [onOpenModal, photo.id])

  const handleLikeToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const newValue = !isLiked

    if (onFavoriteToggle) {
      onFavoriteToggle(photo.id, newValue)
    } else {
      setInternalFavorite(newValue)
    }
  }, [isLiked, onFavoriteToggle, photo.id])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleImageClick()
    }
  }, [handleImageClick])

  // Optimized animation delay calculation
  const animationDelay = `${Math.min(index * 0.05, 0.5)}s`

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative",
        "animate-fade-in-up",
        variant === 'compact' && 'scale-95'
      )}
      style={{
        animationDelay,
        animationFillMode: 'backwards'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="photo-card-premium"
      aria-label={`Foto ${photo.filename || photo.id}`}
    >
      {/* Main Card Container */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800",
          "transition-all duration-300 ease-out",
          "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)]",
          isHovered && "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] -translate-y-2 scale-[1.02]",
          isSelected && [
            "ring-2 ring-indigo-500 ring-offset-2",
            "shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          ],
          variant === 'featured' ? 'aspect-[3/4]' : 'aspect-[4/5]'
        )}
        role="button"
        tabIndex={0}
        onClick={handleImageClick}
        onKeyDown={handleKeyDown}
        aria-pressed={isSelected}
      >
        {/* Loading skeleton - only show when not visible or image not loaded */}
        {(!isVisible || !imageLoaded) && <LoadingSkeleton />}

        {/* Main Image */}
        {isVisible && (
          <Image
            src={photo.signed_url}
            alt={`Foto ${photo.filename || 'del evento'}`}
            fill
            className={cn(
              "object-cover transition-all duration-500 ease-out",
              imageLoaded ? 'opacity-100' : 'opacity-0',
              isHovered ? 'scale-110 brightness-105' : 'scale-100 brightness-100'
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={index < 4}
            loading={index < 8 ? 'eager' : 'lazy'}
            unoptimized={isSignedUrl}
            onLoad={() => setImageLoaded(true)}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        )}

        {/* Gradient Overlay */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            "bg-gradient-to-t from-black/60 via-black/0 to-black/20",
            isHovered ? 'opacity-100' : 'opacity-40'
          )}
          aria-hidden="true"
        />

        {/* Overlay Buttons */}
        <OverlayButtons
          isVisible={isHovered}
          isSelected={isSelected}
          onView={handleImageClick}
          onToggleSelect={handleToggleSelect}
        />

        {/* Top Left: Sample Badge */}
        {showBadge && (
          <div
            className={cn(
              "absolute top-3 left-3",
              "transition-all duration-200",
              isHovered ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
            )}
            aria-hidden="true"
          >
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full",
              "bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm",
              "text-[10px] font-semibold tracking-wide text-neutral-600 dark:text-neutral-300",
              "shadow-sm"
            )}>
              <Sparkles className="w-3 h-3 text-amber-500" />
              MUESTRA
            </div>
          </div>
        )}

        {/* Top Right: Favorite Button */}
        {showFavorite && (
          <button
            onClick={handleLikeToggle}
            className={cn(
              "absolute top-3 right-3 p-2 rounded-full",
              "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm",
              "shadow-sm transition-all duration-200",
              "hover:bg-white dark:hover:bg-neutral-800 hover:scale-110",
              "active:scale-90",
              "focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2",
              isHovered ? 'opacity-100' : 'opacity-80'
            )}
            aria-label={isLiked ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            aria-pressed={isLiked}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all duration-200",
                isLiked
                  ? 'text-rose-500 fill-rose-500 scale-110'
                  : 'text-neutral-500 dark:text-neutral-400'
              )}
              aria-hidden="true"
            />
          </button>
        )}

        {/* Bottom Right: Price Tag */}
        {showPrice && (
          <div
            className={cn(
              "absolute bottom-3 right-3",
              "transition-all duration-200",
              isHovered ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            )}
          >
            <div className={cn(
              "px-3 py-1.5 rounded-lg",
              "bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm",
              "text-sm font-bold text-neutral-900 dark:text-white",
              "shadow-md"
            )}>
              <span aria-label={`Precio: ${price.toLocaleString('es-AR')} pesos argentinos`}>
                ${price.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Left: Selection Indicator */}
        {isSelected && (
          <div className="absolute bottom-3 left-3 animate-scale-in">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
              "bg-emerald-500 text-white",
              "text-xs font-semibold",
              "shadow-lg shadow-emerald-500/30"
            )}>
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Seleccionada</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="mt-3">
        <button
          onClick={handleToggleSelect}
          className={cn(
            "w-full py-3 px-4 rounded-xl",
            "text-sm font-semibold tracking-wide",
            "transition-all duration-200 ease-out",
            "transform hover:-translate-y-0.5",
            "active:translate-y-0 active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            isSelected ? [
              "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white",
              "shadow-lg shadow-emerald-500/25",
              "hover:shadow-xl hover:shadow-emerald-500/30",
              "focus:ring-emerald-500"
            ] : [
              "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
              "shadow-md",
              "hover:bg-neutral-800 dark:hover:bg-neutral-100",
              "hover:shadow-lg",
              "focus:ring-neutral-500"
            ]
          )}
          aria-label={isSelected ? 'Quitar de selección' : 'Seleccionar foto'}
          aria-pressed={isSelected}
        >
          <span className="flex items-center justify-center gap-2">
            {isSelected ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Seleccionada</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                <span>Seleccionar</span>
              </>
            )}
          </span>
        </button>
      </div>
    </article>
  )
})

export default PhotoCardPremium
