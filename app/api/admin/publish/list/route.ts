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
        .from('codes' as any)
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
        .from('photos')
        .select('code_id')
        .eq('event_id', eventId)
        .not('code_id', 'is', null);

      const countMap = new Map<string, number>();
      (photoRows as Array<{ code_id: string | null }> | null)?.forEach((row) => {
        if (row.code_id) countMap.set(row.code_id, (countMap.get(row.code_id) || 0) + 1);
      });

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

    // Compatibilidad: si no hay eventId, devolver el formato existente { rows }
    const { data: codes, error } = await supabase
      .from('codes' as any)
      .select('id, event_id, course_id, code_value, token, is_published');

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.debug('publish_list', { error: error.message });
      }
      return NextResponse.json({ rows: [] });
    }

    const { data: counts } = await supabase
      .from('photos')
      .select('code_id, count:id', { count: 'exact', head: false })
      .not('code_id', 'is', null)
      .group('code_id');

    const countMap = new Map<string, number>();
    (counts as any[] | null)?.forEach((row) => {
      if (row.code_id) countMap.set(row.code_id as string, Number(row.count) || 0);
    });

    const rows = (codes || []).map((c: any) => ({
      id: c.id as string,
      event_id: c.event_id as string,
      course_id: (c.course_id as string) ?? null,
      code_value: String(c.code_value),
      token: (c.token as string) ?? null,
      is_published: !!c.is_published,
      photos_count: countMap.get(c.id) ?? 0,
    }));

    return NextResponse.json({ rows });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug('publish_list', { error: (error as any)?.message || 'unknown' });
    }
    // Nunca 500; compat: devolver { rows: [] }
    return NextResponse.json({ rows: [] });
  }
}


