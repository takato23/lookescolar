'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Icons
import {
  Search,
  Grid3X3,
  List,
  Filter,
  Upload,
  Download,
  Trash2,
  Star,
  Eye,
  EyeOff,
  FolderOpen,
  Folder,
  Image as ImageIcon,
  CheckSquare,
  Square,
  MoreVertical,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Calendar,
  User,
  Tag,
  Settings,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  ChevronRight,
  Home,
  School,
  BookOpen,
  Users,
} from 'lucide-react';

// Types
interface Photo {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_url?: string;
  thumbnail_url?: string;
  file_size: number;
  width?: number;
  height?: number;
  created_at: string;
  updated_at: string;
  approved: boolean;
  tagged: boolean;
  event_id?: string;
  folder_id?: string;
  event?: {
    id: string;
    name: string;
  };
  folder?: {
    id: string;
    name: string;
  };
  students?: Array<{
    id: string;
    name: string;
  }>;
  metadata?: {
    camera?: string;
    iso?: number;
    aperture?: string;
    shutter_speed?: string;
  };
}

interface PhotoFilter {
  search: string;
  event_id?: string;
  folder_id?: string;
  student_id?: string;
  approved?: boolean;
  tagged?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by: 'created_at' | 'filename' | 'file_size' | 'updated_at';
  sort_order: 'asc' | 'desc';
  view_mode: 'grid' | 'list' | 'masonry';
  grid_size: 'small' | 'medium' | 'large';
}

interface Event {
  id: string;
  name: string;
  school?: string;
  date: string;
  photo_count: number;
  status: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id?: string;
  event_id: string;
  photo_count: number;
  children?: Folder[];
}

// Performance Configuration optimized for massive scale
const PERFORMANCE_CONFIG = {
  GRID_ITEM_HEIGHT: 200,
  GRID_ITEM_WIDTH: 180,
  GRID_GAP: 12,
  OVERSCAN_COUNT: 3,
  BATCH_SIZE: 100, // Increased for better performance with massive datasets
  DEBOUNCE_DELAY: 200, // Reduced for better responsiveness
  CACHE_SIZE: 1000, // Increased cache for better user experience
  MAX_CONCURRENT_REQUESTS: 3, // Limit concurrent API requests
  PRELOAD_PAGES: 2, // Number of pages to preload ahead
  VIRTUAL_BUFFER_SIZE: 500, // Virtual scroll buffer size
  THUMBNAIL_SIZES: {
    small: 150,
    medium: 300,
    large: 600,
  },
};

// Custom hooks for data management
const useInfinitePhotos = (filter: PhotoFilter) => {
  return useInfiniteQuery({
    queryKey: ['photos', 'infinite', filter],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: PERFORMANCE_CONFIG.BATCH_SIZE.toString(),
        sort_by: filter.sort_by,
        sort_order: filter.sort_order,
      });

      // Add filter parameters
      if (filter.search) params.set('search', filter.search);
      if (filter.event_id) params.set('event_id', filter.event_id);
      if (filter.folder_id) params.set('folder_id', filter.folder_id);
      if (filter.student_id) params.set('student_id', filter.student_id);
      if (filter.approved !== undefined)
        params.set('approved', filter.approved.toString());
      if (filter.tagged !== undefined)
        params.set('tagged', filter.tagged.toString());
      if (filter.date_from) params.set('date_from', filter.date_from);
      if (filter.date_to) params.set('date_to', filter.date_to);

      const response = await fetch(`/api/admin/photos/unified?${params}`);
      if (!response.ok) throw new Error('Failed to fetch photos');

      const data = await response.json();
      return {
        photos: data.photos || [],
        nextPage: data.hasMore ? pageParam + 1 : undefined,
        hasMore: data.hasMore || false,
        total: data.total || 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  });
};

