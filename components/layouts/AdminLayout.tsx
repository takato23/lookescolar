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
    <header className="sticky top-0 z-50 liquid-glass border-b border-white/10">
      <div className="container flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-4">
          <LookEscolarLogo variant="blue" size="lg" />
          <div className="leading-tight">
            <h1 className="font-extrabold text-lg tracking-tight liquid-title">
              LookEscolar
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 liquid-subtitle">
              Panel de Administración
            </p>
          </div>
          
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="hidden md:flex items-center space-x-2 ml-6">
              {breadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <span className="text-neutral-400 dark:text-neutral-600">/</span>
                  )}
                  {item.href ? (
                    <a 
                      href={item.href}
                      className="text-sm liquid-nav-text hover:text-primary-500 transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold liquid-nav-text">
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
            <h2 className="md:hidden font-semibold text-sm liquid-nav-text">
              {pageTitle}
            </h2>
          )}
          
          {/* Search Button - que podría activar Command Palette en el futuro */}
          <button
            className="liquid-button p-2 rounded-xl hidden md:flex items-center gap-2 text-sm"
            aria-label="Buscar"
          >
            <svg 
              className="w-4 h-4" 
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
            <span className="hidden lg:inline text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </button>
          
          <LiquidThemeToggle size="md" />
          
          {/* User Menu Placeholder - mantener el existente */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-bold">
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
  className = '' 
}: AdminLayoutProps) {
  return (
    <div className={`liquid-glass-app min-h-screen ${className}`}>
      <AdminTopBar pageTitle={pageTitle} breadcrumbs={breadcrumbs} />
      
      <div className="flex">
        {/* Sidebar - mantenemos el existente por ahora */}
        <aside className="hidden lg:block w-64 liquid-content border-r border-white/5">
          {/* El sidebar actual se integraría aquí */}
          <div className="p-6">
            <nav className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 font-semibold mb-4 liquid-label">
                Navegación
              </div>
              {/* Los items de navegación se agregarían aquí */}
            </nav>
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1 liquid-content min-h-screen">
          <div className="liquid-glass-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
