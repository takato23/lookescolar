'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { useWindowSize } from '@/hooks/useWindowSize';

interface Photo {
  id: string;
  filename: string;
  storage_path: string;
  created_at: string;
  signed_url: string;
  assignment_id?: string;
}

interface VirtualPhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  favorites?: Set<string>;
  onTogglePhoto: (photo: Photo) => void;
  onToggleFavorite?: (photoId: string) => void;
  onViewPhoto: (photo: Photo) => void;
  loading?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  getSignedUrl?: (photo: Photo) => Promise<string>;
  className?: string;
}

interface GridCellProps {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: {
    photos: Photo[];
    columns: number;
    selectedPhotos: Set<string>;
    favorites: Set<string>;
    onTogglePhoto: (photo: Photo) => void;
    onToggleFavorite: (photoId: string) => void;
    onViewPhoto: (photo: Photo) => void;
    getSignedUrl: (photo: Photo) => Promise<string>;
  };
}

const ITEM_SIZE = 200; // Size of each photo cell in pixels
const GAP_SIZE = 16; // Gap between items

function GridCell({ columnIndex, rowIndex, style, data }: GridCellProps) {
  const {
    photos,
    columns,
    selectedPhotos,
    favorites,
    onTogglePhoto,
    onToggleFavorite,
    onViewPhoto,
    getSignedUrl,
  } = data;
  const photoIndex = rowIndex * columns + columnIndex;
  const photo = photos[photoIndex];

  if (!photo) {
    return <div style={style} />;
  }

  const isSelected = selectedPhotos.has(photo.id);
  const isFavorite = favorites.has(photo.id);

  return (
    <div style={style} className="p-2">
      <PhotoCard
        photo={photo}
        isSelected={isSelected}
        isFavorite={isFavorite}
        onToggle={() => onTogglePhoto(photo)}
        onToggleFavorite={() => onToggleFavorite(photo.id)}
        onView={() => onViewPhoto(photo)}
        getSignedUrl={getSignedUrl}
      />
    </div>
  );
}

interface PhotoCardProps {
  photo: Photo;
  isSelected: boolean;
  isFavorite: boolean;
  onToggle: () => void;
  onToggleFavorite: () => void;
  onView: () => void;
  getSignedUrl: (photo: Photo) => Promise<string>;
}

