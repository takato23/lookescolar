'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { QrCode, Link2, Users, Layers, GraduationCap, User, Share2, Copy, ExternalLink } from 'lucide-react';

export default function ShareManagerPage({ params }: any) {
  const eventId = params.id as string;
  const [folders, setFolders] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedLevelFolder, setSelectedLevelFolder] = useState<string>('');
  const [selectedCourseFolder, setSelectedCourseFolder] = useState<string>('');
  const [creating, setCreating] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<{ scope: string; url: string; store: string } | null>(null);
  const [orderSummary, setOrderSummary] = useState<any[]>([]);
  const [shareList, setShareList] = useState<any[]>([]);
  const [opts, setOpts] = useState({ allowDownload: true, expiresInDays: 60, maxViews: 0, password: '' });

  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ include_unpublished: 'true', limit: '200', order_by: 'name_asc', event_id: eventId });
        const res = await fetch(`/api/admin/folders/published?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setFolders(data.folders || []);
        }
      } catch {}
    };
    load();
  }, [eventId]);

  useEffect(() => {
    const loadShares = async () => {
      try {
        const params = new URLSearchParams({ event_id: eventId, active: 'true' });
        const res = await fetch(`/api/admin/share/list?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setShareList(data.tokens || []);
        }
      } catch {}
    };
    loadShares();
  }, [eventId]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const params = new URLSearchParams({ event_id: eventId, limit: '50' });
        const res = await fetch(`/api/admin/orders/summary?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setOrderSummary(data.summary || []);
        }
      } catch {}
    };
    loadSummary();
  }, [eventId]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const createLink = async (scope: 'event' | 'folder', id: string) => {
    setCreating(scope + ':' + id);
    try {
      const res = await fetch('/api/admin/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          id,
          options: {
            allowDownload: !!opts.allowDownload,
            expiresInDays: Number(opts.expiresInDays) || undefined,
            maxViews: Number(opts.maxViews) || undefined,
            password: opts.password?.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setLastLink({ scope, url: data.view_url, store: data.store_url });
        // refresh list
        const params = new URLSearchParams({ event_id: eventId, active: 'true' });
        fetch(`/api/admin/share/list?${params.toString()}`)
          .then((r) => r.json())
          .then((d) => setShareList(d.tokens || []))
          .catch(() => {});
      }
    } finally {
      setCreating(null);
    }
  };

  const levelOptions = useMemo(() => folders.filter((f) => (f.depth === 0 || f.parent_id === null)), [folders]);
  const courseOptions = useMemo(() => folders.filter((f) => f.depth === 1 || f.parent_id), [folders]);

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compartir</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Crear enlaces para familias de este evento</p>
        </div>
      </div>

      {/* Opciones */}
      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Opciones del enlace</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={opts.allowDownload}
              onChange={(e) => setOpts((o) => ({ ...o, allowDownload: e.target.checked }))}
            />
            Permitir descarga
          </label>
          <div className="flex items-center gap-2 text-sm">
            <span>Expira (días)</span>
            <Input
              value={opts.expiresInDays}
              onChange={(e) => setOpts((o) => ({ ...o, expiresInDays: Number(e.target.value || 0) }))}
              className="w-24"
              type="number"
              min={1}
              max={365}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Máx. vistas</span>
            <Input
              value={opts.maxViews}
              onChange={(e) => setOpts((o) => ({ ...o, maxViews: Number(e.target.value || 0) }))}
              className="w-24"
              type="number"
              min={0}
              max={100000}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>Contraseña</span>
            <Input
              value={opts.password}
              onChange={(e) => setOpts((o) => ({ ...o, password: e.target.value }))}
              className="w-48"
              placeholder="(opcional)"
              type="text"
            />
          </div>
        </div>
      </Card>

      {/* Evento completo */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="font-medium">Evento completo</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Todas las fotos publicadas del evento</div>
            </div>
          </div>
          <Button onClick={() => createLink('event', eventId)} disabled={creating === 'event:' + eventId}>
            <Share2 className="mr-2 h-4 w-4" /> Crear enlace
          </Button>
        </div>
      </Card>

      {/* Nivel (aprox. carpeta raíz) */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <GraduationCap className="h-5 w-5 text-purple-600" />
          <div>
            <div className="font-medium">Secundaria (Nivel)</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Selecciona carpeta de nivel</div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedLevelFolder}
            onChange={(e) => setSelectedLevelFolder(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="">Seleccionar carpeta…</option>
            {levelOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => selectedLevelFolder && createLink('folder', selectedLevelFolder)}
            disabled={!selectedLevelFolder || creating === 'folder:' + selectedLevelFolder}
          >
            <Share2 className="mr-2 h-4 w-4" /> Crear enlace
          </Button>
        </div>
      </Card>

      {/* Curso/Salón (aprox. subcarpeta) */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-600" />
          <div>
            <div className="font-medium">Salón 1 (Curso)</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Selecciona carpeta de curso/salón</div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCourseFolder}
            onChange={(e) => setSelectedCourseFolder(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="">Seleccionar carpeta…</option>
            {courseOptions.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => selectedCourseFolder && createLink('folder', selectedCourseFolder)}
            disabled={!selectedCourseFolder || creating === 'folder:' + selectedCourseFolder}
          >
            <Share2 className="mr-2 h-4 w-4" /> Crear enlace
          </Button>
        </div>
      </Card>

      {/* Familia (opcional: usar carpeta propia de familia) */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-3">
          <User className="h-5 w-5 text-pink-600" />
          <div>
            <div className="font-medium">Familia Gutiérrez</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Selecciona carpeta de familia</div>
          </div>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedCourseFolder}
            onChange={(e) => setSelectedCourseFolder(e.target.value)}
            className="rounded border px-3 py-2"
          >
            <option value="">Seleccionar carpeta…</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => selectedCourseFolder && createLink('folder', selectedCourseFolder)}
            disabled={!selectedCourseFolder || creating === 'folder:' + selectedCourseFolder}
          >
            <Share2 className="mr-2 h-4 w-4" /> Crear enlace
          </Button>
        </div>
      </Card>

      {lastLink && (
        <Card className="p-4">
          <div className="mb-2 text-sm font-medium">Enlace creado</div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{lastLink.scope}</Badge>
            <Button variant="ghost" size="sm" onClick={() => copy(lastLink.url)}>
              <Copy className="mr-2 h-4 w-4" /> Copiar enlace
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(lastLink.url, '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir galería
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(lastLink.store, '_blank')}>
              <Link2 className="mr-2 h-4 w-4" /> Abrir tienda
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(`/api/qr?token=${encodeURIComponent(lastLink.url.split('/').pop() || '')}`, '_blank')}>
              <QrCode className="mr-2 h-4 w-4" /> Ver QR
            </Button>
          </div>
        </Card>
      )}

      {/* Enlaces activos */}
      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Enlaces activos</div>
        {shareList.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">No hay enlaces activos</div>
        ) : (
          <div className="space-y-2">
            {shareList.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t.share_type}</Badge>
                  <span className="text-foreground">{(t.token || '').slice(0, 8)}…</span>
                  {t.expires_at && (
                    <span className="text-xs text-gray-500">expira: {new Date(t.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => window.open(t.view_url, '_blank')}>
                    Abrir
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(t.view_url)}>
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(t.store_url, '_blank')}>
                    Tienda
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const res = await fetch(`/api/admin/share/${t.token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'rotate' }) });
                      const data = await res.json();
                      if (data?.success) {
                        const params = new URLSearchParams({ event_id: eventId, active: 'true' });
                        fetch(`/api/admin/share/list?${params.toString()}`)
                          .then((r) => r.json())
                          .then((d) => setShareList(d.tokens || []))
                          .catch(() => {});
                      }
                    }}
                  >
                    Rotar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      const res = await fetch(`/api/admin/share/${t.token}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deactivate' }) });
                      const data = await res.json();
                      if (data?.success) setShareList((lst) => lst.filter((x) => x.id !== t.id));
                    }}
                  >
                    Desactivar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Resumen de órdenes por enlace */}
      <Card className="p-4">
        <div className="mb-2 text-sm font-medium">Órdenes recientes por enlace</div>
        {orderSummary.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Sin órdenes aún</div>
        ) : (
          <div className="space-y-2">
            {orderSummary.slice(0, 10).map((it: any) => (
              <div key={it.share_token_id || it.token} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{(it.token || '').slice(0, 6)}…</Badge>
                  <span>{new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(it.total_amount || 0)}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{it.orders} pedidos</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
