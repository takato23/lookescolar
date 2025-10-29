'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type PremiumGlassButtonVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info';

type PremiumGlassButtonSize = 'sm' | 'md' | 'lg' | 'xl';
type Tone = 'accent' | 'muted' | 'success' | 'danger' | 'warning';

interface PremiumGlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PremiumGlassButtonVariant;
  size?: PremiumGlassButtonSize;
  shimmer?: boolean;
  glow?: boolean;
}

const toneHalo: Record<Tone, string> = {
  accent:
    'radial-gradient(circle, rgba(91, 111, 255, 0.5) 0%, rgba(91, 111, 255, 0) 62%)',
  muted:
    'radial-gradient(circle, rgba(148, 163, 184, 0.34) 0%, rgba(148, 163, 184, 0) 60%)',
  success:
    'radial-gradient(circle, rgba(34, 197, 94, 0.48) 0%, rgba(34, 197, 94, 0) 62%)',
  danger:
    'radial-gradient(circle, rgba(239, 68, 68, 0.52) 0%, rgba(239, 68, 68, 0) 63%)',
  warning:
    'radial-gradient(circle, rgba(251, 191, 36, 0.48) 0%, rgba(251, 191, 36, 0) 64%)',
};

const glowByTone: Record<Tone, string> = {
  accent: 'shadow-[0_0_36px_rgba(91,111,255,0.55)]',
  muted: 'shadow-[0_0_36px_rgba(148,163,184,0.4)]',
  success: 'shadow-[0_0_36px_rgba(34,197,94,0.5)]',
  danger: 'shadow-[0_0_36px_rgba(239,68,68,0.5)]',
  warning: 'shadow-[0_0_36px_rgba(251,191,36,0.48)]',
};

type LiquidStyle = 'glass' | 'intense';

interface VariantAppearance {
  liquid: LiquidStyle;
  tone: Tone;
  textClass: string;
  dataVariant?: 'ghost';
}

const variantAppearance: Record<
  PremiumGlassButtonVariant,
  VariantAppearance
> = {
  default: {
    liquid: 'glass',
    tone: 'muted',
    textClass: 'text-slate-900 dark:text-slate-100',
    dataVariant: 'ghost',
  },
  primary: {
    liquid: 'intense',
    tone: 'accent',
    textClass: 'text-white',
  },
  secondary: {
    liquid: 'intense',
    tone: 'accent',
    textClass: 'text-white',
  },
  danger: {
    liquid: 'intense',
    tone: 'danger',
    textClass: 'text-white',
  },
  success: {
    liquid: 'intense',
    tone: 'success',
    textClass: 'text-white',
  },
  warning: {
    liquid: 'intense',
    tone: 'warning',
    textClass: 'text-slate-900 dark:text-amber-100',
  },
  info: {
    liquid: 'intense',
    tone: 'accent',
    textClass: 'text-white',
  },
};

const sizeClasses: Record<PremiumGlassButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs sm:px-3.5',
  md: 'px-4 py-2 text-sm sm:px-5',
  lg: 'px-5 py-2.5 text-base sm:px-6 sm:py-3',
  xl: 'px-7 py-3 text-lg sm:px-8 sm:py-3.5',
};

const iconSizes: Record<PremiumGlassButtonSize, string> = {
  sm: 'p-2 sm:p-1.5',
  md: 'p-2.5 sm:p-2',
  lg: 'p-3 sm:p-2.5',
  xl: 'p-3.5 sm:p-3',
};

function LiquidLayers({ tone, shimmer }: { tone: Tone; shimmer: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] opacity-40 transition-opacity duration-300 ease-out group-hover:opacity-90"
        style={{ backgroundImage: toneHalo[tone] }}
      />
      {shimmer && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-[linear-gradient(110deg,transparent_42%,rgba(255,255,255,0.32)_50%,transparent_66%)] bg-[length:220%_120%] opacity-0 transition-[opacity,transform] duration-600 ease-out group-hover:opacity-100 group-hover:translate-x-[6%]"
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[24%] z-[-1] rounded-[inherit] opacity-0 blur-2xl transition-opacity duration-500 ease-out group-hover:opacity-30"
        style={{ backgroundImage: toneHalo[tone] }}
      />
    </>
  );
}

const baseButtonClasses =
  'group relative inline-flex items-center justify-center rounded-full font-semibold tracking-tight transition-[transform,box-shadow] duration-[250ms] ease-out transform-gpu will-change-transform touch-target overflow-hidden focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60';

const PremiumGlassButton = React.forwardRef<
  HTMLButtonElement,
  PremiumGlassButtonProps
>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      shimmer = true,
      glow = false,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const appearance = variantAppearance[variant];
    const liquidClass =
      appearance.liquid === 'intense'
        ? 'liquid-glass-intense'
        : 'liquid-glass';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseButtonClasses,
          'liquid-hover liquid-raise',
          sizeClasses[size],
          liquidClass,
          appearance.textClass,
          glow && glowByTone[appearance.tone],
          className
        )}
        data-liquid-tone={appearance.tone}
        data-liquid-variant={appearance.dataVariant}
        {...props}
      >
        <LiquidLayers tone={appearance.tone} shimmer={shimmer} />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

PremiumGlassButton.displayName = 'PremiumGlassButton';

const PremiumIconButton = React.forwardRef<
  HTMLButtonElement,
  PremiumGlassButtonProps
>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      shimmer = true,
      glow = false,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    const appearance = variantAppearance[variant];
    const liquidClass =
      appearance.liquid === 'intense'
        ? 'liquid-glass-intense'
        : 'liquid-glass';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseButtonClasses,
          'liquid-hover liquid-raise',
          iconSizes[size],
          liquidClass,
          appearance.textClass,
          glow && glowByTone[appearance.tone],
          className
        )}
        data-liquid-tone={appearance.tone}
        data-liquid-variant={appearance.dataVariant}
        {...props}
      >
        <LiquidLayers tone={appearance.tone} shimmer={shimmer} />
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </button>
    );
  }
);

PremiumIconButton.displayName = 'PremiumIconButton';

export { PremiumGlassButton, PremiumIconButton };
