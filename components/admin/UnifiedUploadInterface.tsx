'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  Zap,
  Image as ImageIcon,
  FolderOpen,
  Info,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { UploadInterface } from '@/app/admin/events/[id]/library/components/UploadInterface';
import { BulkPhotoUploader } from './BulkPhotoUploader';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  path: string;
  depth: number;
  child_folder_count: number;
  photo_count: number;
}

interface UnifiedUploadInterfaceProps {
  eventId: string;
  eventName?: string;
  currentFolderId: string | null;
  currentFolderName?: string;
  folders: Folder[];
  onUploadComplete: (photoIds: string[]) => void;
  onClose?: () => void;
  className?: string;
}

export function UnifiedUploadInterface({
  eventId,
  eventName,
  currentFolderId,
  currentFolderName,
  folders,
  onUploadComplete,
  onClose,
  className,
}: UnifiedUploadInterfaceProps) {
  const [activeTab, setActiveTab] = useState<'simple' | 'bulk'>('simple');
  const [uploadStats, setUploadStats] = useState({
    totalUploaded: 0,
    totalOptimized: 0,
    averageCompressionRatio: 0,
  });

  const handleSimpleUploadComplete = useCallback(
    (photoIds: string[]) => {
      setUploadStats((prev) => ({
        ...prev,
        totalUploaded: prev.totalUploaded + photoIds.length,
      }));
      onUploadComplete(photoIds);
    },
    [onUploadComplete]
  );

  const handleBulkUploadComplete = useCallback(
    (results: { succeeded: string[]; failed: any[] }) => {
      setUploadStats((prev) => ({
        ...prev,
        totalUploaded: prev.totalUploaded + results.succeeded.length,
      }));
      onUploadComplete(results.succeeded);
    },
    [onUploadComplete]
  );

  const getCurrentFolderPath = () => {
    if (!currentFolderId) return 'Raíz del evento';
    const folder = folders.find((f) => f.id === currentFolderId);
    return folder ? folder.path : currentFolderName || 'Carpeta seleccionada';
  };

  return (
    <Card className={cn('mx-auto w-full max-w-4xl', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Fotos
            </CardTitle>
            {eventName && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Evento: <span className="font-medium">{eventName}</span>
              </p>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-xs">
              📁 Destino: {getCurrentFolderPath()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {uploadStats.totalUploaded > 0 && (
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {uploadStats.totalUploaded} subidas
              </Badge>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'simple' | 'bulk')}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Subida Simple
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Zap className="h-4 w-4" />
              Subida Masiva
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Mode Description */}
            <div className="grid grid-cols-1 gap-4 rounded-lg bg-muted p-4 md:grid-cols-2">
              <div
                className={cn(
                  'rounded border p-3 transition-all',
                  activeTab === 'simple'
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-border'
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ImageIcon className="h-4 w-4" />
                  Subida Simple
                </div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Ideal para pocas fotos (hasta 20). Sube una por una con vista
                  previa inmediata.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  1-20 fotos • Vista previa • Control individual
                </div>
              </div>

              <div
                className={cn(
                  'rounded border p-3 transition-all',
                  activeTab === 'bulk'
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-border'
                )}
              >
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4" />
                  Subida Masiva
                </div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Para muchas fotos (cientos). Subida en lotes con progreso
                  detallado.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3" />
                  Muchas fotos • Lotes • Estadísticas avanzadas
                </div>
              </div>
            </div>

            {/* Optimization Notice */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                <div className="text-sm">
                  <p className="mb-1 font-medium text-blue-700 dark:text-blue-300">
                    Optimización automática activada
                  </p>
                  <p className="text-xs leading-relaxed text-blue-600 dark:text-blue-400">
                    Todas las fotos se optimizan automáticamente a{' '}
                    <strong>35KB</strong> con marca de agua "
                    <strong>LOOK ESCOLAR</strong>" para maximizar el espacio del
                    plan gratuito de Supabase.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <TabsContent value="simple" className="mt-6">
            <UploadInterface
              eventId={eventId}
              currentFolderId={currentFolderId}
              currentFolderName={currentFolderName || undefined}
              onUploadComplete={handleSimpleUploadComplete}
              className="border-0 p-0 shadow-none"
            />
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <BulkPhotoUploader
              eventId={eventId}
              eventName={eventName || undefined}
              defaultFolderId={currentFolderId}
              folders={folders}
              onUploadComplete={handleBulkUploadComplete}
              className="border-0 shadow-none"
              maxConcurrentUploads={3} // Conservative for free tier
            />
          </TabsContent>
        </Tabs>

        {/* Upload Statistics */}
        {uploadStats.totalUploaded > 0 && (
          <div className="mt-6 border-t pt-4">
            <h4 className="mb-2 text-sm font-medium text-foreground">
              Estadísticas de esta sesión
            </h4>
            <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="text-lg font-bold text-green-600">
                  {uploadStats.totalUploaded}
                </div>
                <div className="text-xs text-green-700">Fotos subidas</div>
              </div>
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                <div className="text-lg font-bold text-purple-600">
                  ~
                  {Math.round(((uploadStats.totalUploaded * 35) / 1024) * 10) /
                    10}{' '}
                  MB
                </div>
                <div className="text-xs text-purple-700">
                  Espacio optimizado
                </div>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-3">
                <div className="text-lg font-bold text-primary">~70%</div>
                <div className="text-xs text-primary-700">
                  Compresión promedio
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Storage Capacity Indicator */}
        <div className="mt-4 rounded-lg bg-muted p-3">
          <div className="mb-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Capacidad estimada del plan gratuito</span>
            <span>~28,500 fotos (1GB)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-green-500 transition-all duration-300"
              style={{
                width: `${Math.min((uploadStats.totalUploaded / 28500) * 100, 100)}%`,
              }}
            ></div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Fotos optimizadas a 35KB cada una para maximizar el espacio
            disponible
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