function PhotoCard({
  photo,
  isSelected,
  isFavorite,
  onToggle,
  onToggleFavorite,
  onView,
  getSignedUrl,
}: PhotoCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(photo.signed_url);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Cargar URL firmada optimizada
  useEffect(() => {
    if (getSignedUrl && !isLoadingUrl) {
      setIsLoadingUrl(true);
      getSignedUrl(photo)
        .then((url) => {
          setCurrentUrl(url);
          setImageLoaded(false); // Reset para la nueva URL
        })
        .catch(() => {
          setCurrentUrl(photo.signed_url);
        })
        .finally(() => {
          setIsLoadingUrl(false);
        });
    }
  }, [photo.id, getSignedUrl, isLoadingUrl]);

  return (
    <div
      className={`group relative h-full overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}
    >
      <div className="relative aspect-square bg-muted">
        {!imageError ? (
          <img
            src={currentUrl}
            alt={photo.filename}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}

        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex animate-pulse items-center justify-center bg-muted">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 transition-all duration-300 group-hover:bg-opacity-20">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              className="transform rounded-full bg-white bg-opacity-90 p-2 transition-all duration-200 hover:scale-110 hover:bg-opacity-100"
              title="Ver foto completa"
              aria-label={`Ver foto ${photo.filename}`}
            >
              <svg
                className="h-5 w-5 text-foreground"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="absolute right-2 top-2 z-10 flex space-x-1">
          {/* Botón favorito */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`flex h-6 w-6 transform items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              isFavorite
                ? 'border-red-500 bg-red-500 text-white shadow-lg'
                : 'border-border bg-white/90 text-muted-foreground shadow-sm hover:border-red-400 hover:bg-white'
            }`}
            aria-label={
              isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'
            }
            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <svg
              className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`}
              fill={isFavorite ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Selection checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`flex h-6 w-6 transform items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 ${
              isSelected
                ? 'border-purple-600 bg-purple-600 text-white shadow-lg'
                : 'border-border bg-white/90 shadow-sm hover:border-purple-400'
            }`}
            aria-label={isSelected ? 'Deseleccionar foto' : 'Seleccionar foto'}
          >
            {isSelected && (
              <svg
                className="h-3 w-3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>

        {/* Indicador de favorito */}
        {isFavorite && (
          <div className="absolute left-2 top-2 z-10">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm">
              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Photo info */}
      <div className="bg-white p-3">
        <div className="truncate text-xs font-medium text-gray-500">
          {photo.filename}
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {new Date(photo.created_at).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </div>
      </div>
    </div>
  );
}

export function VirtualPhotoGrid({
  photos,
  selectedPhotos,
  favorites = new Set(),
  onTogglePhoto,
  onToggleFavorite = () => {},
  onViewPhoto,
  loading,
  loadMore,
  hasMore,
  getSignedUrl = async (photo) => photo.signed_url,
  className = '',
}: VirtualPhotoGridProps) {
  const { width } = useWindowSize();
  const gridRef = useRef<Grid>(null);

  // Calculate responsive columns
  const columns = useMemo(() => {
    if (!width) return 4; // Default
    if (width < 640) return 2; // mobile
    if (width < 768) return 3; // tablet
    if (width < 1024) return 4; // desktop small
    if (width < 1280) return 5; // desktop medium
    return 6; // desktop large
  }, [width]);

  const rows = Math.ceil(photos.length / columns);
  const containerWidth = width ? Math.min(width - 32, 1200) : 800;
  const itemWidth = (containerWidth - (columns - 1) * GAP_SIZE) / columns;
  const itemHeight = itemWidth + 60; // Add space for photo info

  const gridData = useMemo(
    () => ({
      photos,
      columns,
      selectedPhotos,
      favorites,
      onTogglePhoto,
      onToggleFavorite,
      onViewPhoto,
      getSignedUrl,
    }),
    [
      photos,
      columns,
      selectedPhotos,
      favorites,
      onTogglePhoto,
      onToggleFavorite,
      onViewPhoto,
      getSignedUrl,
    ]
  );

  // Infinite scroll effect
  const handleScroll = useCallback(
    ({ scrollTop, scrollHeight, clientHeight }: any) => {
      if (loadMore && hasMore && !loading) {
        const threshold = 300; // pixels from bottom
        if (scrollHeight - scrollTop - clientHeight < threshold) {
          loadMore();
        }
      }
    },
    [loadMore, hasMore, loading]
  );

  if (photos.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center py-12 ${className}`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-500 dark:text-gray-400">
          No hay fotos disponibles
        </h3>
        <p className="max-w-md text-center text-sm text-gray-500">
          {loading
            ? 'Cargando fotos...'
            : 'Aún no se han subido fotos o no tienes fotos asignadas.'}
        </p>
      </div>
    );
  }

  const gridHeight = Math.min(600, rows * itemHeight + (rows - 1) * GAP_SIZE);

  return (
    <div className={`w-full ${className}`}>
      {/* Stats bar */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <div className="text-gray-500 dark:text-gray-400">
          <span className="font-medium">{photos.length}</span> fotos disponibles
          {favorites.size > 0 && (
            <span className="ml-3 text-red-600">
              • <span className="font-medium">{favorites.size}</span> favoritos
            </span>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <div className="font-medium text-purple-600">
            <span className="font-bold">{selectedPhotos.size}</span>{' '}
            seleccionadas
          </div>
          {selectedPhotos.size > 0 && (
            <button
              onClick={() => {
                // Clear all selections
                photos.forEach((photo) => {
                  if (selectedPhotos.has(photo.id)) {
                    onTogglePhoto(photo);
                  }
                });
              }}
              className="text-xs text-gray-500 transition-colors duration-200 hover:text-red-600"
            >
              Limpiar selección
            </button>
          )}
        </div>
      </div>

      {/* Virtual Grid */}
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        <Grid
          ref={gridRef}
          height={gridHeight}
          width={containerWidth}
          columnCount={columns}
          rowCount={rows}
          columnWidth={itemWidth}
          rowHeight={itemHeight}
          itemData={gridData}
          onScroll={handleScroll}
          overscanRowCount={2}
          className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        >
          {GridCell}
        </Grid>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center space-x-2 text-purple-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <span className="text-sm font-medium">Cargando más fotos...</span>
          </div>
        </div>
      )}

      {/* Load more button */}
      {hasMore && !loading && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={loadMore}
            className="rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-purple-700"
          >
            Cargar más fotos
          </button>
        </div>
      )}
    </div>
  );
}
