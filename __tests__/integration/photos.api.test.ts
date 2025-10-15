import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import the API handlers
import { GET as photosGET } from '@/app/api/admin/events/[id]/photos/route';
import { DELETE as adminPhotosDELETE } from '@/app/api/admin/photos/route';
import {
  PATCH as photoByIdPATCH,
  DELETE as photoByIdDELETE,
} from '@/app/api/admin/photos/[id]/route';
import { PATCH as batchMovePATCH } from '@/app/api/admin/photos/batch-move/route';
import { POST as signUrlsPOST } from '@/app/api/admin/photos/sign-urls/route';

// Mock dependencies
const mockSecurityLogger = vi.hoisted(() => ({
  logSecurityEvent: vi.fn(),
}));

vi.mock('@/lib/middleware/auth.middleware', () => ({
  withAuth: vi.fn((handler) => handler),
  SecurityLogger: mockSecurityLogger,
  generateRequestId: vi.fn(() => 'test-request'),
}));

vi.mock('@/lib/middleware/auth-robust.middleware', () => ({
  withRobustAuth: vi.fn((handler) =>
    (request: NextRequest, context: Record<string, any> = {}) =>
      handler(request, {
        ...context,
        user: context.user || { id: 'test-admin', email: 'admin@example.com' },
        requestId: context.requestId || 'test-request',
      })
  ),
}));

