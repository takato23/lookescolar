'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Download, 
  Share, 
  Move, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Calendar,
  HardDrive,
  Camera,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Photo {
  id: string;
  original_filename: string;
  storage_path: string;
  preview_path?: string;
  file_size: number;
  width: number;
  height: number;
  approved: boolean;
  processing_status: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  signed_url?: string;
}

interface DetailsPanelProps {
  selectedPhoto: Photo | null;
  selectedItemsCount: number;
  onClose: () => void;
  onApprove?: (photoId: string, approved: boolean) => void;
  onDelete?: (photoId: string) => void;
  onMove?: (photoId: string) => void;
  onShare?: (photoId: string) => void;
  onDownload?: (photoId: string) => void;
}

export function DetailsPanel({
  selectedPhoto,
  selectedItemsCount,
  onClose,
  onApprove,
  onDelete,
  onMove,
  onShare,
  onDownload,
}: DetailsPanelProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!selectedPhoto) {
    return (
      <div className="h-full flex flex-col">
        {/* Panel header */}
        <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Detalles</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-sm font-medium text-gray-900 mb-2">
              Selecciona una foto
            </div>
            <div className="text-xs text-gray-500">
              {selectedItemsCount > 0 
                ? `${selectedItemsCount} elemento${selectedItemsCount !== 1 ? 's' : ''} seleccionado${selectedItemsCount !== 1 ? 's' : ''}`
                : 'Haz clic en una foto para ver sus detalles'
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Panel header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Detalles de la foto</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Photo preview */}
      <div className="border-b border-gray-200">
        <div className="aspect-square bg-gray-100 relative">
          {selectedPhoto.signed_url && !imageError ? (
            <Image
              src={selectedPhoto.signed_url}
              alt={selectedPhoto.original_filename}
              fill
              className={cn(
                "object-cover transition-opacity duration-200",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              sizes="300px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
          )}

          {/* Status overlay */}
          <div className="absolute top-2 left-2">
            <Badge 
              variant={selectedPhoto.approved ? "default" : "secondary"}
              className={cn(
                "text-xs",
                selectedPhoto.approved 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              )}
            >
              {selectedPhoto.approved ? "Aprobada" : "Pendiente"}
            </Badge>
          </div>

          {selectedPhoto.processing_status !== 'completed' && (
            <div className="absolute top-2 right-2">
              <Badge variant="outline" className="text-xs bg-white">
                Procesando
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* File info */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Información del archivo</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nombre:</span>
                <span className="text-gray-900 font-mono text-xs truncate ml-2" title={selectedPhoto.original_filename}>
                  {selectedPhoto.original_filename}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensiones:</span>
                <span className="text-gray-900">
                  {selectedPhoto.width} × {selectedPhoto.height}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Tamaño:</span>
                <span className="text-gray-900">
                  {formatFileSize(selectedPhoto.file_size)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Formato:</span>
                <span className="text-gray-900">
                  {selectedPhoto.original_filename.split('.').pop()?.toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Status info */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Estado</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Procesamiento:</span>
                <Badge 
                  variant={selectedPhoto.processing_status === 'completed' ? "default" : "secondary"}
                  className="text-xs"
                >
                  {selectedPhoto.processing_status === 'completed' ? 'Completado' : 'Pendiente'}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Aprobación:</span>
                <Badge 
                  variant={selectedPhoto.approved ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    selectedPhoto.approved 
                      ? "bg-green-100 text-green-800" 
                      : "bg-yellow-100 text-yellow-800"
                  )}
                >
                  {selectedPhoto.approved ? 'Aprobada' : 'Pendiente'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Fechas</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  Subida:
                </span>
                <span className="text-gray-900 text-xs text-right">
                  {formatDate(selectedPhoto.created_at)}
                </span>
              </div>
              
              {selectedPhoto.updated_at !== selectedPhoto.created_at && (
                <div className="flex items-start justify-between">
                  <span className="text-gray-600">Actualizada:</span>
                  <span className="text-gray-900 text-xs text-right">
                    {formatDate(selectedPhoto.updated_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          {selectedPhoto.metadata && Object.keys(selectedPhoto.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Metadatos</h4>
                <div className="space-y-1 text-xs">
                  {Object.entries(selectedPhoto.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">
                        {key.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-gray-900 truncate ml-2">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onApprove?.(selectedPhoto.id, !selectedPhoto.approved)}
            className="flex items-center justify-center"
          >
            {selectedPhoto.approved ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Ocultar
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Aprobar
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onShare?.(selectedPhoto.id)}
            className="flex items-center justify-center"
          >
            <Share className="h-3 w-3 mr-1" />
            Compartir
          </Button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMove?.(selectedPhoto.id)}
            className="flex items-center justify-center"
          >
            <Move className="h-3 w-3 mr-1" />
            Mover
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload?.(selectedPhoto.id)}
            className="flex items-center justify-center"
          >
            <Download className="h-3 w-3 mr-1" />
            Descargar
          </Button>
        </div>

        {/* Destructive action */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete?.(selectedPhoto.id)}
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
        >
          <Trash2 className="h-3 w-3 mr-2" />
          Eliminar foto
        </Button>
      </div>
    </div>
  );
}