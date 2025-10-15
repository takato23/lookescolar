'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileNavigation } from './MobileNavigationProvider';
import {
  ChevronRight,
  Menu,
  X,
  Home,
  Calendar,
  Camera,
  Package,
  Settings,
  Users,
  BarChart3,
  ShoppingBag,
  Image,
  FileText,
  HelpCircle,
  LogOut,
  User,
} from 'lucide-react';
import { clsx } from 'clsx';

export function MobileNavigation() {
  const {
    isMobile,
    showMobileMenu,
    setShowMobileMenu,
    navigationItems,
    navigateTo,
    getActiveItem,
  } = useMobileNavigation();

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const activeItem = getActiveItem();

  useEffect(() => {
    if (activeItem?.children) {
      setExpandedItems(prev => [...prev, activeItem.id]);
    }
  }, [activeItem]);

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  if (!isMobile) return null;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="mobile-nav bg-surface/98 fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 shadow-lg backdrop-blur-xl">
        <div className="flex items-center justify-around px-2 py-2.5 pb-safe-bottom">
          {navigationItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeItem?.id === item.id ||
              (item.children && expandedItems.includes(item.id));

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.children && item.children.length > 0) {
                    toggleExpanded(item.id);
                  } else {
                    navigateTo(item.href);
                  }
                }}
                className={clsx(
                  'mobile-touch-target relative flex flex-col items-center justify-center rounded-xl transition-all duration-300',
                  'min-w-0 flex-1 px-2 py-2.5',
                  isActive
                    ? 'bg-primary-50/60 text-primary-600'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground active:text-primary-600'
                )}
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
                  {item.children && item.children.length > 0 && (
                    <ChevronRight
                      className={clsx(
                        'absolute -right-1 -top-1 h-3 w-3 transition-transform',
                        expandedItems.includes(item.id) ? 'rotate-90' : 'rotate-0'
                      )}
                    />
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
              </button>
            );
          })}
        </div>
      </nav>

      {/* Side Menu */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowMobileMenu(false)}
            />

            {/* Menu Panel */}
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
              {/* Header */}
              <div className="border-b border-border/80 bg-gradient-to-b from-gray-50/30 to-transparent p-6 pt-16">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-700 shadow-md ring-2 ring-primary-200">
                      <User className="h-6 w-6 text-foreground" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-foreground">
                        Panel de Administración
                      </p>
                      <p className="text-sm text-muted-foreground0 dark:text-muted-foreground">
                        LookEscolar
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className="mobile-touch-target -m-2 rounded-xl bg-muted/80 p-2.5 ring-1 ring-gray-200/50 transition-all duration-200 hover:bg-muted"
                  >
                    <X className="h-6 w-6 text-foreground" />
                  </button>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1.5 px-4">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeItem?.id === item.id;
                    const isExpanded = expandedItems.includes(item.id);

                    return (
                      <div key={item.id}>
                        <button
                          onClick={() => {
                            if (item.children && item.children.length > 0) {
                              toggleExpanded(item.id);
                            } else {
                              navigateTo(item.href);
                            }
                          }}
                          className={clsx(
                            'mobile-touch-target group flex w-full items-center justify-between rounded-xl px-4 py-3.5 transition-all duration-200',
                            isActive
                              ? 'border-l-4 border-primary-600 bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                              : 'text-foreground hover:bg-muted hover:shadow-sm active:bg-muted'
                          )}
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
                          {item.children && item.children.length > 0 && (
                            <ChevronRight
                              className={clsx(
                                'h-5 w-5 transition-all duration-200',
                                isActive
                                  ? 'text-primary-500'
                                  : 'text-muted-foreground group-hover:text-muted-foreground',
                                isExpanded ? 'rotate-90' : 'rotate-0'
                              )}
                            />
                          )}
                        </button>

                        {/* Submenu */}
                        <AnimatePresence>
                          {item.children && isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="ml-7 space-y-1 overflow-hidden"
                            >
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive = activeItem?.id === child.id;

                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => navigateTo(child.href)}
                                    className={clsx(
                                      'mobile-touch-target group flex w-full items-center space-x-3 rounded-lg px-4 py-2.5 text-left transition-all duration-200',
                                      isChildActive
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                  >
                                    <ChildIcon className="h-5 w-5" />
                                    <span className="text-sm font-medium">
                                      {child.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </nav>

                {/* Footer Actions */}
                <div className="mt-6 space-y-1 border-t border-border px-4 pt-6">
                  <button className="mobile-touch-target flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-foreground transition-all duration-200 hover:bg-muted active:bg-muted">
                    <HelpCircle className="h-6 w-6 text-muted-foreground0" />
                    <span className="font-medium">Ayuda</span>
                  </button>

                  <button className="mobile-touch-target flex w-full items-center space-x-3 rounded-xl px-4 py-3 text-red-600 transition-all duration-200 hover:bg-red-50 active:bg-red-100">
                    <LogOut className="h-6 w-6" />
                    <span className="font-medium">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Menu Button */}
      <button
        onClick={() => setShowMobileMenu(true)}
        className="mobile-touch-target fixed bottom-20 right-4 z-30 rounded-full bg-primary-600 p-4 text-foreground shadow-lg transition-all duration-200 hover:bg-primary-700 active:scale-95"
      >
        <Menu className="h-6 w-6" />
      </button>
    </>
  );
}
