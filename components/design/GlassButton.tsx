'use client';

import clsx from 'clsx';
import { ButtonHTMLAttributes, CSSProperties } from 'react';
import { ButtonVariant, ThemeMode, getButtonTokens } from '@/lib/theme/lookescolar-tokens';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  mode?: ThemeMode;
}

export function GlassButton({
  children,
  className,
  variant = 'primary',
  mode = 'light',
  style,
  ...props
}: GlassButtonProps) {
  const tokens = getButtonTokens(variant, mode);

  const baseClasses =
    'relative inline-flex items-center justify-center overflow-hidden rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ease-out hover:scale-[1.05] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent transition-shadow';

  const focusRingClass = mode === 'dark' ? 'focus:ring-white/20' : 'focus:ring-white/35';

  const variantClasses: Record<ButtonVariant, string> = {
    primary: '',
    ghost: '',
  };

  const buttonStyle: CSSProperties = {
    background: tokens.background,
    color: tokens.textColor,
    borderColor: tokens.borderColor,
    '--le-button-bg': tokens.background,
    '--le-button-hover-bg': tokens.hoverBackground ?? tokens.background,
    '--le-button-text': tokens.textColor,
    '--le-button-hover-text': tokens.hoverTextColor ?? tokens.textColor,
    '--le-button-border': tokens.borderColor,
    '--le-button-shadow': tokens.shadow,
    '--le-button-hover-shadow': tokens.hoverShadow ?? tokens.shadow,
    '--le-button-halo': tokens.halo,
    '--le-button-highlight': tokens.highlight,
    ...style,
  };

  return (
    <button
      className={clsx(
        baseClasses,
        focusRingClass,
        'border border-[color:var(--le-button-border)] bg-[var(--le-button-bg)] text-[color:var(--le-button-text)] transition-colors hover:bg-[var(--le-button-hover-bg)] hover:text-[color:var(--le-button-hover-text)]',
        'shadow-[var(--le-button-shadow)] hover:shadow-[var(--le-button-hover-shadow)]',
        variantClasses[variant],
        className
      )}
      style={buttonStyle}
      {...props}
    >
      <span className="relative z-10 tracking-normal">{children}</span>
      <span
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background: tokens.highlight,
        }}
      />
      <span
        className="pointer-events-none absolute inset-x-8 bottom-[-22px] h-10 rounded-full opacity-55"
        style={{ background: tokens.halo, filter: 'blur(30px)' }}
      />
    </button>
  );
}
