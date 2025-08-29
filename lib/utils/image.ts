/**
 * Centralized image utility functions
 * Eliminates code duplication and provides consistent image handling
 */

/**
 * Formats file size in bytes to human-readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Formats image dimensions to readable string
 */
export const formatDimensions = (width: number, height: number): string => {
  return `${width} × ${height}`;
};

/**
 * Gets optimal image size for display based on container and device pixel ratio
 */
export const getOptimalImageSize = (
  containerWidth: number,
  containerHeight: number,
  devicePixelRatio = window.devicePixelRatio || 1
): { width: number; height: number } => {
  return {
    width: Math.round(containerWidth * devicePixelRatio),
    height: Math.round(containerHeight * devicePixelRatio),
  };
};

/**
 * Validates image file type
 */
export const isValidImageType = (file: File): boolean => {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];
  return validTypes.includes(file.type.toLowerCase());
};

/**
 * Generates a consistent image alt text based on metadata
 */
export const generateImageAlt = (
  fileName: string,
  subjects?: { name: string; grade?: string }[]
): string => {
  if (subjects && subjects.length > 0) {
    const names = subjects.map((s) => s.name).join(', ');
    return `Photo of ${names}`;
  }

  // Remove file extension and format nicely
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  return `Photo: ${nameWithoutExt.replace(/[-_]/g, ' ')}`;
};

/**
 * Calculates aspect ratio from dimensions
 */
export const calculateAspectRatio = (width: number, height: number): number => {
  return width / height;
};

/**
 * Determines if an image is in landscape or portrait orientation
 */
export const getImageOrientation = (
  width: number,
  height: number
): 'landscape' | 'portrait' | 'square' => {
  const ratio = calculateAspectRatio(width, height);

  if (Math.abs(ratio - 1) < 0.1) return 'square';
  return ratio > 1 ? 'landscape' : 'portrait';
};

/**
 * Image loading states for consistent UI feedback
 */
export enum ImageLoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
}

/**
 * Hook for managing image loading state
 */
export interface UseImageLoaderResult {
  loadingState: ImageLoadingState;
  error: string | null;
  loadImage: (url: string) => Promise<void>;
  preloadImages: (urls: string[]) => Promise<void>;
}
