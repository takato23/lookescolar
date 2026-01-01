/**
 * Bulk Operation Drop Zones
 * Visual drop zones for drag & drop bulk operations
 * Provides intuitive UX for moving, deleting, and publishing photos
 */

'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import {
  Trash2,
  FolderInput,
  Globe,
  Tag,
  Download,
  Star,
  Archive,
  AlertTriangle,
} from 'lucide-react';

interface OperationZone {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  hoverColor: string;
  activeColor: string;
  confirmRequired?: boolean;
  dangerZone?: boolean;
}

const OPERATION_ZONES: OperationZone[] = [
  {
    id: 'move-to-folder',
    label: 'Mover',
    description: 'Arrastra aquí para mover a otra carpeta',
    icon: FolderInput,
    color: 'from-blue-500/10 to-cyan-500/10 border-blue-300/50',
    hoverColor: 'from-blue-500/20 to-cyan-500/20 border-blue-400',
    activeColor: 'from-blue-500/30 to-cyan-500/30 border-blue-500 shadow-blue-500/25',
  },
  {
    id: 'publish',
    label: 'Publicar',
    description: 'Publicar fotos seleccionadas',
    icon: Globe,
    color: 'from-emerald-500/10 to-teal-500/10 border-emerald-300/50',
    hoverColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-400',
    activeColor: 'from-emerald-500/30 to-teal-500/30 border-emerald-500 shadow-emerald-500/25',
  },
  {
    id: 'tag',
    label: 'Etiquetar',
    description: 'Asignar etiquetas o estudiantes',
    icon: Tag,
    color: 'from-violet-500/10 to-purple-500/10 border-violet-300/50',
    hoverColor: 'from-violet-500/20 to-purple-500/20 border-violet-400',
    activeColor: 'from-violet-500/30 to-purple-500/30 border-violet-500 shadow-violet-500/25',
  },
  {
    id: 'favorite',
    label: 'Destacar',
    description: 'Marcar como destacadas',
    icon: Star,
    color: 'from-amber-500/10 to-orange-500/10 border-amber-300/50',
    hoverColor: 'from-amber-500/20 to-orange-500/20 border-amber-400',
    activeColor: 'from-amber-500/30 to-orange-500/30 border-amber-500 shadow-amber-500/25',
  },
  {
    id: 'download',
    label: 'Descargar',
    description: 'Descargar originales',
    icon: Download,
    color: 'from-sky-500/10 to-blue-500/10 border-sky-300/50',
    hoverColor: 'from-sky-500/20 to-blue-500/20 border-sky-400',
    activeColor: 'from-sky-500/30 to-blue-500/30 border-sky-500 shadow-sky-500/25',
  },
  {
    id: 'archive',
    label: 'Archivar',
    description: 'Mover al archivo',
    icon: Archive,
    color: 'from-slate-500/10 to-gray-500/10 border-slate-300/50',
    hoverColor: 'from-slate-500/20 to-gray-500/20 border-slate-400',
    activeColor: 'from-slate-500/30 to-gray-500/30 border-slate-500 shadow-slate-500/25',
  },
  {
    id: 'delete',
    label: 'Eliminar',
    description: 'Eliminar permanentemente',
    icon: Trash2,
    color: 'from-rose-500/10 to-red-500/10 border-rose-300/50',
    hoverColor: 'from-rose-500/20 to-red-500/20 border-rose-400',
    activeColor: 'from-rose-500/30 to-red-500/30 border-rose-500 shadow-rose-500/25',
    confirmRequired: true,
    dangerZone: true,
  },
];

interface DropZoneProps {
  zone: OperationZone;
  isActive: boolean;
  selectedCount: number;
}

