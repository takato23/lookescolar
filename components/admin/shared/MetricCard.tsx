/**
 * 📊 MetricCard - Componente de métrica estilo PixieSet
 * 
 * Card visual para mostrar estadísticas clave del evento
 * Reutilizable entre EventPhotoManager y otros componentes
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    trend: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  loading?: boolean;
}

const colorClasses = {
  blue: {
    icon: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
    border: 'border-border',
    hover: 'hover:bg-blue-50/50 dark:hover:bg-blue-950/30',
  },
  green: {
    icon: 'text-green-600 bg-green-50 dark:bg-green-950/30',
    border: 'border-border',
    hover: 'hover:bg-green-50/50 dark:hover:bg-green-950/30',
  },
  // Mapear variante naranja a la paleta de marca para evitar tonos marrones en dark
  orange: {
    icon: 'text-primary-600 bg-primary-50 dark:bg-primary-950/30',
    border: 'border-border',
    hover: 'hover:bg-primary-50/50 dark:hover:bg-primary-950/30',
  },
  purple: {
    icon: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30',
    border: 'border-border',
    hover: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/30',
  },
  gray: {
    icon: 'text-foreground/70 bg-muted/40',
    border: 'border-border',
    hover: 'hover:bg-muted/50',
  },
} as const;

const sizeClasses = {
  sm: {
    card: 'p-3',
    icon: 'h-8 w-8 p-2',
    iconSize: 'h-4 w-4',
    value: 'text-lg font-semibold',
    label: 'text-xs font-medium',
    change: 'text-xs'
  },
  md: {
    card: 'p-4',
    icon: 'h-10 w-10 p-2.5',
    iconSize: 'h-5 w-5',
    value: 'text-2xl font-bold',
    label: 'text-sm font-medium',
    change: 'text-sm'
  },
  lg: {
    card: 'p-6',
    icon: 'h-12 w-12 p-3',
    iconSize: 'h-6 w-6',
    value: 'text-3xl font-bold',
    label: 'text-base font-semibold',
    change: 'text-base'
  }
};

const trendClasses = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-500'
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  color = 'blue',
  size = 'md',
  onClick,
  className,
  loading = false
}: MetricCardProps) {
  const colorClass = colorClasses[color];
  const sizeClass = sizeClasses[size];

  if (loading) {
    return (
      <Card className={cn(
        'animate-pulse border',
        colorClass.border,
        className
      )}>
        <CardContent className={sizeClass.card}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-16"></div>
              <div className="h-6 bg-muted rounded w-12"></div>
            </div>
            <div className={cn(
              'rounded-lg bg-muted',
              sizeClass.icon
            )}></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'border transition-all duration-200',
      colorClass.border,
      onClick && `cursor-pointer ${colorClass.hover}`,
      className
    )} onClick={onClick}>
      <CardContent className={sizeClass.card}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className={cn(
              'text-muted-foreground uppercase tracking-wide',
              sizeClass.label
            )}>
              {label}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={cn(
                'text-foreground',
                sizeClass.value
              )}>
                {typeof value === 'number' && value >= 1000 
                  ? `${(value / 1000).toFixed(1)}k` 
                  : value
                }
              </p>
              {change && (
                <span className={cn(
                  trendClasses[change.trend],
                  sizeClass.change
                )}>
                  {change.trend === 'up' && '+'}
                  {change.value}
                  {change.trend !== 'neutral' && (change.trend === 'up' ? ' ↗' : ' ↘')}
                </span>
              )}
            </div>
          </div>
          <div className={cn(
            'rounded-lg transition-colors',
            colorClass.icon,
            sizeClass.icon
          )}>
            <Icon className={sizeClass.iconSize} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MetricCard;
