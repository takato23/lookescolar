'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { PhotoModal } from '@/components/gallery/PhotoModal';
import { Photo } from '@/lib/services/photo.service';

interface LibraryItem {
  type: 'photo' | 'folder';
  id: string;
  data: Photo | { id: string; name: string };
}

interface LibraryPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPhotoId: string | null;
  allItems: LibraryItem[];
  onSelectionChange?: (photoIds: string[]) => void;
  selectedPhotoIds?: string[];
  className?: string;
}

export function LibraryPhotoModal({
  isOpen,
  onClose,
  selectedPhotoId,
  allItems,
  onSelectionChange,
  selectedPhotoIds = [],
  className,
}: LibraryPhotoModalProps) {
  // Filter to get only photos from the items
  const photos = useMemo(() => {
    return allItems
      .filter((item) => item.type === 'photo')
      .map((item) => item.data as Photo);
  }, [allItems]);

  // Find current photo and its index
  const currentPhotoIndex = useMemo(() => {
    if (!selectedPhotoId) return -1;
    return photos.findIndex((photo) => photo.id === selectedPhotoId);
  }, [photos, selectedPhotoId]);

  const currentPhoto = useMemo(() => {
    if (currentPhotoIndex === -1) return null;
    return photos[currentPhotoIndex];
  }, [photos, currentPhotoIndex]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (currentPhotoIndex > 0 && onSelectionChange) {
      const prevPhoto = photos[currentPhotoIndex - 1];
      onSelectionChange([prevPhoto.id]);
    }
  }, [currentPhotoIndex, photos, onSelectionChange]);

  const handleNext = useCallback(() => {
    if (currentPhotoIndex < photos.length - 1 && onSelectionChange) {
      const nextPhoto = photos[currentPhotoIndex + 1];
      onSelectionChange([nextPhoto.id]);
    }
  }, [currentPhotoIndex, photos, onSelectionChange]);

  // Selection handlers
  const isCurrentPhotoSelected = useMemo(() => {
    return selectedPhotoId ? selectedPhotoIds.includes(selectedPhotoId) : false;
  }, [selectedPhotoId, selectedPhotoIds]);

  const handleToggleSelection = useCallback(() => {
    if (!selectedPhotoId || !onSelectionChange) return;

    if (selectedPhotoIds.includes(selectedPhotoId)) {
      // Remove from selection
      onSelectionChange(
        selectedPhotoIds.filter((id) => id !== selectedPhotoId)
      );
    } else {
      // Add to selection
      onSelectionChange([...selectedPhotoIds, selectedPhotoId]);
    }
  }, [selectedPhotoId, selectedPhotoIds, onSelectionChange]);

  // Keyboard shortcuts for library-specific actions
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case ' ': // Spacebar to toggle selection
          event.preventDefault();
          handleToggleSelection();
          break;
        case 'a': // 'a' to select all visible photos
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (onSelectionChange) {
              onSelectionChange(photos.map((photo) => photo.id));
            }
          }
          break;
        case 'Escape':
          // Close modal but don't clear selection
          event.preventDefault();
          onClose();
          break;
        case 'Delete':
        case 'Backspace':
          // Handle delete in the future (could trigger delete dialog)
          event.preventDefault();
          // TODO: Implement delete functionality
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleToggleSelection, onSelectionChange, photos, onClose]);

  if (!currentPhoto || currentPhotoIndex === -1) {
    return null;
  }

  return (
    <PhotoModal
      photo={{
        id: currentPhoto.id,
        storage_path: currentPhoto.storage_path,
        width: currentPhoto.width,
        height: currentPhoto.height,
        created_at: currentPhoto.created_at,
        filename: currentPhoto.original_filename,
      }}
      isOpen={isOpen}
      onClose={onClose}
      onPrevious={handlePrevious}
      onNext={handleNext}
      currentIndex={currentPhotoIndex + 1}
      totalPhotos={photos.length}
      isSelected={isCurrentPhotoSelected}
      onToggleSelection={handleToggleSelection}
      familyMode={false}
    />
  );
}
