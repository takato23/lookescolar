'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Download,
  Upload,
  Mail,
  QrCode,
  Archive,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertTriangle,
  FileText,
  Send,
} from 'lucide-react';

interface BulkOperation {
  id: string;
  type: 'export' | 'import' | 'email' | 'qr' | 'archive' | 'delete' | 'tokens' | 'assign';
  title: string;
  description: string;
  icon: React.ReactNode;
  requiresConfirmation: boolean;
  dangerous: boolean;
}

interface BulkOperationsProps {
  selectedItems: string[];
  itemType: 'students' | 'courses' | 'photos';
  eventId: string;
  onOperationComplete?: () => void;
  onClearSelection?: () => void;
}

const BULK_OPERATIONS: Record<string, BulkOperation[]> = {
  students: [
    {
      id: 'export-csv',
      type: 'export',
      title: 'Exportar CSV',
      description: 'Descargar lista de estudiantes seleccionados',
      icon: <Download className="h-4 w-4" />,
      requiresConfirmation: false,
      dangerous: false,
    },
    {
      id: 'generate-qr',
      type: 'qr',
      title: 'Generar QR',
      description: 'Generar códigos QR para estudiantes sin código',
      icon: <QrCode className="h-4 w-4" />,
      requiresConfirmation: false,
      dangerous: false,
    },
    {
      id: 'generate-tokens',
      type: 'tokens',
      title: 'Generar Tokens',
      description: 'Crear tokens de acceso para familias',
      icon: <FileText className="h-4 w-4" />,
      requiresConfirmation: false,
      dangerous: false,
    },
    {
      id: 'send-emails',
      type: 'email',
      title: 'Enviar Emails',
      description: 'Enviar tokens de acceso por email a padres',
      icon: <Mail className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: false,
    },
    {
      id: 'archive-students',
      type: 'archive',
      title: 'Archivar',
      description: 'Archivar estudiantes seleccionados',
      icon: <Archive className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: true,
    },
    {
      id: 'delete-students',
      type: 'delete',
      title: 'Eliminar',
      description: 'Eliminar permanentemente estudiantes seleccionados',
      icon: <Trash2 className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: true,
    },
  ],
  courses: [
    {
      id: 'export-courses',
      type: 'export',
      title: 'Exportar Cursos',
      description: 'Descargar información de cursos seleccionados',
      icon: <Download className="h-4 w-4" />,
      requiresConfirmation: false,
      dangerous: false,
    },
    {
      id: 'bulk-assign',
      type: 'assign',
      title: 'Asignar Estudiantes',
      description: 'Asignar estudiantes sin curso a cursos seleccionados',
      icon: <Users className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: false,
    },
    {
      id: 'archive-courses',
      type: 'archive',
      title: 'Archivar',
      description: 'Archivar cursos seleccionados',
      icon: <Archive className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: true,
    },
    {
      id: 'delete-courses',
      type: 'delete',
      title: 'Eliminar',
      description: 'Eliminar permanentemente cursos seleccionados',
      icon: <Trash2 className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: true,
    },
  ],
  photos: [
    {
      id: 'export-photos',
      type: 'export',
      title: 'Exportar Lista',
      description: 'Descargar lista de fotos seleccionadas',
      icon: <Download className="h-4 w-4" />,
      requiresConfirmation: false,
      dangerous: false,
    },
    {
      id: 'bulk-tag',
      type: 'assign',
      title: 'Etiquetar en Lote',
      description: 'Asignar estudiantes a fotos seleccionadas',
      icon: <Users className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: false,
    },
    {
      id: 'archive-photos',
      type: 'archive',
      title: 'Archivar',
      description: 'Archivar fotos seleccionadas',
      icon: <Archive className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: true,
    },
    {
      id: 'delete-photos',
      type: 'delete',
      title: 'Eliminar',
      description: 'Eliminar permanentemente fotos seleccionadas',
      icon: <Trash2 className="h-4 w-4" />,
      requiresConfirmation: true,
      dangerous: true,
    },
  ],
};

