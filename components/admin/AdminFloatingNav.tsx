'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Images,
  CalendarCheck2,
  ShoppingBag,
  Share2,
  Settings,
  GalleryHorizontalEnd,
} from 'lucide-react';

interface NavItem {
  id: string;
  href: string;
  label: string;
  description: string;
  tone: 'cyan' | 'violet' | 'amber' | 'emerald' | 'slate' | 'indigo';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const toneStyles: Record<NavItem['tone'], { bubble: string; icon: string; iconBg: string; }> = {
  cyan: {
    bubble: 'bg-gradient-to-r from-cyan-400 via-sky-500 to-teal-500 shadow-[0_24px_60px_-30px_rgba(8,146,178,0.65)]',
    icon: 'text-cyan-50',
    iconBg: 'bg-white/15 backdrop-blur-sm',
  },
  violet: {
    bubble: 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-purple-500 shadow-[0_24px_60px_-30px_rgba(124,58,237,0.65)]',
    icon: 'text-violet-50',
    iconBg: 'bg-white/15 backdrop-blur-sm',
  },
  amber: {
    bubble: 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-[0_24px_60px_-30px_rgba(217,119,6,0.6)]',
    icon: 'text-amber-50',
    iconBg: 'bg-white/15 backdrop-blur-sm',
  },
  emerald: {
    bubble: 'bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 shadow-[0_24px_60px_-30px_rgba(5,150,105,0.6)]',
    icon: 'text-emerald-50',
    iconBg: 'bg-white/15 backdrop-blur-sm',
  },
  slate: {
    bubble: 'bg-gradient-to-r from-slate-500 via-slate-600 to-slate-700 shadow-[0_24px_60px_-30px_rgba(51,65,85,0.55)]',
    icon: 'text-slate-50',
    iconBg: 'bg-white/15 backdrop-blur-sm',
  },
  indigo: {
    bubble: 'bg-gradient-to-r from-indigo-400 via-indigo-500 to-blue-500 shadow-[0_24px_60px_-30px_rgba(79,70,229,0.6)]',
    icon: 'text-indigo-50',
    iconBg: 'bg-white/15 backdrop-blur-sm',
  },
};

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    href: '/admin',
    label: 'Dashboard',
    description: 'Resumen general y métricas',
    tone: 'cyan',
    icon: LayoutDashboard,
  },
  {
    id: 'events',
    href: '/admin/events',
    label: 'Eventos',
    description: 'Gestionar eventos y salones',
    tone: 'violet',
    icon: CalendarCheck2,
  },
  {
    id: 'photos',
    href: '/admin/photos',
    label: 'Fotos',
    description: 'Gestión de fotos y carpetas',
    tone: 'indigo',
    icon: Images,
  },
  {
    id: 'orders',
    href: '/admin/orders',
    label: 'Pedidos',
    description: 'Pedidos y ventas',
    tone: 'amber',
    icon: ShoppingBag,
  },
  {
    id: 'publish',
    href: '/admin/publish',
    label: 'Publicar',
    description: 'Compartir con familias',
    tone: 'emerald',
    icon: Share2,
  },
  {
    id: 'store',
    href: '/admin/store-settings',
    label: 'Tienda',
    description: 'Configuración de tienda',
    tone: 'cyan',
    icon: GalleryHorizontalEnd,
  },
  {
    id: 'settings',
    href: '/admin/settings',
    label: 'Ajustes',
    description: 'Configuración del sistema',
    tone: 'slate',
    icon: Settings,
  },
];

const bubbleLayoutId = 'pixieset-nav-bubble';

export function AdminFloatingNav() {
  const pathname = usePathname();

  const normalizedPath = pathname?.replace(/\/+$/, '') || '/';

  const activeItem =
    navItems.reduce<NavItem | undefined>((bestMatch, item) => {
      const targetPath = item.href.replace(/\/+$/, '') || '/';
      const isExactMatch = normalizedPath === targetPath;
      const isNestedMatch =
        targetPath !== '/admin' &&
        normalizedPath.startsWith(`${targetPath}/`);

      if (!isExactMatch && !isNestedMatch) {
        return bestMatch;
      }

      if (!bestMatch) {
        return item;
      }

      const bestTarget = bestMatch.href.replace(/\/+$/, '');
      return targetPath.length > bestTarget.length ? item : bestMatch;
    }, undefined) ?? navItems.find((item) => item.id === 'photos');

  return (
    <div className="relative w-full">
      <div className="relative flex w-full items-center justify-between gap-2 overflow-x-auto rounded-full border border-white/10 bg-slate-900/80 p-2 shadow-[0_32px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
        {navItems.map((item) => {
          const isActive = activeItem?.id === item.id;
          const tone = toneStyles[item.tone];
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group relative min-w-[150px] flex-1"
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex h-full min-h-[72px] items-center gap-3 overflow-hidden rounded-[28px] border border-white/10 px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
                {isActive && (
                  <motion.div
                    layoutId={bubbleLayoutId}
                    className={cn('absolute inset-0 rounded-[28px]', tone.bubble)}
                    transition={{ type: 'spring', stiffness: 380, damping: 40 }}
                  />
                )}

                <div
                  className={cn(
                    'relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300',
                    tone.iconBg,
                    isActive
                      ? 'scale-105 shadow-[0_12px_30px_-18px_rgba(15,23,42,0.6)]'
                      : 'shadow-[0_6px_18px_-12px_rgba(15,23,42,0.3)]'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 transition-colors duration-300',
                      isActive ? tone.icon : 'text-slate-300 group-hover:text-white'
                    )}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                </div>

                <div className="relative z-10 min-w-0">
                  <span
                    className={cn(
                      'block truncate text-sm font-semibold transition-colors duration-200',
                      isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                    )}
                  >
                    {item.label}
                  </span>
                  <p
                    className={cn(
                      'mt-0.5 truncate text-xs transition-colors duration-200',
                      isActive ? 'text-white/80' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
