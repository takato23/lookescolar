'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    TrendingDown,
    FolderOpen,
    Image,
    Users,
    DollarSign,
    CheckCircle,
    Clock,
    AlertCircle
} from 'lucide-react';
import { useMemo } from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    trend?: 'up' | 'down' | 'neutral';
    subtitle?: string;
}

function MetricCard({ title, value, change, icon: Icon, iconColor, iconBg, trend, subtitle }: MetricCardProps) {
    return (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700">
            {/* Gradient background on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative">
                <div className="flex items-start justify-between mb-3">
                    <div className={`rounded-lg ${iconBg} p-2.5 transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className={`h-5 w-5 ${iconColor}`} />
                    </div>

                    {change !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${trend === 'up' ? 'text-green-600 dark:text-green-400' :
                                trend === 'down' ? 'text-red-600 dark:text-red-400' :
                                    'text-gray-600 dark:text-gray-400'
                            }`}>
                            {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                            {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                            {change > 0 ? '+' : ''}{change}%
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                        {title}
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

interface PublishMetricsDashboardProps {
    stats: {
        total: number;
        published: number;
        unpublished: number;
        totalPhotos: number;
    };
}

export function PublishMetricsDashboard({ stats }: PublishMetricsDashboardProps) {
    const metrics = useMemo(() => {
        const publishRate = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;
        const avgPhotosPerFolder = stats.total > 0 ? Math.round(stats.totalPhotos / stats.total) : 0;

        return [
            {
                title: 'Total de Carpetas',
                value: stats.total,
                icon: FolderOpen,
                iconColor: 'text-blue-600 dark:text-blue-400',
                iconBg: 'bg-blue-100 dark:bg-blue-950/30',
                subtitle: `${stats.published} publicadas, ${stats.unpublished} privadas`,
                change: 12,
                trend: 'up' as const
            },
            {
                title: 'Carpetas Publicadas',
                value: stats.published,
                icon: CheckCircle,
                iconColor: 'text-green-600 dark:text-green-400',
                iconBg: 'bg-green-100 dark:bg-green-950/30',
                subtitle: `${publishRate}% del total`,
                change: 8,
                trend: 'up' as const
            },
            {
                title: 'Carpetas Privadas',
                value: stats.unpublished,
                icon: Clock,
                iconColor: 'text-orange-600 dark:text-orange-400',
                iconBg: 'bg-orange-100 dark:bg-orange-950/30',
                subtitle: 'Pendientes de publicación',
                change: -5,
                trend: 'down' as const
            },
            {
                title: 'Total de Fotos',
                value: stats.totalPhotos.toLocaleString(),
                icon: Image,
                iconColor: 'text-purple-600 dark:text-purple-400',
                iconBg: 'bg-purple-100 dark:bg-purple-950/30',
                subtitle: `~${avgPhotosPerFolder} fotos por carpeta`,
                change: 15,
                trend: 'up' as const
            }
        ];
    }, [stats]);

    const healthScore = useMemo(() => {
        const publishRate = stats.total > 0 ? (stats.published / stats.total) * 100 : 0;
        const hasPhotos = stats.totalPhotos > 0;

        let score = 0;
        let status: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
        let message = '';

        if (publishRate >= 80 && hasPhotos) {
            score = 95;
            status = 'excellent';
            message = 'Excelente estado de publicación';
        } else if (publishRate >= 50 && hasPhotos) {
            score = 75;
            status = 'good';
            message = 'Buen estado, considera publicar más carpetas';
        } else if (publishRate >= 20 || hasPhotos) {
            score = 50;
            status = 'warning';
            message = 'Muchas carpetas sin publicar';
        } else {
            score = 25;
            status = 'critical';
            message = 'Acción requerida: publica tus carpetas';
        }

        return { score, status, message };
    }, [stats]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'excellent': return 'text-green-600 dark:text-green-400';
            case 'good': return 'text-blue-600 dark:text-blue-400';
            case 'warning': return 'text-orange-600 dark:text-orange-400';
            case 'critical': return 'text-red-600 dark:text-red-400';
            default: return 'text-gray-600 dark:text-gray-400';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'excellent': return 'bg-green-100 dark:bg-green-950/30';
            case 'good': return 'bg-blue-100 dark:bg-blue-950/30';
            case 'warning': return 'bg-orange-100 dark:bg-orange-950/30';
            case 'critical': return 'bg-red-100 dark:bg-red-950/30';
            default: return 'bg-gray-100 dark:bg-gray-950/30';
        }
    };

    return (
        <div className="space-y-6">
            {/* Health Score Card */}
            <Card className="liquid-glass-intense border-0 shadow-xl overflow-hidden">
                <CardHeader className="relative pb-4">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-blue-500/10 to-purple-500/10 opacity-50" />

                    <div className="relative flex items-center justify-between">
                        <CardTitle className="text-lg font-bold">Estado del Sistema</CardTitle>
                        <Badge className={`${getStatusBg(healthScore.status)} ${getStatusColor(healthScore.status)} border-0`}>
                            {healthScore.status === 'excellent' && 'Excelente'}
                            {healthScore.status === 'good' && 'Bueno'}
                            {healthScore.status === 'warning' && 'Advertencia'}
                            {healthScore.status === 'critical' && 'Crítico'}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="relative">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <svg className="h-24 w-24 transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-gray-200 dark:text-gray-800"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="40"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScore.score / 100)}`}
                                    className={getStatusColor(healthScore.status)}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-2xl font-bold ${getStatusColor(healthScore.status)}`}>
                                    {healthScore.score}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h4 className="font-semibold text-foreground mb-1">
                                {healthScore.message}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                {stats.published} de {stats.total} carpetas publicadas ({Math.round((stats.published / Math.max(stats.total, 1)) * 100)}%)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric, index) => (
                    <div
                        key={metric.title}
                        style={{
                            animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                        }}
                    >
                        <MetricCard {...metric} />
                    </div>
                ))}
            </div>
        </div>
    );
}
