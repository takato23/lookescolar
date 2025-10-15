// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import { withAuth, SecurityLogger } from '@/lib/middleware/auth.middleware';

interface DashboardStats {
  activeEvents: number;
  totalPhotos: number;
  registeredFamilies: number;
  totalSales: number;
  todayUploads: number;
  todayOrders: number;
  todayPayments: number;
  pendingOrders: number;
  storageUsed: number;
  storageLimit: number;
  recentActivity: Activity[];
}

interface Activity {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed';
  message: string;
  timestamp: string;
  eventId?: string;
  count?: number;
}

// Cache duration in seconds
const CACHE_DURATION = 30;
const STALE_WHILE_REVALIDATE = 60;

async function handleGET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  const userId = request.headers.get('x-user-id') || 'unknown';

  try {
    SecurityLogger.logSecurityEvent(
      'dashboard_stats_request',
      {
        requestId,
        userId,
      },
      'info'
    );

    const supabase = await createServerSupabaseServiceClient();

    // Get current date for today's stats
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00.000Z`;

    // Execute all queries in parallel for performance
    const [
      eventsResult,
      photosResult,
      subjectsResult,
      ordersCompletedResult,
      todayPhotosResult,
      pendingOrdersResult,
      todayOrdersResult,
      todayPaymentsResult,
    ] = await Promise.allSettled([
      // Active events
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),

      // Total photos with size for storage calculation
      supabase.from('photos').select('file_size'),

      // Registered families (subjects with tokens)
      supabase
        .from('subjects')
        .select('id', { count: 'exact', head: true })
        .not('access_token', 'is', null),

      // Total completed sales
      supabase.from('orders').select('total_amount').eq('status', 'completed'),

      // Today's photo uploads
      supabase
        .from('photos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay),

      // Pending orders
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Today's orders
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfDay),

      // Today's payments
      supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed')
        .gte('created_at', startOfDay),
    ]);

    // Process results with error handling for each query
    const activeEvents =
      eventsResult.status === 'fulfilled' ? eventsResult.value.count || 0 : 0;

    const photosData =
      photosResult.status === 'fulfilled' && photosResult.value.data
        ? photosResult.value.data
        : [];

    const totalPhotos = photosData.length;
    const storageUsed = photosData.reduce(
      (sum, photo) => sum + (photo.file_size || 0),
      0
    );

    const registeredFamilies =
      subjectsResult.status === 'fulfilled'
        ? subjectsResult.value.count || 0
        : 0;

    const completedOrders =
      ordersCompletedResult.status === 'fulfilled' &&
      ordersCompletedResult.value.data
        ? ordersCompletedResult.value.data
        : [];

    const totalSales = completedOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );

    const todayUploads =
      todayPhotosResult.status === 'fulfilled'
        ? todayPhotosResult.value.count || 0
        : 0;

    const pendingOrders =
      pendingOrdersResult.status === 'fulfilled'
        ? pendingOrdersResult.value.count || 0
        : 0;

    const todayOrders =
      todayOrdersResult.status === 'fulfilled'
        ? todayOrdersResult.value.count || 0
        : 0;

    const todayPaymentsData =
      todayPaymentsResult.status === 'fulfilled' &&
      todayPaymentsResult.value.data
        ? todayPaymentsResult.value.data
        : [];

    const todayPayments = todayPaymentsData.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );

    // Generate recent activity based on actual data
    const recentActivity: Activity[] = [];

    if (todayUploads > 0) {
      recentActivity.push({
        id: 'today_uploads',
        type: 'photos_uploaded',
        message: `${todayUploads} fotos subidas hoy`,
        timestamp: new Date().toISOString(),
        count: todayUploads,
      });
    }

    if (todayOrders > 0) {
      recentActivity.push({
        id: 'today_orders',
        type: 'order_created',
        message: `${todayOrders} nuevos pedidos hoy`,
        timestamp: new Date().toISOString(),
        count: todayOrders,
      });
    }

    if (pendingOrders > 0) {
      recentActivity.push({
        id: 'pending_orders',
        type: 'order_created',
        message: `${pendingOrders} pedidos pendientes de entrega`,
        timestamp: new Date().toISOString(),
        count: pendingOrders,
      });
    }

    if (activeEvents > 0) {
      recentActivity.push({
        id: 'active_events',
        type: 'event_created',
        message: `${activeEvents} eventos activos`,
        timestamp: new Date().toISOString(),
        count: activeEvents,
      });
    }

    const stats: DashboardStats = {
      activeEvents,
      totalPhotos,
      registeredFamilies,
      totalSales,
      todayUploads,
      todayOrders,
      todayPayments,
      pendingOrders,
      storageUsed,
      storageLimit: 5 * 1024 * 1024 * 1024, // 5GB default limit
      recentActivity: recentActivity.slice(0, 5), // Limit to 5 most recent
    };

    SecurityLogger.logSecurityEvent(
      'dashboard_stats_success',
      {
        requestId,
        userId,
        statsCount: Object.keys(stats).length,
      },
      'info'
    );

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`,
        'X-Request-Id': requestId,
      },
    });
  } catch (error) {
    SecurityLogger.logSecurityEvent(
      'dashboard_stats_error',
      {
        requestId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'error'
    );

    // Return cached/default data on error to prevent dashboard failure
    const fallbackStats: DashboardStats = {
      activeEvents: 0,
      totalPhotos: 0,
      registeredFamilies: 0,
      totalSales: 0,
      todayUploads: 0,
      todayOrders: 0,
      todayPayments: 0,
      pendingOrders: 0,
      storageUsed: 0,
      storageLimit: 5 * 1024 * 1024 * 1024,
      recentActivity: [],
    };

    return NextResponse.json(fallbackStats, {
      status: 500,
      headers: {
        'X-Request-Id': requestId,
        'X-Error': 'true',
      },
    });
  }
}

// Export wrapped with authentication
export const GET = handleGET;
