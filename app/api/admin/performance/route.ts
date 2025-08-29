import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServerSupabaseServiceClient,
} from '@/lib/supabase/server';

interface PerformanceMetrics {
  storage: {
    total_photos: number;
    estimated_size_gb: number;
    egress_today_gb: number;
    egress_monthly_gb: number;
    storage_utilization_percent: number;
    avg_photo_size_kb: number;
  };
  database: {
    total_tables: number;
    total_records: number;
    health_status: 'healthy' | 'warning' | 'critical';
    expired_tokens: number;
    pending_orders_count: number;
    active_events_count: number;
  };
  activity: {
    photos_processed_today: number;
    orders_created_today: number;
    payments_processed_today: number;
    unique_visitors_today: number;
    conversion_rate_percent: number;
  };
  system: {
    uptime_hours: number;
    last_refresh_dashboard_stats: string | null;
    cache_hit_rate_percent: number;
    avg_response_time_ms: number;
    error_rate_percent: number;
  };
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    metric: string;
    value: number | string;
    threshold?: number;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    // En desarrollo, devolver datos mock
    if (process.env.NODE_ENV === 'development') {
      const mockMetrics: PerformanceMetrics = {
        storage: {
          total_photos: 256,
          estimated_size_gb: 0.13,
          egress_today_gb: 0.02,
          egress_monthly_gb: 1.2,
          storage_utilization_percent: 0.13,
          avg_photo_size_kb: 500,
        },
        database: {
          total_tables: 12,
          total_records: 1458,
          health_status: 'healthy',
          expired_tokens: 2,
          pending_orders_count: 3,
          active_events_count: 2,
        },
        activity: {
          photos_processed_today: 12,
          orders_created_today: 3,
          payments_processed_today: 2,
          unique_visitors_today: 8,
          conversion_rate_percent: 66.67,
        },
        system: {
          uptime_hours: 168,
          last_refresh_dashboard_stats: new Date(
            Date.now() - 1000 * 60 * 5
          ).toISOString(),
          cache_hit_rate_percent: 92.5,
          avg_response_time_ms: 125,
          error_rate_percent: 0.05,
        },
        alerts: [],
      };

      return NextResponse.json({
        storage: mockMetrics.storage,
        system: mockMetrics.system,
        conversions: {
          viewToCart: 45.5,
          cartToPayment: 66.67,
          overall: 30.3,
        },
        apiMetrics: {
          responseTime: mockMetrics.system.avg_response_time_ms,
          errorRate: mockMetrics.system.error_rate_percent,
          throughput: 250,
        },
      });
    }

    const serviceClient = await createServerSupabaseServiceClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    // Ejecutar queries de performance en paralelo
    const [
      storageMetrics,
      databaseHealth,
      activityMetrics,
      egressMetrics,
      systemHealth,
    ] = await Promise.all([
      // Métricas de storage
      serviceClient.from('photos').select('id, created_at'),

      // Health de la base de datos
      serviceClient.rpc('system_health_check'),

      // Métricas de actividad
      Promise.all([
        serviceClient
          .from('photos')
          .select('id')
          .gte('created_at', `${today}T00:00:00Z`),
        serviceClient
          .from('orders')
          .select('id, status')
          .gte('created_at', `${today}T00:00:00Z`),
        serviceClient
          .from('payments')
          .select('id')
          .gte('processed_at', `${today}T00:00:00Z`)
          .eq('mp_status', 'approved'),
      ]),

      // Métricas de egress
      Promise.all([
        serviceClient
          .from('egress_metrics')
          .select('bytes_served, requests_count')
          .eq('date', today),
        serviceClient
          .from('egress_metrics')
          .select('bytes_served')
          .gte('date', firstDayOfMonth),
      ]),

      // Health check del sistema
      Promise.all([
        serviceClient
          .from('subject_tokens')
          .select('id')
          .lt('expires_at', now.toISOString()),
        serviceClient.from('orders').select('id').eq('status', 'pending'),
        serviceClient.from('events').select('id').eq('active', true),
      ]),
    ]);

    // Procesar métricas de storage
    const photos = storageMetrics.data || [];
    const totalPhotos = photos.length;
    const estimatedSizeGb =
      Math.round(((totalPhotos * 0.5) / 1000) * 100) / 100; // 500KB promedio por foto
    const avgPhotoSizeKb =
      totalPhotos > 0
        ? Math.round((estimatedSizeGb * 1000000) / totalPhotos)
        : 0;

    // Procesar egress
    const todayEgress = egressMetrics[0].data?.[0]?.bytes_served || 0;
    const monthlyEgress =
      egressMetrics[1].data?.reduce((sum, day) => sum + day.bytes_served, 0) ||
      0;
    const egressTodayGb =
      Math.round((todayEgress / (1024 * 1024 * 1024)) * 100) / 100;
    const egressMonthlyGb =
      Math.round((monthlyEgress / (1024 * 1024 * 1024)) * 100) / 100;

