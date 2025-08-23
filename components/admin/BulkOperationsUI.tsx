'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download, Upload, CheckCircle, X, Tag, Move, Trash2,
  Eye, EyeOff, Copy, Scissors, Edit, Share, Archive,
  MoreHorizontal, Play, Pause, RotateCcw, AlertTriangle,
  Loader2, Users, FileImage, Folder, Settings, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types for bulk operations
interface BulkOperation {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requiresTarget?: boolean;
  requiresInput?: boolean;
  dangerous?: boolean;
}

interface BulkOperationProgress {
  operationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  processed: number;
  total: number;
  errors: string[];
  startTime?: Date;
  endTime?: Date;
  result?: any;
}

interface BulkOperationsUIProps {
  selectedPhotoIds: string[];
  eventId: string;
  onOperationComplete: () => void;
  onSelectionClear: () => void;
  availableFolders?: { id: string; name: string; path: string }[];
  availableStudents?: { id: string; name: string; course: string }[];
}

// Available bulk operations
const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'approve',
    name: 'Aprobar Fotos',
    description: 'Marca las fotos seleccionadas como aprobadas',
    icon: CheckCircle,
    color: 'green'
  },
  {
    id: 'disapprove',
    name: 'Desaprobar Fotos',
    description: 'Marca las fotos seleccionadas como no aprobadas',
    icon: EyeOff,
    color: 'orange'
  },
  {
    id: 'tag',
    name: 'Etiquetar Estudiantes',
    description: 'Asigna estudiantes a las fotos seleccionadas',
    icon: Tag,
    color: 'blue',
    requiresTarget: true
  },
  {
    id: 'move',
    name: 'Mover a Carpeta',
    description: 'Mueve las fotos a una carpeta específica',
    icon: Move,
    color: 'purple',
    requiresTarget: true
  },
  {
    id: 'download',
    name: 'Descargar ZIP',
    description: 'Descarga las fotos seleccionadas en un archivo ZIP',
    icon: Download,
    color: 'blue'
  },
  {
    id: 'export',
    name: 'Exportar Metadatos',
    description: 'Exporta información detallada de las fotos',
    icon: Upload,
    color: 'teal'
  },
  {
    id: 'rename',
    name: 'Renombrar Masivo',
    description: 'Renombra las fotos con un patrón específico',
    icon: Edit,
    color: 'indigo',
    requiresInput: true
  },
  {
    id: 'delete',
    name: 'Eliminar Fotos',
    description: 'Elimina permanentemente las fotos seleccionadas',
    icon: Trash2,
    color: 'red',
    dangerous: true
  }
];

