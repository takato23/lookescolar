'use client';

import { useState } from 'react';
import Image from 'next/image';

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

  // Calculate aspect ratio for consistent sizing
  const aspectRatio =
    photo.width && photo.height ? photo.width / photo.height : 1;

  // Dynamic height based on aspect ratio (for masonry effect)
  const calculateHeight = () => {
    if (aspectRatio > 1.5) {
      // Wide image
      return 'aspect-[4/3]';
    } else if (aspectRatio > 1) {
      // Slightly wide
      return 'aspect-[3/4]';
    } else if (aspectRatio > 0.7) {
      // Square-ish
      return 'aspect-square';
    } else {
      // Tall image
      return 'aspect-[3/4]';
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`group relative transform cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] ${
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
        className={`relative ${calculateHeight()} overflow-hidden rounded-xl bg-gray-100 shadow-md transition-shadow duration-300 hover:shadow-xl`}
      >
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-purple-500" />
              <span className="text-xs text-gray-500">Cargando...</span>
            </div>
          </div>
        )}

        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            <div className="text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
                <span className="text-gray-400">📷</span>
              </div>
              <p className="text-xs">Error al cargar</p>
            </div>
          </div>
        ) : (
          <Image
            src={photo.signed_url}
            alt={`Foto del evento ${index + 1}`}
            fill
            className={`object-cover transition-all duration-500 ${
              imageLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-0'
            } ${isHovered ? 'scale-110' : 'scale-100'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(false);
            }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={75}
            loading="lazy"
          />
        )}

        {/* Overlay on hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* View button */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center justify-between">
              <div className="rounded-full bg-black/20 px-3 py-1 text-xs text-white backdrop-blur-sm">
                #{index + 1}
              </div>
              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-800 backdrop-blur-sm">
                Ver foto
              </div>
            </div>
          </div>

          {/* Zoom icon */}
          <div className="absolute right-4 top-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Loading shimmer effect */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" />
        )}
      </div>

      {/* Subtle shadow underneath for depth */}
      <div
        className={`absolute inset-x-2 -bottom-2 h-4 rounded-xl bg-gray-200/50 blur-sm transition-all duration-300 ${
          isHovered ? 'scale-110 opacity-60' : 'opacity-30'
        }`}
      />
    </div>
  );
}
