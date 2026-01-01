'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Camera, Package, Share2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  href: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  gradient: string;
  iconBg: string;
  textColor: string;
}

const actions: QuickAction[] = [
  {
    href: '/admin/events/new',
    icon: Calendar,
    title: 'Crear Evento',
    subtitle: 'Nueva sesión',
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  {
    href: '/admin/photos',
    icon: Camera,
    title: 'Subir Fotos',
    subtitle: 'Con watermark',
    gradient: 'from-purple-500 to-purple-600',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  {
    href: '/admin/orders',
    icon: Package,
    title: 'Ver Pedidos',
    subtitle: 'Gestionar ventas',
    gradient: 'from-green-500 to-green-600',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  {
    href: '/admin/publish',
    icon: Share2,
    title: 'Publicar',
    subtitle: 'Compartir con clientes',
    gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
  {
    href: '/admin/settings',
    icon: Settings,
    title: 'Ajustes',
    subtitle: 'Configuración general',
    gradient: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-white/20',
    textColor: 'text-white',
  },
];

interface QuickActionsProps {
  variant?: 'mobile' | 'desktop';
  className?: string;
}

export const QuickActions = React.memo(function QuickActions({
  variant = 'desktop',
  className,
}: QuickActionsProps) {
  const isMobile = variant === 'mobile';

  return (
    <div
      className={cn('mb-8', className, {
        'lg:hidden': isMobile,
        'hidden lg:block': !isMobile,
      })}
    >
      <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">
        Acciones Principales
      </h2>
      <div
        className={cn('grid gap-4', {
          'grid-cols-2': isMobile,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4': !isMobile,
        })}
      >
        {actions.map((action) => (
          <QuickActionCard
            key={action.href}
            {...action}
            size={isMobile ? 'small' : 'large'}
          />
        ))}
      </div>
    </div>
  );
});

interface QuickActionCardProps extends QuickAction {
  size?: 'small' | 'large';
}

const QuickActionCard = React.memo(function QuickActionCard({
  href,
  icon: Icon,
  title,
  subtitle,
  gradient,
  iconBg,
  textColor,
  size = 'large',
}: QuickActionCardProps) {
  const isSmall = size === 'small';

  return (
    <Link href={href} className="group">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl p-4 shadow-xl transition-all duration-300',
          'hover:scale-105 hover:shadow-2xl',
          `bg-gradient-to-br ${gradient}`,
          {
            'h-32': isSmall,
            'h-40 rounded-2xl p-6': !isSmall,
          }
        )}
      >
        <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:bg-black/0" />
        <div className="relative flex h-full flex-col items-center justify-center">
          <div
            className={cn('rounded-xl backdrop-blur-sm', iconBg, {
              'mb-2 p-3': isSmall,
              'mb-3 rounded-2xl p-4': !isSmall,
            })}
          >
            <Icon
              className={cn(textColor, {
                'h-8 w-8': isSmall,
                'h-10 w-10': !isSmall,
              })}
            />
          </div>
          <p
            className={cn('font-bold', textColor, {
              'text-sm': isSmall,
              'text-lg': !isSmall,
            })}
          >
            {title}
          </p>
          <p
            className={cn('text-xs', {
              'text-blue-100': gradient.includes('blue'),
              'text-purple-100': gradient.includes('purple'),
              'text-primary-100': gradient.includes('amber'),
              'text-green-100': gradient.includes('green'),
              'text-pink-100': gradient.includes('pink'),
              'text-indigo-100': gradient.includes('indigo'),
              'text-teal-100': gradient.includes('teal'),
            })}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </Link>
  );
});

QuickActionCard.displayName = 'QuickActionCard';
