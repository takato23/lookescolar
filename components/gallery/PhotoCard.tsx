'use client';

import { useState } from 'react';
import Image from 'next/image';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

interface Photo {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
  signed_url: string;
}

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onClick: () => void;
}

export function PhotoCard({ photo, index, onClick }: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);



  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`group relative cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
        imageLoaded ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Ver foto ${index + 1} en tamaño completo`}
    >
      {/* Main image container */}
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-lg bg-gray-100 shadow-sm transition-all duration-300 hover:shadow-lg`}
        aria-label="Miniatura de foto con marca de agua"
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500" />
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <span className="text-lg">📷</span>
              </div>
              <p className="text-xs">No disponible</p>
            </div>
          </div>
        ) : (
          <Image
            src={photo.signed_url}
            alt={`Foto del evento ${index + 1}`}
            fill
            className={`object-cover transition-all duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            } ${isHovered ? 'scale-105' : 'scale-100'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={75}
            loading="lazy"
            decoding="async"
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
          />
        )}

        {/* Subtle overlay on hover */}
        <div
          className={`absolute inset-0 bg-black/10 transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Simple view indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800 shadow-sm backdrop-blur-sm">
              Ver foto
            </div>
          </div>
        </div>

        {/* Loading shimmer effect */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
        )}
      </div>
    </div>
  );
}
