/**
 * Apple-Grade Lazy Photo Gallery with Enhanced Performance
 * Optimizes loading performance with sophisticated micro-interactions
 */

'use client';

import { Suspense, lazy, useState, useEffect, useMemo, useCallback } from 'react';
import { performanceMonitor } from '@/lib/utils/performance-monitor';
import { useSignedUrl, preloadPhotoUrls } from '@/lib/utils/signed-url-cache';

// Lazy load heavy components
const VirtualPhotoGrid = lazy(() =>
  import('@/components/ui/virtual-photo-grid').then((module) => ({
    default: module.VirtualPhotoGrid,
  }))
);

const PhotoModal = lazy(() =>
  import('@/components/gallery/PhotoModal').then((module) => ({
    default: module.PhotoModal,
  }))
);

const ShoppingCart = lazy(() =>
  import('@/components/family/ShoppingCart').then((module) => ({
    default: module.ShoppingCart,
  }))
);

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url?: string;
  assignment_id?: string;
}

interface LazyPhotoGalleryProps {
  photos: Photo[];
  eventId?: string;
  familyMode?: boolean;
  onPhotoSelect?: (photo: Photo) => void;
  onPhotoView?: (photo: Photo) => void;
  className?: string;
}

// Apple-grade loading skeleton with shimmer effect
function PhotoGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-4 w-32 animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"></div>
        <div className="h-4 w-24 animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]"></div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]"
            style={{
              animationDelay: `${i * 50}ms`,
              animation: 'shimmer 1.5s infinite ease-in-out'
            }}
          >
            <div className="h-full w-full rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 opacity-50"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading skeleton for modal
function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] max-w-4xl overflow-hidden rounded-lg bg-white p-6">
        <div className="mb-4 aspect-video animate-pulse rounded-lg bg-gray-200"></div>
        <div className="space-y-2">
          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200"></div>
          <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}

// Loading skeleton for cart
function CartSkeleton() {
  return (
    <div className="fixed bottom-4 right-4 rounded-lg border bg-white p-4 shadow-lg">
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 animate-pulse rounded bg-gray-200"></div>
        <div className="space-y-1">
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200"></div>
          <div className="h-2 w-12 animate-pulse rounded bg-gray-200"></div>
        </div>
      </div>
    </div>
  );
}

