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
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { SkeletonContentGrid, SkeletonHeaderStats } from './SkeletonPlaceholders';

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
  onItemSelect: (itemId: string, itemType: 'folder' | 'photo', isCtrlKey?: boolean, isShiftKey?: boolean) => void;
  onFolderDoubleClick: (folderId: string) => void;
  onPhotoDoubleClick?: (photoId: string) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
  onShowUpload?: () => void;
  onPhotosMove?: (photoIds: string[], targetFolderId: string | null) => Promise<void>;
  onFolderMove?: (folderId: string, targetFolderId: string | null) => Promise<void>;
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
    dragState: {
      isDragging: boolean;
      draggedItems: string[];
      dragOverFolder: string | null;
    };
    onItemSelect: (itemId: string, itemType: 'folder' | 'photo', isCtrlKey?: boolean, isShiftKey?: boolean) => void;
    onFolderDoubleClick: (folderId: string) => void;
    onPhotoDoubleClick?: (photoId: string) => void;
    onDragStart: (e: React.DragEvent, itemId: string, itemType: 'folder' | 'photo') => void;
    onDragEnd: () => void;
    onDragOverFolder: (e: React.DragEvent, folderId: string) => void;
    onDragLeaveFolder: () => void;
    onDropOnFolder: (e: React.DragEvent, folderId: string) => void;
  };
}

