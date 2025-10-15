'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  Download,
  MoreVertical,
  Check,
  Grid3X3,
  List,
  Search,
  Filter,
  Eye,
  Tag,
  Star,
  Clock,
  FileImage,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Share2,
  Trash2,
  Copy,
  Move,
  ChevronLeft,
  ChevronRight,
  X,
  Info,
  MapPin,
  Calendar,
  User,
  Hash,
  Monitor,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

interface Photo {
  id: string;
  storage_path: string;
  original_name: string;
  size_bytes: number;
  width: number;
  height: number;
  created_at: string;
  signed_url?: string;
  tagged_subjects?: { name: string; grade: string }[];
  metadata?: {
    camera?: string;
    lens?: string;
    iso?: number;
    aperture?: string;
    shutter_speed?: string;
    focal_length?: string;
    taken_at?: string;
  };
}

interface ProGalleryProps {
  photos: Photo[];
  loading?: boolean;
  selectedPhotos?: Set<string>;
  onPhotoSelect?: (selectedPhotos: Set<string>) => void;
  onPhotoClick?: (photo: Photo) => void;
  eventId?: string;
}

type ViewMode = 'grid' | 'list' | 'masonry';
type SortMode = 'name' | 'date' | 'size' | 'tagged' | 'rating';
type FilterMode = 'all' | 'tagged' | 'untagged' | 'favorites';
type GridSize = 2 | 3 | 4 | 5 | 6 | 8;

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function ProGallery({
  photos,
  loading = false,
  selectedPhotos: externalSelectedPhotos,
  onPhotoSelect,
  onPhotoClick,
  eventId,
}: ProGalleryProps) {
  const [internalSelectedPhotos, setInternalSelectedPhotos] = useState<
    Set<string>
  >(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [gridSize, setGridSize] = useState<GridSize>(4);
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Use external selection state if provided, otherwise use internal state
  const selectedPhotos = externalSelectedPhotos ?? internalSelectedPhotos;
  const setSelectedPhotos = onPhotoSelect ?? setInternalSelectedPhotos;

  // Filter and sort photos
  const filteredAndSortedPhotos = photos
    .filter((photo) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = photo.original_name
          .toLowerCase()
          .includes(searchLower);
        const matchesSubjects = photo.tagged_subjects?.some(
          (s) =>
            s.name.toLowerCase().includes(searchLower) ||
            s.grade.toLowerCase().includes(searchLower)
        );
        if (!matchesName && !matchesSubjects) return false;
      }

      // Status filter
      switch (filterMode) {
        case 'tagged':
          return photo.tagged_subjects && photo.tagged_subjects.length > 0;
        case 'untagged':
          return !photo.tagged_subjects || photo.tagged_subjects.length === 0;
        case 'favorites':
          return favorites.has(photo.id);
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.original_name.localeCompare(b.original_name);
        case 'date':
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case 'size':
          return b.size_bytes - a.size_bytes;
        case 'tagged':
          const aTagged = a.tagged_subjects?.length || 0;
          const bTagged = b.tagged_subjects?.length || 0;
          return bTagged - aTagged;
        case 'rating':
          return favorites.has(b.id) ? 1 : favorites.has(a.id) ? -1 : 0;
        default:
          return 0;
      }
    });

  // Selection handlers
  const togglePhotoSelection = useCallback(
    (photoId: string, index: number, isShiftClick = false) => {
      const newSelection = new Set(selectedPhotos);

      if (isShiftClick && lastSelectedIndex !== null && isSelectionMode) {
        // Range selection with Shift+Click
        const startIndex = Math.min(lastSelectedIndex, index);
        const endIndex = Math.max(lastSelectedIndex, index);

        for (let i = startIndex; i <= endIndex; i++) {
          if (filteredAndSortedPhotos[i]) {
            newSelection.add(filteredAndSortedPhotos[i].id);
          }
        }
      } else {
        // Single selection
        if (newSelection.has(photoId)) {
          newSelection.delete(photoId);
        } else {
          newSelection.add(photoId);
        }
      }

      setSelectedPhotos(newSelection);
      setLastSelectedIndex(index);
      setIsSelectionMode(newSelection.size > 0);
    },
    [
      selectedPhotos,
      setSelectedPhotos,
      lastSelectedIndex,
      isSelectionMode,
      filteredAndSortedPhotos,
    ]
  );

  const selectAll = useCallback(() => {
    setSelectedPhotos(new Set(filteredAndSortedPhotos.map((p) => p.id)));
    setIsSelectionMode(true);
  }, [filteredAndSortedPhotos, setSelectedPhotos]);

  const clearSelection = useCallback(() => {
    setSelectedPhotos(new Set());
    setIsSelectionMode(false);
    setLastSelectedIndex(null);
  }, [setSelectedPhotos]);

  const selectRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const newSelection = new Set(selectedPhotos);
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);

      for (let i = start; i <= end; i++) {
        if (filteredAndSortedPhotos[i]) {
          newSelection.add(filteredAndSortedPhotos[i].id);
        }
      }

      setSelectedPhotos(newSelection);
      setIsSelectionMode(true);
    },
    [selectedPhotos, setSelectedPhotos, filteredAndSortedPhotos]
  );

  // Favorite handlers
  const toggleFavorite = useCallback((photoId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(photoId)) {
        newFavorites.delete(photoId);
      } else {
        newFavorites.add(photoId);
      }
      return newFavorites;
    });
  }, []);

  // Lightbox handlers
  const openLightbox = useCallback((photoIndex: number) => {
    setLightboxIndex(photoIndex);
    setShowLightbox(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setShowLightbox(false);
  }, []);

  const navigateLightbox = useCallback(
    (direction: 'prev' | 'next') => {
      if (direction === 'prev') {
        setLightboxIndex((prev) =>
          prev > 0 ? prev - 1 : filteredAndSortedPhotos.length - 1
        );
      } else {
        setLightboxIndex((prev) =>
          prev < filteredAndSortedPhotos.length - 1 ? prev + 1 : 0
        );
      }
    },
    [filteredAndSortedPhotos.length]
  );

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onOpenCommandPalette: () => {
      // Command palette handled by parent component
    },
  });

  // Photo click handler
  const handlePhotoClick = useCallback(
    (photo: Photo, index: number, event: React.MouseEvent) => {
      if (event.shiftKey) {
        event.preventDefault();
        togglePhotoSelection(photo.id, index, true);
      } else if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        togglePhotoSelection(photo.id, index);
      } else if (isSelectionMode) {
        event.preventDefault();
        togglePhotoSelection(photo.id, index);
      } else {
        onPhotoClick?.(photo) || openLightbox(index);
      }
    },
    [togglePhotoSelection, isSelectionMode, onPhotoClick, openLightbox]
  );

  // Grid size classes
  const getGridClasses = () => {
    const gridClasses = {
      2: 'grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      5: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
      6: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
      8: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8',
    };
    return gridClasses[gridSize];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-muted h-16 animate-pulse rounded-lg" />
        <div className={cn('grid gap-4', getGridClasses())}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-muted aspect-square animate-pulse rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="bg-muted mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl">
          <Camera className="text-gray-500 dark:text-gray-400 h-8 w-8" />
        </div>
        <h3 className="text-foreground mb-3 text-xl font-semibold">
          No hay fotos en este evento
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mx-auto mb-8 max-w-md">
          Sube tus primeras fotos para comenzar a organizar tu galería
          profesional.
        </p>
        <Button>
          <Camera className="mr-2 h-4 w-4" />
          Subir Fotos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                {filteredAndSortedPhotos.length} foto
                {filteredAndSortedPhotos.length !== 1 ? 's' : ''}
                {searchTerm || filterMode !== 'all'
                  ? ` filtrada${filteredAndSortedPhotos.length !== 1 ? 's' : ''}`
                  : ''}
              </CardTitle>

              {selectedPhotos.size > 0 && (
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  {selectedPhotos.size} seleccionada
                  {selectedPhotos.size !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="text-gray-500 dark:text-gray-400 absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar fotos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-background w-64 rounded-lg border py-2 pl-10 pr-4 text-sm"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 transform p-1"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Filter */}
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as FilterMode)}
                className="bg-background rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Todas</option>
                <option value="tagged">Etiquetadas</option>
                <option value="untagged">Sin etiquetar</option>
                <option value="favorites">Favoritas</option>
              </select>

              {/* Sort */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-background rounded-lg border px-3 py-2 text-sm"
              >
                <option value="date">Fecha</option>
                <option value="name">Nombre</option>
                <option value="size">Tamaño</option>
                <option value="tagged">Etiquetadas</option>
                <option value="rating">Favoritas</option>
              </select>

              {/* View mode */}
              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Grid size slider */}
              {viewMode === 'grid' && (
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <ZoomOut className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={gridSize}
                    onChange={(e) =>
                      setGridSize(Number(e.target.value) as GridSize)
                    }
                    className="w-20"
                  />
                  <ZoomIn className="text-gray-500 dark:text-gray-400 h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Selection toolbar */}
        {selectedPhotos.size > 0 && (
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 p-4">
              <div className="flex items-center gap-4">
                <span className="font-medium text-primary-900">
                  {selectedPhotos.size} foto
                  {selectedPhotos.size !== 1 ? 's' : ''} seleccionada
                  {selectedPhotos.size !== 1 ? 's' : ''}
                </span>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Limpiar selección
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Tag className="mr-2 h-4 w-4" />
                  Etiquetar
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
                <Button size="sm" variant="outline">
                  <Move className="mr-2 h-4 w-4" />
                  Mover
                </Button>
                <Button size="sm" variant="danger">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Gallery */}
      <div ref={galleryRef}>
        {viewMode === 'grid' ? (
          <div className={cn('grid gap-3', getGridClasses())}>
            {filteredAndSortedPhotos.map((photo, index) => (
              <PhotoGridItem
                key={photo.id}
                photo={photo}
                index={index}
                isSelected={selectedPhotos.has(photo.id)}
                isFavorite={favorites.has(photo.id)}
                onClick={handlePhotoClick}
                onFavoriteToggle={toggleFavorite}
                gridSize={gridSize}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedPhotos.map((photo, index) => (
              <PhotoListItem
                key={photo.id}
                photo={photo}
                index={index}
                isSelected={selectedPhotos.has(photo.id)}
                isFavorite={favorites.has(photo.id)}
                onClick={handlePhotoClick}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions bar */}
      <div className="text-gray-500 dark:text-gray-400 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Seleccionar todo ({filteredAndSortedPhotos.length})
          </Button>
          <span>•</span>
          <span>
            Total:{' '}
            {formatFileSize(photos.reduce((sum, p) => sum + p.size_bytes, 0))}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>Usa Shift+Click para selección múltiple</span>
          <span>•</span>
          <span>Usa Cmd/Ctrl+Click para selección individual</span>
        </div>
      </div>

      {/* Lightbox */}
      {showLightbox && (
        <PhotoLightbox
          photos={filteredAndSortedPhotos}
          currentIndex={lightboxIndex}
          onClose={closeLightbox}
          onNavigate={navigateLightbox}
          showMetadata={showMetadata}
          onToggleMetadata={() => setShowMetadata(!showMetadata)}
        />
      )}
    </div>
  );
}

// Grid item component
interface PhotoGridItemProps {
  photo: Photo;
  index: number;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: (photo: Photo, index: number, event: React.MouseEvent) => void;
  onFavoriteToggle: (photoId: string) => void;
  gridSize: GridSize;
}

function PhotoGridItem({
  photo,
  index,
  isSelected,
  isFavorite,
  onClick,
  onFavoriteToggle,
  gridSize,
}: PhotoGridItemProps) {
  const showDetails = gridSize <= 4;

  return (
    <div
      className={cn(
        'bg-muted group relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-all duration-200',
        isSelected && 'ring-primary ring-2 ring-offset-2'
      )}
      onClick={(e) => onClick(photo, index, e)}
    >
      {/* Image */}
      {photo.signed_url ? (
        <img
          src={photo.signed_url}
          alt={photo.original_name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="from-muted to-muted-foreground/10 flex h-full w-full items-center justify-center bg-gradient-to-br">
          <Camera className="text-gray-500 dark:text-gray-400 h-8 w-8" />
        </div>
      )}

      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent',
          'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          isSelected && 'bg-primary/20 opacity-100'
        )}
      >
        {/* Selection indicator */}
        <div className="absolute right-3 top-3">
          <div
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border-2 border-white transition-all',
              isSelected ? 'bg-primary border-primary' : 'bg-white/20'
            )}
          >
            {isSelected && <Check className="h-4 w-4 text-white" />}
          </div>
        </div>

        {/* Favorite star */}
        <button
          className="absolute left-3 top-3 rounded-full bg-white/20 p-1 transition-colors hover:bg-white/30"
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle(photo.id);
          }}
        >
          <Star
            className={cn(
              'h-4 w-4 transition-colors',
              isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-white'
            )}
          />
        </button>

        {/* Tags */}
        {photo.tagged_subjects && photo.tagged_subjects.length > 0 && (
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-green-400" />
              <span className="text-xs font-medium text-green-400">
                {photo.tagged_subjects.length}
              </span>
            </div>
          </div>
        )}

        {/* File info */}
        {showDetails && (
          <div className="absolute bottom-3 right-3 text-right">
            <p className="max-w-24 truncate text-xs font-medium text-white">
              {photo.original_name}
            </p>
            <p className="text-xs text-white/80">
              {formatFileSize(photo.size_bytes)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// List item component
interface PhotoListItemProps {
  photo: Photo;
  index: number;
  isSelected: boolean;
  isFavorite: boolean;
  onClick: (photo: Photo, index: number, event: React.MouseEvent) => void;
  onFavoriteToggle: (photoId: string) => void;
}

function PhotoListItem({
  photo,
  index,
  isSelected,
  isFavorite,
  onClick,
  onFavoriteToggle,
}: PhotoListItemProps) {
  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all duration-200',
        isSelected && 'ring-primary bg-primary-50 ring-2 ring-offset-2'
      )}
      onClick={(e) => onClick(photo, index, e)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Thumbnail */}
          <div className="flex-shrink-0">
            {photo.signed_url ? (
              <img
                src={photo.signed_url}
                alt={photo.original_name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-lg">
                <Camera className="text-gray-500 dark:text-gray-400 h-6 w-6" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-foreground truncate font-medium">
                  {photo.original_name}
                </p>
                <div className="text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-3 text-sm">
                  <span>{formatFileSize(photo.size_bytes)}</span>
                  <span>•</span>
                  <span>
                    {photo.width} × {photo.height}
                  </span>
                  <span>•</span>
                  <span>{formatDate(photo.created_at)}</span>
                </div>
                {photo.tagged_subjects && photo.tagged_subjects.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-600" />
                    <div className="flex gap-1">
                      {photo.tagged_subjects.slice(0, 3).map((subject, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
                        >
                          {subject.name.split(' ')[0]}
                        </span>
                      ))}
                      {photo.tagged_subjects.length > 3 && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                          +{photo.tagged_subjects.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Favorite */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFavoriteToggle(photo.id);
                  }}
                >
                  <Star
                    className={cn(
                      'h-4 w-4',
                      isFavorite
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground'
                    )}
                  />
                </Button>

                {/* Selection */}
                <div
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground'
                  )}
                >
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lightbox component
interface PhotoLightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  showMetadata: boolean;
  onToggleMetadata: () => void;
}

function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
  showMetadata,
  onToggleMetadata,
}: PhotoLightboxProps) {
  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onNavigate('prev');
          break;
        case 'ArrowRight':
          onNavigate('next');
          break;
        case 'i':
          onToggleMetadata();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNavigate, onToggleMetadata]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      {/* Close button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-4 z-10 text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute left-4 top-1/2 z-10 -translate-y-1/2 transform text-white hover:bg-white/10"
        onClick={() => onNavigate('prev')}
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="absolute right-4 top-1/2 z-10 -translate-y-1/2 transform text-white hover:bg-white/10"
        onClick={() => onNavigate('next')}
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Image */}
      <div className="flex max-h-full max-w-full items-center justify-center p-8">
        {currentPhoto.signed_url ? (
          <img
            src={currentPhoto.signed_url}
            alt={currentPhoto.original_name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex h-96 w-96 items-center justify-center rounded-lg bg-gray-800">
            <Camera className="h-16 w-16 text-gray-400" />
          </div>
        )}
      </div>

      {/* Info bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">{currentPhoto.original_name}</h3>
            <p className="text-sm text-white/70">
              {currentIndex + 1} de {photos.length} •{' '}
              {formatFileSize(currentPhoto.size_bytes)} • {currentPhoto.width} ×{' '}
              {currentPhoto.height}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleMetadata}>
              <Info className="mr-2 h-4 w-4" />
              {showMetadata ? 'Ocultar info' : 'Mostrar info'}
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata panel */}
      {showMetadata && (
        <div className="absolute bottom-16 right-4 top-16 w-80 overflow-y-auto rounded-lg bg-black/90 p-6 backdrop-blur-sm">
          <h3 className="mb-4 font-semibold text-white">
            Información de la foto
          </h3>

          <div className="space-y-4 text-sm text-white/80">
            <div>
              <p className="font-medium text-white">Archivo</p>
              <p>{currentPhoto.original_name}</p>
              <p>{formatFileSize(currentPhoto.size_bytes)}</p>
            </div>

            <div>
              <p className="font-medium text-white">Dimensiones</p>
              <p>
                {currentPhoto.width} × {currentPhoto.height} px
              </p>
            </div>

            <div>
              <p className="font-medium text-white">Fecha</p>
              <p>{formatDate(currentPhoto.created_at)}</p>
            </div>

            {currentPhoto.tagged_subjects &&
              currentPhoto.tagged_subjects.length > 0 && (
                <div>
                  <p className="font-medium text-white">Etiquetado</p>
                  <div className="mt-2 space-y-1">
                    {currentPhoto.tagged_subjects.map((subject, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{subject.name}</span>
                        <span className="text-white/60">({subject.grade})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {currentPhoto.metadata && (
              <div>
                <p className="font-medium text-white">EXIF</p>
                <div className="mt-2 space-y-1">
                  {currentPhoto.metadata.camera && (
                    <p>
                      <Camera className="mr-2 inline h-4 w-4" />
                      {currentPhoto.metadata.camera}
                    </p>
                  )}
                  {currentPhoto.metadata.lens && (
                    <p>{currentPhoto.metadata.lens}</p>
                  )}
                  {currentPhoto.metadata.iso && (
                    <p>ISO {currentPhoto.metadata.iso}</p>
                  )}
                  {currentPhoto.metadata.aperture && (
                    <p>f/{currentPhoto.metadata.aperture}</p>
                  )}
                  {currentPhoto.metadata.shutter_speed && (
                    <p>{currentPhoto.metadata.shutter_speed}s</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
