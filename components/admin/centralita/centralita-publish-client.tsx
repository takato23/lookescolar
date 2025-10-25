'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback } from 'react';
import CentralitaHeader from './centralita-header';
import CentralitaTabs, { CentralitaTabsContent } from './centralita-tabs';
import CentralitaOverview from './overview/centralita-overview';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HierarchicalFolderManager } from '@/components/admin/HierarchicalFolderManager';
import { BulkOperationsDebugPanel } from '@/components/admin/BulkOperationsDebugPanel';
import { useFolderPublishData, folderPublishQueryKeys } from '@/hooks/useFolderPublishData';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import { useEventManagement } from '@/lib/stores/event-workflow-store';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  RefreshCw,
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
} from 'lucide-react';

export type InitialData = {
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

export default function CentralitaPublishClient(props?: {
  initialSelectedEventId?: string;
  initialData?: InitialData;
}) {
  const sp = useSearchParams();
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean | null>(null);
  const [publicShareToken, setPublicShareToken] = useState<string | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [bulkOperationLoading, setBulkOperationLoading] = useState(false);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date?: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    props?.initialSelectedEventId || sp.get('event_id') || ''
  );
  const [migrationError, setMigrationError] = useState<string | null>(null);

  const baseData = useFolderPublishData({ enablePagination: false, enabled: selectedEventId ? false : true });
  const { initializeEvent } = useEventManagement();
  const queryClient = useQueryClient();
  const { showPublishSuccess, showUnpublishSuccess, showRotateSuccess } = usePublishSuccessToast();

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

  // Load events for selector
  useEffect(() => {
    (async () => {
      try {
        let res = await fetch('/api/admin/events');
        if (!res.ok) {
          res = await fetch('/api/admin/events-robust');
        }
        if (!res.ok) return;
        const json = await res.json();
        const list = Array.isArray(json) ? json : json.events || json.data?.events || json.data || [];
        const normalized = list.map((e: any) => ({ id: e.id, name: e.name, date: e.date }));
        setEvents(normalized);
      } catch (e) {
        console.error('Error loading events list:', e);
      }
    })();
  }, []);

  // Prefetch on event change
  useEffect(() => {
    setSelectedFolders([]);
    if (!selectedEventId) return;
    (async () => {
      try {
        await queryClient.prefetchQuery({
          queryKey: folderPublishQueryKeys.listByEvent(selectedEventId),
          queryFn: async () => {
            const params = new URLSearchParams({
              include_unpublished: 'true',
              limit: '100',
              order_by: 'published_desc',
              event_id: selectedEventId,
            });
            const res = await fetch(`/api/admin/folders/published?${params}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
            const event = data?.event || (folders[0]?.event_id
              ? { id: folders[0].event_id, name: folders[0].event_name || '', date: folders[0].event_date || undefined }
              : null);
            return { folders, event };
          },
          staleTime: 60 * 1000,
        });
      } catch (e) {
        console.warn('Prefetch failed:', e);
      }
    })();
  }, [selectedEventId, queryClient]);

  // Load public gallery flag and active token
  useEffect(() => {
    const loadPublicFlagAndToken = async () => {
      const evId = (effectiveEvent?.id as string) || selectedEventId || '';
      if (!evId) {
        setIsPublicEnabled(null);
        setPublicShareToken(null);
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
        if (ev?.public_gallery_enabled) {
          const sharesRes = await fetch(`/api/admin/events/${evId}/gallery/shares?limit=1`);
          if (sharesRes.ok) {
            const sharesJson = await sharesRes.json();
            const token = sharesJson?.shares?.[0]?.token || null;
            setPublicShareToken(token);
          }
        } else {
          setPublicShareToken(null);
        }
      } catch (error) {
        console.error('Error loading public flag/token:', error);
      }
    };
    loadPublicFlagAndToken();
  }, [effectiveEvent?.id, selectedEventId]);

  const togglePublicGallery = async (next: boolean) => {
    const targetEventId = effectiveEvent?.id || selectedEventId;
    if (!targetEventId) return;
    setTogglingPublic(true);
    try {
      const resp = await fetch(`/api/admin/events/${targetEventId}/public-gallery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'No se pudo actualizar');
      setIsPublicEnabled(next);
      if (next && json?.token) setPublicShareToken(json.token);
      try { await initializeEvent(targetEventId); } catch {}
    } catch (e) {
      console.error('Toggle public gallery failed', e);
    } finally {
      setTogglingPublic(false);
    }
  };

  const { showPublishSuccess: sps, showUnpublishSuccess: sus, showRotateSuccess: srs } = {
    showPublishSuccess,
    showUnpublishSuccess,
    showRotateSuccess,
  };

  const publish = useCallback(
    (folderId: string) => {
      const folder = effectiveFolders.find((f) => f.id === folderId);
      if (!folder) return;
      publishMutation(folderId, {
        onSuccess: (data: any) => {
          if (data.share_token) {
            const familyUrl = data.family_url || `${window.location.origin}/s/${data.share_token}`;
            const qrUrl =
              data.qr_url ||
              `/access?token=${encodeURIComponent(data.share_token)}`;
            sps(
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
              { onUndo: unpublish, duration: 10000 }
            );
          }
          if (effectiveEvent?.id) initializeEvent(effectiveEvent.id).catch(() => {});
        },
        onError: (error: any) => {
          console.error('Error publishing:', error);
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.toLowerCase().includes('migration')) {
            setMigrationError('Se requiere una migración de base de datos para habilitar el sharing de carpetas. Revisa supabase/migrations/20250826_folder_sharing_system.sql');
          }
        },
      });
    },
    [effectiveFolders, effectiveEvent, publishMutation, sps]
  );

  const unpublish = useCallback(
    (folderId: string) => {
      const folder = effectiveFolders.find((f) => f.id === folderId);
      if (!folder) return;
      unpublishMutation(folderId, {
        onSuccess: () => {
          sus(folder.name, folder.id, publish);
          if (effectiveEvent?.id) initializeEvent(effectiveEvent.id).catch(() => {});
        },
        onError: (error: any) => {
          console.error('Error unpublishing:', error);
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.toLowerCase().includes('migration')) {
            setMigrationError('Se requiere una migración de base de datos para habilitar el sharing de carpetas. Revisa supabase/migrations/20250826_folder_sharing_system.sql');
          }
        },
      });
    },
    [effectiveFolders, unpublishMutation, sus, publish]
  );

  const rotate = useCallback(
    (folderId: string) => {
      const folder = effectiveFolders.find((f) => f.id === folderId);
      if (!folder) return;
      rotateMutation(folderId, {
        onSuccess: (data: any) => {
          if (data.newToken || data.share_token) {
            const token = data.newToken || data.share_token;
            const familyUrl = data.family_url || `${window.location.origin}/s/${token}`;
            const qrUrl =
              data.qr_url || `/access?token=${encodeURIComponent(token)}`;
            srs(folder.name, token, familyUrl, qrUrl);
          }
          if (effectiveEvent?.id) initializeEvent(effectiveEvent.id).catch(() => {});
        },
        onError: (error: any) => {
          console.error('Error rotating token:', error);
          const msg = error instanceof Error ? error.message : String(error);
          if (msg.toLowerCase().includes('migration')) {
            setMigrationError('Se requiere una migración de base de datos para habilitar el sharing de carpetas. Revisa supabase/migrations/20250826_folder_sharing_system.sql');
          }
        },
      });
    },
    [effectiveFolders, rotateMutation, srs]
  );

  const handleBulkPublish = useCallback(
    async (folderIds: string[]) => {
      if (folderIds.length === 0) return;
      setBulkOperationLoading(true);
      try {
        const publishable = folderIds.filter((id) => {
          const f = effectiveFolders.find((x) => x.id === id);
          return f && f.photo_count > 0;
        });
        if (publishable.length > 0) {
          await bulkPublish(publishable);
        }
        setSelectedFolders([]);
      } finally {
        setBulkOperationLoading(false);
      }
    },
    [effectiveFolders, bulkPublish]
  );

  const handleBulkUnpublish = useCallback(
    async (folderIds: string[]) => {
      if (folderIds.length === 0) return;
      setBulkOperationLoading(true);
      try {
        await bulkUnpublish(folderIds);
        setSelectedFolders([]);
      } finally {
        setBulkOperationLoading(false);
      }
    },
    [bulkUnpublish]
  );

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  const getPublicUrl = () => {
    if (!publicShareToken) return '';
    return `${window.location.origin}/store-unified/${publicShareToken}`;
  };

  const performanceMetrics = {
    total: effectiveFolders.length,
    published: effectiveFolders.filter((f) => f.is_published).length,
    unpublished: effectiveFolders.filter((f) => !f.is_published).length,
    totalPhotos: effectiveFolders.reduce((sum, f) => sum + f.photo_count, 0),
  };

  return (
    <div className="container mx-auto max-w-full space-y-6 px-4 py-6">
      <CentralitaHeader />

      {migrationError && (
        <Card className="border-primary-300 bg-primary-50">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-primary-700" />
              <div className="flex-1">
                <h3 className="font-medium text-primary-900">Acción requerida: migración pendiente</h3>
                <p className="mt-1 text-sm text-primary-800">{migrationError}</p>
                <div className="mt-2 text-xs text-primary-700">
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

      {/* Controls row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Todos los eventos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          <Button onClick={() => effectiveRefetch()} variant="outline" disabled={effectiveIsRefetching} className="flex-shrink-0">
            <RefreshCw className={`mr-2 h-4 w-4 ${effectiveIsRefetching ? 'animate-spin' : ''}`} />
            {effectiveIsRefetching ? 'Actualizando...' : 'Actualizar'}
          </Button>

          <Button variant="outline" className="flex-shrink-0">
            <Settings className="mr-2 h-4 w-4" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <CentralitaTabs defaultTab={selectedEventId ? 'overview' : 'folders'} showAdvanced={false}>
        <CentralitaTabsContent value="overview">
          <CentralitaOverview stats={performanceMetrics} getPublicUrl={getPublicUrl} hasEvent={!!effectiveEvent} />
        </CentralitaTabsContent>

        <CentralitaTabsContent value="folders">
          <HierarchicalFolderManager
            folders={effectiveFolders as any}
            selectedFolders={selectedFolders}
            onSelectionChange={setSelectedFolders}
            onPublish={publish}
            onUnpublish={unpublish}
            onRotateToken={rotate}
            onBulkPublish={handleBulkPublish}
            onBulkUnpublish={handleBulkUnpublish}
            loading={effectiveIsLoading || bulkOperationLoading}
          />
        </CentralitaTabsContent>

        <CentralitaTabsContent value="public">
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/50 to-blue-100/30">
            <div className="p-6">
              <div className="mb-6 flex items-start gap-4">
                <div className="flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-950/30 p-3">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <h2 className="mb-2 text-xl font-semibold text-blue-900">Galería Pública del Evento</h2>
                  <p className="mb-4 text-sm text-blue-700 dark:text-blue-300">
                    {effectiveEvent ? (<><strong>{effectiveEvent.name}</strong> - Vista pública del evento en tienda unificada</>) : ('Selecciona un evento para configurar la galería pública')}
                  </p>

                  {effectiveEvent && (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${isPublicEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-sm font-medium">{isPublicEnabled ? 'Galería pública habilitada' : 'Galería pública deshabilitada'}</span>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-3">
                        <Button onClick={async () => { const url = getPublicUrl(); if (url) await copyToClipboard(url); }} className="bg-blue-600 hover:bg-blue-700" disabled={!publicShareToken}>
                          <Copy className="mr-2 h-4 w-4" /> Copiar Enlace Público
                        </Button>
                        <Button asChild variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300 hover:bg-blue-50" disabled={!publicShareToken}>
                          <a href={getPublicUrl()} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" /> Vista Previa
                          </a>
                        </Button>
                        <Button variant={isPublicEnabled ? 'outline' : 'default'} onClick={() => togglePublicGallery(!isPublicEnabled)} disabled={isPublicEnabled === null || togglingPublic} className={isPublicEnabled ? 'border-red-300 text-red-700 hover:bg-red-50' : 'bg-green-600 hover:bg-green-700'}>
                          {togglingPublic ? (<RefreshCw className="mr-2 h-4 w-4 animate-spin" />) : isPublicEnabled ? ('Deshabilitar Pública') : ('Habilitar Pública')}
                        </Button>
                      </div>

                      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-100/50 p-3">
                        <div className="mb-1 text-xs font-medium text-blue-700 dark:text-blue-300">Enlace público:</div>
                        <div className="break-all font-mono text-xs text-blue-800 dark:text-blue-200">{publicShareToken ? getPublicUrl() : 'Habilita la galería para generar un enlace público'}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </CentralitaTabsContent>

        <CentralitaTabsContent value="analytics">
          <div className="space-y-6">
            <BulkOperationsDebugPanel />
            <Card className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <BarChart3 className="h-5 w-5 text-yellow-600" /> Métricas de Rendimiento
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Total de carpetas</span><Badge variant="outline">{performanceMetrics.total}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Publicadas</span><Badge className="bg-green-100 text-green-800">{performanceMetrics.published}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Privadas</span><Badge variant="outline">{performanceMetrics.unpublished}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm text-gray-500 dark:text-gray-400">Fotos totales</span><Badge variant="outline">{performanceMetrics.totalPhotos}</Badge></div>
              </div>
            </Card>
          </div>
        </CentralitaTabsContent>

        <CentralitaTabsContent value="settings">
          <Card className="p-6">
            <h3 className="mb-2 text-lg font-semibold">Configuración</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ajustes avanzados próximamente.</p>
          </Card>
        </CentralitaTabsContent>
      </CentralitaTabs>
    </div>
  );
}