// Memoized grid item component for better performance
const GridItemComponent = memo<GridItemComponentProps>(({ columnIndex, rowIndex, style, data }) => {
  const { 
    items, 
    columnCount, 
    selectedItems, 
    dragState,
    onItemSelect, 
    onFolderDoubleClick,
    onPhotoDoubleClick,
    onDragStart,
    onDragEnd,
    onDragOverFolder,
    onDragLeaveFolder,
    onDropOnFolder
  } = data;
  const itemIndex = rowIndex * columnCount + columnIndex;
  const item = items[itemIndex];

  if (!item) {
    return <div style={style} />;
  }

  const isSelected = selectedItems.has(item.id);
  const isDraggedItem = dragState.draggedItems.includes(item.id);
  const isDragOverFolder = item.type === 'folder' && dragState.dragOverFolder === item.id;

  const handleClick = useCallback((e: React.MouseEvent) => {
    const isCtrlKey = e.ctrlKey || e.metaKey;
    const isShiftKey = e.shiftKey;
    onItemSelect(item.id, item.type, isCtrlKey, isShiftKey);
  }, [item.id, item.type, onItemSelect]);

  const handleDoubleClick = useCallback(() => {
    if (item.type === 'folder') {
      onFolderDoubleClick(item.id);
    } else if (item.type === 'photo' && onPhotoDoubleClick) {
      onPhotoDoubleClick(item.id);
    }
  }, [item.type, item.id, onFolderDoubleClick, onPhotoDoubleClick]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    onDragStart(e, item.id, item.type);
  }, [item.id, item.type, onDragStart]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (item.type === 'folder') {
      onDragOverFolder(e, item.id);
    }
  }, [item.type, item.id, onDragOverFolder]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (item.type === 'folder') {
      onDropOnFolder(e, item.id);
    }
  }, [item.type, item.id, onDropOnFolder]);

  return (
    <div style={style} className="p-2">
      <div
        className={cn(
          "relative rounded-lg border-2 transition-all cursor-pointer group",
          "hover:shadow-md hover:scale-[1.02]",
          isSelected 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-200 bg-white hover:border-gray-300",
          isDraggedItem && "opacity-50",
          isDragOverFolder && "border-green-500 bg-green-50 scale-105"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragOver={item.type === 'folder' ? handleDragOver : undefined}
        onDragLeave={item.type === 'folder' ? onDragLeaveFolder : undefined}
        onDrop={item.type === 'folder' ? handleDrop : undefined}
      >
        {/* Selection checkbox */}
        <div className="absolute top-2 left-2 z-10">
          {isSelected ? (
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
          ) : (
            <Circle className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
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
}, areEqual);

GridItemComponent.displayName = 'GridItemComponent';

// Memoized folder item content
const FolderItemContent = memo<{ folder: Folder }>(({ folder }) => (
  <div className="p-4 h-full flex flex-col">
    <div className="flex-1 flex items-center justify-center">
      <Folder className="h-12 w-12 text-blue-500" />
    </div>
    
    <div className="mt-2">
      <div className="text-sm font-medium text-gray-900 truncate" title={folder.name}>
        {folder.name}
      </div>
      
      <div className="text-xs text-gray-500 mt-1">
        {folder.child_folder_count > 0 && (
          <span>{folder.child_folder_count} carpeta{folder.child_folder_count !== 1 ? 's' : ''}</span>
        )}
        {folder.child_folder_count > 0 && folder.photo_count > 0 && <span>, </span>}
        {folder.photo_count > 0 && (
          <span>{folder.photo_count} foto{folder.photo_count !== 1 ? 's' : ''}</span>
        )}
        {folder.child_folder_count === 0 && folder.photo_count === 0 && (
          <span>Vacía</span>
        )}
      </div>
    </div>
  </div>
));

FolderItemContent.displayName = 'FolderItemContent';

// Memoized photo item content
const PhotoItemContent = memo<{ photo: Photo }>(({ photo }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleLoad = useCallback(() => setImageLoaded(true), []);
  const handleError = useCallback(() => setImageError(true), []);

  return (
    <div className="h-full flex flex-col">
      {/* Image area */}
      <div className="flex-1 relative bg-gray-100 rounded-t-lg overflow-hidden">
        {photo.signed_url && !imageError ? (
          <>
            <Image
              src={photo.signed_url}
              alt={photo.original_filename}
              fill
              className={cn(
                "object-cover transition-opacity duration-200",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={handleLoad}
              onError={handleError}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              priority={false}
              loading="lazy"
            />
            
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {imageError ? (
              <AlertCircle className="h-6 w-6 text-red-400" />
            ) : (
              <ImageIcon className="h-6 w-6 text-gray-400" />
            )}
          </div>
        )}

        {/* Status indicators */}
        {photo.processing_status !== 'completed' && (
          <div className="absolute top-2 right-2">
            <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
              Procesando
            </div>
          </div>
        )}

        {photo.approved && (
          <div className="absolute bottom-2 right-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      {/* Photo info */}
      <div className="p-2 bg-white rounded-b-lg">
        <div className="text-xs font-medium text-gray-900 truncate" title={photo.original_filename}>
          {photo.original_filename}
        </div>
        
        <div className="text-xs text-gray-500 mt-1">
          {photo.width}×{photo.height} • {Math.round(photo.file_size / 1024)}KB
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
  onFolderMove
}: ContentGridPanelProps) => {
  const [columnWidth, setColumnWidth] = useState(200);
  const [rowHeight, setRowHeight] = useState(200);
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedItems: [] as string[],
    dragOverFolder: null as string | null
  });
  
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Calculate grid dimensions
  const gridWidth = gridRef.current?.clientWidth || 800;
  const columnCount = Math.floor(gridWidth / columnWidth) || 1;
  const rowCount = Math.ceil((folders.length + photos.length) / columnCount);
  
  // Create grid items
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];
    
    // Add folders first
    folders.forEach(folder => {
      items.push({
        id: folder.id,
        type: 'folder',
        data: folder
      });
    });
    
    // Add photos
    photos.forEach(photo => {
      items.push({
        id: photo.id,
        type: 'photo',
        data: photo
      });
    });
    
    return items;
  }, [folders, photos]);
  
  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string, itemType: 'folder' | 'photo') => {
    e.dataTransfer.setData('text/plain', `${itemType}:${itemId}`);
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedItems: [itemId]
    }));
  }, []);
  
  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItems: [],
      dragOverFolder: null
    });
  }, []);
  
  const handleDragOverFolder = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragState(prev => ({
      ...prev,
      dragOverFolder: folderId
    }));
  }, []);
  
  const handleDragLeaveFolder = useCallback(() => {
    setDragState(prev => ({
      ...prev,
      dragOverFolder: null
    }));
  }, []);
  
  const handleDropOnFolder = useCallback((e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const [itemType, itemId] = data.split(':');
    
    if (itemType === 'photo' && onPhotosMove) {
      onPhotosMove([itemId], folderId);
    } else if (itemType === 'folder' && onFolderMove) {
      onFolderMove(itemId, folderId);
    }
    
    setDragState({
      isDragging: false,
      draggedItems: [],
      dragOverFolder: null
    });
  }, [onPhotosMove, onFolderMove]);
  
  // Grid item data
  const gridItemData = useMemo(() => ({
    items: gridItems,
    columnCount,
    selectedItems,
    dragState,
    onItemSelect,
    onFolderDoubleClick,
    onPhotoDoubleClick,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOverFolder: handleDragOverFolder,
    onDragLeaveFolder: handleDragLeaveFolder,
    onDropOnFolder: handleDropOnFolder
  }), [
    gridItems,
    columnCount,
    selectedItems,
    dragState,
    onItemSelect,
    onFolderDoubleClick,
    onPhotoDoubleClick,
    handleDragStart,
    handleDragEnd,
    handleDragOverFolder,
    handleDragLeaveFolder,
    handleDropOnFolder
  ]);
  
  if (loading && folders.length === 0 && photos.length === 0) {
    return (
      <div className="flex-1 p-6">
        <SkeletonHeaderStats />
        <SkeletonContentGrid columnCount={columnCount} rowCount={Math.min(rowCount, 3)} />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error al cargar el contenido</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={onRefresh}>Reintentar</Button>
      </div>
    );
  }
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header stats */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {folders.length > 0 && (
              <span>{folders.length} carpeta{folders.length !== 1 ? 's' : ''}</span>
            )}
            {folders.length > 0 && photos.length > 0 && <span className="mx-2">•</span>}
            {photos.length > 0 && (
              <span>
                {photos.length} foto{photos.length !== 1 ? 's' : ''}
                {totalPhotos > photos.length && (
                  <span className="text-gray-400"> (de {totalPhotos} total)</span>
                )}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Actualizar</span>
              )}
            </Button>
            
            {onShowUpload && (
              <Button
                size="sm"
                onClick={onShowUpload}
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir fotos
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Content grid */}
      <div ref={gridRef} className="flex-1 overflow-auto relative">
        {folders.length === 0 && photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Carpeta vacía</h3>
            <p className="text-gray-500 mb-4">
              Esta carpeta no contiene archivos.
              {onShowUpload && ' Sube algunas fotos para comenzar.'}
            </p>
            {onShowUpload && (
              <Button onClick={onShowUpload}>
                <Upload className="h-4 w-4 mr-2" />
                Subir fotos
              </Button>
            )}
          </div>
        ) : (
          <Grid
            columnCount={columnCount}
            columnWidth={columnWidth}
            height={Math.min(rowCount * rowHeight, 600)}
            rowCount={rowCount}
            rowHeight={rowHeight}
            width={gridWidth}
            itemData={gridItemData}
            className="w-full"
          >
            {GridItemComponent}
          </Grid>
        )}
        
        {/* Load more button */}
        {hasMore && (
          <div className="p-4 flex justify-center">
            <Button
              onClick={onLoadMore}
              disabled={loading}
              variant="outline"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cargar más
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

ContentGridPanel.displayName = 'ContentGridPanel';

export { ContentGridPanel };