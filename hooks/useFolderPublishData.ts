'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { publishPerformanceMonitor, monitorBulkOperation } from '@/lib/services/publish-performance-monitor';

interface FolderRow {
  id: string;
  name: string;
  event_id: string | null;
  photo_count: number;
  is_published: boolean | null;
  share_token: string | null;
  published_at: string | null;
  family_url: string | null;
  qr_url: string | null;
  event_name: string | null;
  event_date: string | null;
}

interface EventInfo {
  id: string;
  name: string;
  date?: string;
}

interface PublishResponse {
  success: boolean;
  share_token?: string;
  family_url?: string;
  qr_url?: string;
  error?: string;
}

interface UnpublishResponse {
  success: boolean;
  error?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_more: boolean;
  has_previous: boolean;
}

interface FoldersListResponse {
  folders: FolderRow[];
  pagination: PaginationInfo;
  // Legacy compatibility
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Enhanced API functions with pagination support
const fetchFoldersPaginated = async (
  page = 1,
  limit = 20,
  search?: string,
  order_by = 'published_desc'
): Promise<FoldersListResponse & { event: EventInfo | null }> => {
  const params = new URLSearchParams({
    include_unpublished: 'true',
    page: page.toString(),
    limit: limit.toString(),
    order_by,
  });
  
  if (search?.trim()) {
    params.append('search', search.trim());
  }

  const response = await fetch(`/api/admin/folders/published?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch folders list');
  }
  const data = await response.json();
  
  // Normalize the response from optimized API
  const folders = (data.folders || []).map((f: any) => ({
    id: f.id as string,
    name: String(f.name || 'Untitled Folder'),
    event_id: f.event_id as string | null,
    photo_count: Number(f.photo_count || f.photos_count || 0),
    is_published: Boolean(f.is_published),
    share_token: f.share_token as string | null,
    published_at: f.published_at as string | null,
    family_url: f.family_url as string | null,
    qr_url: f.qr_url as string | null,
    event_name: f.event_name as string | null,
    event_date: f.event_date as string | null,
  }));

  // Get event info from first folder or fallback
  let event: EventInfo | null = null;
  if (folders.length > 0) {
    const firstFolder = folders[0];
    if (firstFolder.event_id && firstFolder.event_name) {
      event = {
        id: firstFolder.event_id,
        name: firstFolder.event_name,
        date: firstFolder.event_date || undefined
      };
    }
  }

  return {
    folders,
    event,
    pagination: data.pagination || {
      page,
      limit,
      total: data.total || 0,
      total_pages: Math.ceil((data.total || 0) / limit),
      has_more: data.has_more || false,
      has_previous: page > 1,
    },
    // Legacy compatibility
    total: data.total || 0,
    page,
    limit,
    has_more: data.has_more || false,
  };
};

// Legacy function for backward compatibility
const fetchFoldersList = async (): Promise<{ folders: FolderRow[]; event: EventInfo | null }> => {
  const result = await fetchFoldersPaginated(1, 100); // Load first 100 for compatibility
  return {
    folders: result.folders,
    event: result.event,
  };
};

const publishFolder = async (folderId: string): Promise<PublishResponse> => {
  const operationId = publishPerformanceMonitor.startOperation('publish_single', { folderId });
  
  try {
    const response = await fetch(`/api/admin/folders/${folderId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      publishPerformanceMonitor.endOperation(operationId, false, 1, data.error);
      throw new Error(data.error || 'Error publishing folder');
    }
    
    publishPerformanceMonitor.endOperation(operationId, true, 1);
    return data;
  } catch (error) {
    publishPerformanceMonitor.endOperation(operationId, false, 1, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};

const unpublishFolder = async (folderId: string): Promise<UnpublishResponse> => {
  const response = await fetch(`/api/admin/folders/${folderId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'unpublish' }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error unpublishing folder');
  }
  
  return data;
};

const rotateFolderToken = async (folderId: string): Promise<PublishResponse> => {
  const response = await fetch(`/api/admin/folders/${folderId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'rotate' }),
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error rotating token');
  }
  
  return data;
};

// Query keys
const folderPublishQueryKeys = {
  all: ['folderPublish'] as const,
  list: () => [...folderPublishQueryKeys.all, 'list'] as const,
  folder: (id: string) => [...folderPublishQueryKeys.all, 'folder', id] as const,
};

// Enhanced hook with pagination support
export function useFolderPublishData(options?: {
  page?: number;
  limit?: number;
  search?: string;
  order_by?: string;
  enablePagination?: boolean;
}) {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(options?.page || 1);
  const [searchTerm, setSearchTerm] = useState(options?.search || '');
  
  const isPaginationEnabled = options?.enablePagination ?? false;
  const limit = options?.limit || (isPaginationEnabled ? 20 : 100);
  const order_by = options?.order_by || 'published_desc';

  // Paginated query (new approach)
  const paginatedQuery = useQuery({
    queryKey: [...folderPublishQueryKeys.list(), 'paginated', { page: currentPage, limit, search: searchTerm, order_by }],
    queryFn: () => fetchFoldersPaginated(currentPage, limit, searchTerm, order_by),
    enabled: isPaginationEnabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Legacy query (backward compatibility)
  const legacyQuery = useQuery({
    queryKey: folderPublishQueryKeys.list(),
    queryFn: fetchFoldersList,
    enabled: !isPaginationEnabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Use appropriate query based on pagination setting
  const activeQuery = isPaginationEnabled ? paginatedQuery : legacyQuery;
  const data = activeQuery.data;

  // Optimistic update helper
  const updateFolderOptimistically = useCallback((folderId: string, updates: Partial<FolderRow>) => {
    queryClient.setQueryData(folderPublishQueryKeys.list(), (old: any) => {
      if (!old) return old;
      
      return {
        ...old,
        folders: old.folders.map((folder: FolderRow) =>
          folder.id === folderId ? { ...folder, ...updates } : folder
        ),
      };
    });
  }, [queryClient]);

  // Publish mutation with optimistic updates
  const publishMutation = useMutation({
    mutationFn: publishFolder,
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: folderPublishQueryKeys.list() });
      const previousData = queryClient.getQueryData(folderPublishQueryKeys.list());
      updateFolderOptimistically(folderId, { is_published: true });
      return { previousData };
    },
    onError: (error, folderId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(folderPublishQueryKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
    },
  });

  // Unpublish mutation with optimistic updates
  const unpublishMutation = useMutation({
    mutationFn: unpublishFolder,
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: folderPublishQueryKeys.list() });
      const previousData = queryClient.getQueryData(folderPublishQueryKeys.list());
      updateFolderOptimistically(folderId, { 
        is_published: false, 
        share_token: null,
        published_at: null,
        family_url: null,
        qr_url: null
      });
      return { previousData };
    },
    onError: (error, folderId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(folderPublishQueryKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
    },
  });

  // Rotate token mutation
  const rotateMutation = useMutation({
    mutationFn: rotateFolderToken,
    onMutate: async (folderId) => {
      await queryClient.cancelQueries({ queryKey: folderPublishQueryKeys.list() });
      const previousData = queryClient.getQueryData(folderPublishQueryKeys.list());
      return { previousData };
    },
    onError: (error, folderId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(folderPublishQueryKeys.list(), context.previousData);
      }
    },
    onSuccess: (data, folderId) => {
      if (data.share_token) {
        updateFolderOptimistically(folderId, { 
          share_token: data.share_token,
          family_url: data.family_url || null,
          qr_url: data.qr_url || null
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
    },
  });

  // Optimized bulk operations with concurrency control and monitoring
  const bulkPublish = useCallback(async (folderIds: string[], batchSize = 5) => {
    if (folderIds.length === 0) return;

    const monitor = monitorBulkOperation('bulk_publish', folderIds.length);

    try {
      console.log(`[BULK] Starting bulk publish for ${folderIds.length} folders`);
      
      const response = await fetch('/api/admin/folders/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_ids: folderIds,
          action: 'publish',
          batch_size: Math.min(batchSize, 5), // Max 5 concurrent operations
          settings: {
            allowDownload: false,
            watermarkLevel: 'medium'
          }
        }),
      });

      // Check if response is ok first
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: errorText };
        }
        
        console.error('[BULK] HTTP Error:', response.status, errorData);
        monitor.complete(0, errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        throw new Error(errorData.error || `Network error: ${response.status}`);
      }

      const result = await response.json();
      
      // Validate response structure
      if (!result || typeof result.successful !== 'number' || typeof result.total_processed !== 'number') {
        console.error('[BULK] Invalid response structure:', result);
        monitor.complete(0, 'Invalid response structure from server');
        throw new Error('Invalid response from server');
      }

      console.log(`[BULK] Published ${result.successful}/${result.total_processed} folders in ${result.execution_time_ms || 0}ms`);
      
      // Report success/failure to monitor
      monitor.complete(
        result.successful || 0, 
        result.failed > 0 ? `${result.failed} folders failed to publish` : undefined
      );
      
      // Invalidate cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
      
      return result;
    } catch (error) {
      console.error('[BULK] Publish error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      monitor.complete(0, errorMessage);
      
      // Don't attempt fallback if this is a network/server error
      if (error instanceof Error && error.message.includes('HTTP')) {
        throw error;
      }
      
      // Fallback to sequential processing for other errors
      console.log('[BULK] Attempting fallback to individual operations...');
      try {
        const promises = folderIds.slice(0, 10).map(id => publishMutation.mutateAsync(id)); // Limit to 10
        await Promise.allSettled(promises);
        
        // Invalidate cache after fallback
        queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
      } catch (fallbackError) {
        console.error('[BULK] Fallback also failed:', fallbackError);
      }
      
      throw error;
    }
  }, [publishMutation, queryClient]);

