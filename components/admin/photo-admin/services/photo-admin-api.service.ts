/**
 * Centralized API service for PhotoAdmin
 * Handles all API calls related to folders, assets, and events
 * Extracted from PhotoAdmin.tsx for better organization and reusability
 */

import { createApiUrl } from '@/lib/utils/api-client';
import { egressMonitor } from './egress-monitor.service';

export interface OptimizedFolder {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  photo_count: number;
  has_children: boolean;
  event_id?: string | null;
  child_folder_count?: number;
  scope?: 'event' | 'global' | 'legacy' | 'template';
}

export interface OptimizedAsset {
  id: string;
  filename: string;
  preview_path: string | null;
  preview_url?: string | null;
  original_path?: string | null;
  watermark_path?: string | null;
  file_size: number;
  created_at: string;
  status?: 'pending' | 'processing' | 'ready' | 'error';
}

interface FolderListOptions {
  limit?: number;
  offset?: number;
  event_id?: string | null;
  include_global?: boolean;
  scopes?: string[];
}

interface AssetListOptions {
  offset?: number;
  limit?: number;
  q?: string;
  include_children?: boolean;
  status?: 'pending' | 'processing' | 'ready' | 'error';
  min_size?: number;
  max_size?: number;
  start_date?: string;
  end_date?: string;
  file_type?: string;
}

