'use client';

import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Tipos para las respuestas de las APIs
interface DashboardStats {
  activeEvents: number;
  totalPhotos: number;
  registeredFamilies: number;
  totalSales: number;
  todayUploads: number;
  pendingOrders: number;
  storageUsed: number;
  storageLimit: number;
  conversionRate: number;
  recentActivity?: Activity[];
  systemStatus: 'healthy' | 'warning' | 'critical';
}

interface Event {
  id: string;
  name: string;
  school: string;
  date: string;
  status: 'draft' | 'active' | 'completed';
  stats?: {
    totalPhotos: number;
    totalSubjects: number;
    totalOrders: number;
    revenue: number;
  };
}

interface Order {
  id: string;
  event_id: string;
  subject_id: string;
  status: 'pending' | 'paid' | 'delivered';
  total_amount: number;
  items_count: number;
  created_at: string;
  subject: {
    name: string;
  };
  event: {
    name: string;
    school: string;
  };
}

interface Activity {
  id: string;
  type:
    | 'event_created'
    | 'photos_uploaded'
    | 'order_created'
    | 'order_completed'
    | 'subject_created';
  message: string;
  timestamp: string;
  event_id?: string;
  event_name?: string;
  count?: number;
  user?: string;
}

interface PerformanceMetrics {
  storage: {
    used: number;
    limit: number;
    percentage: number;
  };
  system: {
    status: 'healthy' | 'warning' | 'critical';
    alerts: Array<{
      id: string;
      type: 'storage' | 'performance' | 'security';
      message: string;
      severity: 'info' | 'warning' | 'critical';
    }>;
  };
  conversions: {
    viewToCart: number;
    cartToPayment: number;
    overall: number;
  };
  apiMetrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  };
}

// Fetcher function para APIs
const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error = new Error('Failed to fetch');
    error.message = `HTTP ${res.status}: ${res.statusText}`;
    throw error;
  }

  return res.json();
};

// Transform API stats response to match DashboardStats interface
const transformStatsResponse = (apiResponse: any): DashboardStats => {
  const data = apiResponse.data;

  const base: DashboardStats = {
    activeEvents: data.events?.active || 0,
    totalPhotos: data.photos?.total || 0,
    registeredFamilies: data.subjects?.total || 0,
    totalSales: data.orders?.total_revenue_cents
      ? data.orders.total_revenue_cents / 100
      : 0,
    todayUploads: data.photos?.uploaded_today || 0,
    pendingOrders: data.orders?.pending || 0,
    storageUsed: data.storage?.estimated_size_gb
      ? data.storage.estimated_size_gb * 1024 * 1024 * 1024
      : 0,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB limit
    conversionRate:
      data.orders?.total > 0
        ? (data.orders.approved / data.orders.total) * 100
        : 0,
    systemStatus: data.system?.health_status || 'healthy',
  };

  // Map recent activity list if provided by API
  const rawActivities = data.recent_activity as
    | Array<{
        id: string;
        type: Activity['type'];
        message: string;
        timestamp: string;
        event_name?: string;
        count?: number;
      }>
    | undefined;
  if (rawActivities && Array.isArray(rawActivities)) {
    base.recentActivity = rawActivities.map((a) => ({
      id: a.id,
      type: a.type,
      message: a.message,
      timestamp: a.timestamp,
      event_name: a.event_name,
      count: a.count,
    }));
  }

  return base;
};

// Hook principal
export function useDashboardData(refreshInterval: number = 5 * 60 * 1000) {
  // 5 minutos por defecto
  const queryClient = useQueryClient();

  // Definir las queries: consolidado en stats (1 query)
  const queries = useQueries({
    queries: [
      {
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
          const response = await fetcher('/api/admin/stats');
          return transformStatsResponse(response);
        },
        refetchInterval: refreshInterval,
        staleTime: 30000, // 30 segundos
        refetchOnWindowFocus: true,
      },
    ],
  });

  // Extraer datos de las queries
  const [statsQuery] = queries;

  // Estados combinados
  const isLoading = queries.some((query) => query.isLoading);
  const hasError = queries.some((query) => query.error);

  // Función para refrescar todos los datos
  const refreshAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
    ]);
  }, [queryClient]);

  // Función para refrescar solo datos críticos
  const refreshCritical = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
    ]);
  }, [queryClient]);

  // Optimistic updates para operaciones comunes
  const optimisticUpdateStats = useCallback(
    (updates: Partial<DashboardStats>) => {
      queryClient.setQueryData(
        ['admin', 'stats'],
        (old: DashboardStats | undefined) =>
          old ? { ...old, ...updates } : undefined
      );
    },
    [queryClient]
  );

  return {
    // Datos
    stats: statsQuery.data || null,
    activity: statsQuery.data?.recentActivity || [],
    performance:
      statsQuery.data
        ? {
            storage: {
              used: statsQuery.data.storageUsed,
              limit: statsQuery.data.storageLimit,
              percentage:
                statsQuery.data.storageLimit > 0
                  ? (statsQuery.data.storageUsed / statsQuery.data.storageLimit) * 100
                  : 0,
            },
            system: {
              status: statsQuery.data.systemStatus,
              alerts: [],
            },
            conversions: {
              viewToCart: 0,
              cartToPayment: statsQuery.data.conversionRate,
              overall: statsQuery.data.conversionRate,
            },
            apiMetrics: {
              responseTime: 0,
              errorRate: 0,
              throughput: 0,
            },
          }
        : null,

    // Estados de carga
    isLoading,
    statsLoading: statsQuery.isLoading,
    activityLoading: statsQuery.isLoading,
    performanceLoading: statsQuery.isLoading,

    // Estados de primera carga
    isInitialLoading: queries.some(
      (query) => query.isLoading && query.fetchStatus === 'fetching'
    ),

    // Errores
    error: hasError,
    statsError: statsQuery.error,
    performanceError: undefined,

    // Funciones de control
    refreshAll,
    refreshCritical,
    optimisticUpdateStats,

    // Mutators individuales para optimizaciones específicas
    refetchStats: statsQuery.refetch,
    refetchPerformance: statsQuery.refetch,
  };
}

// Hook específico para stats con polling más agresivo
export function useDashboardStatsOnly(refreshInterval: number = 30 * 1000) {
  // 30 segundos
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await fetcher('/api/admin/stats');
      return transformStatsResponse(response);
    },
    refetchInterval: refreshInterval,
    staleTime: 10000, // 10 segundos
    refetchOnWindowFocus: true,
  });
}

// Hook para activity feed con auto-refresh más frecuente
export function useActivityFeed(refreshInterval: number = 60 * 1000) {
  // 1 minuto
  return useQuery<Activity[]>({
    queryKey: ['admin', 'activity'],
    queryFn: () => fetcher('/api/admin/activity?limit=20'),
    refetchInterval: refreshInterval,
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: true,
  });
}
