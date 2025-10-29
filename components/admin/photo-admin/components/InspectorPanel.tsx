/**
 * Inspector Panel Component
 * Displays details for selected photos and provides bulk actions
 * Extracted from PhotoAdmin.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Eye,
  Copy,
  Star,
  Download,
  Trash2,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import type { OptimizedAsset, OptimizedFolder } from '../../photo-admin';
import { SafeImage, getPreviewUrl } from '../../photo-admin';
import { statusLabel } from '@/lib/utils/photo-helpers';

interface InspectorPanelProps {
  selectedAssets: OptimizedAsset[];
  folders?: OptimizedFolder[];
  currentFolderId?: string | null;
  onBulkMove: (targetFolderId: string) => void;
  onBulkDelete: () => void;
  onCreateAlbum: () => void;
  egressMetrics?: {
    totalRequests: number;
    totalBytes: number;
    currentSession: number;
    warningThreshold: number;
    criticalThreshold: number;
  };
  className?: string;
  albumTargetInfo?: string;
}

export function InspectorPanel({
  selectedAssets,
  folders = [],
  currentFolderId,
  onBulkMove,
  onBulkDelete,
  onCreateAlbum,
  egressMetrics,
  className,
  albumTargetInfo,
}: InspectorPanelProps) {
  const totalSize = selectedAssets.reduce(
    (sum, asset) => sum + asset.file_size,
    0
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const primaryAsset = selectedAssets[0] ?? null;
  const [draftName, setDraftName] = useState('');

  useEffect(() => {
    setDraftName(primaryAsset?.filename ?? '');
  }, [primaryAsset?.id, primaryAsset?.filename]);

  const handleNameBlur = () => {
    if (!primaryAsset) return;
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(primaryAsset.filename ?? '');
      return;
    }
    if (trimmed !== primaryAsset.filename) {
      toast.info('Renombrado rápido llegará en la próxima iteración.');
    }
  };

  const copyToClipboard = (value: string) => {
    if (!value) return;
    try {
      navigator.clipboard.writeText(value);
      toast.success('Copiado al portapapeles');
    } catch (error) {
      console.warn('Clipboard copy failed', error);
      toast.error('No se pudo copiar');
    }
  };

  const primarySize = primaryAsset
    ? formatFileSize(primaryAsset.file_size)
    : null;
  const primaryDate = primaryAsset?.created_at
    ? new Date(primaryAsset.created_at).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
  const primaryStatus = primaryAsset?.status
    ? statusLabel(primaryAsset.status)
    : null;

  return (
    <div className={cn('flex h-full flex-col bg-white', className)}>
      <div className="border-b px-4 py-3">
        <h3 className="text-lg font-semibold">Inspector</h3>
        <p className="text-xs text-muted-foreground">
          Mantén el flujo de navegador mientras editas y automatizas.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedAssets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-muted-foreground/50 bg-muted/30 text-center text-sm text-muted-foreground">
            <Eye className="h-8 w-8 text-muted-foreground" />
            <p>Selecciona fotos o carpetas para ver su resumen aquí.</p>
            <span className="text-xs">
              Sugerencia: usa Shift + clic para rangos rápidos.
            </span>
          </div>
        ) : (
          <Tabs defaultValue="summary" className="flex h-full flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumen</TabsTrigger>
              <TabsTrigger value="metadata">Metadatos</TabsTrigger>
              <TabsTrigger value="automation">Automatizaciones</TabsTrigger>
            </TabsList>

            <TabsContent
              value="summary"
              className="mt-4 space-y-4 focus:outline-none"
            >
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Seleccionadas</span>
                    <span className="font-medium text-foreground">
                      {selectedAssets.length}{' '}
                      {selectedAssets.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tamaño total</span>
                    <span className="font-medium text-foreground">
                      {formatFileSize(totalSize)}
                    </span>
                  </div>
                  {selectedAssets.some(
                    (asset) => asset.status && asset.status !== 'ready'
                  ) && (
                    <div className="space-y-1 text-xs">
                      <span className="text-muted-foreground">Estados</span>
                      <div className="flex flex-wrap gap-1">
                        {(
                          ['ready', 'processing', 'error', 'pending'] as const
                        ).map((status) => {
                          const count = selectedAssets.filter(
                            (asset) => asset.status === status
                          ).length;
                          return count > 0 ? (
                            <Badge
                              key={status}
                              variant="secondary"
                              className="text-xs"
                            >
                              {count} {statusLabel(status)}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {egressMetrics && (
                <Card
                  className={cn(
                    egressMetrics.currentSession >
                      egressMetrics.warningThreshold && 'border-yellow-300',
                    egressMetrics.currentSession >
                      egressMetrics.criticalThreshold && 'border-red-300'
                  )}
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Uso de datos</h4>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between font-medium text-foreground">
                        <span>Sesión</span>
                        <span>
                          {formatFileSize(egressMetrics.currentSession)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Solicitudes</span>
                        <span>{egressMetrics.totalRequests}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            'h-1.5 rounded-full transition-all',
                            egressMetrics.currentSession >
                              egressMetrics.criticalThreshold
                              ? 'bg-red-500'
                              : egressMetrics.currentSession >
                                  egressMetrics.warningThreshold
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                          )}
                          style={{
                            width: `${Math.min(
                              (egressMetrics.currentSession /
                                egressMetrics.criticalThreshold) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="space-y-2 p-4">
                  <h4 className="font-medium">Atajos rápidos</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      <span className="font-medium text-foreground">
                        Shift + clic
                      </span>{' '}
                      selecciona rangos contiguos.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Ctrl/Cmd + A
                      </span>{' '}
                      carga y selecciona todas las fotos visibles.
                    </li>
                    <li>
                      <span className="font-medium text-foreground">
                        Delete
                      </span>{' '}
                      abre la confirmación de eliminación.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="metadata"
              className="mt-4 space-y-4 focus:outline-none"
            >
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Ficha de la selección</h4>
                    {primaryAsset?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(primaryAsset.id)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar ID
                      </Button>
                    )}
                  </div>
                  {primaryAsset ? (
                    <div className="space-y-4">
                      {(primaryAsset.preview_url ??
                        getPreviewUrl(
                          primaryAsset.preview_path,
                          primaryAsset.original_path
                        )) && (
                        <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                          <SafeImage
                            src={
                              primaryAsset.preview_url ??
                              getPreviewUrl(
                                primaryAsset.preview_path,
                                primaryAsset.original_path
                              )
                            }
                            alt={primaryAsset.filename}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">
                          Nombre de archivo
                        </Label>
                        <Input
                          value={draftName}
                          onChange={(event) => setDraftName(event.target.value)}
                          onBlur={handleNameBlur}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{primarySize}</span>
                          {primaryStatus && (
                            <Badge variant="outline" className="text-xs">
                              {primaryStatus}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                        {primaryDate && (
                          <div className="flex justify-between">
                            <span>Creada</span>
                            <span className="font-medium text-foreground">
                              {primaryDate}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Carpeta actual</span>
                          <span className="font-medium text-foreground">
                            {currentFolderId
                              ? folders.find(
                                  (folder) => folder.id === currentFolderId
                                )?.name || 'Sin nombre'
                              : 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Selecciona una única foto para editar sus metadatos
                      rápidos.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="automation"
              className="mt-4 space-y-4 focus:outline-none"
            >
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Acciones masivas</h4>
                    {albumTargetInfo && (
                      <span className="text-[11px] text-muted-foreground">
                        {albumTargetInfo}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={onCreateAlbum}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Crear enlace
                    </Button>
                    <Select onValueChange={(value) => onBulkMove(value)}>
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue placeholder="Mover a carpeta" />
                      </SelectTrigger>
                      <SelectContent>
                        {folders
                          .filter((folder) => folder.id !== currentFolderId)
                          .map((folder) => (
                            <SelectItem key={folder.id} value={folder.id}>
                              {`${' '.repeat((folder.depth || 0) * 2)}${folder.name}`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar ({selectedAssets.length})
                    </Button>
                    <Separator />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full justify-start"
                      onClick={onBulkDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar ({selectedAssets.length})
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="space-y-2 p-4">
                  <h4 className="font-medium">Consejos de automatización</h4>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      Combina carpetas destacadas con el árbol para mover fotos
                      más rápido.
                    </li>
                    <li>
                      Las descargas masivas se muestran en el panel de estado
                      del sistema.
                    </li>
                    <li>
                      Comparte enlaces sin salir de esta vista usando el botón
                      "Crear enlace".
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}


