import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

interface BulkItem {
  name: string;
  event_id: string;
  grade_section?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let body: { items?: BulkItem[] } = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Solicitud inválida (JSON)' },
        { status: 400 }
      );
    }

    const items = (body.items ?? []).filter(
      (i): i is BulkItem =>
        !!i && typeof i.name === 'string' && typeof i.event_id === 'string'
    );

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No hay elementos válidos para procesar' },
        { status: 400 }
      );
    }

    const service = await createServerSupabaseServiceClient();

    const created: Array<{
      id: string;
      name: string;
      token: string;
      token_expires_at: string;
    }> = [];
    const errors: Array<{ name?: string; reason: string }> = [];

    for (const item of items) {
      try {
        const insert = await service
          .from('subjects')
          .insert({ event_id: item.event_id, name: item.name.trim() })
          .select()
          .single();

        if (insert.error || !insert.data) {
          errors.push({
            name: item.name,
            reason: insert.error?.message || 'Error creando sujeto',
          });
          continue;
        }

        const token = randomBytes(24).toString('base64url');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const tokenRes = await service.from('subject_tokens').insert({
          subject_id: insert.data.id,
          token,
          expires_at: expiresAt.toISOString(),
        });

        if (tokenRes.error) {
          errors.push({ name: item.name, reason: tokenRes.error.message });
          continue;
        }

        created.push({
          id: insert.data.id,
          name: insert.data.name,
          token,
          token_expires_at: expiresAt.toISOString(),
        });
      } catch (e: any) {
        console.error('[Service] Error en bulk subject', e);
        errors.push({
          name: item.name,
          reason: e?.message || 'Error desconocido',
        });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      errors,
      stats: { total: items.length, ok: created.length, failed: errors.length },
    });
  } catch (error) {
    console.error('[Service] Error en subjects bulk API', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
