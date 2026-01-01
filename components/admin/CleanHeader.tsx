'use client';

import { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Menu,
  X,
  Sun,
  Moon,
  Command,
  LogOut,
  Settings,
  User as UserIcon,
  ChevronDown,
  LayoutDashboard,
  Calendar,
  ImageIcon,
  ShoppingCart,
  Share2,
} from 'lucide-react';
import { useResolvedTheme, useTheme } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';

interface CleanHeaderProps {
  user: User;
  onMobileMenuToggle?: () => void;
}

// Navigation items for mobile menu
const mobileNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/admin/events', icon: Calendar, label: 'Eventos' },
  { href: '/admin/photos', icon: ImageIcon, label: 'Fotos' },
  { href: '/admin/publish', icon: Share2, label: 'Publicar' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Pedidos' },
  { href: '/admin/settings', icon: Settings, label: 'Ajustes' },
];

// Map pathname to page info
const getPageInfo = (pathname: string): { title: string; subtitle?: string } => {
  if (pathname === '/admin') return { title: 'Dashboard', subtitle: 'Resumen general' };
  if (pathname.startsWith('/admin/events')) return { title: 'Eventos', subtitle: 'Gestion de eventos' };
  if (pathname.startsWith('/admin/photos')) return { title: 'Fotos', subtitle: 'Biblioteca multimedia' };
  if (pathname.startsWith('/admin/orders')) return { title: 'Pedidos', subtitle: 'Seguimiento de ventas' };
  if (pathname.startsWith('/admin/publish')) return { title: 'Publicar', subtitle: 'Compartir con clientes' };
  if (pathname.startsWith('/admin/settings')) return { title: 'Ajustes', subtitle: 'Configuracion del estudio' };
  if (pathname.startsWith('/admin/store-settings')) return { title: 'Tienda', subtitle: 'Configuracion de tienda' };
  return { title: 'Admin' };
};

// Check if nav item is active
const isNavItemActive = (href: string, pathname: string): boolean => {
  if (href === '/admin') return pathname === '/admin';
  return pathname.startsWith(href);
};

export default function CleanHeader({ user }: CleanHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedTheme = useResolvedTheme();
  const { setTheme } = useTheme();
  const pageInfo = getPageInfo(pathname);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Admin';
  const userInitial = userName.charAt(0).toUpperCase();
  const userEmail = user?.email || '';

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    }

    if (showUserMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu, showMobileMenu]);

  // Close mobile menu on navigation
  useEffect(() => {
    setShowMobileMenu(false);
  }, [pathname]);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { authClient } = await import('@/lib/supabase/auth-client');
      await authClient.logout();
      router.replace('/login');
    } catch (err) {
      console.error('Error during logout:', err);
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        "header-modern liquid-glass-navbar",
        showMobileMenu && "header-menu-open"
      )}
    >
      {/* Liquid Glass Glow Effect */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 opacity-60 blur-xl" />

      <div className="header-modern-container relative">
        {/* Left Section */}
        <div className="header-modern-left">
          {/* Mobile Menu Button - toggles inline menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="header-mobile-menu-btn lg:hidden"
            aria-label={showMobileMenu ? "Cerrar menu" : "Abrir menu"}
            aria-expanded={showMobileMenu}
          >
            {showMobileMenu ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          {/* Breadcrumb / Page Title */}
          <div className="header-page-info">
            <h1 className="header-page-title">{pageInfo.title}</h1>
            {pageInfo.subtitle && (
              <p className="header-page-subtitle">{pageInfo.subtitle}</p>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="header-modern-right">
          {/* Search */}
          <div className="header-search liquid-glass-search">
            <Search className="header-search-icon" />
            <input
              type="text"
              placeholder="Buscar..."
              className="header-search-input"
            />
            <kbd className="header-search-shortcut">
              <Command className="w-3 h-3" />K
            </kbd>
          </div>

          {/* Divider */}
          <div className="header-divider bg-gradient-to-b from-transparent via-slate-300/50 to-transparent dark:via-white/10" />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="header-icon-btn liquid-glass-nav-item"
            aria-label="Cambiar tema"
            title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>

          {/* Notifications */}
          <button className="header-icon-btn liquid-glass-nav-item header-notifications" aria-label="Notificaciones">
            <Bell className="w-5 h-5" />
            <span className="header-notification-badge !bg-gradient-to-r !from-rose-500 !to-pink-500" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="header-user-btn liquid-glass-user-button"
              aria-expanded={showUserMenu}
            >
              <div className="header-user-avatar !bg-gradient-to-br !from-cyan-400 !via-purple-500 !to-pink-500 !shadow-lg !shadow-purple-500/20">{userInitial}</div>
              <span className="header-user-name">{userName}</span>
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform duration-200',
                showUserMenu && 'rotate-180'
              )} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="header-user-dropdown liquid-glass-dropdown">
                {/* User Info */}
                <div className="header-user-info">
                  <div className="header-user-avatar-large">{userInitial}</div>
                  <div>
                    <p className="header-user-dropdown-name">{userName}</p>
                    <p className="header-user-dropdown-email">{userEmail}</p>
                  </div>
                </div>

                <div className="header-dropdown-divider" />

                {/* Menu Items */}
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/admin/settings');
                  }}
                  className="header-dropdown-item"
                >
                  <Settings className="w-4 h-4" />
                  Configuracion
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    router.push('/admin/settings/profile');
                  }}
                  className="header-dropdown-item"
                >
                  <UserIcon className="w-4 h-4" />
                  Mi Perfil
                </button>

                <div className="header-dropdown-divider" />

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="header-dropdown-item header-dropdown-item--danger"
                >
                  <LogOut className="w-4 h-4" />
                  {isLoggingOut ? 'Cerrando sesion...' : 'Cerrar sesion'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu - Expands from header */}
      <div className="header-mobile-menu lg:hidden">
        <nav className="header-mobile-nav">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavItemActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "header-mobile-nav-item",
                  isActive && "active"
                )}
              >
                <Icon />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
