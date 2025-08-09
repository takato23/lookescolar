import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerSupabaseServiceClient();

    // Cargar codes y conteo de fotos por code_id
    const { data: codes, error } = await supabase
      .from('codes' as any)
      .select('id, event_id, course_id, code_value, token, is_published');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Conteo por code_id
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
    console.error('[Service] Publish list error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


