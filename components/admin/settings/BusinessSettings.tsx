'use client';

import React from 'react';
import { Building2 } from 'lucide-react';

interface BusinessSettingsProps {
    formData: {
        businessName: string;
        businessEmail: string;
        businessPhone: string;
        businessAddress: string;
        businessWebsite: string;
    };
    updateFormData: (updates: Partial<BusinessSettingsProps['formData']>) => void;
}

export function BusinessSettings({
    formData,
    updateFormData,
}: BusinessSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Building2 className="h-5 w-5" />
                Información del Negocio
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Nombre del Negocio
                    </label>
                    <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => updateFormData({ businessName: e.target.value })}
                        className="input-base"
                        placeholder="Ingresa el nombre de tu negocio"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Email de Contacto
                    </label>
                    <input
                        type="email"
                        value={formData.businessEmail || ''}
                        onChange={(e) => updateFormData({ businessEmail: e.target.value })}
                        className="input-base"
                        placeholder="email@ejemplo.com"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        value={formData.businessPhone || ''}
                        onChange={(e) => updateFormData({ businessPhone: e.target.value })}
                        className="input-base"
                        placeholder="+54 11 1234-5678"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Sitio Web
                    </label>
                    <input
                        type="url"
                        value={formData.businessWebsite || ''}
                        onChange={(e) => updateFormData({ businessWebsite: e.target.value })}
                        className="input-base"
                        placeholder="https://ejemplo.com"
                    />
                </div>
            </div>

            <div>
                <label className="mb-2 block text-xs font-medium text-white">
                    Dirección
                </label>
                <textarea
                    rows={3}
                    value={formData.businessAddress || ''}
                    onChange={(e) => updateFormData({ businessAddress: e.target.value })}
                    className="input-base resize-none"
                    placeholder="Dirección completa del estudio"
                />
            </div>
        </div>
    );
}
