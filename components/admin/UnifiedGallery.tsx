'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons
import {
  Search,
  Grid3X3,
  List,
  Filter,
  Settings,
  RefreshCw,
  ChevronRight,
  Home,
  School,
  Users,
  BookOpen,
  User,
  Camera,
  Upload,
  Download,
  CheckSquare,
  Square,
  Layers,
  Folder,
  ArrowLeft,
  MoreHorizontal,
} from 'lucide-react';

// Types
interface HierarchyPath {
  event?: { id: string; name: string };
  level?: { id: string; name: string };
  course?: { id: string; name: string; isFolder: boolean };
  student?: { id: string; name: string };
}

interface HierarchyContext {
  path: HierarchyPath;
  photoCount: number;
  canUpload: boolean;
  canBulkEdit: boolean;
  breadcrumbs: Breadcrumb[];
}

interface Breadcrumb {
  label: string;
  path: HierarchyPath;
  icon: React.ElementType;
  isClickable: boolean;
}

interface Photo {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  width?: number;
  height?: number;
  event_id: string;
  event?: { id: string; name: string };
  subject?: { id: string; name: string };
}

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  photo_count: number;
  student_count: number;
  course_count: number;
}

interface Level {
  id: string;
  name: string;
  description?: string;
  course_count: number;
  student_count: number;
  photo_count: number;
}

interface Course {
  id: string;
  name: string;
  grade?: string;
  section?: string;
  level_id?: string;
  is_folder: boolean;
  parent_course_id?: string;
  student_count: number;
  photo_count: number;
}

interface Student {
  id: string;
  name: string;
  course_id: string;
  photo_count: number;
  grade?: string;
  section?: string;
}

interface UnifiedGalleryProps {
  mode: 'overview' | 'event' | 'level' | 'course' | 'student';
  eventId?: string;
  levelId?: string;
  courseId?: string;
  studentId?: string;
  initialPhotos?: Photo[];
  className?: string;
}

interface PhotoFilters {
  approved?: boolean;
  tagged?: boolean;
  search: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'created_at' | 'original_filename' | 'file_size';
  sortOrder: 'asc' | 'desc';
}