export default function BulkOperationsUI({
  selectedPhotoIds,
  eventId,
  onOperationComplete,
  onSelectionClear,
  availableFolders = [],
  availableStudents = []
}: BulkOperationsUIProps) {
  const [activeOperations, setActiveOperations] = useState<BulkOperationProgress[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [operationTarget, setOperationTarget] = useState<string>('');
  const [operationInput, setOperationInput] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Execute bulk operation
  const executeBulkOperation = useCallback(async (
    operation: BulkOperation,
    photoIds: string[],
    target?: string,
    input?: string
  ) => {
    const operationId = `${operation.id}-${Date.now()}`;
    
    const progressData: BulkOperationProgress = {
      operationId,
      status: 'pending',
      processed: 0,
      total: photoIds.length,
      errors: [],
      startTime: new Date()
    };

    setActiveOperations(prev => [...prev, progressData]);
    setIsDialogOpen(false);

    try {
      // Update status to running
      setActiveOperations(prev => 
        prev.map(op => 
          op.operationId === operationId 
            ? { ...op, status: 'running' as const }
            : op
        )
      );

      const batchSize = 10; // Process in batches
      let processed = 0;
      const errors: string[] = [];

      for (let i = 0; i < photoIds.length; i += batchSize) {
        const batch = photoIds.slice(i, i + batchSize);
        
        try {
          const response = await fetch(`/api/admin/photos/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: operation.id,
              photoIds: batch,
              eventId,
              target,
              input,
              metadata: {
                batchIndex: Math.floor(i / batchSize),
                totalBatches: Math.ceil(photoIds.length / batchSize)
              }
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorData.error || 'Error desconocido'}`);
          } else {
            processed += batch.length;
          }
        } catch (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: Error de conexión`);
        }

        // Update progress
        setActiveOperations(prev => 
          prev.map(op => 
            op.operationId === operationId 
              ? { ...op, processed, errors: [...errors] }
              : op
          )
        );

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Mark as completed
      setActiveOperations(prev => 
        prev.map(op => 
          op.operationId === operationId 
            ? { 
                ...op, 
                status: errors.length === 0 ? 'completed' as const : 'failed' as const,
                endTime: new Date(),
                processed
              }
            : op
        )
      );

      if (errors.length === 0) {
        toast.success(`${operation.name} completada exitosamente`);
        onOperationComplete();
      } else {
        toast.error(`${operation.name} completada con errores`);
      }

    } catch (error) {
      setActiveOperations(prev => 
        prev.map(op => 
          op.operationId === operationId 
            ? { 
                ...op, 
                status: 'failed' as const,
                errors: [...op.errors, error instanceof Error ? error.message : 'Error desconocido'],
                endTime: new Date()
              }
            : op
        )
      );
      toast.error(`Error en ${operation.name}`);
    }
  }, [eventId, onOperationComplete]);

  // Handle operation start
  const handleOperationStart = useCallback((operation: BulkOperation) => {
    setSelectedOperation(operation);
    setOperationTarget('');
    setOperationInput('');
    setIsDialogOpen(true);
  }, []);

  // Handle operation confirm
  const handleOperationConfirm = useCallback(() => {
    if (!selectedOperation) return;

    if (selectedOperation.requiresTarget && !operationTarget) {
      toast.error('Selecciona un destino para esta operación');
      return;
    }

    if (selectedOperation.requiresInput && !operationInput.trim()) {
      toast.error('Ingresa el texto requerido para esta operación');
      return;
    }

    executeBulkOperation(
      selectedOperation,
      selectedPhotoIds,
      operationTarget,
      operationInput
    );
  }, [selectedOperation, operationTarget, operationInput, selectedPhotoIds, executeBulkOperation]);

  // Cancel operation
  const cancelOperation = useCallback((operationId: string) => {
    setActiveOperations(prev => prev.filter(op => op.operationId !== operationId));
  }, []);

  // Operation stats
  const operationStats = useMemo(() => {
    const total = activeOperations.length;
    const running = activeOperations.filter(op => op.status === 'running').length;
    const completed = activeOperations.filter(op => op.status === 'completed').length;
    const failed = activeOperations.filter(op => op.status === 'failed').length;
    
    return { total, running, completed, failed };
  }, [activeOperations]);

  // Quick operation buttons
  const quickOperations = BULK_OPERATIONS.filter(op => 
    !op.requiresTarget && !op.requiresInput && !op.dangerous
  );

  if (selectedPhotoIds.length === 0) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <FileImage className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-muted-foreground">
            Selecciona fotos para habilitar las operaciones masivas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selection summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedPhotoIds.length} fotos seleccionadas
                </span>
              </div>
              
              {/* Quick operations */}
              <div className="flex items-center gap-1">
                {quickOperations.slice(0, 3).map(operation => {
                  const Icon = operation.icon;
                  return (
                    <Button
                      key={operation.id}
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      onClick={() => executeBulkOperation(operation, selectedPhotoIds)}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{operation.name}</span>
                    </Button>
                  );
                })}
                
                {/* More operations dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {BULK_OPERATIONS.map(operation => {
                      const Icon = operation.icon;
                      return (
                        <DropdownMenuItem
                          key={operation.id}
                          onClick={() => handleOperationStart(operation)}
                          className={cn(
                            "gap-2",
                            operation.dangerous && "text-destructive"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <div className="font-medium">{operation.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {operation.description}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectionClear}
              className="text-blue-700 border-blue-300"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active operations */}
      {activeOperations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Operaciones en Curso</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{operationStats.running} activas</Badge>
                <Badge variant="outline">{operationStats.completed} completadas</Badge>
                {operationStats.failed > 0 && (
                  <Badge variant="destructive">{operationStats.failed} fallidas</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeOperations.map(operation => (
              <OperationProgressCard
                key={operation.operationId}
                operation={operation}
                onCancel={() => cancelOperation(operation.operationId)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Operation configuration dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOperation && <selectedOperation.icon className="h-5 w-5" />}
              {selectedOperation?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedOperation?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Target selection */}
            {selectedOperation?.requiresTarget && (
              <div className="space-y-2">
                <Label>Seleccionar destino</Label>
                {selectedOperation.id === 'move' ? (
                  <Select value={operationTarget} onValueChange={setOperationTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar carpeta..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFolders.map(folder => (
                        <SelectItem key={folder.id} value={folder.id}>
                          <div className="flex items-center gap-2">
                            <Folder className="h-4 w-4" />
                            <span>{folder.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {folder.path}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : selectedOperation.id === 'tag' ? (
                  <Select value={operationTarget} onValueChange={setOperationTarget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estudiante..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>{student.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {student.course}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            )}

            {/* Input field */}
            {selectedOperation?.requiresInput && (
              <div className="space-y-2">
                <Label>
                  {selectedOperation.id === 'rename' && 'Patrón de nombres'}
                </Label>
                <Input
                  value={operationInput}
                  onChange={(e) => setOperationInput(e.target.value)}
                  placeholder={
                    selectedOperation.id === 'rename' 
                      ? 'Ej: Evento_2024_{index}'
                      : 'Ingresa el texto...'
                  }
                />
                {selectedOperation.id === 'rename' && (
                  <p className="text-xs text-muted-foreground">
                    Usa {'{index}'} para numerar automáticamente
                  </p>
                )}
              </div>
            )}

            {/* Warning for dangerous operations */}
            {selectedOperation?.dangerous && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Operación irreversible</span>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  Esta acción no se puede deshacer. Las fotos eliminadas no se podrán recuperar.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleOperationConfirm}
                className={cn(
                  selectedOperation?.dangerous && "bg-red-600 hover:bg-red-700"
                )}
              >
                <Play className="h-4 w-4 mr-1" />
                Ejecutar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Operation progress card component
function OperationProgressCard({ 
  operation, 
  onCancel 
}: { 
  operation: BulkOperationProgress; 
  onCancel: () => void; 
}) {
  const progressPercentage = operation.total > 0 
    ? Math.round((operation.processed / operation.total) * 100) 
    : 0;

  const getStatusIcon = () => {
    switch (operation.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      default:
        return <Play className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">
              Operación {operation.operationId.split('-')[0]}
            </span>
            <Badge variant="outline" className="capitalize">
              {operation.status}
            </Badge>
          </div>
          
          {operation.status === 'running' && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progreso: {operation.processed} / {operation.total}</span>
            <span>{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        {operation.errors.length > 0 && (
          <div className="mt-2 text-xs text-red-600">
            {operation.errors.length} errores encontrados
          </div>
        )}
        
        {operation.endTime && operation.startTime && (
          <div className="mt-2 text-xs text-muted-foreground">
            Duración: {Math.round((operation.endTime.getTime() - operation.startTime.getTime()) / 1000)}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}