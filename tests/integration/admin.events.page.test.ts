import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock absoluteUrl to avoid Next.js headers dependency
vi.mock('@/lib/absoluteUrl', () => ({
  absoluteUrl: async (path: string) => `http://localhost:3000${path}`,
}));

// Import after mocks are set
import { getEvents } from '@/app/admin/events/page';

const okResponse = (body: any) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  } as ResponseInit);

const errorResponse = (status = 500, body: any = { error: 'fail' }) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  } as ResponseInit);

describe('admin/events page getEvents()', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns normalized events from primary API when successful', async () => {
    const primaryPayload = [
      {
        id: '1',
        name: 'Acto Escolar',
        location: 'Escuela 123',
        date: '2024-08-01',
        status: 'active',
        stats: { totalPhotos: 10, totalSubjects: 5, totalRevenue: 1000 },
      },
    ];

    const fetchMock = vi
      .spyOn(global, 'fetch' as any)
      // Primary call
      .mockResolvedValueOnce(okResponse(primaryPayload));

    const { events, error } = await getEvents();
    expect(error).toBeNull();
    expect(events).toBeTruthy();
    expect(events?.length).toBe(1);
    expect(events?.[0].school).toBe('Escuela 123');
    expect(events?.[0].stats.totalPhotos).toBe(10);
    expect(events?.[0].stats.totalSubjects).toBe(5);
    expect(events?.[0].stats.totalRevenue).toBe(1000);

    // Ensure called primary endpoint with include_stats=true
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl: string = (fetchMock.mock.calls[0] as any)[0];
    expect(calledUrl).toContain('/api/admin/events');
    expect(calledUrl).toContain('include_stats=true');
  });

  it('falls back to robust API and normalizes snake_case stats', async () => {
    const robustPayload = [
      {
        id: '2',
        name: 'Graduación',
        school: 'Colegio ABC',
        date: '2024-09-10',
        status: 'active',
        stats: { total_photos: 25, total_subjects: 12 },
      },
    ];

    const fetchMock = vi
      .spyOn(global, 'fetch' as any)
      // Primary fails
      .mockResolvedValueOnce(errorResponse(500))
      // Robust succeeds
      .mockResolvedValueOnce(okResponse(robustPayload));

    const { events, error } = await getEvents({ status: 'active' });
    expect(error).toBeNull();
    expect(events).toBeTruthy();
    expect(events?.length).toBe(1);
    expect(events?.[0].school).toBe('Colegio ABC');
    expect(events?.[0].stats.totalPhotos).toBe(25);
    expect(events?.[0].stats.totalSubjects).toBe(12);
    expect(events?.[0].stats.totalRevenue).toBe(0);

    // Ensure both endpoints called, with status filter propagated
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const primaryUrl: string = (fetchMock.mock.calls[0] as any)[0];
    const robustUrl: string = (fetchMock.mock.calls[1] as any)[0];
    expect(primaryUrl).toContain('/api/admin/events');
    expect(primaryUrl).toContain('status=active');
    expect(robustUrl).toContain('/api/admin/events-robust');
    expect(robustUrl).toContain('status=active');
  });
});

