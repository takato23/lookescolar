'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveFolderGrid,
  useFolderGrid,
} from '@/components/admin/ResponsiveFolderGrid';
import { PhotoPreviewModal } from '@/components/admin/PhotoPreviewModal';
import { usePublishSuccessToast } from '@/components/admin/PublishSuccessToast';
import { useFolderPublishData } from '@/hooks/useFolderPublishData';
import {
  QrCode,
  RotateCcw,
  LinkIcon,
  Copy,
  ExternalLink,
  RefreshCw,
  Users,
  User,
  Search,
  Filter,
  X,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Grid3X3,
  List,
  ScanLine,
} from 'lucide-react';

type CodeRow = {
  id: string;
  event_id: string;
  course_id: string | null;
  code_value: string;
  token: string | null;
  is_published: boolean;
  photos_count: number;
};

export default function PublishPage() {
  // React Query integration - using modern folders system
  const {
    codes: rows, // Compatible interface with old system
    folders, // Raw folders data
    event: selectedEvent,
    isLoading: loading,
    isRefetching,
    error,
    publish: publishMutation,
    unpublish: unpublishMutation,
    rotateToken: rotateMutation,
    bulkPublish: bulkPublishMutation,
    bulkUnpublish: bulkUnpublishMutation,
    refetch,
    stats,
    getIsPublishing,
    getIsUnpublishing,
    getIsRotating,
  } = useFolderPublishData();

  // Local UI state
  const [filter, setFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'published' | 'unpublished'
  >('all');
  const [previewFolder, setPreviewFolder] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPublicEnabled, setIsPublicEnabled] = useState<boolean | null>(null);
  const [togglingPublic, setTogglingPublic] = useState(false);

  // Folder grid hook for bulk actions
  const {
    selectedCodes,
    setSelectedCodes,
    bulkActionLoading,
    handleBulkPublish,
    handleBulkUnpublish,
    selectAll,
    clearSelection,
  } = useFolderGrid();

  // Toast notifications
  const { showPublishSuccess, showUnpublishSuccess, showRotateSuccess } =
    usePublishSuccessToast();

  // Error handling
  if (error) {
    console.error('Error loading publish data:', error);
  }

  // Enhanced filtering with status filter
  const filtered = useMemo(() => {
    let result = rows;

    // Apply text filter
    const q = filter.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => r.code_value.toLowerCase().includes(q));
    }

    // Apply status filter
    if (statusFilter === 'published') {
      result = result.filter((r) => r.is_published);
    } else if (statusFilter === 'unpublished') {
      result = result.filter((r) => !r.is_published);
    }

    return result;
  }, [rows, filter, statusFilter]);

  // Preview handler
  const handlePreview = useCallback(
    (code: CodeRow) => {
      // Find the backing folder to enrich preview context
      const folder = folders?.find((f) => f.id === code.id);
      setPreviewFolder({
        id: code.id,
        name: code.code_value,
        parent_id: folder?.event_id || selectedEvent?.id || null,
        depth: 0,
        photo_count: code.photos_count,
        is_published: !!code.is_published,
        share_token: folder?.share_token || code.token || null,
        published_at: folder?.published_at || null,
        family_url: folder?.family_url || null,
        qr_url: folder?.qr_url || null,
        settings: {},
      });
      setIsPreviewOpen(true);
    },
    [folders, selectedEvent]
  );

  // Action handlers with React Query and toast integration
  const publish = useCallback(
    (codeId: string) => {
      const code = rows.find((r) => r.id === codeId);
      if (!code) return;

      publishMutation(codeId, {
        onSuccess: (data) => {
          if (data.share_token) {
            const familyUrl =
              data.family_url ||
              `${window.location.origin}/f/${data.share_token}`;
            const qrUrl =
              data.qr_url ||
              `/api/qr?token=${encodeURIComponent(data.share_token)}`;

            showPublishSuccess(
              {
                codeId: code.id,
                codeValue: code.code_value,
                token: data.share_token,
                familyUrl,
                qrUrl,
                photosCount: code.photos_count,
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
          // Add error toast here if needed
        },
      });
    },
    [rows, selectedEvent, publishMutation, showPublishSuccess]
  );

  const rotate = useCallback(
    (codeId: string) => {
      const code = rows.find((r) => r.id === codeId);
      if (!code) return;

      rotateMutation(codeId, {
        onSuccess: (data) => {
          if (data.newToken || data.share_token) {
            const token = data.newToken || data.share_token;
            const familyUrl =
              data.family_url || `${window.location.origin}/f/${token}`;
            const qrUrl =
              data.qr_url || `/api/qr?token=${encodeURIComponent(token)}`;

            showRotateSuccess(code.code_value, token, familyUrl, qrUrl);
          }
        },
        onError: (error) => {
          console.error('Error rotating token:', error);
          // Add error toast here if needed
        },
      });
    },
    [rows, rotateMutation, showRotateSuccess]
  );

  const unpublish = useCallback(
    (codeId: string) => {
      const code = rows.find((r) => r.id === codeId);
      if (!code) return;

      unpublishMutation(codeId, {
        onSuccess: () => {
          showUnpublishSuccess(code.code_value, code.id, publish);
        },
        onError: (error) => {
          console.error('Error unpublishing:', error);
          // Add error toast here if needed
        },
      });
    },
    [rows, unpublishMutation, showUnpublishSuccess, publish]
  );

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  // Funciones para compartir público
  const copyPublicLink = async () => {
    if (!selectedEvent) return;
    const publicUrl = `${window.location.origin}/gallery/${selectedEvent.id}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      alert('Enlace público copiado al portapapeles');
    } catch {}
  };

  const getPublicUrl = () => {
    if (!selectedEvent) return '';
    return `${window.location.origin}/gallery/${selectedEvent.id}`;
  };

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
      } catch {}
    };
    loadPublicFlag();
  }, [selectedEvent?.id]);

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

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Mobile-first header */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Publicación de Galerías
            </h1>
            <p className="mt-1 text-gray-600">
              Gestiona el acceso familiar a las fotos del evento
            </p>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isRefetching}
            className="min-h-[44px] flex-shrink-0"
            aria-label="Actualizar datos"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {isRefetching ? 'Actualizando...' : 'Actualizar'}
            </span>
          </Button>
        </div>

        {/* Stats cards - Mobile responsive */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">Total códigos</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.published}
                </div>
                <div className="text-sm text-gray-600">Publicados</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.unpublished}
                </div>
                <div className="text-sm text-gray-600">Privados</div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalPhotos}
                </div>
                <div className="text-sm text-gray-600">Fotos totales</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* SECCIÓN: COMPARTIR PÚBLICO */}
      {selectedEvent && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-blue-100/30">
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex-shrink-0 rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-blue-900 sm:text-xl">
                  Galería Pública
                </h2>
                <p className="mt-1 text-sm text-blue-700">
                  <strong>{selectedEvent.name}</strong> - Todas las familias ven
                  las mismas fotos
                </p>
                {isPublicEnabled === false && (
                  <p className="mt-1 text-xs text-blue-700">
                    Actualmente deshabilitada
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={copyPublicLink}
                className="min-h-[44px] flex-1 bg-blue-600 hover:bg-blue-700 sm:flex-none"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar Enlace Público
              </Button>

              <Button
                asChild
                variant="outline"
                className="min-h-[44px] flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 sm:flex-none"
              >
                <a href={getPublicUrl()} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Vista Previa
                </a>
              </Button>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                variant={isPublicEnabled ? 'outline' : 'default'}
                onClick={() => togglePublicGallery(!isPublicEnabled)}
                disabled={isPublicEnabled === null || togglingPublic}
                className="min-h-[36px]"
              >
                {isPublicEnabled ? 'Deshabilitar pública' : 'Habilitar pública'}
              </Button>
            </div>

            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-100/50 p-3">
              <div className="mb-1 text-xs font-medium text-blue-700">
                Enlace público:
              </div>
              <div className="break-all font-mono text-xs text-blue-800">
                {getPublicUrl()}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SECCIÓN: COMPARTIR PERSONALIZADO */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50/50 to-orange-100/30">
        <div className="border-b border-orange-200 bg-orange-100/50 p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex-shrink-0 rounded-full bg-orange-100 p-3">
              <User className="h-6 w-6 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-orange-900 sm:text-xl">
                Galerías Personalizadas
              </h2>
              <p className="mt-1 text-sm text-orange-700">
                Cada código familiar ve solo{' '}
                <strong>sus fotos específicas</strong>
              </p>
            </div>
          </div>

          {/* Mobile-first controls */}
          <div className="space-y-3">
            {/* Search and filter row */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Buscar código (ej. 3B-07)..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="min-h-[44px] pl-10"
                />
                {filter && (
                  <button
                    onClick={() => setFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transform text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="min-h-[44px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">Todos</option>
                  <option value="published">Publicados</option>
                  <option value="unpublished">Privados</option>
                </select>

                <Button
                  variant="outline"
                  onClick={() =>
                    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
                  }
                  className="min-h-[44px] min-w-[44px] px-3"
                  aria-label={`Cambiar a vista ${viewMode === 'grid' ? 'lista' : 'grilla'}`}
                >
                  {viewMode === 'grid' ? (
                    <List className="h-4 w-4" />
                  ) : (
                    <Grid3X3 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedCodes.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-300 bg-orange-200/50 p-3">
                <span className="text-sm font-medium text-orange-800">
                  {selectedCodes.length} seleccionados
                </span>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => bulkPublishMutation(selectedCodes)}
                    disabled={bulkActionLoading}
                    size="sm"
                    className="min-h-[36px] bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Publicar
                  </Button>

                  <Button
                    onClick={() => bulkUnpublishMutation(selectedCodes)}
                    disabled={bulkActionLoading}
                    size="sm"
                    variant="outline"
                    className="min-h-[36px] border-orange-300 text-orange-700 hover:bg-orange-100"
                  >
                    <EyeOff className="mr-2 h-4 w-4" />
                    Despublicar
                  </Button>

                  <Button
                    onClick={clearSelection}
                    size="sm"
                    variant="ghost"
                    className="min-h-[36px] text-orange-700 hover:bg-orange-100"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Limpiar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 sm:p-6">
          {viewMode === 'grid' ? (
            <ResponsiveFolderGrid
              codes={filtered}
              loading={loading}
              onPublish={publish}
              onUnpublish={unpublish}
              onRotateToken={rotate}
              onPreview={handlePreview}
              selectedCodes={selectedCodes}
              onSelectionChange={setSelectedCodes}
              enableBulkActions={true}
            />
          ) : (
            // Legacy list view as fallback
            <div className="space-y-2">
              {loading ? (
                <div className="py-8 text-center text-gray-500">
                  Cargando...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No hay códigos que mostrar
                </div>
              ) : (
                filtered.map((r) => {
                  const url = r.token
                    ? `${window.location.origin}/public/gallery/${r.token}`
                    : '';
                  return (
                    <div
                      key={r.id}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <div className="col-span-3 font-medium">
                        {r.code_value}
                      </div>
                      <div className="col-span-2">{r.photos_count}</div>
                      <div className="col-span-2">
                        <Badge
                          variant={r.is_published ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {r.is_published ? 'Publicado' : 'Privado'}
                        </Badge>
                      </div>
                      <div className="col-span-5 flex flex-wrap items-center gap-2">
                        {!r.is_published ? (
                          <Button
                            onClick={() => publish(r.id)}
                            size="sm"
                            className="min-h-[36px]"
                          >
                            Publicar
                          </Button>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => copy(url)}
                              size="sm"
                              variant="outline"
                              className="min-h-[36px]"
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copiar
                            </Button>
                            <Button
                              onClick={() => rotate(r.id)}
                              size="sm"
                              variant="outline"
                              className="min-h-[36px]"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" />
                              Rotar
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Photo Preview Modal */}
      {isPreviewOpen && previewFolder && (
        <PhotoPreviewModal
          folder={previewFolder}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}
