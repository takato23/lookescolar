'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Subject } from '@/lib/services/family.service';
import { VirtualPhotoGrid } from '@/components/ui/virtual-photo-grid';
import { PhotoLightbox } from '@/components/family/PhotoLightbox';
import { PhotoFilters } from '@/components/family/PhotoFilters';
import { GalleryHeader } from '@/components/family/GalleryHeader';

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url: string;
  assignment_id: string;
}

interface GalleryData {
  photos: Photo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    total_pages: number;
  };
}

interface GalleryState {
  allPhotos: Photo[];
  filteredPhotos: Photo[];
  currentPage: number;
  hasMore: boolean;
  total: number;
  filters: {
    search: string;
    dateRange: { from?: string; to?: string };
    favorites: boolean;
  };
}

interface FamilyGalleryProps {
  token: string;
  subjectInfo: Subject;
}

export function FamilyGallery({ token, subjectInfo }: FamilyGalleryProps) {
  const [galleryState, setGalleryState] = useState<GalleryState>({
    allPhotos: [],
    filteredPhotos: [],
    currentPage: 0,
    hasMore: true,
    total: 0,
    filters: {
      search: '',
      dateRange: {},
      favorites: false,
    },
  });
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [signedUrlCache, setSignedUrlCache] = useState<
    Map<string, { url: string; expires: number }>
  >(new Map());

  // Load initial gallery
  const loadInitialGallery = useCallback(async () => {
    try {
      setInitialLoading(true);
      setError(null);
      const response = await fetch(
        `/api/family/gallery/${token}?page=1&limit=20`
      );

      if (!response.ok) {
        throw new Error('Error al cargar las fotos');
      }

      const data: GalleryData = await response.json();

      setGalleryState((prev) => ({
        ...prev,
        allPhotos: data.photos,
        filteredPhotos: data.photos,
        currentPage: 1,
        hasMore: data.pagination.has_more,
        total: data.pagination.total,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error loading gallery:', err);
    } finally {
      setInitialLoading(false);
    }
  }, [token]);

  // Load more photos for infinite scroll
  const loadMorePhotos = useCallback(async () => {
    if (loading || !galleryState.hasMore) return;

    try {
      setLoading(true);
      const nextPage = galleryState.currentPage + 1;
      const response = await fetch(
        `/api/family/gallery/${token}?page=${nextPage}&limit=20`
      );

      if (!response.ok) {
        throw new Error('Error al cargar más fotos');
      }

      const data: GalleryData = await response.json();

      setGalleryState((prev) => {
        const newAllPhotos = [...prev.allPhotos, ...data.photos];
        return {
          ...prev,
          allPhotos: newAllPhotos,
          filteredPhotos: applyFilters(newAllPhotos, prev.filters),
          currentPage: nextPage,
          hasMore: data.pagination.has_more,
          total: data.pagination.total,
        };
      });
    } catch (err) {
      console.error('Error loading more photos:', err);
      // Don't set error state for load more failures, just log them
    } finally {
      setLoading(false);
    }
  }, [token, loading, galleryState.hasMore, galleryState.currentPage]);

  // Load initial gallery
  useEffect(() => {
    loadInitialGallery();
  }, [loadInitialGallery]);

  // Aplicar filtros a las fotos
  const applyFilters = useCallback(
    (photos: Photo[], filters: GalleryState['filters']) => {
      return photos.filter((photo) => {
        // Filtro de búsqueda por nombre de archivo
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          if (!photo.filename.toLowerCase().includes(searchTerm)) {
            return false;
          }
        }

        // Filtro de rango de fechas
        if (filters.dateRange.from || filters.dateRange.to) {
          const photoDate = new Date(photo.created_at);
          if (
            filters.dateRange.from &&
            photoDate < new Date(filters.dateRange.from)
          ) {
            return false;
          }
          if (
            filters.dateRange.to &&
            photoDate > new Date(filters.dateRange.to)
          ) {
            return false;
          }
        }

        // Filtro de favoritos
        if (filters.favorites && !favorites.has(photo.id)) {
          return false;
        }

        return true;
      });
    },
    [favorites]
  );

  // Cargar carrito y favoritos desde sessionStorage
  useEffect(() => {
    const savedCart = sessionStorage.getItem(`cart_${token}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        setSelectedPhotos(new Set(cartData.map((item: any) => item.photo_id)));
      } catch (err) {
        console.warn('Error loading cart from storage:', err);
      }
    }

    const savedFavorites = localStorage.getItem(`favorites_${token}`);
    if (savedFavorites) {
      try {
        const favoriteIds = JSON.parse(savedFavorites);
        setFavorites(new Set(favoriteIds));
      } catch (err) {
        console.warn('Error loading favorites from storage:', err);
      }
    }

    // Cargar cache de URLs firmadas
    const savedCache = sessionStorage.getItem(`signed_urls_${token}`);
    if (savedCache) {
      try {
        const cacheData = JSON.parse(savedCache);
        const validCache = new Map();
        const now = Date.now();

        Object.entries(cacheData).forEach(([key, value]: [string, any]) => {
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

  // Save cart to sessionStorage
  const saveCartToStorage = useCallback(
    (photoIds: Set<string>) => {
      const cartItems = Array.from(photoIds).map((id) => {
        const photo = galleryState.allPhotos.find((p) => p.id === id);
        return {
          photo_id: id,
          filename: photo?.filename || '',
          quantity: 1,
          price: 0, // Will be calculated in cart
        };
      });

      sessionStorage.setItem(`cart_${token}`, JSON.stringify(cartItems));

      // Dispatch event para que el carrito se actualice
      window.dispatchEvent(
        new CustomEvent('cartUpdated', {
          detail: { items: cartItems, token },
        })
      );
    },
    [galleryState.allPhotos, token]
  );

  // Toggle photo selection
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

  // Toggle favorito
  const toggleFavorite = useCallback(
    (photoId: string) => {
      const newFavorites = new Set(favorites);
      if (newFavorites.has(photoId)) {
        newFavorites.delete(photoId);
      } else {
        newFavorites.add(photoId);
      }

      setFavorites(newFavorites);
      localStorage.setItem(
        `favorites_${token}`,
        JSON.stringify(Array.from(newFavorites))
      );

      // Actualizar fotos filtradas si está activo el filtro de favoritos
      if (galleryState.filters.favorites) {
        setGalleryState((prev) => ({
          ...prev,
          filteredPhotos: applyFilters(prev.allPhotos, prev.filters),
        }));
      }
    },
    [
      favorites,
      token,
      galleryState.filters,
      galleryState.allPhotos,
      applyFilters,
    ]
  );

  // Actualizar filtros
  const updateFilters = useCallback(
    (newFilters: Partial<GalleryState['filters']>) => {
      setGalleryState((prev) => {
        const updatedFilters = { ...prev.filters, ...newFilters };
        return {
          ...prev,
          filters: updatedFilters,
          filteredPhotos: applyFilters(prev.allPhotos, updatedFilters),
        };
      });
    },
    [galleryState.allPhotos, applyFilters]
  );

  // Obtener URL firmada desde datos ya firmados o cache local (sin pedir al endpoint de dev)
  const getSignedUrl = useCallback(
    async (photo: Photo): Promise<string> => {
      const now = Date.now();
      const cached = signedUrlCache.get(photo.id);

      if (cached && cached.expires > now) {
        return cached.url;
      }

      // Preferir la URL firmada provista por el server; si existe, cachear su expiración aproximada
      if (photo.signed_url) {
        const expires = now + 3600 * 1000; // 1 hora por defecto si no viene metadata
        const newCache = new Map(signedUrlCache);
        newCache.set(photo.id, { url: photo.signed_url, expires });
        setSignedUrlCache(newCache);
        const cacheObject = Object.fromEntries(newCache);
        sessionStorage.setItem(`signed_urls_${token}`, JSON.stringify(cacheObject));
        return photo.signed_url;
      }

      return photo.signed_url;
    },
    [signedUrlCache, token]
  );

  // Abrir lightbox con foto específica
  const openLightbox = useCallback((photo: Photo) => {
    setSelectedPhoto(photo);
    setLightboxOpen(true);
  }, []);

  if (initialLoading) {
    return <GallerySkeleton />;
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
          onClick={loadInitialGallery}
          className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Fotos para mostrar (filtradas o todas)
  const displayPhotos = galleryState.filteredPhotos;

  return (
    <div id="gallery" className="space-y-6">
      {/* Header con estadísticas y controles */}
      <GalleryHeader
        totalPhotos={galleryState.total}
        displayedPhotos={displayPhotos.length}
        selectedCount={selectedPhotos.size}
        favoritesCount={favorites.size}
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

      {/* Filtros */}
      <PhotoFilters
        filters={galleryState.filters}
        onUpdateFilters={updateFilters}
        totalPhotos={galleryState.allPhotos.length}
        filteredPhotos={displayPhotos.length}
      />

      {/* Grid Virtual */}
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

      {/* Lightbox Modal */}
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
  );
}

// Modal para ver foto completa
interface PhotoModalProps {
  photo: Photo;
  onClose: () => void;
  isSelected: boolean;
  onToggle: () => void;
}

function PhotoModal({ photo, onClose, isSelected, onToggle }: PhotoModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-white p-4">
          <div>
            <h3 className="truncate font-semibold text-gray-800">
              {photo.filename}
            </h3>
            <p className="text-sm text-gray-500">
              {new Date(photo.created_at).toLocaleDateString('es-AR')}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggle}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isSelected ? '✓ Seleccionada' : 'Seleccionar'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 transition-colors hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative max-h-[70vh] overflow-auto">
          <img
            src={photo.signed_url}
            alt={photo.filename}
            className="h-auto w-full"
          />
        </div>
      </div>
    </div>
  );
}

// Skeleton loading
function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
