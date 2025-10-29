import { describe, it, expect } from 'vitest';
import { getPreviewUrl } from '@/components/admin/photo-admin/services/preview-url.service';

describe('getPreviewUrl', () => {
  it('should return preview URL for valid preview path', () => {
    const result = getPreviewUrl('previews/test-image.jpg', null);
    expect(result).toBe('/admin/previews/test-image.jpg');
  });

  it('should handle absolute URLs', () => {
    const result = getPreviewUrl('https://example.com/image.jpg', null);
    expect(result).toBe('https://example.com/image.jpg');
  });

  it('should extract filename from path with /previews/', () => {
    const result = getPreviewUrl('photos/previews/test-image.jpg', null);
    expect(result).toBe('/admin/previews/test-image.jpg');
  });

  it('should return null for non-image files', () => {
    const result = getPreviewUrl('previews/test-file.pdf', null);
    expect(result).toBeNull();
  });

  it('should fallback to original path when preview is null', () => {
    const result = getPreviewUrl(null, 'uploads/original-image.jpg');
    expect(result).toBe('/admin/previews/original-image.jpg');
  });

  it('should handle various image formats', () => {
    const formats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    
    formats.forEach(format => {
      const result = getPreviewUrl(`previews/test.${format}`, null);
      expect(result).toBe(`/admin/previews/test.${format}`);
    });
  });

  it('should normalize paths correctly', () => {
    const testCases = [
      { input: 'previews/photo.jpg', expected: '/admin/previews/photo.jpg' },
      { input: 'photos/previews/photo.jpg', expected: '/admin/previews/photo.jpg' },
      { input: 'uploads/previews/photo.jpg', expected: '/admin/previews/photo.jpg' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = getPreviewUrl(input, null);
      expect(result).toBe(expected);
    });
  });

  it('should return null for invalid inputs', () => {
    expect(getPreviewUrl(null, null)).toBeNull();
    expect(getPreviewUrl('', '')).toBeNull();
  });
});


