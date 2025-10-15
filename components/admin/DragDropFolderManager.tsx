'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useState, useCallback, useRef, DragEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FolderOpen,
  Folder,
  Image,
  Eye,
  EyeOff,
  Move,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface DragDropOperation {
  id: string;
  type: 'move' | 'bulk_publish' | 'bulk_unpublish';
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: number;
  message: string;
  sourceItems: string[];
  targetFolder?: string;
  results?: any;
}

interface DragDropFolderManagerProps {
  folders: any[];
  selectedFolders: string[];
  onSelectionChange: (selected: string[]) => void;
  onBulkPublish: (folderIds: string[]) => Promise<any>;
  onBulkUnpublish: (folderIds: string[]) => Promise<any>;
  onMoveFolder?: (
    folderId: string,
    targetParentId: string | null
  ) => Promise<any>;
  className?: string;
}

export function DragDropFolderManager({
  folders,
  selectedFolders,
  onSelectionChange,
  onBulkPublish,
  onBulkUnpublish,
  onMoveFolder,
  className,
}: DragDropFolderManagerProps) {
  const [draggedItems, setDraggedItems] = useState<string[]>([]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [operations, setOperations] = useState<DragDropOperation[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Create a new operation
  const createOperation = useCallback(
    (
      type: DragDropOperation['type'],
      sourceItems: string[],
      targetFolder?: string
    ): DragDropOperation => {
      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      let message = '';
      switch (type) {
        case 'bulk_publish':
          message = `Publicando ${sourceItems.length} carpeta${sourceItems.length === 1 ? '' : 's'}...`;
          break;
        case 'bulk_unpublish':
          message = `Despublicando ${sourceItems.length} carpeta${sourceItems.length === 1 ? '' : 's'}...`;
          break;
        case 'move':
          message = `Moviendo ${sourceItems.length} elemento${sourceItems.length === 1 ? '' : 's'}...`;
          break;
      }

      return {
        id,
        type,
        status: 'pending',
        progress: 0,
        message,
        sourceItems,
        targetFolder,
      };
    },
    []
  );

  // Execute an operation
  const executeOperation = useCallback(
    async (operation: DragDropOperation) => {
      setOperations((prev) =>
        prev.map((op) =>
          op.id === operation.id
            ? { ...op, status: 'in_progress', progress: 10 }
            : op
        )
      );

      try {
        let result;

        // Execute the actual operation without simulated delays
        const startTime = Date.now();

        // Update progress to show operation started
        setOperations((prev) =>
          prev.map((op) =>
            op.id === operation.id
              ? { ...op, progress: 25, message: 'Procesando...' }
              : op
          )
        );

        switch (operation.type) {
          case 'bulk_publish':
            result = await onBulkPublish(operation.sourceItems);
            break;
          case 'bulk_unpublish':
            result = await onBulkUnpublish(operation.sourceItems);
            break;
          case 'move':
            if (onMoveFolder && operation.targetFolder) {
              const promises = operation.sourceItems.map((itemId) =>
                onMoveFolder(itemId, operation.targetFolder!)
              );
              result = await Promise.allSettled(promises);
            }
            break;
        }

        const duration = Date.now() - startTime;

        // Complete the operation with detailed success message
        let successMessage = 'Operación completada exitosamente';
        if (result && typeof result === 'object') {
          if (
            result.successful !== undefined &&
            result.total_processed !== undefined
          ) {
            successMessage = `${result.successful}/${result.total_processed} elementos procesados exitosamente`;
            if (result.execution_time_ms) {
              successMessage += ` (${result.execution_time_ms}ms)`;
            }
          }
        }

        setOperations((prev) =>
          prev.map((op) =>
            op.id === operation.id
              ? {
                  ...op,
                  status: 'completed',
                  progress: 100,
                  results: result,
                  message: successMessage,
                }
              : op
          )
        );

        // Auto-remove completed operations after 5 seconds (increased for better visibility)
        setTimeout(() => {
          setOperations((prev) => prev.filter((op) => op.id !== operation.id));
        }, 5000);
      } catch (error) {
        console.error('Operation failed:', error);

        // Get detailed error message
        let errorMessage = 'Operación fallida';
        if (error instanceof Error) {
          if (error.message.includes('HTTP')) {
            errorMessage = `Error del servidor: ${error.message}`;
          } else if (error.message.includes('Invalid response')) {
            errorMessage = 'Respuesta inválida del servidor';
          } else if (error.message.includes('Network')) {
            errorMessage = 'Error de conexión';
          } else {
            errorMessage = error.message;
          }
        }

        setOperations((prev) =>
          prev.map((op) =>
            op.id === operation.id
              ? {
                  ...op,
                  status: 'error',
                  progress: 0,
                  message: `❌ ${errorMessage}`,
                }
              : op
          )
        );

        // Auto-remove error operations after 10 seconds (longer for error review)
        setTimeout(() => {
          setOperations((prev) => prev.filter((op) => op.id !== operation.id));
        }, 10000);
      }
    },
    [onBulkPublish, onBulkUnpublish, onMoveFolder]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: DragEvent, folderId: string) => {
      const itemsToMove = selectedFolders.includes(folderId)
        ? selectedFolders
        : [folderId];

      setDraggedItems(itemsToMove);
      setIsDragging(true);

      // Set drag data
      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          items: itemsToMove,
          type: 'folder',
        })
      );
      e.dataTransfer.effectAllowed = 'move';
    },
    [selectedFolders]
  );

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drag enter
  const handleDragEnter = useCallback(
    (e: DragEvent, targetId?: string) => {
      e.preventDefault();
      if (targetId && !draggedItems.includes(targetId)) {
        setDropTarget(targetId);
      }
    },
    [draggedItems]
  );

  // Handle drag leave
  const handleDragLeave = useCallback((e: DragEvent) => {
    // Only clear drop target if we're leaving the entire drop zone
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setDropTarget(null);
      }
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: DragEvent, targetId?: string) => {
      e.preventDefault();
      setDropTarget(null);
      setIsDragging(false);

      try {
        const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
        const { items, type } = dragData;

        if (type === 'folder' && items.length > 0) {
          // If dropping on a folder, move items
          if (targetId && onMoveFolder) {
            const operation = createOperation('move', items, targetId);
            setOperations((prev) => [...prev, operation]);
            executeOperation(operation);
          }

          // Clear selection after successful drop
          onSelectionChange([]);
        }
      } catch (error) {
        console.error('Drop failed:', error);
      }

      setDraggedItems([]);
    },
    [createOperation, executeOperation, onMoveFolder, onSelectionChange]
  );

  // Handle bulk actions via drag to special zones
  const handleBulkAction = useCallback(
    (action: 'publish' | 'unpublish') => {
      if (selectedFolders.length === 0) return;

      const operation = createOperation(
        action === 'publish' ? 'bulk_publish' : 'bulk_unpublish',
        selectedFolders
      );

      setOperations((prev) => [...prev, operation]);
      executeOperation(operation);
      onSelectionChange([]);
    },
    [selectedFolders, createOperation, executeOperation, onSelectionChange]
  );

  // Remove operation
  const removeOperation = useCallback((operationId: string) => {
    setOperations((prev) => prev.filter((op) => op.id !== operationId));
  }, []);

  // Render operation item
  const renderOperation = useCallback(
    (operation: DragDropOperation) => {
      const getStatusIcon = () => {
        switch (operation.status) {
          case 'completed':
            return <CheckCircle2 className="h-4 w-4 text-green-600" />;
          case 'error':
            return <AlertCircle className="h-4 w-4 text-red-600" />;
          case 'in_progress':
            return (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            );
          default:
            return <div className="h-4 w-4 rounded-full bg-gray-300" />;
        }
      };

      const getStatusColor = () => {
        switch (operation.status) {
          case 'completed':
            return 'bg-green-50 border-green-200';
          case 'error':
            return 'bg-red-50 border-red-200';
          case 'in_progress':
            return 'bg-blue-50 border-blue-200';
          default:
            return 'bg-muted border-border';
        }
      };

      return (
        <div
          key={operation.id}
          className={`rounded-lg border p-3 ${getStatusColor()} transition-all`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{operation.message}</span>
            </div>

            {(operation.status === 'completed' ||
              operation.status === 'error') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeOperation(operation.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {operation.status === 'in_progress' && (
            <Progress value={operation.progress} className="h-1" />
          )}

          {operation.results && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {operation.type === 'bulk_publish' &&
                operation.results.successful && (
                  <span>
                    ✅ {operation.results.successful}/
                    {operation.results.total_processed} publicadas
                  </span>
                )}
              {operation.type === 'bulk_unpublish' &&
                operation.results.successful && (
                  <span>
                    ✅ {operation.results.successful}/
                    {operation.results.total_processed} despublicadas
                  </span>
                )}
            </div>
          )}
        </div>
      );
    },
    [removeOperation]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Operations panel */}
      {operations.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-medium">Operaciones en progreso</h3>
          </div>
          <div className="space-y-2">{operations.map(renderOperation)}</div>
        </Card>
      )}

      {/* Drag and drop zones */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Publish zone */}
        <Card
          className={`cursor-pointer border-2 border-dashed p-6 transition-all ${
            isDragging && selectedFolders.length > 0
              ? 'scale-105 border-green-400 bg-green-50'
              : 'border-green-200 hover:border-green-300'
          }`}
          onDragOver={handleDragOver}
          onDrop={(e) => {
            e.preventDefault();
            handleBulkAction('publish');
          }}
          onClick={() =>
            selectedFolders.length > 0 && handleBulkAction('publish')
          }
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-1 font-medium text-green-800">
              Zona de Publicación
            </h3>
            <p className="mb-3 text-sm text-green-600">
              {selectedFolders.length > 0
                ? `Publicar ${selectedFolders.length} carpeta${selectedFolders.length === 1 ? '' : 's'} seleccionada${selectedFolders.length === 1 ? '' : 's'}`
                : 'Arrastra carpetas aquí para publicarlas'}
            </p>
            {selectedFolders.length > 0 && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                <Eye className="mr-2 h-4 w-4" />
                Publicar Ahora
              </Button>
            )}
          </div>
        </Card>

        {/* Unpublish zone */}
        <Card
          className={`cursor-pointer border-2 border-dashed p-6 transition-all ${
            isDragging && selectedFolders.length > 0
              ? 'scale-105 border-primary-400 bg-primary-50'
              : 'border-primary-200 hover:border-primary-300'
          }`}
          onDragOver={handleDragOver}
          onDrop={(e) => {
            e.preventDefault();
            handleBulkAction('unpublish');
          }}
          onClick={() =>
            selectedFolders.length > 0 && handleBulkAction('unpublish')
          }
        >
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <EyeOff className="h-6 w-6 text-primary-600" />
            </div>
            <h3 className="mb-1 font-medium text-primary-800">
              Zona de Despublicación
            </h3>
            <p className="mb-3 text-sm text-primary-600">
              {selectedFolders.length > 0
                ? `Despublicar ${selectedFolders.length} carpeta${selectedFolders.length === 1 ? '' : 's'} seleccionada${selectedFolders.length === 1 ? '' : 's'}`
                : 'Arrastra carpetas aquí para despublicarlas'}
            </p>
            {selectedFolders.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary-300 text-primary-700 hover:bg-primary-50"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Despublicar Ahora
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Instructions */}
      {selectedFolders.length > 0 && !isDragging && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/30 p-2">
              <Move className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="mb-1 font-medium text-blue-800 dark:text-blue-200">
                {selectedFolders.length} carpeta
                {selectedFolders.length === 1 ? '' : 's'} seleccionada
                {selectedFolders.length === 1 ? '' : 's'}
              </h4>
              <p className="mb-3 text-sm text-blue-700 dark:text-blue-300">
                Puedes usar las zonas de arriba para publicar/despublicar en
                lote, o arrastra las carpetas para organizarlas.
              </p>
              <div className="flex gap-2">
                <Badge
                  variant="outline"
                  className="border-blue-300 text-blue-600 dark:text-blue-400"
                >
                  💡 Tip: Haz clic en las zonas para acciones rápidas
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Drag feedback overlay */}
      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/10">
          <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow-lg">
            <Move className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium">
              Moviendo {draggedItems.length} elemento
              {draggedItems.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
