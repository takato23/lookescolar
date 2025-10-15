import React, { memo, useCallback, useMemo } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import { PhotoCard } from './PixiesetPhotoSelector';

interface Photo {
  id: string;
  url: string;
  preview_url?: string;
  alt: string;
  student?: string;
  subject?: string;
  is_group_photo?: boolean;
}

interface VirtualizedPhotoGridProps {
  photos: Photo[];
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => void;
  onPhotoSelect: (photo: Photo, type: 'individual' | 'group') => void;
  selectedPhotos: { individual: string[]; group: string[] };
  maxIndividual?: number;
  maxGroup?: number;
  itemHeight?: number;
  itemWidth?: number;
  containerHeight?: number;
  containerWidth?: number;
  columns?: number;
}

const ITEM_HEIGHT = 200;
const ITEM_WIDTH = 200;
const CONTAINER_HEIGHT = 600;
const CONTAINER_WIDTH = 1200;
const COLUMNS = 6;

/**
 * Componente virtualizado para galería de fotos con scroll infinito
 */
export const VirtualizedPhotoGrid = memo(({
  photos,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  onPhotoSelect,
  selectedPhotos,
  maxIndividual = 1,
  maxGroup = 1,
  itemHeight = ITEM_HEIGHT,
  itemWidth = ITEM_WIDTH,
  containerHeight = CONTAINER_HEIGHT,
  containerWidth = CONTAINER_WIDTH,
  columns = COLUMNS
}: VirtualizedPhotoGridProps) => {
  // Calcular número de filas necesarias
  const rowCount = Math.ceil(photos.length / columns);

  // Determinar si un item está cargado
  const isItemLoaded = useCallback((index: number) => index < photos.length, [photos.length]);

  // Cargar más items cuando sea necesario
  const loadMoreItems = useCallback((startIndex: number, stopIndex: number) => {
    if (!hasNextPage || isNextPageLoading) return;

    // Si estamos cerca del final, cargar más
    const visibleStopIndex = Math.min(stopIndex, photos.length - 1);
    if (visibleStopIndex >= photos.length - 10) {
      loadNextPage();
    }
  }, [hasNextPage, isNextPageLoading, photos.length, loadNextPage]);

  // Renderizar item individual
  const renderItem = useCallback(({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columns + columnIndex;
    const photo = photos[index];

    if (!photo) {
      // Item de carga para placeholders
      return (
        <div style={style} className="p-2">
          <div className="aspect-square bg-gray-200 animate-pulse rounded-lg" />
        </div>
      );
    }

    const isSelected = selectedPhotos.individual.includes(photo.id) ||
                      selectedPhotos.group.includes(photo.id);

    const isIndividual = !photo.is_group_photo;
    const canSelect = isIndividual
      ? selectedPhotos.individual.length < maxIndividual || isSelected
      : selectedPhotos.group.length < maxGroup || isSelected;

    return (
      <div style={style} className="p-2">
        <PhotoCard
          photo={photo}
          isSelected={isSelected}
          canSelect={canSelect}
          onClick={() => onPhotoSelect(photo, isIndividual ? 'individual' : 'group')}
          student={photo.student}
          type={isIndividual ? 'individual' : 'group'}
        />
      </div>
    );
  }, [photos, selectedPhotos, maxIndividual, maxGroup, onPhotoSelect, columns]);

  // Total de items (incluyendo placeholders para scroll infinito)
  const itemCount = hasNextPage ? photos.length + (columns * 2) : photos.length;

  return (
    <div className="w-full">
      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={loadMoreItems}
      >
        {({ onItemsRendered, ref }) => (
          <Grid
            ref={ref}
            columnCount={columns}
            columnWidth={itemWidth + 16} // + padding
            height={containerHeight}
            rowCount={Math.ceil(itemCount / columns)}
            rowHeight={itemHeight + 16} // + padding
            width={containerWidth}
            onItemsRendered={onItemsRendered}
            className="overflow-auto"
          >
            {renderItem}
          </Grid>
        )}
      </InfiniteLoader>

      {/* Indicador de carga */}
      {isNextPageLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
            <span className="text-sm">Cargando más fotos...</span>
          </div>
        </div>
      )}
    </div>
  );
});

VirtualizedPhotoGrid.displayName = 'VirtualizedPhotoGrid';