    const storage = {
      total_photos: totalPhotos,
      estimated_size_gb: estimatedSizeGb,
      egress_today_gb: egressTodayGb,
      egress_monthly_gb: egressMonthlyGb,
      storage_utilization_percent:
        Math.round((estimatedSizeGb / 100) * 10000) / 100, // Asumiendo límite de 100GB
      avg_photo_size_kb: avgPhotoSizeKb,
    };

    // Procesar métricas de actividad
    const [todayPhotos, todayOrders, todayPayments] = activityMetrics;
    const photosToday = todayPhotos.data?.length || 0;
    const ordersToday = todayOrders.data?.length || 0;
    const paymentsToday = todayPayments.data?.length || 0;
    const conversionRate =
      ordersToday > 0
        ? Math.round((paymentsToday / ordersToday) * 10000) / 100
        : 0;

    const activity = {
      photos_processed_today: photosToday,
      orders_created_today: ordersToday,
      payments_processed_today: paymentsToday,
      unique_visitors_today: ordersToday, // Aproximación: 1 visitor por order
      conversion_rate_percent: conversionRate,
    };

    // Procesar health del sistema
    const [expiredTokens, pendingOrders, activeEvents] = systemHealth;
    const expiredCount = expiredTokens.data?.length || 0;
    const pendingCount = pendingOrders.data?.length || 0;
    const activeCount = activeEvents.data?.length || 0;

    const database = {
      total_tables: 12, // Número conocido de tablas
      total_records: totalPhotos + ordersToday + activeCount, // Aproximación
      health_status: (expiredCount > 100
        ? 'critical'
        : expiredCount > 50
          ? 'warning'
          : 'healthy') as const,
      expired_tokens: expiredCount,
      pending_orders_count: pendingCount,
      active_events_count: activeCount,
    };

    // Obtener timestamp de la última actualización de dashboard_stats
    const { data: dashboardStatsInfo } = await serviceClient
      .from('pg_matviews')
      .select('last_refresh')
      .eq('matviewname', 'dashboard_stats')
      .single();

    const system = {
      uptime_hours: 24, // Simplificación - en producción se calcularía desde el último deploy
      last_refresh_dashboard_stats: dashboardStatsInfo?.last_refresh || null,
      cache_hit_rate_percent: 85, // Simulado - en producción vendría de Redis/cache
      avg_response_time_ms: 150, // Simulado - en producción vendría de APM
      error_rate_percent: 0.1, // Simulado - en producción vendría de logs
    };

    // Generar alertas basadas en métricas
    const alerts: PerformanceMetrics['alerts'] = [];

    if (storage.egress_monthly_gb > 80) {
      alerts.push({
        level: 'critical',
        message: 'Egress mensual cercano al límite',
        metric: 'egress_monthly_gb',
        value: storage.egress_monthly_gb,
        threshold: 100,
      });
    } else if (storage.egress_monthly_gb > 60) {
      alerts.push({
        level: 'warning',
        message: 'Egress mensual alto',
        metric: 'egress_monthly_gb',
        value: storage.egress_monthly_gb,
        threshold: 80,
      });
    }

    if (expiredCount > 50) {
      alerts.push({
        level: 'warning',
        message: 'Muchos tokens expirados',
        metric: 'expired_tokens',
        value: expiredCount,
        threshold: 50,
      });
    }

    if (pendingCount > 20) {
      alerts.push({
        level: 'info',
        message: 'Muchos pedidos pendientes',
        metric: 'pending_orders',
        value: pendingCount,
      });
    }

    if (storage.storage_utilization_percent > 80) {
      alerts.push({
        level: 'critical',
        message: 'Storage casi lleno',
        metric: 'storage_utilization_percent',
        value: storage.storage_utilization_percent,
        threshold: 80,
      });
    }

    if (conversionRate < 10 && ordersToday > 5) {
      alerts.push({
        level: 'warning',
        message: 'Tasa de conversión baja',
        metric: 'conversion_rate_percent',
        value: conversionRate,
        threshold: 20,
      });
    }

    const metrics: PerformanceMetrics = {
      storage,
      database,
      activity,
      system,
      alerts,
    };

    const response = NextResponse.json({
      success: true,
      metrics,
      generated_at: now.toISOString(),
    });

    // Cache por 10 minutos ya que las métricas no cambian frecuentemente
    response.headers.set('Cache-Control', 'public, max-age=600');

    return response;
  } catch (error: any) {
    console.error('Error en GET /api/admin/performance:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