export default function BulkOperations({
  selectedItems,
  itemType,
  eventId,
  onOperationComplete,
  onClearSelection,
}: BulkOperationsProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [operationResult, setOperationResult] = useState<any>(null);
  
  // Email sending options
  const [emailOptions, setEmailOptions] = useState({
    sendEmails: true,
    customMessage: '',
    includeQR: true,
  });

  const operations = BULK_OPERATIONS[itemType] || [];
  const selectedCount = selectedItems.length;

  const handleOperationClick = (operation: BulkOperation) => {
    setSelectedOperation(operation);
    setOperationResult(null);
    setProgress(0);
    
    if (operation.requiresConfirmation) {
      setShowDialog(true);
    } else {
      executeOperation(operation);
    }
  };

  const executeOperation = async (operation: BulkOperation) => {
    if (selectedItems.length === 0) {
      toast.error('No hay elementos seleccionados');
      return;
    }

    setLoading(true);
    setProgress(0);
    
    try {
      let endpoint = '';
      let method = 'POST';
      let body: any = {
        action: operation.type,
        item_ids: selectedItems,
        eventId,
      };

      // Configure endpoint based on item type and operation
      switch (itemType) {
        case 'students':
          endpoint = `/api/admin/events/${eventId}/students/bulk`;
          if (operation.type === 'email') {
            body.email_options = emailOptions;
          }
          break;
        case 'courses':
          endpoint = `/api/admin/events/${eventId}/courses/bulk`;
          break;
        case 'photos':
          endpoint = `/api/admin/events/${eventId}/photos/bulk`;
          break;
      }

      // Handle special operations
      if (operation.type === 'export') {
        await handleExport(operation);
        return;
      }

      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to execute ${operation.title}`);
      }

      const result = await response.json();
      setOperationResult(result);

      // Show success message
      toast.success(`${operation.title} completado exitosamente`);
      
      // Clear selection and refresh data
      onClearSelection?.();
      onOperationComplete?.();

    } catch (error) {
      console.error(`Error executing ${operation.title}:`, error);
      toast.error(error instanceof Error ? error.message : `Error ejecutando ${operation.title}`);
      setOperationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (operation: BulkOperation) => {
    try {
      let endpoint = '';
      switch (itemType) {
        case 'students':
          endpoint = `/api/admin/events/${eventId}/students/export`;
          break;
        case 'courses':
          endpoint = `/api/admin/events/${eventId}/courses/export`;
          break;
        case 'photos':
          endpoint = `/api/admin/events/${eventId}/photos/export`;
          break;
      }

      const response = await fetch(`${endpoint}?ids=${selectedItems.join(',')}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${itemType}-export-${new Date().getTime()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Archivo descargado exitosamente');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error al exportar archivo');
    }
  };

  const confirmOperation = () => {
    if (selectedOperation) {
      setShowDialog(false);
      executeOperation(selectedOperation);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk Operations Bar - Mobile responsive */}
      <div className="sticky bottom-4 z-40 mx-4">
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                {selectedCount} seleccionados
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
                className="text-muted-foreground hover:text-foreground"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Deseleccionar
              </Button>
            </div>

            {/* Action Buttons - Scrollable on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
              {operations.map((operation) => (
                <Button
                  key={operation.id}
                  variant={operation.dangerous ? 'destructive' : 'secondary'}
                  size="sm"
                  onClick={() => handleOperationClick(operation)}
                  disabled={loading}
                  className="shrink-0"
                >
                  {loading && selectedOperation?.id === operation.id ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    operation.icon
                  )}
                  <span className="hidden sm:inline ml-2">{operation.title}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  Ejecutando {selectedOperation?.title}...
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {operationResult && (
            <div className="mt-4 p-3 rounded-lg border">
              {operationResult.success !== false ? (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    {selectedOperation?.title} completado exitosamente
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{operationResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOperation?.dangerous && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              Confirmar {selectedOperation?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedOperation?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Esta acción afectará <strong>{selectedCount}</strong> {itemType}
              </span>
            </div>

            {selectedOperation?.dangerous && (
              <div className="flex items-start gap-3 p-3 border-l-4 border-destructive bg-destructive/10 rounded">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Acción peligrosa</p>
                  <p className="text-sm text-muted-foreground">
                    Esta operación no se puede deshacer. Asegúrate de que quieres continuar.
                  </p>
                </div>
              </div>
            )}

            {/* Email Options */}
            {selectedOperation?.type === 'email' && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="includeQR"
                    checked={emailOptions.includeQR}
                    onCheckedChange={(checked) =>
                      setEmailOptions(prev => ({ ...prev, includeQR: checked }))
                    }
                  />
                  <Label htmlFor="includeQR">Incluir código QR en el email</Label>
                </div>
                
                <div>
                  <Label htmlFor="customMessage">Mensaje personalizado (opcional)</Label>
                  <Textarea
                    id="customMessage"
                    placeholder="Mensaje adicional para incluir en el email..."
                    value={emailOptions.customMessage}
                    onChange={(e) =>
                      setEmailOptions(prev => ({ ...prev, customMessage: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant={selectedOperation?.dangerous ? 'destructive' : 'default'}
              onClick={confirmOperation}
              disabled={loading}
            >
              {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
              {selectedOperation?.dangerous ? 'Confirmar eliminación' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}