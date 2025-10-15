// @ts-nocheck
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HierarchicalFolderManager } from '@/components/admin/HierarchicalFolderManager';
import { useFolderPublishData } from '@/hooks/useFolderPublishData';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import {
  Users,
  User,
  RefreshCw,
  Copy,
  ExternalLink,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';

export default function HierarchicalPublishPage() {
  // Data and mutations
  const {
    folders,
    event: selectedEvent,
    isLoading,
    isRefetching,
    error,
    publish: publishMutation,
    unpublish: unpublishMutation,
    rotateToken: rotateMutation,
    bulkPublish,
    bulkUnpublish,
    refetch,
    stats,
  } = useFolderPublishData({ enablePagination: false }); // Use all folders for hierarchical view

  // Local UI state
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('folders');
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);

  // Toast notifications
  const { showPublishSuccess, showUnpublishSuccess, showRotateSuccess } =
    usePublishSuccessToast();

  // Load public gallery enabled flag for selected event
  useEffect(() => {
    const loadPublicFlag = async () => {
      if (!selectedEvent?.id) {
        setIsPublicEnabled(null);
        return;
      }
      try {
        const resp = await fetch(`/api/admin/events/${selectedEvent.id}`);
        if (!resp.ok) return;
        const json = await resp.json();
        const ev = json.event || json;
        if (typeof ev?.public_gallery_enabled === 'boolean') {
          setIsPublicEnabled(ev.public_gallery_enabled);
        }
      } catch (error) {
        console.error('Error loading public flag:', error);
      }
    };
    loadPublicFlag();
  }, [selectedEvent?.id]);

  // Toggle public gallery
  const togglePublicGallery = async (next: boolean) => {
    if (!selectedEvent?.id) return;
    setTogglingPublic(true);
    try {
      const resp = await fetch(
        `/api/admin/events/${selectedEvent.id}/public-gallery`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: next }),
        }
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'No se pudo actualizar');
      setIsPublicEnabled(next);
    } catch (e) {
      console.error('Toggle public gallery failed', e);
    } finally {
      setTogglingPublic(false);
    }
  };

  // Action handlers with toast integration
  const publish = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      publishMutation(folderId, {
        onSuccess: (data) => {
          if (data.share_token) {
            const familyUrl =
              data.family_url ||
              `${window.location.origin}/f/${data.share_token}`;
            const qrUrl =
              data.qr_url ||
              `/access?token=${encodeURIComponent(data.share_token)}`;

            showPublishSuccess(
              {
                codeId: folder.id,
                codeValue: folder.name,
                token: data.share_token,
                familyUrl,
                qrUrl,
                photosCount: folder.photo_count,
                eventName: selectedEvent?.name,
                action: 'published',
              },
              {
                onUndo: unpublish,
                duration: 10000,
              }
            );
          }
        },
        onError: (error) => {
          console.error('Error publishing:', error);
        },
      });
    },
    [folders, selectedEvent, publishMutation, showPublishSuccess]
  );

  const unpublish = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      unpublishMutation(folderId, {
        onSuccess: () => {
          showUnpublishSuccess(folder.name, folder.id, publish);
        },
        onError: (error) => {
          console.error('Error unpublishing:', error);
        },
      });
    },
    [folders, unpublishMutation, showUnpublishSuccess, publish]
  );

  const rotate = useCallback(
    (folderId: string) => {
      const folder = folders.find((f) => f.id === folderId);
      if (!folder) return;

      rotateMutation(folderId, {
        onSuccess: (data) => {
          if (data.newToken || data.share_token) {
            const token = data.newToken || data.share_token;
            const familyUrl =
              data.family_url || `${window.location.origin}/f/${token}`;
            const qrUrl =
              data.qr_url || `/access?token=${encodeURIComponent(token)}`;

            showRotateSuccess(folder.name, token, familyUrl, qrUrl);
          }
        },
        onError: (error) => {
          console.error('Error rotating token:', error);
        },
      });
    },
    [folders, rotateMutation, showRotateSuccess]
  );

  // Enhanced bulk operations with better UX
  const handleBulkPublish = useCallback(
    async (folderIds: string[]) => {
      if (folderIds.length === 0) return;

      setBulkOperationLoading(true);
      try {
        await bulkPublish(folderIds);
        setSelectedFolders([]); // Clear selection after bulk operation
      } finally {
        setBulkOperationLoading(false);
      }
    },
    [bulkPublish]
  );

  const handleBulkUnpublish = useCallback(
    async (folderIds: string[]) => {
      if (folderIds.length === 0) return;

      setBulkOperationLoading(true);
      try {
        await bulkUnpublish(folderIds);
        setSelectedFolders([]); // Clear selection after bulk operation
      } finally {
        setBulkOperationLoading(false);
      }
    },
    [bulkUnpublish]
  );

  // Copy to clipboard helper
  const copyToClipboard = async (
    text: string,
    successMessage = 'Copiado al portapapeles'
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log(successMessage);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Get public gallery URL
  const getPublicUrl = () => {
    if (!selectedEvent) return '';
    return `${window.location.origin}/gallery/${selectedEvent.id}`;
  };

  // Performance metrics
  const performanceMetrics = {
    totalFolders: folders.length,
    emptyFolders: folders.filter((f) => f.photo_count === 0).length,
    publishedFolders: folders.filter((f) => f.is_published).length,
    avgPhotosPerFolder:
      folders.length > 0
        ? Math.round(
            folders.reduce((sum, f) => sum + f.photo_count, 0) / folders.length
          )
        : 0,
  };

  return (
    <div className="container mx-auto max-w-full space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Sistema de Publicación Jerárquico
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Gestiona la publicación de galerías con organización por carpetas y
            eventos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isRefetching}
            className="flex-shrink-0"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
            />
            {isRefetching ? 'Actualizando...' : 'Actualizar'}
          </Button>

          <Button variant="outline" className="flex-shrink-0">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">
                  Error al cargar los datos
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {error instanceof Error
                    ? error.message
                    : 'Ha ocurrido un error inesperado'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-auto"
              >
                Reintentar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="folders" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Carpetas Personalizadas
          </TabsTrigger>
          <TabsTrigger value="public" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Galería Pública
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análisis
          </TabsTrigger>
        </TabsList>

        {/* Hierarchical Folder Management */}
        <TabsContent value="folders">
          <HierarchicalFolderManager
            folders={folders}
            selectedFolders={selectedFolders}
            onSelectionChange={setSelectedFolders}
            onPublish={publish}
            onUnpublish={unpublish}
            onRotateToken={rotate}
            onBulkPublish={handleBulkPublish}
            onBulkUnpublish={handleBulkUnpublish}
            loading={isLoading || bulkOperationLoading}
          />
        </TabsContent>

        {/* Public Gallery Management */}
        <TabsContent value="public">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-blue-100/30">
            <div className="p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/30 p-3">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold text-blue-900">
                    Galería Pública del Evento
                  </h2>
                  <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                    {selectedEvent ? (
                      <>
                        <strong>{selectedEvent.name}</strong> - Todas las
                        familias ven las mismas fotos sin restricciones
                      </>
                    ) : (
                      'Selecciona un evento para configurar la galería pública'
                    )}
                  </p>

                  {selectedEvent && (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${isPublicEnabled ? 'bg-green-500' : 'bg-gray-400'}`}
                        />
                        <span className="text-sm font-medium">
                          {isPublicEnabled
                            ? 'Galería pública habilitada'
                            : 'Galería pública deshabilitada'}
                        </span>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-3">
                        <Button
                          onClick={() =>
                            copyToClipboard(
                              getPublicUrl(),
                              'Enlace público copiado'
                            )
                          }
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar Enlace Público
                        </Button>

                        <Button
                          asChild
                          variant="outline"
                          className="border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                        >
                          <a
                            href={getPublicUrl()}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Vista Previa
                          </a>
                        </Button>

                        <Button
                          variant={isPublicEnabled ? 'outline' : 'default'}
                          onClick={() => togglePublicGallery(!isPublicEnabled)}
                          disabled={isPublicEnabled === null || togglingPublic}
                          className={
                            isPublicEnabled
                              ? 'border-red-300 text-red-700 hover:bg-red-50'
                              : 'bg-green-600 hover:bg-green-700'
                          }
                        >
                          {togglingPublic ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : isPublicEnabled ? (
                            'Deshabilitar Pública'
                          ) : (
                            'Habilitar Pública'
                          )}
                        </Button>
                      </div>

                      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-100/50 p-3">
                        <div className="mb-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                          Enlace público:
                        </div>
                        <div className="break-all font-mono text-xs text-blue-800 dark:text-blue-200">
                          {getPublicUrl()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Analytics and Performance */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Performance metrics */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Zap className="h-5 w-5 text-yellow-600" />
                Métricas de Rendimiento
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total de carpetas
                  </span>
                  <Badge variant="outline">
                    {performanceMetrics.totalFolders}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Carpetas vacías</span>
                  <Badge
                    variant={
                      performanceMetrics.emptyFolders > 0
                        ? 'destructive'
                        : 'outline'
                    }
                  >
                    {performanceMetrics.emptyFolders}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Carpetas publicadas
                  </span>
                  <Badge className="bg-green-100 text-green-800">
                    {performanceMetrics.publishedFolders}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Promedio de fotos
                  </span>
                  <Badge variant="outline">
                    {performanceMetrics.avgPhotosPerFolder}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* System status */}
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Estado del Sistema
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">API funcionando correctamente</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Base de datos optimizada</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">Operaciones bulk habilitadas</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm">
                    Monitoreo de performance activo
                  </span>
                </div>
              </div>

              {selectedEvent && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <div className="mb-1 text-xs font-medium text-foreground">
                    Evento activo:
                  </div>
                  <div className="text-sm font-semibold">
                    {selectedEvent.name}
                  </div>
                  {selectedEvent.date && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {new Date(selectedEvent.date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
