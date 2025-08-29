'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  X,
  Eye,
  EyeOff,
  FolderOpen,
  Move,
  Trash2,
  Download,
  Filter,
  Search,
  CheckSquare,
  MoreHorizontal,
  Loader2,
  Calendar,
  FileImage,
  Users,
  Tag,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Photo {
  id: string;
  event_id: string;
  folder_id: string | null;
  original_filename: string;
  storage_path: string;
  preview_path?: string;
  watermark_path?: string;
  file_size: number;
  width: number;
  height: number;
  approved: boolean;
  processing_status: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  signed_url?: string;
  folder?: {
    id: string;
    name: string;
    path: string;
  };
}

interface Folder {
  id: string;
  name: string;
  path: string;
  depth: number;
  child_folder_count: number;
  photo_count: number;
}

interface PhotoFilter {
  search: string;
  approved?: boolean | null;
  folder_id?: string | null;
  date_from?: string;
  date_to?: string;
  file_size_min?: number | null;
  file_size_max?: number | null;
  processing_status?: string;
}

interface BulkOperation {
  type: 'approve' | 'reject' | 'move' | 'delete' | 'download';
  photos: string[];
  target_folder_id?: string | null;
  options?: Record<string, any>;
}

interface BulkPhotoManagerProps {
  eventId: string;
  photos: Photo[];
  folders: Folder[];
  onPhotosUpdated: () => void;
  onClose?: () => void;
  className?: string;
}

