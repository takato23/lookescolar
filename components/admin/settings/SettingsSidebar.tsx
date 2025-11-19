'use client';

import React from 'react';
import clsx from 'clsx';
import {
    Settings2,
    Building2,
    Palette,
    Upload,
    DollarSign,
    Bell,
    Globe,
    Download,
    ImageIcon,
} from 'lucide-react';

export interface SettingsSection {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

export const SECTIONS: SettingsSection[] = [
    {
        id: 'plan',
        title: 'Plan y Límites',
        description: 'Gestioná el plan del tenant y monitoreá el uso.',
        icon: Settings2,
    },
    {
        id: 'business',
        title: 'Información del Negocio',
        description: 'Datos básicos de tu fotografía escolar',
        icon: Building2,
    },
    {
        id: 'appearance',
        title: 'Apariencia',
        description: 'Tema y personalización visual',
        icon: Palette,
    },
    {
        id: 'watermark',
        title: 'Marca de Agua',
        description: 'Configuración del watermark en fotos',
        icon: ImageIcon,
    },
    {
        id: 'upload',
        title: 'Subida de Archivos',
        description: 'Límites y configuración de upload',
        icon: Upload,
    },
    {
        id: 'pricing',
        title: 'Precios por Defecto',
        description: 'Configuración de precios estándar',
        icon: DollarSign,
    },
    {
        id: 'notifications',
        title: 'Notificaciones',
        description: 'Preferencias de alertas y emails',
        icon: Bell,
    },
    {
        id: 'localization',
        title: 'Localización',
        description: 'Zona horaria y formato de fecha',
        icon: Globe,
    },
    {
        id: 'backup',
        title: 'Backup y Exportación',
        description: 'Respaldo de datos del sistema',
        icon: Download,
    },
];

interface SettingsSidebarProps {
    activeSection: string;
    onSectionChange: (id: string) => void;
}

export function SettingsSidebar({
    activeSection,
    onSectionChange,
}: SettingsSidebarProps) {
    return (
        <div className="space-y-4 lg:w-80">
            <div
                className="liquid-glass-intense rounded-2xl border border-white/12 p-4 shadow-[0_24px_72px_-38px_rgba(16,24,40,0.5)]"
                data-liquid-tone="muted"
            >
                <h3 className="chromatic-text mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                    Secciones
                </h3>
                <div className="space-y-1.5">
                    {SECTIONS.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;

                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionChange(section.id)}
                                className={clsx(
                                    'touch-target liquid-glass flex w-full items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-all duration-200',
                                    isActive ? 'text-white' : 'text-white/70 hover:text-white'
                                )}
                                data-liquid-tone={isActive ? 'accent' : 'muted'}
                            >
                                <Icon
                                    className={clsx(
                                        'mt-0.5 h-3.5 w-3.5 flex-shrink-0 transition-colors',
                                        isActive ? 'text-white' : 'text-white/60'
                                    )}
                                />
                                <div className="min-w-0">
                                    <div className="text-xs font-medium text-white">
                                        {section.title}
                                    </div>
                                    <div className="mt-0.5 text-[11px] text-white/60">
                                        {section.description}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
