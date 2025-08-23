import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(request: NextRequest) {
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
      // Estadísticas de eventos
      serviceClient.from('events').select('id, active, created_at'),

      // Estadísticas de fotos - simplificado
      serviceClient.from('photos').select('id, created_at, approved'),

      // Estadísticas de sujetos - simplificado
      serviceClient.from('subjects').select('id'),

      // Estadísticas de órdenes - simplificado
      serviceClient.from('orders').select('id, status, created_at, total_cents'),

      // Estadísticas de pagos
      serviceClient
        .from('payments')
        .select('amount_cents, processed_at, mp_status')
        .gte('processed_at', firstDayOfMonth),

      // Actividad reciente (últimas 24h) - removido por ahora
      Promise.resolve({ data: null, error: null }),

      // Health check del sistema - only use subject_tokens table
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
    const todayPhotos = photos.filter((p) => p.created_at && typeof p.created_at === 'string' && p.created_at.startsWith(today));
    
    // Get tagged photos count separately to avoid join issues
    const { data: photoSubjects } = await serviceClient
      .from('photo_subjects')
      .select('photo_id');
    
    const taggedPhotoIds = new Set((photoSubjects || []).map(ps => ps.photo_id));
    
    const photoStats = {
      total: photos.length,
      tagged: photos.filter(p => taggedPhotoIds.has(p.id)).length,
      untagged: photos.filter(p => !taggedPhotoIds.has(p.id)).length,
      uploaded_today: todayPhotos.length,
    };

    // Procesar estadísticas de sujetos
    const subjects = subjectsStats.data || [];
    
    // Get active tokens count separately
    const { data: activeTokens } = await serviceClient
      .from('subject_tokens')
      .select('subject_id')
      .gt('expires_at', now.toISOString());
    
    const subjectsWithTokens = new Set((activeTokens || []).map(t => t.subject_id));
    
    const subjectStats = {
      total: subjects.length,
      with_tokens: subjects.filter(s => subjectsWithTokens.has(s.id)).length,
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
        .reduce((total, order) => total + (order.total_cents || 0), 0),
      monthly_revenue_cents: orders
        .filter(
          (o) =>
            o.status && ['approved', 'delivered'].includes(o.status) &&
            o.created_at && o.created_at >= firstDayOfMonth
        )
        .reduce((total, order) => total + (order.total_cents || 0), 0),
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
      recent_orders: orders.filter((o) => o.created_at && o.created_at >= yesterday).length,
      recent_payments: (paymentsStats.data || []).filter(
        (p) => p.processed_at && new Date(p.processed_at) >= new Date(yesterday)
      ).length,
    };

    // Estado del sistema
    const expiredTokens = systemHealth.data?.length || 0;
    const healthStatus: 'healthy' | 'warning' | 'critical' = expiredTokens > 50 ? 'critical' : expiredTokens > 20 ? 'warning' : 'healthy';
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
      data: stats,
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
}
