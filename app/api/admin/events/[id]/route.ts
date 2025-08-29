import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { unifiedPhotoService } from '@/lib/services/unified-photo.service';

// Get a single event with stats
export const GET = RateLimitMiddleware.withRateLimit(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const supabase = await createServerSupabaseServiceClient();
      const { id } = await params;
      const eventId = id;

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Get statistics using UNIFIED system
      const photoService = new (await import('@/lib/services/unified-photo.service')).UnifiedPhotoService(supabase);
      const photoCount = await photoService.getEventPhotoCount(eventId);
      const untaggedCount = await photoService.getUntaggedPhotoCount(eventId);

      const { count: subjectCount } = await supabase
        .from('subjects')
        .select('*', { count: 'planned', head: true })
        .eq('event_id', eventId);

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('event_id', eventId);

      const totalOrders = orders?.length || 0;
      const pendingOrders =
        orders?.filter((o) => o.status === 'pending').length || 0;
      const revenue =
        orders?.reduce((sum, order) => {
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
  withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    if (!id) {
      return NextResponse.json(
        { error: 'Falta id de evento' },
        { status: 400 }
      );
    }

    let body: {
      name?: string;
      location?: string;
      date?: string;
      photo_price?: number;
      status?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.location !== undefined) updateData.location = body.location;
    if (body.date !== undefined) updateData.date = body.date;
    if (body.photo_price !== undefined)
      updateData.photo_price = body.photo_price;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const { data, error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select('id, name, location, date, status, photo_price, created_at')
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'No se pudo actualizar el evento', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: {
        ...data,
        school: data.name, // Map for compatibility
        active: data.status === 'active',
      },
    });
  })
);

export const DELETE = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    if (!id) {
      return NextResponse.json(
        { error: 'Falta id de evento' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseServiceClient();

    const force = req.nextUrl.searchParams.get('force') === 'true';

    // Safety: validar assets (nuevo sistema)
    let photoCount = 0;
    try {
      // Obtener carpetas del evento
      const { data: folders } = await supabase
        .from('folders')
        .select('id')
        .eq('event_id', id);

      if (folders && folders.length > 0) {
        const folderIds = folders.map(f => f.id);
        const { count: assetsCount } = await supabase
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .in('folder_id', folderIds);
        photoCount = assetsCount || 0;
      }
    } catch (photoErr) {
      return NextResponse.json(
        { error: 'No se pudo validar assets' },
        { status: 500 }
      );
    }

    const { count: subjectCount, error: subjectErr } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', id);

    if (subjectErr) {
      return NextResponse.json(
        { error: 'No se pudo validar sujetos' },
        { status: 500 }
      );
    }

    if ((photoCount ?? 0) > 0 || (subjectCount ?? 0) > 0) {
      if (!force) {
        return NextResponse.json(
          {
            error:
              'No se puede eliminar: el evento tiene fotos o sujetos asociados',
          },
          { status: 409 }
        );
      }

      // Eliminación forzada - assets y carpetas
      try {
        // 1. Obtener carpetas del evento
        const { data: folders } = await supabase
          .from('folders')
          .select('id')
          .eq('event_id', id);

        if (folders && folders.length > 0) {
          const folderIds = folders.map(f => f.id);
          
          // 2. Eliminar assets de las carpetas
          const { error: delAssetsErr } = await supabase
            .from('assets')
            .delete()
            .in('folder_id', folderIds);
          
          if (delAssetsErr) {
            return NextResponse.json(
              { error: 'No se pudieron eliminar los assets' },
              { status: 500 }
            );
          }

          // 3. Eliminar las carpetas
          const { error: delFoldersErr } = await supabase
            .from('folders')
            .delete()
            .eq('event_id', id);
          
          if (delFoldersErr) {
            return NextResponse.json(
              { error: 'No se pudieron eliminar las carpetas' },
              { status: 500 }
            );
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Error eliminando assets del evento' },
          { status: 500 }
        );
      }

      const { error: delSubjectsErr } = await supabase
        .from('subjects')
        .delete()
        .eq('event_id', id);
      if (delSubjectsErr) {
        return NextResponse.json(
          { error: 'No se pudieron eliminar los sujetos' },
          { status: 500 }
        );
      }

      const { error: delCodesErr } = await supabase
        .from('codes' as any)
        .delete()
        .eq('event_id', id);
      if (delCodesErr) {
        return NextResponse.json(
          { error: 'No se pudieron eliminar las carpetas' },
          { status: 500 }
        );
      }
    }

    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      return NextResponse.json(
        { error: 'No se pudo eliminar el evento', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  })
);
