/**
 * Service for handling preview URL conversions with proper normalization
 * Extracted from PhotoAdmin for reusability and consistency
 */

/**
 * Enhanced utility function to convert preview path to proxy URL (admin-only access)
 */
export const getPreviewUrl = (
  previewPath: string | null | undefined,
  originalPath?: string | null
): string | null => {
  const isImagePath = (value: string) =>
    /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(value);
  const normalizePath = (value: string) => value.replace(/^\/+/, '').trim();

  if (previewPath && typeof previewPath === 'string') {
    if (previewPath.startsWith('http')) return previewPath;
    const normalized = normalizePath(previewPath);
    if (isImagePath(normalized)) {
      return `/admin/previews/${normalized}`;
    }
    const filename = normalized.split('/').pop();
    if (filename && isImagePath(filename)) {
      return `/admin/previews/${filename}`;
    }
  }

  if (originalPath && typeof originalPath === 'string') {
    if (originalPath.startsWith('http')) return originalPath;
    const normalized = normalizePath(originalPath);
    if (isImagePath(normalized)) {
      return `/admin/previews/${normalized}`;
    }
    const filename = normalized.split('/').pop();
    if (filename && isImagePath(filename)) {
      return `/admin/previews/${filename}`;
    }
  }

  return null;
};















