import { useState, useCallback } from 'react';

interface DragDropResult<T> {
  draggedItem: T | null;
  dragOverItem: T | null;
  isDragging: boolean;
  handleDragStart: (item: T) => void;
  handleDragOver: (item: T) => void;
  handleDragLeave: () => void;
  handleDrop: (targetItem: T, onDrop: (draggedItem: T, targetItem: T) => void) => void;
  handleDragEnd: () => void;
}

export function useDragDrop<T>(): DragDropResult<T> {
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [dragOverItem, setDragOverItem] = useState<T | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((item: T) => {
    setDraggedItem(item);
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((item: T) => {
    setDragOverItem(item);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverItem(null);
  }, []);

  const handleDrop = useCallback((targetItem: T, onDrop: (draggedItem: T, targetItem: T) => void) => {
    if (draggedItem && draggedItem !== targetItem) {
      onDrop(draggedItem, targetItem);
    }
    setDragOverItem(null);
  }, [draggedItem]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDragOverItem(null);
    setIsDragging(false);
  }, []);

  return {
    draggedItem,
    dragOverItem,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
}