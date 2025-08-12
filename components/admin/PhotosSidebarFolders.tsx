'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FolderIcon, SearchIcon, MoreVerticalIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';

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
  selected: { eventId?: string | null; courseId?: string | null; codeId?: string | 'null' | null };
  onSelect: (sel: { eventId?: string | null; courseId?: string | null; codeId?: string | 'null' | null }) => void;
  onCountsChanged?: () => void;
  refreshKey?: number;
}

function groupCodesByCourse(rows: SidebarCodeRow[]): Record<string, SidebarCodeRow[]> {
  const by: Record<string, SidebarCodeRow[]> = {};
  for (const c of rows) {
    const key = c.course_id || '__no_course__';
    if (!by[key]) by[key] = [];
    by[key].push(c);
  }
  return by;
}

export default function PhotosSidebarFolders({ events, selected, onSelect, refreshKey }: PhotosSidebarFoldersProps) {
  const [query, setQuery] = useState('');
  const [openEventId, setOpenEventId] = useState<string | null>(selected.eventId ?? null);
  const [codesCache, setCodesCache] = useState<Record<string, SidebarCodeRow[]>>({});

  const filteredEvents = useMemo(() => {
    // De-duplicar por id y luego filtrar por query
    const uniqueById = Array.from(new Map(events.map(e => [e.id, e])).values());
    if (!query) return uniqueById;
    const q = query.toLowerCase();
    return uniqueById.filter((e) => e.name.toLowerCase().includes(q));
  }, [events, query]);

  const fetchCodes = useCallback(
    async (eventId: string) => {
      // Guard: no eventId = no fetch
      if (!eventId) {
        return;
      }
      
      try {
        const resp = await fetch(`/api/admin/publish/list?eventId=${eventId}`);
        const data = await resp.json();
        const arr = Array.isArray(data) ? data : (data.rows || data.data || []);
        const rows: SidebarCodeRow[] = arr.map((c: any) => ({
          id: (c.id ?? c.code_id) as string,
          event_id: eventId,
          course_id: (c.course_id as string) ?? null,
          code_value: String(c.code_value),
          token: (c.token as string) ?? null,
          is_published: Boolean(c.is_published ?? c.published),
          photos_count: Number(c.photos_count ?? 0),
        }));
        setCodesCache((prev) => ({ ...prev, [eventId]: rows }));
      } catch {
        setCodesCache((prev) => ({ ...prev, [eventId]: [] }));
      }
    },
    []
  );

  // When event selection changes, auto open that event and ensure codes loaded
  useEffect(() => {
    if (selected.eventId) {
      setOpenEventId(selected.eventId);
      // Only fetch codes if we have an eventId
      void fetchCodes(selected.eventId);
    }
  }, [selected.eventId, fetchCodes]);

  // External refresh trigger: re-fetch codes for currently open event
  useEffect(() => {
    if (openEventId) {
      void fetchCodes(openEventId);
    }
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
      if (openEventId) await fetchCodes(openEventId);
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
      if (openEventId) await fetchCodes(openEventId);
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
      if (openEventId) await fetchCodes(openEventId);
    } catch {}
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el evento "${eventName}"? Esta acción no se puede deshacer y eliminará todas las fotos asociadas.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el evento');
      }

      toast.success('Evento eliminado correctamente');
      
      // Clear selection if the deleted event was selected
      if (selected.eventId === eventId) {
        onSelect({ eventId: null, courseId: null, codeId: null });
      }
      
      // Close the event if it was open
      if (openEventId === eventId) {
        setOpenEventId(null);
      }
      
      // Trigger a refresh
      await fetchCodes();
      if (onCountsChanged) {
        onCountsChanged();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Error al eliminar el evento');
    }
  };

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

  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          aria-label="Buscar evento"
          placeholder="Buscar evento..."
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Card className="p-2">
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-1">
            {filteredEvents.map((event) => {
              const isOpen = openEventId === event.id;
              const codes = codesCache[event.id] || [];
              const courses = groupCodesByCourse(codes);
              return (
                <div key={event.id} className="border-b last:border-b-0">
                  <div className="flex items-center group">
                    <button
                      className="flex-1 flex items-center gap-2 py-2 px-2 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 rounded"
                      aria-expanded={isOpen}
                      onClick={async () => {
                        const next = isOpen ? null : event.id;
                        setOpenEventId(next);
                        if (next) await fetchCodes(next);
                      }}
                    >
                      <FolderIcon className="w-4 h-4" />
                      <span className="flex-1 text-left truncate">{event.name}</span>
                      <Badge variant="secondary">{event.photo_count ?? 0}</Badge>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Acciones para ${event.name}`}
                        >
                          <MoreVerticalIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onSelect({ eventId: event.id, courseId: null, codeId: null })}>
                          Ver todas las fotos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(event.id)}>
                          Copiar ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteEvent(event.id, event.name)}
                        >
                          <Trash2Icon className="w-4 h-4 mr-2" />
                          Eliminar evento
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {isOpen && (
                    <div className="pb-2">
                      <div className="px-2 py-1 space-y-1">
                        <Button
                          variant={selected.eventId === event.id && selected.codeId === 'null' ? 'default' : 'ghost'}
                          className="w-full justify-start text-sm"
                          onClick={() => onSelect({ eventId: event.id, codeId: 'null' })}
                          aria-label={`Ver fotos sin carpeta en ${event.name}`}
                        >
                          📁 Sin carpeta
                        </Button>
                        <Button
                          variant={selected.eventId === event.id && !selected.courseId && !selected.codeId ? 'default' : 'ghost'}
                          className="w-full justify-start text-sm"
                          onClick={() => onSelect({ eventId: event.id, courseId: null, codeId: null })}
                          aria-label={`Ver todas las fotos del evento ${event.name}`}
                        >
                          📷 Todo el evento
                        </Button>
                      </div>
                      <div className="pl-2">
                        {Object.entries(courses).map(([courseId, rows]) => (
                          <div key={`${event.id}-${courseId}`} className="mb-1">
                            <div className="px-2 py-1 text-xs font-medium text-gray-500">
                              {courseId === '__no_course__' ? 'Curso sin nombre' : `Curso ${courseId}`}
                            </div>
                            <div className="space-y-1">
                              {rows.map((code) => (
                                <div key={code.id} className="flex items-center">
                                  <Button
                                    variant={selected.codeId === code.id ? 'default' : 'ghost'}
                                    className="w-full justify-start"
                                    onClick={() => onSelect({ eventId: event.id, courseId: code.course_id, codeId: code.id })}
                                    aria-label={`Filtrar código ${code.code_value}`}
                                  >
                                    <span className="font-mono">{code.code_value}</span>
                                    <Badge variant="outline" className="ml-2">{code.photos_count}</Badge>
                                    {code.is_published ? (
                                      <Badge className="ml-2 bg-green-100 text-green-800">Publicado</Badge>
                                    ) : (
                                      <Badge className="ml-2 bg-gray-100">No publicado</Badge>
                                    )}
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" aria-label={`Acciones para ${code.code_value}`}>
                                        <MoreVerticalIcon className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                      {code.is_published ? (
                                        <DropdownMenuItem onClick={() => void handleUnpublish(code.id)}>Despublicar</DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => void handlePublish(code.id)}>Publicar</DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => void handleRevoke(code.id)}>Revocar token</DropdownMenuItem>
                                      {code.token && (
                                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${code.token}`)}>Copiar link</DropdownMenuItem>
                                      )}
                                      {code.token && (
                                        <DropdownMenuItem onClick={() => window.open(`/api/qr?token=${code.token}`, '_blank')}>Ver QR</DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => void handleDownloadZip(code)}>Descargar ZIP</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}


