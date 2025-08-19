'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QrCode, RotateCcw, LinkIcon, Copy, ExternalLink, RefreshCw, Users, User } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<{id: string, name: string} | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Endpoint simple: consultar codes + conteo fotos por code_id
      const res = await fetch('/api/admin/publish/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');

      // El endpoint puede devolver un array directo o un objeto con { rows }
      const arr = Array.isArray(json) ? json : (json?.rows || json?.data || []);

      const mapped: CodeRow[] = (arr as any[]).map((c) => ({
        id: (c.id ?? c.code_id) as string,
        event_id: (c.event_id as string) ?? '',
        course_id: (c.course_id as string) ?? null,
        code_value: String(c.code_value ?? ''),
        token: (c.token as string) ?? null,
        is_published: Boolean(c.is_published ?? c.published ?? false),
        photos_count: Number(c.photos_count ?? 0),
      }));

      setRows(mapped);

      // Obtener información del evento si hay códigos
      if (mapped.length > 0) {
        const eventId = mapped[0].event_id;
        try {
          const eventRes = await fetch(`/api/admin/events/${eventId}`);
          const eventJson = await eventRes.json();
          if (eventRes.ok && eventJson.event) {
            setSelectedEvent({
              id: eventId,
              name: eventJson.event.name || eventJson.event.school || 'Evento'
            });
          }
        } catch (e) {
          console.error('Error obteniendo evento:', e);
        }
      }
    } catch (e) {
      console.error('[Service] Error cargando publicación:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.code_value.toLowerCase().includes(q));
  }, [rows, filter]);

  const publish = async (codeId: string) => {
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error publicando');
      await load();
    } catch (e) {
      console.error('[Service] Error publicando:', e);
      alert('No se pudo publicar');
    }
  };

  const rotate = async (codeId: string) => {
    try {
      const res = await fetch('/api/admin/publish/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error rotando');
      await load();
    } catch (e) {
      console.error('[Service] Error rotando token:', e);
      alert('No se pudo rotar');
    }
  };

  const unpublish = async (codeId: string) => {
    try {
      const res = await fetch('/api/admin/publish/unpublish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error despublicando');
      await load();
    } catch (e) {
      console.error('[Service] Error despublicando:', e);
      alert('No se pudo despublicar');
    }
  };

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

  return (
    <TooltipProvider>
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Publicación</h1>
            <p className="text-muted-foreground">Dos tipos de compartir: público general y personalizado por familia</p>
          </div>
          <Button onClick={load} aria-label="Refrescar" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* SECCIÓN: COMPARTIR PÚBLICO */}
        {selectedEvent && (
          <Card className="border-blue-200 bg-blue-50/50">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">Compartir Público</h2>
                  <p className="text-sm text-blue-700">
                    Evento: {selectedEvent.name} - <strong>Todas las familias ven las mismas fotos</strong>
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={copyPublicLink}
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Enlace Público
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enlace para compartir con todas las familias del evento</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={getPublicUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-md bg-white border border-blue-300 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver Galería Pública
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Previsualizar cómo ven las familias la galería pública</p>
                  </TooltipContent>
                </Tooltip>

                <div className="text-xs text-blue-600 font-mono bg-blue-100 px-2 py-1 rounded">
                  {getPublicUrl()}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* SECCIÓN: COMPARTIR PERSONALIZADO */}
        <Card className="border-orange-200 bg-orange-50/50">
          <div className="border-b border-orange-200 bg-orange-100/50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-orange-100 p-2">
                <User className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-orange-900">Compartir Personalizado</h2>
                <p className="text-sm text-orange-700">
                  Cada código/familia ve solo <strong>sus fotos específicas</strong> - Control granular
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Input
                placeholder="Filtrar por código (p. ej. 3B-07)"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>

          <div className="p-0 overflow-hidden">
        <div className="grid grid-cols-12 bg-muted/40 px-4 py-2 text-sm font-medium">
          <div className="col-span-3">Código</div>
          <div className="col-span-2">Fotos</div>
          <div className="col-span-2">Publicado</div>
          <div className="col-span-5">Acciones</div>
        </div>
        <div>
          {loading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Sin resultados</div>
          ) : (
            filtered.map((r) => {
              const url = r.token ? `${window.location.origin}/f/${r.token}/simple-page` : '';
              return (
                <div key={r.id} className="grid grid-cols-12 items-center gap-2 border-t px-4 py-3 text-sm">
                  <div className="col-span-3 font-medium">{r.code_value}</div>
                  <div className="col-span-2">{r.photos_count}</div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${r.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}>
                      {r.is_published ? 'Publicado' : 'No publicado'}
                    </span>
                  </div>
                  <div className="col-span-5 flex flex-wrap items-center gap-2">
                    {!r.is_published && (
                      <Button onClick={() => publish(r.id)} aria-label="Publicar" size="sm">
                        Publicar
                      </Button>
                    )}
                    {r.is_published && (
                      <>
                        <Button onClick={() => rotate(r.id)} aria-label="Revocar token" size="sm" variant="outline">
                          <RotateCcw className="mr-1 h-4 w-4" /> Rotar token
                        </Button>
                        <Button onClick={() => unpublish(r.id)} aria-label="Despublicar" size="sm" variant="destructive">
                          Despublicar
                        </Button>
                        {r.token && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button onClick={() => copy(url)} aria-label="Copiar link" size="sm" variant="ghost">
                                  <Copy className="mr-1 h-4 w-4" /> Copiar link
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Copiar enlace personalizado para {r.code_value}</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`/f/${r.token}/simple-page`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Abrir enlace personalizado ${r.code_value}`}
                                  className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <ExternalLink className="mr-1 h-4 w-4" /> Ver galería
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver galería personalizada de {r.code_value}</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={`/api/qr?token=${encodeURIComponent(r.token)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Ver QR ${r.code_value}`}
                                  className="inline-flex items-center rounded-md border px-2 py-1 text-sm hover:bg-gray-50"
                                >
                                  <QrCode className="mr-1 h-4 w-4" /> QR
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Generar código QR para {r.code_value}</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
}

 


