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
    <header className="liquid-glass sticky top-0 z-50 border-b border-white/10 px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        {/* Left Section - Mobile Menu + Page Title */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="liquid-button rounded-xl p-2 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page Title - More prominent */}
          <div>
            <h1 className="liquid-nav-text text-xl font-bold tracking-tight sm:text-2xl">
              {getPageTitle()}
            </h1>
            <p className="hidden text-xs font-medium sm:block sm:text-sm liquid-description">
              {new Date().toLocaleDateString('es-AR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
          {/* Search - Hidden on mobile */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="liquid-button w-64 py-2.5 pl-10 pr-4 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/50 xl:w-72"
            />
          </div>

          {/* Theme Toggle - Always visible */}
          <div className="hidden sm:block">
            <LiquidThemeToggle size="md" />
          </div>

          {/* Notifications - Hidden on mobile */}
          <button
            className="liquid-button group relative hidden rounded-xl p-2 sm:block sm:p-2.5"
            aria-label="Notificaciones"
          >
            <Bell className="h-4 w-4 transition-colors sm:h-5 sm:w-5" />
            <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          </button>

          {/* Settings - Hidden on mobile */}
          <button
            onClick={() => router.push('/admin/settings')}
            className="liquid-button group hidden rounded-xl p-2 transition-all duration-200 hover:scale-105 sm:block sm:p-2.5"
            title="Configuración"
            aria-label="Configuración"
          >
            <Settings className="h-4 w-4 transition-all group-hover:rotate-45 sm:h-5 sm:w-5" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="liquid-button group flex items-center gap-2 rounded-xl p-1.5 transition-all duration-200 sm:gap-3 sm:p-2"
              aria-label="Menú de usuario"
              aria-expanded={showUserMenu}
            >
              {/* Avatar */}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 via-primary-500 to-secondary-500 shadow-lg ring-2 ring-primary-500/20 sm:h-10 sm:w-10 sm:rounded-xl">
                <span className="text-sm font-bold text-white sm:text-base">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>

              {/* User info - Hidden on mobile */}
              <div className="hidden text-left sm:block lg:block">
                <p className="liquid-nav-text text-xs font-semibold sm:text-sm">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="liquid-description hidden text-xs font-medium lg:block">
                  Administrador
                </p>
              </div>

              <ChevronDown
                className={`hidden h-3 w-3 transition-transform duration-200 sm:block sm:h-4 sm:w-4 ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="liquid-card animate-slide-down absolute right-0 z-50 mt-3 w-72 rounded-2xl shadow-2xl">
                <div className="border-b border-white/10 bg-gradient-to-br from-primary-50/10 to-transparent p-5">
                  <p className="liquid-nav-text text-base font-bold">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="liquid-description text-sm font-medium">
                    {user?.email}
                  </p>
                </div>

                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="liquid-button group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-all duration-200 hover:bg-red-50/50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4 transition-colors group-hover:text-red-600" />
                    <span className="liquid-button-text text-sm">
                      {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                    </span>
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
