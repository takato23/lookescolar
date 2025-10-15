'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { Subject } from '@/lib/services/family.service';
import { VirtualPhotoGrid } from '@/components/ui/virtual-photo-grid';
import { PhotoLightbox } from '@/components/family/PhotoLightbox';
import {
  PhotoFilters,
  type FiltersState,
} from '@/components/family/PhotoFilters';
import { GalleryHeader } from '@/components/family/GalleryHeader';
import { ThemedGalleryWrapper } from '@/components/gallery/ThemedGalleryWrapper';

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url: string;
  preview_url?: string;
  watermark_url?: string;
  assignment_id?: string;
  engagement?: {
    is_favorite: boolean;
    in_cart_quantity: number;
    purchased_quantity: number;
  };
}

interface GalleryStats {
  totalPhotos: number;
  totalFavorites: number;
  totalInCart: number;
  totalPurchased: number;
}

interface GalleryState {
  allPhotos: Photo[];
  filteredPhotos: Photo[];
  currentPage: number;
  hasMore: boolean;
  total: number;
  stats: GalleryStats;
}

interface EnhancedGalleryPhoto {
  id: string;
  filename: string;
  preview_url?: string;
  watermark_url?: string;
  storage_path?: string;
  created_at: string;
  taken_at?: string | null;
  engagement?: {
    is_favorite?: boolean;
    in_cart_quantity?: number;
    purchased_quantity?: number;
  };
}

interface EnhancedGalleryResponse {
  success: boolean;
  photos: EnhancedGalleryPhoto[];
  pagination: {
    current_page: number;
    total_pages?: number;
    total_photos: number;
    has_more: boolean;
    per_page: number;
  };
  stats: {
    total_photos: number;
    total_favorites: number;
    total_in_cart: number;
    total_purchased: number;
  };
  error?: string;
}

interface FamilyGalleryProps {
  token: string;
  subjectInfo: Subject;
}

const EMPTY_STATS: GalleryStats = {
  totalPhotos: 0,
  totalFavorites: 0,
  totalInCart: 0,
  totalPurchased: 0,
};

