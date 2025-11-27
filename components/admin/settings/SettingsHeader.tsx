'use client';

import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { LucideIcon, Sparkles } from 'lucide-react';

export interface SettingsHeaderProps {
  /**
   * Main title
   */
  title: string;

  /**
   * Subtitle/description
   */
  description?: string;

  /**
   * Icon component
   */
  icon?: LucideIcon;

  /**
   * Badge text (e.g., "Admin", "Pro")
   */
  badge?: string;

  /**
   * Badge variant
   */
  badgeVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';

  /**
   * Additional header actions (buttons, etc.)
   */
  actions?: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const badgeColors: Record<
  NonNullable<SettingsHeaderProps['badgeVariant']>,
  string
> = {
  default:
    'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300',
  primary:
    'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  success:
    'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-300',
  warning:
    'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  danger: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300',
};

export function SettingsHeader({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = 'primary',
  actions,
  className,
}: SettingsHeaderProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900/50 via-slate-900/20 to-slate-900/5 p-8 shadow-2xl backdrop-blur-xl dark:from-white/5 dark:via-white/5 dark:to-transparent',
        className
      )}
    >
      {/* Background Decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent opacity-50" />
      <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl" />

      <div className="relative z-10 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Icon */}
          {Icon && (
            <div className="liquid-glass group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 shadow-inner transition-all duration-500 hover:scale-105 hover:shadow-blue-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <Icon className="relative z-10 h-10 w-10 text-slate-700 transition-colors duration-500 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-300" />
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-blue-100 dark:to-white">
                {title}
              </h1>
              {badge && (
                <span
                  className={clsx(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-md',
                    badgeColors[badgeVariant]
                  )}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-lg text-slate-600 dark:text-slate-300">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export default SettingsHeader;
