'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActivityItemProps {
    activity: {
        id: string;
        message: string;
        timestamp: string;
        type: string;
    };
    index: number;
    isLast: boolean;
}

export const ActivityItem = React.memo(function ActivityItem({ activity, index, isLast }: ActivityItemProps) {
    const formatTimeAgo = (timestamp: string) => {
        const created = new Date(timestamp);
        const diffMinutes = Math.floor((Date.now() - created.getTime()) / (1000 * 60));

        if (diffMinutes < 1) return 'Hace unos segundos';
        if (diffMinutes === 1) return 'Hace 1 minuto';
        if (diffMinutes < 60) return `Hace ${diffMinutes} minutos`;
        const hours = Math.floor(diffMinutes / 60);
        if (hours === 1) return 'Hace 1 hora';
        if (hours < 24) return `Hace ${hours} horas`;
        return created.toLocaleDateString('es-AR');
    };

    return (
        <div
            className="liquid-glass group relative flex items-start gap-3 overflow-hidden rounded-xl p-3.5 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
            style={{ animationDelay: `${index * 100}ms` }}
        >
            {/* Timeline dot */}
            <div className="relative mt-1.5 flex-shrink-0">
                <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/50"></div>
                <div className="relative h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-500"></div>
            </div>

            {/* Activity icon */}
            <div className="flex-shrink-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-2">
                <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight text-slate-900 dark:text-white">
                    {activity.message}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {formatTimeAgo(activity.timestamp)}
                </p>
            </div>
        </div>
    );
});
