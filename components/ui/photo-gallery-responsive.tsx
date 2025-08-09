'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Heart,
  Download,
  Share2,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from './button';
import Image from 'next/image';

interface Photo {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  selected?: boolean;
}

interface PhotoGalleryResponsiveProps {
  photos: Photo[];
  onSelectionChange?: (selectedIds: string[]) => void;
  allowMultiSelect?: boolean;
  enableModal?: boolean;
  className?: string;
}

export function PhotoGalleryResponsive({
  photos,
  onSelectionChange,
  allowMultiSelect = false,
  enableModal = true,
  className,
}: PhotoGalleryResponsiveProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [modalPhoto, setModalPhoto] = useState<Photo | null>(null);
  const [currentModalIndex, setCurrentModalIndex] = useState(0);
  const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Handle photo selection
  const handlePhotoSelect = useCallback(
    (photoId: string) => {
      setSelectedPhotos((prev) => {
        const newSelection = new Set(prev);

        if (allowMultiSelect) {
          if (newSelection.has(photoId)) {
            newSelection.delete(photoId);
          } else {
            newSelection.add(photoId);
          }
        } else {
          if (newSelection.has(photoId)) {
            newSelection.clear();
          } else {
            newSelection.clear();
            newSelection.add(photoId);
          }
        }

        onSelectionChange?.(Array.from(newSelection));
        return newSelection;
      });
    },
    [allowMultiSelect, onSelectionChange]
  );

  // Modal navigation
  const openModal = (photo: Photo) => {
    if (!enableModal) return;
    const index = photos.findIndex((p) => p.id === photo.id);
    setCurrentModalIndex(index);
    setModalPhoto(photo);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setModalPhoto(null);
    document.body.style.overflow = '';
  };

  const navigateModal = (direction: 'prev' | 'next') => {
    const newIndex =
      direction === 'prev'
        ? (currentModalIndex - 1 + photos.length) % photos.length
        : (currentModalIndex + 1) % photos.length;

    setCurrentModalIndex(newIndex);
    setModalPhoto(photos[newIndex]);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!modalPhoto) return;

      switch (e.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowLeft':
          navigateModal('prev');
          break;
        case 'ArrowRight':
          navigateModal('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [modalPhoto, currentModalIndex]);

  // Lazy loading intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const photoId = entry.target.getAttribute('data-photo-id');
            if (photoId) {
              setLoadedPhotos((prev) => new Set([...prev, photoId]));
            }
          }
        });
      },
      { rootMargin: '100px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Photo grid responsive breakpoints
  const getGridClasses = () => {
    return clsx(
      'grid gap-2', // Mobile: small gaps
      'grid-cols-2', // Mobile: 2 columns
      'sm:gap-3 sm:grid-cols-3', // Small: 3 columns, larger gaps
      'md:gap-4 md:grid-cols-4', // Medium: 4 columns
      'lg:gap-6 lg:grid-cols-5', // Large: 5 columns
      'xl:gap-8 xl:grid-cols-6', // Extra large: 6 columns
      '2xl:grid-cols-7' // 2XL: 7 columns for very wide screens
    );
  };

  return (
    <>
      <div className={clsx(className)} ref={containerRef}>
        {/* Selection counter */}
        {selectedPhotos.size > 0 && (
          <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-body-strong text-primary-900">
                {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''}{' '}
                seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedPhotos(new Set());
                  onSelectionChange?.([]);
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
        )}

        {/* Photo Grid */}
        <div className={getGridClasses()}>
          {photos.map((photo) => {
            const isSelected = selectedPhotos.has(photo.id);
            const isLoaded = loadedPhotos.has(photo.id);

            return (
              <div
                key={photo.id}
                className={clsx(
                  'group relative aspect-square overflow-hidden rounded-lg',
                  'cursor-pointer bg-neutral-100 transition-all duration-200',
                  'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
                  'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
                  isSelected &&
                    'shadow-lg ring-2 ring-primary-600 ring-offset-2'
                )}
                data-photo-id={photo.id}
                ref={(el) => {
                  if (el && observerRef.current && !isLoaded) {
                    observerRef.current.observe(el);
                  }
                }}
              >
                {/* Photo Image */}
                {isLoaded ? (
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    className={clsx(
                      'object-cover transition-transform duration-300',
                      'group-hover:scale-105'
                    )}
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 16vw, 14vw"
                    priority={false}
                  />
                ) : (
                  <div className="flex h-full w-full animate-pulse items-center justify-center bg-neutral-200">
                    <div className="h-8 w-8 text-neutral-400">
                      <svg fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                {/* Selection Overlay */}
                <button
                  onClick={() => handlePhotoSelect(photo.id)}
                  className={clsx(
                    'absolute inset-0 z-10 flex items-center justify-center',
                    'touch-target-lg focus-ring-inset',
                    'transition-all duration-200',
                    isSelected
                      ? 'bg-primary-600/80 backdrop-blur-sm'
                      : 'bg-black/0 hover:bg-black/20 focus:bg-black/20'
                  )}
                  aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} foto: ${photo.alt}`}
                >
                  {isSelected && (
                    <Heart className="h-8 w-8 fill-current text-white" />
                  )}
                </button>

                {/* Action Buttons - Desktop Only */}
                <div
                  className={clsx(
                    'absolute right-2 top-2 z-20',
                    'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
                    'hidden gap-1 sm:flex'
                  )}
                >
                  <Button
                    variant="glass"
                    size="sm"
                    icon={<ZoomIn className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(photo);
                    }}
                    aria-label={`Ver ${photo.alt} en grande`}
                    className="backdrop-blur-md"
                  />
                  <Button
                    variant="glass"
                    size="sm"
                    icon={<Share2 className="h-4 w-4" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle share
                    }}
                    aria-label={`Compartir ${photo.alt}`}
                    className="backdrop-blur-md"
                  />
                </div>

                {/* Mobile tap to view indicator */}
                <div
                  className={clsx(
                    'absolute bottom-2 right-2 z-20',
                    'sm:hidden', // Only show on mobile
                    'opacity-60'
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50">
                    <ZoomIn className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* Double tap to view on mobile */}
                <div
                  className="z-5 absolute inset-0 sm:hidden"
                  onDoubleClick={() => openModal(photo)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalPhoto && enableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          {/* Close Button */}
          <Button
            variant="glass"
            size="lg"
            icon={<X className="h-6 w-6" />}
            onClick={closeModal}
            className="z-60 touch-target-lg absolute right-4 top-4"
            aria-label="Cerrar vista ampliada"
          />

          {/* Navigation Buttons */}
          <Button
            variant="glass"
            size="lg"
            icon={<ChevronLeft className="h-6 w-6" />}
            onClick={() => navigateModal('prev')}
            className="z-60 touch-target-lg absolute left-4 top-1/2 -translate-y-1/2"
            aria-label="Foto anterior"
          />

          <Button
            variant="glass"
            size="lg"
            icon={<ChevronRight className="h-6 w-6" />}
            onClick={() => navigateModal('next')}
            className="z-60 touch-target-lg absolute right-4 top-1/2 -translate-y-1/2"
            aria-label="Foto siguiente"
          />

          {/* Modal Image */}
          <div className="relative max-h-full max-w-full">
            <Image
              src={modalPhoto.src}
              alt={modalPhoto.alt}
              width={modalPhoto.width}
              height={modalPhoto.height}
              className="max-h-[90vh] max-w-full object-contain"
              priority
            />
          </div>

          {/* Photo Info */}
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-body mb-2 text-white">{modalPhoto.alt}</p>
            <p className="text-caption text-white/70">
              {currentModalIndex + 1} de {photos.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
