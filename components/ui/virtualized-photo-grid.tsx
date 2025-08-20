'use client';

import React, { 
  memo, 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  forwardRef,
  useImperativeHandle 
} from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import { FixedSizeList as List } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ImageIcon, 
  MoreVerticalIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  TagIcon,
  DownloadIcon 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export interface PhotoGridItem {
  id: string;
  original_filename: string;
  preview_url?: string;
  file_size: number;
  created_at: string;
  approved: boolean;
  tagged: boolean;
  width?: number;
  height?: number;
}

export interface PhotoGridProps {
  items: PhotoGridItem[];
  hasNextPage: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  onPhotoClick: (photo: PhotoGridItem, index: number) => void;
  onPhotoSelect?: (photoId: string, index: number, shiftKey?: boolean) => void;
  selectedPhotos?: Set<string>;
  viewMode?: 'grid' | 'list';
  itemSize?: number;
  className?: string;
  enableSelection?: boolean;
  showMetadata?: boolean;
  onPhotoAction?: (action: string, photo: PhotoGridItem) => void;
}

export interface VirtualizedPhotoGridRef {
  scrollToItem: (index: number) => void;
  scrollToTop: () => void;
  getScrollOffset: () => number;
}

// Performance optimized photo card component
const PhotoCard = memo<{
  photo: PhotoGridItem;
  index: number;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
  showMetadata: boolean;
  enableSelection: boolean;
  onClick: (photo: PhotoGridItem, index: number) => void;
  onSelect?: (photoId: string, index: number, shiftKey?: boolean) => void;
  onAction?: (action: string, photo: PhotoGridItem) => void;
}>(({
  photo,
  index,
  isSelected,
  viewMode,
  showMetadata,
  enableSelection,
  onClick,
  onSelect,
  onAction,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onSelect?.(photo.id, index, false);
    } else if (e.shiftKey) {
      e.preventDefault();
      onSelect?.(photo.id, index, true);
    } else {
      onClick(photo, index);
    }
  }, [photo, index, onClick, onSelect]);

  const handleSelectChange = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(photo.id, index, e.shiftKey);
  }, [photo.id, index, onSelect]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  if (viewMode === 'list') {
    return (
      <Card 
        className={cn(
          'flex items-center gap-4 p-4 cursor-pointer transition-all duration-200',
          'hover:shadow-md hover:bg-accent/5',
          isSelected && 'ring-2 ring-primary bg-primary/5'
        )}
        onClick={handleClick}
      >
        {enableSelection && (
          <Checkbox
            checked={isSelected}
            onChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        
        <div className="relative w-16 h-16 shrink-0 bg-muted rounded-lg overflow-hidden">
          {!imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <img
                src={photo.preview_url || '/placeholder.jpg'}
                alt={photo.original_filename}
                className={cn(
                  'w-full h-full object-cover transition-opacity duration-200',
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <XCircleIcon className="w-6 h-6 text-red-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium truncate">{photo.original_filename}</h3>
            {photo.approved && (
              <Badge variant="success" className="shrink-0">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                Aprobada
              </Badge>
            )}
            {photo.tagged && (
              <Badge variant="secondary" className="shrink-0">
                <TagIcon className="w-3 h-3 mr-1" />
                Etiquetada
              </Badge>
            )}
          </div>
          
          {showMetadata && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{formatFileSize(photo.file_size)}</span>
              <span>{formatDate(photo.created_at)}</span>
              {photo.width && photo.height && (
                <span>{photo.width} × {photo.height}</span>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="shrink-0">
              <MoreVerticalIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction?.('download', photo)}>
              <DownloadIcon className="w-4 h-4 mr-2" />
              Descargar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.('approve', photo)}>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              {photo.approved ? 'Desaprobar' : 'Aprobar'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.('tag', photo)}>
              <TagIcon className="w-4 h-4 mr-2" />
              Etiquetar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Card>
    );
  }

  // Grid view
  return (
    <Card 
      className={cn(
        'group relative overflow-hidden cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:scale-[1.02]',
        isSelected && 'ring-2 ring-primary shadow-lg scale-[1.02]'
      )}
      onClick={handleClick}
    >
      {enableSelection && (
        <div className="absolute top-2 left-2 z-10">
          <Checkbox
            checked={isSelected}
            onChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
            className="bg-background/80 backdrop-blur-sm"
          />
        </div>
      )}

      <div className="aspect-square relative bg-muted">
        {!imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <img
              src={photo.preview_url || '/placeholder.jpg'}
              alt={photo.original_filename}
              className={cn(
                'w-full h-full object-cover transition-all duration-200',
                imageLoaded ? 'opacity-100' : 'opacity-0',
                'group-hover:scale-105'
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        )}

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
        
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="h-8 w-8 p-0">
                <MoreVerticalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.('download', photo)}>
                <DownloadIcon className="w-4 h-4 mr-2" />
                Descargar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('approve', photo)}>
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                {photo.approved ? 'Desaprobar' : 'Aprobar'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('tag', photo)}>
                <TagIcon className="w-4 h-4 mr-2" />
                Etiquetar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status badges */}
        <div className="absolute bottom-2 left-2 flex gap-1">
          <AnimatePresence>
            {photo.approved && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Badge variant="success" className="text-xs">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  OK
                </Badge>
              </motion.div>
            )}
            {photo.tagged && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                <Badge variant="secondary" className="text-xs">
                  <TagIcon className="w-3 h-3" />
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showMetadata && (
        <div className="p-3">
          <h3 className="text-sm font-medium truncate mb-1">{photo.original_filename}</h3>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatFileSize(photo.file_size)}</span>
            <span>{formatDate(photo.created_at)}</span>
          </div>
        </div>
      )}
    </Card>
  );
});

