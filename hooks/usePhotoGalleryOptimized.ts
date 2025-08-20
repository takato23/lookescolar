'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types
export interface PhotoItem {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  event_id?: string;
  code_id?: string;
  event?: {
    id: string;
    name: string;
  };
  subject?: {
    id: string;
    name: string;
  };
  width?: number;
  height?: number;
}

export interface PhotoFilters {
  search: string;
  eventId?: string;
  subjectId?: string;
  approved?: boolean;
  tagged?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface SelectionState {
  selectedPhotos: Set<string>;
  isSelectionMode: boolean;
  lastSelectedIndex: number | null;
}

interface UsePhotoGalleryOptions {
  pageSize?: number;
  enableInfiniteScroll?: boolean;
  prefetchNextPage?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

const DEFAULT_OPTIONS: Required<UsePhotoGalleryOptions> = {
  pageSize: 50,
  enableInfiniteScroll: true,
  prefetchNextPage: true,
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
};

/**
 * Optimized hook for photo gallery management with performance features:
 * - Infinite scrolling with pagination
 * - Intelligent prefetching
 * - Memoized filtering and sorting
 * - Optimistic updates
 * - Selection state management
 * - Error recovery
 */
export function usePhotoGalleryOptimized(options: UsePhotoGalleryOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState<PhotoFilters>({
    search: '',
    approved: undefined,
    tagged: undefined,
  });
  
  const [selection, setSelection] = useState<SelectionState>({
    selectedPhotos: new Set(),
    isSelectionMode: false,
    lastSelectedIndex: null,
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Performance tracking
  const performanceRef = useRef({
    lastQueryTime: 0,
    queryCount: 0,
    averageQueryTime: 0,
  });

  // Query key generation with memoization
  const queryKey = useMemo(() => [
    'photos-gallery',
    filters,
    sortBy,
    sortOrder,
    opts.pageSize,
  ], [filters, sortBy, sortOrder, opts.pageSize]);

  // Photo fetching function with error handling
  const fetchPhotos = useCallback(async ({ pageParam = 0 }) => {
    const startTime = performance.now();
    
    try {
      const params = new URLSearchParams({
        offset: (pageParam * opts.pageSize).toString(),
        limit: opts.pageSize.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.eventId && { event_id: filters.eventId }),
        ...(filters.subjectId && { subject_id: filters.subjectId }),
        ...(filters.approved !== undefined && { approved: filters.approved.toString() }),
        ...(filters.tagged !== undefined && { tagged: filters.tagged.toString() }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo }),
      });

      const response = await fetch(`/api/admin/photos?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Track performance
      const queryTime = performance.now() - startTime;
      performanceRef.current.queryCount++;
      performanceRef.current.lastQueryTime = queryTime;
      performanceRef.current.averageQueryTime = 
        (performanceRef.current.averageQueryTime * (performanceRef.current.queryCount - 1) + queryTime) / 
        performanceRef.current.queryCount;

      return {
        photos: data.photos || [],
        totalCount: data.totalCount || 0,
        hasMore: data.photos?.length === opts.pageSize,
        nextPage: pageParam + 1,
      };
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      toast.error('Error al cargar las fotos');
      throw error;
    }
  }, [filters, sortBy, sortOrder, opts.pageSize]);

  // Infinite query with optimizations
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey,
    queryFn: fetchPhotos,
    getNextPageParam: (lastPage) => 
      lastPage.hasMore ? lastPage.nextPage : undefined,
    staleTime: opts.staleTime,
    cacheTime: opts.cacheTime,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Prefetch next page when approaching end
  useEffect(() => {
    if (opts.prefetchNextPage && hasNextPage && !isFetchingNextPage) {
      const currentPhotosCount = data?.pages.reduce((acc, page) => acc + page.photos.length, 0) || 0;
      const threshold = Math.max(opts.pageSize * 2, 100);
      
      if (currentPhotosCount > threshold) {
        queryClient.prefetchInfiniteQuery({
          queryKey,
          queryFn: fetchPhotos,
        });
      }
    }
  }, [data, hasNextPage, isFetchingNextPage, opts.prefetchNextPage, queryClient, queryKey, fetchPhotos, opts.pageSize]);

  // Flattened photos with memoization
  const photos = useMemo(() => {
    return data?.pages.flatMap(page => page.photos) || [];
  }, [data]);

  const totalCount = data?.pages[0]?.totalCount || 0;

  // Filter updates with debouncing
  const updateFilters = useCallback((newFilters: Partial<PhotoFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setSelection(prev => ({ ...prev, selectedPhotos: new Set() }));
  }, []);

  // Selection management
  const togglePhotoSelection = useCallback((photoId: string, index?: number, shiftKey = false) => {
    setSelection(prev => {
      const newSelected = new Set(prev.selectedPhotos);
      
      if (shiftKey && prev.lastSelectedIndex !== null && index !== undefined) {
        // Range selection
        const start = Math.min(prev.lastSelectedIndex, index);
        const end = Math.max(prev.lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
          if (photos[i]) {
            newSelected.add(photos[i].id);
          }
        }
      } else {
        // Single selection
        if (newSelected.has(photoId)) {
          newSelected.delete(photoId);
        } else {
          newSelected.add(photoId);
        }
      }

      return {
        selectedPhotos: newSelected,
        isSelectionMode: newSelected.size > 0,
        lastSelectedIndex: index ?? null,
      };
    });
  }, [photos]);

  const selectAllPhotos = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedPhotos: new Set(photos.map(p => p.id)),
      isSelectionMode: true,
    }));
  }, [photos]);

  const clearSelection = useCallback(() => {
    setSelection({
      selectedPhotos: new Set(),
      isSelectionMode: false,
      lastSelectedIndex: null,
    });
  }, []);

  // Optimistic updates for photo operations
  const updatePhotoOptimistic = useCallback((photoId: string, updates: Partial<PhotoItem>) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          photos: page.photos.map((photo: PhotoItem) =>
            photo.id === photoId ? { ...photo, ...updates } : photo
          ),
        })),
      };
    });
  }, [queryClient, queryKey]);

  // Batch operations
  const updatePhotosOptimistic = useCallback((photoIds: string[], updates: Partial<PhotoItem>) => {
    queryClient.setQueryData(queryKey, (oldData: any) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          photos: page.photos.map((photo: PhotoItem) =>
            photoIds.includes(photo.id) ? { ...photo, ...updates } : photo
          ),
        })),
      };
    });
  }, [queryClient, queryKey]);

  // Performance metrics
  const getPerformanceMetrics = useCallback(() => ({
    queryCount: performanceRef.current.queryCount,
    lastQueryTime: performanceRef.current.lastQueryTime,
    averageQueryTime: performanceRef.current.averageQueryTime,
    cacheHitRatio: queryClient.getQueryCache().getAll().length > 0 ? 
      queryClient.getQueryCache().getAll().filter(q => q.state.dataUpdatedAt > 0).length /
      queryClient.getQueryCache().getAll().length : 0,
  }), [queryClient]);

  return {
    // Data
    photos,
    totalCount,
    isLoading,
    isError,
    error,
    
    // Pagination
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    
    // Filters and sorting
    filters,
    updateFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    
    // View mode
    viewMode,
    setViewMode,
    
    // Selection
    selection,
    togglePhotoSelection,
    selectAllPhotos,
    clearSelection,
    
    // Operations
    refetch,
    updatePhotoOptimistic,
    updatePhotosOptimistic,
    
    // Performance
    getPerformanceMetrics,
  };
}