  const bulkUnpublish = useCallback(async (folderIds: string[], batchSize = 5) => {
    if (folderIds.length === 0) return;

    const monitor = monitorBulkOperation('bulk_unpublish', folderIds.length);

    try {
      console.log(`[BULK] Starting bulk unpublish for ${folderIds.length} folders`);
      
      const response = await fetch('/api/admin/folders/bulk-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_ids: folderIds,
          action: 'unpublish',
          batch_size: Math.min(batchSize, 5),
        }),
      });

      // Check if response is ok first
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}`, details: errorText };
        }
        
        console.error('[BULK] HTTP Error:', response.status, errorData);
        monitor.complete(0, errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        throw new Error(errorData.error || `Network error: ${response.status}`);
      }

      const result = await response.json();
      
      // Validate response structure
      if (!result || typeof result.successful !== 'number' || typeof result.total_processed !== 'number') {
        console.error('[BULK] Invalid response structure:', result);
        monitor.complete(0, 'Invalid response structure from server');
        throw new Error('Invalid response from server');
      }

      console.log(`[BULK] Unpublished ${result.successful}/${result.total_processed} folders in ${result.execution_time_ms || 0}ms`);
      
      // Report success/failure to monitor
      monitor.complete(
        result.successful || 0, 
        result.failed > 0 ? `${result.failed} folders failed to unpublish` : undefined
      );
      
      // Invalidate cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
      
      return result;
    } catch (error) {
      console.error('[BULK] Unpublish error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      monitor.complete(0, errorMessage);
      
      // Don't attempt fallback if this is a network/server error
      if (error instanceof Error && error.message.includes('HTTP')) {
        throw error;
      }
      
      // Fallback to sequential processing for other errors
      console.log('[BULK] Attempting fallback to individual operations...');
      try {
        const promises = folderIds.slice(0, 10).map(id => unpublishMutation.mutateAsync(id)); // Limit to 10
        await Promise.allSettled(promises);
        
        // Invalidate cache after fallback
        queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
      } catch (fallbackError) {
        console.error('[BULK] Fallback also failed:', fallbackError);
      }
      
      throw error;
    }
  }, [unpublishMutation, queryClient]);

  // Cache management
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: folderPublishQueryKeys.list() });
  }, [queryClient]);

  return {
    // Data (compatible interface with old codes system)
    codes: data?.folders?.map(f => ({
      id: f.id,
      event_id: f.event_id || '',
      course_id: null, // folders don't have courses
      code_value: f.name, // folder name as code_value
      token: f.share_token,
      is_published: f.is_published || false,
      photos_count: f.photo_count,
      created_at: f.published_at,
    })) || [],
    folders: data?.folders || [], // Raw folders data
    event: data?.event || null,
    pagination: isPaginationEnabled ? data?.pagination : null,
    
    // Loading states
    isLoading: activeQuery.isLoading,
    isRefetching: activeQuery.isRefetching,
    error: activeQuery.error,
    
    // Actions (compatible interface)
    publish: publishMutation.mutate,
    unpublish: unpublishMutation.mutate,
    rotateToken: rotateMutation.mutate,
    refetch: activeQuery.refetch,
    
    // Bulk actions
    bulkPublish,
    bulkUnpublish,
    
    // Action states
    isPublishing: publishMutation.isPending,
    isUnpublishing: unpublishMutation.isPending,
    isRotating: rotateMutation.isPending,
    
    // Individual action states (compatible)
    getIsPublishing: (folderId: string) => 
      publishMutation.isPending && publishMutation.variables === folderId,
    getIsUnpublishing: (folderId: string) => 
      unpublishMutation.isPending && unpublishMutation.variables === folderId,
    getIsRotating: (folderId: string) => 
      rotateMutation.isPending && rotateMutation.variables === folderId,
    
    // Cache management
    invalidateCache,
    
    // Stats (computed)
    stats: {
      total: data?.folders.length || 0,
      published: data?.folders.filter(f => f.is_published).length || 0,
      unpublished: data?.folders.filter(f => !f.is_published).length || 0,
      totalPhotos: data?.folders.reduce((sum, f) => sum + f.photo_count, 0) || 0,
    },
  };
}