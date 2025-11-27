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
  // Try preview path first - ensure it's a string
  if (previewPath && typeof previewPath === 'string') {
    if (previewPath.startsWith('http')) return previewPath;

    // Normalize to path relative to the previews/ folder
    let relative = previewPath;
    const idx = previewPath.indexOf('/previews/');
    if (idx >= 0) {
      relative = previewPath.slice(idx + '/previews/'.length);
    } else if (previewPath.startsWith('previews/')) {
      relative = previewPath.slice('previews/'.length);
    }

    // Basic guard: must look like an image path
    if (/\.(png|jpg|jpeg|webp|gif|avif)$/i.test(relative)) {
      // Use admin proxy URL which handles multiple storage paths internally
      return `/admin/previews/${relative}`;
    }
  }

  // Fallback to original path if preview not available - ensure it's a string
  if (originalPath && typeof originalPath === 'string') {
    if (originalPath.startsWith('http')) return originalPath;

    // Extract filename from original path for preview lookup
    const filename = originalPath.split('/').pop();
    if (filename && /\.(png|jpg|jpeg|webp|gif|avif)$/i.test(filename)) {
      return `/admin/previews/${filename}`;
    }
  }

  return null;
};














