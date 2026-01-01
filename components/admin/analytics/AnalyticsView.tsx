'use client';

import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueChart } from '@/components/admin/dashboard/RevenueChart';
import { ActivityChart } from '@/components/admin/dashboard/ActivityChart';
import { HighlightMetric } from '@/components/admin/dashboard/HighlightMetric';
import {
    BarChart3,
    TrendingUp,
    Users,
    ShoppingBag,
    DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AnalyticsView() {
    const { stats, isLoading, error } = useDashboardData();

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex h-96 items-center justify-center text-red-500">
                Error al cargar los datos analíticos.
            </div>
        );
    }

    // Calculate metrics for highlight cards
    const metrics = [
        {
            id: 'total-sales',
            label: 'Ventas Totales',
            value: formatCurrency(stats.totalSales),
            helper: 'Ingresos históricos acumulados',
            icon: DollarSign,
            trend: '+12%', // Mock trend for now
            trendUp: true
        },
        {
            id: 'active-events',
            label: 'Eventos Activos',
            value: stats.activeEvents.toString(),
            helper: 'Eventos publicados actualmente',
            icon: BarChart3,
        },
        {
            id: 'families',
            label: 'Clientes Registrados',
            value: stats.registeredFamilies.toString(),
            helper: 'Base de datos de clientes',
            icon: Users,
        },
        {
            id: 'conversion',
            label: 'Tasa de Conversión',
            value: `${stats.conversionRate.toFixed(1)}%`,
            helper: 'De visita a compra',
            icon: TrendingUp,
        }
    ];

    return (
        <div className="space-y-8 p-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analítica del Negocio</h1>
                <p className="mt-2 text-slate-600 dark:text-slate-400">
                    Visión profunda del rendimiento de tu estudio fotográfico
                </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric, i) => (
                    <HighlightMetric
                        key={metric.id}
                        {...metric}
                        index={i}
                        mode="vibrant" // Force vibrant mode for analytics
                    />
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Ingresos</h2>
                    <RevenueChart data={stats.revenueHistory} />
                </div>
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Actividad</h2>
                    <ActivityChart data={stats.activityHistory} />
                </div>
            </div>

            {/* Detailed breakdowns could go here */}
        </div>
    );
}