const useEvents = () => {
  return useQuery({
    queryKey: ['events', 'all'],
    queryFn: async () => {
      const response = await fetch('/api/admin/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      return data.events || data.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

const useFolders = (eventId?: string) => {
  return useQuery({
    queryKey: ['folders', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const response = await fetch(`/api/admin/events/${eventId}/folders`);
      if (!response.ok) throw new Error('Failed to fetch folders');
      const data = await response.json();
      return data.folders || [];
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });
};

// Responsive columns calculation
const useResponsiveColumns = (
  containerWidth: number,
  itemWidth: number,
  gap: number
) => {
  return useMemo(() => {
    if (containerWidth <= 0) return 1;
    return Math.max(1, Math.floor((containerWidth + gap) / (itemWidth + gap)));
  }, [containerWidth, itemWidth, gap]);
};

// Debounced search hook
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Main Component
interface UnifiedPhotoSystemProps {
  className?: string;
  initialFilter?: Partial<PhotoFilter>;
  enableUpload?: boolean;
  enableBulkOperations?: boolean;
}

export function UnifiedPhotoSystem({
  className,
  initialFilter = {},
  enableUpload = true,
  enableBulkOperations = true,
}: UnifiedPhotoSystemProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [filter, setFilter] = useState<PhotoFilter>({
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    view_mode: 'grid',
    grid_size: 'medium',
    ...initialFilter,
  });

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Debounce search
  const debouncedFilter = useDebounce(
    filter,
    PERFORMANCE_CONFIG.DEBOUNCE_DELAY
  );

  // Data hooks
  const {
    data: photosData,
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfinitePhotos(debouncedFilter);

  const { data: events = [] } = useEvents();
  const { data: folders = [] } = useFolders(filter.event_id);

  // Flatten photos from all pages
  const photos = useMemo(() => {
    return photosData?.pages?.flatMap((page) => page.photos) || [];
  }, [photosData]);

  const totalPhotos = useMemo(() => {
    return photosData?.pages?.[0]?.total || 0;
  }, [photosData]);

  // Container ref for virtualization
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate responsive columns
  const itemWidth =
    PERFORMANCE_CONFIG.THUMBNAIL_SIZES[filter.grid_size] ||
    PERFORMANCE_CONFIG.THUMBNAIL_SIZES.medium;
  const columns = useResponsiveColumns(
    containerWidth,
    itemWidth,
    PERFORMANCE_CONFIG.GRID_GAP
  );

  // Resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Virtualization for grid view
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(photos.length / columns),
    getScrollElement: () => containerRef.current,
    estimateSize: () => itemWidth + PERFORMANCE_CONFIG.GRID_GAP,
    overscan: PERFORMANCE_CONFIG.OVERSCAN_COUNT,
  });

  // Event handlers
  const handleFilterChange = useCallback((updates: Partial<PhotoFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
    setSelection(new Set()); // Clear selection on filter change
  }, []);

  const handlePhotoSelect = useCallback(
    (photoId: string, selected: boolean) => {
      setSelection((prev) => {
        const newSelection = new Set(prev);
        if (selected) {
          newSelection.add(photoId);
        } else {
          newSelection.delete(photoId);
        }
        return newSelection;
      });
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    const allIds = photos.map((p) => p.id);
    setSelection(new Set(allIds));
  }, [photos]);

  const handleClearSelection = useCallback(() => {
    setSelection(new Set());
  }, []);

  const handleBulkAction = useCallback(
    async (action: string) => {
      if (selection.size === 0) {
        toast.warning('No photos selected');
        return;
      }

      try {
        const response = await fetch('/api/admin/photos/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            photoIds: Array.from(selection),
            filter: debouncedFilter,
          }),
        });

        if (!response.ok) throw new Error('Bulk action failed');

        toast.success(`${action} applied to ${selection.size} photos`);
        setSelection(new Set());

        // Refetch data
        // queryClient.invalidateQueries(['photos']);
      } catch (error) {
        console.error('Bulk action error:', error);
        toast.error(`Failed to ${action} photos`);
      }
    },
    [selection, debouncedFilter]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            handleSelectAll();
            break;
          case 'f':
            e.preventDefault();
            setShowFilters((prev) => !prev);
            break;
          case 'u':
            if (enableUpload) {
              e.preventDefault();
              setShowUpload((prev) => !prev);
            }
            break;
        }
      }

      if (e.key === 'Escape') {
        setPreviewPhoto(null);
        setShowUpload(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [handleSelectAll, enableUpload]);

  // Auto-load more when scrolling
  useEffect(() => {
    if (!containerRef.current || !hasNextPage || isFetchingNextPage) return;

    const container = containerRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        fetchNextPage();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Card className="max-w-md p-6 text-center">
          <RefreshCw className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold">Error Loading Photos</h3>
          <p className="mb-4 text-sm text-gray-600">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('unified-photo-system flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Photos</h1>
            {totalPhotos > 0 && (
              <Badge variant="secondary">
                {totalPhotos.toLocaleString()} photos
              </Badge>
            )}
            {selection.size > 0 && (
              <Badge variant="default">{selection.size} selected</Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-md border">
              <Button
                variant={filter.view_mode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange({ view_mode: 'grid' })}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={filter.view_mode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleFilterChange({ view_mode: 'list' })}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Grid Size for Grid View */}
            {filter.view_mode === 'grid' && (
              <Select
                value={filter.grid_size}
                onValueChange={(value: 'small' | 'medium' | 'large') =>
                  handleFilterChange({ grid_size: value })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Upload Button */}
            {enableUpload && (
              <Button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search photos..."
              value={filter.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Event Filter */}
          <Select
            value={filter.event_id || 'all'}
            onValueChange={(value) =>
              handleFilterChange({
                event_id: value === 'all' ? undefined : value,
                folder_id: undefined, // Reset folder when changing event
              })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event: Event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Folder Filter (if event selected) */}
          {filter.event_id && folders.length > 0 && (
            <Select
              value={filter.folder_id || 'all'}
              onValueChange={(value) =>
                handleFilterChange({
                  folder_id: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Folders</SelectItem>
                {folders.map((folder: Folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Extended Filters Panel */}
        {showFilters && (
          <div className="mt-4 rounded-lg border bg-gray-50 p-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div>
                <Label>Sort By</Label>
                <Select
                  value={filter.sort_by}
                  onValueChange={(value: PhotoFilter['sort_by']) =>
                    handleFilterChange({ sort_by: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Created</SelectItem>
                    <SelectItem value="filename">Filename</SelectItem>
                    <SelectItem value="file_size">File Size</SelectItem>
                    <SelectItem value="updated_at">Last Modified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Order</Label>
                <Select
                  value={filter.sort_order}
                  onValueChange={(value: 'asc' | 'desc') =>
                    handleFilterChange({ sort_order: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">
                      <div className="flex items-center gap-2">
                        <ArrowDown className="h-4 w-4" />
                        Newest First
                      </div>
                    </SelectItem>
                    <SelectItem value="asc">
                      <div className="flex items-center gap-2">
                        <ArrowUp className="h-4 w-4" />
                        Oldest First
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="approved-filter"
                    checked={filter.approved === true}
                    onCheckedChange={(checked) =>
                      handleFilterChange({
                        approved: checked ? true : undefined,
                      })
                    }
                  />
                  <Label htmlFor="approved-filter" className="text-sm">
                    Approved Only
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="tagged-filter"
                    checked={filter.tagged === true}
                    onCheckedChange={(checked) =>
                      handleFilterChange({ tagged: checked ? true : undefined })
                    }
                  />
                  <Label htmlFor="tagged-filter" className="text-sm">
                    Tagged Only
                  </Label>
                </div>
              </div>

              <div>
                <Label>Actions</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFilter({
                        search: '',
                        sort_by: 'created_at',
                        sort_order: 'desc',
                        view_mode: filter.view_mode,
                        grid_size: filter.grid_size,
                      })
                    }
                  >
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selection Actions */}
      {enableBulkOperations && selection.size > 0 && (
        <div className="border-b bg-blue-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selection.size} photos selected
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                >
                  <EyeOff className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('download')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                Select All ({photos.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && photos.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Loading photos...</p>
            </div>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <ImageIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No photos found
              </h3>
              <p className="mb-6 text-gray-500">
                {filter.search || filter.event_id || filter.folder_id
                  ? 'Try adjusting your filters or search terms.'
                  : 'Upload some photos to get started.'}
              </p>
              {enableUpload && !filter.search && !filter.event_id && (
                <Button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Photos
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div ref={containerRef} className="h-full overflow-auto p-4">
            {filter.view_mode === 'grid' ? (
              <VirtualizedPhotoGrid
                photos={photos}
                columns={columns}
                itemWidth={itemWidth}
                selection={selection}
                onPhotoSelect={handlePhotoSelect}
                onPhotoPreview={setPreviewPhoto}
                virtualizer={rowVirtualizer}
              />
            ) : (
              <PhotoListView
                photos={photos}
                selection={selection}
                onPhotoSelect={handlePhotoSelect}
                onPhotoPreview={setPreviewPhoto}
              />
            )}

            {/* Load More Indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading more photos...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <PhotoPreviewModal
          photo={previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          onNext={() => {
            const currentIndex = photos.findIndex(
              (p) => p.id === previewPhoto.id
            );
            const nextPhoto = photos[currentIndex + 1];
            if (nextPhoto) setPreviewPhoto(nextPhoto);
          }}
          onPrevious={() => {
            const currentIndex = photos.findIndex(
              (p) => p.id === previewPhoto.id
            );
            const prevPhoto = photos[currentIndex - 1];
            if (prevPhoto) setPreviewPhoto(prevPhoto);
          }}
        />
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          eventId={filter.event_id}
          folderId={filter.folder_id}
        />
      )}
    </div>
  );
}

// Virtualized Photo Grid Component
function VirtualizedPhotoGrid({
  photos,
  columns,
  itemWidth,
  selection,
  onPhotoSelect,
  onPhotoPreview,
  virtualizer,
}: {
  photos: Photo[];
  columns: number;
  itemWidth: number;
  selection: Set<string>;
  onPhotoSelect: (id: string, selected: boolean) => void;
  onPhotoPreview: (photo: Photo) => void;
  virtualizer: any;
}) {
  const itemHeight = itemWidth + 60; // Add space for metadata

  return (
    <div
      style={{
        height: virtualizer.getTotalSize(),
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow: any) => {
        const rowPhotos = [];
        for (let col = 0; col < columns; col++) {
          const photoIndex = virtualRow.index * columns + col;
          if (photoIndex < photos.length) {
            rowPhotos.push(photos[photoIndex]);
          }
        }

        return (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: itemHeight,
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className="flex gap-3"
          >
            {rowPhotos.map((photo, colIndex) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                width={itemWidth}
                selected={selection.has(photo.id)}
                onSelect={(selected) => onPhotoSelect(photo.id, selected)}
                onPreview={() => onPhotoPreview(photo)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Photo List View Component
function PhotoListView({
  photos,
  selection,
  onPhotoSelect,
  onPhotoPreview,
}: {
  photos: Photo[];
  selection: Set<string>;
  onPhotoSelect: (id: string, selected: boolean) => void;
  onPhotoPreview: (photo: Photo) => void;
}) {
  return (
    <div className="space-y-2">
      {photos.map((photo) => (
        <PhotoListItem
          key={photo.id}
          photo={photo}
          selected={selection.has(photo.id)}
          onSelect={(selected) => onPhotoSelect(photo.id, selected)}
          onPreview={() => onPhotoPreview(photo)}
        />
      ))}
    </div>
  );
}

// Individual Photo Card Component
function PhotoCard({
  photo,
  width,
  selected,
  onSelect,
  onPreview,
}: {
  photo: Photo;
  width: number;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const thumbnailUrl = photo.thumbnail_url || photo.preview_url;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-200 hover:shadow-lg',
        selected && 'ring-2 ring-blue-500',
        'cursor-pointer'
      )}
      style={{ width }}
      onClick={onPreview}
    >
      {/* Selection Checkbox */}
      <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(!selected);
          }}
          className="rounded bg-black/50 p-1 text-white hover:bg-black/70"
        >
          {selected ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Status Badges */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {photo.approved && (
          <Badge className="bg-green-500/90 text-xs text-white">✓</Badge>
        )}
        {photo.tagged && (
          <Badge className="bg-blue-500/90 text-xs text-white">T</Badge>
        )}
      </div>

      {/* Image */}
      <div
        className="relative overflow-hidden bg-gray-100"
        style={{ height: width * 0.75 }} // 4:3 aspect ratio
      >
        {thumbnailUrl && !imageError ? (
          <img
            src={thumbnailUrl}
            alt={photo.original_filename}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-200',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
        )}

        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />

        {/* Quick Actions */}
        <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <CardContent className="p-3">
        <div className="space-y-1">
          <p className="truncate text-sm font-medium text-gray-900">
            {photo.original_filename}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{new Date(photo.created_at).toLocaleDateString()}</span>
            <span>{Math.round(photo.file_size / 1024)} KB</span>
          </div>
          {photo.event && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <School className="h-3 w-3" />
              <span className="truncate">{photo.event.name}</span>
            </div>
          )}
          {photo.students && photo.students.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              <span>{photo.students.length} student(s)</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Photo List Item Component
function PhotoListItem({
  photo,
  selected,
  onSelect,
  onPreview,
}: {
  photo: Photo;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onPreview: () => void;
}) {
  return (
    <Card
      className={cn(
        'flex items-center gap-4 p-4 transition-all hover:shadow-md',
        selected && 'bg-blue-50 ring-1 ring-blue-200'
      )}
    >
      {/* Selection */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(!selected);
        }}
        className="flex-shrink-0"
      >
        {selected ? (
          <CheckSquare className="h-5 w-5 text-blue-600" />
        ) : (
          <Square className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {/* Thumbnail */}
      <div
        className="h-16 w-16 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gray-100"
        onClick={onPreview}
      >
        {photo.thumbnail_url ? (
          <img
            src={photo.thumbnail_url}
            alt={photo.original_filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-gray-900">
              {photo.original_filename}
            </p>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
              <span>{new Date(photo.created_at).toLocaleDateString()}</span>
              <span>{Math.round(photo.file_size / 1024)} KB</span>
              {photo.width && photo.height && (
                <span>
                  {photo.width} × {photo.height}
                </span>
              )}
            </div>
            {photo.event && (
              <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                <School className="h-4 w-4" />
                <span>{photo.event.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {photo.approved && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                Approved
              </Badge>
            )}
            {photo.tagged && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Tagged
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Photo Preview Modal Component (Placeholder)
function PhotoPreviewModal({
  photo,
  onClose,
  onNext,
  onPrevious,
}: {
  photo: Photo;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative max-h-[90vh] max-w-[90vw]">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6 rotate-180" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>

        {/* Image */}
        <img
          src={photo.preview_url || photo.thumbnail_url}
          alt={photo.original_filename}
          className="max-h-full max-w-full object-contain"
        />

        {/* Metadata */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white">
          <h3 className="text-lg font-medium">{photo.original_filename}</h3>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span>{new Date(photo.created_at).toLocaleDateString()}</span>
            <span>{Math.round(photo.file_size / 1024)} KB</span>
            {photo.width && photo.height && (
              <span>
                {photo.width} × {photo.height}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload Modal Component (Placeholder)
function UploadModal({
  onClose,
  eventId,
  folderId,
}: {
  onClose: () => void;
  eventId?: string;
  folderId?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-lg font-semibold">Upload Photos</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardContent className="p-6">
          <div className="text-center">
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-600">
              Upload functionality will be implemented here
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Event: {eventId || 'None'} | Folder: {folderId || 'None'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Default export for backwards compatibility
export default UnifiedPhotoSystem;
