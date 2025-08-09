import { describe, it, beforeAll, afterAll, expect, vi } from 'vitest';
import { seedV1 } from '../../scripts/seed-v1';

// Mocks globales para entorno de test
vi.mock('@/lib/limits/rateLimit', () => ({
  Soft60per10m: { check: async () => ({ allowed: true }) },
  Strong20per10m: { check: async () => ({ allowed: true }) },
}));

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: () => ({ set: async () => true }) },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    constructor(_: any) {}
    async limit() { return { success: true }; }
  }
}));

vi.mock('@/lib/storage/signedUrl', () => ({
  signedUrlForKey: async (key: string) => `https://signed.local/${encodeURIComponent(key)}?sig=fake&exp=999999`,
}));

vi.mock('@/lib/mercadopago/client', () => ({
  preferenceClient: { create: async () => ({ id: 'pref_mock', init_point: 'https://mp/redirect', sandbox_init_point: 'https://mp/sandbox' }) },
  paymentClient: { get: async () => ({ id: 'pay_1', status: 'approved' }) },
  MP_CONFIG: { webhookSecret: 'stub', successUrl: 'http://localhost:3000/f', failureUrl: 'http://localhost:3000/f', pendingUrl: 'http://localhost:3000/f', sandbox: true, publicKey: 'pk_test' }
}));

describe('V1 Flow Integración (estable)', () => {
  let ctx: Awaited<ReturnType<typeof seedV1>>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'stub';
    process.env.STORAGE_BUCKET = process.env.STORAGE_BUCKET || 'photos';

    ctx = await seedV1();
  }, 30000);

  it('1) Anchor-detect: POST /api/admin/anchor-detect { eventId } → detected>=2', async () => {
    const { POST } = await import('@/app/api/admin/anchor-detect/route');
    vi.doMock('@/lib/middleware/auth.middleware', () => ({
      AuthMiddleware: { withAuth: (h: any) => (req: any) => h(req, { isAdmin: true }) },
      SecurityLogger: { logResourceAccess: vi.fn(), logSecurityEvent: vi.fn() },
    }));

    const req = new Request('http://localhost/api/admin/anchor-detect', { method: 'POST', body: JSON.stringify({ eventId: ctx.eventId, onlyMissing: false }) }) as any;
    const res = await (POST as any)(req);
    const data = await res.json();
    expect(res.status).toBeLessThan(500);
    expect((data.detected?.length ?? 0) + 0).toBeGreaterThanOrEqual(2);
  });

  it('2) Group: POST /api/admin/group { eventId } → assigned>0, unassigned>=1', async () => {
    const { POST } = await import('@/app/api/admin/group/route');
    vi.doMock('@/lib/middleware/auth.middleware', () => ({
      AuthMiddleware: { withAuth: (h: any) => (req: any) => h(req, { isAdmin: true }) },
    }));
    const req = new Request('http://localhost/api/admin/group', { method: 'POST', body: JSON.stringify({ eventId: ctx.eventId, dryRun: false }) }) as any;
    const res = await (POST as any)(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect((data.assigned ?? 0)).toBeGreaterThan(0);
    expect((data.unassigned ?? 0)).toBeGreaterThanOrEqual(1);
  });

  it('3) Publish: POST /api/admin/publish { codeId: SV-001 } → token y URL', async () => {
    const { POST } = await import('@/app/api/admin/publish/route');
    const req = new Request('http://localhost/api/admin/publish', { method: 'POST', body: JSON.stringify({ codeId: ctx.codes['SV-001'].id }) }) as any;
    const res = await (POST as any)(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(typeof data.token).toBe('string');
    expect(typeof data.url).toBe('string');
    (global as any).__V1_TOKEN__ = data.token as string;
  });

  it('4) Gallery: GET /api/family/gallery-simple/[token]?page=1&limit=60 → 200, photos.length>=3, URLs firmadas y sin storage_path/code_id', async () => {
    const token = (global as any).__V1_TOKEN__ as string;
    const { GET } = await import('@/app/api/family/gallery-simple/[token]/route');
    const req = new Request(`http://localhost/api/family/gallery-simple/${token}?page=1&limit=60`, { method: 'GET' }) as any;
    const res = await (GET as any)(req, { params: { token } });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect((data.photos?.length ?? 0)).toBeGreaterThanOrEqual(3);
    for (const p of data.photos) {
      expect(p).not.toHaveProperty('storage_path');
      expect(p).not.toHaveProperty('code_id');
      expect(String(p.preview_url)).toMatch(/^https:\/\/signed\.local\//);
    }
  });

  it('5) Selection: POST /api/public/selection { token, selectedPhotoIds, package } → { ok:true, orderId }', async () => {
    const token = (global as any).__V1_TOKEN__ as string;
    const { createServerSupabaseServiceClient } = await import('@/lib/supabase/server');
    const sb = await createServerSupabaseServiceClient();
    // Tomar 2 fotos del code SV-001
    const { data: photos } = await sb.from('photos').select('id').eq('event_id', ctx.eventId).not('code_id', 'is', null).limit(2);
    const selected = (photos || []).map((r: any) => r.id);

    const { POST } = await import('@/app/api/public/selection/route');
    const req = new Request('http://localhost/api/public/selection', { method: 'POST', body: JSON.stringify({ token, selectedPhotoIds: selected, package: 'Combo A' }) }) as any;
    const res = await (POST as any)(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(typeof data.orderId).toBe('string');
    (global as any).__V1_ORDER__ = data.orderId as string;
  });

  it('6) Export: GET /api/admin/orders/export?eventId=... → CSV con fila SV-001', async () => {
    const { GET } = await import('@/app/api/admin/orders/export/route');
    const req = new Request(`http://localhost/api/admin/orders/export?eventId=${ctx.eventId}`, { method: 'GET' }) as any;
    const res = await (GET as any)(req);
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain('code_value');
    expect(text).toMatch(/SV-001/);
  });

  it('7) Unpublish: POST /api/admin/publish/unpublish { codeId } → luego GET galería 403', async () => {
    const { POST } = await import('@/app/api/admin/publish/unpublish/route');
    const token = (global as any).__V1_TOKEN__ as string;
    const codeId = ctx.codes['SV-001'].id;
    const req1 = new Request('http://localhost/api/admin/publish/unpublish', { method: 'POST', body: JSON.stringify({ codeId }) }) as any;
    const res1 = await (POST as any)(req1);
    const data1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(data1.ok).toBe(true);

    const { GET } = await import('@/app/api/family/gallery-simple/[token]/route');
    const req2 = new Request(`http://localhost/api/family/gallery-simple/${token}?page=1&limit=10`, { method: 'GET' }) as any;
    const res2 = await (GET as any)(req2, { params: { token } });
    const data2 = await res2.json();
    expect(res2.status).toBe(403);
    expect(String(data2.error || '')).toMatch(/no está publicado/i);
  });
});


