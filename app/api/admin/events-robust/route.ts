import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';
import {
  createErrorResponse,
  createSuccessResponse,
  logDevRequest,
} from '@/lib/utils/api-response';

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Verificar que es admin
      if (!authContext.isAdmin) {
        return createErrorResponse(
          'Admin access required',
          'Authentication required',
          403,
          requestId
        );
      }

      SecurityLogger.logResourceAccess('events_list_robust', authContext, request);

      const serviceClient = await createServerSupabaseServiceClient();
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      const includeStats = searchParams.get('include_stats') === 'true';

      // Query tolerante a esquemas diferentes
      let events: any[] = [];
      
      try {
        // Intentar con esquema nuevo primero
        const { data: newSchemaEvents, error: newError } = await serviceClient
          .from('events')
          .select('id, name, location, date, status, price_per_photo, created_at, updated_at')
          .order('created_at', { ascending: false });

        if (!newError && newSchemaEvents) {
          events = newSchemaEvents.map((event: any) => ({
            id: event.id,
            name: event.name,
            location: event.location,
            school: event.location, // Compatibilidad
            date: event.date,
            status: event.status,
            active: event.status === 'active',
            price_per_photo: event.price_per_photo || 0,
            created_at: event.created_at,
            updated_at: event.updated_at,
          }));
        } else {
          throw new Error('New schema failed, trying legacy');
        }
      } catch {
        // Fallback a esquema legacy
        try {
          const { data: legacyEvents, error: legacyError } = await serviceClient
            .from('events')
            .select('id, name, school, date, active, created_at, updated_at')
            .order('created_at', { ascending: false });

          if (!legacyError && legacyEvents) {
            events = legacyEvents.map((event: any) => ({
              id: event.id,
              name: event.name,
              location: event.school,
              school: event.school,
              date: event.date,
              status: event.active ? 'active' : 'inactive',
              active: event.active,
              price_per_photo: 0, // Default en esquema legacy
              created_at: event.created_at,
              updated_at: event.updated_at,
            }));
          }
        } catch (legacyError) {
          console.error('Both schema attempts failed:', legacyError);
          return createErrorResponse(
            'Error obteniendo eventos',
            'Schema compatibility issue',
            500,
            requestId
          );
        }
      }

      // Aplicar filtros después de normalizar
      if (status === 'active') {
        events = events.filter(e => e.active);
      } else if (status === 'inactive') {
        events = events.filter(e => !e.active);
      }

      // Agregar estadísticas si se solicitan
      if (includeStats && events.length > 0) {
        const eventsWithStats = await Promise.all(
          events.map(async (event) => {
            try {
              // Stats básicas tolerantes a esquema
              const [subjectsCount, photosCount, ordersCount] = await Promise.all([
                serviceClient
                  .from('subjects')
                  .select('*', { count: 'exact', head: true })
                  .eq('event_id', event.id),
                serviceClient
                  .from('photos')
                  .select('*', { count: 'exact', head: true })
                  .eq('event_id', event.id),
                serviceClient
                  .from('orders')
                  .select('*', { count: 'exact', head: true })
                  .eq('event_id', event.id),
              ]);

              return {
                ...event,
                stats: {
                  total_subjects: subjectsCount.count || 0,
                  total_photos: photosCount.count || 0,
                  total_orders: ordersCount.count || 0,
                },
              };
            } catch (statsError) {
              console.warn('Error getting stats for event:', event.id, statsError);
              return {
                ...event,
                stats: {
                  total_subjects: 0,
                  total_photos: 0,
                  total_orders: 0,
                },
              };
            }
          })
        );
        events = eventsWithStats;
      }

      const duration = Date.now() - startTime;
      logDevRequest(requestId, 'GET', '/api/admin/events-robust', duration, 200);

      SecurityLogger.logSecurityEvent('events_list_robust_success', {
        requestId,
        userId: authContext.user?.id,
        eventCount: events.length,
        duration,
      });

      return createSuccessResponse(events, undefined, requestId);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logDevRequest(requestId, 'GET', '/api/admin/events-robust', duration, 'error');

      SecurityLogger.logSecurityEvent(
        'events_list_robust_error',
        {
          requestId,
          error: error.message,
          duration,
        },
        'error'
      );

      return createErrorResponse(
        'Error interno del servidor',
        error.message,
        500,
        requestId
      );
    }
  }, 'admin')
);

export const POST = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      if (!authContext.isAdmin) {
        return createErrorResponse(
          'Admin access required',
          'Authentication required',
          403,
          requestId
        );
      }

      SecurityLogger.logResourceAccess('event_create_robust', authContext, request);

      const body = await request.json();
      const { name, location, date } = body;

      // Validaciones básicas
      if (!name || !date || !location) {
        return createErrorResponse(
          'Campos requeridos faltantes',
          'Se requieren name, location y date',
          400,
          requestId
        );
      }

      const serviceClient = await createServerSupabaseServiceClient();

      // Preparar datos compatibles con ambos esquemas
      const eventData = {
        name: name.trim(),
        location: location.trim(),
        school: location.trim(), // Compatibilidad legacy
        date,
        status: 'active',
        active: true, // Compatibilidad legacy
        price_per_photo: 0,
      };

      // Intentar inserción con esquema nuevo
      let insertResult: any;
      try {
        insertResult = await serviceClient
          .from('events')
          .insert({
            name: eventData.name,
            location: eventData.location,
            date: eventData.date,
            status: eventData.status,
            price_per_photo: eventData.price_per_photo,
          })
          .select()
          .single();
      } catch (newSchemaError) {
        // Fallback a esquema legacy
        try {
          insertResult = await serviceClient
            .from('events')
            .insert({
              name: eventData.name,
              school: eventData.school,
              date: eventData.date,
              active: eventData.active,
            })
            .select()
            .single();
        } catch (legacyError) {
          console.error('Both insert attempts failed:', { newSchemaError, legacyError });
          return createErrorResponse(
            'Error creando evento',
            'Schema compatibility issue',
            500,
            requestId
          );
        }
      }

      if (insertResult.error || !insertResult.data) {
        return createErrorResponse(
          'Error creando evento',
          insertResult.error?.message || 'Unknown error',
          500,
          requestId
        );
      }

      const duration = Date.now() - startTime;
      logDevRequest(requestId, 'POST', '/api/admin/events-robust', duration, 201);

      SecurityLogger.logSecurityEvent('event_created_robust', {
        requestId,
        eventId: insertResult.data.id,
        userId: authContext.user?.id,
        eventName: insertResult.data.name,
        duration,
      });

      // Normalizar respuesta
      const normalizedEvent = {
        id: insertResult.data.id,
        name: insertResult.data.name || name,
        location: insertResult.data.location || insertResult.data.school || location,
        school: insertResult.data.school || insertResult.data.location || location,
        date: insertResult.data.date || date,
        status: insertResult.data.status || (insertResult.data.active ? 'active' : 'inactive'),
        active: insertResult.data.active ?? (insertResult.data.status === 'active'),
        price_per_photo: insertResult.data.price_per_photo || 0,
        created_at: insertResult.data.created_at,
        updated_at: insertResult.data.updated_at,
      };

      return createSuccessResponse(normalizedEvent, undefined, requestId);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logDevRequest(requestId, 'POST', '/api/admin/events-robust', duration, 'error');

      SecurityLogger.logSecurityEvent(
        'event_create_robust_error',
        {
          requestId,
          error: error.message,
          duration,
        },
        'error'
      );

      return createErrorResponse(
        'Error interno del servidor',
        error.message,
        500,
        requestId
      );
    }
  }, 'admin')
);
