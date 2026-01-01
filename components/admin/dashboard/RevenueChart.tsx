'use client';

import { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, TrendingUp } from 'lucide-react';

interface RevenueChartProps {
    data: {
        date: string;
        revenue: number;
    }[];
}

export function RevenueChart({ data }: RevenueChartProps) {
    const chartData = useMemo(() => {
        return data.map((item) => ({
            ...item,
            formattedRevenue: item.revenue / 100,
        }));
    }, [data]);

    const isEmpty = !data || data.length === 0;

    // Calcular total de ingresos
    const totalRevenue = useMemo(() => {
        return data.reduce((sum, item) => sum + item.revenue, 0) / 100;
    }, [data]);

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 opacity-10 blur-3xl" />

            {/* Header */}
            <div className="relative mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
                        <DollarSign className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Ingresos Recientes
                        </h3>
                        {!isEmpty && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Total: {formatCurrency(totalRevenue)}
                            </p>
                        )}
                    </div>
                </div>
                {!isEmpty && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                        <TrendingUp className="h-3 w-3" />
                        Últimos 7 días
                    </span>
                )}
            </div>

            {/* Chart */}
            <div className="relative h-[280px] w-full" role="img" aria-label="Gráfico de ingresos recientes">
                {isEmpty ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20">
                            <DollarSign className="h-8 w-8 text-emerald-500" />
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                            Sin datos de ingresos
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Los ingresos aparecerán cuando se registren ventas
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                    <stop offset="50%" stopColor="#14b8a6" stopOpacity={0.15} />
                                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="4 4"
                                vertical={false}
                                stroke="rgba(148, 163, 184, 0.2)"
                            />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip
                                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                    padding: '12px 16px',
                                }}
                                labelStyle={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}
                                itemStyle={{ color: '#10b981', fontWeight: 600 }}
                                formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                            />
                            <Area
                                type="monotone"
                                dataKey="formattedRevenue"
                                stroke="url(#strokeGradient)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenueGradient)"
                                style={{ filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))' }}
                            />
                            <defs>
                                <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#14b8a6" />
                                </linearGradient>
                            </defs>
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
