'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  ShoppingCart,
  Share2,
  Settings,
  ImageIcon,
} from 'lucide-react';

type TabType = 'home' | 'events' | 'photos' | 'orders' | 'publish' | 'settings';

interface NavItem {
  id: TabType;
  href: string;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'home', href: '/admin', icon: LayoutDashboard, label: 'Inicio' },
  { id: 'events', href: '/admin/events', icon: Calendar, label: 'Eventos' },
  { id: 'photos', href: '/admin/photos', icon: ImageIcon, label: 'Fotos' },
  { id: 'publish', href: '/admin/publish', icon: Share2, label: 'Publicar' },
  { id: 'orders', href: '/admin/orders', icon: ShoppingCart, label: 'Pedidos' },
  { id: 'settings', href: '/admin/settings', icon: Settings, label: 'Ajustes' },
];

export default function LiquidGlassNav() {
  const pathname = usePathname();
  const router = useRouter();

  const getActiveTab = (): TabType => {
    if (pathname === '/admin') return 'home';
    if (pathname.startsWith('/admin/events')) return 'events';
    if (pathname.startsWith('/admin/photos')) return 'photos';
    if (pathname.startsWith('/admin/orders')) return 'orders';
    if (pathname.startsWith('/admin/publish')) return 'publish';
    if (pathname.startsWith('/admin/settings')) return 'settings';
    return 'home';
  };

  const currentTab = getActiveTab();

  const handleTabChange = (item: NavItem) => {
    router.push(item.href);
  };

  return (
    // Mobile only - Hidden on desktop (lg and up)
    <div className="liquid-glass-nav-wrapper lg:hidden">
      {/* Contenedor "Liquid Glass Intense" */}
      <nav className="liquid-glass-nav">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item)}
              className="liquid-glass-nav-item"
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* LA GOTA MÁGICA - Se mueve suavemente entre tabs */}
              {isActive && (
                <motion.div
                  layoutId="liquid-bubble"
                  className="liquid-glass-nav-bubble"
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                  }}
                />
              )}

              {/* Icono con transición */}
              <div className={`liquid-glass-nav-icon ${isActive ? 'liquid-glass-nav-icon--active' : ''}`}>
                <Icon strokeWidth={isActive ? 2.5 : 2} />
              </div>

              {/* Label - visible solo cuando está activo en desktop */}
              <span className={`liquid-glass-nav-label ${isActive ? 'liquid-glass-nav-label--active' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
