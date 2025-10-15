'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShareWizard } from '@/components/admin/share/ShareWizard';
import { ShareScopeConfig } from '@/lib/services/share.service';
import {
  QrCode,
  Link2,
  Users,
  Layers,
  GraduationCap,
  User,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  RefreshCcw,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ShareManagerPage({ params }: { params: { id: string } }) {
  const { id: eventId } = params;
  const [folders, setFolders] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedLevelFolder, setSelectedLevelFolder] = useState<string>('');
  const [selectedCourseFolder, setSelectedCourseFolder] = useState<string>('');
  const [creating, setCreating] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<{ scope: string; url: string; store: string }> | null>(null);
  const [orderSummary, setOrderSummary] = useState<any[]>([]);
  const [shareList, setShareList] = useState<any[]>([]);
  const [showShareWizard, setShowShareWizard] = useState(false);
  const [expandedShareId, setExpandedShareId] = useState<string | null>(null);
  const [audiencesByShare, setAudiencesByShare] = useState<Record<string, any[]>>({});
  const [loadingAudienceFor, setLoadingAudienceFor] = useState<string | null>(null);
  const [resendingShareId, setResendingShareId] = useState<string | null>(null);
  const [opts, setOpts] = useState({ allowDownload: true, expiresInDays: 60, maxViews: 0, password: '' });
  const [familyTokens, setFamilyTokens] = useState<
    Array<{
      id: string;
      alias: string;
      short_code: string;
      token: string;
      type: string;
      family_email?: string | null;
      student_ids: string[];
      expires_at?: string | null;
    }>
  >([]);
  const [loadingFamilyTokens, setLoadingFamilyTokens] = useState(false);
  const [ensuringAliases, setEnsuringAliases] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

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

  const loadShares = useCallback(async () => {
    try {
      const params = new URLSearchParams({ event_id: eventId, active: 'true' });
      const res = await fetch(`/api/admin/share/list?${params.toString()}`);
      if (!res.ok) {
        throw new Error('No se pudieron cargar los enlaces');
      }
      const data = await res.json();
      setShareList(data.tokens || []);
    } catch (error) {
      console.error('[ShareManager] Error fetching shares', error);
    }
  }, [eventId]);

  useEffect(() => {
    loadShares();
  }, [eventId]); // Cambiar dependencia para evitar loops

  useEffect(() => {
    const shouldOpen = searchParams?.get('openWizard') === '1';
    if (shouldOpen && !showShareWizard) {
      setShowShareWizard(true);
    }
  }, [searchParams, showShareWizard]);

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

  const fetchFamilyTokens = useCallback(async () => {
    setLoadingFamilyTokens(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/aliases`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'No se pudieron cargar los alias familiares');
      }
      const data = await res.json();
      setFamilyTokens(data.tokens || []);
    } catch (error: any) {
      console.error('[ShareManager] Error fetching aliases', error);
      toast.error(error?.message || 'Error al cargar alias familiares');
    } finally {
      setLoadingFamilyTokens(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchFamilyTokens();
  }, [eventId]); // Solo ejecutar cuando cambia el eventId

  const ensureFamilyAliases = useCallback(async () => {
    setEnsuringAliases(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/aliases`, { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'No se pudieron generar alias');
      }
      const data = await res.json();
      toast.success(`Alias generados para ${data.ensured} tokens`);
      fetchFamilyTokens();
    } catch (error: any) {
      console.error('[ShareManager] Error ensuring aliases', error);
      toast.error(error?.message || 'Error al generar alias familiares');
    } finally {
      setEnsuringAliases(false);
    }
  }, [eventId, fetchFamilyTokens]);

  const printFamilyFlyer = useCallback(
    (item: { alias: string; short_code: string; token: string; family_email?: string | null }) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrUrl = `${origin}/access?token=${encodeURIComponent(item.token)}`;
      const popup = window.open('', '_blank', 'noopener,noreferrer,width=720,height=960');
      if (!popup) {
        toast.error('Habilita ventanas emergentes para imprimir el flyer');
        return;
      }

      popup.document.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Flyer familiar - ${item.alias}</title>
            <style>
              body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 40px; background: #f5f5f5; }
              .flyer { max-width: 720px; margin: 0 auto; background: white; border: 3px solid #111; border-radius: 18px; padding: 36px; text-align: center; }
              h1 { letter-spacing: 4px; margin-bottom: 6px; }
              .alias { display: inline-block; border: 2px dashed #111; padding: 18px 32px; border-radius: 12px; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 24px 0; }
              img { width: 240px; height: 240px; }
              .instructions { text-align: left; font-size: 14px; line-height: 1.6; margin-top: 24px; }
              @media print { body { padding: 0; background: white; } .flyer { border-width: 2px; border-radius: 0; } }
            </style>
          </head>
          <body>
            <div class="flyer">
              <h1>LOOKESCOLAR</h1>
              <p>Accedé a tu galería familiar</p>
              <div class="alias">Alias: ${item.alias.toUpperCase()}<br/>Código corto: ${item.short_code}</div>
              <div>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl)}" alt="QR acceso familiar" />
              </div>
              <div class="instructions">
                <strong>Cómo acceder:</strong>
                <ol>
                  <li>Escaneá el QR o ingresá a <strong>${origin}/access</strong>.</li>
                  <li>Ingresá el alias o código corto.</li>
                  <li>Entrá a la galería para ver y comprar las fotos.</li>
                </ol>
                <p>Contacto: ${item.family_email || 'Fotógrafa'}</p>
              </div>
            </div>
          </body>
        </html>
      `);
      popup.document.close();
    },
    []
  );

  const fetchAudiences = useCallback(
    async (shareId: string, force = false) => {
      if (!force && audiencesByShare[shareId]) {
        return audiencesByShare[shareId];
      }
      setLoadingAudienceFor(shareId);
      try {
        const res = await fetch(`/api/share/${shareId}/audiences`);
        if (!res.ok) {
          throw new Error('No se pudieron cargar las audiencias');
        }
        const data = await res.json();
        const list = data.audiences || [];
        setAudiencesByShare((prev) => ({ ...prev, [shareId]: list }));
        return list;
      } catch (error: any) {
        toast.error(error?.message || 'Error al cargar audiencias');
        return [];
      } finally {
        setLoadingAudienceFor(null);
      }
    },
    [audiencesByShare]
  );

  const handleToggleAudiences = useCallback(
    async (shareId: string) => {
      if (expandedShareId === shareId) {
        setExpandedShareId(null);
        return;
      }
      const list = await fetchAudiences(shareId);
      if (list) {
        setExpandedShareId(shareId);
      }
    },
    [expandedShareId, fetchAudiences]
  );

  const handleResend = useCallback(
    async (share: any) => {
      setResendingShareId(share.id);
      try {
        const audiences = await fetchAudiences(share.id, true);
        if (!audiences || audiences.length === 0) {
          toast.error('No hay audiencias registradas para este enlace');
          return;
        }

        const families = audiences
          .filter((aud: any) => aud.audience_type !== 'manual' && aud.subject_id)
          .map((aud: any) => aud.subject_id as string);

        const emails = audiences
          .filter((aud: any) => aud.audience_type === 'manual' && aud.contact_email)
          .map((aud: any) => (aud.contact_email as string).toLowerCase());

        const groups = audiences
          .filter((aud: any) => aud.audience_type === 'group' && aud.subject_id)
          .map((aud: any) => aud.subject_id as string);

        const res = await fetch('/api/share/deliver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shareTokenId: share.id,
            audience: {
              families,
              groups,
              emails,
            },
            templateId: 'default',
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudo reenviar el enlace');
        }

        toast.success('Reenvío programado');
        await fetchAudiences(share.id, true);
      } catch (error: any) {
        toast.error(error?.message || 'Error al reenviar');
      } finally {
        setResendingShareId(null);
      }
    },
    [fetchAudiences]
  );

  const handleRevoke = useCallback(
    async (share: any) => {
      if (!window.confirm('¿Revocar este enlace?')) return;
      try {
        const res = await fetch(`/api/share/${share.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || 'No se pudo revocar el enlace');
        }
        toast.success('Enlace revocado');
        await loadShares();
      } catch (error: any) {
        toast.error(error?.message || 'Error al revocar enlace');
      }
    },
    [loadShares]
  );
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

      <Card className="border-dashed border-primary/30 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Sistema de compartición avanzado</h3>
            <p className="text-sm text-muted-foreground">
              Configurá alcance, audiencias y entrega automatizada desde un único flujo guiado.
            </p>
          </div>
          <Button className="sm:w-auto" onClick={() => setShowShareWizard(true)}>
            <Sparkles className="mr-2 h-4 w-4" /> Abrir wizard
          </Button>
        </div>
      </Card>

      {/* Alias familiares automáticos */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-pink-600" />
            <div>
              <div className="font-medium">Alias familiares</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Compartí alias cortos y QR con cada familia sin salir de esta pantalla
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFamilyTokens}
              disabled={loadingFamilyTokens || ensuringAliases}
            >
              <RefreshCcw className="mr-2 h-4 w-4" /> Actualizar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={ensureFamilyAliases}
              disabled={ensuringAliases}
            >
              {ensuringAliases ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 animate-spin" /> Generando…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Generar alias
                </span>
              )}
            </Button>
          </div>
        </div>

        {loadingFamilyTokens ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Cargando alias familiares…</div>
        ) : familyTokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:text-gray-400">
            Todavía no hay tokens familiares registrados. Generá accesos desde el módulo de estudiantes/familias y presioná “Generar alias”.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {familyTokens.map((token) => (
              <div
                key={token.id}
                className="flex flex-col justify-between rounded-lg border border-gray-200 p-4 shadow-sm dark:border-gray-800"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{token.type === 'family_access' ? 'Familia' : 'Estudiante'}</Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {token.student_ids.length} estudiantes
                    </span>
                  </div>
                  <div className="text-lg font-semibold tracking-wide">{token.alias.toUpperCase()}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Código corto: {token.short_code}</div>
                  {token.family_email && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">Email: {token.family_email}</div>
                  )}
                  {token.expires_at && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Expira: {new Date(token.expires_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => copy(token.alias)}>
                    <Copy className="mr-2 h-4 w-4" /> Copiar alias
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copy(token.short_code)}>
                    <Copy className="mr-2 h-4 w-4" /> Copiar código
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => printFamilyFlyer(token)}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir flyer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  `/access?token=${encodeURIComponent(
                    lastLink.url.split('/').pop() || ''
                  )}`,
                  '_blank'
                )
              }
            >
              <QrCode className="mr-2 h-4 w-4" /> Ver QR
            </Button>
          </div>
        </Card>
      )}

      {/* Enlaces activos */}
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Enlaces activos</div>
            <p className="text-xs text-muted-foreground">
              Visualiza alcance, audiencias y estado de cada enlace generado.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadShares}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Actualizar
          </Button>
        </div>

        {shareList.length === 0 ? (
          <div className="text-sm text-muted-foreground">No hay enlaces activos</div>
        ) : (
          <div className="space-y-3">
            {shareList.map((share) => {
              const scopeConfig: ShareScopeConfig = share.scope_config || {
                scope: share.share_type || 'event',
                anchorId: share.folder_id || share.event_id,
                includeDescendants: false,
                filters: {},
              };
              const audiencesCount = share.audiences_count ?? 0;
              return (
                <div key={share.id} className="space-y-3 rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {String(scopeConfig.scope)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Creado el {new Date(share.created_at).toLocaleString()}
                        </span>
                        {share.expires_at && (
                          <span className="text-xs text-muted-foreground">
                            Expira: {new Date(share.expires_at).toLocaleDateString()}
                          </span>
                        )}
                        {!share.is_active && <Badge variant="destructive">Inactivo</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Token {String(share.token || '').slice(0, 8)}… · Audiencias registradas: {audiencesCount}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.open(share.view_url, '_blank')}>
                        Abrir
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(share.view_url)}
                      >
                        Copiar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => window.open(share.store_url, '_blank')}>
                        Tienda
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAudiences(share.id)}
                        disabled={loadingAudienceFor === share.id}
                      >
                        {expandedShareId === share.id ? 'Ocultar audiencias' : 'Ver audiencias'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResend(share)}
                        disabled={resendingShareId === share.id}
                      >
                        {resendingShareId === share.id ? 'Reenviando…' : 'Reenviar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(share)}
                        disabled={!share.is_active}
                      >
                        Revocar
                      </Button>
                    </div>
                  </div>

                  {expandedShareId === share.id && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      {loadingAudienceFor === share.id ? (
                        <div className="text-sm text-muted-foreground">Cargando audiencias...</div>
                      ) : audiencesByShare[share.id] && audiencesByShare[share.id].length > 0 ? (
                        <div className="space-y-2">
                          {audiencesByShare[share.id].map((audience: any) => (
                            <div
                              key={audience.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded border px-2 py-2 text-sm"
                            >
                              <div>
                                <div className="font-medium capitalize">{audience.audience_type}</div>
                                <div className="text-xs text-muted-foreground">
                                  {audience.contact_email || audience.subject_id || '—'}
                                </div>
                              </div>
                              <Badge variant="outline" className="uppercase">
                                {audience.status || 'pendiente'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No hay audiencias registradas para este enlace.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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

      <ShareWizard
        eventId={eventId}
        isOpen={showShareWizard}
        onClose={() => setShowShareWizard(false)}
        onCompleted={() => {
          setShowShareWizard(false);
          loadShares();
        }}
      />
    </div>
  );
}
