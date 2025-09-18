'use client';

import { useState, RefObject } from 'react';
import Image from 'next/image';
import { HeartIcon, CheckCircleIcon, ZoomInIcon } from 'lucide-react';
import { useUnifiedCartStore } from '@/lib/stores/unified-cart-store';
import { PhotoModal } from '@/components/public/PhotoModal';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface PhotoGallerySectionProps {
  photos: Photo[];
  favorites: Set<string>;
  onToggleFavorite: (photoId: string) => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement>;
}

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

export function PhotoGallerySection({
  photos,
  favorites,
  onToggleFavorite,
  isLoadingMore,
  hasMore,
  sentinelRef,
}: PhotoGallerySectionProps) {
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const { addItem, removeItem, items, getTotalItems } = useUnifiedCartStore();

  // Helper function to check if photo is selected
  const isPhotoSelected = (photoId: string) => {
    return items.some((item) => item.photoId === photoId);
  };

  // Helper function to toggle photo selection
  const togglePhotoSelection = (photo: Photo) => {
    if (isPhotoSelected(photo.id)) {
      removeItem(photo.id);
    } else {
      addItem({
        photoId: photo.id,
        filename: photo.filename,
        price: 0, // Price is handled by package selection
        watermarkUrl: photo.preview_url,
        metadata: {
          context: 'family',
          eventId: 'unified-gallery',
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Gallery Header */}
      <div className="rounded-2xl border border-purple-200 bg-white/80 p-6 shadow-lg backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            📸 Galería de Fotos
          </h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">{photos.length} fotos</span>
            </div>
            {getTotalItems() > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1">
                <CheckCircleIcon className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-600">
                  {getTotalItems()} seleccionadas
                </span>
              </div>
            )}
            {favorites.size > 0 && (
              <div className="flex items-center gap-2 text-red-500">
                <HeartIcon className="h-4 w-4 fill-current" />
                <span>{favorites.size} favoritas</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">💡 Instrucciones:</span>
            <span className="ml-2">
              Selecciona las fotos que quieres incluir en tu paquete. Usa ❤️
              para marcar favoritas y ✅ para seleccionar para compra.
            </span>
          </p>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-lg">
          <div className="mb-4 text-6xl">📷</div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900">
            No hay fotos disponibles
          </h3>
          <p className="text-gray-600">
            Las fotos aparecerán aquí cuando estén disponibles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative transform overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
            >
              {/* Image Container */}
              <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-gray-100">
                <Image
                  src={photo.preview_url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading={idx < 12 ? 'eager' : 'lazy'}
                  decoding="async"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                  priority={idx < 6}
                />

                {/* Zoom button on hover */}
                <button
                  onClick={() => setZoomIndex(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-colors hover:bg-black/30 group-hover:opacity-100"
                  aria-label="Ver foto en tamaño completo"
                >
                  <ZoomInIcon className="h-8 w-8 text-white drop-shadow-lg" />
                </button>

                {/* Watermark Badge */}
                <div className="absolute left-3 top-3 rounded-full bg-purple-600 px-2 py-1 text-xs font-medium text-white shadow-lg">
                  MUESTRA
                </div>

                {/* Selection Indicator */}
                <div className="absolute right-3 top-3 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePhotoSelection(photo);
                    }}
                    className={`flex h-6 w-6 transform cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:scale-110 ${
                      isPhotoSelected(photo.id)
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/90 text-gray-600 backdrop-blur-sm'
                    }`}
                    aria-label={
                      isPhotoSelected(photo.id)
                        ? 'Deseleccionar foto'
                        : 'Seleccionar foto'
                    }
                  >
                    {isPhotoSelected(photo.id) && (
                      <CheckCircleIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Photo Info */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  {/* Photo filename */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {photo.filename}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {Math.round(photo.size / 1024)} KB
                    </p>
                  </div>

                  {/* Favorite Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(photo.id);
                    }}
                    className={`transform rounded-full p-1.5 transition-all hover:scale-110 ${
                      favorites.has(photo.id)
                        ? 'bg-red-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                    }`}
                    aria-label={
                      favorites.has(photo.id)
                        ? 'Quitar de favoritos'
                        : 'Agregar a favoritos'
                    }
                  >
                    <HeartIcon
                      className="h-4 w-4"
                      fill={favorites.has(photo.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-lg"
            >
              <div className="aspect-square rounded-t-2xl bg-gray-200" />
              <div className="p-3">
                <div className="mb-2 h-4 rounded bg-gray-200" />
                <div className="h-3 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex h-20 items-center justify-center"
        >
          {isLoadingMore && (
            <div className="flex items-center space-x-2 text-gray-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
              <span className="text-sm">Cargando más fotos...</span>
            </div>
          )}
        </div>
      )}

      {/* Photo Modal */}
      {zoomIndex !== null && photos[zoomIndex] && (
        <PhotoModal
          photo={{
            id: photos[zoomIndex].id,
            preview_url: photos[zoomIndex].preview_url,
            filename: photos[zoomIndex].filename,
          }}
          photos={[]} // Not using the photos array navigation
          isOpen={true}
          onClose={() => setZoomIndex(null)}
        />
      )}
    </div>
  );
}
