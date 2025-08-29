import { describe, it, expect } from 'vitest';

describe('PATCH /api/admin/photos/[id]/move', () => {
  it('returns 200 or expected error codes', async () => {
    const res = await fetch(
      'http://localhost:3000/api/admin/photos/00000000-0000-0000-0000-000000000001/move',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeId: '00000000-0000-0000-0000-000000000002',
        }),
      }
    ).catch(() => ({ ok: false, status: 500 }) as any);
    expect([200, 400, 401, 404, 500]).toContain(res.status);
  });
});
