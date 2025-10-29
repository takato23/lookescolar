/**
 * Custom hook for managing photo queries and mutations
 * Extracted from PhotoAdmin.tsx for better organization and reusability
 */

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useMemo } from 'react';
import type { OptimizedAsset } from '@/components/admin/photo-admin';
import { photoAdminApi } from '@/components/admin/photo-admin';

interface UsePhotosParams {
  selectedEventId: string | null;
  selectedFolderId: string | null;
  debouncedSearchTerm: string;
  includeSubfolders: boolean;
  statusFilter: 'all' | 'ready' | 'processing' | 'pending' | 'error';
  minSizeMB: string;
  maxSizeMB: string;
  startDate: string;
  endDate: string;
  pageSize: 25 | 50 | 100;
}

export function usePhotos({
  selectedEventId,
  selectedFolderId,
  debouncedSearchTerm,
  includeSubfolders,
  statusFilter,
  minSizeMB,
  maxSizeMB,
  startDate,
  endDate,
  pageSize,
}: UsePhotosParams) {
  const queryClient = useQueryClient();

  // Infinite assets query with proper pagination
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
    isError: assetsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    error: assetsQueryError,
  } = useInfiniteQuery<{ assets: OptimizedAsset[]; count: number; hasMore: boolean }>({
    queryKey: [
      'optimized-assets',
      selectedEventId,
      selectedFolderId,
      debouncedSearchTerm,
      includeSubfolders,
      statusFilter,
      minSizeMB,
      maxSizeMB,
      startDate,
      endDate,
      'all', // fileTypeFilter removed
      pageSize,
    ],
    queryFn: ({ pageParam = 0 }) => {
      // Use event endpoint when eventId is present (for dashboard consistency)
      if (selectedEventId && !selectedFolderId) {
        return photoAdminApi.assets
          .listByEvent(selectedEventId, {
            offset: pageParam as number,
            limit: pageSize,
            includeSignedUrls: true,
          })
          .then((result) => ({
            assets: result.photos.map((photo) => ({
              id: photo.id,
              filename: photo.filename,
              preview_path: photo.preview_path,
              file_size: photo.file_size,
              created_at: photo.created_at,
              status: photo.status,
            })) as OptimizedAsset[],
            count: result.count,
            hasMore: result.hasMore,
          }));
      }

      if (!selectedFolderId) {
        return Promise.resolve({ assets: [], count: 0, hasMore: false });
      }
      const q = debouncedSearchTerm?.trim();
      const minBytes = (() => {
        const n = parseFloat(minSizeMB);
        return Number.isFinite(n) && n > 0
          ? Math.floor(n * 1024 * 1024)
          : undefined;
      })();
      const maxBytes = (() => {
        const n = parseFloat(maxSizeMB);
        return Number.isFinite(n) && n > 0
          ? Math.floor(n * 1024 * 1024)
          : undefined;
      })();
      const startIso = startDate
        ? new Date(`${startDate}T00:00:00.000Z`).toISOString()
        : undefined;
      const endIso = endDate
        ? new Date(`${endDate}T23:59:59.999Z`).toISOString()
        : undefined;
      return photoAdminApi.assets.list(selectedFolderId, {
        offset: pageParam as number,
        limit: pageSize,
        q: q && q.length >= 2 ? q : undefined,
        include_children: includeSubfolders,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        min_size: minBytes,
        max_size: maxBytes,
        start_date: startIso,
        end_date: endIso,
      });
    },
    getNextPageParam: (lastPage, pages) => {
      const currentTotal = pages.reduce(
        (sum, page) => sum + page.assets.length,
        0
      );
      if (process.env.NEXT_PUBLIC_PAGINATION_DEBUG === '1') {
        console.debug('Pagination debug:', {
          hasMore: lastPage.hasMore,
          lastPageAssets: lastPage.assets.length,
          currentTotal,
          totalCount: lastPage.count,
          nextOffset: lastPage.hasMore ? currentTotal : undefined,
        });
      }
      if (!lastPage.hasMore) return undefined;
      return currentTotal;
    },
    enabled: !!selectedFolderId,
    staleTime: 2 * 60 * 1000, // 2 minutes - assets change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
    initialPageParam: 0,
  });

  // Flatten assets from infinite query
  const assets = useMemo(
    () => assetsData?.pages.flatMap((page) => page.assets) || [],
    [assetsData]
  );

  const totalAssetsCount = assetsData?.pages[0]?.count || 0;

  // Move assets mutation
  const moveAssetsMutation = useMutation({
    mutationFn: ({
      assetIds,
      targetFolderId,
    }: {
      assetIds: string[];
      targetFolderId: string;
    }) => photoAdminApi.assets.move(assetIds, targetFolderId),
    onSuccess: (result: any, variables) => {
      // Invalidar todas las queries relevantes después de mover fotos
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['optimized-folders'],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['optimized-assets', selectedFolderId],
          refetchType: 'active',
        }),
        variables.targetFolderId !== selectedFolderId
          ? queryClient.invalidateQueries({
              queryKey: ['optimized-assets', variables.targetFolderId],
              refetchType: 'active',
            })
          : Promise.resolve(),
      ]);

      toast.success(
        `${result.moved_count || variables.assetIds.length} fotos movidas exitosamente`
      );
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets', selectedFolderId],
      });
      toast.error(`Error al mover fotos: ${error.message}`);
    },
  });

  // Delete assets mutation
  const deleteAssetsMutation = useMutation({
    mutationFn: photoAdminApi.assets.delete,
    onSuccess: (result: any) => {
      // Invalidar todas las queries relevantes después de eliminar fotos
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['optimized-folders'],
          refetchType: 'active',
        }),
        queryClient.invalidateQueries({
          queryKey: ['optimized-assets', selectedFolderId],
          refetchType: 'active',
        }),
      ]);

      toast.success(
        `${result.deleted_count || 0} fotos eliminadas exitosamente`
      );
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({
        queryKey: ['optimized-assets', selectedFolderId],
      });
      toast.error(`Error al eliminar fotos: ${error.message}`);
    },
  });

  return {
    // Query state
    assets,
    totalAssetsCount,
    isLoadingAssets,
    assetsError,
    assetsQueryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    // Mutations
    moveAssetsMutation,
    deleteAssetsMutation,
  };
}

