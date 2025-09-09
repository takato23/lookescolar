import { describe, it, expect } from 'vitest';
import { extractTokenFromStoreUrl } from '@/lib/utils/store';

describe('extractTokenFromStoreUrl', () => {
  it('extrae token desde URL absoluta', () => {
    const url = 'https://example.com/store-unified/abcdef1234567890abcdef1234567890?step=payment';
    expect(extractTokenFromStoreUrl(url)).toBe('abcdef1234567890abcdef1234567890');
  });

  it('extrae token desde ruta relativa', () => {
    const url = '/store-unified/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(extractTokenFromStoreUrl(url)).toBe(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    );
  });

  it('devuelve null si no encuentra token', () => {
    expect(extractTokenFromStoreUrl('/not-store/abc')).toBeNull();
  });
});

