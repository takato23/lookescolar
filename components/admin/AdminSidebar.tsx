'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Camera,
  LucideIcon,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  badge?: string | number;
  shortcut?: string;
}

// Main navigation items - only the essentials
const mainNavItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: BarChart3,
    description: 'Resumen general y métricas',
    shortcut: '⌘1',
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: Camera,
    description: 'Subir y gestionar imágenes',
    shortcut: '⌘2',
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
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'bg-card/85 border-border fixed inset-y-0 left-0 z-50 flex min-h-screen w-80 flex-col border-r backdrop-blur-2xl transition-all duration-300 lg:static',
          'shadow-2xl shadow-black/20 ring-1 ring-white/20',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header */}
        <div className="border-border/50 flex items-center justify-between border-b p-4 lg:hidden">
          <h2 className="text-foreground text-lg font-bold">Menú</h2>
          <button
            onClick={onMobileToggle}
            className="hover:bg-muted/50 rounded-lg p-2 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="text-muted-foreground h-5 w-5" />
          </button>
        </div>
        {/* Header */}
        <div className="border-border/50 border-b bg-gradient-to-b from-surface/40 to-transparent p-6 lg:p-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="from-primary to-secondary ring-primary/10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-xl ring-4 lg:h-14 lg:w-14">
              <Camera className="h-6 w-6 text-white drop-shadow-lg lg:h-8 lg:w-8" />
            </div>
            <div className="flex-1">
              <h1 className="text-foreground mb-1 text-xl font-bold tracking-tight drop-shadow-lg lg:text-2xl">
                LookEscolar
              </h1>
              <p className="text-muted-foreground text-xs font-medium drop-shadow-md lg:text-sm">
                Studio Profesional
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-2 lg:mt-4 lg:gap-3">
            <div className="glass-card from-primary/15 to-primary/25 border-primary/30 hover:border-primary/50 shadow-primary/20 hover:shadow-primary/30 rounded-lg border bg-gradient-to-br p-3 text-center shadow-lg transition-all duration-300 hover:shadow-xl">
              <div className="text-foreground text-2xl font-bold drop-shadow-md">
                12
              </div>
              <div className="text-primary text-xs font-semibold uppercase tracking-wider drop-shadow-sm">
                Eventos
              </div>
            </div>
            <div className="glass-card from-success/15 to-success/25 border-success/30 hover:border-success/50 shadow-success/20 hover:shadow-success/30 rounded-lg border bg-gradient-to-br p-3 text-center shadow-lg transition-all duration-300 hover:shadow-xl">
              <div className="text-foreground text-2xl font-bold drop-shadow-md">
                847
              </div>
              <div className="text-success text-xs font-semibold uppercase tracking-wider drop-shadow-sm">
                Fotos
              </div>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 lg:px-5 lg:py-6">
          {/* Main Navigation */}
          <div className="mb-6">
            <h2 className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-neutral-600 drop-shadow-sm dark:text-neutral-400">
              Navegación Principal
            </h2>
            <ul className="space-y-1.5">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={clsx(
                        'group relative flex items-center gap-3.5 overflow-hidden rounded-xl px-4 py-3.5 transition-all duration-200',
                        // Active depth + gradient
                        active
                          ? 'from-primary/20 to-primary/10 shadow-glow-primary border-l-primary border-l-4 bg-gradient-to-r font-semibold text-primary-900 dark:text-primary-100'
                          : 'hover:bg-muted/40 text-neutral-700 hover:-translate-y-[1px] hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
                        !active && 'hover:shadow-3d-sm active:translate-y-0'
                      )}
                    >
                      {/* Active glow background */}
                      {active && (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-primary-200/30 via-transparent to-primary-100/30 dark:from-primary-700/20 dark:to-primary-600/20" />
                      )}

                      <Icon
                        className={clsx(
                          'relative z-10 h-5 w-5 flex-shrink-0 transition-all',
                          active
                            ? 'text-primary drop-shadow-md'
                            : 'text-neutral-600 group-hover:scale-110 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-100'
                        )}
                      />

                      <div className="relative z-10 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={clsx(
                              'truncate transition-all',
                              active
                                ? 'text-base text-menu-enhanced drop-shadow-md font-semibold'
                                : 'text-sm text-button-enhanced group-hover:text-base'
                            )}
                          >
                            {item.label}
                          </span>
                          {item.shortcut && (
                            <kbd className="hidden items-center gap-1 rounded border border-neutral-300 bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-neutral-600 lg:inline-flex dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                              {item.shortcut}
                            </kbd>
                          )}
                        </div>
                        {item.description && (
                          <p
                            className={clsx(
                              'mt-1 truncate text-xs transition-opacity',
                              active
                                ? 'text-enhanced opacity-90'
                                : 'text-button-enhanced opacity-80 group-hover:opacity-100'
                            )}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Active indicator dot */}
                      {active && (
                        <div className="bg-primary/90 shadow-glow-primary relative z-10 h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full" />
                      )}

                      {/* Badge for notifications */}
                      {item.badge && (
                        <span className="from-warning to-warning/80 animate-pulse rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Advanced Navigation Accordion - hidden if no items */}
          {advancedNavItems.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-neutral-600 transition-colors hover:bg-muted/40 dark:text-neutral-400"
            >
              <span>Avanzado</span>
              {isAdvancedOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            
            {isAdvancedOpen && (
              <ul className="space-y-1.5">
                {advancedNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={handleLinkClick}
                        className={clsx(
                          'group relative flex items-center gap-3.5 overflow-hidden rounded-xl px-4 py-3.5 transition-all duration-200',
                          active
                            ? 'from-primary/20 to-primary/10 shadow-glow-primary border-l-primary border-l-4 bg-gradient-to-r font-semibold text-primary-900 dark:text-primary-100'
                            : 'hover:bg-muted/40 text-neutral-700 hover:-translate-y-[1px] hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
                          !active && 'hover:shadow-3d-sm active:translate-y-0'
                        )}
                      >
                        {active && (
                          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-primary-200/30 via-transparent to-primary-100/30 dark:from-primary-700/20 dark:to-primary-600/20" />
                        )}

                        <Icon
                          className={clsx(
                            'relative z-10 h-5 w-5 flex-shrink-0 transition-all',
                            active
                              ? 'text-primary drop-shadow-md'
                              : 'text-neutral-600 group-hover:scale-110 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-100'
                          )}
                        />

                        <div className="relative z-10 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={clsx(
                                'truncate font-medium drop-shadow-sm transition-all',
                                active
                                  ? 'text-base drop-shadow-md'
                                  : 'text-sm group-hover:text-base'
                              )}
                            >
                              {item.label}
                            </span>
                          </div>
                          {item.description && (
                            <p
                              className={clsx(
                                'mt-1 truncate text-xs transition-opacity',
                                active
                                  ? 'text-neutral-600 opacity-90 dark:text-neutral-400'
                                  : 'text-neutral-500 opacity-80 group-hover:opacity-100 dark:text-neutral-500'
                              )}
                            >
                              {item.description}
                            </p>
                          )}
                        </div>

                        {active && (
                          <div className="bg-primary/90 shadow-glow-primary relative z-10 h-2.5 w-2.5 flex-shrink-0 animate-pulse rounded-full" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          )}

          {/* Secondary Navigation - hidden if no items */}
          {secondaryItems.length > 0 && (
          <div>
            <h2 className="text-muted-foreground/80 mb-4 px-3 text-xs font-bold uppercase tracking-widest">
              Configuración
            </h2>
            <ul className="space-y-1.5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleLinkClick}
                      className={clsx(
                        'group flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-200',
                        active
                          ? 'bg-muted/80 text-foreground font-medium shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:translate-x-0.5'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'h-4 w-4 flex-shrink-0 transition-all',
                          active
                            ? 'text-primary'
                            : 'text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110'
                        )}
                      />

                      <div className="min-w-0 flex-1">
                        <span className="truncate text-sm font-medium">
                          {item.label}
                        </span>
                        {item.description && (
                          <p className="text-muted-foreground/70 mt-0.5 truncate text-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-border/50 hidden border-t bg-gradient-to-t from-surface/30 to-transparent p-4 lg:block lg:p-6">
          <div className="glass-card from-muted/50 to-muted/30 border-border/50 rounded-xl border bg-gradient-to-br p-5 text-center shadow-xl shadow-black/10 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-center gap-2.5">
              <div className="relative">
                <div className="bg-success h-2.5 w-2.5 animate-pulse rounded-full" />
                <div className="bg-success absolute inset-0 h-2.5 w-2.5 animate-ping rounded-full" />
              </div>
              <span className="text-foreground text-sm font-semibold">
                Sistema Activo
              </span>
            </div>
            <p className="text-muted-foreground mb-4 text-xs font-medium">
              Fotografía Escolar Premium
            </p>
            <div className="text-muted-foreground/80 flex items-center justify-center gap-3 text-[11px] font-medium">
              <span className="bg-muted/50 rounded px-2 py-1">v2.0.0</span>
              <span className="bg-success/10 text-success rounded px-2 py-1">
                Seguro
              </span>
              <span className="bg-primary/10 text-primary rounded px-2 py-1">
                Privado
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
