'use client';

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { FixedSizeGrid as Grid, areEqual } from 'react-window';
import {
  Folder,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Upload,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  SkeletonContentGrid,
  SkeletonHeaderStats,
} from './SkeletonPlaceholders';
import { featureFlags } from '@/lib/feature-flags';

// Fixed constants for consistent virtualization
const ITEM_HEIGHT = 200;
const MIN_ITEM_WIDTH = 180;
const OVERSCAN_COUNT = 3; // Items to render outside viewport
const CONCURRENCY_LIMIT = 6; // Max concurrent image loads

interface Folder {
  id: string;
  name: string;
  child_folder_count: number;
  photo_count: number;
  created_at: string;
}

interface Photo {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_path?: string;
  file_size: number;
  width: number;
  height: number;
  approved: boolean;
  processing_status: string;
  created_at: string;
  signed_url?: string;
}

interface GridItem {
  id: string;
  type: 'folder' | 'photo';
  data: Folder | Photo;
}

interface ContentGridPanelProps {
  eventId: string;
  currentFolderId: string | null;
  folders: Folder[];
  photos: Photo[];
  selectedItems: Set<string>;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalPhotos: number;
  onItemSelect: (
    itemId: string,
    itemType: 'folder' | 'photo',
    isCtrlKey?: boolean,
    isShiftKey?: boolean,
    itemIndex?: number
  ) => void;
  onFolderDoubleClick: (folderId: string) => void;
  onPhotoDoubleClick?: (photoId: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onShowUpload?: () => void;
  onPhotosMove?: (
    photoIds: string[],
    targetFolderId: string | null
  ) => Promise<void>;
  onFolderMove?: (
    folderId: string,
    targetFolderId: string | null
  ) => Promise<void>;
  onBulkSelect?: (itemIds: string[]) => void;
  onClearSelection?: () => void;
}

// Grid item component
interface GridItemComponentProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    items: GridItem[];
    columnCount: number;
    selectedItems: Set<string>;
    lastSelectedIndex: number | null;
    dragState: {
      isDragging: boolean;
      draggedItems: string[];
      dragOverFolder: string | null;
    };
    onItemSelect: (
      itemId: string,
      itemType: 'folder' | 'photo',
      isCtrlKey?: boolean,
      isShiftKey?: boolean,
      itemIndex?: number
    ) => void;
    onFolderDoubleClick: (folderId: string) => void;
    onPhotoDoubleClick: (photoId: string) => void;
    onDragStart: (
      e: React.DragEvent,
      itemId: string,
      itemType: 'folder' | 'photo'
    ) => void;
    onDragEnd: () => void;
    onDragOverFolder: (e: React.DragEvent, folderId: string) => void;
    onDragLeaveFolder: () => void;
    onDropOnFolder: (e: React.DragEvent, folderId: string) => void;
    preloadImages: (photoIds: string[]) => Promise<void>;
  };
}

