'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/feedback';
import {
  Calendar,
  Upload,
  ScanLine,
  Link as LinkIcon,
  QrCode,
  ExternalLink,
  Copy,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

type EventRow = { id: string; name?: string | null; school?: string | null };
type CourseRow = { id: string; name: string };
type CodeRow = {
  id: string;
  code_value: string;
  token: string | null;
  is_published: boolean;
  photos_count?: number;
};

export default function QuickFlowPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    codesTotal: number;
    codesPublished: number;
    photosTotal: number;
    photosWithWatermark: number;
    anchors: number;
    unmatched: number;
    assigned: number;
    unassigned: number;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Eventos
        const ev = await fetch('/api/admin/events');
        if (ev.ok) {
          const data = await ev.json();
          const list: EventRow[] = data.events || data.data || [];
          setEvents(list);
          const first = list[0];
          if (first?.id) setSelectedEventId(first.id);
        }
        // Cursos (si existe endpoint)
        try {
          const cr = await fetch('/api/admin/courses');
          if (cr.ok) {
            const j = await cr.json();
            setCourses(j.courses || j.data || []);
          }
        } catch {}
      } catch (error) {
        console.error('[Service] Cargar quick-flow', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadCodes = async () => {
    try {
      const res = await fetch('/api/admin/publish/list');
      if (!res.ok) return;
      const j = await res.json();
      setCodes(j.rows || []);
    } catch {}
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const loadEventStats = async () => {
    const currentEventId = selectedEventId;
    if (!currentEventId) {
      setStats(null);
      return;
    }
    try {
      // Paso 1: codes (total y publicados)
      const listRes = await fetch('/api/admin/publish/list');
      let codesTotal = 0,
        codesPublished = 0;
      if (listRes.ok) {
        const lj = await listRes.json();
        const rows = (lj.rows || []) as CodeRow[];
        codesTotal = rows.length;
        codesPublished = rows.filter((r) => r.is_published).length;
      }

      // Paso 2 y 3: fotos, watermark, anchors y asignaciones
      // Usamos endpoints existentes con filtros por eventId cuando existan
      // Fallback: consultar endpoints generales y filtrar en client si es necesario
      let photosTotal = 0,
        photosWithWatermark = 0,
        anchors = 0,
        unmatched = 0,
        assigned = 0,
        unassigned = 0;

      try {
        const resPhotos = await fetch(
          `/api/admin/photos?eventId=${encodeURIComponent(currentEventId)}`
        );
        if (resPhotos.ok) {
          const pj = await resPhotos.json();
          const rows: any[] = pj.photos || pj.rows || [];
          photosTotal = rows.length;
          photosWithWatermark = rows.filter((p) => !!p.watermark_path).length;
          anchors = rows.filter((p) => !!p.is_anchor).length;
          // Estimar asignaciones: code_id no nulo
          assigned = rows.filter((p) => p.code_id).length;
          unassigned = photosTotal - assigned;
        }
      } catch {}

      // Si existe endpoint de resumen de grouping, usarlo (opcional)
      try {
        const resGroup = await fetch(
          `/api/admin/group/summary?eventId=${encodeURIComponent(currentEventId)}`
        );
        if (resGroup.ok) {
          const gj = await resGroup.json();
          if (typeof gj.assigned === 'number') assigned = gj.assigned;
          if (typeof gj.unassigned === 'number') unassigned = gj.unassigned;
          if (typeof gj.anchors === 'number') anchors = gj.anchors;
          if (typeof gj.unmatched === 'number') unmatched = gj.unmatched;
        }
      } catch {}

      setStats({
        codesTotal,
        codesPublished,
        photosTotal,
        photosWithWatermark,
        anchors,
        unmatched,
        assigned,
        unassigned,
      });
    } catch {
      setStats(null);
    }
  };

  useEffect(() => {
    loadEventStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  const eventForPdfHref = useMemo(() => {
    return selectedEventId && selectedEventId.length > 0
      ? `/api/admin/events/${selectedEventId}/qr-pdf`
      : '#';
  }, [selectedEventId]);

  const onWatermark = async () => {
    if (!selectedEventId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/photos/watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Error generando watermarks');
      addToast({
        type: 'success',
        title: 'Watermark iniciado',
        description: 'Se está procesando en segundo plano.',
      });
      await loadEventStats();
    } catch (error) {
      console.error('[Service] Watermark', error);
      addToast({
        type: 'error',
        title: 'No se pudo iniciar watermark',
        description: 'Intenta nuevamente.',
      });
    } finally {
      setBusy(false);
    }
  };

  const onAnchorDetect = async () => {
    if (!selectedEventId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/anchor-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error en detección');
      addToast({
        type: 'success',
        title: 'Anclas detectadas',
        description: `Detectadas: ${j.detected} • Sin ancla: ${j.unmatched ?? 0}`,
      });
      await loadEventStats();
    } catch (error) {
      console.error('[Service] Anchor detect', error);
      addToast({ type: 'error', title: 'Error al detectar anclas' });
    } finally {
      setBusy(false);
    }
  };

  const onGroup = async () => {
    if (!selectedEventId) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: selectedEventId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error al agrupar');
      addToast({
        type: 'success',
        title: 'Agrupación completa',
        description: `Asignadas: ${j.assigned} • No asignadas: ${j.unassigned}`,
      });
      await Promise.all([loadCodes(), loadEventStats()]);
    } catch (error) {
      console.error('[Service] Group', error);
      addToast({ type: 'error', title: 'Error al agrupar' });
    } finally {
      setBusy(false);
    }
  };

  const publish = async (codeId: string) => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error publicando');
      const url = j.url as string | undefined;
      await Promise.all([loadCodes(), loadEventStats()]);
      if (url) {
        try {
          await navigator.clipboard.writeText(url);
        } catch {}
        addToast({
          type: 'success',
          title: 'Publicado',
          description: 'Link copiado al portapapeles.',
        });
      } else {
        addToast({ type: 'success', title: 'Publicado' });
      }
    } catch (error) {
      console.error('[Service] Publish', error);
      addToast({ type: 'error', title: 'No se pudo publicar' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    addToast({
      type: 'info',
      title: 'Copiado',
      description: 'Enlace copiado.',
    });
  };

  // const selectedCodes = useMemo(() => codes.filter(c => c.token || !c.is_published), [codes])

  // Helpers de estado por paso
  const step1Status = useMemo(() => {
    // Listo si hay al menos un code
    if (!stats) return 'Pendiente';
    if (stats.codesTotal > 0) return 'Listo';
    return 'Pendiente';
  }, [stats]);

  const step2Status = useMemo(() => {
    // Listo si al menos una foto con watermark
    if (!stats) return 'Pendiente';
    if (stats.photosWithWatermark >= 1) return 'Listo';
    if (stats.photosTotal > 0) return 'Parcial';
    return 'Pendiente';
  }, [stats]);

  const step3Status = useMemo(() => {
    // Listo si assigned>0 y unassigned=0
    if (!stats) return 'Pendiente';
    if (stats.assigned > 0 && stats.unassigned === 0) return 'Listo';
    if (stats.assigned > 0) return 'Parcial';
    if (stats.anchors > 0) return 'Parcial';
    return 'Pendiente';
  }, [stats]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Flujo rápido</h1>
          <p className="text-muted-foreground">
            Completa el proceso en 4 pasos
          </p>
        </div>
      </div>

      {/* Selector de evento/curso */}
      <Card className="p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Evento</label>
            <select
              aria-label="Seleccionar evento"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              disabled={loading}
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name || ev.school || ev.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Curso (opcional)</label>
            <select
              aria-label="Seleccionar curso"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={loading || courses.length === 0}
            >
              <option value="">Todos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Paso A */}
      <Card className="p-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> a) Generar tarjetas (PDF)
            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${step1Status === 'Listo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}
            >
              {step1Status === 'Listo' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : null}
              {step1Status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <a
              aria-label="Abrir PDF de tarjetas"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2"
              href={eventForPdfHref}
              target="_blank"
              rel="noreferrer"
            >
              <QrCode className="h-4 w-4" /> Abrir QR PDF
            </a>
            <span className="text-muted-foreground text-xs">
              Se abrirá en una pestaña nueva
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Paso B */}
      <Card className="p-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> b) Subir fotos (+ watermark)
            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${step2Status === 'Listo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}
            >
              {step2Status === 'Listo' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : null}
              {step2Status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              aria-label="Ir a subir fotos"
              onClick={() =>
                router.push(`/admin/events/${selectedEventId}/unified`)
              }
            >
              Ir a subir
            </Button>
            <Button
              aria-label="Generar watermarks"
              variant="outline"
              onClick={onWatermark}
              disabled={
                !selectedEventId ||
                busy ||
                (stats ? stats.photosTotal === 0 : true)
              }
              aria-disabled={
                !selectedEventId ||
                busy ||
                (stats ? stats.photosTotal === 0 : true)
              }
              title={
                stats && stats.photosTotal === 0
                  ? 'No hay fotos aún'
                  : undefined
              }
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Iniciar watermark
            </Button>
            <span className="text-muted-foreground text-xs">
              Sugerencia: watermark disponible
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Paso C */}
      <Card className="p-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> c) Agrupar por QR
            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${step3Status === 'Listo' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}
            >
              {step3Status === 'Listo' ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : null}
              {step3Status}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              aria-label="Detectar anclas"
              onClick={onAnchorDetect}
              disabled={!selectedEventId || busy}
              title={!selectedEventId ? 'Selecciona un evento' : undefined}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Detectar anclas
            </Button>
            <Button
              aria-label="Agrupar entre anclas"
              variant="outline"
              onClick={onGroup}
              disabled={
                !selectedEventId || busy || (stats ? stats.anchors === 0 : true)
              }
              aria-disabled={
                !selectedEventId || busy || (stats ? stats.anchors === 0 : true)
              }
              title={
                stats && stats.anchors === 0
                  ? 'Primero detecta anclas'
                  : undefined
              }
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Agrupar
            </Button>
            <Link
              href={`/admin/grouping?eventId=${selectedEventId}`}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              aria-label="Revisar no asignadas"
            >
              Revisar no asignadas
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Paso D */}
      <Card className="p-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" /> d) Publicar y compartir
            {/* Badge simple de estado: si hay al menos un code publicado y con fotos asignadas */}
            <span
              className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${codes.some((c) => c.is_published) ? 'bg-emerald-100 text-emerald-700' : codes.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'}`}
            >
              {codes.some((c) => c.is_published)
                ? 'Listo'
                : codes.length > 0
                  ? 'Parcial'
                  : 'Pendiente'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-muted-foreground text-sm">
              Códigos del evento (si aplica):
            </div>
            <div className="divide-y rounded-md border">
              {codes.length === 0 ? (
                <div className="text-muted-foreground p-3 text-sm">
                  Sin códigos cargados todavía.
                </div>
              ) : (
                codes.map((c) => {
                  const url = c.token
                    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/f/${c.token}/simple-page`
                    : '';
                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm"
                    >
                      <div className="col-span-3 font-medium">
                        {c.code_value}
                      </div>
                      <div className="col-span-2">{c.photos_count ?? '-'}</div>
                      <div className="col-span-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${c.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'}`}
                        >
                          {c.is_published ? 'Publicado' : 'No publicado'}
                        </span>
                      </div>
                      <div className="col-span-5 flex flex-wrap items-center gap-2">
                        {!c.is_published && (
                          <Button
                            aria-label={`Publicar ${c.code_value}`}
                            size="sm"
                            onClick={() => publish(c.id)}
                            disabled={
                              !c.photos_count || c.photos_count === 0 || busy
                            }
                            aria-disabled={
                              !c.photos_count || c.photos_count === 0 || busy
                            }
                            title={
                              !c.photos_count || c.photos_count === 0
                                ? 'No hay fotos asignadas'
                                : undefined
                            }
                          >
                            {busy ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Publicar / Copiar link
                          </Button>
                        )}
                        {c.is_published && c.token && (
                          <>
                            <Button
                              aria-label={`Copiar link ${c.code_value}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => copy(url)}
                            >
                              <Copy className="mr-1 h-4 w-4" /> Copiar
                            </Button>
                            <a
                              className="inline-flex items-center rounded-md border px-2 py-1 text-sm"
                              href={`/api/qr?token=${encodeURIComponent(c.token)}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Ver QR ${c.code_value}`}
                            >
                              <QrCode className="mr-1 h-4 w-4" /> QR del link
                            </a>
                            <a
                              className="inline-flex items-center rounded-md border px-2 py-1 text-sm"
                              href={`/f/${c.token}/simple-page`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Abrir link ${c.code_value}`}
                            >
                              <ExternalLink className="mr-1 h-4 w-4" /> Abrir
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
