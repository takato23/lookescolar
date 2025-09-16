'use client';

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageIcon,
  StarIcon,
  VideoIcon,
  MoreVerticalIcon,
  EyeIcon,
  DownloadIcon,
  TrashIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { PhotoItem, ViewMode } from './types';
import { formatFileSize, formatDimensions } from '@/lib/utils/image';
import { COMPONENT_CONFIG } from '@/lib/config/ui.config';

interface PhotoGridDisplayProps {
  photos: PhotoItem[];
  selectedPhotos: Set<string>;
  viewMode: ViewMode;
  onPhotoSelect: (photoId: string) => void;
  onPhotoPreview: (photo: PhotoItem) => void;
  onPhotoDownload: (photo: PhotoItem) => void;
  onPhotoDelete: (photo: PhotoItem) => void;
  onToggleFavorite: (photo: PhotoItem) => void;
  loading?: boolean;
  className?: string;
}

const PhotoGridItem = memo(
  ({
    photo,
    isSelected,
    viewMode,
    onSelect,
    onPreview,
    onDownload,
    onDelete,
    onToggleFavorite,
  }: {
    photo: PhotoItem;
    isSelected: boolean;
    viewMode: ViewMode;
    onSelect: (photoId: string) => void;
    onPreview: (photo: PhotoItem) => void;
    onDownload: (photo: PhotoItem) => void;
    onDelete: (photo: PhotoItem) => void;
    onToggleFavorite: (photo: PhotoItem) => void;
  }) => {
    const handleCheckboxChange = useCallback(
      (checked: boolean) => {
        onSelect(photo.id);
      },
      [photo.id, onSelect]
    );

    const handlePreview = useCallback(() => {
      onPreview(photo);
    }, [photo, onPreview]);

    const handleDownload = useCallback(() => {
      onDownload(photo);
    }, [photo, onDownload]);

    const handleDelete = useCallback(() => {
      onDelete(photo);
    }, [photo, onDelete]);

    const handleToggleFavorite = useCallback(() => {
      onToggleFavorite(photo);
    }, [photo, onToggleFavorite]);

    if (viewMode === 'list') {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            'flex items-center gap-4 rounded-lg border p-4 transition-colors',
            'hover:bg-muted',
            isSelected && 'border-blue-200 bg-blue-50'
          )}
        >
          {/* Selection checkbox */}
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="flex-shrink-0"
          />

          {/* Thumbnail */}
          <div className="relative flex-shrink-0">
            <img
              src={photo.thumbnailUrl || photo.url}
              alt={photo.name}
              className="h-16 w-16 rounded border object-cover"
              loading="lazy"
            />
            {photo.type === 'video' && (
              <VideoIcon className="absolute inset-0 m-auto h-6 w-6 text-white drop-shadow" />
            )}
            {photo.tags?.includes('favorite') && (
              <StarIcon className="absolute -right-1 -top-1 h-4 w-4 fill-current text-yellow-500" />
            )}
          </div>

          {/* Photo info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{photo.name}</span>
              {photo.subjects && photo.subjects.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {photo.subjects.length} tagged
                </Badge>
              )}
            </div>

            <div className="mt-1 text-sm text-gray-500">
              {formatFileSize(photo.size)}
              {photo.metadata?.width && photo.metadata?.height && (
                <>
                  {' '}
                  •{' '}
                  {formatDimensions(
                    photo.metadata.width,
                    photo.metadata.height
                  )}
                </>
              )}
              {photo.metadata?.dateCreated && (
                <>
                  {' '}
                  • {new Date(photo.metadata.dateCreated).toLocaleDateString()}
                </>
              )}
            </div>

            {/* Tags */}
            {photo.tags && photo.tags.length > 0 && (
              <div className="mt-2 flex gap-1">
                {photo.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {photo.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{photo.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreview}
              className="h-8 w-8 p-0"
            >
              <EyeIcon className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePreview} className="gap-2">
                  <EyeIcon className="h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload} className="gap-2">
                  <DownloadIcon className="h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleToggleFavorite}
                  className="gap-2"
                >
                  <StarIcon className="h-4 w-4" />
                  {photo.tags?.includes('favorite')
                    ? 'Remove from favorites'
                    : 'Add to favorites'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="gap-2 text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      );
    }

    // Grid view
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={cn(
          'group relative aspect-square overflow-hidden rounded-lg border-2 transition-all',
          'hover:border-blue-300',
          isSelected
            ? 'border-blue-500 ring-2 ring-blue-200'
            : 'border-border'
        )}
      >
        {/* Selection checkbox */}
        <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            className="bg-white shadow-sm"
          />
        </div>

        {/* Favorite star */}
        {photo.tags?.includes('favorite') && (
          <div className="absolute right-2 top-2 z-10">
            <StarIcon className="h-5 w-5 fill-current text-yellow-500 drop-shadow" />
          </div>
        )}

        {/* Photo */}
        <div className="relative h-full w-full">
          <img
            src={photo.thumbnailUrl || photo.url}
            alt={photo.name}
            className="h-full w-full cursor-pointer object-cover"
            onClick={handlePreview}
            loading="lazy"
          />

          {photo.type === 'video' && (
            <VideoIcon className="absolute inset-0 m-auto h-8 w-8 text-white drop-shadow-lg" />
          )}

          {/* Upload progress overlay */}
          {photo.uploadProgress !== undefined && photo.uploadProgress < 100 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center text-white">
                <div className="h-1 w-16 rounded bg-white bg-opacity-30">
                  <div
                    className="h-full rounded bg-white transition-all duration-300"
                    style={{ width: `${photo.uploadProgress}%` }}
                  />
                </div>
                <span className="mt-2 block text-sm">
                  {Math.round(photo.uploadProgress)}%
                </span>
              </div>
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 opacity-0 transition-all duration-200 group-hover:bg-opacity-40 group-hover:opacity-100">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePreview}
                className="h-8 px-2"
              >
                <EyeIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                className="h-8 px-2"
              >
                <DownloadIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 text-white">
          <div className="truncate text-sm font-medium">{photo.name}</div>
          <div className="text-xs opacity-90">
            {formatFileSize(photo.size)}
            {photo.subjects && photo.subjects.length > 0 && (
              <> • {photo.subjects.length} tagged</>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

PhotoGridItem.displayName = 'PhotoGridItem';

const PhotoGridDisplayComponent = ({
  photos,
  selectedPhotos,
  viewMode,
  onPhotoSelect,
  onPhotoPreview,
  onPhotoDownload,
  onPhotoDelete,
  onToggleFavorite,
  loading = false,
  className,
}: PhotoGridDisplayProps) => {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <ImageIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-500">Loading photos...</p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <ImageIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-foreground">
            No photos found
          </h3>
          <p className="text-gray-500">Upload photos to get started</p>
        </div>
      </div>
    );
  }

  const containerClass =
    viewMode === 'grid'
      ? `grid gap-4 ${COMPONENT_CONFIG.PHOTO_GRID.COLUMNS.RESPONSIVE}`
      : 'space-y-2';

  return (
    <div className={cn(containerClass, className)}>
      <AnimatePresence>
        {photos.map((photo) => (
          <PhotoGridItem
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            viewMode={viewMode}
            onSelect={onPhotoSelect}
            onPreview={onPhotoPreview}
            onDownload={onPhotoDownload}
            onDelete={onPhotoDelete}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export const PhotoGridDisplay = memo(
  PhotoGridDisplayComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.photos.length === nextProps.photos.length &&
      prevProps.selectedPhotos.size === nextProps.selectedPhotos.size &&
      prevProps.viewMode === nextProps.viewMode &&
      prevProps.loading === nextProps.loading
    );
  }
);

PhotoGridDisplay.displayName = 'PhotoGridDisplay';
