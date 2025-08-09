'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatsCard,
} from '@/components/ui/card';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Camera,
} from 'lucide-react';

interface OrderStatsProps {
  stats: {
    total: number;
    by_status: {
      pending: number;
      approved: number;
      delivered: number;
      failed: number;
    };
    total_revenue_cents: number;
  };
  orders: Array<{
    id: string;
    status: string;
    created_at: string;
    total_amount_cents: number;
    event?: {
      name: string;
      school: string;
    } | null;
  }>;
}

export default function OrderStats({ stats, orders }: OrderStatsProps) {
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Calculate additional metrics
  const conversionRate =
    stats.total > 0
      ? ((stats.by_status.approved + stats.by_status.delivered) / stats.total) *
        100
      : 0;

  const averageOrderValue =
    stats.by_status.approved + stats.by_status.delivered > 0
      ? stats.total_revenue_cents /
        (stats.by_status.approved + stats.by_status.delivered)
      : 0;

  // Calculate recent trends (last 7 days vs previous 7 days)
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentOrders = orders.filter(
    (order) => new Date(order.created_at) > last7Days
  );
  const previousOrders = orders.filter((order) => {
    const date = new Date(order.created_at);
    return date > last14Days && date <= last7Days;
  });

  const recentRevenue = recentOrders
    .filter((o) => ['approved', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + o.total_amount_cents, 0);

  const previousRevenue = previousOrders
    .filter((o) => ['approved', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + o.total_amount_cents, 0);

  const revenueTrend =
    previousRevenue > 0
      ? ((recentRevenue - previousRevenue) / previousRevenue) * 100
      : recentRevenue > 0
        ? 100
        : 0;

  // Get unique events and schools
  const uniqueEvents = new Set(
    orders.filter((o) => o.event).map((o) => o.event!.name)
  );
  const uniqueSchools = new Set(
    orders.filter((o) => o.event).map((o) => o.event!.school)
  );

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Pedidos"
          value={stats.total}
          description="Todos los pedidos"
          icon={<Package className="h-5 w-5" />}
          variant="glass"
          noise
        />

        <StatsCard
          title="Pendientes"
          value={stats.by_status.pending}
          description={`${((stats.by_status.pending / stats.total) * 100 || 0).toFixed(1)}% del total`}
          icon={<Clock className="h-5 w-5" />}
          variant="glass"
          noise
        />

        <StatsCard
          title="Entregados"
          value={stats.by_status.delivered}
          description={`${((stats.by_status.delivered / stats.total) * 100 || 0).toFixed(1)}% del total`}
          icon={<CheckCircle className="h-5 w-5" />}
          variant="glass"
          noise
        />

        <StatsCard
          title="Ingresos"
          value={formatPrice(stats.total_revenue_cents)}
          description="Aprobados y entregados"
          trend={
            revenueTrend > 0 ? 'up' : revenueTrend < 0 ? 'down' : 'neutral'
          }
          trendValue={`${revenueTrend > 0 ? '+' : ''}${revenueTrend.toFixed(1)}%`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="glass"
          noise
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary-50 p-2 text-primary-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Tasa Conversión
              </p>
              <p className="text-foreground text-lg font-bold">
                {conversionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Valor Promedio
              </p>
              <p className="text-foreground text-lg font-bold">
                {formatPrice(averageOrderValue)}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Eventos
              </p>
              <p className="text-foreground text-lg font-bold">
                {uniqueEvents.size}
              </p>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Colegios
              </p>
              <p className="text-foreground text-lg font-bold">
                {uniqueSchools.size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Distribución por Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status bars */}
            <div className="space-y-3">
              {[
                {
                  key: 'approved',
                  label: 'Pagados',
                  count: stats.by_status.approved,
                  color: 'bg-emerald-500',
                  bgColor: 'bg-emerald-500/10',
                },
                {
                  key: 'delivered',
                  label: 'Entregados',
                  count: stats.by_status.delivered,
                  color: 'bg-blue-500',
                  bgColor: 'bg-blue-500/10',
                },
                {
                  key: 'pending',
                  label: 'Pendientes',
                  count: stats.by_status.pending,
                  color: 'bg-yellow-500',
                  bgColor: 'bg-yellow-500/10',
                },
                {
                  key: 'failed',
                  label: 'Fallidos',
                  count: stats.by_status.failed,
                  color: 'bg-red-500',
                  bgColor: 'bg-red-500/10',
                },
              ].map((status) => {
                const percentage =
                  stats.total > 0 ? (status.count / stats.total) * 100 : 0;
                return (
                  <div key={status.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground text-sm font-medium">
                        {status.label}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {status.count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div
                      className={`h-2 w-full rounded-full ${status.bgColor}`}
                    >
                      <div
                        className={`h-full rounded-full ${status.color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg bg-surface/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      order.status === 'approved'
                        ? 'bg-emerald-500'
                        : order.status === 'delivered'
                          ? 'bg-blue-500'
                          : order.status === 'pending'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium">#{order.id.slice(-8)}</p>
                    <p className="text-muted-foreground text-xs">
                      {order.event?.name} - {order.event?.school}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {formatPrice(order.total_amount_cents)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(order.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
            ))}

            {orders.length === 0 && (
              <div className="text-muted-foreground py-8 text-center">
                <Package className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No hay pedidos recientes</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
