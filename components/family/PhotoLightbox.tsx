'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url: string;
  assignment_id?: string;
}

interface PhotoLightboxProps {
  isOpen: boolean;
  photos: Photo[];
  currentPhoto: Photo | null;
  onClose: () => void;
  onToggleSelection: (photo: Photo) => void;
  onToggleFavorite: (photoId: string) => void;
  selectedPhotos: Set<string>;
  favorites: Set<string>;
  getSignedUrl: (photo: Photo) => Promise<string>;
}

export function PhotoLightbox({
  isOpen,
  photos,
  currentPhoto,
  onClose,
  onToggleSelection,
  onToggleFavorite,
  selectedPhotos,
  favorites,
  getSignedUrl,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [signedUrl, setSignedUrl] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number }> | null>(
    null
  );

  // Encontrar índice de la foto actual
  useEffect(() => {
    if (currentPhoto && photos.length > 0) {
      const index = photos.findIndex((p) => p.id === currentPhoto.id);
      setCurrentIndex(index >= 0 ? index : 0);
    }
  }, [currentPhoto, photos]);

  // Cargar URL firmada para la foto actual
  useEffect(() => {
    if (photos[currentIndex] && isOpen) {
      setImageLoaded(false);
      setImageError(false);
      setSignedUrl('');

      getSignedUrl(photos[currentIndex])
        .then((url) => setSignedUrl(url))
        .catch(() => {
          setImageError(true);
          setSignedUrl(photos[currentIndex].signed_url);
        });
    }
  }, [currentIndex, photos, isOpen, getSignedUrl]);

  // Navegación con teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateToNext();
          break;
        case ' ':
          e.preventDefault();
          if (photos[currentIndex]) {
            onToggleSelection(photos[currentIndex]);
          }
          break;
        case 'f':
          e.preventDefault();
          if (photos[currentIndex]) {
            onToggleFavorite(photos[currentIndex].id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [
    isOpen,
    currentIndex,
    photos,
    onClose,
    onToggleSelection,
    onToggleFavorite,
  ]);

  // Navegación
  const navigateToNext = useCallback(() => {
    if (photos.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
      setIsZoomed(false);
    }
  }, [photos.length]);

  const navigateToPrevious = useCallback(() => {
    if (photos.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setIsZoomed(false);
    }
  }, [photos.length]);

  // Touch gestures para móvil
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touchStart.x - touch.clientX;
    const deltaY = touchStart.y - touch.clientY;

    // Swipe horizontal (navegación)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        navigateToNext();
      } else {
        navigateToPrevious();
      }
    }

    // Swipe vertical hacia abajo (cerrar)
    if (deltaY < -100 && Math.abs(deltaX) < 50) {
      onClose();
    }

    setTouchStart(null);
  };

  if (!isOpen || photos.length === 0) return null;

  const photo = photos[currentIndex];
  if (!photo) return null;

  const isSelected = selectedPhotos.has(photo.id);
  const isFavorite = favorites.has(photo.id);

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex-1">
            <h3 className="truncate text-lg font-medium">{photo.filename}</h3>
            <p className="text-sm text-gray-300">
              {currentIndex + 1} de {photos.length} •{' '}
              {new Date(photo.created_at).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Botón favorito */}
            <button
              onClick={() => onToggleFavorite(photo.id)}
              className={`rounded-full p-2 transition-colors ${
                isFavorite
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              aria-label={
                isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
              }
            >
              <svg
                className="h-5 w-5"
                fill={isFavorite ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>

            {/* Botón seleccionar */}
            <button
              onClick={() => onToggleSelection(photo)}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isSelected
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
              title={isSelected ? 'Deseleccionar foto' : 'Seleccionar foto'}
            >
              {isSelected ? (
                <>
                  <svg
                    className="mr-1 inline h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Seleccionada
                </>
              ) : (
                'Seleccionar'
              )}
            </button>

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white transition-colors hover:bg-white/20"
              title="Cerrar (Esc)"
              aria-label="Cerrar lightbox"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div
        className="flex h-full items-center justify-center p-4 pt-20"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Botón anterior */}
        <button
          onClick={navigateToPrevious}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:scale-110 hover:bg-black/70"
          title="Foto anterior (←)"
          aria-label="Foto anterior"
          disabled={photos.length <= 1}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Imagen principal */}
        <div className="relative flex max-h-full max-w-full items-center justify-center">
          {signedUrl && !imageError ? (
            <img
              src={signedUrl}
              alt={photo.filename}
              className={`max-h-full max-w-full cursor-zoom-in object-contain transition-all duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isZoomed ? 'scale-150 cursor-zoom-out' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              onClick={() => setIsZoomed(!isZoomed)}
              draggable={false}
            />
          ) : (
            <div className="flex h-96 w-96 items-center justify-center rounded-lg bg-gray-800 text-gray-400">
              <div className="text-center">
                <svg
                  className="mx-auto mb-4 h-16 w-16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>Error al cargar la imagen</p>
              </div>
            </div>
          )}

          {!imageLoaded && !imageError && signedUrl && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
            </div>
          )}
        </div>

        {/* Botón siguiente */}
        <button
          onClick={navigateToNext}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white transition-all hover:scale-110 hover:bg-black/70"
          title="Foto siguiente (→)"
          aria-label="Foto siguiente"
          disabled={photos.length <= 1}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Footer con thumbnails */}
      {photos.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex justify-center space-x-2 overflow-x-auto">
            {photos
              .slice(Math.max(0, currentIndex - 5), currentIndex + 6)
              .map((thumbPhoto, idx) => {
                const absoluteIndex = Math.max(0, currentIndex - 5) + idx;
                return (
                  <button
                    key={thumbPhoto.id}
                    onClick={() => setCurrentIndex(absoluteIndex)}
                    className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded border-2 transition-all ${
                      absoluteIndex === currentIndex
                        ? 'scale-110 border-purple-400'
                        : 'border-transparent hover:border-white/50'
                    }`}
                  >
                    <img
                      src={thumbPhoto.signed_url}
                      alt={`Thumbnail ${absoluteIndex + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Indicador de gestos para móvil */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-white/70 md:hidden">
        <p>Desliza ← → para navegar • Desliza ↓ para cerrar</p>
      </div>

      {/* Atajos de teclado para desktop */}
      <div className="absolute bottom-4 right-4 hidden text-xs text-white/70 md:block">
        <p>← → Navegar • Espacio: Seleccionar • F: Favorito • Esc: Cerrar</p>
      </div>
    </div>,
    document.body
  );
}
