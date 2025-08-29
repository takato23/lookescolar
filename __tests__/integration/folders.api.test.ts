import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Import the API handlers
import {
  GET as foldersGET,
  POST as foldersPOST,
} from '@/app/api/admin/events/[id]/folders/route';
import {
  GET as folderGET,
  PATCH as folderPATCH,
  DELETE as folderDELETE,
} from '@/app/api/admin/folders/[id]/route';

// Mock dependencies
vi.mock('@/lib/middleware/auth.middleware', () => ({
  withAuth: vi.fn((handler) => handler),
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
const mockSupabaseClient = {
  from: vi.fn(),
  storage: { from: vi.fn() },
};

const mockFrom = {
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
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseServiceClient: vi
    .fn()
    .mockResolvedValue(mockSupabaseClient),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabaseClient.from.mockReturnValue(mockFrom);
});

describe('Event Photo Library - Folders API Integration Tests', () => {
  const mockEventId = 'event-123';
  const mockFolderId = 'folder-456';

  const mockFolder = {
    id: mockFolderId,
    event_id: mockEventId,
    parent_id: null,
    name: 'Test Folder',
    path: 'Test Folder',
    depth: 0,
    sort_order: 0,
    child_folder_count: 0,
    photo_count: 5,
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  describe('GET /admin/events/{eventId}/folders', () => {
    it('should fetch folders for an event successfully', async () => {
      const folders = [mockFolder];
      mockFrom.single.mockResolvedValue({ data: folders, error: null });
      mockFrom.count.mockResolvedValue({ count: 1, error: null });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders`
      );
      const response = await foldersGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.folders).toEqual(folders);
      expect(responseData.count).toBe(1);
    });

    it('should filter by parent folder when parentId provided', async () => {
      const parentId = 'parent-123';
      const childFolders = [{ ...mockFolder, parent_id: parentId }];

      mockFrom.single.mockResolvedValue({ data: childFolders, error: null });
      mockFrom.count.mockResolvedValue({ count: 1, error: null });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders?parentId=${parentId}`
      );
      const response = await foldersGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockFrom.eq).toHaveBeenCalledWith('parent_id', parentId);
    });

    it('should handle missing event ID', async () => {
      const request = new NextRequest('http://localhost/admin/events//folders');
      const response = await foldersGET(request, { params: { id: '' } });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Event ID is required');
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockFrom.single.mockResolvedValue({ data: null, error });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders`
      );
      const response = await foldersGET(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Database connection failed');
    });
  });

  describe('POST /admin/events/{eventId}/folders', () => {
    it('should create a new folder successfully', async () => {
      const newFolderData = {
        name: 'New Folder',
        parent_id: null,
        description: 'Test folder',
        sort_order: 1,
      };

      mockFrom.single.mockResolvedValue({ data: mockFolder, error: null });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders`,
        {
          method: 'POST',
          body: JSON.stringify(newFolderData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await foldersPOST(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.folder).toEqual(mockFolder);
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: mockEventId,
          name: newFolderData.name,
          parent_id: newFolderData.parent_id,
        })
      );
    });

    it('should validate required folder name', async () => {
      const invalidData = { name: '' };

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders`,
        {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await foldersPOST(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Folder name is required');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders`,
        {
          method: 'POST',
          body: 'invalid-json',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await foldersPOST(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid JSON in request body');
    });

    it('should handle duplicate folder names with 409 status', async () => {
      const error = new Error('Folder with this name already exists');
      mockFrom.single.mockResolvedValue({ data: null, error });

      const request = new NextRequest(
        `http://localhost/admin/events/${mockEventId}/folders`,
        {
          method: 'POST',
          body: JSON.stringify({ name: 'Duplicate Folder' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await foldersPOST(request, {
        params: { id: mockEventId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Folder with this name already exists');
    });
  });

  describe('GET /admin/folders/{folderId}', () => {
    it('should fetch folder by ID successfully', async () => {
      mockFrom.single.mockResolvedValue({ data: mockFolder, error: null });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`
      );
      const response = await folderGET(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.folder).toEqual(mockFolder);
    });

    it('should handle folder not found with 404 status', async () => {
      const error = new Error('Folder not found');
      mockFrom.single.mockResolvedValue({ data: null, error });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`
      );
      const response = await folderGET(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Folder not found');
    });
  });

  describe('PATCH /admin/folders/{folderId}', () => {
    it('should update folder successfully', async () => {
      const updateData = { name: 'Updated Folder' };
      const updatedFolder = { ...mockFolder, ...updateData };

      // Mock current folder state and update result
      mockFrom.single
        .mockResolvedValueOnce({ data: mockFolder, error: null })
        .mockResolvedValueOnce({ data: updatedFolder, error: null });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await folderPATCH(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.folder.name).toBe(updateData.name);
    });

    it('should validate empty update data', async () => {
      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await folderPATCH(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No fields to update');
    });

    it('should validate folder name format', async () => {
      const invalidData = { name: '' };

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await folderPATCH(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid folder name');
    });
  });

  describe('DELETE /admin/folders/{folderId}', () => {
    it('should delete empty folder successfully', async () => {
      const emptyFolder = {
        ...mockFolder,
        child_folder_count: 0,
        photo_count: 0,
      };

      mockFrom.single
        .mockResolvedValueOnce({ data: emptyFolder, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await folderDELETE(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Folder deleted successfully');
    });

    it('should prevent deleting folder with content', async () => {
      const folderWithContent = {
        ...mockFolder,
        child_folder_count: 2,
        photo_count: 5,
      };

      mockFrom.single.mockResolvedValue({
        data: folderWithContent,
        error: null,
      });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}`,
        {
          method: 'DELETE',
        }
      );

      const response = await folderDELETE(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toContain('contains items');
    });

    it('should handle force delete with contents', async () => {
      const folderWithContent = {
        ...mockFolder,
        child_folder_count: 1,
        photo_count: 3,
      };

      mockFrom.single
        .mockResolvedValueOnce({ data: folderWithContent, error: null })
        .mockResolvedValue({ data: null, error: null });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}?force=true`,
        {
          method: 'DELETE',
        }
      );

      const response = await folderDELETE(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it('should move contents when moveContentsTo specified', async () => {
      const folderWithContent = {
        ...mockFolder,
        child_folder_count: 1,
        photo_count: 3,
      };
      const moveToParent = 'parent-123';

      mockFrom.single.mockResolvedValue({
        data: folderWithContent,
        error: null,
      });

      const request = new NextRequest(
        `http://localhost/admin/folders/${mockFolderId}?moveContentsTo=${moveToParent}`,
        {
          method: 'DELETE',
        }
      );

      const response = await folderDELETE(request, {
        params: { id: mockFolderId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });
});
