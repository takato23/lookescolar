import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface PhotoRow {
  id: string;
  code_id: string | null;
  is_anchor: boolean | null;
  anchor_raw: string | null;
  exif_taken_at: string | null;
  created_at: string;
  original_filename: string | null;
}

interface CodeRow {
  id: string;
  code_value: string;
}

interface GroupingSummary {
  assigned: number;
  untouched: number;
  unassigned: number;
  segments: Array<{ code_id: string; code_value: string; count: number }>;
  anchors_unmatched: Array<{ photo_id: string; anchor_raw: string }>;
}

export async function groupBetweenAnchors(
  eventId: string,
  opts: { dryRun?: boolean } = {}
): Promise<GroupingSummary> {
  const { dryRun = false } = opts;
  const supabase = await createServerSupabaseServiceClient();

  const { data: photosRaw, error: photosError } = await supabase
    .from('photos')
    .select(
      'id, code_id, is_anchor, anchor_raw, exif_taken_at, created_at, original_filename'
    )
    .eq('event_id', eventId);
  if (photosError) throw photosError;

  const photos: PhotoRow[] = (photosRaw as PhotoRow[]) ?? [];

  // Cargar códigos del evento
  const { data: codesRaw } = await supabase
    .from('codes')
    .select('id, code_value')
    .eq('event_id', eventId);
  const codes: CodeRow[] = (codesRaw as CodeRow[]) ?? [];
  const codeIdToValue = new Map<string, string>();
  const codeValueById = new Map<string, string>();
  codes.forEach((c) => {
    codeIdToValue.set(c.id, c.code_value);
    codeValueById.set(c.id, c.code_value);
  });

  // Orden estable por fecha y nombre de archivo
  photos.sort((a, b) => {
    const da = a.exif_taken_at
      ? new Date(a.exif_taken_at).getTime()
      : new Date(a.created_at).getTime();
    const db = b.exif_taken_at
      ? new Date(b.exif_taken_at).getTime()
      : new Date(b.created_at).getTime();
    if (da !== db) return da - db;
    const na = a.original_filename ?? '';
    const nb = b.original_filename ?? '';
    return na.localeCompare(nb);
  });

  let currentCodeId: string | null = null;
  const anchorsUnmatched: Array<{ photo_id: string; anchor_raw: string }> = [];

  // Simular asignaciones
  const updates: Array<{ id: string; code_id: string | null }> = [];
  let assigned = 0;
  let untouched = 0;
  let unassigned = 0;

  for (const p of photos) {
    const isAnchor = !!p.is_anchor;
    if (isAnchor) {
      if (p.code_id) {
        currentCodeId = p.code_id;
      } else {
        currentCodeId = null;
        if (p.anchor_raw) {
          anchorsUnmatched.push({ photo_id: p.id, anchor_raw: p.anchor_raw });
        }
      }
      // No reasignamos anchors; cuentan en su propio code_id si lo tienen
      if (p.code_id) {
        untouched++;
      } else {
        unassigned++;
      }
      continue;
    }

    // Foto no ancla
    const desired = currentCodeId;
    if (desired) {
      if (p.code_id === desired) {
        untouched++;
      } else {
        assigned++;
        updates.push({ id: p.id, code_id: desired });
      }
    } else {
      // No hay código activo (antes de la primera ancla o entre anclas unmatched)
      if (p.code_id === null) {
        untouched++;
      } else {
        // Si tenía algo y ahora quedaría sin código, solo contar como unassigned, pero no tocamos para evitar pérdida involuntaria
        unassigned++;
      }
    }
  }

  if (!dryRun && updates.length > 0) {
    // Actualizar en lotes de 500
    const chunkSize = 500;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      // Supabase no soporta update por lote heterogéneo directo; ejecutamos por id
      // Para eficiencia, usar un IN y construir CASE WHEN sería ideal; MVP: iterativo secuencial
      // Intentar paralelismo controlado por lotes pequeños
      await Promise.all(
        chunk.map(async (u) => {
          await supabase
            .from('photos')
            .update({ code_id: u.code_id })
            .eq('id', u.id);
        })
      );
    }
  }

  // Construir segmentos finales a partir de estado final esperado
  const codeCounts = new Map<string, number>();
  for (const p of photos) {
    let effectiveCodeId: string | null = p.code_id;
    // Aplicar virtualmente las updates si dryRun
    if (dryRun) {
      const upd = updates.find((u) => u.id === p.id);
      if (upd) effectiveCodeId = upd.code_id;
    }
    if (effectiveCodeId) {
      codeCounts.set(
        effectiveCodeId,
        (codeCounts.get(effectiveCodeId) ?? 0) + 1
      );
    }
  }

  const segments = Array.from(codeCounts.entries()).map(([code_id, count]) => ({
    code_id,
    code_value: codeIdToValue.get(code_id) ?? '—',
    count,
  }));

  const summary: GroupingSummary = {
    assigned,
    untouched,
    unassigned,
    segments,
    anchors_unmatched: anchorsUnmatched,
  };

  return summary;
}
