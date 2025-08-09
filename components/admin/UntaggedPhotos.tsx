'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Photo } from './PhotoTagger';

interface UntaggedPhotosProps {
  photos: Photo[];
  selectedPhotos: string[];
  onPhotoClick: (photoId: string, ctrlKey: boolean) => void;
  loading?: boolean;
}

export function UntaggedPhotos({
  photos,
  selectedPhotos,
  onPhotoClick,
  loading = false,
}: UntaggedPhotosProps) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Obtener URLs firmadas para las fotos
  useEffect(() => {
    const getSignedUrls = async () => {
      const photosNeedingUrls = photos.filter(
        (photo) =>
          !signedUrls[photo.id] &&
          !loadingUrls.has(photo.id) &&
          !imageErrors.has(photo.id)
      );

      if (photosNeedingUrls.length === 0) return;

      const newLoadingUrls = new Set(loadingUrls);
      photosNeedingUrls.forEach((photo) => newLoadingUrls.add(photo.id));
      setLoadingUrls(newLoadingUrls);

      try {
        // Intentar usar URLs ya provistas; si faltan, solicitar en batch al endpoint interno admin
        const missingIds = photosNeedingUrls
          .filter((p) => !(p as any).signed_url)
          .map((p) => p.id);

        const directResults = photosNeedingUrls.map((photo) => ({
          photoId: photo.id,
          url: (photo as any).signed_url ?? null,
        }));

        let batchMap: Record<string, string> = {};
        if (missingIds.length > 0) {
          try {
            const resp = await fetch('/api/admin/storage/batch-signed-urls', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ photoIds: missingIds }),
            });
            if (resp.ok) {
              const data = await resp.json();
              batchMap = data.signedUrls || {};
            }
          } catch (e) {
            console.error('Error solicitando batch signed URLs:', e);
          }
        }

        const results = directResults.map(({ photoId, url }) => ({
          photoId,
          url: url || batchMap[photoId] || null,
        }));

        const newUrls: Record<string, string> = {};
        const newErrors = new Set(imageErrors);

        results.forEach(({ photoId, url }) => {
          if (url) {
            newUrls[photoId] = url;
          } else {
            newErrors.add(photoId);
          }
        });

        setSignedUrls((prev) => ({ ...prev, ...newUrls }));
        setImageErrors(newErrors);
      } finally {
        // Remover IDs de loading
        setLoadingUrls((prev) => {
          const updated = new Set(prev);
          photosNeedingUrls.forEach((photo) => updated.delete(photo.id));
          return updated;
        });
      }
    };

    getSignedUrls();
  }, [photos, signedUrls, loadingUrls, imageErrors]);

  const handlePhotoClick = (photoId: string, event: React.MouseEvent) => {
    event.preventDefault();
    onPhotoClick(photoId, event.ctrlKey || event.metaKey);
  };

  const handleImageError = (photoId: string) => {
    setImageErrors((prev) => new Set([...prev, photoId]));
  };

  if (photos.length === 0) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm">
        <div className="py-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
            <span className="text-2xl text-green-400">✅</span>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-white">
            ¡Todas las fotos están asignadas!
          </h3>
          <p className="text-white/70">
            No hay fotos pendientes de asignar en este evento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-white/70">
          Click para seleccionar • Ctrl+Click para selección múltiple
        </div>
        <div className="text-sm text-white/70">
          {selectedPhotos.length > 0 &&
            `${selectedPhotos.length} seleccionadas`}
        </div>
      </div>

      {/* Grid de fotos */}
      <div className="grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => {
          const isSelected = selectedPhotos.includes(photo.id);
          const hasUrl = signedUrls[photo.id];
          const isLoadingUrl = loadingUrls.has(photo.id);
          const hasError = imageErrors.has(photo.id);

          return (
            <div
              key={photo.id}
              className={`group relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-all duration-200 ${isSelected ? 'ring-3 scale-105 ring-blue-400' : 'hover:scale-102'} ${loading ? 'pointer-events-none opacity-50' : ''} `}
              onClick={(e) => handlePhotoClick(photo.id, e)}
            >
              {/* Overlay de selección */}
              {isSelected && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-400/20">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-400">
                    <span className="text-sm font-bold text-white">✓</span>
                  </div>
                </div>
              )}

              {/* Imagen o placeholder */}
              {hasError ? (
                <div className="flex h-full w-full items-center justify-center bg-red-500/20">
                  <div className="text-center">
                    <span className="block text-2xl text-red-400">⚠️</span>
                    <span className="text-xs text-red-400">Error</span>
                  </div>
                </div>
              ) : hasUrl ? (
                <Image
                  src={signedUrls[photo.id]}
                  alt={`Foto ${photo.id}`}
                  fill
                  className="object-cover"
                  onError={() => handleImageError(photo.id)}
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/10">
                  {isLoadingUrl ? (
                    <div className="text-center">
                      <div className="mx-auto mb-1 h-6 w-6 animate-spin rounded-full border-b-2 border-white/50"></div>
                      <span className="text-xs text-white/50">Cargando...</span>
                    </div>
                  ) : (
                    <span className="text-2xl text-white/50">📷</span>
                  )}
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/10" />

              {/* Número de foto (esquina superior derecha) */}
              <div className="absolute right-1 top-1 rounded bg-black/50 px-2 py-1 text-xs text-white">
                #{photo.id.slice(-6)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
          <div className="rounded-lg bg-white p-4">
            <div className="flex items-center space-x-3">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
              <span className="text-gray-700">Procesando asignación...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
