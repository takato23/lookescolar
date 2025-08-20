"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

type GroupSummary = {
  assigned: number;
  untouched: number;
  unassigned: number;
  segments: Array<{ code_id: string; code_value: string; count: number }>;
  anchors_unmatched: Array<{ photo_id: string; anchor_raw: string }>;
};

export default function GroupingPage() {
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GroupSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState(true);

  const [_codes, _setCodes] = useState<Array<{ id: string; code_value: string; is_published: boolean; has_anchor: boolean; count: number }>>([]);
  const [sourceCodeValue, setSourceCodeValue] = useState('');
  const [destCodeId, setDestCodeId] = useState('');
  const [_photosSample, _setPhotosSample] = useState<Array<{ id: string; original_filename: string }>>([]);
  const [showUnassigned, setShowUnassigned] = useState(false);

  useEffect(() => {
    const loadCodes = async () => {
      if (!eventId) return;
      // Simplificado: si existe un endpoint para codes, se usaría; por ahora omitido (MVP)
      // const res = await fetch(`/api/admin/events?include_stats=false`);
    };
    loadCodes();
  }, [eventId]);

  const runDetection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, dryRun })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Error ejecutando detector');
      } else {
        setResult(json);
      }
    } catch (e) {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Agrupar (por QR)</h1>
        <p className="text-muted-foreground">Agrupa de ancla a ancla. Ajustes manuales por arrastre</p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="event" className="text-sm text-muted-foreground">ID de evento</label>
            <Input id="event" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="UUID del evento" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            Dry run
          </label>
          <Button onClick={runDetection} disabled={!eventId || loading} aria-label="Detectar anclas (QR)">
            {loading ? 'Agrupando…' : 'Agrupar ahora'}
          </Button>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Si hay anchors sin code, verificar que el código exista en Códigos o crearlo.
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border bg-card p-6">
          <h2 className="mb-2 text-xl font-semibold">Resumen</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-md bg-muted p-3">
              <div className="text-2xl font-bold">{result.assigned ?? 0}</div>
              <div className="text-xs text-muted-foreground">Asignadas</div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-2xl font-bold">{result.untouched ?? 0}</div>
              <div className="text-xs text-muted-foreground">Sin cambios</div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-2xl font-bold">{result.unassigned ?? 0}</div>
              <div className="text-xs text-muted-foreground">No asignadas</div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <div className="text-2xl font-bold">{result.anchors_unmatched?.length ?? 0}</div>
              <div className="text-xs text-muted-foreground">Anclas sin code</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-medium">Unassigned</div>
            <button
              className="text-sm underline"
              aria-label="Ver fotos sin asignar"
              onClick={() => setShowUnassigned(true)}
            >
              Ver lista
            </button>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 font-semibold">Segmentos por código</h3>
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Fotos</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.segments ?? []).map((s) => (
                    <tr key={s.code_id} className="border-t">
                      <td className="px-3 py-2">{s.code_value}</td>
                      <td className="px-3 py-2">{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showUnassigned && (
        <div className="mt-6 rounded-lg border bg-card p-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">Sin asignar</h3>
            <button
              className="text-sm underline"
              aria-label="Cerrar listado de sin asignar"
              onClick={() => setShowUnassigned(false)}
            >
              Cerrar
            </button>
          </div>
          <p className="text-sm text-muted-foreground">Usa los filtros de fotos para ver únicamente las no asignadas.</p>
        </div>
      )}

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="mb-2 text-xl font-semibold">Corrección manual</h2>
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm text-muted-foreground">Código origen</label>
            <Input value={sourceCodeValue} onChange={(e) => setSourceCodeValue(e.target.value)} placeholder="SV-027" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Destino codeId</label>
            <Input value={destCodeId} onChange={(e) => setDestCodeId(e.target.value)} placeholder="uuid code destino" />
          </div>
          <div className="flex items-end">
            <Button disabled={!sourceCodeValue || !destCodeId} aria-label="Mover selección">Mover selección</Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">MVP: la selección y vista de thumbnails se agregará en la próxima tarea.</div>
      </div>
    </div>
  );
}


