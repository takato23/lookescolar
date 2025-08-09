import { describe, it, expect, vi } from 'vitest';

// Mocks rápidos para evitar I/O real
vi.mock('@/lib/storage/signedUrl', () => ({
  signedUrlForKey: async (key: string) => `https://signed.local/${encodeURIComponent(key)}?sig=fake&exp=999999`,
}));

describe('Perf Smoke (mocks)', () => {
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

  it('A) firmar 100 keys < 500ms (CI: < 1500ms)', async () => {
    const { signedUrlForKey } = await import('@/lib/storage/signedUrl');
    const keys = Array.from({ length: 100 }, (_, i) => `events/evt/preview_${i}.webp`);
    const start = performance.now();
    const urls = await Promise.all(keys.map((k) => signedUrlForKey(k)));
    const dur = performance.now() - start;
    expect(urls.length).toBe(100);
    expect(urls[0]).toMatch(/^https:\/\/signed\.local\//);
    const threshold = isCI ? 1500 : 500;
    // si la máquina es muy lenta fuera de CI, relajamos
    const laxThreshold = process.env.SLOW_MACHINE ? Number(process.env.SLOW_MACHINE) : threshold;
    expect(dur).toBeLessThan(laxThreshold);
  });

  it('B) groupBetweenAnchors dryRun con 1k fotos < 1500ms (CI: < 3000ms)', async () => {
    // Generar 1k fotos en memoria (500 anclas intercaladas) y codes
    const eventId = 'evt_perf';
    const photos = [] as Array<any>;
    const base = new Date(); base.setHours(9, 0, 0, 0);
    for (let i = 0; i < 1000; i++) {
      const isAnchor = i % 2 === 0; // 500 anclas
      photos.push({ id: `p_${i}`, code_id: null, is_anchor: isAnchor, anchor_raw: isAnchor ? `SV-${String(1 + (i % 6)).padStart(3, '0')}` : null, exif_taken_at: new Date(base.getTime() + i * 1000).toISOString(), created_at: new Date(base.getTime() + i * 1000).toISOString(), original_filename: `f_${i}.jpg` });
    }
    const codes = ['SV-001', 'SV-002', 'SV-003', 'SV-004', 'SV-005', 'SV-006'].map((cv, idx) => ({ id: `c_${idx}`, code_value: cv }));

    // Mock del cliente de supabase de service role para devolver arrays
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseServiceClient: async () => ({
        from: (table: string) => {
          if (table === 'photos') {
            return { select: () => ({ eq: () => ({ data: photos, error: null }) }) } as any;
          }
          if (table === 'codes') {
            return { select: () => ({ eq: () => ({ data: codes, error: null }) }) } as any;
          }
          return { select: () => ({}) } as any;
        },
      }),
    }));
    const { groupBetweenAnchors } = await import('@/lib/photos/groupBetweenAnchors');

    const start = performance.now();
    const summary = await groupBetweenAnchors(eventId, { dryRun: true });
    const dur = performance.now() - start;
    expect(summary).toBeTruthy();
    const threshold = isCI ? 3000 : 1500;
    const laxThreshold = process.env.SLOW_MACHINE ? Number(process.env.SLOW_MACHINE) : threshold;
    expect(dur).toBeLessThan(laxThreshold);
  });
});


