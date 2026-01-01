/**
 * Draggable Widget Grid for Dashboard
 * Allows users to reorder and customize their dashboard layout
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  Eye,
  EyeOff,
  Settings,
  RotateCcw,
  Check,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Widget {
  id: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  visible: boolean;
  order: number;
}

interface SortableWidgetProps {
  widget: Widget;
  children: React.ReactNode;
  isEditMode: boolean;
  onToggleVisibility: (id: string) => void;
  onChangeSize: (id: string, size: Widget['size']) => void;
}

function SortableWidget({
  widget,
  children,
  isEditMode,
  onToggleVisibility,
  onChangeSize,
}: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 lg:col-span-2',
    large: 'col-span-1 lg:col-span-2 xl:col-span-3',
    full: 'col-span-full',
  };

  if (!widget.visible && !isEditMode) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        sizeClasses[widget.size],
        isDragging && 'z-50 opacity-50',
        !widget.visible && 'opacity-50',
        'relative transition-all duration-300'
      )}
    >
      {/* Edit mode overlay */}
      {isEditMode && (
        <div className="absolute -inset-1 z-10 rounded-3xl border-2 border-dashed border-violet-400/50 bg-violet-500/5 pointer-events-none" />
      )}

      {/* Drag handle and controls */}
      {isEditMode && (
        <div className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-700"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Size toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700">
                {widget.size === 'small' || widget.size === 'medium' ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" sideOffset={4}>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'small')}>
                <span className={cn(widget.size === 'small' && 'font-semibold')}>
                  Pequeño
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'medium')}>
                <span className={cn(widget.size === 'medium' && 'font-semibold')}>
                  Mediano
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'large')}>
                <span className={cn(widget.size === 'large' && 'font-semibold')}>
                  Grande
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeSize(widget.id, 'full')}>
                <span className={cn(widget.size === 'full' && 'font-semibold')}>
                  Ancho completo
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Visibility toggle */}
          <button
            onClick={() => onToggleVisibility(widget.id)}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            {widget.visible ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Widget content */}
      <div
        className={cn(
          'h-full transition-all duration-300',
          isEditMode && 'pointer-events-none'
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface DraggableWidgetGridProps {
  widgets: Widget[];
  onWidgetsChange: (widgets: Widget[]) => void;
  children: (widget: Widget) => React.ReactNode;
  storageKey?: string;
  isEditMode?: boolean;
  onEditModeChange?: (next: boolean) => void;
  showIdleControls?: boolean;
}

export function DraggableWidgetGrid({
  widgets: initialWidgets,
  onWidgetsChange,
  children,
  storageKey = 'dashboard-widgets',
  isEditMode: isEditModeProp,
  onEditModeChange,
  showIdleControls = true,
}: DraggableWidgetGridProps) {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [isEditModeInternal, setIsEditModeInternal] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const isEditMode =
    typeof isEditModeProp === 'boolean' ? isEditModeProp : isEditModeInternal;

  const setEditMode = useCallback(
    (next: boolean) => {
      if (onEditModeChange) {
        onEditModeChange(next);
        return;
      }
      setIsEditModeInternal(next);
    },
    [onEditModeChange]
  );

  // Load saved layout from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedWidgets = JSON.parse(saved) as Widget[];
        // Merge saved preferences with current widgets
        const merged = initialWidgets.map((w) => {
          const saved = savedWidgets.find((s) => s.id === w.id);
          return saved ? { ...w, ...saved } : w;
        });
        merged.sort((a, b) => a.order - b.order);
        setWidgets(merged);
      }
    } catch {
      // Ignore parsing errors
    }
  }, [initialWidgets, storageKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      setWidgets((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);

        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);

        // Update order property
        return newItems.map((item, index) => ({ ...item, order: index }));
      });
      setHasChanges(true);
    },
    []
  );

  const toggleVisibility = useCallback((id: string) => {
    setWidgets((items) =>
      items.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
    setHasChanges(true);
  }, []);

  const changeSize = useCallback((id: string, size: Widget['size']) => {
    setWidgets((items) =>
      items.map((item) => (item.id === id ? { ...item, size } : item))
    );
    setHasChanges(true);
  }, []);

  const saveChanges = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widgets));
      onWidgetsChange(widgets);
      setHasChanges(false);
      setEditMode(false);
    } catch {
      // Ignore storage errors
    }
  }, [widgets, storageKey, onWidgetsChange, setEditMode]);

  const resetToDefault = useCallback(() => {
    setWidgets(initialWidgets);
    localStorage.removeItem(storageKey);
    setHasChanges(false);
  }, [initialWidgets, storageKey]);

  const cancelChanges = useCallback(() => {
    // Reload from storage or use initial
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setWidgets(JSON.parse(saved));
      } else {
        setWidgets(initialWidgets);
      }
    } catch {
      setWidgets(initialWidgets);
    }
    setHasChanges(false);
    setEditMode(false);
  }, [initialWidgets, storageKey, setEditMode]);

  const activeWidget = activeId
    ? widgets.find((w) => w.id === activeId)
    : null;

  return (
    <div className="relative">
      {/* Edit mode controls */}
      {(showIdleControls || isEditMode) && (
        <div
          className={cn(
            'mb-2 flex items-center justify-end gap-2',
            !isEditMode && 'mb-1'
          )}
        >
          {isEditMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefault}
                className="text-slate-500"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Restablecer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelChanges}
                className="text-slate-500"
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveChanges}
                disabled={!hasChanges}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Guardar
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode(true)}
              className="text-slate-500 hover:text-violet-600"
            >
              <Settings className="mr-1.5 h-4 w-4" />
              Personalizar
            </Button>
          )}
        </div>
      )}

      {/* Edit mode banner */}
      {isEditMode && (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
          <GripVertical className="h-4 w-4" />
          <span>
            Arrastra los widgets para reorganizarlos. Usa los controles para
            cambiar tamaño o visibilidad.
          </span>
        </div>
      )}

      {/* Widget grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {widgets
              .sort((a, b) => a.order - b.order)
              .map((widget) => (
                <SortableWidget
                  key={widget.id}
                  widget={widget}
                  isEditMode={isEditMode}
                  onToggleVisibility={toggleVisibility}
                  onChangeSize={changeSize}
                >
                  {children(widget)}
                </SortableWidget>
              ))}
          </div>
        </SortableContext>

        {/* Drag overlay */}
        <DragOverlay>
          {activeWidget ? (
            <div className="rounded-3xl border-2 border-violet-400 bg-white/90 p-4 shadow-2xl backdrop-blur dark:bg-slate-900/90">
              <div className="flex items-center gap-2">
                <GripVertical className="h-5 w-5 text-violet-500" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {activeWidget.title}
                </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Hidden widgets panel */}
      {isEditMode && widgets.some((w) => !w.visible) && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
          <h4 className="mb-3 text-sm font-medium text-slate-500">
            Widgets ocultos
          </h4>
          <div className="flex flex-wrap gap-2">
            {widgets
              .filter((w) => !w.visible)
              .map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => toggleVisibility(widget.id)}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-violet-300 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  {widget.title}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DraggableWidgetGrid;
