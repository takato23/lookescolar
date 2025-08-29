'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhotoCard } from '@/components/public/PhotoCard';
import { PhotoModal } from '@/components/public/PhotoModal';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';

interface Photo {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  signed_url: string;
}

interface GalleryData {
  event: {
    id: string;
    name: string;
    school: string;
    date: string;
    created_at: string;
  };
  photos: Photo[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
    total_pages: number;
  };
}

interface PublicGalleryProps {
  eventId: string;
}

export function PublicGallery({ eventId }: PublicGalleryProps) {
  const [galleryData, setGalleryData] = useState<GalleryData | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'todas' | 'tu-hijo' | 'seleccionadas' | 'ordenar'
  >('todas');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { items, openCart } = useCartStore();

  const fetchPhotos = useCallback(
    async (page: number = 1, append: boolean = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await fetch(
          `/api/gallery/${eventId}?page=${page}&limit=24`
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Evento no encontrado o no disponible');
          } else if (response.status === 429) {
            throw new Error(
              'Demasiadas solicitudes. Por favor, espera un momento.'
            );
          } else {
            throw new Error('Error al cargar las fotos');
          }
        }

        const apiResponse = await response.json();

        // La API devuelve { data: { event, photos }, pagination }
        // Necesitamos reestructurar para que coincida con GalleryData
        const data: GalleryData = {
          event: apiResponse.data.event,
          photos: apiResponse.data.photos || [],
          pagination: apiResponse.pagination || {
            page: 1,
            limit: 24,
            total: 0,
            has_more: false,
            total_pages: 1,
          },
        };

        setGalleryData((prevData) => {
          if (append && prevData) {
            return {
              ...data,
              photos: [...prevData.photos, ...data.photos],
            };
          }
          return data;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error fetching gallery:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    fetchPhotos(1, false);
  }, [fetchPhotos]);

  const handleLoadMore = () => {
    if (galleryData?.pagination.has_more && !loadingMore) {
      fetchPhotos(galleryData.pagination.page + 1, true);
    }
  };

  const openModal = (photoId: string) => {
    setSelectedPhotoId(photoId);
  };

  const closeModal = () => {
    setSelectedPhotoId(null);
  };

  // Filtrar fotos basado en el tab activo
  const getFilteredPhotos = () => {
    if (!galleryData || !galleryData.photos) return [];

    switch (activeTab) {
      case 'seleccionadas':
        return galleryData.photos.filter((photo) =>
          items.some((item) => item.photoId === photo.id)
        );
      case 'tu-hijo':
      case 'ordenar':
        // Por ahora devolvemos todas, pero se puede implementar filtrado específico
        return galleryData.photos;
      default:
        return galleryData.photos;
    }
  };

  if (loading && !galleryData) {
    return <GalleryLoadingSkeleton />;
  }

  if (error) {
    return (
      <GalleryErrorState error={error} onRetry={() => fetchPhotos(1, false)} />
    );
  }

  if (!galleryData) {
    return <GalleryEmptyState />;
  }

  const { photos = [], pagination } = galleryData;
  const filteredPhotos = getFilteredPhotos();

  if (!photos || photos.length === 0) {
    return (
      <GalleryEmptyState message="Este evento aún no tiene fotos disponibles." />
    );
  }

  const tabs = [
    { id: 'todas' as const, label: 'Todas', count: photos.length },
    { id: 'tu-hijo' as const, label: 'Tu hijo', count: 0 },
    {
      id: 'seleccionadas' as const,
      label: 'Seleccionadas',
      count: items.length,
    },
    { id: 'ordenar' as const, label: 'Ordenar ↓', count: null },
  ];

  return (
    <div className="space-y-6" data-testid="public-gallery">
      {/* Tabs navegación */}
      <div className="flex space-x-1 rounded-2xl bg-white/80 p-2 shadow-lg backdrop-blur-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-600 hover:bg-white/50 hover:text-gray-900'
            } `}
            aria-label={`Filtrar por ${tab.label}`}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={`ml-1 ${activeTab === tab.id ? 'text-gray-600' : 'text-gray-400'}`}
              >
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid de fotos */}
      <div
        className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        role="grid"
        aria-label="Galería de fotos"
        data-testid="photo-grid"
      >
        {filteredPhotos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={{
              id: photo.id,
              signed_url: photo.signed_url,
            }}
            price={1000}
            onOpenModal={openModal}
          />
        ))}
      </div>

      {/* Load More Button */}
      {pagination.has_more && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="transform rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            {loadingMore ? (
              <>
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Cargando más fotos...
              </>
            ) : (
              <>
                ✨ Ver más fotos ✨
                <span className="ml-2 rounded-full bg-white/20 px-2 py-1 text-sm">
                  {pagination.total - photos.length} más
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhotoId && (
        <PhotoModal
          isOpen={true}
          onClose={closeModal}
          photo={photos.find((p) => p.id === selectedPhotoId) || null}
          photos={photos.map((p) => ({ id: p.id, signed_url: p.signed_url }))}
          price={1000}
        />
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => {
            const gradients = [
              'from-orange-300 to-yellow-400',
              'from-cyan-300 to-blue-400',
              'from-purple-300 to-pink-400',
              'from-green-300 to-emerald-400',
              'from-rose-300 to-red-400',
              'from-indigo-300 to-purple-400',
            ];
            const gradient = gradients[i % gradients.length];
            return (
              <div key={`skeleton-${i}`} className="aspect-square">
                <div
                  className={`animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GalleryLoadingSkeleton() {
  const gradients = [
    'from-orange-300 to-yellow-400',
    'from-cyan-300 to-blue-400',
    'from-purple-300 to-pink-400',
    'from-green-300 to-emerald-400',
    'from-rose-300 to-red-400',
    'from-indigo-300 to-purple-400',
  ];

  return (
    <div className="space-y-6">
      {/* Tabs skeleton */}
      <div className="flex space-x-1 rounded-2xl bg-white/80 p-2 shadow-lg backdrop-blur-sm">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-12 flex-1 animate-pulse rounded-xl bg-gray-200"
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const gradient = gradients[i % gradients.length];
          return (
            <div key={i} className="aspect-square">
              <div
                className={`animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface GalleryErrorStateProps {
  error: string;
  onRetry: () => void;
}

function GalleryErrorState({ error, onRetry }: GalleryErrorStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 shadow-lg">
        <span className="text-4xl">😕</span>
      </div>
      <h3 className="mb-4 text-2xl font-bold text-gray-800">
        ¡Ups! No pudimos cargar las fotos
      </h3>
      <p className="mx-auto mb-6 max-w-md text-lg text-gray-600">{error}</p>
      <Button
        onClick={onRetry}
        className="rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
      >
        ✨ Intentar de nuevo ✨
      </Button>
    </div>
  );
}

interface GalleryEmptyStateProps {
  message?: string;
}

function GalleryEmptyState({
  message = 'No se encontraron fotos para este evento.',
}: GalleryEmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-500 shadow-lg">
        <span className="text-4xl">📸</span>
      </div>
      <h3 className="mb-4 text-2xl font-bold text-gray-800">
        ¡Aún no hay fotos aquí!
      </h3>
      <p className="mx-auto max-w-md text-lg text-gray-600">{message}</p>
      <p className="mx-auto mt-4 max-w-md text-sm text-gray-500">
        Las fotos aparecerán aquí cuando estén disponibles ✨
      </p>
    </div>
  );
}
