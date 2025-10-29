'use client';

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface SafeImageProps {
  src: string | null;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

/**
 * Component to handle image loading with proper error handling to prevent loops.
 * Extracted from PhotoAdmin for reusability.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy',
}) => {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  // Reset error state when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setHasError(false);
      setCurrentSrc(src);
    }
  }, [src, currentSrc]);

  if (!src || hasError) {
    return <ImageIcon className="h-8 w-8 text-gray-400" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={(e) => {
        console.warn(`Preview failed to load: ${src}`);
        setHasError(true);
        // Prevent browser from retrying the same URL
        (e.target as HTMLImageElement).src = '';
      }}
    />
  );
};


