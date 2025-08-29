'use client';

import React, { useState, useCallback, useRef } from 'react';
import { DndProvider, useDrag, useDrop, DropTargetMonitor } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Folder,
  FolderOpen,
  Image,
  Move,
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  ArrowRight,
  X,
  Users,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { isMobile } from 'react-device-detect';

// Types
interface DragItem {
  type: 'photo' | 'photos';
  photoIds: string[];
  sourceFolder?: string;
}

interface DroppableFolder {
  id: string;
  name: string;
  type: 'level' | 'course' | 'student';
  photoCount: number;
  studentCount?: number;
  canAcceptPhotos: boolean;
  path: string[];
}

interface DragDropOperation {
  id: string;
  photoIds: string[];
  sourceFolder: string;
  targetFolder: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface DragDropPhotoManagerProps {
  eventId: string;
  folders: DroppableFolder[];
  onPhotoMove: (photoIds: string[], targetFolderId: string) => Promise<void>;
  onOperationComplete: () => void;
}

// Draggable photo component
interface DraggablePhotoProps {
  photoId: string;
  photoUrl: string;
  filename: string;
  isSelected: boolean;
  selectedCount: number;
}

function DraggablePhoto({
  photoId,
  photoUrl,
  filename,
  isSelected,
  selectedCount,
}: DraggablePhotoProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'photo',
    item: () =>
      ({
        type: isSelected && selectedCount > 1 ? 'photos' : 'photo',
        photoIds: isSelected && selectedCount > 1 ? [] : [photoId], // Will be filled by parent
      }) as DragItem,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={cn(
        'relative cursor-move transition-all',
        isDragging && 'scale-95 opacity-50'
      )}
    >
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardContent className="p-2">
          <div className="mb-2 aspect-square overflow-hidden rounded bg-gray-100">
            <img
              src={photoUrl}
              alt={filename}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="truncate text-xs">{filename}</p>

          {isSelected && selectedCount > 1 && (
            <Badge className="absolute -right-2 -top-2 bg-blue-500">
              {selectedCount}
            </Badge>
          )}

          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-500/20">
              <Move className="h-6 w-6 text-blue-600" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Droppable folder component
interface DroppableFolderProps {
  folder: DroppableFolder;
  onDrop: (photoIds: string[], targetFolderId: string) => void;
  isOver: boolean;
  canDrop: boolean;
}

function DroppableFolder({
  folder,
  onDrop,
  isOver,
  canDrop,
}: DroppableFolderProps) {
  const [{ isOverCurrent }, drop] = useDrop({
    accept: ['photo', 'photos'],
    drop: (item: DragItem) => {
      if (folder.canAcceptPhotos) {
        onDrop(item.photoIds, folder.id);
      }
    },
    canDrop: () => folder.canAcceptPhotos,
    collect: (monitor: DropTargetMonitor) => ({
      isOverCurrent: monitor.isOver({ shallow: true }),
    }),
  });

  const getFolderIcon = () => {
    switch (folder.type) {
      case 'level':
        return isOverCurrent ? (
          <FolderOpen className="h-6 w-6" />
        ) : (
          <Folder className="h-6 w-6" />
        );
      case 'course':
        return isOverCurrent ? (
          <FolderOpen className="h-6 w-6" />
        ) : (
          <Folder className="h-6 w-6" />
        );
      case 'student':
        return <Users className="h-5 w-5" />;
      default:
        return <Folder className="h-6 w-6" />;
    }
  };

  return (
    <div
      ref={drop}
      className={cn(
        'rounded-lg border-2 border-dashed p-4 transition-all',
        folder.canAcceptPhotos &&
          isOverCurrent &&
          canDrop &&
          'border-green-500 bg-green-50',
        folder.canAcceptPhotos &&
          !isOverCurrent &&
          'border-gray-300 hover:border-blue-400',
        !folder.canAcceptPhotos && 'border-gray-200 bg-gray-50 opacity-50'
      )}
    >
      <Card
        className={cn(
          'transition-all',
          isOverCurrent && canDrop && 'shadow-lg ring-2 ring-green-200'
        )}
      >
        <CardContent className="p-4">
          <div className="mb-2 flex items-center gap-3">
            <div
              className={cn(
                'rounded-lg p-2',
                folder.type === 'level' && 'bg-blue-100 text-blue-600',
                folder.type === 'course' && 'bg-purple-100 text-purple-600',
                folder.type === 'student' && 'bg-green-100 text-green-600'
              )}
            >
              {getFolderIcon()}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium">{folder.name}</h4>
              <p className="text-muted-foreground text-xs capitalize">
                {folder.type === 'level' && 'Nivel escolar'}
                {folder.type === 'course' && 'Curso/Salón'}
                {folder.type === 'student' && 'Estudiante'}
              </p>
            </div>
          </div>

          <div className="text-muted-foreground flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Camera className="h-3 w-3" />
              <span>{folder.photoCount} fotos</span>
            </div>
            {folder.studentCount !== undefined && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{folder.studentCount} estudiantes</span>
              </div>
            )}
          </div>

          {isOverCurrent && canDrop && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <ArrowRight className="h-4 w-4" />
              <span>Soltar aquí para mover</span>
            </div>
          )}

          {!folder.canAcceptPhotos && (
            <div className="mt-3 text-xs text-gray-500">
              No disponible para fotos
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Operation status component
function OperationStatus({
  operation,
  onCancel,
}: {
  operation: DragDropOperation;
  onCancel: () => void;
}) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {operation.status === 'processing' && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {operation.status === 'completed' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            {operation.status === 'failed' && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}

            <span className="text-sm font-medium">
              Moviendo {operation.photoIds.length} fotos
            </span>
          </div>

          {operation.status === 'pending' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {operation.status === 'processing' && (
          <div className="space-y-2">
            <Progress value={operation.progress} className="h-2" />
            <p className="text-muted-foreground text-xs">
              {operation.progress}% completado
            </p>
          </div>
        )}

        {operation.status === 'failed' && operation.error && (
          <p className="text-xs text-red-600">{operation.error}</p>
        )}

        {operation.status === 'completed' && (
          <p className="text-xs text-green-600">Fotos movidas exitosamente</p>
        )}
      </CardContent>
    </Card>
  );
}

// Main component
export default function DragDropPhotoManager({
  eventId,
  folders,
  onPhotoMove,
  onOperationComplete,
}: DragDropPhotoManagerProps) {
  const [operations, setOperations] = useState<DragDropOperation[]>([]);
  const operationIdRef = useRef(0);

  const handleDrop = useCallback(
    async (photoIds: string[], targetFolderId: string) => {
      const operationId = `op-${++operationIdRef.current}`;

      const newOperation: DragDropOperation = {
        id: operationId,
        photoIds,
        sourceFolder: '', // Will be determined
        targetFolder: targetFolderId,
        status: 'pending',
        progress: 0,
      };

      setOperations((prev) => [...prev, newOperation]);

      try {
        // Update status to processing
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operationId
              ? { ...op, status: 'processing' as const }
              : op
          )
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setOperations((prev) =>
            prev.map((op) =>
              op.id === operationId
                ? { ...op, progress: Math.min(op.progress + 10, 90) }
                : op
            )
          );
        }, 200);

        // Perform the actual move
        await onPhotoMove(photoIds, targetFolderId);

        clearInterval(progressInterval);

        // Mark as completed
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operationId
              ? { ...op, status: 'completed' as const, progress: 100 }
              : op
          )
        );

        // Auto-remove after 3 seconds
        setTimeout(() => {
          setOperations((prev) => prev.filter((op) => op.id !== operationId));
          onOperationComplete();
        }, 3000);

        toast.success(`${photoIds.length} fotos movidas exitosamente`);
      } catch (error) {
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operationId
              ? {
                  ...op,
                  status: 'failed' as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Error desconocido',
                }
              : op
          )
        );

        toast.error('Error al mover las fotos');
      }
    },
    [onPhotoMove, onOperationComplete]
  );

  const cancelOperation = useCallback((operationId: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== operationId));
  }, []);

  return (
    <DndProvider backend={isMobile ? TouchBackend : HTML5Backend}>
      <div className="space-y-6">
        {/* Operations Status */}
        {operations.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Operaciones en curso</h3>
            <div className="space-y-2">
              {operations.map((operation) => (
                <OperationStatus
                  key={operation.id}
                  operation={operation}
                  onCancel={() => cancelOperation(operation.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Drop Zones */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Carpetas de destino</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <DroppableFolder
                key={folder.id}
                folder={folder}
                onDrop={handleDrop}
                isOver={false}
                canDrop={folder.canAcceptPhotos}
              />
            ))}
          </div>
        </div>

        {/* Instructions */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Upload className="mt-0.5 h-5 w-5 text-blue-600" />
              <div className="space-y-1">
                <h4 className="font-medium text-blue-900">Cómo usar</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>
                    • Arrastra fotos individuales o selecciona múltiples fotos
                  </li>
                  <li>• Suéltalas en la carpeta de destino deseada</li>
                  <li>
                    • Las fotos se moverán automáticamente y se actualizará la
                    organización
                  </li>
                  <li>
                    • Puedes cancelar operaciones pendientes si es necesario
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
}

// Export draggable photo for use in other components
export { DraggablePhoto };
