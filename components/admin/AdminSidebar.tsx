'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LucideIcon,
  X,
  ChevronDown,
  ChevronRight,
  Activity,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useResolvedTheme } from '@/components/providers/theme-provider';
import {
  DashboardIcon,
  EventsIcon,
  FoldersIcon,
  OrdersIcon,
  QrIcon,
  SettingsIcon,
} from '@/components/ui/icons/LiquidIcons';
import { LookEscolarLogo } from '@/components/ui/branding/LookEscolarLogo';
import { clsx } from 'clsx';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  description?: string;
  badge?: string | number;
  shortcut?: string;
  isLiquidIcon?: boolean;
}

// Main navigation items - only the essentials
const mainNavItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: DashboardIcon,
    description: 'Resumen general y métricas',
    shortcut: '⌘1',
    isLiquidIcon: true,
  },
  {
    href: '/admin/events',
    label: 'Eventos',
    icon: EventsIcon,
    description: 'Gestionar eventos y salones',
    shortcut: '⌘2',
    isLiquidIcon: true,
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: FoldersIcon,
    description: 'Gestión de fotos y carpetas',
    shortcut: '⌘3',
    isLiquidIcon: true,
  },
  {
    href: '/admin/orders',
    label: 'Pedidos',
    icon: OrdersIcon,
    description: 'Pedidos y ventas',
    shortcut: '⌘4',
    isLiquidIcon: true,
  },
  {
    href: '/admin/publish',
    label: 'Publicar',
    icon: QrIcon,
    description: 'Compartir con familias',
    shortcut: '⌘5',
    isLiquidIcon: true,
  },
  {
    href: '/admin/settings',
    label: 'Ajustes',
    icon: SettingsIcon,
    description: 'Configuración del sistema',
    shortcut: '⌘6',
    isLiquidIcon: true,
  },
];

// Advanced navigation items - hidden for simplified UI
const advancedNavItems: NavItem[] = [];

