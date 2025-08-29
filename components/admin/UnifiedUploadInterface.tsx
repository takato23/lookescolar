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
      setUploadStats(prev => ({
        ...prev,
        totalUploaded: prev.totalUploaded + photoIds.length,
      }));
      onUploadComplete(photoIds);
    },
    [onUploadComplete]
  );

  const handleBulkUploadComplete = useCallback(
    (results: { succeeded: string[]; failed: any[] }) => {
      setUploadStats(prev => ({
        ...prev,
        totalUploaded: prev.totalUploaded + results.succeeded.length,
      }));
      onUploadComplete(results.succeeded);
    },
    [onUploadComplete]
  );

  const getCurrentFolderPath = () => {
    if (!currentFolderId) return 'Raíz del evento';
    const folder = folders.find(f => f.id === currentFolderId);
    return folder ? folder.path : currentFolderName || 'Carpeta seleccionada';
  };

  return (
    <Card className={cn('w-full max-w-4xl mx-auto', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Fotos
            </CardTitle>
            {eventName && (
              <p className="text-sm text-muted-foreground">
                Evento: <span className="font-medium">{eventName}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'simple' | 'bulk')}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className={cn(
                "p-3 rounded border transition-all",
                activeTab === 'simple' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              )}>
                <div className="flex items-center gap-2 font-medium text-sm mb-2">
                  <ImageIcon className="h-4 w-4" />
                  Subida Simple
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Ideal para pocas fotos (hasta 20). Sube una por una con vista previa inmediata.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  1-20 fotos • Vista previa • Control individual
                </div>
              </div>

              <div className={cn(
                "p-3 rounded border transition-all",
                activeTab === 'bulk' ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              )}>
                <div className="flex items-center gap-2 font-medium text-sm mb-2">
                  <Zap className="h-4 w-4" />
                  Subida Masiva
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  Para muchas fotos (cientos). Subida en lotes con progreso detallado.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <TrendingUp className="h-3 w-3" />
                  Muchas fotos • Lotes • Estadísticas avanzadas
                </div>
              </div>
            </div>

            {/* Optimization Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 mb-1">
                    Optimización automática activada
                  </p>
                  <p className="text-blue-600 text-xs leading-relaxed">
                    Todas las fotos se optimizan automáticamente a <strong>35KB</strong> con 
                    marca de agua "<strong>LOOK ESCOLAR</strong>" para maximizar el espacio 
                    del plan gratuito de Supabase.
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
              className="border-0 shadow-none p-0"
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
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Estadísticas de esta sesión
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-lg font-bold text-green-600">
                  {uploadStats.totalUploaded}
                </div>
                <div className="text-xs text-green-700">Fotos subidas</div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-600">
                  ~{Math.round(uploadStats.totalUploaded * 35 / 1024 * 10) / 10} MB
                </div>
                <div className="text-xs text-purple-700">Espacio optimizado</div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-lg font-bold text-orange-600">
                  ~70%
                </div>
                <div className="text-xs text-orange-700">Compresión promedio</div>
              </div>
            </div>
          </div>
        )}

        {/* Storage Capacity Indicator */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
            <span>Capacidad estimada del plan gratuito</span>
            <span>~28,500 fotos (1GB)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${Math.min((uploadStats.totalUploaded / 28500) * 100, 100)}%` 
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Fotos optimizadas a 35KB cada una para maximizar el espacio disponible
          </p>
        </div>
      </CardContent>
    </Card>
  );
}