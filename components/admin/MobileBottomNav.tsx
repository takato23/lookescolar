'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ShoppingCart,
  Share2,
  Settings,
  LayoutDashboard,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface MobileBottomNavProps {
  forceVisible?: boolean;
}

// Navigation items for bottom nav - 6 items for mobile UX
const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Inicio',
    icon: LayoutDashboard,
  },
  {
    href: '/admin/events',
    label: 'Eventos',
    icon: Calendar,
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: ImageIcon,
  },
  {
    href: '/admin/orders',
    label: 'Pedidos',
    icon: ShoppingCart,
  },
  {
    href: '/admin/publish',
    label: 'Publicar',
    icon: Share2,
  },
  {
    href: '/admin/settings',
    label: 'Ajustes',
    icon: Settings,
  },
];

export default function MobileBottomNav({ forceVisible = false }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn(
        'mobile-bottom-nav',
        forceVisible && 'mobile-bottom-nav--visible'
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'mobile-bottom-nav-item',
              active && 'mobile-bottom-nav-item--active'
            )}
          >
            <Icon className="mobile-bottom-nav-icon" />
            <span className="mobile-bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
