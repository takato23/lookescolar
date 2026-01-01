'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Zap,
    QrCode,
    Send,
    Download,
    Upload,
    FolderOpen,
    Users,
    Settings
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface PublishCommandCenterProps {
    eventId?: string;
    onQuickAction?: (action: string) => void;
}

export function PublishCommandCenter({ eventId, onQuickAction }: PublishCommandCenterProps) {
    const router = useRouter();

    const quickActions = [
        {
            id: 'publish-all',
            title: 'Publicar Todo',
            description: 'Publicar todas las carpetas pendientes',
            icon: Upload,
            color: 'from-emerald-500 to-teal-600',
            iconBg: 'bg-emerald-100 dark:bg-emerald-950/30',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            action: () => {
                toast.info('Función de publicación masiva próximamente');
                onQuickAction?.('publish-all');
            }
        },
        {
            id: 'generate-qr',
            title: 'Generar QR Codes',
            description: 'Crear códigos QR para clientes',
            icon: QrCode,
            color: 'from-purple-500 to-pink-600',
            iconBg: 'bg-purple-100 dark:bg-purple-950/30',
            iconColor: 'text-purple-600 dark:text-purple-400',
            action: () => {
                if (eventId) {
                    router.push(`/admin/events/${eventId}?action=generate-qr`);
                } else {
                    toast.error('Selecciona un evento primero');
                }
            }
        },
        {
            id: 'notify-families',
            title: 'Notificar Clientes',
            description: 'Enviar notificaciones por WhatsApp',
            icon: Send,
            color: 'from-blue-500 to-cyan-600',
            iconBg: 'bg-blue-100 dark:bg-blue-950/30',
            iconColor: 'text-blue-600 dark:text-blue-400',
            action: () => {
                toast.info('Sistema de notificaciones próximamente');
                onQuickAction?.('notify-families');
            }
        },
        {
            id: 'export-data',
            title: 'Exportar Datos',
            description: 'Descargar reporte completo',
            icon: Download,
            color: 'from-orange-500 to-red-600',
            iconBg: 'bg-orange-100 dark:bg-orange-950/30',
            iconColor: 'text-orange-600 dark:text-orange-400',
            action: () => {
                toast.info('Exportación de datos próximamente');
                onQuickAction?.('export-data');
            }
        }
    ];

    return (
        <Card className="liquid-glass-intense border-0 shadow-xl overflow-hidden">
            <CardHeader className="relative pb-4">
                {/* Background gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-cyan-500/10 opacity-50" />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 p-2.5 shadow-lg">
                            <Zap className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                                Centro de Comando
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Acciones rápidas para gestión de publicación
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-purple-200 text-purple-700 dark:text-purple-300">
                        4 acciones
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="relative">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quickActions.map((action, index) => (
                        <button
                            key={action.id}
                            onClick={action.action}
                            className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700"
                            style={{
                                animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`
                            }}
                        >
                            {/* Gradient background on hover */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                            <div className="relative flex items-start gap-3">
                                <div className={`flex-shrink-0 rounded-lg ${action.iconBg} p-2.5 transition-transform duration-300 group-hover:scale-110`}>
                                    <action.icon className={`h-5 w-5 ${action.iconColor}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-foreground mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {action.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {action.description}
                                    </p>
                                </div>

                                {/* Arrow indicator */}
                                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="rounded-full bg-purple-100 dark:bg-purple-950/30 p-1">
                                        <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Additional quick links */}
                <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/publish?tab=folders${eventId ? `&event_id=${eventId}` : ''}`)}
                            className="text-xs"
                        >
                            <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                            Ver Carpetas
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/publish?tab=public${eventId ? `&event_id=${eventId}` : ''}`)}
                            className="text-xs"
                        >
                            <Users className="mr-1.5 h-3.5 w-3.5" />
                            Galería Pública
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/publish?tab=settings${eventId ? `&event_id=${eventId}` : ''}`)}
                            className="text-xs"
                        >
                            <Settings className="mr-1.5 h-3.5 w-3.5" />
                            Configuración
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
