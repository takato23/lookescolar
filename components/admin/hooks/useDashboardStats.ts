'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

/**
 * @deprecated This hook is deprecated in favor of the new API-based approach.
 * Use DashboardClient component with React Query instead.
 *
 * Performance issues with this hook:
 * - Direct Supabase queries from client component
 * - No intelligent caching beyond 30-second intervals
 * - Multiple parallel queries without batching optimization
 * - Unused imports increasing bundle size
 * - Missing proper error boundaries and loading states
 *
 * Migration path:
 * Replace useDashboardStats() with <DashboardClient /> component
 * which uses /api/admin/dashboard/stats endpoint with React Query caching.
 */

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
  loading: boolean;
  error: string | null;
}

interface Activity {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed';
  message: string;
  timestamp: Date;
  eventId?: string;
  count?: number;
}

export function useDashboardStats(): DashboardStats {
  const [stats, setStats] = useState<DashboardStats>({
    activeEvents: 0,
    totalPhotos: 0,
    registeredFamilies: 0,
    totalSales: 0,
    todayUploads: 0,
    todayOrders: 0,
    todayPayments: 0,
    pendingOrders: 0,
    storageUsed: 0,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
    recentActivity: [],
    loading: true,
    error: null,
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchStats() {
      try {
        // En desarrollo local, evitar llamadas directas a Supabase desde el cliente
        const isLocal =
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1');

        if (isLocal) {
          setStats((prev) => ({
            ...prev,
            activeEvents: 0,
            totalPhotos: 0,
            registeredFamilies: 0,
            totalSales: 0,
            todayUploads: 0,
            todayOrders: 0,
            todayPayments: 0,
            pendingOrders: 0,
            storageUsed: 0,
            loading: false,
            error: null,
          }));
          return;
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Fetch all data in parallel
        const [
          eventsResult,
          photosResult,
          subjectsResult,
          ordersCompletedAllResult,
          todayPhotosResult,
          pendingOrdersResult,
          todayOrdersResult,
          todayPaymentsResult,
        ] = await Promise.all([
          supabase.from('events').select('id').eq('status', 'active'),
          supabase.from('photos').select('id, file_size'),
          supabase
            .from('subjects')
            .select('id')
            .not('access_token', 'is', null),
          supabase
            .from('orders')
            .select('total_amount')
            .eq('status', 'completed'),
          supabase.from('photos').select('id').gte('created_at', today),
          supabase.from('orders').select('id').eq('status', 'pending'),
          supabase.from('orders').select('id').gte('created_at', today),
          supabase
            .from('orders')
            .select('total_amount')
            .eq('status', 'completed')
            .gte('created_at', today),
        ]);

        // Calculate stats
        const activeEvents = eventsResult.data?.length || 0;
        const totalPhotos = photosResult.data?.length || 0;
        const registeredFamilies = subjectsResult.data?.length || 0;
        const totalSales =
          ordersCompletedAllResult.data?.reduce(
            (sum, order) => sum + (order.total_amount || 0),
            0
          ) || 0;
        const todayUploads = todayPhotosResult.data?.length || 0;
        const pendingOrders = pendingOrdersResult.data?.length || 0;
        const todayOrders = todayOrdersResult.data?.length || 0;
        const todayPayments =
          todayPaymentsResult.data?.reduce(
            (sum, order) => sum + (order.total_amount || 0),
            0
          ) || 0;

        // Calculate storage used
        const storageUsed =
          photosResult.data?.reduce(
            (sum, photo) => sum + (photo.file_size || 0),
            0
          ) || 0;

        // Generate recent activity
        const recentActivity: Activity[] = [];

        if (todayUploads > 0) {
          recentActivity.push({
            id: 'today_uploads',
            type: 'photos_uploaded',
            message: `${todayUploads} fotos subidas hoy`,
            timestamp: new Date(),
            count: todayUploads,
          });
        }

        if (pendingOrders > 0) {
          recentActivity.push({
            id: 'pending_orders',
            type: 'order_created',
            message: `${pendingOrders} pedidos pendientes de entrega`,
            timestamp: new Date(),
            count: pendingOrders,
          });
        }

        if (activeEvents > 0) {
          recentActivity.push({
            id: 'active_events',
            type: 'event_created',
            message: `${activeEvents} eventos activos`,
            timestamp: new Date(),
            count: activeEvents,
          });
        }

        setStats({
          activeEvents,
          totalPhotos,
          registeredFamilies,
          totalSales,
          todayUploads,
          todayOrders,
          todayPayments,
          pendingOrders,
          storageUsed,
          storageLimit: 5 * 1024 * 1024 * 1024, // 5GB
          recentActivity: recentActivity.slice(0, 5), // Limit to 5 items
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error(
          '[Service] Error obteniendo estadísticas del dashboard:',
          error
        );
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: 'Error al cargar estadísticas',
        }));
      }
    }

    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [supabase]);

  return stats;
}
