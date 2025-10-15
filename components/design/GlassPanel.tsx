'use client';

import clsx from 'clsx';
import { CSSProperties, ReactNode } from 'react';
import { GlassAccent, ThemeMode, getGlassTokens } from '@/lib/theme/lookescolar-tokens';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  accent?: GlassAccent;
  radius?: number;
  style?: CSSProperties;
  wrapperClassName?: string;
  mode?: ThemeMode;
}

export function GlassPanel({
  children,
  className,
  accent = 'warm',
  radius = 46,
  style,
  wrapperClassName,
  mode = 'light',
}: GlassPanelProps) {
  const tokens = getGlassTokens(accent, mode);
  const borderRadius = `${radius}px`;

  return (
    <div
      className={clsx('relative', wrapperClassName)}
      style={{ filter: `drop-shadow(0 22px 48px ${tokens.halo})` }}
    >
      <div
        className={clsx(
          'relative overflow-hidden border backdrop-blur-[30px] transition-all duration-500 ease-out hover:scale-[1.02] hover:shadow-xl',
          'before:pointer-events-none before:absolute before:inset-x-[14%] before:top-1 before:h-[52%] before:rounded-[999px] before:opacity-75 before:transition-opacity before:duration-300 hover:before:opacity-90',
          'after:pointer-events-none after:absolute after:inset-x-[12%] after:bottom-[-42px] after:h-[110px] after:rounded-full after:blur-[82px] hover:after:blur-[92px]',
          className
        )}
        style={{
          borderColor: tokens.border,
          background: tokens.background,
          borderRadius,
          boxShadow: `${tokens.shadow}, inset 0 0 0.6px rgba(255,255,255,0.6)`,
          ...style,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            borderRadius,
            background: tokens.highlight,
            maskImage:
              'radial-gradient(120% 80% at 30% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 75%)',
            WebkitMaskImage:
              'radial-gradient(120% 80% at 30% 0%, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 75%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light opacity-45"
          style={{
            borderRadius,
            background: tokens.tint,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-[18%] bottom-[-40px] h-[120px]"
          style={{
            background: tokens.halo,
            filter: 'blur(42px)',
          }}
        />
        <div className="relative" style={{ borderRadius }}>
          {children}
        </div>
      </div>
    </div>
  );
}
