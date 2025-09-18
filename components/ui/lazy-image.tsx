'use client';

import { useState } from 'react';
import { useLazyImage } from '@/lib/hooks/useLazyLoading';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | 'auto';
  showProtectionBadge?: boolean;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  onClick?: () => void;
}

export function LazyImage({
  src,
  alt,
  className,
  fallbackSrc = 'https://placehold.co/800x600?text=Vista+no+disponible',
  aspectRatio = 'auto',
  showProtectionBadge = true,
  loading = 'lazy',
  onLoad,
  onError,
  onClick
}: LazyImageProps) {
  const [hasError, setHasError] = useState(false);
  const [eagerLoaded, setEagerLoaded] = useState(false);
  
  // For eager loading, use the src directly without lazy loading
  const isEager = loading === 'eager';

  const {
    elementRef,
    imageSrc,
    isLoaded,
    isLoading,
    handleImageLoad,
    handleImageError,
  } = useLazyImage({
    src,
    fallbackSrc,
    onLoad,
    onError: () => {
      setHasError(true);
      onError?.();
    },
  });

  const aspectClasses = {
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    landscape: 'aspect-[4/3]',
    auto: ''
  };
  
  // Use src directly for eager loading, otherwise use lazy loaded src
  const displaySrc = isEager ? src : imageSrc;
  const displayLoaded = isEager ? eagerLoaded : isLoaded;

  return (
    <div
      ref={isEager ? undefined : elementRef}
      className={cn(
        'relative overflow-hidden bg-muted',
        aspectClasses[aspectRatio],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {!displayLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      
      {(displaySrc || isEager) && (
        <img
          src={displaySrc || fallbackSrc}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            'select-none pointer-events-none',
            displayLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={isEager ? () => {
            setEagerLoaded(true);
            onLoad?.();
          } : handleImageLoad}
          onError={isEager ? () => {
            setHasError(true);
            onError?.();
          } : handleImageError}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          style={{ 
            userSelect: 'none', 
            WebkitUserDrag: 'none' as any 
          }}
        />
      )}

      {showProtectionBadge && displayLoaded && (
        <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
          Vista protegida
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            No se pudo cargar la imagen
          </span>
        </div>
      )}
    </div>
  );
}

// Componente específico para galerías con animaciones de entrada
interface AnimatedLazyImageProps extends LazyImageProps {
  delay?: number;
}

export function AnimatedLazyImage({
  delay = 0,
  className,
  ...props
}: AnimatedLazyImageProps) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4"
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '500ms',
        animationFillMode: 'both'
      }}
    >
      <LazyImage
        {...props}
        className={cn('transition-all duration-300 hover:scale-105', className)}
      />
    </div>
  );
}