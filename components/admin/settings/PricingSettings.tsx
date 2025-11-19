'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';

interface PricingSettingsProps {
    formData: {
        defaultPhotoPriceArs: number;
        bulkDiscountPercentage: number;
        bulkDiscountMinimum: number;
        packPriceArs: number;
    };
    updateFormData: (updates: Partial<PricingSettingsProps['formData']>) => void;
}

export function PricingSettings({
    formData,
    updateFormData,
}: PricingSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <DollarSign className="h-5 w-5" />
                Precios por Defecto
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Precio por foto digital (ARS)
                    </label>
                    <input
                        type="number"
                        value={formData.defaultPhotoPriceArs}
                        onChange={(e) =>
                            updateFormData({
                                defaultPhotoPriceArs: Number(e.target.value),
                            })
                        }
                        min="0"
                        step="50"
                        className="input-base"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Descuento por cantidad (%)
                    </label>
                    <input
                        type="number"
                        value={formData.bulkDiscountPercentage}
                        onChange={(e) =>
                            updateFormData({
                                bulkDiscountPercentage: Number(e.target.value),
                            })
                        }
                        min="0"
                        max="50"
                        className="input-base"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Mínimo para descuento
                    </label>
                    <input
                        type="number"
                        value={formData.bulkDiscountMinimum}
                        onChange={(e) =>
                            updateFormData({
                                bulkDiscountMinimum: Number(e.target.value),
                            })
                        }
                        min="2"
                        className="input-base"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Precio pack completo (ARS)
                    </label>
                    <input
                        type="number"
                        value={formData.packPriceArs}
                        onChange={(e) =>
                            updateFormData({
                                packPriceArs: Number(e.target.value),
                            })
                        }
                        min="0"
                        step="100"
                        className="input-base"
                    />
                </div>
            </div>
        </div>
    );
}
