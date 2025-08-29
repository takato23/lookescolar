import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockedFunction,
} from 'vitest';
import { photoService } from '@/lib/services/photo.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Mock Supabase client
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/utils/logger');

const mockSupabase = {
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

const mockFrom = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  in: vi.fn(),
  is: vi.fn(),
  ilike: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  count: vi.fn(),
};

const mockStorage = {
  createSignedUrl: vi.fn(),
  remove: vi.fn(),
};

// Chain all methods to return mockFrom for method chaining
Object.keys(mockFrom).forEach((key) => {
  if (key !== 'single' && key !== 'count') {
    mockFrom[key] = vi.fn().mockReturnValue(mockFrom);
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  (createServerSupabaseServiceClient as MockedFunction<any>).mockResolvedValue(
    mockSupabase
  );
  mockSupabase.from.mockReturnValue(mockFrom);
  mockSupabase.storage.from.mockReturnValue(mockStorage);
});

describe('PhotoService', () => {
  const mockEventId = 'event-123';
  const mockFolderId = 'folder-123';
  const mockPhotoId = 'photo-123';

  const mockPhoto = {
    id: mockPhotoId,
    event_id: mockEventId,
    folder_id: mockFolderId,
    original_filename: 'test-photo.jpg',
    storage_path: 'events/event-123/photos/test-photo.jpg',
    preview_path: 'events/event-123/previews/test-photo-preview.jpg',
    watermark_path: 'events/event-123/watermarks/test-photo-watermark.jpg',
    file_size: 1024000,
    width: 1920,
    height: 1080,
    approved: true,
    processing_status: 'completed',
    metadata: { camera: 'Canon EOS R5' },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  describe('getPhotos', () => {
    const filters = {
      eventId: mockEventId,
      folderId: mockFolderId,
      page: 1,
      limit: 50,
    };

    it('should return photos with pagination', async () => {
      const mockPhotos = [mockPhoto, { ...mockPhoto, id: 'photo-456' }];

      // Mock count query
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: 2, error: null }),
      });

      // Mock data query
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      const result = await photoService.getPhotos(filters);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhotos);
      expect(result.count).toBe(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasMore: false,
      });
    });

    it('should filter by folder ID', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: 0, error: null }),
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      await photoService.getPhotos(filters);

      expect(mockFrom.eq).toHaveBeenCalledWith('folder_id', mockFolderId);
    });

    it('should filter by null folder ID (root photos)', async () => {
      const rootFilters = { ...filters, folderId: null };

      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: 0, error: null }),
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      await photoService.getPhotos(rootFilters);

      expect(mockFrom.is).toHaveBeenCalledWith('folder_id', null);
    });

    it('should apply search filter', async () => {
      const searchFilters = { ...filters, searchTerm: 'test' };

      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: 0, error: null }),
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      await photoService.getPhotos(searchFilters);

      expect(mockFrom.ilike).toHaveBeenCalledWith(
        'original_filename',
        '%test%'
      );
    });

    it('should apply sorting', async () => {
      const sortedFilters = {
        ...filters,
        sortBy: 'original_filename' as const,
        sortOrder: 'asc' as const,
      };

      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: 0, error: null }),
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      await photoService.getPhotos(sortedFilters);

      expect(mockFrom.order).toHaveBeenCalledWith('original_filename', {
        ascending: true,
      });
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: null, error }),
        single: vi.fn().mockResolvedValue({ data: null, error }),
      });

      const result = await photoService.getPhotos(filters);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getPhotoById', () => {
    it('should return photo by ID', async () => {
      mockFrom.single.mockResolvedValue({ data: mockPhoto, error: null });

      const result = await photoService.getPhotoById(mockPhotoId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPhoto);
      expect(mockFrom.eq).toHaveBeenCalledWith('id', mockPhotoId);
    });

    it('should handle photo not found', async () => {
      const error = new Error('Photo not found');
      mockFrom.single.mockResolvedValue({ data: null, error });

      const result = await photoService.getPhotoById(mockPhotoId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Photo not found');
    });
  });

  describe('batchMovePhotos', () => {
    const moveOptions = {
      photoIds: [mockPhotoId, 'photo-456'],
      targetFolderId: 'target-folder-123',
      eventId: mockEventId,
    };

    it('should move photos successfully', async () => {
      const mockPhotos = [
        { id: mockPhotoId, event_id: mockEventId },
        { id: 'photo-456', event_id: mockEventId },
      ];

      // Mock photo validation
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      // Mock folder validation
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({
          data: { id: moveOptions.targetFolderId, event_id: mockEventId },
          error: null,
        }),
      });

      // Mock update operation
      const updatedPhotos = mockPhotos.map((p) => ({
        ...p,
        folder_id: moveOptions.targetFolderId,
      }));
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: updatedPhotos, error: null }),
      });

      const result = await photoService.batchMovePhotos(moveOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedPhotos);
    });

    it('should validate photo count limit', async () => {
      const invalidOptions = {
        ...moveOptions,
        photoIds: Array(101)
          .fill('photo')
          .map((_, i) => `photo-${i}`),
      };

      const result = await photoService.batchMovePhotos(invalidOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot move more than 100 photos at once');
    });

    it('should validate photos belong to event', async () => {
      const mockPhotos = [{ id: mockPhotoId, event_id: 'different-event' }];

      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      const result = await photoService.batchMovePhotos(moveOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some photos do not belong to this event');
    });

    it('should validate target folder exists', async () => {
      const mockPhotos = [{ id: mockPhotoId, event_id: mockEventId }];

      // Mock photo validation
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      // Mock folder validation - folder not found
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Not found') }),
      });

      const result = await photoService.batchMovePhotos(moveOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Target folder not found');
    });

    it('should allow moving to root (null folder)', async () => {
      const rootMoveOptions = { ...moveOptions, targetFolderId: null };
      const mockPhotos = [{ id: mockPhotoId, event_id: mockEventId }];

      // Mock photo validation
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      // Mock update operation
      const updatedPhotos = mockPhotos.map((p) => ({ ...p, folder_id: null }));
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: updatedPhotos, error: null }),
      });

      const result = await photoService.batchMovePhotos(rootMoveOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedPhotos);
    });
  });

  describe('batchGenerateSignedUrls', () => {
    const urlOptions = {
      photoIds: [mockPhotoId, 'photo-456'],
      expiryMinutes: 60,
      usePreview: true,
    };

    it('should generate signed URLs for photos', async () => {
      const mockPhotos = [
        {
          id: mockPhotoId,
          storage_path: 'path1.jpg',
          preview_path: 'preview1.jpg',
        },
        {
          id: 'photo-456',
          storage_path: 'path2.jpg',
          preview_path: 'preview2.jpg',
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      // Mock signed URL generation
      mockStorage.createSignedUrl
        .mockResolvedValueOnce({
          data: { signedUrl: 'signed-url-1' },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { signedUrl: 'signed-url-2' },
          error: null,
        });

      const result = await photoService.batchGenerateSignedUrls(urlOptions);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        [mockPhotoId]: 'signed-url-1',
        'photo-456': 'signed-url-2',
      });
    });

    it('should use storage path when no preview available', async () => {
      const mockPhotos = [
        { id: mockPhotoId, storage_path: 'path1.jpg', preview_path: null },
      ];

      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      mockStorage.createSignedUrl.mockResolvedValueOnce({
        data: { signedUrl: 'signed-url-1' },
        error: null,
      });

      await photoService.batchGenerateSignedUrls({
        ...urlOptions,
        photoIds: [mockPhotoId],
      });

      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
        'path1.jpg',
        3600
      );
    });

    it('should handle URL generation errors gracefully', async () => {
      const mockPhotos = [
        {
          id: mockPhotoId,
          storage_path: 'path1.jpg',
          preview_path: 'preview1.jpg',
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      // Mock URL generation error
      mockStorage.createSignedUrl.mockResolvedValueOnce({
        data: null,
        error: new Error('Storage error'),
      });

      const result = await photoService.batchGenerateSignedUrls({
        ...urlOptions,
        photoIds: [mockPhotoId],
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({}); // Empty because URL generation failed
    });
  });

  describe('updatePhotoApproval', () => {
    it('should update photo approval status', async () => {
      const updatedPhoto = { ...mockPhoto, approved: false };
      mockFrom.single.mockResolvedValue({ data: updatedPhoto, error: null });

      const result = await photoService.updatePhotoApproval(mockPhotoId, false);

      expect(result.success).toBe(true);
      expect(result.data?.approved).toBe(false);
      expect(mockFrom.update).toHaveBeenCalledWith(
        expect.objectContaining({
          approved: false,
        })
      );
    });
  });

  describe('deletePhotos', () => {
    const photoIds = [mockPhotoId, 'photo-456'];

    it('should delete photos and cleanup storage', async () => {
      const mockPhotos = [
        {
          id: mockPhotoId,
          event_id: mockEventId,
          storage_path: 'path1.jpg',
          preview_path: 'preview1.jpg',
          watermark_path: 'watermark1.jpg',
        },
        {
          id: 'photo-456',
          event_id: mockEventId,
          storage_path: 'path2.jpg',
          preview_path: null,
          watermark_path: null,
        },
      ];

      // Mock photo fetch
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      // Mock delete operation
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      // Mock storage cleanup
      mockStorage.remove.mockResolvedValue({ data: null, error: null });

      const result = await photoService.deletePhotos(photoIds, mockEventId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(photoIds);
      expect(mockStorage.remove).toHaveBeenCalledTimes(2); // Once per photo
    });

    it('should validate photo count limit', async () => {
      const tooManyPhotos = Array(51)
        .fill('photo')
        .map((_, i) => `photo-${i}`);

      const result = await photoService.deletePhotos(
        tooManyPhotos,
        mockEventId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete more than 50 photos at once');
    });

    it('should validate photos belong to event', async () => {
      const mockPhotos = [
        {
          id: mockPhotoId,
          event_id: 'different-event',
          storage_path: 'path1.jpg',
        },
      ];

      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockPhotos, error: null }),
      });

      const result = await photoService.deletePhotos(
        [mockPhotoId],
        mockEventId
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some photos do not belong to this event');
    });
  });

  describe('getPhotoStats', () => {
    it('should return photo statistics for event', async () => {
      const mockStatsPhotos = [
        { approved: true, processing_status: 'completed', file_size: 1000 },
        { approved: false, processing_status: 'pending', file_size: 2000 },
        { approved: true, processing_status: 'failed', file_size: 1500 },
      ];

      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: mockStatsPhotos, error: null }),
      });

      const result = await photoService.getPhotoStats(mockEventId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        total: 3,
        approved: 2,
        pending: 1,
        processing: 0,
        failed: 1,
        totalSize: 4500,
      });
    });

    it('should filter by folder', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      await photoService.getPhotoStats(mockEventId, mockFolderId);

      expect(mockFrom.eq).toHaveBeenCalledWith('folder_id', mockFolderId);
    });

    it('should handle null folder (root photos)', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      await photoService.getPhotoStats(mockEventId, null);

      expect(mockFrom.is).toHaveBeenCalledWith('folder_id', null);
    });
  });

  describe('edge cases', () => {
    it('should handle empty photo arrays', async () => {
      const result = await photoService.batchMovePhotos({
        photoIds: [],
        targetFolderId: mockFolderId,
        eventId: mockEventId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No photos provided');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await photoService.getPhotos({ eventId: mockEventId });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should handle null data responses', async () => {
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        count: vi.fn().mockResolvedValue({ count: 0, error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await photoService.getPhotos({ eventId: mockEventId });

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
