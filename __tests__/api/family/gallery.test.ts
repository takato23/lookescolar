import { describe, it, expect, beforeEach, vi } from 'vitest';
vi.mock('server-only', () => ({}), { virtual: true });

vi.mock('@/lib/services/family.service', () => ({
  familyService: {
    getSubjectPhotos: vi.fn(),
    getActiveOrder: vi.fn(),
    getPhotoInfo: vi.fn(),
    trackPhotoView: vi.fn(),
  },
}));

process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';
import { NextRequest } from 'next/server';

vi.mock('@/lib/middleware/auth.middleware', () => ({
  AuthMiddleware: {
    withAuth:
      (handler: any) =>
      async (request: NextRequest, params: any) => {
        const authContext = {
          isAdmin: false,
          user: { id: 'family-user' },
          subject: { id: 'subject-001', name: 'Alumno Demo' },
        };
        return handler(request, authContext, params);
      },
  },
  SecurityLogger: {
    logResourceAccess: vi.fn(),
    logSecurityEvent: vi.fn(),
  },
}));

vi.mock('@/lib/middleware/rate-limit.middleware', () => ({
  RateLimitMiddleware: {
    withRateLimit: (handler: any) => handler,
  },
}));

import { GET } from '@/app/api/family/gallery/[token]/route';
import {
  galleryService,
  GalleryServiceError,
  type GalleryResult,
} from '@/lib/services/gallery.service';

describe('/api/family/gallery/[token]', () => {
  const token = 'valid-token-12345678901234567890';
  const mockGallery: GalleryResult = {
    token: {
      token,
      accessType: 'family_subject',
      isLegacy: false,
      isActive: true,
      expiresAt: null,
      maxViews: null,
      viewCount: 1,
    },
    event: { id: 'event-01', name: 'Acto Escolar' },
    folder: null,
    subject: {
      id: 'subject-001',
      name: 'Alumno Demo',
      grade: '5°',
      section: 'B',
      parent_name: 'Contacto',
      parent_email: 'familia@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    } as any,
    student: null,
    share: undefined,
    items: [
      {
        id: 'photo-01',
        filename: 'foto.jpg',
        previewUrl: 'https://cdn.example.com/preview/foto.jpg',
        signedUrl: 'https://signed.example.com/foto.jpg',
        downloadUrl: null,
        createdAt: '2025-01-01T12:00:00.000Z',
        size: 150000,
        mimeType: 'image/jpeg',
        folderId: null,
        type: 'individual',
        origin: 'photos',
        assignmentId: 'assignment-01',
        storagePath: 'events/demo/photo.jpg',
        metadata: { width: 1200, height: 1800 },
      },
    ],
    pagination: {
      page: 1,
      limit: 24,
      total: 1,
      totalPages: 1,
      hasMore: false,
    },
    catalog: null,
    activeOrder: null,
    legacyFallbackUsed: false,
    rateLimit: {
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60000,
      retryAfter: 0,
    },
  };

  const gallerySpy = vi.spyOn(galleryService, 'getGallery');

  const createRequest = (query?: Record<string, string>) => {
    const search = query ? `?${new URLSearchParams(query).toString()}` : '';
    return new NextRequest(
      `http://localhost:3000/api/family/gallery/${token}${search}`,
      {
        method: 'GET',
        headers: {
          'user-agent': 'vitest-family-test',
        },
      }
    );
  };

  const params = { params: { token } };

  beforeEach(() => {
    gallerySpy.mockReset();
  });

  it('returns unified gallery payload with legacy mapper', async () => {
    gallerySpy.mockResolvedValue(mockGallery);

    const response = await GET(createRequest(), params);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body?.data?.gallery).toMatchObject({
      token: expect.objectContaining({ token }),
      items: expect.arrayContaining([
        expect.objectContaining({ id: 'photo-01', signedUrl: expect.any(String) }),
      ]),
      pagination: expect.objectContaining({ total: 1 }),
      subject: expect.objectContaining({ name: 'Alumno Demo' }),
    });
    expect(body?.data?.legacy?.photos?.[0]).toMatchObject({ id: 'photo-01' });
  });

  it('propagates GalleryServiceError with status code', async () => {
    gallerySpy.mockRejectedValue(
      new GalleryServiceError('invalid_token', 'Token inválido', 404)
    );

    const response = await GET(createRequest(), params);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body).toMatchObject({ error: 'Token inválido', code: 'invalid_token' });
  });

});
