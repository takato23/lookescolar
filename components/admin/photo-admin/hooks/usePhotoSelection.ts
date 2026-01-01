'use client';

import { useState, useCallback } from 'react';

interface SelectionState {
  selectedPhotos: Set<string>;
  isSelectionMode: boolean;
  lastSelectedIndex: number | null;
}

/**
 * Custom hook for managing photo selection state
 * Handles single, multiple, and range selection
 */
export function usePhotoSelection() {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null
  );

  const toggleSelection = useCallback((photoId: string, index?: number) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
    if (index !== undefined) {
      setLastSelectedIndex(index);
    }
  }, []);

  const selectPhoto = useCallback((photoId: string) => {
    setSelectedPhotos((prev) => new Set(prev).add(photoId));
  }, []);

  const deselectPhoto = useCallback((photoId: string) => {
    setSelectedPhotos((prev) => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  }, []);

  const selectAll = useCallback((photoIds: string[]) => {
    setSelectedPhotos(new Set(photoIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (!isSelectionMode) {
      clearSelection();
    }
  }, [isSelectionMode, clearSelection]);

  const selectRange = useCallback(
    (startIndex: number, endIndex: number, photos: { id: string }[]) => {
      const start = Math.min(startIndex, endIndex);
      const end = Math.max(startIndex, endIndex);

      setSelectedPhotos((prev) => {
        const newSet = new Set(prev);
        for (let i = start; i <= end; i++) {
          if (photos[i]) {
            newSet.add(photos[i].id);
          }
        }
        return newSet;
      });
      setLastSelectedIndex(end);
    },
    []
  );

  const selectionState: SelectionState = {
    selectedPhotos,
    isSelectionMode,
    lastSelectedIndex: lastSelectedIndex ?? null,
  };

  return {
    ...selectionState,
    toggleSelection,
    selectPhoto,
    deselectPhoto,
    selectAll,
    clearSelection,
    toggleSelectionMode,
    selectRange,
    setSelectedPhotos,
  };
}
















