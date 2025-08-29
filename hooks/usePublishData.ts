'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

interface CodeRow {
  id: string;
  event_id: string;
  course_id: string | null;
  code_value: string;
  token: string | null;
  is_published: boolean;
  photos_count: number;
  created_at?: string;
  last_accessed?: string;
}

interface EventInfo {
  id: string;
  name: string;
}

interface PublishResponse {
  success: boolean;
  token?: string;
  error?: string;
}

interface RotateResponse {
  success: boolean;
  newToken?: string;
  error?: string;
}

// API functions
const fetchPublishList = async (): Promise<{
  codes: CodeRow[];
  event: EventInfo | null;
}> => {
  const response = await fetch('/api/admin/publish/list');
  if (!response.ok) {
    throw new Error('Failed to fetch publish list');
  }
  const data = await response.json();

  // Normalize the response
  const codes = (
    Array.isArray(data) ? data : data?.rows || data?.data || []
  ).map((c: any) => ({
    id: (c.id ?? c.code_id) as string,
    event_id: (c.event_id as string) ?? '',
    course_id: (c.course_id as string) ?? null,
    code_value: String(c.code_value ?? ''),
    token: (c.token as string) ?? null,
    is_published: Boolean(c.is_published ?? c.published ?? false),
    photos_count: Number(c.photos_count ?? 0),
    created_at: c.created_at,
    last_accessed: c.last_accessed,
  }));

  // Get event info if codes exist
  let event: EventInfo | null = null;
  if (codes.length > 0) {
    try {
      const eventId = codes[0].event_id;
      const eventResponse = await fetch(`/api/admin/events/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        if (eventData.event) {
          event = {
            id: eventId,
            name: eventData.event.name || eventData.event.school || 'Evento',
          };
        }
      }
    } catch (error) {
      console.error('Error fetching event info:', error);
    }
  }

  return { codes, event };
};

const publishCode = async (codeId: string): Promise<PublishResponse> => {
  const response = await fetch('/api/admin/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error publishing code');
  }

  return data;
};

const unpublishCode = async (codeId: string): Promise<PublishResponse> => {
  const response = await fetch('/api/admin/publish/unpublish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error unpublishing code');
  }

  return data;
};

const rotateToken = async (codeId: string): Promise<RotateResponse> => {
  const response = await fetch('/api/admin/publish/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codeId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error rotating token');
  }

  return data;
};

// Query keys
const publishQueryKeys = {
  all: ['publish'] as const,
  list: () => [...publishQueryKeys.all, 'list'] as const,
  code: (id: string) => [...publishQueryKeys.all, 'code', id] as const,
};

// Main hook
export function usePublishData() {
  const queryClient = useQueryClient();

  // Main data query with optimized caching
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: publishQueryKeys.list(),
    queryFn: fetchPublishList,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60 * 1000, // Refresh every minute
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Optimistic update helper
  const updateCodeOptimistically = useCallback(
    (codeId: string, updates: Partial<CodeRow>) => {
      queryClient.setQueryData(publishQueryKeys.list(), (old: any) => {
        if (!old) return old;

        return {
          ...old,
          codes: old.codes.map((code: CodeRow) =>
            code.id === codeId ? { ...code, ...updates } : code
          ),
        };
      });
    },
    [queryClient]
  );

  // Publish mutation with optimistic updates
  const publishMutation = useMutation({
    mutationFn: publishCode,
    onMutate: async (codeId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: publishQueryKeys.list() });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(publishQueryKeys.list());

      // Optimistically update
      updateCodeOptimistically(codeId, { is_published: true });

      return { previousData };
    },
    onError: (error, codeId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(publishQueryKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: publishQueryKeys.list() });
    },
  });

  // Unpublish mutation with optimistic updates
  const unpublishMutation = useMutation({
    mutationFn: unpublishCode,
    onMutate: async (codeId) => {
      await queryClient.cancelQueries({ queryKey: publishQueryKeys.list() });
      const previousData = queryClient.getQueryData(publishQueryKeys.list());
      updateCodeOptimistically(codeId, { is_published: false, token: null });
      return { previousData };
    },
    onError: (error, codeId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(publishQueryKeys.list(), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publishQueryKeys.list() });
    },
  });

  // Rotate token mutation with optimistic updates
  const rotateMutation = useMutation({
    mutationFn: rotateToken,
    onMutate: async (codeId) => {
      await queryClient.cancelQueries({ queryKey: publishQueryKeys.list() });
      const previousData = queryClient.getQueryData(publishQueryKeys.list());
      // Don't optimistically update token since we don't know the new value
      return { previousData };
    },
    onError: (error, codeId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(publishQueryKeys.list(), context.previousData);
      }
    },
    onSuccess: (data, codeId) => {
      // Update with the new token
      if (data.newToken) {
        updateCodeOptimistically(codeId, { token: data.newToken });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: publishQueryKeys.list() });
    },
  });

  // Bulk operations
  const bulkPublish = useCallback(
    async (codeIds: string[]) => {
      const promises = codeIds.map((id) => publishMutation.mutateAsync(id));
      await Promise.allSettled(promises);
    },
    [publishMutation]
  );

  const bulkUnpublish = useCallback(
    async (codeIds: string[]) => {
      const promises = codeIds.map((id) => unpublishMutation.mutateAsync(id));
      await Promise.allSettled(promises);
    },
    [unpublishMutation]
  );

  // Manual cache invalidation
  const invalidateCache = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: publishQueryKeys.list() });
  }, [queryClient]);

  // Prefetch individual code data
  const prefetchCode = useCallback(
    (codeId: string) => {
      queryClient.prefetchQuery({
        queryKey: publishQueryKeys.code(codeId),
        queryFn: () => data?.codes.find((c) => c.id === codeId),
        staleTime: 30 * 1000,
      });
    },
    [queryClient, data]
  );

  return {
    // Data
    codes: data?.codes || [],
    event: data?.event || null,

    // Loading states
    isLoading,
    isRefetching,
    error,

    // Actions
    publish: publishMutation.mutate,
    unpublish: unpublishMutation.mutate,
    rotateToken: rotateMutation.mutate,
    refetch,

    // Bulk actions
    bulkPublish,
    bulkUnpublish,

    // Action states
    isPublishing: publishMutation.isPending,
    isUnpublishing: unpublishMutation.isPending,
    isRotating: rotateMutation.isPending,

    // Individual action states
    getIsPublishing: (codeId: string) =>
      publishMutation.isPending && publishMutation.variables === codeId,
    getIsUnpublishing: (codeId: string) =>
      unpublishMutation.isPending && unpublishMutation.variables === codeId,
    getIsRotating: (codeId: string) =>
      rotateMutation.isPending && rotateMutation.variables === codeId,

    // Cache management
    invalidateCache,
    prefetchCode,

    // Stats (computed)
    stats: {
      total: data?.codes.length || 0,
      published: data?.codes.filter((c) => c.is_published).length || 0,
      unpublished: data?.codes.filter((c) => !c.is_published).length || 0,
      totalPhotos: data?.codes.reduce((sum, c) => sum + c.photos_count, 0) || 0,
    },
  };
}

// Background sync hook for real-time updates
export function usePublishSync() {
  const queryClient = useQueryClient();

  const syncData = useCallback(async () => {
    try {
      const data = await fetchPublishList();
      queryClient.setQueryData(publishQueryKeys.list(), data);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }, [queryClient]);

  // You could implement WebSocket or SSE sync here
  // useEffect(() => {
  //   const interval = setInterval(syncData, 30000); // Sync every 30 seconds
  //   return () => clearInterval(interval);
  // }, [syncData]);

  return { syncData };
}

// Error boundary integration
export function usePublishErrorHandler() {
  const queryClient = useQueryClient();

  const handleError = useCallback(
    (error: Error, context?: any) => {
      console.error('Publish operation error:', error);

      // You can integrate with your notification system here
      // showErrorNotification('Error en publicación', error.message);

      // Clear error state after showing notification
      queryClient.resetQueries({ queryKey: publishQueryKeys.all });
    },
    [queryClient]
  );

  return { handleError };
}
