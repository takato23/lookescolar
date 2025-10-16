import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { SecurityValidator } from '@/lib/security/validation';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
  return {};
});

class MockAssetsQuery {
  private readonly rows: any[];
  readonly filters: Array<{ type: string; column: string; value: any }> = [];
  private readonly orders: Array<{ column: string; ascending: boolean }> = [];
  rangeArgs: { from: number; to: number } | null = null;

  constructor(rows: any[]) {
    this.rows = rows;
  }

  select(): this {
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  is(column: string, value: any): this {
    this.filters.push({ type: 'is', column, value });
    return this;
  }

  ilike(column: string, value: any): this {
    this.filters.push({ type: 'ilike', column, value });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ type: 'gte', column, value });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ type: 'lte', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orders.push({
      column,
      ascending: options?.ascending !== false,
    });
    return this;
  }

  range(from: number, to: number) {
    this.rangeArgs = { from, to };
    const filtered = this.execute();
    return Promise.resolve({
      data: filtered.slice(from, to + 1),
      count: filtered.length,
      error: null,
    });
  }

  private execute(): any[] {
    let data = [...this.rows];
    for (const filter of this.filters) {
      data = data.filter((row) => this.matches(row, filter));
    }
    if (this.orders.length > 0) {
      const { column, ascending } = this.orders[this.orders.length - 1];
      data.sort((a, b) => {
        const aValue = this.getValue(a, column);
        const bValue = this.getValue(b, column);
        if (aValue === bValue) return 0;
        if (aValue === undefined || aValue === null) return ascending ? -1 : 1;
        if (bValue === undefined || bValue === null) return ascending ? 1 : -1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return ascending
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return ascending
          ? (aValue as number) > (bValue as number)
            ? 1
            : -1
          : (aValue as number) < (bValue as number)
            ? 1
            : -1;
      });
    }
    return data;
  }

  private matches(
    row: any,
    filter: { type: string; column: string; value: any }
  ): boolean {
    const value = this.getValue(row, filter.column);
    switch (filter.type) {
      case 'eq':
        return value === filter.value;
      case 'is':
        return filter.value === null ? value == null : value === filter.value;
      case 'ilike': {
        if (typeof value !== 'string') return false;
        const needle = String(filter.value).replace(/%/g, '').toLowerCase();
        return value.toLowerCase().includes(needle);
      }
      case 'gte':
        return new Date(value).getTime() >= new Date(filter.value).getTime();
      case 'lte':
        return new Date(value).getTime() <= new Date(filter.value).getTime();
      default:
        return true;
    }
  }

  private getValue(row: any, column: string) {
    return column.split('.').reduce((acc: any, key: string) => {
      if (acc === null || acc === undefined) {
        return acc;
      }
      return acc[key];
    }, row);
  }
}

const supabaseFactory = vi.hoisted(() => ({
  createQueryBuilder: (rows: any[]) => new MockAssetsQuery(rows),
}));

const createServerSupabaseServiceClient = vi.hoisted(() => vi.fn());
const signedUrlForKey = vi.hoisted(() =>
  vi.fn(async (key: string) => `https://signed/${key}`)
);

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: createServerSupabaseServiceClient,
}));

vi.mock('@/lib/storage/signedUrl', () => ({
  signedUrlForKey,
}));

vi.mock('@/lib/middleware/auth-robust.middleware', () => ({
  withRobustAuth: (handler: any) => (request: NextRequest) =>
    handler(request, { user: { id: 'admin-user' }, requestId: 'req-test' }),
}));

const securityLoggerMock = vi.hoisted(() => ({
  logSecurityEvent: vi.fn(),
  logResourceAccess: vi.fn(),
}));

vi.mock('@/lib/middleware/auth.middleware', () => ({
  SecurityLogger: securityLoggerMock,
}));

import { GET, DELETE } from '@/app/api/admin/photos/route';

