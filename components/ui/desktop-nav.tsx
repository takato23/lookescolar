'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Calendar,
  Camera,
  Upload,
  Users,
  Package,
  Settings,
  Bell,
  Search,
  LogOut,
  Plus,
  User,
  BarChart3,
  QrCode,
  ChevronDown,
  ChevronRight,
  Activity,
  DollarSign,
  FileText,
  Eye,
  Send,
  Download,
  Filter,
  Grid,
  List,
  SortAsc,
  SortDesc,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  Menu,
  Minimize2,
  Maximize2,
  RefreshCw,
  HelpCircle,
  Moon,
  Sun,
  Monitor,
  Zap,
  Shield
} from 'lucide-react';
import { PremiumGlassButton, PremiumIconButton } from './premium-glass-button';
import { cn } from '@/lib/utils';

interface DesktopNavProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  showQuickActions?: boolean;
  showNotifications?: boolean;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  submenu?: NavItem[];
  color?: string;
}

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
  color: string;
  shortcut?: string;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function DesktopNav({ 
  collapsed = false, 
  onCollapsedChange,
  showQuickActions = true,
  showNotifications = true 
}: DesktopNavProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showQuickActionPanel, setShowQuickActionPanel] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const pathname = usePathname();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const navItems: NavItem[] = [
    { 
      href: '/mockup/admin', 
      icon: Home, 
      label: 'Dashboard',
      color: 'blue'
    },
    { 
      href: '/mockup/admin/events', 
      icon: Calendar, 
      label: 'Eventos',
      color: 'green',
      submenu: [
        { href: '/mockup/admin/events', icon: Calendar, label: 'Ver Eventos' },
        { href: '/mockup/admin/events/new', icon: Plus, label: 'Nuevo Evento' },
        { href: '/mockup/admin/events/archive', icon: Package, label: 'Archivados' },
      ]
    },
    { 
      href: '/mockup/admin/photos', 
      icon: Camera, 
      label: 'Fotos',
      color: 'purple',
      badge: 12,
      submenu: [
        { href: '/mockup/admin/photos', icon: Camera, label: 'Galería' },
        { href: '/mockup/admin/upload', icon: Upload, label: 'Subir Fotos' },
        { href: '/mockup/admin/photos/process', icon: Zap, label: 'Procesar' },
      ]
    },
    { 
      href: '/mockup/admin/students', 
      icon: Users, 
      label: 'Estudiantes',
      color: 'cyan',
      submenu: [
        { href: '/mockup/admin/students', icon: Users, label: 'Lista' },
        { href: '/mockup/admin/students/import', icon: Upload, label: 'Importar' },
        { href: '/mockup/admin/qr', icon: QrCode, label: 'Códigos QR' },
      ]
    },
    { 
      href: '/mockup/admin/orders', 
      icon: Package, 
      label: 'Pedidos',
      color: 'orange',
      badge: 3,
      submenu: [
        { href: '/mockup/admin/orders', icon: Package, label: 'Ver Pedidos' },
        { href: '/mockup/admin/orders/pending', icon: Clock, label: 'Pendientes' },
        { href: '/mockup/admin/orders/completed', icon: CheckCircle2, label: 'Completados' },
      ]
    },
    { 
      href: '/mockup/admin/publish', 
      icon: Send, 
      label: 'Publicar',
      color: 'pink',
      submenu: [
        { href: '/mockup/admin/publish', icon: Send, label: 'Publicar Fotos' },
        { href: '/mockup/admin/publish/preview', icon: Eye, label: 'Vista Previa' },
        { href: '/mockup/admin/publish/schedule', icon: Calendar, label: 'Programar' },
      ]
    },
    { 
      href: '/mockup/admin/analytics', 
      icon: BarChart3, 
      label: 'Análisis',
      color: 'indigo'
    },
    { 
      href: '/mockup/admin/settings', 
      icon: Settings, 
      label: 'Configuración',
      color: 'gray'
    },
  ];

  const quickActions: QuickAction[] = [
    { icon: Upload, label: 'Subir Fotos', href: '/mockup/admin/upload', color: 'blue', shortcut: 'Cmd+U' },
    { icon: QrCode, label: 'Generar QR', href: '/mockup/admin/qr', color: 'purple', shortcut: 'Cmd+Q' },
    { icon: Plus, label: 'Nuevo Evento', href: '/mockup/admin/events/new', color: 'green', shortcut: 'Cmd+N' },
    { icon: BarChart3, label: 'Ver Reportes', href: '/mockup/admin/analytics', color: 'orange', shortcut: 'Cmd+R' },
  ];

  const notifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Fotos Procesadas',
      message: '45 fotos nuevas han sido procesadas correctamente',
      time: '5 min',
      read: false
    },
    {
      id: '2',
      type: 'info',
      title: 'Nuevo Pedido',
      message: 'María García ha realizado un pedido de 8 fotos',
      time: '15 min',
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Espacio de Almacenamiento',
      message: 'Has utilizado el 85% del espacio disponible',
      time: '1 hora',
      read: true
    },
    {
      id: '4',
      type: 'success',
      title: 'Pago Recibido',
      message: 'Se ha confirmado el pago de $1,250',
      time: '2 horas',
      read: true
    },
  ];

  const toggleSubmenu = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href)
        : [...prev, href]
    );
  };

  const isActiveItem = (item: NavItem) => {
    if (pathname === item.href) return true;
    if (item.submenu) {
      return item.submenu.some(subItem => pathname === subItem.href);
    }
    return false;
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ width: collapsed ? 80 : 280 }}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 glass-card-ios26 backdrop-blur-xl border-r border-white/10"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: collapsed ? 0 : 1 }}
              animate={{ opacity: collapsed ? 0 : 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    LookEscolar
                  </h1>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              )}
            </motion.div>
            <PremiumIconButton
              onClick={() => onCollapsedChange?.(!collapsed)}
              variant="default"
              size="sm"
            >
              {collapsed ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </PremiumIconButton>
          </div>
        </div>

        {/* Quick Actions Bar */}
        {showQuickActions && !collapsed && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones Rápidas
              </span>
              <PremiumIconButton
                onClick={() => setShowQuickActionPanel(!showQuickActionPanel)}
                variant="default"
                size="xs"
              >
                <Plus className="h-3 w-3" />
              </PremiumIconButton>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.slice(0, 4).map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={action.label} href={action.href || '#'}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg glass-button-ios26 hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <div className={cn(
                        "p-1.5 rounded-md bg-gradient-to-r",
                        action.color === 'blue' && "from-blue-500/10 to-cyan-500/10",
                        action.color === 'purple' && "from-purple-500/10 to-pink-500/10",
                        action.color === 'green' && "from-green-500/10 to-emerald-500/10",
                        action.color === 'orange' && "from-orange-500/10 to-red-500/10"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          action.color === 'blue' && "text-blue-600 dark:text-blue-400",
                          action.color === 'purple' && "text-purple-600 dark:text-purple-400",
                          action.color === 'green' && "text-green-600 dark:text-green-400",
                          action.color === 'orange' && "text-orange-600 dark:text-orange-400"
                        )} />
                      </div>
                      <span className="text-xs text-center leading-tight">
                        {action.label}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Search Bar */}
        {!collapsed && (
          <div className="p-4 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchPanel(true)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 glass-button-ios26 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveItem(item);
              const hasSubmenu = item.submenu && item.submenu.length > 0;
              const isExpanded = expandedItems.includes(item.href);

              return (
                <div key={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer group",
                      isActive
                        ? "glass-button-ios26 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-400/30"
                        : "glass-button-ios26 hover:bg-white/10"
                    )}
                    onClick={() => hasSubmenu ? toggleSubmenu(item.href) : null}
                  >
                    <Link 
                      href={!hasSubmenu ? item.href : '#'}
                      className="flex items-center gap-3 flex-1"
                      onClick={(e) => hasSubmenu && e.preventDefault()}
                    >
                      <div className={cn(
                        "p-2 rounded-lg relative",
                        isActive
                          ? `bg-${item.color}-500/20`
                          : "bg-white/5 group-hover:bg-white/10"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          isActive
                            ? `text-${item.color}-600 dark:text-${item.color}-400`
                            : "text-muted-foreground dark:text-gray-400"
                        )} />
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {!collapsed && (
                        <span className={cn(
                          "font-medium",
                          isActive
                            ? `text-${item.color}-600 dark:text-${item.color}-400`
                            : "text-foreground dark:text-gray-300"
                        )}>
                          {item.label}
                        </span>
                      )}
                    </Link>
                    {hasSubmenu && !collapsed && (
                      <ChevronRight className={cn(
                        "h-4 w-4 text-gray-400 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    )}
                  </div>

                  {/* Submenu */}
                  <AnimatePresence>
                    {hasSubmenu && isExpanded && !collapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-6 mt-2"
                      >
                        <div className="space-y-1">
                          {item.submenu?.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = pathname === subItem.href;
                            
                            return (
                              <Link key={subItem.href} href={subItem.href}>
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg transition-all",
                                    isSubActive
                                      ? "glass-button-ios26 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
                                      : "glass-button-ios26 hover:bg-white/5"
                                  )}
                                >
                                  <SubIcon className={cn(
                                    "h-4 w-4",
                                    isSubActive
                                      ? "text-blue-600 dark:text-blue-400"
                                      : "text-gray-500 dark:text-gray-400"
                                  )} />
                                  <span className={cn(
                                    "text-sm",
                                    isSubActive
                                      ? "text-blue-600 dark:text-blue-400 font-medium"
                                      : "text-muted-foreground dark:text-gray-300"
                                  )}>
                                    {subItem.label}
                                  </span>
                                </motion.div>
                              </Link>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10">
          {!collapsed && (
            <>
              {/* Time Display */}
              <div className="glass-button-ios26 rounded-lg px-3 py-2 mb-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium">
                    {formatTime(currentTime)}
                  </span>
                </div>
              </div>

              {/* User Profile */}
              <div className="glass-button-ios26 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Admin</p>
                    <p className="text-xs text-gray-500 truncate">admin@lookescolar.com</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {showNotifications && (
              <PremiumIconButton
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                variant="default"
                size="md"
                className="relative flex-1"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </PremiumIconButton>
            )}
            <PremiumIconButton
              variant="default"
              size="md"
              className="flex-1"
            >
              <LogOut className="h-5 w-5 text-red-500" />
            </PremiumIconButton>
          </div>
        </div>
      </motion.aside>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotificationPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setShowNotificationPanel(false)}
            />
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-4 top-4 bottom-4 w-80 z-50 glass-card-ios26 backdrop-blur-xl rounded-2xl overflow-hidden"
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
              <div className="flex-1 overflow-y-auto p-4">
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
                          "p-1 rounded-lg flex-shrink-0",
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
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content Spacer */}
      <div 
        className={cn(
          "hidden lg:block transition-all",
          collapsed ? "w-20" : "w-80"
        )} 
      />
    </>
  );
}

export default DesktopNav;
