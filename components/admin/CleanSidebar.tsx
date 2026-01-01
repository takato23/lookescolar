'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ShoppingCart,
  Share2,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ImageIcon,
  type LucideIcon,
} from 'lucide-react';
import { AperturaLogo } from '@/components/ui/branding/AperturaLogo';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

// Navigation items
const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Resumen general',
  },
  {
    href: '/admin/events',
    label: 'Eventos',
    icon: Calendar,
    description: 'Gestionar eventos',
  },
  {
    href: '/admin/photos',
    label: 'Fotos',
    icon: ImageIcon,
    description: 'Biblioteca de fotos',
  },
  {
    href: '/admin/publish',
    label: 'Publicar',
    icon: Share2,
    description: 'Compartir con clientes',
  },
  {
    href: '/admin/orders',
    label: 'Pedidos',
    icon: ShoppingCart,
    description: 'Seguimiento de ventas',
  },
  {
    href: '/admin/settings',
    label: 'Ajustes',
    icon: Settings,
    description: 'Configuracion',
  },
];

interface CleanSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function CleanSidebar({ isOpen, onClose }: CleanSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) setIsCollapsed(saved === 'true');
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300 lg:hidden',
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'sidebar-modern',
          isCollapsed && 'sidebar-modern--collapsed',
          isOpen && 'sidebar-modern--open'
        )}
      >
        {/* Header with Logo */}
        <div className="sidebar-modern-header">
          <Link
            href="/admin"
            className="sidebar-modern-logo"
            onClick={handleLinkClick}
            title={isCollapsed ? 'LookEscolar' : undefined}
          >
            <div className="sidebar-modern-logo-icon">
              <AperturaLogo variant="white" size="sm" />
            </div>
            <div className={cn(
              'sidebar-modern-logo-text',
              isCollapsed && 'sidebar-modern-logo-text--hidden'
            )}>
              <span className="sidebar-modern-brand">LookEscolar</span>
              <span className="sidebar-modern-tagline">Panel de Admin</span>
            </div>
          </Link>

          {/* Desktop Collapse Button */}
          <button
            onClick={toggleCollapse}
            className="sidebar-collapse-btn"
            aria-label={isCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="sidebar-close-btn flex lg:hidden"
            aria-label="Cerrar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-modern-nav">
          <div className={cn(
            'sidebar-nav-label',
            isCollapsed && 'sidebar-nav-label--hidden'
          )}>
            Menu principal
          </div>

          <ul className="sidebar-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      'sidebar-nav-item',
                      active && 'sidebar-nav-item--active',
                      isCollapsed && 'sidebar-nav-item--collapsed'
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="sidebar-nav-icon-wrapper">
                      <Icon className="sidebar-nav-icon" size={20} />
                      {active && <div className="sidebar-nav-active-dot" />}
                    </div>

                    <div className={cn(
                      'sidebar-nav-content',
                      isCollapsed && 'sidebar-nav-content--hidden'
                    )}>
                      <span className="sidebar-nav-label-text">{item.label}</span>
                      {item.description && (
                        <span className="sidebar-nav-description">{item.description}</span>
                      )}
                    </div>

                    {active && !isCollapsed && (
                      <div className="sidebar-nav-active-indicator" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

      </aside>
    </>
  );
}
