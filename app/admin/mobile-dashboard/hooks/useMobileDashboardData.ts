import { useState, useEffect, useCallback } from 'react';

interface DashboardMetrics {
  totalPhotos: number;
  totalEvents: number;
  pendingOrders: number;
  completedOrders: number;
  uploadSuccessRate: number;
  todayUploads: number;
  todayRevenue: number;
  activeEvents: number;
}

interface RecentActivity {
  id: string;
  type: 'upload' | 'order' | 'event';
  title: string;
  description: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
}

interface MobileDashboardData {
  metrics: DashboardMetrics;
  recentActivity: RecentActivity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMobileDashboardData(): MobileDashboardData {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalPhotos: 0,
    totalEvents: 0,
    pendingOrders: 0,
    completedOrders: 0,
    uploadSuccessRate: 0,
    todayUploads: 0,
    todayRevenue: 0,
    activeEvents: 0,
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Replace with actual API calls
      // For now, simulate API responses
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate different scenarios for testing
      const mockMetrics: DashboardMetrics = {
        totalPhotos: 1247,
        totalEvents: 23,
        pendingOrders: Math.floor(Math.random() * 5) + 1,
        completedOrders: Math.floor(Math.random() * 20) + 10,
        uploadSuccessRate: 95 + Math.random() * 4, // 95-99%
        todayUploads: Math.floor(Math.random() * 50) + 20,
        todayRevenue: Math.floor(Math.random() * 5000) + 2000,
        activeEvents: Math.floor(Math.random() * 3) + 1,
      };

      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'upload',
          title: 'Graduación 2024',
          description: '45 fotos subidas exitosamente',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
          status: 'success',
        },
        {
          id: '2',
          type: 'order',
          title: 'Pedido #1234',
          description: '12 fotos procesadas',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          status: 'success',
        },
        {
          id: '3',
          type: 'event',
          title: 'Nuevo evento creado',
          description: 'Fiesta de Fin de Curso',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
          status: 'pending',
        },
        {
          id: '4',
          type: 'upload',
          title: 'Evento Deportivo',
          description: '23 fotos subidas',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
          status: 'success',
        },
      ];

      setMetrics(mockMetrics);
      setRecentActivity(mockActivity);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  // Auto-refresh when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (!isLoading) {
        fetchMetrics();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchMetrics, isLoading]);

  return {
    metrics,
    recentActivity,
    isLoading,
    error,
    refetch,
  };
}