// Memoized grid item component for better performance
const GridItemComponent = memo<GridItemComponentProps>(
  ({ columnIndex, rowIndex, style, data }) => {
    const {
      items,
      columnCount,
      selectedItems,
      lastSelectedIndex,
      dragState,
      onItemSelect,
      onFolderDoubleClick,
      onPhotoDoubleClick,
      onDragStart,
      onDragEnd,
      onDragOverFolder,
      onDragLeaveFolder,
      onDropOnFolder,
      preloadImages,
    } = data;

    const itemIndex = rowIndex * columnCount + columnIndex;
    const item = items[itemIndex];

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    // Preload adjacent images for better UX - ALWAYS call useEffect to maintain hook order
    // Stabilized to prevent infinite re-renders
    useEffect(() => {
      if (
        item?.type === 'photo' &&
        featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION &&
        item.id &&
        itemIndex !== undefined
      ) {
        const adjacentPhotos: string[] = [];
        // Get next 2 photos for preloading (reduced from 3 to 2 for performance)
        for (
          let i = itemIndex + 1;
          i < Math.min(itemIndex + 3, items.length);
          i++
        ) {
          const adjacentItem = items[i];
          if (adjacentItem?.type === 'photo' && adjacentItem.id) {
            adjacentPhotos.push(adjacentItem.id);
          }
        }

        if (adjacentPhotos.length > 0) {
          // Use setTimeout to debounce preload calls and prevent excessive re-renders
          const timeoutId = setTimeout(() => {
            preloadImages(adjacentPhotos);
          }, 100);

          return () => clearTimeout(timeoutId);
        }
      }
    }, [item?.id, item?.type, itemIndex, items.length]);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        if (!item) return; // Guard clause inside callback

        const isCtrlKey = e.ctrlKey || e.metaKey;
        const isShiftKey = e.shiftKey;

        // For folders: single click navigates, unless modifier keys are pressed for selection
        if (item.type === 'folder' && !isCtrlKey && !isShiftKey) {
          // Single click navigates into folder
          onFolderDoubleClick(item.id);
          return;
        }

        // For photos or when modifier keys are pressed, handle selection
        onItemSelect(item.id, item.type, isCtrlKey, isShiftKey, itemIndex);
      },
      [item, itemIndex, onItemSelect, onFolderDoubleClick]
    );

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        if (!item) return; // Guard clause inside callback

        // Prevent event bubbling to avoid conflicts with single click
        e.stopPropagation();

        if (item.type === 'photo' && onPhotoDoubleClick) {
          // Double click on photos opens them in detail view
          onPhotoDoubleClick(item.id);
        }
        // Note: For folders, we now use single click, so double click is not needed
      },
      [item, onPhotoDoubleClick]
    );

    const handleDragStart = useCallback(
      (e: React.DragEvent) => {
        if (!item) return; // Guard clause inside callback
        // Support multi-drag: if item is selected and multiple items are selected, drag all
        const isSelected = selectedItems.has(item.id);
        const dragData = {
          type: item.type,
          items:
            isSelected && selectedItems.size > 1
              ? Array.from(selectedItems)
              : [item.id],
        };
        e.dataTransfer.setData('application/json', JSON.stringify(dragData));
        onDragStart(e, item.id, item.type);
      },
      [item, selectedItems, onDragStart]
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (!item || item.type !== 'folder') return; // Guard clause inside callback
        e.preventDefault();
        onDragOverFolder(e, item.id);
      },
      [item, onDragOverFolder]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        if (!item || item.type !== 'folder') return; // Guard clause inside callback
        e.preventDefault();
        onDropOnFolder(e, item.id);
      },
      [item, onDropOnFolder]
    );

    // NOW safe to return early after all hooks are called
    if (!item) {
      return <div style={style} />;
    }

    const isSelected = selectedItems.has(item.id);
    const isDraggedItem = dragState.draggedItems.includes(item.id);
    const isDragOverFolder =
      item.type === 'folder' && dragState.dragOverFolder === item.id;

    return (
      <div style={{ ...style, height: ITEM_HEIGHT }} className="p-2">
        <div
          className={cn(
            'group relative h-full cursor-pointer rounded-lg border-2 transition-all',
            'hover:scale-[1.02] hover:shadow-md',
            isSelected
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300',
            isDraggedItem && 'opacity-50',
            isDragOverFolder && 'scale-105 border-green-500 bg-green-50'
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          draggable={featureFlags.EVENT_PHOTO_LIBRARY_DRAG_DROP}
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          onDragOver={item.type === 'folder' ? handleDragOver : undefined}
          onDragLeave={item.type === 'folder' ? onDragLeaveFolder : undefined}
          onDrop={item.type === 'folder' ? handleDrop : undefined}
        >
          {/* Selection checkbox */}
          <div className="absolute left-2 top-2 z-10">
            {isSelected ? (
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>

          {/* Content */}
          {item.type === 'folder' ? (
            <FolderItemContent folder={item.data as Folder} />
          ) : (
            <PhotoItemContent photo={item.data as Photo} />
          )}
        </div>
      </div>
    );
  },
  areEqual
);

GridItemComponent.displayName = 'GridItemComponent';

// Enhanced folder item with consistent layout
const FolderItemContent = memo<{ folder: Folder }>(({ folder }) => (
  <div className="flex h-full flex-col justify-between p-4">
    <div className="flex flex-1 items-center justify-center">
      <div className="text-center">
        <Folder className="mx-auto mb-2 h-12 w-12 text-blue-500" />
        {(folder.child_folder_count > 0 || folder.photo_count > 0) && (
          <div className="text-xs font-medium text-blue-600">
            {folder.child_folder_count + folder.photo_count} items
          </div>
        )}
      </div>
    </div>

    <div className="mt-2">
      <div
        className="truncate text-center text-sm font-medium text-gray-900"
        title={folder.name}
      >
        {folder.name}
      </div>

      <div className="mt-1 text-center text-xs text-gray-500">
        {folder.child_folder_count > 0 && (
          <span>
            {folder.child_folder_count} carpeta
            {folder.child_folder_count !== 1 ? 's' : ''}
          </span>
        )}
        {folder.child_folder_count > 0 && folder.photo_count > 0 && (
          <span>, </span>
        )}
        {folder.photo_count > 0 && (
          <span>
            {folder.photo_count} foto{folder.photo_count !== 1 ? 's' : ''}
          </span>
        )}
        {folder.child_folder_count === 0 && folder.photo_count === 0 && (
          <span>Vacía</span>
        )}
      </div>
    </div>
  </div>
));

FolderItemContent.displayName = 'FolderItemContent';

// Enhanced photo item with lazy loading optimization
const PhotoItemContent = memo<{ photo: Photo }>(({ photo }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoadAttempts((prev) => prev + 1);
    if (loadAttempts < 2) {
      // Retry loading once
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = photo.signed_url || '';
        }
      }, 1000);
    } else {
      setImageError(true);
    }
  }, [loadAttempts, photo.signed_url]);

  // Format file size for display
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Image area with fixed aspect ratio for virtualization */}
      <div
        className="relative flex-1 overflow-hidden rounded-t-lg bg-gray-100"
        style={{ aspectRatio: '4/3' }}
      >
        {(photo.signed_url || photo.preview_path || photo.storage_path) && !imageError ? (
          <>
            <Image
              ref={imgRef}
              src={
                photo.signed_url || 
                (photo.preview_path ? (() => {
                  // Prefer path-based resolver when we know exact preview_path
                  const rel = (photo.preview_path.includes('previews/')
                    ? photo.preview_path.split('previews/')[1]
                    : photo.preview_path
                  ).replace(/^\/+/, '');
                  return rel ? `/admin/previews/${rel}${cacheBust ? `?v=${cacheBust}` : ''}` : '';
                })() : 
                  photo.storage_path ? `/admin/previews/${photo.storage_path.split('/').pop()}${cacheBust ? `?v=${cacheBust}` : ''}` : 
                  photo.original_filename ? `/admin/previews/${photo.original_filename}${cacheBust ? `?v=${cacheBust}` : ''}` : '')
              }
              alt={photo.original_filename}
              fill
              unoptimized
              className={cn(
                'object-cover transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={handleLoad}
              onError={handleError}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={false}
              loading="lazy"
              quality={75} // Optimized quality for thumbnails
            />

            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            {imageError ? (
              <div className="text-center">
                <AlertCircle className="mx-auto mb-1 h-6 w-6 text-red-400" />
                <span className="text-xs text-red-600">Error</span>
              </div>
            ) : (
              <div className="text-center">
                <ImageIcon className="mx-auto mb-1 h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-500">Cargando...</span>
              </div>
            )}
          </div>
        )}

        {/* Status indicators */}
        <div className="absolute right-2 top-2 flex gap-1">
          {photo.processing_status !== 'completed' && (
            <div className="rounded bg-yellow-500 px-1.5 py-0.5 text-center text-xs text-white">
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          )}

          {photo.approved && (
            <div className="rounded-full bg-green-500 p-0.5 text-white">
              <CheckCircle2 className="h-3 w-3" />
            </div>
          )}
        </div>
      </div>

      {/* Photo info with consistent height */}
      <div className="rounded-b-lg bg-white p-2" style={{ height: '60px' }}>
        <div
          className="truncate text-xs font-medium text-gray-900"
          title={photo.original_filename}
        >
          {photo.original_filename}
        </div>

        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>
            {photo.width}×{photo.height}
          </span>
          <span>{formatFileSize(photo.file_size)}</span>
        </div>
      </div>
    </div>
  );
});

