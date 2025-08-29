'use client';

import * as React from 'react';
import { LookEscolarLogo } from '@/components/ui/branding/LookEscolarLogo';
import { LiquidThemeToggle } from '@/components/ui/theme/LiquidThemeToggle';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

interface AdminTopBarProps {
  pageTitle?: string;
  breadcrumbs?: BreadcrumbItem[];
}

function AdminTopBar({ pageTitle, breadcrumbs }: AdminTopBarProps) {
  return (
    <header className="liquid-glass sticky top-0 z-50 border-b border-white/10">
      <div className="container flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <LookEscolarLogo variant="blue" size="lg" />
          <div className="leading-tight">
            <h1 className="liquid-title text-lg font-extrabold tracking-tight">
              LookEscolar
            </h1>
            <p className="liquid-subtitle text-xs text-neutral-500 dark:text-neutral-400">
              Panel de Administración
            </p>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="ml-6 hidden items-center space-x-2 md:flex">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className="text-neutral-400 dark:text-neutral-600">
                      /
                    </span>
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="liquid-nav-text text-sm transition-colors hover:text-primary-500"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="liquid-nav-text text-sm font-semibold">
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Page Title para mobile */}
          {pageTitle && (
            <h2 className="liquid-nav-text text-sm font-semibold md:hidden">
              {pageTitle}
            </h2>
          )}

          {/* Search Button - que podría activar Command Palette en el futuro */}
          <button
            className="liquid-button hidden items-center gap-2 rounded-xl p-2 text-sm md:flex"
            aria-label="Buscar"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span className="hidden lg:inline">Buscar...</span>
            <span className="hidden rounded bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/10 lg:inline">
              ⌘K
            </span>
          </button>

          <LiquidThemeToggle size="md" />

          {/* User Menu Placeholder - mantener el existente */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-sm font-bold text-white">
            M
          </div>
        </div>
      </div>
    </header>
  );
}

export function AdminLayout({
  children,
  pageTitle,
  breadcrumbs,
  className = '',
}: AdminLayoutProps) {
  return (
    <div className={`liquid-glass-app min-h-screen ${className}`}>
      <AdminTopBar pageTitle={pageTitle} breadcrumbs={breadcrumbs} />

      <div className="flex">
        {/* Sidebar - mantenemos el existente por ahora */}
        <aside className="liquid-content hidden w-64 border-r border-white/5 lg:block">
          {/* El sidebar actual se integraría aquí */}
          <div className="p-6">
            <nav className="space-y-2">
              <div className="liquid-label mb-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Navegación
              </div>
              {/* Los items de navegación se agregarían aquí */}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="liquid-content min-h-screen flex-1">
          <div className="liquid-glass-container">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
