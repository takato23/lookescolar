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
    name?: string | undefined;
    email?: string | undefined;
    avatar?: string | undefined;
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
      {/* Apple-grade Mobile Header with enhanced clarity */}
      <header className="mobile-header fixed top-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-xl border-b border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3.5 safe-area-padding">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="mobile-touch-target p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 shadow-sm ring-1 ring-gray-200/50"
              aria-label="Abrir menú"
            >
              <Menu className="h-6 w-6 text-gray-800" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">LookEscolar</h1>
          </div>

          <div className="flex items-center space-x-2">
            <button className="mobile-touch-target p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 ring-1 ring-gray-200/50">
              <Search className="h-5 w-5 text-gray-700" />
            </button>
            <button className="mobile-touch-target p-2.5 rounded-xl bg-gray-50/80 hover:bg-gray-100 active:bg-gray-200 transition-all duration-200 relative ring-1 ring-gray-200/50">
              <Bell className="h-5 w-5 text-gray-700" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full ring-2 ring-white shadow-sm"></span>
            </button>
          </div>
        </div>
      </header>

      {/* Apple-grade Bottom Navigation with enhanced visibility */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-xl border-t border-gray-200/80 shadow-lg">
        <div className="flex items-center justify-around px-2 py-2.5 pb-safe-bottom">
          {items.slice(0, 4).map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === index;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative flex flex-col items-center justify-center mobile-touch-target rounded-xl transition-all duration-300',
                  'min-w-0 flex-1 py-2.5 px-2',
                  isActive
                    ? 'text-primary-600 bg-primary-50/60'
                    : 'text-gray-600 hover:text-gray-800 active:text-primary-600 hover:bg-gray-50/60'
                )}
                onClick={() => setActiveTab(index)}
              >
                <div className="relative">
                  <Icon className={clsx(
                    'h-6 w-6 transition-all duration-300',
                    isActive ? 'scale-110' : 'scale-100'
                  )} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-2.5 -right-2.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={clsx(
                  'text-xs mt-1.5 truncate max-w-full font-medium',
                  isActive ? 'text-primary-700 font-semibold' : 'text-gray-600'
                )}>
                  {item.label}
                </span>

                {/* Enhanced active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-1 left-1/2 -translate-x-1/2 -translate-y-1 h-1.5 w-10 bg-primary-600 rounded-full shadow-sm"
                    transition={{ type: "spring", duration: 0.5, damping: 20, stiffness: 300 }}
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

            {/* Apple-grade Menu Panel with enhanced clarity */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed left-0 top-0 z-50 h-full w-80 max-w-[85vw] bg-white/98 backdrop-blur-xl shadow-2xl ring-1 ring-gray-200/50"
            >
              {/* Enhanced Menu Header */}
              <div className="border-b border-gray-200/80 p-6 pt-16 bg-gradient-to-b from-gray-50/30 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'Usuario'}
                        className="h-12 w-12 rounded-full ring-2 ring-gray-200 shadow-sm"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-full flex items-center justify-center shadow-md ring-2 ring-primary-200">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-base">
                        {user?.name || 'Usuario'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {user?.email || 'Sin cuenta'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="mobile-touch-target p-2.5 -m-2 rounded-xl bg-gray-50/80 hover:bg-gray-100 transition-all duration-200 ring-1 ring-gray-200/50"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-6 w-6 text-gray-700" />
                  </button>
                </div>
              </div>

              {/* Enhanced Menu Items */}
              <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1.5 px-4">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || 
                      (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'flex items-center justify-between mobile-touch-target rounded-xl px-4 py-3.5 transition-all duration-200 group',
                          isActive
                            ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600 shadow-sm ring-1 ring-primary-100'
                            : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100 hover:shadow-sm'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={clsx(
                            'h-6 w-6 transition-all duration-200',
                            isActive ? 'text-primary-600' : 'text-gray-500 group-hover:text-gray-700'
                          )} />
                          <span className={clsx(
                            'font-medium transition-colors duration-200',
                            isActive ? 'text-primary-700' : 'text-gray-700 group-hover:text-gray-900'
                          )}>{item.label}</span>
                          {item.badge && item.badge > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ring-1 ring-red-100">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <ChevronRight className={clsx(
                          'h-5 w-5 transition-all duration-200',
                          isActive ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-600'
                        )} />
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
