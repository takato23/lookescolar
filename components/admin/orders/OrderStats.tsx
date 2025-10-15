'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrderStatsProps {
  stats: {
    total: number;
    total_revenue_cents: number;
    by_status: {
      pending: number;
      approved: number;
      delivered: number;
      failed: number;
    };
  };
  orders: Array<{
    created_at: string;
    total_amount_cents: number;
  }>;
}

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(cents / 100);

export default function OrderStats({ stats, orders }: OrderStatsProps) {
  const averageOrderValue =
    orders.length > 0
      ? orders.reduce((acc, order) => acc + order.total_amount_cents, 0) /
        orders.length
      : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(stats.total_revenue_cents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Órdenes entregadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.by_status.delivered}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Ticket promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(averageOrderValue)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
