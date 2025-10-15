'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  Calendar,
  Package,
  Camera,
  Upload,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  Search,
  Plus,
  User,
  QrCode,
  BarChart3,
  Send,
  Eye,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Activity,
  DollarSign,
  Zap,
  Filter,
  SortAsc,
  RefreshCw,
  Download,
  Share2,
  MoreVertical,
  ChevronDown,
  Bookmark,
  Star,
  Heart,
  MessageSquare,
  TrendingUp,
  Shield,
  Globe
} from 'lucide-react';
import { PremiumIconButton, PremiumGlassButton } from './premium-glass-button';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  title?: string;
  showSearch?: boolean;
  showNotifications?: boolean;
  showAddButton?: boolean;
  onAddClick?: () => void;
  showQuickActions?: boolean;
  showStats?: boolean;
}

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  color: string;
  badge?: number;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function MobileNav({ 
  title = 'Dashboard', 
  showSearch = true,
  showNotifications = true,
  showAddButton = false,
  onAddClick,
  showQuickActions = false,
  showStats = false
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showQuickActionPanel, setShowQuickActionPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Quick actions data
  const quickActions: QuickAction[] = [
    { icon: Upload, label: 'Subir', href: '/mockup/admin/upload', color: 'blue' },
    { icon: QrCode, label: 'QR', href: '/mockup/admin/qr', color: 'purple' },
    { icon: BarChart3, label: 'Stats', href: '/mockup/admin/analytics', color: 'green' },
    { icon: Plus, label: 'Nuevo', href: '/mockup/admin/events/new', color: 'orange' },
  ];

  // Notifications data
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Fotos Procesadas',
      message: '45 fotos nuevas procesadas',
      time: '5 min',
      read: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Nuevo Pedido',
      message: 'María García - 8 fotos',
      time: '15 min',
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Almacenamiento',
      message: '85% del espacio utilizado',
      time: '1 hora',
      read: true
    },
  ];

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const menuItems = [
    { href: '/mockup/admin', icon: Home, label: 'Dashboard', color: 'blue' },
    { href: '/mockup/admin/events', icon: Calendar, label: 'Eventos', color: 'green' },
    { href: '/mockup/admin/photos', icon: Camera, label: 'Fotos', color: 'purple' },
    { href: '/mockup/admin/upload', icon: Upload, label: 'Subir Fotos', color: 'blue' },
    { href: '/mockup/admin/students', icon: Users, label: 'Estudiantes', color: 'cyan' },
    { href: '/mockup/admin/orders', icon: Package, label: 'Pedidos', color: 'orange' },
    { href: '/mockup/admin/publish', icon: Send, label: 'Publicar', color: 'pink' },
    { href: '/mockup/admin/analytics', icon: BarChart3, label: 'Análisis', color: 'indigo' },
    { href: '/mockup/admin/settings', icon: Settings, label: 'Configuración', color: 'gray' },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 nav-glass-futuristic">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <PremiumIconButton
              onClick={() => setIsOpen(!isOpen)}
              variant="default"
              size="md"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </PremiumIconButton>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {showSearch && (
              <PremiumIconButton
                onClick={() => setShowSearchBar(!showSearchBar)}
                variant="default"
                size="sm"
              >
                <Search className="h-4 w-4" />
              </PremiumIconButton>
            )}
            {showNotifications && (
              <PremiumIconButton
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                variant="default"
                size="sm"
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </PremiumIconButton>
            )}
            {showAddButton && (
              <PremiumIconButton
                onClick={onAddClick}
                variant="primary"
                size="sm"
                glow
              >
                <Plus className="h-4 w-4" />
              </PremiumIconButton>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearchBar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/10"
            >
              <div className="p-4">
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full px-4 py-2 glass-button-ios26 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Spacer for fixed header */}
      <div className="lg:hidden h-16" />

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />

              {/* Menu Panel */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 w-80 max-w-[85vw] z-50 glass-card-magnetic overflow-y-auto"
              >
              {/* Menu Header */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    LookEscolar
                  </h2>
                  <PremiumIconButton
                    onClick={() => setIsOpen(false)}
                    variant="default"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </PremiumIconButton>
                </div>
                <div className="glass-button-ios26 rounded-xl p-3">
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Admin Panel</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">admin@lookescolar.com</p>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="p-4">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex items-center justify-between p-3 mb-2 rounded-xl transition-all",
                          isActive
                            ? "glass-button-ios26 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30"
                            : "glass-button-ios26 hover:bg-white/10"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isActive
                              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20"
                              : "bg-white/5"
                          )}>
                            <Icon className={cn(
                              "h-5 w-5",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-muted-foreground dark:text-gray-400"
                            )} />
                          </div>
                          <span className={cn(
                            "font-medium",
                            isActive
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-foreground dark:text-gray-300"
                          )}>
                            {item.label}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>

              {/* Menu Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-between p-3 rounded-xl glass-button-ios26 hover:bg-red-500/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      Cerrar Sesión
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-red-400" />
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotificationPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setShowNotificationPanel(false)}
            />
            <motion.div
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed top-16 left-4 right-4 z-50 glass-card-ios26 backdrop-blur-xl rounded-2xl max-h-[60vh] overflow-hidden"
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Notificaciones</h3>
                  <PremiumIconButton
                    onClick={() => setShowNotificationPanel(false)}
                    variant="default"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </PremiumIconButton>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "p-3 rounded-xl glass-button-ios26 border-l-4",
                        notification.type === 'success' && "border-green-500",
                        notification.type === 'info' && "border-blue-500",
                        notification.type === 'warning' && "border-yellow-500",
                        notification.type === 'error' && "border-red-500",
                        !notification.read && "bg-blue-500/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-1.5 rounded-lg flex-shrink-0",
                          notification.type === 'success' && "bg-green-500/10",
                          notification.type === 'info' && "bg-blue-500/10",
                          notification.type === 'warning' && "bg-yellow-500/10",
                          notification.type === 'error' && "bg-red-500/10"
                        )}>
                          {notification.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                          {notification.type === 'info' && <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                          {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                          {notification.type === 'error' && <X className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{notification.title}</p>
                          <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">{notification.time}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <PremiumGlassButton variant="primary" className="w-full" size="sm">
                    Ver Todas
                  </PremiumGlassButton>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <AnimatePresence>
          {showQuickActionPanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setShowQuickActionPanel(false)}
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="lg:hidden fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 max-w-[90vw] z-50 glass-card-ios26 backdrop-blur-xl rounded-2xl"
              >
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Acciones Rápidas</h3>
                    <PremiumIconButton
                      onClick={() => setShowQuickActionPanel(false)}
                      variant="default"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </PremiumIconButton>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action, index) => {
                      const Icon = action.icon;
                      return (
                        <Link key={action.label} href={action.href}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center gap-2 p-4 rounded-xl glass-button-ios26 hover:bg-white/10 transition-all cursor-pointer"
                            onClick={() => setShowQuickActionPanel(false)}
                          >
                            <div className={cn(
                              "p-3 rounded-xl bg-gradient-to-r",
                              action.color === 'blue' && "from-blue-500/10 to-cyan-500/10",
                              action.color === 'purple' && "from-purple-500/10 to-pink-500/10",
                              action.color === 'green' && "from-green-500/10 to-emerald-500/10",
                              action.color === 'orange' && "from-orange-500/10 to-red-500/10"
                            )}>
                              <Icon className={cn(
                                "h-6 w-6",
                                action.color === 'blue' && "text-blue-600 dark:text-blue-400",
                                action.color === 'purple' && "text-purple-600 dark:text-purple-400",
                                action.color === 'green' && "text-green-600 dark:text-green-400",
                                action.color === 'orange' && "text-orange-600 dark:text-orange-400"
                              )} />
                            </div>
                            <span className="text-sm font-medium text-center">
                              {action.label}
                            </span>
                            {action.badge && (
                              <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs">
                                {action.badge}
                              </span>
                            )}
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <PremiumGlassButton 
                      variant="default" 
                      className="w-full" 
                      size="sm"
                      onClick={() => setShowQuickActionPanel(false)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Personalizar
                    </PremiumGlassButton>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      )}
    </>
  );
}

// Mobile Bottom Navigation
export function MobileBottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/mockup/admin', icon: Home, label: 'Inicio' },
    { href: '/mockup/admin/events', icon: Calendar, label: 'Eventos' },
    { href: '/mockup/admin/photos', icon: Camera, label: 'Fotos' },
    { href: '/mockup/admin/orders', icon: Package, label: 'Pedidos' },
    { href: '/mockup/admin/settings', icon: Settings, label: 'Ajustes' },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-card-ios26 backdrop-blur-xl border-t border-white/10">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all",
                  isActive && "bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground dark:text-gray-400"
                )} />
                <span className={cn(
                  "text-xs",
                  isActive
                    ? "text-blue-600 dark:text-blue-400 font-medium"
                    : "text-muted-foreground dark:text-gray-400"
                )}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
