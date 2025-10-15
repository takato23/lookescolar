import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { unifiedPhotoService } from '@/lib/services/unified-photo.service';
import { createClient } from '@supabase/supabase-js';

// UUID pattern validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Inline resolution function
async function resolveFriendlyEventIdInline(identifier: string) {
  if (UUID_PATTERN.test(identifier)) {
    return identifier;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: events, error } = await supabaseClient
      .from('events')
      .select('id, name, date');

    if (error || !events) return null;

    // Generate friendly identifier for each event and compare
    for (const event of events) {
      let slug = event.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
        .substring(0, 50)
        .replace(/^-+|-+$/g, '');
        
      if (!slug) slug = 'evento';
      
      if (event.date) {
        const year = new Date(event.date).getFullYear();
        slug = `${slug}-${year}`;
      }

      if (slug === identifier) {
        return event.id;
      }
    }

    return null;
  } catch (error) {
    console.error('Error resolving friendly event ID:', error);
    return null;
  }
}

// Get a single event with stats
export const GET = RateLimitMiddleware.withRateLimit(
  withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const supabase = await createServerSupabaseServiceClient();
      const { id } = params;
      
      // Resolve friendly identifier to UUID if needed
      const eventId = await resolveFriendlyEventIdInline(id);
      
      if (!eventId) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

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
      const photoService = new (
        await import('@/lib/services/unified-photo.service')
      ).UnifiedPhotoService(supabase);
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
  })
);

export const PATCH = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ) => {
      const id = (params).id;
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
        school_name?: string;
        photographer_name?: string;
        photographer_email?: string;
        photographer_phone?: string;
        description?: string;
        active?: boolean;
        theme?: 'default' | 'jardin' | 'secundaria' | 'bautismo';
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
      if (body.school_name !== undefined) updateData.school_name = body.school_name.trim();
      if (body.photographer_name !== undefined) updateData.photographer_name = body.photographer_name.trim();
      if (body.photographer_email !== undefined) updateData.photographer_email = body.photographer_email.trim();
      if (body.photographer_phone !== undefined) updateData.photographer_phone = body.photographer_phone.trim();
      if (body.description !== undefined) updateData.description = body.description;
      if (body.active !== undefined) updateData.status = body.active ? 'active' : 'inactive';

      if (body.theme !== undefined) updateData.theme = body.theme;

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
        .select('id, name, location, date, status, photo_price, created_at, school_name, photographer_name, photographer_email, photographer_phone, description, theme')
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
    }
  )
);

export const DELETE = RateLimitMiddleware.withRateLimit(
  withAuth(
    async (
      req: NextRequest,
      { params }: { params: { id: string } }
    ) => {
      const id = (params).id;
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
          const folderIds = folders.map((f) => f.id);
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
            const folderIds = folders.map((f) => f.id);

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
    }
  )
);