export function BulkPhotoManager({
  eventId,
  photos: initialPhotos,
  folders,
  onPhotosUpdated,
  onClose,
  className,
}: BulkPhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<PhotoFilter>({
    search: '',
    approved: null,
    folder_id: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [pendingOperation, setPendingOperation] =
    useState<BulkOperation | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [operationProgress, setOperationProgress] = useState<{
    current: number;
    total: number;
    operation: string;
  } | null>(null);

  // Update photos when prop changes
  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  // Filter photos based on current filters
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // Search filter
      if (
        filters.search &&
        !photo.original_filename
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      ) {
        return false;
      }

      // Approval filter
      if (filters.approved !== null && photo.approved !== filters.approved) {
        return false;
      }

      // Folder filter
      if (filters.folder_id !== null && photo.folder_id !== filters.folder_id) {
        return false;
      }

      // Date filter
      if (filters.date_from) {
        const photoDate = new Date(photo.created_at);
        const fromDate = new Date(filters.date_from);
        if (photoDate < fromDate) return false;
      }

      if (filters.date_to) {
        const photoDate = new Date(photo.created_at);
        const toDate = new Date(filters.date_to);
        toDate.setHours(23, 59, 59, 999);
        if (photoDate > toDate) return false;
      }

      // File size filter
      if (
        filters.file_size_min &&
        photo.file_size < filters.file_size_min * 1024
      ) {
        return false;
      }

      if (
        filters.file_size_max &&
        photo.file_size > filters.file_size_max * 1024
      ) {
        return false;
      }

      // Processing status filter
      if (
        filters.processing_status &&
        photo.processing_status !== filters.processing_status
      ) {
        return false;
      }

      return true;
    });
  }, [photos, filters]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredPhotos.length;
    const selected = selectedPhotos.size;
    const approved = filteredPhotos.filter((p) => p.approved).length;
    const pending = total - approved;
    const totalSizeKB = filteredPhotos.reduce(
      (sum, p) => sum + Math.round(p.file_size / 1024),
      0
    );

    return {
      total,
      selected,
      approved,
      pending,
      totalSizeKB,
      selectedSizeKB: filteredPhotos
        .filter((p) => selectedPhotos.has(p.id))
        .reduce((sum, p) => sum + Math.round(p.file_size / 1024), 0),
    };
  }, [filteredPhotos, selectedPhotos]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  }, [filteredPhotos, selectedPhotos]);

  const handleSelectPhoto = useCallback(
    (photoId: string, selected: boolean) => {
      setSelectedPhotos((prev) => {
        const newSet = new Set(prev);
        if (selected) {
          newSet.add(photoId);
        } else {
          newSet.delete(photoId);
        }
        return newSet;
      });
    },
    []
  );

  const handleSelectByFilter = useCallback(
    (criteria: 'approved' | 'pending' | 'folder') => {
      let photosToSelect: Photo[] = [];

      switch (criteria) {
        case 'approved':
          photosToSelect = filteredPhotos.filter((p) => p.approved);
          break;
        case 'pending':
          photosToSelect = filteredPhotos.filter((p) => !p.approved);
          break;
        case 'folder':
          // Select photos in the currently selected folder
          photosToSelect = filteredPhotos.filter(
            (p) => p.folder_id === filters.folder_id
          );
          break;
      }

      setSelectedPhotos(new Set(photosToSelect.map((p) => p.id)));
    },
    [filteredPhotos, filters.folder_id]
  );

  // Bulk operations
  const executeBulkOperation = useCallback(
    async (operation: BulkOperation) => {
      setIsLoading(true);
      setOperationProgress({
        current: 0,
        total: operation.photos.length,
        operation: operation.type,
      });

      try {
        const batchSize = 10; // Process in batches to avoid overwhelming the server
        const batches = [];

        for (let i = 0; i < operation.photos.length; i += batchSize) {
          batches.push(operation.photos.slice(i, i + batchSize));
        }

        let processedCount = 0;

        for (const batch of batches) {
          let endpoint = '';
          let method = 'POST';
          let body: any = {};

          switch (operation.type) {
            case 'approve':
              endpoint = `/api/admin/photos/bulk-approve`;
              body = { photoIds: batch, approved: true };
              break;
            case 'reject':
              endpoint = `/api/admin/photos/bulk-approve`;
              body = { photoIds: batch, approved: false };
              break;
            case 'move':
              endpoint = `/api/admin/photos/bulk-move`;
              body = {
                photoIds: batch,
                target_folder_id: operation.target_folder_id,
              };
              break;
            case 'delete':
              endpoint = `/api/admin/photos/bulk-delete`;
              method = 'DELETE';
              body = { photoIds: batch };
              break;
          }

          const response = await fetch(endpoint, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          if (!response.ok) {
            throw new Error(`Failed to ${operation.type} photos`);
          }

          processedCount += batch.length;
          setOperationProgress((prev) =>
            prev
              ? {
                  ...prev,
                  current: processedCount,
                }
              : null
          );

          // Small delay between batches
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Clear selection and refresh
        setSelectedPhotos(new Set());
        onPhotosUpdated();
      } catch (error) {
        console.error(`Bulk ${operation.type} failed:`, error);
        // TODO: Show error notification
      } finally {
        setIsLoading(false);
        setOperationProgress(null);
        setShowBulkDialog(false);
        setShowConfirmDialog(false);
        setPendingOperation(null);
      }
    },
    [onPhotosUpdated]
  );

  const handleBulkAction = useCallback(
    (type: BulkOperation['type'], targetFolderId?: string | null) => {
      if (selectedPhotos.size === 0) return;

      const operation: BulkOperation = {
        type,
        photos: Array.from(selectedPhotos),
        target_folder_id: targetFolderId || null,
      };

      // Show confirmation for destructive actions
      if (type === 'delete') {
        setPendingOperation(operation);
        setShowConfirmDialog(true);
      } else {
        executeBulkOperation(operation);
      }
    },
    [selectedPhotos, executeBulkOperation]
  );

  const formatFileSize = (bytes: number): string => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${Math.round((kb / 1024) * 10) / 10} MB`;
  };

  const getFolderName = (folderId: string | null): string => {
    if (!folderId) return 'Raíz';
    const folder = folders.find((f) => f.id === folderId);
    return folder ? folder.name : 'Carpeta desconocida';
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Gestión Masiva de Fotos
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <div className="text-xs text-blue-700">Total</div>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.approved}
            </div>
            <div className="text-xs text-green-700">Aprobadas</div>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
            <div className="text-xs text-yellow-700">Pendientes</div>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {stats.selected}
            </div>
            <div className="text-xs text-purple-700">Seleccionadas</div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-xs font-medium">
                  Buscar por nombre
                </Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Buscar fotos..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Approval Status */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Estado</Label>
                <Select
                  value={
                    filters.approved === null ? '' : String(filters.approved)
                  }
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      approved: value === '' ? null : value === 'true',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="true">Aprobadas</SelectItem>
                    <SelectItem value="false">Pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Folder Filter */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Carpeta</Label>
                <Select
                  value={filters.folder_id || ''}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      folder_id: value || null,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las carpetas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    <SelectItem value="root">Raíz</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          <span
                            style={{ paddingLeft: `${folder.depth * 12}px` }}
                          >
                            {folder.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="date-from" className="text-xs">
                    Desde
                  </Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={filters.date_from || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        date_from: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="date-to" className="text-xs">
                    Hasta
                  </Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={filters.date_to || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        date_to: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              {/* File Size Range */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="size-min" className="text-xs">
                    Tamaño min (KB)
                  </Label>
                  <Input
                    id="size-min"
                    type="number"
                    placeholder="Min KB"
                    value={filters.file_size_min || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        file_size_min: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="size-max" className="text-xs">
                    Tamaño max (KB)
                  </Label>
                  <Input
                    id="size-max"
                    type="number"
                    placeholder="Max KB"
                    value={filters.file_size_max || ''}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        file_size_max: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selection Tools */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Selección
              </div>
              <Badge variant="secondary">
                {stats.selected} de {stats.total}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="gap-2"
              >
                <CheckSquare className="h-3 w-3" />
                {selectedPhotos.size === filteredPhotos.length
                  ? 'Deseleccionar'
                  : 'Seleccionar'}{' '}
                Todo
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectByFilter('approved')}
                className="gap-2"
              >
                <CheckCircle2 className="h-3 w-3" />
                Aprobadas ({stats.approved})
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSelectByFilter('pending')}
                className="gap-2"
              >
                <Eye className="h-3 w-3" />
                Pendientes ({stats.pending})
              </Button>

              {filters.folder_id && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectByFilter('folder')}
                  className="gap-2"
                >
                  <FolderOpen className="h-3 w-3" />
                  En carpeta actual
                </Button>
              )}
            </div>

            {stats.selected > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-blue-700">
                    {stats.selected} fotos seleccionadas
                  </span>
                  <span className="text-blue-600">
                    {Math.round((stats.selectedSizeKB / 1024) * 10) / 10} MB
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {stats.selected > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-green-700">
                <TrendingUp className="h-4 w-4" />
                Acciones Masivas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleBulkAction('approve')}
                  disabled={isLoading}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Aprobar
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('reject')}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <EyeOff className="h-3 w-3" />
                  Rechazar
                </Button>

                <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      className="gap-2"
                    >
                      <Move className="h-3 w-3" />
                      Mover
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Mover {stats.selected} fotos</DialogTitle>
                      <DialogDescription>
                        Selecciona la carpeta de destino para las fotos
                        seleccionadas
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <Select
                        onValueChange={(folderId) => {
                          handleBulkAction(
                            'move',
                            folderId === 'root' ? null : folderId
                          );
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar carpeta destino" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="root">Raíz del evento</SelectItem>
                          {folders.map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                <span
                                  style={{
                                    paddingLeft: `${folder.depth * 12}px`,
                                  }}
                                >
                                  {folder.name}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleBulkAction('delete')}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </Button>
              </div>

              {isLoading && operationProgress && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Procesando {operationProgress.operation}...</span>
                    <span>
                      {operationProgress.current} / {operationProgress.total}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all duration-300"
                      style={{
                        width: `${(operationProgress.current / operationProgress.total) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Photo List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Fotos ({filteredPhotos.length})</span>
              {stats.totalSizeKB > 0 && (
                <Badge variant="outline">
                  {Math.round((stats.totalSizeKB / 1024) * 10) / 10} MB total
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {filteredPhotos.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No se encontraron fotos con los filtros aplicados
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 transition-all',
                        selectedPhotos.has(photo.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Checkbox
                        checked={selectedPhotos.has(photo.id)}
                        onCheckedChange={(checked) =>
                          handleSelectPhoto(photo.id, checked as boolean)
                        }
                      />

                      <div className="min-w-0 flex-grow">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium">
                            {photo.original_filename}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={photo.approved ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {photo.approved ? 'Aprobada' : 'Pendiente'}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatFileSize(photo.file_size)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            {photo.width} × {photo.height}
                          </span>
                          <span>{getFolderName(photo.folder_id)}</span>
                          <span>
                            {new Date(photo.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </CardContent>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas eliminar{' '}
              {pendingOperation?.photos.length} fotos? Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingOperation && executeBulkOperation(pendingOperation)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
