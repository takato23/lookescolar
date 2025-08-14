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
import { SearchIcon, MoreVerticalIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

export default function PhotosSidebarFolders({ events: _events, selected, onSelect, refreshKey, onCountsChanged }: PhotosSidebarFoldersProps) {
  const [query, setQuery] = useState('');
  const [codesCache, setCodesCache] = useState<Record<string, SidebarCodeRow[]>>({});
  const [newFolderName, setNewFolderName] = useState('');

  // Eventos ocultos en esta vista simplificada; solo mostramos todas las carpetas

  const fetchCodes = useCallback(
    async (eventId?: string | null) => {
      try {
        const url = eventId ? `/api/admin/publish/list?eventId=${eventId}` : `/api/admin/publish/list`;
        const resp = await fetch(url);
        const data = await resp.json();
        const arr = Array.isArray(data) ? data : (data.rows || data.data || []);
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
    },
    []
  );

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

  const handleDeleteCode = useCallback(async (_eventId: string, codeId: string, label: string) => {
    try {
      if (!confirm(`¿Eliminar la carpeta "${label}"? Las fotos quedarán como 'Sin carpeta'.`)) return;
      const resp = await fetch(`/api/admin/codes/${codeId}`, { method: 'DELETE' });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(j?.error || 'No se pudo eliminar la carpeta');
      // refresh codes for current event
      await fetchCodes(null);
      toast.success('Carpeta eliminada');
      onCountsChanged?.();
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar la carpeta');
    }
  }, [fetchCodes, onCountsChanged]);

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

  return (
    <div className="space-y-4">
      {/* New folder input - mejorado */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Nueva Carpeta</h4>
        <div className="flex gap-2">
          <Input
            aria-label="Nombre de carpeta"
            placeholder="Nombre de la carpeta..."
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
            className="placeholder:text-gray-500 text-gray-900 font-medium border-gray-300 focus:border-blue-500 focus:ring-blue-500"
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
            className="bg-blue-600 text-white font-semibold hover:bg-blue-700 border-0 disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Crear
          </Button>
        </div>
      </div>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          aria-label="Buscar carpeta"
          placeholder="Buscar carpeta..."
          className="pl-9 placeholder:text-gray-500 text-gray-900 font-medium"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Card className="p-0 border border-gray-200">
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <h4 className="text-sm font-semibold text-gray-800">Todas las Carpetas</h4>
          <p className="text-xs text-gray-600 mt-1">
            {(codesCache['__all__'] || []).filter((c) => !query || String(c.code_value).toLowerCase().includes(query.toLowerCase())).length} carpetas disponibles
          </p>
        </div>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-2 space-y-1">
            {/* Vista mejorada: organizar carpetas */}
            <div className="space-y-2">
              {(codesCache['__all__'] || [])
                .filter((c) => !query || String(c.code_value).toLowerCase().includes(query.toLowerCase()))
                .sort((a, b) => a.code_value.localeCompare(b.code_value))
                .map((code) => (
                  <div key={`all-${code.id}`} className="group border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-center p-2">
                      <Button
                        variant={selected.codeId === code.id ? 'default' : 'ghost'}
                        className={cn(
                          "flex-1 justify-start h-auto p-2 text-left",
                          selected.codeId === code.id 
                            ? "bg-blue-50 text-blue-900 border-blue-200" 
                            : "hover:bg-gray-50"
                        )}
                        onClick={() => onSelect({ eventId: code.event_id, courseId: null, codeId: code.id })}
                        aria-label={`Abrir carpeta ${code.code_value}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const photoId = e.dataTransfer.getData('text/plain');
                          if (!photoId) return;
                          try {
                            const res = await fetch(`/api/admin/photos/${photoId}/move`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ codeId: code.id }),
                            });
                            const j = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(j?.error || 'No se pudo mover la foto');
                            toast.success('Foto movida');
                            onCountsChanged?.();
                          } catch (err: any) {
                            toast.error(err?.message || 'Error al mover la foto');
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate" title={code.code_value}>
                            {code.code_value}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="secondary" 
                              className="text-xs bg-gray-100 text-gray-700"
                            >
                              {code.photos_count} fotos
                            </Badge>
                            {code.is_published ? (
                              <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                Publicado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-300">
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
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                            aria-label={`Acciones para ${code.code_value}`}
                          >
                            <MoreVerticalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {code.is_published ? (
                            <DropdownMenuItem onClick={() => void handleUnpublish(code.id)}>
                              Despublicar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => void handlePublish(code.id)}>
                              Publicar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => void handleRevoke(code.id)}>
                            Revocar token
                          </DropdownMenuItem>
                          {code.token && (
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(`${window.location.origin}/f/${code.token}`)}>
                              Copiar enlace
                            </DropdownMenuItem>
                          )}
                          {code.token && (
                            <DropdownMenuItem onClick={() => window.open(`/api/qr?token=${code.token}`, '_blank')}>
                              Ver código QR
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => void handleDownloadZip(code)}>
                            Descargar ZIP
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => void handleDeleteCode(code.event_id, code.id, code.code_value)}
                          >
                            <Trash2Icon className="w-4 h-4 mr-2" />
                            Eliminar carpeta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

// (intencionalmente sin helpers globales; la lógica vive dentro del componente)


