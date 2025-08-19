// Tests para FASE 2: Contexto familiar en sistema unificado
import { describe, it, expect, vi } from 'vitest';

// Mock feature flags con unified gallery habilitado
vi.mock('@/lib/feature-flags', () => ({
  featureFlags: {
    UNIFIED_GALLERY_ENABLED: true,
    DEBUG_MIGRATION: true,
  },
  debugMigration: vi.fn(),
}));

describe('Unified Gallery Phase 2 - Family Context', () => {
  it('should detect family context with valid token', async () => {
    // Import detectGalleryContext después del mock
    const { detectGalleryContext } = await import('@/lib/gallery-context');
    
    const searchParams = new URLSearchParams('?token=4ecebc495344b51b5b3cae049d27edd2');
    
    const result = detectGalleryContext({
      eventId: 'b8ff4cfe-5543-5eef-ae9d-439449gb6d85',
      searchParams,
    });
    
    expect(result.context).toBe('family');
    expect(result.eventId).toBe('b8ff4cfe-5543-5eef-ae9d-439449gb6d85');
    expect(result.token).toBe('4ecebc495344b51b5b3cae049d27edd2');
  });

  it('should detect public context without token', async () => {
    const { detectGalleryContext } = await import('@/lib/gallery-context');
    
    const searchParams = new URLSearchParams();
    
    const result = detectGalleryContext({
      eventId: 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74',
      searchParams,
    });
    
    expect(result.context).toBe('public');
    expect(result.eventId).toBe('a7eed8dd-a432-4dbe-9cd8-328338fa5c74');
    expect(result.token).toBeUndefined();
  });

  it('should handle family context with legacy redirect flag', async () => {
    const { detectGalleryContext } = await import('@/lib/gallery-context');
    
    const searchParams = new URLSearchParams();
    searchParams.set('token', '5fdfcd506455c62c6c4dbf059e38fee3');
    searchParams.set('from', 'legacy');
    
    const result = detectGalleryContext({
      eventId: 'c9ff4cfe-6644-6fef-bf0d-549559hc7d96',
      searchParams,
    });
    
    expect(result.context).toBe('family');
    expect(result.isLegacyRedirect).toBe(true);
    expect(result.token).toBe('5fdfcd506455c62c6c4dbf059e38fee3');
  });

  it('should validate feature flags for family context support', async () => {
    const { featureFlags } = await import('@/lib/feature-flags');
    
    // Verificar que la galería unificada está habilitada para soportar contexto familiar
    expect(featureFlags.UNIFIED_GALLERY_ENABLED).toBe(true);
    
    // En desarrollo, debug debería estar habilitado
    expect(featureFlags.DEBUG_MIGRATION).toBe(true);
  });

  it('should require minimum token length for family detection', async () => {
    const { detectGalleryContext } = await import('@/lib/gallery-context');
    
    const searchParams = new URLSearchParams('?token=short');
    
    const result = detectGalleryContext({
      eventId: 'a7eed8dd-a432-4dbe-9cd8-328338fa5c74', 
      searchParams,
    });
    
    // Token muy corto debería resultar en contexto público
    expect(result.context).toBe('public');
    expect(result.token).toBeUndefined();
  });

  it('should handle mixed context parameters correctly', async () => {
    const { detectGalleryContext } = await import('@/lib/gallery-context');
    
    // Token en query params debería tomar precedencia
    const searchParams = new URLSearchParams('?token=6ggedc517566d73d7d5ecf160f49ffe4');
    
    const result = detectGalleryContext({
      eventId: 'd0ff4cfe-7755-7fef-cf1d-659669id8e07',
      token: '4ecebc495344b51b5b3cae049d27edd2', // Este debería ser ignorado
      searchParams,
    });
    
    expect(result.context).toBe('family');
    expect(result.token).toBe('6ggedc517566d73d7d5ecf160f49ffe4'); // Del searchParams
  });
});