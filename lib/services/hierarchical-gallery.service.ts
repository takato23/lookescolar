/**
 * HIERARCHICAL GALLERY SERVICE - Token-based Access Control
 * 
 * Provides token-based access to folders and assets using canonical API functions
 * Supports: Event, Course, and Family scoped access
 * Features: Folder navigation, asset retrieval, permission validation, audit logging
 */

import { createClient } from '@supabase/supabase-js';
import { accessTokenService } from './access-token.service';

// Types for gallery access
export interface GalleryFolder {
  id: string;
  name: string;
  photoCount: number;
  depth: number;
  // Navigation helpers
  hasChildren?: boolean;
  children?: GalleryFolder[];
}

export interface GalleryAsset {
  id: string;
  folderId: string;
  filename: string;
  previewPath?: string;
  originalPath: string;
  fileSize: number;
  createdAt: Date;
  // Access helpers
  canDownload?: boolean;
  downloadUrl?: string;
}

export interface GalleryContext {
  scope: 'event' | 'course' | 'family';
  resourceId: string;
  resourceName: string;
  accessLevel: 'full' | 'read_only';
  canDownload: boolean;
  expiresAt?: Date;
  usageStats: {
    totalAccesses: number;
    successfulAccesses: number;
    failedAccesses: number;
    uniqueIPs: number;
    firstAccess?: Date;
    lastAccess?: Date;
    avgResponseTimeMs?: number;
  };
}

export interface AccessValidation {
  isValid: boolean;
  reason?: string;
  context?: GalleryContext;
}

