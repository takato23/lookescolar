'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

interface DragItem {
  id: string;
  type: 'event';
  data: any;
}

interface DragDropContextValue {
  draggedItem: DragItem | null;
  isDragging: boolean;
  dragOverId: string | null;
  startDrag: (item: DragItem) => void;
  endDrag: () => void;
  setDragOver: (id: string | null) => void;
  onReorder: (draggedId: string, targetId: string) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

interface DragDropProviderProps {
  children: React.ReactNode;
  onReorder: (draggedId: string, targetId: string) => void;
}

export function DragDropProvider({ children, onReorder }: DragDropProviderProps) {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const startDrag = useCallback((item: DragItem) => {
    setDraggedItem(item);
  }, []);

  const endDrag = useCallback(() => {
    if (draggedItem && dragOverId && draggedItem.id !== dragOverId) {
      onReorder(draggedItem.id, dragOverId);
    }
    setDraggedItem(null);
    setDragOverId(null);
  }, [draggedItem, dragOverId, onReorder]);

  const setDragOver = useCallback((id: string | null) => {
    setDragOverId(id);
  }, []);

  const value: DragDropContextValue = {
    draggedItem,
    isDragging: !!draggedItem,
    dragOverId,
    startDrag,
    endDrag,
    setDragOver,
    onReorder,
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
}

// Draggable wrapper component
interface DraggableProps {
  id: string;
  data: any;
  children: React.ReactNode;
  className?: string;
  handle?: boolean;
}

export function Draggable({ id, data, children, className, handle = false }: DraggableProps) {
  const { startDrag, endDrag, isDragging, draggedItem, dragOverId } = useDragDrop();

  const isDraggedItem = draggedItem?.id === id;
  const isDraggedOver = dragOverId === id;

  const handleDragStart = (e: React.DragEvent) => {
    startDrag({ id, type: 'event', data });
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image
    const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
    dragImage.style.transform = 'rotate(5deg)';
    dragImage.style.opacity = '0.8';
    e.dataTransfer.setDragImage(dragImage, 0, 0);
  };

  const handleDragEnd = () => {
    endDrag();
  };

  return (
    <div
      draggable={!handle}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        'transition-all duration-200',
        isDraggedItem && 'opacity-50 scale-95 transform rotate-2',
        isDraggedOver && !isDraggedItem && 'scale-105 ring-2 ring-blue-400 ring-opacity-50',
        isDragging && !isDraggedItem && 'hover:scale-102 hover:shadow-lg',
        className
      )}
    >
      {children}
    </div>
  );
}

// Drop zone component
interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  onDrop?: (draggedId: string, targetId: string) => void;
}

export function DropZone({ id, children, className, onDrop }: DropZoneProps) {
  const { setDragOver, draggedItem, isDragging } = useDragDrop();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the element
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem && onDrop) {
      onDrop(draggedItem.id, id);
    }
    setDragOver(null);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'transition-all duration-200',
        isDragging && 'ring-2 ring-dashed ring-gray-300 ring-opacity-50',
        className
      )}
    >
      {children}
    </div>
  );
}

// Drag handle component
interface DragHandleProps {
  className?: string;
}

export function DragHandle({ className }: DragHandleProps) {
  return (
    <div 
      className={cn(
        'cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity',
        'flex items-center justify-center p-2',
        className
      )}
    >
      <svg
        width="10"
        height="16"
        viewBox="0 0 10 16"
        className="fill-current"
      >
        <circle cx="2" cy="2" r="1" />
        <circle cx="6" cy="2" r="1" />
        <circle cx="2" cy="6" r="1" />
        <circle cx="6" cy="6" r="1" />
        <circle cx="2" cy="10" r="1" />
        <circle cx="6" cy="10" r="1" />
        <circle cx="2" cy="14" r="1" />
        <circle cx="6" cy="14" r="1" />
      </svg>
    </div>
  );
}