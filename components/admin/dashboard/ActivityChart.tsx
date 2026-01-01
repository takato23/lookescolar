'use client';

import { useMemo } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { Activity, Camera, ShoppingBag } from 'lucide-react';

interface ActivityChartProps {
    data: {
        date: string;
        uploads: number;
        orders: number;
    }[];
}

export function ActivityChart({ data }: ActivityChartProps) {
    const isEmpty = !data || data.length === 0;

    // Calcular totales
    const totals = useMemo(() => {
        return data.reduce(
            (acc, item) => ({
                uploads: acc.uploads + item.uploads,
                orders: acc.orders + item.orders,
            }),
            { uploads: 0, orders: 0 }
        );
    }, [data]);

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-lg transition-all duration-300 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5" />
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 opacity-10 blur-3xl" />

            {/* Header */}
            <div className="relative mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                        <Activity className="h-5 w-5 text-white" strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Actividad Diaria
                        </h3>
                        {!isEmpty && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {totals.uploads} fotos · {totals.orders} pedidos
                            </p>
                        )}
                    </div>
                </div>
                {!isEmpty && (
                    <div className="flex gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                            <Camera className="h-3 w-3" />
                            Fotos
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
                            <ShoppingBag className="h-3 w-3" />
                            Pedidos
                        </span>
                    </div>
                )}
            </div>

            {/* Chart */}
            <div className="relative h-[280px] w-full" role="img" aria-label="Gráfico de actividad diaria - fotos subidas y pedidos">
                {isEmpty ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-center dark:border-slate-700 dark:bg-slate-800/30">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20">
                            <Activity className="h-8 w-8 text-violet-500" />
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                            Sin datos de actividad
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            La actividad aparecerá cuando subas fotos o recibas pedidos
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="uploadBarGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                                </linearGradient>
                                <linearGradient id="orderBarGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0.8} />
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
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(139, 92, 246, 0.08)', radius: 8 }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                    padding: '12px 16px',
                                }}
                                labelStyle={{ color: '#94a3b8', fontSize: 12, marginBottom: 4 }}
                            />
                            <Bar
                                dataKey="uploads"
                                name="Fotos Subidas"
                                fill="url(#uploadBarGradient)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={32}
                            />
                            <Bar
                                dataKey="orders"
                                name="Pedidos"
                                fill="url(#orderBarGradient)"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={32}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
