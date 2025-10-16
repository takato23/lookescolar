import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  resolveAccessTokenMock: vi.fn(),
  getShareTokenByIdMock: vi.fn(),
  recordShareViewMock: vi.fn(),
  getCatalogForEventMock: vi.fn(),
}));

vi.mock('@/lib/services/public-access.service', () => ({
  publicAccessService: {
    resolveAccessToken: mocks.resolveAccessTokenMock,
    getShareTokenById: mocks.getShareTokenByIdMock,
    recordShareView: mocks.recordShareViewMock,
  },
}));

vi.mock('@/lib/services/catalog.service', () => ({
  catalogService: {
    getCatalogForEvent: mocks.getCatalogForEventMock,
  },
}));

vi.mock('@/lib/services/family.service', () => ({
  familyService: {
    getSubjectPhotos: vi.fn(),
    getPhotoInfo: vi.fn(),
    getActiveOrder: vi.fn(),
    trackPhotoView: vi.fn(),
  },
}));

const {
  resolveAccessTokenMock,
  getShareTokenByIdMock,
  recordShareViewMock,
  getCatalogForEventMock,
} = mocks;

const supabaseMock = {
  from: vi.fn(),
  rpc: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(async () => supabaseMock),
}));

// Prevent actual signed URL generation
vi.mock('@/lib/storage/signedUrl', () => ({
  signedUrlForKey: vi.fn(async (key: string) => `https://signed/${key}`),
}));

import {
  galleryService,
  GalleryServiceError,
} from '@/lib/services/gallery.service';

describe('galleryService', () => {
  const baseResolvedAccess = {
    token: {
      token: 'share-token',
      shareTokenId: 'share-id',
      publicAccessId: 'access-id',
      accessType: 'share_photos',
      isLegacy: false,
      isActive: true,
      expiresAt: null,
      maxViews: null,
      viewCount: 0,
      legacySource: '',
    },
    event: { id: 'event-1', name: 'Evento Escolar' },
    share: {
      shareType: 'photos',
      folderId: null,
      photoIds: ['photo-1'],
      allowDownload: true,
      allowComments: false,
    },
    folder: null,
    subject: null,
    student: null,
  } as any;

  const baseAssetRow = {
    id: 'photo-1',
    filename: 'foto.jpg',
    original_path: 'originals/foto.jpg',
    preview_path: 'previews/foto.jpg',
    watermark_path: 'watermarks/foto.jpg',
    storage_path: 'storage/foto.jpg',
    file_size: 1024,
    mime_type: 'image/jpeg',
    created_at: '2025-01-01T00:00:00.000Z',
    status: 'ready',
    metadata: { assignment_id: 'assign-1' },
  };

  let currentAssets: any[] = [];

  const buildQueryBuilder = (table: string) => {
    const builder: any = {
      _table: table,
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(async () => ({
        data: table === 'assets' ? currentAssets : [],
        error: null,
        count: table === 'assets' ? currentAssets.length : 0,
      })),
    };
    return builder;
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      'https://example-project.supabase.co';
    process.env.STORAGE_BUCKET_PREVIEW = 'photos';
    process.env.STORAGE_BUCKET_ORIGINAL = 'photo-private';

    resolveAccessTokenMock.mockReset();
    getShareTokenByIdMock.mockReset();
    recordShareViewMock.mockReset();
    getCatalogForEventMock.mockReset();
    supabaseMock.from.mockReset();
    supabaseMock.rpc.mockReset();

    currentAssets = [{ ...baseAssetRow }];

    let callCount = 0;
    resolveAccessTokenMock.mockImplementation(async () => ({
      ...baseResolvedAccess,
      token: {
        ...baseResolvedAccess.token,
        viewCount: callCount++,
      },
    }));

    getShareTokenByIdMock.mockResolvedValue({
      id: 'share-id',
      metadata: {},
      allow_download: true,
      allow_comments: false,
      share_type: 'photos',
    });

    recordShareViewMock.mockResolvedValue(undefined);
    getCatalogForEventMock.mockResolvedValue({
      eventId: 'event-1',
      priceListId: null,
      currency: 'ARS',
      items: [],
      overrides: [],
    });

    supabaseMock.from.mockImplementation((table: string) =>
      buildQueryBuilder(table)
    );
    supabaseMock.rpc.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.STORAGE_BUCKET_PREVIEW;
    delete process.env.STORAGE_BUCKET_ORIGINAL;
  });

  it('returns gallery data with signed URLs for share tokens', async () => {
    const result = await galleryService.getGallery({
      token: 'share-token',
      page: 1,
      limit: 12,
      ipAddress: '1.1.1.1',
      userAgent: 'vitest',
      includeCatalog: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'photo-1',
      filename: 'foto.jpg',
      previewUrl:
        'https://example-project.supabase.co/storage/v1/object/public/photos/watermarks/foto.jpg',
      signedUrl: expect.stringContaining('signed/watermarks/foto.jpg'),
      downloadUrl: expect.stringContaining('signed/originals/foto.jpg'),
      storagePath: 'originals/foto.jpg',
    });
    expect(result.pagination).toMatchObject({
      page: 1,
      limit: 12,
      total: 1,
      hasMore: false,
    });
    expect(recordShareViewMock).toHaveBeenCalled();
    expect(getCatalogForEventMock).toHaveBeenCalledWith('event-1');
  });

  it('falls back to signed preview when bucket is private', async () => {
    currentAssets = [
      {
        ...baseAssetRow,
        watermark_path: null,
        preview_path: null,
        original_path: 'originals/private.jpg',
        storage_path: 'originals/private.jpg',
      },
    ];

    const result = await galleryService.getGallery({
      token: 'share-token',
      page: 1,
      limit: 1,
      ipAddress: '2.2.2.2',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].previewUrl).toBe(
      'https://signed/originals/private.jpg'
    );
    expect(result.items[0].downloadUrl).toBe(
      'https://signed/originals/private.jpg'
    );
  });

  it('enforces share token rate limiting', async () => {
    const limitCalls = 3;
    const originalRateLimit = (galleryService as any).shareRateLimit;
    (galleryService as any).shareRateLimit = {
      requests: limitCalls,
      windowMs: 60_000,
    };

    try {
      for (let i = 0; i < limitCalls; i++) {
        await galleryService.getGallery({
          token: 'share-token',
          page: 1,
          limit: 1,
          ipAddress: '10.0.0.1',
        });
      }

      await expect(
        galleryService.getGallery({
          token: 'share-token',
          page: 1,
          limit: 1,
          ipAddress: '10.0.0.1',
        })
      ).rejects.toMatchObject({
        code: 'rate_limited',
      });
    } finally {
      (galleryService as any).shareRateLimit = originalRateLimit;
    }
  });

  it('throws when token is inactive', async () => {
    resolveAccessTokenMock.mockResolvedValueOnce({
      ...baseResolvedAccess,
      token: { ...baseResolvedAccess.token, isActive: false },
    });

    await expect(
      galleryService.getGallery({
        token: 'inactive-token',
        page: 1,
        limit: 1,
      })
    ).rejects.toMatchObject({ code: 'inactive_token' });
  });
});
