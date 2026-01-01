import type { RouteContext } from '@/types/next-route';
import { resolveParams } from '@/types/next-route';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import { resolveTenantFromHeaders } from '@/lib/multitenant/tenant-resolver';

// UUID pattern validation
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type UpdateEventBody = {
  name?: string;
  location?: string | null;
  date?: string | null;
  photo_price?: number | null;
  status?: string | null;
  school_name?: string | null;
  photographer_name?: string | null;
  photographer_email?: string | null;
  photographer_phone?: string | null;
  description?: string | null;
  active?: boolean;
  theme?: 'default' | 'jardin' | 'secundaria' | 'bautismo';
  metadata?: Record<string, unknown> | null;
};

type EventUpdatePayload = Partial<{
  name: string;
  location: string | null;
  date: string | null;
  photo_price: number | null;
  status: string | null;
  school_name: string | null;
  photographer_name: string | null;
  photographer_email: string | null;
  photographer_phone: string | null;
  description: string | null;
  theme: 'default' | 'jardin' | 'secundaria' | 'bautismo';
  metadata: Json | null;
}>;

const toTrimmedStringOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : '';
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

// Inline resolution function
async function resolveFriendlyEventIdInline(identifier: string, tenantId: string) {
  if (UUID_PATTERN.test(identifier)) {
    return identifier;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseClient = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey
    );

    const { data: events, error } = await supabaseClient
      .from('events')
      .select('id, name, date')
      .eq('tenant_id', tenantId);

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
  withAuth(async (req: NextRequest, context: RouteContext<{ id: string }>) => {
    const { id } = await resolveParams(context);
    try {
      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      const supabase = await createServerSupabaseServiceClient();
      // Resolve friendly identifier to UUID if needed
      const eventId = await resolveFriendlyEventIdInline(id, tenantId);

      if (!eventId) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
      }

      // Get event details with tenant filter
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('tenant_id', tenantId)
        .single();

      if (eventError || !event) {
        console.error('[events/[id]] Event query failed:', eventError, { eventId, tenantId });
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
      req: NextRequest, context: RouteContext<{ id: string }>) => {
      const { id } = await resolveParams(context);
      if (!id) {
        return NextResponse.json(
          { error: 'Falta id de evento' },
          { status: 400 }
        );
      }

      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

      const rawBody = (await req.json().catch(() => null)) as
        | UpdateEventBody
        | null;
      if (!rawBody || typeof rawBody !== 'object') {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
      }

      const body = rawBody;
      const updateData: EventUpdatePayload = {};

      if (body.name !== undefined) {
        const value = toTrimmedStringOrNull(body.name);
        if (value !== null) updateData.name = value;
      }

      if (body.location !== undefined) {
        updateData.location =
          typeof body.location === 'string' ? body.location : body.location ?? null;
      }

      if (body.date !== undefined) {
        updateData.date =
          typeof body.date === 'string' ? body.date : body.date ?? null;
      }

      if (body.photo_price !== undefined) {
        const parsed = toNullableNumber(body.photo_price);
        if (parsed !== null || body.photo_price === null) {
          updateData.photo_price = parsed;
        }
      }

      if (body.status !== undefined && typeof body.status === 'string') {
        updateData.status = body.status;
      }

      if (body.school_name !== undefined) {
        const value = toTrimmedStringOrNull(body.school_name);
        if (value !== null) updateData.school_name = value;
      }

      if (body.photographer_name !== undefined) {
        const value = toTrimmedStringOrNull(body.photographer_name);
        if (value !== null) updateData.photographer_name = value;
      }

      if (body.photographer_email !== undefined) {
        const value = toTrimmedStringOrNull(body.photographer_email);
        if (value !== null) updateData.photographer_email = value;
      }

      if (body.photographer_phone !== undefined) {
        const value = toTrimmedStringOrNull(body.photographer_phone);
        if (value !== null) updateData.photographer_phone = value;
      }

      if (typeof body.description === 'string') {
        updateData.description = body.description;
      }

      if (body.active !== undefined) {
        updateData.status = body.active ? 'active' : 'inactive';
      }

      if (body.theme !== undefined) {
        updateData.theme = body.theme;
      }

      if (body.metadata !== undefined) {
        // We need to merge metadata, so we'll handle it after fetching current event
        // Mark that we have metadata to merge
        updateData.metadata = body.metadata as Json | null;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No hay campos para actualizar' },
          { status: 400 }
        );
      }

      const supabase = await createServerSupabaseServiceClient();

      // If we have metadata to update, we need to merge it with existing
      if (body.metadata !== undefined && body.metadata !== null) {
        const { data: currentEvent, error: fetchError } = await supabase
          .from('events')
          .select('metadata')
          .eq('id', id)
          .eq('tenant_id', tenantId)
          .single();

        if (fetchError) {
          return NextResponse.json(
            { error: 'No se pudo obtener el evento actual', details: fetchError.message },
            { status: 500 }
          );
        }

        // Deep merge the metadata
        const existingMetadata = (currentEvent?.metadata as Record<string, unknown>) || {};
        const newMetadata = body.metadata as Record<string, unknown>;

        // Merge settings deeply if both exist
        const mergedMetadata: Record<string, unknown> = { ...existingMetadata };
        for (const key of Object.keys(newMetadata)) {
          if (
            key === 'settings' &&
            typeof newMetadata[key] === 'object' &&
            typeof mergedMetadata[key] === 'object'
          ) {
            // Deep merge settings
            mergedMetadata[key] = {
              ...(mergedMetadata[key] as Record<string, unknown>),
              ...(newMetadata[key] as Record<string, unknown>),
            };
          } else {
            mergedMetadata[key] = newMetadata[key];
          }
        }

        updateData.metadata = mergedMetadata as Json;
      }

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('*')
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
      req: NextRequest, context: RouteContext<{ id: string }>) => {
      const { id } = await resolveParams(context);
      if (!id) {
        return NextResponse.json(
          { error: 'Falta id de evento' },
          { status: 400 }
        );
      }

      // Resolve tenant from headers
      const { tenantId } = resolveTenantFromHeaders(req.headers);

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
          .from('codes' as never)
          .delete()
          .eq('event_id', id);
        if (delCodesErr) {
          return NextResponse.json(
            { error: 'No se pudieron eliminar las carpetas' },
            { status: 500 }
          );
        }
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
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
