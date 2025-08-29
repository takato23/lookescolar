/**
 * HIERARCHICAL GALLERY SERVICE TESTS
 *
 * Tests for token-based gallery access service
 * Covers: Token validation, folder access, asset retrieval, permission checks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { HierarchicalGalleryService } from '../../lib/services/hierarchical-gallery.service';

// Mock dependencies
vi.mock('@supabase/supabase-js');
vi.mock('../../lib/services/access-token.service', () => ({
  accessTokenService: {
    validateToken: vi.fn(),
    logAccess: vi.fn(),
  },
}));

import { accessTokenService } from '../../lib/services/access-token.service';

const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

const mockFrom = {
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
};

const mockStorage = {
  createSignedUrl: vi.fn(),
};

// Setup chainable mocks
mockFrom.select.mockReturnThis();
mockFrom.eq.mockReturnThis();
mockFrom.single.mockReturnThis();

mockSupabaseClient.from.mockReturnValue(mockFrom);
mockSupabaseClient.storage.from.mockReturnValue(mockStorage);

vi.mocked(createClient).mockReturnValue(mockSupabaseClient as any);

describe('HierarchicalGalleryService', () => {
  let service: HierarchicalGalleryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new HierarchicalGalleryService();
  });

  describe('Access Validation', () => {
    it('should validate valid token and return context', async () => {
      const mockValidation = {
        isValid: true,
        tokenId: 'token-123',
        scope: 'event',
        resourceId: 'event-456',
        accessLevel: 'full',
        canDownload: true,
        reason: 'valid',
      };

      const mockContextData = {
        scope: 'event',
        resource_id: 'event-456',
        resource_name: 'School Event 2024',
        access_level: 'full',
        can_download: true,
        expires_at: '2024-12-31T00:00:00.000Z',
        usage_stats: {
          totalAccesses: 15,
          successfulAccesses: 14,
          failedAccesses: 1,
          uniqueIPs: 3,
        },
      };

      vi.mocked(accessTokenService.validateToken).mockResolvedValueOnce(
        mockValidation
      );
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [mockContextData],
        error: null,
      });

      const result = await service.validateAccess('valid-token');

      expect(result.isValid).toBe(true);
      expect(result.context!.scope).toBe('event');
      expect(result.context!.resourceName).toBe('School Event 2024');
      expect(result.context!.canDownload).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'api.get_token_context',
        {
          p_token: 'valid-token',
        }
      );
    });

    it('should handle invalid token', async () => {
      vi.mocked(accessTokenService.validateToken).mockResolvedValueOnce({
        isValid: false,
        reason: 'Token expired',
      });

      const result = await service.validateAccess('expired-token');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Token expired');
      expect(result.context).toBeUndefined();
    });

    it('should handle context retrieval error', async () => {
      vi.mocked(accessTokenService.validateToken).mockResolvedValueOnce({
        isValid: true,
        tokenId: 'token-123',
      });

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Context error' },
      });

      const result = await service.validateAccess('token-with-context-error');

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Failed to get token context');
    });
  });

  describe('Folder Access', () => {
    it('should get folders for valid token', async () => {
      const mockFoldersData = [
        {
          folder_id: 'folder-1',
          folder_name: 'Class Photos',
          photo_count: 25,
          depth: 0,
        },
        {
          folder_id: 'folder-2',
          folder_name: 'Individual Photos',
          photo_count: 150,
          depth: 1,
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockFoldersData,
        error: null,
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.getFolders('test-token');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('folder-1');
      expect(result[0].name).toBe('Class Photos');
      expect(result[0].photoCount).toBe(25);
      expect(result[0].depth).toBe(0);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'api.folders_for_token',
        {
          p_token: 'test-token',
        }
      );

      expect(accessTokenService.logAccess).toHaveBeenCalledWith(
        'test-token',
        'list_folders',
        expect.objectContaining({
          success: true,
          notes: 'Retrieved 2 folders',
        })
      );
    });

    it('should handle folder retrieval error', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'No folders found' },
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      await expect(service.getFolders('invalid-token')).rejects.toThrow(
        'Failed to get folders: No folders found'
      );

      expect(accessTokenService.logAccess).toHaveBeenCalledWith(
        'invalid-token',
        'list_folders',
        expect.objectContaining({
          success: false,
          notes: 'No folders found',
        })
      );
    });

    it('should build hierarchical folder tree', async () => {
      const mockFoldersData = [
        {
          folder_id: 'folder-1',
          folder_name: 'Root Folder',
          photo_count: 10,
          depth: 0,
        },
        {
          folder_id: 'folder-2',
          folder_name: 'Subfolder A',
          photo_count: 5,
          depth: 1,
        },
        {
          folder_id: 'folder-3',
          folder_name: 'Subfolder B',
          photo_count: 8,
          depth: 1,
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockFoldersData,
        error: null,
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.getFolderTree('test-token');

      expect(result).toHaveLength(3); // Root + 2 subfolders (simplified structure)

      const rootFolder = result.find((f) => f.name === 'Root Folder');
      expect(rootFolder).toBeDefined();
      expect(rootFolder!.depth).toBe(0);
      expect(rootFolder!.children).toBeDefined();
    });
  });

  describe('Asset Access', () => {
    it('should get assets with download permissions', async () => {
      const mockAssetsData = [
        {
          asset_id: 'asset-1',
          folder_id: 'folder-1',
          filename: 'photo1.jpg',
          preview_path: 'previews/photo1.jpg',
          original_path: 'originals/photo1.jpg',
          file_size: 2048576,
          created_at: '2024-01-01T10:00:00.000Z',
        },
        {
          asset_id: 'asset-2',
          folder_id: 'folder-1',
          filename: 'photo2.jpg',
          preview_path: 'previews/photo2.jpg',
          original_path: 'originals/photo2.jpg',
          file_size: 1536000,
          created_at: '2024-01-01T11:00:00.000Z',
        },
      ];

      const mockValidation = {
        isValid: true,
        context: {
          canDownload: true,
          scope: 'event',
          resourceId: 'event-123',
        },
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockAssetsData,
        error: null,
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      // Mock validateAccess for download permission check
      const validateAccessSpy = vi
        .spyOn(service, 'validateAccess')
        .mockResolvedValueOnce(mockValidation);

      const result = await service.getAssets('test-token', 'folder-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('asset-1');
      expect(result[0].filename).toBe('photo1.jpg');
      expect(result[0].canDownload).toBe(true);
      expect(result[0].fileSize).toBe(2048576);

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'api.assets_for_token',
        {
          p_token: 'test-token',
          p_folder_id: 'folder-1',
        }
      );
    });

    it('should get all assets when no folder specified', async () => {
      const mockAssetsData = [
        {
          asset_id: 'asset-1',
          folder_id: 'folder-1',
          filename: 'photo1.jpg',
          preview_path: 'previews/photo1.jpg',
          original_path: 'originals/photo1.jpg',
          file_size: 2048576,
          created_at: '2024-01-01T10:00:00.000Z',
        },
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: mockAssetsData,
        error: null,
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const validateAccessSpy = vi
        .spyOn(service, 'validateAccess')
        .mockResolvedValueOnce({
          isValid: true,
          context: { canDownload: false },
        });

      const result = await service.getAssets('test-token');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'api.assets_for_token',
        {
          p_token: 'test-token',
          p_folder_id: null,
        }
      );
      expect(result[0].canDownload).toBe(false);
    });

    it('should handle asset retrieval error', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Assets not found' },
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      await expect(service.getAssets('invalid-token')).rejects.toThrow(
        'Failed to get assets: Assets not found'
      );
    });
  });

  describe('Asset Permissions', () => {
    it('should check asset access permission', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.canAccessAsset('test-token', 'asset-123');

      expect(result).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'api.can_access_asset',
        {
          p_token: 'test-token',
          p_asset_id: 'asset-123',
        }
      );

      expect(accessTokenService.logAccess).toHaveBeenCalledWith(
        'test-token',
        'view',
        expect.objectContaining({
          success: true,
          notes: 'Asset access check: asset-123',
        })
      );
    });

    it('should deny asset access on error', async () => {
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Access denied' },
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.canAccessAsset('test-token', 'asset-123');

      expect(result).toBe(false);
    });
  });

  describe('Download URL Generation', () => {
    it('should generate download URL for authorized token', async () => {
      const mockValidation = {
        isValid: true,
        context: {
          canDownload: true,
          scope: 'event',
          resourceId: 'event-123',
        },
      };

      const mockAssetData = {
        original_path: 'originals/photo123.jpg',
      };

      const mockSignedData = {
        signedUrl:
          'https://storage.supabase.com/signed/photo123.jpg?token=abc123',
      };

      vi.spyOn(service, 'validateAccess').mockResolvedValueOnce(mockValidation);
      vi.spyOn(service, 'canAccessAsset').mockResolvedValueOnce(true);

      mockFrom.single.mockResolvedValueOnce({
        data: mockAssetData,
        error: null,
      });

      mockStorage.createSignedUrl.mockResolvedValueOnce({
        data: mockSignedData,
        error: null,
      });

      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.getDownloadUrl('test-token', 'asset-123');

      expect(result).toBe(mockSignedData.signedUrl);
      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
        'originals/photo123.jpg',
        3600 // 1 hour
      );
    });

    it('should deny download for read-only token', async () => {
      const mockValidation = {
        isValid: true,
        context: {
          canDownload: false,
          scope: 'course',
          resourceId: 'course-123',
        },
      };

      vi.spyOn(service, 'validateAccess').mockResolvedValueOnce(mockValidation);
      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.getDownloadUrl(
        'readonly-token',
        'asset-123'
      );

      expect(result).toBeNull();
      expect(accessTokenService.logAccess).toHaveBeenCalledWith(
        'readonly-token',
        'download',
        expect.objectContaining({
          success: false,
          notes: 'Download not allowed for this token',
        })
      );
    });

    it('should deny download for inaccessible asset', async () => {
      const mockValidation = {
        isValid: true,
        context: { canDownload: true },
      };

      vi.spyOn(service, 'validateAccess').mockResolvedValueOnce(mockValidation);
      vi.spyOn(service, 'canAccessAsset').mockResolvedValueOnce(false);
      vi.mocked(accessTokenService.logAccess).mockResolvedValueOnce(true);

      const result = await service.getDownloadUrl('test-token', 'asset-123');

      expect(result).toBeNull();
    });
  });

  describe('Preview URL Generation', () => {
    it('should generate preview URL for accessible asset', async () => {
      const mockAssetData = {
        preview_path: 'previews/photo123.jpg',
      };

      const mockSignedData = {
        signedUrl:
          'https://storage.supabase.com/signed/preview123.jpg?token=def456',
      };

      vi.spyOn(service, 'canAccessAsset').mockResolvedValueOnce(true);

      mockFrom.single.mockResolvedValueOnce({
        data: mockAssetData,
        error: null,
      });

      mockStorage.createSignedUrl.mockResolvedValueOnce({
        data: mockSignedData,
        error: null,
      });

      const result = await service.getPreviewUrl('test-token', 'asset-123');

      expect(result).toBe(mockSignedData.signedUrl);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('photos'); // Preview bucket
      expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
        'previews/photo123.jpg',
        14400 // 4 hours
      );
    });

    it('should return null for inaccessible asset', async () => {
      vi.spyOn(service, 'canAccessAsset').mockResolvedValueOnce(false);

      const result = await service.getPreviewUrl('test-token', 'asset-123');

      expect(result).toBeNull();
    });

    it('should return null for asset without preview', async () => {
      vi.spyOn(service, 'canAccessAsset').mockResolvedValueOnce(true);

      mockFrom.single.mockResolvedValueOnce({
        data: { preview_path: null },
        error: null,
      });

      const result = await service.getPreviewUrl('test-token', 'asset-123');

      expect(result).toBeNull();
    });
  });

  describe('Pagination and Search', () => {
    it('should paginate assets correctly', async () => {
      const mockAssets = Array.from({ length: 50 }, (_, i) => ({
        id: `asset-${i + 1}`,
        folderId: 'folder-1',
        filename: `photo${i + 1}.jpg`,
        fileSize: 1024576,
        createdAt: new Date('2024-01-01'),
      }));

      vi.spyOn(service, 'getAssets').mockResolvedValueOnce(mockAssets);

      const result = await service.getAssetsPaginated(
        'test-token',
        'folder-1',
        20,
        10
      );

      expect(result.assets).toHaveLength(20);
      expect(result.assets[0].id).toBe('asset-11'); // Starting from offset 10
      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(50);
    });

    it('should search assets by filename', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          folderId: 'folder-1',
          filename: 'group_photo_1.jpg',
          fileSize: 1024576,
          createdAt: new Date(),
        },
        {
          id: 'asset-2',
          folderId: 'folder-1',
          filename: 'individual_photo_1.jpg',
          fileSize: 1024576,
          createdAt: new Date(),
        },
        {
          id: 'asset-3',
          folderId: 'folder-1',
          filename: 'group_photo_2.jpg',
          fileSize: 1024576,
          createdAt: new Date(),
        },
      ];

      vi.spyOn(service, 'getAssets').mockResolvedValueOnce(mockAssets);

      const result = await service.searchAssets('test-token', 'group');

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('group_photo_1.jpg');
      expect(result[1].filename).toBe('group_photo_2.jpg');
    });
  });

  describe('Gallery Statistics', () => {
    it('should calculate gallery stats', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Folder 1', photoCount: 10, depth: 0 },
        { id: 'folder-2', name: 'Folder 2', photoCount: 15, depth: 0 },
      ];

      const mockAssets = [
        {
          id: 'asset-1',
          fileSize: 1024576,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          folderId: 'folder-1',
          filename: 'photo1.jpg',
        },
        {
          id: 'asset-2',
          fileSize: 2048576,
          createdAt: new Date('2024-01-15T15:00:00Z'),
          folderId: 'folder-2',
          filename: 'photo2.jpg',
        },
      ];

      vi.spyOn(service, 'getFolders').mockResolvedValueOnce(mockFolders);
      vi.spyOn(service, 'getAssets').mockResolvedValueOnce(mockAssets);

      const result = await service.getGalleryStats('test-token');

      expect(result.totalFolders).toBe(2);
      expect(result.totalAssets).toBe(2);
      expect(result.totalSize).toBe(3072152); // 1024576 + 2048576
      expect(result.oldestAsset).toEqual(new Date('2024-01-01T10:00:00Z'));
      expect(result.newestAsset).toEqual(new Date('2024-01-15T15:00:00Z'));
    });

    it('should handle empty gallery', async () => {
      vi.spyOn(service, 'getFolders').mockResolvedValueOnce([]);
      vi.spyOn(service, 'getAssets').mockResolvedValueOnce([]);

      const result = await service.getGalleryStats('empty-token');

      expect(result.totalFolders).toBe(0);
      expect(result.totalAssets).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.oldestAsset).toBeUndefined();
      expect(result.newestAsset).toBeUndefined();
    });
  });
});
