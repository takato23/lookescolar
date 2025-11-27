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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign } from 'lucide-react';

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
            formattedRevenue: item.revenue / 100, // Convert cents to dollars
        }));
    }, [data]);

    const isEmpty = !data || data.length === 0;

    return (
        <Card className="liquid-glass-intense border border-white/10 bg-black/20 shadow-xl backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="text-lg font-medium text-slate-100">
                    Ingresos Recientes
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    {isEmpty ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
                                <DollarSign className="h-8 w-8 text-slate-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-400">
                                Sin datos de ingresos
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
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
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#d4af37" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="rgba(255,255,255,0.1)"
                                />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickFormatter={(value) => `$${value}`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)',
                                        color: '#f1f5f9'
                                    }}
                                    itemStyle={{ color: '#e2e8f0' }}
                                    formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="formattedRevenue"
                                    stroke="#d4af37"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
