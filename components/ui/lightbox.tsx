'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Heart, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  url: string;
  alt: string;
  student?: string;
  subject?: string;
}

interface LightboxProps {
  photos: Photo[];
  selectedIndex: number;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onToggleFavorite?: (photoId: string) => void;
  favorites?: string[];
  className?: string;
}

export function Lightbox({
  photos,
  selectedIndex,
  onClose,
  onPrevious,
  onNext,
  onToggleFavorite,
  favorites = [],
  className
}: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const currentPhoto = photos[selectedIndex];
  const isFirst = selectedIndex === 0;
  const isLast = selectedIndex === photos.length - 1;
  const isFavorite = favorites.includes(currentPhoto?.id);

  // Reset zoom and position when photo changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (!isFirst && onPrevious) onPrevious();
          break;
        case 'ArrowRight':
          if (!isLast && onNext) onNext();
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(prev + 0.5, 3));
          break;
        case '-':
          setZoom(prev => Math.max(prev - 0.5, 0.5));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, isFirst, isLast, onClose, onPrevious, onNext]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!currentPhoto) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/95 flex items-center justify-center",
      className
    )}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between text-white">
          <div>
            <h3 className="text-lg font-semibold">
              {currentPhoto.student || currentPhoto.alt}
            </h3>
            {currentPhoto.subject && (
              <p className="text-sm opacity-80">{currentPhoto.subject}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm opacity-80">
              {selectedIndex + 1} de {photos.length}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white"
            onClick={onPrevious}
            disabled={isFirst}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-black/30 hover:bg-black/50 text-white"
            onClick={onNext}
            disabled={isLast}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Controls */}
      <div className="absolute top-16 right-4 z-10 flex flex-col space-y-2">
        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white"
            onClick={() => onToggleFavorite(currentPhoto.id)}
          >
            <Heart className={cn(
              "h-5 w-5",
              isFavorite ? "fill-red-500 text-red-500" : "text-white"
            )} />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white"
          onClick={handleZoomIn}
        >
          <ZoomIn className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white"
          onClick={handleZoomOut}
        >
          <ZoomOut className="h-5 w-5" />
        </Button>
      </div>

      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/30 hover:bg-black/50 text-white"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Image */}
      <div 
        className="relative max-w-[90vw] max-h-[90vh] overflow-hidden cursor-move"
        onDoubleClick={handleResetZoom}
      >
        <img
          src={currentPhoto.url}
          alt={currentPhoto.alt}
          className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
          style={{
            transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
          }}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-4 left-4 z-10 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Click outside to close */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={onClose}
      />
    </div>
  );
}