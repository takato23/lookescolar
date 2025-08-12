import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';

// Get a single event with stats
export const GET = RateLimitMiddleware.withRateLimit(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const supabase = await createServerSupabaseServiceClient();
      const eventId = params.id;

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      // Get statistics
      const { count: photoCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const { count: untaggedCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .is('subject_id', null);

      const { count: subjectCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('event_id', eventId);

      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const revenue = orders?.reduce((sum, order) => {
        if (order.status === 'approved' || order.status === 'delivered') {
          return sum + (order.total_amount || 0);
        }
        return sum;
      }, 0) || 0;

      return NextResponse.json({
        success: true,
        event: {
          ...event,
          school: event.name, // Map for compatibility
          active: event.status === 'active',
          stats: {
            totalPhotos: photoCount || 0,
            untaggedPhotos: untaggedCount || 0,
            totalSubjects: subjectCount || 0,
            totalOrders,
            pendingOrders,
            revenue,
          },
        },
      });
    } catch (error) {
      console.error('[events/[id]] Error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
);

export const PATCH = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Falta id de evento' }, { status: 400 });
    }

    let body: { name?: string; location?: string; date?: string; photo_price?: number; status?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.location !== undefined) updateData.location = body.location;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.photo_price !== undefined) updateData.photo_price = body.photo_price;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select('id, name, location, date, status, photo_price, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'No se pudo actualizar el evento', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      event: {
        ...data,
        school: data.name, // Map for compatibility
        active: data.status === 'active'
      }
    });
  })
);

export const DELETE = RateLimitMiddleware.withRateLimit(
  withAuth(async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Falta id de evento' }, { status: 400 });
    }

    const supabase = await createServerSupabaseServiceClient();

    // Safety: no borrar si tiene fotos o sujetos
    const { count: photoCount, error: photoErr } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);

    if (photoErr) {
      return NextResponse.json({ error: 'No se pudo validar fotos' }, { status: 500 });
    }

    if ((photoCount ?? 0) > 0) {
      return NextResponse.json({ error: 'No se puede eliminar: el evento tiene fotos asociadas' }, { status: 409 });
    }

    const { count: subjectCount, error: subjectErr } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);

    if (subjectErr) {
      return NextResponse.json({ error: 'No se pudo validar sujetos' }, { status: 500 });
    }

    if ((subjectCount ?? 0) > 0) {
      return NextResponse.json({ error: 'No se puede eliminar: el evento tiene sujetos asociados' }, { status: 409 });
    }

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: 'No se pudo eliminar el evento', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  })
);


