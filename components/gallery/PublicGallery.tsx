'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhotoCard } from '@/components/public/PhotoCard';
import { PhotoModal } from '@/components/public/PhotoModal';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/useCartStore';
import { ImageIcon, RefreshCwIcon, AlertTriangleIcon, HeartIcon, ShoppingCartIcon } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'todas' | 'tu-hijo' | 'seleccionadas' | 'ordenar'>('todas');
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
          pagination: apiResponse.pagination || { page: 1, limit: 24, total: 0, has_more: false, total_pages: 1 }
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
        return galleryData.photos.filter(photo => 
          items.some(item => item.photoId === photo.id)
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
    { id: 'seleccionadas' as const, label: 'Seleccionadas', count: items.length },
    { id: 'ordenar' as const, label: 'Ordenar ↓', count: null }
  ];

  return (
    <div className="space-y-8">
      {/* Tabs navegación - Diseño liquid-glass mejorado */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative flex-1 px-6 py-4 rounded-2xl font-bold text-sm transition-all duration-300 transform
                ${activeTab === tab.id
                  ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-white/60 hover:scale-102 hover:shadow-md'
                }
              `}
              aria-label={`Filtrar por ${tab.label}`}
            >
              <div className="flex items-center justify-center gap-2">
                {tab.id === 'seleccionadas' && <ShoppingCartIcon className="h-4 w-4" />}
                {tab.id === 'tu-hijo' && <HeartIcon className="h-4 w-4" />}
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-bold
                    ${activeTab === tab.id 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Grid de fotos - Diseño liquid-glass mejorado */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" role="grid" aria-label="Galería de fotos">
        {filteredPhotos.map((photo) => (
          <div key={photo.id} className="group">
            <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-4 shadow-xl shadow-cyan-500/10 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-105">
              <PhotoCard
                photo={{
                  id: photo.id,
                  signed_url: photo.signed_url
                }}
                price={1000}
                onOpenModal={openModal}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button - Diseño liquid-glass mejorado */}
      {pagination.has_more && (
        <div className="flex justify-center pt-12">
          <Button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 px-12 py-6 font-bold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:scale-110 hover:shadow-3xl hover:shadow-blue-500/30 disabled:scale-100 disabled:opacity-70"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            {loadingMore ? (
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                <span className="text-lg">Cargando más fotos...</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ImageIcon className="h-6 w-6" />
                <span className="text-lg">Ver más fotos</span>
                <span className="ml-2 bg-white/25 backdrop-blur-sm px-3 py-1 rounded-full text-sm border border-white/20">
                  {pagination.total - photos.length} más
                </span>
              </div>
            )}
          </Button>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhotoId && (
        <PhotoModal
          isOpen={true}
          onClose={closeModal}
          photo={photos.find(p => p.id === selectedPhotoId) || null}
          photos={photos.map(p => ({ id: p.id, signed_url: p.signed_url }))}
          price={1000}
        />
      )}

      {/* Loading more indicator - Liquid glass design */}
      {loadingMore && (
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => {
            const gradients = [
              'from-orange-300 to-yellow-400',
              'from-cyan-300 to-blue-400', 
              'from-purple-300 to-pink-400',
              'from-green-300 to-emerald-400',
              'from-rose-300 to-red-400',
              'from-indigo-300 to-purple-400'
            ];
            const gradient = gradients[i % gradients.length];
            return (
              <div key={`skeleton-${i}`} className="group">
                <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-4 shadow-xl shadow-cyan-500/10">
                  <div className={`aspect-square animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`} />
                  <div className="mt-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
                  </div>
                </div>
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
    'from-indigo-300 to-purple-400'
  ];

  return (
    <div className="space-y-8">
      {/* Tabs skeleton - Liquid glass design */}
      <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-3 shadow-xl shadow-cyan-500/10">
        <div className="flex space-x-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-16 animate-pulse rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300" />
          ))}
        </div>
      </div>
      
      {/* Grid skeleton - Liquid glass design */}
      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const gradient = gradients[i % gradients.length];
          return (
            <div key={i} className="group">
              <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-4 shadow-xl shadow-cyan-500/10">
                <div className={`aspect-square animate-pulse rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`} />
                <div className="mt-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded-lg w-2/3 animate-pulse" />
                </div>
              </div>
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
    <div className="py-20 text-center">
      <div className="mx-auto max-w-lg">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-red-500/10">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 shadow-2xl shadow-red-500/20">
            <AlertTriangleIcon className="h-16 w-16 text-white" />
          </div>
          <h3 className="mb-6 text-3xl font-bold text-gray-800">
            ¡Ups! No pudimos cargar las fotos
          </h3>
          <p className="mx-auto mb-8 max-w-md text-gray-600 text-lg leading-relaxed">{error}</p>
          <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl p-6 mb-8">
            <p className="text-sm font-semibold text-gray-700 mb-3">Sugerencias:</p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                Verifica tu conexión a internet
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
                Intenta recargar la página
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full" />
                Si persiste, contacta con el fotógrafo
              </li>
            </ul>
          </div>
          <Button
            onClick={onRetry}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 px-10 py-4 font-bold text-white shadow-2xl shadow-blue-500/25 transition-all duration-300 hover:scale-110 hover:shadow-3xl hover:shadow-blue-500/30"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="flex items-center gap-3">
              <RefreshCwIcon className="h-5 w-5" />
              <span>Intentar de nuevo</span>
            </div>
          </Button>
        </div>
      </div>
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
    <div className="py-20 text-center">
      <div className="mx-auto max-w-lg">
        <div className="bg-white/70 backdrop-blur-md border border-white/30 rounded-3xl p-12 shadow-xl shadow-cyan-500/10">
          <div className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-400 to-purple-500 shadow-2xl shadow-cyan-500/20">
            <ImageIcon className="h-16 w-16 text-white" />
          </div>
          <h3 className="mb-6 text-3xl font-bold text-gray-800">
            ¡Aún no hay fotos aquí!
          </h3>
          <p className="mx-auto max-w-md text-gray-600 text-lg leading-relaxed mb-6">{message}</p>
          <div className="bg-gradient-to-br from-cyan-50 to-purple-50 rounded-2xl p-6">
            <p className="text-sm text-gray-600 mb-2">💡 <strong>Mientras esperas:</strong></p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Las fotos aparecerán automáticamente cuando estén listas</li>
              <li>• Guarda este enlace para volver más tarde</li>
              <li>• El fotógrafo está procesando las imágenes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
