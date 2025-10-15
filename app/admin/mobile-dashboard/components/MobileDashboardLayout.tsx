'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Camera,
  Upload,
  Package,
  Wifi,
  WifiOff,
  Menu,
  X,
  ChevronRight,
  User,
  Settings,
  LogOut,
  CloudUpload,
  Image,
  Users,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface MobileDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  onLogout?: () => void;
}

// Items de navegación específicos para fotógrafos en terreno
const photographerNavigationItems = [
  {
    href: '/admin/mobile-dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/admin/mobile-dashboard/events',
    label: 'Eventos',
    icon: Users,
  },
  {
    href: '/admin/mobile-dashboard/upload',
    label: 'Subir',
    icon: CloudUpload,
  },
  {
    href: '/admin/mobile-dashboard/orders',
    label: 'Pedidos',
    icon: Package,
    badge: 0,
  },
];

export function MobileDashboardLayout({
  children,
  title = 'Dashboard',
  subtitle,
  user,
  onLogout,
}: MobileDashboardLayoutProps) {
  const pathname = usePathname();
  const { isMobileView } = useMobileDetection();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Update active tab based on current path
  useEffect(() => {
    const currentIndex = photographerNavigationItems.findIndex(
      (item) =>
        item.href === pathname ||
        (item.href !== '/admin/mobile-dashboard' && pathname.startsWith(item.href))
    );
    if (currentIndex !== -1) {
      setActiveTab(currentIndex);
    }
  }, [pathname]);

  // Monitor online status
  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  if (!isMobileView) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Enhanced Mobile Header for Photographers */}
      <header className="mobile-header bg-surface/98 fixed left-0 right-0 top-0 z-50 border-b border-border/80 shadow-sm backdrop-blur-xl">
        <div className="safe-area-padding flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="mobile-touch-target rounded-xl bg-muted/80 p-2.5 shadow-sm ring-1 ring-gray-200/50 transition-all duration-200 hover:bg-muted active:bg-muted"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6 text-foreground" />
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Online Status Indicator */}
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </div>
            <button className="mobile-touch-target rounded-xl bg-muted/80 p-2.5 ring-1 ring-gray-200/50 transition-all duration-200 hover:bg-muted active:bg-muted">
              <BarChart3 className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area with proper spacing */}
      <main className="pt-16 pb-20 min-h-screen bg-background">
        <div className="container mx-auto p-4 space-y-6">
          {children}
        </div>
      </main>

      {/* Enhanced Bottom Navigation for Photographers */}
      <nav className="mobile-nav bg-surface/98 fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2.5 pb-safe-bottom">
          {photographerNavigationItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === index;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'mobile-touch-target relative flex flex-col items-center justify-center rounded-xl transition-all duration-300',
                  'min-w-0 flex-1 px-2 py-2.5',
                  isActive
                    ? 'bg-primary-50/60 text-primary-600'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground active:text-primary-600'
                )}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(index)}
              >
                <div className="relative">
                  <Icon
                    className={clsx(
                      'h-6 w-6 transition-all duration-300',
                      isActive ? 'scale-110' : 'scale-100'
                    )}
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -right-2.5 -top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-foreground shadow-sm ring-2 ring-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={clsx(
                    'mt-1.5 max-w-full truncate text-xs font-medium',
                    isActive
                      ? 'font-semibold text-primary-700'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>

                {/* Enhanced active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-1/2 top-1 h-1.5 w-10 -translate-x-1/2 -translate-y-1 rounded-full bg-primary-600 shadow-sm"
                    transition={{
                      type: 'spring',
                      duration: 0.5,
                      damping: 20,
                      stiffness: 300,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-out Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Enhanced Menu Panel for Photographers */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{
                type: 'tween',
                duration: 0.3,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="bg-surface/98 fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] shadow-2xl ring-1 ring-gray-200/50 backdrop-blur-xl"
            >
              {/* Enhanced Menu Header */}
              <div className="border-b border-border/80 bg-gradient-to-b from-gray-50/30 to-transparent p-6 pt-16">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'Fotógrafo'}
                        className="h-12 w-12 rounded-full shadow-sm ring-2 ring-gray-200"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-md ring-2 ring-primary-200">
                        <Camera className="h-6 w-6 text-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        {user?.name || 'Fotógrafo'}
                      </p>
                      <p className="text-sm text-muted-foreground0 dark:text-muted-foreground">
                        {user?.email || 'Modo offline'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="mobile-touch-target -m-2 rounded-xl bg-muted/80 p-2.5 ring-1 ring-gray-200/50 transition-all duration-200 hover:bg-muted"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-6 w-6 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Enhanced Menu Items */}
              <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1.5 px-4">
                  {photographerNavigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/admin/mobile-dashboard' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'mobile-touch-target group flex items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-200',
                          isActive
                            ? 'border-l-4 border-primary-600 bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                            : 'text-foreground hover:bg-muted hover:shadow-sm active:bg-muted'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon
                            className={clsx(
                              'h-6 w-6 transition-all duration-200',
                              isActive
                                ? 'text-primary-600'
                                : 'text-muted-foreground0 group-hover:text-foreground'
                            )}
                          />
                          <span
                            className={clsx(
                              'font-medium transition-colors duration-200',
                              isActive
                                ? 'text-primary-700'
                                : 'text-foreground group-hover:text-foreground'
                            )}
                          >
                            {item.label}
                          </span>
                          {item.badge && item.badge > 0 && (
                            <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm ring-1 ring-red-100">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <ChevronRight
                          className={clsx(
                            'h-5 w-5 transition-all duration-200',
                            isActive
                              ? 'text-primary-500'
                              : 'text-muted-foreground group-hover:text-muted-foreground'
                          )}
                        />
                      </Link>
                    );
                  })}
                </nav>

                {/* Settings & Logout */}
                <div className="mt-6 space-y-1 border-t border-border px-4 pt-6">
                  <Link
                    href="/admin/settings"
                    className="mobile-touch-target flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-foreground transition-all duration-200 hover:bg-muted active:bg-muted"
                  >
                    <Settings className="h-6 w-6 text-muted-foreground0" />
                    <span className="font-medium">Configuración</span>
                  </Link>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="mobile-touch-target flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-red-600 transition-all duration-200 hover:bg-red-50 active:bg-red-100"
                    >
                      <LogOut className="h-6 w-6" />
                      <span className="font-medium">Cerrar sesión</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