interface EventPhotosOptions {
  offset?: number;
  limit?: number;
  folderId?: string | null;
  includeSignedUrls?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface MoveContentsOptions {
  moveContentsTo?: string | null;
  force?: boolean;
}

interface CopyFolderPayload {
  target_parent_id?: string | null;
  new_name?: string;
  include_subfolders?: boolean;
  duplicate_assets?: boolean;
}

export const photoAdminApi = {
  folders: {
    list: async (options?: FolderListOptions): Promise<OptimizedFolder[]> => {
      const params = new URLSearchParams();
      if (options?.limit)
        params.set('limit', String(Math.min(options.limit, 50)));
      if (options?.offset) params.set('offset', String(options.offset));
      if (options?.include_global) params.set('include_global', 'true');
      if (options?.scopes && options.scopes.length > 0)
        params.set('scopes', options.scopes.join(','));
      if (options?.event_id) params.set('event_id', String(options.event_id));

      const ep = '/api/admin/folders';
      const qs = params.toString();
      const url = createApiUrl(qs ? `${ep}?${qs}` : ep);

      const response = await fetch(url);
      const data = await response.json();

      egressMonitor.track(JSON.stringify(data).length);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch folders');
      }

      return data.folders || [];
    },

    create: async (folder: {
      name: string;
      parent_id?: string | null;
      event_id?: string | null;
    }): Promise<OptimizedFolder> => {
      const response = await fetch(createApiUrl('/api/admin/folders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folder),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create folder');
      }

      return data.folder;
    },

    update: async (
      folderId: string,
      payload: { name?: string; parent_id?: string | null }
    ): Promise<OptimizedFolder> => {
      const response = await fetch(
        createApiUrl(`/api/admin/folders/${folderId}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!data.success)
        throw new Error(data.error || 'Failed to update folder');
      return data.folder;
    },

    delete: async (
      folderId: string,
      options?: MoveContentsOptions
    ): Promise<boolean> => {
      const params = new URLSearchParams();
      if (options?.moveContentsTo !== undefined)
        params.set('moveContentsTo', String(options.moveContentsTo));
      if (options?.force !== undefined)
        params.set('force', String(options.force));
      const response = await fetch(
        createApiUrl(`/api/admin/folders/${folderId}?${params}`),
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      if (!data.success)
        throw new Error(data.error || 'Failed to delete folder');
      return true;
    },

    copy: async (
      folderId: string,
      payload: CopyFolderPayload
    ): Promise<unknown> => {
      const response = await fetch(
        createApiUrl(`/api/admin/folders/${folderId}/copy`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to copy folder');
      }
      return data;
    },
  },

  events: {
    listSimple: async (
      limit = 100
    ): Promise<Array<{ id: string; name: string }>> => {
      const safeLimit = Math.max(1, Math.min(limit, 200));

      try {
        const res = await fetch(
          createApiUrl(`/api/admin/events-simple?limit=${safeLimit}`),
          {
            credentials: 'include',
          }
        );

        let events: Array<{ id: string; name: string }> = [];

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (Array.isArray(data?.events) && data.events.length > 0) {
            events = data.events
              .map((e: any) => ({
                id: e?.id,
                name: e?.name || 'Sin nombre',
              }))
              .filter((e) => typeof e.id === 'string' && e.id.length > 0);
          }
        }

        // Fallback in case the lightweight endpoint returned nothing
        if (events.length === 0) {
          const fallbackRes = await fetch(
            createApiUrl(
              `/api/admin/events/search?limit=${Math.min(safeLimit, 50)}`
            ),
            { credentials: 'include' }
          );

          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json().catch(() => ({}));
            if (Array.isArray(fallbackData?.events)) {
              events = fallbackData.events
                .map((e: any) => ({
                  id: e?.id,
                  name: e?.name || 'Sin nombre',
                }))
                .filter((e) => typeof e.id === 'string' && e.id.length > 0);
            }
          }
        }

        return events;
      } catch (error) {
        console.warn('Failed to load simple events list:', error);
        return [];
      }
    },
  },

  assets: {
    list: async (
      folderId: string,
      options?: AssetListOptions
    ): Promise<{
      assets: OptimizedAsset[];
      count: number;
      hasMore: boolean;
    }> => {
      const params = new URLSearchParams({
        folder_id: folderId,
        limit: String(Math.min(options?.limit || 50, 100)),
        offset: String(options?.offset || 0),
      });
      if (options?.q) {
        params.set('q', options.q);
      }
      if (options?.include_children) params.set('include_children', 'true');
      if (options?.status) params.set('status', options.status);
      if (options?.min_size !== undefined)
        params.set('min_size', String(options.min_size));
      if (options?.max_size !== undefined)
        params.set('max_size', String(options.max_size));
      if (options?.start_date) params.set('start_date', options.start_date);
      if (options?.end_date) params.set('end_date', options.end_date);
      if (options?.file_type) params.set('file_type', options.file_type);

      const response = await fetch(createApiUrl(`/api/admin/assets?${params}`));
      const data = await response.json();

      egressMonitor.track(JSON.stringify(data).length);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch assets');
      }

      return {
        assets: data.assets || [],
        count: data.count || 0,
        hasMore: data.hasMore || false,
      };
    },

    listByEvent: async (
      eventId: string,
      options?: EventPhotosOptions
    ): Promise<{
      photos: OptimizedAsset[];
      count: number;
      hasMore: boolean;
    }> => {
      const params = new URLSearchParams({
        page: String(
          Math.floor((options?.offset || 0) / (options?.limit || 50)) + 1
        ),
        limit: String(Math.min(options?.limit || 50, 100)),
      });
      if (options?.folderId) params.set('folderId', options.folderId);
      if (options?.includeSignedUrls) params.set('includeSignedUrls', 'true');
      if (options?.sortBy) params.set('sortBy', options.sortBy);
      if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

      const response = await fetch(
        createApiUrl(`/api/admin/events/${eventId}/photos?${params}`)
      );
      const data = await response.json();

      egressMonitor.track(JSON.stringify(data).length);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch event photos');
      }

      return {
        photos: data.photos || [],
        count: data.pagination?.total || 0,
        hasMore: data.pagination?.hasMore || false,
      };
    },

    move: async (
      assetIds: string[],
      targetFolderId: string
    ): Promise<unknown> => {
      const response = await fetch(createApiUrl('/api/admin/assets/bulk'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_ids: assetIds.slice(0, 100), // Limit for safety
          target_folder_id: targetFolderId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Bulk move HTTP error', {
          status: response.status,
          url: response.url,
          body: errorText?.slice(0, 1000),
        });
        throw new Error('Failed to move assets');
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Bulk move API error', { data });
        throw new Error(data.error || 'Failed to move assets');
      }
      return data;
    },

    delete: async (assetIds: string[]): Promise<unknown> => {
      const response = await fetch(createApiUrl('/api/admin/assets/bulk'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_ids: assetIds.slice(0, 100), // Limit for safety
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Bulk delete HTTP error', {
          status: response.status,
          url: response.url,
          body: errorText?.slice(0, 1000),
        });
        throw new Error('Failed to delete assets');
      }

      const data = await response.json();
      if (!data.success) {
        console.error('Bulk delete API error', { data });
        throw new Error(data.error || 'Failed to delete assets');
      }
      return data;
    },
  },
};

