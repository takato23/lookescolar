import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import crypto from 'crypto';

const schemaByCode = z.object({
  codeId: z.string().uuid('codeId inválido'),
});
const schemaByEvent = z.object({
  eventId: z.string().uuid('eventId inválido'),
});

function generateHexToken(bytes: number = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin') || 'http://localhost:3000';
  try {
    const json = await request.json();

    // Validar payload: o viene codeId o eventId
    let codeId: string | null = null;
    let eventId: string | null = null;
    const codeParse = schemaByCode.safeParse(json);
    if (codeParse.success) {
      codeId = codeParse.data.codeId;
    } else {
      const eventParse = schemaByEvent.safeParse(json);
      if (eventParse.success) {
        eventId = eventParse.data.eventId;
      } else {
        return NextResponse.json(
          { error: 'Se requiere codeId o eventId válido' },
          { status: 400 }
        );
      }
    }

    // Extiende el tipo para incluir tabla codes sin usar any
    type AugmentedDb = typeof import('@/types/database').Database & {
      public: {
        Tables: {
          codes: {
            Row: {
              id: string;
              event_id: string;
              code_value: string;
              token: string | null;
              is_published: boolean;
            };
          };
        };
      };
    };

    const base = await createServerSupabaseServiceClient();
    const supabase =
      base as unknown as import('@supabase/supabase-js').SupabaseClient<AugmentedDb>;

    // Resolver codeId: si vino eventId, buscar o crear un code para el evento
    if (!codeId && eventId) {
      // Buscar cualquier code existente del evento
      const { data: anyCode } = await supabase
        .from('codes' as any)
        .select('id, token, is_published')
        .eq('event_id', eventId)
        .limit(1)
        .maybeSingle();
      if (anyCode?.id) {
        codeId = anyCode.id as string;
      } else {
        // Crear code simple
        const { data: created, error: createErr } = await supabase
          .from('codes' as any)
          .insert({ event_id: eventId, code_value: 'COMPARTIDO' })
          .select('id')
          .single();
        if (createErr || !created) {
          return NextResponse.json(
            { error: 'No se pudo crear el código para publicar' },
            { status: 500 }
          );
        }
        codeId = created.id as string;
      }
    }

    // Buscar el code
    const { data: code, error: codeErr } = await supabase
      .from('codes')
      .select('id, event_id, code_value, token, is_published')
      .eq('id', codeId)
      .single();

    if (codeErr || !code) {
      return NextResponse.json(
        { error: 'Código no encontrado' },
        { status: 404 }
      );
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
        return NextResponse.json(
          { error: 'No se pudo publicar el código' },
          { status: 500 }
        );
      }
    } else if (!code.is_published) {
      const { error: updErr } = await supabase
        .from('codes')
        .update({ is_published: true })
        .eq('id', code.id);
      if (updErr) {
        console.error('[Service] Error activando publicación:', updErr);
        return NextResponse.json(
          { error: 'No se pudo activar publicación' },
          { status: 500 }
        );
      }
    }

    const url = `${origin}/f/${token}/simple-page`;
    return NextResponse.json({ success: true, token, url });
  } catch (error) {
    console.error('[Service] Admin publish error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
