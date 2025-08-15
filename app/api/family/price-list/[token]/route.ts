import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Resolver token a evento
    const { data: tokenRow } = await supabase
      .from('subject_tokens')
      .select('subject_id, subjects:subject_id ( event_id )')
      .eq('token', token)
      .single();

    const eventId = (tokenRow?.subjects as any)?.event_id as string | undefined;
    if (!eventId) {
      return NextResponse.json(
        { error: 'Evento no encontrado para el token' },
        { status: 404 }
      );
    }

    // Obtener lista de precios del evento
    const { data: priceList } = await supabase
      .from('price_lists')
      .select(
        `id, price_list_items ( id, label, type, price_cents )`
      )
      .eq('event_id', eventId)
      .single();

    const items = priceList?.price_list_items || [];

    return NextResponse.json({
      success: true,
      eventId,
      items: items.map((it: any) => ({
        id: it.id,
        label: it.label,
        type: it.type || 'base',
        price_cents: it.price_cents,
      })),
    });
  } catch (error) {
    console.error('[Service] price-list error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


