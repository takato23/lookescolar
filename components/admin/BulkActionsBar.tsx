'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquareIcon, 
  XIcon, 
  TrashIcon, 
  CheckIcon,
  MoveIcon,
  TagIcon,
  FolderIcon,
  AlertTriangleIcon,
  Loader2Icon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  event_id: string;
  event_name?: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onApprove: () => Promise<void>;
  onDelete: () => Promise<void>;
  onMove: (folderId: string) => Promise<void>;
  onTag: () => void;
  availableFolders?: Subject[];
  isLoading?: boolean;
  className?: string;
}

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string) => Promise<void>;
  folders: Subject[];
  selectedCount: number;
  isLoading: boolean;
}

function MoveModal({ isOpen, onClose, onMove, folders, selectedCount, isLoading }: MoveModalProps) {
  const [movingToId, setMovingToId] = useState<string | null>(null);

  const handleMove = async (folderId: string) => {
    setMovingToId(folderId);
    try {
      await onMove(folderId);
      onClose();
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setMovingToId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96 max-w-[90vw] max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground dark:text-gray-100">
            Mover {selectedCount} foto{selectedCount !== 1 ? 's' : ''} a carpeta
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2 mb-6">
          {folders.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FolderIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No hay carpetas disponibles</p>
            </div>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleMove(folder.id)}
                disabled={isLoading || movingToId !== null}
                className={cn(
                  "w-full text-left p-3 border border-border dark:border-gray-700 rounded-lg transition-all duration-200",
                  "hover:bg-muted dark:hover:bg-gray-800 hover:border-border dark:hover:border-gray-600",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  movingToId === folder.id && "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground dark:text-gray-100">
                      {folder.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {folder.event_name}
                    </div>
                  </div>
                  {movingToId === folder.id && (
                    <Loader2Icon className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
        
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={movingToId !== null}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onApprove,
  onDelete,
  onMove,
  onTag,
  availableFolders = [],
  isLoading = false,
  className
}: BulkActionsBarProps) {
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Hide bar when no items selected
  const isVisible = selectedCount > 0;

  const handleSelectAll = useCallback(() => {
    if (selectedCount === totalCount) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  }, [selectedCount, totalCount, onSelectAll, onDeselectAll]);

  const handleApprove = useCallback(async () => {
    setActionLoading('approve');
    try {
      await onApprove();
      toast.success(`${selectedCount} fotos aprobadas`);
    } catch (error) {
      toast.error('Error al aprobar fotos');
    } finally {
      setActionLoading(null);
    }
  }, [selectedCount, onApprove]);

  const handleDelete = useCallback(async () => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar ${selectedCount} foto${selectedCount !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`
    );
    
    if (!confirmed) return;

    setActionLoading('delete');
    try {
      await onDelete();
      toast.success(`${selectedCount} fotos eliminadas`);
    } catch (error) {
      toast.error('Error al eliminar fotos');
    } finally {
      setActionLoading(null);
    }
  }, [selectedCount, onDelete]);

  const handleMove = useCallback(async (folderId: string) => {
    setActionLoading('move');
    try {
      await onMove(folderId);
      toast.success(`${selectedCount} fotos movidas exitosamente`);
    } catch (error) {
      toast.error('Error al mover las fotos');
    } finally {
      setActionLoading(null);
    }
  }, [selectedCount, onMove]);

  const handleOpenMoveModal = useCallback(() => {
    setShowMoveModal(true);
  }, []);

  const allSelected = selectedCount === totalCount;
  const isActionLoading = actionLoading !== null || isLoading;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40",
              "bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm",
              "border border-border dark:border-gray-700 rounded-lg shadow-lg",
              "px-6 py-4 flex items-center gap-4",
              "min-w-[600px] max-w-[90vw]",
              className
            )}
          >
            {/* Selection Summary */}
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
              >
                {selectedCount} de {totalCount} seleccionadas
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={isActionLoading}
                className={cn(
                  "transition-all duration-200",
                  allSelected 
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
                    : "hover:bg-muted dark:hover:bg-gray-800"
                )}
              >
                <CheckSquareIcon className="h-4 w-4 mr-2" />
                {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
              </Button>
            </div>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Approve */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleApprove}
                disabled={isActionLoading}
                className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                {actionLoading === 'approve' ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckIcon className="h-4 w-4 mr-2" />
                )}
                Aprobar ({selectedCount})
              </Button>

              {/* Move */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenMoveModal}
                disabled={isActionLoading || availableFolders.length === 0}
                className="text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                {actionLoading === 'move' ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MoveIcon className="h-4 w-4 mr-2" />
                )}
                Mover ({selectedCount})
              </Button>

              {/* Tag */}
              <Button
                variant="outline"
                size="sm"
                onClick={onTag}
                disabled={isActionLoading}
                className="text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <TagIcon className="h-4 w-4 mr-2" />
                Etiquetar ({selectedCount})
              </Button>

              {/* Delete */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isActionLoading}
                className="text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                {actionLoading === 'delete' ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TrashIcon className="h-4 w-4 mr-2" />
                )}
                Eliminar ({selectedCount})
              </Button>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeselectAll}
              disabled={isActionLoading}
              className="ml-auto text-gray-500 hover:text-foreground dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Modal */}
      <MoveModal
        isOpen={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        onMove={handleMove}
        folders={availableFolders}
        selectedCount={selectedCount}
        isLoading={actionLoading === 'move'}
      />
    </>
  );
}