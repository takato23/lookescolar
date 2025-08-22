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
  className = ''
}: PhotoSelectorProps) {
  const [zoomPhoto, setZoomPhoto] = useState<Photo | null>(null);
  
  // Count occurrences of each photo
  const photoCounts = selectedPhotos.reduce((counts, photoId) => {
    counts[photoId] = (counts[photoId] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

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

  const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${className}`}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${className}`}>
        {photos.map((photo) => {
          const count = photoCounts[photo.id] || 0;
          const isSelected = count > 0;
          const canSelect = isSelectionAllowed(photo);
          
          return (
            <div
              key={photo.id}
              className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'ring-4 ring-purple-500 shadow-lg'
                  : canSelect
                  ? 'hover:ring-2 hover:ring-gray-300 hover:shadow-md'
                  : 'opacity-50 cursor-not-allowed'
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
              <div className={`absolute inset-0 transition-all ${
                isSelected
                  ? 'bg-purple-500/20'
                  : canSelect
                  ? 'bg-black/0 hover:bg-black/10'
                  : 'bg-gray-500/40'
              }`} />
              
              {/* Zoom Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomPhoto(photo);
                }}
                className="absolute top-2 left-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 hover:opacity-100 transition-opacity"
                aria-label="Ver foto en tamaño completo"
              >
                <ZoomInIcon className="h-4 w-4" />
              </button>
              
              {/* Selection Indicator */}
              <div className="absolute top-2 right-2">
                {isSelected ? (
                  <div className="bg-purple-500 text-white rounded-full p-1">
                    <CheckCircleIcon className="h-5 w-5" />
                  </div>
                ) : canSelect ? (
                  <div className="bg-white/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-5 h-5 border-2 border-gray-400 rounded-full" />
                  </div>
                ) : null}
              </div>
              
              {/* Count Badge */}
              {count > 1 && (
                <div className="absolute bottom-2 right-2 bg-purple-500 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
                  {count}
                </div>
              )}
              
              {/* Plus indicator for repeatable photos */}
              {isSelected && allowRepeat && canSelect && (
                <div className="absolute bottom-2 left-2 bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  +
                </div>
              )}
              
              {/* Photo Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">
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
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" 
          onClick={() => setZoomPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setZoomPhoto(null)}
              className="absolute top-4 right-4 bg-white/20 text-white rounded-full p-2 hover:bg-white/30 transition-colors z-10"
            >
              ×
            </button>
            <Image
              src={zoomPhoto.preview_url}
              alt={zoomPhoto.filename}
              width={zoomPhoto.width}
              height={zoomPhoto.height}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}