PhotoCard.displayName = 'PhotoCard';

// Grid item renderer
const GridItem = memo<GridChildComponentProps>(({ columnIndex, rowIndex, style, data }) => {
  const { 
    items, 
    columnCount, 
    onPhotoClick, 
    onPhotoSelect, 
    selectedPhotos, 
    viewMode, 
    showMetadata, 
    enableSelection,
    onPhotoAction 
  } = data;
  
  const index = rowIndex * columnCount + columnIndex;
  const photo = items[index];

  if (!photo) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="p-2">
      <PhotoCard
        photo={photo}
        index={index}
        isSelected={selectedPhotos?.has(photo.id) || false}
        viewMode={viewMode}
        showMetadata={showMetadata}
        enableSelection={enableSelection}
        onClick={onPhotoClick}
        onSelect={onPhotoSelect}
        onAction={onPhotoAction}
      />
    </div>
  );
});

GridItem.displayName = 'GridItem';

// List item renderer
const ListItem = memo<{ index: number; style: any; data: any }>(({ index, style, data }) => {
  const { 
    items, 
    onPhotoClick, 
    onPhotoSelect, 
    selectedPhotos, 
    viewMode, 
    showMetadata, 
    enableSelection,
    onPhotoAction 
  } = data;
  
  const photo = items[index];

  if (!photo) {
    return <div style={style} />;
  }

  return (
    <div style={style} className="px-4 py-2">
      <PhotoCard
        photo={photo}
        index={index}
        isSelected={selectedPhotos?.has(photo.id) || false}
        viewMode={viewMode}
        showMetadata={showMetadata}
        enableSelection={enableSelection}
        onClick={onPhotoClick}
        onSelect={onPhotoSelect}
        onAction={onPhotoAction}
      />
    </div>
  );
});

ListItem.displayName = 'ListItem';

