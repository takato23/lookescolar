// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import type { RouteContext } from '@/types/next-route';
import { z } from 'zod';

const ParamsSchema = z.object({ id: z.string().uuid() });

async function handleDELETE(
  _req: NextRequest,
  context: RouteContext<{ id: string }>
) {
  const params = await context.params;
  const parse = ParamsSchema.safeParse(params);
  if (!parse.success) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }
  const codeId = parse.data.id;

  const supabase = await createServerSupabaseServiceClient();

  // Verificar existencia del código y obtener su event_id
  const { data: codeRow, error: codeErr } = await supabase
    .from('codes' as any)
    .select('id, event_id')
    .eq('id', codeId)
    .single();
  if (codeErr || !codeRow) {
    return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
  }

  // Intentar borrar directamente el código. Si existe FK con ON DELETE SET NULL, esto basta.
  let { error: delErr } = await supabase
    .from('codes' as any)
    .delete()
    .eq('id', codeId);

  if (delErr) {
    // Fallback: desasignar fotos manualmente (para esquemas sin FK o sin columna code_id) y reintentar
    const { error: updErr } = await supabase
      .from('photos')
      .update({ code_id: null as any })
      .eq('code_id', codeId);

    // Ignorar error de actualización si la columna no existe o la tabla no tiene esa relación
    // y reintentar borrar de todos modos
    ({ error: delErr } = await supabase
      .from('codes' as any)
      .delete()
      .eq('id', codeId));

    if (delErr) {
      return NextResponse.json({ error: 'No se pudo eliminar la carpeta' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, deleted: codeId, eventId: (codeRow as any).event_id });
}

// Allow unauthenticated in development to simplify local testing
export const DELETE = handleDELETE;
