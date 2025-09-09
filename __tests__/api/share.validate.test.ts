import { describe, it, expect } from 'vitest';
import { GET as validateGet } from '@/app/api/share/validate/[token]/route';

// Minimal sanity tests for the unified share validation endpoint
describe('GET /api/share/validate/[token]', () => {
  it('returns 403 for invalid token format', async () => {
    const req = new (await import('next/server')).NextRequest('http://localhost:3000/api/share/validate/short');
    const res = await validateGet(req as any, { params: { token: 'short' } });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.errorCode).toBeDefined();
  });
});

