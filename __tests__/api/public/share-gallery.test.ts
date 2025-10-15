import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('server-only', () => ({}), { virtual: true });

process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
import { NextRequest } from 'next/server';

vi.mock('@/lib/security/share-token-security', () => ({
  shareTokenSecurity: {
    extractRequestContext: vi.fn(async () => ({ ip: '1.2.3.4', userAgent: 'vitest' })),
    validateToken: vi.fn(async () => ({
      isValid: true,
      token: {
        id: 'share-row',
        share_type: 'event',
        allow_download: true,
        allow_comments: true,
        expires_at: null,
      },
    })),
  },
}));

const mockGallery = {
  token: {
    token: 'share123',
    accessType: 'share_event',
    isLegacy: false,
    isActive: true,
    expiresAt: null,
    maxViews: null,
    viewCount: 10,
  },
  event: { id: 'event-01', name: 'Festival Escolar' },
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
      id: 'photo-01',
      filename: 'foto.jpg',
      previewUrl: 'https://cdn.example.com/photo.jpg',
      signedUrl: 'https://cdn.example.com/signed/photo.jpg',
      downloadUrl: null,
      createdAt: '2025-01-01T10:00:00.000Z',
      size: 120000,
      mimeType: 'image/jpeg',
      folderId: null,
      type: 'event',
      origin: 'assets',
      assignmentId: null,
      storagePath: 'events/demo/photo.jpg',
      metadata: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 60,
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
    getGallery: vi.fn(async () => mockGallery),
  },
  GalleryServiceError: MockGalleryServiceError,
}));

import { GET } from '@/app/api/public/share/[token]/gallery/route';
import { galleryService } from '@/lib/services/gallery.service';
import { shareTokenSecurity } from '@/lib/security/share-token-security';

describe('/api/public/share/[token]/gallery', () => {
  const token = 'share123'.padEnd(64, 'x');
  const params = { params: { token } };
  const createRequest = () =>
    new NextRequest(`http://localhost:3000/api/public/share/${token}/gallery`);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns gallery payload for valid share token', async () => {
    const response = await GET(createRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.gallery.items).toHaveLength(1);
    expect(body.legacy.items?.[0]?.id).toBe('photo-01');
    expect(galleryService.getGallery).toHaveBeenCalledWith(
      expect.objectContaining({ token, includeCatalog: true })
    );
    expect(shareTokenSecurity.validateToken).toHaveBeenCalled();
  });
});