// Main component
export const VirtualizedPhotoGrid = forwardRef<VirtualizedPhotoGridRef, PhotoGridProps>(({
  items,
  hasNextPage,
  isLoading,
  onLoadMore,
  onPhotoClick,
  onPhotoSelect,
  selectedPhotos = new Set(),
  viewMode = 'grid',
  itemSize = 280,
  className,
  enableSelection = false,
  showMetadata = true,
  onPhotoAction,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid>(null);
  const listRef = useRef<List>(null);

  // Calculate grid dimensions
  const [containerWidth, setContainerWidth] = useState(800);
  
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const columnCount = Math.floor(containerWidth / itemSize);
  const rowCount = Math.ceil(items.length / columnCount);

  // Infinite loading configuration
  const itemCount = hasNextPage ? items.length + 1 : items.length;
  const isItemLoaded = useCallback((index: number) => !!items[index], [items]);

  // Shared data for renderers
  const itemData = useMemo(() => ({
    items,
    columnCount,
    onPhotoClick,
    onPhotoSelect,
    selectedPhotos,
    viewMode,
    showMetadata,
    enableSelection,
    onPhotoAction,
  }), [
    items, 
    columnCount, 
    onPhotoClick, 
    onPhotoSelect, 
    selectedPhotos, 
    viewMode, 
    showMetadata, 
    enableSelection,
    onPhotoAction
  ]);

  // Ref methods
  useImperativeHandle(ref, () => ({
    scrollToItem: (index: number) => {
      if (viewMode === 'grid' && gridRef.current) {
        const row = Math.floor(index / columnCount);
        gridRef.current.scrollToItem({ rowIndex: row, columnIndex: 0 });
      } else if (viewMode === 'list' && listRef.current) {
        listRef.current.scrollToItem(index);
      }
    },
    scrollToTop: () => {
      if (viewMode === 'grid' && gridRef.current) {
        gridRef.current.scrollToItem({ rowIndex: 0, columnIndex: 0 });
      } else if (viewMode === 'list' && listRef.current) {
        listRef.current.scrollToItem(0);
      }
    },
    getScrollOffset: () => {
      if (viewMode === 'grid' && gridRef.current) {
        return (gridRef.current as any).state.scrollTop || 0;
      } else if (viewMode === 'list' && listRef.current) {
        return (listRef.current as any).state.scrollOffset || 0;
      }
      return 0;
    },
  }), [viewMode, columnCount]);

  if (items.length === 0 && !isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64 text-muted-foreground', className)}>
        <ImageIcon className="w-16 h-16 mb-4" />
        <p className="text-lg font-medium">No se encontraron fotos</p>
        <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('h-full w-full', className)}>
      {viewMode === 'grid' ? (
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={onLoadMore}
          threshold={5}
        >
          {({ onItemsRendered }) => (
            <Grid
              ref={gridRef}
              columnCount={columnCount}
              columnWidth={itemSize}
              height={600}
              rowCount={rowCount}
              rowHeight={showMetadata ? itemSize + 80 : itemSize}
              itemData={itemData}
              width={containerWidth}
              onItemsRendered={({ 
                visibleRowStartIndex, 
                visibleRowStopIndex 
              }) => {
                onItemsRendered({
                  overscanStartIndex: visibleRowStartIndex * columnCount,
                  overscanStopIndex: (visibleRowStopIndex + 1) * columnCount - 1,
                  visibleStartIndex: visibleRowStartIndex * columnCount,
                  visibleStopIndex: (visibleRowStopIndex + 1) * columnCount - 1,
                });
              }}
            >
              {GridItem}
            </Grid>
          )}
        </InfiniteLoader>
      ) : (
        <InfiniteLoader
          isItemLoaded={isItemLoaded}
          itemCount={itemCount}
          loadMoreItems={onLoadMore}
          threshold={5}
        >
          {({ onItemsRendered }) => (
            <List
              ref={listRef}
              height={600}
              itemCount={itemCount}
              itemSize={120}
              itemData={itemData}
              width={containerWidth}
              onItemsRendered={onItemsRendered}
            >
              {ListItem}
            </List>
          )}
        </InfiniteLoader>
      )}
    </div>
  );
});

VirtualizedPhotoGrid.displayName = 'VirtualizedPhotoGrid';

export default VirtualizedPhotoGrid;