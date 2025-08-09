'use client';

import { useState } from 'react';
import { Camera, Download, MoreVertical, Check } from 'lucide-react';

interface Photo {
  id: string;
  storage_path: string;
  original_name: string;
  size_bytes: number;
  width: number;
  height: number;
  created_at: string;
  signed_url?: string;
  tagged_subjects?: { name: string; grade: string }[];
}

interface PhotoGridProps {
  photos: Photo[];
  loading?: boolean;
  selectedPhotos?: Set<string>;
  onPhotoSelect?: (selectedPhotos: Set<string>) => void;
}

export function PhotoGrid({
  photos,
  loading = false,
  selectedPhotos: externalSelectedPhotos,
  onPhotoSelect,
}: PhotoGridProps) {
  const [internalSelectedPhotos, setInternalSelectedPhotos] = useState<
    Set<string>
  >(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use external selection state if provided, otherwise use internal state
  const selectedPhotos = externalSelectedPhotos ?? internalSelectedPhotos;
  const setSelectedPhotos = onPhotoSelect ?? setInternalSelectedPhotos;

  const togglePhotoSelection = (photoId: string) => {
    const newSelection = new Set(selectedPhotos);
    if (newSelection.has(photoId)) {
      newSelection.delete(photoId);
    } else {
      newSelection.add(photoId);
    }
    setSelectedPhotos(newSelection);
  };

  const selectAll = () => {
    setSelectedPhotos(new Set(photos.map((p) => p.id)));
  };

  const clearSelection = () => {
    setSelectedPhotos(new Set());
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-lg bg-neutral-100"
          />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-100">
          <Camera className="h-6 w-6 text-neutral-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-neutral-900">
          No hay fotos subidas
        </h3>
        <p className="mx-auto mb-6 max-w-sm text-neutral-600">
          Sube tus primeras fotos para comenzar a organizar tu galería.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {selectedPhotos.size > 0 && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-900">
              {selectedPhotos.size} foto{selectedPhotos.size !== 1 ? 's' : ''}{' '}
              seleccionada{selectedPhotos.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearSelection}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Limpiar
              </button>
              <button className="inline-flex items-center rounded-lg bg-neutral-100 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-200">
                <Download className="mr-1 h-4 w-4" />
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-neutral-100"
            onClick={() => togglePhotoSelection(photo.id)}
          >
            {/* Actual image or placeholder */}
            {photo.signed_url ? (
              <img
                src={photo.signed_url}
                alt={photo.original_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
                <Camera className="h-8 w-8 text-neutral-400" />
              </div>
            )}

            {/* Selection overlay */}
            <div
              className={`absolute inset-0 transition-all duration-200 ${
                selectedPhotos.has(photo.id)
                  ? 'bg-blue-500/20 ring-2 ring-blue-500'
                  : 'group-hover:bg-black/10'
              }`}
            >
              {selectedPhotos.has(photo.id) && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            {/* Tagged subjects */}
            {photo.tagged_subjects && photo.tagged_subjects.length > 0 && (
              <div className="absolute left-2 top-2">
                <div className="flex flex-wrap gap-1">
                  {photo.tagged_subjects.slice(0, 2).map((subject, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-green-500/80 px-2 py-1 text-xs text-white"
                    >
                      {subject.name.split(' ')[0]}
                    </span>
                  ))}
                  {photo.tagged_subjects.length > 2 && (
                    <span className="rounded-full bg-green-500/80 px-2 py-1 text-xs text-white">
                      +{photo.tagged_subjects.length - 2}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Image info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-xs font-medium text-white">
                {photo.original_name}
              </p>
              <p className="text-xs text-white/80">
                {(photo.size_bytes / 1024).toFixed(0)} KB • {photo.width}x
                {photo.height}
              </p>
            </div>

            {/* Menu button */}
            <button
              className="absolute right-8 top-2 rounded-lg bg-white/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implementar menú de opciones
              }}
            >
              <MoreVertical className="h-4 w-4 text-neutral-700" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
