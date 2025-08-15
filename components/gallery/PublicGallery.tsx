'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhotoCard } from './PhotoCard';
import { PhotoModal } from './PhotoModal';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/stores/cart-store';

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
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { items, addItem, getTotalItems } = useCartStore();

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

        const data: GalleryData = await response.json();

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

  const openModal = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const closeModal = () => {
    setSelectedPhotoIndex(null);
  };

  const navigateModal = (direction: 'prev' | 'next') => {
    if (!galleryData || selectedPhotoIndex === null) return;

    const totalPhotos = galleryData.photos.length;
    let newIndex = selectedPhotoIndex;

    if (direction === 'prev') {
      newIndex =
        selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : totalPhotos - 1;
    } else {
      newIndex =
        selectedPhotoIndex < totalPhotos - 1 ? selectedPhotoIndex + 1 : 0;
    }

    setSelectedPhotoIndex(newIndex);
  };

  if (loading) {
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

  const { photos, pagination } = galleryData;

  if (photos.length === 0) {
    return (
      <GalleryEmptyState message="Este evento aún no tiene fotos disponibles." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          📸 Fotos del Evento
        </h2>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-white/70 px-4 py-2 text-sm text-gray-600 backdrop-blur-sm">
            {pagination.total} fotos disponibles
          </div>
          <Button
            onClick={() => setIsCheckoutOpen(true)}
            aria-label="Abrir carrito"
            className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
          >
            Ver carrito ({getTotalItems()})
          </Button>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 gap-6 space-y-6 sm:columns-2 lg:columns-3 xl:columns-4">
        {photos.map((photo, index) => (
          <div key={photo.id} className="break-inside-avoid">
            <PhotoCard
              photo={photo}
              index={index}
              onClick={() => openModal(index)}
            />
            <div className="mt-2 flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  addItem({
                    photoId: photo.id,
                    filename: photo.storage_path.split('/').pop() || 'Foto',
                    price: 0,
                    watermarkUrl: photo.signed_url,
                  });
                }}
                aria-label="Agregar foto al carrito"
              >
                Agregar al carrito
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {pagination.has_more && (
        <div className="flex justify-center pt-8">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="transform rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl"
          >
            {loadingMore ? (
              <>
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Cargando...
              </>
            ) : (
              <>
                Ver más fotos
                <span className="ml-2">
                  ({pagination.total - photos.length} restantes)
                </span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhotoIndex !== null && (
        <PhotoModal
          photo={photos[selectedPhotoIndex]}
          isOpen={selectedPhotoIndex !== null}
          onClose={closeModal}
          onPrevious={() => navigateModal('prev')}
          onNext={() => navigateModal('next')}
          currentIndex={selectedPhotoIndex + 1}
          totalPhotos={photos.length}
        />
      )}

      {/* Simple public checkout modal */}
      {isCheckoutOpen && (
        <div
          role="dialog"
          aria-label="Carrito público"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Carrito</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsCheckoutOpen(false)} aria-label="Cerrar carrito">
                Cerrar
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-gray-600">No hay fotos en el carrito.</p>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.photoId} className="flex items-center justify-between text-sm">
                    <span className="truncate">{it.filename}</span>
                    <span className="text-gray-600">x{it.quantity}</span>
                  </div>
                ))}
                <Button
                  className="w-full"
                  aria-label="Ir al checkout"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/gallery/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          eventId,
                          contactInfo: { name: 'Cliente', email: 'cliente@example.com' },
                          items: items.map((it) => ({ photoId: it.photoId, quantity: it.quantity, priceType: 'base' })),
                        }),
                      });
                      if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || 'Error en checkout público');
                      }
                      const data = await response.json();
                      window.location.href = data.redirectUrl;
                    } catch (err) {
                      console.error('[Service] Public checkout error:', err);
                      alert('No se pudo iniciar el pago');
                    }
                  }}
                >
                  Continuar al pago
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="columns-1 gap-6 space-y-6 sm:columns-2 lg:columns-3 xl:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="break-inside-avoid">
              <div
                className="animate-pulse rounded-xl bg-gray-200"
                style={{
                  height: `${Math.floor(Math.random() * 200) + 200}px`,
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-lg bg-gray-200" />
        <div className="h-8 w-32 rounded-full bg-gray-200" />
      </div>
      <div className="columns-1 gap-6 space-y-6 sm:columns-2 lg:columns-3 xl:columns-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="break-inside-avoid">
            <div
              className="rounded-xl bg-gray-200"
              style={{
                height: `${Math.floor(Math.random() * 200) + 200}px`,
              }}
            />
          </div>
        ))}
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
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-pink-500">
        <span className="text-3xl text-white">⚠️</span>
      </div>
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        No pudimos cargar las fotos
      </h3>
      <p className="mx-auto mb-6 max-w-md text-gray-600">{error}</p>
      <Button
        onClick={onRetry}
        className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
      >
        Intentar de nuevo
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
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gray-400 to-gray-500">
        <span className="text-3xl text-white">📷</span>
      </div>
      <h3 className="mb-4 text-xl font-semibold text-gray-800">
        Sin fotos disponibles
      </h3>
      <p className="mx-auto max-w-md text-gray-600">{message}</p>
    </div>
  );
}
