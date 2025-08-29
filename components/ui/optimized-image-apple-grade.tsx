/**
 * Apple-Grade Image Optimization Component
 * Advanced blur placeholders, progressive loading, and performance monitoring
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion';
import { cn } from '@/lib/utils';
import { photoVariants, springConfig } from '@/lib/design-system/animations';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  blurDataURL?: string;
  placeholder?: 'blur' | 'empty';
  sizes?: string;
  fill?: boolean;
  ageGroup?: 'kindergarten' | 'elementary' | 'secondary';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  lazyLoad?: boolean;
  showLoadingProgress?: boolean;
  aspectRatio?: 'square' | 'portrait' | 'landscape' | number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  rounded?: boolean;
  shadow?: boolean;
  interactive?: boolean;
  watermark?: boolean;
}

// Generate blur placeholder from image
const generateBlurDataURL = (width: number = 40, height: number = 40) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Create a subtle gradient for placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(0.5, '#e5e7eb');
  gradient.addColorStop(1, '#d1d5db');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL();
};

// Apple-grade image component
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  blurDataURL,
  placeholder = 'blur',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  fill = false,
  ageGroup = 'elementary',
  onLoad,
  onError,
  lazyLoad = true,
  showLoadingProgress = true,
  aspectRatio = 'square',
  objectFit = 'cover',
  rounded = true,
  shadow = true,
  interactive = true,
  watermark = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const imageRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(imageRef, { once: true, margin: '100px' });

  // Animation values
  const opacity = useMotionValue(0);
  const scale = useMotionValue(1.1);
  const springOpacity = useSpring(opacity, springConfig);
  const springScale = useSpring(scale, springConfig);

  // Calculate aspect ratio
  const getAspectRatio = () => {
    if (typeof aspectRatio === 'number') return aspectRatio;
    switch (aspectRatio) {
      case 'square':
        return 1;
      case 'portrait':
        return 4 / 5;
      case 'landscape':
        return 16 / 9;
      default:
        return 1;
    }
  };

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    opacity.set(1);
    scale.set(1);
    onLoad?.();
  };

  // Handle image error
  const handleError = () => {
    setIsError(true);
    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  };

  // Generate or use provided blur placeholder
  const effectiveBlurDataURL =
    blurDataURL || generateBlurDataURL(width, height);

  // Age-appropriate styling
  const ageStyles = {
    kindergarten: {
      borderRadius: rounded ? '16px' : '0px',
      shadow: shadow ? '0 8px 16px -4px rgba(251, 191, 36, 0.3)' : 'none',
      hoverScale: 1.08,
    },
    elementary: {
      borderRadius: rounded ? '12px' : '0px',
      shadow: shadow ? '0 6px 12px -2px rgba(59, 130, 246, 0.3)' : 'none',
      hoverScale: 1.05,
    },
    secondary: {
      borderRadius: rounded ? '8px' : '0px',
      shadow: shadow ? '0 4px 8px -1px rgba(0, 0, 0, 0.1)' : 'none',
      hoverScale: 1.03,
    },
  };

  const currentAgeStyles = ageStyles[ageGroup];

  // Container styles
  const containerStyles = {
    position: 'relative' as const,
    width: fill ? '100%' : width,
    height: fill ? '100%' : height,
    aspectRatio: !fill ? getAspectRatio() : undefined,
    borderRadius: currentAgeStyles.borderRadius,
    boxShadow: currentAgeStyles.shadow,
    overflow: 'hidden',
  };

  // Watermark overlay for Supabase optimization requirement
  const WatermarkOverlay = () =>
    watermark ? (
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-2 right-2 rounded bg-black/20 px-2 py-1 text-xs text-white backdrop-blur-sm">
          LookEscolar
        </div>
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ctext x='20' y='20' text-anchor='middle' dominant-baseline='middle' font-size='8' fill='%23000'%3ELE%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '40px 40px',
          }}
        />
      </div>
    ) : null;

  // Loading progress indicator
  const LoadingProgress = () =>
    showLoadingProgress && !isLoaded && !isError ? (
      <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-gray-100">
        <div className="text-sm text-gray-400">Cargando...</div>
      </div>
    ) : null;

  // Error state
  const ErrorState = () =>
    isError ? (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto mb-2 h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-xs">Error al cargar imagen</p>
        </div>
      </div>
    ) : null;

  return (
    <motion.div
      ref={imageRef}
      className={cn('relative overflow-hidden', className)}
      style={containerStyles}
      variants={interactive ? photoVariants : undefined}
      initial={interactive ? 'initial' : undefined}
      animate={interactive && isInView ? 'animate' : undefined}
      whileHover={
        interactive
          ? {
              scale: currentAgeStyles.hoverScale,
              transition: springConfig,
            }
          : undefined
      }
      whileTap={
        interactive
          ? {
              scale: currentAgeStyles.hoverScale * 0.95,
              transition: { ...springConfig, duration: 0.1 },
            }
          : undefined
      }
    >
      {/* Main image */}
      {(isInView || priority || !lazyLoad) && (
        <motion.div
          className="relative h-full w-full"
          style={{
            opacity: springOpacity,
            scale: springScale,
          }}
        >
          <Image
            src={src}
            alt={alt}
            width={fill ? undefined : width}
            height={fill ? undefined : height}
            fill={fill}
            priority={priority}
            quality={quality}
            placeholder={placeholder}
            blurDataURL={effectiveBlurDataURL}
            sizes={sizes}
            className={cn(
              'transition-all duration-500',
              isLoaded ? 'blur-0' : 'blur-sm'
            )}
            style={{
              objectFit,
            }}
            onLoad={handleLoad}
            onError={handleError}
          />

          <WatermarkOverlay />
        </motion.div>
      )}

      <LoadingProgress />
      <ErrorState />
    </motion.div>
  );
};

// Gallery-specific optimized image component
export const GalleryImage: React.FC<
  OptimizedImageProps & {
    index?: number;
    selected?: boolean;
    onSelect?: () => void;
  }
> = ({
  index = 0,
  selected = false,
  onSelect,
  ageGroup = 'elementary',
  ...props
}) => {
  return (
    <motion.div
      className={cn(
        'cursor-pointer transition-all duration-200',
        selected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      variants={photoVariants}
      custom={index}
      whileHover="hover"
      whileTap="tap"
      animate={selected ? 'selected' : 'animate'}
      onClick={onSelect}
    >
      <OptimizedImage
        {...props}
        ageGroup={ageGroup}
        interactive={true}
        watermark={true}
      />
    </motion.div>
  );
};

// Avatar-specific optimized image component
export const AvatarImage: React.FC<
  OptimizedImageProps & {
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    status?: 'online' | 'offline' | 'busy' | 'away';
  }
> = ({ size = 'md', status, ...props }) => {
  const sizeMap = {
    xs: { width: 24, height: 24 },
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 48, height: 48 },
    xl: { width: 64, height: 64 },
    '2xl': { width: 80, height: 80 },
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  };

  const dimensions = sizeMap[size];

  return (
    <div className="relative">
      <OptimizedImage
        {...props}
        {...dimensions}
        aspectRatio="square"
        rounded={true}
        interactive={false}
        watermark={false}
        className={cn('ring-2 ring-white', props.className)}
      />

      {status && (
        <div
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-white',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