vi.mock('@/lib/middleware/rate-limit.middleware', () => ({
  RateLimitMiddleware: {
    withRateLimit: vi.fn((handler) => handler),
  },
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Supabase client
const mockSupabaseClient = vi.hoisted(() => ({
  from: vi.fn(),
  storage: {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn(),
      remove: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

const mockFrom = vi.hoisted(() => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn(),
  count: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi
    .fn()
    .mockResolvedValue(mockSupabaseClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseClient.from.mockReturnValue(mockFrom);
  mockSupabaseClient.storage.from.mockReturnValue({
    createSignedUrl: vi.fn(),
    remove: vi.fn().mockResolvedValue({ error: null }),
  });
});

describe('Event Photo Library - Photos API Integration Tests', () => {
  const mockEventId = 'event-123';
  const mockFolderId = 'folder-456';
  const mockPhotoId = '33333333-3333-3333-3333-333333333333';

  const mockEvent = {
    id: mockEventId,
    name: 'Test Event',
    created_at: '2024-01-15T10:00:00Z',
  };

  const mockFolder = {
    id: mockFolderId,
    event_id: mockEventId,
    name: 'Test Folder',
  };

  const mockPhoto = {
    id: mockPhotoId,
    event_id: mockEventId,
    folder_id: mockFolderId,
    original_filename: 'test-photo.jpg',
    storage_path: 'events/event-123/test-photo.jpg',
    preview_path: 'events/event-123/previews/test-photo.jpg',
    file_size: 1024000,
    width: 1920,
    height: 1080,
    approved: true,
    processing_status: 'completed',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  describe('GET /admin/events/{eventId}/photos', () => {
    it('should fetch photos for an event successfully', async () => {
      const photos = [mockPhoto];

      // Mock event exists check
      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: photos, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          count: vi.fn().mockResolvedValue({ count: 1, error: null }),
        });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.photos).toEqual(photos);
      expect(responseData.pagination.total).toBe(1);
    });

    it('should filter photos by folder when folderId provided', async () => {
      const photos = [mockPhoto];

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: photos, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          count: vi.fn().mockResolvedValue({ count: 1, error: null }),
        });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos?folderId=${mockFolderId}`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockFrom.eq).toHaveBeenCalledWith('folder_id', mockFolderId);
    });

    it('should handle pagination parameters correctly', async () => {
      const photos = [mockPhoto];

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: photos, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          count: vi.fn().mockResolvedValue({ count: 100, error: null }),
        });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos?page=2&limit=20`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.pagination.page).toBe(2);
      expect(responseData.pagination.limit).toBe(20);
      expect(responseData.pagination.total).toBe(100);
      expect(responseData.pagination.totalPages).toBe(5);
      expect(responseData.pagination.hasMore).toBe(true);
      expect(mockFrom.range).toHaveBeenCalledWith(20, 39); // offset 20, limit 20
    });

    it('should include signed URLs when requested', async () => {
      const photos = [mockPhoto];
      const signedUrl = 'https://signed-url.example.com/photo.jpg';

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: photos, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          count: vi.fn().mockResolvedValue({ count: 1, error: null }),
        });

      // Mock signed URL generation
      mockSupabaseClient.storage.from().createSignedUrl.mockResolvedValue({
        data: { signedUrl },
        error: null,
      });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos?includeSignedUrls=true`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.photos[0].signed_url).toBe(signedUrl);
      expect(responseData.photos[0].signed_url_expires_at).toBeDefined();
    });

    it('should handle event not found', async () => {
      const error = new Error('Event not found');
      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error }),
      });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Event not found');
    });

    it('should handle invalid folder', async () => {
      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Folder not found'),
          }),
        });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos?folderId=invalid-folder`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Folder not found');
    });

    it('should validate folder belongs to event', async () => {
      const differentEventFolder = {
        ...mockFolder,
        event_id: 'different-event',
      };

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({ data: mockEvent, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi
            .fn()
            .mockResolvedValue({ data: differentEventFolder, error: null }),
        });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/photos?folderId=${mockFolderId}`
      );
      const response = await photosGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Folder does not belong to this event');
    });
  });

  describe('PATCH /admin/photos/batch-move', () => {
    it('should move photos to target folder successfully', async () => {
      const photoIds = [mockPhoto.id, 'photo-2'];
      const targetFolderId = 'target-folder-123';
      const photos = [
        mockPhoto,
        { ...mockPhoto, id: 'photo-2', folder_id: null },
      ];

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({
            data: {
              id: targetFolderId,
              event_id: mockEventId,
              name: 'Target Folder',
            },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          select: vi.fn().mockResolvedValue({ data: photos, error: null }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          select: vi.fn().mockResolvedValue({
            data: photos.map((p) => ({ ...p, folder_id: targetFolderId })),
            error: null,
          }),
        });

      const request = new NextRequest(
        'http://localhost/admin/photos/batch-move',
        {
          method: 'PATCH',
          body: JSON.stringify({ photoIds, folderId: targetFolderId }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await batchMovePATCH(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.moved).toBe(1); // Only 1 photo actually moved
      expect(responseData.total).toBe(2);
    });

    it('should validate photo IDs array is not empty', async () => {
      const request = new NextRequest(
        'http://localhost/admin/photos/batch-move',
        {
          method: 'PATCH',
          body: JSON.stringify({ photoIds: [], folderId: 'folder-123' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await batchMovePATCH(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe(
        'Photo IDs array is required and must not be empty'
      );
    });

    it('should limit batch size to 100 photos', async () => {
      const photoIds = Array.from({ length: 101 }, (_, i) => `photo-${i}`);

      const request = new NextRequest(
        'http://localhost/admin/photos/batch-move',
        {
          method: 'PATCH',
          body: JSON.stringify({ photoIds, folderId: 'folder-123' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await batchMovePATCH(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe(
        'Cannot move more than 100 photos at once'
      );
    });

    it('should validate UUID format for photo IDs', async () => {
      const photoIds = ['invalid-uuid', 'another-invalid'];

      const request = new NextRequest(
        'http://localhost/admin/photos/batch-move',
        {
          method: 'PATCH',
          body: JSON.stringify({ photoIds, folderId: 'folder-123' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await batchMovePATCH(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('All photo IDs must be valid UUIDs');
    });

    it('should handle missing photos gracefully', async () => {
      const photoIds = [mockPhoto.id, 'non-existent-photo'];

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'folder-123',
              event_id: mockEventId,
              name: 'Target Folder',
            },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          select: vi.fn().mockResolvedValue({ data: [mockPhoto], error: null }),
        });

      const request = new NextRequest(
        'http://localhost/admin/photos/batch-move',
        {
          method: 'PATCH',
          body: JSON.stringify({ photoIds, folderId: 'folder-123' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await batchMovePATCH(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Some photos were not found');
      expect(responseData.details.missing).toEqual(['non-existent-photo']);
    });

    it('should validate all photos belong to same event', async () => {
      const photoIds = [mockPhoto.id, 'photo-2'];
      const photos = [
        mockPhoto,
        { ...mockPhoto, id: 'photo-2', event_id: 'different-event' },
      ];

      mockSupabaseClient.from
        .mockReturnValueOnce({
          ...mockFrom,
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'folder-123',
              event_id: mockEventId,
              name: 'Target Folder',
            },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          ...mockFrom,
          select: vi.fn().mockResolvedValue({ data: photos, error: null }),
        });

      const request = new NextRequest(
        'http://localhost/admin/photos/batch-move',
        {
          method: 'PATCH',
          body: JSON.stringify({ photoIds, folderId: 'folder-123' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await batchMovePATCH(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe(
        'All photos must belong to the same event'
      );
    });
  });

  describe('DELETE /admin/photos', () => {
    it('should delete photos when all belong to the same event', async () => {
      const photoIds = ['11111111-1111-1111-1111-111111111111'];
      const photos = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          event_id: 'event-1',
          storage_path: 'events/event-1/photo-1.jpg',
          preview_path: 'events/event-1/previews/photo-1.jpg',
        },
      ];

      const selectPhotosMock = {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: photos, error: null }),
        }),
      } as any;

      const selectEventMock = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: 'event-1' }, error: null }),
          }),
        }),
      } as any;

      const deleteMock = {
        delete: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as any;

      mockSupabaseClient.from
        .mockReturnValueOnce(selectPhotosMock)
        .mockReturnValueOnce(selectEventMock)
        .mockReturnValueOnce(deleteMock);

      const request = new NextRequest('http://localhost/api/admin/photos', {
        method: 'DELETE',
        body: JSON.stringify({ photoIds }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await adminPhotosDELETE(request);
      const payload = await response.json();

      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'photo_deletion_attempt',
        expect.objectContaining({
          count: 1,
          eventId: null,
          userId: 'test-admin',
        }),
        'info'
      );
      expect(mockSecurityLogger.logSecurityEvent).toHaveBeenCalledWith(
        'photos_deleted',
        expect.objectContaining({
          count: 1,
          eventId: 'event-1',
          userId: 'test-admin',
        }),
        'info'
      );
      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.deleted).toBe(1);
      expect(payload.eventId).toBe('event-1');
    });

    it('should reject deletion when photos span multiple events', async () => {
      const photoIds = [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ];
      const photos = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          event_id: 'event-1',
          storage_path: 'events/event-1/photo-1.jpg',
          preview_path: null,
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          event_id: 'event-2',
          storage_path: 'events/event-2/photo-2.jpg',
          preview_path: null,
        },
      ];

      const selectPhotosMock = {
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: photos, error: null }),
        }),
      } as any;

      mockSupabaseClient.from.mockReturnValueOnce(selectPhotosMock);

      const request = new NextRequest('http://localhost/api/admin/photos', {
        method: 'DELETE',
        body: JSON.stringify({ photoIds }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await adminPhotosDELETE(request);
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toContain('multiple events');
      expect(mockSupabaseClient.storage.from).not.toHaveBeenCalled();
    });
  });

  describe('Photo by ID routes', () => {
    it('should update photo metadata and return event context', async () => {
      const requestBody = { original_filename: 'updated-name.jpg' };

      const fetchPhotoMock = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: mockPhotoId, event_id: mockEventId },
              error: null,
            }),
          }),
        }),
      } as any;

      const updatePhotoMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { ...mockPhoto, original_filename: requestBody.original_filename },
                error: null,
              }),
            }),
          }),
        }),
      } as any;

      mockSupabaseClient.from
        .mockReturnValueOnce(fetchPhotoMock)
        .mockReturnValueOnce(updatePhotoMock);

      const request = new NextRequest(
        `http://localhost/api/admin/photos/${mockPhotoId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(requestBody),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await photoByIdPATCH(request, {
        params: { id: mockPhotoId },
        user: { id: 'admin-user' },
        requestId: 'req-123',
      });

      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.photo.original_filename).toBe(
        requestBody.original_filename
      );
      expect(payload.eventId).toBe(mockEventId);
    });

    it('should block deletion when photo lacks event context', async () => {
      const fetchPhotoMock = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: mockPhotoId,
                event_id: null,
                storage_path: 'path.jpg',
                preview_path: null,
              },
              error: null,
            }),
          }),
        }),
      } as any;

      mockSupabaseClient.from.mockReturnValueOnce(fetchPhotoMock);

      const request = new NextRequest(
        `http://localhost/api/admin/photos/${mockPhotoId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await photoByIdDELETE(request, {
        params: { id: mockPhotoId },
        user: { id: 'admin-user' },
        requestId: 'req-456',
      });

      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.error).toContain('not associated with an event');
      expect(mockSupabaseClient.storage.from).not.toHaveBeenCalled();
    });
  });

  describe('POST /admin/photos/sign-urls', () => {
    it('should generate signed URLs for photos successfully', async () => {
      const photoIds = [mockPhoto.id];
      const signedUrl = 'https://signed-url.example.com/photo.jpg';

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockFrom,
        select: vi.fn().mockResolvedValue({ data: [mockPhoto], error: null }),
      });

      mockSupabaseClient.storage.from().createSignedUrl.mockResolvedValue({
        data: { signedUrl },
        error: null,
      });

      const request = new NextRequest(
        'http://localhost/admin/photos/sign-urls',
        {
          method: 'POST',
          body: JSON.stringify({ photoIds, expiresIn: 3600 }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await signUrlsPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.signedUrls[mockPhoto.id]).toBe(signedUrl);
      expect(responseData.expiresAt).toBeDefined();
      expect(responseData.summary.successful).toBe(1);
    });

    it('should validate photo IDs array is not empty', async () => {
      const request = new NextRequest(
        'http://localhost/admin/photos/sign-urls',
        {
          method: 'POST',
          body: JSON.stringify({ photoIds: [] }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await signUrlsPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe(
        'Photo IDs array is required and must not be empty'
      );
    });

    it('should limit batch size to 50 photos', async () => {
      const photoIds = Array.from({ length: 51 }, (_, i) => `photo-${i}`);

      const request = new NextRequest(
        'http://localhost/admin/photos/sign-urls',
        {
          method: 'POST',
          body: JSON.stringify({ photoIds }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await signUrlsPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe(
        'Cannot generate URLs for more than 50 photos at once'
      );
    });

    it('should validate expiration time range', async () => {
      const photoIds = [mockPhoto.id];

      const request = new NextRequest(
        'http://localhost/admin/photos/sign-urls',
        {
          method: 'POST',
          body: JSON.stringify({ photoIds, expiresIn: 30 }), // Too short
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await signUrlsPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe(
        'Expires in must be between 60 and 86400 seconds'
      );
    });

    it('should handle photos without storage paths', async () => {
      const photoIds = [mockPhoto.id];
      const photoWithoutPath = {
        ...mockPhoto,
        storage_path: null,
        preview_path: null,
      };

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockFrom,
        select: vi
          .fn()
          .mockResolvedValue({ data: [photoWithoutPath], error: null }),
      });

      const request = new NextRequest(
        'http://localhost/admin/photos/sign-urls',
        {
          method: 'POST',
          body: JSON.stringify({ photoIds }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await signUrlsPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.errors[mockPhoto.id]).toBe(
        'No storage path available'
      );
      expect(responseData.summary.failed).toBe(1);
    });

    it('should handle signed URL generation errors', async () => {
      const photoIds = [mockPhoto.id];

      mockSupabaseClient.from.mockReturnValueOnce({
        ...mockFrom,
        select: vi.fn().mockResolvedValue({ data: [mockPhoto], error: null }),
      });

      mockSupabaseClient.storage.from().createSignedUrl.mockResolvedValue({
        data: null,
        error: new Error('Storage error'),
      });

      const request = new NextRequest(
        'http://localhost/admin/photos/sign-urls',
        {
          method: 'POST',
          body: JSON.stringify({ photoIds }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await signUrlsPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.errors[mockPhoto.id]).toBe('Storage error');
      expect(responseData.summary.failed).toBe(1);
    });
  });
});
