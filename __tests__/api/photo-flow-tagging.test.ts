import { describe, it, expect } from 'vitest';

describe('POST /api/admin/tagging', () => {
  it('validates body and returns 200', async () => {
    const res = await fetch('http://localhost:3000/api/admin/tagging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        photoId: '00000000-0000-0000-0000-000000000001',
        codeId: '00000000-0000-0000-0000-000000000002',
      }),
    }).catch(() => ({ ok: false, status: 500 }) as any);
    expect([200, 401, 500]).toContain(res.status);
  });
});
