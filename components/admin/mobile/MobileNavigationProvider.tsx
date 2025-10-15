'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
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

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  children?: NavigationItem[];
  isActive?: boolean;
}

interface MobileNavigationContextType {
  currentPath: string;
  navigationItems: NavigationItem[];
  isMobile: boolean;
  showMobileMenu: boolean;
  setShowMobileMenu: (show: boolean) => void;
  navigateTo: (href: string) => void;
  getActiveItem: () => NavigationItem | null;
}

const MobileNavigationContext = createContext<MobileNavigationContextType | null>(null);

const ADMIN_NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    href: '/admin',
  },
  {
    id: 'events',
    label: 'Eventos',
    icon: Calendar,
    href: '/admin/events',
    children: [
      { id: 'events-list', label: 'Lista de Eventos', icon: Calendar, href: '/admin/events' },
      { id: 'events-new', label: 'Nuevo Evento', icon: Calendar, href: '/admin/events/new' },
    ],
  },
  {
    id: 'photos',
    label: 'Fotos',
    icon: Camera,
    href: '/admin/photos',
    children: [
      { id: 'photos-all', label: 'Todas las Fotos', icon: Camera, href: '/admin/photos' },
      { id: 'photos-simple', label: 'Vista Simple', icon: Camera, href: '/admin/photos-simple' },
      { id: 'photos-optimized', label: 'Optimizadas', icon: Camera, href: '/admin/photos-optimized' },
    ],
  },
  {
    id: 'orders',
    label: 'Pedidos',
    icon: Package,
    href: '/admin/orders',
    children: [
      { id: 'orders-list', label: 'Lista de Pedidos', icon: Package, href: '/admin/orders' },
      { id: 'orders-stats', label: 'Estadísticas', icon: BarChart3, href: '/admin/orders/stats' },
    ],
  },
  {
    id: 'store',
    label: 'Tienda',
    icon: ShoppingBag,
    href: '/admin/store-settings',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/admin/analytics',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: Settings,
    href: '/admin/settings',
    children: [
      { id: 'settings-general', label: 'General', icon: Settings, href: '/admin/settings' },
      { id: 'settings-pricing', label: 'Precios', icon: FileText, href: '/admin/pricing' },
    ],
  },
];

interface MobileNavigationProviderProps {
  children: ReactNode;
}

export function MobileNavigationProvider({ children }: MobileNavigationProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getActiveItem = (): NavigationItem | null => {
    const findActiveItem = (items: NavigationItem[]): NavigationItem | null => {
      for (const item of items) {
        if (item.href === pathname || pathname.startsWith(item.href + '/')) {
          return item;
        }
        if (item.children) {
          const childItem = findActiveItem(item.children);
          if (childItem) return childItem;
        }
      }
      return null;
    };

    return findActiveItem(ADMIN_NAVIGATION_ITEMS);
  };

  const navigateTo = (href: string) => {
    router.push(href);
    setShowMobileMenu(false);
  };

  const contextValue: MobileNavigationContextType = {
    currentPath: pathname,
    navigationItems: ADMIN_NAVIGATION_ITEMS,
    isMobile,
    showMobileMenu,
    setShowMobileMenu,
    navigateTo,
    getActiveItem,
  };

  return (
    <MobileNavigationContext.Provider value={contextValue}>
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);
  if (!context) {
    throw new Error('useMobileNavigation must be used within MobileNavigationProvider');
  }
  return context;
}
