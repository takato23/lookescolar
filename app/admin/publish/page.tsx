'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { QrCode, RotateCcw, LinkIcon, Copy, ExternalLink, RefreshCw } from 'lucide-react';

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

  const load = async () => {
    setLoading(true);
    try {
      // Endpoint simple: consultar codes + conteo fotos por code_id
      const res = await fetch('/api/admin/publish/list');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setRows(json.rows || []);
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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Publicación</h1>
          <p className="text-muted-foreground">Tokens, enlaces públicos y QR</p>
        </div>
        <Button onClick={load} aria-label="Refrescar" variant="outline">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Filtrar por código (p. ej. 3B-07)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
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
              const url = r.token ? `${window.location.origin}/f/${r.token}` : '';
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
                            <Button onClick={() => copy(url)} aria-label="Copiar link" size="sm" variant="ghost">
                              <Copy className="mr-1 h-4 w-4" /> Copiar link
                            </Button>
                            <a
                              href={`/f/${r.token}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Abrir enlace público ${r.code_value}`}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-sm"
                            >
                              <ExternalLink className="mr-1 h-4 w-4" /> Abrir
                            </a>
                            <a
                              href={`/api/qr?token=${encodeURIComponent(r.token)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Ver QR ${r.code_value}`}
                              className="inline-flex items-center rounded-md border px-2 py-1 text-sm"
                            >
                              <QrCode className="mr-1 h-4 w-4" /> Ver QR
                            </a>
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
  );
}

 


