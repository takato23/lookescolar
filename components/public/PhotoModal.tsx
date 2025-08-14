'use client'

import React, { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { XIcon, ChevronLeftIcon, ChevronRightIcon, HeartIcon, ShoppingCartIcon, CheckCircleIcon } from 'lucide-react'

interface PublicPhoto {
  id: string
  preview_url?: string | null
  filename: string | null
  created_at?: string | null
}

interface PhotoModalProps {
  photo: PublicPhoto
  isOpen: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  hasNext?: boolean
  hasPrev?: boolean
  currentIndex?: number
  totalPhotos?: number
  isSelected?: boolean
  isFavorite?: boolean
  onToggleSelection?: () => void
  onToggleFavorite?: () => void
}

export function PhotoModal({ 
  photo, 
  isOpen, 
  onClose, 
  onPrev, 
  onNext,
  hasNext = true,
  hasPrev = true,
  currentIndex,
  totalPhotos,
  isSelected = false,
  isFavorite = false,
  onToggleSelection,
  onToggleFavorite
}: PhotoModalProps) {
  const onKey = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowLeft') onPrev()
    if (e.key === 'ArrowRight') onNext()
  }, [isOpen, onClose, onPrev, onNext])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onKey])

  if (!isOpen) return null

  // Basic swipe handling (tolerante)
  let startX = 0
  let startY = 0
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    startX = t.clientX
    startY = t.clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = e.changedTouches[0]
    const dx = t.clientX - startX
    const dy = t.clientY - startY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0) onPrev()
      else onNext()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/98 
                    flex items-center justify-center
                    mobile:items-stretch mobile:justify-stretch"
         onTouchStart={onTouchStart}
         onTouchEnd={onTouchEnd} 
         role="dialog" 
         aria-modal="true">
      {/* Close button - Mobile optimized */}
      <button 
        className="absolute right-4 top-4 z-60
                   mobile:right-3 mobile:top-3 mobile:bg-black/50 mobile:p-3
                   rounded-full bg-white/10 backdrop-blur p-2 text-white hover:bg-white/20 transition-colors
                   mobile-touch-target" 
        onClick={onClose} 
        aria-label="Cerrar"
      >
        <XIcon className="h-6 w-6 mobile:h-5 mobile:w-5" />
      </button>
      
      {/* Navigation buttons - Hidden on mobile, touch areas instead */}
      {hasPrev && (
        <button 
          className="hidden lg:block absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-blur p-3 text-white hover:bg-white/20 transition-colors mobile-touch-target" 
          onClick={onPrev} 
          aria-label="Foto anterior"
        >
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
      )}
      {hasNext && (
        <button 
          className="hidden lg:block absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 backdrop-blur p-3 text-white hover:bg-white/20 transition-colors mobile-touch-target" 
          onClick={onNext} 
          aria-label="Foto siguiente"
        >
          <ChevronRightIcon className="h-6 w-6" />
        </button>
      )}

      {/* Mobile touch areas for navigation */}
      <div className="lg:hidden absolute inset-0 flex z-10">
        {hasPrev && (
          <button 
            className="flex-1 opacity-0 active:opacity-10 active:bg-white transition-opacity"
            onClick={onPrev}
            aria-label="Foto anterior"
          />
        )}
        {hasNext && (
          <button 
            className="flex-1 opacity-0 active:opacity-10 active:bg-white transition-opacity"
            onClick={onNext}
            aria-label="Foto siguiente"
          />
        )}
      </div>
      
      {/* Photo counter - Mobile optimized */}
      {currentIndex !== undefined && totalPhotos && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50
                        mobile:top-3 mobile:bg-black/50 mobile:px-3 mobile:py-1 mobile:rounded-full
                        rounded-full bg-white/10 backdrop-blur px-4 py-2">
          <span className="text-white font-medium text-sm mobile:text-xs">
            {currentIndex + 1} de {totalPhotos}
          </span>
        </div>
      )}
      
      {/* Main content - Mobile optimized */}
      <div className="mx-4 w-full max-w-5xl z-20
                      mobile:mx-0 mobile:max-w-none mobile:h-full mobile:flex mobile:items-center mobile:justify-center">
        <div className="relative mobile:w-full mobile:h-full mobile:flex mobile:items-center mobile:justify-center">
          {/* Photo */}
          <div className="relative aspect-[4/5] max-h-[80vh]
                          mobile:aspect-auto mobile:max-h-none mobile:w-full mobile:h-full mobile:max-w-full">
            {photo.preview_url ? (
              <Image 
                src={photo.preview_url} 
                alt={photo.filename || 'Foto'} 
                fill 
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
                className="rounded-lg object-contain mobile:object-contain mobile:rounded-none"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/5">
                <div className="flex flex-col items-center gap-2 text-white/80">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                  <span className="text-sm">Preparando vista previa…</span>
                </div>
              </div>
            )}
            
            {/* Watermark badge */}
            <div className="absolute left-4 top-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
              MUESTRA
            </div>
          </div>
          
          {/* Action buttons */}
          {(onToggleSelection || onToggleFavorite) && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 rounded-full bg-white/10 backdrop-blur p-2">
              {onToggleFavorite && (
                <button
                  onClick={onToggleFavorite}
                  className={`rounded-full p-3 transition-all ${
                    isFavorite
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 text-white hover:bg-red-500/20'
                  }`}
                  aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <HeartIcon className="h-5 w-5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              )}
              {onToggleSelection && (
                <button
                  onClick={onToggleSelection}
                  className={`rounded-full p-3 transition-all ${
                    isSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/20 text-white hover:bg-purple-600/20'
                  }`}
                  aria-label={isSelected ? 'Quitar de la selección' : 'Agregar a la selección'}
                >
                  {isSelected ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <ShoppingCartIcon className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


