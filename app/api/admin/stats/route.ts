import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth.middleware';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';

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

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const serviceClient = await createServerSupabaseServiceClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();

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
      // Estadísticas de eventos (usar status en lugar de active)
      serviceClient.from('events').select('id, status, created_at'),

      // Estadísticas de assets (nuevo sistema)
      serviceClient.from('assets').select('id, created_at, status, metadata'),

      // Estadísticas de sujetos - simplificado
      serviceClient.from('subjects').select('id'),

      // Estadísticas de órdenes - simplificado (usar total en lugar de total)
      serviceClient.from('orders').select('id, status, created_at'),

      // Estadísticas de pagos (mes en curso) - tabla no existe, usar placeholder
      Promise.resolve({ data: [], error: null }),

      // Actividad reciente (últimas 24h) - removido por ahora
      Promise.resolve({ data: null, error: null }),

      // Health check del sistema - tabla subject_tokens no existe, usar placeholder
      Promise.resolve({ data: [], error: null }),
    ]);

    // Check for errors and provide detailed logging
    const errors: any = {};
    if (eventsStats.error) errors.events = eventsStats.error;
    if (photosStats.error) errors.assets = photosStats.error;
    if (subjectsStats.error) errors.subjects = subjectsStats.error;
    if (ordersStats.error) errors.orders = ordersStats.error;
    if (paymentsStats.error) errors.payments = paymentsStats.error;
    if (systemHealth.error) errors.systemHealth = systemHealth.error;

    if (Object.keys(errors).length > 0) {
      console.error('Error en queries de estadísticas:', errors);

      // Return partial stats if some tables are available
      const partialStats = {
        events: eventsStats.error
          ? { total: 0, active: 0, completed: 0 }
          : {
              total: eventsStats.data?.length || 0,
              active:
                eventsStats.data?.filter((e: any) => e.status === 'active')
                  .length || 0,
              completed:
                eventsStats.data?.filter((e: any) => e.status !== 'active')
                  .length || 0,
            },
        photos: photosStats.error
          ? { total: 0, tagged: 0, untagged: 0, uploaded_today: 0 }
          : {
              total: photosStats.data?.length || 0,
              tagged: 0, // Will calculate if no error
              untagged: 0, // Will calculate if no error
              uploaded_today: 0, // Will calculate if no error
            },
        subjects: subjectsStats.error
          ? { total: 0, with_tokens: 0 }
          : {
              total: subjectsStats.data?.length || 0,
              with_tokens: 0, // Will calculate if no error
            },
        orders: ordersStats.error
          ? {
              total: 0,
              pending: 0,
              approved: 0,
              delivered: 0,
              failed: 0,
              total_revenue_cents: 0,
              monthly_revenue_cents: 0,
            }
          : {
              total: ordersStats.data?.length || 0,
              pending:
                ordersStats.data?.filter((o: any) => o.status === 'pending')
                  .length || 0,
              approved:
                ordersStats.data?.filter((o: any) => o.status === 'approved')
                  .length || 0,
              delivered:
                ordersStats.data?.filter((o: any) => o.status === 'delivered')
                  .length || 0,
              failed:
                ordersStats.data?.filter((o: any) => o.status === 'failed')
                  .length || 0,
              total_revenue_cents: 0,
              monthly_revenue_cents: 0,
            },
        storage: { photos_count: 0, estimated_size_gb: 0 },
        activity: { recent_uploads: 0, recent_orders: 0, recent_payments: 0 },
        system: {
          health_status: 'warning' as const,
          expired_tokens: 0,
          cache_timestamp: now.toISOString(),
        },
      };

      return NextResponse.json({
        success: true,
        data: {
          ...partialStats,
          // Proveer actividad reciente vacía cuando hay errores para evitar fallos en el cliente
          recent_activity: [],
        },
        errors,
        generated_at: now.toISOString(),
      });
    }

    // Procesar estadísticas de eventos
    const events = eventsStats.data || [];
    const eventStats = {
      total: events.length,
      active: events.filter((e) => e.status === 'active').length,
      completed: events.filter((e) => e.status !== 'active').length,
    };

    // Procesar estadísticas de assets (nuevo sistema)
    const assets = photosStats.data || [];
    const todayAssets = assets.filter(
      (a) =>
        a.created_at &&
        typeof a.created_at === 'string' &&
        a.created_at.startsWith(today)
    );

    // Get tagged assets count from metadata
    const taggedAssets = assets.filter(
      (a) =>
        a.metadata && typeof a.metadata === 'object' && a.metadata.subject_id
    );

    const photoStats = {
      total: assets.length,
      tagged: taggedAssets.length,
      untagged: assets.length - taggedAssets.length,
      uploaded_today: todayAssets.length,
    };

    // Procesar estadísticas de sujetos
    const subjects = subjectsStats.data || [];

    // Get active tokens count separately (tabla subject_tokens no existe)
    const activeTokens = []; // Placeholder

    const subjectsWithTokens = new Set(
      (activeTokens || []).map((t: any) => t.subject_id)
    );

    const subjectStats = {
      total: subjects.length,
      with_tokens: 0, // Sin tokens disponibles por ahora
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
        .filter((o) => o.status && ['approved', 'delivered'].includes(o.status))
        .reduce((total, order) => total + 0, 0), // Sin campo total en orders
      monthly_revenue_cents: orders
        .filter(
          (o) =>
            o.status &&
            ['approved', 'delivered'].includes(o.status) &&
            o.created_at &&
            o.created_at >= firstDayOfMonth
        )
        .reduce((total, order) => total + 0, 0), // Sin campo total en orders
    };

    // Procesar estadísticas de storage (estimación basada en assets)
    const storageStats = {
      photos_count: assets.length,
      // Estimación: 500KB promedio por asset (preview + original)
      estimated_size_gb: Math.round(((assets.length * 0.5) / 1000) * 100) / 100,
    };

    // Actividad reciente (últimas 24h)
    const yesterday = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    ).toISOString();
    const activityData = {
      recent_uploads: todayAssets.length,
      recent_orders: orders.filter(
        (o) => o.created_at && o.created_at >= yesterday
      ).length,
      recent_payments: (paymentsStats.data || []).filter(
        (p) => p.processed_at && new Date(p.processed_at) >= new Date(yesterday)
      ).length,
    };

    // Actividad reciente enriquecida (lista) para el dashboard
    const recentOrdersList = orders
      .filter((o) => o.created_at && o.created_at >= yesterday)
      .slice(0, 10)
      .map((o) => ({
        id: `order_${o.id}`,
        type: 'order_created' as const,
        message: 'Nuevo pedido recibido',
        timestamp: o.created_at as string,
      }));

    const recentPaymentsList = (paymentsStats.data || [])
      .filter(
        (p: any) =>
          p.processed_at &&
          new Date(p.processed_at) >= new Date(yesterday) &&
          p.mp_status === 'approved'
      )
      .slice(0, 10)
      .map((p: any, idx: number) => ({
        id: `payment_${idx}_${p.processed_at}`,
        type: 'order_completed' as const,
        message: 'Pago aprobado',
        timestamp: p.processed_at as string,
      }));

    const photosActivityItem = todayPhotos.length
      ? [
          {
            id: `photos_${now.getTime()}`,
            type: 'photos_uploaded' as const,
            message: `${todayPhotos.length} fotos subidas hoy`,
            timestamp: now.toISOString(),
          },
        ]
      : [];

    const recentActivity = [
      ...photosActivityItem,
      ...recentOrdersList,
      ...recentPaymentsList,
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 15);

    // Estado del sistema
    const expiredTokens = systemHealth.data?.length || 0;
    const healthStatus: 'healthy' | 'warning' | 'critical' =
      expiredTokens > 50
        ? 'critical'
        : expiredTokens > 20
          ? 'warning'
          : 'healthy';
    const systemStatus = {
      health_status: healthStatus,
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

    // Cache headers para optimizar performance
    const response = NextResponse.json({
      success: true,
      data: {
        ...stats,
        recent_activity: recentActivity,
      },
      generated_at: now.toISOString(),
    });

    // Cache por 5 minutos
    response.headers.set('Cache-Control', 'public, max-age=300');

    return response;
  } catch (error: any) {
    console.error('Error en GET /api/admin/stats:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});
