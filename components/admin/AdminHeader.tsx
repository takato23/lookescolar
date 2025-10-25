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
        className="liquid-glass-intense flex items-center justify-between gap-4 rounded-3xl border border-white/12 px-4 py-2.5 shadow-[0_32px_90px_-40px_rgba(16,24,40,0.55)] sm:px-5 lg:gap-5"
        data-liquid-tone="accent"
      >
        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <button
            onClick={onMobileMenuToggle}
            className="liquid-glass rounded-xl p-1.5 transition-transform duration-200 hover:-translate-y-0.5 lg:hidden"
            aria-label="Abrir menú"
            data-liquid-tone="muted"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <p className="chromatic-text text-[11px] font-semibold uppercase tracking-[0.32em] text-white/80">
              {new Date().toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-white sm:text-2xl">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 lg:gap-4">
          <div
            className="liquid-glass relative hidden items-center gap-2 rounded-full px-3.5 py-1.5 text-sm text-white/80 transition-all duration-200 hover:text-white lg:flex"
            data-liquid-tone="muted"
          >
            <Search className="h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-44 bg-transparent font-medium placeholder:text-white/50 focus:outline-none xl:w-60"
            />
          </div>

          <div className="hidden sm:block">
            <div
              className="liquid-glass rounded-xl p-1.5 transition-transform duration-200 hover:-translate-y-0.5"
              data-liquid-tone="muted"
            >
              <LiquidThemeToggle size="md" />
            </div>
          </div>

          <button
            className="liquid-glass group relative hidden rounded-xl p-1.5 transition-transform duration-200 hover:-translate-y-0.5 sm:flex"
            aria-label="Notificaciones"
            data-liquid-tone="muted"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-primary-400" />
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="liquid-glass group hidden rounded-xl p-1.5 transition-transform duration-200 hover:-translate-y-0.5 sm:flex"
            title="Configuración"
            aria-label="Configuración"
            data-liquid-tone="muted"
          >
            <Settings className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 sm:h-5 sm:w-5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="liquid-glass-intense group flex items-center gap-2 rounded-xl px-1.5 py-1 transition-transform duration-200 hover:-translate-y-0.5 sm:gap-3 sm:px-2.5"
              aria-label="Menú de usuario"
              aria-expanded={showUserMenu}
              data-liquid-tone="accent"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 via-primary-400 to-secondary-500 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(91,111,255,0.6)] sm:h-10 sm:w-10">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-white sm:text-sm">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-[11px] text-white/60">Administrador</p>
              </div>

              <ChevronDown
                className={`hidden h-4 w-4 text-white/70 transition-transform duration-200 sm:block ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {showUserMenu && (
              <div
                className="liquid-glass-intense absolute right-0 z-50 mt-3 w-72 rounded-3xl border border-white/10 p-2 shadow-[0_24px_80px_-32px_rgba(16,24,40,0.6)]"
                data-liquid-tone="accent"
              >
                <div className="rounded-2xl bg-white/8 p-4 text-white">
                  <p className="text-sm font-semibold">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-white/70">{user?.email}</p>
                </div>
                <div className="mt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="liquid-glass group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors duration-200 hover:text-red-400 disabled:opacity-55"
                    data-liquid-tone="muted"
                  >
                    <LogOut className="h-4 w-4 transition-colors group-hover:text-red-400" />
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
