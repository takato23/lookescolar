import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

const schema = z.object({ codeId: z.string().uuid('codeId inválido') });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codeId } = schema.parse(body);
    const supabase = await createServerSupabaseServiceClient();

    const { error } = await supabase
      .from('codes' as any)
      .update({ is_published: false, token: null })
      .eq('id', codeId);

    if (error) {
      return NextResponse.json({ error: 'No se pudo despublicar' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Service] Unpublish error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


