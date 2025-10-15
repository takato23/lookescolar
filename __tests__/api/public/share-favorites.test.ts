import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}), { virtual: true });

const mocks = vi.hoisted(() => {
  const selectEq = vi.fn(async (_column: string, _value: string) => ({
    data: [{ asset_id: 'asset-1' }],
    error: null,
  }));
  const insertSingle = vi.fn().mockResolvedValue({ data: { id: 'fav-1' }, error: null });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insertBuilder = vi.fn(() => ({ select: insertSelect }));
  const deleteBuilder: any = {};
  const deleteEq = vi.fn((column: string, value: string) => {
    if (column === 'asset_id') {
      return Promise.resolve({ data: null, error: null });
    }
    return deleteBuilder;
  });
  deleteBuilder.eq = deleteEq;
  const fromMock = vi.fn(() => ({
    select: vi.fn(() => ({ eq: selectEq })),
    insert: insertBuilder,
    delete: vi.fn(() => deleteBuilder),
  }));

  return {
    selectEq,
    insertSingle,
    insertSelect,
    insertBuilder,
    deleteEq,
    fromMock,
    extractRequestContext: vi.fn(async () => ({ ip: '2.2.2.2', userAgent: 'vitest' })),
    validateToken: vi.fn(async () => ({
      isValid: true,
      token: { id: 'validation-share-id' },
    })),
    getGallery: vi.fn(async (options: any) => ({
      token: {
        token: options.token,
        shareTokenId: 'resolved-share-id',
        accessType: 'share_event',
        isLegacy: false,
        isActive: true,
        expiresAt: null,
        maxViews: null,
        viewCount: 1,
      },
      event: { id: 'event-1', name: 'Festival' },
      folder: null,
      subject: null,
      student: null,
      share: {
        shareType: 'event',
        allowDownload: true,
        allowComments: true,
        metadata: {},
      },
      items: options.photoId
        ? [
            {
              id: options.photoId,
              filename: 'foto.jpg',
              previewUrl: 'https://cdn.example.com',
              signedUrl: 'https://cdn.example.com/signed',
              downloadUrl: null,
              createdAt: '2025-01-01T00:00:00.000Z',
              size: 12345,
              mimeType: 'image/jpeg',
              folderId: null,
              type: 'event',
              origin: 'assets',
              assignmentId: null,
              storagePath: 'events/demo/photo.jpg',
              metadata: null,
            },
          ]
        : [],
      pagination: {
        page: 1,
        limit: 1,
        total: options.photoId ? 1 : 0,
        totalPages: 1,
        hasMore: false,
      },
      catalog: null,
      activeOrder: null,
      legacyFallbackUsed: false,
      rateLimit: {
        limit: 120,
        remaining: 119,
        resetAt: Date.now() + 60000,
        retryAfter: 0,
      },
    })),
  };
});

vi.mock('@/lib/security/share-token-security', () => ({
  shareTokenSecurity: {
    extractRequestContext: mocks.extractRequestContext,
    validateToken: mocks.validateToken,
  },
}));

const { MockGalleryServiceError } = vi.hoisted(() => ({
  MockGalleryServiceError: class extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));

vi.mock('@/lib/services/gallery.service', () => ({
  galleryService: {
    getGallery: mocks.getGallery,
  },
  GalleryServiceError: MockGalleryServiceError,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(async () => ({
    from: mocks.fromMock,
  })),
}));

import {
  GET,
  POST,
  DELETE,
} from '@/app/api/public/share/[token]/favorites/route';

const token = 'share123'.padEnd(64, 'x');
const params = { params: { token } };

describe('/api/public/share/[token]/favorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns favorites list using unified gallery context', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/public/share/${token}/favorites`
    );
    const response = await GET(request, params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.favorites).toEqual(['asset-1']);
    expect(mocks.getGallery).toHaveBeenCalledWith(
      expect.objectContaining({ token, skipRateLimit: true })
    );
    expect(mocks.selectEq).toHaveBeenCalledWith(
      'share_token_id',
      'resolved-share-id'
    );
  });

  it('adds favorite after validating asset with gallery service', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/public/share/${token}/favorites`,
      {
        method: 'POST',
        body: JSON.stringify({ assetId: 'asset-42' }),
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const response = await POST(request, params);
    expect(response.status).toBe(200);
    expect(mocks.getGallery).toHaveBeenCalledWith(
      expect.objectContaining({ photoId: 'asset-42' })
    );
    expect(mocks.insertSelect).toHaveBeenCalled();
    expect(mocks.insertSingle).toHaveBeenCalled();
  });

  it('removes favorite using resolved share token id', async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/public/share/${token}/favorites?assetId=asset-1`,
      {
        method: 'DELETE',
      }
    );
    const response = await DELETE(request, params);
    expect(response.status).toBe(200);
    expect(mocks.deleteEq).toHaveBeenCalledWith(
      'share_token_id',
      'resolved-share-id'
    );
  });
});
