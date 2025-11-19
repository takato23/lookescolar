'use client';

import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationSettingsProps {
    formData: {
        notifyNewOrders: boolean;
        notifyPayments: boolean;
        notifyWeeklyReport: boolean;
        notifyStorageAlerts: boolean;
    };
    updateFormData: (updates: Partial<NotificationSettingsProps['formData']>) => void;
}

const NOTIFICATIONS = [
    {
        id: 'notifyNewOrders',
        label: 'Nuevos pedidos',
        desc: 'Email cuando hay un pedido nuevo',
    },
    {
        id: 'notifyPayments',
        label: 'Pagos confirmados',
        desc: 'Email cuando se confirma un pago',
    },
    {
        id: 'notifyWeeklyReport',
        label: 'Reporte semanal',
        desc: 'Resumen de actividad cada domingo',
    },
    {
        id: 'notifyStorageAlerts',
        label: 'Alertas de almacenamiento',
        desc: 'Notificar cuando el storage esté lleno',
    },
] as const;

export function NotificationSettings({
    formData,
    updateFormData,
}: NotificationSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Bell className="h-5 w-5" />
                Notificaciones
            </h2>

            <div className="space-y-4">
                {NOTIFICATIONS.map((notification) => (
                    <div
                        key={notification.id}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
                    >
                        <div>
                            <h4 className="font-medium text-white">{notification.label}</h4>
                            <p className="text-[13px] text-white/70">{notification.desc}</p>
                        </div>
                        <div className="relative inline-flex items-center">
                            <input
                                type="checkbox"
                                checked={formData[notification.id]}
                                onChange={(e) =>
                                    updateFormData({
                                        [notification.id]: e.target.checked,
                                    })
                                }
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/30 bg-white/10 checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            <svg
                                className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
