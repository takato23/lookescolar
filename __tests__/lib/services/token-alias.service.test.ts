import { vi, expect, describe, it } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(async () => ({})),
}));

describe('token-alias service module', () => {
  it('exports helpers without triggering initialization reference errors', async () => {
    const module = await import('@/lib/services/token-alias.service');

    expect(module.ensureAliasForToken).toBeTypeOf('function');
    expect(module.tokenAliasService).toBeDefined();
  });
});
