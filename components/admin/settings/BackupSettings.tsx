'use client';

import React from 'react';
import { Download, Trash2 } from 'lucide-react';

interface BackupSettingsProps {
    formData: {
        autoCleanupPreviews: boolean;
        cleanupPreviewDays: number;
    };
    updateFormData: (updates: Partial<BackupSettingsProps['formData']>) => void;
}

export function BackupSettings({
    formData,
    updateFormData,
}: BackupSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Download className="h-5 w-5" />
                Backup y Exportación
            </h2>

            <div className="space-y-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h4 className="mb-2 font-medium text-white">Exportar Datos</h4>
                    <p className="mb-4 text-[13px] text-white/70">
                        Descarga una copia de todos tus eventos, fotos y pedidos
                    </p>
                    <button className="flex items-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar Todo
                    </button>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <h4 className="mb-2 font-medium text-white">Limpieza Automática</h4>
                    <p className="mb-4 text-[13px] text-white/70">
                        Configurar limpieza automática de previews antiguos
                    </p>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center text-sm text-white">
                            <div className="relative mr-3 inline-flex items-center">
                                <input
                                    type="checkbox"
                                    checked={formData.autoCleanupPreviews}
                                    onChange={(e) =>
                                        updateFormData({
                                            autoCleanupPreviews: e.target.checked,
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
                            Eliminar previews después de 90 días
                        </label>
                    </div>
                </div>

                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-4">
                    <h4 className="mb-2 font-medium text-white">Zona de Peligro</h4>
                    <p className="mb-4 text-[13px] text-white/70">
                        Acciones irreversibles que afectan todos los datos
                    </p>
                    <button className="flex items-center rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Restablecer Sistema
                    </button>
                </div>
            </div>
        </div>
    );
}
