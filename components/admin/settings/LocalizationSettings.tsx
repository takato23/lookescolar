'use client';

import React from 'react';
import { Globe } from 'lucide-react';

interface LocalizationSettingsProps {
    formData: {
        timezone: string;
        dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
        currency: 'ARS' | 'USD' | 'EUR';
        language: 'es' | 'en';
    };
    updateFormData: (updates: Partial<LocalizationSettingsProps['formData']>) => void;
}

export function LocalizationSettings({
    formData,
    updateFormData,
}: LocalizationSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Globe className="h-5 w-5" />
                Localización
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Zona Horaria
                    </label>
                    <select
                        className="input-base"
                        value={formData.timezone}
                        onChange={(e) => updateFormData({ timezone: e.target.value })}
                    >
                        <option value="America/Argentina/Buenos_Aires">
                            Buenos Aires (ART)
                        </option>
                        <option value="America/Argentina/Cordoba">Córdoba (ART)</option>
                        <option value="America/Argentina/Mendoza">Mendoza (ART)</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Formato de Fecha
                    </label>
                    <select
                        className="input-base"
                        value={formData.dateFormat}
                        onChange={(e) =>
                            updateFormData({ dateFormat: e.target.value as any })
                        }
                    >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Moneda
                    </label>
                    <select
                        className="input-base"
                        value={formData.currency}
                        onChange={(e) => updateFormData({ currency: e.target.value as any })}
                    >
                        <option value="ARS">Peso Argentino (ARS)</option>
                        <option value="USD">Dólar (USD)</option>
                        <option value="EUR">Euro (EUR)</option>
                    </select>
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Idioma
                    </label>
                    <select
                        className="input-base"
                        value={formData.language}
                        onChange={(e) => updateFormData({ language: e.target.value as any })}
                    >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
