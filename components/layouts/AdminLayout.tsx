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
    <header
      className="liquid-glass-intense sticky top-4 z-50 mx-auto w-[min(95%,1120px)] rounded-3xl border border-white/15 px-6 py-3 shadow-[0_34px_90px_-40px_rgba(16,24,40,0.55)] backdrop-blur-2xl"
      data-liquid-tone="accent"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="liquid-glass flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 shadow-[0_18px_42px_-28px_rgba(16,24,40,0.45)]">
            <LookEscolarLogo variant="blue" size="lg" />
          </div>
          <div className="leading-tight">
            <h1 className="chromatic-text text-base font-semibold uppercase tracking-[0.28em]">
              LookEscolar
            </h1>
            <p className="text-xs text-white/70 dark:text-white/60">
              Panel de administración
            </p>
          </div>

          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="ml-6 hidden items-center gap-3 md:flex">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className="text-white/30 dark:text-white/40">/</span>
                  )}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-sm text-white/75 transition-colors duration-200 hover:text-white"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-white">
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {pageTitle && (
            <h2 className="chromatic-text text-xs font-semibold uppercase tracking-[0.24em] md:hidden">
              {pageTitle}
            </h2>
          )}

          <button
            className="liquid-glass hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-medium uppercase tracking-[0.24em] text-white/80 transition-all hover:text-white hover:shadow-[0_20px_48px_-30px_rgba(78,105,255,0.55)] md:flex"
            aria-label="Buscar"
            data-liquid-tone="muted"
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
            <span className="hidden lg:inline">Buscar</span>
            <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] lg:inline">
              ⌘K
            </span>
          </button>

          <div className="liquid-glass rounded-full p-1.5" data-liquid-tone="muted">
            <LiquidThemeToggle size="md" />
          </div>

          <div className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-xs font-semibold text-white">
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
      <div className="flex flex-col gap-6 px-4 pb-12 pt-6 lg:px-10">
        <AdminTopBar pageTitle={pageTitle} breadcrumbs={breadcrumbs} />

        <div className="mx-auto flex w-full max-w-[1200px] gap-6">
          <aside
            className="liquid-glass hidden w-72 shrink-0 flex-col rounded-3xl border border-white/12 p-6 shadow-[0_40px_120px_-40px_rgba(16,24,40,0.55)] md:flex"
            data-liquid-tone="muted"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="chromatic-text text-xs font-semibold uppercase tracking-[0.28em]">
                Navegación
              </span>
              <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.26em] text-white/60">
                Admin
              </span>
            </div>
            <nav className="space-y-2 text-sm text-white/75">
              {/* Inserta items de navegación concretos aquí */}
            </nav>
          </aside>

          <main className="liquid-glass flex-1 rounded-3xl border border-white/10 p-6 shadow-[0_36px_120px_-50px_rgba(16,24,40,0.55)]" data-liquid-tone="muted">
            <div className="liquid-glass-container">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