PhotoItemContent.displayName = 'PhotoItemContent';

// Main ContentGridPanel component
const ContentGridPanel = ({
  eventId,
  currentFolderId,
  folders,
  photos,
  selectedItems,
  loading,
  error,
  hasMore,
  totalPhotos,
  onItemSelect,
  onFolderDoubleClick,
  onPhotoDoubleClick,
  onLoadMore,
  onRefresh,
  onShowUpload,
  onPhotosMove,
  onFolderMove,
  onBulkSelect,
  onClearSelection,
}: ContentGridPanelProps) => {
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );
  // Cache-busting token for preview URLs when admin pulsa "Actualizar"
  const [cacheBust, setCacheBust] = useState(0);
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItems: [] as string[],
    dragOverFolder: null as string | null,
  });
  const [imageLoadQueue, setImageLoadQueue] = useState<Set<string>>(new Set());
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<any>(null);

  // Calculate responsive grid dimensions
  const gridWidth = gridRef.current?.clientWidth || 800;
  const itemWidth = Math.max(
    MIN_ITEM_WIDTH,
    Math.floor(gridWidth / Math.floor(gridWidth / MIN_ITEM_WIDTH))
  );
  const columnCount = Math.floor(gridWidth / itemWidth) || 1;
  const rowCount = Math.ceil((folders.length + photos.length) / columnCount);

  // Create grid items
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];

    // Add folders first
    folders.forEach((folder) => {
      items.push({
        id: folder.id,
        type: 'folder',
        data: folder,
      });
    });

    // Add photos
    photos.forEach((photo) => {
      items.push({
        id: photo.id,
        type: 'photo',
        data: photo,
      });
    });

    return items;
  }, [folders, photos]);

  // Enhanced image preloading with concurrency control - stabilized to prevent infinite re-renders
  const preloadImages = useCallback(
    async (photoIds: string[]) => {
      // Prefetch is optional; disabled by default to avoid duplicate network requests
      if (!featureFlags.EVENT_PHOTO_LIBRARY_PREFETCH) return;
      if (
        !featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION ||
        photoIds.length === 0
      )
        return;

      // Filter out already loading/loaded images to prevent unnecessary work
      const photosToLoad = photoIds.filter((id) => {
        const photo = photos.find((p) => p.id === id);
        return (
          photo?.signed_url && !loadingImages.has(id) && !imageLoadQueue.has(id)
        );
      });

      if (photosToLoad.length === 0) return;

      // Update queue state in a batch to minimize re-renders
      setImageLoadQueue((prev) => {
        const newQueue = new Set([...prev, ...photosToLoad]);
        return newQueue;
      });

      // Process images one by one with concurrency control
      for (const photoId of photosToLoad) {
        if (loadingImages.size >= CONCURRENCY_LIMIT) break;

        try {
          const photo = photos.find((p) => p.id === photoId);
          if (photo?.signed_url) {
            setLoadingImages((prev) => new Set([...prev, photoId]));

            const img = new window.Image();
            img.src = photo.signed_url;

            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              // Add timeout to prevent hanging
              setTimeout(reject, 5000);
            });
          }
        } catch (error) {
          // Silently handle preload errors to avoid console spam
          if (featureFlags.DEBUG_MIGRATION) {
            console.warn(`Failed to preload image ${photoId}:`, error);
          }
        } finally {
          // Clean up loading state
          setLoadingImages((prev) => {
            const next = new Set(prev);
            next.delete(photoId);
            return next;
          });
          setImageLoadQueue((prev) => {
            const next = new Set(prev);
            next.delete(photoId);
            return next;
          });
        }
      }
    },
    [photos]
  );

  // Create grid items with stable ordering (folders first, then photos)
  const allGridItems = useMemo(() => {
    const items: GridItem[] = [];

    // Add folders first (always)
    folders.forEach((folder) => {
      items.push({
        id: folder.id,
        type: 'folder',
        data: folder,
      });
    });

    // Add photos
    photos.forEach((photo) => {
      items.push({
        id: photo.id,
        type: 'photo',
        data: photo,
      });
    });

    return items;
  }, [folders, photos]);

  // Enhanced item selection with stable ID-based range selection
  const handleItemSelect = useCallback(
    (
      itemId: string,
      itemType: 'folder' | 'photo',
      isCtrlKey = false,
      isShiftKey = false,
      itemIndex?: number
    ) => {
      if (isShiftKey && lastSelectedIndex !== null && itemIndex !== undefined) {
        // Range selection using stable indices
        const startIndex = Math.min(lastSelectedIndex, itemIndex);
        const endIndex = Math.max(lastSelectedIndex, itemIndex);
        const rangeItems = allGridItems
          .slice(startIndex, endIndex + 1)
          .map((item) => item.id);

        if (onBulkSelect) {
          onBulkSelect(rangeItems);
        }
      } else {
        onItemSelect(itemId, itemType, isCtrlKey, isShiftKey, itemIndex);
      }

      if (itemIndex !== undefined) {
        setLastSelectedIndex(itemIndex);
      }
    },
    [lastSelectedIndex, allGridItems, onBulkSelect, onItemSelect]
  );

  // Enhanced drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, itemId: string, itemType: 'folder' | 'photo') => {
      if (!featureFlags.EVENT_PHOTO_LIBRARY_DRAG_DROP) return;

      const draggedItems =
        selectedItems.has(itemId) && selectedItems.size > 1
          ? Array.from(selectedItems)
          : [itemId];

      const dragData = {
        type: itemType,
        items: draggedItems,
        source: 'grid',
      };

      e.dataTransfer.setData('application/json', JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = 'move';

      setDragState((prev) => ({
        ...prev,
        isDragging: true,
        draggedItems,
      }));
    },
    [selectedItems]
  );

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItems: [],
      dragOverFolder: null,
    });
  }, []);

  const handleDragOverFolder = useCallback(
    (e: React.DragEvent, folderId: string) => {
      if (!featureFlags.EVENT_PHOTO_LIBRARY_DRAG_DROP) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      setDragState((prev) => ({
        ...prev,
        dragOverFolder: folderId,
      }));
    },
    []
  );

  const handleDragLeaveFolder = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      dragOverFolder: null,
    }));
  }, []);

  const handleDropOnFolder = useCallback(
    async (e: React.DragEvent, folderId: string) => {
      if (!featureFlags.EVENT_PHOTO_LIBRARY_DRAG_DROP) return;

      e.preventDefault();

      try {
        const dataString = e.dataTransfer.getData('application/json');
        const dragData = JSON.parse(dataString);

        if (dragData.type === 'photo' && onPhotosMove) {
          await onPhotosMove(dragData.items, folderId);
        } else if (dragData.type === 'folder' && onFolderMove) {
          // Only move the first folder to avoid conflicts
          await onFolderMove(dragData.items[0], folderId);
        }
      } catch (error) {
        console.error('Error processing drop:', error);
      }

      setDragState({
        isDragging: false,
        draggedItems: [],
        dragOverFolder: null,
      });
    },
    [onPhotosMove, onFolderMove]
  );

  // Stabilize dragState reference to prevent infinite re-renders
  const stableDragState = useMemo(
    () => dragState,
    [
      dragState.isDragging,
      dragState.draggedItems.join(','),
      dragState.dragOverFolder,
    ]
  );

  // Grid item data with enhanced functionality - stabilized dependencies
  const gridItemData = useMemo(
    () => ({
      items: allGridItems,
      columnCount,
      selectedItems,
      lastSelectedIndex,
      dragState: stableDragState,
      onItemSelect: handleItemSelect,
      onFolderDoubleClick,
      onPhotoDoubleClick: onPhotoDoubleClick || (() => {}),
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragOverFolder: handleDragOverFolder,
      onDragLeaveFolder: handleDragLeaveFolder,
      onDropOnFolder: handleDropOnFolder,
      preloadImages,
    }),
    [
      allGridItems,
      columnCount,
      selectedItems,
      lastSelectedIndex,
      stableDragState,
      handleItemSelect,
      onFolderDoubleClick,
      onPhotoDoubleClick,
      handleDragStart,
      handleDragEnd,
      handleDragOverFolder,
      handleDragLeaveFolder,
      handleDropOnFolder,
      preloadImages,
    ]
  );

  // Keyboard shortcuts for selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'a':
            e.preventDefault();
            if (onBulkSelect) {
              onBulkSelect(allGridItems.map((item) => item.id));
            }
            break;
          case 'Escape':
            if (onClearSelection) {
              onClearSelection();
            }
            break;
        }
      }
    };

    if (gridRef.current) {
      gridRef.current.addEventListener('keydown', handleKeyDown);
      return () => {
        gridRef.current?.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [allGridItems, onBulkSelect, onClearSelection]);

  // Auto-scroll for infinite loading when virtualization is enabled
  const handleScroll = useCallback(
    (e: any) => {
      if (
        !featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION ||
        !hasMore ||
        loading
      )
        return;

      const { scrollTop, scrollHeight, clientHeight } = e.target;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      // Load more when 80% scrolled
      if (scrollPercentage > 0.8) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  // Performance monitoring
  useEffect(() => {
    if (featureFlags.DEBUG_MIGRATION) {
      console.log('ContentGridPanel Performance Stats:', {
        totalItems: allGridItems.length,
        folders: folders.length,
        photos: photos.length,
        selectedItems: selectedItems.size,
        columnCount,
        rowCount,
        virtualizationEnabled: featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION,
        dragDropEnabled: featureFlags.EVENT_PHOTO_LIBRARY_DRAG_DROP,
      });
    }
  }, [
    allGridItems.length,
    folders.length,
    photos.length,
    selectedItems.size,
    columnCount,
    rowCount,
  ]);

  if (loading && folders.length === 0 && photos.length === 0) {
    return (
      <div className="flex-1 p-6">
        <SkeletonHeaderStats />
        <SkeletonContentGrid
          columnCount={columnCount}
          rowCount={Math.min(rowCount, 3)}
          itemSize={ITEM_HEIGHT}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          Error al cargar el contenido
        </h3>
        <p className="mb-4 text-gray-500">{error}</p>
        <Button onClick={onRefresh}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Enhanced header with selection tools */}
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {folders.length > 0 && (
                <span>
                  {folders.length} carpeta{folders.length !== 1 ? 's' : ''}
                </span>
              )}
              {folders.length > 0 && photos.length > 0 && (
                <span className="mx-2">•</span>
              )}
              {photos.length > 0 && (
                <span>
                  {photos.length} foto{photos.length !== 1 ? 's' : ''}
                  {totalPhotos > photos.length && (
                    <span className="text-gray-400">
                      {' '}
                      (de {totalPhotos} total)
                    </span>
                  )}
                </span>
              )}
            </div>

            {selectedItems.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-600">
                  {selectedItems.size} seleccionado
                  {selectedItems.size !== 1 ? 's' : ''}
                </span>
                {onClearSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-6 text-xs"
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCacheBust((n) => n + 1);
                onRefresh();
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Actualizar</span>
              )}
            </Button>

            {onShowUpload && (
              <Button size="sm" onClick={onShowUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Subir fotos
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced content grid */}
      <div ref={gridRef} className="relative flex-1 overflow-auto" tabIndex={0}>
        {folders.length === 0 && photos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <ImageIcon className="mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              Carpeta vacía
            </h3>
            <p className="mb-4 text-gray-500">
              Esta carpeta no contiene archivos.
              {onShowUpload && ' Sube algunas fotos para comenzar.'}
            </p>
            {onShowUpload && (
              <Button onClick={onShowUpload}>
                <Upload className="mr-2 h-4 w-4" />
                Subir fotos
              </Button>
            )}
          </div>
        ) : (
          <>
            {featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION ? (
              <Grid
                ref={gridInstanceRef}
                columnCount={columnCount}
                columnWidth={itemWidth}
                height={gridRef.current?.clientHeight || 600}
                rowCount={rowCount}
                rowHeight={ITEM_HEIGHT}
                width={gridWidth}
                itemData={gridItemData}
                overscanRowCount={OVERSCAN_COUNT}
                className="w-full"
                onScroll={handleScroll}
              >
                {GridItemComponent}
              </Grid>
            ) : (
              // Fallback non-virtualized grid for compatibility
              <div
                className="grid gap-4 p-4"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  gridAutoRows: `${ITEM_HEIGHT}px`,
                }}
              >
                {allGridItems.map((item, index) => (
                  <GridItemComponent
                    key={item.id}
                    columnIndex={index % columnCount}
                    rowIndex={Math.floor(index / columnCount)}
                    style={{ width: '100%', height: ITEM_HEIGHT }}
                    data={gridItemData}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Enhanced load more with infinite scroll */}
        {hasMore && !featureFlags.EVENT_PHOTO_LIBRARY_VIRTUALIZATION && (
          <div className="flex justify-center p-4">
            <Button onClick={onLoadMore} disabled={loading} variant="outline">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cargar más fotos
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

ContentGridPanel.displayName = 'ContentGridPanel';

export { ContentGridPanel };
