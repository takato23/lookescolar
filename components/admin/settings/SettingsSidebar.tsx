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
import { LucideIcon } from 'lucide-react';

export interface SettingsSidebarItem {
  /**
   * Unique identifier for the section
   */
  id: string;

  /**
   * Display title
   */
  title: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Icon component
   */
  icon: LucideIcon;

  /**
   * Badge text (e.g., "New", "Beta")
   */
  badge?: string;

  /**
   * Badge color variant
   */
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

// Legacy type alias for backward compatibility
export type SettingsSection = SettingsSidebarItem;

// Default sections with all settings
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

export interface SettingsSidebarProps {
  /**
   * Array of sidebar items (defaults to SECTIONS if not provided)
   */
  items?: SettingsSidebarItem[];

  /**
   * Currently active section ID
   */
  activeSection: string;

  /**
   * Handler for section change
   */
  onSectionChange: (sectionId: string) => void;

  /**
   * Sidebar title
   */
  title?: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const badgeColors: Record<
  NonNullable<SettingsSidebarItem['badgeVariant']>,
  string
> = {
  default: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  primary: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
  success:
    'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
  danger: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
};

export function SettingsSidebar({
  items = SECTIONS,
  activeSection,
  onSectionChange,
  title = 'Secciones',
  className,
}: SettingsSidebarProps) {
  return (
    <div className={clsx('space-y-4 lg:w-80', className)}>
      <div className="liquid-glass-intense overflow-hidden rounded-3xl border border-white/20 p-4 shadow-xl backdrop-blur-xl dark:border-white/10">
        <h3 className="mb-4 px-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title}
        </h3>

        <nav className="space-y-2" aria-label="Settings navigation">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={clsx(
                  'group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all duration-300',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon */}
                <div
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-blue-600 dark:bg-white/5 dark:text-slate-400 dark:group-hover:text-blue-400'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold truncate">
                      {item.title}
                    </div>
                    {item.badge && (
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                          badgeColors[item.badgeVariant || 'default']
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div
                      className={clsx(
                        'text-[11px] transition-colors truncate',
                        isActive
                          ? 'text-blue-100'
                          : 'text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-400'
                      )}
                    >
                      {item.description}
                    </div>
                  )}
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default SettingsSidebar;
