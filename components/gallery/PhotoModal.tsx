'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useSignedUrl } from '@/lib/utils/signed-url-cache';

interface Photo {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface PhotoModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  totalPhotos: number;
}

export function PhotoModal({
  photo,
  isOpen,
  onClose,
  onPrevious,
  onNext,
  currentIndex,
  totalPhotos,
}: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageError, setImageError] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Get signed URL for the photo
  const { url: signedUrl, loading: urlLoading, error: urlError } = useSignedUrl(
    photo?.id || '',
    photo?.storage_path || ''
  );

  // Early return if no photo
  if (!isOpen || !photo) {
    return null;
  }

  // Reset state when modal opens/closes or photo changes
  useEffect(() => {
    if (isOpen) {
      setImageLoaded(false);
      setZoomLevel(1);
      setImageError(false);
      document.body.style.overflow = 'hidden';
      // Enfocar botón de cierre para accesibilidad
      setTimeout(() => closeButtonRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, photo.id]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onPrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onNext();
          break;
        case '+':
        case '=':
          event.preventDefault();
          setZoomLevel((prev) => Math.min(prev * 1.2, 3));
          break;
        case '-':
          event.preventDefault();
          setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
          break;
        case '0':
          event.preventDefault();
          setZoomLevel(1);
          break;
      }
    },
    [isOpen, onClose, onPrevious, onNext]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-modal-title"
      aria-describedby="photo-modal-help"
    >
      {/* Header */}
      <div className="absolute left-0 right-0 top-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-4">
            <h3 id="photo-modal-title" className="text-lg font-medium">
              Foto {currentIndex} de {totalPhotos}
            </h3>
            <div className="text-sm opacity-75">
              {new Date(photo.created_at).toLocaleDateString('es-AR')}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Zoom controls */}
            <div className="flex items-center space-x-1 rounded-full bg-black/30 p-1">
              <Button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="h-8 w-8 border-none bg-transparent p-0 text-white hover:bg-white/10"
                title="Alejar (tecla -)"
              >
                -
              </Button>
              <span className="min-w-[3rem] px-2 text-center text-xs">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="h-8 w-8 border-none bg-transparent p-0 text-white hover:bg-white/10"
                title="Acercar (tecla +)"
              >
                +
              </Button>
              <Button
                onClick={handleResetZoom}
                className="h-8 w-8 border-none bg-transparent p-0 text-xs text-white hover:bg-white/10"
                title="Restablecer zoom (tecla 0)"
              >
                ⌂
              </Button>
            </div>

            {/* Close button */}
            <Button
              onClick={onClose}
              className="h-10 w-10 border-none bg-transparent p-0 text-xl text-white hover:bg-white/10"
              title="Cerrar (tecla Escape)"
              aria-label="Cerrar visor de foto"
              ref={closeButtonRef}
            >
              ×
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      {totalPhotos > 1 && (
        <>
          <Button
            onClick={onPrevious}
            className="absolute left-4 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full border-none bg-black/30 text-white hover:bg-black/50"
            title="Foto anterior (flecha izquierda)"
          >
            &#8249;
          </Button>
          <Button
            onClick={onNext}
            className="absolute right-4 top-1/2 z-10 h-12 w-12 -translate-y-1/2 rounded-full border-none bg-black/30 text-white hover:bg-black/50"
            title="Foto siguiente (flecha derecha)"
          >
            &#8250;
          </Button>
        </>
      )}

      {/* Image container */}
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden p-16">
        {(!imageLoaded && !imageError && !urlError) || urlLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              <p className="text-white/75">
                {urlLoading ? 'Obteniendo foto...' : 'Cargando foto...'}
              </p>
            </div>
          </div>
        ) : null}

        {(imageError || urlError) ? (
          <div className="flex flex-col items-center space-y-4 text-white">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-lg">
              {urlError ? 'Error al obtener la foto' : 'Error al cargar la imagen'}
            </p>
            <Button
              onClick={() => {
                setImageError(false);
                setImageLoaded(false);
                // Note: URL refetch is handled automatically by the hook when photo changes
              }}
              className="border-none bg-white/10 text-white hover:bg-white/20"
            >
              Intentar de nuevo
            </Button>
          </div>
        ) : signedUrl ? (
          <div
            className="relative cursor-move transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            <Image
              src={signedUrl}
              alt={`Foto del evento - ${currentIndex} de ${totalPhotos}`}
              width={photo.width || 800}
              height={photo.height || 600}
              className={`max-h-full max-w-full rounded-lg object-contain shadow-2xl transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(false);
              }}
              priority={true}
              quality={90}
            />
          </div>
        ) : null}
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
        <div className="text-center text-white">
          <p id="photo-modal-help" className="text-sm opacity-75">
            Usa las flechas del teclado para navegar • ESC para cerrar • +/-
            para zoom
          </p>
        </div>
      </div>

      {/* Touch navigation indicators for mobile */}
      {totalPhotos > 1 && (
        <div className="absolute bottom-20 left-1/2 flex -translate-x-1/2 space-x-2 md:hidden">
          {Array.from({ length: Math.min(totalPhotos, 10) }).map((_, i) => {
            const photoIndex = Math.floor((i / 9) * (totalPhotos - 1));
            const isActive = currentIndex - 1 === photoIndex;
            return (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                  isActive ? 'bg-white' : 'bg-white/30'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
