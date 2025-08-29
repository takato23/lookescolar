'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CheckCircleIcon, ZoomInIcon } from 'lucide-react';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
}

interface PhotoSelectorProps {
  photos: Photo[];
  selectedPhotos: string[];
  onPhotoToggle: (photoId: string) => void;
  maxSelection?: number;
  allowRepeat?: boolean;
  loading?: boolean;
  className?: string;
}

export default function PhotoSelector({
  photos,
  selectedPhotos,
  onPhotoToggle,
  maxSelection,
  allowRepeat = false,
  loading = false,
  className = '',
}: PhotoSelectorProps) {
  const [zoomPhoto, setZoomPhoto] = useState<Photo | null>(null);

  // Count occurrences of each photo
  const photoCounts = selectedPhotos.reduce(
    (counts, photoId) => {
      counts[photoId] = (counts[photoId] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );

  const isSelectionAllowed = (photo: Photo) => {
    if (!maxSelection) return true;

    const currentCount = photoCounts[photo.id] || 0;
    const totalSelected = selectedPhotos.length;

    // If photo is not selected and we haven't reached the limit
    if (currentCount === 0 && totalSelected < maxSelection) {
      return true;
    }

    // If photo is selected and we can repeat and haven't reached limit
    if (currentCount > 0 && allowRepeat && totalSelected < maxSelection) {
      return true;
    }

    // If photo is selected (for deselection)
    if (currentCount > 0) {
      return true;
    }

    return false;
  };

  const BLUR_DATA_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  if (loading) {
    return (
      <div
        className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${className}`}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square rounded-lg bg-gray-200"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div
        className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${className}`}
      >
        {photos.map((photo) => {
          const count = photoCounts[photo.id] || 0;
          const isSelected = count > 0;
          const canSelect = isSelectionAllowed(photo);

          return (
            <div
              key={photo.id}
              className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl transition-all duration-200 ${
                isSelected
                  ? 'shadow-lg ring-4 ring-purple-500'
                  : canSelect
                    ? 'hover:shadow-md hover:ring-2 hover:ring-gray-300'
                    : 'cursor-not-allowed opacity-50'
              }`}
              onClick={() => canSelect && onPhotoToggle(photo.id)}
            >
              {/* Photo */}
              <Image
                src={photo.preview_url}
                alt={photo.filename}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />

              {/* Overlay */}
              <div
                className={`absolute inset-0 transition-all ${
                  isSelected
                    ? 'bg-purple-500/20'
                    : canSelect
                      ? 'bg-black/0 hover:bg-black/10'
                      : 'bg-gray-500/40'
                }`}
              />

              {/* Zoom Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomPhoto(photo);
                }}
                className="absolute left-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity hover:opacity-100"
                aria-label="Ver foto en tamaño completo"
              >
                <ZoomInIcon className="h-4 w-4" />
              </button>

              {/* Selection Indicator */}
              <div className="absolute right-2 top-2">
                {isSelected ? (
                  <div className="rounded-full bg-purple-500 p-1 text-white">
                    <CheckCircleIcon className="h-5 w-5" />
                  </div>
                ) : canSelect ? (
                  <div className="rounded-full bg-white/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
                  </div>
                ) : null}
              </div>

              {/* Count Badge */}
              {count > 1 && (
                <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                  {count}
                </div>
              )}

              {/* Plus indicator for repeatable photos */}
              {isSelected && allowRepeat && canSelect && (
                <div className="absolute bottom-2 left-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">
                  +
                </div>
              )}

              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="truncate text-xs font-medium text-white">
                  {photo.filename}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo Zoom Modal */}
      {zoomPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-h-full max-w-4xl">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            >
              ×
            </button>
            <Image
              src={zoomPhoto.preview_url}
              alt={zoomPhoto.filename}
              width={zoomPhoto.width}
              height={zoomPhoto.height}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
