'use client';

import type { ComponentType } from 'react';
import { Home, Camera, ShoppingCart, User, Settings, Calendar, Share2 } from 'lucide-react';

export type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
  external?: boolean;
};

export const familyNavigationItems: NavigationItem[] = [
  {
    href: '/f',
    label: 'Inicio',
    icon: Home,
  },
  {
    href: '/f#gallery',
    label: 'Galería',
    icon: Camera,
  },
  {
    href: '/f#cart',
    label: 'Carrito',
    icon: ShoppingCart,
    badge: 0,
  },
  {
    href: '/f#profile',
    label: 'Perfil',
    icon: User,
  },
];

export const adminNavigationItems: NavigationItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/admin/events',
    label: 'Eventos',
    icon: Calendar,
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: Camera,
  },
  {
    href: '/admin/publish',
    label: 'Publicar',
    icon: Share2,
  },
  {
    href: '/admin/orders',
    label: 'Pedidos',
    icon: ShoppingCart,
    badge: 0,
  },
  {
    href: '/admin/settings',
    label: 'Ajustes',
    icon: Settings,
  },
];
