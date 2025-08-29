import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockedFunction,
} from 'vitest';
import { folderService } from '@/lib/services/folder.service';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Mock Supabase client
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/utils/logger');

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

const mockFrom = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  in: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  count: vi.fn(),
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
});

describe('FolderService', () => {
  const mockEventId = 'event-123';
  const mockFolderId = 'folder-123';
  const mockParentId = 'parent-123';

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

  describe('getFolders', () => {
    it('should return folders for an event', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: null });
      mockFrom.count.mockResolvedValue({ count: 2, error: null });

      const mockFolders = [
        mockFolder,
        { ...mockFolder, id: 'folder-456', name: 'Another Folder' },
      ];
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockFolders, error: null }),
      });

      const result = await folderService.getFolders(mockEventId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFolders);
      expect(mockSupabase.from).toHaveBeenCalledWith('event_folders');
      expect(mockFrom.eq).toHaveBeenCalledWith('event_id', mockEventId);
    });

    it('should filter by parent folder', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: null });

      const result = await folderService.getFolders(mockEventId, mockParentId);

      expect(mockFrom.eq).toHaveBeenCalledWith('parent_id', mockParentId);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database error');
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error }),
      });

      const result = await folderService.getFolders(mockEventId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('createFolder', () => {
    const folderData = {
      name: 'New Folder',
      parent_id: mockParentId,
      sort_order: 1,
    };

    it('should create a new folder successfully', async () => {
      mockFrom.single.mockResolvedValue({ data: mockFolder, error: null });

      const result = await folderService.createFolder(mockEventId, folderData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockFolder);
      expect(mockSupabase.from).toHaveBeenCalledWith('event_folders');
      expect(mockFrom.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: mockEventId,
          name: folderData.name,
          parent_id: folderData.parent_id,
          sort_order: folderData.sort_order,
        })
      );
    });

    it('should validate folder name', async () => {
      const invalidData = { ...folderData, name: '' };

      const result = await folderService.createFolder(mockEventId, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder name is required');
    });

    it('should validate folder name length', async () => {
      const invalidData = { ...folderData, name: 'a'.repeat(256) };

      const result = await folderService.createFolder(mockEventId, invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder name must be less than 255 characters');
    });

    it('should validate parent folder exists', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Not found') }),
      });

      const result = await folderService.createFolder(mockEventId, folderData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Parent folder not found');
    });
  });

  describe('updateFolder', () => {
    const updateData = {
      name: 'Updated Folder',
      parent_id: 'new-parent-123',
    };

    it('should update folder successfully', async () => {
      // Mock folder exists check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
      });

      // Mock parent folder check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({
          data: { id: updateData.parent_id },
          error: null,
        }),
      });

      // Mock cycle detection
      mockSupabase.rpc.mockResolvedValue({ data: false, error: null });

      // Mock update
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({
          data: { ...mockFolder, ...updateData },
          error: null,
        }),
      });

      const result = await folderService.updateFolder(mockFolderId, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(updateData.name);
    });

    it('should prevent circular references', async () => {
      // Mock folder exists check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: mockFolder, error: null }),
      });

      // Mock parent folder check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({
          data: { id: updateData.parent_id },
          error: null,
        }),
      });

      // Mock cycle detection - returns true (cycle detected)
      mockSupabase.rpc.mockResolvedValue({ data: true, error: null });

      const result = await folderService.updateFolder(mockFolderId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Cannot move folder: would create circular reference'
      );
    });

    it('should validate folder exists', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: null, error: new Error('Not found') }),
      });

      const result = await folderService.updateFolder(mockFolderId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Folder not found');
    });
  });

  describe('deleteFolder', () => {
    it('should delete empty folder successfully', async () => {
      const emptyFolder = {
        ...mockFolder,
        child_folder_count: 0,
        photo_count: 0,
      };

      // Mock folder exists check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: emptyFolder, error: null }),
      });

      // Mock delete operation
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await folderService.deleteFolder(mockFolderId);

      expect(result.success).toBe(true);
      expect(mockFrom.delete).toHaveBeenCalled();
    });

    it('should handle folder with content using default action', async () => {
      const folderWithContent = {
        ...mockFolder,
        child_folder_count: 2,
        photo_count: 5,
      };

      // Mock folder exists check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: folderWithContent, error: null }),
      });

      const result = await folderService.deleteFolder(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Folder contains');
    });

    it('should move content when action is moveToParent', async () => {
      const folderWithContent = {
        ...mockFolder,
        child_folder_count: 1,
        photo_count: 3,
      };

      // Mock folder exists check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: folderWithContent, error: null }),
      });

      // Mock move operations
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await folderService.deleteFolder(
        mockFolderId,
        'moveToParent'
      );

      expect(result.success).toBe(true);
    });

    it('should delete content when action is deleteAll', async () => {
      const folderWithContent = {
        ...mockFolder,
        child_folder_count: 1,
        photo_count: 3,
      };

      // Mock folder exists check
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi
          .fn()
          .mockResolvedValue({ data: folderWithContent, error: null }),
      });

      // Mock delete operations
      mockSupabase.from.mockReturnValue({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await folderService.deleteFolder(
        mockFolderId,
        'deleteAll'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getFolderBreadcrumb', () => {
    it('should return breadcrumb for folder', async () => {
      const breadcrumb = [
        { id: 'root', name: 'Root', depth: 0 },
        { id: mockFolderId, name: 'Child', depth: 1 },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: breadcrumb, error: null });

      const result = await folderService.getFolderBreadcrumb(mockFolderId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(breadcrumb);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_breadcrumb', {
        folder_id: mockFolderId,
      });
    });

    it('should handle RPC errors', async () => {
      const error = new Error('RPC error');
      mockSupabase.rpc.mockResolvedValue({ data: null, error });

      const result = await folderService.getFolderBreadcrumb(mockFolderId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('RPC error');
    });
  });

  describe('searchFolders', () => {
    it('should search folders by name', async () => {
      const searchResults = [mockFolder];
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: searchResults, error: null }),
      });

      const result = await folderService.searchFolders(mockEventId, 'Test');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(searchResults);
      expect(mockFrom.ilike).toHaveBeenCalledWith('name', '%Test%');
    });

    it('should validate search query', async () => {
      const result = await folderService.searchFolders(mockEventId, '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search query is required');
    });
  });

  describe('getFolderStats', () => {
    it('should return folder statistics', async () => {
      const stats = {
        total_folders: 5,
        max_depth: 3,
        total_photos: 25,
        avg_photos_per_folder: 5,
      };

      mockSupabase.rpc.mockResolvedValue({ data: stats, error: null });

      const result = await folderService.getFolderStats(mockEventId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(stats);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_folder_stats', {
        event_id: mockEventId,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await folderService.getFolders(mockEventId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should handle null data responses', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockFrom,
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await folderService.getFolders(mockEventId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });
  });
});
