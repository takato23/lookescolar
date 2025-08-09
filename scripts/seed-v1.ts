#!/usr/bin/env tsx

/**
 * Seed mínimo V1 para pruebas integrales estables (sin dependencias externas reales).
 * - Crea 1 evento (EVENT_V1) y 1 curso (Sala Verde)
 * - Inserta 3 codes (SV-001, SV-002, SV-003) con is_published=false
 * - Inserta 8 fotos ordenadas cronológicamente:
 *   • SV-001: 1 ancla (is_anchor=false en seed; será marcada por anchor-detect) + 3 normales
 *   • SV-002: 1 ancla + 2 normales
 *   • Extra: 1 foto antes de toda ancla; la marcamos con code_id erróneo para forzar unassigned>=1 en grouping
 * - (Opcional) approved=true en fotos normales
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

type SeedResult = {
  eventId: string;
  courseId: string;
  codes: { [codeValue: string]: { id: string } };
  photoIds: string[];
};

function envOrDefault(name: string, fallback: string): string {
  const val = process.env[name];
  return (val && val.length > 0) ? val : fallback;
}

export async function seedV1(): Promise<SeedResult> {
  // Cargar envs de .env.test o fallback .env.local sin escribir archivos
  try {
    const testPath = path.resolve(process.cwd(), '.env.test');
    const localPath = path.resolve(process.cwd(), '.env.local');
    const chosen = fs.existsSync(testPath) ? testPath : (fs.existsSync(localPath) ? localPath : null);
    if (chosen) {
      const lines = fs.readFileSync(chosen, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        const val = line.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {}

  const supabaseUrl = envOrDefault('SUPABASE_URL', envOrDefault('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321'));
  const serviceKey = envOrDefault('SUPABASE_SERVICE_ROLE_KEY', 'stub');

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1) Evento
  const eventId = crypto.randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  {
    let inserted = false;
    let lastErr: unknown = null;
    const variants: Array<Record<string, unknown>> = [
      { id: eventId, school: 'EVENT_V1', date: today, active: true },
      { id: eventId, name: 'EVENT_V1', date: today, location: 'Local', status: 'active' },
      { id: eventId, school_name: 'EVENT_V1', date: today, active: true },
      { id: eventId, name: 'EVENT_V1', date: today, status: 'active' },
    ];
    for (const payload of variants) {
      const { error } = await sb.from('events').insert(payload);
      if (!error) { inserted = true; break; } else { lastErr = error; }
    }
    if (!inserted) throw new Error(`Seed error creando evento: ${String((lastErr as any)?.message || lastErr)}`);
  }

  // 2) Curso
  const courseId = crypto.randomUUID();
  {
    const { error } = await sb.from('courses' as unknown as string).insert({
      id: courseId,
      event_id: eventId,
      name: 'Sala Verde',
    } as Record<string, unknown>);
    if (error) {
      console.warn('[Service] Courses no disponible, se continúa sin course_id');
    }
  }

  // 3) Codes
  const codeValues = ['SV-001', 'SV-002', 'SV-003'] as const;
  const codeMap: { [codeValue: string]: { id: string } } = {};
  for (const cv of codeValues) {
    const codeId = crypto.randomUUID();
    const payloadBase: Record<string, unknown> = { id: codeId, event_id: eventId, code_value: cv, is_published: false };
    if (courseId) payloadBase['course_id'] = courseId;
    try {
      const { error } = await sb.from('codes' as unknown as string).insert(payloadBase);
      if (error) {
        // eslint-disable-next-line no-console
        console.warn(`[Service] Codes no disponible o error insertando ${cv}:`, error.message);
      } else {
        codeMap[cv] = { id: codeId };
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(`[Service] Codes no disponible o error insertando ${cv}:`, e?.message || String(e));
    }
  }

  // 4) Fotos
  // Línea temporal base
  const base = new Date();
  base.setHours(10, 0, 0, 0);

  const mkDate = (mins: number) => new Date(base.getTime() + mins * 60_000).toISOString();
  const bucketFolder = `events/${eventId}`;

  // Helper para insertar foto
  async function insertPhoto(opts: {
    filename: string;
    createdAt: string;
    codeId?: string | null;
    isAnchor?: boolean;
    anchorRaw?: string | null;
    approved?: boolean;
  }): Promise<string> {
    const id = crypto.randomUUID();
    const common = {
      id,
      event_id: eventId,
      storage_path: `${bucketFolder}/${opts.filename}`,
      file_size: 150_000,
      width: 1200,
      height: 800,
      approved: opts.approved ?? true,
      created_at: opts.createdAt,
    } as Record<string, unknown>;

    const variants: Array<Record<string, unknown>> = [
      { ...common, original_filename: opts.filename },
      { ...common, filename: opts.filename },
    ];

    let inserted = false; let lastErr: unknown = null;
    for (const basePayload of variants) {
      const payload = { ...basePayload } as Record<string, unknown>;
      // Solo setear columnas QR si existen
      if (typeof opts.isAnchor === 'boolean') payload['is_anchor'] = opts.isAnchor;
      if (typeof opts.anchorRaw !== 'undefined') payload['anchor_raw'] = opts.anchorRaw;
      if (typeof opts.codeId !== 'undefined') payload['code_id'] = opts.codeId;
      // Intento 1: con columnas QR
      let { error } = await sb.from('photos').insert(payload);
      if (error && (String(error.message).includes('anchor_raw') || String(error.message).includes('is_anchor') || String(error.message).includes('code_id'))) {
        const fallback = { ...payload } as Record<string, unknown>;
        delete fallback['anchor_raw'];
        delete fallback['is_anchor'];
        delete fallback['code_id'];
        ({ error } = await sb.from('photos').insert(fallback));
      }
      if (!error) { inserted = true; break; } else { lastErr = error; }
    }
    if (!inserted) throw new Error(`Seed error insertando foto ${opts.filename}: ${String((lastErr as any)?.message || lastErr)}`);
    return id;
  }

  const photoIds: string[] = [];

  // Extra: 1 foto antes de toda ancla (para forzar unassigned>=1, le ponemos un code_id incorrecto)
  photoIds.push(
    await insertPhoto({
      filename: '000_unassigned_preanchor.jpg',
      createdAt: mkDate(0),
      codeId: codeMap['SV-003']?.id ?? null, // si no hay codes, null
      isAnchor: false,
      anchorRaw: null,
      approved: true,
    })
  );

  // SV-001: ancla (inicialmente no ancla, anchor-detect la marcará) + 3 normales
  photoIds.push(
    await insertPhoto({ filename: 'SV-001_ANCLA.jpg', createdAt: mkDate(1), isAnchor: false, anchorRaw: null, codeId: null, approved: true })
  );
  photoIds.push(
    await insertPhoto({ filename: 'SV-001_1.jpg', createdAt: mkDate(2), codeId: null, isAnchor: false, anchorRaw: null, approved: true })
  );
  photoIds.push(
    await insertPhoto({ filename: 'SV-001_2.jpg', createdAt: mkDate(3), codeId: null, isAnchor: false, anchorRaw: null, approved: true })
  );
  photoIds.push(
    await insertPhoto({ filename: 'SV-001_3.jpg', createdAt: mkDate(4), codeId: null, isAnchor: false, anchorRaw: null, approved: true })
  );

  // SV-002: ancla + 2 normales
  photoIds.push(
    await insertPhoto({ filename: 'SV-002_ANCLA.jpg', createdAt: mkDate(5), isAnchor: false, anchorRaw: null, codeId: null, approved: true })
  );
  photoIds.push(
    await insertPhoto({ filename: 'SV-002_1.jpg', createdAt: mkDate(6), codeId: null, isAnchor: false, anchorRaw: null, approved: true })
  );
  photoIds.push(
    await insertPhoto({ filename: 'SV-002_2.jpg', createdAt: mkDate(7), codeId: null, isAnchor: false, anchorRaw: null, approved: true })
  );

  return {
    eventId,
    courseId,
    codes: codeMap,
    photoIds,
  };
}

// CLI
if (require.main === module) {
  seedV1()
    .then((res) => {
      // Logs de servicio (concisos)
      console.log('[Service] Seed V1 completado', {
        eventId: res.eventId,
        courseId: res.courseId,
        codes: Object.fromEntries(Object.entries(res.codes).map(([k, v]) => [k, v.id])),
        photos: res.photoIds.length,
      });
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Service] Error en seed V1:', err);
      process.exit(1);
    });
}