export class HierarchicalGalleryService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Validate token and get access context
   */
  async validateAccess(token: string): Promise<AccessValidation> {
    try {
      const validation = await accessTokenService.validateToken(token);
      
      if (!validation.isValid) {
        return {
          isValid: false,
          reason: validation.reason
        };
      }

      // Get full context using canonical API function
      const { data, error } = await this.supabase
        .rpc('api.get_token_context', { p_token: token });

      if (error || !data || data.length === 0) {
        return {
          isValid: false,
          reason: 'Failed to get token context'
        };
      }

      const contextData = data[0];
      const context: GalleryContext = {
        scope: contextData.scope,
        resourceId: contextData.resource_id,
        resourceName: contextData.resource_name,
        accessLevel: contextData.access_level,
        canDownload: contextData.can_download,
        expiresAt: contextData.expires_at ? new Date(contextData.expires_at) : undefined,
        usageStats: contextData.usage_stats || {
          totalAccesses: 0,
          successfulAccesses: 0,
          failedAccesses: 0,
          uniqueIPs: 0
        }
      };

      return {
        isValid: true,
        context
      };
    } catch (error: any) {
      return {
        isValid: false,
        reason: `Validation failed: ${error.message}`
      };
    }
  }

  /**
   * Get folders accessible by token
   */
  async getFolders(token: string): Promise<GalleryFolder[]> {
    const startTime = Date.now();
    
    try {
      // Use canonical API function for folder access
      const { data, error } = await this.supabase
        .rpc('api.folders_for_token', { p_token: token });

      if (error) {
        await this.logAccess(token, 'list_folders', {
          success: false,
          responseTimeMs: Date.now() - startTime,
          notes: error.message
        });
        throw new Error(`Failed to get folders: ${error.message}`);
      }

      const folders = (data || []).map((folder: any) => ({
        id: folder.folder_id,
        name: folder.folder_name,
        photoCount: folder.photo_count,
        depth: folder.depth
      }));

      // Log successful access
      await this.logAccess(token, 'list_folders', {
        success: true,
        responseTimeMs: Date.now() - startTime,
        notes: `Retrieved ${folders.length} folders`
      });

      return folders;
    } catch (error: any) {
      await this.logAccess(token, 'list_folders', {
        success: false,
        responseTimeMs: Date.now() - startTime,
        notes: error.message
      });
      throw error;
    }
  }

  /**
   * Get hierarchical folder tree
   */
  async getFolderTree(token: string): Promise<GalleryFolder[]> {
    const folders = await this.getFolders(token);
    
    // Build hierarchical tree from flat list
    const folderMap = new Map<string, GalleryFolder>();
    const rootFolders: GalleryFolder[] = [];

    // First pass: create map and identify roots
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
      if (folder.depth === 0) {
        rootFolders.push(folderMap.get(folder.id)!);
      }
    });

    // Second pass: build tree structure (simplified since we have depth)
    folders.forEach(folder => {
      if (folder.depth > 0) {
        // For now, add to root level - proper parent-child would require parent_id
        // This is a limitation of the current folder structure
        const folderNode = folderMap.get(folder.id)!;
        folderNode.hasChildren = false; // Will be calculated if needed
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }

  /**
   * Get assets in a folder (or all accessible assets if no folder specified)
   */
  async getAssets(token: string, folderId?: string): Promise<GalleryAsset[]> {
    const startTime = Date.now();
    
    try {
      // Use canonical API function for asset access
      const { data, error } = await this.supabase
        .rpc('api.assets_for_token', { 
          p_token: token,
          p_folder_id: folderId || null
        });

      if (error) {
        await this.logAccess(token, 'list_assets', {
          success: false,
          responseTimeMs: Date.now() - startTime,
          notes: error.message
        });
        throw new Error(`Failed to get assets: ${error.message}`);
      }

      // Get token context to determine download permissions
      const validation = await this.validateAccess(token);
      const canDownload = validation.context?.canDownload || false;

      const assets = (data || []).map((asset: any) => ({
        id: asset.asset_id,
        folderId: asset.folder_id,
        filename: asset.filename,
        previewPath: asset.preview_path,
        originalPath: asset.original_path,
        fileSize: asset.file_size,
        createdAt: new Date(asset.created_at),
        canDownload
      }));

      // Log successful access
      await this.logAccess(token, 'list_assets', {
        success: true,
        responseTimeMs: Date.now() - startTime,
        notes: `Retrieved ${assets.length} assets${folderId ? ` from folder ${folderId}` : ''}`
      });

      return assets;
    } catch (error: any) {
      await this.logAccess(token, 'list_assets', {
        success: false,
        responseTimeMs: Date.now() - startTime,
        notes: error.message
      });
      throw error;
    }
  }

  /**
   * Check if token can access specific asset
   */
  async canAccessAsset(token: string, assetId: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.supabase
        .rpc('api.can_access_asset', {
          p_token: token,
          p_asset_id: assetId
        });

      const canAccess = data && !error;

      await this.logAccess(token, 'view', {
        success: canAccess,
        responseTimeMs: Date.now() - startTime,
        notes: `Asset access check: ${assetId}`
      });

      return canAccess;
    } catch (error) {
      await this.logAccess(token, 'view', {
        success: false,
        responseTimeMs: Date.now() - startTime,
        notes: `Asset access error: ${error}`
      });
      return false;
    }
  }

  /**
   * Generate secure download URL for asset (if token allows downloads)
   */
  async getDownloadUrl(token: string, assetId: string): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      // First check if token allows downloads and can access asset
      const validation = await this.validateAccess(token);
      if (!validation.isValid || !validation.context?.canDownload) {
        await this.logAccess(token, 'download', {
          success: false,
          responseTimeMs: Date.now() - startTime,
          notes: 'Download not allowed for this token'
        });
        return null;
      }

      const canAccess = await this.canAccessAsset(token, assetId);
      if (!canAccess) {
        await this.logAccess(token, 'download', {
          success: false,
          responseTimeMs: Date.now() - startTime,
          notes: 'Asset not accessible'
        });
        return null;
      }

      // Get asset path
      const { data, error } = await this.supabase
        .from('assets')
        .select('original_path')
        .eq('id', assetId)
        .single();

      if (error || !data) {
        await this.logAccess(token, 'download', {
          success: false,
          responseTimeMs: Date.now() - startTime,
          notes: 'Asset not found'
        });
        return null;
      }

      // Generate signed URL (valid for 1 hour)
      const { data: signedData, error: signError } = await this.supabase.storage
        .from('photo-private')
        .createSignedUrl(data.original_path, 3600);

      if (signError || !signedData) {
        await this.logAccess(token, 'download', {
          success: false,
          responseTimeMs: Date.now() - startTime,
          notes: 'Failed to generate download URL'
        });
        return null;
      }

      await this.logAccess(token, 'download', {
        success: true,
        responseTimeMs: Date.now() - startTime,
        notes: `Download URL generated for asset ${assetId}`
      });

      return signedData.signedUrl;
    } catch (error: any) {
      await this.logAccess(token, 'download', {
        success: false,
        responseTimeMs: Date.now() - startTime,
        notes: error.message
      });
      return null;
    }
  }

  /**
   * Get preview URL for asset (always allowed if accessible)
   */
  async getPreviewUrl(token: string, assetId: string): Promise<string | null> {
    try {
      const canAccess = await this.canAccessAsset(token, assetId);
      if (!canAccess) {
        return null;
      }

      // Get asset preview path
      const { data, error } = await this.supabase
        .from('assets')
        .select('preview_path')
        .eq('id', assetId)
        .single();

      if (error || !data || !data.preview_path) {
        return null;
      }

      // Generate signed URL for preview (valid for 4 hours)
      const { data: signedData, error: signError } = await this.supabase.storage
        .from('photos')
        .createSignedUrl(data.preview_path, 14400);

      if (signError || !signedData) {
        return null;
      }

      return signedData.signedUrl;
    } catch (error) {
      console.error('Failed to get preview URL:', error);
      return null;
    }
  }

  /**
   * Get paginated assets for infinite scroll
   */
  async getAssetsPaginated(
    token: string, 
    folderId?: string, 
    limit: number = 20,
    offset: number = 0
  ): Promise<{ assets: GalleryAsset[]; hasMore: boolean; total: number }> {
    try {
      // Get all assets first (API function doesn't support pagination yet)
      const allAssets = await this.getAssets(token, folderId);
      
      // Apply pagination in memory
      const paginatedAssets = allAssets.slice(offset, offset + limit);
      const hasMore = offset + limit < allAssets.length;

      return {
        assets: paginatedAssets,
        hasMore,
        total: allAssets.length
      };
    } catch (error) {
      return {
        assets: [],
        hasMore: false,
        total: 0
      };
    }
  }

  /**
   * Search assets by filename
   */
  async searchAssets(token: string, query: string): Promise<GalleryAsset[]> {
    try {
      const allAssets = await this.getAssets(token);
      
      // Filter by filename (case-insensitive)
      const searchQuery = query.toLowerCase();
      return allAssets.filter(asset => 
        asset.filename.toLowerCase().includes(searchQuery)
      );
    } catch (error) {
      return [];
    }
  }

  /**
   * Get asset count for a token scope
   */
  async getAssetCount(token: string, folderId?: string): Promise<number> {
    try {
      const assets = await this.getAssets(token, folderId);
      return assets.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate gallery stats for token
   */
  async getGalleryStats(token: string): Promise<{
    totalFolders: number;
    totalAssets: number;
    totalSize: number;
    oldestAsset?: Date;
    newestAsset?: Date;
  }> {
    try {
      const [folders, assets] = await Promise.all([
        this.getFolders(token),
        this.getAssets(token)
      ]);

      const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);
      const dates = assets.map(asset => asset.createdAt).sort((a, b) => a.getTime() - b.getTime());

      return {
        totalFolders: folders.length,
        totalAssets: assets.length,
        totalSize,
        oldestAsset: dates.length > 0 ? dates[0] : undefined,
        newestAsset: dates.length > 0 ? dates[dates.length - 1] : undefined
      };
    } catch (error) {
      return {
        totalFolders: 0,
        totalAssets: 0,
        totalSize: 0
      };
    }
  }

  /**
   * Private helper: Log access for auditing
   */
  private async logAccess(
    token: string,
    action: 'list_folders' | 'list_assets' | 'download' | 'view',
    details: {
      ip?: string;
      userAgent?: string;
      path?: string;
      responseTimeMs?: number;
      success?: boolean;
      notes?: string;
    }
  ): Promise<void> {
    try {
      await accessTokenService.logAccess(token, action, details);
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.error('Failed to log access:', error);
    }
  }
}

// Singleton instance
export const hierarchicalGalleryService = new HierarchicalGalleryService();