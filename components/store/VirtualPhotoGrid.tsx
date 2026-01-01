'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { GridPhotoImage } from './OptimizedImage';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  alt: string;
  preview_url?: string;
}

interface VirtualPhotoGridProps {
  photos: Photo[];
  columns?: number;
  gap?: number;
  onPhotoClick?: (photo: Photo) => void;
  selectedPhotos?: Set<string>;
  onPhotoSelect?: (photoId: string) => void;
  className?: string;
  overscan?: number;
  estimateSize?: number;
  renderPhoto?: (photo: Photo, index: number) => React.ReactNode;
}

/**
 * High-performance virtual photo grid using @tanstack/react-virtual
 *
 * Features:
 * - Virtual scrolling for thousands of photos
 * - Optimized rendering (only visible items)
 * - Smooth scrolling with overscan
 * - Responsive column layout
 * - Touch-optimized for mobile
 * - Memory efficient
 *
 * Performance targets:
 * - Render 10,000+ photos without lag
 * - 60fps smooth scrolling
 * - <100ms interaction delay
 */
export function VirtualPhotoGrid({
  photos,
  columns = 4,
  gap = 16,
  onPhotoClick,
  selectedPhotos,
  onPhotoSelect,
  className,
  overscan = 5,
  estimateSize = 300,
  renderPhoto,
}: VirtualPhotoGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate responsive columns based on container width
  const getColumnCount = useCallback(() => {
    if (typeof window === 'undefined') return columns;
    const width = window.innerWidth;
    if (width < 640) return 2; // mobile
    if (width < 1024) return 3; // tablet
    return columns; // desktop
  }, [columns]);

  const currentColumns = useMemo(() => getColumnCount(), [getColumnCount]);

  // Group photos into rows for virtualization
  const rows = useMemo(() => {
    const result: Photo[][] = [];
    for (let i = 0; i < photos.length; i += currentColumns) {
      result.push(photos.slice(i, i + currentColumns));
    }
    return result;
  }, [photos, currentColumns]);

  // Configure virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    // Enable smooth scrolling
    scrollMargin: 0,
    gap,
  });

  const handlePhotoClick = useCallback(
    (photo: Photo) => {
      if (onPhotoClick) {
        onPhotoClick(photo);
      } else if (onPhotoSelect) {
        onPhotoSelect(photo.id);
      }
    },
    [onPhotoClick, onPhotoSelect]
  );

  const isPhotoSelected = useCallback(
    (photoId: string) => {
      return selectedPhotos?.has(photoId) ?? false;
    },
    [selectedPhotos]
  );

  return (
    <div
      ref={parentRef}
      className={cn('h-full overflow-auto', className)}
      style={{
        // Use will-change sparingly for scroll performance
        willChange: 'scroll-position',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {row.map((photo, colIndex) => (
                  <div
                    key={photo.id}
                    className={cn(
                      'group relative cursor-pointer overflow-hidden rounded-lg transition-all duration-200',
                      'hover:scale-105 hover:shadow-xl',
                      'active:scale-95',
                      isPhotoSelected(photo.id) && 'ring-2 ring-blue-500 ring-offset-2'
                    )}
                    onClick={() => handlePhotoClick(photo)}
                    style={{
                      // Prevent layout shift
                      aspectRatio: '1/1',
                      // Use touch-action for better mobile performance
                      touchAction: 'manipulation',
                    }}
                  >
                    {renderPhoto ? (
                      renderPhoto(photo, virtualRow.index * currentColumns + colIndex)
                    ) : (
                      <>
                        <GridPhotoImage
                          src={photo.preview_url || photo.url}
                          alt={photo.alt}
                          priority={virtualRow.index < 2} // Preload first 2 rows
                          className="h-full w-full"
                        />

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

                        {/* Selection indicator */}
                        {isPhotoSelected(photo.id) && (
                          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Infinite scroll photo grid
 * Automatically loads more photos when scrolling to bottom
 */
export function InfiniteScrollPhotoGrid({
  photos,
  onLoadMore,
  hasMore,
  loading,
  ...props
}: VirtualPhotoGridProps & {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  const observerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  // Setup observer
  useMemo(() => {
    if (typeof window !== 'undefined' && observerRef.current) {
      const observer = new IntersectionObserver(handleObserver, {
        threshold: 0.5,
        rootMargin: '200px', // Start loading before reaching bottom
      });

      observer.observe(observerRef.current);
      return () => observer.disconnect();
    }
  }, [handleObserver]);

  return (
    <div className="relative">
      <VirtualPhotoGrid photos={photos} {...props} />

      {/* Loading trigger */}
      <div ref={observerRef} className="h-20 w-full">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
}
