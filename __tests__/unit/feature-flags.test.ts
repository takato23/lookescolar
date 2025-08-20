// Tests para sistema de feature flags
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { validateFeatureFlags, debugMigration } from '@/lib/feature-flags';

// Mock console.log for debug tests
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Feature Flags', () => {
  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe('validateFeatureFlags', () => {
    beforeEach(() => {
      // Reset environment variables
      delete process.env.FF_UNIFIED_GALLERY_ENABLED;
      delete process.env.FF_FAMILY_IN_GALLERY_ROUTE;
      delete process.env.FF_TOKEN_AUTO_DETECTION;
      delete process.env.FF_LEGACY_FALLBACK_ENABLED;
    });

    it('should pass validation with default configuration', () => {
      const result = validateFeatureFlags();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require legacy fallback when unified gallery is enabled', async () => {
      process.env.FF_UNIFIED_GALLERY_ENABLED = 'true';
      process.env.FF_LEGACY_FALLBACK_ENABLED = 'false';
      
      // Re-import to get updated flags
      vi.resetModules();
      const { validateFeatureFlags } = await import('@/lib/feature-flags');
      
      const result = validateFeatureFlags();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('LEGACY_FALLBACK_ENABLED debe estar activado durante migración');
    });

    it('should require token detection when family route is enabled', async () => {
      process.env.FF_FAMILY_IN_GALLERY_ROUTE = 'true';
      process.env.FF_TOKEN_AUTO_DETECTION = 'false';
      
      vi.resetModules();
      const { validateFeatureFlags } = await import('@/lib/feature-flags');
      
      const result = validateFeatureFlags();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('FAMILY_IN_GALLERY_ROUTE requiere TOKEN_AUTO_DETECTION');
    });
  });

  describe('debugMigration', () => {
    it('should not log when debug is disabled', async () => {
      process.env.FF_DEBUG_MIGRATION = 'false';
      
      vi.resetModules();
      const { debugMigration } = await import('@/lib/feature-flags');
      
      debugMigration('test message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log when debug is enabled', async () => {
      process.env.FF_DEBUG_MIGRATION = 'true';
      
      vi.resetModules();
      const { debugMigration } = await import('@/lib/feature-flags');
      
      debugMigration('test message', { data: 'test' });
      expect(consoleSpy).toHaveBeenCalledWith(
        '🔧 [Migration Debug] test message',
        { data: 'test' }
      );
    });
  });
});