'use client';

import { useState, useEffect, type ComponentType } from 'react';
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
  ShoppingBag,
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
  icon: LucideIcon | ComponentType<{ size?: number; className?: string }>;
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
    href: '/admin/store-settings',
    label: 'Tienda',
    icon: ShoppingBag,
    description: 'Configuración de tienda',
    shortcut: '⌘7',
    isLiquidIcon: false,
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
            'bg-white/95 border-border/60 shadow-2xl shadow-gray-900/10',
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
          theme === 'light' ? 'border-border bg-white' : 'border-gray-700 bg-gray-900'
        )}>
          <h2 className={clsx(
            'text-lg font-semibold',
            theme === 'light' ? 'text-foreground' : 'text-gray-100'
          )}>
            Navegación
          </h2>
          <button
            onClick={onMobileToggle}
            className={clsx(
              'rounded-lg p-2 transition-all duration-200',
              theme === 'light'
                ? 'text-gray-500 hover:bg-muted hover:text-foreground'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            )}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Header */}
        <div
          className={clsx(
            'liquid-glass-intense border-b p-5 transition-all duration-300',
            isCollapsed ? 'px-3' : 'px-5'
          )}
          data-liquid-tone="accent"
        >
          <div className="mb-6 flex items-center justify-between">
            {/* Logo y título */}
            <div className={clsx(
              'flex items-center gap-3 transition-all duration-300',
              isCollapsed ? 'justify-center' : 'justify-start'
            )}>
              <div
                className={clsx(
                  'liquid-glass flex items-center justify-center rounded-xl transition-all duration-300',
                  isCollapsed ? 'h-9 w-9' : 'h-11 w-11 lg:h-12 lg:w-12'
                )}
                data-liquid-tone="muted"
              >
                <LookEscolarLogo
                  variant="soft"
                  size={isCollapsed ? "sm" : "lg"}
                  className="transition-transform duration-200 hover:scale-105"
                />
              </div>

              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h1 className="chromatic-text text-lg font-semibold tracking-[0.25em] text-white transition-all duration-300 lg:text-xl">
                    LookEscolar
                  </h1>
                  <p className="text-[11px] font-medium text-white/65 transition-all duration-300 lg:text-xs">
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
                  ? 'text-gray-500 hover:bg-muted hover:text-foreground'
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
            <div className="grid grid-cols-2 gap-2.5">
              <div
                className="liquid-glass rounded-xl p-2.5 transition-transform duration-200 hover:-translate-y-0.5"
                data-liquid-tone="muted"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-white">
                      12
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/65">
                      Eventos
                    </div>
                  </div>
                  <div className="text-white/60 transition-colors duration-200">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div
                className="liquid-glass rounded-xl p-2.5 transition-transform duration-200 hover:-translate-y-0.5"
                data-liquid-tone="muted"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-semibold text-white">
                      847
                    </div>
                    <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-white/65">
                      Fotos
                    </div>
                  </div>
                  <div className="text-white/60 transition-colors duration-200">
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
                <h2 className="chromatic-text text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                  Navegación
                </h2>
              </div>
            )}
            <ul className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const isLight = theme === 'light';
                const linkColorClass = isLight
                  ? active
                    ? 'text-[#0b1120]'
                    : 'text-[#1f2933] hover:text-[#0b1120]'
                  : active
                    ? 'text-white'
                    : 'text-white/65 hover:text-white';
                const iconColorClass = isLight
                  ? active
                    ? 'text-[#0b1120]'
                    : 'text-[#1f2933] group-hover:text-[#0b1120]'
                  : active
                    ? 'text-white scale-110'
                    : 'text-white/70 group-hover:text-white';
                const descriptionColorClass = isLight
                  ? 'mt-0.5 truncate text-xs text-[#364152]'
                  : 'mt-0.5 truncate text-xs text-white/55';
                const linkBackgroundClass = isLight
                  ? active
                    ? 'bg-white shadow-[0_20px_40px_-26px_rgba(15,23,42,0.32)]'
                    : 'bg-white/85 border border-slate-200/80 hover:bg-white hover:border-slate-200'
                  : '';
                const iconWrapperBackground = isLight
                  ? active
                    ? 'bg-[#edf1f7]'
                    : 'bg-[#eef2f7] group-hover:bg-white'
                  : active
                    ? 'bg-white/22'
                    : 'bg-white/10 group-hover:bg-white/16';

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={clsx(
                        'group relative flex items-center rounded-xl transition-transform duration-200 liquid-glass',
                        isCollapsed ? 'justify-center p-1.5' : 'gap-2.5 px-3 py-2',
                        'hover:-translate-y-0.5',
                        linkColorClass,
                        linkBackgroundClass
                      )}
                      data-liquid-tone={active ? 'accent' : 'muted'}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div
                        className={clsx(
                          'flex-shrink-0 rounded-lg transition-all duration-200',
                          isCollapsed ? 'p-1.5' : 'p-1',
                          iconWrapperBackground
                        )}
                      >
                        <Icon
                          className={clsx(
                            'transition-transform duration-200',
                            isCollapsed ? 'h-5 w-5' : 'h-4 w-4',
                            iconColorClass,
                            active && theme !== 'light' && 'scale-110'
                          )}
                        />
                      </div>

                      {!isCollapsed && (
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.label}
                            </span>
                            {item.description && (
                              <p className={descriptionColorClass}>
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.badge && (
                            <span className="flex-shrink-0 rounded-full bg-white/14 px-2 py-0.5 text-xs font-semibold text-white/80">
                              {item.badge}
                            </span>
                          )}
                        </div>
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
                    ? 'text-gray-400 hover:text-muted-foreground'
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
                                ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
                                ? 'bg-muted group-hover:bg-muted'
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
                                      ? 'text-gray-500 group-hover:text-foreground'
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
                                      ? 'text-gray-500 group-hover:text-foreground'
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
                                    ? 'text-muted-foreground group-hover:text-foreground'
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
                                      ? 'text-gray-500 group-hover:text-muted-foreground'
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
                              ? 'bg-muted text-foreground border border-border shadow-sm'
                              : 'bg-gray-800/50 text-gray-200 border border-gray-600 shadow-sm'
                            : theme === 'light'
                              ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                        )}
                      >
                        {/* Icon */}
                        <div className={clsx(
                          'flex-shrink-0 rounded-md p-1.5 transition-all duration-200',
                          active
                            ? theme === 'light'
                              ? 'bg-muted'
                              : 'bg-gray-600/50'
                            : theme === 'light'
                              ? 'bg-muted group-hover:bg-muted'
                              : 'bg-gray-700/30 group-hover:bg-gray-600/50'
                        )}>
                          {item.isLiquidIcon ? (
                            <Icon
                              size={16}
                              className={clsx(
                                'transition-all duration-200',
                                active
                                  ? theme === 'light' ? 'text-foreground scale-110' : 'text-gray-300 scale-110'
                                  : theme === 'light'
                                    ? 'text-gray-500 group-hover:text-foreground'
                                    : 'text-gray-400 group-hover:text-gray-200'
                              )}
                            />
                          ) : (
                            <Icon
                              className={clsx(
                                'h-3.5 w-3.5 transition-all duration-200',
                                active
                                  ? theme === 'light' ? 'text-foreground scale-110' : 'text-gray-300 scale-110'
                                  : theme === 'light'
                                    ? 'text-gray-500 group-hover:text-foreground'
                                    : 'text-gray-400 group-hover:text-gray-200'
                              )}
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className={clsx(
                            'truncate font-medium text-sm',
                            active
                              ? theme === 'light' ? 'text-foreground' : 'text-gray-200'
                              : theme === 'light'
                                ? 'text-muted-foreground group-hover:text-foreground'
                                : 'text-gray-400 group-hover:text-gray-200'
                          )}>
                            {item.label}
                          </span>
                          {item.description && (
                            <p className={clsx(
                              'mt-0.5 truncate text-xs',
                              active
                                ? theme === 'light' ? 'text-foreground' : 'text-gray-300'
                                : theme === 'light'
                                  ? 'text-gray-500 group-hover:text-muted-foreground'
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
              ? 'border-border bg-white/80'
              : 'border-gray-700 bg-gray-900/80'
          )}>
            <div className={clsx(
              'rounded-lg border p-4 text-center transition-all duration-200',
              theme === 'light'
                ? 'border-border bg-muted hover:bg-muted'
                : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
            )}>
              <div className="mb-2 flex items-center justify-center gap-2">
                <div className="bg-green-500 h-2 w-2 rounded-full animate-pulse"></div>
                <span className={clsx(
                  'text-sm font-medium',
                  theme === 'light' ? 'text-foreground' : 'text-gray-100'
                )}>
                  Sistema Activo
                </span>
              </div>
              <p className={clsx(
                'mb-3 text-xs',
                theme === 'light' ? 'text-muted-foreground' : 'text-gray-400'
              )}>
                Fotografía Escolar Premium
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px]">
                <span className={clsx(
                  'rounded px-2 py-1 border',
                  theme === 'light'
                    ? 'bg-white text-foreground border-border'
                    : 'bg-gray-700 text-gray-300 border-gray-600'
                )}>
                  v2.0.0
                </span>
                <span className="bg-green-50 text-green-700 rounded px-2 py-1 border border-green-200">
                  Seguro
                </span>
                <span className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 rounded px-2 py-1 border border-blue-200">
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
