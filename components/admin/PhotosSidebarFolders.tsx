'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SearchIcon,
  MoreVerticalIcon,
  Trash2Icon,
  Plus,
  FolderIcon,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateFamilyGalleryLink } from '@/lib/utils/gallery-links';

export interface SidebarEvent {
  id: string;
  name: string;
  photo_count?: number;
}

export interface SidebarCodeRow {
  id: string;
  event_id: string;
  course_id: string | null;
  code_value: string;
  token: string | null;
  is_published: boolean;
  photos_count: number;
}

interface PhotosSidebarFoldersProps {
  events: SidebarEvent[];
  selected: {
    eventId?: string | null;
    courseId?: string | null;
    codeId?: string | 'null' | null;
  };
  onSelect: (sel: {
    eventId?: string | null;
    courseId?: string | null;
    codeId?: string | 'null' | null;
  }) => void;
  onCountsChanged?: () => void;
  refreshKey?: number;
}

export default function PhotosSidebarFolders({
  events: _events,
  selected,
  onSelect,
  refreshKey,
  onCountsChanged,
}: PhotosSidebarFoldersProps) {
  const [query, setQuery] = useState('');
  const [codesCache, setCodesCache] = useState<
    Record<string, SidebarCodeRow[]>
  >({});
  const [newFolderName, setNewFolderName] = useState('');

  // Mostrar eventos disponibles para navegación

  const fetchCodes = useCallback(async (eventId?: string | null) => {
    try {
      const url = eventId
        ? `/api/admin/publish/list?eventId=${eventId}`
        : `/api/admin/publish/list`;
      const resp = await fetch(url);
      const data = await resp.json();
      const arr = Array.isArray(data) ? data : data.rows || data.data || [];
      const rows: SidebarCodeRow[] = arr
        .filter((c: any) => !eventId || c.event_id === eventId)
        .map((c: any) => ({
          id: (c.id ?? c.code_id) as string,
          event_id: (c.event_id as string) || (eventId as string),
          course_id: (c.course_id as string) ?? null,
          code_value: String(c.code_value),
          token: (c.token as string) ?? null,
          is_published: Boolean(c.is_published ?? c.published),
          photos_count: Number(c.photos_count ?? 0),
        }));
      const cacheKey = eventId || '__all__';
      setCodesCache((prev) => ({ ...prev, [cacheKey]: rows }));
    } catch {
      const cacheKey = eventId || '__all__';
      setCodesCache((prev) => ({ ...prev, [cacheKey]: [] }));
    }
  }, []);

  // When selection changes, ensure we always have the global list
  useEffect(() => {
    void fetchCodes(null);
  }, [selected.eventId, fetchCodes]);

  // External refresh trigger: re-fetch the global list
  useEffect(() => {
    void fetchCodes(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const handlePublish = async (codeId: string) => {
    try {
      const resp = await fetch(`/api/admin/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'No se pudo publicar');
      await fetchCodes(null);
    } catch {}
  };

  const handleUnpublish = async (codeId: string) => {
    try {
      const resp = await fetch(`/api/admin/publish/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      if (!resp.ok) throw new Error('No se pudo despublicar');
      await fetchCodes(null);
    } catch {}
  };

  const handleRevoke = async (codeId: string) => {
    try {
      const resp = await fetch(`/api/admin/publish/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      if (!resp.ok) throw new Error('No se pudo revocar');
      await fetchCodes(null);
    } catch {}
  };

  const handleDeleteCode = useCallback(
    async (_eventId: string, codeId: string, label: string) => {
      try {
        if (
          !confirm(
            `¿Eliminar la carpeta "${label}"? Las fotos quedarán como 'Sin carpeta'.`
          )
        )
          return;
        const resp = await fetch(`/api/admin/codes/${codeId}`, {
          method: 'DELETE',
        });
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok)
          throw new Error(j?.error || 'No se pudo eliminar la carpeta');
        // refresh codes for current event
        await fetchCodes(null);
        toast.success('Carpeta eliminada');
        onCountsChanged?.();
      } catch (e: any) {
        toast.error(e?.message || 'Error al eliminar la carpeta');
      }
    },
    [fetchCodes, onCountsChanged]
  );

  const handleDownloadZip = async (code: SidebarCodeRow) => {
    try {
      // Always include event_id when fetching photos
      const usp = new URLSearchParams();
      usp.set('event_id', code.event_id);
      usp.set('code_id', code.id);
      usp.set('limit', '100');
      const resp = await fetch(`/api/admin/photos?${usp.toString()}`);
      const data = await resp.json();
      const ids: string[] = (data.photos || []).map((p: any) => p.id);
      if (ids.length === 0) return;
      const dl = await fetch(`/api/admin/photos/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: ids, as: 'zip' }),
      });
      if (!dl.ok) return;
      const blob = await dl.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${code.code_value}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const body: any = { codeValue: name };
      if (selected.eventId) body.eventId = selected.eventId;
      const resp = await fetch(`/api/admin/codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || 'No se pudo crear la carpeta');
      setNewFolderName('');
      await fetchCodes(null);
      onCountsChanged?.();
      toast.success(`Carpeta "${name}" creada exitosamente`);
    } catch (e: any) {
      toast.error(e?.message || 'Error creando carpeta');
    }
  };

  // Group folders by event for better organization
  const allCodes = codesCache['__all__'] || [];
  const filteredCodes = allCodes.filter(
    (c) =>
      !query || String(c.code_value).toLowerCase().includes(query.toLowerCase())
  );

  // Group codes by event
  const codesByEvent = filteredCodes.reduce(
    (acc, code) => {
      if (!acc[code.event_id]) {
        acc[code.event_id] = [];
      }
      acc[code.event_id].push(code);
      return acc;
    },
    {} as Record<string, SidebarCodeRow[]>
  );

  // Sort events and codes
  Object.keys(codesByEvent).forEach((eventId) => {
    codesByEvent[eventId].sort((a, b) =>
      a.code_value.localeCompare(b.code_value)
    );
  });

  return (
    <div className="space-y-4">
      {/* Nueva carpeta */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <h4 className="mb-2 text-sm font-semibold text-blue-800">
          Nueva carpeta
        </h4>
        <div className="flex gap-2">
          <Input
            aria-label="Nombre de carpeta"
            placeholder="Ej: 4to A, Salita Verde..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const name = newFolderName.trim();
                if (name) {
                  handleCreateFolder(name);
                } else {
                  toast.error('Por favor ingresa un nombre para la carpeta');
                }
              }
            }}
            className="border-blue-300 font-medium text-blue-900 placeholder:text-blue-500 focus:border-blue-500 focus:ring-blue-500"
          />
          <Button
            onClick={() => {
              const name = newFolderName.trim();
              if (!name) {
                toast.error('Por favor ingresa un nombre para la carpeta');
                return;
              }
              handleCreateFolder(name);
            }}
            disabled={!newFolderName.trim()}
            className="whitespace-nowrap border-0 bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            <Plus className="mr-1 h-4 w-4" />
            Crear
          </Button>
        </div>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          aria-label="Buscar carpeta"
          placeholder="Buscar carpeta o evento..."
          className="pl-9 font-medium text-gray-900 placeholder:text-gray-500"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Sin carpeta option always at top */}
      <Card className="border border-gray-200 p-0">
        <div className="border-b border-gray-100 bg-gray-50 p-3">
          <h4 className="text-sm font-semibold text-gray-800">
            Fotos sin carpeta
          </h4>
        </div>
        <div className="p-2">
          <Button
            variant={selected.codeId === 'null' ? 'default' : 'ghost'}
            className={cn(
              'h-auto w-full justify-start p-3 text-left',
              selected.codeId === 'null'
                ? 'border-orange-200 bg-orange-50 text-orange-900'
                : 'hover:bg-gray-50'
            )}
            onClick={() =>
              onSelect({
                eventId: selected.eventId,
                courseId: null,
                codeId: 'null',
              })
            }
            aria-label="Ver fotos sin carpeta"
          >
            <div className="flex w-full items-center gap-2">
              <FolderIcon className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <div className="text-sm font-semibold">Sin carpeta</div>
                <div className="text-muted-foreground text-xs">
                  Fotos no organizadas
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-orange-200 bg-orange-50 text-orange-700"
              >
                📂 General
              </Badge>
            </div>
          </Button>
        </div>
      </Card>

      {/* Events List for Navigation */}
      {_events.length > 0 && (
        <Card className="border border-gray-200 p-0">
          <div className="border-b border-gray-100 bg-blue-50 p-3">
            <h4 className="text-sm font-semibold text-blue-800">Eventos</h4>
            <p className="mt-1 text-xs text-blue-600">
              {_events.length} eventos disponibles
            </p>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto p-2">
            {_events
              .filter(
                (event) =>
                  !query ||
                  event.name.toLowerCase().includes(query.toLowerCase())
              )
              .map((event) => (
                <Button
                  key={event.id}
                  variant={selected.eventId === event.id ? 'default' : 'ghost'}
                  className={cn(
                    'h-auto w-full justify-start p-3 text-left',
                    selected.eventId === event.id
                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                      : 'hover:bg-gray-50'
                  )}
                  onClick={() =>
                    onSelect({
                      eventId: event.id,
                      courseId: null,
                      codeId: null,
                    })
                  }
                  aria-label={`Cambiar a evento ${event.name}`}
                >
                  <div className="flex w-full items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="truncate text-sm font-semibold"
                        title={event.name}
                      >
                        {event.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {event.photo_count || 0} fotos
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-blue-200 bg-blue-50 text-blue-700"
                    >
                      Evento
                    </Badge>
                  </div>
                </Button>
              ))}
          </div>
        </Card>
      )}

      {/* Events with their folders */}
      <Card className="border border-gray-200 p-0">
        <div className="border-b border-gray-100 bg-gray-50 p-3">
          <h4 className="text-sm font-semibold text-gray-800">
            Carpetas por Evento
          </h4>
          <p className="mt-1 text-xs text-gray-600">
            {Object.keys(codesByEvent).length} eventos con{' '}
            {filteredCodes.length} carpetas
          </p>
        </div>
        <ScrollArea className="h-[calc(100vh-350px)]">
          <div className="space-y-3 p-2">
            {Object.keys(codesByEvent).length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <FolderIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No hay carpetas creadas</p>
                <p className="text-xs">Crea tu primera carpeta arriba</p>
              </div>
            ) : (
              Object.entries(codesByEvent).map(([eventId, codes]) => {
                const eventName =
                  _events.find((e) => e.id === eventId)?.name ||
                  `Evento ${eventId.substring(0, 8)}`;
                const isEventSelected = selected.eventId === eventId;

                return (
                  <div key={`event-${eventId}`} className="space-y-2">
                    {/* Event Header */}
                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            'h-auto p-1 text-left',
                            isEventSelected && 'font-semibold text-blue-700'
                          )}
                          onClick={() =>
                            onSelect({ eventId, courseId: null, codeId: null })
                          }
                          aria-label={`Ver evento ${eventName}`}
                        >
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span
                              className="max-w-32 truncate text-sm font-medium"
                              title={eventName}
                            >
                              {eventName}
                            </span>
                          </div>
                        </Button>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-blue-300 bg-blue-100 text-xs text-blue-700"
                      >
                        {codes.length} carpetas
                      </Badge>
                    </div>

                    {/* Event folders */}
                    <div className="space-y-1 pl-4">
                      {codes.map((code) => (
                        <div
                          key={`folder-${code.id}`}
                          className="group rounded-lg border border-gray-200 transition-all hover:border-blue-300 hover:shadow-sm"
                        >
                          <div className="flex items-center p-2">
                            <Button
                              variant={
                                selected.codeId === code.id
                                  ? 'default'
                                  : 'ghost'
                              }
                              className={cn(
                                'h-auto flex-1 justify-start p-2 text-left',
                                selected.codeId === code.id
                                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                                  : 'hover:bg-gray-50'
                              )}
                              onClick={() =>
                                onSelect({
                                  eventId: code.event_id,
                                  courseId: null,
                                  codeId: code.id,
                                })
                              }
                              aria-label={`Abrir carpeta ${code.code_value}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={async (e) => {
                                e.preventDefault();
                                const photoId =
                                  e.dataTransfer.getData('text/plain');
                                if (!photoId) return;
                                try {
                                  const res = await fetch(
                                    `/api/admin/photos/${photoId}/move`,
                                    {
                                      method: 'PATCH',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({ codeId: code.id }),
                                    }
                                  );
                                  const j = await res.json().catch(() => ({}));
                                  if (!res.ok)
                                    throw new Error(
                                      j?.error || 'No se pudo mover la foto'
                                    );
                                  toast.success('Foto movida');
                                  onCountsChanged?.();
                                } catch (err: any) {
                                  toast.error(
                                    err?.message || 'Error al mover la foto'
                                  );
                                }
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <div
                                  className="break-words text-sm font-semibold leading-snug"
                                  title={code.code_value}
                                >
                                  📁 {code.code_value}
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="bg-gray-100 text-xs text-gray-700"
                                  >
                                    {code.photos_count} fotos
                                  </Badge>
                                  {code.is_published ? (
                                    <Badge className="border-green-200 bg-green-100 text-xs text-green-800">
                                      Publicado
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="border-gray-300 bg-gray-50 text-xs text-gray-600"
                                    >
                                      No publicado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                                  aria-label={`Acciones para ${code.code_value}`}
                                >
                                  <MoreVerticalIcon className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                {code.is_published ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      void handleUnpublish(code.id)
                                    }
                                  >
                                    Despublicar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => void handlePublish(code.id)}
                                  >
                                    Publicar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => void handleRevoke(code.id)}
                                >
                                  Revocar token
                                </DropdownMenuItem>
                                {code.token && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const galleryLink =
                                        generateFamilyGalleryLink({
                                          token: code.token,
                                          eventId: code.event_id,
                                          origin: window.location.origin,
                                        });
                                      navigator.clipboard.writeText(
                                        galleryLink
                                      );
                                      toast.success(
                                        'Enlace copiado al portapapeles'
                                      );
                                    }}
                                  >
                                    Copiar enlace
                                  </DropdownMenuItem>
                                )}
                                {code.token && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.open(
                                        `/api/qr?token=${code.token}`,
                                        '_blank'
                                      )
                                    }
                                  >
                                    Ver código QR
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => void handleDownloadZip(code)}
                                >
                                  Descargar ZIP
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() =>
                                    void handleDeleteCode(
                                      code.event_id,
                                      code.id,
                                      code.code_value
                                    )
                                  }
                                >
                                  <Trash2Icon className="mr-2 h-4 w-4" />
                                  Eliminar carpeta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// (intencionalmente sin helpers globales; la lógica vive dentro del componente)
