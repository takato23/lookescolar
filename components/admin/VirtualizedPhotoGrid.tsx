'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  ImageIcon, MoreHorizontal, Download, Edit, Trash2, 
  Eye, CheckCircle, Clock, AlertTriangle, Tag,
  Loader2, Grid3X3, List
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VirtualizedPhoto {
  id: string;
  filename: string;
  thumbnailUrl: string;
  fullUrl: string;
  uploadDate: string;
  fileSize: number;
  approved: boolean;
  tagged: boolean;
  studentNames: string[];
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: number;
  };
}

interface VirtualizedPhotoGridProps {
  eventId: string;
  studentId?: string;
  courseId?: string;
  searchTerm?: string;
  onPhotoSelect?: (photo: VirtualizedPhoto) => void;
  onBulkAction?: (action: string, photoIds: string[]) => void;
  enableSelection?: boolean;
  enableBulkActions?: boolean;
  itemSize?: number;
  overscan?: number;
}

const PHOTO_CARD_SIZE = 200;
const PHOTO_CARD_PADDING = 8;
const LOAD_BATCH_SIZE = 50;

export default function VirtualizedPhotoGrid({
  eventId,
  studentId,
  courseId,
  searchTerm = '',
  onPhotoSelect,
  onBulkAction,
  enableSelection = false,
  enableBulkActions = false,
  itemSize = PHOTO_CARD_SIZE,
  overscan = 5
}: VirtualizedPhotoGridProps) {
  // State management
  const [photos, setPhotos] = useState<VirtualizedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 600 });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid>(null);
  const loadedRanges = useRef<Array<{ start: number; end: number }>>([]);

  // Calculate grid dimensions
  const { columnCount, rowCount } = useMemo(() => {
    const availableWidth = containerSize.width - 32; // Account for padding
    const itemWidth = itemSize + PHOTO_CARD_PADDING;
    const cols = Math.max(1, Math.floor(availableWidth / itemWidth));
    const rows = Math.ceil(photos.length / cols);
    
    return {
      columnCount: cols,
      rowCount: rows
    };
  }, [containerSize.width, itemSize, photos.length]);

  // Load photos with pagination and caching
  const loadPhotos = useCallback(async (page: number = 0, append: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`/api/admin/photos`, window.location.origin);
      url.searchParams.set('event_id', eventId);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', LOAD_BATCH_SIZE.toString());
      url.searchParams.set('include_thumbnails', 'true');
      
      if (studentId) url.searchParams.set('student_id', studentId);
      if (courseId) url.searchParams.set('course_id', courseId);
      if (searchTerm) url.searchParams.set('search', searchTerm);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to load photos');

      const data = await response.json();
      const newPhotos: VirtualizedPhoto[] = (data.photos || []).map((photo: any) => ({
        id: photo.id,
        filename: photo.filename,
        thumbnailUrl: `/api/photos/${photo.id}/thumbnail?size=400`,
        fullUrl: `/api/photos/${photo.id}/full`,
        uploadDate: photo.created_at,
        fileSize: photo.file_size_bytes || 0,
        approved: photo.approved || false,
        tagged: (photo.students || []).length > 0,
        studentNames: (photo.students || []).map((s: any) => s.name),
        metadata: {
          width: photo.metadata?.width,
          height: photo.metadata?.height,
          aspectRatio: photo.metadata?.width && photo.metadata?.height 
            ? photo.metadata.width / photo.metadata.height 
            : 1
        }
      }));

      setPhotos(prevPhotos => append ? [...prevPhotos, ...newPhotos] : newPhotos);
      setHasMore(data.has_more || false);
      
      // Update loaded ranges
      const startIndex = page * LOAD_BATCH_SIZE;
      const endIndex = startIndex + newPhotos.length - 1;
      loadedRanges.current.push({ start: startIndex, end: endIndex });
      
    } catch (err) {
      console.error('Error loading photos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [eventId, studentId, courseId, searchTerm, loading]);

  // Check if item is loaded
  const isItemLoaded = useCallback((index: number) => {
    return loadedRanges.current.some(range => 
      index >= range.start && index <= range.end
    );
  }, []);

  // Load more items for infinite loading
  const loadMoreItems = useCallback(async (startIndex: number, stopIndex: number) => {
    if (!hasMore || loading) return;
    
    const page = Math.floor(startIndex / LOAD_BATCH_SIZE);
    await loadPhotos(page, true);
  }, [hasMore, loading, loadPhotos]);

  // Initial load
  useEffect(() => {
    loadPhotos(0, false);
  }, [eventId, studentId, courseId, searchTerm]);

  // Update container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ 
          width: rect.width, 
          height: Math.max(400, rect.height) 
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Selection handlers
  const handlePhotoToggle = useCallback((photoId: string, selected: boolean) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(photoId);
      } else {
        newSet.delete(photoId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedPhotos(new Set(photos.map(p => p.id)));
  }, [photos]);

  const handleDeselectAll = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  // Bulk action handler
  const handleBulkAction = useCallback((action: string) => {
    if (onBulkAction && selectedPhotos.size > 0) {
      onBulkAction(action, Array.from(selectedPhotos));
    }
  }, [onBulkAction, selectedPhotos]);

  // Photo card component
  const PhotoCard = useCallback(({ photo, isSelected, onToggle }: {
    photo: VirtualizedPhoto;
    isSelected: boolean;
    onToggle: (selected: boolean) => void;
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    return (
      <Card 
        className={cn(
          "h-full hover:shadow-lg transition-all cursor-pointer border-2 overflow-hidden",
          isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-transparent hover:border-gray-300"
        )}
        onClick={() => onPhotoSelect?.(photo)}
      >
        <CardContent className="p-0 h-full flex flex-col">
          {/* Image container */}
          <div className="relative flex-1 bg-gray-100">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
            
            {imageError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
            ) : (
              <img
                src={photo.thumbnailUrl}
                alt={photo.filename}
                className={cn(
                  "w-full h-full object-cover transition-opacity",
                  imageLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            )}

            {/* Selection overlay */}
            {enableSelection && (
              <div 
                className="absolute top-2 left-2 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(!isSelected);
                }}
              >
                <Checkbox 
                  checked={isSelected}
                  onChange={() => {}} // Handled by onClick above
                  className="bg-white/80 border-white shadow-sm"
                />
              </div>
            )}

            {/* Status badges */}
            <div className="absolute top-2 right-2 flex gap-1">
              {photo.approved && (
                <Badge variant="default" className="bg-green-500 text-white text-xs">
                  <CheckCircle className="h-3 w-3" />
                </Badge>
              )}
              
              {!photo.tagged && (
                <Badge variant="destructive" className="text-xs">
                  <Tag className="h-3 w-3" />
                </Badge>
              )}
            </div>

            {/* Actions menu */}
            <div className="absolute bottom-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPhotoSelect?.(photo)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Photo info */}
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium truncate flex-1">
                {photo.filename}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {(photo.fileSize / 1024 / 1024).toFixed(1)}MB
              </span>
            </div>
            
            {photo.studentNames.length > 0 && (
              <div className="text-xs text-muted-foreground truncate">
                {photo.studentNames.join(', ')}
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              {new Date(photo.uploadDate).toLocaleDateString('es-AR')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }, [enableSelection, onPhotoSelect]);

  // Grid cell renderer
  const Cell = useCallback(({ columnIndex, rowIndex, style }: {
    columnIndex: number;
    rowIndex: number;
    style: React.CSSProperties;
  }) => {
    const photoIndex = rowIndex * columnCount + columnIndex;
    const photo = photos[photoIndex];

    if (!photo) {
      return (
        <div style={style}>
          <div className="m-1 h-full bg-gray-100 rounded animate-pulse" />
        </div>
      );
    }

    const isSelected = selectedPhotos.has(photo.id);

    return (
      <div style={{
        ...style,
        padding: PHOTO_CARD_PADDING / 2,
      }}>
        <PhotoCard
          photo={photo}
          isSelected={isSelected}
          onToggle={(selected) => handlePhotoToggle(photo.id, selected)}
        />
      </div>
    );
  }, [photos, columnCount, selectedPhotos, PhotoCard, handlePhotoToggle]);

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-destructive mb-4">Error: {error}</p>
          <Button onClick={() => loadPhotos(0, false)}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(enableSelection || enableBulkActions) && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            {enableSelection && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedPhotos.size} de {photos.length} seleccionadas
                </span>
                {selectedPhotos.size > 0 ? (
                  <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                    Deseleccionar Todo
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    Seleccionar Todo
                  </Button>
                )}
              </>
            )}
          </div>
          
          {enableBulkActions && selectedPhotos.size > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleBulkAction('download')}>
                <Download className="h-4 w-4 mr-1" />
                Descargar ({selectedPhotos.size})
              </Button>
              <Button size="sm" onClick={() => handleBulkAction('approve')}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button 
                size="sm" 
                variant="danger" 
                onClick={() => handleBulkAction('delete')}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {photos.length} fotos cargadas {hasMore && '(cargando más...)'}
        </span>
        {loading && (
          <div className="flex items-center gap-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando...</span>
          </div>
        )}
      </div>

      {/* Virtualized Grid */}
      <div ref={containerRef} className="border rounded-lg bg-white">
        {photos.length > 0 ? (
          <InfiniteLoader
            isItemLoaded={isItemLoaded}
            itemCount={hasMore ? photos.length + LOAD_BATCH_SIZE : photos.length}
            loadMoreItems={loadMoreItems}
          >
            {({ onItemsRendered, ref }) => (
              <Grid
                ref={(grid) => {
                  ref(grid);
                  gridRef.current = grid;
                }}
                columnCount={columnCount}
                columnWidth={itemSize + PHOTO_CARD_PADDING}
                height={containerSize.height}
                rowCount={rowCount}
                rowHeight={itemSize + PHOTO_CARD_PADDING + 60} // Extra space for photo info
                width={containerSize.width}
                overscanRowCount={overscan}
                onItemsRendered={({
                  visibleRowStartIndex,
                  visibleRowStopIndex,
                  visibleColumnStartIndex,
                  visibleColumnStopIndex,
                }) => {
                  const startIndex = visibleRowStartIndex * columnCount + visibleColumnStartIndex;
                  const stopIndex = visibleRowStopIndex * columnCount + visibleColumnStopIndex;
                  onItemsRendered({ 
                    visibleStartIndex: startIndex, 
                    visibleStopIndex: stopIndex,
                    overscanStartIndex: startIndex,
                    overscanStopIndex: stopIndex
                  });
                }}
              >
                {Cell}
              </Grid>
            )}
          </InfiniteLoader>
        ) : !loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No hay fotos disponibles</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}