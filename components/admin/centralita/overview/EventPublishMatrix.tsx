'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle,
    Clock,
    AlertCircle,
    ExternalLink,
    Eye,
    FolderOpen
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

interface Folder {
    id: string;
    name: string;
    event_id: string | null;
    photo_count: number;
    is_published: boolean | null;
    published_at: string | null;
    event_name: string | null;
}

interface EventPublishMatrixProps {
    folders: Folder[];
    selectedEventId?: string;
}

export function EventPublishMatrix({ folders, selectedEventId }: EventPublishMatrixProps) {
    const router = useRouter();

    const eventGroups = useMemo(() => {
        const groups = new Map<string, {
            eventId: string;
            eventName: string;
            folders: Folder[];
            published: number;
            unpublished: number;
            totalPhotos: number;
        }>();

        folders.forEach(folder => {
            const eventId = folder.event_id || 'no-event';
            const eventName = folder.event_name || 'Sin evento';

            if (!groups.has(eventId)) {
                groups.set(eventId, {
                    eventId,
                    eventName,
                    folders: [],
                    published: 0,
                    unpublished: 0,
                    totalPhotos: 0
                });
            }

            const group = groups.get(eventId)!;
            group.folders.push(folder);
            group.totalPhotos += folder.photo_count;

            if (folder.is_published) {
                group.published++;
            } else {
                group.unpublished++;
            }
        });

        return Array.from(groups.values()).sort((a, b) =>
            b.totalPhotos - a.totalPhotos
        );
    }, [folders]);

    const getStatusColor = (published: number, total: number) => {
        const rate = total > 0 ? (published / total) * 100 : 0;
        if (rate >= 80) return 'green';
        if (rate >= 50) return 'blue';
        if (rate >= 20) return 'orange';
        return 'red';
    };

    const getStatusIcon = (published: number, total: number) => {
        const rate = total > 0 ? (published / total) * 100 : 0;
        if (rate >= 80) return CheckCircle;
        if (rate >= 20) return Clock;
        return AlertCircle;
    };

    if (eventGroups.length === 0) {
        return (
            <Card className="liquid-glass-intense border-0 shadow-xl">
                <CardContent className="py-12 text-center">
                    <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No hay carpetas disponibles
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Crea carpetas y sube fotos para comenzar
                    </p>
                    <Button onClick={() => router.push('/admin/events')}>
                        Ir a Eventos
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="liquid-glass-intense border-0 shadow-xl overflow-hidden">
            <CardHeader className="relative pb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-50" />

                <div className="relative flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Matriz de Publicación por Evento
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Estado de publicación de carpetas agrupadas por evento
                        </p>
                    </div>
                    <Badge variant="outline" className="border-blue-200 text-blue-700 dark:text-blue-300">
                        {eventGroups.length} {eventGroups.length === 1 ? 'evento' : 'eventos'}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative">
                <div className="space-y-3">
                    {eventGroups.map((group, index) => {
                        const StatusIcon = getStatusIcon(group.published, group.folders.length);
                        const statusColor = getStatusColor(group.published, group.folders.length);
                        const publishRate = group.folders.length > 0
                            ? Math.round((group.published / group.folders.length) * 100)
                            : 0;

                        return (
                            <div
                                key={group.eventId}
                                className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700"
                                style={{
                                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                                }}
                            >
                                {/* Gradient background on hover */}
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className={`flex-shrink-0 rounded-lg p-2.5 ${statusColor === 'green' ? 'bg-green-100 dark:bg-green-950/30' :
                                                    statusColor === 'blue' ? 'bg-blue-100 dark:bg-blue-950/30' :
                                                        statusColor === 'orange' ? 'bg-orange-100 dark:bg-orange-950/30' :
                                                            'bg-red-100 dark:bg-red-950/30'
                                                }`}>
                                                <StatusIcon className={`h-5 w-5 ${statusColor === 'green' ? 'text-green-600 dark:text-green-400' :
                                                        statusColor === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                                            statusColor === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                                                                'text-red-600 dark:text-red-400'
                                                    }`} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-foreground mb-1 truncate">
                                                    {group.eventName}
                                                </h4>
                                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                    <span>{group.folders.length} carpetas</span>
                                                    <span>•</span>
                                                    <span>{group.totalPhotos.toLocaleString()} fotos</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => router.push(`/admin/publish?tab=folders&event_id=${group.eventId}`)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Ver
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => router.push(`/admin/events/${group.eventId}`)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">
                                                Progreso de publicación
                                            </span>
                                            <span className={`font-medium ${statusColor === 'green' ? 'text-green-600 dark:text-green-400' :
                                                    statusColor === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                                                        statusColor === 'orange' ? 'text-orange-600 dark:text-orange-400' :
                                                            'text-red-600 dark:text-red-400'
                                                }`}>
                                                {publishRate}%
                                            </span>
                                        </div>

                                        <div className="relative h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${statusColor === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                                                        statusColor === 'blue' ? 'bg-gradient-to-r from-blue-500 to-cyan-600' :
                                                            statusColor === 'orange' ? 'bg-gradient-to-r from-orange-500 to-amber-600' :
                                                                'bg-gradient-to-r from-red-500 to-rose-600'
                                                    }`}
                                                style={{ width: `${publishRate}%` }}
                                            />
                                        </div>

                                        <div className="flex items-center gap-4 text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                                <span className="text-muted-foreground">
                                                    {group.published} publicadas
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-2 w-2 rounded-full bg-gray-400" />
                                                <span className="text-muted-foreground">
                                                    {group.unpublished} privadas
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