describe('/api/admin/photos route', () => {
  const EVENT_ID = '11111111-1111-1111-1111-111111111111';
  const OTHER_EVENT_ID = '33333333-3333-3333-3333-333333333333';
  const FOLDER_ID = '22222222-2222-2222-2222-222222222222';
  const OTHER_FOLDER_ID = '44444444-4444-4444-4444-444444444444';
  const ASSET_ID = '55555555-5555-5555-5555-555555555555';
  const OTHER_ASSET_ID = '66666666-6666-6666-6666-666666666666';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://example-project.supabase.co';
    process.env.STORAGE_BUCKET_PREVIEW = 'photos';
    process.env.STORAGE_BUCKET_ORIGINAL = 'photo-private';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.STORAGE_BUCKET_PREVIEW;
    delete process.env.STORAGE_BUCKET_ORIGINAL;
  });

  it('filters assets by event and folder before pagination', async () => {
    const assetsRows = [
      {
        id: ASSET_ID,
        folder_id: FOLDER_ID,
        filename: 'event1-photo.jpg',
        original_path: 'originals/event1-photo.jpg',
        storage_path: 'originals/event1-photo.jpg',
        preview_path: `previews/event1-photo.webp`,
        watermark_path: 'watermarks/event1-photo.webp',
        file_size: 1200,
        mime_type: 'image/jpeg',
        status: 'ready',
        created_at: '2025-03-01T10:00:00.000Z',
        metadata: { approved: false },
        folders: { id: FOLDER_ID, event_id: EVENT_ID },
      },
      {
        id: OTHER_ASSET_ID,
        folder_id: OTHER_FOLDER_ID,
        filename: 'event2-photo.jpg',
        original_path: 'originals/event2-photo.jpg',
        storage_path: 'originals/event2-photo.jpg',
        preview_path: 'previews/event2-photo.webp',
        watermark_path: null,
        file_size: 1500,
        mime_type: 'image/jpeg',
        status: 'ready',
        created_at: '2025-03-02T10:00:00.000Z',
        metadata: { approved: true },
        folders: { id: OTHER_FOLDER_ID, event_id: OTHER_EVENT_ID },
      },
    ];

    let lastBuilder: MockAssetsQuery | null = null;
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'assets') {
          lastBuilder = supabaseFactory.createQueryBuilder(assetsRows);
          return lastBuilder;
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };

    (createServerSupabaseServiceClient as unknown as vi.Mock).mockResolvedValue(
      supabaseMock
    );

    const request = new NextRequest(
      `https://example.com/api/admin/photos?event_id=${EVENT_ID}&code_id=${FOLDER_ID}&limit=10`
    );

    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0]).toMatchObject({
      id: ASSET_ID,
      event_id: EVENT_ID,
      folder_id: FOLDER_ID,
      filename: 'event1-photo.jpg',
    });
    expect(body.counts.total).toBe(1);
    expect(lastBuilder?.filters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          column: 'folders.event_id',
          value: EVENT_ID,
        }),
        expect.objectContaining({
          column: 'folder_id',
          value: FOLDER_ID,
        }),
      ])
    );
    expect(lastBuilder?.rangeArgs).toEqual({ from: 0, to: 9 });
    expect(signedUrlForKey).toHaveBeenCalledWith('previews/event1-photo.webp');
  });

  it('deletes assets and removes storage files from matching buckets', async () => {
    const storageRemovals: Array<{ bucket: string; keys: string[] }> = [];
    const deleteInMock = vi.fn(async () => ({ data: null, error: null }));
    const assetsSelectMock = vi.fn(async () => ({
      data: [
        {
          id: ASSET_ID,
          folder_id: FOLDER_ID,
          original_path: 'originals/photo-1.jpg',
          storage_path: null,
          preview_path: `events/${EVENT_ID}/uploads/photo-1.webp`,
          watermark_path: 'previews/photo-1-watermark.webp',
          folders: { event_id: EVENT_ID },
        },
      ],
      error: null,
    }));

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'assets') {
          return {
            select: vi.fn(() => ({
              in: assetsSelectMock,
            })),
            delete: vi.fn(() => ({
              in: deleteInMock,
            })),
          };
        }
        if (table === 'events') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: EVENT_ID },
                  error: null,
                })),
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
      storage: {
        from: vi.fn((bucket: string) => ({
          remove: vi.fn(async (keys: string[]) => {
            storageRemovals.push({ bucket, keys });
            return { data: null, error: null };
          }),
        })),
      },
    };

    (createServerSupabaseServiceClient as unknown as vi.Mock).mockResolvedValue(
      supabaseMock
    );
    const storagePathSpy = vi
      .spyOn(SecurityValidator, 'isValidStoragePath')
      .mockReturnValue(true);

    const request = new NextRequest('https://example.com/api/admin/photos', {
      method: 'DELETE',
      body: JSON.stringify({ photoIds: [ASSET_ID] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.deleted).toBe(1);
    expect(deleteInMock).toHaveBeenCalledWith('id', [ASSET_ID]);
    expect(storageRemovals).toEqual(
      expect.arrayContaining([
        {
          bucket: 'photos',
          keys: expect.arrayContaining([
            `events/${EVENT_ID}/uploads/photo-1.webp`,
            'previews/photo-1-watermark.webp',
          ]),
        },
        {
          bucket: 'photo-private',
          keys: ['originals/photo-1.jpg'],
        },
      ])
    );

    storagePathSpy.mockRestore();
  });
});