// Secondary items - hidden for simplified UI
const secondaryItems: NavItem[] = [];

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export default function AdminSidebar({
  isMobileOpen = false,
  onMobileToggle,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const theme = useResolvedTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  useEffect(() => {
    setIsOpen(isMobileOpen);
  }, [isMobileOpen]);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    // Close mobile menu when clicking a link
    if (window.innerWidth < 1024 && onMobileToggle) {
      onMobileToggle();
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex min-h-screen flex-col border-r transition-all duration-500 lg:static',
          // Tema claro
          theme === 'light' && [
            'bg-white/95 border-gray-200/60 shadow-2xl shadow-gray-900/10',
            'backdrop-blur-xl',
          ],
          // Tema oscuro
          theme === 'dark' && [
            'bg-gray-900/95 border-gray-700/60 shadow-2xl shadow-black/40',
            'backdrop-blur-xl',
          ],
          // Ancho dinámico basado en estado de colapso
          isCollapsed ? 'w-20' : 'w-72',
          // Transformaciones para mobile
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className={clsx(
          'flex items-center justify-between border-b p-4 lg:hidden',
          theme === 'light' ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-900'
        )}>
          <h2 className={clsx(
            'text-lg font-semibold',
            theme === 'light' ? 'text-gray-900' : 'text-gray-100'
          )}>
            Navegación
          </h2>
          <button
            onClick={onMobileToggle}
            className={clsx(
              'rounded-lg p-2 transition-all duration-200',
              theme === 'light'
                ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            )}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Header */}
        <div className={clsx(
          'border-b p-6 transition-all duration-300',
          theme === 'light' ? 'border-gray-200 bg-white/80' : 'border-gray-700 bg-gray-900/80',
          isCollapsed ? 'px-3' : 'px-6'
        )}>
          <div className="mb-6 flex items-center justify-between">
            {/* Logo y título */}
            <div className={clsx(
              'flex items-center gap-3 transition-all duration-300',
              isCollapsed ? 'justify-center' : 'justify-start'
            )}>
              <div className={clsx(
                'flex items-center justify-center rounded-xl transition-all duration-300',
                theme === 'light'
                  ? 'bg-gray-100 hover:bg-gray-200'
                  : 'bg-gray-800 hover:bg-gray-700',
                isCollapsed ? 'h-10 w-10' : 'h-12 w-12 lg:h-14 lg:w-14'
              )}>
                <LookEscolarLogo
                  variant="soft"
                  size={isCollapsed ? "sm" : "lg"}
                  className="transition-transform duration-200 hover:scale-105"
                />
              </div>

              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <h1 className={clsx(
                    'font-bold tracking-tight transition-all duration-300',
                    theme === 'light' ? 'text-gray-900' : 'text-gray-100',
                    'text-xl lg:text-2xl'
                  )}>
                    LookEscolar
                  </h1>
                  <p className={clsx(
                    'text-xs font-medium transition-all duration-300',
                    theme === 'light' ? 'text-gray-500' : 'text-gray-400',
                    'lg:text-sm'
                  )}>
                    Panel Admin
                  </p>
                </div>
              )}
            </div>

            {/* Botón de colapso */}
            <button
              onClick={toggleCollapse}
              className={clsx(
                'hidden lg:flex items-center justify-center rounded-lg transition-all duration-200',
                theme === 'light'
                  ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
                isCollapsed ? 'h-8 w-8' : 'h-9 w-9'
              )}
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Quick stats - hidden when collapsed */}
          {!isCollapsed && (
            <div className="grid grid-cols-2 gap-3">
              <div className={clsx(
                'rounded-lg border p-3 transition-all duration-200',
                theme === 'light'
                  ? 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={clsx(
                      'text-2xl font-bold',
                      theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                    )}>
                      12
                    </div>
                    <div className={clsx(
                      'text-xs font-medium uppercase tracking-wide',
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      Eventos
                    </div>
                  </div>
                  <div className={clsx(
                    'transition-colors duration-200',
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className={clsx(
                'rounded-lg border p-3 transition-all duration-200',
                theme === 'light'
                  ? 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-700'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={clsx(
                      'text-2xl font-bold',
                      theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                    )}>
                      847
                    </div>
                    <div className={clsx(
                      'text-xs font-medium uppercase tracking-wide',
                      theme === 'light' ? 'text-gray-600' : 'text-gray-400'
                    )}>
                      Fotos
                    </div>
                  </div>
                  <div className={clsx(
                    'transition-colors duration-200',
                    theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                  )}>
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Navigation */}
        <nav className={clsx(
          'flex-1 overflow-y-auto transition-all duration-300',
          isCollapsed ? 'px-2 py-4' : 'px-4 py-6'
        )}>
          {/* Main Navigation */}
          <div className="mb-8">
            {!isCollapsed && (
              <div className="mb-6">
                <h2 className={clsx(
                  'text-xs font-semibold uppercase tracking-wide',
                  theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                )}>
                  Navegación
                </h2>
              </div>
            )}
            <ul className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={clsx(
                        'group relative flex items-center transition-all duration-200 rounded-lg',
                        isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5',
                        active
                          ? theme === 'light'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                            : 'bg-blue-900/30 text-blue-300 border border-blue-800 shadow-sm'
                          : theme === 'light'
                            ? 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                            : 'text-gray-300 hover:text-gray-100 hover:bg-gray-800/50'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {/* Active background glow */}
                      {active && (
                        <div className={clsx(
                          'absolute inset-0 rounded-lg transition-all duration-200',
                          theme === 'light'
                            ? 'bg-blue-50/50'
                            : 'bg-blue-900/20'
                        )} />
                      )}

                      {/* Icon container */}
                      <div className={clsx(
                        'relative flex-shrink-0 rounded-md transition-all duration-200',
                        isCollapsed ? 'p-2' : 'p-1.5',
                        active
                          ? theme === 'light'
                            ? 'bg-blue-100'
                            : 'bg-blue-800/50'
                          : theme === 'light'
                            ? 'bg-gray-100 group-hover:bg-gray-200'
                            : 'bg-gray-700/50 group-hover:bg-gray-600/70'
                      )}>
                        {item.isLiquidIcon ? (
                          <Icon
                            size={isCollapsed ? 20 : 16}
                            className={clsx(
                              'transition-all duration-200',
                              active
                                ? 'text-blue-600 scale-110'
                                : theme === 'light'
                                  ? 'text-gray-500 group-hover:text-gray-700'
                                  : 'text-gray-400 group-hover:text-gray-200'
                            )}
                          />
                        ) : (
                          <Icon
                            className={clsx(
                              'transition-all duration-200',
                              isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
                              active
                                ? 'text-blue-600 scale-110'
                                : theme === 'light'
                                  ? 'text-gray-500 group-hover:text-gray-700'
                                  : 'text-gray-400 group-hover:text-gray-200'
                            )}
                          />
                        )}
                      </div>

                      {/* Text content - hidden when collapsed */}
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={clsx(
                                'truncate font-medium text-sm',
                                active
                                  ? theme === 'light' ? 'text-blue-700' : 'text-blue-300'
                                  : theme === 'light'
                                    ? 'text-gray-700 group-hover:text-gray-900'
                                    : 'text-gray-300 group-hover:text-gray-100'
                              )}
                            >
                              {item.label}
                            </span>
                            {item.shortcut && (
                              <kbd className={clsx(
                                'hidden items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] lg:inline-flex transition-all duration-200',
                                theme === 'light'
                                  ? 'bg-gray-200 text-gray-500'
                                  : 'bg-gray-700 text-gray-400'
                              )}>
                                {item.shortcut}
                              </kbd>
                            )}
                          </div>
                          {item.description && (
                            <p
                              className={clsx(
                                'mt-0.5 truncate text-xs transition-all duration-200',
                                active
                                  ? theme === 'light' ? 'text-blue-600' : 'text-blue-400'
                                  : theme === 'light'
                                    ? 'text-gray-500 group-hover:text-gray-600'
                                    : 'text-gray-400 group-hover:text-gray-300'
                              )}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Active indicator - only when not collapsed */}
                      {active && !isCollapsed && (
                        <div className="flex-shrink-0">
                          <div className="bg-blue-500 h-1.5 w-1.5 rounded-full animate-pulse"></div>
                        </div>
                      )}

                      {/* Notification badge */}
                      {item.badge && !isCollapsed && (
                        <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Advanced Navigation Accordion - hidden when collapsed */}
          {advancedNavItems.length > 0 && !isCollapsed && (
            <div className="mb-8">
              <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={clsx(
                  'group mb-4 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-200',
                  theme === 'light'
                    ? 'text-gray-400 hover:text-gray-600'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <span>Avanzado</span>
                <div className={clsx(
                  'transition-transform duration-200 group-hover:scale-110',
                  theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                )}>
                  {isAdvancedOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>

              {isAdvancedOpen && (
                <ul className="space-y-1">
                  {advancedNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={handleLinkClick}
                          className={clsx(
                            'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 ml-4 transition-all duration-200',
                            active
                              ? theme === 'light'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                                : 'bg-indigo-900/30 text-indigo-300 border border-indigo-800 shadow-sm'
                              : theme === 'light'
                                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                          )}
                        >
                          {/* Icon */}
                          <div className={clsx(
                            'flex-shrink-0 rounded-md p-1.5 transition-all duration-200',
                            active
                              ? theme === 'light'
                                ? 'bg-indigo-100'
                                : 'bg-indigo-800/50'
                              : theme === 'light'
                                ? 'bg-gray-100 group-hover:bg-gray-200'
                                : 'bg-gray-700/50 group-hover:bg-gray-600/70'
                          )}>
                            {item.isLiquidIcon ? (
                              <Icon
                                size={16}
                                className={clsx(
                                  'transition-all duration-200',
                                  active
                                    ? 'text-indigo-600 scale-110'
                                    : theme === 'light'
                                      ? 'text-gray-500 group-hover:text-gray-700'
                                      : 'text-gray-400 group-hover:text-gray-200'
                                )}
                              />
                            ) : (
                              <Icon
                                className={clsx(
                                  'h-3.5 w-3.5 transition-all duration-200',
                                  active
                                    ? 'text-indigo-600 scale-110'
                                    : theme === 'light'
                                      ? 'text-gray-500 group-hover:text-gray-700'
                                      : 'text-gray-400 group-hover:text-gray-200'
                                )}
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <span
                              className={clsx(
                                'truncate font-medium text-sm',
                                active
                                  ? theme === 'light' ? 'text-indigo-700' : 'text-indigo-300'
                                  : theme === 'light'
                                    ? 'text-gray-600 group-hover:text-gray-900'
                                    : 'text-gray-400 group-hover:text-gray-200'
                              )}
                            >
                              {item.label}
                            </span>
                            {item.description && (
                              <p
                                className={clsx(
                                  'mt-0.5 truncate text-xs',
                                  active
                                    ? theme === 'light' ? 'text-indigo-600' : 'text-indigo-400'
                                    : theme === 'light'
                                      ? 'text-gray-500 group-hover:text-gray-600'
                                      : 'text-gray-500 group-hover:text-gray-300'
                                )}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          {/* Active indicator */}
                          {active && (
                            <div className="flex-shrink-0">
                              <div className="bg-indigo-500 h-1.5 w-1.5 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Secondary Navigation - hidden when collapsed */}
          {secondaryItems.length > 0 && !isCollapsed && (
            <div className="mt-8">
              <div className="mb-4">
                <h2 className={clsx(
                  'text-xs font-semibold uppercase tracking-wide',
                  theme === 'light' ? 'text-gray-400' : 'text-gray-500'
                )}>
                  Configuración
                </h2>
              </div>
              <ul className="space-y-2">
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className={clsx(
                          'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                          active
                            ? theme === 'light'
                              ? 'bg-gray-100 text-gray-900 border border-gray-300 shadow-sm'
                              : 'bg-gray-800/50 text-gray-200 border border-gray-600 shadow-sm'
                            : theme === 'light'
                              ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                        )}
                      >
                        {/* Icon */}
                        <div className={clsx(
                          'flex-shrink-0 rounded-md p-1.5 transition-all duration-200',
                          active
                            ? theme === 'light'
                              ? 'bg-gray-200'
                              : 'bg-gray-600/50'
                            : theme === 'light'
                              ? 'bg-gray-100 group-hover:bg-gray-200'
                              : 'bg-gray-700/30 group-hover:bg-gray-600/50'
                        )}>
                          {item.isLiquidIcon ? (
                            <Icon
                              size={16}
                              className={clsx(
                                'transition-all duration-200',
                                active
                                  ? theme === 'light' ? 'text-gray-700 scale-110' : 'text-gray-300 scale-110'
                                  : theme === 'light'
                                    ? 'text-gray-500 group-hover:text-gray-700'
                                    : 'text-gray-400 group-hover:text-gray-200'
                              )}
                            />
                          ) : (
                            <Icon
                              className={clsx(
                                'h-3.5 w-3.5 transition-all duration-200',
                                active
                                  ? theme === 'light' ? 'text-gray-700 scale-110' : 'text-gray-300 scale-110'
                                  : theme === 'light'
                                    ? 'text-gray-500 group-hover:text-gray-700'
                                    : 'text-gray-400 group-hover:text-gray-200'
                              )}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={clsx(
                            'truncate font-medium text-sm',
                            active
                              ? theme === 'light' ? 'text-gray-900' : 'text-gray-200'
                              : theme === 'light'
                                ? 'text-gray-600 group-hover:text-gray-900'
                                : 'text-gray-400 group-hover:text-gray-200'
                          )}>
                            {item.label}
                          </span>
                          {item.description && (
                            <p className={clsx(
                              'mt-0.5 truncate text-xs',
                              active
                                ? theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                                : theme === 'light'
                                  ? 'text-gray-500 group-hover:text-gray-600'
                                  : 'text-gray-500 group-hover:text-gray-300'
                            )}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Active indicator */}
                        {active && (
                          <div className="flex-shrink-0">
                            <div className="bg-gray-500 h-1.5 w-1.5 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* Footer - hidden when collapsed */}
        {!isCollapsed && (
          <div className={clsx(
            'hidden border-t p-4 lg:block lg:p-6',
            theme === 'light'
              ? 'border-gray-200 bg-white/80'
              : 'border-gray-700 bg-gray-900/80'
          )}>
            <div className={clsx(
              'rounded-lg border p-4 text-center transition-all duration-200',
              theme === 'light'
                ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
            )}>
              <div className="mb-2 flex items-center justify-center gap-2">
                <div className="bg-green-500 h-2 w-2 rounded-full animate-pulse"></div>
                <span className={clsx(
                  'text-sm font-medium',
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                )}>
                  Sistema Activo
                </span>
              </div>
              <p className={clsx(
                'mb-3 text-xs',
                theme === 'light' ? 'text-gray-600' : 'text-gray-400'
              )}>
                Fotografía Escolar Premium
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px]">
                <span className={clsx(
                  'rounded px-2 py-1 border',
                  theme === 'light'
                    ? 'bg-white text-gray-700 border-gray-300'
                    : 'bg-gray-700 text-gray-300 border-gray-600'
                )}>
                  v2.0.0
                </span>
                <span className="bg-green-50 text-green-700 rounded px-2 py-1 border border-green-200">
                  Seguro
                </span>
                <span className="bg-blue-50 text-blue-700 rounded px-2 py-1 border border-blue-200">
                  Privado
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
