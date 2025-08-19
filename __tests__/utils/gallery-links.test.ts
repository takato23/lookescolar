import { describe, it, expect, vi } from 'vitest';
import { generateFamilyGalleryLink, generateQRLink, isLegacyGalleryLink, migrateLegacyLink } from '@/lib/utils/gallery-links';

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  featureFlags: {
    UNIFIED_GALLERY_ENABLED: true,
    FAMILY_IN_GALLERY_ROUTE: true,
    TOKEN_AUTO_DETECTION: true,
    LEGACY_FALLBACK_ENABLED: true,
  }
}));

describe('Gallery Links Utility', () => {
  describe('generateFamilyGalleryLink', () => {
    it('should generate unified gallery links when feature flags are enabled', () => {
      const result = generateFamilyGalleryLink({
        token: '4ecebc495344b51b5b3cae049d27edd2',
        eventId: 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74',
        origin: 'http://localhost:3002'
      });

      expect(result).toBe('http://localhost:3002/gallery/a7eed8dd-a432-4dbe-9cd8-328338fa5c74?token=4ecebc495344b51b5b3cae049d27edd2');
    });

    it('should fallback to legacy format when eventId is missing', () => {
      const result = generateFamilyGalleryLink({
        token: '4ecebc495344b51b5b3cae049d27edd2',
        origin: 'http://localhost:3002'
      });

      expect(result).toBe('http://localhost:3002/f/4ecebc495344b51b5b3cae049d27edd2/simple-page');
    });

    it('should handle missing origin gracefully', () => {
      const result = generateFamilyGalleryLink({
        token: '4ecebc495344b51b5b3cae049d27edd2',
        eventId: 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74'
      });

      // Should work without throwing an error
      expect(result).toContain('/gallery/a7eed8dd-a432-4dbe-9cd8-328338fa5c74?token=4ecebc495344b51b5b3cae049d27edd2');
    });
  });

  describe('generateQRLink', () => {
    it('should generate correct QR API endpoint', () => {
      const result = generateQRLink('4ecebc495344b51b5b3cae049d27edd2', 'http://localhost:3002');
      expect(result).toBe('http://localhost:3002/api/qr?token=4ecebc495344b51b5b3cae049d27edd2');
    });
  });

  describe('isLegacyGalleryLink', () => {
    it('should detect legacy gallery links', () => {
      const legacyUrl = 'http://localhost:3002/f/4ecebc495344b51b5b3cae049d27edd2/simple-page';
      expect(isLegacyGalleryLink(legacyUrl)).toBe(true);
    });

    it('should not detect unified gallery links as legacy', () => {
      const unifiedUrl = 'http://localhost:3002/gallery/a7eed8dd-a432-4dbe-9cd8-328338fa5c74?token=4ecebc495344b51b5b3cae049d27edd2';
      expect(isLegacyGalleryLink(unifiedUrl)).toBe(false);
    });
  });

  describe('migrateLegacyLink', () => {
    it('should migrate legacy link to unified format', () => {
      const legacyUrl = 'http://localhost:3002/f/4ecebc495344b51b5b3cae049d27edd2/simple-page';
      const eventId = 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74';
      
      const result = migrateLegacyLink(legacyUrl, eventId);
      expect(result).toBe('http://localhost:3002/gallery/a7eed8dd-a432-4dbe-9cd8-328338fa5c74?token=4ecebc495344b51b5b3cae049d27edd2');
    });

    it('should return original URL if not legacy format', () => {
      const unifiedUrl = 'http://localhost:3002/gallery/a7eed8dd-a432-4dbe-9cd8-328338fa5c74?token=4ecebc495344b51b5b3cae049d27edd2';
      
      const result = migrateLegacyLink(unifiedUrl, 'some-event-id');
      expect(result).toBe(unifiedUrl);
    });

    it('should handle migration errors gracefully', () => {
      const malformedUrl = 'not-a-valid-url';
      
      const result = migrateLegacyLink(malformedUrl, 'some-event-id');
      expect(result).toBe(malformedUrl);
    });
  });
});