'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OrderStats from '@/components/admin/orders/OrderStats';

interface Order {
  id: string;
  status: string;
  created_at: string;
  total_amount_cents: number;
  event?: {
    name: string;
    school: string;
  } | null;
}

interface OrderStatsData {
  total: number;
  by_status: {
    pending: number;
    approved: number;
    delivered: number;
    failed: number;
  };
  total_revenue_cents: number;
}

export default function OrderStatsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrderStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/orders');
      if (!response.ok) {
        throw new Error('Error cargando estadísticas');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderStats();
  }, []);

  return (
    <div className="gradient-mesh min-h-screen">
      <div className="container mx-auto space-y-8 px-6 py-8">
        {/* Header with Breadcrumbs */}
        <div className="relative animate-fade-in">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500/10 to-secondary-500/10 blur-3xl" />
          <div className="relative">
            {/* Breadcrumbs */}
            <nav className="text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2 text-sm">
              <Link
                href="/admin"
                className="flex items-center gap-1 transition-colors hover:text-primary-600"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <span>/</span>
              <Link
                href="/admin/orders"
                className="transition-colors hover:text-primary-600"
              >
                Pedidos
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Estadísticas</span>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/admin/orders">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-gradient-primary mb-2 text-3xl font-bold md:text-4xl">
                  Estadísticas de Pedidos
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  Análisis detallado de ventas y rendimiento
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Content */}
        <Card
          variant="glass"
          className="noise animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <CardContent className="p-8">
            {loading ? (
              <div className="space-y-6">
                {/* Loading skeleton for stats */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} variant="glass" className="animate-pulse p-6">
                      <div className="mb-3 h-4 w-1/2 rounded bg-gray-300 dark:bg-gray-600"></div>
                      <div className="mb-2 h-8 w-3/4 rounded bg-gray-300 dark:bg-gray-600"></div>
                      <div className="h-3 w-full rounded bg-gray-300 dark:bg-gray-600"></div>
                    </Card>
                  ))}
                </div>

                {/* Loading skeleton for charts */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {[1, 2].map((i) => (
                    <Card key={i} variant="glass" className="animate-pulse p-6">
                      <div className="mb-4 h-6 w-1/3 rounded bg-gray-300 dark:bg-gray-600"></div>
                      <div className="space-y-3">
                        {[1, 2, 3].map((j) => (
                          <div
                            key={j}
                            className="h-16 rounded bg-gray-300 dark:bg-gray-600"
                          ></div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : error ? (
              <Card variant="glass" className="border-red-500/20 bg-red-500/5">
                <CardContent className="p-6 text-center">
                  <div className="space-y-4">
                    <BarChart3 className="mx-auto h-12 w-12 text-red-600" />
                    <div>
                      <h3 className="mb-1 font-medium text-red-800">
                        Error cargando estadísticas
                      </h3>
                      <p className="mb-4 text-sm text-red-700">{error}</p>
                      <Button
                        onClick={loadOrderStats}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Reintentar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : stats && orders.length > 0 ? (
              <OrderStats stats={stats} orders={orders} />
            ) : (
              <Card variant="glass" className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <BarChart3 className="text-gray-500 dark:text-gray-400 h-16 w-16" />
                  <div>
                    <h3 className="text-foreground mb-2 text-xl font-semibold">
                      No hay datos para mostrar
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Aún no hay pedidos registrados en el sistema
                    </p>
                    <Link href="/admin/orders">
                      <Button variant="outline">Ver Pedidos</Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
