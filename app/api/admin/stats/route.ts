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

interface GlobalStats {
  events: {
    total: number;
    active: number;
    completed: number;
  };
  photos: {
    total: number;
    tagged: number;
    untagged: number;
    uploaded_today: number;
  };
  subjects: {
    total: number;
    with_tokens: number;
  };
  orders: {
    total: number;
    pending: number;
    approved: number;
    delivered: number;
    failed: number;
    total_revenue_cents: number;
    monthly_revenue_cents: number;
  };
  storage: {
    photos_count: number;
    estimated_size_gb: number;
  };
  activity: {
    recent_uploads: number;
    recent_orders: number;
    recent_payments: number;
  };
  system: {
    health_status: 'healthy' | 'warning' | 'critical';
    expired_tokens: number;
    cache_timestamp: string;
  };
}

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // Verificar que es admin
      if (!authContext.isAdmin) {
        SecurityLogger.logSecurityEvent('unauthorized_stats_access', {
          requestId,
          userId: authContext.user?.id || 'unknown',
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        }, 'warning');
        
        return NextResponse.json(
          { error: 'Admin access required' },
          { 
            status: 403,
            headers: { 'X-Request-Id': requestId }
          }
        );
      }

      SecurityLogger.logResourceAccess('admin_stats', authContext, request);

      const serviceClient = await createServerSupabaseServiceClient();
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const firstDayOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      console.log(`📊 [${requestId}] Fetching admin stats for user:`, authContext.user?.email);

    // Ejecutar queries en paralelo para mejor performance
    const [
      eventsStats,
      photosStats,
      subjectsStats,
      ordersStats,
      paymentsStats,
      activityStats,
      systemHealth,
    ] = await Promise.all([
      // Estadísticas de eventos
      serviceClient.from('events').select('id, active, created_at'),

      // Estadísticas de fotos
      serviceClient.from('photos').select(`
          id,
          created_at,
          approved,
          photo_subjects!left(id)
        `),

      // Estadísticas de sujetos
      serviceClient.from('subjects').select(`
          id,
          subject_tokens!left(id, expires_at)
        `),

      // Estadísticas de órdenes
      serviceClient.from('orders').select(`
          id,
          status,
          created_at,
          order_items!inner(
            quantity,
            price_list_items!inner(price_cents)
          )
        `),

      // Estadísticas de pagos
      serviceClient
        .from('payments')
        .select('amount_cents, processed_at, mp_status')
        .gte('processed_at', firstDayOfMonth),

      // Actividad reciente (últimas 24h) - removido por ahora
      Promise.resolve({ data: null, error: null }),

      // Health check del sistema
      serviceClient
        .from('subject_tokens')
        .select('id')
        .lt('expires_at', now.toISOString()),
    ]);

    if (
      eventsStats.error ||
      photosStats.error ||
      subjectsStats.error ||
      ordersStats.error ||
      paymentsStats.error
    ) {
      console.error('Error en queries de estadísticas:', {
        events: eventsStats.error,
        photos: photosStats.error,
        subjects: subjectsStats.error,
        orders: ordersStats.error,
        payments: paymentsStats.error,
      });
      return NextResponse.json(
        { error: 'Error obteniendo estadísticas' },
        { status: 500 }
      );
    }

    // Procesar estadísticas de eventos
    const events = eventsStats.data || [];
    const eventStats = {
      total: events.length,
      active: events.filter((e) => e.active).length,
      completed: events.filter((e) => !e.active).length,
    };

    // Procesar estadísticas de fotos
    const photos = photosStats.data || [];
    const todayPhotos = photos.filter((p) => p.created_at.startsWith(today));
    const photoStats = {
      total: photos.length,
      tagged: photos.filter(
        (p) => p.photo_subjects && p.photo_subjects.length > 0
      ).length,
      untagged: photos.filter(
        (p) => !p.photo_subjects || p.photo_subjects.length === 0
      ).length,
      uploaded_today: todayPhotos.length,
    };

    // Procesar estadísticas de sujetos
    const subjects = subjectsStats.data || [];
    const subjectStats = {
      total: subjects.length,
      with_tokens: subjects.filter(
        (s) =>
          s.subject_tokens &&
          s.subject_tokens.length > 0 &&
          s.subject_tokens.some((t) => new Date(t.expires_at) > now)
      ).length,
    };

    // Procesar estadísticas de órdenes
    const orders = ordersStats.data || [];
    const orderStats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      approved: orders.filter((o) => o.status === 'approved').length,
      delivered: orders.filter((o) => o.status === 'delivered').length,
      failed: orders.filter((o) => o.status === 'failed').length,
      total_revenue_cents: orders
        .filter((o) => ['approved', 'delivered'].includes(o.status))
        .reduce((total, order) => {
          const orderTotal =
            order.order_items?.reduce((sum, item) => {
              return sum + item.quantity * item.price_list_items.price_cents;
            }, 0) || 0;
          return total + orderTotal;
        }, 0),
      monthly_revenue_cents: orders
        .filter(
          (o) =>
            ['approved', 'delivered'].includes(o.status) &&
            o.created_at >= firstDayOfMonth
        )
        .reduce((total, order) => {
          const orderTotal =
            order.order_items?.reduce((sum, item) => {
              return sum + item.quantity * item.price_list_items.price_cents;
            }, 0) || 0;
          return total + orderTotal;
        }, 0),
    };

    // Procesar estadísticas de storage (estimación)
    const storageStats = {
      photos_count: photos.length,
      // Estimación: 500KB promedio por foto (preview + watermark)
      estimated_size_gb: Math.round(((photos.length * 0.5) / 1000) * 100) / 100,
    };

    // Actividad reciente (últimas 24h)
    const yesterday = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();
    const activityData = {
      recent_uploads: todayPhotos.length,
      recent_orders: orders.filter((o) => o.created_at >= yesterday).length,
      recent_payments: (paymentsStats.data || []).filter(
        (p) => p.processed_at && new Date(p.processed_at) >= new Date(yesterday)
      ).length,
    };

    // Estado del sistema
    const expiredTokens = systemHealth.data?.length || 0;
    const systemStatus = {
      health_status: (expiredTokens > 50
        ? 'critical'
        : expiredTokens > 20
          ? 'warning'
          : 'healthy') as const,
      expired_tokens: expiredTokens,
      cache_timestamp: now.toISOString(),
    };

    const stats: GlobalStats = {
      events: eventStats,
      photos: photoStats,
      subjects: subjectStats,
      orders: orderStats,
      storage: storageStats,
      activity: activityData,
      system: systemStatus,
    };

      const duration = Date.now() - startTime;
      console.log(`📊 [${requestId}] Stats generation completed in ${duration}ms`);

      SecurityLogger.logSecurityEvent('admin_stats_success', {
        requestId,
        userId: authContext.user?.id,
        duration,
        statsGenerated: true
      });

      // Cache headers para optimizar performance
      const response = NextResponse.json({
        success: true,
        data: stats,
        generated_at: now.toISOString(),
      });

      // Cache por 5 minutos
      response.headers.set('Cache-Control', 'public, max-age=300');
      response.headers.set('X-Request-Id', requestId);

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      console.error(`📊 [${requestId}] Error en GET /api/admin/stats:`, {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        duration,
        userId: authContext.user?.id
      });

      SecurityLogger.logSecurityEvent('admin_stats_error', {
        requestId,
        error: error.message,
        duration,
        userId: authContext.user?.id
      }, 'error');

      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { 
          status: 500,
          headers: { 'X-Request-Id': requestId }
        }
      );
    }
  }, 'admin')
);
