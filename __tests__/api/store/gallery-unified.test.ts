import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}), { virtual: true });

const mockStoreData = {
  folder_id: null,
  folder_name: 'Fotos Compartidas',
  folder_path: 'Fotos Compartidas',
  parent_id: null,
  parent_name: null,
  depth: 0,
  event_id: 'event-123',
  event_name: 'Festival',
  event_date: '2025-01-01',
  store_settings: {},
  view_count: 5,
  asset_count: 0,
  share_type: 'event',
  selected_photo_ids: [],
  child_folders: [],
};

const mockGallery = {
  token: {
    token: 'simpletoken',
    accessType: 'share_event',
    isLegacy: false,
    isActive: true,
    expiresAt: null,
    maxViews: null,
    viewCount: 1,
    shareTokenId: 'share-resolved',
  },
  event: { id: 'event-123', name: 'Festival' },
  folder: null,
  subject: null,
  student: null,
  share: {
    shareType: 'event',
    allowDownload: true,
    allowComments: true,
    metadata: {},
  },
  items: [
    {
      id: 'asset-1',
      filename: 'foto.jpg',
      previewUrl: 'https://cdn.example.com/preview.jpg',
      signedUrl: 'https://cdn.example.com/signed.jpg',
      downloadUrl: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      size: 120000,
      mimeType: 'image/jpeg',
      folderId: null,
      type: 'event',
      origin: 'assets',
      assignmentId: null,
      storagePath: 'events/demo/foto.jpg',
      metadata: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 5,
    total: 1,
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
};

const rpcSingle = vi.fn(async () => ({ data: mockStoreData, error: null }));
const fromMock = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
      })),
    })),
  })),
}));
const supabaseMock = {
  rpc: vi.fn(() => ({ single: rpcSingle })),
  from: fromMock,
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi.fn(async () => supabaseMock),
}));

const galleryMocks = vi.hoisted(() => {
  const getGallery = vi.fn(async () => mockGallery);
  class MockGalleryServiceError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status = 400) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { getGallery, MockGalleryServiceError };
});

vi.mock('@/lib/services/gallery.service', () => ({
  galleryService: {
    getGallery: galleryMocks.getGallery,
  },
  GalleryServiceError: galleryMocks.MockGalleryServiceError,
}));

vi.mock('@/lib/middleware/password-validation.middleware', () => ({
  validateShareTokenPassword: vi.fn(async () => ({ isValid: true })),
}));

vi.mock('@/lib/services/photo-classification.service', () => ({
  photoClassificationService: {
    classifyPhoto: vi.fn(),
  },
}));

import { GET } from '@/app/api/store/[token]/route';

const params = { params: { token: 'simpletoken' } };

describe('/api/store/[token] unified gallery integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    galleryMocks.getGallery.mockResolvedValue(mockGallery);
  });

  it('injects gallery payload when include_assets=true', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/store/simpletoken?include_assets=true&limit=5&offset=0'
    );
    const response = await GET(request, params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.gallery).toBeDefined();
    expect(body.gallery.items).toHaveLength(1);
    expect(body.assets).toHaveLength(1);
    expect(body.pagination.page).toBe(1);
  });

  it('falls back when gallery service errors', async () => {
    galleryMocks.getGallery.mockRejectedValueOnce(
      new galleryMocks.MockGalleryServiceError('rate_limited', 'Too many requests', 429)
    );
    const request = new NextRequest(
      'http://localhost:3000/api/store/simpletoken?include_assets=true'
    );
    const response = await GET(request, params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.gallery).toBeUndefined();
    expect(body.assets).toBeDefined();
  });
});
