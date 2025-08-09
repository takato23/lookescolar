import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const schema = z.object({
  token: z.string().min(20, 'Token inválido'),
  selectedPhotoIds: z.array(z.string().uuid('ID de foto inválido')).min(1),
  package: z.string().min(1),
  contact: z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      phone: z.string().min(6).optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit suave por IP
    try {
      const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
      const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, '1 m') });
      const { success } = await ratelimit.limit(`public-selection:${ip}`);
      if (!success) {
        return NextResponse.json({ error: 'Demasiadas solicitudes, intenta más tarde' }, { status: 429 });
      }
    } catch (e) {
      // No bloquear si no hay Redis
    }

    const body = await request.json();
    const { token, selectedPhotoIds, package: pkg, contact } = schema.parse(body);

    const supabase = await createServerSupabaseServiceClient();

    // Resolver token → code_id o subject
    // 1) codes.token
    const { data: codeRow } = await supabase
      .from('codes' as any)
      .select('id, event_id')
      .eq('token', token)
      .single();

    let eventId: string | null = null;
    let subjectId: string | null = null;
    let validPhotoIds: string[] = [];

    if (codeRow) {
      eventId = codeRow.event_id as string;
      // Validar que las fotos pertenezcan al mismo code_id
      const { data: photos } = await supabase
        .from('photos')
        .select('id, code_id')
        .in('id', selectedPhotoIds)
        .eq('code_id', codeRow.id);
      validPhotoIds = (photos || []).map((p) => p.id);
    } else {
      // 2) Fallback a subject_tokens
      const { data: subjToken } = await supabase
        .from('subject_tokens')
        .select('subject_id, expires_at')
        .eq('token', token)
        .single();

      if (!subjToken) {
        return NextResponse.json({ error: 'Token no válido' }, { status: 404 });
      }

      // Obtener event_id desde subject
      const { data: subj } = await supabase
        .from('subjects')
        .select('id, event_id')
        .eq('id', subjToken.subject_id)
        .single();
      if (!subj) {
        return NextResponse.json({ error: 'Sujeto no encontrado' }, { status: 404 });
      }
      subjectId = subj.id;
      eventId = subj.event_id;

      // Validar que las fotos estén asignadas a ese subject (photo_subjects)
      const { data: psubs } = await supabase
        .from('photo_subjects')
        .select('photo_id')
        .in('photo_id', selectedPhotoIds)
        .eq('subject_id', subjectId);
      validPhotoIds = (psubs || []).map((r) => r.photo_id);
    }

    if (!eventId) {
      return NextResponse.json({ error: 'No se pudo resolver el evento' }, { status: 400 });
    }

    if (validPhotoIds.length === 0) {
      return NextResponse.json({ error: 'Selección vacía o inválida' }, { status: 400 });
    }

    // Crear orden pending (precio 0 por ahora)
    const orderId = crypto.randomUUID();
    const { error: orderErr } = await supabase.from('orders').insert({
      id: orderId,
      event_id: eventId,
      subject_id: subjectId as any, // puede ser null según tipos
      status: 'pending',
      total_cents: 0,
      customer_name: contact?.name ?? null,
      customer_email: contact?.email ?? null,
      customer_phone: contact?.phone ?? null,
      notes: JSON.stringify({ package: pkg }),
    } as any);

    if (orderErr) {
      console.error('[Service] Error creando orden pública:', orderErr);
      return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 });
    }

    const itemsPayload = validPhotoIds.map((photoId) => ({
      order_id: orderId,
      photo_id: photoId,
      price_list_item_id: crypto.randomUUID(),
      quantity: 1,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(itemsPayload as any);
    if (itemsErr) {
      await supabase.from('orders').delete().eq('id', orderId);
      console.error('[Service] Error creando ítems de orden:', itemsErr);
      return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, orderId });
  } catch (error) {
    console.error('[Service] Public selection error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}


