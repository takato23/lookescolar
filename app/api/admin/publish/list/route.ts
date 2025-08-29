import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { uuidSchema } from '@/lib/security/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId') || '';

    const supabase = await createServerSupabaseServiceClient();

    // Si eventId es válido, devolver lista simplificada solo de ese evento
    if (eventId && uuidSchema.safeParse(eventId).success) {
      const { data: codes, error: codesError } = await supabase
        .from('codes')
        .select('id, code_value, token, is_published')
        .eq('event_id', eventId);

      if (codesError) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.debug('publish_list', { eventId, error: codesError.message });
        }
        return NextResponse.json([]);
      }

      // Contar fotos por code_id para el evento
      const { data: photoRows } = await supabase
        .from('assets')
        .select('code_id')
        .eq('event_id', eventId)
        .not('code_id', 'is', null);

      const countMap = new Map<string, number>();
      (photoRows as Array<{ code_id: string | null }> | null)?.forEach(
        (row) => {
          if (row.code_id)
            countMap.set(row.code_id, (countMap.get(row.code_id) || 0) + 1);
        }
      );

      const list = (codes || []).map((c: any) => ({
        code_id: c.id as string,
        code_value: String(c.code_value),
        published: !!c.is_published,
        token: (c.token as string) ?? null,
        photos_count: countMap.get(c.id) ?? 0,
      }));

      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('publish_list', { eventId, count: list.length });
      }
      return NextResponse.json(list);
    }

    // Si no hay eventId, devolver todas las carpetas con conteo de fotos
    const { data: allCodes, error: allCodesErr } = await supabase
      .from('codes')
      .select('id, code_value, token, is_published, event_id');

    if (allCodesErr) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('publish_list', { error: allCodesErr.message });
      }
      return NextResponse.json([]);
    }

    // Contar por code_id desde assets (nueva tabla)
    let allPhotoRows: Array<{ code_id: string | null }> | null = null;
    try {
      const { data: rows, error: rowsErr } = await supabase
        .from('assets')
        .select('metadata')
        .not('metadata->code_id', 'is', null);
      if (!rowsErr && rows) {
        allPhotoRows = rows.map(r => ({ 
          code_id: r.metadata?.code_id || null 
        }));
      }
    } catch {
      // mantén allPhotoRows en null para conteo 0
    }

    const countMap = new Map<string, number>();
    (allPhotoRows as Array<{ code_id: string | null }> | null)?.forEach(
      (row) => {
        if (row.code_id)
          countMap.set(row.code_id, (countMap.get(row.code_id) || 0) + 1);
      }
    );

    const list = (allCodes || []).map((c: any) => ({
      code_id: c.id as string,
      code_value: String(c.code_value),
      published: !!c.is_published,
      token: (c.token as string) ?? null,
      photos_count: countMap.get(c.id) ?? 0,
      event_id: c.event_id as string,
    }));

    return NextResponse.json(list);
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('publish_list', {
        error: (error as any)?.message || 'unknown',
      });
    }
    // Nunca 500; compat: devolver { rows: [] }
    return NextResponse.json({ rows: [] });
  }
}
