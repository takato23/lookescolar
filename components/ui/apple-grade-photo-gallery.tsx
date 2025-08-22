/**
 * Apple-Grade Photo Gallery Component
 * Sophisticated photo browsing experience with momentum scrolling, smooth zoom, and age-appropriate interactions
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence, PanInfo } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { OptimizedImage, GalleryImage } from './optimized-image-apple-grade';
import { AppleGradeButton, IconButton } from './apple-grade-button';
import { cn } from '@/lib/utils';
import { 
  photoVariants, 
  modalVariants, 
  backdropVariants, 
  springConfig, 
  listVariants,
  listItemVariants 
} from '@/lib/design-system/animations';

interface Photo {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  selected?: boolean;
  price?: number;
  packageType?: 'individual' | 'package';
}

interface AppleGradePhotoGalleryProps {
  photos: Photo[];
  ageGroup?: 'kindergarten' | 'elementary' | 'secondary';
  layout?: 'grid' | 'masonry' | 'carousel';
  selectionMode?: boolean;
  maxSelections?: number;
  showPricing?: boolean;
  onPhotoSelect?: (photo: Photo) => void;
  onSelectionChange?: (selectedPhotos: Photo[]) => void;
  onZoomPhoto?: (photo: Photo, index: number) => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
  emptyState?: React.ReactNode;
  virtualizeThreshold?: number;
}

// Age-appropriate grid configurations
const ageGridConfigs = {
  kindergarten: {
    columns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '16px',
    borderRadius: '16px',
    shadowColor: 'rgba(251, 191, 36, 0.2)',
  },
  elementary: {
    columns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    borderRadius: '12px',
    shadowColor: 'rgba(59, 130, 246, 0.2)',
  },
  secondary: {
    columns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '8px',
    borderRadius: '8px',
    shadowColor: 'rgba(107, 114, 128, 0.2)',
  },
};

// Fullscreen photo viewer
const PhotoViewer: React.FC<{
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  ageGroup: 'kindergarten' | 'elementary' | 'secondary';
}> = ({
  photo,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  ageGroup,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const constraintsRef = useRef<HTMLDivElement>(null);
  
  // Handle pinch-to-zoom
  const handlePinch = useCallback((event: any, info: PanInfo) => {
    const newScale = Math.min(Math.max(scale + info.delta.y * 0.01, 0.5), 3);
    setScale(newScale);
  }, [scale]);
  
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) onPrevious?.();
          break;
        case 'ArrowRight':
          if (hasNext) onNext?.();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);
  
  // Reset zoom when photo changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [photo.id]);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
      >
        {/* Photo container */}
        <motion.div
          ref={constraintsRef}
          className="relative w-full h-full flex items-center justify-center"
          variants={modalVariants}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="relative max-w-[90vw] max-h-[90vh]"
            drag
            dragConstraints={constraintsRef}
            dragElastic={0.1}
            style={{
              scale,
              x: position.x,
              y: position.y,
            }}
            onPan={handlePinch}
            whileTap={{ cursor: 'grabbing' }}
          >
            <OptimizedImage
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              className="max-w-full max-h-full object-contain"
              priority
              ageGroup={ageGroup}
              interactive={false}
            />
          </motion.div>
          
          {/* Controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <IconButton
              icon={<MinusIcon />}
              label="Zoom out"
              onClick={() => setScale(Math.max(scale - 0.2, 0.5))}
              className="bg-black/50 text-white hover:bg-black/70"
            />
            <IconButton
              icon={<PlusIcon />}
              label="Zoom in"
              onClick={() => setScale(Math.min(scale + 0.2, 3))}
              className="bg-black/50 text-white hover:bg-black/70"
            />
            <IconButton
              icon={<XMarkIcon />}
              label="Close"
              onClick={onClose}
              className="bg-black/50 text-white hover:bg-black/70"
            />
          </div>
          
          {/* Navigation arrows */}
          {hasPrevious && (
            <IconButton
              icon={<ChevronLeftIcon />}
              label="Previous photo"
              onClick={onPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
            />
          )}
          
          {hasNext && (
            <IconButton
              icon={<ChevronRightIcon />}
              label="Next photo"
              onClick={onNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
            />
          )}
          
          {/* Photo info */}
          <div className="absolute bottom-4 left-4 bg-black/50 text-white p-3 rounded-lg backdrop-blur-sm">
            <h3 className="font-medium">{photo.alt}</h3>
            {photo.price && (
              <p className="text-sm opacity-90">
                ${photo.price} {photo.packageType === 'package' ? '(Paquete)' : '(Individual)'}
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Main gallery component
export const AppleGradePhotoGallery: React.FC<AppleGradePhotoGalleryProps> = ({
  photos,
  ageGroup = 'elementary',
  layout = 'grid',
  selectionMode = false,
  maxSelections = Infinity,
  showPricing = false,
  onPhotoSelect,
  onSelectionChange,
  onZoomPhoto,
  className,
  loading = false,
  error = null,
  emptyState,
  virtualizeThreshold = 100,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  const gridConfig = ageGridConfigs[ageGroup];
  
  // Virtualization for large datasets
  const shouldVirtualize = photos.length > virtualizeThreshold;
  
  const virtualizer = useVirtualizer({
    count: shouldVirtualize ? Math.ceil(photos.length / getItemsPerRow()) : photos.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 250,
    gap: parseInt(gridConfig.gap),
  });
  
  function getItemsPerRow() {
    if (typeof window === 'undefined') return 4;
    const containerWidth = scrollElementRef.current?.offsetWidth || window.innerWidth;
    const minItemWidth = ageGroup === 'kindergarten' ? 150 : ageGroup === 'elementary' ? 200 : 250;
    return Math.floor(containerWidth / (minItemWidth + parseInt(gridConfig.gap)));
  }
  
  // Handle photo selection
  const handlePhotoSelect = useCallback((photo: Photo) => {
    if (!selectionMode) {
      // Open in viewer
      const index = photos.findIndex(p => p.id === photo.id);
      setCurrentIndex(index);
      setViewerPhoto(photo);
      onZoomPhoto?.(photo, index);
      return;
    }
    
    const isSelected = selectedPhotos.some(p => p.id === photo.id);
    let newSelection: Photo[];
    
    if (isSelected) {
      newSelection = selectedPhotos.filter(p => p.id !== photo.id);
    } else if (selectedPhotos.length < maxSelections) {
      newSelection = [...selectedPhotos, photo];
    } else {
      return; // Max selections reached
    }
    
    setSelectedPhotos(newSelection);
    onSelectionChange?.(newSelection);
    onPhotoSelect?.(photo);
  }, [selectionMode, selectedPhotos, maxSelections, photos, onPhotoSelect, onSelectionChange, onZoomPhoto]);
  
  // Viewer navigation
  const handlePreviousPhoto = useCallback(() => {
    const newIndex = Math.max(currentIndex - 1, 0);
    setCurrentIndex(newIndex);
    setViewerPhoto(photos[newIndex]);
  }, [currentIndex, photos]);
  
  const handleNextPhoto = useCallback(() => {
    const newIndex = Math.min(currentIndex + 1, photos.length - 1);
    setCurrentIndex(newIndex);
    setViewerPhoto(photos[newIndex]);
  }, [currentIndex, photos]);
  
  // Scroll-based animations
  const { scrollY } = useScroll({
    container: scrollElementRef
  });
  
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.8]);
  const headerScale = useTransform(scrollY, [0, 100], [1, 0.95]);
  
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="aspect-square bg-gray-200 rounded-lg animate-pulse"
            variants={listItemVariants}
            initial="initial"
            animate="animate"
            custom={i}
          />
        ))}
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="text-gray-400 mb-4">
          <ExclamationTriangleIcon className="w-12 h-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar fotos</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }
  
  // Empty state
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        {emptyState || (
          <>
            <div className="text-gray-400 mb-4">
              <PhotoIcon className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay fotos disponibles</h3>
            <p className="text-gray-600">Las fotos aparecerán aquí una vez que sean subidas.</p>
          </>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn('relative', className)}>
      {/* Selection header */}
      {selectionMode && selectedPhotos.length > 0 && (
        <motion.div
          className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b p-4"
          style={{
            opacity: headerOpacity,
            scale: headerScale,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {selectedPhotos.length} foto{selectedPhotos.length !== 1 ? 's' : ''} seleccionada{selectedPhotos.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <AppleGradeButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPhotos([]);
                  onSelectionChange?.([]);
                }}
              >
                Limpiar
              </AppleGradeButton>
              {showPricing && (
                <AppleGradeButton
                  variant="primary"
                  size="sm"
                  ageGroup={ageGroup}
                >
                  Ver Precios
                </AppleGradeButton>
              )}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Photo grid */}
      <motion.div
        ref={scrollElementRef}
        className="overflow-auto"
        variants={listVariants}
        initial="initial"
        animate="animate"
      >
        {shouldVirtualize ? (
          // Virtualized grid for large datasets
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const startIndex = virtualItem.index * getItemsPerRow();
              const endIndex = Math.min(startIndex + getItemsPerRow(), photos.length);
              const rowPhotos = photos.slice(startIndex, endIndex);
              
              return (
                <div
                  key={virtualItem.key}
                  className={`grid gap-${gridConfig.gap}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    gridTemplateColumns: gridConfig.columns,
                  }}
                >
                  {rowPhotos.map((photo, index) => (
                    <GalleryImage
                      key={photo.id}
                      src={photo.src}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      blurDataURL={photo.blurDataURL}
                      aspectRatio="square"
                      ageGroup={ageGroup}
                      index={startIndex + index}
                      selected={selectedPhotos.some(p => p.id === photo.id)}
                      onSelect={() => handlePhotoSelect(photo)}
                      className={cn(
                        'cursor-pointer transition-all duration-200',
                        selectionMode && 'hover:ring-2 hover:ring-blue-300'
                      )}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          // Regular grid for smaller datasets
          <div
            className="grid p-4"
            style={{
              gridTemplateColumns: gridConfig.columns,
              gap: gridConfig.gap,
            }}
          >
            {photos.map((photo, index) => (
              <GalleryImage
                key={photo.id}
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                blurDataURL={photo.blurDataURL}
                aspectRatio="square"
                ageGroup={ageGroup}
                index={index}
                selected={selectedPhotos.some(p => p.id === photo.id)}
                onSelect={() => handlePhotoSelect(photo)}
                className={cn(
                  'cursor-pointer transition-all duration-200',
                  selectionMode && 'hover:ring-2 hover:ring-blue-300'
                )}
              />
            ))}
          </div>
        )}
      </motion.div>
      
      {/* Photo viewer */}
      <PhotoViewer
        photo={viewerPhoto!}
        isOpen={!!viewerPhoto}
        onClose={() => setViewerPhoto(null)}
        onPrevious={handlePreviousPhoto}
        onNext={handleNextPhoto}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < photos.length - 1}
        ageGroup={ageGroup}
      />
    </div>
  );
};

// Icon components (simplified SVG icons)
const ChevronLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const MinusIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
  </svg>
);

const PhotoIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

export default AppleGradePhotoGallery;