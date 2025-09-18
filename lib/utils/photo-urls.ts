/**
 * Utility functions for generating photo URLs
 * Provides fallback preview generation for the new unified asset system
 */

/**
 * Generates a preview URL from a photo's preview_path or storage_path
 * Falls back to the public preview route as a last resort
 */
export function generatePhotoPreviewUrl(photo: {
  preview_path?: string | null;
  storage_path?: string | null;
  signed_url?: string | null;
  watermark_path?: string | null;
  id?: string;
}): string {
  // Priority order:
  // 1. signed_url (if available and valid)
  // 2. watermark_path (for watermarked previews)
  // 3. preview_path (for optimized previews)
  // 4. storage_path via public preview route
  // 5. fallback placeholder

  if (photo.signed_url) {
    return photo.signed_url;
  }

  if (photo.watermark_path) {
    return generatePublicPreviewUrl(photo.watermark_path);
  }

  if (photo.preview_path) {
    return generatePublicPreviewUrl(photo.preview_path);
  }

  if (photo.storage_path) {
    return generatePublicPreviewUrl(photo.storage_path);
  }

  // Fallback to red square placeholder
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGMzNTQ1Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBQcmV2aWV3PC90ZXh0Pgo8L3N2Zz4K';
}

/**
 * Generates a public preview URL using the public preview route
 * This route handles fallback from preview_path to watermark_path to placeholder
 */
export function generatePublicPreviewUrl(path: string): string {
  if (!path) return generatePhotoPreviewUrl({});

  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Use our public preview route which has fallback logic
  return `/api/public/preview/${cleanPath}`;
}

/**
 * Transforms a photo object to ensure it has the correct URL fields
 * for compatibility with different components
 */
export function normalizePhotoUrls<T extends {
  preview_path?: string | null;
  storage_path?: string | null;
  signed_url?: string | null;
  watermark_path?: string | null;
  id?: string;
}>(photo: T): T & {
  signed_url: string;
  preview_url: string;
  thumbnail_url: string;
} {
  const previewUrl = generatePhotoPreviewUrl(photo);

  return {
    ...photo,
    signed_url: previewUrl,
    preview_url: previewUrl,
    thumbnail_url: previewUrl, // Same for thumbnails for now
  };
}

/**
 * Batch normalize multiple photos
 */
export function normalizePhotosUrls<T extends {
  preview_path?: string | null;
  storage_path?: string | null;
  signed_url?: string | null;
  watermark_path?: string | null;
  id?: string;
}>(photos: T[]): Array<T & {
  signed_url: string;
  preview_url: string;
  thumbnail_url: string;
}> {
  return photos.map(normalizePhotoUrls);
}