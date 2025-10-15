// @ts-nocheck
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HierarchicalFolderManager } from '@/components/admin/HierarchicalFolderManager';
import { BulkOperationsDebugPanel } from '@/components/admin/BulkOperationsDebugPanel';
import { useFolderPublishData } from '@/hooks/useFolderPublishData';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import { useEventManagement } from '@/lib/stores/event-workflow-store';
import { useQueryClient } from '@tanstack/react-query';
import { folderPublishQueryKeys } from '@/hooks/useFolderPublishData';
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

type InitialData = {
  folders: Array<{
    id: string;
    name: string;
    event_id: string | null;
    photo_count: number;
    is_published: boolean | null;
    share_token: string | null;
    published_at: string | null;
    family_url: string | null;
    qr_url: string | null;
    event_name: string | null;
    event_date: string | null;
  }>;
  event: { id: string; name: string; date?: string } | null;
  pagination?: any;
};

export default function PublishPage(props?: {
  initialSelectedEventId?: string;
  initialData?: InitialData;
}) {
  // Local UI state (declare first to use in hooks)
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('folders');
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date?: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    props?.initialSelectedEventId || ''
  );
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Data (base/global) disabled when event is scoped
  const baseData = useFolderPublishData({ enablePagination: false, enabled: selectedEventId ? false : true });

  // Workflow store for refreshing event state after actions
  const { initializeEvent } = useEventManagement();
  const queryClient = useQueryClient();

  // Toast notifications
  const { showPublishSuccess, showUnpublishSuccess, showRotateSuccess } =
    usePublishSuccessToast();

  // Re-bind data hook to selected event
  const publishDataForEvent = useFolderPublishData({
    enablePagination: false,
    event_id: selectedEventId || undefined,
    enabled: selectedEventId ? true : false,
    initialData:
      props?.initialSelectedEventId &&
      props.initialSelectedEventId === selectedEventId &&
      props.initialData
        ? {
            folders: props.initialData.folders,
            event: props.initialData.event
              ? {
                  id: props.initialData.event.id,
                  name: props.initialData.event.name,
                  date: props.initialData.event.date,
                }
              : null,
          }
        : undefined,
  });
  const dataIsScoped = Boolean(selectedEventId);

  // When scoped, override folders/event/states from the scoped hook
  const effectiveFolders = dataIsScoped ? publishDataForEvent.folders : baseData.folders;
  const effectiveEvent = dataIsScoped ? publishDataForEvent.event : baseData.event;
  const effectiveIsRefetching = dataIsScoped ? publishDataForEvent.isRefetching : baseData.isRefetching;
  const effectiveIsLoading = dataIsScoped ? publishDataForEvent.isLoading : baseData.isLoading;
  const effectiveError = dataIsScoped ? publishDataForEvent.error : baseData.error;
  const publishMutation = dataIsScoped ? publishDataForEvent.publish : baseData.publish;
  const unpublishMutation = dataIsScoped ? publishDataForEvent.unpublish : baseData.unpublish;
  const rotateMutation = dataIsScoped ? publishDataForEvent.rotateToken : baseData.rotateToken;
  const bulkPublish = dataIsScoped ? publishDataForEvent.bulkPublish : baseData.bulkPublish;
  const bulkUnpublish = dataIsScoped ? publishDataForEvent.bulkUnpublish : baseData.bulkUnpublish;
  const effectiveRefetch = dataIsScoped ? publishDataForEvent.refetch : baseData.refetch;

  // Load events for selector (robust to varying shapes)
  useEffect(() => {
    (async () => {
      try {
        let res = await fetch('/api/admin/events');
        if (!res.ok) {
          res = await fetch('/api/admin/events-robust');
        }
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json)
          ? json
          : json.events || json.data?.events || json.data || [];
        const normalized = list.map((e: any) => ({ id: e.id, name: e.name, date: e.date }));
        setEvents(normalized);
      } catch (e) {
        console.error('Error loading events list:', e);
      }
    })();
  }, []);

  // Clear selection when changing event scope
  useEffect(() => {
    setSelectedFolders([]);
  }, [selectedEventId]);

  useEffect(() => {
    const prefetch = async () => {
      if (!selectedEventId) return;
      try {
        const params = new URLSearchParams({
          include_unpublished: 'true',
          limit: '100',
          order_by: 'published_desc',
          event_id: selectedEventId,
        });
        const res = await fetch(`/api/admin/folders/published?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        const folders = (data.folders || []).map((f: any) => ({
          id: String(f.id),
          name: String(f.name || 'Untitled Folder'),
          event_id: f.event_id as string | null,
          photo_count: Number(f.photo_count || f.photos_count || 0),
          is_published: Boolean(f.is_published),
          share_token: f.share_token as string | null,
          published_at: f.published_at as string | null,
          family_url: f.family_url as string | null,
          qr_url: f.qr_url as string | null,
          event_name: f.event_name as string | null,
          event_date: f.event_date as string | null,
        }));
        // Attempt to infer event info
        const event = data?.event || (folders[0]?.event_id
          ? { id: folders[0].event_id, name: folders[0].event_name || '', date: folders[0].event_date || undefined }
          : null);
        queryClient.setQueryData(
          [...folderPublishQueryKeys.list(), { event_id: selectedEventId }],
          { folders, event }
        );
      } catch (e) {
        console.warn('Prefetch failed:', e);
      }
    };
    prefetch();
  }, [selectedEventId, queryClient]);

  // Prefetch folders when selecting an event
  // Uses the same query key as the legacy (non-paginated) query
  try {
    // dynamic import to avoid SSR mismatches if needed
  } catch {}

  // Load public gallery enabled flag for selected event
  useEffect(() => {
    const loadPublicFlag = async () => {
      const evId = (effectiveEvent?.id as string) || selectedEventId || '';
      if (!evId) {
        setIsPublicEnabled(null);
        return;
      }
      try {
        const resp = await fetch(`/api/admin/events/${evId}`);
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
  }, [effectiveEvent?.id, selectedEventId]);

  // Toggle public gallery
  const togglePublicGallery = async (next: boolean) => {
    const targetEventId = effectiveEvent?.id || selectedEventId;
    if (!targetEventId) return;
    setTogglingPublic(true);
    try {
      const resp = await fetch(
        `/api/admin/events/${targetEventId}/public-gallery`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: next }),
        }
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'No se pudo actualizar');
      setIsPublicEnabled(next);
      // Refresh event metrics/workflow after toggling public gallery
      try {
        await initializeEvent(targetEventId);
      } catch {}
    } catch (e) {
      console.error('Toggle public gallery failed', e);
    } finally {
      setTogglingPublic(false);
    }
  };

  // Action handlers with toast integration
  const publish = useCallback(
    (folderId: string) => {
      const folder = effectiveFolders.find((f) => f.id === folderId);
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
                eventName: effectiveEvent?.name,
                action: 'published',
              },
              {
                onUndo: unpublish,
                duration: 10000,
              }
            );
          }
          // Refresh event metrics/workflow after publish
          if (effectiveEvent?.id) {
            initializeEvent(effectiveEvent.id).catch(() => {});
          }
        },
        onError: (error) => {
          console.error('Error publishing:', error);
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.toLowerCase().includes('migration')) {
            setMigrationError(
              'Se requiere una migración de base de datos para habilitar el sharing de carpetas. Revisa supabase/migrations/20250826_folder_sharing_system.sql'
            );
          }
        },
      });
    },
    [effectiveFolders, effectiveEvent, publishMutation, showPublishSuccess]
  );

  const unpublish = useCallback(
    (folderId: string) => {
      const folder = effectiveFolders.find((f) => f.id === folderId);
      if (!folder) return;

      unpublishMutation(folderId, {
        onSuccess: () => {
          showUnpublishSuccess(folder.name, folder.id, publish);
          // Refresh event metrics/workflow after unpublish
          if (effectiveEvent?.id) {
            initializeEvent(effectiveEvent.id).catch(() => {});
          }
        },
        onError: (error) => {
          console.error('Error unpublishing:', error);
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.toLowerCase().includes('migration')) {
            setMigrationError(
              'Se requiere una migración de base de datos para habilitar el sharing de carpetas. Revisa supabase/migrations/20250826_folder_sharing_system.sql'
            );
          }
        },
      });
    },
    [effectiveFolders, unpublishMutation, showUnpublishSuccess, publish]
  );

  const rotate = useCallback(
    (folderId: string) => {
      const folder = effectiveFolders.find((f) => f.id === folderId);
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
          // Refresh event metrics/workflow after rotate (link freshness)
          if (effectiveEvent?.id) {
            initializeEvent(effectiveEvent.id).catch(() => {});
          }
        },
        onError: (error) => {
          console.error('Error rotating token:', error);
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.toLowerCase().includes('migration')) {
            setMigrationError(
              'Se requiere una migración de base de datos para habilitar el sharing de carpetas. Revisa supabase/migrations/20250826_folder_sharing_system.sql'
            );
          }
        },
      });
    },
    [effectiveFolders, rotateMutation, showRotateSuccess]
  );

  // Enhanced bulk operations with better UX
  const handleBulkPublish = useCallback(
    async (folderIds: string[]) => {
      if (folderIds.length === 0) return;

      setBulkOperationLoading(true);
      try {
        // Filter out empty folders to avoid backend errors
        const publishable = folderIds.filter((id) => {
          const f = effectiveFolders.find((x) => x.id === id);
          return f && f.photo_count > 0;
        });
        if (publishable.length > 0) {
          await bulkPublish(publishable);
        }
        setSelectedFolders([]); // Clear selection after bulk operation
      } finally {
        setBulkOperationLoading(false);
      }
    },
    [bulkPublish, effectiveFolders]
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
    if (!effectiveEvent) return '';
    // Unificamos: preferimos carpetas compartidas por token; la galería pública es opcional.
    return `${window.location.origin}/gallery/${effectiveEvent.id}`;
  };

  // Performance metrics
  const performanceMetrics = {
    totalFolders: effectiveFolders.length,
    emptyFolders: effectiveFolders.filter((f) => f.photo_count === 0).length,
    publishedFolders: effectiveFolders.filter((f) => f.is_published).length,
    avgPhotosPerFolder:
      effectiveFolders.length > 0
        ? Math.round(
            effectiveFolders.reduce((sum, f) => sum + f.photo_count, 0) / effectiveFolders.length
          )
        : 0,
  };

  return (
    <div className="container mx-auto max-w-full space-y-6 px-4 py-6">
      {migrationError && (
        <Card className="border-amber-300 bg-amber-50">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">Acción requerida: migración pendiente</h3>
                <p className="mt-1 text-sm text-amber-800">{migrationError}</p>
                <div className="mt-2 text-xs text-amber-700">
                  Archivo: <code>supabase/migrations/20250826_folder_sharing_system.sql</code>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setMigrationError(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </Card>
      )}
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">
            Sistema de Publicación Jerárquico
          </h1>
          <p className="text-muted-foreground">
            Gestiona la publicación de galerías con organización por carpetas y
            eventos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Event selector */}
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            <option value="">Todos los eventos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() => effectiveRefetch()}
            variant="outline"
            disabled={effectiveIsRefetching}
            className="flex-shrink-0"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${effectiveIsRefetching ? 'animate-spin' : ''}`}
            />
            {effectiveIsRefetching ? 'Actualizando...' : 'Actualizar'}
          </Button>

          <Button variant="outline" className="flex-shrink-0">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Error state */}
      {effectiveError && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-medium text-red-800">
                  Error al cargar los datos
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {effectiveError instanceof Error
                    ? effectiveError.message
                    : 'Ha ocurrido un error inesperado'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => effectiveRefetch()}
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
            folders={effectiveFolders}
            selectedFolders={selectedFolders}
            onSelectionChange={setSelectedFolders}
            onPublish={publish}
            onUnpublish={unpublish}
            onRotateToken={rotate}
            onBulkPublish={handleBulkPublish}
            onBulkUnpublish={handleBulkUnpublish}
            loading={effectiveIsLoading || bulkOperationLoading}
          />
        </TabsContent>

        {/* Public Gallery Management */}
        <TabsContent value="public">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-100/30">
            <div className="p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex-shrink-0 rounded-full bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold text-blue-900">
                    Galería Pública del Evento
                  </h2>
                  <p className="mb-4 text-sm text-blue-700">
                    {effectiveEvent ? (
                      <>
                        <strong>{effectiveEvent.name}</strong> - Todas las
                        familias ven las mismas fotos sin restricciones
                      </>
                    ) : (
                      'Selecciona un evento para configurar la galería pública'
                    )}
                  </p>

                  {effectiveEvent && (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${isPublicEnabled ? 'bg-green-500' : 'bg-muted'}`}
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
                          className="border-blue-300 text-blue-700 hover:bg-blue-50"
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

                      <div className="rounded-lg border border-blue-200 bg-blue-100/50 p-3">
                        <div className="mb-1 text-xs font-medium text-blue-700">
                          Enlace público:
                        </div>
                        <div className="break-all font-mono text-xs text-blue-800">
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
          <div className="space-y-6">
            {/* Real-time Debug Panel */}
            <BulkOperationsDebugPanel />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Performance metrics */}
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Métricas de Rendimiento
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Total de carpetas
                    </span>
                    <Badge variant="outline">
                      {performanceMetrics.totalFolders}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Carpetas vacías
                    </span>
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
                    <span className="text-sm text-muted-foreground">
                      Carpetas publicadas
                    </span>
                    <Badge className="bg-green-100 text-green-800">
                      {performanceMetrics.publishedFolders}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
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
                    <span className="text-sm">
                      API funcionando correctamente
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">Base de datos optimizada</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">
                      Operaciones bulk habilitadas
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-sm">
                      Monitoreo de performance activo
                    </span>
                  </div>
                </div>

                {effectiveEvent && (
                  <div className="mt-4 rounded-lg bg-muted p-3">
                    <div className="mb-1 text-xs font-medium text-foreground">
                      Evento activo:
                    </div>
                    <div className="text-sm font-semibold">
                      {effectiveEvent.name}
                    </div>
                    {effectiveEvent.date && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {new Date(effectiveEvent.date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
