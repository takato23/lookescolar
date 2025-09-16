'use client';

import { useState, useEffect, useRef } from 'react';

interface UseLazyLoadingOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function useLazyLoading({
  root = null,
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError
}: UseLazyLoadingOptions = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded && !isLoading) {
          setIsLoading(true);
          onLoad?.();
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [root, rootMargin, threshold, isLoaded, isLoading, onLoad]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsLoading(false);
    setError(null);
  };

  const handleError = (errorMessage?: string) => {
    setIsLoading(false);
    setError(errorMessage || 'Failed to load');
    onError?.();
  };

  return {
    elementRef,
    isLoaded,
    isLoading,
    error,
    handleLoad,
    handleError,
  };
}

interface UseLazyImageOptions extends UseLazyLoadingOptions {
  src: string;
  fallbackSrc?: string;
}

export function useLazyImage({
  src,
  fallbackSrc,
  ...options
}: UseLazyImageOptions) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const { elementRef, isLoaded, isLoading, error, handleLoad, handleError } = useLazyLoading({
    ...options,
    onLoad: () => {
      setImageSrc(src);
      options.onLoad?.();
    },
  });

  const handleImageLoad = () => {
    handleLoad();
  };

  const handleImageError = () => {
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    } else {
      handleError('Failed to load image');
    }
  };

  return {
    elementRef,
    imageSrc,
    isLoaded,
    isLoading,
    error,
    handleImageLoad,
    handleImageError,
  };
}