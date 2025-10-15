/**
 * Optimized Photo Grid with Intersection Observer
 * Implements true lazy loading with visibility detection
 */

'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { getCachedUrl } from '@/lib/utils/signed-url-cache';

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url?: string;
  assignment_id?: string;
}

interface OptimizedPhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onTogglePhoto: (photo: Photo) => void;
  onViewPhoto: (photo: Photo) => void;
  loading?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  itemSize?: number;
  overscan?: number;
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  fetchPriority?: 'high' | 'low' | 'auto';
}

// Lazy image component with intersection observer
function LazyImage({
  src,
  alt,
  className,
  onLoad,
  onError,
  fetchPriority = 'auto',
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.unobserve(img);
        }
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before image enters viewport
        threshold: 0,
      }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={isInView ? src : ''}
        alt={alt}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        decoding="async"
        fetchPriority={fetchPriority}
      />

      {/* Loading placeholder */}
      {!isLoaded && !hasError && isInView && (
        <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-muted">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
        </div>
      )}

      {/* Error placeholder */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      )}

      {/* Initial placeholder */}
      {!isInView && <div className="absolute inset-0 bg-muted"></div>}
    </div>
  );
}

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  onToggle: () => void;
  onView: () => void;
  priority?: boolean;
}

function OptimizedPhotoCard({
  photo,
  isSelected,
  onToggle,
  onView,
  priority = false,
}: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  // Use cached URL if available
  const imageUrl = useMemo(() => {
    const cached = getCachedUrl(photo.id);
    return cached || photo.signed_url || '';
  }, [photo.id, photo.signed_url]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    if (loadTime === null) {
      setLoadTime(performance.now());
    }
  }, [loadTime]);

  const handleImageError = useCallback(() => {
    console.warn(`Failed to load image: ${photo.filename}`);
    performanceMonitor.trackCustomMetric('image_load_error', 1, 'count');
  }, [photo.filename]);

  return (
    <div className="group relative h-full overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg active:scale-95">
      <div className="relative aspect-square">
        <LazyImage
          src={imageUrl}
          alt={photo.filename}
          className="h-full w-full"
          onLoad={handleImageLoad}
          onError={handleImageError}
          fetchPriority={priority ? 'high' : 'low'}
        />

        {/* Apple-grade hover overlay with spring animation */}
        <div className="absolute inset-0 bg-black bg-opacity-0 transition-all duration-300 ease-out group-hover:bg-opacity-20">
          <div className="absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="apple-focus transform rounded-full bg-white bg-opacity-90 p-3 transition-all duration-200 ease-out hover:scale-110 hover:bg-opacity-100 hover:shadow-lg active:scale-95"
              title="Ver foto completa"
              aria-label={`Ver foto ${photo.filename}`}
            >
              <svg
                className="h-5 w-5 text-foreground"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Selection checkbox */}
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`flex h-6 w-6 transform items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              isSelected
                ? 'border-purple-600 bg-purple-600 text-white shadow-lg'
                : 'border-border bg-white shadow-sm hover:border-purple-400'
            }`}
            aria-label={isSelected ? 'Deseleccionar foto' : 'Seleccionar foto'}
          >
            {isSelected && (
              <svg
                className="h-3 w-3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Photo info */}
      <div className="bg-white p-3">
        <div className="truncate text-xs font-medium text-gray-500">
          {photo.filename}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {new Date(photo.created_at).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
        {loadTime && (
          <div className="mt-1 text-xs text-green-500">
            Cargada en {loadTime.toFixed(0)}ms
          </div>
        )}
      </div>
    </div>
  );
}

interface GridCellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    photos: Photo[];
    columns: number;
    selectedPhotos: Set<string>;
    onTogglePhoto: (photo: Photo) => void;
    onViewPhoto: (photo: Photo) => void;
  };
}

