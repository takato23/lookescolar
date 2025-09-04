import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  createErrorResponse,
  createSuccessResponse,
  parsePaginationParams,
  createPaginationMeta,
  logDevRequest,
} from '@/lib/utils/api-response';
import {
  normalizeEvent,
  prepareEventInsert,
  detectSchemaVersion,
} from '@/lib/utils/schema-compatibility';

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
      const { page, limit, offset } = parsePaginationParams(searchParams);
      const paginated = searchParams.has('page') || searchParams.has('limit');

      let query = serviceClient.from('events').select(
        `
      id,
      name,
      location,
      description,
      date,
      status,
      price_per_photo,
      created_at,
      updated_at
    `,
        { count: 'exact' }
      );

      // Aplicar filtros
      if (status === 'active') {
        query = query.eq('status', 'active');
      } else if (status === 'inactive') {
        query = query.eq('status', 'inactive');
      }

      // Aplicar ordenamiento
      const ascending = sortOrder === 'asc';
      query = query.order(sortBy, { ascending });
      // Paginación
      if (paginated) {
        query = query.range(offset, offset + limit - 1);
      }

      const { data: events, error, count } = await query as any;

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
        try {
          const eventIds = events.map((e) => e.id);
          const { data: aggStats, error: aggError } = await serviceClient.rpc(
            'get_event_stats',
            { event_ids: eventIds }
          );

          if (aggError) throw aggError;

          const map = new Map<string, any>();
          (aggStats || []).forEach((row: any) => {
            map.set(row.event_id, {
              totalSubjects: row.total_subjects || 0,
              totalPhotos: row.total_photos || 0,
              totalOrders: row.total_orders || 0,
              revenue: row.revenue || 0,
            });
          });

          eventsWithStats = (events || []).map((event) => ({
            ...event,
            school: event.name || event.location,
            active: event.status === 'active',
            stats: map.get(event.id) || {
              totalSubjects: 0,
              totalPhotos: 0,
              totalOrders: 0,
              revenue: 0,
            },
          }));
        } catch (e) {
          // Fallback al método por lotes para resiliencia
          const { UnifiedPhotoService } = await import(
            '@/lib/services/unified-photo.service'
          );
          const photoService = new UnifiedPhotoService(serviceClient as any);

          const batchSize = parseInt(
            process.env.EVENTS_STATS_BATCH_SIZE || '6',
            10
          );
          const enriched: any[] = [];

          for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize);
            const batchResults = await Promise.all(
              batch.map(async (event) => {
                const [subjectsStats, photoCount, ordersStats] = await Promise.all([
                  serviceClient
                    .from('subjects')
                    .select('*', { count: 'exact', head: true })
                    .eq('event_id', event.id),
                  photoService.getEventPhotoCount(event.id),
                  serviceClient
                    .from('orders')
                    .select('id, status, total_amount, created_at')
                    .eq('event_id', event.id),
                ]);

                const orders = ordersStats.data || [];

                const stats = {
                  totalSubjects: subjectsStats.count || 0,
                  totalPhotos: photoCount || 0,
                  approvedPhotos: null,
                  untaggedPhotos: null,
                  totalOrders: orders.length,
                  pendingOrders: orders.filter((o) => o.status === 'pending').length,
                  approvedOrders: orders.filter((o) => o.status === 'approved')
                    .length,
                  deliveredOrders: orders.filter((o) => o.status === 'delivered')
                    .length,
                  revenue: Math.round(
                    orders
                      .filter((o) => ['approved', 'delivered'].includes(o.status))
                      .reduce((sum, order) => sum + (order.total_amount || 0), 0) /
                      100
                  ),
                  lastPhotoUploaded: null,
                  lastOrderCreated:
                    orders.length > 0
                      ? orders.sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )[0].created_at
                      : null,
                } as any;

                return {
                  ...event,
                  school: event.name || event.location,
                  active: event.status === 'active',
                  stats,
                };
              })
            );
            enriched.push(...batchResults);
          }

          eventsWithStats = enriched;
        }
      }

      const duration = Date.now() - startTime;

      SecurityLogger.logSecurityEvent('events_list_success', {
        requestId,
        userId: authContext.user?.id,
        eventCount: eventsWithStats.length,
        duration,
      });

      // Si se pidió paginación explícita, devolver formato con metadatos
      if (paginated) {
        const pagination = createPaginationMeta(page, limit, count || 0);
        return createSuccessResponse(
          { events: eventsWithStats },
          pagination,
          requestId
        );
      }

      // Compat: devolver arreglo como raíz cuando no hay paginación
      return NextResponse.json(eventsWithStats, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
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

      // Revalidate the events page to show the new event immediately
      revalidatePath('/admin/events');

      // Compat tests: incluir campos en la raíz además del objeto event
      return NextResponse.json({
        id: insertResult.data.id,
        name: insertResult.data.name,
        location: insertResult.data.location,
        date: insertResult.data.date,
        active: insertResult.data.status === 'active',
        status: insertResult.data.status,
        created_at: insertResult.data.created_at,
        updated_at: insertResult.data.updated_at,
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
