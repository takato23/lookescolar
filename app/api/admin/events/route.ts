import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Validación de configuración crítica
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        console.error(
          '[Service] Configuración Supabase faltante para creación de eventos'
        );
        return NextResponse.json(
          {
            error:
              'Configuración de servidor incompleta. Verifica SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL.',
          },
          { status: 500 }
        );
      }

      // Verificar que es admin (ya verificado por AuthMiddleware)
      if (!authContext.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // Log del acceso
      SecurityLogger.logResourceAccess('events_list', authContext, request);

      // Usar service client para consultas
      const serviceClient = await createServerSupabaseServiceClient();

      // Obtener parámetros de query
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status'); // 'active', 'inactive', 'all'
      const sortBy = searchParams.get('sort_by') || 'created_at';
      const sortOrder = searchParams.get('sort_order') || 'desc';
      const includeStats = searchParams.get('include_stats') === 'true';

      let query = serviceClient.from('events').select(`
      id,
      name,
      location,
      description,
      date,
      status,
      price_per_photo,
      created_at,
      updated_at
    `);

      // Aplicar filtros
      if (status === 'active') {
        query = query.eq('status', 'active');
      } else if (status === 'inactive') {
        query = query.eq('status', 'inactive');
      }

      // Aplicar ordenamiento
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });

      const { data: events, error } = await query;

      if (error) {
        console.error('Error fetching events:', error);
        return NextResponse.json(
          { error: 'Error obteniendo eventos' },
          { status: 500 }
        );
      }

      let eventsWithStats = events || [];

      // Si se solicitan estadísticas, obtener estadísticas reales de la BD
      if (includeStats && events && events.length > 0) {
        const eventsStatsPromises = events.map(async (event) => {
          // Obtener estadísticas reales para cada evento
          const [subjectsStats, photosStats, ordersStats] = await Promise.all([
            // Contar sujetos
            serviceClient
              .from('subjects')
              .select('*', { count: 'exact', head: true })
              .eq('event_id', event.id),

            // Contar fotos con diferentes estados
            serviceClient
              .from('photos')
              .select('id, approved, subject_id, created_at')
              .eq('event_id', event.id),

            // Contar órdenes con diferentes estados
            serviceClient
              .from('orders')
              .select('id, status, total_amount, created_at')
              .eq('event_id', event.id),
          ]);

          const photos = photosStats.data || [];
          const orders = ordersStats.data || [];

          const stats = {
            total_subjects: subjectsStats.count || 0,
            total_photos: photos.length,
            approved_photos: photos.filter((p) => p.approved).length,
            tagged_photos: photos.filter((p) => p.subject_id !== null).length,
            total_orders: orders.length,
            pending_orders: orders.filter((o) => o.status === 'pending').length,
            approved_orders: orders.filter((o) => o.status === 'approved')
              .length,
            delivered_orders: orders.filter((o) => o.status === 'delivered')
              .length,
            total_revenue_cents: orders
              .filter((o) => ['approved', 'delivered'].includes(o.status))
              .reduce((sum, order) => sum + (order.total_amount || 0), 0),
            last_photo_uploaded:
              photos.length > 0
                ? photos.sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )[0].created_at
                : null,
            last_order_created:
              orders.length > 0
                ? orders.sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )[0].created_at
                : null,
          };

          return {
            ...event,
            active: event.status === 'active',
            stats,
          };
        });

        eventsWithStats = await Promise.all(eventsStatsPromises);
      }

      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent('events_list_success', {
        requestId,
        userId: authContext.user?.id,
        eventCount: eventsWithStats.length,
        duration,
      });

      return NextResponse.json({
        events: eventsWithStats,
        meta: {
          total: eventsWithStats.length,
          filtered_by: status,
          sorted_by: `${sortBy} ${sortOrder}`,
          includes_stats: includeStats,
          generated_at: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent(
        'events_list_error',
        {
          requestId,
          error: error.message,
          duration,
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, 'admin') // Require admin authentication
);

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Verificar que es admin (ya verificado por AuthMiddleware)
      if (!authContext.isAdmin) {
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403 }
        );
      }

      // Log del acceso
      SecurityLogger.logResourceAccess('event_create', authContext, request);

      let body: { name?: string; location?: string; date?: string } = {};
      try {
        body = await request.json();
      } catch (e) {
        console.error('[Service] Body JSON inválido en creación de evento', e);
        return NextResponse.json(
          { error: 'Solicitud inválida (JSON inválido)' },
          { status: 400 }
        );
      }

      const { name, location, date } = body;

      // Validaciones básicas
      if (!name || !date || !location) {
        return NextResponse.json(
          { error: 'Se requieren name, location y date' },
          { status: 400 }
        );
      }

      const serviceClient = await createServerSupabaseServiceClient();

      // En desarrollo o si no hay usuario, created_by será null
      // Esto es válido según el esquema de la BD
      const created_by = null;

      const eventData = {
        name: name.trim(),
        location: location.trim(),
        date,
        status: 'active',
        price_per_photo: 0,
        created_by, // Puede ser null según el esquema
      };

      console.log('[Service] Intentando crear evento con datos:', eventData);

      // Crear el evento con el esquema correcto de Supabase
      const insertResult = await serviceClient
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (insertResult.error) {
        console.error('[Service] Error creando evento:', {
          error: insertResult.error,
          message: insertResult.error.message,
          details: insertResult.error.details,
          hint: insertResult.error.hint,
          code: insertResult.error.code,
        });
        return NextResponse.json(
          {
            error: 'Error creando evento',
            details: insertResult.error.message,
            hint: insertResult.error.hint,
          },
          { status: 500 }
        );
      }

      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent('event_created', {
        requestId,
        eventId: insertResult.data.id,
        userId: authContext.user?.id,
        eventName: insertResult.data.name,
        duration,
      });

      return NextResponse.json({
        success: true,
        event: {
          id: insertResult.data.id,
          name: insertResult.data.name,
          location: insertResult.data.location,
          date: insertResult.data.date,
          active: insertResult.data.status === 'active',
          status: insertResult.data.status,
          created_at: insertResult.data.created_at,
          updated_at: insertResult.data.updated_at,
        },
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent(
        'event_create_error',
        {
          requestId,
          error: error.message,
          duration,
        },
        'error'
      );

      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  }, 'admin') // Require admin authentication
);
