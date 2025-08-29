/**
 * Optimized Image Hook
 *
 * Provides lazy loading, WebP support, and responsive images
 * Optimized for minimal bandwidth usage
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface ImageResolution {
  width: number;
  url: string;
  format: 'webp' | 'jpeg';
}

interface OptimizedImageOptions {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface OptimizedImageResult {
  src: string;
  srcSet: string;
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  ref: React.RefObject<HTMLImageElement>;
  handleLoad: () => void;
  handleError: () => void;
}

export function useOptimizedImage(
  options: OptimizedImageOptions
): OptimizedImageResult {
  const {
    src,
    alt,
    sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    priority = false,
    quality = 75,
    placeholder = 'empty',
    blurDataURL,
    onLoad,
    onError,
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(
    placeholder === 'blur' && blurDataURL ? blurDataURL : ''
  );
  const [currentSrcSet, setCurrentSrcSet] = useState('');

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Check WebP support
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);

  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      setSupportsWebP(dataURL.indexOf('data:image/webp') === 0);
    };

    checkWebPSupport();
  }, []);

  // Generate responsive image URLs
  const generateImageUrls = useCallback(
    (baseSrc: string): { src: string; srcSet: string } => {
      if (!baseSrc) return { src: '', srcSet: '' };

      // Define responsive breakpoints
      const breakpoints = [400, 800, 1200, 1600];
      const format = supportsWebP ? 'webp' : 'jpeg';

      // Extract base URL and filename
      const url = new URL(baseSrc, window.location.origin);
      const pathParts = url.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];
      const basePath = pathParts.slice(0, -1).join('/');

      // Generate different sizes
      const srcSetEntries = breakpoints
        .map((width) => {
          const optimizedFilename = `${width}w_${format}_${filename}`;
          const optimizedUrl = `${basePath}/optimized/${optimizedFilename}`;
          return `${optimizedUrl} ${width}w`;
        })
        .join(', ');

      // Default src (largest size)
      const defaultFilename = `${breakpoints[breakpoints.length - 1]}w_${format}_${filename}`;
      const defaultSrc = `${basePath}/optimized/${defaultFilename}`;

      return {
        src: defaultSrc,
        srcSet: srcSetEntries,
      };
    },
    [supportsWebP]
  );

  // Handle intersection observer for lazy loading
  useEffect(() => {
    if (!imgRef.current || priority || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const { src: optimizedSrc, srcSet } = generateImageUrls(src);
            setCurrentSrc(optimizedSrc);
            setCurrentSrcSet(srcSet);

            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters viewport
        threshold: 0.1,
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, priority, isLoaded, generateImageUrls]);

  // Handle priority loading
  useEffect(() => {
    if (priority && src && supportsWebP !== null) {
      const { src: optimizedSrc, srcSet } = generateImageUrls(src);
      setCurrentSrc(optimizedSrc);
      setCurrentSrcSet(srcSet);
    }
  }, [priority, src, supportsWebP, generateImageUrls]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setIsLoaded(true);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);

    // Fallback to original image
    if (currentSrc !== src) {
      setCurrentSrc(src);
      setCurrentSrcSet('');
      return;
    }

    const error = new Error(`Failed to load image: ${src}`);
    onError?.(error);
  }, [src, currentSrc, onError]);

  // Preload critical images
  useEffect(() => {
    if (priority && currentSrc && supportsWebP !== null) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = currentSrc;
      if (currentSrcSet) {
        link.setAttribute('imagesrcset', currentSrcSet);
        link.setAttribute('imagesizes', sizes);
      }
      document.head.appendChild(link);

      return () => {
        try {
          document.head.removeChild(link);
        } catch {
          // Link might already be removed
        }
      };
    }
  }, [priority, currentSrc, currentSrcSet, sizes, supportsWebP]);

  return {
    src: currentSrc,
    srcSet: currentSrcSet,
    isLoading,
    isLoaded,
    hasError,
    ref: imgRef,
    handleLoad,
    handleError,
  };
}

/**
 * Hook for progressive image loading
 */
export function useProgressiveImage(
  lowQualitySrc: string,
  highQualitySrc: string,
  options: {
    threshold?: number;
    onHighQualityLoad?: () => void;
  } = {}
) {
  const { threshold = 0.1, onHighQualityLoad } = options;

  const [currentSrc, setCurrentSrc] = useState(lowQualitySrc);
  const [isLoadingHQ, setIsLoadingHQ] = useState(false);
  const [isHQLoaded, setIsHQLoaded] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isHQLoaded) {
            setIsLoadingHQ(true);

            // Preload high quality image
            const hqImage = new Image();
            hqImage.onload = () => {
              setCurrentSrc(highQualitySrc);
              setIsLoadingHQ(false);
              setIsHQLoaded(true);
              onHighQualityLoad?.();
            };
            hqImage.onerror = () => {
              setIsLoadingHQ(false);
            };
            hqImage.src = highQualitySrc;

            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [highQualitySrc, threshold, isHQLoaded, onHighQualityLoad]);

  return {
    src: currentSrc,
    isLoadingHQ,
    isHQLoaded,
    ref: imgRef,
  };
}

/**
 * Hook for image placeholder with blur effect
 */
export function useBlurPlaceholder(src: string, blurAmount = 20) {
  const [placeholderSrc, setPlaceholderSrc] = useState<string>('');

  useEffect(() => {
    if (!src) return;

    // Generate blur placeholder
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Small canvas for blur effect
      canvas.width = 40;
      canvas.height = 30;

      // Draw scaled down image
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const dataURL = canvas.toDataURL('image/jpeg', 0.1);
      setPlaceholderSrc(dataURL);
    };

    img.src = src;
  }, [src, blurAmount]);

  return placeholderSrc;
}
