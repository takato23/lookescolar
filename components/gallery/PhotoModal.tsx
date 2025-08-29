'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ProtectedImage } from '@/components/ui/protected-image';
import { useSignedUrl } from '@/lib/utils/signed-url-cache';
import { springConfig } from '@/lib/design-system/animations';

// Apple-grade haptic feedback
const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(patterns[type]);
  }
};

interface Photo {
  id: string;
  storage_path?: string;
  width?: number | null;
  height?: number | null;
  created_at?: string;
  signed_url?: string;
  preview_url?: string;
  filename?: string;
}

interface PhotoModalProps {
  // Apple-grade interface (primary)
  photo?: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalPhotos?: number;

  // Public PhotoModal compatibility interface
  photos?: Array<{
    id: string;
    signed_url?: string;
    preview_url?: string;
  }>;
  price?: number;

  // Additional props for enhanced functionality
  isSelected?: boolean;
  isFavorite?: boolean;
  onToggleSelection?: () => void;
  onToggleFavorite?: () => void;
  familyMode?: boolean;
  hasNext?: boolean;
  hasPrev?: boolean;
  onPrev?: () => void;
  onNextAlternate?: () => void;
}

export function PhotoModal({
  photo,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  currentIndex,
  totalPhotos,
  photos,
  price = 1000,
  isSelected: propIsSelected,
  isFavorite: propIsFavorite,
  onToggleSelection,
  onToggleFavorite,
  familyMode = false,
  hasNext,
  hasPrev,
  onPrev,
  onNextAlternate,
}: PhotoModalProps) {
  // Handle backward compatibility with public PhotoModal interface
  const [internalCurrentIndex, setInternalCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // Determine which interface pattern is being used
  const isPublicInterface = photos && photos.length > 0;
  const isAppleInterface = !isPublicInterface;

  // Unified photo object
  const currentPhoto = useMemo((): Photo | null => {
    if (isPublicInterface && photos) {
      const publicPhoto = photos[internalCurrentIndex];
      if (!publicPhoto) return null;
      // Convert public interface photo to unified Photo type
      return {
        id: publicPhoto.id,
        signed_url: publicPhoto.signed_url,
        preview_url: publicPhoto.preview_url,
      } as Photo;
    }
    return photo || null;
  }, [photo, photos, internalCurrentIndex, isPublicInterface]);

  // Unified navigation handlers
  const handlePrevious = useCallback(() => {
    if (isPublicInterface && photos) {
      setInternalCurrentIndex((prev) =>
        prev > 0 ? prev - 1 : photos.length - 1
      );
      hapticFeedback('light');
    } else if (onPrevious) {
      onPrevious();
    } else if (onPrev) {
      onPrev();
    }
  }, [isPublicInterface, photos, onPrevious, onPrev]);

  const handleNext = useCallback(() => {
    if (isPublicInterface && photos) {
      setInternalCurrentIndex((prev) =>
        prev < photos.length - 1 ? prev + 1 : 0
      );
      hapticFeedback('light');
    } else if (onNext) {
      onNext();
    } else if (onNextAlternate) {
      onNextAlternate();
    }
  }, [isPublicInterface, photos, onNext, onNextAlternate]);

  // Unified current index and total
  const displayCurrentIndex = isPublicInterface
    ? internalCurrentIndex + 1
    : currentIndex || 1;
  const displayTotalPhotos = isPublicInterface
    ? photos?.length || 1
    : totalPhotos || 1;
  // State management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isInteracting, setIsInteracting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [lastTap, setLastTap] = useState(0);

  // Refs
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Motion values for Apple-grade animations
  const scale = useMotionValue(1);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const modalY = useMotionValue(0);

  // Spring animations with Apple physics
  const springScale = useSpring(scale, {
    ...springConfig,
    damping: 30,
    stiffness: 300,
  });
  const springX = useSpring(x, {
    ...springConfig,
    damping: 25,
    stiffness: 250,
  });
  const springY = useSpring(y, {
    ...springConfig,
    damping: 25,
    stiffness: 250,
  });
  const springOpacity = useSpring(opacity, springConfig);
  const springModalY = useSpring(modalY, springConfig);

  // Get signed URL - handle both interface patterns
  const photoId = currentPhoto?.id || '';
  const storagePath = currentPhoto?.storage_path || '';
  const directUrl = currentPhoto?.signed_url || currentPhoto?.preview_url || '';

  // Use direct URL if available (public interface), otherwise get signed URL (Apple interface)
  const shouldUseSignedUrl = !directUrl && storagePath;
  const {
    url: signedUrl,
    loading: urlLoading,
    error: urlError,
  } = useSignedUrl(
    shouldUseSignedUrl ? photoId : '',
    shouldUseSignedUrl ? storagePath : ''
  );

  // Final URL to use
  const finalImageUrl = directUrl || signedUrl || '';

  // Handler functions
  const handleClose = useCallback(() => {
    hapticFeedback('light');
    opacity.set(0);
    scale.set(0.9);
    modalY.set(20);
    setTimeout(onClose, 150);
  }, [onClose, opacity, scale, modalY]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(zoomLevel * 1.5, 4);
    setZoomLevel(newZoom);
    scale.set(newZoom);
    hapticFeedback('light');
  }, [zoomLevel, scale]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(zoomLevel / 1.5, 0.5);
    setZoomLevel(newZoom);
    scale.set(newZoom);
    if (newZoom === 1) {
      x.set(0);
      y.set(0);
    }
    hapticFeedback('light');
  }, [zoomLevel, scale, x, y]);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
    scale.set(1);
    x.set(0);
    y.set(0);
    hapticFeedback('medium');
  }, [scale, x, y]);

  const handleImageTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (zoomLevel === 1) {
        setZoomLevel(2);
        scale.set(2);
        hapticFeedback('medium');
      } else {
        handleZoomReset();
      }
    }

    setLastTap(now);
  }, [lastTap, zoomLevel, scale, handleZoomReset]);

  const getPanConstraints = useCallback(() => {
    if (!imageRef.current || zoomLevel <= 1)
      return { left: 0, right: 0, top: 0, bottom: 0 };

    const rect = imageRef.current.getBoundingClientRect();
    const maxPanX = (rect.width * (zoomLevel - 1)) / 2;
    const maxPanY = (rect.height * (zoomLevel - 1)) / 2;

    return {
      left: -maxPanX,
      right: maxPanX,
      top: -maxPanY,
      bottom: maxPanY,
    };
  }, [zoomLevel]);

  const showControlsTemporary = useCallback(() => {
    setShowControls(true);
    setIsInteracting(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    hideControlsTimeoutRef.current = setTimeout(() => {
      if (!isInteracting) {
        setShowControls(false);
      }
    }, 3000);
  }, [isInteracting]);

  const handleMouseMove = useCallback(() => {
    showControlsTemporary();
  }, [showControlsTemporary]);

  const handleInteractionStart = useCallback(() => {
    setIsInteracting(true);
    showControlsTemporary();
  }, [showControlsTemporary]);

  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && zoomLevel === 1) {
      handleClose();
    }
  };

  // Apple-grade skeleton loader
  const SkeletonLoader = () => {
    const aspectRatio =
      currentPhoto && currentPhoto.width && currentPhoto.height
        ? currentPhoto.width / currentPhoto.height
        : 16 / 9;

    return (
      <motion.div
        className="flex w-full max-w-4xl flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springConfig}
      >
        <div
          className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white/10 shadow-2xl ring-1 ring-white/20"
          style={{ aspectRatio }}
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-white/5 via-white/20 to-white/5">
            <div className="apple-image-loading h-full w-full" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="h-6 w-24 animate-pulse rounded-xl bg-white/20" />
            <div className="h-6 w-32 animate-pulse rounded-xl bg-white/15" />
          </div>
          <motion.div
            className="text-sm font-medium text-white/60"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            Cargando imagen de alta calidad...
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Effects
  useEffect(() => {
    if (isOpen && currentPhoto) {
      setImageLoaded(false);
      setImageError(false);
      setZoomLevel(1);
      scale.set(1);
      x.set(0);
      y.set(0);
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      setShowControls(true);

      // Update internal index if using public interface
      if (isPublicInterface && photos) {
        const index = photos.findIndex((p) => p.id === currentPhoto.id);
        if (index !== -1) {
          setInternalCurrentIndex(index);
        }
      }

      setTimeout(() => {
        closeButtonRef.current?.focus();
        hapticFeedback('light');
      }, 100);
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');

      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isOpen, currentPhoto?.id, scale, x, y, isPublicInterface, photos]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          handleClose();
          break;
        case 'ArrowLeft':
        case 'h':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
        case 'l':
          event.preventDefault();
          handleNext();
          break;
        case 'ArrowUp':
        case 'k':
          event.preventDefault();
          handleZoomIn();
          break;
        case 'ArrowDown':
        case 'j':
          event.preventDefault();
          handleZoomOut();
          break;
        case '+':
        case '=':
          event.preventDefault();
          handleZoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          handleZoomOut();
          break;
        case '0':
        case 'r':
          event.preventDefault();
          handleZoomReset();
          break;
        case ' ':
          event.preventDefault();
          setShowControls((prev: boolean) => !prev);
          hapticFeedback('light');
          break;
      }
    },
    [
      isOpen,
      handleClose,
      handlePrevious,
      handleNext,
      handleZoomIn,
      handleZoomOut,
      handleZoomReset,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !currentPhoto) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="photo-modal-title"
          aria-describedby="photo-modal-help"
        >
          {/* Enhanced backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl supports-[backdrop-filter]:bg-black/85"
            onClick={handleBackdropClick}
            initial={{ backdropFilter: 'blur(0px)' }}
            animate={{ backdropFilter: 'blur(24px)' }}
            transition={{ duration: 0.3 }}
          />

          {/* Modal container */}
          <motion.div
            className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8"
            onMouseMove={handleMouseMove}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
          >
            <motion.div
              className="relative w-full max-w-7xl"
              style={{
                scale: springScale,
                opacity: springOpacity,
                y: springModalY,
              }}
              drag={isDragging ? 'y' : false}
              dragConstraints={{ top: -50, bottom: 50 }}
              dragElastic={0.1}
              onDragStart={() => {
                setIsDragging(true);
                hapticFeedback('light');
              }}
              onDragEnd={(_, info) => {
                setIsDragging(false);
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  handleClose();
                } else {
                  modalY.set(0);
                }
              }}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={springConfig}
            >
              {/* Contextual header */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={springConfig}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="rounded-2xl bg-black/30 px-4 py-2 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                      >
                        <h3
                          id="photo-modal-title"
                          className="text-sm font-medium"
                        >
                          {displayCurrentIndex} de {displayTotalPhotos}
                        </h3>
                      </motion.div>

                      {currentPhoto?.created_at && (
                        <motion.div
                          className="rounded-2xl bg-black/30 px-4 py-2 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                          }}
                        >
                          <div className="text-xs opacity-75">
                            {new Date(
                              currentPhoto.created_at
                            ).toLocaleDateString('es-AR')}
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Enhanced controls */}
                    <div className="flex items-center gap-2">
                      {/* Shopping cart controls for public interface */}
                      {isPublicInterface && (
                        <motion.div
                          className="flex items-center rounded-2xl bg-black/30 p-1 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: 'rgba(0,0,0,0.4)',
                          }}
                        >
                          <motion.button
                            onClick={() => setIsLiked(!isLiked)}
                            className="h-8 w-8 rounded-xl border-none bg-transparent p-0 text-white transition-all duration-200 hover:bg-white/20"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <svg
                              className={`h-4 w-4 ${isLiked ? 'fill-current text-red-500' : 'text-white'}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                          </motion.button>

                          {onToggleSelection && (
                            <motion.button
                              onClick={onToggleSelection}
                              className={`h-8 w-8 rounded-xl border-none bg-transparent p-0 transition-all duration-200 ${
                                propIsSelected
                                  ? 'text-green-400'
                                  : 'text-white hover:bg-white/20'
                              }`}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 3M7 13l-1.5 3m9.5-3h.01M16 21a2 2 0 100-4 2 2 0 000 4zm-8 0a2 2 0 100-4 2 2 0 000 4z"
                                />
                              </svg>
                            </motion.button>
                          )}
                        </motion.div>
                      )}

                      {/* Zoom controls */}
                      <motion.div
                        className="flex items-center rounded-2xl bg-black/30 p-1 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
                        whileHover={{
                          scale: 1.02,
                          backgroundColor: 'rgba(0,0,0,0.4)',
                        }}
                      >
                        <motion.button
                          onClick={handleZoomOut}
                          disabled={zoomLevel <= 0.5}
                          className="h-8 w-8 rounded-xl border-none bg-transparent p-0 text-white transition-all duration-200 hover:bg-white/20 disabled:opacity-30"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          -
                        </motion.button>

                        <motion.span
                          className="min-w-[3rem] px-2 text-center text-xs font-medium"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 0.3 }}
                          key={zoomLevel}
                        >
                          {Math.round(zoomLevel * 100)}%
                        </motion.span>

                        <motion.button
                          onClick={handleZoomIn}
                          disabled={zoomLevel >= 4}
                          className="h-8 w-8 rounded-xl border-none bg-transparent p-0 text-white transition-all duration-200 hover:bg-white/20 disabled:opacity-30"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          +
                        </motion.button>

                        <motion.button
                          onClick={handleZoomReset}
                          className="h-8 w-8 rounded-xl border-none bg-transparent p-0 text-xs text-white transition-all duration-200 hover:bg-white/20"
                          whileHover={{ scale: 1.1, rotate: 360 }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ duration: 0.3 }}
                        >
                          ⌂
                        </motion.button>
                      </motion.div>

                      {/* Close button */}
                      <motion.button
                        onClick={handleClose}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/30 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200 hover:bg-red-500/30"
                        ref={closeButtonRef}
                        whileHover={{
                          scale: 1.1,
                          backgroundColor: 'rgba(239, 68, 68, 0.3)',
                        }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <AnimatePresence>
                {displayTotalPhotos > 1 && showControls && (
                  <>
                    <motion.button
                      onClick={handlePrevious}
                      className="absolute left-4 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-black/30 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200 hover:bg-black/50"
                      whileHover={{
                        scale: 1.1,
                        x: -4,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                      }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ delay: 0.2, ...springConfig }}
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </motion.button>

                    <motion.button
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-black/30 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-all duration-200 hover:bg-black/50"
                      whileHover={{
                        scale: 1.1,
                        x: 4,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                      }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ delay: 0.2, ...springConfig }}
                    >
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </motion.button>
                  </>
                )}
              </AnimatePresence>

              {/* Image container */}
              <div className="flex min-h-[60vh] w-full items-center justify-center p-4 sm:p-8">
                {(!imageLoaded && !imageError && !urlError) || urlLoading ? (
                  <SkeletonLoader />
                ) : null}

                {imageError || urlError ? (
                  <motion.div
                    className="flex flex-col items-center gap-6 text-white"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springConfig}
                  >
                    <motion.div
                      className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/20 ring-1 ring-red-500/30 backdrop-blur-sm"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <svg
                        className="h-8 w-8 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </motion.div>
                    <div className="text-center">
                      <p className="mb-2 text-lg font-medium">
                        {urlError
                          ? 'Error al obtener la foto'
                          : 'Error al cargar la imagen'}
                      </p>
                      <p className="text-sm text-white/60">
                        Verifica tu conexión e intenta nuevamente
                      </p>
                    </div>
                    <motion.button
                      onClick={() => {
                        setImageError(false);
                        setImageLoaded(false);
                        hapticFeedback('light');
                      }}
                      className="rounded-2xl bg-white/10 px-6 py-3 text-white ring-1 ring-white/20 backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                      whileHover={{
                        scale: 1.05,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Intentar de nuevo
                    </motion.button>
                  </motion.div>
                ) : finalImageUrl ? (
                  <motion.div
                    className="relative cursor-grab active:cursor-grabbing"
                    drag={zoomLevel > 1}
                    dragConstraints={getPanConstraints()}
                    dragElastic={0.1}
                    dragMomentum={false}
                    style={{
                      scale: springScale,
                      x: springX,
                      y: springY,
                    }}
                    onDrag={(_, info) => {
                      if (zoomLevel > 1) {
                        x.set(info.point.x);
                        y.set(info.point.y);
                      }
                    }}
                    onTap={handleImageTap}
                    onTouchStart={handleInteractionStart}
                    onTouchEnd={handleInteractionEnd}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: imageLoaded ? 1 : 0,
                      scale: imageLoaded ? 1 : 0.9,
                    }}
                    transition={springConfig}
                  >
                    <ProtectedImage
                      ref={imageRef}
                      src={finalImageUrl}
                      alt={`Foto del evento - ${displayCurrentIndex} de ${displayTotalPhotos}`}
                      width={currentPhoto.width || 800}
                      height={currentPhoto.height || 600}
                      className="max-h-[85vh] max-w-[90vw] select-none rounded-2xl object-contain shadow-2xl ring-1 ring-white/10"
                      onLoad={() => {
                        setImageLoaded(true);
                        hapticFeedback('light');
                      }}
                      onError={() => {
                        setImageError(true);
                        setImageLoaded(false);
                        hapticFeedback('medium');
                      }}
                      priority={true}
                      quality={95}
                      unoptimized={finalImageUrl.includes('token=')}
                      enableContextMenuBlock={true}
                      enableDragBlock={true}
                      enableKeyboardBlock={true}
                      enableTouchBlock={true}
                      watermarkText="MUESTRA - NO VÁLIDA PARA VENTA"
                    />

                    {/* Zoom indicator */}
                    {zoomLevel > 1 && (
                      <motion.div
                        className="absolute right-4 top-4 rounded-xl bg-black/50 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20 backdrop-blur-sm"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                      >
                        {Math.round(zoomLevel * 100)}%
                      </motion.div>
                    )}
                  </motion.div>
                ) : null}
              </div>

              {/* Help text */}
              <AnimatePresence>
                {showControls && (
                  <motion.div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.3, ...springConfig }}
                  >
                    <motion.div
                      className="rounded-2xl bg-black/30 px-6 py-3 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
                      whileHover={{
                        scale: 1.02,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                      }}
                    >
                      <p
                        id="photo-modal-help"
                        className="text-center text-xs font-medium opacity-75"
                      >
                        <span className="hidden sm:inline">
                          Flechas para navegar • ESC para cerrar • Doble clic
                          para zoom
                        </span>
                        <span className="sm:hidden">
                          Desliza para navegar • Pellizca para zoom • Doble
                          toque para ampliar
                        </span>
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PhotoModal;
