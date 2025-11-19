'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { authClient } from '@/lib/supabase/auth-client';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { LookEscolarLogo } from '@/components/ui/branding/LookEscolarLogo';
import { LiquidThemeToggle } from '@/components/ui/theme/LiquidThemeToggle';

interface AdminHeaderProps {
  user: User | null;
  onMobileMenuToggle?: () => void;
}

export default function AdminHeader({
  user,
  onMobileMenuToggle,
}: AdminHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/admin') return 'Dashboard Principal';
    if (pathname.startsWith('/admin/events')) return 'Gestión de Eventos';
    if (pathname.startsWith('/admin/photos')) return 'Biblioteca de Fotos';
    if (pathname.startsWith('/admin/subjects')) return 'Base de Estudiantes';
    if (pathname.startsWith('/admin/orders')) return 'Seguimiento de Pedidos';
    if (pathname.startsWith('/admin/publish')) return 'Publicación y Compartir';
    if (pathname.startsWith('/admin/tagging')) return 'Etiquetado Inteligente';
    return 'Panel de Control';
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await authClient.logout();

      if (error) {
        console.error('Error during logout:', error);
        // Continúa con logout incluso si hay error
      }

      // Log logout action (sin datos sensibles)
      console.info('Logout successful:', {
        timestamp: new Date().toISOString(),
        userId: user?.id,
      });

      // Limpiar cualquier estado local si es necesario

      // Usar replace para evitar volver atrás
      router.replace('/login');
      router.refresh();
    } catch (err) {
      console.error('Unexpected error during logout:', err);
      // Forzar redirect incluso con error
      router.replace('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div
        className="liquid-glass-intense flex items-center justify-between gap-4 rounded-3xl border border-white/20 px-4 py-3 shadow-[0_8px_32px_-8px_rgba(16,24,40,0.12)] transition-all duration-300 hover:shadow-[0_12px_40px_-12px_rgba(16,24,40,0.18)] sm:px-6 lg:gap-6"
        data-liquid-tone="accent"
      >
        {/* Left Section: Mobile Menu & Title */}
        <div className="flex flex-1 items-center gap-4">
          <button
            onClick={onMobileMenuToggle}
            className="liquid-glass group rounded-xl p-2 transition-all duration-200 hover:bg-white/20 hover:shadow-sm lg:hidden"
            aria-label="Abrir menú"
            data-liquid-tone="muted"
          >
            <Menu className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white" />
          </button>

          <div className="min-w-0">
            <p className="chromatic-text text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500/90 dark:text-slate-400">
              {new Date().toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right Section: Search, Theme, Notifications, Profile */}
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
          {/* Search Bar (Desktop) */}
          <div
            className="liquid-glass group relative hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 transition-all duration-300 focus-within:bg-white/10 focus-within:shadow-inner hover:bg-white/10 lg:flex"
            data-liquid-tone="muted"
          >
            <Search className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-48 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 xl:w-64"
            />
          </div>

          <div className="hidden h-8 w-px bg-slate-200/50 dark:bg-white/10 sm:block" />

          <div className="hidden sm:block">
            <div
              className="liquid-glass rounded-xl p-1.5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm"
              data-liquid-tone="muted"
            >
              <LiquidThemeToggle size="md" />
            </div>
          </div>

          <button
            className="liquid-glass group relative hidden rounded-xl p-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-sm sm:flex"
            aria-label="Notificaciones"
            data-liquid-tone="muted"
          >
            <Bell className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white" />
            <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="liquid-glass group hidden rounded-xl p-2 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-sm sm:flex"
            title="Configuración"
            aria-label="Configuración"
            data-liquid-tone="muted"
          >
            <Settings className="h-5 w-5 text-slate-600 transition-transform duration-500 group-hover:rotate-90 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="liquid-glass-intense group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 pl-1.5 pr-2.5 py-1.5 transition-all duration-200 hover:bg-white/10 hover:shadow-sm sm:pr-4"
              aria-label="Menú de usuario"
              aria-expanded={showUserMenu}
              data-liquid-tone="accent"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-xs font-bold text-white shadow-inner">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  Administrador
                </p>
              </div>

              <ChevronDown
                className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform duration-300 sm:block ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showUserMenu && (
              <div
                className="liquid-glass-intense absolute right-0 z-50 mt-4 w-72 overflow-hidden rounded-3xl border border-white/20 p-2 shadow-[0_24px_80px_-32px_rgba(16,24,40,0.25)] animate-in fade-in slide-in-from-top-2 duration-200"
                data-liquid-tone="accent"
              >
                <div className="rounded-2xl bg-slate-50/50 p-4 dark:bg-white/5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <div className="mt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="liquid-glass group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-55 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    data-liquid-tone="muted"
                  >
                    <LogOut className="h-4 w-4 transition-colors group-hover:text-rose-600 dark:group-hover:text-rose-400" />
                    {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
