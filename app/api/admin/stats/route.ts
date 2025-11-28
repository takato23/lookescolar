import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseServiceClient } from '@/lib/supabase/server';
import {
  AuthMiddleware,
  SecurityLogger,
} from '@/lib/middleware/auth.middleware';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit.middleware';

// Types
interface EventSummary {
  id: string;
  name: string;
  location: string | null;
  date: string | null;
  totalStudents: number;
  photosUploaded: number;
  expectedPhotos: number;
  status: 'planning' | 'in_progress' | 'processing' | 'completed';
}

interface GlobalStats {
  events: { total: number; active: number; completed: number };
  photos: {
    total: number;
    tagged: number;
    untagged: number;
    uploaded_today: number;
  };
  subjects: { total: number; with_tokens: number };
  orders: {
    total: number;
    pending: number;
    approved: number;
    delivered: number;
    failed: number;
    total_revenue_cents: number;
    monthly_revenue_cents: number;
  };
  storage: { photos_count: number; estimated_size_gb: number };
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
  events_summary: EventSummary[];
  quick_access: {
    lastEvent: string;
    lastEventDate: string | null;
    photosToProcess: number;
    pendingUploads: number;
    recentActivity: string;
  };
  photo_management: {
    totalPhotos: number;
    processedToday: number;
    pendingProcessing: number;
    publishedGalleries: number;
    lastUploadAt: string | null;
  };
  orders_summary: {
    newOrders: number;
    pendingDelivery: number;
    totalRevenueCents: number;
    todayOrders: number;
  };
  business_metrics: {
    monthlyRevenueCents: number;
    activeClients: number;
    completionRate: number;
    avgOrderValueCents: number;
  };
  recent_activity: Array<{
    id: string;
    type:
      | 'event_created'
      | 'photos_uploaded'
      | 'order_created'
      | 'order_completed';
    message: string;
    timestamp: string;
  }>;
}

// Empty stats for fallback
const createEmptyStats = (): GlobalStats => {
  const now = new Date().toISOString();
  return {
    events: { total: 0, active: 0, completed: 0 },
    photos: { total: 0, tagged: 0, untagged: 0, uploaded_today: 0 },
    subjects: { total: 0, with_tokens: 0 },
    orders: {
      total: 0,
      pending: 0,
      approved: 0,
      delivered: 0,
      failed: 0,
      total_revenue_cents: 0,
      monthly_revenue_cents: 0,
    },
    storage: { photos_count: 0, estimated_size_gb: 0 },
    activity: { recent_uploads: 0, recent_orders: 0, recent_payments: 0 },
    system: {
      health_status: 'healthy',
      expired_tokens: 0,
      cache_timestamp: now,
    },
    events_summary: [],
    quick_access: {
      lastEvent: 'Sin eventos',
      lastEventDate: null,
      photosToProcess: 0,
      pendingUploads: 0,
      recentActivity: 'Sin actividad reciente',
    },
    photo_management: {
      totalPhotos: 0,
      processedToday: 0,
      pendingProcessing: 0,
      publishedGalleries: 0,
      lastUploadAt: null,
    },
    orders_summary: {
      newOrders: 0,
      pendingDelivery: 0,
      totalRevenueCents: 0,
      todayOrders: 0,
    },
    business_metrics: {
      monthlyRevenueCents: 0,
      activeClients: 0,
      completionRate: 0,
      avgOrderValueCents: 0,
    },
    recent_activity: [],
  };
};

// Utility functions
const getDateValue = (val?: string | null): number =>
  val ? Date.parse(val) || 0 : 0;
const countBy = <T>(arr: T[], predicate: (item: T) => boolean): number =>
  arr.reduce((n, item) => (predicate(item) ? n + 1 : n), 0);

