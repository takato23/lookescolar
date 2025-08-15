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
import { HeaderThemeToggle } from '@/components/ui/theme-toggle';

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
    if (pathname === '/admin') return 'Dashboard';
    if (pathname.startsWith('/admin/events')) return 'Eventos';
    if (pathname.startsWith('/admin/photos')) return 'Fotos';
    if (pathname.startsWith('/admin/subjects')) return 'Estudiantes';
    if (pathname.startsWith('/admin/orders')) return 'Pedidos';
    if (pathname.startsWith('/admin/tagging')) return 'Etiquetado';
    return 'Panel de Administración';
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
    <header className="glass-card bg-card/90 border-border/50 border-b px-4 py-4 shadow-2xl shadow-black/10 backdrop-blur-2xl transition-all duration-300 sm:px-6 lg:px-8 lg:py-5">
      <div className="flex items-center justify-between">
        {/* Left Section - Mobile Menu + Page Title */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Mobile Menu Button */}
          <button
            onClick={onMobileMenuToggle}
            className="bg-muted/50 hover:bg-muted border-border rounded-xl border p-2 transition-all duration-200 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="text-foreground h-5 w-5" />
          </button>

          <div>
            <h1 className="mb-1 text-xl font-bold tracking-tight sm:text-2xl lg:text-3xl text-menu-enhanced">
              {getPageTitle()}
            </h1>
            <p className="hidden text-xs font-medium sm:block sm:text-sm text-button-enhanced">
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
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform" />
            <input
              type="text"
              placeholder="Buscar..."
              className="bg-muted/40 border-border text-foreground placeholder-muted-foreground focus:ring-primary/50 focus:border-primary/50 w-64 rounded-xl border py-2.5 pl-10 pr-4 font-medium shadow-lg shadow-black/10 transition-all hover:shadow-xl focus:outline-none focus:ring-2 xl:w-72"
            />
          </div>

          {/* Theme Toggle - Always visible */}
          <div className="hidden sm:block">
            <HeaderThemeToggle />
          </div>

          {/* Notifications - Hidden on mobile */}
          <button
            className="bg-muted/50 hover:bg-muted border-border group relative hidden rounded-xl border p-2 shadow-md shadow-black/10 transition-all duration-200 hover:scale-105 hover:shadow-lg sm:block sm:p-2.5"
            aria-label="Notificaciones"
          >
            <Bell className="text-muted-foreground group-hover:text-foreground h-4 w-4 sm:h-5 sm:w-5" />
            <span className="bg-warning absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full" />
          </button>

          {/* Settings - Hidden on mobile */}
          <button
            onClick={() => router.push('/admin/settings')}
            className="bg-muted/50 hover:bg-muted border-border group hidden rounded-xl border p-2 transition-all duration-200 hover:scale-105 hover:shadow-md sm:block sm:p-2.5"
            title="Configuración"
            aria-label="Configuración"
          >
            <Settings className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-all group-hover:rotate-45 sm:h-5 sm:w-5" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="bg-muted/50 hover:bg-muted border-border group flex items-center gap-2 rounded-xl border p-1.5 transition-all duration-200 hover:shadow-md sm:gap-3 sm:p-2"
              aria-label="Menú de usuario"
              aria-expanded={showUserMenu}
            >
              {/* Avatar */}
              <div className="from-primary via-primary to-secondary ring-primary/20 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br shadow-lg ring-2 sm:h-10 sm:w-10 sm:rounded-xl">
                <span className="text-sm font-bold text-white sm:text-base">
                  {user?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>

              {/* User info - Hidden on mobile */}
              <div className="hidden text-left sm:block lg:block">
                <p className="text-foreground text-xs font-semibold sm:text-sm">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-muted-foreground hidden text-xs font-medium lg:block">
                  Administrador
                </p>
              </div>

              <ChevronDown
                className={`text-muted-foreground hidden h-3 w-3 transition-transform duration-200 sm:block sm:h-4 sm:w-4 ${showUserMenu ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="glass-ultra bg-card/98 animate-slide-down absolute right-0 z-50 mt-3 w-72 rounded-2xl border border-white/10 shadow-2xl shadow-black/20 ring-1 ring-white/10 backdrop-blur-2xl">
                <div className="border-border/50 from-primary/5 border-b bg-gradient-to-br to-transparent p-5">
                  <p className="text-foreground text-base font-bold">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-muted-foreground text-sm font-medium">
                    {user?.email}
                  </p>
                </div>

                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:shadow-3d-sm group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-medium transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-50"
                  >
                    <LogOut className="group-hover:text-destructive h-4 w-4 transition-colors" />
                    <span className="text-sm">
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
