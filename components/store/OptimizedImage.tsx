'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  quality?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  blurDataURL?: string;
  aspectRatio?: string;
}

/**
 * Optimized image component with Next.js Image optimization
 * Features:
 * - Automatic WebP conversion
 * - Responsive srcset generation
 * - Blur placeholder
 * - Lazy loading by default
 * - Preload for above-the-fold images
 * - Proper sizing to prevent CLS
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
  fill = false,
  objectFit = 'cover',
  quality = 80,
  loading,
  onLoad,
  blurDataURL,
  aspectRatio,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Generate shimmer placeholder if no blurDataURL provided
  const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f3f4f6" offset="20%" />
      <stop stop-color="#e5e7eb" offset="50%" />
      <stop stop-color="#f3f4f6" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f3f4f6" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

  const toBase64 = (str: string) =>
    typeof window === 'undefined'
      ? Buffer.from(str).toString('base64')
      : window.btoa(str);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
  };

  // Default sizes for responsive images
  const defaultSizes = sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

  // Fallback for error state
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          className
        )}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        <svg
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  if (fill) {
    return (
      <div className={cn('relative overflow-hidden', className)} style={aspectRatio ? { aspectRatio } : undefined}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={defaultSizes}
          quality={quality}
          priority={priority}
          loading={loading || (priority ? 'eager' : 'lazy')}
          placeholder={blurDataURL ? 'blur' : 'empty'}
          blurDataURL={blurDataURL || `data:image/svg+xml;base64,${toBase64(shimmer(700, 475))}`}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            objectFit === 'cover' && 'object-cover',
            objectFit === 'contain' && 'object-contain',
            objectFit === 'fill' && 'object-fill'
          )}
          style={{ objectFit }}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)} style={aspectRatio ? { aspectRatio } : undefined}>
      <Image
        src={src}
        alt={alt}
        width={width || 800}
        height={height || 600}
        sizes={defaultSizes}
        quality={quality}
        priority={priority}
        loading={loading || (priority ? 'eager' : 'lazy')}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL || `data:image/svg+xml;base64,${toBase64(shimmer(width || 800, height || 600))}`}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill'
        )}
        style={{ objectFit, width: '100%', height: 'auto' }}
      />
    </div>
  );
}

/**
 * Optimized photo grid image component
 * Specifically designed for gallery grids with proper aspect ratio
 */
export function GridPhotoImage({
  src,
  alt,
  priority = false,
  className,
  onLoad,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  onLoad?: () => void;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      quality={75}
      objectFit="cover"
      aspectRatio="1/1"
      className={className}
      onLoad={onLoad}
    />
  );
}

/**
 * Optimized hero/cover image component
 * Higher quality for main promotional images
 */
export function HeroCoverImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      priority
      sizes="100vw"
      quality={90}
      objectFit="cover"
      className={className}
    />
  );
}