function DropZone({ zone, isActive, selectedCount }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `bulk-${zone.id}`,
    data: { type: 'bulk-operation', operation: zone.id },
  });

  const Icon = zone.icon;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 transition-all duration-300',
        'min-h-[100px] cursor-pointer',
        isOver
          ? cn('scale-105 bg-gradient-to-br shadow-xl', zone.activeColor)
          : isActive
            ? cn('bg-gradient-to-br', zone.hoverColor)
            : cn('bg-gradient-to-br hover:scale-[1.02]', zone.color),
        zone.dangerZone && isOver && 'animate-pulse'
      )}
    >
      {/* Glow effect when active */}
      {isOver && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-white/20 blur-xl" />
      )}

      {/* Icon with animation */}
      <div
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300',
          isOver
            ? 'scale-110 bg-white/30 shadow-lg'
            : 'bg-white/50 group-hover:scale-105'
        )}
      >
        <Icon
          className={cn(
            'h-6 w-6 transition-all duration-300',
            zone.dangerZone
              ? 'text-rose-600'
              : isOver
                ? 'text-slate-900'
                : 'text-slate-600'
          )}
        />
        {isOver && zone.dangerZone && (
          <AlertTriangle className="absolute -right-1 -top-1 h-4 w-4 animate-bounce text-rose-500" />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-sm font-semibold transition-colors',
          zone.dangerZone ? 'text-rose-700' : 'text-slate-700'
        )}
      >
        {zone.label}
      </span>

      {/* Description - shown on hover/active */}
      <span
        className={cn(
          'text-center text-xs transition-all duration-300',
          isOver || isActive
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-70',
          zone.dangerZone ? 'text-rose-600' : 'text-slate-500'
        )}
      >
        {zone.description}
      </span>

      {/* Count badge when dragging */}
      {isOver && selectedCount > 0 && (
        <div
          className={cn(
            'absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg',
            zone.dangerZone
              ? 'bg-gradient-to-br from-rose-500 to-red-600'
              : 'bg-gradient-to-br from-violet-500 to-purple-600'
          )}
        >
          {selectedCount}
        </div>
      )}
    </div>
  );
}

interface BulkOperationZonesProps {
  isVisible: boolean;
  selectedCount: number;
  isDragging: boolean;
  enabledOperations?: string[];
  className?: string;
}

export function BulkOperationZones({
  isVisible,
  selectedCount,
  isDragging,
  enabledOperations,
  className,
}: BulkOperationZonesProps) {
  const zones = enabledOperations
    ? OPERATION_ZONES.filter((z) => enabledOperations.includes(z.id))
    : OPERATION_ZONES;

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 transition-all duration-500',
        isDragging
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0 pointer-events-none',
        className
      )}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/90 to-transparent backdrop-blur-xl dark:from-slate-900/95 dark:via-slate-900/90" />

      {/* Content */}
      <div className="relative mx-auto max-w-7xl px-6 pb-6 pt-8">
        {/* Header */}
        <div className="mb-4 flex items-center justify-center gap-3">
          <div className="h-1 w-12 rounded-full bg-slate-300/50" />
          <span className="text-sm font-medium text-slate-500">
            Suelta para {selectedCount} {selectedCount === 1 ? 'foto' : 'fotos'}
          </span>
          <div className="h-1 w-12 rounded-full bg-slate-300/50" />
        </div>

        {/* Zones grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {zones.map((zone) => (
            <DropZone
              key={zone.id}
              zone={zone}
              isActive={isDragging}
              selectedCount={selectedCount}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact version for sidebar
export function BulkOperationSidebar({
  isVisible,
  selectedCount,
  isDragging,
  enabledOperations,
}: BulkOperationZonesProps) {
  const zones = enabledOperations
    ? OPERATION_ZONES.filter((z) => enabledOperations.includes(z.id))
    : OPERATION_ZONES.slice(0, 4); // Show first 4 in sidebar

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed right-4 top-1/2 z-50 -translate-y-1/2 transition-all duration-500',
        isDragging
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0 pointer-events-none'
      )}
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/50 bg-white/90 p-3 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/90">
        <span className="mb-1 text-center text-xs font-medium text-slate-400">
          Acciones
        </span>
        {zones.map((zone) => (
          <DropZone
            key={zone.id}
            zone={zone}
            isActive={isDragging}
            selectedCount={selectedCount}
          />
        ))}
      </div>
    </div>
  );
}

export { OPERATION_ZONES };
export type { OperationZone };
