'use client';

import React from 'react';
import { Upload } from 'lucide-react';

interface UploadSettingsProps {
    formData: {
        uploadMaxSizeMb: number;
        uploadMaxConcurrent: number;
        uploadQuality: number;
        uploadMaxResolution: '1600' | '1920' | '2048';
    };
    updateFormData: (updates: Partial<UploadSettingsProps['formData']>) => void;
}

export function UploadSettings({
    formData,
    updateFormData,
}: UploadSettingsProps) {
    return (
        <div className="space-y-6 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                <Upload className="h-5 w-5" />
                Subida de Archivos
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Tamaño máximo por foto (MB)
                    </label>
                    <input
                        type="number"
                        value={formData.uploadMaxSizeMb}
                        onChange={(e) =>
                            updateFormData({
                                uploadMaxSizeMb: Number(e.target.value),
                            })
                        }
                        min="1"
                        max="50"
                        className="input-base"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Uploads simultáneos máximos
                    </label>
                    <input
                        type="number"
                        value={formData.uploadMaxConcurrent}
                        onChange={(e) =>
                            updateFormData({
                                uploadMaxConcurrent: Number(e.target.value),
                            })
                        }
                        min="1"
                        max="10"
                        className="input-base"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Calidad de imagen ({formData.uploadQuality}%)
                    </label>
                    <input
                        type="range"
                        min="50"
                        max="100"
                        value={formData.uploadQuality}
                        onChange={(e) =>
                            updateFormData({
                                uploadQuality: Number(e.target.value),
                            })
                        }
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-white"
                    />
                </div>

                <div>
                    <label className="mb-2 block text-xs font-medium text-white">
                        Resolución máxima (px)
                    </label>
                    <select
                        className="input-base"
                        value={formData.uploadMaxResolution}
                        onChange={(e) =>
                            updateFormData({
                                uploadMaxResolution: e.target.value as any,
                            })
                        }
                    >
                        <option value="1600">1600px</option>
                        <option value="1920">1920px</option>
                        <option value="2048">2048px</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