export function FamilyGallery({ token, subjectInfo }: FamilyGalleryProps) {
  const [filters, setFilters] = useState<FiltersState>({
    search: '',
    dateRange: {},
    engagement: 'all',
  });
  const filtersRef = useRef<FiltersState>(filters);

  const [galleryState, setGalleryState] = useState<GalleryState>({
    allPhotos: [],
    filteredPhotos: [],
    currentPage: 0,
    hasMore: true,
    total: 0,
    stats: EMPTY_STATS,
  });
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const favoritesRef = useRef<Set<string>>(favorites);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [signedUrlCache, setSignedUrlCache] = useState<
    Map<string, { url: string; expires: number }>
  >(new Map());

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  const applyFilters = useCallback(
    (photos: Photo[], currentFilters: FiltersState) => {
      return photos.filter((photo) => {
        if (currentFilters.search) {
          const searchTerm = currentFilters.search.toLowerCase();
          if (!photo.filename.toLowerCase().includes(searchTerm)) {
            return false;
          }
        }

        if (currentFilters.dateRange.from || currentFilters.dateRange.to) {
          const photoDate = new Date(photo.created_at);
          if (
            currentFilters.dateRange.from &&
            photoDate < new Date(currentFilters.dateRange.from)
          ) {
            return false;
          }
          if (
            currentFilters.dateRange.to &&
            photoDate > new Date(currentFilters.dateRange.to)
          ) {
            return false;
          }
        }

        const engagement = photo.engagement;
        switch (currentFilters.engagement) {
          case 'favorites':
            return Boolean(engagement?.is_favorite);
          case 'purchased':
            return (engagement?.purchased_quantity ?? 0) > 0;
          case 'unpurchased':
            return (engagement?.purchased_quantity ?? 0) === 0;
          default:
            return true;
        }
      });
    },
    []
  );

  const mapPhoto = useCallback((photo: EnhancedGalleryPhoto): Photo => {
    const fallbackUrl =
      photo.preview_url ?? photo.watermark_url ?? photo.storage_path ?? '';

    return {
      id: photo.id,
      filename: photo.filename,
      storage_path: fallbackUrl,
      created_at: photo.created_at,
      signed_url: fallbackUrl,
      preview_url: photo.preview_url,
      watermark_url: photo.watermark_url,
      engagement: {
        is_favorite: Boolean(photo.engagement?.is_favorite),
        in_cart_quantity: photo.engagement?.in_cart_quantity ?? 0,
        purchased_quantity: photo.engagement?.purchased_quantity ?? 0,
      },
    };
  }, []);

  const fetchGalleryPage = useCallback(
    async (
      page: number,
      options?: { append?: boolean; filters?: FiltersState }
    ) => {
      const append = options?.append ?? false;
      const activeFilters = options?.filters ?? filtersRef.current;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (activeFilters.search) {
        params.set('search', activeFilters.search);
      }

      if (activeFilters.engagement !== 'all') {
        params.set('filter_by', activeFilters.engagement);
      }

      try {
        if (append) {
          setLoading(true);
        } else {
          setInitialLoading(true);
          setError(null);
        }

        const response = await fetch(
          `/api/family/gallery-enhanced/${token}?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Error al cargar las fotos');
        }

        const data = (await response.json()) as EnhancedGalleryResponse;

        if (!data.success) {
          throw new Error(data.error || 'Error al cargar las fotos');
        }

        const normalizedPhotos = data.photos.map(mapPhoto);
        let mergedPhotos: Photo[] = [];

        setGalleryState((prev) => {
          mergedPhotos = append
            ? [...prev.allPhotos, ...normalizedPhotos]
            : normalizedPhotos;

          const filtered = applyFilters(mergedPhotos, activeFilters);

          return {
            allPhotos: mergedPhotos,
            filteredPhotos: filtered,
            currentPage: data.pagination.current_page,
            hasMore: data.pagination.has_more,
            total: data.pagination.total_photos,
            stats: {
              totalPhotos: data.stats.total_photos,
              totalFavorites: data.stats.total_favorites,
              totalInCart: data.stats.total_in_cart,
              totalPurchased: data.stats.total_purchased,
            },
          };
        });

        const favoriteIds = mergedPhotos
          .filter((photo) => photo.engagement?.is_favorite)
          .map((photo) => photo.id);
        const nextFavorites = new Set(favoriteIds);
        setFavorites(nextFavorites);
        favoritesRef.current = nextFavorites;
      } catch (err) {
        console.error('Error loading gallery:', err);
        if (!append) {
          setError(err instanceof Error ? err.message : 'Error desconocido');
        }
      } finally {
        if (append) {
          setLoading(false);
        } else {
          setInitialLoading(false);
        }
      }
    },
    [token, applyFilters, mapPhoto]
  );

  useEffect(() => {
    setGalleryState({
      allPhotos: [],
      filteredPhotos: [],
      currentPage: 0,
      hasMore: true,
      total: 0,
      stats: EMPTY_STATS,
    });
    setSelectedPhotos(new Set());
    setFavorites(new Set());
    favoritesRef.current = new Set();
    void fetchGalleryPage(1);
  }, [fetchGalleryPage]);

  useEffect(() => {
    const savedCart = sessionStorage.getItem(`cart_${token}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart) as Array<{ photo_id: string }>;
        setSelectedPhotos(new Set(cartData.map((item) => item.photo_id)));
      } catch (err) {
        console.warn('Error loading cart from storage:', err);
      }
    }

    const savedCache = sessionStorage.getItem(`signed_urls_${token}`);
    if (savedCache) {
      try {
        const cacheData = JSON.parse(savedCache) as Record<
          string,
          { url: string; expires: number }
        >;

        const validCache = new Map<string, { url: string; expires: number }>();
        const now = Date.now();

        Object.entries(cacheData).forEach(([key, value]) => {
          if (value.expires > now) {
            validCache.set(key, value);
          }
        });

        setSignedUrlCache(validCache);
      } catch (err) {
        console.warn('Error loading signed URL cache:', err);
      }
    }
  }, [token]);

  const saveCartToStorage = useCallback(
    (photoIds: Set<string>) => {
      const cartItems = Array.from(photoIds).map((id) => {
        const photo = galleryState.allPhotos.find((p) => p.id === id);
        return {
          photo_id: id,
          filename: photo?.filename || '',
          quantity: 1,
          price: 0,
        };
      });

      sessionStorage.setItem(`cart_${token}`, JSON.stringify(cartItems));

      window.dispatchEvent(
        new CustomEvent('cartUpdated', {
          detail: { items: cartItems, token },
        })
      );
    },
    [galleryState.allPhotos, token]
  );

  const togglePhotoSelection = useCallback(
    (photo: Photo) => {
      const newSelection = new Set(selectedPhotos);

      if (newSelection.has(photo.id)) {
        newSelection.delete(photo.id);
      } else {
        newSelection.add(photo.id);
      }

      setSelectedPhotos(newSelection);
      saveCartToStorage(newSelection);
    },
    [selectedPhotos, saveCartToStorage]
  );

  const toggleFavorite = useCallback(
    async (photoId: string) => {
      const currentFavorites = new Set(favoritesRef.current);
      const isFavorite = currentFavorites.has(photoId);
      const optimisticFavorites = new Set(currentFavorites);

      if (isFavorite) {
        optimisticFavorites.delete(photoId);
      } else {
        optimisticFavorites.add(photoId);
      }

      setFavorites(optimisticFavorites);
      favoritesRef.current = optimisticFavorites;

      let previousStats: GalleryStats | null = null;

      setGalleryState((prev) => {
        const updatedPhotos = prev.allPhotos.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                engagement: {
                  ...photo.engagement,
                  is_favorite: !isFavorite,
                },
              }
            : photo
        );

        const filtered = applyFilters(updatedPhotos, filtersRef.current);
        previousStats = prev.stats;
        const delta = isFavorite ? -1 : 1;

        return {
          ...prev,
          allPhotos: updatedPhotos,
          filteredPhotos: filtered,
          stats: {
            ...prev.stats,
            totalFavorites: Math.max(0, prev.stats.totalFavorites + delta),
          },
        };
      });

      try {
        let response: Response;
        if (isFavorite) {
          response = await fetch(
            `/api/public/share/${token}/favorites?assetId=${photoId}`,
            { method: 'DELETE' }
          );
        } else {
          response = await fetch(`/api/public/share/${token}/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assetId: photoId }),
          });
        }

        if (!response.ok) {
          throw new Error('No se pudo actualizar el favorito');
        }
      } catch (err) {
        console.error('Error toggling favorite:', err);
        const revertedFavorites = new Set(currentFavorites);
        setFavorites(revertedFavorites);
        favoritesRef.current = revertedFavorites;

        setGalleryState((prev) => {
          const updatedPhotos = prev.allPhotos.map((photo) =>
            photo.id === photoId
              ? {
                  ...photo,
                  engagement: {
                    ...photo.engagement,
                    is_favorite: isFavorite,
                  },
                }
              : photo
          );
          const filtered = applyFilters(updatedPhotos, filtersRef.current);

          return {
            ...prev,
            allPhotos: updatedPhotos,
            filteredPhotos: filtered,
            stats: previousStats ?? prev.stats,
          };
        });
      }
    },
    [token, applyFilters]
  );

  const updateFilters = useCallback(
    (partial: Partial<FiltersState>) => {
      setFilters((prev) => {
        const updated = { ...prev, ...partial };
        filtersRef.current = updated;
        void fetchGalleryPage(1, { append: false, filters: updated });
        return updated;
      });
    },
    [fetchGalleryPage]
  );

  const getSignedUrl = useCallback(
    async (photo: Photo): Promise<string> => {
      const now = Date.now();
      const cached = signedUrlCache.get(photo.id);

      if (cached && cached.expires > now) {
        return cached.url;
      }

      if (photo.signed_url) {
        const expires = now + 3600 * 1000;
        const newCache = new Map(signedUrlCache);
        newCache.set(photo.id, { url: photo.signed_url, expires });
        setSignedUrlCache(newCache);
        sessionStorage.setItem(
          `signed_urls_${token}`,
          JSON.stringify(Object.fromEntries(newCache))
        );
        return photo.signed_url;
      }

      return photo.signed_url;
    },
    [signedUrlCache, token]
  );

  const openLightbox = useCallback((photo: Photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  }, []);

  const design = (subjectInfo as any)?.event?.settings?.design || {};
  const gapClass = design?.grid?.spacing === 'large' ? 'gap-6' : 'gap-4';
  const colsClass =
    design?.grid?.thumb === 'large'
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
      : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  const eventTheme = ((subjectInfo as any)?.event?.theme || 'default') as any;

  const headerStats = useMemo(
    () => ({
      totalFavorites: galleryState.stats.totalFavorites,
      totalInCart: galleryState.stats.totalInCart,
      totalPurchased: galleryState.stats.totalPurchased,
      totalUnpurchased: Math.max(
        0,
        galleryState.stats.totalPhotos - galleryState.stats.totalPurchased
      ),
    }),
    [galleryState.stats]
  );

  const loadMorePhotos = useCallback(() => {
    if (loading || !galleryState.hasMore) return;
    void fetchGalleryPage(galleryState.currentPage + 1, { append: true });
  }, [loading, galleryState.hasMore, galleryState.currentPage, fetchGalleryPage]);

  if (initialLoading) {
    return <GallerySkeleton colsClass={colsClass} gapClass={gapClass} />;
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <span className="text-2xl text-red-500">⚠️</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-red-600">
          Error al cargar fotos
        </h3>
        <p className="mb-4 text-sm text-red-500">{error}</p>
        <button
          onClick={() => void fetchGalleryPage(1)}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const displayPhotos = galleryState.filteredPhotos;

  return (
    <ThemedGalleryWrapper eventTheme={eventTheme}>
      <div id="gallery" className="space-y-6">
        <GalleryHeader
          totalPhotos={galleryState.stats.totalPhotos || galleryState.total}
          displayedPhotos={displayPhotos.length}
          selectedCount={selectedPhotos.size}
          stats={headerStats}
          onSelectAll={() => {
            displayPhotos.forEach((photo) => {
              if (!selectedPhotos.has(photo.id)) {
                togglePhotoSelection(photo);
              }
            });
          }}
          onClearSelection={() => {
            displayPhotos.forEach((photo) => {
              if (selectedPhotos.has(photo.id)) {
                togglePhotoSelection(photo);
              }
            });
          }}
        />

        <PhotoFilters
          filters={filters}
          onUpdateFilters={updateFilters}
          totalPhotos={galleryState.stats.totalPhotos || galleryState.allPhotos.length}
          filteredPhotos={displayPhotos.length}
          stats={galleryState.stats}
        />

        <VirtualPhotoGrid
          photos={displayPhotos}
          selectedPhotos={selectedPhotos}
          favorites={favorites}
          onTogglePhoto={togglePhotoSelection}
          onToggleFavorite={toggleFavorite}
          onViewPhoto={openLightbox}
          loading={loading}
          loadMore={loadMorePhotos}
          hasMore={galleryState.hasMore}
          getSignedUrl={getSignedUrl}
          className="min-h-[400px]"
        />

        <PhotoLightbox
          isOpen={lightboxOpen}
          photos={displayPhotos}
          currentPhoto={selectedPhoto}
          onClose={() => {
            setLightboxOpen(false);
            setSelectedPhoto(null);
          }}
          onToggleSelection={togglePhotoSelection}
          onToggleFavorite={toggleFavorite}
          selectedPhotos={selectedPhotos}
          favorites={favorites}
          getSignedUrl={getSignedUrl}
        />
      </div>
    </ThemedGalleryWrapper>
  );
}

function GallerySkeleton({
  colsClass,
  gapClass,
}: {
  colsClass: string;
  gapClass: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      <div className={`grid ${colsClass} ${gapClass}`}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg bg-white shadow-sm"
          >
            <div className="aspect-square animate-pulse bg-gray-200" />
            <div className="space-y-2 p-3">
              <div className="h-3 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
