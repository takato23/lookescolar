'use client';

import React from 'react';
import { Palette, Camera } from 'lucide-react';
import { LiquidThemeToggle } from '@/components/ui/theme/LiquidThemeToggle';
import { useTheme } from '@/components/providers/theme-provider';

export function AppearanceSettings() {
    const { resolvedTheme } = useTheme();

    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Palette className="h-5 w-5" />
                Apariencia
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="mb-3 block text-xs font-medium text-white">
                        Tema de la Aplicación
                    </label>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <LiquidThemeToggle size="sm" />
                        <p className="mt-2 text-[13px] text-white/70">
                            Actual:{' '}
                            <span className="font-medium capitalize">{resolvedTheme}</span>
                        </p>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Logo del Negocio
                    </label>
                    <div className="rounded-lg border-2 border-dashed border-white/20 p-6 text-center transition-colors hover:border-white/40 hover:bg-white/5">
                        <Camera className="mx-auto mb-2 h-8 w-8 text-white/40" />
                        <p className="mb-2 text-[13px] text-white/70">
                            Arrastra tu logo aquí o haz clic para seleccionar
                        </p>
                        <button className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/20">
                            Seleccionar Archivo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
