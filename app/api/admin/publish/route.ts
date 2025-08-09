import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { absoluteUrl } from '@/lib/absoluteUrl';
import crypto from 'crypto';

const schema = z.object({
  codeId: z.string().uuid('codeId inválido'),
});

function generateHexToken(bytes: number = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { codeId } = schema.parse(json);

    // Extiende el tipo para incluir tabla codes sin usar any
    type AugmentedDb = typeof import('@/types/database').Database & {
      public: { Tables: { codes: { Row: { id: string; event_id: string; code_value: string; token: string | null; is_published: boolean } } } };
    };

    const base = await createServerSupabaseServiceClient();
    const supabase = (base as unknown) as import('@supabase/supabase-js').SupabaseClient<AugmentedDb>;

    // Buscar el code
    const { data: code, error: codeErr } = await supabase
      .from('codes')
      .select('id, event_id, code_value, token, is_published')
      .eq('id', codeId)
      .single();

    if (codeErr || !code) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
    }

    let token: string = code.token as string | undefined;

    if (!token) {
      // Generar token 32 hex
      token = generateHexToken(16);

      const { error: updErr } = await supabase
        .from('codes')
        .update({ token, is_published: true })
        .eq('id', code.id);

      if (updErr) {
        console.error('[Service] Error publicando código:', updErr);
        return NextResponse.json({ error: 'No se pudo publicar el código' }, { status: 500 });
      }
    } else if (!code.is_published) {
      const { error: updErr } = await supabase
        .from('codes')
        .update({ is_published: true })
        .eq('id', code.id);
      if (updErr) {
        console.error('[Service] Error activando publicación:', updErr);
        return NextResponse.json({ error: 'No se pudo activar publicación' }, { status: 500 });
      }
    }

    const url = absoluteUrl(`/f/${token}`);
    return NextResponse.json({ token, url });
  } catch (error) {
    console.error('[Service] Admin publish error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


