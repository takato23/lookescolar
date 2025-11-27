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
  ImageIcon,
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  Share2,
} from 'lucide-react';
import { LookEscolarLogo } from '@/components/ui/branding/LookEscolarLogo';
import { LiquidThemeToggle } from '@/components/ui/theme/LiquidThemeToggle';

// Nav items for quick access
const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', shortLabel: 'Home' },
  { href: '/admin/events', icon: Calendar, label: 'Eventos' },
  { href: '/admin/photos', icon: ImageIcon, label: 'Fotos' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Pedidos' },
  { href: '/admin/publish', icon: Share2, label: 'Publicar' },
];

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

  // Check if current path matches nav item
  const isActiveNav = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-4 z-50 px-4 sm:px-6 lg:px-8">
      {/* Main Header - Enhanced Liquid Glass Frosted Effect */}
      <div
        className="liquid-glass-navbar relative flex items-center justify-between gap-4 rounded-[28px] px-4 py-3 sm:px-6 lg:gap-6"
      >
        {/* Liquid Glass Glow Effect */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-r from-cyan-500/10 via-purple-500/5 to-pink-500/10 opacity-60 blur-xl" />

        {/* Inner Highlight */}
        <div className="pointer-events-none absolute inset-[1px] rounded-[27px] bg-gradient-to-b from-white/20 to-transparent opacity-80" />

        {/* Left Section: Mobile Menu & Title */}
        <div className="relative flex flex-1 items-center gap-4">
          <button
            onClick={onMobileMenuToggle}
            className="liquid-glass-nav-item group rounded-xl p-2 lg:hidden"
            aria-label="Abrir menú"
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

        {/* Center Section: Quick Nav Pills */}
        <nav className="relative hidden items-center gap-1 lg:flex">
          <div className="liquid-glass-nav-container flex items-center gap-1 rounded-2xl p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveNav(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`
                    liquid-glass-nav-pill group relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300
                    ${isActive
                      ? 'liquid-glass-nav-active bg-white/20 text-slate-900 shadow-lg dark:bg-white/15 dark:text-white'
                      : 'text-slate-600 hover:bg-white/15 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                    }
                  `}
                  title={item.label}
                >
                  {/* Active indicator glow */}
                  {isActive && (
                    <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400/20 via-purple-400/20 to-pink-400/20 blur-sm" />
                  )}
                  <Icon className={`relative h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="relative hidden xl:inline">{item.shortLabel || item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Right Section: Search, Theme, Notifications, Profile */}
        <div className="relative flex flex-1 items-center justify-end gap-3 sm:gap-4">
          {/* Search Bar (Desktop) */}
          <div className="liquid-glass-search group relative hidden items-center gap-2.5 rounded-full px-4 py-2 lg:flex">
            <Search className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-48 bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-200 xl:w-64"
            />
            <kbd className="hidden rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400 xl:inline">
              ⌘K
            </kbd>
          </div>

          <div className="hidden h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent sm:block" />

          <div className="hidden sm:block">
            <div className="liquid-glass-nav-item rounded-xl p-1.5">
              <LiquidThemeToggle size="md" />
            </div>
          </div>

          <button
            className="liquid-glass-nav-item group relative hidden rounded-xl p-2 sm:flex"
            aria-label="Notificaciones"
          >
            <Bell className="h-5 w-5 text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white" />
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-gradient-to-r from-rose-500 to-pink-500 ring-2 ring-white/50 dark:ring-slate-900/50" />
          </button>

          <button
            onClick={() => router.push('/admin/settings')}
            className="liquid-glass-nav-item group hidden rounded-xl p-2 sm:flex"
            title="Configuración"
            aria-label="Configuración"
          >
            <Settings className="h-5 w-5 text-slate-600 transition-transform duration-500 group-hover:rotate-90 group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="liquid-glass-user-button group flex items-center gap-3 rounded-full pl-1.5 pr-2.5 py-1.5 sm:pr-4"
              aria-label="Menú de usuario"
              aria-expanded={showUserMenu}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 text-xs font-bold text-white shadow-lg shadow-purple-500/30">
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
              <div className="liquid-glass-dropdown absolute right-0 z-50 mt-4 w-72 overflow-hidden rounded-3xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Dropdown glow */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent" />

                <div className="relative rounded-2xl bg-white/10 p-4 dark:bg-white/5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                </div>
                <div className="relative mt-2">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="liquid-glass-nav-item group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-600 hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-55 dark:text-slate-300 dark:hover:text-rose-400"
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