export function LazyPhotoGallery({
  photos,
  eventId,
  familyMode = false,
  onPhotoSelect,
  onPhotoView,
  className = '',
}: LazyPhotoGalleryProps) {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [photosWithUrls, setPhotosWithUrls] = useState<Photo[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const photosPerPage = 50; // Load photos in batches

  // Paginated photos for performance
  const currentPhotos = useMemo(() => {
    return photos.slice(0, page * photosPerPage);
  }, [photos, page]);

  // Enhanced performance tracking with Apple-grade metrics
  const trackPerformanceMetrics = useCallback((metrics: {
    photosLoaded: number;
    loadTime: number;
    cacheHitRate: number;
  }) => {
    performanceMonitor.trackGalleryPerformance({
      ...metrics,
      virtualScrollEnabled: true,
      // Apple-grade performance thresholds
      isOptimal: metrics.loadTime < 150 && metrics.cacheHitRate > 75,
      userExperience: metrics.loadTime < 150 ? 'excellent' : 
                     metrics.loadTime < 300 ? 'good' : 'needs_improvement'
    });
    
    // Log performance insights for Apple-grade optimization
    if (metrics.loadTime > 200) {
      console.warn(`Gallery load time: ${metrics.loadTime.toFixed(2)}ms - consider optimizing`);
    }
  }, []);
  useEffect(() => {
    let isMounted = true;

    async function loadPhotoUrls() {
      setLoading(true);
      const timer = performance.now();

      try {
        // Get photo IDs that need URLs
        const photoIds = currentPhotos
          .filter((photo) => !photo.signed_url)
          .map((photo) => photo.id);

        if (photoIds.length > 0) {
          // Batch load signed URLs
          const urlMap = await preloadPhotoUrls(photoIds);

          if (isMounted) {
            // Merge URLs with photos
            const photosWithSignedUrls = currentPhotos.map((photo) => ({
              ...photo,
              signed_url: photo.signed_url || urlMap.get(photo.id) || '',
            }));

            setPhotosWithUrls(photosWithSignedUrls);
          }
        } else {
          if (isMounted) {
            setPhotosWithUrls(currentPhotos);
          }
        }

        // Track gallery performance
        const loadTime = performance.now() - timer;
        performanceMonitor.trackGalleryPerformance({
          photosLoaded: currentPhotos.length,
          loadTime,
          virtualScrollEnabled: true,
          cacheHitRate:
            ((currentPhotos.length - photoIds.length) / currentPhotos.length) *
            100,
        });
      } catch (error) {
        console.error('Failed to load photo URLs:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    loadPhotoUrls();

    return () => {
      isMounted = false;
    };
  }, [currentPhotos]);

  // Check if there are more photos to load
  useEffect(() => {
    setHasMore(currentPhotos.length < photos.length);
  }, [currentPhotos.length, photos.length]);

  const handleTogglePhoto = (photo: Photo) => {
    const newSelection = new Set(selectedPhotos);

    if (newSelection.has(photo.id)) {
      newSelection.delete(photo.id);
    } else {
      newSelection.add(photo.id);
    }

    setSelectedPhotos(newSelection);
    onPhotoSelect?.(photo);
  };

  const handleViewPhoto = (photo: Photo) => {
    setViewingPhoto(photo);
    onPhotoView?.(photo);

    // Track photo view performance
    performanceMonitor.trackCustomMetric(
      'photo_modal_open',
      performance.now(),
      'ms'
    );
  };

  const handleCloseModal = () => {
    setViewingPhoto(null);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setPage((prev) => prev + 1);
  };

  if (loading && photosWithUrls.length === 0) {
    return (
      <div className={className}>
        <PhotoGridSkeleton />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Photo Grid */}
      <Suspense fallback={<PhotoGridSkeleton />}>
        <VirtualPhotoGrid
          photos={photosWithUrls}
          selectedPhotos={selectedPhotos}
          onTogglePhoto={handleTogglePhoto}
          onViewPhoto={handleViewPhoto}
          loading={loadingMore}
          loadMore={loadMore}
          hasMore={hasMore}
          className="min-h-[600px]"
        />
      </Suspense>

      {/* Photo Modal */}
      {viewingPhoto && (
        <Suspense fallback={<ModalSkeleton />}>
          <PhotoModal
            photo={viewingPhoto}
            onClose={handleCloseModal}
            onToggleSelect={() => handleTogglePhoto(viewingPhoto)}
            isSelected={selectedPhotos.has(viewingPhoto.id)}
            familyMode={familyMode}
          />
        </Suspense>
      )}

      {/* Shopping Cart (Family mode only) */}
      {familyMode && selectedPhotos.size > 0 && (
        <Suspense fallback={<CartSkeleton />}>
          <ShoppingCart
            selectedPhotos={Array.from(selectedPhotos)}
            photos={photosWithUrls}
            eventId={eventId}
          />
        </Suspense>
      )}
    </div>
  );
}

// Export optimized component with preloading
export default LazyPhotoGallery;

// Preload heavy components for better UX
export function preloadGalleryComponents() {
  // Preload components when user is likely to need them
  if (typeof window !== 'undefined') {
    // Preload after initial page load
    setTimeout(() => {
      import('@/components/ui/virtual-photo-grid');
      import('@/components/gallery/PhotoModal');
      if (window.location.pathname.includes('/f/')) {
        import('@/components/family/ShoppingCart');
      }
    }, 2000);
  }
}
