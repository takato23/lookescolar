'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Camera,
  ShoppingCart,
  User,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  Settings,
  LogOut,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useMobileDetection } from '@/hooks/useMobileDetection';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  external?: boolean;
}

interface MobileNavigationProps {
  items: NavigationItem[];
  user?: {
    name?: string;
    email?: string;
    avatar?: string;
  } | null;
  onLogout?: () => void;
  className?: string;
}

export function MobileNavigation({
  items,
  user,
  onLogout,
  className,
}: MobileNavigationProps) {
  const pathname = usePathname();
  const { isMobileView } = useMobileDetection();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Update active tab based on current path
  useEffect(() => {
    const currentIndex = items.findIndex(item => 
      item.href === pathname || (item.href !== '/' && pathname.startsWith(item.href))
    );
    if (currentIndex !== -1) {
      setActiveTab(currentIndex);
    }
  }, [pathname, items]);

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
    return null;
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200">
        <div className="flex items-center justify-between px-3 py-2 safe-area-padding">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="mobile-touch-target p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
            <h1 className="text-base font-bold text-menu-enhanced">LookEscolar</h1>
          </div>

          <div className="flex items-center space-x-1">
            <button className="mobile-touch-target p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors">
              <Search className="h-5 w-5 text-gray-600" />
            </button>
            <button className="mobile-touch-target p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Navigation Tabs */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200">
        <div className="flex items-center justify-around px-1 py-1 pb-safe-bottom">
          {items.slice(0, 4).map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === index;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative flex flex-col items-center justify-center mobile-touch-target rounded-lg transition-all duration-200',
                  'min-w-0 flex-1 py-1.5 px-1',
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700 active:text-primary-600'
                )}
                onClick={() => setActiveTab(index)}
              >
                <div className="relative">
                  <Icon className={clsx(
                    'h-6 w-6 transition-all duration-200',
                    isActive ? 'scale-110' : 'scale-100'
                  )} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={clsx(
                  'text-xs mt-1 truncate max-w-full',
                  isActive ? 'text-primary-700 text-button-enhanced font-semibold' : 'text-button-enhanced'
                )}>
                  {item.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 h-1 w-8 bg-primary-600 rounded-full"
                    transition={{ type: "spring", duration: 0.5 }}
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

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-white shadow-2xl"
            >
              {/* Menu Header */}
              <div className="border-b border-gray-200 p-6 pt-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'Usuario'}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-primary-600 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user?.name || 'Usuario'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {user?.email || 'Sin cuenta'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="mobile-touch-target p-2 -m-2 rounded-xl hover:bg-gray-100 transition-colors"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-6 w-6 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-4">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                      (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'flex items-center justify-between mobile-touch-target rounded-xl px-4 py-3 transition-all duration-200',
                          isActive
                            ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={clsx(
                            'h-6 w-6',
                            isActive ? 'text-primary-600' : 'text-gray-500'
                          )} />
                          <span className="text-menu-enhanced">{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </Link>
                    );
                  })}
                </nav>

                {/* Settings & Logout */}
                <div className="border-t border-gray-200 mt-6 pt-6 px-4 space-y-1">
                  <button className="flex items-center space-x-3 mobile-touch-target rounded-xl px-4 py-3 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 w-full">
                    <Settings className="h-6 w-6 text-gray-500" />
                    <span className="font-medium">Configuración</span>
                  </button>

                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="flex items-center space-x-3 mobile-touch-target rounded-xl px-4 py-3 text-red-600 hover:bg-red-50 active:bg-red-100 transition-all duration-200 w-full"
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

// Default navigation items for family view
export const familyNavigationItems: NavigationItem[] = [
  {
    href: '/f',
    label: 'Inicio',
    icon: Home,
  },
  {
    href: '/f/gallery',
    label: 'Galería',
    icon: Camera,
  },
  {
    href: '/f/cart',
    label: 'Carrito',
    icon: ShoppingCart,
    badge: 0, // This should be updated dynamically
  },
  {
    href: '/f/profile',
    label: 'Perfil',
    icon: User,
  },
];

// Default navigation items for admin view
export const adminNavigationItems: NavigationItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: Camera,
  },
  {
    href: '/admin/orders',
    label: 'Pedidos',
    icon: ShoppingCart,
    badge: 0, // This should be updated dynamically
  },
  {
    href: '/admin/settings',
    label: 'Config',
    icon: Settings,
  },
];
