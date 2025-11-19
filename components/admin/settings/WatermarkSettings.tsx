'use client';

import React from 'react';
import { ImageIcon } from 'lucide-react';

interface WatermarkSettingsProps {
    formData: {
        watermarkText: string;
        watermarkPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
        watermarkOpacity: number;
        watermarkSize: 'small' | 'medium' | 'large';
    };
    updateFormData: (updates: Partial<WatermarkSettingsProps['formData']>) => void;
}

export function WatermarkSettings({
    formData,
    updateFormData,
}: WatermarkSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <ImageIcon className="h-5 w-5" />
                Marca de Agua
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Texto del Watermark
                    </label>
                    <input
                        type="text"
                        value={formData.watermarkText}
                        onChange={(e) => updateFormData({ watermarkText: e.target.value })}
                        className="input-base"
                        placeholder="Texto que aparecerá en las fotos"
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="mb-2 block text-xs font-medium text-white">
                            Posición
                        </label>
                        <select
                            className="input-base"
                            value={formData.watermarkPosition}
                            onChange={(e) =>
                                updateFormData({
                                    watermarkPosition: e.target.value as any,
                                })
                            }
                        >
                            <option value="bottom-right">Abajo Derecha</option>
                            <option value="bottom-left">Abajo Izquierda</option>
                            <option value="top-right">Arriba Derecha</option>
                            <option value="top-left">Arriba Izquierda</option>
                            <option value="center">Centro</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-white">
                            Opacidad ({formData.watermarkOpacity}%)
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={formData.watermarkOpacity}
                            onChange={(e) =>
                                updateFormData({
                                    watermarkOpacity: Number(e.target.value),
                                })
                            }
                            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-white"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-xs font-medium text-white">
                            Tamaño
                        </label>
                        <select
                            className="input-base"
                            value={formData.watermarkSize}
                            onChange={(e) =>
                                updateFormData({
                                    watermarkSize: e.target.value as any,
                                })
                            }
                        >
                            <option value="small">Pequeño</option>
                            <option value="medium">Mediano</option>
                            <option value="large">Grande</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
