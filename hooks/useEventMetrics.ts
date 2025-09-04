/**
 * 📊 useEventMetrics - Hook para métricas del evento
 * 
 * Obtiene estadísticas clave del evento para dashboard estilo PixieSet
 * Reutilizable entre EventPhotoManager y otros componentes
 */

'use client';

import { useState, useEffect } from 'react';

export interface EventMetrics {
  photos: {
    total: number;
    approved: number;
    pending: number;
    views: number;
  };
  folders: {
    total: number;
    withPhotos: number;
    familyFolders: number;
  };
  sales: {
    totalRevenue: number;
    orderCount: number;
    pendingOrders: number;
    avgOrderValue: number;
  };
  engagement: {
    uniqueVisitors: number;
    downloads: number;
    shares: number;
    favoriteCount: number;
  };
}

interface UseEventMetricsOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseEventMetricsReturn {
  metrics: EventMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEventMetrics(
  eventId: string, 
  options: UseEventMetricsOptions = {}
): UseEventMetricsReturn {
  const { refreshInterval, enabled = true } = options;
  
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    if (!enabled || !eventId) return;
    
    try {
      setError(null);
      
      // Fetch event stats (maps to metrics shape). Prefer stats endpoint.
      const response = await fetch(`/api/admin/events/${eventId}/stats`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      
      const data = await response.json();

      // Support both potential shapes: { success, metrics } or { stats }
      if (data?.success && data?.metrics) {
        setMetrics(data.metrics as EventMetrics);
      } else if (data?.stats) {
        const s = data.stats as any;
        const mapped: EventMetrics = {
          photos: {
            total: Number(s.total_photos ?? 0),
            approved: Number(s.approved_photos ?? 0),
            pending: Math.max(
              0,
              Number(s.total_photos ?? 0) - Number(s.approved_photos ?? 0) - Number(s.processing_photos ?? 0)
            ),
            // Not tracked yet per event
            views: Number(s.recent_activity?.new_photos ?? 0),
          },
          folders: {
            total: Number(s.total_levels ?? 0) + Number(s.total_courses ?? 0),
            withPhotos: Number(s.processing_photos ?? 0) + Number(s.approved_photos ?? 0) > 0 ? 1 : 0,
            familyFolders: 0,
          },
          sales: {
            // Keep values in cents to match UI formatting logic
            totalRevenue: Number(s.total_revenue_cents ?? 0),
            orderCount: Number(s.total_orders ?? 0),
            pendingOrders: Number(s.pending_orders ?? 0),
            avgOrderValue: Number(s.avg_order_value_cents ?? 0),
          },
          engagement: {
            uniqueVisitors: 0,
            downloads: 0,
            shares: 0,
            favoriteCount: 0,
          },
        };
        setMetrics(mapped);
      } else {
        throw new Error(data?.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Error fetching event metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback data para desarrollo
      setMetrics({
        photos: {
          total: 0,
          approved: 0,
          pending: 0,
          views: 0,
        },
        folders: {
          total: 0,
          withPhotos: 0,
          familyFolders: 0,
        },
        sales: {
          totalRevenue: 0,
          orderCount: 0,
          pendingOrders: 0,
          avgOrderValue: 0,
        },
        engagement: {
          uniqueVisitors: 0,
          downloads: 0,
          shares: 0,
          favoriteCount: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    setLoading(true);
    fetchMetrics();
  };

  useEffect(() => {
    fetchMetrics();
  }, [eventId, enabled]);

  // Auto-refresh si se especifica intervalo
  useEffect(() => {
    if (!refreshInterval || !enabled) return;
    
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, enabled, eventId]);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}

export default useEventMetrics;
