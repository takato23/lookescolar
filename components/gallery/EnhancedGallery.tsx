/**
 * Enhanced Gallery Component
 *
 * Feature-rich gallery with optimized UX:
 * - Touch gestures for mobile
 * - Lazy loading with optimized images
 * - Quick actions and feedback
 * - Responsive grid layout
 * - Accessibility features
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { GalleryImage } from '@/components/ui/OptimizedImage';
import {
  Swipeable,
  LongPress,
  PullToRefresh,
} from '@/components/ui/TouchGestures';
import {
  PhotoActionFeedback,
  EmptyState,
  QuickActions,
  ConfirmationDialog,
} from '@/components/ui/FeedbackComponents';
import { LoadingGallery, StepIndicator } from '@/components/ui/LoadingStates';
import {
  Heart,
  ShoppingCart,
  Eye,
  Share2,
  Download,
  Filter,
  Grid3X3,
  List,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Photo {
  id: string;
  filename: string;
  preview_url: string;
  size: number;
  width: number;
  height: number;
  selected?: boolean;
  favorited?: boolean;
  viewed?: boolean;
}

interface EnhancedGalleryProps {
  photos: Photo[];
  isLoading?: boolean;
  mode?: 'view' | 'select' | 'cart';
  allowMultiSelect?: boolean;
  selectedPhotos?: string[];
  onPhotoSelect?: (photoId: string, isSelected: boolean) => void;
  onPhotoView?: (photoId: string) => void;
  onPhotoFavorite?: (photoId: string, isFavorited: boolean) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'date' | 'name' | 'size';

export function EnhancedGallery({
  photos,
  isLoading = false,
  mode = 'view',
  allowMultiSelect = false,
  selectedPhotos = [],
  onPhotoSelect,
  onPhotoView,
  onPhotoFavorite,
  onRefresh,
  className,
}: EnhancedGalleryProps) {
  // View states
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Action feedback
  const [actionFeedback, setActionFeedback] = useState<{
    action: 'add' | 'remove' | 'view' | 'download';
    photoName: string;
  }> | null>(null);

  // Confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Filter and sort photos
  const filteredPhotos = useMemo(() => {
    const filtered = photos.filter((photo) =>
      photo.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort photos
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename);
        case 'size':
          return b.size - a.size;
        case 'date':
        default:
          return (
            new Date(b.filename).getTime() - new Date(a.filename).getTime()
          );
      }
    });

    return filtered;
  }, [photos, searchQuery, sortBy]);

  // Handle photo selection with feedback
  const handlePhotoSelect = useCallback(
    (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      const isCurrentlySelected = selectedPhotos.includes(photoId);
      const newSelectionState = !isCurrentlySelected;

      onPhotoSelect?.(photoId, newSelectionState);

      // Show feedback
      setActionFeedback({
        action: newSelectionState ? 'add' : 'remove',
        photoName: photo.filename,
      });

      // Clear feedback after delay
      setTimeout(() => setActionFeedback(null), 3000);
    },
    [photos, selectedPhotos, onPhotoSelect]
  );

  // Handle photo view
  const handlePhotoView = useCallback(
    (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      onPhotoView?.(photoId);

      setActionFeedback({
        action: 'view',
        photoName: photo.filename,
      });

      setTimeout(() => setActionFeedback(null), 2000);
    },
    [photos, onPhotoView]
  );

  // Handle photo favorite toggle
  const handlePhotoFavorite = useCallback(
    (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      const newFavoritedState = !photo.favorited;
      onPhotoFavorite?.(photoId, newFavoritedState);
    },
    [photos, onPhotoFavorite]
  );

  // Handle long press for context menu
  const handlePhotoLongPress = useCallback(
    (photoId: string) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;

      // Show quick actions or context menu
      // For now, just favorite the photo
      handlePhotoFavorite(photoId);
    },
    [photos, handlePhotoFavorite]
  );

  // Quick actions for selected photos
  const quickActions = useMemo(() => {
    const selectedCount = selectedPhotos.length;

    return [
      {
        icon: <Heart className="h-5 w-5" />,
        label: `Favoritos (${selectedCount})`,
        onClick: () => {
          selectedPhotos.forEach((photoId) => handlePhotoFavorite(photoId));
        },
        disabled: selectedCount === 0,
      },
      {
        icon: <Share2 className="h-5 w-5" />,
        label: 'Compartir',
        onClick: () => {
          // Implement share functionality
          console.log('Sharing photos:', selectedPhotos);
        },
        disabled: selectedCount === 0,
      },
      {
        icon: <Download className="h-5 w-5" />,
        label: 'Descargar',
        onClick: () => {
          if (selectedCount > 5) {
            setConfirmDialog({
              isOpen: true,
              title: 'Descargar múltiples fotos',
              description: `¿Estás seguro de que quieres descargar ${selectedCount} fotos? Esto puede tardar varios minutos.`,
              onConfirm: () => {
                // Implement download functionality
                console.log('Downloading photos:', selectedPhotos);
                setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
              },
            });
          } else {
            // Direct download for few photos
            console.log('Downloading photos:', selectedPhotos);
          }
        },
        disabled: selectedCount === 0,
      },
      {
        icon: <ShoppingCart className="h-5 w-5" />,
        label: 'Agregar al carrito',
        onClick: () => {
          selectedPhotos.forEach((photoId) => handlePhotoSelect(photoId));
        },
        disabled: selectedCount === 0 || mode !== 'select',
      },
    ];
  }, [selectedPhotos, handlePhotoFavorite, handlePhotoSelect, mode]);

  // Render empty state
  if (!isLoading && filteredPhotos.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={<Grid3X3 className="h-16 w-16" />}
          title={
            searchQuery ? 'No se encontraron fotos' : 'No hay fotos disponibles'
          }
          description={
            searchQuery
              ? `No encontramos fotos que coincidan con "${searchQuery}"`
              : 'Aún no se han subido fotos a esta galería'
          }
          action={
            searchQuery
              ? {
                  label: 'Limpiar búsqueda',
                  onClick: () => setSearchQuery(''),
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Buscar fotos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid3X3 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center space-x-4 rounded-lg bg-gray-50 p-3">
            <span className="text-sm font-medium">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded border px-2 py-1 text-sm"
            >
              <option value="date">Fecha</option>
              <option value="name">Nombre</option>
              <option value="size">Tamaño</option>
            </select>
          </div>
        )}

        {/* Results info */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredPhotos.length} foto{filteredPhotos.length !== 1 ? 's' : ''}
            {searchQuery &&
              ` encontrada${filteredPhotos.length !== 1 ? 's' : ''}`}
          </span>
          {selectedPhotos.length > 0 && (
            <span className="text-primary font-medium">
              {selectedPhotos.length} seleccionada
              {selectedPhotos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {mode === 'select' && selectedPhotos.length > 0 && (
        <QuickActions actions={quickActions} />
      )}

      {/* Gallery Content */}
      <PullToRefresh onRefresh={onRefresh || (async () => {})}>
        {isLoading ? (
          <LoadingGallery count={12} />
        ) : (
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6'
                : 'space-y-3'
            )}
          >
            {filteredPhotos.map((photo) => (
              <LongPress
                key={photo.id}
                onLongPress={() => handlePhotoLongPress(photo.id)}
              >
                {viewMode === 'grid' ? (
                  <GalleryImage
                    src={photo.preview_url}
                    alt={photo.filename}
                    isSelected={selectedPhotos.includes(photo.id)}
                    isSelectable={mode === 'select'}
                    onSelect={() => handlePhotoSelect(photo.id)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex items-center space-x-3 rounded-lg border bg-white p-3">
                    <div className="flex-shrink-0">
                      <GalleryImage
                        src={photo.preview_url}
                        alt={photo.filename}
                        isSelected={selectedPhotos.includes(photo.id)}
                        isSelectable={mode === 'select'}
                        onSelect={() => handlePhotoSelect(photo.id)}
                        containerClassName="w-16 h-16"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {photo.filename}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(photo.size / 1024 / 1024).toFixed(1)} MB •{' '}
                        {photo.width}x{photo.height}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePhotoFavorite(photo.id)}
                        className={cn(photo.favorited && 'text-red-500')}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePhotoView(photo.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </LongPress>
            ))}
          </div>
        )}
      </PullToRefresh>

      {/* Action Feedback */}
      {actionFeedback && (
        <PhotoActionFeedback
          action={actionFeedback.action}
          photoName={actionFeedback.photoName}
          onUndo={() => {
            if (
              actionFeedback.action === 'add' ||
              actionFeedback.action === 'remove'
            ) {
              const photoId = photos.find(
                (p) => p.filename === actionFeedback.photoName
              )?.id;
              if (photoId) {
                handlePhotoSelect(photoId);
              }
            }
            setActionFeedback(null);
          }}
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() =>
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
}

export default EnhancedGallery;