// Hook for hierarchy data
const useHierarchyData = (eventId?: string) => {
  return useQuery({
    queryKey: ['hierarchy', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const response = await fetch(`/api/admin/events/${eventId}/hierarchy`);
      if (!response.ok) throw new Error('Failed to fetch hierarchy');
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook for infinite photo loading
const useInfinitePhotos = (
  context: HierarchyContext,
  filters: PhotoFilters
) => {
  return useInfiniteQuery({
    queryKey: ['photos', context.path, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '50',
        sort_by: filters.sortBy,
        sort_order: filters.sortOrder,
      });

      if (filters.search) params.set('search', filters.search);
      if (filters.approved !== undefined)
        params.set('approved', filters.approved.toString());
      if (filters.tagged !== undefined)
        params.set('tagged', filters.tagged.toString());
      if (filters.dateFrom) params.set('date_from', filters.dateFrom);
      if (filters.dateTo) params.set('date_to', filters.dateTo);

      // Add hierarchy context to params
      if (context.path.event?.id) params.set('event_id', context.path.event.id);
      if (context.path.level?.id) params.set('level_id', context.path.level.id);
      if (context.path.course?.id)
        params.set('course_id', context.path.course.id);
      if (context.path.student?.id)
        params.set('student_id', context.path.student.id);

      const response = await fetch(`/api/admin/gallery/photos?${params}`);
      if (!response.ok) throw new Error('Failed to fetch photos');
      return response.json();
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextPage : undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export default function UnifiedGallery({
  mode,
  eventId,
  levelId,
  courseId,
  studentId,
  initialPhotos = [],
  className,
}: UnifiedGalleryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionMode, setBulkActionMode] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<PhotoFilters>({
    search: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Build current hierarchy context
  const hierarchyContext: HierarchyContext = useMemo(() => {
    const path: HierarchyPath = {};
    const breadcrumbs: Breadcrumb[] = [
      {
        label: 'Gallery',
        path: {},
        icon: Home,
        isClickable: true,
      },
    ];

    if (eventId) {
      path.event = { id: eventId, name: 'Event' }; // Will be populated from API
      breadcrumbs.push({
        label: path.event.name,
        path: { event: path.event },
        icon: School,
        isClickable: true,
      });
    }

    if (levelId) {
      path.level = { id: levelId, name: 'Level' };
      breadcrumbs.push({
        label: path.level.name,
        path: { ...path },
        icon: Layers,
        isClickable: true,
      });
    }

    if (courseId) {
      path.course = { id: courseId, name: 'Course', isFolder: false };
      breadcrumbs.push({
        label: path.course.name,
        path: { ...path },
        icon: path.course.isFolder ? Folder : BookOpen,
        isClickable: true,
      });
    }

    if (studentId) {
      path.student = { id: studentId, name: 'Student' };
      breadcrumbs.push({
        label: path.student.name,
        path: { ...path },
        icon: User,
        isClickable: false,
      });
    }

    return {
      path,
      photoCount: 0, // Will be populated from API
      canUpload: !!eventId,
      canBulkEdit: !!eventId,
      breadcrumbs,
    };
  }, [eventId, levelId, courseId, studentId]);

  // Load hierarchy data
  const { data: hierarchyData, isLoading: hierarchyLoading } =
    useHierarchyData(eventId);

  // Load photos with infinite scroll
  const {
    data: photosData,
    isLoading: photosLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePhotos(hierarchyContext, filters);

  // Flatten photos from all pages
  const photos = useMemo(() => {
    return photosData?.pages?.flatMap((page) => page.photos) || initialPhotos;
  }, [photosData, initialPhotos]);

  // Navigation handlers
  const handleNavigate = useCallback(
    (newPath: HierarchyPath) => {
      const params = new URLSearchParams();

      if (newPath.event?.id) params.set('eventId', newPath.event.id);
      if (newPath.level?.id) params.set('levelId', newPath.level.id);
      if (newPath.course?.id) params.set('courseId', newPath.course.id);
      if (newPath.student?.id) params.set('studentId', newPath.student.id);

      const url = `/admin/gallery${params.toString() ? `?${params}` : ''}`;
      router.push(url);
    },
    [router]
  );

  const handleBreadcrumbClick = useCallback(
    (breadcrumb: Breadcrumb) => {
      if (breadcrumb.isClickable) {
        handleNavigate(breadcrumb.path);
      }
    },
    [handleNavigate]
  );

  // Photo selection handlers
  const handlePhotoToggle = useCallback((photoId: string) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allPhotoIds = photos.map((p) => p.id);
    setSelectedPhotos(new Set(allPhotoIds));
  }, [photos]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback(
    (newFilters: Partial<PhotoFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  // Bulk action handlers
  const handleBulkAction = useCallback(
    async (action: string) => {
      if (selectedPhotos.size === 0) {
        toast.warning('No photos selected');
        return;
      }

      try {
        const response = await fetch('/api/admin/gallery/bulk-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            photoIds: Array.from(selectedPhotos),
            context: hierarchyContext,
          }),
        });

        if (!response.ok) {
          throw new Error('Bulk action failed');
        }

        const result = await response.json();
        toast.success(`${action} completed for ${selectedPhotos.size} photos`);

        // Clear selection and refetch
        setSelectedPhotos(new Set());
        // Could trigger refetch here
      } catch (error) {
        console.error('Bulk action error:', error);
        toast.error(`Failed to ${action} photos`);
      }
    },
    [selectedPhotos, hierarchyContext]
  );

  if (hierarchyLoading && !hierarchyData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">Loading gallery...</span>
      </div>
    );
  }

  return (
    <div className={cn('unified-gallery', className)}>
      {/* Header with Navigation */}
      <div className="gallery-header border-b border-border bg-white p-4">
        {/* Breadcrumbs */}
        <nav className="text-gray-500 dark:text-gray-400 mb-4 flex items-center text-sm">
          {hierarchyContext.breadcrumbs.map((crumb, index) => {
            const Icon = crumb.icon;
            return (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="mx-2 h-4 w-4" />}
                <button
                  onClick={() => handleBreadcrumbClick(crumb)}
                  disabled={!crumb.isClickable}
                  className={cn(
                    'hover:text-primary flex items-center gap-1 transition-colors',
                    !crumb.isClickable && 'cursor-default',
                    index === hierarchyContext.breadcrumbs.length - 1 &&
                      'text-foreground font-medium'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{crumb.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        {/* Controls */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          {/* Search and Filters */}
          <div className="flex flex-1 items-center gap-2">
            <div className="relative">
              <Search className="text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search photos..."
                value={filters.search}
                onChange={(e) => handleFilterChange({ search: e.target.value })}
                className="w-64 pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            {/* Upload Button */}
            {hierarchyContext.path.event?.id && (
              <Button
                onClick={() =>
                  router.push(
                    `/admin/events/${hierarchyContext.path.event!.id}/library`
                  )
                }
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Photos
              </Button>
            )}

            {/* Selection Controls */}
            {selectedPhotos.size > 0 && (
              <div className="mr-4 flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedPhotos.size} selected
                </Badge>
                <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                  Clear
                </Button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {/* Bulk Actions */}
            {selectedPhotos.size > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                >
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 rounded-lg bg-muted p-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Select
                value={filters.sortBy}
                onValueChange={(value: any) =>
                  handleFilterChange({ sortBy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="original_filename">Name</SelectItem>
                  <SelectItem value="file_size">Size</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.sortOrder}
                onValueChange={(value: any) =>
                  handleFilterChange({ sortOrder: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Newest first</SelectItem>
                  <SelectItem value="asc">Oldest first</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.approved?.toString() ?? 'all'}
                onValueChange={(value) =>
                  handleFilterChange({
                    approved: value === 'all' ? undefined : value === 'true',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Approval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Approved</SelectItem>
                  <SelectItem value="false">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.tagged?.toString() ?? 'all'}
                onValueChange={(value) =>
                  handleFilterChange({
                    tagged: value === 'all' ? undefined : value === 'true',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tagging" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Tagged</SelectItem>
                  <SelectItem value="false">Untagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="gallery-content p-4">
        {mode === 'overview' ? (
          <OverviewContent
            eventId={eventId}
            hierarchyData={hierarchyData}
            onNavigate={handleNavigate}
          />
        ) : (
          <PhotoGridContent
            photos={photos}
            viewMode={viewMode}
            selectedPhotos={selectedPhotos}
            onPhotoToggle={handlePhotoToggle}
            onSelectAll={handleSelectAll}
            isLoading={photosLoading}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            isFetchingNextPage={isFetchingNextPage}
          />
        )}
      </div>
    </div>
  );
}

// Overview Content Component
function OverviewContent({
  eventId,
  hierarchyData,
  onNavigate,
}: {
  eventId?: string;
  hierarchyData: any;
  onNavigate: (path: HierarchyPath) => void;
}) {
  if (!eventId) {
    // Show all events overview
    return (
      <div>
        <h2 className="mb-4 text-2xl font-bold">All Events</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Event cards would go here */}
        </div>
      </div>
    );
  }

  // Show event hierarchy overview
  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Event Overview</h2>
      {hierarchyData?.levels && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hierarchyData.levels.map((level: Level) => (
            <Card
              key={level.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() =>
                onNavigate({ event: { id: eventId, name: 'Event' }, level })
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {level.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Courses:</span>
                    <span className="font-medium">{level.course_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Students:</span>
                    <span className="font-medium">{level.student_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Photos:</span>
                    <span className="font-medium">{level.photo_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Photo Grid Content Component
function PhotoGridContent({
  photos,
  viewMode,
  selectedPhotos,
  onPhotoToggle,
  onSelectAll,
  isLoading,
  hasNextPage,
  onLoadMore,
  isFetchingNextPage,
}: {
  photos: Photo[];
  viewMode: 'grid' | 'list';
  selectedPhotos: Set<string>;
  onPhotoToggle: (id: string) => void;
  onSelectAll: () => void;
  isLoading: boolean;
  hasNextPage?: boolean;
  onLoadMore: () => void;
  isFetchingNextPage: boolean;
}) {
  if (isLoading && photos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">Loading photos...</span>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-16 text-center">
        <Camera className="mx-auto mb-4 h-16 w-16 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-foreground">
          No photos found
        </h3>
        <p className="mb-4 text-gray-500">
          Upload some photos to get started with this event.
        </p>
        {hierarchyContext.path.event?.id && (
          <Button
            onClick={() =>
              router.push(
                `/admin/events/${hierarchyContext.path.event!.id}/library`
              )
            }
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Go to Photo Library
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Selection Header */}
      {photos.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectAll}
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Select All ({photos.length})
            </Button>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {photos.length} photos
          </p>
        </div>
      )}

      {/* Photo Grid */}
      <div
        className={cn(
          'photo-grid',
          viewMode === 'grid' &&
            'grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
          viewMode === 'list' && 'space-y-2'
        )}
      >
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            onToggle={() => onPhotoToggle(photo.id)}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Load More */}
      {hasNextPage && (
        <div className="mt-8 text-center">
          <Button
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            variant="outline"
          >
            {isFetchingNextPage ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Photo Card Component
function PhotoCard({
  photo,
  isSelected,
  onToggle,
  viewMode,
}: {
  photo: Photo;
  isSelected: boolean;
  onToggle: () => void;
  viewMode: 'grid' | 'list';
}) {
  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'flex items-center gap-4 rounded-lg border p-3 transition-colors',
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-border'
        )}
      >
        <button onClick={onToggle} className="flex-shrink-0">
          {isSelected ? (
            <CheckSquare className="text-primary h-5 w-5" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
        </button>

        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
          {photo.preview_url ? (
            <img
              src={photo.preview_url}
              alt={photo.original_filename}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Camera className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{photo.original_filename}</p>
          <div className="text-gray-500 dark:text-gray-400 flex items-center gap-4 text-sm">
            <span>{new Date(photo.created_at).toLocaleDateString()}</span>
            <span>{Math.round(photo.file_size / 1024)} KB</span>
            {photo.approved && <Badge variant="secondary">Approved</Badge>}
            {photo.tagged && <Badge variant="secondary">Tagged</Badge>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'photo-card group relative cursor-pointer overflow-hidden rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary ring-primary/20 ring-2'
          : 'border-border hover:border-border'
      )}
    >
      {/* Selection Checkbox */}
      <button
        onClick={onToggle}
        className="absolute left-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100"
      >
        {isSelected ? (
          <CheckSquare className="text-primary h-5 w-5 rounded bg-white" />
        ) : (
          <Square className="h-5 w-5 rounded bg-black/50 text-white" />
        )}
      </button>

      {/* Status Badges */}
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        {photo.approved && (
          <Badge className="bg-green-500/90 text-white">✓</Badge>
        )}
        {photo.tagged && <Badge className="bg-blue-500/90 text-white">T</Badge>}
      </div>

      {/* Image */}
      <div className="aspect-square bg-muted">
        {photo.preview_url ? (
          <img
            src={photo.preview_url}
            alt={photo.original_filename}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Camera className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <p className="truncate text-xs font-medium">
          {photo.original_filename}
        </p>
        <p className="text-xs opacity-75">
          {Math.round(photo.file_size / 1024)} KB
        </p>
      </div>
    </div>
  );
}