export const GET = RateLimitMiddleware.withRateLimit(
  AuthMiddleware.withAuth(async (request: NextRequest, authContext) => {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      if (!authContext.isAdmin) {
        SecurityLogger.logSecurityEvent(
          'unauthorized_stats_access',
          { requestId, userId: authContext.user?.id || 'unknown' },
          'warning'
        );
        return NextResponse.json(
          { error: 'Admin access required' },
          { status: 403, headers: { 'X-Request-Id': requestId } }
        );
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString();
      const startOfMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      ).toISOString();

      let serviceClient;
      try {
        serviceClient = await createServerSupabaseServiceClient();
      } catch {
        return NextResponse.json({
          success: true,
          data: createEmptyStats(),
          fallback: true,
        });
      }

      // Execute ALL queries in parallel - optimized single batch
      const [
        eventsRes,
        photosRes,
        subjectsRes,
        ordersRes,
        paymentsRes,
        photoSubjectsRes,
        activeTokensRes,
        expiredTokensRes,
      ] = await Promise.all([
        serviceClient
          .from('events')
          .select(
            'id, active, created_at, name, school_name, location, date, start_date, status, published'
          ),
        serviceClient
          .from('photos')
          .select('id, created_at, approved, event_id'),
        serviceClient.from('subjects').select('id, event_id'),
        serviceClient
          .from('orders')
          .select('id, status, created_at, total_cents'),
        serviceClient
          .from('payments')
          .select('amount_cents, processed_at')
          .gte('processed_at', today),
        serviceClient.from('photo_subjects').select('photo_id'),
        serviceClient
          .from('subject_tokens')
          .select('subject_id')
          .gt('expires_at', now.toISOString()),
        serviceClient
          .from('subject_tokens')
          .select('id')
          .lt('expires_at', now.toISOString())
          .limit(10),
      ]);

      // Check for critical errors
      if (
        eventsRes.error ||
        photosRes.error ||
        subjectsRes.error ||
        ordersRes.error
      ) {
        console.warn(`[${requestId}] Query errors, using fallback`);
        return NextResponse.json({
          success: true,
          data: createEmptyStats(),
          fallback: true,
        });
      }

      const events = eventsRes.data || [];
      const photos = photosRes.data || [];
      const subjects = subjectsRes.data || [];
      const orders = ordersRes.data || [];
      const payments = paymentsRes.data || [];
      const taggedPhotoIds = new Set(
        (photoSubjectsRes.data || []).map((ps) => ps.photo_id)
      );
      const subjectsWithTokens = new Set(
        (activeTokensRes.data || []).map((t) => t.subject_id)
      ).size;
      const expiredTokens = (expiredTokensRes.data || []).length;

      // Process data in single passes with Maps for O(1) lookups
      const subjectsByEvent = new Map<string, number>();
      const photosByEvent = new Map<
        string,
        { total: number; lastUpload: string | null }
      >();

      // Single pass for subjects
      for (const s of subjects) {
        if (s.event_id)
          subjectsByEvent.set(
            s.event_id,
            (subjectsByEvent.get(s.event_id) || 0) + 1
          );
      }

      // Single pass for photos - compute all stats at once
      let todayPhotosCount = 0,
        taggedCount = 0,
        pendingCount = 0;
      let latestUpload: string | null = null;

      for (const p of photos) {
        // Today's photos
        if (p.created_at?.startsWith(today)) todayPhotosCount++;
        // Tagged photos
        if (taggedPhotoIds.has(p.id)) taggedCount++;
        // Pending (not approved)
        if (!p.approved) pendingCount++;
        // Latest upload
        if (p.created_at && (!latestUpload || p.created_at > latestUpload))
          latestUpload = p.created_at;
        // By event
        if (p.event_id) {
          const entry = photosByEvent.get(p.event_id) || {
            total: 0,
            lastUpload: null,
          };
          entry.total++;
          if (
            p.created_at &&
            (!entry.lastUpload || p.created_at > entry.lastUpload)
          )
            entry.lastUpload = p.created_at;
          photosByEvent.set(p.event_id, entry);
        }
      }

      // Single pass for orders - compute all stats at once
      let totalRevenue = 0,
        monthlyRevenue = 0,
        pendingOrders = 0,
        approvedOrders = 0,
        deliveredOrders = 0,
        failedOrders = 0,
        recentOrdersCount = 0;

      for (const o of orders) {
        const isPaid = o.status === 'approved' || o.status === 'delivered';
        if (isPaid) totalRevenue += o.total_cents || 0;
        if (isPaid && o.created_at >= startOfMonth)
          monthlyRevenue += o.total_cents || 0;
        if (o.created_at >= yesterday) recentOrdersCount++;
        switch (o.status) {
          case 'pending':
            pendingOrders++;
            break;
          case 'approved':
            approvedOrders++;
            break;
          case 'delivered':
            deliveredOrders++;
            break;
          case 'failed':
            failedOrders++;
            break;
        }
      }

      const recentPaymentsCount = countBy(
        payments,
        (p) => p.processed_at && p.processed_at >= yesterday
      );
      const publishedGalleries = countBy(events, (e) => e.published);
      const activeEvents = countBy(events, (e) => e.active);

      // Build events summary (top 3 by date)
      const eventsSummary: EventSummary[] = events
        .map((e) => {
          const eventPhotos = photosByEvent.get(e.id) || {
            total: 0,
            lastUpload: null,
          };
          const totalStudents = subjectsByEvent.get(e.id) || 0;
          const baseDate = e.start_date || e.date || e.created_at;
          const statusLower = (e.status || '').toLowerCase();
          let status: EventSummary['status'] = 'planning';
          if (e.published || !e.active) status = 'completed';
          else if (statusLower.includes('process')) status = 'processing';
          else if (e.active && baseDate && new Date(baseDate) <= now)
            status = 'in_progress';

          return {
            id: e.id,
            name: e.name || e.school_name || 'Evento sin nombre',
            location: e.location || e.school_name || null,
            date: baseDate,
            totalStudents,
            photosUploaded: eventPhotos.total,
            expectedPhotos: Math.max(totalStudents, eventPhotos.total),
            status,
          };
        })
        .sort((a, b) => getDateValue(b.date) - getDateValue(a.date))
        .slice(0, 3);

      // Build activity log
      const activityLog: GlobalStats['recent_activity'] = [];
      const recentEvents = events
        .filter(
          (e) =>
            e.created_at &&
            getDateValue(e.created_at) >= getDateValue(yesterday)
        )
        .slice(0, 3);
      for (const e of recentEvents) {
        activityLog.push({
          id: `event-${e.id}`,
          type: 'event_created',
          message: `Nuevo evento: ${e.name || 'Sin nombre'}`,
          timestamp: e.created_at,
        });
      }
      if (todayPhotosCount > 0)
        activityLog.push({
          id: `photos-${requestId}`,
          type: 'photos_uploaded',
          message: `${todayPhotosCount} fotos subidas hoy`,
          timestamp: now.toISOString(),
        });
      if (recentOrdersCount > 0)
        activityLog.push({
          id: `orders-${requestId}`,
          type: 'order_created',
          message: `${recentOrdersCount} pedidos en las últimas 24h`,
          timestamp: now.toISOString(),
        });
      if (recentPaymentsCount > 0)
        activityLog.push({
          id: `payments-${requestId}`,
          type: 'order_completed',
          message: `${recentPaymentsCount} pagos confirmados hoy`,
          timestamp: now.toISOString(),
        });
      if (!activityLog.length)
        activityLog.push({
          id: `empty-${requestId}`,
          type: 'event_created',
          message: 'Sin actividad reciente registrada.',
          timestamp: now.toISOString(),
        });

      const totalPhotos = photos.length;
      const untaggedCount = Math.max(0, totalPhotos - taggedCount);
      const completionRate = totalPhotos
        ? Math.min(100, Math.round((taggedCount / totalPhotos) * 100))
        : 0;
      const avgOrderValue = orders.length
        ? Math.round(totalRevenue / orders.length)
        : 0;

      const stats: GlobalStats = {
        events: {
          total: events.length,
          active: activeEvents,
          completed: events.length - activeEvents,
        },
        photos: {
          total: totalPhotos,
          tagged: taggedCount,
          untagged: untaggedCount,
          uploaded_today: todayPhotosCount,
        },
        subjects: { total: subjects.length, with_tokens: subjectsWithTokens },
        orders: {
          total: orders.length,
          pending: pendingOrders,
          approved: approvedOrders,
          delivered: deliveredOrders,
          failed: failedOrders,
          total_revenue_cents: totalRevenue,
          monthly_revenue_cents: monthlyRevenue,
        },
        storage: {
          photos_count: totalPhotos,
          estimated_size_gb:
            Math.round(((totalPhotos * 0.5) / 1024) * 100) / 100,
        },
        activity: {
          recent_uploads: todayPhotosCount,
          recent_orders: recentOrdersCount,
          recent_payments: recentPaymentsCount,
        },
        system: {
          health_status: 'healthy',
          expired_tokens: Math.min(expiredTokens, 10),
          cache_timestamp: now.toISOString(),
        },
        events_summary: eventsSummary,
        quick_access: {
          lastEvent: eventsSummary[0]?.name || 'Sin eventos activos',
          lastEventDate: eventsSummary[0]?.date || null,
          photosToProcess: Math.max(pendingCount, untaggedCount),
          pendingUploads: todayPhotosCount,
          recentActivity: eventsSummary[0]?.photosUploaded
            ? `${eventsSummary[0].photosUploaded} fotos listas en ${eventsSummary[0].name}`
            : todayPhotosCount
              ? `${todayPhotosCount} fotos subidas hoy`
              : 'Aún no hay actividad registrada.',
        },
        photo_management: {
          totalPhotos,
          processedToday: todayPhotosCount,
          pendingProcessing: Math.max(pendingCount, untaggedCount),
          publishedGalleries,
          lastUploadAt: latestUpload,
        },
        orders_summary: {
          newOrders: recentOrdersCount,
          pendingDelivery: pendingOrders,
          totalRevenueCents: totalRevenue,
          todayOrders: recentOrdersCount,
        },
        business_metrics: {
          monthlyRevenueCents: monthlyRevenue,
          activeClients: subjects.length,
          completionRate,
          avgOrderValueCents: avgOrderValue,
        },
        recent_activity: activityLog,
      };

      const duration = Date.now() - startTime;
      console.log(`[${requestId}] Stats generated in ${duration}ms`);

      const response = NextResponse.json({
        success: true,
        data: stats,
        generated_at: now.toISOString(),
      });
      response.headers.set(
        'Cache-Control',
        'public, max-age=300, stale-while-revalidate=60'
      );
      response.headers.set('X-Request-Id', requestId);
      return response;
    } catch (error: any) {
      console.error(`[${requestId}] Stats error:`, error.message);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500, headers: { 'X-Request-Id': requestId } }
      );
    }
  }, 'admin')
);
