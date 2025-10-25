import type { RouteContext } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest, context: RouteContext<{ token: string }>) {
  const params = await context.params;
  try {
    const { token } = params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Resolver token a evento (compatible con múltiples sistemas)
    let eventId: string | undefined;

    // Intentar con sistema de códigos primero
    const { data: codeData } = await supabase
      .from('codes')
      .select('event_id')
      .eq('token', token)
      .single();

    if (codeData) {
      eventId = codeData.event_id;
    } else {
      // Intentar con sistema de tokens de estudiantes (nuevo)
      const { data: studentTokenRow } = await supabase
        .from('student_tokens')
        .select('student_id, students:student_id ( event_id )')
        .eq('token', token)
        .single();

      if (studentTokenRow) {
        eventId = (studentTokenRow?.students as any)?.event_id;
      } else {
        // Fallback al sistema legacy (subjects/subject_tokens)
        const { data: tokenRow } = await supabase
          .from('subject_tokens')
          .select('subject_id, subjects:subject_id ( event_id )')
          .eq('token', token)
          .single();

        eventId = (tokenRow?.subjects as any)?.event_id;
      }
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Evento no encontrado para el token' },
        { status: 404 }
      );
    }

    // Obtener o crear lista de precios del evento
    let priceList: any = null;
    const { data: existingPriceList } = await supabase
      .from('price_lists')
      .select(`id, price_list_items ( id, name, type, price_cents )`)
      .eq('event_id', eventId)
      .single();

    if (existingPriceList?.price_list_items?.length) {
      priceList = existingPriceList;
    } else {
      // Crear lista de precios básica si no existe
      const { data: newPriceList, error: priceListError } = await supabase
        .from('price_lists')
        .insert({
          event_id: eventId,
          name: 'Lista de Precios Básica',
          active: true,
        })
        .select('id')
        .single();

      if (!priceListError && newPriceList) {
        // Crear items de precios por defecto
        const { data: priceItems } = await supabase
          .from('price_list_items')
          .insert([
            {
              price_list_id: newPriceList.id,
              name: 'Foto Individual',
              type: 'base',
              price_cents: 1000,
            },
          ])
          .select('id, name, type, price_cents');

        priceList = {
          id: newPriceList.id,
          price_list_items: priceItems || [],
        };
      }
    }

    const items = priceList?.price_list_items || [];

    return NextResponse.json({
      success: true,
      eventId,
      items: items.map((it: any) => ({
        id: it.id,
        label: it.name,
        type: it.type || 'base',
        price_cents: it.price_cents,
      })),
    });
  } catch (error) {
    console.error('[Service] price-list error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
