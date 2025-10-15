/**
 * Optimized Image Component
 *
 * High-performance image component with lazy loading, WebP support,
 * progressive loading, and optimized bandwidth usage
 */

'use client';

import React, { forwardRef } from 'react';
import {
  useOptimizedImage,
  useProgressiveImage,
  useBlurPlaceholder,
} from '@/hooks/useOptimizedImage';
import { cn } from '@/lib/utils';

interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty' | 'progressive';
  blurDataURL?: string;
  fallbackSrc?: string;
  sizes?: string;
  containerClassName?: string;
  loadingClassName?: string;
  errorClassName?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const OptimizedImage = forwardRef<HTMLImageElement, OptimizedImageProps>(
  (
    {
      src,
      alt,
      width,
      height,
      quality = 75,
      priority = false,
      placeholder = 'empty',
      blurDataURL,
      fallbackSrc,
      sizes,
      className,
      containerClassName,
      loadingClassName,
      errorClassName,
      onLoad,
      onError,
      style,
      ...props
    },
    ref
  ) => {
    // Generate blur placeholder if needed
    const generatedBlurSrc = useBlurPlaceholder(src);
    const finalBlurDataURL = blurDataURL || generatedBlurSrc;

    // Use progressive loading for better UX
    const shouldUseProgressive =
      placeholder === 'progressive' && finalBlurDataURL;

    const progressiveResult = useProgressiveImage(
      shouldUseProgressive ? finalBlurDataURL : '',
      shouldUseProgressive ? src : '',
      {
        onHighQualityLoad: onLoad,
      }
    );

    const optimizedResult = useOptimizedImage({
      src: shouldUseProgressive ? progressiveResult.src : src,
      alt,
      sizes,
      priority,
      quality,
      placeholder: shouldUseProgressive ? 'empty' : placeholder,
      blurDataURL: finalBlurDataURL,
      onLoad: shouldUseProgressive ? undefined : onLoad,
      onError,
    });

    // Determine which result to use
    const finalRef = shouldUseProgressive
      ? progressiveResult.ref
      : optimizedResult.ref;
    const finalSrc = shouldUseProgressive
      ? progressiveResult.src
      : optimizedResult.src;
    const finalSrcSet = shouldUseProgressive ? '' : optimizedResult.srcSet;
    const isLoading = shouldUseProgressive
      ? progressiveResult.isLoadingHQ || optimizedResult.isLoading
      : optimizedResult.isLoading;
    const hasError = optimizedResult.hasError;

    // Combine refs
    React.useImperativeHandle(ref, () => finalRef.current!, [finalRef]);

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (fallbackSrc && finalSrc !== fallbackSrc) {
        (e.target as HTMLImageElement).src = fallbackSrc;
        return;
      }
      optimizedResult.handleError();
    };

    return (
      <div
        className={cn('relative overflow-hidden', containerClassName)}
        style={{
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
        }}
      >
        {/* Loading placeholder */}
        {isLoading && !hasError && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-muted',
              loadingClassName
            )}
          >
            <div className="flex items-center space-x-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-gray-600"></div>
              <span className="text-sm text-gray-500">Cargando...</span>
            </div>
          </div>
        )}

        {/* Error placeholder */}
        {hasError && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-muted',
              errorClassName
            )}
          >
            <div className="text-center">
              <div className="mb-2 text-2xl">📷</div>
              <p className="text-sm text-gray-500">Error cargando imagen</p>
            </div>
          </div>
        )}

        {/* Blur placeholder */}
        {placeholder === 'blur' && finalBlurDataURL && isLoading && (
          <img
            src={finalBlurDataURL}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-sm filter"
            aria-hidden="true"
          />
        )}

        {/* Main image */}
        <img
          ref={finalRef}
          src={finalSrc}
          srcSet={finalSrcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={optimizedResult.handleLoad}
          onError={handleError}
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            isLoading && !hasError ? 'opacity-0' : 'opacity-100',
            className
          )}
          style={{
            ...style,
            ...(width &&
              height && {
                aspectRatio: `${width} / ${height}`,
              }),
          }}
          {...props}
        />
      </div>
    );
  }
);

OptimizedImage.displayName = 'OptimizedImage';

/**
 * Gallery-specific optimized image with hover effects
 */
interface GalleryImageProps extends OptimizedImageProps {
  isSelected?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
  showOverlay?: boolean;
}

export const GalleryImage = forwardRef<HTMLImageElement, GalleryImageProps>(
  (
    {
      isSelected = false,
      isSelectable = false,
      onSelect,
      showOverlay = true,
      containerClassName,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          'group relative cursor-pointer overflow-hidden rounded-lg transition-all duration-300',
          isSelectable && 'hover:scale-105 hover:shadow-lg',
          isSelected && 'ring-primary scale-105 shadow-lg ring-2',
          containerClassName
        )}
        onClick={isSelectable ? onSelect : undefined}
      >
        <OptimizedImage
          ref={ref}
          placeholder="progressive"
          quality={85}
          className={cn(
            'transition-all duration-300',
            isSelectable && 'group-hover:brightness-110',
            className
          )}
          containerClassName="aspect-square"
          {...props}
        />

        {/* Overlay */}
        {showOverlay && isSelectable && (
          <div className="absolute inset-0 bg-black bg-opacity-0 transition-all duration-300 group-hover:bg-opacity-10">
            {/* Selection indicator */}
            <div className="absolute right-2 top-2">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isSelected
                    ? 'bg-primary border-primary text-white'
                    : 'border-white bg-black bg-opacity-30 text-white opacity-0 group-hover:opacity-100'
                )}
              >
                {isSelected && (
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

GalleryImage.displayName = 'GalleryImage';

/**
 * Thumbnail image for lists and cards
 */
interface ThumbnailImageProps extends OptimizedImageProps {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'square' | 'circle' | 'rounded';
}

export const ThumbnailImage = forwardRef<HTMLImageElement, ThumbnailImageProps>(
  (
    { size = 'md', shape = 'rounded', containerClassName, className, ...props },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 w-8',
      md: 'h-12 w-12',
      lg: 'h-16 w-16',
    };

    const shapeClasses = {
      square: 'rounded-none',
      circle: 'rounded-full',
      rounded: 'rounded-lg',
    };

    return (
      <OptimizedImage
        ref={ref}
        placeholder="blur"
        quality={60}
        priority={false}
        containerClassName={cn(
          sizeClasses[size],
          shapeClasses[shape],
          containerClassName
        )}
        className={cn('object-cover', className)}
        {...props}
      />
    );
  }
);

ThumbnailImage.displayName = 'ThumbnailImage';

export default OptimizedImage;
