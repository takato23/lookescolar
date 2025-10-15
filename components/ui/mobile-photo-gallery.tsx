'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Heart,
  Download,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMobileDetection } from '@/hooks/useMobileDetection';
import { MobileIconButton } from './mobile-button';

interface Photo {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  selected?: boolean;
}

interface MobilePhotoGalleryProps {
  photos: Photo[];
  onSelectionChange?: (selectedIds: string[]) => void;
  allowMultiSelect?: boolean;
  className?: string;
}

export function MobilePhotoGallery({
  photos,
  onSelectionChange,
  allowMultiSelect = false,
  className,
}: MobilePhotoGalleryProps) {
  const { isMobileView, isTouchDevice } = useMobileDetection();
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadedPhotos, setLoadedPhotos] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Photo selection
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

  // Lazy loading setup
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
      { rootMargin: '50px' }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const openViewer = (index: number) => {
    setCurrentPhotoIndex(index);
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
  };

  // Grid optimized for mobile-first with compact desktop
  const gridClasses = clsx(
    'grid gap-1', // Minimal gaps for more content
    'grid-cols-2', // Always 2 columns on mobile for optimal thumb browsing
    'sm:gap-2 sm:grid-cols-3', // 3 columns on larger phones/small tablets
    'md:gap-2 md:grid-cols-4', // 4 columns on tablets, compact
    'lg:gap-3 lg:grid-cols-6', // 6 columns on desktop, more efficient
    'xl:gap-3 xl:grid-cols-7', // 7 columns on large screens
    '2xl:gap-4 2xl:grid-cols-8' // 8 columns on extra large screens
  );

  return (
    <>
      <div className={clsx(className)}>
        {/* Selection counter */}
        {selectedPhotos.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-primary-200 bg-primary-50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-primary-900">
                {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''}{' '}
                seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  setSelectedPhotos(new Set());
                  onSelectionChange?.([]);
                }}
                className="mobile-touch-target rounded-xl px-3 py-1 text-sm font-medium text-primary-700 hover:bg-primary-100 active:bg-primary-200"
              >
                Limpiar
              </button>
            </div>
          </motion.div>
        )}

        {/* Photo Grid */}
        <div className={gridClasses}>
          {photos.map((photo, index) => {
            const isSelected = selectedPhotos.has(photo.id);
            const isLoaded = loadedPhotos.has(photo.id);

            return (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={clsx(
                  'relative aspect-square overflow-hidden rounded-lg bg-muted',
                  'cursor-pointer transition-all duration-200',
                  isSelected &&
                    'shadow-lg ring-2 ring-primary-500 ring-offset-2'
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
                    className="object-cover transition-transform duration-300"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    priority={index < 6} // Prioritize first 6 images
                  />
                ) : (
                  <div className="flex h-full w-full animate-pulse items-center justify-center bg-muted">
                    <div className="h-8 w-8 text-gray-400">
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
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePhotoSelect(photo.id)}
                  className={clsx(
                    'absolute inset-0 z-10 flex items-center justify-center transition-all duration-200',
                    isSelected
                      ? 'bg-primary-600/80 backdrop-blur-sm'
                      : 'bg-transparent active:bg-black/20'
                  )}
                  aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} foto: ${photo.alt}`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', duration: 0.5 }}
                    >
                      <Heart className="h-8 w-8 fill-current text-white drop-shadow-lg" />
                    </motion.div>
                  )}
                </motion.button>

                {/* View button for mobile */}
                {isMobileView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openViewer(index);
                    }}
                    className="absolute bottom-2 right-2 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition-opacity"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                )}

                {/* Long press to view on mobile */}
                {isTouchDevice && (
                  <div
                    className="z-5 absolute inset-0"
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        openViewer(index);
                      }, 500);

                      const handleTouchEnd = () => {
                        clearTimeout(timer);
                        document.removeEventListener(
                          'touchend',
                          handleTouchEnd
                        );
                      };

                      document.addEventListener('touchend', handleTouchEnd);
                    }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Mobile Photo Viewer */}
      <MobilePhotoViewer
        isOpen={viewerOpen}
        onClose={closeViewer}
        photos={photos}
        currentIndex={currentPhotoIndex}
        onIndexChange={setCurrentPhotoIndex}
      />
    </>
  );
}

// Mobile-optimized photo viewer with gestures
interface MobilePhotoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

function MobilePhotoViewer({
  isOpen,
  onClose,
  photos,
  currentIndex,
  onIndexChange,
}: MobilePhotoViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const { isMobileView } = useMobileDetection();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setScale(1);
      setRotation(0);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigatePhoto('prev');
          break;
        case 'ArrowRight':
          navigatePhoto('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isOpen, currentIndex]);

  const navigatePhoto = (direction: 'prev' | 'next') => {
    const newIndex =
      direction === 'prev'
        ? (currentIndex - 1 + photos.length) % photos.length
        : (currentIndex + 1) % photos.length;

    onIndexChange(newIndex);
    setScale(1);
    setRotation(0);
  };

  const handlePan = (event: any, info: PanInfo) => {
    // Swipe threshold
    const threshold = 100;

    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        navigatePhoto('prev');
      } else {
        navigatePhoto('next');
      }
    }
  };

  const handleZoom = (delta: number) => {
    setScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
  };

  const handleRotate = () => {
    setRotation((prev) => prev + 90);
  };

  const currentPhoto = photos[currentIndex];

  if (!isOpen || !currentPhoto) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="z-60 safe-area-padding absolute left-0 right-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 pt-12">
          <div className="flex items-center justify-between">
            <MobileIconButton
              icon={<X className="h-6 w-6" />}
              onClick={onClose}
              variant="ghost"
              className="bg-black/40 text-white hover:bg-black/60"
              label="Cerrar"
            />

            <div className="text-center text-white">
              <p className="text-sm font-medium">
                {currentIndex + 1} de {photos.length}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <MobileIconButton
                icon={<RotateCw className="h-5 w-5" />}
                onClick={handleRotate}
                variant="ghost"
                className="bg-black/40 text-white hover:bg-black/60"
                label="Rotar"
              />
            </div>
          </div>
        </div>

        {/* Photo Container */}
        <motion.div
          className="flex h-full items-center justify-center px-4 py-20"
          drag={isMobileView ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handlePan}
        >
          <motion.div
            className="relative max-h-full max-w-full"
            animate={{
              scale,
              rotate: rotation,
            }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <Image
              src={currentPhoto.src}
              alt={currentPhoto.alt}
              width={currentPhoto.width}
              height={currentPhoto.height}
              className="max-h-[70vh] max-w-full object-contain"
              priority
            />
          </motion.div>
        </motion.div>

        {/* Touch Navigation Areas - Mobile */}
        {isMobileView && (
          <>
            <button
              onClick={() => navigatePhoto('prev')}
              className="absolute bottom-20 left-0 top-20 z-50 w-1/4 opacity-0 transition-opacity active:bg-white/10 active:opacity-20"
              aria-label="Foto anterior"
            />

            <button
              onClick={() => navigatePhoto('next')}
              className="absolute bottom-20 right-0 top-20 z-50 w-1/4 opacity-0 transition-opacity active:bg-white/10 active:opacity-20"
              aria-label="Foto siguiente"
            />
          </>
        )}

        {/* Desktop Navigation */}
        {!isMobileView && (
          <>
            <MobileIconButton
              icon={<ChevronLeft className="h-6 w-6" />}
              onClick={() => navigatePhoto('prev')}
              className="z-60 absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60"
              size="lg"
              label="Foto anterior"
            />

            <MobileIconButton
              icon={<ChevronRight className="h-6 w-6" />}
              onClick={() => navigatePhoto('next')}
              className="z-60 absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60"
              size="lg"
              label="Foto siguiente"
            />
          </>
        )}

        {/* Bottom Controls */}
        <div className="z-60 safe-area-padding absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
          {/* Zoom Controls */}
          <div className="mb-4 flex items-center justify-center space-x-4">
            <MobileIconButton
              icon={<ZoomOut className="h-5 w-5" />}
              onClick={() => handleZoom(-0.2)}
              variant="ghost"
              className="bg-black/40 text-white hover:bg-black/60"
              label="Alejar"
            />

            <span className="min-w-[4rem] text-center text-sm font-medium text-white">
              {Math.round(scale * 100)}%
            </span>

            <MobileIconButton
              icon={<ZoomIn className="h-5 w-5" />}
              onClick={() => handleZoom(0.2)}
              variant="ghost"
              className="bg-black/40 text-white hover:bg-black/60"
              label="Acercar"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <MobileIconButton
              icon={<Heart className="h-5 w-5" />}
              onClick={() => {}}
              variant="ghost"
              className="bg-black/40 text-white hover:bg-black/60"
              label="Me gusta"
            />

            <MobileIconButton
              icon={<Download className="h-5 w-5" />}
              onClick={() => {}}
              variant="ghost"
              className="bg-black/40 text-white hover:bg-black/60"
              label="Descargar"
            />

            <MobileIconButton
              icon={<Share2 className="h-5 w-5" />}
              onClick={() => {}}
              variant="ghost"
              className="bg-black/40 text-white hover:bg-black/60"
              label="Compartir"
            />
          </div>

          {/* Photo info */}
          <div className="mt-4 text-center">
            <p className="text-sm text-white">{currentPhoto.alt}</p>
          </div>

          {/* Photo indicators */}
          <div className="mt-4 flex justify-center space-x-2">
            {photos
              .slice(
                Math.max(0, currentIndex - 2),
                Math.min(photos.length, currentIndex + 3)
              )
              .map((_, index) => {
                const actualIndex = Math.max(0, currentIndex - 2) + index;
                return (
                  <button
                    key={actualIndex}
                    onClick={() => onIndexChange(actualIndex)}
                    className={clsx(
                      'h-2 w-2 rounded-full transition-all duration-200',
                      actualIndex === currentIndex
                        ? 'scale-125 bg-white'
                        : 'bg-white/40 hover:bg-white/60'
                    )}
                  />
                );
              })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