function GridCell({ columnIndex, rowIndex, style, data }: GridCellProps) {
  const { photos, columns, selectedPhotos, onTogglePhoto, onViewPhoto } = data;
  const photoIndex = rowIndex * columns + columnIndex;
  const photo = photos[photoIndex];

  if (!photo) {
    return <div style={style} />;
  }

  const isSelected = selectedPhotos.has(photo.id);
  const isPriority = photoIndex < 10; // First 10 photos get priority loading

  return (
    <div style={style} className="p-2">
      <OptimizedPhotoCard
        photo={photo}
        isSelected={isSelected}
        onToggle={() => onTogglePhoto(photo)}
        onView={() => onViewPhoto(photo)}
        priority={isPriority}
      />
    </div>
  );
}

export function OptimizedPhotoGrid({
  photos,
  selectedPhotos,
  onTogglePhoto,
  onViewPhoto,
  loading,
  loadMore,
  hasMore,
  className = '',
  itemSize = 200,
  overscan = 2,
}: OptimizedPhotoGridProps) {
  const gridRef = useRef<Grid>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);

  // Responsive columns calculation
  const columns = useMemo(() => {
    if (containerWidth < 640) return 2; // mobile
    if (containerWidth < 768) return 3; // tablet
    if (containerWidth < 1024) return 4; // desktop small
    if (containerWidth < 1280) return 5; // desktop medium
    return 6; // desktop large
  }, [containerWidth]);

  const rows = Math.ceil(photos.length / columns);
  const itemWidth = Math.floor((containerWidth - (columns + 1) * 16) / columns);
  const itemHeight = itemWidth + 60; // Add space for photo info

  // Grid data for virtualization
  const gridData = useMemo(
    () => ({
      photos,
      columns,
      selectedPhotos,
      onTogglePhoto,
      onViewPhoto,
    }),
    [photos, columns, selectedPhotos, onTogglePhoto, onViewPhoto]
  );

  // Intersection observer for infinite loading
  useEffect(() => {
    if (!loadMoreRef.current || !loadMore || !hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  // Container width detection using ResizeObserver for accuracy
  useEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth;
      if (w && Math.abs(w - containerWidth) > 1) setContainerWidth(w);
    };

    // Initial measure
    measure();

    // Listen to window resize
    const onResize = () => measure();
    window.addEventListener('resize', onResize);

    // Observe element resize
    let ro: ResizeObserver | undefined;
    if ('ResizeObserver' in window && containerRef.current) {
      ro = new ResizeObserver(() => measure());
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [containerWidth]);

  // Performance tracking
  useEffect(() => {
    if (photos.length > 0) {
      performanceMonitor.trackCustomMetric(
        'grid_photos_rendered',
        photos.length,
        'count'
      );
    }
  }, [photos.length]);

  if (photos.length === 0 && !loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 ${className}`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-500 dark:text-gray-400">
          No hay fotos disponibles
        </h3>
        <p className="max-w-md text-center text-sm text-gray-500">
          Aún no se han subido fotos o no tienes fotos asignadas.
        </p>
      </div>
    );
  }

  const gridHeight = Math.min(600, rows * itemHeight);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {/* Stats bar */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <div className="text-gray-500 dark:text-gray-400">
          <span className="font-medium">{photos.length}</span> fotos disponibles
        </div>
        <div className="flex items-center space-x-4">
          <div className="font-medium text-purple-600">
            <span className="font-bold">{selectedPhotos.size}</span>{' '}
            seleccionadas
          </div>
          {selectedPhotos.size > 0 && (
            <button
              onClick={() => {
                photos.forEach((photo) => {
                  if (selectedPhotos.has(photo.id)) {
                    onTogglePhoto(photo);
                  }
                });
              }}
              className="text-xs text-gray-500 transition-colors duration-200 hover:text-red-600"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </div>

      {/* Virtual Grid */}
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        <Grid
          ref={gridRef}
          height={gridHeight}
          width={containerWidth}
          columnCount={columns}
          rowCount={rows}
          columnWidth={itemWidth}
          rowHeight={itemHeight}
          itemData={gridData}
          overscanRowCount={overscan}
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        >
          {GridCell}
        </Grid>
      </div>

      {/* Infinite loading trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="mt-4 flex h-20 items-center justify-center"
        >
          {loading ? (
            <div className="flex items-center space-x-2 text-purple-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
              <span className="text-sm font-medium">Cargando más fotos...</span>
            </div>
          ) : (
            <button
              onClick={loadMore}
              className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-purple-700"
            >
              Cargar más fotos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
